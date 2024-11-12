/* eslint-disable max-lines */
// Copyright (c) 2022 Siemens

/**
 * This service manages the 'source' object information placed into 'localStorage' during drag-n-drop operations.
 *
 * @module js/awDragAndDropService
 */
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import dms from 'soa/dataManagementService';
import soaSvc from 'soa/kernel/soaService';
import cfgSvc from 'js/configurationService';
import messagingSvc from 'js/messagingService';
import localeService from 'js/localeService';
import appCtxSvc from 'js/appCtxService';
import adapterSvc from 'js/adapterService';
import awConfiguredSvc from 'js/awConfiguredRevService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import browserUtils from 'js/browserUtils';
import declUtils from 'js/declUtils';
import logger from 'js/logger';
import ngUtils from 'js/ngUtils';
import awDragAndDropUtils from 'js/awDragAndDropUtils';
import 'config/paste';

// Service
import pasteService from 'js/pasteService';
import AwPromiseService from 'js/awPromiseService';

/**
 * Data formats to put the data in. It would be better to only use aw_interop_type here, but that isn't working
 * with Chrome.
 */
var DATA_FORMATS = [ 'text/html', 'aw_interop_type' ];

/** Dataset type */
var TYPE_NAME_DATASET = 'Dataset';

/**
 * {Boolean} TRUE if the drag event should have it's 'dataTransfer' object set/maintained.
 */
var _includeDataTransfer = true;

/**
 * {Boolean} TRUE if various drag event activities should publish 'hosting' related events.
 */
var _publishHostingEvents = false;

/**
 * {Function} A callback used to create the 'InteropObjectRef' encodings necessary to communicate more complex
 * selection information via drag event data format properties.
 * <P>
 * Note: Until the hosting 'InteropObjectRefFactory' is converted from GWT to native JS we must rely on it for
 * conversion of IModelObjects to the special encoding used for communications of 'source' objects to the host.
 */
var _createInteropObjectRefFn;

/**
 * <pre>
 * Greater Than 0 If some basic event activity should be logged.
 * Greater Than 1 If some more fine-grained event activity should be logged.
 * </pre>
 */
var _debug_logEventActivity = 0;

const HOSTING_DRAG_DROP_EVENT = 'hosting.DragDropEvent';
const DROP_CLASS = '.aw-widgets-droppable';
const DRAG_DROP_HIGHLIGHT_EVENT = 'dragDropEvent.highlight';

var urlAttributes = browserUtils.getUrlAttributes();

if( urlAttributes.logDnDEventActivity !== undefined ) {
    _debug_logEventActivity = 1;

    if( urlAttributes.logDnDEventActivity > 0 ) {
        _debug_logEventActivity = urlAttributes.logDnDEventActivity;
    }
}

/**
 * TRUE if the type that was not valid for a target is logged. This is very handy when debugging issues.
 */
var m_debug_LogRejectedSourceType = false;

/**
 * Map used to hold an unresolved {Promise} for a given 'evaluation key' *while* the async server call is being
 * made.
 * <P>
 * Note: This map prevents repeatedly calling the server for the same 'evaluation key'.
 * <P>
 * Note: The 'evaluation key' is formed by TargetUID + ValidSourceTypes + FileExtensions.
 */
var m_mapKey2Promise = {};

/**
 * Map used to hold the *result* of a previous async server call for a given 'evaluation key'.
 * <P>
 * Note: This map prevents repeatedly calling the server for the same 'evaluation key'.
 * <P>
 * Note: The 'evaluation key' is formed by TargetUID + ValidSourceTypes + FileExtensions.
 */
var m_mapKey2Result = {};

/**
 * TRUE if dragging files from the OS file should be allowed.
 */
var m_supportingFileDrop = true;

/**
 * Set used to hold an 'unresolved source type lookup key' *while( the async server call is being made.
 * <P>
 * Note: This map prevents repeatedly calling the server for the same 'unresolved source type lookup key'.
 * <P>
 * Note: The 'unresolved source type lookup key' is formed by a union of MissingSourceTypes.
 */
var m_typeLookupInProgress = {};

let isGlobalHighlightPublished = false;

/*
 * Map of target(uid) and valid source types that can be dropped
 */
let validDropTypesMap = new Map();

/*
 * Loading the paste file handler dependency to perform file drops on widgets
 * Currently paste service does not support file handling, hence loading the dependency here.
 * Once paste service supports file handling, this can be removed.
 */
let pasteFileHandler = null;

let _pasteConfig = cfgSvc.getCfgCached( 'paste' ) || {};

//* **********************************************************************

/**
 * @param {StringArray} validSourceObjects The 'sourceTypes' {@link JavaScriptObject} property from the
 *            pasteConfig for the given 'target' object type or its ancestor types up the hierarchy (or NULL if
 *            no match was found).
 *
 * @returns {Object} A {@link Map} that relates 'source' types to the 1 or more possible relationship types that
 *         are valid for the 'owner' (i.e. 'target') {@link IModelObject}.
 */
var _createSourceType2RelationsMap = function( validSourceObjects ) {
    var sourceType2RelationsMap = {};
    if( validSourceObjects ) {
        const validSourceTypes = Object.keys( validSourceObjects );
        for( var i = 0; i < validSourceTypes.length; i++ ) {
            var sourceType = validSourceTypes[ i ];
            var validSourceObj = validSourceObjects[ sourceType ];
            var relations = [];
            if( validSourceObj.relation ) {
                relations.push( validSourceObj.relation );
            } else {
                relations.push( '' );
            }
            sourceType2RelationsMap[ sourceType ] = relations;
        }
    }
    return sourceType2RelationsMap;
};

const getXrtTableUid = ( dragAndDropParams, props ) => {
    if( props && props.objectSetData.source ) {
        return props.vmo.uid + '.' + dragAndDropParams.dataProvider.name;
    }
    return null;
};

const getValidDropTypes = ( targetVmo, isXrtTable, props ) => {
    if( isXrtTable ) {
        return getValidDropTypesFromValidSourceTypes( props.objectSetData.source );
    }
    return pasteService.getObjectValidSourceTypes( targetVmo );
};

/**
 * Remove from selection any non-'target' object currently selected (like the ones we may have just pasted) so
 * that the 'target' can be cleanly selected later.
 *
 * @param {ViewModelObject} targetVMO - The 'target' ViewModelObject the 'source' ViewModelObject(s) are being
 *            dropped onto.
 *
 * @param {Object} callbackAPIs - Callback functions used for various interaction reasons.
 */
var _deselectAll = function( targetVMO, callbackAPIs ) {
    if( cmm.isInstanceOf( 'Awp0XRTObjectSetRow', targetVMO.modelType ) ) {
        adapterSvc.getAdaptedObjects( targetVMO ).then( function( adaptedObjs ) {
            callbackAPIs.clearSelection( adaptedObjs );
        } );
    }
    callbackAPIs.clearSelection( targetVMO );
};

/**
 * Synchronously create Datasets, upload the given JS Files and attach the files to the Datasets using the
 * correct relation types and the tickets used to upload the files.
 *
 * @param {Element} targetElement - The 'target' DOM Element being dropped onto.
 *
 * @param {ViewModelObject} targetVMO - The 'target' ViewModelObject being dropped onto.
 *
 * @param {ObjectArray} sourceFiles - The 'source' JS File objects being dropped.
 *
 * @param {Object} dragAndDropParams - Framework generated drag and drop parameters.
 *
 * @param {STRING} xrtTableUid - Uid of Xrt table.
 *
 * @param {Object} props - props.
 */
var _deselectAllAndPasteSourceFiles = function( targetElement, targetVMO, sourceFiles, dragAndDropParams, xrtTableUid, props ) {
    if( sourceFiles && sourceFiles.length > 0 ) {
        _deselectAll( targetVMO, dragAndDropParams.callbackAPIs );
        let validSourceTypes = _getValidSourceTypes( targetVMO, xrtTableUid );
        if( !validSourceTypes || _.isEmpty( validSourceTypes ) ) {
            if( cmm.isInstanceOf( 'Awp0XRTObjectSetRow', targetVMO.modelType ) ) {
                adapterSvc.getAdaptedObjects( [ targetVMO ] ).then( function( adaptedObjs ) {
                    validSourceTypes = pasteService.getObjectValidSourceTypes( adaptedObjs[ 0 ] );
                    _pasteSourceFiles( targetVMO, sourceFiles, dragAndDropParams, validSourceTypes );
                } );
            } else {
                validSourceTypes = getValidDropTypes( targetVMO, xrtTableUid, props );
                _pasteSourceFiles( targetVMO, sourceFiles, dragAndDropParams, validSourceTypes );
            }
        } else {
            _pasteSourceFiles( targetVMO, sourceFiles, dragAndDropParams, validSourceTypes );
        }
    }
};

/**
 * @param {Element} targetElement - The 'target' DOM Element being dropped onto.
 *
 * @param {ViewModelObject} targetVMO - The 'target' ViewModelObject being dropped onto.
 *
 * @param {IModelObjectArray} sourceObjects - The 'source' IModelObject(s) being dropped.
 *
 * @param {Object} callbackAPIs - Callback functions used for various interaction reasons.
 *
 * @param {STRING} xrtTableUid - Uid of Xrt table.
 *
 * @param {Object} dragAndDropParams - System generated drag and drop parameters.
 *
 * @param {Object} props - props
 */
var _deselectAllAndPasteSourceObjects = function( targetElement, targetVMO, sourceObjects, callbackAPIs, xrtTableUid, dragAndDropParams, props ) {
    if( sourceObjects && sourceObjects.length > 0 ) {
        //_deselectAll( targetVMO, callbackAPIs );
        let validSourceTypes = _getValidSourceTypes( targetVMO, xrtTableUid );
        if( !validSourceTypes || _.isEmpty( validSourceTypes ) ) {
            if( cmm.isInstanceOf( 'Awp0XRTObjectSetRow', targetVMO.modelType ) ) {
                adapterSvc.getAdaptedObjects( [ targetVMO ] ).then( function( adaptedObjs ) {
                    validSourceTypes = pasteService.getObjectValidSourceTypes( adaptedObjs[ 0 ] );
                    _pasteSourceObjects( targetVMO, sourceObjects, callbackAPIs, validSourceTypes, dragAndDropParams );
                } );
            } else {
                validSourceTypes = getValidDropTypes( targetVMO, xrtTableUid, props );
                _pasteSourceObjects( targetVMO, sourceObjects, callbackAPIs, validSourceTypes, dragAndDropParams );
            }
        } else {
            _pasteSourceObjects( targetVMO, sourceObjects, callbackAPIs, validSourceTypes, dragAndDropParams );
        }
    }
};

/**
 * Perform the actual 'drop' (paste) of the 'source' objects onto the given 'target'.
 *
 * @param {Element} targetElement - The 'target' DOM Element.
 *
 * @param {ObjectArray} sourceFiles - The array 'source' JS File objects to drop onto the 'target'.
 *
 * @param {Object} dragAndDropParams - Framework generated drag and drop parameters.
 *
 * @param {Object} props - props
 */
const _dropFiles = function( targetElement, sourceFiles, dragAndDropParams, props ) {
    let targetVMOs = dragAndDropParams.targetObjects;

    let xrtTableUid = null;
    //For list and table, set the vmo on declViewmodel as the target

    if( isXrtListOrTableContainer( dragAndDropParams, props ) ) {
        xrtTableUid = getXrtTableUid( dragAndDropParams, props );
        targetVMOs = dragAndDropParams.targetObjects;
    }
    _deselectAllAndPasteSourceFiles( targetElement, targetVMOs[ 0 ], sourceFiles, dragAndDropParams, xrtTableUid, props );
    awDragAndDropUtils._clearCachedData();
};

/**
 * @param {Element} targetElement - The 'target' DOM Element being dropped onto.
 *
 * @param {StringArray} sourceUIDs - The array of UIDs for the 'source' IModelObjects to drop onto the 'target'.
 *
 * @param {Object} dragAndDropParams - Framework generated drag and drop parameters.
 *
 * @param {Object} props - props
 */
const _dropModelObjects = function( targetElement, sourceUIDs, dragAndDropParams, props ) {
    let targetVMOs = dragAndDropParams.targetObjects;
    let xrtTableUid = null;

    if( isXrtListOrTableContainer( dragAndDropParams, props ) ) {
        xrtTableUid = getXrtTableUid( dragAndDropParams, props );
        targetVMOs =  !dragAndDropParams.targetObjects || !dragAndDropParams.targetObjects.length  ? [ props.vmo ] : targetVMOs;
    }

    if( targetVMOs && targetVMOs.length !== 0 ) {
        _dropModelObjectsInternal( targetElement, sourceUIDs, dragAndDropParams.callbackAPIs, targetVMOs, xrtTableUid, dragAndDropParams, props );
    }
};

/**
 * Perform the actual 'drop' (paste) of the 'source' objects onto the given 'target'.
 *
 * @param {Element} targetElement - The 'target' DOM Element being dropped onto.
 *
 * @param {StringArray} sourceUIDs - The array of UIDs for the 'source' IModelObjects to drop onto the 'target'.
 *
 * @param {Object} callbackAPIs - Callback functions used for various interaction reasons.
 *
 * @param {Object} targetVMOs - View model object of target.
 *
 * @param {STRING} xrtTableUid - Uid of Xrt table.
 *
 * @param {Object} dragAndDropParams - System generated drag and drop parameters.
 *
 * @param {Object} props - props
 */
var _dropModelObjectsInternal = function( targetElement, sourceUIDs, callbackAPIs, targetVMOs, xrtTableUid, dragAndDropParams, props ) {
    var sourceObjects = [];
    var missingSourceUIDs = [];
    /**
     * Attempt to locate the 'source' objects in this browser's CDM cache.
     * <P>
     * Note: When 'source' objects are being dragged from another browser they may not have been loaded into the
     * 'target' browser.
     */
    if( sourceUIDs ) {
        for( var i = 0; i < sourceUIDs.length; i++ ) {
            let sourceObject = getTargetObjectByUid( sourceUIDs[ i ] );
            if( sourceObject ) {
                sourceObjects.push( sourceObject );
            } else {
                missingSourceUIDs.push( sourceUIDs[ i ] );
            }
        }
    }
    /**
     * Check if NO 'source' objects are missing
     * <P>
     * If so: Process the past now
     */
    if( missingSourceUIDs.length === 0 ) {
        _deselectAllAndPasteSourceObjects( targetElement, targetVMOs[ 0 ], sourceObjects, callbackAPIs, xrtTableUid, dragAndDropParams );
        awDragAndDropUtils._clearCachedData();
    } else {
        /**
         * Attempt to locate the missing 'source' objects on the server.
         */
        dms.loadObjects( missingSourceUIDs ).then( function() {
            /**
             * Attempt to locate the (formerly) missing 'targets' and add them to the list of 'source' objects
             * to drop on the 'target'
             */
            for( var j = 0; j < missingSourceUIDs.length; j++ ) {
                var sourceObject = getTargetObjectByUid( missingSourceUIDs[ j ] );
                if( sourceObject ) {
                    sourceObjects.push( sourceObject );
                }
            }
            if( sourceObjects && sourceObjects.length > 0 ) {
                _deselectAllAndPasteSourceObjects( targetElement, targetVMOs[ 0 ], sourceObjects, callbackAPIs, xrtTableUid, dragAndDropParams, props );
            }
            awDragAndDropUtils._clearCachedData();
        } );
    }
};

/**
 * Determine if the DragEvent is over a white space on the page or on an applicable valid drop container
 * if so, change drag effect to indicate if it is OK to drop on that 'target'.
 *
 * @param {Object} dragAndDropParams - Framework generated drag and drop parameters.
 * @param {Object} props - props
 */
const processDragOver = function( dragAndDropParams, props ) {
    processDragLeaveGlobal( event ); // clearing all other highlights triggered due to file drag in global area
    var sourceUIDs = awDragAndDropUtils.getCachedSourceUids();
    if( sourceUIDs ) {
        awDragAndDropUtils.loadVMOsIfNotAlreadyLoaded( sourceUIDs );
    }
    _processDragOverInternal( dragAndDropParams, props );
};

const getValidDropTypesFromDataprovider = ( dataProvider ) => {
    var objectSetSources = dataProvider.validSourceTypes.split( ',' );
    return processValidSourceTypes( objectSetSources );
};

const getValidDropTypesFromValidSourceTypes = ( validSourceTypes ) => {
    if ( validSourceTypes ) {
        var objectSetSources = validSourceTypes.split( ',' );
        return processValidSourceTypes( objectSetSources );
    }
    return {};
};

const processValidSourceTypes = ( objectSetSources ) => {
    let validTypes = {};
    _.forEach( objectSetSources, function( source ) {
        var relationSources = source.split( '.' );
        var sourceType = relationSources[ 1 ];
        if( !validTypes[ sourceType ] ) {
            validTypes[ sourceType ] = [];

            var relationObj = {
                relation: relationSources[ 0 ]
            };

            validTypes[ sourceType ] = relationObj;
        }
    } );
    return validTypes;
};

/**
 * Check if we have NOT already stored the collection of 'valid' 'source' types this 'target' will accept.
 * <P>
 * If so: Get that collection now.
 *
 * @param {Object} dragAndDropParams - Framework generated drag and drop parameters.
 * @param {Object} props - props
 */
var _setValidDropTypesOnTarget = function( dragAndDropParams, props ) {
    let sourceType2RelationMap = null;
    let targetVMO = dragAndDropParams.targetObjects && dragAndDropParams.targetObjects[ 0 ];
    if ( !targetVMO ) {
        targetVMO = props.vmo;
    }
    let dataProvider = dragAndDropParams.dataProvider;

    const setValidTypes = ( validTypes, targetUid ) => {
        validDropTypesMap.set( targetUid, validTypes );
    };

    const checkValidTypes = ( targetUid ) => {
        return validDropTypesMap.has( targetUid );
    };

    if( targetVMO ) {
        if( dataProvider && dataProvider.validSourceTypes ) {
            sourceType2RelationMap = getValidDropTypesFromDataprovider( dataProvider );
            setValidTypes( sourceType2RelationMap, getXrtTableUid( dragAndDropParams, props ) );
            return;
        }
        if( props.objectSetData && props.objectSetData.source ) {
            sourceType2RelationMap = getValidDropTypesFromValidSourceTypes( props.objectSetData.source );
            setValidTypes( sourceType2RelationMap, getXrtTableUid( dragAndDropParams, props ) );
            return;
        }
        if( checkValidTypes( targetVMO.uid ) ) {
            return;
        }
        checkValidTypes( targetVMO.uid );
        if( cmm.isInstanceOf( 'Awp0XRTObjectSetRow', targetVMO.modelType ) ) {
            adapterSvc.getAdaptedObjects( [ targetVMO ] ).then( function( adaptedObjs ) {
                sourceType2RelationMap = pasteService.getObjectValidSourceTypes( adaptedObjs[ 0 ] );
                setValidTypes( sourceType2RelationMap, targetVMO.uid );
            } );
        } else {
            sourceType2RelationMap = pasteService.getObjectValidSourceTypes( targetVMO );
            setValidTypes( sourceType2RelationMap, targetVMO.uid );
        }
    }
};

/**
 * Returns the 'validSourceTypes' property on the 'target' element being dropped onto.
 *
 * @param {Object} targetVMO - The vmo corresponding to the element that the dragged data will be dropped onto.
 *
 * @param {STRING} xrtTableUid - Uid of Xrt table.
 *
 * @return {StringArray} Array of valid 'sourceTypes' (or an empty array if no 'sourceTypes' are valid).
 */
var _getValidSourceTypes = function( targetVMO, xrtTableUid ) {
    const uid = xrtTableUid || targetVMO && targetVMO.uid;
    if( uid ) {
        return validDropTypesMap.get( uid );
    }
    return {};
};

/**
 * @param {StringArray} validSourceTypes - Array of 'source' types this 'target' will accept.
 * @param {StringArray} sourceTypes - Arrays of 'source' types determined from the event's 'dataTransfer' being
 *            dragged.
 *
 * @return {Boolean} TRUE if ALL the given 'source' types are valid to drop onto the 'target' based on the given
 *         'validSourceTypes'.
 */
var _isValidObjectToDropInternal = function( validSourceTypes, sourceTypes ) {
    const isValidTypeHierarchy = ( sourceType, validSourceType ) => {
        /**
         * Get all the ancestor types for this 'source' type and see if one of them is valid for this
         * 'target'.
         */
        var sourceModelType = cmm.getType( sourceType );
        if( !sourceModelType ) {
            logger.warn( 'Unable to locate \'source\' type (not loaded yet?): ' + sourceType );
            return false;
        }
        if( sourceModelType.typeHierarchyArray && sourceModelType.typeHierarchyArray.length ) {
            return sourceModelType.typeHierarchyArray.some( heirarchyType => heirarchyType === validSourceType );
        }
    };
    /**
     * Check if we have anything to work with.
     */
    if( validSourceTypes && validSourceTypes.length > 0 && sourceTypes && sourceTypes.length > 0 ) {
        /**
         * Check if all the 'sources' matches at least one valid type for the 'target' Element.
         * <P>
         * If so: We will consider the drop of these 'sources' onto that 'target'.
         */
        for( var i = 0; i < sourceTypes.length; i++ ) {
            let sourceType = sourceTypes[ i ];
            let sourceTypeFound = null;

            /**
             * Consider each valid 'source' type the 'target' will accept.
             */
            sourceTypeFound = validSourceTypes.some( ( validSourceType ) => {
                return sourceType === validSourceType || isValidTypeHierarchy( sourceType, validSourceType );
            } );
            if( !sourceTypeFound ) {
                if( m_debug_LogRejectedSourceType ) {
                    logger.warn( 'This \'source\' type is not valid for the \'target\': ' + sourceType );
                }
                return false;
            }
        }
        return true;
    }
    return false;
};

const createPasteInput = ( pasteRelation2SourceObjectsMap, targetVMO, dragAndDropParams ) => {
    let pasteInput = [];
    _.forEach( pasteRelation2SourceObjectsMap, function( value, key ) {
        var curr = {};
        curr.targetObject = targetVMO;
        curr.relationType = key;
        curr.sourceObjects = value;
        if( dragAndDropParams ) {
            curr.props = dragAndDropParams.props;
            curr.runActionWithViewModel = dragAndDropParams.runActionWithViewModel;
        }
        pasteInput.push( curr );
    } );
    return pasteInput;
};

/**
 * @param {Object} pasteInput - An Object that maps a unique 'relationType' to the array of 'source'
 *            IModelObjects that should be pasted onto the 'target' with that 'relationType'.
 *
 * @return {Promise} A Promise that will be 'resolved' or 'rejected' when the service is invoked and its
 *         response data is available.
 */
var _pasteFiles = function( pasteInput ) {
    const pasteFiles = () => {
        return pasteFileHandler.pasteFilesWithHandler( pasteInput ).then( function( response ) {
            if( response && response.isOsFiles ) {
                const { pasteFilesInput } = response;
                var deferred = AwPromiseService.instance.defer();

                _.forEach( pasteFilesInput, function( input ) {
                    const { targetObject, relationType, sourceObjects, props, runActionWithViewModel  } = input;
                    pasteService.execute( targetObject, sourceObjects, relationType, { isDragDropIntent: true, props, runActionWithViewModel } ).then( function( res ) {
                        var eventData = {
                            relatedModified: [ targetObject ],
                            refreshLocationFlag: false,
                            createdObjects: sourceObjects
                        };
                        eventBus.publish( 'cdm.relatedModified', eventData );
                        deferred.resolve( res[ 0 ] );
                    }, function( err ) {
                        deferred.reject( err );
                    } );
                } );
                return deferred.promise;
            }
            return response;
        } );
    };
    if( pasteFileHandler ) {
        return pasteFiles();
    }
    if( !pasteFileHandler && _pasteConfig.defaultPasteFileHandler ) {
        if( !pasteFileHandler ) {
            return declUtils.loadDependentModule( _pasteConfig.defaultPasteFileHandler.dep ).then( handlerForFile => {
                pasteFileHandler = handlerForFile;
                return pasteFiles();
            } );
        }
        return pasteFiles();
    }
};

const executeFileDrop = ( targetVMO, callbackAPIs, pasteRelation2SourceObjectsMap, dragAndDropParams ) => {
    _scheduleSelectTarget( targetVMO, callbackAPIs );

    /**
     * Paste 'sources' to 'target' for each unique 'relation' type.
     */
    var pasteInput = createPasteInput( pasteRelation2SourceObjectsMap, targetVMO, dragAndDropParams );
    var startTime = Date.now();

    _pasteFiles( pasteInput ).then( function( result ) {
        var stopTime = Date.now();
        var pasteInputJS = pasteInput;
        var sourceObjectsJS = result.sourceObjects;

        if( _debug_logEventActivity > 1 ) {
            var durationMs = stopTime - startTime;

            var durationSec = durationMs / 1000.0;
            var duration = durationSec;

            logger.info( 'Time to process (' + sourceObjectsJS.length + ') files: ' + duration + 'sec' );
        }

        var localTextBundle = localeService.getLoadedText( 'dragAndDropMessages' );

        /**
         * Based on passed parameters in return from create SOA post the correct success message to the user.
         */
        var droppedOnObject = pasteInputJS[ 0 ].targetObject.cellHeader1;

        if( !droppedOnObject ) {
            droppedOnObject = pasteInputJS[ 0 ].targetObject.props.object_string.uiValues[ 0 ];
        }

        if( !droppedOnObject ) {
            droppedOnObject = '???';
        }

        if( result.docCreated ) {
            var dropCompletedDocumentMsg = localTextBundle.dropCompletedDocument;
            dropCompletedDocumentMsg = dropCompletedDocumentMsg.replace( '{0}', result.docName );
            dropCompletedDocumentMsg = dropCompletedDocumentMsg.replace( '{1}', droppedOnObject );
            dropCompletedDocumentMsg = dropCompletedDocumentMsg.replace( '{2}', sourceObjectsJS.length );
            messagingSvc.showInfo( dropCompletedDocumentMsg );
        } else {
            if( sourceObjectsJS.length > 0 ) {
                var dropCompletedMsg = localTextBundle.dropCompleted;
                dropCompletedMsg = dropCompletedMsg.replace( '{0}', sourceObjectsJS.length );
                dropCompletedMsg = dropCompletedMsg.replace( '{1}', droppedOnObject );
                messagingSvc.showInfo( dropCompletedMsg );
            } else {
                var awDragAndDropTextBundle = localeService.getLoadedText( 'AwDragAndDropMessages' );
                var dropFailedMsg = awDragAndDropTextBundle.dropFailed;
                dropFailedMsg = dropFailedMsg.replace( '{0}', pasteInputJS[ 0 ].sourceObjects[ 0 ].name );
                messagingSvc.showInfo( dropFailedMsg );
            }
        }
    }, function( ex ) {
        logger.error( 'uploadFailures' + ex );
    } );
};

/**
 * Use the 'paste' operation command to perform the actual 'drop' onto the 'target'.
 *
 * @param {ViewModelObject} targetVMO - The 'target' ViewModelObject being dropped onto.
 * @param {Array} sourceFiles - The 'source' JS File objects being dropped.
 * @param {Object} dragAndDropParams - Framework generated drag and drop parameters.
 * @param {Object} validSourceTypes - Valid drop types.
 */
var _pasteSourceFiles = function( targetVMO, sourceFiles, dragAndDropParams, validSourceTypes ) {
    /**
     * Create a map of unique 'relation' type to a list of objects that will be pasted with that 'relation'
     * type.
     */
    var sourceType2RelationMap = _createSourceType2RelationsMap( validSourceTypes );
    var pasteRelation2SourceObjectsMap = {};

    if( sourceFiles ) {
        for( var i = 0; i < sourceFiles.length; i++ ) {
            var sourceObject = sourceFiles[ i ];
            /**
             * Get all the ancestor types for this 'source' type and see if one of them is valid.
             * <P>
             * Note: For dropping files we look to see if the 'target' accepts a 'Dataset' since that is what will
             * ultimately be created.
             */
            var sourceModelType = cmm.getType( TYPE_NAME_DATASET );

            if( sourceModelType ) {
                var sourceTypeHeirarchy = sourceModelType.typeHierarchyArray;
                for( var j = 0; j < sourceTypeHeirarchy.length; j++ ) {
                    var currSourceType = sourceTypeHeirarchy[ j ];
                    var relationType = sourceType2RelationMap[ currSourceType ];
                    if( relationType ) {
                        var sourceObjectsForType = pasteRelation2SourceObjectsMap[ relationType ];
                        if( !sourceObjectsForType ) {
                            sourceObjectsForType = [];
                            pasteRelation2SourceObjectsMap[ relationType ] = sourceObjectsForType;
                        }
                        sourceObjectsForType.push( sourceObject );
                        break;
                    }
                }
            } else {
                logger.warn( 'Unable to locate \'source\' type\' (not loaded yet?): ' + TYPE_NAME_DATASET );
            }
        }
    }

    if( cmm.isInstanceOf( 'Awp0XRTObjectSetRow', targetVMO.modelType ) ) {
        adapterSvc.getAdaptedObjects( [ targetVMO ] ).then( function( adaptedObjs ) {
            executeFileDrop( adaptedObjs[ 0 ], dragAndDropParams.callbackAPIs, pasteRelation2SourceObjectsMap, dragAndDropParams );
        } );
    } else {
        executeFileDrop( targetVMO, dragAndDropParams.callbackAPIs, pasteRelation2SourceObjectsMap, dragAndDropParams );
    }
};

const executeDrop = ( targetVMO, callbackAPIs, pasteRelation2SourceObjectsMap, dragAndDropParams ) => {
    _scheduleSelectTarget( targetVMO, callbackAPIs );
    /**
     * Paste each unique 'relation' type.
     */
    let keys = Object.keys( pasteRelation2SourceObjectsMap );
    if( keys.length > 0 ) {
        let pasteInput = createPasteInput( pasteRelation2SourceObjectsMap, targetVMO, dragAndDropParams );
        publishDropEvent( pasteInput );
    }
};

/**
 * Use the 'paste' operation command to perform the actual 'drop' onto the 'target'.
 *
 * @param {ViewModelObject} targetVMO - The 'target' ViewModelObject being dropped onto.
 *
 * @param {IModelObjectArray} sourceObjects - The 'source' IModelObjects being dropped.
 *
 * @param {Object} callbackAPIs - Callback functions used for various interaction reasons.
 *
 * @param {Object} validSourceTypes - Valid drop types.
 *
 * @param {Object} dragAndDropParams - Framework generated drag and drop parameters.
 */
const _pasteSourceObjects = function( targetVMO, sourceObjects, callbackAPIs, validSourceTypes, dragAndDropParams ) {
    /**
     * Create a map of unique 'relation' type to a list of objects that will be pasted with that 'relation'
     * type.
     */
    var sourceType2RelationMap = _createSourceType2RelationsMap( validSourceTypes );
    let confRevFlag = dragAndDropParams.dataProvider && dragAndDropParams.dataProvider.action &&
        dragAndDropParams.dataProvider.action.inputData &&
        dragAndDropParams.dataProvider.action.inputData.searchInput &&
        dragAndDropParams.dataProvider.action.inputData.searchInput.searchCriteria ?
        dragAndDropParams.dataProvider.action.inputData.searchInput.searchCriteria.showConfiguredRev : undefined;
    if ( !confRevFlag  && dragAndDropParams.props.objectSetData && dragAndDropParams.props.objectSetData.showConfiguredRev === 'true' ) {
        confRevFlag = dragAndDropParams.props.objectSetData.showConfiguredRev;
    }
    if( confRevFlag && confRevFlag.toLowerCase() === 'true' ) {
        let evalObjs = awConfiguredSvc.evaluateObjsConfRevRuleObjectsetPaste( sourceObjects, sourceType2RelationMap, confRevFlag );
        sourceObjects = evalObjs;
    }
    var pasteRelation2SourceObjectsMap = {};

    if( sourceObjects ) {
        for( var i = 0; i < sourceObjects.length; i++ ) {
            var sourceObject = sourceObjects[ i ];

            /**
             * Get all the ancestor types for this 'source' type and see if one of them is valid.
             */
            var sourceType = sourceObject.type;
            var sourceModelType = cmm.getType( sourceType );
            if( sourceModelType ) {
                var sourceTypeHeirarchy = sourceModelType.typeHierarchyArray;
                for( var j = 0; j < sourceTypeHeirarchy.length; j++ ) {
                    var sourceParentType = sourceTypeHeirarchy[ j ];
                    var relationType = sourceType2RelationMap[ sourceParentType ];
                    if( relationType ) {
                        var sourceObjectsForType = pasteRelation2SourceObjectsMap[ relationType ];
                        if( !sourceObjectsForType ) {
                            sourceObjectsForType = [];
                            pasteRelation2SourceObjectsMap[ relationType ] = sourceObjectsForType;
                        }
                        sourceObjectsForType.push( sourceObject );
                        break;
                    }
                }
            } else {
                logger.warn( 'Unable to locate \'source\' type\' (not loaded yet?): ' + sourceType );
            }
        }
    }

    if( cmm.isInstanceOf( 'Awp0XRTObjectSetRow', targetVMO.modelType ) ) {
        adapterSvc.getAdaptedObjects( [ targetVMO ] ).then( function( adaptedObjs ) {
            executeDrop( adaptedObjs[ 0 ], callbackAPIs, pasteRelation2SourceObjectsMap, dragAndDropParams );
        } );
    } else {
        executeDrop( targetVMO, callbackAPIs, pasteRelation2SourceObjectsMap, dragAndDropParams );
    }
};

/**
 * Determine all the valid containers on the page . Check if the 'target'  is compatible with the 'source' types being dragged and,
 * if so, change drag effect to indicate if it is OK to drop on that 'target'.
 *
 * @param {DragEvent} event - DragEnter or DragOver event from global area
 * @return {Object} validHighlightableContainers - All valid applicable containers for highlighing
 */
const getApplicableContainersFromGlobalArea = function( event ) {
    let validHighlightableContainers = [];
    let isValid = false;
    let targetElements = document.body.querySelectorAll( DROP_CLASS );
    if( targetElements ) {
        _.forEach( targetElements, function( targetElement ) {
            if( !targetElement.classList.contains( 'aw-widgets-cellListItemContainer' ) ) {
                isValid = globalValidation( targetElement, event );
                if( isValid ) {
                    validHighlightableContainers.push( targetElement );
                }
            }
        } );
    }
    if( validHighlightableContainers.length === 0 ) {
        if( _debug_logEventActivity >= 1 ) {
            logger.info( 'No valid containers found on the entire page' );
        }
    } else {
        if( _debug_logEventActivity >= 1 ) {
            logger.info( validHighlightableContainers.length + ' valid containers found , highlight in progress' );
        }
    }

    return validHighlightableContainers;
};

/**
 * Set the type of drag-and-drop operation currently selected or sets the operation to a new type. The value
 * must be 'none', 'copy', 'link' or 'move'.
 *
 * @param {DragEvent} event - The DragEvent that holds the 'dataTransfer' property to set.
 * @param {String} value - The 'dropEffect' value to set .
 */
const _setDropEffect = function( event, value ) {
    event.dataTransfer.dropEffect = value;
};

/**
 * Once the last 'paste' is complete, select the 'target' object to show the results of the 'drop'. This should
 * cause the new 'sources' in that object.
 *
 * @param {ViewModelObject} targetVMO - The 'target' ViewModelObject being dropped onto.
 * @param {Object} callbackAPIs - Callback functions used for various interaction reasons.
 */
const _scheduleSelectTarget = function( targetVMO, callbackAPIs ) {
    callbackAPIs.setSelection( targetVMO );
};

//* **************************************************************************
//* **************************************************************************
//* **************************************************************************
//* **************************************************************************

let exports = {};

/*
 * Verify if the dragged data is valid to be dropped on the target element
 */
let globalValidation = ( targetElement, event ) => {
    if( targetElement.classList && targetElement.classList.contains( 'aw-widgets-chooseordropfile' ) && exports.dataTransferContainsFiles( event ) ) {
        return true;
    }
    let sourceDragData = awDragAndDropUtils.getCachedDragData();
    let sourceTypes = null;
    if( sourceDragData ) {
        sourceTypes = sourceDragData.typeList;
    }

    let gridId = targetElement.parentNode && targetElement.parentNode.getAttribute( 'gridid' );
    let scope = ngUtils.getElementScope( targetElement, false );
    let declViewModel = scope && !scope.viewModel ? scope.data : scope.viewModel;
    if( declViewModel && declViewModel.vmo ) {
        let validDropTypes = null;
        //Check if valid drop types are defined on the dataprovider
        //This is required for XRT based tables
        if( gridId ) {
            let gridDef = declViewModel.grids && declViewModel.grids[ gridId ];
            if( gridDef.dataProvider ) {
                let dataProvider = declViewModel.dataProviders && declViewModel.dataProviders[ gridDef.dataProvider ];
                if( dataProvider && dataProvider.validSourceTypes ) {
                    validDropTypes = getValidDropTypesFromDataprovider( dataProvider );
                }
            }
        }
        if( !validDropTypes ) {
            validDropTypes = pasteService.getObjectValidSourceTypes( declViewModel.vmo );
        }

        if( ( !sourceTypes || sourceTypes.length === 0 ) && exports.dataTransferContainsFiles( event ) ) {
            return isValidFileDrop( event, declViewModel.vmo, Object.keys( validDropTypes ) );
        }

        if( validDropTypes ) {
            return _isValidObjectToDropInternal( Object.keys( validDropTypes ), sourceTypes );
        }
    }
    return false;
};

/*
 * Verify if the dragged file(s) is valid to be dropped on the target
 */
const isValidFileDrop = ( event, targetVMO, validSourceTypes ) => {
    /**
     * Get any file type information carried in the 'dataTransfer' property.
     * <P>
     * Check if there are NONE
     * <P>
     * If so: Then just assume the source is just one or more 'DataSet'.
     */
    let fileTypes = awDragAndDropUtils.getDataTransferFileTypes( event );

    if( fileTypes && fileTypes.length === 0 ) {
        fileTypes.push( TYPE_NAME_DATASET );
    }

    /**
     * Create key used to track status and remember the result of the validity test.
     */
    var sb = targetVMO.uid;
    _.forEach( [ ...validSourceTypes, ...fileTypes ], ( type ) => {
        sb += ',' + type;
    } );

    let mapKey = sb;
    /**
     * Check if we already know the result from the last time we asked this question for the same
     * 'source' types and 'target'.
     */
    let result = m_mapKey2Result[ mapKey ];
    if( result ) {
        return result.value;
    }

    let promise = m_mapKey2Promise[ mapKey ];
    if( !promise ) {
        m_mapKey2Promise[ mapKey ] = getDataTransferSourceTypes( targetVMO.uid, fileTypes ).then( function( result2 ) {
            delete m_mapKey2Promise[ mapKey ];

            m_mapKey2Result[ mapKey ] = {
                value: result2 && result2.length > 0 &&
                    _isValidObjectToDropInternal( validSourceTypes, result2 )
            };
        }, function() {
            delete m_mapKey2Promise[ mapKey ];

            m_mapKey2Result[ mapKey ] = {
                value: false
            };
        } );
    }
    return false;
};

const loadValidSourceTypes = ( missingSourceTypes, targetVMO ) => {
    var sb2 = targetVMO.uid;

    for( var jj = 0; jj < missingSourceTypes.length; jj++ ) {
        if( jj > 0 ) {
            sb2 += ',';
        }
        sb2 += missingSourceTypes[ jj ];
    }

    var key = sb2;
    if( !m_typeLookupInProgress[ key ] ) {
        m_typeLookupInProgress[ key ] = key;

        soaSvc.ensureModelTypesLoaded( missingSourceTypes ).then( function() {
            /**
             * Nothing to do now other than removing the lookup placeholder. We just wanted to make sure
             * the type is loaded for the NEXT time we look for it.
             */
            delete m_typeLookupInProgress[ key ];
        }, function( err ) {
            logger.error( 'Unable to get model types: ' + err );
        } );
    }
};

/**
 * Check if dragged data is valid to drop on the 'target'.
 * Note: There will be multiple things being dragged over. We should look at the type (Files, ModelObject,
 * Text). Do we have three handlers, or a smarter handler?
 * For a smarter handler, if this is a folder, it can take objects. This should only cause the drop indicator to
 * be shown for objects.
 *
 * @param {Object} dragAndDropParams - Framework generated drag and drop parameters.
 * @param {STRING} xrtTableUid - Uid of Xrt table.
 * @param {Object} props - props.
 * @returns {Boolean} TRUE if something in the 'dataTransfer' is valid to drop on the 'target'.
 */
const isValidObjectToDrop = function( dragAndDropParams, xrtTableUid, props ) { // eslint-disable-line complexity
    let event = dragAndDropParams.event;
    let targetElement = dragAndDropParams.targetElement;
    let targetVMO = dragAndDropParams.targetObjects && dragAndDropParams.targetObjects[ 0 ];
    if ( !targetVMO ) {
        targetVMO = props.vmo;
    }

    if( !targetElement ) {
        return false;
    }

    if( targetElement.classList && targetElement.classList.contains( 'aw-widgets-chooseordropfile' ) && exports.dataTransferContainsFiles( event ) ) {
        return true;
    }

    /**
     * Check if we do NOT want to allow files from the OS to be dropped and the 'dataTransfer' contains at least
     * one file.
     */
    if( !m_supportingFileDrop && exports.dataTransferContainsFiles( event ) ) {
        return false;
    }

    /**
     * Make sure we have cached 'source' information to work with.
     */
    var sourceUids = null;
    var sourceTypes = null;
    var sourceDragData = awDragAndDropUtils.getCachedDragData();

    if( sourceDragData ) {
        sourceUids = sourceDragData.uidList;
        sourceTypes = sourceDragData.typeList;
    }

    /**
     * Check if the 'target' is actually in the list of 'source' objects being dragged.
     * If so: No need to consider it as a valid drop (onto itself).
     */
    if( sourceUids && targetVMO && sourceUids.length > 0 && _.indexOf( sourceUids, targetVMO.uid ) !== -1 ) {
        return false;
    }

    /**
     * Get the types that are valid to drop on this 'target' and check if the current drag operation 'source'
     * contains at least one of that type.
     */
    const validTypes = _getValidSourceTypes( targetVMO, xrtTableUid );
    var validSourceTypes = validTypes && Object.keys( validTypes );

    if( validSourceTypes && validSourceTypes.length > 0 ) {
        /**
         * Check if the only 'sources' are JS Files on the event.
         * If so: Build a list of 'source' types based on the file extensions.
         * If not: Use the IModelObject 'sources'
         */
        if( ( !sourceTypes || sourceTypes.length === 0 ) && exports.dataTransferContainsFiles( event ) ) {
            return isValidFileDrop( event, targetVMO, validSourceTypes );
        }

        /**
         * Check if any of the valid 'source' types are NOT currently loaded.
         * Note: We need them loaded so we can walk their type hierarchy while looking for a match.
         */
        var missingSourceTypes = [];
        var availableSourceTypes = [];

        validSourceTypes.forEach( ( validSourceType ) => {
            if( !cmm.containsType( validSourceType ) ) {
                missingSourceTypes.push( validSourceType );
            } else {
                availableSourceTypes.push( validSourceType );
            }
        } );
        /**
         * Check if any 'source' types are missing (not loaded yet).
         * If available 'source' types is null and missing 'source' types is not null, Then: Return 'false' for
         * this drop but queue up a server request to get the type so that during further (future) dragging will
         * see the type as loaded.
         */
        if( !availableSourceTypes.length && missingSourceTypes.length ) {
            loadValidSourceTypes( missingSourceTypes, targetVMO );
            return false;
        }

        return _isValidObjectToDropInternal( availableSourceTypes, sourceTypes );
    }

    return false;
};

/**
 * Get map of data format to drag data based on the given 'source' IModelObjects.
 *
 * @param {ViewModelObjectArray} sourceVMOs - The 'source' ViewModelObjects being dragged.
 * @param {String} containerId - The ID of the UI 'container' of the 'source' objects.
 *
 */
const processAWInteropAndHosting = function( sourceVMOs, containerId ) {
    /**
     * Create collections of data associated with the 'source' objects.
     */
    var uidList = [];
    var typeSet = {};

    var interopObjectRefs = [];

    var firstObjectUrl = '';

    var first = true;

    sourceVMOs.forEach( ( modelObject ) => {
        if( cmm.isInstanceOf( 'Awp0XRTObjectSetRow', modelObject.modelType ) ) {
            var adaptedObjs = adapterSvc.getAdaptedObjectsSync( [ modelObject ] );
            modelObject = adaptedObjs[ 0 ];
        }

        /**
         * Grab the first uid from the list for the url and the type
         */
        if( first ) {
            first = false;
            firstObjectUrl = awDragAndDropUtils._getShowObjectURL( modelObject.uid );
        }

        /**
         * Add the UID and type of this object into the collections
         */
        if( modelObject.uid ) {
            uidList.push( modelObject.uid );
        }

        typeSet[ modelObject.type ] = modelObject.type;
        if( _createInteropObjectRefFn ) {
            let cdmModelObject = cdm.getObject( modelObject.uid );
            /**
             * Generate a hosting InteropObjectRef to be used by host applications (i.e. NX) for
             * interpreting this 'source' object.
             */
            var objRefArrayList = _createInteropObjectRefFn( cdmModelObject );

            _.forEach( objRefArrayList, function( objRef ) {
                interopObjectRefs.push( objRef );
            } );
        } else {
            if( _debug_logEventActivity ) {
                logger.warn( 'Unable to determine InteropObjectRef information due to missing callback function' );
            }
        }
    } );

    var dragData = {
        'text/uri-list': firstObjectUrl,
        'text/plain': firstObjectUrl
    };

    /**
     * Include application interop references (if necessary)
     */
    if( interopObjectRefs.length > 0 && _includeDataTransfer ) {
        /**
         * Create the JSON message for interop with host applications.
         */
        var dragDataInterop = {
            DragTargets: interopObjectRefs
        };

        var jsonString = JSON.stringify( dragDataInterop );

        /**
         * Add data for each data format
         * <P>
         * Note: Need multiple data formats right now to handle compatibility with different browsers.
         */
        for( var j = 0; j < DATA_FORMATS.length; j++ ) {
            dragData[ DATA_FORMATS[ j ] ] = jsonString;
        }
    }

    dragData[ 'text/uri-list' ] = firstObjectUrl;
    dragData[ 'text/plain' ] = firstObjectUrl;

    /**
     * Put the other formats onto the dataTransport
     * <P>
     * Note: We need the UIDs and types in the 'keys' (for checking while dragging since the values are not
     * available at that time) and the 'values' to be able to access the data without it being changed to lower
     * case by the browser itself.
     */
    var dragDataJSO = {};

    dragDataJSO.containerId = containerId;
    dragDataJSO.uidList = uidList;
    dragDataJSO.firstObjectUrl = firstObjectUrl;

    dragDataJSO.typeList = [];

    _.forEach( typeSet, function( type ) {
        dragDataJSO.typeList.push( type );
    } );

    awDragAndDropUtils.cacheDraggedData( dragDataJSO );
    awDragAndDropUtils.addDragDataToDragEvent( event, dragData, _includeDataTransfer );
};

/**
 * Remove Highlight when object drag is skipped or object dragged outside white/invalid area
 *
 * @param {DragEvent} event -
 */
const processDragLeaveGlobal = function( event ) {
    var allHighlightedTargets = document.body.querySelectorAll( '.aw-theme-dropframe.aw-widgets-dropframe' );
    if( allHighlightedTargets ) {
        _.forEach( allHighlightedTargets, function( target ) {
            eventBus.publish( DRAG_DROP_HIGHLIGHT_EVENT, {
                event: event,
                isGlobalArea: true,
                isHighlightFlag: false,
                targetElement: target
            } );
        } );
    }
};

const isXrtListOrTableContainer = ( dragAndDropParams, props ) => {
    return  props.vmo && dragAndDropParams.dataProvider && props.objectSetData.source;
};
/**
 * Determine if the DragEvent is over a 'target' that is compatible with the 'source' types being dragged and,
 * if so, change drag effect to indicate if it is OK to drop on that 'target'.
 *
 * @param {Object} dragAndDropParams - Framework generated drag and drop parameters.
 * @param {Object} props - props.
 */
const _processDragOverInternal = function( dragAndDropParams, props ) {
    let event = dragAndDropParams.event;
    let xrtTableUid = null;

    //For list and table, set the vmo on declViewmodel as the target
    if( isXrtListOrTableContainer( dragAndDropParams, props ) ) {
        xrtTableUid = getXrtTableUid( dragAndDropParams, props );
    }

    event.stopPropagation();
    if( isValidObjectToDrop( dragAndDropParams, xrtTableUid, props ) ) {
        dragAndDropParams.callbackAPIs.highlightTarget( {
            isHighlightFlag: true,
            targetElement: dragAndDropParams.targetElement
        } );
        _setDropEffect( event, 'copy' ); // when dragged object is on a valid container, the dragged effect should be \'Copy\'
        event.preventDefault();
    } else { // this ensures if the drop target is an applicable one however not a valid one , all the highlights are gone and a no drop cursor is shown
        _setDropEffect( event, 'none' );
        event.preventDefault();
    }
};

/**
 * @param {Object} dragAndDropParams - Framework generated drag and drop parameters.
 *
 * @param {Object} props - props.
 */
const processDrop = function( dragAndDropParams, props ) {
    let event = dragAndDropParams.event;
    event.preventDefault();

    var targetElement = dragAndDropParams.targetElement;

    if( !targetElement ) {
        awDragAndDropUtils._clearCachedData();
        return;
    }

    dragAndDropParams.callbackAPIs.highlightTarget( {
        isHighlightFlag: false,
        targetElement: targetElement
    } );

    var sourceUids = awDragAndDropUtils.getCachedSourceUids();
    if( sourceUids && sourceUids.length > 0 ) {
        _dropModelObjects( targetElement, sourceUids, dragAndDropParams, props );
    } else {
        var sourceFiles = event.dataTransfer.files;
        if( sourceFiles && sourceFiles.length > 0 ) {
            if( _isDragOverChooseOrDropFileContainer( event ) ) {
                dragAndDropParams.callbackAPIs.updateFileData( event );
            } else {
                _dropFiles( targetElement, sourceFiles, dragAndDropParams, props );
            }
        } else {
            awDragAndDropUtils._clearCachedData();
        }
    }
};

/**
 * Return the target model object for given UID
 *
 * @param {String} uid - UID of the modelObject on which source objects are dragged
 * @return {Object} Modelobject on which source objects are dragged
 */
export let getTargetObjectByUid = function( uid ) {
    return cdm.getObject( uid );
};

/**
 * Look for support of the 'files' in the 'dataTranfer' area of the event.
 *
 * @param {DragEvent} event - The event to test.
 *
 * @return {boolean} TRUE if the 'files' property is found in the 'dataTransfer' property of the event.
 */
export const dataTransferContainsFiles = function( event ) {
    if( event.dataTransfer ) {
        var types = event.dataTransfer.types;

        if( types ) {
            for( var i = 0; i < types.length; ++i ) {
                if( types[ i ] === 'Files' ) {
                    return true;
                }
            }
        }
    }
    return false;
};

/**
 * Returns underlying Object for the given 'source' type.
 *
 * @param {String} targetUID - The UID of the IModelObject that will be the dropped onto (i.e. the data
 *            'target').
 *
 * @param {StringArray} fileTypes - The array with the set of unique file types.
 *
 * @return {Promise} A Promise that will be 'resolved' or 'rejected' when the service is invoked and its
 *         response data is available.
 */
const getDataTransferSourceTypes = function( targetUID, fileTypes ) {
    var targetObject = getTargetObjectByUid( targetUID );
    var request = {
        parent: targetObject,
        fileExtensions: fileTypes
    };

    return soaSvc.postUnchecked( 'Internal-AWS2-2015-10-DataManagement', 'getDatasetTypesWithDefaultRelation',
        request ).then(
        function( response ) {
            if( response.partialErrors || response.PartialErrors || response.ServiceData &&
                response.ServiceData.partialErrors ) {
                return [];
            }

            var dsTypes = [];
            var output = response.output;
            if( output ) {
                for( var i = 0; i < output.length; i++ ) {
                    var dsInfos = output[ i ].datasetTypesWithDefaultRelInfo;
                    for( var j = 0; j < dsInfos.length; j++ ) {
                        var dsInfo = dsInfos[ j ];
                        var dsUid = dsInfo.datasetType.uid;
                        var dsType = getTargetObjectByUid( dsUid );
                        var type = dsType.props.object_string.dbValues[ 0 ];
                        dsTypes.push( type );
                    }
                }
            }

            return soaSvc.ensureModelTypesLoaded( dsTypes ).then( function() {
                return dsTypes;
            } );
        },
        function( e ) {
            logger.trace( e );
            return [];
        } );
};

/**
 * Set a callback function to use to encode 'source' objects in support of hosting.
 *
 * @param {Function} callBackFn - Function used to create InteropObjectRefs that are added to the information
 *            carried for 'source' objects in dragEvents.
 */
export let setCreateInteropObjectRef = function( callBackFn ) {
    _createInteropObjectRefFn = callBackFn;
};

/**
 * Publish a 'drop' topic on the 'paste' channel of the Native JS 'eventBus' with the given data.
 *
 * @param {ObjectArray} pasteInput - An array of objects that maps a unique 'relationType' to the array of
 *            'sourceObjects' {@link IModelObject} s that should be pasted onto the 'targetObject' with that
 *            'relationType'.
 */
const publishDropEvent = function( pasteInput ) {
    eventBus.publishOnChannel( {
        channel: 'paste',
        topic: 'drop',
        data: {
            pasteInput: pasteInput
        }
    } );
};

/*
 * Check if view is the target element. If so, do not process further
 * AW default drag and drop behaviour does not support drag and drop on views
 */
const isTargetView = ( dragAndDropParams ) => {
    if( !dragAndDropParams.dataProvider ) {
        return true;
    }
    return false;
};

const _globalDragEnterAndOver = ( event ) => {
    event.stopPropagation();
    event.preventDefault();

    var sourceUIDs = awDragAndDropUtils.getCachedSourceUids();

    if( sourceUIDs ) {
        awDragAndDropUtils.loadVMOsIfNotAlreadyLoaded( sourceUIDs );
    }
    if( awDragAndDropUtils.dataTransferContainsURLs( event ) ) {
        _setDropEffect( event, 'none' );
    } else {
        _setDropEffect( event, 'none' );
        var allHighlightableTargets = getApplicableContainersFromGlobalArea( event );
        if( allHighlightableTargets.length && !isGlobalHighlightPublished ) {
            processDragLeaveGlobal();
            _.forEach( allHighlightableTargets, function( targetElement ) {
                eventBus.publish( DRAG_DROP_HIGHLIGHT_EVENT, {
                    event: event,
                    isGlobalArea: true,
                    isHighlightFlag: true,
                    targetElement: targetElement
                } );
            } );
            isGlobalHighlightPublished = true;
        }
    }
};

/**
 * @param {event} event - Dragover event
 *
 * @return {Object} targetElement - choose or drop file widget which do not require validation or
 *                                   'undefined' if not over Choose or Drop File widgets
 */
var _isDragOverChooseOrDropFileContainer = function( event ) {
    var targetElement = null;
    if( event && event.target && event.target.classList && event.target.classList.contains( 'aw-widgets-chooseordropfile' ) ) {
        targetElement = event.target;
    } else {
        var cfContainer = ngUtils.closestElement( event.target, '.aw-widgets-chooseordropfile' );
        if( cfContainer ) {
            targetElement = cfContainer;
        }
    }
    return targetElement;
};

const registerEvents = function() {
    //LCS-148724 , Adding listeners to global area i.e the area outside panelElement of setupDragAndDrop() function
    document.body.addEventListener( 'dragenter', function( event ) {
        var chooseFileContainer = _isDragOverChooseOrDropFileContainer( event );
        if( chooseFileContainer ) {
            chooseFileContainer.addEventListener( 'dragenter', function( ev ) {
                processDragLeaveGlobal( ev );
                ev.stopPropagation();
                ev.preventDefault();
            } );
        }

        _setDropEffect( event, 'none' );
        _globalDragEnterAndOver( event );
    } );
    document.body.addEventListener( 'dragover', function( event ) {
        _globalDragEnterAndOver( event );
    } );
    document.body.addEventListener( 'dragleave', function( event ) {
        event.stopPropagation();
    } );
    document.body.addEventListener( 'dragend', function( event ) {
        isGlobalHighlightPublished = false;
        event.stopPropagation();
        processDragLeaveGlobal( event );
        awDragAndDropUtils._clearCachedData();
    } );
};

export const dragStart = function( dragAndDropParams ) {
    /**
     * Determine some hosting related options at the start.
     */
    _includeDataTransfer = appCtxSvc.ctx.aw_host_type !== 'ADOBE';
    _publishHostingEvents = appCtxSvc.ctx.aw_hosting_enabled;

    // D-52947: Prevent issues when text is highlighted as drag starts. Event.target may be text.
    if( dragAndDropParams.event.target.nodeName === '#text' ) {
        dragAndDropParams.event.preventDefault();
    } else {
        if( _debug_logEventActivity >= 2 ) {
            logger.info( 'dragstart: ' + '\n' + JSON.stringify( dragAndDropParams.event, null, 2 ) );
        }

        if( _publishHostingEvents ) {
            eventBus.publish( HOSTING_DRAG_DROP_EVENT, {
                type: 'dragstart',
                event: dragAndDropParams.event
            } );
        }

        var sourceVMOs = dragAndDropParams.targetObjects;
        if( sourceVMOs && sourceVMOs.length > 0 ) {
            if( _debug_logEventActivity >= 1 ) {
                logger.info( 'Source Item UID: ' + awDragAndDropUtils.getViewModelObjectName( sourceVMOs[ 0 ] ) );
            }

            var containerId = Date.now();
            processAWInteropAndHosting( sourceVMOs, containerId.toString() );
            awDragAndDropUtils.updateDragImage( dragAndDropParams, sourceVMOs.length, _includeDataTransfer );

            if( !_includeDataTransfer ) {
                dragAndDropParams.event.dataTransfer.clearData();
            }
        } else {
            dragAndDropParams.event.preventDefault();
        }
    }
};

export const dragEnd = function( dragAndDropParams ) {
    if( dragAndDropParams.event ) {
        if( _debug_logEventActivity >= 2 ) {
            logger.info( 'dragend: ' + '\n' + JSON.stringify( dragAndDropParams.event, null, 2 ) );
        }

        if( _publishHostingEvents ) {
            eventBus.publish( HOSTING_DRAG_DROP_EVENT, {
                type: 'dragend',
                event: dragAndDropParams.event
            } );
        }

        if( isTargetView( dragAndDropParams ) ) {
            return;
        }

        var element = dragAndDropParams.targetElement;
        if( element ) {
            var dragImage = element.getElementsByClassName( 'aw-widgets-multidragimage' )[ 0 ];

            if( dragImage ) {
                element.style.position = '';
                dragImage.parentNode.removeChild( dragImage );
            }
        }

        isGlobalHighlightPublished = false;
        processDragLeaveGlobal();
        awDragAndDropUtils._clearCachedData();
    }
};

export const dragOver = function( props, dragAndDropParams ) {
    if( dragAndDropParams.event ) {
        if( isTargetView( dragAndDropParams ) ) {
            return;
        }
        if( _debug_logEventActivity >= 3 ) {
            logger.info( 'dragover: ' + '\n' + JSON.stringify( dragAndDropParams.event, null, 2 ) );
        }

        if( _publishHostingEvents ) {
            eventBus.publish( HOSTING_DRAG_DROP_EVENT, {
                type: 'dragover',
                event: dragAndDropParams.event
            } );
        }
        isGlobalHighlightPublished = false;
        processDragOver( dragAndDropParams, props );
    }
};

export const dragEnter = function( props, dragAndDropParams ) {
    if( dragAndDropParams.event ) {
        if( isTargetView( dragAndDropParams ) ) {
            return;
        }
        if( _debug_logEventActivity >= 2 ) {
            logger.info( 'dragenter: ' + '\n' + JSON.stringify( event, null, 2 ) );
        }

        if( _publishHostingEvents ) {
            eventBus.publish( HOSTING_DRAG_DROP_EVENT, {
                type: 'dragenter',
                event: dragAndDropParams.event
            } );
        }
        dragAndDropParams.event.preventDefault();

        _setValidDropTypesOnTarget( dragAndDropParams, props );
        /*
         * When file is dragged from the OS, the default drop effect(move/copy: depending on type of file)
         * is set. During dragEnter if drag effect is not set, the default effect is shown which causes flickering
         * of the drop icon. Hence, adding validity check for files.
         * Note: Objects(row/cell) are being dragged from browser itself, and no default drop effect is set(ny dragStart handler).
         * To avoid repeated processing during dragEnter and dragOver, validity for objects is not processed here.
         */
        if( dataTransferContainsFiles( dragAndDropParams.event ) ) {
            let xrtTableUid = null;
            if( isXrtListOrTableContainer( dragAndDropParams, props ) ) {
                xrtTableUid = getXrtTableUid( dragAndDropParams, props );
            }
            if( isValidObjectToDrop( dragAndDropParams, xrtTableUid, props ) ) {
                dragAndDropParams.callbackAPIs.highlightTarget( {
                    isHighlightFlag: true,
                    targetElement: dragAndDropParams.targetElement
                } );
                _setDropEffect( event, 'copy' );
                dragAndDropParams.event.preventDefault();
            }
            _setDropEffect( dragAndDropParams.event, 'none' );
        }
    }
};

export const dragLeave = function( dragAndDropParams ) {
    if( dragAndDropParams.event ) {
        if( isTargetView( dragAndDropParams ) ) {
            return;
        }
        if( _debug_logEventActivity >= 2 ) {
            logger.info( 'dragleave: ' + '\n' + JSON.stringify( dragAndDropParams.event, null, 2 ) );
        }

        if( _publishHostingEvents ) {
            eventBus.publish( HOSTING_DRAG_DROP_EVENT, {
                type: 'dragleave',
                event: dragAndDropParams.event
            } );
        }

        const processDragLeave = ( event ) => {
            event.preventDefault();
            dragAndDropParams.callbackAPIs.highlightTarget( {
                isHighlightFlag: false,
                targetElement: dragAndDropParams.targetElement
            } );
        };
        var debounceProcessDragLeave = _.debounce( processDragLeave, 100 );
        debounceProcessDragLeave( dragAndDropParams.event );
    }
};

export const drop = function( props, dragAndDropParams ) {
    let event = dragAndDropParams.event;
    let param = { ...dragAndDropParams, props: props };
    if( event ) {
        if( _debug_logEventActivity >= 2 ) {
            logger.info( 'drop: ' + '\n' + JSON.stringify( event, null, 2 ) );
        }

        if( _publishHostingEvents ) {
            eventBus.publish( HOSTING_DRAG_DROP_EVENT, {
                type: 'drop',
                event: event
            } );
        }

        processDrop( param, props );
    }
};

exports = {
    getTargetObjectByUid,
    dataTransferContainsFiles,
    setCreateInteropObjectRef,
    dragStart,
    dragEnd,
    dragOver,
    dragEnter,
    dragLeave,
    drop
};

//Revisit me: Ria, Kapil
//This is not critical for phase 0. Will be supported in phase 1
//registerEvents();

export default exports;
