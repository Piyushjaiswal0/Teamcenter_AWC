// Copyright (c) 2021 Siemens

/* global JSCom */

/**
 * This Volume service provider
 *
 * @module js/viewerVolumeManagerProvider
 */

import _ from 'lodash';
import assert from 'assert';
import AwPromiseService from 'js/awPromiseService';
import viewerSelMgrProvider from 'js/viewerSelectionManagerProvider';
import '@swf/ClientViewer';

/**
  * Provides an instance of viewer Volume manager
  *

  * @param {Object} viewerView Viewer view
  * @param {Object} viewerContextData Viewer Context data
  *
  * @return {ViewerVolumeManager} Returns viewer Volume manager
  */
let getVolumeManager = function(  viewerView, viewerContextData ) {
    return new ViewerVolumeManager( viewerView, viewerContextData );
};

const GEOANALYSIS_VIEWER_VOLUME = 'geoAnalysisVolumeSearch'; //$NON-NLS-1$
const GEOANALYSIS_VIEWER_VOLUME_TARGETLIST = 'targetList'; //$NON-NLS-1$
const GEOANALYSIS_VIEWER_VOLUME_TARGETLIST_LENGTH = 'targetListLength'; //$NON-NLS-1$
const GEOANALYSIS_VIEWER_VOLUME_USED_PCUID = 'usedProductContextUid'; //$NON-NLS-1$
const GEOANALYSIS_VIEWER_VOLUME_TARGETLIST_PKD_CSIDS = 'targetListPkdCsids'; //$NON-NLS-1$
const GEOANALYSIS_VIEWER_VOLUME_TARGET_CSID_LIST = 'targetCsidList'; //$NON-NLS-1$
const GEOANALYSIS_VIEWER_VOLUME_NEW_TARGET_FOR_LIST = 'newTargetForList';//$NON-NLS-1$
const GEOANALYSIS_VIEWER_VOLUME_CSID_TO_MO_PAIRS = 'csidToMOPairs';//$NON-NLS-1$


/**
  * Class to hold the viewer Volume data
  *
  * @constructor viewerVolumeManager
  *
  * @param {Object} viewerView Viewer view
  * @param {Object} viewerContextData Viewer Context data
  */
class ViewerVolumeManager {
    /**
      * ViewerVolumeManager class constructor
      *
      * @constructor ViewerVolumeManager
      *
      * @param {Object} viewerView Viewer view
      * @param {Object} viewerContextData Viewer Context data
      */
    constructor( viewerView, viewerContextData ) {
        assert( viewerView, 'Viewer view can not be null' );
        assert( viewerContextData, 'Viewer context data can not be null' );
        this.viewerView = viewerView;
        this.viewerContextData = viewerContextData;
        this.targetList = [];
        this.targetListLength = '';
        this.volumeState = null;
    }

    initialize( volumeState ) {
        this.setupAtomicDataTopicsOnPanelReveal();
        this.volumeState = volumeState;
    }

    /**
     * setupAtomicDataTopics ViewerMeasurementManager
     * @param {Object} volumeState volume atomic data
     */
    setupAtomicDataTopicsOnPanelReveal( ) {
        this.viewerContextData.getViewerAtomicDataSubject().subscribe( viewerSelMgrProvider.SELECTED_CSID_KEY, this );
        this.viewerContextData.getViewerAtomicDataSubject().subscribe( viewerSelMgrProvider.SELECTED_MODEL_OBJECT_KEY, this );
    }

    /**
     * Handle viewer atomic data update
     * @param {String} topic topic
     */
    update( topic ) {
        if( topic === viewerSelMgrProvider.SELECTED_CSID_KEY || topic === viewerSelMgrProvider.SELECTED_MODEL_OBJECT_KEY ) {
            let newVolumeState = { ...this.volumeState.getValue() };
            newVolumeState.updateTargetList = !newVolumeState.updateTargetList;
            this.volumeState.update( { ...newVolumeState } );
        }
    }

    /**
     * clean up on panel close
     */
    cleanUpVolumePanel() {
        this.unregisterAtomicDataTopics();
        this.volumeState = null;
    }

    /**
     * deregister for atomic data topics
     */
    unregisterAtomicDataTopics() {
        this.viewerContextData.getViewerAtomicDataSubject().unsubscribe( viewerSelMgrProvider.SELECTED_CSID_KEY, this );
        this.viewerContextData.getViewerAtomicDataSubject().unsubscribe( viewerSelMgrProvider.SELECTED_MODEL_OBJECT_KEY, this );
    }

    /**
     * compare target selection with current selection
     * @param {Object} occmgmtContext occmgmt context
     * @param {Object} volumeState local volume atomic data
     */
    comparetargetsWithSelections( occmgmtContext, volumeState ) {
        let targetList = [];
        let selectionList = [];
        let i = 0;

        let geoAnalysisVolumeSearchAtomicData = { ...volumeState.getValue() };

        if( geoAnalysisVolumeSearchAtomicData !== undefined && geoAnalysisVolumeSearchAtomicData.targetList !== undefined ) {
            for( ; i < geoAnalysisVolumeSearchAtomicData.targetList.length; i++ ) {
                targetList.push( geoAnalysisVolumeSearchAtomicData.targetList[ i ].uid );
            }
        }
        let occmgmtContextData = { ...occmgmtContext.getValue() };
        //Check current seelction
        var selections = this.getCurrentViewerSelections( );
        if( !Array.isArray( selections ) ) {
            geoAnalysisVolumeSearchAtomicData[GEOANALYSIS_VIEWER_VOLUME_NEW_TARGET_FOR_LIST] = false;
            volumeState.update( { ...geoAnalysisVolumeSearchAtomicData } );
            occmgmtContextData.volumePanelNeedsUpdate = false;
            occmgmtContext.update( { ...occmgmtContextData } );
            return;
        }

        for( i = 0; selections !== undefined && i < selections.length; i++ ) {
            selectionList.push( selections[ i ].uid );
        }

        var diff = _.difference( selectionList, targetList );

        if( diff.length === 0 ) {
            geoAnalysisVolumeSearchAtomicData[GEOANALYSIS_VIEWER_VOLUME_NEW_TARGET_FOR_LIST] = false;
            occmgmtContextData.volumePanelNeedsUpdate = false;
        } else {
            geoAnalysisVolumeSearchAtomicData[GEOANALYSIS_VIEWER_VOLUME_NEW_TARGET_FOR_LIST] = true;
            occmgmtContextData.volumePanelNeedsUpdate = true;
        }
        volumeState.update( { ...geoAnalysisVolumeSearchAtomicData } );
        occmgmtContext.update( { ...occmgmtContextData } );
    }

    /**
     * get current selected model object
     *
     * @returns {object} current selection model object
     */
    getCurrentViewerSelections(  ) {
        let viewerSelectionCSIDS = this.viewerContextData.getValueOnViewerAtomicData( viewerSelMgrProvider.SELECTED_CSID_KEY );
        if( _.isUndefined( viewerSelectionCSIDS ) || viewerSelectionCSIDS.length === 0 ) {
            return;
        }
        return this.viewerContextData.getValueOnViewerAtomicData( viewerSelMgrProvider.SELECTED_MODEL_OBJECT_KEY );
    }

    /**
      * Get target Occurrence list's clone stable UID chain for Volume
      * @param {Object} volumeState local volume atomic data
      * @return {String[]} clone stable UID chain list
      */
    static getVolumeTargetOccList( volumeState ) {
        let volumeStateValue = volumeState.getValue();
        let targetListPkdCsids = volumeStateValue[GEOANALYSIS_VIEWER_VOLUME_TARGETLIST_PKD_CSIDS];
        let occClsIdList = volumeStateValue[GEOANALYSIS_VIEWER_VOLUME_TARGET_CSID_LIST];

        // add packed ids as well
        if( targetListPkdCsids !== undefined && !_.isEmpty( targetListPkdCsids ) ) {
            for( var i = 0; i < targetListPkdCsids.length; i++ ) {
                occClsIdList.push( targetListPkdCsids[ i ] );
            }
        }

        return occClsIdList;
    }

    /*
      * execute Volume search
      * @param {Object} cVs corner values object
      * @returns {} promise
      */
    executeVolumeSearch( cVs ) {
        let deferred = AwPromiseService.instance.defer();
        let minVals = [ cVs[ 0 ], cVs[ 1 ], cVs[ 2 ] ];
        let maxVals = [ cVs[ 3 ], cVs[ 4 ], cVs[ 5 ] ];
        let valSetPromises = [];
        valSetPromises.push( this.viewerView.volumeMgr.setMin( minVals ) );
        valSetPromises.push( this.viewerView.volumeMgr.setMax( maxVals ) );

        return AwPromiseService.instance.all( valSetPromises ).then( () => {
            return this.viewerView.volumeMgr.execute().then( function() {
                //fetch and update the atomic data
                return deferred.resolve();
            } );
        } );
    }

    /*
      * Gets corner values based on target occurrences
      *
      * @param {Object} promise promise that resolves to corner values
      */
    getCornerValuesFromOccListInCtx( volumeState ) {
        let deferred = AwPromiseService.instance.defer();
        let occObjList = [];
        let occList = ViewerVolumeManager.getVolumeTargetOccList( volumeState );
        let newVolumeState = { ...volumeState.getValue() };
        if( !occList || occList.length === 0 ) {
            newVolumeState.X1 = undefined;
            newVolumeState.Y1 = undefined;
            newVolumeState.Z1 = undefined;
            newVolumeState.X2 = undefined;
            newVolumeState.Y2 = undefined;
            newVolumeState.Z2 = undefined;
            volumeState.update( { ...newVolumeState } );
            deferred.resolve( volumeState );
        }else{
            for( var idx = 0; idx < occList.length; idx++ ) {
                occObjList.push( this.viewerContextData.getViewerCtxSvc().createViewerOccurance( occList[ idx ] ) );
            }
        }


        this.viewerView.volumeMgr.updateVolumeFromOccurrenceList( occObjList ).then( function() {
            var valGetPromises = [];
            valGetPromises.push( this.viewerView.volumeMgr.getMin() );
            valGetPromises.push( this.viewerView.volumeMgr.getMax() );
            return AwPromiseService.instance.all( valGetPromises ).then( function( args ) {
                var minVals = args[ 0 ];
                var maxVals = args[ 1 ];
                newVolumeState.X1 = minVals[ 0 ];
                newVolumeState.Y1 = minVals[ 1 ];
                newVolumeState.Z1 = minVals[ 2 ];
                newVolumeState.X2 = maxVals[ 0 ];
                newVolumeState.Y2 = maxVals[ 1 ];
                newVolumeState.Z2 = maxVals[ 2 ];
                volumeState.update( { ...newVolumeState } );
                deferred.resolve( volumeState );
            } );
        }.bind( this ) );
        return deferred.promise;
    }

    /**
      * Sets new state of Volume box
      *
      * @param {Boolean} isOn On/Off
      */
    setVolumeFilterOnNative( isOn ) {
        this.viewerView.volumeMgr.setVisibility( isOn );
    }

    /**
      * Sets new state of Volume box
      *
      * @param {Object} cornerVals corner values in form of coordinates

      *
      */
    drawVolumeBox( cornerVals, volumeState ) {
        var minVals = [ cornerVals.X1, cornerVals.Y1, cornerVals.Z1 ];
        var maxVals = [ cornerVals.X2, cornerVals.Y2, cornerVals.Z2 ];
        var valSetPromises = [];
        valSetPromises.push( this.viewerView.volumeMgr.setMin( minVals ) );
        valSetPromises.push( this.viewerView.volumeMgr.setMax( maxVals ) );

        AwPromiseService.instance.all( valSetPromises ).then( ()=> {
            this.viewerView.volumeMgr.setVisibility( true ).then( ()=> {
                let newVolumeState = { ...volumeState.getValue() };
                newVolumeState.X1 = cornerVals.X1;
                newVolumeState.Y1 = cornerVals.Y1;
                newVolumeState.Z1 = cornerVals.Z1;
                newVolumeState.X2 = cornerVals.X2;
                newVolumeState.Y2 = cornerVals.Y2;
                newVolumeState.Z2 = cornerVals.Z2;
                volumeState.update( { ...newVolumeState } );
            } );
        } );
    }
}

export default {
    GEOANALYSIS_VIEWER_VOLUME,
    GEOANALYSIS_VIEWER_VOLUME_TARGETLIST,
    GEOANALYSIS_VIEWER_VOLUME_TARGETLIST_LENGTH,
    GEOANALYSIS_VIEWER_VOLUME_USED_PCUID,
    GEOANALYSIS_VIEWER_VOLUME_TARGETLIST_PKD_CSIDS,
    GEOANALYSIS_VIEWER_VOLUME_TARGET_CSID_LIST,
    GEOANALYSIS_VIEWER_VOLUME_NEW_TARGET_FOR_LIST,
    GEOANALYSIS_VIEWER_VOLUME_CSID_TO_MO_PAIRS,
    getVolumeManager
};
