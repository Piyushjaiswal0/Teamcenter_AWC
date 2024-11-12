/* eslint-disable max-lines */
// Copyright (c) 2022 Siemens

/**
 * @module js/addObjectUtils
 */
import AwPromiseService from 'js/awPromiseService';
import listBoxSvc from 'js/listBoxService';
import tcSesnD from 'js/TcSessionData';
import cdm from 'soa/kernel/clientDataModel';
import _cmm from 'soa/kernel/clientMetaModel';
import appCtxService from 'js/appCtxService';
import _dmSrv from 'soa/dataManagementService';
import _objTypesSrv from 'js/objectTypesService';
import _soaService from 'soa/kernel/soaService';
import _uwPropSrv from 'js/uwPropertyService';
import _messagingService from 'js/messagingService';
import localeService from 'js/localeService';
import awIconSvc from 'js/awIconService';
import xrtParserService from 'js/xrtParser.service';
import editHandlerService from 'js/editHandlerService';
import dataSourceService from 'js/dataSourceService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import $ from 'jquery';
import dsmUtils from 'js/dsmUtils';
import propPolicySvc from 'soa/kernel/propertyPolicyService';
import cfgSvc from 'js/configurationService';
import conditionService from 'js/conditionService';
import { getAdaptedObjectsSync } from 'js/adapterService';

var exports = {};

var _failureToAttachFiles;
var _fileInputForms;
var _filesToBeRelated;
var _datasetInfoIndex = 0;
var _fmsUrl = '';
var _fileNameMaxLen = 132;
const editHandlerContextConstant = {
    CREATE: 'CREATE_PANEL_CONTEXT',
    REVISE: 'REVISE_PANEL_CONTEXT',
    SAVEAS: 'SAVEAS_PANEL_CONTEXT'
};

// By default, show 3 types in Recent section
var MAX_RECENT_TYPE_COUNT = 3;
// Threshold number of types required in order to see the recent types and filter fields
var RECENTTYPES_VIEW_THRESHOLD = 10;

var _getCreateInputObject = function( boName, propertyNameValues, compoundCreateInput ) {
    return {
        boName: boName,
        propertyNameValues: propertyNameValues,
        compoundCreateInput: compoundCreateInput
    };
};

/**
 * Private method to create input for create item
 *
 * @param fullPropertyName property name
 * @param propName property name
 * @param parentTypeName parent type name
 * @param createInputMap create input map
 * @param operationInputViewModelObject view model object
 * @return {String} full property name
 */
var _addChildInputToParentMap = function( fullPropertyName, propName, parentTypeName, createInputMap ) {
    var childFullPropertyName = fullPropertyName;
    if( childFullPropertyName.length > 0 ) {
        childFullPropertyName += '__' + propName; //NON-NLS-1
    } else {
        childFullPropertyName += propName;
    }

    // Check if the child create input is already created
    var childCreateInput = _.get( createInputMap, childFullPropertyName );
    if( !childCreateInput && parentTypeName ) {
        var parentType = _cmm.getType( parentTypeName );
        if( parentType ) {
            // Get the parent create input
            var parentCreateInput = _.get( createInputMap, fullPropertyName );
            if( parentCreateInput ) {
                // Create the child create input
                // Add the child create input to parent create input
                childCreateInput = _getCreateInputObject( parentType.owningType, {}, {} );
                if( !parentCreateInput.compoundCreateInput.hasOwnProperty( propName ) ) {
                    parentCreateInput.compoundCreateInput[ propName ] = [];
                }
                parentCreateInput.compoundCreateInput[ propName ].push( childCreateInput );

                createInputMap[ childFullPropertyName ] = childCreateInput;
            }
        }
    }
    return childFullPropertyName;
};

/*
 * Private method to create input for create item for Custom Panel viewmodel
 *
 * @param fullPropertyName property name
 * @param count current count
 * @param propertyNameTokens property name tokens
 * @param createInputMap create input map
 * @param operationInputViewModelObject view model object
 * @return String full property name
 */
var _addChildInputToParentMapFromCustomPanel = function( fullPropertyName, count, propertyNameTokens, createInputMap,
    vmProp ) {
    var propName = propertyNameTokens[ count ];
    var childFullPropertyName = fullPropertyName;
    if( count > 0 ) {
        childFullPropertyName += '__' + propName; //NON-NLS-1
    } else {
        childFullPropertyName += propName;
    }
    // Check if the child create input is already created
    var childCreateInput = _.get( createInputMap, childFullPropertyName );
    if( !childCreateInput && vmProp && vmProp.intermediateCompoundObjects ) {
        var compoundObject = _.get( vmProp.intermediateCompoundObjects, childFullPropertyName );
        if( compoundObject ) {
            // Get the parent create input
            var parentCreateInput = _.get( createInputMap, fullPropertyName );
            if( parentCreateInput ) {
                // Create the child create input
                // Add the child create input to parent create input
                childCreateInput = _getCreateInputObject( compoundObject.modelType.owningType, {}, {} );
                if( !parentCreateInput.compoundCreateInput.hasOwnProperty( propName ) ) {
                    parentCreateInput.compoundCreateInput[ propName ] = [];
                }
                parentCreateInput.compoundCreateInput[ propName ].push( childCreateInput );
                createInputMap[ childFullPropertyName ] = childCreateInput;
            }
        }
    }
    return childFullPropertyName;
};

var _processPropertyForCreateInput = function( propName, vmProp, createInputMap ) {
    if( vmProp ) {
        var valueStrings = _uwPropSrv.getValueStrings( vmProp );
        if( valueStrings && valueStrings.length > 0 ) {
            var fullPropertyName = '';
            var propertyNameTokens = propName.split( '.' );
            for( var i = 0; i < propertyNameTokens.length; i++ ) {
                var propertyName = '';
                var parentTypeName = null;
                if( propertyNameTokens[ i ].startsWith( 'REF' ) ) {
                    var index = propertyNameTokens[ i ].indexOf( ',' );
                    propertyName = propertyNameTokens[ i ].substring( 4, index ).trim();
                    parentTypeName = propertyNameTokens[ i ].substring( index + 1, propertyNameTokens[ i ].length - 1 ).trim();
                } else {
                    propertyName = propertyNameTokens[ i ];
                }

                if( i < propertyNameTokens.length - 1 ) {
                    // Handle child create inputs
                    fullPropertyName = _addChildInputToParentMap( fullPropertyName, propertyName, parentTypeName,
                        createInputMap );
                } else {
                    // Handle property
                    var createInput = createInputMap[ fullPropertyName ];
                    if( createInput ) {
                        var propertyNameValues = createInput.propertyNameValues;
                        _.set( propertyNameValues, propertyName, valueStrings );
                    }
                }
            }
        }
    }
};

var _processPropertyForCustomPanelInput = function( propName, vmProp, createInputMap ) {
    if( vmProp ) {
        var valueStrings = _uwPropSrv.getValueStrings( vmProp );
        if( valueStrings && valueStrings.length > 0 ) {
            var propertyNameTokens = propName.split( '__' );
            var fullPropertyName = '';
            for( var i = 0; i < propertyNameTokens.length; i++ ) {
                if( i < propertyNameTokens.length - 1 ) {
                    // Handle child create inputs
                    fullPropertyName = _addChildInputToParentMapFromCustomPanel( fullPropertyName, i, propertyNameTokens,
                        createInputMap, vmProp );
                } else {
                    // Handle property
                    var createInput = createInputMap[ fullPropertyName ];
                    if( createInput ) {
                        var propertyNameValues = createInput.propertyNameValues;
                        _.set( propertyNameValues, propertyNameTokens[ i ], valueStrings );
                    }
                }
            }
        }
    }
};

export let updatedbValue = function( input ) {
    return input[ 0 ] === '1';
};
/**
 * Get the assignable projects according to different versionSupport
 *
 * @param {Object} data - the view model data object
 * @param {Object} sortCriteria -
 * @param {Integer} startIndex -
 * @param {Object} filterVal -
 * @returns {Promise} Promise object
 */
export let getPropertiesProject = function( data, sortCriteria, startIndex, filterVal ) {
    var userCtx = appCtxService.getCtx( 'user' );

    if( exports.isSupportedTCVersion() ) {
        // Create the input structure
        return _soaService.postUnchecked( 'Core-2017-05-ProjectLevelSecurity', 'getProjectsForAssignOrRemove', {
            projectsInput: [ {
                user: {
                    type: userCtx.type,
                    uid: userCtx.uid
                },
                selectedObjects: [],
                assignedObjects: [],
                isAceContext: false,
                filterText: filterVal,
                paginationInfo: {
                    startIndexForAvailableProjects: startIndex ? startIndex : 0,
                    maxToReturnForAvailableProjects: 50
                }
            } ]
        } ).then( function( response ) {
            if( response ) {
                data.projects = exports.getProjects( response );
                if( !_.isEmpty( sortCriteria ) ) {
                    data.projects = exports.sortProjects( data.projects, sortCriteria );
                }
                data.totalProjectsFound = response.totalFound;
                return data.projects;
            }
            return null;
        } );
    }

    return _soaService.postUnchecked( 'Core-2006-03-DataManagement', 'getProperties', {
        attributes: [ 'assignable_projects' ],
        objects: [ userCtx ]
    } ).then( function( response ) {
        if( response ) {
            var totalProjects = exports.getProjects( response );
            if( filterVal ) {
                var filteredObjects = _.filter( totalProjects, function( o ) {
                    return o.props.project_name.dbValues[ 0 ].indexOf( filterVal ) > -1 ||
                        o.props.object_string.dbValues[ 0 ].indexOf( filterVal ) > -1;
                } );
                data.projects = filteredObjects;
            } else {
                data.projects = totalProjects;
            }
            data.totalProjectsFound = data.projects.length;
            return data.projects;
        }
        return null;
    } );
};

/**
 * Checks the TC version and returns the boolean <br>
 * Used before calling SOA which is available in 11.3 and later version
 *
 * @returns {Boolean} true if supported TC version, false otherwise
 */
export let isSupportedTCVersion = function() {
    var tcMajor = tcSesnD.getTCMajorVersion();
    var tcMinor = tcSesnD.getTCMinorVersion();
    var qrmNumber = tcSesnD.getTCQRMNumber();

    if( tcMajor === 11 && tcMinor >= 3 || tcMajor === 11 && tcMinor >= 2 && qrmNumber >= 4 ) {
        return true;
    }
    if( tcMajor > 11 ) {
        return true;
    }

    return false;
};

/**
 * clears selected types
 */
export let clearSelectedType = function( clearSelectedTypeFn ) {
    clearSelectedTypeFn();
};

/**
 * shows more link styles
 */
export let showMoreLinkStyles = function( showMoreLinkStylesFn ) {
    showMoreLinkStylesFn();
};

/**
 * set the selection model of given dataprovider
 *
 * @param {DataProvider} Dataprovider - whose selection model to update selectionMode
 * @param {selectionMode} selectionMode - single / multiple
 */
export let updateSelectionModeForDataProvider = function( dataProvider, selectionMode ) {
    if( selectionMode ) {
        dataProvider.selectionModel.setMode( selectionMode );
    }
};

/**
 * Get the most recent used types
 *
 * @param {Integer} maxRecentTypeCount the max amount of objects to return
 * @param {String} filterTypesString the filter types joined by comma.
 * @return {Object} a promise with no data, once the data is loaded at client side.
 */
export let getRecentUsedTypes = async function( maxRecentTypeCount, filterTypesString ) {
    var filterTypes = [];
    if( filterTypesString ) {
        filterTypes = filterTypesString.split( ',' );
    }

    let recentTypeNames = await _objTypesSrv.getRecentModelTypes();
    var uids = [];
    var recentUsedTypes = [];
    for( var i = 0; i < recentTypeNames.length; i++ ) {
        var type = _cmm.getType( recentTypeNames[ i ] );
        if( type &&
            ( filterTypes.length === 0 || _.intersection( filterTypes, type.typeHierarchyArray ).length > 0 ) ) {
            uids.push( type.uid );
            recentUsedTypes.push( type );
        }
    }

    if( maxRecentTypeCount !== undefined && maxRecentTypeCount !== null ) {
        uids = _.slice( uids, 0, maxRecentTypeCount );
        recentUsedTypes = _.slice( recentUsedTypes, 0, maxRecentTypeCount );
    }

    await _dmSrv.loadObjects( uids );


    return {
        preferredChoices: recentUsedTypes.map( modelType => {
            let obj = cdm.getObject( modelType.uid );
            var typeHierarchy = [];
            if( obj ) {
                var type = _cmm.getType( obj.uid );
                if( type ) {
                    typeHierarchy = type.typeHierarchyArray;
                } else {
                    let typeName = obj.props.type_name.dbValue ? obj.props.type_name.dbValue : obj.props.type_name.dbValues[ 0 ];
                    typeHierarchy.push( typeName );
                    var parentTypes = obj.props.parent_types.dbValues;
                    for( var j in parentTypes ) {
                        // parentType is of form "TYPE::Item::Item::WorkspaceObject"
                        var arr = parentTypes[ j ].split( '::' );
                        typeHierarchy.push( arr[ 1 ] );
                    }
                }
            }

            let typeIcon = awIconSvc.getTypeIconFileUrlForTypeHierarchy( typeHierarchy );

            return {
                propInternalValue: obj.uid,
                propDisplayValue: obj.props.object_string.uiValues[ 0 ],
                object: obj,
                iconSource: typeIcon
            };
        } )
    };
};

/**
 * Update the recent model types preference
 *
 * @param {String} recentTypeName -
 */
export let updateRecentUsedTypes = function( recentTypeName ) {
    if( recentTypeName ) {
        _objTypesSrv.updateRecentModelTypes( recentTypeName );
    }
};

/**
 * Get input data for object creation.
 *
 * @param {Object} data - the view model data object
 * @return {Object} create input
 */
export let getCreateInput = function( data, extensionVMProps, creationType, editHandlerIn ) {
    var createInputMap = {};
    let createType = '';

    if( data.creationType && data.creationType.props && data.creationType.props.type_name ) {
        createType = data.creationType.props.type_name.dbValues[ 0 ];
    } else if( creationType ) {
        //it maybe a prop type_name or a string
        createType = creationType.props ? creationType.props.type_name.dbValues[ 0 ] : creationType;
    } else if( data.objCreateInfo ) {
        createType = data.objCreateInfo.createType;
    }

    createInputMap[ '' ] = _getCreateInputObject( createType, {}, {} );

    // 'data.workflowData' and 'data.dataToBeRelated' need be set properly at application's Add panel if they are required for create input.
    var dataToBeRelated = data.dataToBeRelated;
    if( !dataToBeRelated ) {
        dataToBeRelated = {};
    }

    _fileInputForms = data.fileInputForms;
    if( !_fileInputForms ) {
        _fileInputForms = [];
    }

    let editHandler = editHandlerIn;
    if( !editHandler ) {
        editHandler = editHandlerService.getEditHandler( editHandlerContextConstant.CREATE );
    }

    if( editHandler ) {
        let dataSource = editHandler.getDataSource();
        if( dataSource ) {
            let allEditableProperties = dataSource.getAllEditableProperties();
            _.forEach( allEditableProperties, function( vmProp ) {
                // LCS-764623 Always send awp0ProcessTemplates to createInput because it needs to be set in workflowData of createAttachAndSubmitObjects SOA
                if( vmProp && ( vmProp.isAutoAssignable || _uwPropSrv.isModified( vmProp ) || vmProp.propertyName === 'awp0ProcessTemplates' ) ) {
                    _processPropertyForCreateInput( vmProp.propertyName, vmProp, createInputMap );
                }
            } );

            let modifiedViewModelProperties = dataSource.getAllModifiedProperties();
            _.forEach( modifiedViewModelProperties, function( vmProp ) {
                if( vmProp && ( vmProp.isAutoAssignable || _uwPropSrv.isModified( vmProp ) ) ) {
                    _processPropertyForCreateInput( vmProp.propertyName, vmProp, createInputMap );
                }
            } );
        }
        if( dataSource.getDeclViewModel() && dataSource.getDeclViewModel().customPanelInfo ) {
            _.forEach( dataSource.getDeclViewModel().customPanelInfo, function( customPanelVMData ) {
                // copy custom panel's dataToBeRelated
                var customDataToBeRelated = customPanelVMData.dataToBeRelated;
                if( customDataToBeRelated ) {
                    dataToBeRelated = Object.assign( dataToBeRelated, customDataToBeRelated );
                }

                // copy custom panel's fileInputForms
                var customFileInputForms = customPanelVMData.fileInputForms;
                if( customFileInputForms ) {
                    _fileInputForms = _fileInputForms.concat( customFileInputForms );
                }

                // copy custom panel's properties
                var oriVMData = customPanelVMData._internal.origDeclViewModelJson.data;
                _.forEach( oriVMData, function( propVal, propName ) {
                    if( _.has( customPanelVMData, propName ) ) {
                        var vmProp = customPanelVMData[ propName ];
                        if( propName.includes( '__' ) ) {
                            _processPropertyForCustomPanelInput( propName, vmProp, createInputMap );
                        } else {
                            _processPropertyForCreateInput( propName, vmProp, createInputMap );
                        }
                    }
                } );
            } );
        }

        if( extensionVMProps ) {
            _.forEach( extensionVMProps, function( vmProp, propertyName ) {
                if( propertyName.includes( '__' ) ) {
                    _processPropertyForCustomPanelInput( propertyName, vmProp, createInputMap );
                } else {
                    _processPropertyForCreateInput( propertyName, vmProp, createInputMap );
                }
            } );
        }
    }

    // Check file name that is greater 132 length, remove from the input list of attache files, and show warnings on the error file
    if ( dataToBeRelated.attachFiles ) {
        var i = dataToBeRelated.attachFiles.length;
        while ( i-- ) {
            if ( dataToBeRelated.attachFiles[i].length > _fileNameMaxLen ) {
                if( !data.fileNameExceedsLengthLimit ) {
                    data.fileNameExceedsLengthLimit = [];
                }

                data.fileNameExceedsLengthLimit.push( dataToBeRelated.attachFiles[i] );
                localeService.getLocalizedTextFromKey( 'addObjectMessages.fileNameExceedsLengthLimit' ).then( result => {
                    _messagingService.showError( result.replace( '{0}', data.fileNameExceedsLengthLimit.shift() ) );
                } );
                // Remove the fileName that exceeds the length limit from the list of attach files.
                dataToBeRelated.attachFiles.splice( i, 1 );
            }
        }
    }

    // In order to use 'data.workflowData', awp0ProcessTemplates must be set on objects
    // XRT Create Descriptor ( <property name="REF(revision,DocumentRevisionCreI).awp0ProcessTemplates" ></property>).
    // Setting it will expose the Workflow drop down selection list and enable the user to
    // select a workflow process temaplate that will be used to submit the newly created object.
    const cType = _cmm.getType( createType );
    const processTemplateProp = cType && cType.typeHierarchyArray && cType.typeHierarchyArray.indexOf( 'Item' ) > -1 ?  'revision.propertyNameValues.awp0ProcessTemplates' : '.propertyNameValues.awp0ProcessTemplates';
    var workflowData = {};
    let processTemplates = _.get( createInputMap, processTemplateProp );
    if( processTemplates && processTemplates.length > 0 ) {
        workflowData = {
            submitToWorkflow: [ '1' ],
            workflowTemplateName: processTemplates
        };
    } else if( data.workflowData ) {
        workflowData = data.workflowData;
    }

    // store for later use
    data.filesToBeRelated = dataToBeRelated.attachFiles;
    _filesToBeRelated = dataToBeRelated.attachFiles;

    //
    // Check if creation is conditional for a set of valid types
    // Do not send target as part of creation, this is likely creation under object set
    // Object set cases could override the server's default paste behavior.
    //

    data.pasteOnTargetCondition = false;

    return [ {
        clientId: 'CreateObject',
        createData: _.get( createInputMap, '' ),
        dataToBeRelated: dataToBeRelated,
        workflowData: workflowData,
        targetObject: null,
        pasteProp: ''
    } ];
};

/**
 * when calling createRelations SOA , based on the secondaryObject's length, create the different SOA input
 *
 * @param {Object} data the view model data object
 */
export let getCreateRelationsInput = function( data, targetObjectIn, sourceObjectsIn, creationRelationIn ) {
    let sourceObjects = data.sourceObjects ? data.sourceObjects : sourceObjectsIn;
    let targetObject = data.targetObject ? data.targetObject : targetObjectIn;
    let creationRelation = data.creationRelation ? data.creationRelation : creationRelationIn;

    var input = [];

    for( var secondObj in sourceObjects ) {
        var primaryObjectInrelation = targetObject;
        var secondaryObjectInrelation = sourceObjects[ secondObj ];
        var relationName = creationRelation.dbValue;
        var s2pSubString = 'S2P:';
        if( _.includes( relationName, s2pSubString ) ) {
            primaryObjectInrelation = sourceObjects[ secondObj ];
            secondaryObjectInrelation = targetObject;
            relationName = relationName.replace( 'S2P:', '' );
        }
        var inputData = {
            primaryObject: primaryObjectInrelation,
            secondaryObject: secondaryObjectInrelation,
            relationType: relationName,
            clientId: '',
            userData: {
                uid: 'AAAAAAAAAAAAAA',
                type: 'unknownType'
            }
        };
        input.push( inputData );
    }
    return input;
};

/**
 * Gets the created object from createRelateAndSubmitObjects SOA response. Returns ItemRev if the creation type
 * is subtype of Item.
 *
 * @param {Object} response - the response of createRelateAndSubmitObjects SOA call
 * @param {StringArray} validTypes - valid types
 * @return {Object} the created object
 */
export let getCreatedObject = function( response, validTypes ) {
    var createdObjects = exports.getCreatedObjects( response, validTypes );
    if( createdObjects && createdObjects.length > 0 ) {
        return createdObjects[ 0 ];
    }
    return null;
};

/**
 * Gets the created object from createRelateAndSubmitObjects SOA response. Returns ItemRev if the creation type
 * is subtype of Item.
 *
 * @param {Object} response - the response of createRelateAndSubmitObjects SOA call
 * @param {StringArray} validTypesIn - valid types array
 * @return {ObjectArray} Array of created objects
 */
export let getCreatedObjects = function( response, validTypesIn ) {
    var newObjects = [];

    let validTypes = validTypesIn ? validTypesIn : [];
    if( response.output ) {
        for( var index in response.output ) {
            if( response.output[ index ].objects ) {
                var newObject = response.output[ index ].objects[ 0 ];
                newObject = cdm.getObject( newObject.uid );
                // If the created Object is a subtype of Item, then take its item revision
                if( newObject.modelType.typeHierarchyArray.indexOf( 'Item' ) > -1 ) {
                    // LCS-258561 If created object is valid type other than workspaceObject, do not take its item revision
                    let isValidType = false;
                    for( const validType of validTypes ) {
                        if( validType !== 'WorkspaceObject' && newObject.modelType.typeHierarchyArray.indexOf( validType ) > -1  ) {
                            isValidType = true;
                            break;
                        }
                    }

                    if( !isValidType ) {
                        var itemRevPastedOnTarget = true;
                        if( newObject.modelType.constantsMap &&
                              newObject.modelType.constantsMap.Fnd0ItemRevPasteOnTargetUponCreate &&
                              newObject.modelType.constantsMap.Fnd0ItemRevPasteOnTargetUponCreate === 'false' ) {
                            itemRevPastedOnTarget = false;
                        }

                        if( itemRevPastedOnTarget ) {
                            var createdItemObj = cdm.getObject( newObject.uid );
                            if( createdItemObj && createdItemObj.props && createdItemObj.props.revision_list ) {
                                newObject = cdm.getObject( createdItemObj.props.revision_list.dbValues[ 0 ] );
                            } else if( response.output[ index ].objects.length >= 3 ) {
                                // TODO: remove this when all consumers load revision_list property
                                // Assuming the [2] element is Item Revision !!!
                                newObject = response.output[ index ].objects[ 2 ];
                            }
                        }
                    }
                }
                newObjects.push( newObject );
            }
        }
    }
    return newObjects;
};

/**
 * Gets the created object from createRelateAndSubmitObjects SOA response. Returns ItemRev if the creation type
 * is subtype of Item.
 *
 * @param {Object} response - the response of createRelateAndSubmitObjects SOA call
 * @return {ObjectArray} Array of created objects
 */
export let getCreatedObjectsForAddACopy = function( response ) {
    var newObjects = [];

    if( response.output ) {
        for( var index in response.output ) {
            if( response.output[ index ].objects ) {
                var newObject = response.output[ index ].objects[ 0 ];
                newObject = cdm.getObject( newObject.uid );
                // If the created Object is a subtype of Item, then take its item revision
                if( newObject.modelType.typeHierarchyArray.indexOf( 'Item' ) > -1 ) {
                    var itemRevPastedOnTarget = true;
                    if( newObject.modelType.constantsMap &&
                        newObject.modelType.constantsMap.Fnd0ItemRevPasteOnTargetUponCreate ) {
                        if( newObject.modelType.constantsMap.Fnd0ItemRevPasteOnTargetUponCreate === 'false' ) {
                            itemRevPastedOnTarget = false;
                        }
                    }
                    if( itemRevPastedOnTarget ) {
                        var createdItemObj = cdm.getObject( newObject.uid );
                        if( createdItemObj && createdItemObj.props && createdItemObj.props.revision_list ) {
                            newObject = cdm.getObject( createdItemObj.props.revision_list.dbValues[ 0 ] );
                        } else if( response.output[ index ].objects.length >= 3 ) {
                            // TODO: remove this when all consumers load revision_list property
                            // Assuming the [2] element is Item Revision !!!
                            newObject = response.output[ index ].objects[ 2 ];
                        }
                    }
                }
                newObjects.push( newObject );
            }
        }
    }
    return newObjects;
};

/**
 * For create relation operation, get the source and target model objects to be used in the eventData of
 *cdm.relatedModified event.
 *
 * @param {ObjectArray} sourceObjects The source view model objects
 * @param {ObjectArray} targetObject The target view model objects
 * @param {String} relationName The relation name string
 * @return {Object} An object containing the source and target model objects array
 */
export let getModelObjectsForCreateRelation = function( sourceObjects, targetObjects, relationName ) {
    var retObj = {};
    var sObjects = _.transform( sourceObjects, function( objects, n ) {
        if( n && n.uid ) {
            var obj = cdm.getObject( n.uid );
            if( obj ) {
                objects.push( obj );
            }
        }
        return true;
    }, [] );

    retObj.sourceModelObjects = sObjects;

    if( _.includes( relationName, 'S2P:' ) ) {
        // For reverse relation i.e. secondary to primary e.g. S2P:Cm0BeforeDependency,
        // then both the target object is same as source objects.
        retObj.targetModelObjects = sObjects;
    } else {
        var tObjects = _.transform( targetObjects, function( objects, n ) {
            if( n && n.alternateID ) {
                var obj = n;
            } else if( n && n.uid ) {
                var obj = cdm.getObject( n.uid );
            }
            if( obj ) {
                objects.push( obj );
            }
            return true;
        }, [] );

        retObj.targetModelObjects = tObjects;
    }

    return retObj;
};

/**
 * Sort projects
 *
 * @param {Object} projects - unsorted projects
 * @param {Object} sortCriteria - the sort criteria
 * @returns {ObjectArray} The sorted projects array
 */
export let sortProjects = function( projects, sortCriteria ) {
    var fieldName = sortCriteria[ 0 ].fieldName;
    var ind = fieldName.indexOf( '.' );
    if( ind > 0 ) {
        fieldName = fieldName.substring( ind + 1, fieldName.length );
    }

    var foundProps = [];
    _.forEach( projects, function( project ) {
        var props = project.props;
        var tmpProp = {
            id: props.project_id.uiValues[ 0 ],
            value: props[ fieldName ].uiValues[ 0 ]
        };

        foundProps.push( tmpProp );
    } );

    var tmpProjects = _.sortBy( foundProps, 'value' );

    if( sortCriteria[ 0 ].sortDirection === 'DESC' ) {
        tmpProjects.reverse();
    }
    var newProjects = [];
    _.forEach( tmpProjects, function( proj ) {
        var index = _.findIndex( projects, function( project ) {
            return project.props.project_id.uiValues[ 0 ] === proj.id;
        } );
        if( index > -1 ) {
            newProjects.push( projects[ index ] );
        }
    } );

    return newProjects;
};

/**
 * Get projects
 *
 * @param {response} response the response of getProperties SOA call
 * @returns {ObjectArray} The projects array
 */
export let getProjects = function( response ) {
    var projects = null;
    if( response.availableProjectList ) {
        projects = _.values( response.availableProjectList );
    } else {
        projects = _.values( response.modelObjects );
    }
    projects = _.filter( projects, function( o ) {
        return o.type === 'TC_Project';
    } );
    return projects;
};

/**
 * Get file format type
 *
 * @param {Object} data - The view model data
 * @return {String} true if file format is TEXT, else false
 */
export let getFileFormat = function( referenceProp ) {
    var isText = false;
    if( referenceProp && referenceProp.dbValue ) {
        isText = referenceProp.dbValue.fileFormat === 'TEXT';
    }
    return isText;
};

export let getSelectedFileInfo = ( data ) => {
    return {
        dataToBeRelated: {
            attachFiles: data.eventData.fileName
        },
        fileInputForms: data.eventData.formData
    };
};

export let datasetChangeAction = function( datasetInfo, addPanelState, datasetState ) {
    let filePickerInfoData = {
        fileName: datasetInfo.fileName,
        formData: datasetInfo.formData,
        fileNameNoExt: datasetInfo.fileNameNoExt,
        fileExt: datasetInfo.fileExt,
        validFile: datasetInfo.validFile
    };

    let response = {
        isDatasetCreate: true,
        filePickerInfoData: filePickerInfoData
    };

    // update atomic data
    if( addPanelState ) {
        let newAddPanelState = { ...addPanelState.value };
        newAddPanelState.isDatasetCreate = response.isDatasetCreate;
        addPanelState.update( newAddPanelState );
    }

    if( datasetState ) {
        let newDatasetState = { ...datasetState.getValue() };
        newDatasetState.isDatasetCreate = response.isDatasetCreate;
        datasetState.update( newDatasetState );
    }
    return response;
};

export let updateDatasetInfo = function( datasetInfo, addPanelState, datasetState ) {
    let updatedDatasetInfo = {
        fileName: datasetInfo.fileName,
        formData: datasetInfo.formData,
        fileNameNoExt: datasetInfo.fileNameNoExt,
        fileExt: datasetInfo.fileExt,
        validFile: datasetInfo.validFile
    };

    let response = {
        isDatasetCreate: true,
        datasetInfo: updatedDatasetInfo
    };

    // update atomic data
    if( addPanelState ) {
        let newAddPanelState = { ...addPanelState.value };
        newAddPanelState.isDatasetCreate = response.isDatasetCreate;
        addPanelState.update( newAddPanelState );
    }

    if( datasetState ) {
        let newDatasetState = { ...datasetState.getValue() };
        newDatasetState.isDatasetCreate = response.isDatasetCreate;
        datasetState.update( newDatasetState );
    }

    return response;
};

/**
 * Sets the file name
 * @param {Object} data - The view model data
 * @param {Object} datasetInfo - dataset info
 */
export let initDSCreateParams = async function( data, datasetInfo, addPanelState, isCustomDatasetAction, addObjectContext ) {
    let datasetInfoIn = datasetInfo;
    let response = {};

    if( !datasetInfoIn ) {
        datasetInfoIn = data.eventData;
        response.isDatasetCreate = true;
    }

    const newDatasetName = _.clone( data.datasetName );
    newDatasetName.dbValue = datasetInfoIn.fileNameNoExt;

    let useItemIdAsDefaultDatasetName = appCtxService.getCtx( 'preferences.AWC_UseItemIdAsDefaultDatasetName' );

    if( useItemIdAsDefaultDatasetName && useItemIdAsDefaultDatasetName.length === 1 && useItemIdAsDefaultDatasetName[0] === 'true' ) {
        if( addObjectContext && addObjectContext.targetObject && addObjectContext.targetObject.modelType
            .typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 ) {
            await _dmSrv.getProperties( [ addObjectContext.targetObject.uid ], [ 'item_id', 'item_revision_id' ] );
            newDatasetName.dbValue = addObjectContext.targetObject.props.item_id.dbValues[ 0 ] + '/' + addObjectContext.targetObject.props.item_revision_id.dbValues[ 0 ];
        }
    }

    const newDatasetDesc = _.clone( data.datasetDesc );
    newDatasetDesc.dbValue = null;

    response.datasetName = newDatasetName;
    response.datasetDesc = newDatasetDesc;
    response.datasetType = data.datasetType;
    response.reference = data.reference;
    response.fileName = datasetInfoIn.fileName;
    response.formData = datasetInfoIn.formData;

    if( datasetInfoIn && datasetInfoIn.fileName && datasetInfoIn.fileName.length > 0 && !datasetInfoIn.validFile ) {
        // Reset dataset type and reference value
        const newDatasetType = _.clone( data.datasetType );
        newDatasetType.dbValue = null;
        response.datasetType = newDatasetType;

        const newReference = _.clone( data.reference );
        newReference.dbValue = null;
        response.reference = newReference;
    }

    if( addPanelState && isCustomDatasetAction ) {
        let newAddPanelState = { ...addPanelState.getValue() };

        let loadedVmo = {};
        loadedVmo.props = {};
        loadedVmo.uid = cdm.NULL_UID;
        let dummyVMO = viewModelObjectSvc.constructViewModelObject( loadedVmo );

        dummyVMO.props.datasetName = response.datasetName;
        dummyVMO.props.datasetDesc = response.datasetDesc;
        dummyVMO.props.datasetType = response.datasetType;
        dummyVMO.props.reference = response.reference;

        newAddPanelState.datasetVMO = dummyVMO;
        newAddPanelState.datasetTypeList = data.datasetTypeList;
        newAddPanelState.formData = response.formData;

        addPanelState.update( newAddPanelState );
    }

    return response;
};

/**
 * Get Dataset Types
 *
 * @param {Object} response the response of getDatasetTypesWithDefaultRelation SOA call
 * @returns {ObjectArray} Array of list model objects
 */
export let getDatasetTypeFromTypeInfo = function( response ) {
    var datasetTypeList = [];
    datasetTypeList.push( cdm.getObject( response.infos[ 0 ].tag.uid ) );
    return listBoxSvc.createListModelObjects( datasetTypeList, 'props.datasettype_name' );
};

/**
 * Get Dataset Types list
 *
 * @param {Object} response - the response of getDatasetTypesWithDefaultRelation SOA call
 * @param {Object} data - data from VM
 * @returns {ObjectArray} Array of list model objects
 */
export const getDatasetTypesFromTypesWithRelInfo = function( response, data ) {
    let datasetTypeList = [];
    const outputArray = response.output[ 0 ].datasetTypesWithDefaultRelInfo;
    let originalType;
    let originalTypeUiValue;
    if( data.datasetTypeList && data.datasetTypeList.length === 1 ) {
        originalType = data.datasetTypeList[ 0 ].propInternalValue;
        originalTypeUiValue = data.datasetTypeList[ 0 ].propDisplayValue;
    }
    _.forEach( outputArray, entry => {
        let datasetTypeObj = cdm.getObject( entry.datasetType.uid );
        if( data && data.datasetType && data.datasetType.valueUpdated && entry.datasetType && entry.datasetType.props && entry.datasetType.props.datasettype_name &&
            entry.datasetType.props.datasettype_name.uiValues[ 0 ].toUpperCase() === data.datasetType.uiValue.toUpperCase() ) {
            datasetTypeList = [ datasetTypeObj, ...datasetTypeList ];
        } else if( originalTypeUiValue && originalTypeUiValue.toUpperCase() === entry.datasetType.props.datasettype_name.uiValues[ 0 ].toUpperCase() ) {
            datasetTypeList = [ originalType, ...datasetTypeList ];
        } else {
            datasetTypeList = [ ...datasetTypeList, datasetTypeObj ];
        }
    } );
    return listBoxSvc.createListModelObjects( datasetTypeList, 'props.datasettype_name' );
};

/**
 * Get the References list
 *
 * @param {Object} response the response of getDatasetTypeInfo SOA call
 * @returns {ObjectArray} Array of list model objects
 */
export let getReferences = function( response ) {
    var refInfos = response.infos[ 0 ].refInfos;
    return listBoxSvc.createListModelObjects( refInfos, 'referenceName' );
};

/**
 * Get the File extension, strip off the .*
 * If there are multiple extension with same reference name, merge them
 *
 * @param {Object} response the response
 * @returns {String} - extension
 */
export let getFileExtension = function( response ) {
    var refInfos = response.infos[ 0 ].refInfos;
    var tempRefName;
    var finalFileExts;
    //append file extension to one string when they have same reference name
    _.forEach( refInfos, function( refInfo ) {
        var fileExtension = refInfo.fileExtension;
        var validFileExt = fileExtension.trim();
        validFileExt = validFileExt.replace( '.', '' );
        validFileExt = validFileExt.replace( '*', '' );

        if( _.isEmpty( tempRefName ) ) {
            tempRefName = refInfo.referenceName;
            finalFileExts = validFileExt;
        } else {
            if( tempRefName === refInfo.referenceName ) {
                finalFileExts += ',.' + validFileExt;
            }
        }
    } );
    return finalFileExts;
};

const syncPropWithPropDesc = ( propValue, propDesc ) => {
    const newPropValue = { ...propValue };
    if( propDesc ) {
        newPropValue.isArray = propDesc.anArray;
        newPropValue.isCharArray = propDesc.valueType === 1;
        newPropValue.displayName = propDesc.displayName;
        newPropValue.maxLength = propDesc.maxLength;
        newPropValue.maxArraySize = propDesc.maxArraySize ? propDesc.maxArraySize : -1;
        const constantsMap = propDesc.constantsMap;
        if( constantsMap ) {
            newPropValue.initialValue = constantsMap.initialValue;
            newPropValue.isEditable = constantsMap.editable === '1';
            newPropValue.isAutoAssignable = constantsMap.autoassignable === '1';
            newPropValue.isRichText = constantsMap.Fnd0RichText === '1';
            newPropValue.isEnabled = constantsMap.editable ? constantsMap.editable === '1' : true;
            newPropValue.referenceTypeName = constantsMap.ReferencedTypeName || '';
            if( newPropValue.propType === 'DATE' || newPropValue.propType === 'DATEARRAY' ) {
                //from SOA getTypeDescriptions2, timeEnabled is undefined when Fnd0EnableTimeForDateProperty is default false.
                newPropValue.isTimeEnabled = _.isUndefined( constantsMap.timeEnabled ) ? false : constantsMap.timeEnabled === '1';
            }
        }
    }
    return newPropValue;
};

/**
 * Update the References list
 *
 * @param {Object} data - The view model data
 */
export let updateTypeAndReferences = async function( datasetType, datasetTypesWithDefaultRelInfo, reference, datasetName, datasetDesc, creationTypeIn, referencesList ) {
    // Update creationType
    let creationType = datasetType.dbValue;
    let references;

    if( !creationType && creationTypeIn ) {
        creationType = creationTypeIn;
    }

    // eslint-disable-next-line no-nested-ternary
    const typeName = typeof creationType === 'string' ?
        creationType :
        creationType.props.datasettype_name ? creationType.props.datasettype_name.dbValues[ 0 ] : null;

    await _soaService.ensureModelTypesLoaded( [ typeName ] );
    const typeInfo = _cmm.getType( typeName );
    let newDatasetName = datasetName;
    let newDatasetDesc = datasetDesc;
    if( typeInfo && datasetName && datasetDesc ) {
        const objectNamePropDesc = typeInfo.propertyDescriptorsMap.object_name;
        const objectDescPropDesc = typeInfo.propertyDescriptorsMap.object_desc;
        newDatasetName = syncPropWithPropDesc( datasetName, objectNamePropDesc );
        newDatasetDesc = syncPropWithPropDesc( datasetDesc, objectDescPropDesc );
    }

    // Update references
    var outputArray = datasetTypesWithDefaultRelInfo;
    if( outputArray ) {
        var referenceObj;
        _.forEach( outputArray, function( entry ) {
            var datasetTypeObj = cdm.getObject( entry.datasetType.uid );
            var dobj = _.get( datasetTypeObj, 'props.object_string' );
            //when input value into LOV directly, datasetType.dbValue.props will be undefined
            let dtObjStrVals = _.get( datasetType, 'dbValue.props.object_string.dbValues' );
            let dtObjStrVal = '';
            if( dtObjStrVals && _.isArray( dtObjStrVals ) ) {
                dtObjStrVal = dtObjStrVals[ 0 ];
            } else {
                dtObjStrVal = datasetType.dbValue;
            }
            if( dobj.dbValues[ 0 ] === dtObjStrVal ) {
                referenceObj = entry.refInfos;
            }
        } );
        if( referenceObj ) {
            for( let i = 0; i < referenceObj.length; i++ ) {
                const entry = referenceObj[ i ];
                if( reference && reference.valueUpdated && entry.referenceName && reference.uiValue.toUpperCase() === entry.referenceName.toUpperCase() ) {
                    referenceObj.splice( i, 1 );
                    referenceObj = [ entry, ...referenceObj ];
                }
            }
        }
        references = listBoxSvc.createListModelObjects( referenceObj, 'referenceName' );
    }

    if( !references && referencesList ) {
        references = referencesList;
    }

    //get reference from first value of references
    let newReference = _.clone( reference );
    if( newReference && references && references[ 0 ] ) {
        newReference.dbValue = references[ 0 ].propInternalValue;
        newReference.uiValue = references[ 0 ].propDisplayValue;
        // update original values
        newReference.dbOriginalValue = newReference.dbValue;
        newReference.uiOriginalValue = newReference.uiValue;
    }
    return {
        creationType,
        references,
        newReference,
        datasetName: newDatasetName,
        datasetDesc: newDatasetDesc
    };
};

/**
 * Get all of the potential relations the target object can have to the given type
 *
 * @param {String} typeName ID of the type that is being created
 * @param {ModelObject} targetObject The target that is being added to
 * @returns {List<String>} All valid relations
 */
const getAllRelations = function( typeName, targetObject ) {
    return _soaService.postUnchecked( 'Core-2014-10-DataManagement', 'getPasteRelations2', {
        inputs: [ {
            obj: targetObject,
            childTypeName: typeName
        } ]
    } )
        .then( response => response.outputs[ 0 ].pasteRelInfo.map( x => x.pastRelName ) );
};

const getTypeName = type => ( type.props.datasettype_name || type.props.type_name ).dbValues[ 0 ];

/**
 * Update the RelationList
 *
 * @param {Object} data the view model data object
 * @param {Object} typeName name of the currently selected type
 * @returns {ObjectArray} - List of list model objects
 */
export let updateRelationList = function( creationType, relationMap, targetObject, typeName,
    defaultRelation, creationRelation, invalidObjectInfo = null, addPanelState ) {
    var deferred = AwPromiseService.instance.defer();

    //get the full type information for the selected type
    if( creationType ) {
        typeName = typeName || getTypeName( creationType );
    }

    if( !creationType && addPanelState &&  addPanelState.creationType ) {
        typeName = typeName || getTypeName( addPanelState.creationType );
    }

    //must load type to check hierarchy from object set
    if( typeName ) {
        _soaService.ensureModelTypesLoaded( [ typeName ] )
            .then( () => {
                const typeInfo = _cmm.getType( typeName );
                const configuredRelations = _.uniq( Object.keys( relationMap ).reduce( ( acc, srcTypeName ) => {
                    return _cmm.isInstanceOf( srcTypeName, typeInfo ) || _cmm.isInstanceOf( getNonRevisionType( srcTypeName ), typeInfo ) ? [ ...acc, ...relationMap[ srcTypeName ] ] :
                        acc;
                }, [] ) );
                ( configuredRelations.length === 0 && targetObject ? getAllRelations( typeName, targetObject ) : AwPromiseService.instance.resolve( [] ) )
                    .then( allRelations => {
                        const relations = [ ...configuredRelations, ...allRelations ];
                        _soaService.ensureModelTypesLoaded( relations )
                            .then( () => {
                            // LCS-638566 Filter out runtime properties so that the runtime properties are not displayed in relation list.
                            // But if there are only runtime properties, return the first one as the default
                                let filteredRelations = _.filter( relations, function( relation ) {
                                    return _cmm.getType( relation ) !== null && _cmm.getType( relation ) !== undefined;
                                } );
                                if( filteredRelations.length === 0 ) {
                                    filteredRelations.push( relations[ 0 ] );
                                }

                                let relationList = listBoxSvc.createListModelObjectsFromStrings( filteredRelations );
                                const newCreationRelation = _.clone( creationRelation );
                                if( defaultRelation ) {
                                    if( defaultRelation.name ) {
                                        let validDefaultRelationArr = _.filter( relationList, function( obj ) {
                                            if( obj && obj.propInternalValue && obj.propInternalValue === defaultRelation.name ) {
                                                return obj;
                                            }
                                        } );
                                        if( validDefaultRelationArr.length > 0 ) {
                                            newCreationRelation.dbValue = defaultRelation.name;
                                            newCreationRelation.uiValue = defaultRelation.displayName;
                                        } else {
                                        //default relation is not present in relation List, so setting it to the first element in relation list
                                            newCreationRelation.dbValue = relationList[ 0 ].propInternalValue;
                                            newCreationRelation.uiValue = relationList[ 0 ].propDisplayValue;
                                        }
                                    } else {
                                    //no default relation configured
                                        newCreationRelation.dbValue = relationList[ 0 ].propInternalValue;
                                        newCreationRelation.uiValue = relationList[ 0 ].propDisplayValue;
                                    }
                                }

                                var relationArray = [];
                                _.forEach( relationList, function( relation ) {
                                    relationArray.push( relation.propInternalValue );
                                } );
                                let typeIsNotValidForObjectSet = configuredRelations.length === 0;
                                if( typeIsNotValidForObjectSet && invalidObjectInfo && invalidObjectInfo.objectSetSource && invalidObjectInfo.fileName ) {
                                    localeService.getLocalizedTextFromKey( 'addObjectMessages.invalidObjectWarning' ).then( result => {
                                        _messagingService.showWarning( result.replace( '{0}', invalidObjectInfo.fileName ).replace( '{1}', invalidObjectInfo.objectSetSource ) );
                                    } );
                                }
                                // update original values
                                newCreationRelation.dbOriginalValue = newCreationRelation.dbValue;
                                newCreationRelation.uiOriginalValue = newCreationRelation.uiValue;

                                if( addPanelState ) {
                                    let newAddPanelState = { ...addPanelState.value };
                                    newAddPanelState.selectedRelation = newCreationRelation.dbValue;
                                    addPanelState.update( newAddPanelState );
                                }

                                deferred.resolve( {
                                    relationList: listBoxSvc.createListModelObjectsFromStrings( relationArray ),
                                    creationRelation: newCreationRelation
                                } );
                            } );
                    } );
            } );
    }

    return deferred.promise;
};

export let updateTargetObject = function( data ) {
    var contextUid = data.eventMap[ 'breadcrumb.navigation' ].contextUid;
    var existingObj = appCtxService.getCtx( 'addObject.targetObject' );
    if( contextUid && existingObj.uid !== contextUid ) {
        var modelObject = cdm.getObject( contextUid );
        if( modelObject && !_.isEmpty( modelObject.props ) ) {
            appCtxService.updatePartialCtx( 'addObject.targetObject', modelObject );
        }
    }
};

export let uploadFilePreinit = function( _uid, _ticket, _filename ) {
    var deferred = AwPromiseService.instance.defer();

    var callbackFailure = function() {
        removeListeners();
        deferred.reject( 'Upload failed' );
    };

    var callbackSuccess = function() {
        removeListeners();
        deferred.resolve( 'Upload succeeded' );
    };

    var removeListeners = function() {
        window.top.document.removeEventListener( 'fmsuploadfailed', callbackFailure );
        window.top.document.removeEventListener( 'fmsuploadsuccess', callbackSuccess );
    };

    window.top.document.addEventListener( 'fmsuploadsuccess', callbackSuccess, false );
    window.top.document.addEventListener( 'fmsuploadfailed', callbackFailure, false );

    // Call the host to initialize the upload
    eventBus.publish( 'hosting.fmsupload', {
        uid: _uid,
        ticket: _ticket,
        filename: _filename
    } );

    return deferred.promise;
};

/**
 * Replace item revision with item. Note, there is no good way to find item type from item revision
 * type without looping through all item subtypes and check the Revision type constant of each item type,
 * so follow RAC to do string comparison.
 *
 * @param {String} type Name of the type that may be Revision
 * @returns {String} Name of actual type
 */
const getNonRevisionType = type => {
    if( _.endsWith( type, 'Revision' ) ) {
        var idx = type.indexOf( 'Revision' );
        //trim required to handle "Item Revision" and "ItemRevision"
        return type.substring( 0, idx ).trim();
    }
    return type;
};

/**
 * Update the add object context
 *
 * @param {Object} panelContext - (Optional) The context for the panel. May contain command arguments.
 * @return the created object
 */
export let commonAddObjectContext =  function( panelContext ) {
    var targetObjectVMO = appCtxService.getCtx( 'selected' );
    let showConfiguredRevision = 'true';

    var addObjectContext = {
        relationType: 'contents',
        refreshFlag: false,
        targetObject: targetObjectVMO,
        loadSubTypes: true,
        typeFilterNames: 'WorkspaceObject',
        relationMap: panelContext ? panelContext.relationMap : null
    };
    if( panelContext && panelContext.visibleTabs ) {
        addObjectContext.visibleTabs = panelContext.visibleTabs;
    }
    if( panelContext && panelContext.hasOwnProperty( 'showConfiguredRevision' ) ) {
        showConfiguredRevision = panelContext.showConfiguredRevision;
    }
    if( panelContext && !_.isUndefined( panelContext.isConfRevPWAEnabledThroughPref ) ) {
        showConfiguredRevision = panelContext.isConfRevPWAEnabledThroughPref;
    }

    addObjectContext.showConfiguredRevision = showConfiguredRevision;

    var baseTypeNameList = [];
    var shouldCheckIfDataset = true;

    if( !panelContext ) {
        panelContext = {};
    }

    //If a panel context is set and includes a list of types the command is being executed from URL
    var executedFromURL = panelContext.types && panelContext.types.length;
    addObjectContext.maxRecentCount = 5;
    if( executedFromURL ) {
        baseTypeNameList = panelContext.types;
        //Only show "New" tab
        addObjectContext.visibleTabs = 'new';
        //Don't show Recent section
        addObjectContext.maxRecentCount = 0;
        //Don't include sub types
        addObjectContext.loadSubTypes = false;
    } else if( panelContext.target && panelContext.relationMap ) {
        //Add to specific logic
        //Don't check for dataset types
        shouldCheckIfDataset = false;
        //loadSubTypes has to be unset
        delete addObjectContext.loadSubTypes;
        //Set the target object
        // For tree view, ViewModelTreeNode is required for retaining selection when added from
        // objectSet "Add To" command. So the check of alternateID is added
        addObjectContext.targetObject = targetObjectVMO.alternateID ? targetObjectVMO : panelContext.target;
        //Get the type name list
        baseTypeNameList = Object.keys( panelContext.relationMap ).map( getNonRevisionType );
        addObjectContext.typeFilterNames = Object.keys( panelContext.relationMap ).join( ',' );
        addObjectContext.validTypes = Object.keys( panelContext.relationMap );
        //Set the relation type
        addObjectContext.relationType = Object.keys(
            Object.keys( panelContext.relationMap ).reduce( function( map, i ) {
                var rels = panelContext.relationMap[ i ];
                rels.map( function( i ) {
                    map[ i ] = true;
                } );
                return map;
            }, {} ) ).join( ',' );
        //Set the search filter
        if( panelContext.searchFilter ) {
            addObjectContext.searchFilter = panelContext.searchFilter;
        }
    } else {
        //Otherwise get the type list from the preference
        baseTypeNameList = appCtxService.getCtx( 'preferences.AWC_DefaultCreateTypes' );
    }

    //If no types are set (in preference or URL)
    if( !baseTypeNameList || baseTypeNameList.length === 0 ) {
        //Default to Item and Folder
        baseTypeNameList = [ 'Item', 'Folder' ];
    }
    //If there is a single type specified do auto-select when the type is loaded
    if( baseTypeNameList.length === 1 ) {
        addObjectContext.autoSelectOnUniqueType = true;
    }
    addObjectContext.includedTypes = baseTypeNameList.join( ',' );
    addObjectContext.typeFilterNamesArray = addObjectContext.typeFilterNames.split( ',' );

    var isDataset = baseTypeNameList.indexOf( 'Dataset' ) !== -1 || panelContext.objectSetSourceHasDataset === true;

    return  { addObjectContext, baseTypeNameList, shouldCheckIfDataset, isDataset };
};

/**
 * Update the add object context
 *
 * @param {Object} panelContext - (Optional) The context for the panel. May contain command arguments.
 * @deprecated please use populateAddObjectContext instead
 */
export let updateAddObjectContext = async function( panelContext ) {
    //If the panel is already opened do nothing
    //Eventually this could be modified to update the context and expect the panel to respond to the change
    //Just doing nothing (next action will close panel) to match existing behavior
    if( appCtxService.getCtx( 'activeToolsAndInfoCommand.commandId' ) === 'Awp0ShowCreateObject' ) {
        return;
    }
    const { addObjectContext, baseTypeNameList, shouldCheckIfDataset, isDataset } = commonAddObjectContext( panelContext );

    appCtxService.registerCtx( 'addObject', addObjectContext );
    //If this is dataset
    if( isDataset ) {
        //Show dataset upload panel
        addObjectContext.showDataSetUploadPanel = true;
        appCtxService.updateCtx( 'addObject', addObjectContext );
    } else if( shouldCheckIfDataset ) {
        //Otherwise call SOA for some reason
        let response = await _soaService.postUnchecked( 'Core-2007-06-DataManagement', 'getDatasetTypeInfo', {
            datasetTypeNames: baseTypeNameList
        } );
        addObjectContext.showDataSetUploadPanel = response.infos.length > 0;
        addObjectContext.moreLinkShown = response.infos.length > 0;
        appCtxService.updateCtx( 'addObject', addObjectContext );
    }
    return addObjectContext;
};


/**
 * Update the add object context
 *
 * @param {Object} panelContext - (Optional) The context for the panel. May contain command arguments.
 * @returns {Object} the created object
 */
export let populateAddObjectContext = async function( panelContext ) {
    //If the panel is already opened do nothing
    //Eventually this could be modified to update the context and expect the panel to respond to the change
    //Just doing nothing (next action will close panel) to match existing behavior
    if( appCtxService.getCtx( 'activeToolsAndInfoCommand.commandId' ) === 'Awp0ShowCreateObject' ) {
        return;
    }
    const { addObjectContext, baseTypeNameList, shouldCheckIfDataset, isDataset } = commonAddObjectContext( panelContext );

    // There are some dependencies which are relying on this code. so we need to register addObject to ctx
    //appCtxService.registerCtx( 'addObject', addObjectContext );
    //If this is dataset
    if( isDataset ) {
        //Show dataset upload panel
        addObjectContext.showDataSetUploadPanel = true;
    } else if( shouldCheckIfDataset ) {
        //Otherwise call SOA for some reason
        let response = await _soaService.postUnchecked( 'Core-2007-06-DataManagement', 'getDatasetTypeInfo', {
            datasetTypeNames: baseTypeNameList
        } );
        addObjectContext.showDataSetUploadPanel = response.infos.length > 0;
        addObjectContext.moreLinkShown = response.infos.length > 0;
    }
    return addObjectContext;
};

/**
 * Gets the created object from createRelateAndSubmitObjects SOA response. Returns ItemRev if the creation type
 * is subtype of Item.
 *
 * @param {Object} the response of createRelateAndSubmitObjects SOA call
 * @return the created object
 */
export let getDatasets = function( response ) {
    var datasets = [];

    if( response.output ) {
        for( var index in response.output ) {
            if( response.output[ index ].datasets && response.output[ index ].datasets.length > 0 ) {
                datasets = datasets.concat( response.output[ index ].datasets );
            }
        }
    }

    return datasets;
};

/**
 *
 * @param {Object} addPanelState - The addACopy state of the add panel
 */
export let toggleAddACopyState = function( addPanelState ) {
    let newAddPanelState = { ...addPanelState };
    newAddPanelState.isAddACopy = !newAddPanelState.isAddACopy;

    return { addPanelState: newAddPanelState };
};

/**
 * Start the multi file upload process.  It first checks if there is data.
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {string} fmsUrl - The FMS URL
 */
export let startMultiFileUpload = function( data, fmsUrl ) {
    _fmsUrl = fmsUrl;

    var filesToBeRelated = [];
    _.forEach( _filesToBeRelated, function( object ) {
        filesToBeRelated.push( object );
    } );

    // Check if all files uploaded
    if( data.datasetInfos && filesToBeRelated.length !== data.datasetInfos.length ) {
        // not all files will be uploaded, inform the user

        var datasetFileNames = [];
        for( var y = 0; y < data.datasetInfos.length; ++y ) {
            var datasetName = data.datasetInfos[ y ].commitInfo[ 0 ].datasetFileTicketInfos[ 0 ].datasetFileInfo.fileName;
            datasetFileNames.push( datasetName );
        }

        // find differences between expected and actual list
        var diff = _.difference( filesToBeRelated, datasetFileNames );

        // display message for each missing file
        _.forEach( diff, function( object ) {
            var failureToAttachFilesMsg = _failureToAttachFiles.replace( '{0}', object );
            _messagingService.showError( failureToAttachFilesMsg );
        } );

        logger.error( 'Failed to attach file(s) chosen. Some file extension(s) are not eligible based on IRDC for ' +
            '"' + data.createdMainObject.modelType.name + '"' + ' Object type.' );
    }

    if( !data.datasetInfos || data.datasetInfos.length === 0 ) {
        // no files to upload
        if( data.pasteOnTargetCondition ) {
            eventBus.publish( 'addObject.toTargetSuccess' );
        } else {
            eventBus.publish( 'addObject.setTarget' );
        }
        _datasetInfoIndex = -1;
    } else {
        _datasetInfoIndex = -1;
        eventBus.publish( 'addObject.initNextUpload' );
    }
};

/**
 * Sets the needed data prior to the POST action and the commitFiles SOA.
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let initNextUpload = function( data ) {
    // first, check if we just uploaded a file; if so, reset the input element
    if( _datasetInfoIndex >= 0 && data.formData ) {
        data.formData.value = '';
        data.formData = null;
        eventBus.publish( 'progress.end', {
            endPoint: _fmsUrl
        } );
    }

    // next, advance the index and see if we are finished
    _datasetInfoIndex++;
    if( _datasetInfoIndex >= data.datasetInfos.length ) {
        // no more files to upload - commit datasets
        eventBus.publish( 'addObject.commitUploadedDataset' );

        _datasetInfoIndex = -1;
        return;
    }

    // get the values that we will need for the upload and the commit
    var commitInfo = data.datasetInfos[ _datasetInfoIndex ].commitInfo[ 0 ];
    data.fileName = commitInfo.datasetFileTicketInfos[ 0 ].datasetFileInfo.fileName;
    var fmsTicket = commitInfo.datasetFileTicketInfos[ 0 ].ticket;

    if( setFmsTicketVar( data, data.fileName, fmsTicket ) ) {
        var commitInput = {
            dataset: commitInfo.dataset,
            createNewVersion: false,
            datasetFileTicketInfos: [ {
                datasetFileInfo: {
                    clientId: commitInfo.datasetFileTicketInfos[ 0 ].datasetFileInfo.clientId,
                    fileName: commitInfo.datasetFileTicketInfos[ 0 ].datasetFileInfo.fileName,
                    namedReferencedName: commitInfo.datasetFileTicketInfos[ 0 ].datasetFileInfo.namedReferenceName,
                    isText: commitInfo.datasetFileTicketInfos[ 0 ].datasetFileInfo.isText,
                    allowReplace: commitInfo.datasetFileTicketInfos[ 0 ].datasetFileInfo.allowReplace
                },
                ticket: commitInfo.datasetFileTicketInfos[ 0 ].ticket
            } ]
        };

        // save all inputs so single commit may be performed
        if( !data.commitInput ) {
            data.commitInput = [];
        }
        data.commitInput.push( commitInput );

        eventBus.publish( 'progress.start', {
            endPoint: _fmsUrl
        } );

        // this is an empty event; it's needed to allow some processing to execute before the upload occurs
        eventBus.publish( 'addObject.uploadReady' );
        return {
            formData: data.formData,
            commitInput: data.commitInput
        };
    }
    // error
    _messagingService.reportNotyMessage( data, data._internal.messages, 'uploadFailed' );
    data.commitInfo = {};

    // move on to next file
    exports.initNextUpload( data );
};

/**
 * Sets the proper fmsTicket variable that will trigger the proper aw-file-upload to set data.formData to the proper
 * file input.
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {string} fileName - The name of the file, used to ID the proper fmsTicket variable
 * @param {object} ticketValue - The FMS ticket that will be assigned to the variable
 * @returns {Boolean} true if successful, false otherwise
 */
function setFmsTicketVar( data, fileName, ticketValue ) {
    var i;
    var fileInputForms = _fileInputForms;

    if( !fileInputForms && data.customPanelInfo && data.customPanelInfo.Awp0MultiFileUpload ) {
        fileInputForms = data.customPanelInfo.Awp0MultiFileUpload.fileInputForms;
    }

    if( fileInputForms ) {
        for( i = 0; i < fileInputForms.length; i++ ) {
            if( fileInputForms[ i ].selectedFile && fileInputForms[ i ].selectedFile !== '' &&
                fileInputForms[ i ].selectedFile === fileName ) {
                fileInputForms[ i ].fmsTicket = ticketValue;

                if( fileInputForms[ i ].file ) {
                    data.formData = new FormData();
                    data.formData.append( 'fmsFile', fileInputForms[ i ].file, fileName );
                    data.formData.append( 'fmsTicket', fileInputForms[ i ].fmsTicket );
                } else {
                    var formElement = $( '#' + fileInputForms[ i ].id );
                    data.formData = new FormData( $( formElement )[ 0 ] );
                    data.formData.append( 'fmsTicket', fileInputForms[ i ].fmsTicket );
                }

                return true;
            }
        }
    }

    var pasteInputFiles = data.pasteFiles;
    if( !pasteInputFiles && data.customPanelInfo && data.customPanelInfo.Awp0MultiFileUpload ) {
        pasteInputFiles = data.customPanelInfo.Awp0MultiFileUpload.pasteInputFiles;
    }

    if( pasteInputFiles ) {
        for( i = 0; i < pasteInputFiles.length; i++ ) {
            if( fileName === pasteInputFiles[ i ].name ) {
                data.formData = new FormData();
                data.formData.append( 'fmsFile', pasteInputFiles[ i ], fileName );
                data.formData.append( 'fmsTicket', ticketValue );
                return true;
            }
        }
    }

    return false;
}

/**
 * Get the value to use for "accepts" attribute on file upload widget
 *
 * @param {Object} relationMap Relation map provided to the panel
 * @returns {String} File extension string
 */
export const getDatasetFileExtensions = function( { relationMap } ) {
    const datasetTypeNames = Object.keys( relationMap );
    //if generic Dataset allow all file types
    return datasetTypeNames.includes( 'Dataset' ) ? AwPromiseService.instance.resolve( '' ) : _soaService.postUnchecked( 'Core-2007-06-DataManagement', 'getDatasetTypeInfo', {
        datasetTypeNames
    } ).then( function( response ) {
        const validExtensions = response.infos.reduce( ( extensions, { refInfos } ) => {
            const nxtExts = refInfos
                .filter( x => x.fileFormat === 'BINARY' )
                .map( x => x.fileExtension.slice( 1 ) ); //*.xlsx -> .xlsx
            return [ ...extensions, ...nxtExts ];
        }, [] );
        return _.uniq( validExtensions ).join( ',' ).slice( 1 );
    } );
};

export const convertTypesToLovEntries = function( response ) {
    if( response && response.searchResults && response.searchResults.length > 0 ) {
        return response.searchResults.map( obj => {
            var typeHierarchy = [];
            if( obj ) {
                var type = _cmm.getType( obj.uid );
                if( type ) {
                    typeHierarchy = type.typeHierarchyArray;
                } else {
                    let typeName = obj.props.type_name.dbValue ? obj.props.type_name.dbValue : obj.props.type_name.dbValues[ 0 ];
                    typeHierarchy.push( typeName );
                    var parentTypes = obj.props.parent_types.dbValues;
                    for( var j in parentTypes ) {
                        // parentType is of form "TYPE::Item::Item::WorkspaceObject"
                        var arr = parentTypes[ j ].split( '::' );
                        typeHierarchy.push( arr[ 1 ] );
                    }
                }
            }

            let typeIcon = awIconSvc.getTypeIconFileUrlForTypeHierarchy( typeHierarchy );

            return {
                propInternalValue: obj.uid,
                propDisplayValue: obj.props.object_string.uiValues[ 0 ],
                object: obj,
                iconSource: typeIcon
            };
        } );
    }
    return [];
};

export const initialize = function( datasetState, showDataSetUploadPanel, showDataSetUploadPanelProp, preferredType ) {
    let newDatasetState = { ...datasetState };
    newDatasetState.isDatasetCreate = showDataSetUploadPanel || showDataSetUploadPanelProp;

    let isDSMUsable = dsmUtils.isDSMUsable();
    return { datasetState: newDatasetState, isDSMUsable: isDSMUsable };
};

export const syncTypeSelection = function( typeListProp, creationType, addPanelState ) {
    let newTypeListProp = { ...typeListProp };

    if( creationType ) {
        newTypeListProp.dbValue = creationType.props.type_name.dbValues[ 0 ];
        newTypeListProp.value = creationType.props.type_name.dbValues[ 0 ];
        newTypeListProp.uiValue = creationType.props.type_name.uiValues[ 0 ];
    }

    // update atomic data
    if( addPanelState ) {
        let newAddPanelState = { ...addPanelState.getValue() };
        newAddPanelState.creationType = creationType;
        addPanelState.update( newAddPanelState );
    }

    let preferredType = newTypeListProp.dbValue;

    return { typeListProp: newTypeListProp, creationType: creationType, preferredType: preferredType };
};

const _updateTypeSelected = ( addPanelState, datasetState, uploadFileSelectionData, propertyViewId, creationType, isDatasetCreate ) => {
    let response = {};
    // update atomic data
    if( addPanelState ) {
        let newAddPanelState = { ...addPanelState.getValue() };
        let currUid = newAddPanelState.creationType ? newAddPanelState.creationType.uid : null;
        let newUid = creationType ? creationType.uid : null;
        if( currUid !== newUid ) {
            newAddPanelState.creationType = { ...creationType };
            newAddPanelState.isDatasetCreate = isDatasetCreate;
            addPanelState.update( newAddPanelState );
        }
    }

    if( datasetState ) {
        let newDatasetState = { ...datasetState.getValue() };
        let currDatasetCreUid = newDatasetState.creationType ? newDatasetState.creationType.uid : null;
        let newDatasetCreUid = creationType ? creationType.uid : null;
        if( currDatasetCreUid !== newDatasetCreUid ) {
            newDatasetState.isDatasetCreate = isDatasetCreate;
            if( !response.isDatasetCreate ) {
                newDatasetState.creationType = { ...creationType };
            }
            datasetState.update( newDatasetState );
        }
    }

    response.uploadFileSelectionData = uploadFileSelectionData;
    if( isDatasetCreate && uploadFileSelectionData ) {
        if ( !response.uploadFileSelectionData.modelInfo ) {
            response.uploadFileSelectionData.modelInfo = {};
        }
        response.uploadFileSelectionData.modelInfo.propertyViewId = propertyViewId;
    }

    return response;
};

export const onTypeSelected = function( context, addPanelState, datasetState, uploadFileSelectionData ) {
    var deferred = AwPromiseService.instance.defer();
    let propertyViewId = 'DefaultDatasetCreateSub';

    let creationTypeIn;
    if( context && context.selected && context.selected.length > 0 ) {
        creationTypeIn = context.selected[0].object;
    }
    if( !creationTypeIn && datasetState &&  datasetState.creationType ) {
        creationTypeIn = datasetState.creationType;
    }

    var response = {};
    if( creationTypeIn ) {
        response.creationType = creationTypeIn;
        response.isDatasetCreate = response.creationType && response.creationType.uid.indexOf( 'Dataset' ) > -1;
        // Decide visibility of Projects section
        response.creationType.props.type_name.propertyDisplayName = response.creationType.props.type_name.uiValues[ 0 ];
        var typeName = response.creationType.props.type_name.dbValues[ 0 ];
        var promise = _soaService.ensureModelTypesLoaded( [ typeName ] );
        promise.then( function() {
            var typeNameType = _cmm.getType( typeName );
            if( typeNameType ) {
                var wso = 'WorkspaceObject';
                var isWso = typeName === wso || typeNameType.typeHierarchyArray && typeNameType.typeHierarchyArray.indexOf( wso ) > -1;
                var creI = typeNameType.constantsMap.CreateInput;
                if( creI ) {
                    var creIType = _cmm.getType( creI );
                    if( creIType ) {
                        var projectsEnabled = creIType.constantsMap.Fnd0EnableAssignProjects;
                        let responseVal = _updateTypeSelected( addPanelState, datasetState, uploadFileSelectionData, propertyViewId, response.creationType, response.isDatasetCreate );
                        response = { ...response, ...responseVal };
                        response.isProjectAssignable = isWso && projectsEnabled === 'true';

                        deferred.resolve( response );
                    } else {
                        _soaService.ensureModelTypesLoaded( [ creI ] ).then( function() {
                            var creIType = _cmm.getType( creI );
                            let responseVal = _updateTypeSelected( addPanelState, datasetState, uploadFileSelectionData, propertyViewId, response.creationType, response.isDatasetCreate );
                            response = { ...response, ...responseVal };
                            if( creIType ) {
                                var projectsEnabled = creIType.constantsMap.Fnd0EnableAssignProjects;
                                response.isProjectAssignable = isWso &&
                                    projectsEnabled === 'true';
                            }

                            deferred.resolve( response );
                        } );
                    }
                }
            } else {
                deferred.resolve( response );
            }
        } );
    } else {
        let responseVal = _updateTypeSelected( addPanelState, datasetState, uploadFileSelectionData, propertyViewId, null, false );
        response = { ...response, ...responseVal };
        response.creationType = null;
        response.isDatasetCreate = false;
        response.isProjectAssignable = false;

        deferred.resolve( response );
    }

    return deferred.promise;
};

export const updateTheFocusedComponent = function( localSelectionData ) {
    if( localSelectionData && localSelectionData.selected ) {
        return localSelectionData.id;
    }
    return null;
};

export const handlePaletteSelection = function( selectionData, selectionModels, targetObject, addPanelState ) {
    let sourceObjects = selectionData.selected ? selectionData.selected : [];
    let relationInputs;

    if( sourceObjects.length > 0 ) {
        selectionModels.map( selModel => {
            if( selectionData.id !== selModel.name ) {
                selModel.selectNone();
            }
        } );
    }

    // If target object is defined, then get the source and target model objects for creating relation
    if( targetObject ) {
        relationInputs = sourceObjects.map( ( { type: secondaryType } ) => {
            return {
                primaryType: targetObject.type,
                secondaryType
            };
        } );
    }

    // update atomic data
    if( addPanelState ) {
        let newAddPanelState = { ...addPanelState.getValue() };
        if( sourceObjects.length > 0 ) {
            newAddPanelState.sourceObjects = sourceObjects;
        } else {
            newAddPanelState.sourceObjects = null;
        }
        newAddPanelState.creationType = null;
        addPanelState.update( newAddPanelState );
    }

    return {
        getRelationInputs: relationInputs,
        sourceObjects: sourceObjects
    };
};

export const handleSearchSelection = function( context, targetObject, creationRelation, addPanelState ) {
    let sourceObjects = context.selected;
    let sourceModelObjects;
    let targetModelObjects;
    let dbValue = creationRelation ? creationRelation.dbValue : null;
    if( targetObject ) {
        var mos = exports.getModelObjectsForCreateRelation( sourceObjects, [ targetObject ], dbValue );
        sourceModelObjects = mos.sourceModelObjects;
        targetModelObjects = mos.targetModelObjects;
    }

    // update atomic data
    if( addPanelState ) {
        let newAddPanelState = { ...addPanelState.getValue() };
        if( sourceObjects && sourceObjects.length > 0 ) {
            newAddPanelState.sourceObjects = sourceObjects;
        } else {
            newAddPanelState.sourceObjects = null;
        }
        newAddPanelState.creationType = null;
        addPanelState.update( newAddPanelState );
    }
    return {
        sourceObjects: sourceObjects,
        sourceModelObjects: sourceModelObjects,
        targetModelObjects: targetModelObjects
    };
};

export const handleAddCopySelection = function( sourceObjects, targetObject, creationRelation, addPanelState ) {
    let sourceModelObjects;
    let targetModelObjects;
    let dbValue = creationRelation ? creationRelation.dbValue : null;
    if( targetObject ) {
        var mos = exports.getModelObjectsForCreateRelation( sourceObjects, [ targetObject ], dbValue );
        sourceModelObjects = mos.sourceModelObjects;
        targetModelObjects = mos.targetModelObjects;
    }

    // update atomic data
    if( addPanelState ) {
        let newAddPanelState = { ...addPanelState.getValue() };
        if( sourceObjects && sourceObjects.length > 0 ) {
            newAddPanelState.sourceObjects = sourceObjects;
        } else {
            newAddPanelState.sourceObjects = null;
        }
        newAddPanelState.creationType = null;
        addPanelState.update( newAddPanelState );
    }
    return {
        sourceObjects: sourceObjects,
        sourceModelObjects: sourceModelObjects,
        targetModelObjects: targetModelObjects
    };
};

export const useSelectionCallBackInPalette = function( sourceObjects, targetObject, creationRelation, addPanelState ) {
    let sourceModelObjects;
    let targetModelObjects;
    var mos = exports.getModelObjectsForCreateRelation( sourceObjects, [ targetObject ], creationRelation );
    if( mos ) {
        sourceModelObjects = mos.sourceModelObjects;
        targetModelObjects = mos.targetModelObjects;

        // update atomic data
        if( addPanelState ) {
            let newAddPanelState = { ...addPanelState.getValue() };
            if( sourceObjects.length > 0 ) {
                newAddPanelState.sourceObjects = sourceObjects;
            } else {
                newAddPanelState.sourceObjects = null;
            }
            addPanelState.update( newAddPanelState );
        }

        return {
            sourceModelObjects: sourceModelObjects,
            targetModelObjects: targetModelObjects
        };
    }
};

export const loadCreateXrt = function( typeIn, activePageTitle, selectedObject, objectType, addPanelState, creationType, xrtState ) {
    var deferred = AwPromiseService.instance.defer();
    let operationName = 'Create';

    xrtParserService.getDeclStyleSheet( typeIn, activePageTitle, selectedObject, objectType ).then( function( response ) {
        let xrtData = JSON.parse( response.declarativeUIDefs[ 0 ].viewModel );
        xrtData.data.operationName = operationName;
        xrtData.data.xrtType = typeIn;

        let vmoIn = {};
        vmoIn.operationName = operationName;
        let uid = Object.keys( xrtData.data.objects )[ 0 ];
        vmoIn = viewModelObjectSvc.createViewModelObject( uid, operationName, null, xrtData.data.objects[ uid ][ 0 ] );

        // update atomic data
        if( addPanelState ) {
            let newAddPanelState = { ...addPanelState.value };
            newAddPanelState.creationType = creationType;
            addPanelState.update( newAddPanelState );
        }

        deferred.resolve( xrtData );
    } );

    return deferred.promise;
};

export const loadAddPanelTabs = function( visibleTabs, data, addPanelState ) {
    const tabChangeCallback = ( pageId, tabTitle ) => {
        let { dispatch } = data;
        let selectedTab = visibleTabs.filter( function( tab ) {
            return tab.pageId === pageId || tab.name === tabTitle;
        } )[ 0 ];

        dispatch( { path: 'data.activeTab', value: selectedTab } );

        if( addPanelState ) {
            let newAddPanelState = { ...addPanelState.getValue() };
            newAddPanelState.selectedTab = { ...selectedTab };
            if( selectedTab ) {
                // clear things when switching tabs
                if( newAddPanelState.sourceObjects ) {
                    newAddPanelState.sourceObjects = [];
                }
                if( selectedTab.pageId === 'palette' || selectedTab.pageId === 'search' &&
                    newAddPanelState.creationType ) {
                    newAddPanelState.creationType = null;
                }
            }
            addPanelState.update( newAddPanelState );
        }
    };

    let defaultTab = visibleTabs.filter( function( tab ) {
        return tab.selectedTab;
    } )[ 0 ];

    if( defaultTab ) {
        return {
            activeTab: defaultTab,
            visibleTabs: visibleTabs,
            api: tabChangeCallback
        };
    }

    return {
        activeTab: visibleTabs[0],
        visibleTabs: visibleTabs,
        api: tabChangeCallback
    };
};

export const updateDatasetCreationType = function( creationType, addPanelState ) {
    let newAddPanelState = { ...addPanelState.getValue() };
    newAddPanelState.creationType = creationType;
    addPanelState.update( newAddPanelState );

    return creationType;
};

export const updateDatasetStateCreationType = function( datasetTypeSelValue, datasetState ) {
    let datasetCreationType = {
        creationType: datasetTypeSelValue.propInternalValue
    };

    // update atomic data
    if( datasetState ) {
        let newAtomicData = { ...datasetState.getValue() };
        newAtomicData.creationType = { ...datasetCreationType };
        datasetState.update( newAtomicData );
    }

    return datasetCreationType;
};

export const setDatasetProperties = async function( data, selTypeList, datasetTypesWithDefaultRelInfo, datasetTypeList, datasetInfo, addPanelState, isCustomDatasetAction ) {
    const newDatasetName = _.clone( data.datasetName );
    if( !newDatasetName.dbValue ) {
        newDatasetName.dbValue = datasetInfo.fileNameNoExt;
    }

    const newDatasetDesc = _.clone( data.datasetDesc );
    newDatasetDesc.dbValue = null;

    const newDatasetType = _.clone( data.datasetType );
    newDatasetType.dbValue = selTypeList.propInternalValue;

    newDatasetType.uiValue = selTypeList.propDisplayValue;
    // update original values
    newDatasetType.dbOriginalValue = newDatasetType.dbValue;
    newDatasetType.uiOriginalValue = newDatasetType.uiValue;

    let response = await exports.updateTypeAndReferences( newDatasetType, datasetTypesWithDefaultRelInfo, data.reference, newDatasetName, newDatasetDesc );

    if( addPanelState && isCustomDatasetAction ) {
        let newAddPanelState = { ...addPanelState.getValue() };
        newAddPanelState.datasetTypeList = datasetTypeList;
        newAddPanelState.references = response.references;
        newAddPanelState.datasetVMO.props.datasetType = newDatasetType;
        newAddPanelState.datasetVMO.props.datasetName = newDatasetName;
        addPanelState.update( newAddPanelState );
    }

    return {
        datasetName: response.datasetName,
        datasetDesc: response.datasetDesc,
        datasetType: newDatasetType,
        creationType: response.creationType,
        references: response.references,
        reference: response.newReference,
        datasetTypeList: datasetTypeList
    };
};

export let addHtmlPanelInDataSource = function( data, type, panelID, editHandlerIn ) {
    const objectType = _.get( data, 'subPanelContext.objectType' );
    if( type && data && panelID ) {
        let editHandler = editHandlerIn;
        if( !editHandler ) {
            editHandler = editHandlerService.getEditHandler( editHandlerContextConstant[ type ] );
        }

        if( editHandler ) {
            let dataSource = editHandler.getDataSource();
            let newViewModel = { ...dataSource.getDeclViewModel() };

            newViewModel.customPanelInfo = newViewModel.customPanelInfo ? newViewModel.customPanelInfo : {};
            newViewModel.customPanelInfo[ panelID ] = data;

            let newDataSource = dataSourceService.createNewDataSource( { declViewModel: newViewModel } );
            editHandler.setDataSource( newDataSource );
        }
    }
};

export const updateCreateTrigger = function( triggerCreate, value ) {
    let newTriggerCreate = { ...triggerCreate };
    newTriggerCreate.dbValue = value;

    return { triggerCreate: newTriggerCreate };
};

export const updateAddACopyTrigger = function( triggerAddACopy, value ) {
    let newTriggerAddACopy = { ...triggerAddACopy };
    newTriggerAddACopy.dbValue = value;

    return { triggerAddACopy: newTriggerAddACopy };
};

export const updateDatasetChangeState = function( datasetChangeState, value ) {
    let newDatasetChangeState = { ...datasetChangeState };
    newDatasetChangeState.dbValue = value;

    return { datasetChangeState: newDatasetChangeState };
};

export const updateCallbackWithCreatedObject = function( createdObject, atomicData ) {
    // update atomic data
    if( atomicData ) {
        let newAtomicData = { ...atomicData.getValue() };
        newAtomicData.createdObject = { ...createdObject };
        atomicData.update( newAtomicData );
    }
};

export const setTypeSelectorWithPreferredType = function( preferredType, typeListProp, preferredTypeSearchResults, addPanelState ) {
    let newTypeListProp = { ...typeListProp };
    let creationType = '';

    if( preferredTypeSearchResults ) {
        if( preferredTypeSearchResults.length === 1 ) {
            creationType = preferredTypeSearchResults[ 0 ];
        }
    } else if( preferredType ) {
        creationType = { props: { type_name: { dbValues: [ preferredType ], uiValues: [ preferredType ] } } };
    }

    if( creationType ) {
        newTypeListProp.dbValue = creationType.props.type_name.dbValues[ 0 ];
        newTypeListProp.value = creationType.props.type_name.dbValues[ 0 ];
        newTypeListProp.uiValue = creationType.props.type_name.uiValues[ 0 ];
    }

    // update atomic data
    if( addPanelState ) {
        let newAddPanelState = { ...addPanelState.getValue() };
        newAddPanelState.creationType = creationType;
        addPanelState.update( newAddPanelState );
    }

    return { typeListProp: newTypeListProp, creationType: creationType };
};

export const updateRefProperty = function( sourceObjects, panelContext ) {
    if( sourceObjects && sourceObjects.length > 0 && panelContext && panelContext.viewModelProperty ) {
        let uidsArray = [];
        _.forEach( sourceObjects, function( { uid } ) {
            if( uid ) {
                uidsArray.push( uid );
            }
        } );

        panelContext.viewModelProperty.onChange( {
            target: {
                value: uidsArray
            }
        } );
    }
};

export const getObjCreateInfo = function( selectedType, editHandlerIn ) {
    let objCreateInfo = {};
    objCreateInfo.props = [];
    objCreateInfo.createType = selectedType ? selectedType.dbValue : null;
    let objectTypeIn = objCreateInfo.createType ? '_' + objCreateInfo.createType : '';
    let editHandler = editHandlerIn;
    if( !editHandler ) {
        editHandler = editHandlerService.getEditHandler( editHandlerContextConstant.CREATE );
    }

    if( editHandler ) {
        let dataSource = editHandler.getDataSource();
        if( dataSource ) {
            let allEditableProperties = dataSource.getAllEditableProperties();
            _.forEach( allEditableProperties, function( vmProp ) {
                if( vmProp && ( vmProp.isAutoAssignable || _uwPropSrv.isModified( vmProp ) ) ) {
                    objCreateInfo.props.push( vmProp );
                }
            } );
        }
    }
    return objCreateInfo;
};

export const getObjCreateEditableProperties = function( objectType, type, propNames, editHandlerIn ) {
    if( !type ) {
        type = 'CREATE';
    }
    let objectTypeIn = objectType ? '_' + objectType : '';
    let editHandler = editHandlerIn;
    if( !editHandler ) {
        editHandler = editHandlerService.getEditHandler( editHandlerContextConstant[ type ] );
    }

    if( editHandler ) {
        let dataSource = editHandler.getDataSource();
        if( dataSource ) {
            let allEditableProperties = dataSource.getAllEditableProperties();
            if( propNames && propNames.length > 0 ) {
                let responseObj = {};
                _.forEach( allEditableProperties, ( vmProp ) => {
                    if( vmProp && propNames.includes( vmProp.propertyName ) ) {
                        responseObj[ vmProp.propertyName ] = vmProp;
                    }
                } );
                return responseObj;
            }
            return allEditableProperties;
        }
    }
    return [];
};

export const assignInitialValues = function( viewModelProperties, objectType, editHandlerIn ) {
    let editHandler = editHandlerIn;
    if( !editHandler ) {
        editHandler = editHandlerService.getEditHandler( editHandlerContextConstant.CREATE );
    }

    let dataSource;
    if( editHandler ) {
        dataSource = editHandler.getDataSource();
        let editableProps = dataSource.getAllEditableProperties();
        let updatedProps = [];

        viewModelProperties.map( function( vmProp ) {
            editableProps.map( function( editableProp ) {
                if( editableProp && editableProp.propertyName === vmProp.propertyName ) {
                    let updatedProp = { ...editableProp };

                    if( updatedProp.type === 'BOOLEAN' || updatedProp.type === 'BOOLEANARRAY' ) {
                        if( _.isString( vmProp.dbValue ) ) {
                            if( vmProp.dbValue.toLowerCase() === 'true' ) {
                                updatedProp.dbValue = true;
                                updatedProp.value = true;
                            } else if( vmProp.dbValue.toLowerCase() === 'false' ) {
                                updatedProp.dbValue = false;
                                updatedProp.value = false;
                            }
                        } else {
                            if( updatedProp.isArray ) {
                                _uwPropSrv.updateModelData( updatedProp, [ vmProp.dbValue ], [ vmProp.dbValue ], false, true, true, {} );
                            } else {
                                _uwPropSrv.updateModelData( updatedProp, vmProp.dbValue, [ vmProp.dbValue ], false, true, true, {} );
                            }
                        }
                    } else if( updatedProp.type === 'DATE' || updatedProp.type === 'DATEARRAY' ) {
                        if( _.isString( vmProp.dbValue ) ) {
                            updatedProp.dbValue = new Date( vmProp.dbValue ).getTime();
                            updatedProp.value = new Date( vmProp.dbValue ).getTime();
                        } else {
                            if( updatedProp.isArray ) {
                                _uwPropSrv.updateModelData( updatedProp, [ vmProp.dbValue ], [ vmProp.dbValue ], false, true, true, {} );
                            } else {
                                _uwPropSrv.updateModelData( updatedProp, vmProp.dbValue, [ vmProp.dbValue ], false, true, true, {} );
                            }
                        }
                    } else if( updatedProp.type === 'INTEGER' || updatedProp.type === 'INTEGERARRAY' || updatedProp.type === 'DOUBLE' || updatedProp.type === 'DOUBLEARRAY' ) {
                        if( _.isString( vmProp.dbValue ) ) {
                            updatedProp.dbValue = Number( vmProp.dbValue );
                            updatedProp.value = Number( vmProp.dbValue );
                            updatedProp.displayValues = [ vmProp.dbValue ];
                        } else {
                            if( updatedProp.isArray ) {
                                _uwPropSrv.updateModelData( updatedProp, [ vmProp.dbValue ], [ vmProp.dbValue ], false, true, true, {} );
                            } else {
                                _uwPropSrv.updateModelData( updatedProp, vmProp.dbValue, [ vmProp.dbValue ], false, true, true, {} );
                            }
                        }
                    } else {
                        if( updatedProp.isArray ) {
                            _uwPropSrv.updateModelData( updatedProp, [ vmProp.dbValue ], [ vmProp.dbValue ], false, true, true, {} );
                        } else {
                            _uwPropSrv.updateModelData( updatedProp, vmProp.dbValue, [ vmProp.dbValue ], false, true, true, {} );
                        }
                    }

                    updatedProps.push( updatedProp );
                }
            } );
        } );

        dataSource.replaceValuesWithNewValues( updatedProps );
    }
};

export const setActiveView = function( activeViewState, destPanelId ) {
    if( activeViewState ) {
        //update activeView
        let newActiveViewState = { ...activeViewState.getValue() };
        newActiveViewState.activeView = destPanelId;
        activeViewState.update( newActiveViewState );
    }
};

export const resetActiveView = ( xrtState, destPanelId ) => {
    let newXrtState = { ...xrtState };
    newXrtState.activeView = destPanelId;
    return newXrtState;
};

export const setFileUploadState = function( ) {
    appCtxService.updateCtx( 'showFileUploadPanel', true );
};

export const resetFileUploadState = function( ) {
    appCtxService.updateCtx( 'showFileUploadPanel', undefined );
};

export const updateAtomicDataValue = function( AtomicObj, value ) {
    if( AtomicObj ) {
        let newAtomicObj = { ...AtomicObj.getValue() };
        if( value ) {
            for( const key of Object.keys( value ) ) {
                newAtomicObj[ key ] = value[ key ];
            }
        }
        if( AtomicObj.update ) {
            AtomicObj.update( newAtomicObj );
        }
    }
};

export const updateAssignedProjectsProvider = function( data, selectedObjects, removeOnly ) {
    if( data && data.dataProviders && data.dataProviders.getAssignedProjectsProvider && selectedObjects && ( selectedObjects.length > 0 || removeOnly ) ) {
        data.dataProviders.getAssignedProjectsProvider.update( selectedObjects,
            selectedObjects.length );
    }
};

export const cacheSelection = selectionData => {
    let selectedUid = selectionData.selected[ 0 ].uid;
    if( selectionData.source === 'secondary' ) {
        selectedUid = selectionData.pselected.uid;
    }

    return selectedUid;
};

export const closePanel = ( selectionData, initialSelection ) => {
    let selectedUid = cacheSelection( selectionData );
    if( initialSelection && initialSelection !== selectedUid ||
        selectionData.source === 'primary' && selectionData.selected.length > 1 ) {
        eventBus.publish( 'complete', { source: 'toolAndInfoPanel' } );
    }
};

export const setPropertyPolicy = ( ) => {
    return propPolicySvc.register( {
        types: [ {
            name: 'ImanType',
            properties: [ {
                name: 'parent_types'
            }, {
                name: 'type_name'
            } ]
        } ]
    } );
};

export const unSetPropertyPolicy = ( policyId ) => {
    propPolicySvc.unregister( policyId );
};


export const resetUploadFileSelectionData = ( uploadFileSelectionData ) => {
    if( uploadFileSelectionData.modelInfo ) {
        uploadFileSelectionData.modelInfo = {};
    }
    if( uploadFileSelectionData.files ) {
        uploadFileSelectionData.files = [];
    }
    if( uploadFileSelectionData.selectedFileInfo ) {
        uploadFileSelectionData.selectedFileInfo = {};
    }
    if( uploadFileSelectionData.selectedFile ) {
        uploadFileSelectionData.selectedFile = {};
    }
    return uploadFileSelectionData;
};

export const getFilePickerConfiguration = async function( fileConfigRootype ) {
    let confReturn = ( await cfgSvc.getCfg( 'filePickerConfiguration', true, true ) )[ fileConfigRootype ];
    let returnArray = [];

    for ( const keys in confReturn ) {
        let json = confReturn[ keys ];
        json.key = keys;
        json.name = localeService.getLoadedTextFromKey( json.name );
        if( json.options && json.options.caption ) {
            json.options.caption = localeService.getLoadedTextFromKey( json.options.caption );
        }
        let isConditionTrue = false;
        if ( json.condition === undefined || json.condition.length === 0 ) {
            //no condition defined equals true
            isConditionTrue = true;
        } else {
            isConditionTrue = conditionService.evaluateCondition( { ctx: appCtxService.ctx }, json.condition );
        }

        if ( isConditionTrue ) {
            returnArray.push( json );
        }
    }
    return returnArray;
};


export let updateAddPanelContext = function( addObjectContext, commandContext ) {
    return { ...commandContext, addObject: { ...addObjectContext } };
};
export let updateAddObjectData = function( data, addObject ) {
    if( data ) {
        return data;
    }
    return addObject;
};

export const onRelationSelected = ( addPanelState, relationListSelectionData ) => {
    if( relationListSelectionData && relationListSelectionData.selected && relationListSelectionData.selected.length > 0 ) {
        let selectedRelation = relationListSelectionData.selected[0].propInternalValue;

        // update atomic data
        if( addPanelState && addPanelState.value.selectedRelation !== selectedRelation ) {
            let newAddPanelState = { ...addPanelState.value };
            newAddPanelState.selectedRelation = selectedRelation;
            addPanelState.update( newAddPanelState );
        }
    }
};

export const updateIsObjectCreationInProgress = ( flag ) => {
    return flag;
};

export const getDatasetTypesWithDefaultRelationInput = ( selectionData ) => {
    let extension = '';
    if( selectionData.selected ) {
        let selectedObject = selectionData.selected[ 0 ];
        let selectedObj = getAdaptedObjectsSync( [ selectedObject ] );
        let fileName = selectedObj[ 0 ].props.original_file_name.dbValues[ 0 ];
        let fileNameSplit = fileName.split( '.' );
        extension = fileNameSplit[ fileNameSplit.length - 1 ];
    }
    return [ extension ];
};

localeService.getLocalizedTextFromKey( 'UIElementsMessages.failureToAttachFiles', true ).then(
    result => _failureToAttachFiles = result || '{0}' ); // add defaulting to avoid failure during unit test runs

export default exports = {
    getDatasetFileExtensions,
    getPropertiesProject,
    isSupportedTCVersion,
    updateSelectionModeForDataProvider,
    getRecentUsedTypes,
    updateRecentUsedTypes,
    getCreateInput,
    getCreateRelationsInput,
    getCreatedObject,
    getCreatedObjects,
    getCreatedObjectsForAddACopy,
    getModelObjectsForCreateRelation,
    sortProjects,
    getProjects,
    getFileFormat,
    initDSCreateParams,
    updateDatasetInfo,
    updateDatasetCreationType,
    updateDatasetStateCreationType,
    getDatasetTypeFromTypeInfo,
    getDatasetTypesFromTypesWithRelInfo,
    getReferences,
    getFileExtension,
    updateTypeAndReferences,
    updateRelationList,
    updateTargetObject,
    uploadFilePreinit,
    updateAddObjectContext,
    commonAddObjectContext,
    populateAddObjectContext,
    getDatasets,
    startMultiFileUpload,
    initNextUpload,
    clearSelectedType,
    showMoreLinkStyles,
    convertTypesToLovEntries,
    onTypeSelected,
    updateTheFocusedComponent,
    handlePaletteSelection,
    handleSearchSelection,
    handleAddCopySelection,
    loadCreateXrt,
    loadAddPanelTabs,
    setDatasetProperties,
    addHtmlPanelInDataSource,
    updateCreateTrigger,
    updateAddACopyTrigger,
    updateDatasetChangeState,
    updateCallbackWithCreatedObject,
    setTypeSelectorWithPreferredType,
    useSelectionCallBackInPalette,
    updateRefProperty,
    getObjCreateInfo,
    getSelectedFileInfo,
    getObjCreateEditableProperties,
    assignInitialValues,
    setActiveView,
    resetActiveView,
    updateAtomicDataValue,
    updateAssignedProjectsProvider,
    updatedbValue,
    cacheSelection,
    closePanel,
    toggleAddACopyState,
    syncTypeSelection,
    initialize,
    setPropertyPolicy,
    unSetPropertyPolicy,
    getFilePickerConfiguration,
    datasetChangeAction,
    resetUploadFileSelectionData,
    onRelationSelected,
    updateAddPanelContext,
    updateAddObjectData,
    updateIsObjectCreationInProgress,
    setFileUploadState,
    resetFileUploadState,
    getDatasetTypesWithDefaultRelationInput
};
