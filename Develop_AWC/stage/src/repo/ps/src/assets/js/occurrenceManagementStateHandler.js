// Copyright (c) 2022 Siemens

/**
 * @module js/occurrenceManagementStateHandler
 */
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import occmgmtUtils from 'js/occmgmtUtils';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var _onProductContextChangeEventListener = null;
var supportedFeatures = {};
var readOnlyFeatures = {};
var isOpenedUnderAContext = false;
var swcContainerNames = [];

var exports = {};

/**
 * Update 'contextObject' in the appCtxService (if necessary).
 *
 * @param {IModelObject} contextKeyObject - ContextKeyObject
 */
var registerOrUpdateInformationOnContext = function( contextKeyObject, contextKey, activeContext ) {
    let pciObj = contextKeyObject.productContextInfo;
    if( pciObj && activeContext ) {
        var changed = false;

        if( !activeContext.productContextInfo || activeContext.productContextInfo.uid !== pciObj.uid ) {
            activeContext.productContextInfo = pciObj;
            changed = true;
        }

        if( !_.isEqual( activeContext.supportedFeatures, supportedFeatures ) ) {
            activeContext.supportedFeatures = supportedFeatures;
            changed = true;
        }

        if( !_.isEqual( activeContext.readOnlyFeatures, readOnlyFeatures ) ) {
            activeContext.readOnlyFeatures = readOnlyFeatures;
            changed = true;
        }

        if( activeContext.isOpenedUnderAContext !== isOpenedUnderAContext ) {
            activeContext.isOpenedUnderAContext = isOpenedUnderAContext;
            changed = true;
        }

        if( activeContext.workingContextObj !== occmgmtUtils.getSavedWorkingContext( pciObj ) ) {
            activeContext.workingContextObj = occmgmtUtils.getSavedWorkingContext( pciObj );
            changed = true;
        }

        if( changed ) {
            appCtxSvc.updatePartialCtx( contextKey, activeContext );
        }
    }
};

/**
 */
export let getSupportedFeaturesFromPCI = function( productContextInfo ) {
    var supportedFeaturesFromPCI = {};
    var supportedFeaturesObjects = null;
    if( productContextInfo && productContextInfo.props ) {
        supportedFeaturesObjects = productContextInfo.props.awb0SupportedFeatures;
    }

    if( supportedFeaturesObjects && supportedFeaturesObjects.dbValues ) {
        for( var objIndex = 0; objIndex < supportedFeaturesObjects.dbValues.length; objIndex++ ) {
            var featureObject = cdm.getObject( supportedFeaturesObjects.dbValues[ objIndex ] );

            if( featureObject.type === 'Awb0FeatureList' ) {
                var availableFeatures = featureObject.props.awb0AvailableFeatures;
                if( availableFeatures && availableFeatures.dbValues ) {
                    for( var feature = 0; feature < availableFeatures.dbValues.length; feature++ ) {
                        supportedFeaturesFromPCI[ availableFeatures.dbValues[ feature ] ] = true;
                    }
                }
            } else {
                if( featureObject.type ) {
                    supportedFeaturesFromPCI[ featureObject.modelType.name ] = true;
                }
            }
        }
    }
    return supportedFeaturesFromPCI;
};

/**
 */
var populateSupportedFeaturesFromPCI = function( contextKeyObject ) {
    supportedFeatures = exports.getSupportedFeaturesFromPCI( contextKeyObject.productContextInfo );
};

/**
 */
var populateSWCContainerNames = function( productContextInfo ) {
    swcContainerNames = [];

    if( productContextInfo && productContextInfo.props ) {
        var supportedFeaturesObjects = productContextInfo.props.awb0SupportedFeatures;
        if( supportedFeaturesObjects ) {
            for( var supportedFeatureObject = 0; supportedFeatureObject < supportedFeaturesObjects.dbValues.length; supportedFeatureObject++ ) {
                var featureObject = cdm.getObject( supportedFeaturesObjects.dbValues[ supportedFeatureObject ] );
                if( featureObject.type === 'Awb0SaveWorkingContextFeature' ) {
                    var containerNames = featureObject.props.awb0ContainerNames;
                    for( var cnIndex = 0; cnIndex < containerNames.dbValues.length; cnIndex++ ) {
                        swcContainerNames.push( containerNames.dbValues[ cnIndex ] );
                    }
                }
            }
        }
    }
};

/**
 */
export let getReadOnlyFeaturesFromPCI = function( productContextInfo ) {
    var readOnlyFeaturesList = {};

    if( productContextInfo && productContextInfo.props ) {
        var supportedFeaturesObjects = productContextInfo.props.awb0SupportedFeatures;

        if( supportedFeaturesObjects ) {
            for( var supportedFeatureObject = 0; supportedFeatureObject < supportedFeaturesObjects.dbValues.length; supportedFeatureObject++ ) {
                var featureObject = cdm.getObject( supportedFeaturesObjects.dbValues[ supportedFeatureObject ] );

                if( featureObject.type === 'Awb0FeatureList' ) {
                    var nonModifiableFeatures = featureObject.props.awb0NonModifiableFeatures;

                    if( nonModifiableFeatures ) {
                        for( var feature = 0; feature < nonModifiableFeatures.dbValues.length; feature++ ) {
                            readOnlyFeaturesList[ nonModifiableFeatures.dbValues[ feature ] ] = true;
                        }
                    }
                }
            }
        }
    }

    return readOnlyFeaturesList;
};

/**
 */
var populateReadOnlyFeaturesFromPCI = function( productContextInfo ) {
    readOnlyFeatures = exports.getReadOnlyFeaturesFromPCI( productContextInfo );
};

/**
 */
var populateContextInformationFromPCI = function( productContextInfo ) {
    isOpenedUnderAContext = false;

    if( productContextInfo && productContextInfo.props && productContextInfo.props.awb0ContextObject ) {
        isOpenedUnderAContext = !productContextInfo.props.awb0ContextObject.isNulls;
    }
};

var populateSupportedFeaturesInWorkingContext = function( contextKeyObject, contextKey ) {
    var supportedFeaturesInWC = null;
    if( contextKeyObject.isOpenedUnderAContext &&
        contextKeyObject.elementToPCIMap ) {
        supportedFeaturesInWC = {};
        for( var key in contextKeyObject.elementToPCIMap ) {
            if( contextKeyObject.elementToPCIMap.hasOwnProperty( key ) ) {
                var pciModelObject = cdm
                    .getObject( contextKeyObject.elementToPCIMap[ key ] );
                var supportedFeaturesFromPCI = exports.getSupportedFeaturesFromPCI( pciModelObject );
                _.assign( supportedFeaturesInWC, supportedFeaturesFromPCI );
            }
        }
    }

    if( supportedFeaturesInWC &&
        !_.isEqual( contextKeyObject.supportedFeaturesInWC, supportedFeaturesInWC ) ) {
        appCtxSvc.updatePartialCtx( contextKey + '.supportedFeaturesInWC', supportedFeaturesInWC );
    }
};

var populateContextKey = function( data ) {
    if( data && data.contextKey ) {
        return data.contextKey;
    }
    return appCtxSvc.ctx.aceActiveContext.key;
};

/**
 */
var startListeningToProductContextChangeEvent = function() {
    _onProductContextChangeEventListener = eventBus.subscribe( 'occDataLoadedEvent', function( eventData ) {
        var contextKey = populateContextKey( eventData );
        var contextKeyObject = appCtxSvc.getCtx( contextKey );

        if ( !contextKeyObject || contextKeyObject === undefined ) {
            return;
        }

        var transientRequestPref = {};
        populateSupportedFeaturesFromPCI( contextKeyObject );
        populateSWCContainerNames( contextKeyObject.productContextInfo );
        populateReadOnlyFeaturesFromPCI( contextKeyObject.productContextInfo );
        populateContextInformationFromPCI( contextKeyObject.productContextInfo );
        registerOrUpdateInformationOnContext( contextKeyObject, contextKey, contextKeyObject );
        populateSupportedFeaturesInWorkingContext( contextKeyObject, contextKey );

        if( contextKeyObject.requestPref ) {
            if ( contextKeyObject.requestPref.reloadDependentTabs ) {
                transientRequestPref.reloadDependentTabs = contextKeyObject.requestPref.reloadDependentTabs;
            }

            if( contextKeyObject.requestPref.recipeReset ) {
                transientRequestPref.recipeReset = contextKeyObject.requestPref.recipeReset;
            }

            if( contextKeyObject.requestPref.windowNotReused ) {
                transientRequestPref.windowNotReused = contextKeyObject.requestPref.windowNotReused;
            }
        }

        var occLoadedEventData = eventData;
        setTimeout( function() {
            var eventData = {};
            if( occLoadedEventData && occLoadedEventData.dataProviderActionType ) {
                eventData = {
                    updatedView: contextKey,
                    dataProviderActionType: occLoadedEventData.dataProviderActionType,
                    transientRequestPref: transientRequestPref
                };
            } else {
                eventData = {
                    updatedView: contextKey,
                    dataProviderActionType: null,
                    transientRequestPref: transientRequestPref
                };
            }

            eventBus.publish( 'productContextChangedEvent', eventData );
        }, 0 );
    }, 'OccurrenceManagementStateHandler' );
};

/**
 */
var stopListeningToEventListners = function() {
    eventBus.unsubscribe( _onProductContextChangeEventListener );
};

/**
 * Initialize OccMgmtStateHandler
 */
export let initializeOccMgmtStateHandler = function() {
    startListeningToProductContextChangeEvent();
};

/**
 * Get Supported Features
 */
export let getSupportedFeatures = function() {
    return supportedFeatures;
};

/**
 * Get Read-Only Features
 */
export let getReadOnlyFeatures = function() {
    return readOnlyFeatures;
};

/**
 * Get Saved Working Context Container Names
 */
export let getSWCContainerNames = function() {
    return swcContainerNames;
};

/**
 * Get the Product Context Info instance
 */
export let getProductContextInfo = function() {
    var context = appCtxSvc.getCtx( 'aceActiveContext.context' );
    if( context ) {
        return context.productContextInfo;
    }
};

/**
 * Return true if feature is supported, otherwise false
 */
export let isFeatureSupported = function( featureToCheck ) {
    if( supportedFeatures[ featureToCheck ] ) {
        return true;
    }
    return false;
};


/**
 * Destroy OccMgmtStateHandler
 */
export let destroyOccMgmtStateHandler = function() {
    stopListeningToEventListners();
    supportedFeatures = {};
    readOnlyFeatures = [];
};

/**
 * Occurrence Management State Handler
 */

export default exports = {
    getSupportedFeaturesFromPCI,
    getReadOnlyFeaturesFromPCI,
    initializeOccMgmtStateHandler,
    getSupportedFeatures,
    getReadOnlyFeatures,
    getSWCContainerNames,
    getProductContextInfo,
    isFeatureSupported,
    destroyOccMgmtStateHandler
};
