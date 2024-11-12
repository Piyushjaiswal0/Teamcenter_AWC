// Copyright (c) 2021 Siemens

/* global JSCom */

/**
 * This pmi service provider
 *
 * @module js/viewerPmiManagerProvider
 */
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import assert from 'assert';
import logger from 'js/logger';
import viewerContextService from 'js/viewerContext.service';
import viewerSelMgrProvider from 'js/viewerSelectionManagerProvider';
import { VIEWER_INVISIBLE_CSID_TOKEN, VIEWER_INVISIBLE_EXCEPTION_CSID_TOKEN } from 'js/viewerVisibilityManagerProvider';
import viewerPreferenceService from 'js/viewerPreference.service';
import messagingService from 'js/messagingService';
import '@swf/ClientViewer';
import { bind } from '@swf/webix';
// import 'manipulator';

/**
 * Provides an instance of viewer pmi manager
 *
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {ViewerPmiManager} Returns viewer pmi manager
 */
export let getPmiManager = function( viewerView, viewerContextData ) {
    return new ViewerPmiManager( viewerView, viewerContextData );
};

/**
 * Provides an instance of viewer model view manager
 *
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {ViewerModelViewManager} Returns viewer pmi manager
 */
export let getModelViewManager = function( viewerView, viewerContextData ) {
    return new ViewerModelViewManager( viewerView, viewerContextData );
};

const GEOANALYSIS_PMI_TARGET_LIST = 'targetList';
const GEOANALYSIS_PMI_DATA_FETCH_COMPLETE = 'dataFetchComplete';
const GEOANALYSIS_FETCH_PMI_DATA_OBSERVER = 'fetchPmiDataObserver';
const GEOANALYSIS_PMI_IS_TARGET_INVISIBLE = 'isTargetInVisible';
const GEOANALYSIS_PMI_TARGETCSIDS = 'targetCSIDs';
const GEOANALYSIS_PMI_ACTIVE_TAB_INDEX = 'activeTabIndex';
const GEOANALYSIS_PMI_VISIBILITY_PROCESS = 'visibilityProcessing';
const GEOANALYSIS_PMI_HAS_TYPE_DATA = 'selectionHasTypesData';
const GEOANALYSIS_PMI_HAS_MV_DATA = 'selectionHasMVData';
/**
 * resolve Pmi entities promise
 *
 * @param {Object} entitiesPromise promise that resolves to entities
 * @param {Object} dataPromise data promise that resolves to entity objects
 */
var _resolvePMIEntitiesPromise = async function( entitiesPromise ) {
    let dataPromise = AwPromiseService.instance.defer();
    return entitiesPromise.then( function( pmiList ) {
        var deferredArray = [];
        var entityObjectPromises = [];

        for( var idx = 0; idx < pmiList.length; idx++ ) {
            deferredArray.push( pmiList.getPMI( idx ) );
        }

        return AwPromiseService.instance.all( deferredArray ).then( function() {
            for( var idx = 0; idx < deferredArray.length; idx++ ) {
                entityObjectPromises.push( _createPMIEntityObj( idx, arguments[ 0 ][ idx ] ) );
            }
            return AwPromiseService.instance.all( entityObjectPromises ).then( function( entityObjects ) {
                dataPromise.resolve( entityObjects );
                return entityObjects;
            } );
        } );
    }, function( reason ) {
        logger.warn( 'Could not fetch entities from server: ' + reason );
        dataPromise.resolve( [] );
        return [];
    } );
};

/**
 * creates pmi entity object
 *
 * @param {Object} idx ids
 * @param {Object} entity entities
 * @return {Promise} A promise resolves to entity object promise
 */
var _createPMIEntityObj = function( idx, entity ) {
    var deferred = AwPromiseService.instance.defer();
    var nameP = entity.getName();
    var typeP = entity.getType();
    var visibleP = entity.getVisible();
    var selectedP = entity.getSelected();
    AwPromiseService.instance.all( [ nameP, typeP, visibleP, selectedP ] ).then( function( args ) {
        var name = args[ 0 ];
        var type = args[ 1 ];
        var visibility = args[ 2 ];
        var selected = args[ 3 ];
        var visibilityStr = visibility ? 'true' : 'false';
        deferred.resolve( [ idx, name, type, visibilityStr, entity.visObject.resourceID, selected ] );
    } );
    return deferred.promise;
};

/**
 * Class to hold the viewer pmi data
 *
 * @constructor viewerPmiManager
 *
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */
class ViewerPmiManager {
    constructor( viewerView, viewerContextData ) {
        assert( viewerView, 'Viewer view can not be null in PMI' );
        assert( viewerContextData, 'Viewer context data can not be null in PMI' );
        this.viewerView = viewerView;
        this.viewerContextData = viewerContextData;
        this.pmiDataListeners = [];
        this.pmiToolState = null;
        this.pmiEntityList = null;
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
     * setupAtomicDataTopics when panel is revealed
     * @param {pmiToolState} pmiToolState pmi atomic data
     */
    setupAtomicDataTopicsPanelReveal( pmiToolState ) {
        this.pmiToolState = pmiToolState;
        let pmiManagerProvider = this;
        this.pmiSelectionListener = {
            onPMISelected: function( selected ) {
                pmiManagerProvider.updatePmiToolState( 'selectedPMIFromViewer', selected );
                pmiManagerProvider.updatePmiToolState( 'resourceIDForSelectedPMIFromViewer', this.visObject.resourceID );
            }
        };
        this.viewerContextData.getViewerAtomicDataSubject().subscribe( viewerSelMgrProvider.SELECTED_CSID_KEY, this );
        this.viewerContextData.getViewerAtomicDataSubject().subscribe( viewerSelMgrProvider.SELECTED_MODEL_OBJECT_KEY, this );
        this.viewerContextData.getViewerAtomicDataSubject().subscribe( VIEWER_INVISIBLE_CSID_TOKEN, this );
        this.viewerContextData.getViewerAtomicDataSubject().subscribe( VIEWER_INVISIBLE_EXCEPTION_CSID_TOKEN, this );
    }

    /**
     * Handle viewer atomic data update
     * @param {String} topic topic
     */
    update( topic ) {
        let viewerViewMode = this.viewerContextData.getViewerAtomicData().getValue().viewerViewMode;
        let isViewerRevealed = this.viewerContextData.getViewerAtomicData().getValue().isViewerRevealed;
        if( ( topic === viewerContextService.VIEWER_VIEW_MODE_TOKEN || topic === viewerContextService.VIEWER_VISIBILITY_TOKEN ) && viewerViewMode === 'VIEWER3D' && isViewerRevealed === true ) {
            let pmiValuePromise = this.viewerView.pmiMgr.getHasPMI();
            pmiValuePromise.then( pmiValue => {
                this.viewerContextData.updateViewerAtomicData( 'hasPMIData', pmiValue );
            }, bind( this ) ).catch( error => {
                logger.error( 'Failed to set hasPMIData: ' + error );
            } );
        } else if( topic === viewerSelMgrProvider.SELECTED_CSID_KEY || topic === viewerSelMgrProvider.SELECTED_MODEL_OBJECT_KEY ) {
            if( this.pmiEntityList && this.pmiEntityList.length > 0 ) {
                for( var i = 0, len = this.pmiEntityList.length; i < len; i++ ) {
                    this.pmiEntityList.getPMI( i ).then( function( pmi ) {
                        pmi.removeListener( this.pmiSelectionListener );
                    }.bind( this ) );
                }
            }
            this.pmiEntityList = null;

            this.updatePmiToolState( GEOANALYSIS_PMI_DATA_FETCH_COMPLETE, false );
            this.updateCtxWithCurrentSelection();
        } else if( topic === VIEWER_INVISIBLE_CSID_TOKEN || topic === VIEWER_INVISIBLE_EXCEPTION_CSID_TOKEN ) {
            var isInVisible = this.isTargetInVisible();
            this.updatePmiToolState( GEOANALYSIS_PMI_IS_TARGET_INVISIBLE, isInVisible );
        }
    }

    /**
     * get current selected model object
     *
     * @returns {object} current selection model object
     */
    getCurrentViewerSelections() {
        let viewerSelectionCSIDS = this.viewerContextData.getValueOnViewerAtomicData( viewerSelMgrProvider.SELECTED_CSID_KEY );
        if( _.isUndefined( viewerSelectionCSIDS ) || viewerSelectionCSIDS.length === 0 ) {
            return [ '' ]; //root;
        }
        return this.viewerContextData.getValueOnViewerAtomicData( viewerSelMgrProvider.SELECTED_MODEL_OBJECT_KEY );
    }

    /**
     * update geometic section state atomic data
     *
     * @param {Object} propertyPath path of property on atomic data value
     * @param {Object} propertyValue vlaue to be set on that path
     */
    updatePmiToolState( propertyPath, propertyValue ) {
        if( this.pmiToolState ) {
            const newPmiToolState = { ...this.pmiToolState.getValue() };
            newPmiToolState[ propertyPath ] = propertyValue;
            this.pmiToolState.update( newPmiToolState );
        }
    }

    /**
     * get value on geometric Section state
     *
     * @param {Object} propertyPath path of property on atomic data value
     * @returns {Object} value on requested property path
     */
    getValueOnPmiToolState( propertyPath ) {
        if( this.pmiToolState ) {
            return _.get( this.pmiToolState.getValue(), propertyPath );
        }
        return null;
    }
    /**
     * Update context with selection changes
     */
    updateCtxWithCurrentSelection() {
        let targetCSIDs = [];
        let viewerSelectionCSIDS = this.viewerContextData.getValueOnViewerAtomicData( viewerSelMgrProvider.SELECTED_CSID_KEY );
        if( _.isEmpty( viewerSelectionCSIDS ) ) {
            this.updatePmiToolState( GEOANALYSIS_PMI_TARGETCSIDS, [ '' ] );
            this.updatePmiToolState( GEOANALYSIS_PMI_TARGET_LIST, [ this.viewerContextData.getCurrentViewerProductContext() ] );
        } else {
            let viewerSelectionModels = this.viewerContextData.getSelectionManager().getSelectedModelObjects();
            targetCSIDs.push( viewerSelectionCSIDS.slice( -1 )[ 0 ] );
            let targetMOList = [];
            targetMOList.push( viewerSelectionModels.slice( -1 )[ 0 ] );
            this.updatePmiToolState( GEOANALYSIS_PMI_TARGETCSIDS, targetCSIDs );
            this.updatePmiToolState( GEOANALYSIS_PMI_TARGET_LIST, targetMOList );
        }
        var isInVisible = this.isTargetInVisible();
        this.updatePmiToolState( GEOANALYSIS_PMI_IS_TARGET_INVISIBLE, isInVisible );
        this.notifyPMIData();
    }

    /**
     * Returns target's visiblity
     * @returns {Boolean} boolean indicating if current target is invisible or not
     */
    isTargetInVisible() {
        let pmiTargetCsid = this.getValueOnPmiToolState( GEOANALYSIS_PMI_TARGETCSIDS );
        pmiTargetCsid = pmiTargetCsid[ 0 ] === '/' ? '' : pmiTargetCsid[ 0 ];
        let visibility = this.viewerContextData.getVisibilityManager().getProductViewerVisibility( pmiTargetCsid );
        if( visibility === this.viewerContextData.getVisibilityManager().VISIBILITY.PARTIAL ||
            visibility === this.viewerContextData.getVisibilityManager().VISIBILITY.INVISIBLE ) {
            return true;
        }
        return false;
    }
    /**
     * This method is to call obeserver if selection CSIDs is updated  or viewer invisible CSID token is updated
     */
    notifyPMIData() {
        let fetchPmiDataObserver = Boolean( this.getValueOnPmiToolState( GEOANALYSIS_FETCH_PMI_DATA_OBSERVER ) );
        this.updatePmiToolState( GEOANALYSIS_FETCH_PMI_DATA_OBSERVER, !fetchPmiDataObserver );
    }
    /**
     * Gets PMI data availability
     */

    getHasPMI() {
        return this.viewerView.pmiMgr.getHasPMI();
    }

    /**
     * Sets pmi elements selected/visible property
     *
     * @param {Boolean} perOccurrence true/false
     * @param {String[]} elementIds ids
     * @param {Boolean[]} isChecked new state array
     * @param {String[]} types state names
     * @return {Promise} deferred promise that resolves to application of property
     */
    setPmiElementProperty( perOccurrence, elementIds, isChecked, types ) {
        let deferred = AwPromiseService.instance.defer();
        var props = [];

        for( var idx = 0; idx < elementIds.length; idx++ ) {
            var propName = null;

            if( types[ idx ] === 'VISIBLE' ) {
                propName = JSCom.Consts.PMIProperties.VISIBLE;
            } else if( types[ idx ] === 'SELECTED' ) {
                propName = JSCom.Consts.PMIProperties.SELECTED;
            }

            props.push( {
                index: elementIds[ idx ],
                name: propName,
                value: isChecked[ idx ]
            } );
        }

        return this.getElementListForActiveOccs().then( function( elementList ) {
            return elementList.setPropertiesOnPMI( props );
        }, function( reason ) {
            return deferred.reject( reason );
        } );
    }

    /**
     * request pmi elements Data ByParts
     *
     * @param {String[]} occIds - occ csids for parts
     * @returns {Promise} Promise that resolves to list of pmi objects.
     *
     */
    async requestPmiElementsDataByParts( occIds ) {
        var occList = [];
        for( var idx = 0; idx < occIds.length; idx++ ) {
            occList.push( this.viewerContextData.getViewerCtxSvc().createViewerOccurance( occIds[ idx ], this.viewerContextData ) );
        }
        logger.info( 'Vis: evaluate pmi for csids:' + JSON.stringify( occList, [ 'theStr' ] ) );
        var entitiesPromise = this.viewerView.pmiMgr.getOccurrencesPMI( occList );
        return entitiesPromise.then( pmiList => {
            this.pmiEntityList = pmiList;
            return pmiList.isSupported();
        } ).then( isSupported => {
            if( isSupported ) {
                if( this.pmiEntityList && this.pmiEntityList.length > 0 ) {
                    for( var i = 0, len = this.pmiEntityList.length; i < len; i++ ) {
                        this.pmiEntityList.getPMI( i ).then( function( pmi ) {
                            if( !_.isUndefined( pmi ) ) {
                                pmi.addListener( this.pmiSelectionListener );
                            }
                        }.bind( this ) );
                    }
                }

                return _resolvePMIEntitiesPromise( entitiesPromise );
            }
            messagingService.showError( this.viewerContextData.getThreeDViewerMsg( 'pmiNotSupported' ) );
            return AwPromiseService.instance.reject( 'Unsupported PMI data.' );
        } ).catch( error => {
            logger.debug( 'Failed to load PMI entities data :' + error );
            return AwPromiseService.instance.reject( 'Failed to load PMI entities data :' + error );
        } );
    }

    /**
     * Re orients the pmis in the viewer
     * @return {Promise} JSCOM promise
     */
    reorientText() {
        return this.viewerView.pmiMgr.reorientText();
    }

    /**
     * Sets the 'inPlane' property for PMI
     *
     * @param {Boolean} isInPlane - Boolean indicating inPlane property.
     * @returns {Promise} Sets in Plane value
     */
    setInPlane( isInPlane ) {
        return this.viewerView.pmiMgr.setInPlane( isInPlane );
    }

    /**
     * Gets the In Plane property of all PMI in the view. When set to true, the PMI
     * will be parrallel to the XY plane. When set to false, the PMI will be parrallel with the camera's viewing plane.
     *
     * @return {Promise} Promise that resolves to providing inplane property.
     */
    getInPlane() {
        return this.viewerView.pmiMgr.getInPlane();
    }

    /**
     * Gets PMI Element list
     * @return {Promise} Promise that resolves to list of pmi objects.
     */
    getElementListForActiveOccs() {
        let occIds = this.getValueOnPmiToolState( GEOANALYSIS_PMI_TARGETCSIDS );
        var occList = [];

        _.forEach( occIds, function( occId ) {
            occList.push( this.viewerContextData.getViewerCtxSvc().createViewerOccurance( occId, this.viewerContextData ) );
        }.bind( this ) );

        if( occList.length === 0 ) {
            return this.viewerView.pmiMgr.getAllPMI();
        }
        return this.viewerView.pmiMgr.getOccurrencesPMI( occList );
    }

    /**
     * Request pmi elements data
     */
    requestPmiElementsData() {
        var entitiesPromise = this.viewerView.pmiMgr.getAllPMI();
        _resolvePMIEntitiesPromise( entitiesPromise );
    }

    /**
     * Unsubscribe atomic data after panel is closed
     */
    unsubscribeAtomicDataTopicsPanelClose() {
        if( this.pmiEntityList && this.pmiEntityList.length > 0 ) {
            for( var i = 0, len = this.pmiEntityList.length; i < len; i++ ) {
                this.pmiEntityList.getPMI( i ).then( function( pmi ) {
                    if( !_.isUndefined( pmi ) ) {
                        pmi.removeListener( this.pmiSelectionListener );
                    }
                }.bind( this ) );
            }
        }
        this.pmiEntityList = null;
        this.viewerContextData.getViewerAtomicDataSubject().unsubscribe( viewerSelMgrProvider.SELECTED_CSID_KEY, this );
        this.viewerContextData.getViewerAtomicDataSubject().unsubscribe( viewerSelMgrProvider.SELECTED_MODEL_OBJECT_KEY, this );
        this.viewerContextData.getViewerAtomicDataSubject().unsubscribe( VIEWER_INVISIBLE_CSID_TOKEN, this );
        this.viewerContextData.getViewerAtomicDataSubject().unsubscribe( VIEWER_INVISIBLE_EXCEPTION_CSID_TOKEN, this );
    }
}

/**
 * Class to hold the viewer model view data
 *
 * @constructor viewerModelViewManager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */
class ViewerModelViewManager {
    constructor( viewerView, viewerContextData ) {
        assert( viewerView, 'Viewer view can not be null in Model View' );
        assert( viewerContextData, 'Viewer context data can not be null in Model View' );
        this.viewerView = viewerView;
        this.viewerContextData = viewerContextData;
    }

    /**
     * Request model view data
     *
     * @returns {Promise} Promise that resolves to list of mv objects.
     *
     */
    requestModelViewsData() {
        var occList = []; // Viewer takes empty occ list to return model view for part.
        var mvsPromise = this.getModelViews( occList );
        return ViewerModelViewManager.resolveMVsPromise( mvsPromise );
    }

    /**
     * request Model Views Data ByParts
     *
     * @param {String[]} occIds - occ csids for parts
     * @returns {Promise} deferred - Promise that resolves to list of model view obects.
     *
     */
    async requestModelViewsDataByParts( occIds ) {
        var occList = [];
        for( var idx = 0; idx < occIds.length; idx++ ) {
            occList.push( this.viewerContextData.getViewerCtxSvc().createViewerOccurance( occIds[ idx ], this.viewerContextData ) );
        }
        logger.info( 'Vis: evaluate model view pmi for csids:' + JSON.stringify( occList, [ 'theStr' ] ) );
        var mvsPromise = this.getModelViews( occList );
        return ViewerModelViewManager.resolveMVsPromise( mvsPromise );
    }

    /**
     * requests elements data for given model view
     *
     * @param {String} modelViewId - model view id
     * @returns {Promise} Promise that resolves to list of pmi objects.
     *
     */

    requestModelViewElementsData( modelViewId, occIds ) {
        var occList = [];
        for( var idx = 0; idx < occIds.length; idx++ ) {
            occList.push( this.viewerContextData.getViewerCtxSvc().createViewerOccurance( occIds[ idx ], this.viewerContextData ) );
        }

        return this.getModelViews( occList ).then( function( mvList ) {
            return mvList.getModelView( modelViewId ).then( function( modelView ) {
                var entitiesPromise = modelView.getPMIList();
                return _resolvePMIEntitiesPromise( entitiesPromise );
            } );
        } );
    }

    /**
     * Gets the model view on the root or on the Occurrences passed in.
     * @param {Object} occList An array of Occurrence
     * @returns {promise} promise     *
     */
    getModelViews( occList ) {
        return this.viewerView.modelViewMgr.getModelViews( occList );
    }

    /**
     * Applies the model view
     * @param {Object} modelViewOwner An array of Occurence
     * @param {String} modelViewCADID  CAD ID of model View
     * @param {Object} scopeVisibilitySet An array of Occurence
     */
    invoke( modelViewOwner, modelViewCADID, scopeVisibilitySet ) {
        let deferred = AwPromiseService.instance.defer();
        this.viewerView.modelViewMgr.invoke( modelViewOwner, modelViewCADID, scopeVisibilitySet )
            .then( function() {
                deferred.resolve();
            }, function( reason ) {
                deferred.reject( reason );
            } );
    }

    /**
     * Apply model view proxy
     * @param {String} mvProxyUid model view proxy Uid
     * @returns {promise} promise
     */
    invokeModelViewProxy( mvProxyUid ) {
        let deferred = AwPromiseService.instance.defer();

        this.viewerView.modelViewMgr.invokeModelViewProxy( mvProxyUid ).then( () => {
            deferred.resolve();
        } ).catch( ( error ) => {
            deferred.reject( error );
        } );
        return deferred.promise;
    }

    /**
     * Sets the Model view properties indicated by the array of objects
     *
     * @param {index} modelViewToSelectId Selected Model View ID
     * @param {Object} modelData model view atomic state
     * @param {Boolean} visibility either true/false
     * @param {Array} occIds occurrence Ids list
     * @returns {promise} A jQuery promise that is either resolved or rejected with an Error when the operation has completed
     */
    setPropertiesOnModelViews( modelViewToSelectId, modelData, visibility, occIds ) {
        let modelViewList = [];
        if( modelData.previousCheckedModelView !== null ) {
            let toDeselect = {
                name: viewerPreferenceService.ModelViewProperties.VISIBLE,
                index: modelData.previousCheckedModelView,
                value: false
            };
            modelViewList.push( toDeselect );
        }
        let toSelect = {
            name: viewerPreferenceService.ModelViewProperties.VISIBLE,
            index: modelViewToSelectId,
            value: visibility
        };

        modelViewList.push( toSelect );
        var occList = [];
        for( var idx = 0; idx < occIds.length; idx++ ) {
            occList.push( this.viewerContextData.getViewerCtxSvc().createViewerOccurance( occIds[ idx ], this.viewerContextData ) );
        }
        return this.getModelViews( occList ).then( function( mvList ) {
            return mvList.setPropertiesOnModelViews( modelViewList );
        } );
    }

    /**
     * creates Model view object properties array
     *
     * @param {Object} idx index for model view
     * @param {Object} mv model view
     * @return {Promise} A promise resolves to entity object promise
     */
    static createMVObjPropArray( idx, mv ) {
        var deferred = AwPromiseService.instance.defer();
        var nameP = mv.getName();
        var visibleP = mv.getVisible();

        AwPromiseService.instance.all( [ nameP, visibleP ] ).then( function( args ) {
            var name = args[ 0 ];
            var visibility = args[ 1 ];
            var visibilityStr = visibility ? 'true' : 'false';
            deferred.resolve( [ idx, name, visibilityStr, mv.visObject.resourceID ] );
        } );
        return deferred.promise;
    }

    /**
     * resolve Model views Pmi promise
     *
     * @param {Object} mvsPromise promise that resolves to model views
     * @returns {Object} dataPromise data promise that resolves to entity objects
     */
    static async resolveMVsPromise( mvsPromise ) {
        let dataPromise = AwPromiseService.instance.defer();
        return mvsPromise.then( function( modelViewList ) {
            var deferredArray = [];
            var mvObjectPromises = [];

            for( var idx = 0; idx < modelViewList.length; idx++ ) {
                deferredArray.push( modelViewList.getModelView( idx ) );
            }

            return AwPromiseService.instance.all( deferredArray ).then( function() {
                for( var idx = 0; idx < deferredArray.length; idx++ ) {
                    mvObjectPromises.push( ViewerModelViewManager.createMVObjPropArray( idx, arguments[ 0 ][ idx ] ) );
                }

                return AwPromiseService.instance.all( mvObjectPromises ).then( function( mvObjects ) {
                    dataPromise.resolve( mvObjects );
                    return mvObjects;
                } );
            } );
        }, function( reason ) {
            logger.warn( 'Could not fetch model views from server: ' + reason );
            dataPromise.resolve( [] );
            return [];
        } );
    }
}

export default {
    GEOANALYSIS_PMI_TARGET_LIST,
    GEOANALYSIS_PMI_DATA_FETCH_COMPLETE,
    GEOANALYSIS_FETCH_PMI_DATA_OBSERVER,
    GEOANALYSIS_PMI_IS_TARGET_INVISIBLE,
    GEOANALYSIS_PMI_TARGETCSIDS,
    GEOANALYSIS_PMI_ACTIVE_TAB_INDEX,
    GEOANALYSIS_PMI_VISIBILITY_PROCESS,
    GEOANALYSIS_PMI_HAS_TYPE_DATA,
    GEOANALYSIS_PMI_HAS_MV_DATA,
    getPmiManager,
    getModelViewManager
};
