// Copyright (c) 2021 Siemens

/**
 * This Session service provider
 *
 * @module js/viewerSessionManagerProvider
 */
import AwPromiseService from 'js/awPromiseService';
import assert from 'assert';
import '@swf/ClientViewer';

/**
 * Provides an instance of viewer Session manager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {ViewerSessionManager} Returns viewer Session manager
 */
export let getSessionManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    return new ViewerSessionManager( viewerCtxNamespace, viewerView, viewerContextData );
};

/**
 * Class to hold the viewer Session data
 *
 * @constructor ViewerSessionManager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */
var ViewerSessionManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    assert( viewerContextData, 'Viewer context data can not be null' );

    var self = this;
    var _viewerContextNamespace = viewerCtxNamespace;
    var _viewerView = viewerView;
    var _viewerContextData = viewerContextData;

    /**
     * create session
     * @param {String} ccUid CCObject uid
     * @param {String} pciUid PCI uid
     * @param {String} last_mod_date last modified date
     * @return {Promise} promise
     */
    self.updateAppSession = function( ccUid, pciUid, last_mod_date ) {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.sessionMgr.updateAppSession( ccUid, pciUid, last_mod_date )
            .then( function() {
                deferred.resolve();
            } )
            .catch( function( err ) {
                deferred.reject( err );
            } );
        return deferred.promise;
    };

    /**
     * Save Bookmark
     *
     * @return {Promise} promise
     */
    self.saveAutoBookmark = function() {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.sessionMgr.saveBookMark()
            .then( function() {
                deferred.resolve();
            } )
            .catch( function( err ) {
                deferred.reject( err );
            } );
        return deferred.promise;
    };

    /**
     * Apply Bookmark
     *
     * @return {Promise} promise
     */
    self.applyAutoBookmark = function() {
        return _viewerView.sessionMgr.applyBookMark();
    };

    /**
     * Disable autobookamark
     *
     * @return {Promise} promise
     *
     * @param {Boolean} disable disables bookmark if passed true
     */
    self.disableBookmark = function( disable ) {
        return _viewerView.sessionMgr.disableBookMark( disable );
    };
    /**
     * Update Teamcenter Product Snapshot with TcVis session data
     *
     * @return {Promise} promise
     *
     * @param {snapshotUID} - UID of the created Teamcenter Product Snapshot
     */
    self.updateProductSnapshot = function( snapshotUID ) {
        var deferred = AwPromiseService.instance.defer();
        /* JSComm API name might change in future */
        _viewerView.sessionMgr.updateTCSnapshot( snapshotUID, '' )
            .then( function() {
                deferred.resolve();
            } )
            .catch( function( err ) {
                deferred.reject( err );
            } );
        return deferred.promise;
    };

    /**
     * Apply Teamcenter Product Snapshot with Vis session data
     *
     * @return {Promise} promise
     *
     * @param {snapshotUID} - UID of the created Teamcenter Product Snapshot
     * @param {pciUid} - UID of current PCI
     * @param {Boolean} applyFilterFlag - flag that returns true if there are filters on either side of the snapshot
     */
    self.applyProductSnapshot = function( snapshotUID, pciUid, applyFilterFlag ) {
        var deferred = AwPromiseService.instance.defer();
        _viewerContextData.getDynamicUpdateMgr().applyTCSnapshot( snapshotUID, pciUid, applyFilterFlag )
            .then( function() {
                deferred.resolve();
            } )
            .catch( function( err ) {
                deferred.reject( err );
            } );
        return deferred.promise;
    };
};

export default {
    getSessionManager
};
