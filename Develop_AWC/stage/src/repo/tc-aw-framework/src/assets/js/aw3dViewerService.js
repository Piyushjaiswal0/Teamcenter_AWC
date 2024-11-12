// Copyright (c) 2022 Siemens

/**
 * @module js/aw3dViewerService
 */
import AwPromiseService from 'js/awPromiseService';
import viewerRenderService from 'js/viewerRender.service';
import viewerPreferenceService from 'js/viewerPreference.service';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import frameAdapterService from 'js/frameAdapter.service';
import '@swf/ClientViewer';
import localeSvc from 'js/localeService';
import messagingService from 'js/messagingService';

var exports = {};

/**
 * Viewer render service
 */

/**
 * Viewer div element
 */
var _lastViewerDivElement = null;

/**
 * Viewer view object
 */
var _lastViewerCtxObj = null;

/**
 * Viewer last product context info
 */
var _lastProductContextInfoObj = null;

const visLoggingStatusOnCtx = 'visLoggingInProgress';

/**
 * Check if same product being opened as previous
 *
 * @param {Object} productCtxInfo product context info object
 * @return {Boolean} True is same product is being opened
 */
export let isSameProductOpenedAsPrevious = function( productCtxInfo ) {
    return _lastProductContextInfoObj && _lastProductContextInfoObj.uid === productCtxInfo.uid && _lastViewerCtxObj && !_lastViewerCtxObj.isConnectionClosed();
};

/**
 * Check if same product being opened as previous
 * @param {Object} viewerAtomicData viewer atomic data
 * @return {Promise} A promise that return the viewer view and context object once resolved
 */
export let restorePreviousView = function( viewerAtomicData ) {
    var returnPromise = AwPromiseService.instance.defer();
    updateViewerPreferences( _lastViewerCtxObj, viewerAtomicData );
    _lastViewerCtxObj.setViewerAtomicData( viewerAtomicData );
    returnPromise.resolve( [ _lastViewerCtxObj, _lastViewerDivElement ] );
    exports.updateStructureViewerContextWithVisibility( _lastViewerCtxObj, true );
    return returnPromise.promise;
};

/**
 * update viewer preference after restore
 * @param {Object} lastViewerCtxObj last viewer context data object
 * @param {Object} viewerAtomicData viewer atomic data
 */
export let updateViewerPreferences = function( lastViewerCtxObj, viewerAtomicData ) {
    let lastViewerPref = lastViewerCtxObj.getValueOnViewerAtomicData( 'viewerPreference' );
    lastViewerCtxObj.setViewerAtomicData( viewerAtomicData );
    lastViewerCtxObj.updateViewerAtomicData( 'viewerPreference', lastViewerPref );
};

/**
 * Get viewer load input parameters
 *
 * @param {Object} productCtxInfo product context info object
 * @param {Number} viewerWidth desired viewer width
 * @param {Number} viewerHeight desired viewer height
 * @param {Function} securityMarkingHandlerFn security marking handler function
 * @return {Object} input load parameters
 */
export let getViewerLoadInputParameter = function( productCtxInfo, viewerWidth, viewerHeight, securityMarkingHandlerFn ) {
    var viewerLoadInputParams = viewerRenderService.getViewerLoadInputParameters();
    viewerLoadInputParams.setTargetObject( productCtxInfo );
    viewerLoadInputParams.setProductUids( [ productCtxInfo.uid ] );
    viewerLoadInputParams.setViewerContainer( document.createElement( 'div' ) );
    viewerLoadInputParams.setHeight( parseInt( viewerHeight ) );
    viewerLoadInputParams.setWidth( parseInt( viewerWidth ) );
    viewerLoadInputParams.setShowAll( true );
    // Additional info should be set to null to avoid creation of new
    // Tc Session everytime when leaf part loads.
    viewerLoadInputParams.setAdditionalInfo( null );
    viewerLoadInputParams.setSecurityMarkingHandler( securityMarkingHandlerFn );
    return viewerLoadInputParams;
};

/**
 * Get viewer load input parameters
 *
 * @param {Object} productCtxInfo product context info object
 * @param {Number} viewerWidth desired viewer width
 * @param {Number} viewerHeight desired viewer height
 * @param {Function} securityMarkingHandlerFn security marking handler function
 * @return {Object} input load parameters
 */
export let getViewerLoadInputParameterPromise = function( productCtxInfo, viewerWidth, viewerHeight, securityMarkingHandlerFn, modelObject ) {
    var returnPromise = AwPromiseService.instance.defer();
    var viewerLoadInputParams = viewerRenderService.getViewerLoadInputParameters();
    viewerLoadInputParams.setTargetObject( productCtxInfo );
    viewerLoadInputParams.setProductUids( [ productCtxInfo.uid ] );
    viewerLoadInputParams.setViewerContainer( document.createElement( 'div' ) );
    viewerLoadInputParams.setHeight( parseInt( viewerHeight ) );
    viewerLoadInputParams.setWidth( parseInt( viewerWidth ) );
    viewerLoadInputParams.setShowAll( true );
    viewerLoadInputParams.setTopElementOrSelectedModelObj( modelObject );
    // Additional info should be set to null to avoid creation of new
    // Tc Session everytime when leaf part loads.
    viewerLoadInputParams.setAdditionalInfo( null );
    viewerLoadInputParams.setSecurityMarkingHandler( securityMarkingHandlerFn );
    if( productCtxInfo.type === 'SnapShotViewData' ) {
        viewerLoadInputParams.setShowAll( false );
        viewerPreferenceService.getPVOpenConfiguration().then( function( pvOpenConfig ) {
            if( pvOpenConfig && pvOpenConfig === 'Static' ) {
                viewerLoadInputParams.setPVOpenConfig( 'Static' );
            } else {
                viewerLoadInputParams.setPVOpenConfig( 'Dynamic' );
            }
            returnPromise.resolve( viewerLoadInputParams );
        } ).catch( function( error ) {
            logger.error( 'Failed to get PV open configuration : ' + error );
            viewerLoadInputParams.setPVOpenConfig( 'Dynamic' );
            returnPromise.resolve( viewerLoadInputParams );
        } );
    } else {
        returnPromise.resolve( viewerLoadInputParams );
    }
    return returnPromise.promise;
};

/**
 * Clean up previous view
 */
export let cleanUpPreviousView = function() {
    if( _lastViewerCtxObj ) {
        _lastViewerCtxObj.close();
        //Reinitialize last product context info and viewer context object to null since viewer associated no longer exists.
        _lastViewerCtxObj = null;
        _lastProductContextInfoObj = null;
    }
};

/**
 * Get viewer view
 *
 * @param {Object} viewerLoadInputParams desired viewer height
 * @param {Boolean} isViewerReload is viewer being reload
 * @return {Promise} A promise that return the viewer view and context object once resolved
 */
export let getViewerView = function( viewerLoadInputParams ) {
    var returnPromise = AwPromiseService.instance.defer();
    var productCtxInfo = viewerLoadInputParams.getTargetObject();
    var viewerloadPromise = viewerRenderService.loadByModelObjectInputParam( viewerLoadInputParams );
    viewerloadPromise.then( function( viewerData ) {
        _lastProductContextInfoObj = productCtxInfo;
        _lastViewerCtxObj = viewerData;
        _lastViewerDivElement = viewerLoadInputParams.getViewerContainer();
        returnPromise.resolve( [ viewerData, viewerLoadInputParams.getViewerContainer() ] );
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );

    return returnPromise.promise;
};

/**
 * Set viewer visibility in viewer application context
 *
 * @param {ViewerContextData} viewerCtxData viewer context data
 * @param {Boolean} isViewerVisible true if viewer is visible
 */
export let updateStructureViewerContextWithVisibility = function( viewerCtxData, isViewerVisible ) {
    viewerRenderService.updateViewerContextWithVisibility( viewerCtxData, isViewerVisible );
};

/**
 * Set viewer visibility in viewer application context
 *
 * @param {String} viewerCtxData viewer context data
 * @param {Boolean} isViewerVisible true if viewer is visible
 */
export let updateStructureViewerVisibility = function( viewerCtxData, isViewerVisible ) {
    viewerRenderService.updateViewerVisibility( viewerCtxData, isViewerVisible );
};

/**
 * Get default viewer namespace
 *@returns {String} Default viewer namespace
 */
export let getDefaultViewerCtxNamespace = function() {
    return viewerRenderService.getDefaultViewerNamespace();
};

/**
 * Start viewer logging
 */
export let startVisLogging = function() {
    appCtxSvc.updateCtx( visLoggingStatusOnCtx, true );
    let cfgParam = {
        visURL: frameAdapterService.getConnectionUrl(),
        setLogging: true
    };
    window.JSCom.EMM.EMMOpsRemoteVis.setVisServerLogging( cfgParam ).catch( errorMsg => {
        logger.error( 'Vis logging start error : ' + errorMsg );
    } );
    return true;
};

/**
 * Init viewer logging
 * @returns {Object} visLogStatus vis logging status
 */
export let initVisLogging = function() {
    let visLogStatus = appCtxSvc.getCtx( visLoggingStatusOnCtx );
    if( _.isNull( visLogStatus ) || _.isUndefined( visLogStatus ) ) {
        appCtxSvc.registerCtx( visLoggingStatusOnCtx, false );
        visLogStatus = false;
    }
    return visLogStatus;
};

/**
 * Stop viewer logging
 */
export let stopVisLogging = function() {
    appCtxSvc.updateCtx( visLoggingStatusOnCtx, false );
    let cfgParam = {
        visURL: frameAdapterService.getConnectionUrl(),
        setLogging: false
    };
    window.JSCom.EMM.EMMOpsRemoteVis.setVisServerLogging( cfgParam ).then( () => {
        const localTextBundle = localeSvc.getLoadedText( 'Awv0threeDViewerMessages' );
        const buttons = [ {
            addClass: 'btn btn-notify',
            text: localTextBundle.OK,
            onClick: function( $noty ) {
                $noty.close();
            }
        } ];
        messagingService.showWarning( localTextBundle.visLogsGenerationSuccess, buttons );
    } ).catch( errorMsg => {
        logger.info( 'Vis logging stop error : ' + errorMsg );
    } );
    return false;
};

/**
 * Subscribe for primary design representation change event to force reload viewer
 */
eventBus.subscribe( 'cadbomalignment.primaryDesignRepresentationChanged', function() {
    _lastProductContextInfoObj = null;
}, 'aw3dViewerService' );

export default exports = {
    isSameProductOpenedAsPrevious,
    restorePreviousView,
    getViewerLoadInputParameter,
    getViewerLoadInputParameterPromise,
    cleanUpPreviousView,
    getViewerView,
    updateStructureViewerContextWithVisibility,
    updateStructureViewerVisibility,
    getDefaultViewerCtxNamespace,
    startVisLogging,
    stopVisLogging,
    initVisLogging
};
