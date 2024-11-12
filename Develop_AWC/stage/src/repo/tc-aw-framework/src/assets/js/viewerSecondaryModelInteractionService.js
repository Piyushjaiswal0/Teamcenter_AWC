// Copyright (c) 2022 Siemens

/**
 * Defines {@link NgServices.viewerSecondaryModelInteractionService} which provides utility functions for viewer
 *
 * @module js/viewerSecondaryModelInteractionService
 */
import '@swf/ClientViewer';
// import 'manipulator';

var _viewerCtxSvc = null;

/**
 * Set the viewer context service
 *
 * @param {Object} viewerCtxSvc - viewer context service instance
 */
export let setViewerContextService = function( viewerCtxSvc ) {
    _viewerCtxSvc = viewerCtxSvc;
};

/**
 * Set measurement in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} measurementMode - measurement type
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 *
 * @return {Promise} A promise resolved once viewer measurement mode has started
 */
export let startViewerMeasurement = function( viewerContextNamespace, measurementMode, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getMeasurementManager().startViewerMeasurement( measurementMode );
    deferred.resolve();
};

/**
 * Set measurement in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 *
 * @return {Promise} A promise resolved once viewer measurement mode has started
 */
export let closeViewerMeasurement = function( viewerContextNamespace, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getMeasurementManager().closeViewerMeasurement();
    deferred.resolve();
};

/**
 * Set measurement in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} measurementMode - measurement type
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 *
 * @return {Promise} A promise resolved once viewer measurement mode has started
 */
export let setMeasurementPickMode = function( viewerContextNamespace, measurementMode, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getMeasurementManager().setMeasurementPickMode( measurementMode );
    deferred.resolve();
};

/**
 * Set measurement in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 *
 * @return {Promise} A promise resolved once viewer measurement mode has started
 */
export let deleteSelectedMeasurement = function( viewerContextNamespace, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getMeasurementManager().deleteSelectedMeasurement();
    deferred.resolve();
};

/**
 * Set measurement in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 *
 * @return {Promise} A promise resolved once viewer measurement mode has started
 */
export let deleteAllMeasurement = function( viewerContextNamespace, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getMeasurementManager().deleteAllMeasurements();
    deferred.resolve();
};

/**
 * Remove all annotations from view
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred - promise from calling function to be resolved.
 *
 * @return {Promise} A promise resolved once markups have been removed
 */
export let removeAllAnnotationLayerInfo = function( viewerContextNamespace, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.get3DMarkupManager().removeAllAnnotationLayer()
        .then( function() {
            deferred.resolve();
        } )
        .catch( function( err ) {
            deferred.reject( err );
        } );
};

/**
 * Add annotation to view
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param { String } jsonData - annotation string
 * @param { Number } vpHeight - The height of the viewport or canvas at the time the jsonData was created
 * @param { Number } vpWidth - The width of the viewport or canvas at the time the jsonData was created
 * @param {Promise} deferred - promise from calling function to be resolved.
 *
 * @return {Promise} A promise resolved once markups have been added
 */
export let addAnnotationLayerInfo = function( viewerContextNamespace, jsonData, vpHeight, vpWidth, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.get3DMarkupManager().addAnnotationLayer( jsonData, vpHeight, vpWidth )
        .then( function( flatBuffer ) {
            deferred.resolve( flatBuffer );
        } )
        .catch( function( err ) {
            deferred.reject( err );
        } );
};

/**
 * Set quick measurement mode in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 *
 * @return {Promise} A promise resolved once viewer measurement mode has started
 */
export let startViewerQuickMeasurement = function( viewerContextNamespace, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getMeasurementManager().startViewerQuickMeasurement();
    deferred.resolve();
};

/**
 * Set quick measurement mode in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 *
 * @return {Promise} A promise resolved once quick measurement mode is set in viewer
 */
export let setQuickMeasurementPickMode = function( viewerContextNamespace, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getMeasurementManager().setQuickMeasurementPickMode();
    deferred.resolve();
};

/**
 * Close quick measurement mode in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 *
 * @return {Promise} A promise resolved once viewer measurement mode has closed
 */
export let closeViewerQuickMeasurement = function( viewerContextNamespace, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getMeasurementManager().closeViewerMeasurement();
    deferred.resolve();
};

/**
 * fetch measurements
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @return {Promise} promise
 */
export let getAllMeasurements = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getMeasurementManager().getAllMeasurements();
};

/**
 * Sets pick filter selection state to subcommand toolbar from session storage
 * @param {String} viewerContextNamespace viewer context namespace
 */
export let setPickFilterSelectionStateInSubCommandToolBar = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getMeasurementManager().setPickFilterSelectionStateInSubCommandToolBar( viewerContextNamespace );
};

/**
 * Stores pick filter selection state of subcommand toolbar to session storage
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Object} subToolBarCommandState Measurement subToolBarCommandState
 */
export let setMeasurementCommandDataToSessionStorage = function( viewerContextNamespace, subToolBarCommandState ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getMeasurementManager().setMeasurementCommandDataToSessionStorage( viewerContextNamespace, subToolBarCommandState );
};

/**
 * Request model view data
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 */
export let requestModelViewsData = function( viewerContextNamespace, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getModelViewManager().requestModelViewsData( deferred );
};

/**
 * Request pmi elements data
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 *
 */
export let requestPmiElementsData = function( viewerContextNamespace, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getPmiManager().requestPmiElementsData( deferred );
};

/**
 * request pmi elements Data ByParts
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String[]} parts - occ csids for parts
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 *
 */
export let requestPmiElementsDataByParts = function( viewerContextNamespace, occIds, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getPmiManager().requestPmiElementsDataByParts( occIds, deferred );
};

/**
 * request Model Views Data ByParts
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String[]} occIds - occ csids for parts
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 *
 */
export let requestModelViewsDataByParts = function( viewerContextNamespace, occIds, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getModelViewManager().requestModelViewsDataByParts( occIds, deferred );
};

/**
 * requests elements data for given model view
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} modelViewId - model view id
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 *
 */
export let requestModelViewElementsData = function( viewerContextNamespace, modelViewId, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getModelViewManager().requestModelViewElementsData( modelViewId, deferred );
};

/**
 * Sets model view visibility
 *
 * @param {String} viewerContextNamespace registered viewer context name space
 * @param {String} modelViewId id for model view
 * @param {Boolean} isChecked true/false
 * @param {promise} deferred that resolves to application of model view
 */
export let setModelViewVisibility = function( viewerContextNamespace, modelViewId, isChecked, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getModelViewManager().setModelViewVisibility( modelViewId, isChecked, deferred );
};

/**
 * Re orients the pmis in the viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 *
 */
export let reorientText = function( viewerContextNamespace, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getPmiManager().reorientText( deferred );
};

/**
 * Sets pmi elements selected/visible property
 *
 * @param {String} viewerContextNamespace registered viewer context name space
 * @param {Boolean} perOccurrence true/false
 * @param {String[]} elementIds ids
 * @param {Boolean[]} isChecked new state array
 * @param {String[]} types state names
 * @param {Promise} deferred promise that resolves to application of property
 */
export let setPmiElementProperty = function( viewerContextNamespace, perOccurrence, elementIds, isChecked,
    types, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getPmiManager().setPmiElementProperty( perOccurrence, elementIds, isChecked, types,
        deferred );
};

/**
 * execute proximity search
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @param {Object} promise promise that resolves on search complete
 */
export let executeProximitySearch = function( viewerContextNamespace, promise ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getProximityManager().executeProximitySearch( promise );
};

/**
 * Execute proximity search
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @param {Object} promise promise that resolves on search complete
 * @param {Number} distance the distance
 */
export let executeProximitySearchInDistance = function( viewerContextNamespace, promise, distance ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getProximityManager().executeProximitySearchInDistance( promise, distance );
};

/**
 * execute Volume search
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @param {Object} promise promise that resolves on search complete
 * @param {Object} cVs corner values object
 */
export let executeVolumeSearch = function( viewerContextNamespace, promise, cVs ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getVolumeManager().executeVolumeSearch( promise, cVs );
};

/**
 * Gets corner values based on target occurrences
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @param {Object} promise promise that resolves to corner values
 */
export let getCornerValuesFromOccListInCtx = function( viewerContextNamespace, promise ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getVolumeManager().getCornerValuesFromOccListInCtx( promise );
};

/**
 * Sets new state of Volume box
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @param {Object} promise promise that resolves to corner values
 * @param {Boolean} state On/Off
 */
export let setVolumeFilterOnNative = function( viewerContextNamespace, promise, isOn ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getVolumeManager().setVolumeFilterOnNative( promise, isOn );
};

/**
 * Sets new state of Volume box
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @param {Object} cornerVals corner values in form of coordinates
 * @param {Object} promise promise that resolves to draw volume box
 *
 */
export let drawVolumeBox = function( viewerContextNamespace, cornerVals, promise ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getVolumeManager().drawVolumeBox( cornerVals, promise );
};

/**
 * To create image capture in viewer.
 *
 * @param {String} contextObjectUid - object uid
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} captureName - name of the image capture
 * @param {Object} promise - Promise object provided to be resolved once operation is done.
 * @param {String} captureDesc - description of the image capture
 * @return {Promise} A promise resolved once section is create in viewer in given plane
 */
export let createImageCapture = function( contextObjectUid, viewerCtxNameSpace, captureName, promise, captureDesc ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerCtxNameSpace );
    viewerCtx.getImageCaptureManager().captureImage( contextObjectUid, viewerCtxNameSpace, captureName,
        captureDesc, promise );
};

/**
 * To display image capture in viewer.
 *
 * @param {String} viewerCtxNameSpace - registered viewer context name space
 * @param {String} resultUrl - ticket
 * @param {Object} lastActiveCaptureObj - last selected captured object
 * @param {Boolean} selected -  Indicate whether it is selected or deselected
 */
export let displayImageCapture = function( viewerCtxNameSpace, resultUrl, lastActiveCaptureObj, selected ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerCtxNameSpace );
    viewerCtx.getImageCaptureManager().displayImageCapture( viewerCtxNameSpace, resultUrl,
        lastActiveCaptureObj, selected );
};

/**
 * To deactivate the selected capture in viewer
 *
 * @param {String} viewerCtxNameSpace - registered viewer context name space
 * @param {Object} lastActiveCaptureObj - last selected captured object
 * @return {Promise} A promise resolved once section is create in viewer in given plane
 */
export let deactivateCapturedObject = function( viewerCtxNameSpace, lastActiveCaptureObj, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerCtxNameSpace );
    viewerCtx.getImageCaptureManager().deactivateCapturedObject( viewerCtxNameSpace,
        lastActiveCaptureObj, deferred );
};

/**
 * To deactivate the selected capture in viewer
 *
 * @param {String} viewerCtxNameSpace - registered viewer context name space
 */
export let closeImageCaptureView = function( viewerCtxNameSpace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerCtxNameSpace );
    viewerCtx.getImageCaptureManager().closeImageCaptureView( viewerCtxNameSpace );
};

/**
 * Create viewer section
 *
 * @param {String} viewerCtxNamespace - registered viewer context name space
 * @param {Promise} deferred A promise resolved once section is create in viewer in given plane
 * @param {String} planeId plane id to create section
 */
export let createViewerSection = function( viewerCtxNamespace, deferred, planeId ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerCtxNamespace );
    viewerCtx.getSectionManager().createViewerSection( viewerCtxNamespace, planeId, deferred );
};

export let enterSectionCreationModeUsingEntities = function( viewerCtxNameSpace, sectionCreatorOptions, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerCtxNameSpace );
    viewerCtx.getSectionManager().enterSectionCreationModeUsingEntities( sectionCreatorOptions );
    deferred.resolve();
};

export let setSectionModeEnabled = function( viewerCtxNameSpace, isEnabled, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerCtxNameSpace );
    viewerCtx.getSectionManager().setSectionModeEnabled( isEnabled );
    deferred.resolve();
};

/**
 * This api sets show caps and cut lines in viewer
 *
 * @function setShowCapsAndCutLines
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred A promise resolved once section is create in viewer in given plane
 * @param {String} isShowCapsAndLines true if section is to be selected
 */
export let setShowCapsAndCutLines = function( viewerContextNamespace, deferred, isShowCapsAndLines ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSectionManager().setShowCapsAndCutLines( viewerContextNamespace, isShowCapsAndLines, deferred );
};

/**
 * This api used to initialize viewer context
 *
 * @function initializeSectionsFromContext
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred A promise resolved once context is initialized
 */
export let initializeSectionsFromContext = function( viewerContextNamespace, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSectionManager().initializeSectionsFromContext( viewerContextNamespace, deferred );
};

/**
 * Create and send request for selecting a section in viewer
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @param {Promise} promise promise object
 * @param {Number} sectionId section id
 * @param {Boolean} isSelected is selected
 */
export let setSectionSelection = function( viewerContextNamespace, promise, sectionId, isSelected ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSectionManager().setSectionSelection( viewerContextNamespace, promise, sectionId, isSelected );
};

/**
 * Create and send request for selecting a section in viewer
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @param {Promise} promise promise object
 * @param {Number} sectionId section id
 */
export let toggleSectionVisibility = function( viewerContextNamespace, promise, sectionId ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSectionManager().toggleSectionVisibility( viewerContextNamespace, promise, sectionId );
};

/**
 * Modify section
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @param {Promise} promise promise object
 * @param {Number} sectionId section id
 * @param {Number} newNormal new normal value
 */
export let modifySection = function( viewerContextNamespace, promise, sectionId, newNormal ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSectionManager().modifySection( viewerContextNamespace, promise, sectionId, newNormal );
};

/**
 * Set section offset value
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @param {Promise} promise promise object
 * @param {Number} sectionId section id
 * @param {Number} newValue new value
 */
export let setSectionOffsetValue = function( viewerContextNamespace, promise, sectionId, newValue ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSectionManager().setSectionOffsetValue( viewerContextNamespace, promise, sectionId, newValue );
};

/**
 * Set section offset value
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @param {Promise} promise promise object
 * @param {Number} sectionId section id
 * @param {Number} offsetValue new offset value
 */
export let moveSection = function( viewerContextNamespace, promise, sectionId, offsetValue ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSectionManager().moveSection( viewerContextNamespace, promise, sectionId, offsetValue );
};

/**
 * Delete section
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @param {Promise} promise object
 * @param {Number} sectionId section id
 */
export let deleteSection = function( viewerContextNamespace, promise, sectionId ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSectionManager().deleteSection( viewerContextNamespace, promise, sectionId );
};

/**
 * Delete all section
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @param {Promise} promise promise object
 */
export let deleteAllSections = function( viewerContextNamespace, promise ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSectionManager().deleteAllSections( viewerContextNamespace, promise );
};

/**
 * create session snapshot
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @return {Promise} promise
 */
export let createSnapshot = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getSnapshotManager().createSnapshot();
};

/**
 * Updates Teamcenter Product Snapshot with TcVis session data
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @param {String} snapshotUID - UID of the Product Snapshot created in Teamcenter
 * @return {Promise} promise
 */
export let updateProductSnapshot = function( viewerContextNamespace, snapshotUID ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getSessionMgr().updateProductSnapshot( snapshotUID );
};

/**
 * fetch snapshots
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @return {Promise} promise
 */
export let getAllSnapshots = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getSnapshotManager().getAllSnapshots();
};

/**
 * delete all snapshots
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @return {Promise} promise
 */
export let deleteAllSnapshots = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getSnapshotManager().deleteAllSnapshots();
};

/**
 * Retrieves whether or not moving frame culling should use size culling
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @return {Promise} promise
 */
export let getMovingFrameCullingUseSizeCulling = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getPerformanceManager().getMovingFrameCullingUseSizeCulling();
};

/**
 * Retrieves whether or not moving frame culling is enabled
 *
 * @param {String} viewerContextNamespace viewer context namespace
 *
 */
export let getMovingFrameScreenSizeCullingEnabled = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getPerformanceManager().getMovingFrameScreenSizeCullingEnabled();
};

/**
 * Returns the threshold used to decide when an object is culled in case of moving frame
 *
 * @param {String} viewerContextNamespace viewer context namespace
 *
 */
export let getMovingFrameScreenSizeCullingObjectThreshold = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getPerformanceManager().getMovingFrameScreenSizeCullingObjectThreshold();
};

/**
 * Retrieves whether or not still frame culling is enabled
 *
 * @param {String} viewerContextNamespace viewer context namespace
 *
 */
export let getStillFrameScreenSizeCullingEnabled = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getPerformanceManager().getStillFrameScreenSizeCullingEnabled();
};

/**
 * Returns the threshold used to decide when an object is culled in case of still frame
 *
 * @param {String} viewerContextNamespace viewer context namespace
 *
 */
export let getStillFrameScreenSizeCullingObjectThreshold = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getPerformanceManager().getStillFrameScreenSizeCullingObjectThreshold();
};

/**
 * Sets whether or not moving frame culling should use size culling
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @param {Boolean} enable - True if moving frame culling should use size culling, false otherwise
 *
 */
export let setMovingFrameCullingUseSizeCulling = function( viewerContextNamespace, enable ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getPerformanceManager().setMovingFrameCullingUseSizeCulling( enable );
};

/**
 * Enables or disables moving frame culling
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @param {Boolean} enable - True if moving frame culling should use size culling, false otherwise
 *
 */
export let setMovingFrameScreenSizeCullingEnabled = function( viewerContextNamespace, enable ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getPerformanceManager().setMovingFrameScreenSizeCullingEnabled( enable );
};

/**
 * Sets threshold which is used to decide when to cull an object in case of moving frame
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @param {Number} newHeightInPercent - The height of the screen size culling object relative to the screen height Value between 0-1
 *
 */
export let setMovingFrameScreenSizeCullingObjectThreshold = function( viewerContextNamespace, newHeightInPercent ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getPerformanceManager().setMovingFrameScreenSizeCullingObjectThreshold( newHeightInPercent );
};

/**
 * Enables or disables still frame culling
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @param {Boolean} enable - True if moving frame culling should use size culling, false otherwise
 *
 */
export let setStillFrameScreenSizeCullingEnabled = function( viewerContextNamespace, enable ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getPerformanceManager().setStillFrameScreenSizeCullingEnabled( enable );
};

/**
 * Sets threshold which is used to decide when to cull an object in case of still frames
 *
 * @param {String} viewerContextNamespace viewer context namespace
 * @param {Number} newHeightInPercent - The height of the screen size culling object relative to the screen height Value between 0-1
 *
 */
export let setStillFrameScreenSizeCullingObjectThreshold = function( viewerContextNamespace, newHeightInPercent ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getPerformanceManager().setStillFrameScreenSizeCullingObjectThreshold( newHeightInPercent );
};

/**
 * Add the model view dataset
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 * @param {Object} modelViewOwner An array of Occurence
 * @param {String} modelViewDatasetUID
 * @param {String} mappingObjectUID   Optional
 * @param {String} mappingPropName    Optional
 * @param {Promise} deferred A promise resolved once model view dataset added
 */
export let addModelViewDataset = function( viewerContextNamespace, modelViewOwner, modelViewDatasetUID, mappingObjectUID, mappingPropName, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getModelViewManager().addModelViewDataset( modelViewOwner, modelViewDatasetUID, mappingObjectUID, mappingPropName, deferred );
};

/**
 * Gets the model view on the root or on the Occurrences passed in.
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 * @param {Object} occList An array of Occurence
 * @param {Promise} deferred A promise resolved with model view on root or on the occurrences passed in
 */
export let getModelViews = function( viewerContextNamespace, occList, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getModelViewManager().getModelViews( occList, deferred );
};

/**
 * Applies the model view
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 * @param {Object} modelViewOwner An array of Occurence
 * @param {String} modelViewCADID
 * @param {Object} scopeVisibilitySet An array of Occurence
 * @param {Promise} deferred A promise resolved once model view is applied
 */
export let invoke = function( viewerContextNamespace, modelViewOwner, modelViewCADID, scopeVisibilitySet, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getModelViewManager().invoke( modelViewOwner, modelViewCADID, scopeVisibilitySet, deferred );
};

/**
 * Applies the model view proxy
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 * @param {String} mvProxyUid - Model View Proxy uid
 * @param {Promise} deferred A promise resolved once model view is applied
 */
export let invokeModelViewProxy = function( viewerContextNamespace, mvProxyUid, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getModelViewManager().invokeModelViewProxy( mvProxyUid, deferred );
};

/**
 * Applies the state stored in the dataset to the 3D view
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 * @param {String} datasetUID UID of image capture dataset for which state needs to be applied
 * @param {Promise} deferred A promise resolved once model view is applied
 */
export let applyScreenshotState = function( viewerContextNamespace, datasetUID, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getImageCaptureManager().applyScreenshotState( datasetUID, deferred );
};

/**
 * Sets model view visibility for occurances provided as input
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 * @param {Array} occIds Occurances ID list
 * @param {String} modelViewId id for model view
 * @param {Boolean} isChecked true/false
 * @param {Promise} deferred A promise resolved once model view is applied
 *
 */
export let setModelViewVisibilityForOccurance = function( viewerContextNamespace, occIds, modelViewId, isChecked, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getModelViewManager().setModelViewVisibilityForOccurance( occIds, modelViewId, isChecked, deferred );
};

/**
 * Generates a 2D captured image of the currently active 3D View. It uploads the 2D image as a dataset to Teamcenter,
 * attaching it to the object defined in the input or the NewStuff folder.
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 * @param {String} viewerCtxNameSpace - registered viewer context name space         *
 * @param {String} attachToObjectUID Teamcenter object to attached the 2D dataset to. Could be empty, in which case user's NewStuff folder will be used
 * @param {String} screenshotName name for screenshot
 * @param {String} screenshotDescription description for screenshot
 * @param {JSCom.Consts.ImageType} type enumeration specifying the type of image to generate.
 * @param {Number} xSize width of the image
 * @param {Number} ySize height of the image
 * @param {Number} DPI definition (dots per inch)
 * @param {Promise} deferred A promise resolved once model view is applied
 *
 */
export let saveScreenshot = function( viewerContextNamespace, attachToObjectUID, screenshotName, screenshotDescription, type, xSize, ySize, DPI, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getImageCaptureManager().saveScreenshot( attachToObjectUID, screenshotName, screenshotDescription, type, xSize, ySize, DPI, deferred );
};

/**
 * This api updates the edit section in viewer context
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {sectionId} sectionId Section id to be processed
 * @param {Object} deferred promise object
 */
export let updateEditSectionIdToViewerContext = function( viewerContextNamespace, sectionId, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSectionManager().updateEditSectionIdToViewerContext( sectionId, deferred );
};

/**
 * This api get the section data for given section id
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {sectionId} sectionId Section id to be processed
 * @returns {Object}  Edit section data object
 */
export let getSectionDataById = function( viewerContextNamespace, sectionId ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getSectionManager().getSectionDataById( sectionId );
};

/**
 * This api gets the edit section id
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Object} deferred promise object
 */
export let getEditSectionId = function( viewerContextNamespace, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSectionManager().getEditSectionId( deferred );
};

/**
 * This api clears the edit section id in viewer context
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Object} deferred promise object
 */
export let clearEditSectionId = function( viewerContextNamespace, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSectionManager().clearEditSectionId( deferred );
};

/**
 * Update section Clip State
 *
 * @param {String} viewerContextNamespace viewerContextNamespace
 * @param {String} sectionId section's ID
 * @param {String} clipState new Clip State
 * @param {Object} deferred promise object
 */
export let updateClipState = function( viewerContextNamespace, sectionId, clipState, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSectionManager().updateClipState( sectionId, clipState, deferred );
};

/**
 * This api sets whether capping for cross sections should be drawn
 *
 * @function setCapping
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred A promise resolved when the operation is completed
 * @param {String} setCapping true if capping will be enabled for cross sections
 */
export let setCapping = function( viewerContextNamespace, deferred, setCapping ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSectionManager().setCapping( viewerContextNamespace, setCapping, deferred );
};

/**
 * This api sets whether cut lines for the new cross sections should be drawn
 *
 * @function setGlobalCutLines
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred A promise resolved when the operation is completed
 * @param {String} setGlobalCutLines true if cut lines will be enabled for the new cross sections
 */
export let setGlobalCutLines = function( viewerContextNamespace, deferred, setGlobalCutLines ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSectionManager().setGlobalCutLines( viewerContextNamespace, setGlobalCutLines, deferred );
};

/**
 * This api sets whether the Cut Lines status of the cross section
 *
 * @function setCutLines
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred A promise resolved when the operation is completed
 * @param {String} setCutLines true if cut lines will be enabled for the new cross sections
 * @param {sectionId} sectionId Section id to be processed
 */
export let setCutLines = function( viewerContextNamespace, deferred, setCutLines, sectionId ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSectionManager().setCutLines( viewerContextNamespace, setCutLines, sectionId, deferred );
};

/**
 * This api returns the Cut Lines status of the cross section
 *
 * @function setCutLines
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred A promise resolved when the operation is completed
 * @param {sectionId} sectionId Section id to be processed
 */
export let getCutLines = function( viewerContextNamespace, deferred, sectionId ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSectionManager().getCutLines( sectionId, deferred );
};

/**
 * Saves session
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 * @param {String} savedSWCUID UID of SWC
 * @param {Promise} deferred A promise resolved once done
 */
export let createViewerSession = function( viewerContextNamespace, savedSWCUID, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getSessionMgr().createSession( savedSWCUID ).then(
        function() {
            deferred.resolve();
        },
        function( reason ) {
            deferred.reject( reason );
        } );
};

/**
 * saves saveAutoBookMark
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 * @param {Promise} deferred A promise resolved once done
 */
export let saveAutoBookMark = function( viewerContextNamespace, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getSessionMgr().saveAutoBookmark().then(
        function() {
            deferred.resolve();
        },
        function( reason ) {
            deferred.reject( reason );
        } );
};

/**
 * This api used to set the Model view properties indicated by the array of objects
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 * @param {Object} modelViewList An array of objects specifying the ModelView, property to change, and new value
 * @param {Promise} deferred A promise resolved once model view is applied
 * @return {Promise} Promise
 */
export let setPropertiesOnModelViews = function( viewerContextNamespace, modelViewList, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getModelViewManager().setPropertiesOnModelViews( modelViewList, deferred );
};

/**
 * Get the viewer api object
 *
 * @return {Object} An object that provides access to viewer api's
 */
export let getSecondaryApi = function() {
    return exports;
};

const exports = {
    setViewerContextService,
    startViewerMeasurement,
    closeViewerMeasurement,
    setMeasurementPickMode,
    deleteSelectedMeasurement,
    deleteAllMeasurement,
    startViewerQuickMeasurement,
    setQuickMeasurementPickMode,
    closeViewerQuickMeasurement,
    getAllMeasurements,
    setPickFilterSelectionStateInSubCommandToolBar,
    setMeasurementCommandDataToSessionStorage,
    requestModelViewsData,
    requestPmiElementsData,
    requestPmiElementsDataByParts,
    requestModelViewsDataByParts,
    requestModelViewElementsData,
    setModelViewVisibility,
    reorientText,
    setPmiElementProperty,
    executeProximitySearch,
    executeProximitySearchInDistance,
    executeVolumeSearch,
    getCornerValuesFromOccListInCtx,
    setVolumeFilterOnNative,
    drawVolumeBox,
    createImageCapture,
    displayImageCapture,
    deactivateCapturedObject,
    closeImageCaptureView,
    createViewerSection,
    enterSectionCreationModeUsingEntities,
    setSectionModeEnabled,
    setShowCapsAndCutLines,
    initializeSectionsFromContext,
    setSectionSelection,
    toggleSectionVisibility,
    modifySection,
    setSectionOffsetValue,
    moveSection,
    deleteSection,
    deleteAllSections,
    createSnapshot,
    updateProductSnapshot,
    getAllSnapshots,
    deleteAllSnapshots,
    getMovingFrameCullingUseSizeCulling,
    getMovingFrameScreenSizeCullingEnabled,
    getMovingFrameScreenSizeCullingObjectThreshold,
    getStillFrameScreenSizeCullingEnabled,
    getStillFrameScreenSizeCullingObjectThreshold,
    setMovingFrameCullingUseSizeCulling,
    setMovingFrameScreenSizeCullingEnabled,
    setMovingFrameScreenSizeCullingObjectThreshold,
    setStillFrameScreenSizeCullingEnabled,
    setStillFrameScreenSizeCullingObjectThreshold,
    addModelViewDataset,
    getModelViews,
    invoke,
    applyScreenshotState,
    setModelViewVisibilityForOccurance,
    saveScreenshot,
    updateClipState,
    updateEditSectionIdToViewerContext,
    getSectionDataById,
    getEditSectionId,
    clearEditSectionId,
    setCapping,
    setGlobalCutLines,
    setCutLines,
    getCutLines,
    createViewerSession,
    saveAutoBookMark,
    setPropertiesOnModelViews,
    getSecondaryApi,
    removeAllAnnotationLayerInfo,
    addAnnotationLayerInfo
};

export default exports;
