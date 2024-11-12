// Copyright (c) 2022 Siemens

/**
 * Defines {@link NgServices.viewerSecondaryModelService} which provides utility functions for viewer secondary model
 *
 * @module js/viewerSecondaryModel.service
 */
import viewerContextService from 'js/viewerContext.service';
import viewerSecModelIntrSvcProvider from 'js/viewerSecondaryModelInteractionServiceProvider';
import AwPromiseService from 'js/awPromiseService';

let exports = {};

/**
 * Object that provides access to viewer secondary model api's
 */
var secondaryModelApi = {};

/**
 * This api creates a section in viewer in given plane
 *
 * @function createViewerSection
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} planeId plane id to create section
 *
 * @return {Promise} A promise resolved once section is create in viewer in given plane
 */
export let createViewerSection = function( viewerContextNamespace, planeId ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).createViewerSection( viewerContextNamespace,
        deferred, planeId );
    return deferred.promise;
};

export let enterSectionCreationModeUsingEntities = function( viewerContextNamespace, sectionCreatorOptions ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).enterSectionCreationModeUsingEntities( viewerContextNamespace, sectionCreatorOptions, deferred );
    return deferred.promise;
};

export let setSectionModeEnabled = function( viewerContextNamespace, isEnabled ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).setSectionModeEnabled( viewerContextNamespace, isEnabled, deferred );
    return deferred.promise;
};

/**
 * This api sets the selection for section in viewer
 *
 * @function setSectionSelection
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} sectionId section id
 * @param {String} isSelected true if section is to be selected
 *
 * @return {Promise} A promise resolved once section selection is set in viewer
 */
export let setSectionSelection = function( viewerContextNamespace, sectionId, isSelected ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).setSectionSelection( viewerContextNamespace,
        deferred, sectionId, isSelected );
    return deferred.promise;
};

/**
 * This api sets show caps and cut lines in viewer
 *
 * @function setShowCapsAndCutLines
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} isShowCapsAndLines true if section is to be selected
 *
 * @return {Promise} A promise resolved once preference is set in viewer
 */
export let setShowCapsAndCutLines = function( viewerContextNamespace, isShowCapsAndLines ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).setShowCapsAndCutLines(
        viewerContextNamespace, deferred, isShowCapsAndLines );
    return deferred.promise;
};

/**
 * This api toggles section visibility in viewer
 *
 * @function toggleSectionVisibility
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} sectionId section id
 *
 * @return {Promise} A promise resolved once section visibility is toggled
 */
export let toggleSectionVisibility = function( viewerContextNamespace, sectionId ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).toggleSectionVisibility(
        viewerContextNamespace, deferred, sectionId );
    return deferred.promise;
};

/**
 * This api modifies section normal
 *
 * @function modifySection
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} sectionId section id
 * @param {String} newNormal new normal to be set for section
 *
 * @return {Promise} A promise resolved once new normal is set in section
 */
export let modifySection = function( viewerContextNamespace, sectionId, newNormal ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).modifySection( viewerContextNamespace,
        deferred, sectionId, newNormal );
    return deferred.promise;
};

/**
 * This api modifies section offset value
 *
 * @function setSectionOffsetValue
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} sectionId section id
 * @param {String} newValue new offset value
 *
 * @return {Promise} A promise resolved once new offset is set in section
 */
export let setSectionOffsetValue = function( viewerContextNamespace, sectionId, newValue ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).setSectionOffsetValue(
        viewerContextNamespace, deferred, sectionId, newValue );
    return deferred.promise;
};

/**
 * This api used to move section
 *
 * @function moveSection
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} sectionId section id
 * @param {String} offsetValue new offset value
 *
 * @return {Promise} A promise resolved once new offset is set in section
 */
export let moveSection = function( viewerContextNamespace, sectionId, offsetValue ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).moveSection( viewerContextNamespace,
        deferred, sectionId, offsetValue );
    return deferred.promise;
};

/**
 * This api used to delete section
 *
 * @function deleteSection
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} sectionId section id
 *
 * @return {Promise} A promise resolved once section is deleted
 */
export let deleteSection = function( viewerContextNamespace, sectionId ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).deleteSection( viewerContextNamespace,
        deferred, sectionId );
    return deferred.promise;
};

/**
 * This api used to delete all sections
 *
 * @function deleteAllSections
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} A promise resolved once all sections are deleted
 */
export let deleteAllSections = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).deleteAllSections( viewerContextNamespace,
        deferred );
    return deferred.promise;
};

/**
 * This api used to initialize viewer context
 *
 * @function initializeSectionsFromContext
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} A promise resolved once context is initialized
 */
export let initializeSectionsFromContext = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).initializeSectionsFromContext(
        viewerContextNamespace, deferred );
    return deferred.promise;
};

/**
 * This api used to initiate measurement mode in given viewer context
 *
 * @function startViewerMeasurement
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} measurementMode - measurement type
 *
 * @return {Promise} A promise resolved once all sections are deleted
 */
export let startViewerMeasurement = function( viewerContextNamespace, measurementMode ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).startViewerMeasurement(
        viewerContextNamespace, measurementMode, deferred );
    return deferred.promise;
};

/**
 * This api used to close measurement mode in given viewer context
 *
 * @function closeViewerMeasurement
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 *
 * @return {Promise} A promise resolved once all sections are deleted
 */
export let closeViewerMeasurement = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).closeViewerMeasurement(
        viewerContextNamespace, deferred );
    return deferred.promise;
};

/**
 * This api used to initiate quick measurement mode in given viewer context
 *
 * @function startViewerQuickMeasurement
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} A promise resolved once all sections are deleted
 */
export let startViewerQuickMeasurement = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).startViewerQuickMeasurement(
        viewerContextNamespace, deferred );
    return deferred.promise;
};

/**
 * This api used to close quick measurement mode in given viewer context
 *
 * @function closeViewerQuickMeasurement
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 *
 * @return {Promise} A promise resolved once all sections are deleted
 */
export let closeViewerQuickMeasurement = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).closeViewerQuickMeasurement(
        viewerContextNamespace, deferred );
    return deferred.promise;
};

/**
 * This api used to set quick measurement pick filter
 *
 * @function setQuickMeasurementPickMode
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 *
 * @return {Promise} A promise resolved once all sections are deleted
 */
export let setQuickMeasurementPickMode = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).setQuickMeasurementPickMode(
        viewerContextNamespace, deferred );
    return deferred.promise;
};

/**
 * This api used to set measurement pick mode in given context
 *
 * @function setMeasurementPickMode
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} measurementMode - measurement type
 *
 * @return {Promise} A promise resolved once all sections are deleted
 */
export let setMeasurementPickMode = function( viewerContextNamespace, measurementMode ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).setMeasurementPickMode(
        viewerContextNamespace, measurementMode, deferred );
    return deferred.promise;
};

/**
 * This api used to delete selected measurement in given context
 *
 * @function deleteSelectedMeasurement
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} A promise resolved once all sections are deleted
 */
export let deleteSelectedMeasurement = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).deleteSelectedMeasurement(
        viewerContextNamespace, deferred );
    return deferred.promise;
};

/**
 * This api used to delete all measurements in given ontext
 *
 * @function deleteAllMeasurement
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} A promise resolved once all sections are deleted
 */
export let deleteAllMeasurement = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).deleteAllMeasurement(
        viewerContextNamespace, deferred );
    return deferred.promise;
};

/**
 * This api used to clear all annotations in given context
 *
 * @function removeAllAnnotationLayerInfo
 *
 * @param {String}  -  viewerCtxNamespace - registered viewer context name space
 *
 * @return {Promise} A promise resolved once all sections are deleted
 */
export let removeAllAnnotationLayerInfo = function( viewerCtxNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerCtxNamespace ).removeAllAnnotationLayerInfo(
        viewerCtxNamespace, deferred );
    return deferred.promise;
};

/**
 * This api used to add an annotations in given context
 *
 * @function addAnnotationLayerInfo
 *
 * @param {String}  -  viewerCtxNamespace - registered viewer context name space
 * @param {String}  -  json Data containing markup
 * @param { Number } vpHeight - The height of the viewport or canvas at the time the jsonData was created
 * @param { Number } vpWidth - The width of the viewport or canvas at the time the jsonData was created
 *
 * @return {Promise} A promise resolved once annotation is added
 */
export let addAnnotationLayerInfo = function( viewerCtxNamespace, jsonData, vpHeight, vpWidth ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerCtxNamespace ).addAnnotationLayerInfo(
        viewerCtxNamespace, jsonData, vpHeight, vpWidth, deferred );
    return deferred.promise;
};


/**
 * This api is used to fetch measurements from server.
 *
 * @function getAllMeasurements
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} promise
 */
export let getAllMeasurements = function( viewerContextNamespace ) {
    exports.getSecondaryApi( viewerContextNamespace ).getAllMeasurements(
        viewerContextNamespace );
};

/**
 * Sets pick filter selection state to subcommand toolbar from session storage
 *
 * @function setPickFilterSelectionStateInSubCommandToolBar
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 */
export let setPickFilterSelectionStateInSubCommandToolBar = function( viewerContextNamespace ) {
    exports.getSecondaryApi( viewerContextNamespace ).setPickFilterSelectionStateInSubCommandToolBar(
        viewerContextNamespace );
};

/**
 * Stores pick filter selection state of subcommand toolbar to session storage
 *
 * @function setMeasurementCommandDataToSessionStorage
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Object} subToolBarCommandState Measurement subToolBarCommandState
 *
 */
export let setMeasurementCommandDataToSessionStorage = function( viewerContextNamespace, subToolBarCommandState ) {
    exports.getSecondaryApi( viewerContextNamespace ).setMeasurementCommandDataToSessionStorage(
        viewerContextNamespace, subToolBarCommandState );
};


/**
 * This api used to do proximity search in distance range
 *
 * @function executeProximitySearchInDistance
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Number} targetRange - target range
 *
 * @return {Promise} A promise resolved once search is complete
 */
export let executeProximitySearchInDistance = function( viewerContextNamespace, targetRange ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).executeProximitySearchInDistance(
        viewerContextNamespace, deferred, targetRange );
    return deferred.promise;
};

/**
 * This api used to do proximity search
 *
 * @function executeProximitySearch
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} A promise resolved once search is complete
 */
export let executeProximitySearch = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).executeProximitySearch(
        viewerContextNamespace, deferred );
    return deferred.promise;
};

/**
 * This api used to do volume search
 *
 * @function executeVolumeSearch
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Object} cVs - Corner values container
 *
 * @return {Promise} A promise resolved once search is complete
 */
export let executeVolumeSearch = function( viewerContextNamespace, cVs ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).executeVolumeSearch( viewerContextNamespace,
        deferred, cVs );
    return deferred.promise;
};

/**
 * This api used to get corner values from occurrence list in ctx
 *
 * @function getCornerValuesFromOccListInCtx
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} A promise resolved once corner values are obtained in promise result.
 */
export let getCornerValuesFromOccListInCtx = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).getCornerValuesFromOccListInCtx(
        viewerContextNamespace, deferred );
    return deferred.promise;
};

/**
 * This api used to set Volume filter state: On/Off
 *
 * @function setVolumeFilterOnNative
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {boolean} isOn - true if filter is to be set to on
 *
 * @return {Promise} A promise resolved once Filter is turned on/off.
 */
export let setVolumeFilterOnNative = function( viewerContextNamespace, isOn ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).setVolumeFilterOnNative(
        viewerContextNamespace, deferred, isOn );
    return deferred.promise;
};

/**
 * This api used to create Volume box in the viewer
 *
 * @function drawVolumeBox
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Object} cornerValues - Corner values container
 *
 * @return {Promise} A promise resolved once volume is drawn in the viewer.
 */
export let drawVolumeBox = function( viewerContextNamespace, cornerValues ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).drawVolumeBox( viewerContextNamespace,
        cornerValues, deferred );
    return deferred.promise;
};

/**
 * This api creates a image capture in viewer
 *
 * @function createImageCapture
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} captureName - name of the image capture
 * @param {String} captureDesc - description of the image capture
 * @param {String} contextObjectUid - object uid
 * @return {Promise} A promise resolved once section is create in viewer in given plane
 */
export let createImageCapture = function( contextObjectUid, viewerCtxNameSpace, captureName,
    captureDesc ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerCtxNameSpace ).createImageCapture( contextObjectUid,
        viewerCtxNameSpace, captureName, deferred, captureDesc );
    return deferred.promise;
};

/**
 * This api deactive the selected capture in viewer
 *
 * @function createImageCapture
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Object} lastActiveCaptureObj - last selected captured object
 *
 * @return {Promise} A promise resolved once section is create in viewer in given plane
 */
export let deactivateCapturedObject = function( viewerCtxNameSpace, lastActiveCaptureObj ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerCtxNameSpace ).deactivateCapturedObject( viewerCtxNameSpace,
        lastActiveCaptureObj, deferred );
    return deferred.promise;
};

/**
 * Api to close image capture 2D view in viewer panel
 *
 * @function closeImageCaptureView
 *
 *
 * @param {String} viewerCtxNameSpace  registered viewer context name space
 *
 */
export let closeImageCaptureView = function( viewerCtxNameSpace ) {
    exports.getSecondaryApi( viewerCtxNameSpace ).closeImageCaptureView( viewerCtxNameSpace );
};

/**
 * This api display the image capture in viewer
 *
 * @function createImageCapture
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} resultUrl - ticket
 * @param {Object} lastActiveCaptureObj - last selected captured object
 */
export let displayImageCapture = function( viewerCtxNameSpace, resultUrl, lastActiveCaptureObj ) {
    exports.getSecondaryApi( viewerCtxNameSpace ).displayImageCapture( viewerCtxNameSpace,
        resultUrl, lastActiveCaptureObj, true );
};

/**
 * This api is used to fetch PMI Model View data.
 *
 * @function requestModelViewsData
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} A promise resolved once volume is drawn in the viewer.
 */
export let requestModelViewsData = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).requestModelViewsData(
        viewerContextNamespace, deferred );
    return deferred.promise;
};

/**
 * This api is used to fetch PMI elements data.
 *
 * @function requestPmiElementsData
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @return {Promise} A promise resolved once volume is drawn in the viewer.
 */
export let requestPmiElementsData = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).requestPmiElementsData(
        viewerContextNamespace, deferred );
    return deferred.promise;
};

/**
 * This api is used to fetch PMI Model Views data by parts.
 *
 * @function requestPmiElementsData
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} parts[] - array of part csid
 *
 * @return {Promise} A promise resolved once volume is drawn in the viewer.
 */
export let requestModelViewsDataByParts = function( viewerContextNamespace, parts ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).requestModelViewsDataByParts(
        viewerContextNamespace, parts, deferred );
    return deferred.promise;
};

/**
 * This api is used to fetch PMI elements data for the given parts.
 *
 * @function requestPmiElementsDataByParts
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} parts[] - array of part csid
 *
 * @return {Promise} A promise resolved once volume is drawn in the viewer.
 */
export let requestPmiElementsDataByParts = function( viewerContextNamespace, parts ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).requestPmiElementsDataByParts(
        viewerContextNamespace, parts, deferred );
    return deferred.promise;
};

/**
 * This api is used to fetch PMI elements for given model view.
 *
 * @function requestModelViewElementsData
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} modelViewId - model view id
 *
 * @return {Promise} A promise resolved once volume is drawn in the viewer.
 */
export let requestModelViewElementsData = function( viewerContextNamespace, modelViewId ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).requestModelViewElementsData(
        viewerContextNamespace, modelViewId, deferred );
    return deferred.promise;
};

/**
 * This api is used to set PMI element sproperty.
 *
 * @function setPmiElementProperty
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Boolean} perOccurrence[] - is per occurrence
 * @param {String} elementIds[] - array of elementIds
 * @param {Boolean} isChecked[] - array of new states
 * @param {String} types[] - array of string "VISIBILE"/"SELETCED"
 *
 * @return {Promise} A promise resolved once volume is drawn in the viewer.
 */
export let setPmiElementProperty = function( viewerContextNamespace, perOccurrence, elementIds,
    isChecked, types ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).setPmiElementProperty(
        viewerContextNamespace, perOccurrence, elementIds, isChecked, types, deferred );
    return deferred.promise;
};

/**
 * This api is used to set reorientText flag in the viewer.
 *
 * @function reorientText
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} A promise resolved once volume is drawn in the viewer.
 */
export let reorientText = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).reorientText( viewerContextNamespace,
        deferred );
    return deferred.promise;
};

/**
 * This api is used to set model view visibility in Viewerr.
 *
 * @function setModelViewVisibility
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} modelViewId - model view id
 * @param {Boolean} isChecked - true/false
 *
 * @return {Promise} A promise resolved once volume is drawn in the viewer.
 */
export let setModelViewVisibility = function( viewerContextNamespace, modelViewId, isChecked ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).setModelViewVisibility(
        viewerContextNamespace, modelViewId, isChecked, deferred );
    return deferred.promise;
};

/**
 * This api is used to determine if the Viewer has PMI data.
 *
 * @function hasPMIData
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} A promise resolved once volume is drawn in the viewer.
 */
export let hasPMIData = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace )
        .hasPMIData( viewerContextNamespace, deferred );
    return deferred.promise;
};

/**
 * This api is used to create session snapshot.
 *
 * @function createSnapshot
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} promise
 */
export let createSnapshot = function( viewerContextNamespace ) {
    return exports.getSecondaryApi( viewerContextNamespace ).createSnapshot(
        viewerContextNamespace );
};

/**
 * This api is used to update Teamcenter Product Snapshot with TcVis session data.
 *
 * @function updateProductSnapshot
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} snapshotUID - UID of the Product Snapshot created in Teamcenter
 *
 * @return {Promise} promise
 */
export let updateProductSnapshot = function( viewerContextNamespace, snapshotUID ) {
    return exports.getSecondaryApi( viewerContextNamespace ).updateProductSnapshot(
        viewerContextNamespace, snapshotUID );
};

/**
 * This api is used to fetch all session snapshots from server.
 *
 * @function getAllSnapshots
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} promise
 */
export let getAllSnapshots = function( viewerContextNamespace ) {
    return exports.getSecondaryApi( viewerContextNamespace ).getAllSnapshots(
        viewerContextNamespace );
};

/**
 * This api is used to delete all session snapshots from server.
 *
 * @function deleteAllSnapshots
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} promise
 */
export let deleteAllSnapshots = function( viewerContextNamespace ) {
    return exports.getSecondaryApi( viewerContextNamespace ).deleteAllSnapshots(
        viewerContextNamespace );
};

/**
 * This api used to retrieve whether or not moving frame culling should use size culling
 *
 * @function getMovingFrameCullingUseSizeCulling
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} promise
 */
export let getMovingFrameCullingUseSizeCulling = function( viewerContextNamespace ) {
    return exports.getSecondaryApi( viewerContextNamespace ).getMovingFrameCullingUseSizeCulling(
        viewerContextNamespace );
};

/**
 * This api used to retrieve whether or not moving frame culling is enabled
 *
 * @function getMovingFrameScreenSizeCullingEnabled
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} promise
 */
export let getMovingFrameScreenSizeCullingEnabled = function( viewerContextNamespace ) {
    return exports.getSecondaryApi( viewerContextNamespace ).getMovingFrameScreenSizeCullingEnabled(
        viewerContextNamespace );
};

/**
 * This api returns the threshold used to decide when an object is culled in case of moving frame
 *
 * @function getMovingFrameScreenSizeCullingObjectThreshold
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} promise
 */
export let getMovingFrameScreenSizeCullingObjectThreshold = function( viewerContextNamespace ) {
    return exports.getSecondaryApi( viewerContextNamespace ).getMovingFrameScreenSizeCullingObjectThreshold(
        viewerContextNamespace );
};

/**
 * This api used to retrieve whether or not still frame culling is enabled
 *
 * @function getStillFrameScreenSizeCullingEnabled
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} promise
 */
export let getStillFrameScreenSizeCullingEnabled = function( viewerContextNamespace ) {
    return exports.getSecondaryApi( viewerContextNamespace ).getStillFrameScreenSizeCullingEnabled(
        viewerContextNamespace );
};

/**
 * This api returns the threshold used to decide when an object is culled in case of still frame
 *
 * @function getStillFrameScreenSizeCullingObjectThreshold
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} promise
 */
export let getStillFrameScreenSizeCullingObjectThreshold = function( viewerContextNamespace ) {
    return exports.getSecondaryApi( viewerContextNamespace ).getStillFrameScreenSizeCullingObjectThreshold(
        viewerContextNamespace );
};

/**
 * This api used to set whether or not moving frame culling should use size culling
 *
 * @function setMovingFrameCullingUseSizeCulling
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Boolean} enable - True if moving frame culling should use size culling, false otherwise
 *
 * @return {Promise} promise
 */
export let setMovingFrameCullingUseSizeCulling = function( viewerContextNamespace, enable ) {
    return exports.getSecondaryApi( viewerContextNamespace ).setMovingFrameCullingUseSizeCulling(
        viewerContextNamespace, enable );
};

/**
 * This api used to enable or disable moving frame culling
 *
 * @function setMovingFrameScreenSizeCullingEnabled
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Boolean} enable - True if moving frame culling should be enabled, false otherwise
 *
 * @return {Promise} promise
 */
export let setMovingFrameScreenSizeCullingEnabled = function( viewerContextNamespace, enable ) {
    return exports.getSecondaryApi( viewerContextNamespace ).setMovingFrameScreenSizeCullingEnabled(
        viewerContextNamespace, enable );
};

/**
 * This api used to set threshold which is used to decide when to cull an object
 *
 * @function setMovingFrameScreenSizeCullingObjectThreshold
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Number} newHeightInPercent - The height of the screen size culling object relative to the screen height Value between 0-1
 *
 * @return {Promise} promise
 */
export let setMovingFrameScreenSizeCullingObjectThreshold = function( viewerContextNamespace, newHeightInPercent ) {
    return exports.getSecondaryApi( viewerContextNamespace ).setMovingFrameScreenSizeCullingObjectThreshold(
        viewerContextNamespace, newHeightInPercent );
};

/**
 * This api used to enable or disable still frame culling
 *
 * @function setStillFrameScreenSizeCullingEnabled
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Boolean} enable - True if still frame culling should be enabled, false otherwise
 *
 * @return {Promise} promise
 */
export let setStillFrameScreenSizeCullingEnabled = function( viewerContextNamespace, enable ) {
    return exports.getSecondaryApi( viewerContextNamespace ).setStillFrameScreenSizeCullingEnabled(
        viewerContextNamespace, enable );
};

/**
 * This api used to set threshold which is used to decide when to cull an object in case of still frames
 *
 * @function setStillFrameScreenSizeCullingObjectThreshold
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Number} newHeightInPercent - The height of the screen size culling object relative to the screen height Value between 0-1
 *
 * @return {Promise} promise
 */
export let setStillFrameScreenSizeCullingObjectThreshold = function( viewerContextNamespace, newHeightInPercent ) {
    return exports.getSecondaryApi( viewerContextNamespace ).setStillFrameScreenSizeCullingObjectThreshold(
        viewerContextNamespace, newHeightInPercent );
};

/**
 * This api used to add the model view dataset
 *
 * @function addModelViewDataset
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 * @param {Object} modelViewOwner An array of Occurence
 * @param {String} modelViewDatasetUID
 * @param {String} mappingObjectUID   Optional
 * @param {String} mappingPropName    Optional
 */
export let addModelViewDataset = function( viewerContextNamespace, modelViewOwner, modelViewDatasetUID, mappingObjectUID, mappingPropName ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace )
        .addModelViewDataset( viewerContextNamespace, modelViewOwner, modelViewDatasetUID, mappingObjectUID, mappingPropName, deferred );
    return deferred.promise;
};

/**
 * This api is used to get the model view on the root or on the Occurrences passed in.
 *
 * @function getModelViews
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 * @param {Object} occList An array of Occurence
 */
export let getModelViews = function( viewerContextNamespace, occList ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace )
        .getModelViews( viewerContextNamespace, occList, deferred );
    return deferred.promise;
};

/**
 * This api used to apply the model view
 *
 * @function invoke
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 * @param {Object} modelViewOwner An array of Occurence
 * @param {String} modelViewCADID
 * @param {Object} scopeVisibilitySet An array of Occurence
 */
export let invoke = function( viewerContextNamespace, modelViewOwner, modelViewCADID, scopeVisibilitySet ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace )
        .invoke( viewerContextNamespace, modelViewOwner, modelViewCADID, scopeVisibilitySet, deferred );
    return deferred.promise;
};

/**
 * This api used to apply the model view proxy
 *
 * @function invoke
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 * @param {String} mvProxyUid - Model View Proxy uid
 */
export let invokeModelViewProxy = function( viewerContextNamespace, mvProxyUid ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).invokeModelViewProxy( viewerContextNamespace, mvProxyUid, deferred );
    return deferred.promise;
};

/**
 * This api used to apply state stored in the dataset to the 3D view
 *
 * @function applyScreenshotState
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 * @param {String} datasetUID UID of image capture dataset for which state needs to be applied
 */
export let applyScreenshotState = function( viewerContextNamespace, datasetUID ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace )
        .applyScreenshotState( viewerContextNamespace, datasetUID, deferred );
    return deferred.promise;
};

/**
 * This Api is used to set model view visibility for occurances provided as input
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 * @param {Array} occIds Occurances ID list
 * @param {String} modelViewId id for model view
 * @param {Boolean} isChecked true/false
 *
 * @return  {Promise} deferred A promise resolved once model view is applied
 *
 */
export let setModelViewVisibilityForOccurance = function( viewerContextNamespace, occIds, modelViewId, isChecked ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace )
        .setModelViewVisibilityForOccurance( viewerContextNamespace, occIds, modelViewId, isChecked, deferred );
    return deferred.promise;
};

/**
 * This api used to generate a 2D captured image of the currently active 3D View. It uploads the 2D image as a dataset to Teamcenter,
 * attaching it to the object defined in the input or the NewStuff folder.w
 *
 * @function saveScreenshot
 *
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
 */
export let saveScreenshot = function( viewerContextNamespace, attachToObjectUID, screenshotName, screenshotDescription, type, xSize, ySize, DPI ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace )
        .saveScreenshot( viewerContextNamespace, attachToObjectUID, screenshotName, screenshotDescription, type, xSize, ySize, DPI, deferred );
    return deferred.promise;
};

/**
 * This api updates the edit section in viewer context
 *
 * @function updateEditSectionIdToViewerContext
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {sectionId} sectionId Section id to be processed
 * @return {Promise} A jQuery promise that is resolved or rejected when the operation has completed.
 */
export let updateEditSectionIdToViewerContext = function( viewerContextNamespace, sectionId ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).updateEditSectionIdToViewerContext( viewerContextNamespace, sectionId, deferred );
    return deferred.promise;
};

/**
 * This api get the section data for given section id
 *
 * @function getSectionDataById
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {sectionId} sectionId Section id to be processed
 * @returns {Object}  Edit section data object
 */
export let getSectionDataById = function( viewerContextNamespace, sectionId ) {
    return exports.getSecondaryApi( viewerContextNamespace ).getSectionDataById( viewerContextNamespace, sectionId );
};

/**
 * This api gets the edit section id
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @return {Promise} A jQuery promise that is resolved or rejected when the operation has completed.
 */
export let getEditSectionId = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).getEditSectionId( viewerContextNamespace, deferred );
    return deferred.promise;
};

/**
 * This api clears the edit section id in viewer context
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @return {Promise} A jQuery promise that is resolved or rejected when the operation has completed.
 */
export let clearEditSectionId = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).clearEditSectionId( viewerContextNamespace, deferred );
    return deferred.promise;
};


/**
 * @param {String} viewerContextNamespace - registered viewer context namespace
 * @param {String} sectionId - Section's ID
 * @param {String} clipState - new Clip State
 *
 * @return {Object} Promise Object
 */
export let updateClipState = function( viewerContextNamespace, sectionId, clipState ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace )
        .updateClipState( viewerContextNamespace, sectionId, clipState, deferred );
    return deferred.promise;
};

/**
 * This api sets whether capping for cross sections should be drawn
 *
 * @function setCapping
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} setCapping If true, capping will be enabled for cross sections
 *
 * @return {Promise} A jQuery promise that is resolved or rejected when the operation has completed.
 */
export let setCapping = function( viewerContextNamespace, setCapping ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).setCapping(
        viewerContextNamespace, deferred, setCapping );
    return deferred.promise;
};

/**
 * This api sets whether cut lines for the new cross sections should be drawn
 *
 * @function setGlobalCutLines
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} setGlobalCutLines If true, cut lines will be enabled for the new cross sections
 *
 * @return {Promise} A jQuery promise that is resolved or rejected when the operation has completed.
 */
export let setGlobalCutLines = function( viewerContextNamespace, setGlobalCutLines ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).setGlobalCutLines(
        viewerContextNamespace, deferred, setGlobalCutLines );
    return deferred.promise;
};

/**
 * This api sets the Cut Lines status of the cross section
 *
 * @function setCutLines
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} setGlobalCutLines If true, the cross section will have section lines
 * @param {sectionId} sectionId Section id to be processed
 * @return {Promise} A jQuery promise that is resolved or rejected when the operation has completed.
 */
export let setCutLines = function( viewerContextNamespace, setCutLines, sectionId ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).setCutLines(
        viewerContextNamespace, deferred, setCutLines, sectionId );
    return deferred.promise;
};

export let getCutLines = function( viewerContextNamespace, sectionId ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).getCutLines(
        viewerContextNamespace, deferred, sectionId );
    return deferred.promise;
};

/**
 * This api used to create viewer session with Saved working Context
 *
 * @function createViewerSession
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 * @param {String} swcUID UID of Saved working Context
 */
export let createViewerSession = function( viewerContextNamespace, swcUID ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace )
        .createViewerSession( viewerContextNamespace, swcUID, deferred );
    return deferred.promise;
};

/**
 * This api used to save bookmark
 *
 * @function saveAutoBookMark
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context namespace
 */
export let saveAutoBookMark = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace )
        .saveAutoBookMark( viewerContextNamespace, deferred );
    return deferred.promise;
};

/**
 * This api used to set the Model view properties indicated by the array of objects
 *
 * @param {String} viewerContextNamespace - Registered viewer context namespace
 * @param {Object} modelViewList An array of objects specifying the ModelView, property to change, and new value
 * @return {Promise} promise
 */
export let setPropertiesOnModelViews = function( viewerContextNamespace, modelViewList ) {
    var deferred = AwPromiseService.instance.defer();
    exports.getSecondaryApi( viewerContextNamespace ).setPropertiesOnModelViews(
        viewerContextNamespace, modelViewList, deferred );
    return deferred.promise;
};

/**
 * Get the viewer secondary model api object
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @return {Object} An object that provides access to viewer secondary model api's
 */
export let getSecondaryApi = function( viewerContextNamespace ) {
    var regCtxObj = viewerContextService.getRegisteredViewerContext( viewerContextNamespace );
    var viewerSecModelInteractionSvcProvider = viewerSecModelIntrSvcProvider
        .getViewerSecondaryModelInteractionServiceProvider( regCtxObj.getViewerType() );
    viewerSecModelInteractionSvcProvider.getViewerSecondaryModelInteractionService()
        .setViewerContextService( viewerContextService );
    return viewerSecModelInteractionSvcProvider.getViewerSecondaryModelInteractionService()
        .getSecondaryApi();
};

export default exports = {
    createViewerSection,
    enterSectionCreationModeUsingEntities,
    setSectionModeEnabled,
    setSectionSelection,
    setShowCapsAndCutLines,
    toggleSectionVisibility,
    modifySection,
    setSectionOffsetValue,
    moveSection,
    deleteSection,
    deleteAllSections,
    initializeSectionsFromContext,
    startViewerMeasurement,
    closeViewerMeasurement,
    startViewerQuickMeasurement,
    closeViewerQuickMeasurement,
    setQuickMeasurementPickMode,
    setMeasurementPickMode,
    deleteSelectedMeasurement,
    deleteAllMeasurement,
    getAllMeasurements,
    setPickFilterSelectionStateInSubCommandToolBar,
    setMeasurementCommandDataToSessionStorage,
    executeProximitySearchInDistance,
    executeProximitySearch,
    executeVolumeSearch,
    getCornerValuesFromOccListInCtx,
    setVolumeFilterOnNative,
    drawVolumeBox,
    createImageCapture,
    deactivateCapturedObject,
    closeImageCaptureView,
    displayImageCapture,
    requestModelViewsData,
    requestPmiElementsData,
    requestModelViewsDataByParts,
    requestPmiElementsDataByParts,
    requestModelViewElementsData,
    setPmiElementProperty,
    reorientText,
    setModelViewVisibility,
    hasPMIData,
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
