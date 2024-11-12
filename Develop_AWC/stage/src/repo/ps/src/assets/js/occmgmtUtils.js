// Copyright (c) 2022 Siemens

/**
 * @module js/occmgmtUtils
 */
import appCtxService from 'js/appCtxService';
import cdmService from 'soa/kernel/clientDataModel';
import evaluateExpressionInGivenContext from 'js/evaluateExpressionInGivenContext';
import occmgmtStateHandler from 'js/occurrenceManagementStateHandler';
import localeService from 'js/localeService';
import _ from 'lodash';
import tcSessionData from 'js/TcSessionData';

var exports = {};

var IModelObject = function( uid, type ) {
    this.uid = uid;
    this.type = type;
};

/**
 * This method is needed for cases where UID is present but object not loaded in client.
 * e.g. In URL refresh case, object UID is present on URL , needs to be passed to server.
 * @param{String} Object UID
 * @returns Object from client data model if present. Else, IModelObject with uid and unknown type.
 */

export let getObject = function( uid ) {
    if( cdmService.isValidObjectUid( uid ) ) {
        var obj = cdmService.getObject( uid );

        if( !obj ) {
            return new IModelObject( uid, 'unknownType' );
        }

        return obj;
    }

    return new IModelObject( cdmService.NULL_UID, 'unknownType' );
};

/**
 * @param {Object} inputContext Context from which the PCI needs to be figured out
 * @return {String} Uid of the productContext corresponding to the selected object if it is available in the elementToPCIMap;
 *         the productContext from the URL otherwise
 */
let getContexts = function( inputContext ) {
    let currentContexts = [];
    if( inputContext && !appCtxService.ctx.splitView ) {
        currentContexts.push( inputContext );
    } else if( appCtxService.ctx.splitView && appCtxService.ctx.splitView.mode ) {
        _.forEach( appCtxService.ctx.splitView.viewKeys, function( viewKey ) {
            currentContexts.push( appCtxService.ctx[ viewKey ] );
        } );
    } else if( appCtxService.ctx.aceActiveContext && appCtxService.ctx.aceActiveContext.context ) {
        currentContexts.push( appCtxService.ctx.aceActiveContext.context );
    }
    return currentContexts;
};
/**
 * @param {Object} object Object whose UID needs to be figured out
 * @param {Object} inputContext occContext atomic data
 * @return Uid of the productContext corresponding to the selected object if it is available in the elementToPCIMap;
 *         the productContext from the URL otherwise
 */
export let getProductContextForProvidedObject = function( object, inputContext ) {
    var currentContext = inputContext;

    if( _.isUndefined( currentContext ) ) {
        if( appCtxService.ctx.aceActiveContext && appCtxService.ctx.aceActiveContext.context ) {
            currentContext = appCtxService.ctx.aceActiveContext.context;
        }
    }

    if( currentContext ) {
        if( currentContext.elementToPCIMap ) {
            var parentObject = object;
            do {
                if( currentContext.elementToPCIMap[ parentObject.uid ] ) {
                    return currentContext.elementToPCIMap[ parentObject.uid ];
                }

                var parentUid = exports.getParentUid( parentObject );
                parentObject = cdmService.getObject( parentUid );
            } while( parentObject );
        } else {
            return currentContext.currentState.pci_uid;
        }
    }
    return null;
};

/**
 * @param {Object} object Object whose UID needs to be figured out
 * @param {Object} inputContext Context from which the PCI needs to be figured out
 * @return {String} Uid of the productContext corresponding to the selected object if it is available in the elementToPCIMap;
 *         the productContext from the URL otherwise
 */
export let getProductContextInfoForProvidedObject = function( object, inputContext ) {
    let currentContexts = getContexts( inputContext );

    let rootObj = getRootObject( object );
    for( var idx = 0; idx < currentContexts.length; ++idx ) {
        if( currentContexts[ idx ] ) {
            if( currentContexts[ idx ].elementToPCIMap ) {
                if( currentContexts[ idx ].elementToPCIMap[ rootObj.uid ] ) {
                    return currentContexts[ idx ].elementToPCIMap[ rootObj.uid ];
                }
            } else if( rootObj.uid === currentContexts[ idx ].currentState.t_uid ) {
                return currentContexts[ idx ].currentState.pci_uid;
            }
        }
    }
    return currentContexts.length > 0 && currentContexts[ 0 ] ? currentContexts[ 0 ].currentState.pci_uid : null;
};

/**
 * @param {Object} object Object whose Root object needs to be figured out
 * @return {Object} Root Object
 */
let getRootObject = function( object ) {
    var parentObject = object;
    var rootObj;
    do {
        rootObj = parentObject;
        var parentUid = exports.getParentUid( parentObject );
        if( parentUid === null ) {
            return rootObj;
        }
        parentObject = cdmService.getObject( parentUid );
    } while( parentObject );
};

export let getParentUid = function( modelObject ) {
    if( modelObject && modelObject.props ) {
        var props = modelObject.props;

        var uid;

        if( props.awb0BreadcrumbAncestor && !_.isEmpty( props.awb0BreadcrumbAncestor.dbValues ) ) {
            uid = props.awb0BreadcrumbAncestor.dbValues[ 0 ];
        } else if( props.awb0Parent && !_.isEmpty( props.awb0Parent.dbValues ) ) {
            uid = props.awb0Parent.dbValues[ 0 ];
        }

        if( cdmService.isValidObjectUid( uid ) ) {
            return uid;
        }
    }

    return null;
};

/**
 *
 * @return {Boolean} true if sorting is supported
 */
export let isSortingSupported = function( contextState ) {
    var productContextInfo = cdmService.getObject( contextState.occContext.currentState.pci_uid );
    var supportedFeatures = occmgmtStateHandler.getSupportedFeaturesFromPCI( productContextInfo );

    if( supportedFeatures && supportedFeatures.Awb0SortFeature ) {
        return true;
    }

    return false;
};

/**
 * @return true if current view mode is Tree or Tree with Summary; false otherwise.
 */
export let isTreeView = function() {
    var viewModeInfo = appCtxService.ctx.ViewModeContext;

    if( viewModeInfo &&
        ( viewModeInfo.ViewModeContext === 'TreeView' || viewModeInfo.ViewModeContext === 'TreeSummaryView' ) ) {
        return true;
    }

    return false;
};

/**
 * @return true if current view mode is Resource or Resource with Summary; false otherwise.
 */
export let isResourceView = function() {
    var viewModeInfo = appCtxService.ctx.ViewModeContext;

    if( viewModeInfo &&
        ( viewModeInfo.ViewModeContext === 'ResourceView' || viewModeInfo.ViewModeContext === 'ResourceSummaryView' ) ) {
        return true;
    }

    return false;
};

/**
 * @param {boolean} value toggle state value for decorator flag.
 * @param {boolean} restoreOldValue true if you want to restore old value while disabling decorator toggle.
 */
export let setDecoratorToggle = function( value, restoreOldValue ) {
    if( value === true ) {
        var oldDecoratorToggle = appCtxService.getCtx( 'decoratorToggle' );
        appCtxService.updatePartialCtx( 'oldDecoratorToggleValue', oldDecoratorToggle );
    } else {
        if( restoreOldValue === true ) {
            oldDecoratorToggle = appCtxService.getCtx( 'oldDecoratorToggleValue' );
            value = oldDecoratorToggle ? oldDecoratorToggle : value;
        }
        appCtxService.unRegisterCtx( 'oldDecoratorToggleValue' );
    }
    appCtxService.updatePartialCtx( 'decoratorToggle', value );
};

/**
 * Gets the current data provider. If access mode is tree.
 * @param {*} dataProviders
 */
export var getCurrentTreeDataProvider = function( dataProviders ) {
    for( var dp in dataProviders ) {
        if( dataProviders[ dp ].accessMode && dataProviders[ dp ].accessMode === 'tree' ) {
            return dataProviders[ dp ];
        }
    }
    return;
};

/**
 * @param {Object} productContextInfo  productContextInfo object
 * @param {String} featureName feature name
 * @return {Boolean} true if feature is supported; false otherwise.
 */
export let isFeatureSupported = function( productContextInfo, featureName ) {
    if( productContextInfo ) {
        var supportedFeatures = occmgmtStateHandler.getSupportedFeaturesFromPCI( productContextInfo );
        if( supportedFeatures && supportedFeatures[ featureName ] ) {
            return true;
        }
    }
    return false;
};

/**
 * This method is returns first level children of given node.
 * It also checks in cache if present it returns children form cache.
 * @param {Object} parentNode - parent vmo.
 * @return{String} children of given node
 */
export let getImmediateChildrenOfGivenParentNode = function( parentNode ) {
    if( parentNode ) {
        var children = parentNode.children;
        if( !children && parentNode.__expandState ) {
            children = parentNode.__expandState.children;
        }
        return children;
    }
};

/**
 * Update View Model Data
 * @param {Object} data the viewModelData
 * @param {Object} objectToUpdate the object to update in the viewModelData
 * @param {Object} value the value to update
 */
export function updateDataFromCtx( data, objectToUpdate, value ) {
    if( data && objectToUpdate ) {
        data[ objectToUpdate ].dbValue = value;
    }
}

function mergeNewValuesWithExistingOccContext( target, pathOnCtxOrState, value, mergeValueWithExistingValue ) {
    let newOccContext = { ...target.getValue() };
    if ( _.isEmpty( pathOnCtxOrState ) ) {
        for ( const key of Object.keys( value ) ) {
            if ( mergeValueWithExistingValue && !_.isEmpty( Object.keys( value[key] ) ) ) {
                for ( const fieldValue of Object.keys( value[key] ) ) {
                    newOccContext[key][fieldValue] = value[key][fieldValue];
                }
            } else {
                newOccContext[key] = value[key];
            }
        }
    } else {
        newOccContext[pathOnCtxOrState] = value;
    }
    return newOccContext;
}

export function resetTreeDisplayWithProvidedInput( pathOnCtxOrState, value, target, mergeValueWithExistingValue ) {
    let newOccContext = mergeNewValuesWithExistingOccContext( target, pathOnCtxOrState, value, mergeValueWithExistingValue );
    newOccContext.updateOccContextStateOnTree( { path: 'data.newOccContext', value: newOccContext } );
    newOccContext.resetTreeDataProvider();
}

/**
 * Update ctx or atomic data
 * @param {Object} pathOnCtxOrState path to be updated
 * @param {Object} value value to be update
 * @param {Object} target can be atomic data structure / context key
 * @param {Object} mergeValueWithExistingValue If true, provided values will be merged with existing values.
 * 1) if path is provided, value will be added/replaced on that path.
 * 2) If path is empty, then first level object keys will added/replaced in existing values.
 */
export function updateValueOnCtxOrState( pathOnCtxOrState, value, target, mergeValueWithExistingValue ) {
    if( target && target.value ) {
        let newOccContext = mergeNewValuesWithExistingOccContext( target, pathOnCtxOrState, value, mergeValueWithExistingValue );

        target.update( newOccContext );

        let currentState = appCtxService.getCtx().state;
        if( currentState && currentState.params.debug === 'true' ) {
            console.log( 'Atomic data updated for delta ' + JSON.stringify( value ) );
            console.log( 'Complete value is ' + JSON.stringify( newOccContext ) );
        }
    } else {
        if( _.isEmpty( pathOnCtxOrState ) ) {
            var currentContext = appCtxService.getCtx( target );
            for( const key of Object.keys( value ) ) {
                currentContext[ key ] = value[ key ];
            }
            appCtxService.updatePartialCtx( target, currentContext );
        } else {
            appCtxService.updatePartialCtx( target + '.' + pathOnCtxOrState, value );
        }
    }
}

/**
 * @param data context for expression
 * @param ctx appctx for expression
 * @param conditions conditions for expression
 * @param expr expression to be solved with given context
 * @param type INTEGER etc.
 * @return value of expression
 */
export let parseExpression = function( data, ctx, conditions, expression, type ) {
    return evaluateExpressionInGivenContext.parseExpression( data, ctx, conditions, expression, type );
};

/**
 * Check if current TC version matched with the given miniumum TC version
 *
 * @param {number} majorTCVersion Major TC version to check
 * @param {numer} minorTCVersion  Minor TC version to check
 * @returns {booelan} true if current tc version is greater than or equal to given najor and minor TC version; false otherwise.
 */
export let isMinimumTCVersion = function( majorTCVersion, minorTCVersion ) {
    const tcMajor = tcSessionData.getTCMajorVersion();
    const tcMinor = tcSessionData.getTCMinorVersion();
    return tcMajor > majorTCVersion || tcMajor >= majorTCVersion && tcMinor >= minorTCVersion;
};

export let getSavedWorkingContext = ( productContextInfo ) => {
    if( productContextInfo.props.awb0ContextObject && productContextInfo.props.awb0ContextObject.dbValues ) {
        return cdmService.getObject( productContextInfo.props.awb0ContextObject.dbValues[ 0 ] );
    }
    return null;
};

/**
 * Get the message for given key from given resource file, replace the parameter and return the localized string
 *
 * @param {Object} resourceFile - File that defines the message
 * @param {String} resourceKey - The message key which should be looked-up
 * @param {String} messageParam - The message parameter
 * @returns {String} localizedValue - The localized message string
 */
export let getLocalizedMessage = ( resourceFile, resourceKey, messageParam ) => {
    var localizedValue = null;
    var resource = resourceFile;
    var localTextBundle = localeService.getLoadedText( resource );
    if( localTextBundle ) {
        localizedValue = localTextBundle[ resourceKey ].replace( '{0}', messageParam );
    } else {
        var asyncFun = function( localTextBundle ) {
            localizedValue = localTextBundle[ resourceKey ].replace( '{0}', messageParam );
        };
        localeService.getTextPromise( resource ).then( asyncFun );
    }
    return localizedValue;
};

export let getAlternateSelectedObjectsForACE = function( propObjects ) {
    var modelObjects = [];
    var uidsToLoad = [];

    if( propObjects ) {
        _.forEach( propObjects, function( property ) {
            if( property && property.dbValues ) {
                _.forEach( property.dbValues, function( dbValue ) {
                    var modelObject = cdmService.getObject( dbValue );
                    if( modelObject && !_.isEmpty( modelObject.props ) ) {
                        modelObjects.push( modelObject );
                    } else {
                        uidsToLoad.push( dbValue );
                    }
                } );
            }
        } );

        if( !_.isEmpty( uidsToLoad ) ) {
            _.forEach( uidsToLoad, function( uid ) {
                var modelObject = cdmService.getObject( uid );
                if( modelObject !== null ) {
                    modelObjects.push( modelObject );
                }
            } );
        }
    }

    return modelObjects;
};

export let getSelectedObjectUids = function( selectedModelObjects ) {
    var selectedObjectsUids = [];
    _.forEach( selectedModelObjects, function( selectedObject ) {
        selectedObjectsUids.push( selectedObject.uid );
    } );
    return selectedObjectsUids;
};

export let updateField = function( fields, fieldName ) {
    let fieldToUpdate = fields[ fieldName ];
    fieldToUpdate.update( fieldToUpdate.value );
};

export let setLocalizedValue = function( object, objectProperty, resourceKey ) {
    var resource = 'PSConstants';
    var localTextBundle = localeService.getLoadedText( resource );
    if( localTextBundle ) {
        object[ objectProperty ] = localTextBundle[ resourceKey ];
    } else {
        var asyncFun = function( localTextBundle ) {
            object[ objectProperty ] = localTextBundle[ resourceKey ];
        };
        localeService.getTextPromise( resource ).then( asyncFun( localTextBundle ) );
    }
};

export let getExpandBelowPageSize = function() {
    let expandBelowPageSize = '500'; // default page size
    if( !_.isUndefined( appCtxService.ctx.preferences ) && !_.isUndefined( appCtxService.ctx.preferences.AWB_ExpandBelowResponsePageSize ) &&
        appCtxService.ctx.preferences.AWB_ExpandBelowResponsePageSize.length > 0 ) {
        expandBelowPageSize = appCtxService.ctx.preferences.AWB_ExpandBelowResponsePageSize[ 0 ];
    }
    return expandBelowPageSize;
};

export default exports = {
    getObject,
    getProductContextForProvidedObject,
    getProductContextInfoForProvidedObject,
    getParentUid,
    isSortingSupported,
    isTreeView,
    isResourceView,
    isFeatureSupported,
    setDecoratorToggle,
    getCurrentTreeDataProvider,
    getImmediateChildrenOfGivenParentNode,
    updateDataFromCtx,
    parseExpression,
    isMinimumTCVersion,
    resetTreeDisplayWithProvidedInput,
    updateValueOnCtxOrState,
    getSavedWorkingContext,
    getLocalizedMessage,
    getAlternateSelectedObjectsForACE,
    getSelectedObjectUids,
    updateField,
    setLocalizedValue,
    getExpandBelowPageSize
};
