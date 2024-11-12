// Copyright (c) 2022 Siemens

/**
 * This Performance service provider
 *
 * @module js/viewerPerformanceManagerProvider
 */
import AwPromiseService from 'js/awPromiseService';
import assert from 'assert';

var exports = {};

/**
 * Provides an instance of viewer Performance manager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {viewerPerfromanceManager} Returns viewer Performance manager
 */

export let getPerformanceManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    return new ViewerPerformanceManager( viewerCtxNamespace, viewerView, viewerContextData );
};

/**
 * Class to hold the viewer Performance data
 *
 * @constructor ViewerPerformanceManager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */

var ViewerPerformanceManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    assert( viewerContextData, 'Viewer context data can not be null' );

    var self = this;
    var _viewerContextNamespace = viewerCtxNamespace;
    var _viewerView = viewerView;
    var _viewerContextData = viewerContextData;

    /**
     * Retrieves whether or not moving frame culling should use size culling
     *
     * @returns {promise} promise
     */

    self.getMovingFrameCullingUseSizeCulling = function() {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.performanceMgr.getMovingFrameCullingUseSizeCulling()
            .then( function( result ) {
                deferred.resolve( result );
            }, function( reason ) {
                deferred.reject( reason );
            } );
        return deferred.promise;
    };

    /**
     * Retrieves whether or not moving frame culling is enabled
     *
     * @returns {promise} promise
     */
    self.getMovingFrameScreenSizeCullingEnabled = function() {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.performanceMgr.getMovingFrameScreenSizeCullingEnabled()
            .then( function( result ) {
                deferred.resolve( result );
            }, function( reason ) {
                deferred.reject( reason );
            } );
        return deferred.promise;
    };

    /**
     * Returns the threshold used to decide when an object is culled
     *
     * @returns {promise} promise
     */
    self.getMovingFrameScreenSizeCullingObjectThreshold = function() {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.performanceMgr.getMovingFrameScreenSizeCullingObjectThreshold()
            .then( function( objHeight ) {
                deferred.resolve( objHeight );
            }, function( reason ) {
                deferred.reject( reason );
            } );
        return deferred.promise;
    };

    /**
     * Retrieves whether or not still frame culling is enabled
     *
     * @returns {promise} promise
     */
    self.getStillFrameScreenSizeCullingEnabled = function() {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.performanceMgr.getStillFrameScreenSizeCullingEnabled()
            .then( function( result ) {
                deferred.resolve( result );
            }, function( reason ) {
                deferred.reject( reason );
            } );
        return deferred.promise;
    };

    /**
     * Returns the threshold used to decide when an object is culled
     *
     * @returns {promise} promise
     */

    self.getStillFrameScreenSizeCullingObjectThreshold = function() {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.performanceMgr.getStillFrameScreenSizeCullingObjectThreshold()
            .then( function( objHeight ) {
                deferred.resolve( objHeight );
            }, function( reason ) {
                deferred.reject( reason );
            } );
        return deferred.promise;
    };

    /**
     * Sets whether or not moving frame culling should use size culling
     *
     * @return {promise} promise
     */
    self.setMovingFrameCullingUseSizeCulling = function( enable ) {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.performanceMgr.setMovingFrameCullingUseSizeCulling( enable )
            .then( function( result ) {
                deferred.resolve( result );
            }, function( reason ) {
                deferred.reject( reason );
            } );
        return deferred.promise;
    };

    /**
     * Enable or disables moving frame culling
     *
     * @returns {promise} promise
     */
    self.setMovingFrameScreenSizeCullingEnabled = function( enable ) {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.performanceMgr.setMovingFrameScreenSizeCullingEnabled( enable )
            .then( function( result ) {
                deferred.resolve( result );
            }, function( reason ) {
                deferred.reject( reason );
            } );
        return deferred.promise;
    };

    /**
     * Sets threshold which is used to decide when to cull an object in case of moving frame
     *
     * @returns {promise} promise
     */

    self.setMovingFrameScreenSizeCullingObjectThreshold = function( newHeightInPercent ) {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.performanceMgr.setMovingFrameScreenSizeCullingObjectThreshold( newHeightInPercent )
            .then( function( result ) {
                deferred.resolve( result );
            }, function( reason ) {
                deferred.reject( reason );
            } );
        return deferred.promise;
    };

    /**
     * Enables or disables still frame culling
     *
     * @returns {promise} promise
     */

    self.setStillFrameScreenSizeCullingEnabled = function( enable ) {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.performanceMgr.setStillFrameScreenSizeCullingEnabled( enable )
            .then( function( result ) {
                deferred.resolve( result );
            }, function( reason ) {
                deferred.reject( reason );
            } );
        return deferred.promise;
    };

    /**
     * Sets threshold which is used to decide when to cull an object
     *
     * @returns {promise} promise
     */

    self.setStillFrameScreenSizeCullingObjectThreshold = function( newHeightInPercent ) {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.performanceMgr.setStillFrameScreenSizeCullingObjectThreshold( newHeightInPercent )
            .then( function( result ) {
                deferred.resolve( result );
            }, function( reason ) {
                deferred.reject( reason );
            } );
        return deferred.promise;
    };

    /**
     * Sets occlusion culling mode into bounding box scanner
     * @param {Number} cullingMode occlusion culling mode
     */
    self.setOcclusionCulling = function( cullingMode ) {
        _viewerView.performanceMgr.setOcclusionCulling( cullingMode );
    };
};

export default exports = {
    getPerformanceManager
};
