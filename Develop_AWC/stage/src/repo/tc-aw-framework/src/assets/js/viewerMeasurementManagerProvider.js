// Copyright (c) 2021 Siemens

/**
 * This measurement service provider
 *
 * @module js/viewerMeasurementManagerProvider
 */
import AwPromiseService from 'js/awPromiseService';
import viewerUnitConversionService from 'js/viewerUnitConversionService';
import viewerContextService from 'js/viewerContext.service';
import _ from 'lodash';
import assert from 'assert';
import '@swf/ClientViewer';
import viewerSessionStorageService from 'js/viewerSessionStorageService';
import viewerPreferenceService from 'js/viewerPreference.service';
import logger from 'js/logger';

/**
 * Provides an instance of viewer measurement manager
 *
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {ViewerMeasurementManager} Returns viewer measurement manager
 */
let getViewerMeasurementManager = function( viewerView, viewerContextData ) {
    return new ViewerMeasurementManager( viewerView, viewerContextData );
};

const GEOANALYSIS_VIEWER_MEASUREMENT = 'viewerMeasurement'; //$NON-NLS-1$
const GEOANALYSIS_VIEWER_MEASUREMENT_PICK_FILTER = 'selectedMeasurementPickFilters'; //$NON-NLS-1$
const GEOANALYSIS_VIEWER_QUICK_MEASUREMENT_PICK_FILTER = 'selectedQuickMeasurementPickFilters'; //$NON-NLS-1$
const GEOANALYSIS_VIEWER_MEASUREMENT_SELECTION = 'selectedMeasurementObject'; //$NON-NLS-1$
const GEOANALYSIS_VIEWER_MEASUREMENT_COUNT = 'viewerMeasurementCount'; //$NON-NLS-1$
const GEOANALYSIS_VIEWER_MEASURE_PICKFILTER_SELECTION_STATE = 'viewerMeasurePickfilterSelectionState'; //$NON-NLS-1$
const MEAS_SESSION_STORAGE_PREF = 'MeasCmdGrp_';
let _previousTransparancyMode = null;

const PickFilterStateValues = {
    PICK_NONE: window.JSCom.Consts.PickFilterState.NONE,
    PICK_PART: window.JSCom.Consts.PickFilterState.PART,
    PICK_PARTS: window.JSCom.Consts.PickFilterState.PART,
    PICK_VERTEX: window.JSCom.Consts.PickFilterState.VERTEX,
    PICK_ARC_CENTER: window.JSCom.Consts.PickFilterState.ARC_CENTER,
    PICK_MIDPOINT: window.JSCom.Consts.PickFilterState.MIDPOINT,
    PICK_POINT_ON_EDGE: window.JSCom.Consts.PickFilterState.POINT_ON_EDGE,
    PICK_POINT: window.JSCom.Consts.PickFilterState.POINT,
    PICK_EDGE: window.JSCom.Consts.PickFilterState.EDGE,
    PICK_SURFACE: window.JSCom.Consts.PickFilterState.SURFACE,
    PICK_USER_DEFINED_POINT: window.JSCom.Consts.PickFilterState.USER_DEFINED_POINT,
    PICK_INTERSECTION_POINT: window.JSCom.Consts.PickFilterState.INTERSECTION_POINT,
    PICK_THREE_POINT_ARC: window.JSCom.Consts.PickFilterState.THREE_POINT_ARC,
    PICK_CONSTRUCT_MIDPOINT: window.JSCom.Consts.PickFilterState.CONSTRUCT_MIDPOINT,
    PICK_ALL: window.JSCom.Consts.PickFilterState.ALL
};

/**
 * Class to hold the viewer measurement data
 */
class ViewerMeasurementManager {
    /**
     * ViewerMeasurementManager class constructor
     *
     * @constructor ViewerMeasurementManager
     *
     * @param {Object} viewerView Viewer view
     * @param {Object} viewerContextData Viewer Context data
     */
    constructor( viewerView, viewerContextData ) {
        assert( viewerView, 'Viewer view can not be null' );
        assert( viewerContextData, 'Viewer context data can not be null' );
        this.viewerView = viewerView;
        this.viewerContextData = viewerContextData;
        this.doubleMeasurements = [];
        this.singleMeasurements = [];
        this.persistNewlyCreatedMeasurements = true;
        this.currentMeasuremenMode = true;
        this.currentSelectedMeasurement = null;
        this.initialize();
        this.setupAtomicDataTopics();
    }

    /**
     * Initialize ViewerMeasurementManager
     */
    initialize() {
        this.viewerMeasurementListener = {
            onMeasurementCreated: measurement => {
                if( this.persistNewlyCreatedMeasurements ) {
                    this.handleViewerMeasurementCreation( measurement );
                }
            },
            onMeasurementDeleted: () => {
                // _handleViewerMeasurementDeletion( measurement );
            }
        };
        this.viewerView.measurementMgr.addListener( this.viewerMeasurementListener );
        this.PICK_FILTERS = {
            PICK_FEATURES_ALL: 'PICK_FEATURES_ALL',
            PICK_PARTS: 'PICK_PARTS',
            PICK_SURFACE: 'PICK_SURFACE',
            PICK_EDGE: 'PICK_EDGE',
            PICK_VERTEX: 'PICK_VERTEX',
            PICK_POINT: 'PICK_POINT',
            PICK_ARC_CENTER: 'PICK_ARC_CENTER'
        };
        this.MEASUREMENT_MODE = {
            SINGLE: window.JSCom.Consts.MeasurementMode.SINGLE,
            DOUBLE: window.JSCom.Consts.MeasurementMode.DOUBLE
        };
    }

    /**
     * setupAtomicDataTopics ViewerMeasurementManager
     */
    setupAtomicDataTopics() {
        this.viewerContextData.getViewerAtomicDataSubject().subscribe( this.viewerContextData.SUB_COMMANDS_TOOLBAR_ACTIVE_STATUS, this );
        this.viewerContextData.getViewerAtomicDataSubject().subscribe( this.viewerContextData.CLEANUP_3D_VIEWER, this );
    }

    /**
     * Set measurement mode enabled or disabled
     *
     * @param {boolean} isEnabled should measurement be enabled
     */
    setMeasurementModeEnabled( isEnabled ) {
        if( !isEnabled ) {
            this.currentMeasuremenMode = null;
        }
        if( this.viewerView && this.viewerView.measurementMgr ) {
            this.viewerView.measurementMgr.enableMeasurementCreator( isEnabled );
        }
    }

    /**
     * Set measurement mode options
     *
     * @param {MeasurementMode} measurementMode - measurement mode
     * @param {PickFilterState} pickFilterState - pick filter state
     * @param {Boolean} quickMeasure - true if quick measurement mode should be turned on
     */
    setMeasurementModeOptions( measurementMode, pickFilterState, quickMeasure ) {
        if( quickMeasure && measurementMode === this.MEASUREMENT_MODE.DOUBLE && this.doubleMeasurements.length === 0 ) {
            this.persistNewlyCreatedMeasurements = false;
        } else {
            this.persistNewlyCreatedMeasurements = true;
        }
        this.currentMeasuremenMode = measurementMode;
        let measurementModeOptions = {
            measurementMode: measurementMode,
            pickFilterState: pickFilterState,
            quickMeasure: !this.persistNewlyCreatedMeasurements
        };
        this.viewerView.measurementMgr.setMeasurementCreatorOptions( measurementModeOptions );
    }

    /**
     * Start measurement in viewer as per measurement mode provided
     * @param {String} measurementMode - measurement type
     */
    startViewerMeasurement( measurementMode ) {
        this.setMeasurementModeEnabled( true );
        this.setMeasurementPickMode( measurementMode );
        this.getAllMeasurements();
        let renderOption = this.viewerContextData.getValueOnViewerAtomicData( 'renderLocation' );
        var isUseTransparency = this.viewerContextData.getValueOnViewerAtomicData( 'viewerPreference.AWC_visSelectionDisplay' );
        if( renderOption === 'CSR' && isUseTransparency ) {
            this.viewerContextData.setUseTransparency( !isUseTransparency );
            _previousTransparancyMode = isUseTransparency;
        }
    }


    /**
     * Start quick measurement in viewer
     */
    startViewerQuickMeasurement() {
        this.setMeasurementModeEnabled( true );
        this.setQuickMeasurementPickMode();
    }

    /**
     * Close measurement in viewer
     *
     * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
     */
    closeViewerMeasurement() {
        this.setMeasurementModeEnabled( false );
        let renderOption = this.viewerContextData.getValueOnViewerAtomicData( 'renderLocation' );
        if( renderOption === 'CSR' && _previousTransparancyMode ) {
            this.viewerContextData.setUseTransparency( _previousTransparancyMode );
            _previousTransparancyMode = null;
        }
    }

    /**
     * Handle creation of measurement object
     *
     * @param {Object} measurement the newly created measurement object
     */
    handleViewerMeasurementCreation( measurement ) {
        measurement.getType().then( function( measurementType ) {
            if( measurementType === this.MEASUREMENT_MODE.DOUBLE ) {
                this.doubleMeasurements.push( measurement );
            } else if( measurementType === this.MEASUREMENT_MODE.SINGLE ) {
                this.singleMeasurements.push( measurement );
            }
            let measurementCount = this.viewerContextData.getValueOnViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_MEASUREMENT_COUNT );
            this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_MEASUREMENT_COUNT,
                Number.isNaN( measurementCount ) ? 1 : measurementCount += 1 );
            measurement.addListener( {
                onMeasurementSelected: updatedMeasurement => {
                    if( this.persistNewlyCreatedMeasurements ) {
                        updatedMeasurement.getSelected().then( isSelected => {
                            if( isSelected ) {
                                this.updateSelectedMeasurementContext( updatedMeasurement );
                            } else {
                                this.updateSelectedMeasurementContext( null );
                            }
                        } );
                    }
                }
            } );
            measurement.getSelected().then( function( isSelected ) {
                if( isSelected ) {
                    this.updateSelectedMeasurementContext( measurement );
                }
            }.bind( this ) );
        }.bind( this ) );
    }

    /**
     * Set measurement pick mode
     * @param {MEASUREMENT_MODE} measurementMode measurement mode
     */
    setMeasurementPickMode( measurementMode ) {
        let pickFilters = this.viewerContextData.getValueOnViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_MEASUREMENT_PICK_FILTER );
        if( _.isNull( pickFilters ) || _.isUndefined( pickFilters ) || pickFilters.length <= 0 ) {
            pickFilters = this.setPickFilterSelectionStateInSubCommandToolBar();
            this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_MEASUREMENT_PICK_FILTER, pickFilters );
        }
        let pickFilterState = ViewerMeasurementManager.generatePickFilterValue( pickFilters );
        this.setMeasurementModeOptions( measurementMode, pickFilterState, false );
    }

    /**
     * Set quick measurement pick mode
     */
    setQuickMeasurementPickMode() {
        let pickFilters = this.viewerContextData.getValueOnViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_QUICK_MEASUREMENT_PICK_FILTER );
        if( _.isNull( pickFilters ) || _.isUndefined( pickFilters ) || pickFilters.length <= 0 ) {
            pickFilters = [];
            pickFilters.push( 'PICK_FEATURES_ALL' );
            this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_QUICK_MEASUREMENT_PICK_FILTER, pickFilters );
        }
        let featureAllIndex = pickFilters.indexOf( 'PICK_FEATURES_ALL' );
        let quickMeasurePickFilterState = [];
        if( featureAllIndex !== -1 ) {
            quickMeasurePickFilterState.push( 'PICK_SURFACE' );
            quickMeasurePickFilterState.push( 'PICK_EDGE' );
            quickMeasurePickFilterState.push( 'PICK_VERTEX' );
            quickMeasurePickFilterState.push( 'PICK_POINT' );
            quickMeasurePickFilterState.push( 'PICK_ARC_CENTER' );
        } else {
            quickMeasurePickFilterState.push( 'PICK_PARTS' );
        }
        var pickFilterState = ViewerMeasurementManager.generatePickFilterValue( quickMeasurePickFilterState );
        this.setMeasurementModeOptions( this.MEASUREMENT_MODE.DOUBLE, pickFilterState, true );
    }

    /**
     * Generate pick filter state value
     * @param {Array} pickFilters array of pick filter
     * @returns {String} filter value string
     */
    static generatePickFilterValue( pickFilters ) {
        let filterValue = '';
        for( var i = 0; i < pickFilters.length; i++ ) {
            if( pickFilters[ i ] !== 'PICK_FEATURES_ALL' ) {
                if( filterValue === '' ) {
                    filterValue = PickFilterStateValues[ pickFilters[ i ] ];
                } else {
                    // eslint-disable-next-line no-bitwise
                    filterValue |= PickFilterStateValues[ pickFilters[ i ] ];
                }
            }
        }
        return filterValue;
    }

    /**
     * Delete selected measurement
     */
    deleteSelectedMeasurement() {
        this.currentSelectedMeasurement.getType().then( ( type ) => {
            if( type === this.MEASUREMENT_MODE.DOUBLE ) {
                let deletedMeasurementIndex = this.doubleMeasurements.indexOf( this.currentSelectedMeasurement );
                if( deletedMeasurementIndex !== -1 ) {
                    this.doubleMeasurements.splice( deletedMeasurementIndex, 1 );
                }
            } else if( type === this.MEASUREMENT_MODE.SINGLE ) {
                let deletedQueryIndex = this.singleMeasurements.indexOf( this.currentSelectedMeasurement );
                if( deletedQueryIndex !== -1 ) {
                    this.singleMeasurements.splice( deletedQueryIndex, 1 );
                }
            }
            let measurementCount = this.viewerContextData.getValueOnViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_MEASUREMENT_COUNT );
            this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_MEASUREMENT_COUNT,
                Number.isNaN( measurementCount ) ? 0 : measurementCount -= 1 );
            this.currentSelectedMeasurement.delete().then( () => {
                this.updateSelectedMeasurementContext( null );
            } );
        } );
    }

    /**
     * Delete all measurements
     */
    deleteAllMeasurements() {
        let measurements = this.doubleMeasurements.concat( this.singleMeasurements );
        this.viewerView.measurementMgr.deleteMeasurements( measurements ).then( () => {
            this.resetMeasurementListInViewerContext();
        } );
    }

    /**
     * reset measurement in viewer context
     */
    resetMeasurementListInViewerContext() {
        this.doubleMeasurements.length = 0;
        this.singleMeasurements.length = 0;
        this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_MEASUREMENT_COUNT, 0 );
        this.updateSelectedMeasurementContext( null );
    }

    /**
     * Update viewer context with selected measurement
     *
     * @param {Object} measurement selected measurement object
     * @returns {Promise} promise that is resolved after selected measurement context is updated
     */
    // eslint-disable-next-line sonarjs/cognitive-complexity
    updateSelectedMeasurementContext( measurement ) {
        let deferred = AwPromiseService.instance.defer();
        if( !_.isNull( measurement ) && !_.isUndefined( measurement ) ) {
            measurement.getSelected().then( isSelected => {
                if( isSelected ) {
                    this.currentSelectedMeasurement = measurement;
                    this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_MEASUREMENT_SELECTION, true );
                    measurement.getType().then( function( measurementType ) {
                        if( measurementType === this.MEASUREMENT_MODE.DOUBLE ) {
                            let measurementPropPromise = measurement.getMeasurementProperties();
                            measurementPropPromise.then( function( properties ) {
                                let allSelectedMeasurementProperties = {};
                                for( let i = 0; i < properties.length; i++ ) {
                                    let dispName = properties[ i ].getDisplayName();
                                    let value = properties[ i ].getValue();
                                    let unit = properties[ i ].getUnits();
                                    if( unit ) {
                                        allSelectedMeasurementProperties[ dispName ] = {
                                            unit: unit,
                                            value: viewerUnitConversionService.convertToAnotherUnitsFromMeter( value, unit )
                                        };
                                    } else {
                                        allSelectedMeasurementProperties[ dispName ] = value;
                                    }
                                }
                                this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_MEASUREMENT_SELECTION,
                                    allSelectedMeasurementProperties );
                                
                                deferred.resolve();
                            }.bind( this ) );
                        } else if( measurementType === this.MEASUREMENT_MODE.SINGLE ) {
                            let measurementPropPromise = measurement.getMeasurementProperties();
                            measurementPropPromise.then( function( properties ) {
                                let allSelectedQueryProperties = {};
                                for( let i = 0; i < properties.length; i++ ) {
                                    let dispName = properties[ i ].getDisplayName();
                                    let value = properties[ i ].getValue();
                                    let unit = properties[ i ].getUnits();
                                    if( unit ) {
                                        allSelectedQueryProperties[ dispName ] = {
                                            unit: unit,
                                            value: viewerUnitConversionService.convertToAnotherUnitsFromMeter( value, unit )
                                        };
                                    } else {
                                        allSelectedQueryProperties[ dispName ] = value;
                                    }
                                }
                                this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_MEASUREMENT_SELECTION,
                                    allSelectedQueryProperties );
                                deferred.resolve();
                            }.bind( this ) );
                        } else {
                            deferred.resolve();
                        }
                    }.bind( this ) );
                } else {
                    deferred.resolve();
                }
            } );
        } else {
            this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_MEASUREMENT_SELECTION, null );
            deferred.resolve();
        }
        return deferred.promise;
    }

    /*
     * Fetches measurements from server
     * @return {Promise} promise
     */
    getAllMeasurements() {
        this.doubleMeasurements.length = 0;
        this.singleMeasurements.length = 0;
        this.viewerView.measurementMgr.getAllMeasurements()
            .then( rawMeasurementList => {
                if( rawMeasurementList ) {
                    this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_MEASUREMENT_COUNT, 0 );
                    for( let index = 0; index < rawMeasurementList.length; index++ ) {
                        rawMeasurementList.getMeasurement( index ).then( rawMeasurement => {
                            this.handleViewerMeasurementCreation( rawMeasurement );
                        } );
                    }
                }
            } )
            .catch( function( reason ) {
                logger.warn( 'Could not fetch measurements from server: ' + reason );
            } );
    }

    /**
     * Sets pick filter selection state to subcommand toolbar from session storage
     * @returns {Array} array of picked filters
     */
    setPickFilterSelectionStateInSubCommandToolBar() {
        let sessionStorageId = MEAS_SESSION_STORAGE_PREF + this.viewerContextData.getOccmgmtContextKey();
        let selectionStateData = viewerSessionStorageService.getViewerCommandDataToSessionStorage( sessionStorageId );
        if( !selectionStateData ) {
            selectionStateData = {};
            selectionStateData.partsFilterSelected = false;
            selectionStateData.surfaceFilterSelected = true;
            selectionStateData.vertexFilterSelected = true;
            selectionStateData.edgeFilterSelected = true;
            selectionStateData.pointFilterSelected = true;
            selectionStateData.arcCenterFilterSelected = true;
        }
        let selectedMeasurementPickFilters = [];
        for( const filter in selectionStateData ) {
            if( selectionStateData[ filter ] === true ) {
                switch ( filter ) {
                    case 'partsFilterSelected':
                        selectedMeasurementPickFilters.push( this.PICK_FILTERS.PICK_PARTS );
                        break;

                    case 'surfaceFilterSelected':
                        selectedMeasurementPickFilters.push( this.PICK_FILTERS.PICK_SURFACE );
                        break;

                    case 'edgeFilterSelected':
                        selectedMeasurementPickFilters.push( this.PICK_FILTERS.PICK_EDGE );
                        break;

                    case 'vertexFilterSelected':
                        selectedMeasurementPickFilters.push( this.PICK_FILTERS.PICK_VERTEX );
                        break;

                    case 'pointFilterSelected':
                        selectedMeasurementPickFilters.push( this.PICK_FILTERS.PICK_POINT );
                        break;

                    case 'arcCenterFilterSelected':
                        selectedMeasurementPickFilters.push( this.PICK_FILTERS.PICK_ARC_CENTER );
                        break;
                }
            }
        }
        this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_MEASURE_PICKFILTER_SELECTION_STATE, selectionStateData );
        return selectedMeasurementPickFilters;
    }

    /**
     * Stores measurement subCommandToolBar data to session storage
     * @param {Object} subToolBarCommandState Measurement subToolBarCommandState
     * @param {Object} OccmgmtContextKey occurence management context key
     */
    static setMeasurementCommandDataToSessionStorage( subToolBarCommandState, OccmgmtContextKey ) {
        let sessionStorageId = MEAS_SESSION_STORAGE_PREF + OccmgmtContextKey;
        viewerSessionStorageService.setViewerCommandDataToSessionStorage( sessionStorageId, subToolBarCommandState );
    }

    /**
     * Fetches measurements state
     * @returns {Object} measurement filters state
     */
    getMeasurementSubToolBarCommandState() {
        return this.viewerContextData.getValueOnViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_MEASURE_PICKFILTER_SELECTION_STATE );
    }

    /**
     * Fetches measurements Pick filters
     * @returns {Object} measurement pick filters
     */
    getSelectedMeasurementPickFilters() {
        return this.viewerContextData.getValueOnViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_MEASUREMENT_PICK_FILTER );
    }

    /**
     * Fetches selected measurement object
     * @returns {Object} measurement object
     */
    getSelectedMeasurementObject() {
        return this.viewerContextData.getValueOnViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_MEASUREMENT_SELECTION );
    }

    /**
     * Set measurement pick filters
     * @param {Array} selectedPickFilters array of selected pick filters
     * @param {Object} selectedPickFiltersState selected pick filter state object
     */
    setSelectedMeasurementPickFilters( selectedPickFilters, selectedPickFiltersState ) {
        var pickFilterState = ViewerMeasurementManager.generatePickFilterValue( selectedPickFilters );
        this.setMeasurementModeOptions( this.currentMeasuremenMode, pickFilterState, false );
        this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_MEASUREMENT_PICK_FILTER, selectedPickFilters );
        this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT + '.' + GEOANALYSIS_VIEWER_MEASURE_PICKFILTER_SELECTION_STATE, selectedPickFiltersState );
        ViewerMeasurementManager.setMeasurementCommandDataToSessionStorage( selectedPickFiltersState, this.viewerContextData.getOccmgmtContextKey() );
    }

    /**
     * Handle viewer atomic data update
     * @param {String} topic topic
     * @param {Object} data updated data
     */
    update( topic, data ) {
        if( topic === this.viewerContextData.SUB_COMMANDS_TOOLBAR_ACTIVE_STATUS ) {
            if( data && !data.isActivated ) {
                this.disableMeasurement();
            } else {
                if( data && data.isActivated && !( data.commandId === 'Awv0GeometricAnalysisMeasure' || data.commandId === 'Awv0GeometricAnalysisQuery' ) ) {
                    this.disableMeasurement();
                } else if( data && data.isActivated && ( data.commandId === 'Awv0GeometricAnalysisMeasure' || data.commandId === 'Awv0GeometricAnalysisQuery' ) ) {
                    if( data.commandId === 'Awv0GeometricAnalysisMeasure' ) {
                        let viewerSubCommandCommand = this.viewerContextData.getValueOnViewerAtomicData( viewerContextService.VIEWER_SUB_COMMANDS_LIST );
                        let newViewerSubCommandCommand = { ...viewerSubCommandCommand };
                        newViewerSubCommandCommand.Awv0GeometricAnalysisQuery = false;
                        this.viewerContextData.updateViewerAtomicData( viewerContextService.VIEWER_SUB_COMMANDS_LIST, newViewerSubCommandCommand );
                    }
                    if( data.commandId === 'Awv0GeometricAnalysisQuery' ) {
                        let viewerSubCommandCommand = this.viewerContextData.getValueOnViewerAtomicData( viewerContextService.VIEWER_SUB_COMMANDS_LIST );
                        let newViewerSubCommandCommand = { ...viewerSubCommandCommand };
                        newViewerSubCommandCommand.Awv0GeometricAnalysisMeasure = false;
                        this.viewerContextData.updateViewerAtomicData( viewerContextService.VIEWER_SUB_COMMANDS_LIST, newViewerSubCommandCommand );
                    }
                }
            }
        } else if( topic ===  this.viewerContextData.CLEANUP_3D_VIEWER ) {
            viewerContextService.closeSubCommandsToolbar( this.viewerContextData );
        }
    }

    /**
     * disable measurement
     */
    disableMeasurement() {
        this.doubleMeasurements.length = 0;
        this.singleMeasurements.length = 0;
        this.closeViewerMeasurement();
        this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_VIEWER_MEASUREMENT, {} );
        let viewerSubCommandCommand = this.viewerContextData.getValueOnViewerAtomicData( viewerContextService.VIEWER_SUB_COMMANDS_LIST );
        if( viewerSubCommandCommand ) {
            let newViewerSubCommandCommand = { ...viewerSubCommandCommand };
            newViewerSubCommandCommand.Awv0GeometricAnalysisMeasure = false;
            newViewerSubCommandCommand.Awv0GeometricAnalysisQuery = false;
            this.viewerContextData.updateViewerAtomicData( viewerContextService.VIEWER_SUB_COMMANDS_LIST, newViewerSubCommandCommand );
        }
    }

    /**
     * cleanup measurement
     */
    cleanUp() {
        this.disableMeasurement();
        this.viewerView.measurementMgr.removeListener( this.viewerMeasurementListener );
    }
}

export default {
    GEOANALYSIS_VIEWER_MEASUREMENT,
    GEOANALYSIS_VIEWER_MEASUREMENT_PICK_FILTER,
    GEOANALYSIS_VIEWER_QUICK_MEASUREMENT_PICK_FILTER,
    GEOANALYSIS_VIEWER_MEASUREMENT_SELECTION,
    GEOANALYSIS_VIEWER_MEASUREMENT_COUNT,
    GEOANALYSIS_VIEWER_MEASURE_PICKFILTER_SELECTION_STATE,
    getViewerMeasurementManager
};
