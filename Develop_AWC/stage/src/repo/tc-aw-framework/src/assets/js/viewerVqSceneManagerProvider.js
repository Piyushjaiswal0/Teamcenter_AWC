// Copyright (c) 2022 Siemens

/**
 * This is VQScene service provider used to query various floor properties.
 *
 * @module js/viewerVqSceneManagerProvider
 */
var exports = {};

/**
 * Provides an instance of trisling draw manager
 *
 * @param {String} viewerCtxNamespace - Viewer context name space
 * @param {Object} viewerView - Viewer view
 * @param {Object} viewerContextData - Viewer Context data
 *
 * @return {Object} drawManager- Returns draw Manager
 */
export let getVqSceneMgr = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    return new VqSceneMgrConst( viewerCtxNamespace, viewerView, viewerContextData );
};

/**
 * Class to hold the vqSceneMgr floor properties manager
 *
 * @constructor VqSceneMgrConst
 *
 * @param {String} viewerCtxNamespace - Viewer context name space
 * @param {Object} viewerView - viewer view
 * @param {Object} viewerContextData - Viewer Context data
 */
var VqSceneMgrConst = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    var self = this;
    var _viewerView = viewerView;
    var _viewerContextData = viewerContextData;

    /**
     * Set floor visibility in viewer
     *
     * @param {Boolean} isVisible - Boolean flag to indicate viewer visibility.
     */
    self.setFloor = function( isVisible ) {
        _viewerView.vqSceneMgr.setFloor( isVisible );
    };

    /**
     * Set grid visibility in viewer
     *
     * @param {Boolean} isVisible - Boolean flag to indicate grid visibility.
     */
    self.setFloorGrid = function( isVisible ) {
        _viewerView.vqSceneMgr.setFloorGrid( isVisible );
    };

    /**
     * Set floor offset in viewer
     *
     * @param {Number} offsetValue - Offset value
     */
    self.setFloorOffset = function( offsetValue ) {
        _viewerView.vqSceneMgr.setFloorOffset( offsetValue );
    };

    /**
     * Set floor orientation in viewer
     *
     * @param {Number} planeId - Orientation id in number format
     */
    self.setFloorPlaneOrientation = function( planeId ) {
        _viewerView.vqSceneMgr.setFloorPlaneOrientation( planeId );
    };

    /**
     * Enable floor reflection
     *
     * @param {Boolean} enable - Boolean flag to enable floor reflection.
     *
     * @returns {Promise} A promise resolved after enabling floor reflection.
     */
    self.enableFloorReflection = function( enable ) {
        return _viewerView.vqSceneMgr.enableFloorReflection( enable );
    };

    /**
     * Enable floor shadow
     *
     * @param {Boolean} enable - Boolean flag to enable floor shadow.
     *
     * @returns {Promise} A promise resolved after enabling floor shadow.
     */
    self.enableFloorShadow = function( enable ) {
        return _viewerView.vqSceneMgr.enableFloorShadow( enable );
    };

    /**
     * Enable global material
     *
     * @param {Boolean} enable - Boolean flag to enable global material.
     *
     * @returns {Promise} A promise resolved after enabling global material.
     */
    self.enableMaterials = function( enable ) {
        return _viewerView.vqSceneMgr.enableMaterials( enable );
    };

    /**
     * Enable material shading
     *
     * @param {Boolean} enable - Boolean flag to enable material shading.
     *
     * @returns {Promise} A promise resolved after enabling material shading.
     */
    self.enableTrueShade = function( enable ) {
        return _viewerView.vqSceneMgr.enableTrueShade( enable );
    };

    /**
     * Set material
     *
     * @param {Number} materialIndex - Material index.
     *
     * @returns {Promise} A promise resolved after setting material index.
     */
    self.setGlobalMaterial = function( materialIndex ) {
        return _viewerView.vqSceneMgr.setGlobalMaterial( materialIndex );
    };

    /**
     * To see if global materials are enabled or not.
     *
     * @return {Promise} Promise that resolves with a Boolean representing whether or not Global Material is being applied.
     */
    self.areMaterialsEnabled = function() {
        return _viewerView.vqSceneMgr.areMaterialsEnabled();
    };

    /**
     * Get current global material
     *
     * @return {Promise} Promise that resolves with current global material
     */
    self.getGlobalMaterial = function() {
        return _viewerView.vqSceneMgr.getGlobalMaterial();
    };

    /**
     * Get current floor plane orientation
     *
     * @return {Number} Returns the floor plane orientation in integer
     */
    self.getFloorPlaneOrientation = function() {
        return _viewerView.vqSceneMgr.getFloorPlaneOrientation();
    };

    /**
     * Get if floor is visible
     *
     * @return {Boolean} Is floor visible
     */
    self.getFloor = function() {
        return _viewerView.vqSceneMgr.getFloor();
    };

    /**
     * Get floor offset
     *
     * @return {Number} Returns floor offset value
     */
    self.getFloorOffset = function() {
        return _viewerView.vqSceneMgr.getFloorOffset();
    };

    /**
     * Get if floor grid is visible
     *
     * @return {Boolean} Is floor grid visible
     */
    self.getFloorGrid = function() {
        return _viewerView.vqSceneMgr.getFloorGrid();
    };

    /**
     * Get whether or not floor shadows are being applied
     *
     * @return {Promise} A promise that resolves with a Boolean representing whether or not floor shadows are being applied
     */
    self.isFloorShadowEnabled = function() {
        return _viewerView.vqSceneMgr.isFloorShadowEnabled();
    };

    /**
     * Get whether or not floor reflection is being applied
     *
     * @return {Promise} A promise that resolves with a Boolean representing whether or not floor reflection is being applied
     */
    self.isFloorReflectionEnabled = function() {
        return _viewerView.vqSceneMgr.isFloorReflectionEnabled();
    };

    /**
     * Get whether or not true shade is being applied
     *
     * @return {Promise} A promise that resolves with a Boolean representing whether or not true shade is being applied
     */
    self.isTrueShadeEnabled = function() {
        return _viewerView.vqSceneMgr.isTrueShadeEnabled();
    };
};

export default exports = {
    getVqSceneMgr
};
