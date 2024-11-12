// Copyright (c) 2021 Siemens

/**
 * This Snapshot service provider
 *
 * @module js/viewerSnapshotManagerProvider
 */
import AwPromiseService from 'js/awPromiseService';
import assert from 'assert';
import viewerContextService from 'js/viewerContext.service';
import contributionService from 'js/contribution.service';
import logger from 'js/logger';

import '@swf/ClientViewer';

/**
 * Snapshot module installed state
 */
let snapshotModuleInstalled = null;

/**
 * Provides an instance of viewer Snapshot manager
 *
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {ViewerSnapshotManager} Returns viewer Snapshot manager
 */
export let getSnapshotManager = function( viewerView, viewerContextData ) {
    if( snapshotModuleInstalled === null ) {
        checkIfSnapshotModuleInstalled();
    }
    return new ViewerSnapshotManager( viewerView, viewerContextData );
};

/**
* check if snapshot module Installed
*/
let checkIfSnapshotModuleInstalled = function() {
    contributionService.loadContributions( 'createSnapshotService' ).then( function( depModule ) {
        if( Array.isArray( depModule ) && depModule.length > 0 ) {
            snapshotModuleInstalled = true;
        } else {
            snapshotModuleInstalled = false;
        }
    } ).catch( error => {
        logger.info( 'Failed to get the snapshot contribution : ' + error );
        snapshotModuleInstalled = false;
    } );
};

/**
 * Class to hold the viewer Snapshot data
 *
 * /
 */
class ViewerSnapshotManager {
    /*
     * @constructor ViewerSnapshotManager
     *
     * @param {Object} viewerView Viewer view
     * @param {Object} viewerContextData Viewer Context data
     */
    constructor( viewerView, viewerContextData ) {
        assert( viewerContextData, 'Viewer context data can not be null' );
        this.viewerView = viewerView;
        this.viewerContextData = viewerContextData;
        this.setupAtomicDataTopics();
    }

    /**
     * setupAtomicDataTopics ViewerMeasurementManager
     */
    setupAtomicDataTopics() {
        this.viewerContextData.getViewerAtomicDataSubject().subscribe( viewerContextService.VIEWER_VIEW_MODE_TOKEN, this );
        this.viewerContextData.getViewerAtomicDataSubject().subscribe( viewerContextService.VIEWER_VISIBILITY_TOKEN, this );
    }

    /**
     * Handle viewer atomic data update
     * @param {String} topic topic
     * @param {Object} data updated data
     */
    update( topic ) {
        let viewerViewMode = this.viewerContextData.getViewerAtomicData().getValue().viewerViewMode;
        let isViewerRevealed = this.viewerContextData.getViewerAtomicData().getValue().isViewerRevealed;
        if( ( topic === viewerContextService.VIEWER_VIEW_MODE_TOKEN || topic === viewerContextService.VIEWER_VISIBILITY_TOKEN ) && viewerViewMode === 'VIEWER3D' && isViewerRevealed === true ) {
            this.viewerContextData.updateViewerAtomicData( 'snapshotModuleInstalled', snapshotModuleInstalled );
        }
    }

    /**
     * Create snapshot
     *
     * @return {Promise} promise
     */
    createSnapshot() {
        var deferred = AwPromiseService.instance.defer();
        this.viewerView.snapshotMgr.CreateSnapshot()
            .then( function( newSnapshotObject ) {
                deferred.resolve( newSnapshotObject );
            } )
            .catch( function( err ) {
                deferred.reject( err );
            } );
        return deferred.promise;
    }

    /**
     * Fetches snapshots from server
     * @return {Promise} promise
     */
    getAllSnapshots() {
        var deferred = AwPromiseService.instance.defer();
        this.viewerView.snapshotMgr.getAllSnapshots()
            .then( function( snapshotList ) {
                deferred.resolve( snapshotList );
            } )
            .catch( function( err ) {
                deferred.reject( err );
            } );
        return deferred.promise;
    }

    /**
     * Deletes all snapshots
     * @return {Promise} promise
     */
    deleteAllSnapshots() {
        var deferred = AwPromiseService.instance.defer();
        this.viewerView.snapshotMgr.getAllSnapshots()
            .then( function( snapshotList ) {
                return snapshotList.deleteAllSnapshots();
            } )
            .then( function() {
                deferred.resolve();
            } ).catch( function( err ) {
                deferred.reject( err );
            } );
        return deferred.promise;
    }
}

export default {
    getSnapshotManager
};
