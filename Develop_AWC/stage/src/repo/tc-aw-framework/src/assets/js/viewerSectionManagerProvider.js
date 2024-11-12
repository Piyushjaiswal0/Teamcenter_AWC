// Copyright (c) 2021 Siemens

/**
 * This service is to create viewer section manager
 *
 * @module js/viewerSectionManagerProvider
 */
import AwPromiseService from 'js/awPromiseService';
import AwTimeoutService from 'js/awTimeoutService';
import localeSvc from 'js/localeService';
import viewerPreferenceService from 'js/viewerPreference.service';
import viewerUnitConversionService from 'js/viewerUnitConversionService';
import viewerContextService from 'js/viewerContext.service';
import _ from 'lodash';
import logger from 'js/logger';
import '@swf/ClientViewer';

/**
 * Provides an instance of viewer section manager
 *
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {ViewerSectionManager} Returns viewer section manager
 */
let getViewerSectionManager = function( viewerView, viewerContextData ) {
    return new ViewerSectionManager( viewerView, viewerContextData );
};

const GEOANALYSIS_SECTION_NAMESPACE = 'geoAnalysisSection';
const GEOANALYSIS_SECTION_LIST = 'sectionList';
const GEOANALYSIS_SECTION_OFFSET_LABEL = 'offsetLabel';
const GEOANALYSIS_SECTION_OFFSET_VALUE = 'offsetValue';
const GEOANALYSIS_SECTION_OFFSET_PERCENT_VALUE = 'offsetPercentValue';
const GEOANALYSIS_SECTION_OFFSET_MIN = 'offsetMinValue';
const GEOANALYSIS_SECTION_OFFSET_MAX = 'offsetMaxValue';
const GEOANALYSIS_SECTION_ISSELECTED = 'selected';
const GEOANALYSIS_SECTION_ID = 'sectionId';
const GEOANALYSIS_EDIT_SECTION_ID = 'editSectionId';
const GEOANALYSIS_SECTION_PLANE_LABEL = 'sectionPlaneLabel';
const GEOANALYSIS_SECTION_VISIBILITY = 'isSectionVisible';
const GEOANALYSIS_SECTION_OFFSET_THUMBNAIL = 'planeThumbnailIcon';
const GEOANALYSIS_SECTION_PLANE_IDS_LIST = 'sectionPlaneIdsProp';
const GEOANALYSIS_SECTION_PLANE_NAMES_LIST = 'sectionPlaneNamesProp';
const GEOANALYSIS_SECTION_ERROR_MESSAGE = 'sectionPlaneErrorMessage';
const GEOANALYSIS_SECTION_PLANE_ICONS_LIST = 'sectionPlaneIconsProp';
const GEOANALYSIS_SECTION_PLANE_SELECTION_ID = 'sectionPlaneSelectionIdProp';
const GEOANALYSIS_SHOW_CAPS_AND_CUT_LINES = 'isShowCapsAndCutLines';
const GEOANALYSIS_SECTION_NORMAL = 'sectionNormal';
const GEOANALYSIS_SECTION_CLIP_STATE = 'sectionClipState';
const GEOANALYSIS_SECTION_CLIP_STATE_LIST = 'sectionClipStateList';
const GEOANALYSIS_SECTION_CUT_LINES_STATE = 'sectionCutLinesState';
const GEOANALYSIS_SECTION_PLANE_POSITION_VAL = 'sectionPlanePosition';
const GEOANALYSIS_SECTION_TO_BE_DELETED = 'viewerSectionToBeDeleted';
const GEOANALYSIS_ALLOW_SECTION_CREATION = 'allowSectionCreation';
const GEOANALYSIS_ENABLE_SECTION_COMMAND_PANEL = 'enableSectionCommandPanel';
const GEOANALYSIS_SELECTED_SECTION_IN_3D = 'sectionSelectedIn3D';
const GEOANALYSIS_IGNORE_OFFSET_UPDATE = 'ignoreOffsetUpdate';
const GEOANALYSIS_OFFSET_FROM_3D = 'offsetFrom3D';
const GEOANALYSIS_IS_SECTION_LIST_UPDATE_NEEDED = 'isSectionListUpdateNeeded';
const GEOANALYSIS_IS_EDIT_SECTION_UPDATE_NEEDED = 'isEditSectionUpdateNeeded';
const GEOANALYSIS_UPDATE_SECTION_SLIDER = 'updateSectionSlider';
const GEOANALYSIS_UPDATE_SECTION_OFFSET = 'updateSectionOffset';
const GEOANALYSIS_SKIP_SELECTION_UPDATE = 'skipSelectionUpdate';
const GEOANALYSIS_CURRENT_SECTION_MODE = 'currentSectionMode';
const GEOANALYSIS_SECTION_MODE_SURFACE = 'ALIGN_TO_SURFACE';
const GEOANALYSIS_SECTION_MODE_EDGE = 'NORMAL_TO_CURVE';

/**
 * Class to hold the viewer section data
 *
 * @constructor ViewerSectionManager
 *
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */
class ViewerSectionManager {
    constructor( viewerView, viewerContextData ) {
        this.viewerView = viewerView;
        this.viewerContextData = viewerContextData;
        this.sectionIdToSectionObjectMap = {};
        this.sectionsList = [];
        // The map stores the information about the custom plane section.
        this.customSectionIdToSectionObjectMap = {};
        this.currentSectionMode = null;
        this.sectionListenerFlag = false;
        this.customSectionCreationListeners = [];
        this.geometricSectionState = null;
        this.offsetUpdateRequestQueue = [];
        this.timeoutForSetOffset = null;
        this.initialize();
        this.setupAtomicDataTopics();
    }
    initialize() {
        /**
         * images for dropdown planes.
         */
        this.CMDPLANEIMAGES = [ 'cmdXyPlanar', 'cmdZxPlanar', 'cmdYzPlanar', 'cmdNonOrthogonalSectionPlane' ];
        /**
         * Ids for dropdown planes. Do not change the order.
         */
        this.PLANEIDS = [ 1, 2, 3 ];
        this.customPlaneID = '4';
        /**
         * Plane orientation labels
         */
        this.SECTION_PLANES = [ ViewerSectionManager.getLocalizedText( 'xy' ), ViewerSectionManager.getLocalizedText( 'xz' ), ViewerSectionManager.getLocalizedText( 'yz' ) ];

        this.CLIP_STATES = [ ViewerSectionManager.getLocalizedText( 'Neither' ), ViewerSectionManager.getLocalizedText( 'Near' ), ViewerSectionManager.getLocalizedText( 'Far' ), ViewerSectionManager
            .getLocalizedText( 'Both' )
        ];
        this.viewerSectionListener = {
            onSectionCreated: section => {
                this.deselectExistingSections();
                this.handleViewerSectionCreationUsingEntities( section );
            }
        };
        const self = this;

        this.sectionPlanePositionChangeListener = {
            onPlanePositionChange: function( value ) {
                const sectionId = this.visObject.resourceID;
                if( self.debounceCallback ) {
                    AwTimeoutService.instance.cancel( self.debounceCallback );
                }
                self.debounceCallback = AwTimeoutService.instance( () => {
                    let roundedOffsetValue = ViewerSectionManager.getRoundedNumber( value );
                    self.updateGeometricSectionState( GEOANALYSIS_OFFSET_FROM_3D, {
                        sectionData: sectionId,
                        offsetValue: roundedOffsetValue
                    } );
                    self.debounceCallback = null;
                }, 250 );
            },
            onPlaneSelectionChange: function( isSelected ) {
                const sectionId = this.visObject.resourceID;
                let selectedSection = null;
                for( let i = 0; i < self.sectionsList.length; i++ ) {
                    if( self.sectionsList[ i ][ GEOANALYSIS_SECTION_ID ] === sectionId ) {
                        selectedSection = self.sectionsList[ i ];
                        break;
                    }
                }
                self.updateGeometricSectionState( GEOANALYSIS_SELECTED_SECTION_IN_3D, {
                    sectionData: selectedSection,
                    isSelected: isSelected
                } );
            }
        };
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
    update( topic, data ) {
        let viewerViewMode = this.viewerContextData.getViewerAtomicData().getValue().viewerViewMode;
        let isViewerRevealed = this.viewerContextData.getViewerAtomicData().getValue().isViewerRevealed;
        if( ( topic === viewerContextService.VIEWER_VIEW_MODE_TOKEN || topic === viewerContextService.VIEWER_VISIBILITY_TOKEN ) && viewerViewMode === 'VIEWER3D' && isViewerRevealed === true ) {
            this.updateSectionCommandState();
        } else if( topic === this.viewerContextData.SUB_COMMANDS_TOOLBAR_ACTIVE_STATUS || topic === viewerContextService.VIEWER_COMMAND_PANEL_LAUNCHED ) {
            if( data && data.isActivated || data.commandId !== 'Awv0GeometricAnalysisSection' ) {
                this.disableSectionMode();
            }
        }
    }

    /**
     * Update section command state
     *
     */
    updateSectionCommandState() {
        let sectionsPromise = this.viewerView.sectionMgr.getAllSections();
        sectionsPromise.then( function( sectionsList ) {
            if( sectionsList && sectionsList.length > 0 ) {
                this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_ALLOW_SECTION_CREATION, sectionsList.length < 6 );
                this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_ENABLE_SECTION_COMMAND_PANEL, true );
            } else {
                this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_ALLOW_SECTION_CREATION, true );
                this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_ENABLE_SECTION_COMMAND_PANEL, false );
                this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_SECTION_NAMESPACE, {} );
            }
        }.bind( this ) ).catch( error => {
            logger.error( 'Failed to set section command state: ' + error );
        } );
    }

    /**
     * This disbales section mode
     */
    disableSectionMode() {
        this.viewerContextData.getViewerAtomicDataSubject().unsubscribe( this.viewerContextData.SUB_COMMANDS_TOOLBAR_ACTIVE_STATUS, this );
        this.viewerContextData.getViewerAtomicDataSubject().unsubscribe( viewerContextService.VIEWER_COMMAND_PANEL_LAUNCHED, this );
        this.setSectionModeEnabled( false );
    }

    /**
     * Create viewer section
     *
     * @param {String} planeId plane id to create section
     * @param {Promise} deferred A promise resolved once section is create in viewer in given plane
     *
     * @return {Promise} A promise resolved once section is create in viewer in given plane
     */
    async createViewerSection( planeId ) {
        var initProps = [ {
            name: window.JSCom.Consts.CrossSectionProperties.NORMAL,
            value: this.mapToVector( planeId )
        } ];
        let newlyCreatedSection = null;
        return this.viewerView.sectionMgr.createCrossSection( initProps ).then( newlyCreatedCrossSection => {
            newlyCreatedSection = newlyCreatedCrossSection;
            return this.createSectionObject( newlyCreatedCrossSection, planeId );
        } ).then( sectionData => {
            this.deselectExistingSections();
            this.sectionIdToSectionObjectMap[ sectionData.sectionId ] = newlyCreatedSection;
            this.sectionsList.unshift( sectionData );
            this.updateGeometricSectionState( GEOANALYSIS_SKIP_SELECTION_UPDATE, true );
            this.updateGeometricSectionState( GEOANALYSIS_IGNORE_OFFSET_UPDATE, true );
            this.updateSectionListToViewerContext();
            return sectionData;
        } ).catch( errorMessage => {
            logger.error( errorMessage );
            return errorMessage;
        } );
    }

    /**
     *
     * @param {object} section section creation
     * @returns {object} sectionData
     */
    handleViewerSectionCreationUsingEntities( section ) {
        return this.createSectionObject( section, this.customPlaneID ).then(
            function( sectionData ) {
                this.sectionIdToSectionObjectMap[ sectionData.sectionId ] = section;
                this.sectionsList.unshift( sectionData );
                this.updateSectionListToViewerContext();
                this.setSectionModeEnabled( false );
                this.notifyCustomSectionCreated();
                return sectionData;
            }.bind( this ),
            function( errorMessage ) {
                logger.error( errorMessage );
                return errorMessage;
            }
        );
    }

    /**
     * Add custom section creation listener
     *
     * @param {Object} observerFunction function to be registered
     */
    registerforCustomSectionCreationListener( observerFunction ) {
        if( typeof observerFunction === 'function' ) {
            this.customSectionCreationListeners.push( observerFunction );
        }
    }

    /**
     * remove custom section creation listener
     *
     * @param {Object} observerFunction function to be removed
     */
    removeforCustomSectionCreationListener( observerFunction ) {
        if( typeof observerFunction === 'function' ) {
            var indexToBeRemoved = this.customSectionCreationListeners.indexOf( observerFunction );
            if( indexToBeRemoved > -1 ) {
                this.customSectionCreationListeners.splice( indexToBeRemoved, 1 );
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
    notifyCustomSectionCreated() {
        if( this.customSectionCreationListeners.length > 0 ) {
            _.forEach( this.customSectionCreationListeners, function( observer ) {
                observer.call( null, this.viewerContextData );
            }.bind( this ) );
        }
    }

    /**
     * Update section mode in context
     */
    updateSectionModeToViewerContext() {
        let sectionMode = undefined;
        if( this.currentSectionMode === window.JSCom.Consts.SectionMode.ALIGN_TO_SURFACE ) {
            sectionMode = GEOANALYSIS_SECTION_MODE_SURFACE;
        } else if( this.currentSectionMode === window.JSCom.Consts.SectionMode.NORMAL_TO_CURVE ) {
            sectionMode = GEOANALYSIS_SECTION_MODE_EDGE;
        }

        this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_CURRENT_SECTION_MODE, sectionMode );
        this.updateGeometricSectionState( GEOANALYSIS_CURRENT_SECTION_MODE, sectionMode );
    }

    /**
     *
     * @param {object} sectionCreatorOptions options for creating section
     */
    enterSectionCreationModeUsingEntities( sectionCreatorOptions ) {
        if( this.currentSectionMode === sectionCreatorOptions.SECTION_MODE ) {
            this.disableSectionMode();
        } else {
            if( this.currentSectionMode === null ) {
                this.setSectionModeEnabled( true );
            }
            this.setSectionCreatorOptions( sectionCreatorOptions );
            if( this.sectionListenerFlag === false ) {
                this.viewerView.sectionMgr.addListener( this.viewerSectionListener );
                this.sectionListenerFlag = true;
            }
            this.viewerContextData.getViewerAtomicDataSubject().subscribe( this.viewerContextData.SUB_COMMANDS_TOOLBAR_ACTIVE_STATUS, this );
            this.viewerContextData.getViewerAtomicDataSubject().subscribe( viewerContextService.VIEWER_COMMAND_PANEL_LAUNCHED, this );
        }
    }

    /**
     *
     * @param {boolean} isEnabled section mode
     */
    setSectionModeEnabled( isEnabled ) {
        if( !isEnabled ) {
            this.currentSectionMode = null;
            this.updateSectionModeToViewerContext();
        }
        this.viewerView.sectionMgr.enableSectionCreator( isEnabled );
    }

    /**
     *
     * @param {object} sectionCreatorOptions options for section creation
     */
    setSectionCreatorOptions( sectionCreatorOptions ) {
        this.currentSectionMode = sectionCreatorOptions.SECTION_MODE;
        var SectionModeOptions = {
            sectionMode: sectionCreatorOptions.SECTION_MODE,
            pickFilterState: sectionCreatorOptions.PICK_FILTER
        };
        this.viewerView.sectionMgr.setSectionCreatorOptions( SectionModeOptions );
        this.updateSectionModeToViewerContext();
    }

    /**
     * This api sets show caps and cut lines in viewer
     *
     * @function setShowCapsAndCutLines
     *
     * @param {String} isShowCapsAndLines true if section is to be selected
     *
     */
    async setShowCapsAndCutLines( isShowCapsAndLines ) {
        let deferred = AwPromiseService.instance.defer();
        this.viewerView.sectionMgr.setCappingAndLines( isShowCapsAndLines ).then(
            function() {
                deferred.resolve();
            },
            function( errorMessage ) {
                logger.error( errorMessage );
                deferred.reject( errorMessage );
            }
        );
    }

    /**
     * This api returns all section in current 3D session
     *
     * @function getAllSections
     */
    getAllSections() {
        let deferred = AwPromiseService.instance.defer();
        this.viewerView.sectionMgr.getAllSections().then( sectionsListFromServer => {
            deferred.resolve( sectionsListFromServer );
        } ).catch( error => {
            deferred.reject( error );
        } );
    }

    /**
     * This api used to initialize viewer context
     *
     * @function initializeSectionsFromContext
     *
     * @param {Object} geometricSectionState - Geometric section state
     * @param {Object} subPanelContext sub panel context
     */
    async initializeSectionsFromContext( geometricSectionState, subPanelContext ) {
        let deferred = AwPromiseService.instance.defer();
        let serverSectionsList = null;
        this.geometricSectionState = geometricSectionState;
        this.subPanelContext = subPanelContext;
        return this.viewerView.sectionMgr.getAllSections().then(
            function( sectionsListFromServer ) {
                let getSectionPromises = [];
                if( sectionsListFromServer && sectionsListFromServer.length > 0 ) {
                    for( let i = sectionsListFromServer.length - 1; i >= 0; i-- ) {
                        getSectionPromises.push( sectionsListFromServer.getSection( i ) );
                    }
                    return AwPromiseService.instance.all( getSectionPromises );
                }
                return [];
            }
        ).then(
            function( sectionsFromSectionList ) {
                let getSectionNormalPromises = [];
                if( sectionsFromSectionList && sectionsFromSectionList.length > 0 ) {
                    serverSectionsList = sectionsFromSectionList;
                    for( let i = 0; i < sectionsFromSectionList.length; i++ ) {
                        getSectionNormalPromises.push( sectionsFromSectionList[ i ].getNormal() );
                    }
                    return AwPromiseService.instance.all( getSectionNormalPromises );
                }
                return [];
            }
        ).then(
            function( sectionNormals ) {
                let getSectionObjectPromises = [];
                if( serverSectionsList && serverSectionsList.length > 0 && sectionNormals.length === serverSectionsList.length ) {
                    for( let i = 0; i < serverSectionsList.length; i++ ) {
                        getSectionObjectPromises.push( this.createSectionObject( serverSectionsList[ i ], ViewerSectionManager.getPlaneIdFromNormalVector( sectionNormals[ i ] ) ) );
                    }
                    return AwPromiseService.instance.all( getSectionObjectPromises );
                }
                return [];
            }.bind( this )
        ).then(
            function( sectionObjectsFromSectionList ) {
                this.sectionIdToSectionObjectMap = {};
                this.sectionsList.length = 0;
                for( let i = 0; i < sectionObjectsFromSectionList.length; i++ ) {
                    let sectionData = sectionObjectsFromSectionList[ i ];
                    this.sectionIdToSectionObjectMap[ sectionData.sectionId ] = serverSectionsList[ i ];
                    this.sectionsList.push( sectionData );
                }
                this.updateGeometricSectionState( GEOANALYSIS_IGNORE_OFFSET_UPDATE, true );
                this.updateGeometricSectionState( GEOANALYSIS_SKIP_SELECTION_UPDATE, true );
                this.updateSectionListToViewerContext();
                this.updateSectionModeToViewerContext();
                deferred.resolve();
            }.bind( this )
        ).catch( function( errorMessage ) {
            logger.error( errorMessage );
            deferred.reject( errorMessage );
        } );
    }

    /**
     * Create and send request for selecting a section in viewer
     *
     * @param {Number} sectionId section id
     * @param {Boolean} isSelected is selected
     */
    async setSectionSelection( sectionId, isSelected ) {
        let deferred = AwPromiseService.instance.defer();
        let sectionIdStr = sectionId ? sectionId.toString() : sectionId;
        let selectedSection = this.sectionIdToSectionObjectMap[ sectionIdStr ];
        if( selectedSection ) {
            return selectedSection.setSelected( isSelected ).then( () => {
                for( let i = 0; i < this.sectionsList.length; i++ ) {
                    let currentSection = this.sectionsList[ i ];
                    if( currentSection[ GEOANALYSIS_SECTION_ID ] === sectionId ) {
                        currentSection.selected = isSelected;
                        this.updateGeometricSectionState( GEOANALYSIS_IGNORE_OFFSET_UPDATE, true );
                        this.updateGeometricSectionState( GEOANALYSIS_SKIP_SELECTION_UPDATE, true );
                        this.updateGeometricSectionState( GEOANALYSIS_IS_SECTION_LIST_UPDATE_NEEDED, false );
                        this.updateSectionListToViewerContext();
                        break;
                    }
                }
                return deferred.resolve();
            },
            function( errorMessage ) {
                logger.error( errorMessage );
                return deferred.reject( errorMessage );
            }
            );
        }
        return deferred.resolve();
    }

    /**
     * Get section data by id
     *
     * @param {Number} sectionId section id
     * @returns {Object} Edit section data object
     */
    getSectionDataById( sectionId ) {
        let sectionData = null;
        for( let i = 0; i < this.sectionsList.length; i++ ) {
            if( this.sectionsList[ i ].sectionId === sectionId ) {
                sectionData = this.sectionsList[ i ];
                break;
            }
        }
        return sectionData;
    }

    /**
     * Deselect existing sections
     * @param {Boolean} skip3DUpdate true to skip 3D update
     */
    deselectExistingSections( skip3DUpdate ) {
        for( var i = 0; i < this.sectionsList.length; i++ ) {
            if( !skip3DUpdate && this.sectionsList[ i ].selected ) {
                this.setSectionSelection( this.sectionsList[ i ].sectionId, false );
            }
            this.sectionsList[ i ].selected = false;
        }
    }

    /**
     * Create and send request for selecting a section in viewer
     *
     * @param {Number} sectionId section id
     */
    toggleSectionVisibility( sectionId ) {
        let deferred = AwPromiseService.instance.defer();
        var selectedSection = this.sectionIdToSectionObjectMap[ sectionId ];
        if( selectedSection ) {
            selectedSection.getVisible().then(
                ( isVisible ) => {
                    selectedSection.setVisible( !isVisible ).then(
                        function() {
                            this.updateSectionsVisibilityInViewerContext( sectionId, !isVisible );
                            deferred.resolve();
                        }.bind( this ),
                        function( errorMessage ) {
                            logger.error( errorMessage );
                            deferred.reject( errorMessage );
                        }
                    );
                },
                function( errorMessage ) {
                    logger.error( errorMessage );
                    deferred.reject( errorMessage );
                }
            );
        } else {
            deferred.resolve();
        }
    }

    /**
     * Modify section
     *
     * @param {Number} sectionId section id
     * @param {Number} newNormal new normal value
     */
    async modifySection( sectionId, newNormal ) {
        let deferred = AwPromiseService.instance.defer();
        var selectedSection = this.sectionIdToSectionObjectMap[ sectionId ];
        var newPlaneId = ViewerSectionManager.getPlaneIdFromNormal( newNormal );
        if( selectedSection ) {
            var newNormalValArray = this.mapToVector( newPlaneId, sectionId );
            return selectedSection.setNormal( newNormalValArray ).then(
                () => {
                    if( newPlaneId === '4' ) {
                        var customSectionData = this.customSectionIdToSectionObjectMap[ sectionId ];

                        if( customSectionData && customSectionData[ GEOANALYSIS_SECTION_OFFSET_VALUE ] ) {
                            var convertedOffsetValue =
                                viewerUnitConversionService.convertToMeterFromAnotherUnits( ViewerSectionManager.getRoundedNumber( customSectionData[ GEOANALYSIS_SECTION_OFFSET_VALUE ] ),
                                    viewerPreferenceService.getDisplayUnit() );
                            return selectedSection.setOffset( convertedOffsetValue ).then(
                                () => {
                                    return this.modifySectionData( selectedSection, newPlaneId, sectionId );
                                },
                                function( errorMessage ) {
                                    logger.error( errorMessage );
                                    deferred.reject( errorMessage );
                                }
                            );
                        }
                        return this.modifySectionData( selectedSection, newPlaneId, sectionId );
                    }
                    return this.modifySectionData( selectedSection, newPlaneId, sectionId );
                },
                function( errorMessage ) {
                    logger.error( errorMessage );
                    deferred.reject( errorMessage );
                }
            );
        }
        return deferred.resolve();
    }

    /**
     * modify section data
     *
     * @param {Object} selectedSection selected section object
     * @param {Number} newPlaneId new value
     * @param {Number} sectionId section id
     * @returns {Promise} A promise resolved after scetion is updated
     */
    modifySectionData( selectedSection, newPlaneId, sectionId ) {
        let deferred = AwPromiseService.instance.defer();
        return this.createSectionObject( selectedSection, newPlaneId, sectionId ).then(
            ( sectionData ) => {
                var sectionIndex = 0;
                for( var i = 0; i < this.sectionsList.length; i++ ) {
                    if( this.sectionsList[ i ].sectionId === sectionId ) {
                        sectionIndex = i;
                        break;
                    }
                }
                this.modifySectionInViewerContext( sectionId );
                this.sectionIdToSectionObjectMap[ sectionData.sectionId ] = selectedSection;
                this.sectionsList.splice( sectionIndex, 0, sectionData );
                this.updateGeometricSectionState( GEOANALYSIS_IGNORE_OFFSET_UPDATE, true );
                this.updateGeometricSectionState( GEOANALYSIS_SKIP_SELECTION_UPDATE, true );
                this.updateSectionListToViewerContext();
                deferred.resolve();
            },
            function( errorMessage ) {
                logger.error( errorMessage );
                deferred.reject( errorMessage );
            }
        );
    }

    /**
     * Set section offset value
     *
     * @param {Number} sectionId section id
     * @param {Number} newValue new value
     */
    async setSectionOffsetValue( sectionId, newValue ) {
        let selectedSection = this.sectionIdToSectionObjectMap[ sectionId ];
        let roundedOffsetValue = ViewerSectionManager.getRoundedNumber( newValue );
        let convertedOffsetValue = viewerUnitConversionService.convertToMeterFromAnotherUnits( roundedOffsetValue, viewerPreferenceService.getDisplayUnit( this.viewerContextData ) );
        if( selectedSection ) {
            if( this.timeoutForSetOffset ) {
                AwTimeoutService.instance.cancel( this.timeoutForSetOffset );
            }
            this.timeoutForSetOffset = AwTimeoutService.instance( () => {
                this.updateSectionOffsetInViewerContext( sectionId, convertedOffsetValue, true );
                this.timeoutForSetOffset = null;
            }, 500 );
            return selectedSection.setOffset( convertedOffsetValue ).catch( error => {
                logger.error( error );
            } );
        }
        return AwPromiseService.instance.reject();
    }

    /**
     * move section offset value
     *
     * @param {Number} sectionId section id
     * @param {Number} offsetValue new offset value
     */
    async moveSection( sectionId, offsetValue ) {
        let selectedSection = this.sectionIdToSectionObjectMap[ sectionId ];
        let roundedOffsetValue = ViewerSectionManager.getRoundedNumber( offsetValue );
        let convertedOffsetValue = viewerUnitConversionService.convertToMeterFromAnotherUnits( roundedOffsetValue, viewerPreferenceService.getDisplayUnit() );
        if( selectedSection ) {
            if( this.timeoutForMoveSection ) {
                AwTimeoutService.instance.cancel( this.timeoutForMoveSection );
            }
            this.timeoutForMoveSection = AwTimeoutService.instance( () => {
                this.updateSectionOffsetInViewerContext( sectionId, convertedOffsetValue, true );
                this.timeoutForMoveSection = null;
            }, 500 );
            return selectedSection.quickMove( convertedOffsetValue );
        }
        return AwPromiseService.instance.reject();
    }

    /**
     * Delete all section
     *
     */
    async deleteAllSections() {
        let deferred = AwPromiseService.instance.defer();
        var allDeleteSectionPromises = [];
        _.forOwn( this.sectionIdToSectionObjectMap, function( value ) {
            allDeleteSectionPromises.push( value.delete() );
        } );
        if( allDeleteSectionPromises.length > 0 ) {
            return AwPromiseService.instance.all( allDeleteSectionPromises ).then( () => {
                this.sectionIdToSectionObjectMap = {};
                this.customSectionIdToSectionObjectMap = {};
                this.sectionsList.length = 0;
                this.updateSectionListToViewerContext();
                return deferred.resolve();
            }, function( errorMessage ) {
                logger.error( errorMessage );
                return deferred.reject( errorMessage );
            } );
        }
        this.sectionIdToSectionObjectMap = {};
        this.customSectionIdToSectionObjectMap = {};
        this.sectionsList.length = 0;
        this.updateSectionListToViewerContext();
        return deferred.resolve();
    }

    /**
     * Delete section
     *
     * @param {Number} sectionId section id
     * @returns {Promise} A promise resolved after section is deleted
     */
    deleteSection( sectionId ) {
        let deferred = AwPromiseService.instance.defer();
        var selectedSection = this.sectionIdToSectionObjectMap[ sectionId ];
        if( selectedSection ) {
            return selectedSection.delete().then(
                () => {
                    this.deleteSectionFromViewerContext( sectionId );
                    return deferred.resolve();
                },
                function( errorMessage ) {
                    logger.error( errorMessage );
                    return deferred.reject( errorMessage );
                }
            );
        }
        return deferred.resolve();
    }

    /**
     * Update clip state  of section
     *
     * @param {String} sectionId section's Id
     * @param {String} clipState new Clipping State
     *
     */
    async updateClipState( sectionId, clipState ) {
        let deferred = AwPromiseService.instance.defer();
        var selectedSection = this.sectionIdToSectionObjectMap[ sectionId ];
        if( selectedSection && selectedSection.visObject && selectedSection.visObject.nameToPropertyMap &&
            selectedSection.visObject.nameToPropertyMap.ClipState && selectedSection.visObject.nameToPropertyMap.ClipState.value === clipState ) {
            return deferred.resolve();
        }
        return selectedSection.setClipState( clipState ).then( () => {
            this.updateSectionClipState( sectionId, clipState );
            deferred.resolve();
        } );
    }

    /**
     * This api sets whether capping for cross sections should be drawn
     *
     * @function setCapping
     *
     * @param {String} setCapping true if capping will be enabled for cross sections
     */
    setCapping( setCapping ) {
        let deferred = AwPromiseService.instance.defer();
        this.viewerView.sectionMgr.setCapping( setCapping ).then(
            function() {
                deferred.resolve();
            },
            function( errorMessage ) {
                logger.error( errorMessage );
                deferred.reject( errorMessage );
            }
        );
    }

    /**
     * This api sets whether cut lines for the new cross sections should be drawn
     *
     * @function setGlobalCutLines
     *
     * @param {String} setGlobalCutLines true if cut lines will be enabled for the new cross sections
     */
    setGlobalCutLines( setGlobalCutLines ) {
        let deferred = AwPromiseService.instance.defer();
        this.viewerView.sectionMgr.setGlobalCutLines( setGlobalCutLines ).then(
            function() {
                deferred.resolve();
            },
            function( errorMessage ) {
                logger.error( errorMessage );
                deferred.reject( errorMessage );
            }
        );
    }

    /**
     * This api sets whether the Cut Lines status of the cross section
     *
     * @function setCutLines
     *
     * @param {String} setCutLines true if cut lines will be enabled for the new cross sections
     * @param {sectionId} sectionId Section id to be processed
     */
    setCutLines( setCutLines, sectionId ) {
        let deferred = AwPromiseService.instance.defer();
        let selectedSection = this.sectionIdToSectionObjectMap[ sectionId ];
        let sectionData = this.getSectionDataById( sectionId );
        sectionData[ GEOANALYSIS_SECTION_CUT_LINES_STATE ] = setCutLines;
        if( selectedSection ) {
            selectedSection.setCutLines( setCutLines ).then(
                function() {
                    deferred.resolve();
                },
                function( errorMessage ) {
                    logger.error( errorMessage );
                    deferred.reject( errorMessage );
                }
            );
        } else {
            deferred.resolve();
        }
    }

    /**
     * This api returns Cut Lines status of the cross section
     *
     * @function setCutLines
     *
     * @param {sectionId} sectionId Section id to be processed
     */
    getCutLines( sectionId ) {
        let deferred = AwPromiseService.instance.defer();
        var selectedSection = this.sectionIdToSectionObjectMap[ sectionId ];
        if( selectedSection ) {
            selectedSection.getCutLines().then(
                function( data ) {
                    deferred.resolve( data );
                },
                function( errorMessage ) {
                    logger.error( errorMessage );
                    deferred.reject( errorMessage );
                }
            );
        } else {
            deferred.resolve();
        }
    }

    /**
     * Update edit section id to viewer context
     * @param {sectionId} sectionId Section id to be processed
     */
    updateEditSectionIdToViewerContext( sectionId ) {
        let deferred = AwPromiseService.instance.defer();
        this.updateGeometricSectionState( GEOANALYSIS_EDIT_SECTION_ID, sectionId );
        deferred.resolve();
    }

    /**
     * Reset section list in viewer context
     */
    resetSectionListInViewerContext() {
        this.sectionIdToSectionObjectMap = {};
        this.sectionsList.length = 0;
        this.cleanupGeoAnalysisSection();
    }

    /**
     * @param {String} sectionId section's Id
     * @param {String} newClipState new Clipping State
     * @returns {function} Updated viewer atomic data
     */
    updateSectionClipState( sectionId, newClipState ) {
        for( var i = 0; i < this.sectionsList.length; i++ ) {
            var currentSection = this.sectionsList[ i ];
            if( currentSection[ GEOANALYSIS_SECTION_ID ] === sectionId ) {
                currentSection[ GEOANALYSIS_SECTION_CLIP_STATE ] = newClipState;
                return this.updateSectionListToViewerContext();
            }
        }
    }

    /**
     * Delete section from viewer context
     *
     * @param {Number} sectionId section id to be set
     */
    deleteSectionFromViewerContext( sectionId ) {
        delete this.sectionIdToSectionObjectMap[ sectionId ];
        if( this.customSectionIdToSectionObjectMap[ sectionId ] ) {
            delete this.customSectionIdToSectionObjectMap[ sectionId ];
        }
        _.remove( this.sectionsList, function( currentSection ) {
            return currentSection[ GEOANALYSIS_SECTION_ID ] === sectionId;
        } );
        this.updateSectionListToViewerContext();
    }

    /**
     * Modify section in viewer context
     *
     * @param {Number} sectionId section id to be set
     */
    modifySectionInViewerContext( sectionId ) {
        delete this.sectionIdToSectionObjectMap[ sectionId ];
        _.remove( this.sectionsList, function( currentSection ) {
            return currentSection[ GEOANALYSIS_SECTION_ID ] === sectionId;
        } );
    }

    /**
     * Update sections offset in viewer context
     *
     * @param {Number} sectionId section id to be set
     * @param {Number} newValue new offset value
     * @param {Boolean} refreshSectionList boolean indicating if section list needs refresh
     */
    updateSectionOffsetInViewerContext( sectionId, newValue, refreshSectionList ) {
        for( var i = 0; i < this.sectionsList.length; i++ ) {
            var currentSection = this.sectionsList[ i ];
            if( currentSection[ GEOANALYSIS_SECTION_ID ] === sectionId ) {
                currentSection[ GEOANALYSIS_SECTION_OFFSET_VALUE ] = newValue;
                if( refreshSectionList ) {
                    this.updateGeometricSectionState( GEOANALYSIS_IS_EDIT_SECTION_UPDATE_NEEDED, false );
                    this.updateGeometricSectionState( GEOANALYSIS_UPDATE_SECTION_SLIDER, true );
                    this.updateGeometricSectionState( GEOANALYSIS_UPDATE_SECTION_OFFSET, true );
                    this.updateGeometricSectionState( GEOANALYSIS_IGNORE_OFFSET_UPDATE, true );
                    this.updateGeometricSectionState( GEOANALYSIS_SKIP_SELECTION_UPDATE, true );
                    this.updateSectionListToViewerContext();
                }
                break;
            }
        }
    }

    /**
     * Update sections visibility in viewer
     *
     * @param {Number} sectionId section id to be set
     * @param {Boolean} isVisible boolean indicating if section is visible or not
     */
    updateSectionsVisibilityInViewerContext( sectionId, isVisible ) {
        for( var i = 0; i < this.sectionsList.length; i++ ) {
            var currentSection = this.sectionsList[ i ];
            if( currentSection[ GEOANALYSIS_SECTION_ID ] === sectionId ) {
                currentSection[ GEOANALYSIS_SECTION_VISIBILITY ] = isVisible;
                break;
            }
        }
    }

    /**
     * Map plane string to vector
     *
     * @param {Number} planeId xy, xz, or yz
     * @param {Number} sectionId in case the plane is custom plane. sectionId must be passed to look for vector in _customSectionIdToSectionObjectMap
     * @return {Array} vector x,y,z
     */
    mapToVector( planeId, sectionId ) {
        switch ( planeId ) {
            case '1':
                return [ 0, 0, 1 ];
            case '2':
                return [ 0, 1, 0 ];
            case '3':
                return [ 1, 0, 0 ];
            case '4':
                return this.getCustomSectionNormal( sectionId );
        }
    }

    /**
     * Get normal vector for custom plane
     * @param {Number} sectionId in case the plane is custom plane. sectionId must be passed to look for vector in _customSectionIdToSectionObjectMap
     * @return {Array} vector x,y,z
     */
    getCustomSectionNormal( sectionId ) {
        let customSectionData = this.customSectionIdToSectionObjectMap[ sectionId ];
        if( customSectionData ) {
            return customSectionData[ GEOANALYSIS_SECTION_NORMAL ];
        }
        return [ 0, 0, 0 ];
    }

    /**
     * Map plane string to offset string
     *
     * @param {Number} planeId plane id
     * @return {String} Offset string
     */
    static getOffsetLabel( planeId ) {
        switch ( planeId ) {
            case '1':
                return ViewerSectionManager.getLocalizedText( 'coordinateZ' );
            case '2':
                return ViewerSectionManager.getLocalizedText( 'coordinateY' );
            case '3':
                return ViewerSectionManager.getLocalizedText( 'coordinateX' );
            default:
                return ViewerSectionManager.getLocalizedText( 'custom' );
        }
    }

    /**
     * Map plane string to orientation string
     *
     * @param {Number} planeId plane id
     * @return {String} Orientation plane text
     */
    static getOrientationPlaneLabel( planeId ) {
        switch ( planeId ) {
            case '1':
                return ViewerSectionManager.getLocalizedText( 'xy' );
            case '2':
                return ViewerSectionManager.getLocalizedText( 'xz' );
            case '3':
                return ViewerSectionManager.getLocalizedText( 'yz' );
            default:
                return ViewerSectionManager.getLocalizedText( 'custom' );
        }
    }

    /**
     * Map normal string to plane id
     *
     * @param {String} normal plane id
     * @return {String} plane id
     */
    static getPlaneIdFromNormal( normal ) {
        switch ( normal ) {
            case 'XY':
                return '1';
            case 'XZ':
                return '2';
            case 'YZ':
                return '3';
            default:
                return '4';
        }
    }

    /**
     * Map normal vector to plane id
     *
     * @param {Number[]} normalVector normal vector
     * @return {String} plane id
     */
    static getPlaneIdFromNormalVector( normalVector ) {
        if( _.isEqual( normalVector, [ 0, 0, 1 ] ) ) {
            return '1';
        } else if( _.isEqual( normalVector, [ 0, 1, 0 ] ) ) {
            return '2';
        } else if( _.isEqual( normalVector, [ 1, 0, 0 ] ) ) {
            return '3';
        }
        return '4';
    }

    /**
     * Get the localized text for given key
     *
     * @param {String} key Key for localized text
     * @return {String} The localized text
     */
    static getLocalizedText( key ) {
        var localeTextBundle = ViewerSectionManager.getLocaleTextBundle();
        return localeTextBundle[ key ];
    }

    /**
     * This method finds and returns an instance for the locale resource.
     *
     * @return {Object} The instance of locale resource if found, null otherwise.
     */
    static getLocaleTextBundle() {
        var resource = 'Awv0threeDViewerMessages';
        var localeTextBundle = localeSvc.getLoadedText( resource );
        if( localeTextBundle ) {
            return localeTextBundle;
        }
        return null;
    }

    /**
     * Returns the Section's Image
     *
     * @param {String} planeId plane id string
     * @return {String} Image of section
     */
    static getSectionImage( planeId ) {
        var img = null;
        switch ( planeId ) {
            case '1':
                img = 'cmdXyPlanar';
                break;
            case '2':
                img = 'cmdZxPlanar';
                break;
            case '3':
                img = 'cmdYzPlanar';
                break;
            case '4':
                img = 'cmdNonOrthogonalSectionPlane';
                break;
            default:
                img = 'SelectFeatures';
        }

        return img;
    }

    /**
     * Get rounded number
     * @param {Number} numberToBeRounded Number to be rounded
     * @return {Number} rounded number
     */
    static getRoundedNumber( numberToBeRounded ) {
        return _.round( numberToBeRounded, 6 );
    }

    /**
     * Calculate the offset percentage
     *
     * @param {Number} lowerBound lower bound
     * @param {Number} upperBound upper bound
     * @param {Number} value offset bound
     * @return {Number} percentage value
     */
    static calculatePercentageValue( lowerBound, upperBound, value ) {
        var lowerBoundVal = ViewerSectionManager.getRoundedNumber( lowerBound );
        var upperBoundVal = ViewerSectionManager.getRoundedNumber( upperBound );
        var roundedVal = ViewerSectionManager.getRoundedNumber( value );

        return parseInt( ( roundedVal - lowerBoundVal ) / ( upperBoundVal - lowerBoundVal ) * 100 );
    }

    /**
     * Create section object
     *
     * @param {Object} sectionObj SectionObject
     * @param {Stirng} planeId section plane id
     * @param {Number} oldSectionID In case of modified section
     * @return {Object} json section object
     */
    createSectionObject( sectionObj, planeId, oldSectionID ) {
        let promises = [];
        promises.push( sectionObj.getName() );
        promises.push( sectionObj.getOffsetRange() );
        promises.push( sectionObj.getOffset() );
        promises.push( sectionObj.getSelected() );
        promises.push( sectionObj.getVisible() );
        promises.push( sectionObj.getNormal() );
        promises.push( sectionObj.getClipState() );
        promises.push( sectionObj.getCutLines() );
        return AwPromiseService.instance.all( promises ).then( ( values ) => {
            let sectionValueJso = {};
            sectionValueJso[ GEOANALYSIS_SECTION_ID ] = sectionObj.visObject.resourceID;
            sectionValueJso[ GEOANALYSIS_SECTION_OFFSET_LABEL ] = ViewerSectionManager.getOffsetLabel( planeId );
            sectionValueJso[ GEOANALYSIS_SECTION_PLANE_LABEL ] = ViewerSectionManager.getOrientationPlaneLabel( planeId );
            sectionValueJso[ GEOANALYSIS_SECTION_OFFSET_THUMBNAIL ] = ViewerSectionManager.getSectionImage( planeId );
            sectionValueJso[ GEOANALYSIS_SECTION_OFFSET_MIN ] =
                    ViewerSectionManager.getRoundedNumber( viewerUnitConversionService.convertToAnotherUnitsFromMeter( values[ 1 ].min, viewerPreferenceService.getDisplayUnit( this
                        .viewerContextData ) ) );
            sectionValueJso[ GEOANALYSIS_SECTION_OFFSET_MAX ] =
                    ViewerSectionManager.getRoundedNumber( viewerUnitConversionService.convertToAnotherUnitsFromMeter( values[ 1 ].max, viewerPreferenceService.getDisplayUnit( this
                        .viewerContextData ) ) );
            sectionValueJso[ GEOANALYSIS_SECTION_OFFSET_VALUE ] =
                    ViewerSectionManager.getRoundedNumber( viewerUnitConversionService.convertToAnotherUnitsFromMeter( values[ 2 ], viewerPreferenceService.getDisplayUnit( this
                        .viewerContextData ) ) );
            sectionValueJso[ GEOANALYSIS_SECTION_OFFSET_PERCENT_VALUE ] = ViewerSectionManager.calculatePercentageValue( values[ 1 ].min, values[ 1 ].max, values[ 2 ] );
            sectionValueJso[ GEOANALYSIS_SECTION_ISSELECTED ] = values[ 3 ];
            logger.info( 'Received value is selected from vis server : ' + values[ 3 ] );
            logger.info( 'Received value is selected from vis server : ' + sectionValueJso.selected );

            sectionValueJso[ GEOANALYSIS_SECTION_PLANE_SELECTION_ID ] = parseInt( planeId );
            sectionValueJso[ GEOANALYSIS_SECTION_PLANE_ICONS_LIST ] = this.CMDPLANEIMAGES;
            sectionValueJso[ GEOANALYSIS_SECTION_CLIP_STATE ] = values[ 6 ];
            sectionValueJso[ GEOANALYSIS_SECTION_CLIP_STATE_LIST ] = this.CLIP_STATES;
            sectionValueJso[ GEOANALYSIS_SECTION_CUT_LINES_STATE ] = values[ 7 ];
            var SECTION_PLANES_TO_BE_DISPLAYED = this.SECTION_PLANES.slice();
            var PLANEIDS_TO_BE_DISPLAYED = this.PLANEIDS.slice();
            if( !_.includes( this.PLANEIDS, Number( planeId ) ) ) {
                PLANEIDS_TO_BE_DISPLAYED.push( Number( planeId ) );
                SECTION_PLANES_TO_BE_DISPLAYED.push( ViewerSectionManager.getLocalizedText( 'custom' ) );
                sectionValueJso[ GEOANALYSIS_SECTION_NORMAL ] = values[ 5 ];
                this.customSectionIdToSectionObjectMap[ sectionObj.visObject.resourceID ] = sectionValueJso;
            } else if( oldSectionID && this.customSectionIdToSectionObjectMap[ oldSectionID ] || this.customSectionIdToSectionObjectMap.hasOwnProperty( sectionObj.visObject
                .resourceID ) ) {
                PLANEIDS_TO_BE_DISPLAYED.push( Number( 4 ) );
                SECTION_PLANES_TO_BE_DISPLAYED.push( ViewerSectionManager.getLocalizedText( 'custom' ) );
            }
            sectionValueJso[ GEOANALYSIS_SECTION_PLANE_IDS_LIST ] = PLANEIDS_TO_BE_DISPLAYED;
            sectionValueJso[ GEOANALYSIS_SECTION_PLANE_NAMES_LIST ] = SECTION_PLANES_TO_BE_DISPLAYED;
            sectionValueJso[ GEOANALYSIS_SECTION_VISIBILITY ] = values[ 4 ];
            var errorMessage = ViewerSectionManager.getLocalizedText( 'invalidOffsetValueWarning' );
            errorMessage = _.replace( errorMessage, '{0}', _.toString( ViewerSectionManager.getRoundedNumber( values[ 1 ].min ) ) );
            errorMessage = _.replace( errorMessage, '{1}', _.toString( ViewerSectionManager.getRoundedNumber( values[ 1 ].max ) ) );
            sectionValueJso[ GEOANALYSIS_SECTION_ERROR_MESSAGE ] = errorMessage;
            let renderOption = this.viewerContextData.getValueOnViewerAtomicData( 'renderLocation' );
            if( renderOption === 'CSR'  && sectionObj.visObject.pvwObject && sectionObj.visObject.pvwObject._listeners.length === 0 ) {
                sectionObj.addListener( this.sectionPlanePositionChangeListener );
            }
            return sectionValueJso;
        },
        function( error ) {
            logger.error( error );
        } );
    }

    /**
     * Update section list to geometric section state
     */
    updateSectionListToViewerContext() {
        this.updateGeometricSectionState( GEOANALYSIS_SECTION_LIST, [ ...this.sectionsList ] );
        this.updateGeometricSectionState( GEOANALYSIS_ALLOW_SECTION_CREATION, this.sectionsList.length < 6 );
        this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_ALLOW_SECTION_CREATION, this.sectionsList.length < 6 );
        this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_ENABLE_SECTION_COMMAND_PANEL, this.sectionsList.length > 0 );
        //this.updateOccContextToTriggerPanelRefresh();
    }

    /**
     * trigger panel refresh
     */
    updateOccContextToTriggerPanelRefresh() {
        let occContextVal = { ...this.subPanelContext.occContext.getValue() };
        if( !occContextVal.updateSectionPanelCounter ) {
            occContextVal.updateSectionPanelCounter = 0;
        } else {
            occContextVal.updateSectionPanelCounter++;
        }
        this.subPanelContext.occContext.update( occContextVal );
    }

    /**
     * Add offset update request
     *
     * @param {Object} sectionId  section id
     * @param {Object} offset offset value
     * @param {Object} type type of request
     */
    addRequestToUpdateOffset( sectionId, offset, type ) {
        this.offsetUpdateRequestQueue.push( {
            sectionId: sectionId,
            offset: offset,
            type: type
        } );
        if( !this.isRequestQueueBeingProcessed ) {
            this.processRequestQueue();
        }
    }

    /**
     * Process request queue
     *
     * @param {Object} sectionId  section id
     * @param {Object} offset offset value
     * @param {Object} type type of request
     */
    processRequestQueue() {
        this.isRequestQueueBeingProcessed = true;
        let currentReq = this.offsetUpdateRequestQueue.shift();
        if( currentReq.type && currentReq.type === 'MOVE' ) {
            this.isOffsetMoving = true;
            this.moveSection( currentReq.sectionId, currentReq.offset );
            if( this.offsetUpdateRequestQueue.length > 0 ) {
                this.processRequestQueue();
            } else {
                this.isRequestQueueBeingProcessed = false;
            }
        } else if( currentReq.type && currentReq.type === 'STOP' ) {
            this.setSectionOffsetValue( currentReq.sectionId, currentReq.offset );
            AwTimeoutService.instance( () => {
                this.isOffsetMoving = false;
            }, 500 );
        } else if( currentReq.type && currentReq.type === 'OFFSET' && !this.isOffsetMoving ) {
            this.setSectionOffsetValue( currentReq.sectionId, currentReq.offset );
        }
        if( this.offsetUpdateRequestQueue.length > 0 ) {
            this.processRequestQueue();
        } else {
            this.isRequestQueueBeingProcessed = false;
        }
    }

    /**
     * update geometic section state atomic data
     *
     * @param {Object} propertyPath path of property on atomic data value
     * @param {Object} propertyValue vlaue to be set on that path
     */
    updateGeometricSectionState( propertyPath, propertyValue ) {
        if( this.geometricSectionState ) {
            const newGeometricSectionState = { ...this.geometricSectionState.getValue() };
            newGeometricSectionState[ propertyPath ] = propertyValue;
            this.geometricSectionState.update( newGeometricSectionState );
        }
    }

    /**
     * get value on geometric Section state
     *
     * @param {Object} propertyPath path of property on atomic data value
     * @returns {Object} value on requested property path
     */
    getValueOnGeometricSectionState( propertyPath ) {
        if( this.geometricSectionState ) {
            return _.get( this.geometricSectionState.getValue(), propertyPath );
        }
        return null;
    }

    /**
     * Clean up section entry from viewer context
     */
    cleanupGeoAnalysisSection() {
        this.customSectionCreationListeners.length = 0;
        this.viewerContextData.updateViewerAtomicData( GEOANALYSIS_ENABLE_SECTION_COMMAND_PANEL, this.sectionsList.length > 0 );
        this.disableSectionMode();
        if( this.sectionListenerFlag !== false ) {
            this.viewerView.sectionMgr.removeListener( this.viewerSectionListener );
            this.sectionListenerFlag = false;
        }
    }
}

/**
 * This service is used to get viewerSectionManager
 * @param {Promise} $q promise api
 * @param {Object} localeSvc locale service
 * @return {Object} Exposed Apis
 */

export default {
    GEOANALYSIS_SECTION_NAMESPACE,
    GEOANALYSIS_SECTION_LIST,
    GEOANALYSIS_SECTION_OFFSET_LABEL,
    GEOANALYSIS_SECTION_OFFSET_VALUE,
    GEOANALYSIS_SECTION_OFFSET_PERCENT_VALUE,
    GEOANALYSIS_SECTION_OFFSET_MIN,
    GEOANALYSIS_SECTION_OFFSET_MAX,
    GEOANALYSIS_SECTION_ISSELECTED,
    GEOANALYSIS_SECTION_ID,
    GEOANALYSIS_EDIT_SECTION_ID,
    GEOANALYSIS_SECTION_PLANE_LABEL,
    GEOANALYSIS_SECTION_VISIBILITY,
    GEOANALYSIS_SECTION_OFFSET_THUMBNAIL,
    GEOANALYSIS_SECTION_PLANE_IDS_LIST,
    GEOANALYSIS_SECTION_PLANE_NAMES_LIST,
    GEOANALYSIS_SECTION_ERROR_MESSAGE,
    GEOANALYSIS_SECTION_PLANE_ICONS_LIST,
    GEOANALYSIS_SECTION_PLANE_SELECTION_ID,
    GEOANALYSIS_SHOW_CAPS_AND_CUT_LINES,
    GEOANALYSIS_SECTION_NORMAL,
    GEOANALYSIS_SECTION_CLIP_STATE,
    GEOANALYSIS_SECTION_CLIP_STATE_LIST,
    GEOANALYSIS_SECTION_CUT_LINES_STATE,
    GEOANALYSIS_SECTION_PLANE_POSITION_VAL,
    GEOANALYSIS_SECTION_TO_BE_DELETED,
    GEOANALYSIS_SELECTED_SECTION_IN_3D,
    GEOANALYSIS_IGNORE_OFFSET_UPDATE,
    GEOANALYSIS_OFFSET_FROM_3D,
    GEOANALYSIS_UPDATE_SECTION_OFFSET,
    GEOANALYSIS_SKIP_SELECTION_UPDATE,
    getViewerSectionManager
};
