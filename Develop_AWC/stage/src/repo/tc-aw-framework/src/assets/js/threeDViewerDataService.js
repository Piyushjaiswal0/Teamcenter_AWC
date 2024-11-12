// Copyright (c) 2022 Siemens

/**
 * This module holds threeD viewer data
 *
 * @module js/threeDViewerDataService
 */
import appCtxSvc from 'js/appCtxService';
import aw3dViewerService from 'js/aw3dViewerService';
import awPromiseService from 'js/awPromiseService';
import logger from 'js/logger';
import ThreeDViewerData from 'js/threeDViewerData';
import awIconService from 'js/awIconService';
import viewerGraphicsSupportService from 'js/viewerGraphicsSupportService';
import _ from 'lodash';

var exports = {};

/**
 * sets threeD viewer configuration
 * @param {Object} viewerAtomicData viewer atomic data
 * @param {Object} renderLocation render location
 */
export let setThreeDViewerConfiguration = function( viewerAtomicData, renderLocation ) {
    const newViewerAtomicData = { ...viewerAtomicData.getValue() };
    _.set( newViewerAtomicData, 'viewerCtxNamespace', aw3dViewerService.getDefaultViewerCtxNamespace() );
    _.set( newViewerAtomicData, 'renderLocation', renderLocation );
    viewerAtomicData.update( newViewerAtomicData );
};

/**
 * Set thumbnail url
 * @param {Object}  subPanelContext  Sub panel context
 * @returns {String} thumbnail url
 */
export let setThumbnailUrl = function( subPanelContext ) {
    let selectedMO = appCtxSvc.getCtx( 'mselected' );
    if( Array.isArray( selectedMO ) && selectedMO.length > 0 ) {
        return awIconService.getThumbnailFileUrl( selectedMO[ 0 ] );
    } else if( subPanelContext && subPanelContext.datasetData ) {
        return awIconService.getThumbnailFileUrl( subPanelContext.datasetData );
    }
    return awIconService.getThumbnailFileUrl( subPanelContext );
};

/**
 * Initialize 3D viewer.
 * @param {Object} data Data from viewmodel
 * @param {Object} subPanelContext Sub panel context
 * @param {Object} viewerAtomicData Viewer Atomic data
 * @param {Boolean} force3DViewerReload boolean indicating if 3D should be reloaded forcefully
 *
 * @returns {Promise} A promise that is resolved with threeDInstance
 */
export let initialize3DViewer = function( data, subPanelContext, viewerAtomicData, force3DViewerReload ) {
    let viewerContainerDivEle = null;
    if( data && data.viewContainerProp && data.viewContainerProp.viewerContainerDiv ) {
        viewerContainerDivEle = data.viewContainerProp.viewerContainerDiv;
    } else {
        throw 'The viewer container div can not be null';
    }
    let threeDViewerInstance = null;
    if( data.threeDInstance && data.threeDInstance instanceof ThreeDViewerData ) {
        threeDViewerInstance = data.threeDInstance;
        let deferred = awPromiseService.instance.defer();
        threeDViewerInstance.reload3DViewer().then( () => {
            deferred.resolve( threeDViewerInstance );
        } ).catch( ( error ) => {
            logger.error( error );
            deferred.resolve( threeDViewerInstance );
        } );
        return deferred.promise;
    }
    threeDViewerInstance = new ThreeDViewerData( viewerContainerDivEle );
    return threeDViewerInstance.initialize3DViewer( subPanelContext, viewerAtomicData, force3DViewerReload );
};

/**
 * Reload 3D viewer.
 * @param {Object} threeDInstance Data from viewmodel
 * @param {Object} subPanelContext Sub panel context
 */
export let reload3DViewer = function( threeDInstance, subPanelContext, viewerAtomicData ) {
    if( threeDInstance && typeof threeDInstance.reload3DViewer === 'function' ) {
        threeDInstance.reload3DViewer( subPanelContext, viewerAtomicData );
    }
};

/**
 * Resize 3D viewer
 * @param {Object} threeDInstance Data from viewmodel
 */
export let set3DViewerSize = function( threeDInstance ) {
    if( threeDInstance && typeof threeDInstance.set3DViewerSize === 'function' ) {
        threeDInstance.set3DViewerSize();
    }
};


/**
 * Reset parameters for 3D reload
 * @param {Boolean} isLoading - boolen indicating if 3D viewer loading is in progress
 * @returns {Array} - Array with reset parameters
 */
export let resetParametersFor3DReload = function() {
    return [ {
        displayImageCapture: false,
        loadingViewer: true,
        showViewerEmmProgress: true,
        showViewerProgress: false
    } ];
};

/**
 * Set viewer loading status
 * @param {Boolean} isLoading boolen indicating if viewer is loading
 * @returns {Boolean} boolean indicating if viewer is loading
 */
export let setViewerLoadingStatus = function( isLoading ) {
    return isLoading;
};


/**
 * Show viewer emm progress
 * @param {Boolean} isShow boolen indicating is emm progress indicator should be shown
 * @returns {Boolean} boolean indicating if emm progress indicator should be shown
 */
export let showViewerEmmProgress = function( isShow ) {
    return isShow;
};

/**
 * Show viewer progress
 * @param {Boolean} isShow boolen indicating is viewer progress indicator should be shown
 * @returns {Boolean} boolean indicating if viewer progress indicator should be shown
 */
export let showViewerProgress = function( isShow ) {
    return isShow;
};

/**
 * cleanup 3D view
 * @param {Object} viewerInstance threeD viewer instance
 */
export let cleanup3DViewer = function( viewerInstance ) {
    if( viewerInstance && typeof viewerInstance.ctrlCleanup === 'function' ) {
        viewerInstance.ctrlCleanup();
    }
};

/**
 * 3D viewer component mounted
 * @param {Object} elementRefList element ref list
 * @param {Object} prop container prop
 */
export let threeDViewerComponentMounted = function( elementRefList, viewerContainerProp ) {
    const newViewerContainerProp = { ...viewerContainerProp.getValue() };
    newViewerContainerProp.viewerContainerDiv = elementRefList.get( 'awthreeDViewer' ).current;
    viewerContainerProp.update( newViewerContainerProp );
};

/**
 * 3D viewer component rendered
 * @param {Object} elementRefList element ref
 * @returns {Object} the vdom object
 */
export let threeDViewerComponentRendered = function( { elementRefList } ) {
    return <div ref={elementRefList.get( 'awthreeDViewer' )}></div>;
};

/**
 * Gets supported Render location for loading viewer
 * @param {Object} subPanelContext sub panel context
 * @param {Object} viewerAtomicData viewer atomic data
 * @returns {Promise} promise which resolve with render location
 */
export let getSupportedRenderLocationFor3D = ( subPanelContext, viewerAtomicData )=>{
    return ThreeDViewerData.getSelectedModelObject( subPanelContext ).then( ( selectedObj )=>{
        return viewerGraphicsSupportService.getSupportedRenderLocation( selectedObj,
            aw3dViewerService.isSameProductOpenedAsPrevious( selectedObj ) )
            .then( ( renderLocation )=>{
                if( renderLocation === 'unSupported' || renderLocation === 'viewerNotConfigured' ) {
                    stopViewerProgressIndicator( viewerAtomicData );
                }
                return renderLocation;
            } );
    } );
};

/**
 * update view model data with renderLocation to SSR
 * @returns {String} renderLocation value
 */
export let updateRenderLocationToSSR = ()=>{
    return 'SSR';
};

/**
 * Stops viewer progress indicator
 * @param {Object} viewerAtomicData viewer atomic data
 */
export let stopViewerProgressIndicator = ( viewerAtomicData )=>{
    const newViewerAtomicData = { ...viewerAtomicData.getValue() };
    _.set( newViewerAtomicData, 'showViewerProgress', false );
    _.set( newViewerAtomicData, 'showViewerEmmProgress', false );
    _.set( newViewerAtomicData, 'loadingViewer', false );
    viewerAtomicData.update( newViewerAtomicData );
};

export default exports = {
    setThreeDViewerConfiguration,
    setThumbnailUrl,
    initialize3DViewer,
    reload3DViewer,
    set3DViewerSize,
    resetParametersFor3DReload,
    setViewerLoadingStatus,
    showViewerEmmProgress,
    showViewerProgress,
    cleanup3DViewer,
    threeDViewerComponentMounted,
    threeDViewerComponentRendered,
    getSupportedRenderLocationFor3D,
    updateRenderLocationToSSR,
    stopViewerProgressIndicator
};
