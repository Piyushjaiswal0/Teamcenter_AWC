// Copyright (c) 2021 Siemens

/**
 * This is image capture service provider
 *
 * @module js/viewerImageCaptureManagerProvider
 */
import '@swf/ClientViewer';


/**
 * Provides an instance of image capture manager
 *
 * @param {Object} viewerView - Viewer view
 * @param {Object} viewerContextData - Viewer Context data
 *
 * @returns {Object} Returns Image capture manager
 */
export let getImgCaptureManager = function( viewerView, viewerContextData ) {
    return new ImageCaptureManager( viewerView, viewerContextData );
};

/**
 * Class to hold the image capture manager attributes
 *
 */
class ImageCaptureManager {
    /*
     * @constructor ImageCaptureManager
     *
     * @param {String} viewerCtxNamespace - Viewer context name space
     * @param {Object} viewerView - Viewer view
     * @param {Object} viewerContextData - Viewer Context data
     */
    constructor( viewerView, viewerContextData ) {
        this._viewerView = viewerView;
        this._viewerContextData = viewerContextData;
        this._imageCaptureContainer = null;
        this.setupAtomicDataTopics();
    }

    /**
     * To create image capture in viewer.
     *
     * @param {String} contextObjectUid - object uid
     * @param {String} captureName - name of the image capture
     * @param {String} captureDesc - description of the image capture
     * @return {Promise} promise A promise resolved once section is create in viewer in given plane
     */
    captureImage( contextObjectUid, captureName, captureDesc ) {
        return this._viewerView.imageCaptureMgr.saveScreenshot( contextObjectUid, captureName, captureDesc,
            window.JSCom.Consts.ImageType.PNG_24, 3520, 1980, 250 );
    }

    /**
     * To display image capture in viewer.
     * @param {String} resultUrl - ticket
     * @param {Object} lastActiveCaptureObj - last selected captured object
     * @param {Boolean} selected -  Indicate whether it is selected or deselected
     */
    displayImageCapture( resultUrl, lastActiveCaptureObj, selected ) {
        let viewerCtxService = this._viewerContextData.getViewerCtxSvc();
        this._viewerContextData.updateViewerAtomicData( viewerCtxService.VIEWER_VIEW_MODE_TOKEN, viewerCtxService.ViewerViewModes.VIEWER2D );
        let atomicDataSubject = this._viewerContextData.getViewerAtomicDataSubject();
        atomicDataSubject.notify(  viewerCtxService.VIEWER_UPDATE_VIEW_WITH_CAPTURED_IMAGE, {
            fileUrl: resultUrl
        } );
        viewerCtxService.setMarkupCommandVisibility( selected, lastActiveCaptureObj, this._viewerContextData  );
    }

    /**
     * To deactivate the selected capture in viewer
     *
     * @param {Object} lastActiveCaptureObj - last selected captured object
     * @param {Promise} deferred A promise resolved once section is create in viewer in given plane
     */
    deactivateCapturedObject( lastActiveCaptureObj ) {
        if( lastActiveCaptureObj !== null ) {
            this._viewerView.imageCaptureMgr.applyScreenshotState( lastActiveCaptureObj.uid ).then( function() {
                this.closeImageCaptureView();
            }.bind( this ) );
        } else {
            this.closeImageCaptureView();
        }
    }

    /**
     * Deactivate image capture in viewer
     *
     */
    closeImageCaptureView() {
        var viewerCtxService = this._viewerContextData.getViewerCtxSvc();
        if( this._viewerContextData.getValueOnViewerAtomicData( viewerCtxService.VIEWER_VIEW_MODE_TOKEN ) !== viewerCtxService.ViewerViewModes.VIEWER3D ) {
            this._viewerContextData.updateViewerAtomicData( viewerCtxService.VIEWER_VIEW_MODE_TOKEN, viewerCtxService.ViewerViewModes.VIEWER3D );
        }
        let atomicDataSubject = this._viewerContextData.getViewerAtomicDataSubject();
        atomicDataSubject.notify( viewerCtxService.VIEWER_DEACTIVATE_IMAGE_CAPTURE_DISPLAY );
    }

    /**
     * Applies the state stored in the dataset to the 3D view
     *
     * @param {string} datasetUID  UID of image capture dataset for which state needs to be applied
     * @return {Promise} on resolve apply screenshot state
     */
    applyScreenshotState( datasetUID ) {
        return this._viewerView.imageCaptureMgr.applyScreenshotState( datasetUID );
    }

    /**
     * Generates a 2D captured image of the currently active 3D View. It uploads the 2D image as a dataset to Teamcenter,
     * attaching it to the object defined in the input or the NewStuff folder.
     *
     * @param {String} attachToObjectUID Teamcenter object to attached the 2D dataset to. Could be empty, in which case user's NewStuff folder will be used
     * @param {String} screenshotName name for screenshot
     * @param {String} screenshotDescription description for screenshot
     * @param {JSCom.Consts.ImageType} type enumeration specifying the type of image to generate.
     * @param {Number} xSize width of the image
     * @param {Number} ySize height of the image
     * @param {Number} DPI definition (dots per inch)
     * @return {Promise} on resolve save screenshot state
     *
     */
    saveScreenshot( attachToObjectUID, screenshotName, screenshotDescription, type, xSize, ySize, DPI ) {
        return this._viewerView.imageCaptureMgr.saveScreenshot( attachToObjectUID, screenshotName, screenshotDescription, type, xSize, ySize, DPI );
    }

    /**
     * Gets image capture coontainer for Markup
     * @return {Object} current active image capture container in 2D viewer
     */
    getElementForMarkup() {
        return this._imageCaptureContainer;
    }

    /**
     * Register for viewer atomic data topics
     */
    setupAtomicDataTopics() {
        this._viewerContextData.getViewerAtomicDataSubject().subscribe( this._viewerContextData.IMAGE_CAPTURE_CONTAINER, this );
    }

    /**
     * Handle viewer atomic data update
     * @param {String} topic topic
     * @param {Object} data updated data
     */
    update( topic, data ) {
        if( topic === this._viewerContextData.IMAGE_CAPTURE_CONTAINER ) {
            this._imageCaptureContainer = data;
        }
    }
}

export default {
    getImgCaptureManager
};
