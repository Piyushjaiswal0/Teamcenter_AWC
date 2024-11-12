// Copyright (c) 2021 Siemens

/**
 * This service manages the viewer selections
 *
 * @module js/viewerSelectionManagerProvider
 */
import AwTimeoutService from 'js/awTimeoutService';
import viewerContextService from 'js/viewerContext.service';
import _ from 'lodash';
import assert from 'assert';
import '@swf/ClientViewer';

/**
 * Provides an instance of viewer selection manager
 *
 * @param {Object} viewerView viewer view handle
 * @param {Object} viewerContextData viewer context data reference
 *
 * @return {ViewerSelectionManager} Returns viewer selection manager
 */
var getViewerSelectionManager = function( viewerView, viewerContextData ) {
    return new ViewerSelectionManager( viewerView, viewerContextData );
};

const SELECTED_MODEL_OBJECT_KEY = 'selectedModelObjects';
const SELECTED_CSID_KEY = 'selectedCsids';
const SELECTED_PARTITION_CSID_KEY = 'selectedPartitionCsids';

/**
 * Class to hold the viewer selection data
 */
class ViewerSelectionManager {
    /**
     * Class to hold the viewer selection data
     *
     * @constructor ViewerSelectionManager
     *
     * @param {Object} viewerView viewer view handle
     * @param {Object} viewerContextData viewer context data reference
     */
    constructor( viewerView, viewerContextData ) {
        assert( viewerView, 'Viewer view can not be null' );
        assert( viewerContextData, 'Viewer context data can not be null' );
        this.viewerView = viewerView;
        this.viewerContextData = viewerContextData;
        this.viewerSelectionChangedListeners = [];
        this.is3DInitiatedSelection = false;
        this.is3DInitiatedSelectionCounter = 0;
        this.rapidSelectionTimeout = null;
        this.initialize();
    }

    /**
     * Initialize viewer selection manager
     */
    initialize() {
        this.viewerView.selectionMgr.addSelectionListener( occurrences => {
            const occCSIDChains = [];
            const bomLineSRUIDs = [];
            if( occurrences ) {
                _.forEach( occurrences, function( occurrence ) {
                    let occTheStr = _.endsWith( occurrence.theStr, '/' ) ? occurrence.theStr.substring( 0, occurrence.theStr.lastIndexOf( '/' ) ) : occurrence.theStr;
                    if( occurrence.sruid || occTheStr ) {
                        if( occurrence.sruid !== undefined ) {
                            bomLineSRUIDs.push( occurrence.sruid );
                        }
                        occCSIDChains.push( occTheStr );
                    }
                } );
                this.notifyViewerSelectionChanged( occCSIDChains, bomLineSRUIDs );
            }
        } );
    }

    /**
     * Set picking filter
     *
     * @param {boolean} pickingMode the picking mode
     */
    setPickingMode( pickingMode ) {
        this.viewerView.selectionMgr.setPickingMode( pickingMode );
    }

    /**
     * Set selection enabled or disabled
     *
     * @param {boolean} isEnabled should selection be enabled
     */
    setSelectionEnabled( isEnabled ) {
        this.viewerView.selectionMgr.setSelectionEnabled( isEnabled );
    }

    /**
     * Set if selection is initiated in 3D
     *
     * @param {boolean} isEnabled true if selection is initiated in 3D
     */
    setIs3DInitiatedSelection( isEnabled ) {
        this.is3DInitiatedSelection = isEnabled;
    }

    /**
     * Get if selection is initiated in 3D
     * @returns {Boolean} true if selection is initiated in 3D
     */
    getIs3DInitiatedSelection() {
        return this.is3DInitiatedSelection;
    }

    /**
     * Set counter if selection is initiated in 3D
     * @param {Boolean} isAdd true if selection is initiated in 3D
     */
    set3DInitiatedSelectionCounter( isAdd ) {
        if( isAdd ) {
            this.is3DInitiatedSelectionCounter += 1;
            this.resetRapidSelectionCounter();
        } else {
            this.is3DInitiatedSelectionCounter -= 1;
        }
    }

    /**
     * Get if selection counter
     * @returns {Number} current counter
     */
    getIs3DInitiatedSelectionCounter() {
        return this.is3DInitiatedSelectionCounter;
    }

    /**
     * Get selected model objects
     *
     * @return {Array} Array of selected model objects
     */
    getSelectedModelObjects() {
        return this.viewerContextData.getValueOnViewerAtomicData( SELECTED_MODEL_OBJECT_KEY );
    }

    /**
     * Get selected csids
     *
     * @return {Array} Array of selected csids
     */
    getSelectedCsids() {
        return this.viewerContextData.getValueOnViewerAtomicData( SELECTED_CSID_KEY );
    }

    /**
     * Get selected csids
     *
     * @return {Array} Array of selected partition csids
     */
    getSelectedPartitionCsids() {
        return this.viewerContextData.getValueOnViewerAtomicData( SELECTED_PARTITION_CSID_KEY );
    }

    /**
     * Select parts in viewer using Model objects
     *
     * @param {Array} modelObjectsArray List of Model Objects to be selected in viewer
     */
    selectPartsInViewerUsingModelObject( modelObjectsArray ) {
        // We need to add a new server side SOA call that will return the csid chain for given model objects
        if( this.checkIfModelObjectSelectionsAreEqual( modelObjectsArray ) ) {
            return;
        }
        this.viewerContextData.updateViewerAtomicData( SELECTED_MODEL_OBJECT_KEY, modelObjectsArray );
    }

    /**
     * Select parts in viewer using CSID
     *
     * @param {Array} csidChainArray List of CSIDs to be selected in viewer
     */
    selectPartsInViewerUsingCsid( csidChainArray ) {
        if( this.checkIfCsidSelectionsAreEqual( csidChainArray ) ) {
            if( _.isNull( csidChainArray ) || _.isUndefined( csidChainArray ) || !Array.isArray( csidChainArray ) ||  Array.isArray( csidChainArray ) && csidChainArray.length === 0  ) {
                this.viewerContextData.updateViewerAtomicData( SELECTED_PARTITION_CSID_KEY, [] );
            }
            return;
        }
        this.selectPartsInViewer( csidChainArray );
    }

    /**
     * Select parts in viewer using CSID
     *
     * @param {Array} csidChainArray List of CSIDs to be selected in viewer
     */
    selectPartsInViewer( csidChainArray ) {
        this.selectPartsInViewerUsingCsidWithPartitions( csidChainArray );
    }

    /**
     * Select parts and partitions in viewer using CSID
     *
     * @param {Array} csidChainArray List of CSIDs to be selected in viewer
     * @param {Array} partitionChainArray List of CSIDs to be selected in viewer
     *
     * @returns {Promise} A promise that is resolved after selection
     */
    selectPartsInViewerUsingCsidWithPartitions( csidChainArray, partitionChainArray ) {
        var occurrences = [];
        if( Array.isArray( partitionChainArray ) && partitionChainArray.length > 0 ) {
            _.forEach( partitionChainArray, function( partitionChain ) {
                var occ = viewerContextService.createViewerPartitionOccurance( partitionChain );
                occurrences.push( occ );
            } );
        }
        this.viewerContextData.updateViewerAtomicData( SELECTED_CSID_KEY, csidChainArray );
        this.viewerContextData.updateViewerAtomicData( SELECTED_PARTITION_CSID_KEY, partitionChainArray );
        _.forEach( csidChainArray, function( csidChain ) {
            let occ = null;
            if( partitionChainArray && Array.isArray( partitionChainArray ) && partitionChainArray.length > 0 ) {
                if( !_.includes( partitionChainArray, csidChain ) ) {
                    occ = viewerContextService.createViewerOccurance( csidChain, this.viewerContextData );
                    occurrences.push( occ );
                }
            } else {
                occ = viewerContextService.createViewerOccurance( csidChain, this.viewerContextData );
                occurrences.push( occ );
            }
        }.bind( this ) );

        return this.viewerView.selectionMgr.select( occurrences );
    }

    /**
     * Add viewer selection changed listener
     *
     * @param {Object} observerFunction function to be registered
     */
    addViewerSelectionChangedListener( observerFunction ) {
        if( typeof observerFunction === 'function' ) {
            this.viewerSelectionChangedListeners.push( observerFunction );
        }
    }

    /**
     * remove viewer selection changed listener
     *
     * @param {Object} observerFunction function to be removed
     */
    removeViewerSelectionChangedListener( observerFunction ) {
        if( typeof observerFunction === 'function' ) {
            let indexToBeRemoved = this.viewerSelectionChangedListeners.indexOf( observerFunction );
            if( indexToBeRemoved > -1 ) {
                this.viewerSelectionChangedListeners.splice( indexToBeRemoved, 1 );
            }
        }
    }

    /**
     * set multi-select mode in viewer
     *
     * @param {Boolean} isMultiSelectEnabled true if multi-selection should be enabled in viewer
     */
    setMultiSelectModeInViewer( isMultiSelectEnabled ) {
        this.viewerView.selectionMgr.setMultiSelectState( isMultiSelectEnabled );
    }

    /**
     * Check if selections are equal
     *
     * @param {Array} csidChainArray Array of CSID chain of selected occurrences
     * @returns {boolean} true if csid chanins are equal
     */
    checkIfCsidSelectionsAreEqual( csidChainArray ) {
        let currentlySelectedCSIDs = this.getSelectedCsids();
        if( !currentlySelectedCSIDs || _.xor( csidChainArray, currentlySelectedCSIDs ).length !== 0 ) {
            return false;
        }
        return true;
    }

    /**
     * Check if selections are equal
     * @param {Array} modelObjectsArray Array of selected model objects
     * @returns {boolean} true if model objects are equal
     */
    checkIfModelObjectSelectionsAreEqual( modelObjectsArray ) {
        let currentlySelectedModelObjects = this.getSelectedModelObjects();
        if( !currentlySelectedModelObjects || _.xor( modelObjectsArray, currentlySelectedModelObjects ).length !== 0 ) {
            return false;
        }
        return true;
    }

    /**
     * Notify viewer selection changed listener
     *
     * @param {Array} occCSIDChains Array of CSID chain of selected occurrences
     * @param {Array} bomLineSRUIDs Array of BLSRUids of selected occurrences
     */
    notifyViewerSelectionChanged( occCSIDChains, bomLineSRUIDs ) {
        this.viewerContextData.updateViewerAtomicData( SELECTED_CSID_KEY, occCSIDChains );
        this.set3DInitiatedSelectionCounter( true );
        if( this.viewerSelectionChangedListeners.length > 0 ) {
            _.forEach( this.viewerSelectionChangedListeners, function( observer ) {
                observer.call( this.viewerContextData, occCSIDChains, bomLineSRUIDs );
            }.bind( this ) );
        }
    }

    /**
     * Reset rapid selection counter
     */
    resetRapidSelectionCounter() {
        if( !_.isNull( this.rapidSelectionTimeout ) ) {
            AwTimeoutService.instance.cancel( this.rapidSelectionTimeout );
        }
        this.rapidSelectionTimeout = AwTimeoutService.instance( () => {
            this.is3DInitiatedSelectionCounter = 0;
        }, 3000 );
    }

    /**
     * Set context in viewer
     *
     * @param {Array} csidChainArray List of CSIDs to be set as context in viewer
     */
    setContext( csidChainArray ) {
        this.viewerContextData.updateViewerAtomicData( SELECTED_CSID_KEY, csidChainArray );
        var occurrences = [];
        _.forEach( csidChainArray, function( csidChain ) {
            var occ = viewerContextService.createViewerOccurance( csidChain, this.viewerContextData );
            occurrences.push( occ );
        }.bind( this ) );
        this.viewerView.selectionMgr.select( [] );
        this.viewerContextData.getThreeDViewManager().setContext( occurrences );
    }

    /**
     * Viewer selection display style
     *
     * @param {SelectionDisplayStyle} selectionDisplayStyle selection display style to be applied
     */
    setViewerSelectionDisplayStyle( selectionDisplayStyle ) {
        this.viewerContextData.getThreeDViewManager().setSelectionDisplayStyle( selectionDisplayStyle );
    }

    /**
     * Viewer context display style
     *
     * @param {ContextDisplayStyle} contextDisplayStyle context display style to be applied
     */
    setViewerContextDisplayStyle( contextDisplayStyle ) {
        this.viewerContextData.getThreeDViewManager().setContextDisplayStyle( contextDisplayStyle );
    }
}

export default {
    getViewerSelectionManager,
    SELECTED_MODEL_OBJECT_KEY,
    SELECTED_CSID_KEY,
    SELECTED_PARTITION_CSID_KEY
};
