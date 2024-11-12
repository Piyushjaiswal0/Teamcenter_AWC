// Copyright (c) 2022 Siemens

/**
 * This Motion service provider
 *
 * @module js/viewerMotionManagerProvider
 */

import viewerContextService from 'js/viewerContext.service';
import _ from 'lodash';
import assert from 'assert';
import '@swf/ClientViewer';
import viewerSessionStorageService from 'js/viewerSessionStorageService';
import dms from 'soa/dataManagementService';
import messagingService from 'js/messagingService';
import localeSvc from 'js/localeService';
import cdm from 'soa/kernel/clientDataModel';
import soaSvc from 'soa/kernel/soaService';

/**
 * Provides an instance of viewer Motion manager
 *
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {ViewerMotionManager} Returns viewer Motion manager
 */
let getViewerMotionManager = function( viewerView, viewerContextData ) {
    return new ViewerMotionManager( viewerView, viewerContextData );
};

const EXPLODED_VIEW_MODE_DISTANCE = 0;
const EXPLODED_VIEW_PERCENT_MIN = 0;
const EXPLODED_VIEW_PERCENT_MAX = 100;
const MOVE_PARTS = 'moveParts';
const MOVE_PARTS_FREE_DRAG_ENABLED = 'isFreeDragEnabled';
const MOVE_PARTS_MANIPULATOR_ENABLED = 'isManipulatorEnabled';
const MOVE_PARTS_FEATURE_ALIGN_ENABLED = 'isFeatureAlignEnabled';
const MOVE_PARTS_PICK_FILTER = 'selectedMovePartsPickFilters';
const MOVE_PARTS_PICKFILTER_SELECTION_STATE = 'viewerMovePartsPickfilterSelectionState';
const MOVE_PARTS_SESSION_STORAGE_PREF = 'MovePartsCmdGrp_';
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
const RESET_ALL = window.JSCom.Consts.MotionResetType.RESET_ALL;
const RESET_SGO = window.JSCom.Consts.MotionResetType.RESET_SGO;
const RESET_BOTH = window.JSCom.Consts.MotionResetType.RESET_BOTH;

/**
 * Class to hold the viewer Motion data
 */
class ViewerMotionManager {
    /**
     * ViewerMotionManager class constructor
     *
     * @constructor ViewerMotionManager
     *
     * @param {Object} viewerView Viewer view
     * @param {Object} viewerContextData Viewer Context data
     */
    constructor( viewerView, viewerContextData ) {
        assert( viewerView, 'Viewer view can not be null' );
        assert( viewerContextData, 'Viewer context data can not be null' );
        this.viewerView = viewerView;
        this.viewerContextData = viewerContextData;
        this.initialize();
        this.setupAtomicDataTopics();
    }
    /**
     * Initialize ViewerMotionManager
     */
    initialize() {
        this.setExplodeViewMode( EXPLODED_VIEW_MODE_DISTANCE );
        this.isExplodeViewActive = false;
        this.isFreeDragEnabled = false;
        this.isManipulatorEnabled = false;
        this.isFeatureAlignEnabled = false;
        this.onOpenExplodeView = false;
        this.onOpenExplodeViewPercent = 0;
        this.sliderProperty = null;
        this.PICK_FILTERS = {
            PICK_FEATURES_ALL: 'PICK_FEATURES_ALL',
            PICK_PARTS: 'PICK_PARTS',
            PICK_SURFACE: 'PICK_SURFACE',
            PICK_EDGE: 'PICK_EDGE',
            PICK_VERTEX: 'PICK_VERTEX',
            PICK_POINT: 'PICK_POINT',
            PICK_NONE: 'PICK_NONE'
        };
        // register listener for events from JSCom that will tell us to explode
        // the view and what the percentage to explode to. We will open Explode toolbar
        // and set slider to that percentage. This will be used when restoring a
        // session or snapshot.
        this.viewerMontionManagerListener = {
            onOpenExplodePercentChange: explodePercent  => {
                this.setExplodeViewEnabled( true );
                this.setExplodeViewPercent( explodePercent * 100.0 );
                this.viewerContextData.updateViewerAtomicData( viewerContextService.VIEWER_IS_EXPLODE_VIEW_VISIBLE, true );
                this.onOpenExplodeView = true;  // save for when slider is created
                this.onOpenExplodeViewPercent = explodePercent * 100.0;
            }
        };
        this.viewerView.motionMgr.addExplodedViewListener( this.viewerMontionManagerListener );
    }
    /**
     * setupAtomicDataTopics ViewerMotionManager
     */
    setupAtomicDataTopics() {
        this.viewerContextData.getViewerAtomicDataSubject().subscribe( this.viewerContextData.SUB_COMMANDS_TOOLBAR_ACTIVE_STATUS, this );
        this.viewerContextData.getViewerAtomicDataSubject().subscribe( viewerContextService.VIEWER_COMMAND_PANEL_LAUNCHED, this );
        this.viewerContextData.getViewerAtomicDataSubject().subscribe( this.viewerContextData.CLEANUP_3D_VIEWER, this );
        this.viewerContextData.getViewerAtomicDataSubject().subscribe( viewerContextService.VIEWER_CREATE_SECTION_BEGIN, this );
        this.viewerContextData.getViewerAtomicDataSubject().subscribe( viewerContextService.VIEWER_CREATE_MARKUP_BEGIN, this );
    }

    /**
     * Set explode View Mode Distance/Volume/Radial
     *
     * @param {Number} explodeMode Explode view mode. i.e Distance = 0 ,volume = 1, Radial =2
     */
    setExplodeViewMode( explodeMode ) {
        if( this.viewerView && this.viewerView.motionMgr ) {
            this.viewerView.motionMgr.setExplodedViewMode( explodeMode );
        }
    }

    /**
     * Set explode mode enabled or disabled
     *
     * @param {boolean} isEnabled should Exploded view be enabled
     */
    setExplodeViewEnabled( isEnabled ) {
        if( this.viewerView && this.viewerView.motionMgr ) {
            this.viewerView.motionMgr.setExplodedView( isEnabled );
            this.isExplodeViewActive = isEnabled;
        }
    }

    /*
     * Set Free Drag Enable or Disable
     */
    setFreeDrag() {
        if( this.viewerView && this.viewerView.motionMgr ) {
            if( !this.isFreeDragEnabled ) {
                if( this.isManipulatorEnabled ) {
                    this.isManipulatorEnabled = false;
                    this.setOrUnsetManipulator();
                }
                if( this.isFeatureAlignEnabled ) {
                    this.isFeatureAlignEnabled = false;
                    this.setOrUnsetFeatureAlign();
                }
            }
            this.isFreeDragEnabled = !this.isFreeDragEnabled;
            this.setOrUnsetFreeDrag();
        }
    }

    /*
     * Set Manipulator Enable or Disable
     */
    setManipulator() {
        if( this.viewerView && this.viewerView.motionMgr ) {
            if( !this.isManipulatorEnabled ) {
                if( this.isFreeDragEnabled ) {
                    this.isFreeDragEnabled = false;
                    this.setOrUnsetFreeDrag();
                }
                if( this.isFeatureAlignEnabled ) {
                    this.isFeatureAlignEnabled = false;
                    this.setOrUnsetFeatureAlign();
                }
            }
            this.isManipulatorEnabled = !this.isManipulatorEnabled;
            this.setOrUnsetManipulator();
        }
    }

    setPickingModeToParts() {
        var selectedPickFilters = [];
        selectedPickFilters.push( this.PICK_FILTERS.PICK_NONE );
        var pickFilterState = ViewerMotionManager.generatePickFilterValue( selectedPickFilters );
        this.setMovePartsModeOptions( pickFilterState );
    }

    setFeatureAlignment() {
        if( this.viewerView && this.viewerView.motionMgr ) {
            if( !this.isFeatureAlignEnabled ) {
                if( this.isFreeDragEnabled ) {
                    this.isFreeDragEnabled = false;
                    this.setOrUnsetFreeDrag();
                }
                if( this.isManipulatorEnabled ) {
                    this.isManipulatorEnabled = false;
                    this.setOrUnsetManipulator();
                }
            }
            this.isFeatureAlignEnabled = !this.isFeatureAlignEnabled;
            this.setOrUnsetFeatureAlign();
        }
    }

    setMovePartsModeOptions( pickFilterState ) {
        if( this.viewerView && this.viewerView.motionMgr ) {
            let movePartsParams = {
                pickFilterState: pickFilterState
            };
            this.viewerContextData.getSelectionManager().setPickingMode( movePartsParams );
        }
    }

    setOrUnsetManipulator() {
        if( this.viewerView && this.viewerView.motionMgr ) {
            this.viewerContextData.updateViewerAtomicData( MOVE_PARTS + '.' + MOVE_PARTS_MANIPULATOR_ENABLED, this.isManipulatorEnabled );
            this.viewerView.motionMgr.enablePartsManipulator( this.isManipulatorEnabled );
        }
        if( this.isManipulatorEnabled ) {
            this.setMovePartsPickMode();
        } else {
            this.setPickingModeToParts();
        }
    }

    setOrUnsetFreeDrag() {
        if( this.viewerView && this.viewerView.motionMgr ) {
            this.viewerContextData.updateViewerAtomicData( MOVE_PARTS + '.' + MOVE_PARTS_FREE_DRAG_ENABLED, this.isFreeDragEnabled );
            this.viewerView.motionMgr.enableScreenDrag( this.isFreeDragEnabled );
        }
    }

    setOrUnsetFeatureAlign() {
        if( this.viewerView && this.viewerView.motionMgr ) {
            this.viewerContextData.updateViewerAtomicData( MOVE_PARTS + '.' + MOVE_PARTS_FEATURE_ALIGN_ENABLED, this.isFeatureAlignEnabled );
            this.viewerView.motionMgr.enableFeatureAlignment( this.isFeatureAlignEnabled );
        }
        if( this.isFeatureAlignEnabled ) {
            this.setMovePartsPickMode();
        } else {
            this.setPickingModeToParts();
        }
    }

    /**
     * Reset all parts
     */
    resetAll() {
        let param = {
            occsList: null,
            resetType: RESET_ALL
        };
        if( this.viewerView && this.viewerView.motionMgr ) {
            this.viewerView.motionMgr.reset( param );
        }
    }

    /**
     * Reset selected parts
     * @param {Object} selectedParts viewer occurence objects of selected parts
     */
    resetSelected( selectedParts ) {
        let param = null;
        if( selectedParts === [] ) {
            param = {
                occsList: [],
                resetType: RESET_SGO
            };
        } else {
            param = {
                occsList: selectedParts,
                resetType: RESET_BOTH
            };
        }
        if( this.viewerView && this.viewerView.motionMgr ) {
            this.viewerView.motionMgr.reset( param );
        }
    }

    savePosition( selectedParts, i18n, bomLines ) {
        if( this.viewerView && this.viewerView.motionMgr ) {
            let savePromise = this.viewerView.motionMgr.getTCPersistableTransform( selectedParts );
            savePromise.then( absoluteTransformations => {
                //slice the array into parts
                let xForm = Array.prototype.slice.call( absoluteTransformations.xForm );
                let xFormsStringsArray = [];
                for( let idx = 0; idx < bomLines.length; idx++ ) {
                    xFormsStringsArray[idx] = '';
                    for( let i = 0; i < 15; i++ ) {
                        xFormsStringsArray[idx] = xFormsStringsArray[idx].concat( xForm[i] + ' ' );
                    }
                    xFormsStringsArray[idx] = xFormsStringsArray[idx].concat( xForm[15] );
                    xForm.splice( 0, 16 );
                }
                if( selectedParts.length === absoluteTransformations.occs.length ) {
                    //all parts selected are moved
                    let input = [];
                    for( let i = 0; i < bomLines.length; i++ ) {
                        input[i] = {
                            object: bomLines[i],
                            vecNameVal: [ {
                                name: 'bl_plmxml_abs_xform',
                                values: [ xFormsStringsArray[i] ]
                            }
                            ]
                        };
                    }
                    let bomWindows = [];
                    let getResponse = dms.getPropertiesUnchecked(  bomLines, [ 'bl_window' ] );
                    getResponse.then( function( info ) {
                        let bomLineObject = info.modelObjects[bomLines[0].uid];
                        let blWindowUid = bomLineObject.props.bl_window.dbValues[0];

                        bomWindows[0] =  {
                            uid: blWindowUid,
                            type: 'BOMWindow'
                        };
                        let blWindowObject = {
                            bomWindows: bomWindows
                        };
                        let setResponse = dms.setProperties( input );
                        setResponse.then( function( info ) {
                            soaSvc.post( 'Cad-2008-06-StructureManagement', 'saveBOMWindows', blWindowObject ).then( function( response ) {
                                messagingService.showInfo( i18n.allPartsMoved );
                            }, function( error ) {
                                messagingService.showInfo( error.message );
                            } );
                        }, function( error ) {
                            if( error.cause.partialErrors ) {
                                soaSvc.post( 'Cad-2008-06-StructureManagement', 'saveBOMWindows', blWindowObject ).then( function( response ) {
                                    let finalMessage = '';
                                    finalMessage = i18n.somePartsMoved;
                                    finalMessage = finalMessage.replace( '{0}', selectedParts.length );
                                    finalMessage = finalMessage.replace( '{1}', selectedParts.length - error.cause.partialErrors.length );
                                    messagingService.showInfo( finalMessage );
                                }, function( error ) {
                                    messagingService.showInfo( error.message );
                                } );
                            } else {
                                messagingService.showInfo( error.message );
                            }
                        } );
                    } );
                } else if( selectedParts.length > absoluteTransformations.occs.length ) {
                    let input = [];
                    for( let i = 0; i < selectedParts; i++ ) {
                        if( absoluteTransformations.occs.find( e => e.theStr === selectedParts[i].theStr )  ) {
                        //if ith model object is moved - set property - compare with the occs object if yes do following else skip
                            input = {
                                object: bomLines[i],
                                vecNameVal: [ {
                                    name: 'bl_plmxml_abs_xform',
                                    values: [ xFormsStringsArray[i] ]
                                }
                                ]
                            };
                        }
                    }
                    let bomWindows = [];
                    let blWindowObject;
                    let getResponse = dms.getPropertiesUnchecked(  bomLines, [ 'bl_window' ] );
                    getResponse.then( function( info ) {
                        for( let i = 0; i < bomLines.length; i++ ) {
                            let bomLineObject = info.modelObjects[bomLines[i].uid];
                            let blWindowUid = bomLineObject.props.bl_window.dbValues[0];

                            bomWindows[i] =  {
                                uid: blWindowUid,
                                type: 'BOMWindow'
                            };
                        }
                        blWindowObject = {
                            bomWindows: bomWindows
                        };
                        let setResponse = dms.setProperties( input );
                        setResponse.then( function( info ) {
                            soaSvc.post( 'Cad-2008-06-StructureManagement', 'saveBOMWindows', blWindowObject ).then( function( response ) {
                                let finalMessage = '';
                                finalMessage = i18n.somePartsMoved;
                                finalMessage = finalMessage.replace( '{0}', selectedParts.length );
                                finalMessage = finalMessage.replace( '{1}', absoluteTransformations.occs.length );
                                messagingService.showInfo( finalMessage );
                            }, function( error ) {
                                messagingService.showInfo( error.message );
                            } );
                        }, function( error ) {
                            if( error.cause.partialErrors ) {
                                soaSvc.post( 'Cad-2008-06-StructureManagement', 'saveBOMWindows', blWindowObject ).then( function( response ) {
                                    let finalMessage = '';
                                    finalMessage = i18n.somePartsMoved;
                                    finalMessage = finalMessage.replace( '{0}', selectedParts.length );
                                    finalMessage = finalMessage.replace( '{1}', selectedParts.length - error.cause.partialErrors.length );
                                    messagingService.showInfo( finalMessage );
                                }, function( error ) {
                                    messagingService.showInfo( error.message );
                                } );
                            } else {
                                messagingService.showInfo( error.message );
                            }
                        } );
                    } );
                } else if ( absoluteTransformations.occs.length === 0 ) {
                    //no parts were moved
                    messagingService.showInfo( i18n.noPartsMoved );
                }
            } );
        }
    }

    getMovePartsSubToolBarCommandState() {
        return this.viewerContextData.getValueOnViewerAtomicData( MOVE_PARTS + '.' + MOVE_PARTS_PICKFILTER_SELECTION_STATE );
    }

    /**
     * Set move parts pick filters
     * @param {Array} selectedPickFilters array of selected pick filters
     * @param {Object} selectedPickFiltersState selected pick filter state object
     */
    setSelectedMovePartsPickFilters( selectedPickFilters, selectedPickFiltersState ) {
        var pickFilterState = ViewerMotionManager.generatePickFilterValue( selectedPickFilters );
        this.setMovePartsModeOptions( pickFilterState );
        this.viewerContextData.updateViewerAtomicData( MOVE_PARTS + '.' + MOVE_PARTS_PICK_FILTER, selectedPickFilters );
        this.viewerContextData.updateViewerAtomicData( MOVE_PARTS + '.' + MOVE_PARTS_PICKFILTER_SELECTION_STATE, selectedPickFiltersState );
        ViewerMotionManager.setMovePartsCommandDataToSessionStorage( selectedPickFiltersState, this.viewerContextData.getOccmgmtContextKey() );
    }

    /**
     * Fetches measurements Pick filters
     * @returns {Object} measurement pick filters
     */
    getSelectedMovePartsPickFilters() {
        return this.viewerContextData.getValueOnViewerAtomicData( MOVE_PARTS + '.' + MOVE_PARTS_PICK_FILTER );
    }

    /**
     * Set measurement pick mode
     * @param {MEASUREMENT_MODE} measurementMode measurement mode
     */
    setMovePartsPickMode() {
        let pickFilters = this.viewerContextData.getValueOnViewerAtomicData( MOVE_PARTS + '.' + MOVE_PARTS_PICK_FILTER );
        if( _.isNull( pickFilters ) || _.isUndefined( pickFilters ) || pickFilters.length <= 0 ) {
            pickFilters = this.setPickFilterSelectionStateInSubCommandToolBar();
            this.viewerContextData.updateViewerAtomicData( MOVE_PARTS + '.' + MOVE_PARTS_PICK_FILTER, pickFilters );
        }
        let pickFilterState = ViewerMotionManager.generatePickFilterValue( pickFilters );
        this.setMovePartsModeOptions( pickFilterState );
    }

    /**
     * Sets pick filter selection state to subcommand toolbar from session storage
     * @returns {Array} array of picked filters
     */
    setPickFilterSelectionStateInSubCommandToolBar() {
        let sessionStorageId = MOVE_PARTS_SESSION_STORAGE_PREF + this.viewerContextData.getOccmgmtContextKey();
        let selectionStateData = viewerSessionStorageService.getViewerCommandDataToSessionStorage( sessionStorageId );
        if( !selectionStateData ) {
            selectionStateData = {};
            selectionStateData.partsFilterSelected = true;
            selectionStateData.surfaceFilterSelected = false;
            selectionStateData.vertexFilterSelected = false;
            selectionStateData.edgeFilterSelected = false;
            selectionStateData.pointFilterSelected = false;
        }
        let selectedMovePartsPickFilters = [];
        for( const filter in selectionStateData ) {
            if( selectionStateData[ filter ] === true ) {
                switch ( filter ) {
                    case 'partsFilterSelected':
                        selectedMovePartsPickFilters.push( this.PICK_FILTERS.PICK_PARTS );
                        break;

                    case 'surfaceFilterSelected':
                        selectedMovePartsPickFilters.push( this.PICK_FILTERS.PICK_SURFACE );
                        break;

                    case 'edgeFilterSelected':
                        selectedMovePartsPickFilters.push( this.PICK_FILTERS.PICK_EDGE );
                        break;

                    case 'vertexFilterSelected':
                        selectedMovePartsPickFilters.push( this.PICK_FILTERS.PICK_VERTEX );
                        break;

                    case 'pointFilterSelected':
                        selectedMovePartsPickFilters.push( this.PICK_FILTERS.PICK_POINT );
                        break;
                }
            }
        }
        this.viewerContextData.updateViewerAtomicData( MOVE_PARTS + '.' + MOVE_PARTS_PICKFILTER_SELECTION_STATE, selectionStateData );
        return selectedMovePartsPickFilters;
    }

    /**
     * Stores measurement subCommandToolBar data to session storage
     * @param {Object} subToolBarCommandState Measurement subToolBarCommandState
     * @param {Object} OccmgmtContextKey occurence management context key
     */
    static setMovePartsCommandDataToSessionStorage( subToolBarCommandState, OccmgmtContextKey ) {
        let sessionStorageId = MOVE_PARTS_SESSION_STORAGE_PREF + OccmgmtContextKey;
        viewerSessionStorageService.setViewerCommandDataToSessionStorage( sessionStorageId, subToolBarCommandState );
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
     * Set explode view slider property
     *
     * @param {Object} _explodeSliderProp explode view slider property
     */

    setExplodeSliderProperty( _explodeSliderProp ) {
        this.sliderProperty = _explodeSliderProp;
        // if slider is being created due to us receiving an event to automatically
        // explode the view, set the slider value to the saved percentage from the
        // JSCom event we received.
        if( this.onOpenExplodeView ) {
            this.sliderProperty.dbValue[ 0 ].sliderOption.value = this.onOpenExplodeViewPercent;
        }
    }

    /**
     * Set explode view percent
     *
     * @param {Number} explodePercent set Exploded view percent
     */
    setExplodeViewPercent( explodePercent ) {
        if( this.viewerView && this.viewerView.motionMgr && explodePercent >= EXPLODED_VIEW_PERCENT_MIN && explodePercent <= EXPLODED_VIEW_PERCENT_MAX ) {
            this.viewerView.motionMgr.setExplodedViewPercent( explodePercent / 100 );
        }
    }

    /**
     * Reset Explode view Percentage
     *
     */
    resetExplodeView() {
        this.setExplodeViewPercent( EXPLODED_VIEW_PERCENT_MIN );
        this.onOpenExplodeView = false;
    }

    /**
     * Start Explode view Mode in viewer
     */
    startExplodeViewMode() {
        this.setExplodeViewEnabled( true );
        this.resetExplodeView();
    }

    /**
     * Close Explode view mode in viewer
     *
     * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
     */
    closeExplodeViewMode() {
        this.resetExplodeView();
        this.setExplodeViewEnabled( false );
    }

    /**
     * Handle viewer atomic data update
     * @param {String} topic topic
     * @param {Object} data data
     */
    update( topic, data ) {
        if( topic === viewerContextService.VIEWER_COMMAND_PANEL_LAUNCHED ||
            topic === viewerContextService.VIEWER_CREATE_SECTION_BEGIN ||
            topic === viewerContextService.VIEWER_CREATE_MARKUP_BEGIN ||
            topic === this.viewerContextData.CLEANUP_3D_VIEWER ||
            topic === this.viewerContextData.SUB_COMMANDS_TOOLBAR_ACTIVE_STATUS ) {
            if( this.isExplodeViewActive ) {
                this.disableExplodeView();
            }
        }
        if( topic === this.viewerContextData.SUB_COMMANDS_TOOLBAR_ACTIVE_STATUS ) {
            if( ( data && !data.isActivated || data && data.isActivated && data.commandId !== 'Awv0MoveParts' ) && this.viewerContextData.getValueOnViewerAtomicData( 'renderLocation' ) === 'CSR' ) {
                this.closeMovePartsToolbar();
                if( data && data.isActivated && ( data.commandId === 'Awv0GeometricAnalysisQuery' || data.commandId === 'Awv0GeometricAnalysisMeasure' ) ) {
                    if( this.isFreeDragEnabled ) {
                        this.isFreeDragEnabled = false;
                        this.setOrUnsetFreeDrag();
                    }
                    if( this.isFeatureAlignEnabled ) {
                        this.isFeatureAlignEnabled = false;
                        this.setOrUnsetFeatureAlign();
                    }
                    if( this.isManipulatorEnabled ) {
                        this.isManipulatorEnabled = false;
                        this.setOrUnsetManipulator();
                    }
                }
            }
        }
        if( topic === this.viewerContextData.CLEANUP_3D_VIEWER && this.viewerContextData.getValueOnViewerAtomicData( 'renderLocation' ) === 'CSR' ) {
            this.isFreeDragEnabled = false;
            this.isManipulatorEnabled = false;
            this.isFeatureAlignEnabled = false;
            this.setOrUnsetFeatureAlign();
            this.setOrUnsetFreeDrag();
            this.setOrUnsetManipulator();
            viewerContextService.closeSubCommandsToolbar( this.viewerContextData );
        }
    }

    /**
     * disable Explode View
     */
    disableExplodeView() {
        this.closeExplodeViewMode();
        this.viewerContextData.updateViewerAtomicData( viewerContextService.VIEWER_IS_EXPLODE_VIEW_VISIBLE, false );
    }

    /**
     * cleanup motion
     */
    cleanUp() {
        this.viewerView.motionMgr.removeExplodedViewListener( this.viewerMontionManagerListener );
    }

    /**
     * Close the Move Parts toolbar
     */
    closeMovePartsToolbar() {
        if( this.isFreeDragEnabled ) {
            this.setFreeDrag();
        }
        if( this.isFeatureAlignEnabled ) {
            this.setFeatureAlignment();
        }
        if( this.isManipulatorEnabled ) {
            this.setManipulator();
        }
        if( this.viewerContextData ) {
            let viewerSubCommandCommand = this.viewerContextData.getValueOnViewerAtomicData( viewerContextService.VIEWER_SUB_COMMANDS_LIST );
            if( viewerSubCommandCommand ) {
                let newViewerSubCommandCommand = { ...viewerSubCommandCommand };
                newViewerSubCommandCommand.Awv0MoveParts = false;
                this.viewerContextData.updateViewerAtomicData( viewerContextService.VIEWER_SUB_COMMANDS_LIST, newViewerSubCommandCommand );
            }
        }
    }
}

export default {
    getViewerMotionManager,
    MOVE_PARTS,
    MOVE_PARTS_PICK_FILTER
};
