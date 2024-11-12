// Copyright (c) 2022 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awv0VisualizationService
 */
import AwPromiseService from 'js/awPromiseService';
import hostInteropSvc from 'js/hosting/hostInteropService';
import hostServices from 'js/hosting/hostConst_Services';
import selectionSvc from 'js/selection.service';
import appCtxSvc from 'js/appCtxService';
import preferenceSvc from 'soa/preferenceService';
import commandsMapSvc from 'js/commandsMapService';
import openInVisualizationProductContextInfoProvider from 'js/openInVisualizationProductContextInfoProvider';
import createLaunchInfoRequest from 'js/createLaunchInfoRequest';
import hostConfigValues from 'js/hosting/hostConst_ConfigValues';
import viewerContextSvc from 'js/viewerContext.service';
import tcSessionData from 'js/TcSessionData';
import logger from 'js/logger';
import _ from 'lodash';

/**
 * @return {Promise} Resolved with TRUE if we should be opening in host.
 */
function determineOpenInHost() {
    let openInHost = false;
    if( appCtxSvc.ctx.aw_hosting_enabled && appCtxSvc.ctx.aw_host_type === hostConfigValues.HOST_TYPE_VIS ) {
        openInHost = hostInteropSvc.getCanTalkWithHost() &&
            hostInteropSvc.isHostServiceAvailable( hostServices.HS_HOST_OPEN, hostServices.VERSION_2014_02 );
    }
    return openInHost;
}

/**
 * Gets value for prefernce AWV0HostAWInVisUponLaunch
 * @return {Promise} Resolved with true if we should be opening in host.
 */
function determineHostInVis() {
    var deferred = AwPromiseService.instance.defer();
    preferenceSvc.getLogicalValue( 'AWV0HostAWInVisUponLaunch' ).then( function( result ) {
        if( result !== null && result.length > 0 && result.toUpperCase() === 'TRUE' ) {
            deferred.resolve( true );
        } else {
            deferred.resolve( false );
        }
    }, function( error ) {
        logger.error( error );
    } );

    return deferred.promise;
}

/**
 * Gets value for prefernce AWV0LaunchAsTempSession
 * @return {Promise} Resolved with true if we should be opening in host.
 */
function determineTempAppSessionLaunchPref() {
    var deferred = AwPromiseService.instance.defer();
    preferenceSvc.getStringValues( 'AWC_visExposedBetaFeatures' ).then( function( result ) {
        if( result !== null && result.length > 0 ) {
            let index = _.findIndex( result, function( val ) { return val === 'EnableWYSIWYGLaunch'; } );

            if( index >= 0 ) {
                deferred.resolve( true );
            } else {
                deferred.resolve( false );
            }
        } else {
            deferred.resolve( false );
        }
    }, function( error ) {
        logger.error( error );
    } );

    return deferred.promise;
}

/**
 * Fetches VVI for selections.
 *
 */
var launchSelections = function( isReloadOperation ) {
    return determineHostInVis().then( function( isHostInVis ) {
        var selectedObjects = selectionSvc.getSelection().selected;
        let isOpenInHost = determineOpenInHost();
        return createLaunchInfoRequest.launchObject( isOpenInHost, isHostInVis, selectedObjects, isReloadOperation );
    } );
};

/**
 * Get Viewer context data from aceActiveContext.
 *
 */
var getViewerContextData = function() {
    let aceActiveContext = appCtxSvc.getCtx( 'aceActiveContext' );
    let occmgmtContextKey = aceActiveContext && aceActiveContext.key ? aceActiveContext.key : 'occmgmtContext';
    let viewerContextNamespace = viewerContextSvc.getActiveViewerContextNamespaceKey( occmgmtContextKey );
    return viewerContextSvc.getRegisteredViewerContext( viewerContextNamespace );
};
/**
 * Determines active Viewer Context
 */
var determineViewerActiveNameSpace = function() {
    let allViewerCtx = viewerContextSvc.getRegisteredViewerContextNamseSpaces();
    let occmgmtActiveContext = appCtxSvc.getCtx( 'aceActiveContext' );
    let occmgmtContextKey = occmgmtActiveContext && occmgmtActiveContext.key ? occmgmtActiveContext.key : 'occmgmtContext';
    return _.find( allViewerCtx, function( vc ) {
        let currentViewerContext = appCtxSvc.getCtx( vc );
        if( currentViewerContext && currentViewerContext.occmgmtContextName &&
            currentViewerContext.occmgmtContextName === occmgmtContextKey ) {
            return true;
        }
    } );
};

/**
 * Fetches VVI for product.
 *
 * @param {Boolean} isTohostInVis - launch VVI in VIS.
 * @param {Array} selectedObjects - Array of selected objects (occurances)
 */
var launchProduct = function( isReloadOperation ) {
    return AwPromiseService.instance.all( [ determineHostInVis(), determineTempAppSessionLaunchPref() ] )
        .then( function( results ) {
            return openInVisualizationProductContextInfoProvider.getProductLaunchInfo().then( function( productLaunchInfo ) {
                let isOpenInHost = determineOpenInHost();
                let TempAppSessionLaunchPrefSet = results[ 1 ];
                let viewerCtxNamespace = determineViewerActiveNameSpace();
                let isViewerAvailable = undefined;
                let viewerContextData = undefined;

                if( viewerCtxNamespace ) {
                    viewerContextData = getViewerContextData();
                    isViewerAvailable = viewerContextData ? viewerContextData.getValueOnViewerAtomicData( 'isViewerRevealed' ) : undefined;
                }
                if( isReloadOperation ) {
                    return createLaunchInfoRequest.launchProduct( isOpenInHost, results[ 0 ], productLaunchInfo, isReloadOperation );
                }
                let occmgmtContext = appCtxSvc.getCtx( 'occmgmtContext' );
                let isTypeSessionOpened = occmgmtContext &&
                        occmgmtContext.openedElement &&
                        occmgmtContext.openedElement.modelType.typeHierarchyArray.indexOf( 'Fnd0AppSession' ) >= 0;

                if( !isViewerAvailable || !TempAppSessionLaunchPrefSet || isTypeSessionOpened ||
                        tcSessionData.getTCMajorVersion() < 13 || tcSessionData.getTCMajorVersion() === 13 && tcSessionData.getTCMinorVersion() < 1 ) {
                    createLaunchInfoRequest.launchProduct( isOpenInHost, results[ 0 ], productLaunchInfo, isReloadOperation );
                } else if( viewerContextData ) {
                    let atomicDataSubject = viewerContextData.getViewerAtomicDataSubject();
                    atomicDataSubject.notify( viewerContextSvc.VIEWER_SUB_PRODUCT_LAUNCH_EVENT, {
                        openInHost: isOpenInHost,
                        isTohostInVis: results[ 0 ],
                        viewerNamespace: viewerCtxNamespace,
                        TempAppSessionLaunchPref: TempAppSessionLaunchPrefSet,
                        productLaunchInfo: productLaunchInfo[ 0 ]
                    } );
                }
            } )
                .catch( function( failure ) {
                    logger.error( failure );
                    return AwPromiseService.instance.reject( failure );
                } );
        } );
};
/**
 * Checks if current object selection is made from ACE or outside ACE.
 *
 * @returns {Boolean} TRUE if we are currentlu in an ACE sublocation.
 */
var isInACE = function() {
    var subLocationNameToken = appCtxSvc.ctx.locationContext[ 'ActiveWorkspace:SubLocation' ];

    return subLocationNameToken === 'com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation';
};

/**
 * Checks if launchSelections or launchProducts depending upon isACE() result.
 *
 *  @returns {Boolean} TRUE if launchSelections or launchProducts depending upon isACE() result.
 */
var isToLaunchProduct = function() {
    var isToLaunchProduct = false;
    var selectedObjects = selectionSvc.getSelection().selected;

    if( isInACE() ) {
        let viewerContextData = getViewerContextData();
        if( viewerContextData ) {
            // Notify to save the autobookmark
            let atomicDataSubject = viewerContextData.getViewerAtomicDataSubject();
            atomicDataSubject.notify( viewerContextSvc.VIEWER_SUB_SAVE_VIS_AUTO_BOOKMARK, {} );
        }

        // Even when in Ace, You can select dataset by XRT
        if( !selectedObjects[ 0 ] || !commandsMapSvc.isInstanceOf( 'Dataset', selectedObjects[ 0 ].modelType ) ) {
            isToLaunchProduct = true;
        }
    }

    return isToLaunchProduct;
};

// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------

var exports = {};

/**
 * Trigger point for launching 'Open in Vis' feature. Acts upon selected object in context.
 */
export let executeOpenInVisCommand = function() {
    if( isToLaunchProduct() ) {
        launchProduct( false );
    } else {
        launchSelections( false );
    }
};

/**
 *  fetches VVI to send to TcVis after reload
 * @returns {Object} VVI file ticket to send to TcVis after reload operation
 */
export let downloadVVIFileTicketForHostReload = function() {
    if( isToLaunchProduct() ) {
        return launchProduct( true );
    }
    return launchSelections( true );
};

/**
 * Fetches VVI for product Snapshot
 *
 *  @params {Array|Object} data: selected object or command context
 */
export let launchProductSnapshotInVis = function( data ) {
    let arrayContext = _.isArray( data ) ? data : [ data ];
     determineHostInVis().then( function( isHostInVis ) {
        let isOpenInHost = determineOpenInHost();
        createLaunchInfoRequest.launchObject( isOpenInHost, isHostInVis, arrayContext );
    } );
};
export default exports = {
    executeOpenInVisCommand,
    launchProductSnapshotInVis,
    launchProduct,
    downloadVVIFileTicketForHostReload
};
