// Copyright (c) 2021 Siemens

/**
 * This service is create viewer visibility
 *
 * @module js/viewerVisibilityManagerProvider
 */
import AwPromiseService from 'js/awPromiseService';
import msgSvc from 'js/messagingService';
import localeSvc from 'js/localeService';
import _ from 'lodash';
import assert from 'assert';
import '@swf/ClientViewer';
// import 'manipulator';
import ViewerVisibilityCoreManager from 'js/viewerVisibilityCoreManager';

export const VIEWER_INVISIBLE_CSID_TOKEN = 'AllInvisibleCSIDs';
export const VIEWER_INVISIBLE_EXCEPTION_CSID_TOKEN = 'AllInvisibleExceptionCSIDs';

/**
 * Class to hold the viewer context data
 *
 * @constructor ViewerVisibilityManager
 *
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */
export default class ViewerVisibilityManager extends ViewerVisibilityCoreManager {
    constructor( viewerView, viewerContextData ) {
        assert( viewerContextData, 'Viewer context data can not be null' );
        super();
        var self = this;
        this.viewerView = viewerView;
        this.viewerContextData = viewerContextData;
        this.viewerVisibilityChangedListeners = [];
        this.viewerVisibilityListener = null;

        /**
         * Adding empty viewer event listener that is notified when the 3D viewer is empty after a search operation.
         */
        this.viewerView.visibilityMgr.addEmptyViewerListener( {
            emptyViewerEvent: function( emptyViewerName ) {
                if( emptyViewerName === 'TcVisEmptyViewerWarning' ) {
                    self._showEmptyViewerWarningMessage();
                }
            }
        } );

        /**
         * Adding empty viewer event listener that is notified when the 3D viewer is empty after Selected On\Off operations.
         */
        this.viewerView.searchMgr.addSearchResultsListener( {
            noResultsEvent: function() {
                self._showEmptyViewerWarningMessage();
            }
        } );

        this.setUpVisibilityListener( viewerContextData, viewerView );
    }

    /**
     * Set up visibility listener in viewer
     * @param {Object} viewerContextData Viewer Context data
     * @param {Object} viewerView Viewer view
     */
    setUpVisibilityListener( viewerContextData, viewerView ) {
        let self = this;
        /**
         * Viewer visibility changed listener
         */
        this.viewerVisibilityListener = {
            visibilityTurnedOn: function( occurrences ) {
                _handleVisibilityOfOccurrencesFromViewer( occurrences, true, false );
            },
            visibilityTurnedOff: function( occurrences ) {
                _handleVisibilityOfOccurrencesFromViewer( occurrences, false, false );
            },
            updateVisibleState: function( occurrences ) {
                if( occurrences.length === 0 ) {
                    occurrences.push( self.viewerContextData.getViewerCtxSvc().createViewerOccurance( '', self.viewerContextData ) );
                    _handleVisibilityOfOccurrencesFromViewer( occurrences, false, true );
                } else {
                    _handleVisibilityOfOccurrencesFromViewer( occurrences, true, true );
                }
            }
        };

        /**
         * Handle visibility of occurrences from viewer
         *
         * @param {Array} occsFromViewer Array of CSID chain of occurrences
         * @param {Boolean} visibilityToSet visibility to set
         * @param {Boolean} isStateChange is state change
         */
        function _handleVisibilityOfOccurrencesFromViewer( occsFromViewer, visibilityToSet, isStateChange ) {
            if( !Array.isArray( occsFromViewer ) || occsFromViewer.length <= 0 ) {
                return;
            }

            var occurrencesFromViewer = [];
            _.forEach( occsFromViewer, function( occurrence ) {
                if( occurrence.type === 1 ) {
                    var occCSIDChain = occurrence.theStr;
                    if( _.endsWith( occCSIDChain, '/' ) ) {
                        occCSIDChain = occCSIDChain.slice( 0, -1 );
                    }
                    occurrencesFromViewer.push( occCSIDChain );
                }
            } );

            if( occurrencesFromViewer.length <= 0 ) {
                return;
            }
            //Always process root irrespective of isStateChange.
            if( occurrencesFromViewer.length === 1 && occurrencesFromViewer[ 0 ] === self.ROOT_ID ) {
                self.clearVisibility();
                if( visibilityToSet ) {
                    self.invisibleExceptionCsids.push( self.ROOT_ID );
                } else {
                    self.invisibleCsids.push( self.ROOT_ID );
                }
            } else {
                if( isStateChange ) {
                    self.clearVisibility();
                    if( visibilityToSet ) {
                        // If this is state change we need to change Root Visibility because
                        // Viewer does not send notification what parts are turned on/off
                        // when user does Volume and Proximity search.
                        self.invisibleCsids.push( self.ROOT_ID );
                    } else {
                        self.invisibleExceptionCsids.push( self.ROOT_ID );
                    }
                }
                for( var i = 0; i < occurrencesFromViewer.length; i++ ) {
                    self.updateVisibilityAllChildrenOfGivenOccurrence( occurrencesFromViewer[ i ], visibilityToSet );
                }
            }
            let visibilityData = {
                occurrencesFromViewer: occurrencesFromViewer,
                visibilityToSet: visibilityToSet,
                isStateChange: isStateChange,
                invisibleCsids: Object.values( self.invisibleCsids ),
                invisibleExceptionCsids: Object.values( self.invisibleExceptionCsids ),
                invisiblePartitionIds: Object.values( self.invisiblePartitionIds )
            };
            self._notifyViewerVisibilityChanged( visibilityData );
        }

        viewerView.visibilityMgr.addVisibilityListener( this.viewerVisibilityListener );
        viewerContextData.updateViewerAtomicData( VIEWER_INVISIBLE_CSID_TOKEN, [ ...this.invisibleCsids ] );
        viewerContextData.updateViewerAtomicData( VIEWER_INVISIBLE_EXCEPTION_CSID_TOKEN, [ ...this.invisibleExceptionCsids ] );
    }
    /**
     * toggle part viewer visibility
     *
     * @param {String} csidChain csid chain of the model object
     * @returns {Boolean} finalVisibility
     */
    toggleProductViewerVisibility( csidChain ) {
        var initialVisibility = this.getProductViewerVisibility( csidChain );
        var finalVisibility = null;
        finalVisibility = this.processVisibility( initialVisibility, finalVisibility, csidChain, true );
        this.viewerContextData.updateViewerAtomicData( VIEWER_INVISIBLE_CSID_TOKEN, [ ...this.invisibleCsids ] );
        this.viewerContextData.updateViewerAtomicData( VIEWER_INVISIBLE_EXCEPTION_CSID_TOKEN, [ ...this.invisibleExceptionCsids ] );
        this.setPartsVisibility( [ csidChain ], [], finalVisibility === this.VISIBILITY.VISIBLE, false );
        return finalVisibility;
    }

    /**
     * toggle part viewer visibility
     *
     * @param {String} partitionChain csid chain of the model object
     * @returns {Boolean} partitionVisibility
     */
    togglePartitionPartVisibility( partitionChain ) {
        var initialVisibility = this.getPartitionVisibility( partitionChain );
        var finalVisibility = null;
        finalVisibility = this.processPartitionVisibility( initialVisibility, finalVisibility, partitionChain, true );
        this.setPartitionPartsVisibility( [ partitionChain ], finalVisibility === this.VISIBILITY.VISIBLE, false );
        return finalVisibility;
    }

    /**
     * Set packed occurence visibility based on the visbility flag input.
     *
     * @param {String} csidChain csid chain of the model object
     * @param {Boolean} visibility Visibility to be applied on the packed occurences.
     */
    setPackedPartsVisibility( csidChain, visibility ) {
        var initialVisibility = this.getProductViewerVisibility( csidChain );
        var finalVisibility = null;
        if( visibility ) {
            finalVisibility = 'VISIBLE';
        } else {
            finalVisibility = 'INVISIBLE';
        }
        this.processVisibility( initialVisibility, finalVisibility, csidChain, false );
        this.viewerContextData.updateViewerAtomicData( VIEWER_INVISIBLE_CSID_TOKEN, [ ...this.invisibleCsids ] );
        this.viewerContextData.updateViewerAtomicData( VIEWER_INVISIBLE_EXCEPTION_CSID_TOKEN, [ ...this.invisibleExceptionCsids ] );
        this.setPartsVisibility( [ csidChain ], [], finalVisibility === this.VISIBILITY.VISIBLE, false );
    }

    /**
     * set part viewer visibility
     *
     * @param {Array} csidChains csid chains of the model objects
     * @param {Array} partitionCsidChains csid chains of the model objects
     * @param {Boolean} isVisible should be made visible or turned off
     * @param {Boolean} notifyChange should viewer notification be fired
     * @param {Object} visibilityDataCache visibility data cache from other viewer
     * @return {Promise} A promise that is resolved or rejected when the operation has completed.
     */
    setPartsVisibility( csidChains, partitionCsidChains, isVisible, notifyChange, visibilityDataCache ) {
        let isNotifyChange = false;
        if( !_.isUndefined( notifyChange ) && !_.isNull( notifyChange ) && typeof notifyChange === 'boolean' ) {
            isNotifyChange = notifyChange;
        }
        let occurrences = [];
        _.forEach( csidChains, function( csidChain ) {
            let occ = null;
            if( partitionCsidChains && Array.isArray( partitionCsidChains ) && partitionCsidChains.length > 0 ) {
                if( !_.includes( partitionCsidChains, csidChain ) ) {
                    occ = this.viewerContextData.getViewerCtxSvc().createViewerOccurance( csidChain, this.viewerContextData );
                    occurrences.push( occ );
                }
            } else {
                occ = this.viewerContextData.getViewerCtxSvc().createViewerOccurance( csidChain, this.viewerContextData );
                occurrences.push( occ );
            }
        }.bind( this ) );
        if( partitionCsidChains && Array.isArray( partitionCsidChains ) && partitionCsidChains.length > 0 ) {
            _.forEach( partitionCsidChains, function( prtnCsidChain ) {
                let occ = this.viewerContextData.getViewerCtxSvc().createViewerPartitionOccurance( prtnCsidChain );
                occurrences.push( occ );
            }.bind( this ) );
        }
        if( csidChains && Array.isArray( csidChains ) && _.includes( csidChains, this.ROOT_ID ) ) {
            this.invisiblePartitionIds.length = 0;
        }
        if( visibilityDataCache ) {
            this.invisibleCsids = visibilityDataCache.invisibleCsids;
            this.invisibleExceptionCsids = visibilityDataCache.invisibleExceptionCsids;
            this.invisiblePartitionIds = visibilityDataCache.invisiblePartitionIds;
        }
        return this.viewerView.visibilityMgr.setVisible( occurrences, isVisible, isNotifyChange );
    }

    /**
     * set partition part visibility
     *
     * @param {Array} partitionCsidChains csid chains of the model objects
     * @param {Boolean} isVisible should be made visible or turned off
     * @param {Boolean} notifyChange should viewer notification be fired
     *
     * @return {Promise} A promise that is resolved or rejected when the operation has completed.
     */
    setPartitionPartsVisibility( partitionCsidChains, isVisible, notifyChange ) {
        var isNotifyChange = false;
        if( !_.isUndefined( notifyChange ) && !_.isNull( notifyChange ) && typeof notifyChange === 'boolean' ) {
            isNotifyChange = notifyChange;
        }
        var occurrences = [];
        _.forEach( partitionCsidChains, function( prtnCsidChain ) {
            occurrences.push( this.viewerContextData.getViewerCtxSvc().createViewerPartitionOccurance( prtnCsidChain ) );
        }.bind( this ) );
        return this.viewerView.visibilityMgr.setVisible( occurrences, isVisible, isNotifyChange );
    }

    /**
     * set parts viewer visibility state
     *
     * @param {Array} csidChains csid chains of the model objects
     * @param {Array} partitionCsidChains csid chains of partition objects
     * @param {Boolean} notifyChange should viewer notification be fired
     * @param {Object} visibilityDataCache visibility data cache from other viewer
     *
     * @return {Promise} A promise that is resolved or rejected when the operation has completed.
     */
    setVisibleState( csidChains, partitionCsidChains, notifyChange, visibilityDataCache ) {
        var isNotifyChange = true;
        if( !_.isUndefined( notifyChange ) && !_.isNull( notifyChange ) && typeof notifyChange === 'boolean' ) {
            isNotifyChange = notifyChange;
        }
        var occurrences = [];
        _.forEach( csidChains, function( csidChain ) {
            let occ = null;
            if( partitionCsidChains && Array.isArray( partitionCsidChains ) && _.includes( partitionCsidChains, csidChain ) ) {
                occ = this.viewerContextData.getViewerCtxSvc().createViewerPartitionOccurance( csidChain );
            } else {
                occ = this.viewerContextData.getViewerCtxSvc().createViewerOccurance( csidChain, this.viewerContextData );
            }
            occurrences.push( occ );
        }.bind( this ) );
        if( visibilityDataCache ) {
            this.invisibleCsids = visibilityDataCache.invisibleCsids;
            this.invisibleExceptionCsids = visibilityDataCache.invisibleExceptionCsids;
            this.invisiblePartitionIds = visibilityDataCache.invisiblePartitionIds;
        }
        return this.viewerView.visibilityMgr.setVisibleState( occurrences, isNotifyChange );
    }

    /**
     * Add viewer visibility changed listener
     *
     * @param {Object} observerFunction function to be registered
     */
    addViewerVisibilityChangedListener( observerFunction ) {
        if( typeof observerFunction === 'function' ) {
            this.viewerVisibilityChangedListeners.push( observerFunction );
        }
    }

    /**
     * remove viewer visibility changed listener
     *
     * @param {Object} observerFunction function to be removed
     */
    removeViewerVisibilityChangedListener( observerFunction ) {
        if( typeof observerFunction === 'function' ) {
            var indexToBeRemoved = this.viewerVisibilityChangedListeners.indexOf( observerFunction );
            if( indexToBeRemoved > -1 ) {
                this.viewerVisibilityChangedListeners.splice( indexToBeRemoved, 1 );
            }
        }
    }

    /**
     * Notify viewer visibility changed listener
     *
     * @param {Array} occurrencesFromViewer Array of CSID chain of occurrences
     * @param {Boolean} visibilityToSet visibility to set
     * @param {Boolean} isStateChange is state change
     */
    _notifyViewerVisibilityChanged( occurrencesFromViewer, visibilityToSet, isStateChange ) {
        this.viewerContextData.updateViewerAtomicData( VIEWER_INVISIBLE_CSID_TOKEN, [ ...this.invisibleCsids ] );
        this.viewerContextData.updateViewerAtomicData( VIEWER_INVISIBLE_EXCEPTION_CSID_TOKEN, [ ...this.invisibleExceptionCsids ] );
        if( this.viewerVisibilityChangedListeners.length > 0 ) {
            _.forEach( this.viewerVisibilityChangedListeners, function( observer ) {
                observer.call( null, occurrencesFromViewer, visibilityToSet, isStateChange );
            } );
        }
    }

    /**
     * returns all Visible occs in Viewer
     *
     * @returns {[Object]} All visible occurrences in viewer
     */
    getVisibleOccsInViewer() {
        return this.viewerView.visibilityMgr.getVisible();
    }

    /**
     * Restore visibility of viewer after connection timeout
     *
     * @param {[String]} invisibles Array of invisible csid strings
     * @param {[String]} invisibleExceptions Array of invisible exception csid strings
     *
     * @returns {Promise} promise thats resolved when visibility is restored
     */
    restoreViewerVisibility( invisibles, invisibleExceptions ) {
        let returnPromise = AwPromiseService.instance.defer();
        let isRootVisible = true;
        this.clearVisibility();
        if( invisibles && Array.isArray( invisibles ) && _.includes( invisibles, this.ROOT_ID ) ) {
            isRootVisible = false;
        }
        if( invisibles && Array.isArray( invisibles ) && invisibles.length > 0 ) {
            for( let i = 0; i < invisibles.length; i++ ) {
                this.invisibleCsids.push( invisibles[ i ] );
            }
        }
        if( invisibleExceptions && Array.isArray( invisibleExceptions ) && invisibleExceptions.length > 0 ) {
            for( let i = 0; i < invisibleExceptions.length; i++ ) {
                this.invisibleExceptionCsids.push( invisibleExceptions[ i ] );
            }
        }
        this.setPartsVisibility( [ this.ROOT_ID ], [], isRootVisible, false ).then(
            function() {
                this._restoreViewerOccVisibility( invisibles, invisibleExceptions ).then( function() {
                    returnPromise.resolve();
                }, function( errorMsg ) {
                    returnPromise.reject( errorMsg );
                } );
            }.bind( this ),
            function( errorMsg ) {
                returnPromise.reject( errorMsg );
            }
        );
        return returnPromise.promise;
    }

    /**
     * Restore visibility of viewer after connection timeout
     *
     * @param {[String]} invisibles Array of invisible csid strings
     * @param {[String]} invisibleExceptions Array of invisible exception csid strings
     *
     * @returns {Promise} promise thats resolved when visibility is restored
     */
    _restoreViewerOccVisibility( invisibles, invisibleExceptions ) {
        var returnPromise = AwPromiseService.instance.defer();
        this._applyVisibility( invisibles, invisibleExceptions ).then( function( nextPassData ) {
            if( !nextPassData ||
                nextPassData.nextInvisibles && _.isEmpty( nextPassData.nextInvisibles ) &&
                ( nextPassData.nextInvisibleExceptions && _.isEmpty( nextPassData.nextInvisibleExceptions ) ) ) {
                returnPromise.resolve();
            } else {
                this._restoreViewerOccVisibility( nextPassData.nextInvisibles, nextPassData.nextInvisibleExceptions ).then(
                    function() {
                        returnPromise.resolve();
                    },
                    function( errorMsg ) {
                        returnPromise.reject( errorMsg );
                    }
                );
            }
        }.bind( this ) );

        return returnPromise.promise;
    }

    /**
     * Apply visibility to parts
     *
     * @param {[String]} invisibles Array of invisible csid strings
     * @param {[String]} invisibleExceptions Array of invisible exception csid strings
     *
     * @returns {Promise} promise thats resolved when visibility is restored
     */
    _applyVisibility( invisibles, invisibleExceptions ) {
        var returnPromise = AwPromiseService.instance.defer();
        if( !invisibles || _.isEmpty( invisibles ) ) {
            if( invisibleExceptions && !_.isEmpty( invisibleExceptions ) ) {
                this.setPartsVisibility( invisibleExceptions, [], true, false ).then(
                    function() {
                        returnPromise.resolve();
                    },
                    function( errorMsg ) {
                        returnPromise.reject( errorMsg );
                    }
                );
            } else {
                returnPromise.resolve();
            }
            return returnPromise.promise;
        }

        if( !invisibleExceptions || _.isEmpty( invisibleExceptions ) ) {
            if( invisibles && !_.isEmpty( invisibles ) ) {
                this.setPartsVisibility( invisibles, [], false, false ).then(
                    function() {
                        returnPromise.resolve();
                    },
                    function( errorMsg ) {
                        returnPromise.reject( errorMsg );
                    }
                );
            } else {
                returnPromise.resolve();
            }
            return returnPromise.promise;
        }

        var nextInvisibles = this.findChildrenOf( invisibleExceptions, invisibles );
        var nextInvisibleExceptions = this.findChildrenOf( invisibles, invisibleExceptions );

        var filteredInvisibles = _.filter( invisibles, function( currInvisibleCsid ) {
            return !_.includes( nextInvisibles, currInvisibleCsid );
        } );

        var filteredInvisiblesExceptions = _.filter( invisibleExceptions, function( currInvisibleExcCsid ) {
            return !_.includes( nextInvisibleExceptions, currInvisibleExcCsid );
        } );

        this.setPartsVisibility( filteredInvisibles, [], false, false ).then(
            function() {
                this.setPartsVisibility( filteredInvisiblesExceptions, [], true, false ).then(
                    function() {
                        returnPromise.resolve( {
                            nextInvisibles: nextInvisibles,
                            nextInvisibleExceptions: nextInvisibleExceptions
                        } );
                    },
                    function( errorMsg ) {
                        returnPromise.reject( errorMsg );
                    }
                );
            }.bind( this ),
            function( errorMsg ) {
                returnPromise.reject( errorMsg );
            }
        );
        return returnPromise.promise;
    }

    /**
     * Shows empty viewer warning message
     */
    // eslint-disable-next-line class-methods-use-this
    _showEmptyViewerWarningMessage() {
        localeSvc.getTextPromise( 'Awv0threeDViewerMessages' ).then( function( localizationBundle ) {
            msgSvc.showInfo( localizationBundle.tcVisEmptyViewerError );
        } );
    }

    /**
     * clear viewer visibility
     */
    cleanUp() {
        this.clearVisibility();
        this.viewerVisibilityChangedListeners.length = 0;
        this.viewerView.visibilityMgr.removeVisibilityListener( this.viewerVisibilityListener );
    }

    /**
     * Remove Analysis result
     * @returns {Promise} promise thats resolved when remove analysis results in done
     */
    removeAnalysisResult() {
        return this.viewerView.visibilityMgr.removeAnalysisResult();
    }

    /**
     * Set Show Suppressed
     * @param {Boolean} showSuppressed boolean to set show suppressed in viewer
     * @returns {Promise} promise thats resolved when showSuppressed flag is set in viewer
     */
    setShowSuppressed( showSuppressed ) {
        return this.viewerView.visibilityMgr.setShowSuppressed( showSuppressed );
    }
}
