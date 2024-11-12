// Copyright (c) 2022 Siemens

/**
 * Defines {@link NgServices.viewerContextService} which provides utility functions for viewer
 *
 * @module js/viewerContext.service
 */
import appCtxService from 'js/appCtxService';
import prefService from 'soa/preferenceService';
import commandPanelService from 'js/commandPanel.service';
import viewerCtxDataProvider from 'js/viewerContextDataProvider';
import vmoSvc from 'js/viewModelObjectService';
import viewerPreferenceService from 'js/viewerPreference.service';
import browserUtils from 'js/browserUtils';
import AwTimeoutService from 'js/awTimeoutService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import AwPromiseService from 'js/awPromiseService';

/**
 * Root csid
 */
const ROOT_CSID = '';

/**
 * reference to self
 */
let exports = {};

/**
 * Registered viewer context
 */
var registeredViewerContext = {};

/**
 * viewerContextNamespaceKeyMap map
 */
let viewerContextNamespaceKeyMap = [];


/**
 * viewer visibility token
 */
export let VIEWER_VISIBILITY_TOKEN = 'isViewerRevealed';

/**
 * Viewer types
 */
export let ViewerType = {
    GwtViewer: 'GwtViewer',
    JsViewer: 'JsViewer'
};

/**
 * viewer view mode token
 */
export let VIEWER_VIEW_MODE_TOKEN = 'viewerViewMode';

/**
 * BOM Window Shared token
 */
export let VIEWER_IS_BOM_WINDOW_SHARED = 'isBOMWindowShared';

/**
 * 3D viewer command panel launched
 */
export let VIEWER_COMMAND_PANEL_LAUNCHED = 'viewerCommandPanelLaunch';

/**
 * Viewer states
 */
export let ViewerViewModes = {
    VIEWER3D: 'VIEWER3D',
    VIEWER2D: 'VIEWER2D',
    NOVIEWER: 'NOVIEWER'
};

/**
 * Viewer license levels
 */
export let ViewerLicenseLevels = {
    BASE: 0,
    STANDARD: 1,
    PROFESSIONAL: 2,
    MOCKUP: 3
};

/**
 * Viewer CSID selection token
 */
export let VIEWER_CSID_SELECTION_TOKEN = 'viewerSelectionCSIDS';

/**
 * Viewer CSID selection token
 */
export let VIEWER_PARTITION_CSID_SELECTION_TOKEN = 'viewerPartitionSelectionCSIDS';

/**
 * Is it MMV data token
 */
export let VIEWER_IS_MMV_ENABLED_TOKEN = 'isMMVEnabledForView';

/**
/**
 * Viewer Model object selection token
 */
export let VIEWER_MODEL_OBJECT_SELECTION_TOKEN = 'viewerSelectionModels';

/**
 * Viewer current product context token
 */
export let VIEWER_CURRENT_PRODUCT_CONTEXT_TOKEN = 'viewerCurrentProductContext';

/**
 * Viewer selected off visibility
 */
export let VIEWER_SELECTED_OFF_VISIBILITY_TOKEN = 'isSelectedOffVisible';

/**
 * Viewer selected on visibility
 */
export let VIEWER_SELECTED_ON_VISIBILITY_TOKEN = 'isSelectedOnVisible';

/**
 * Viewer context on visibility
 */
export let VIEWER_CONTEXT_ON_VISIBILITY_TOKEN = 'isContextOnVisible';

/**
 * Viewer license level property name
 */
export let VIEWER_LICENSE_LEVEL_TOKEN = 'licLevel';

/**
 * Viewer Namespace
 */
export let VIEWER_NAMESPACE_TOKEN = 'viewer';

/**
 * Viewer OccmgmtContext Namespace
 */
export let VIEWER_OCCMGMTCONTEXT_NAMESPACE_TOKEN = 'occmgmtContextName';

/**
 * Viewer alternate pci token
 */
export let VIEWER_HAS_ALTERNATE_PCI_TOKEN = 'hasAlternatePCI';

/**
 * Viewer has disclosed Model View data
 */
export let VIEWER_HAS_DISCLOSED_MV_DATA_TOKEN = 'hasDisclosedMVData';

/**
 * Viewer has Explode view enabled
 */
export let VIEWER_IS_EXPLODE_VIEW_VISIBLE = 'isExplodeViewVisible';

/**
 * Viewer has sub commands toolbar enabled
 */
export let VIEWER_IS_SUB_COMMANDS_TOOLBAR_ENABLED = 'isSubCommandsToolbarVisible';

/**
 * Viewer has dialog panel enabled
 */
export let VIEWER_ACTIVE_DIALOG_ENABLED = 'activeDialog';

/**
 * Viewer product launch event. It is used in Open in Vis
 */
export let VIEWER_SUB_PRODUCT_LAUNCH_EVENT = 'productLaunchEvent';

/**
 * Viewer product launch event. It is used to save bookmark while Open in Vis
 */
export let VIEWER_SUB_SAVE_VIS_AUTO_BOOKMARK = 'saveVisAutoBookmark';

/**
 * Viewer sub commands list
 */
export let VIEWER_SUB_COMMANDS_LIST = 'viewerSubCommandsList';

/**
 * Viewer area select notification
 */
export let VIEWER_AREA_SELECT = 'areaSelect';

/**
 * viewer pref path of AWC_visNavigationMode
 *
 */
const VIEW_PREF_NAVMODE_PATH = 'viewerPreference.AWC_visNavigationMode';

/**
 * Is navigation mode Area select is active
 *
 */
export let VIEWER_IS_NAV_MODE_AREA_SELECT = 'IsNavigationModeAreaSelect';

/**
 * Update viewer with captured image
 */
export let VIEWER_UPDATE_VIEW_WITH_CAPTURED_IMAGE = 'updateViewWithCaptureImage';

/**
 * Update viewer with captured image
 */
export let VIEWER_DEACTIVATE_IMAGE_CAPTURE_DISPLAY = 'deactivateImageCaptureDisplay';

/**
 * Capture Snapshot begin
 */
export let VIEWER_CAPTURE_SNAPSHOT_BEGIN = 'ViewerCaptureSnapshotBegin';

/**
 * Create Section begin
 */
export let VIEWER_CREATE_SECTION_BEGIN = 'ViewerCreateSectionBegin';

/**
 * Create Markup begin
 */
export let VIEWER_CREATE_MARKUP_BEGIN = 'ViewerCreateMarkupBegin';

/**
 * Clean up viewer context in application context
 *
 * @param {Object} viewerCtxData Viewer context data
 */
var cleanUpViewerApplicationContext = function( viewerCtxData ) {
    exports.unregisterViewerContext( viewerCtxData );
    appCtxService.unRegisterCtx( viewerCtxData.getViewerCtxNamespace() );
};

/**
 * Create viewer context in application context
 *
 * @param {String} viewerCtxNamespace Viewer context namespace to be registered
 */
export let createViewerApplicationContext = function( viewerCtxNamespace ) {
    appCtxService.registerCtx( viewerCtxNamespace, {} );
};

/**
 * update viewer application context
 *
 * @param {String} viewerCtxNamespace Viewer context namespace to be registered
 * @param {String} path - Path to the context
 * @param {Object} value - The value of context variable
 */
export let updateViewerApplicationContext = function( viewerCtxNamespace, path, value ) {
    var fullPath = viewerCtxNamespace + '.' + path;
    appCtxService.updatePartialCtx( fullPath, value );

    var eventData = {
        viewerContextNamespace: viewerCtxNamespace,
        property: path,
        value: value
    };
    eventBus.publish( 'awViewerContext.update', eventData );
};

/**
 * Get viewer application context
 *
 * @param {String} viewerCtxNamespace Viewer context namespace to be registered
 * @param {String} path - Path to the context
 * @return {Object} viewer application context
 */
export let getViewerApplicationContext = function( viewerCtxNamespace, path ) {
    var fullPath = viewerCtxNamespace + '.' + path;
    return appCtxService.getCtx( fullPath );
};

/**
 * Register viewer with viewer context namespace
 *
 * @function registerViewerContext
 *
 *
 * @param {String} viewerCtxNamespace Viewer context namespace to be registered
 * @param {String} viewerType One of the type specified in
 *            {@link viewerContextService.ViewerType}
 * @param {String} contextData Context data. This is an optional field for viewerType
 *            'GwtViewer'. It should be the view object in case of 'JsViewer'
 * @param {boolean} is2D is 2D viewer
 * @param {String} viewerAtomicData Viewer atomic data
 * @return {Object} Registered viewer context
 */
export let registerViewerContext = function( viewerCtxNamespace, viewerType, contextData, is2D, viewerAtomicData ) {
    if( _.isUndefined( viewerCtxNamespace ) || _.isNull( viewerCtxNamespace ) ||
        _.isEmpty( viewerCtxNamespace ) ) {
        logger.warn( 'registerViewerContext : Viewer context namespace is invalid' );
        return;
    }
    var viewerTypeToBeRegistered = exports.ViewerType[ viewerType ];

    if( _.isUndefined( viewerTypeToBeRegistered ) || _.isNull( viewerTypeToBeRegistered ) ||
        _.isEmpty( viewerTypeToBeRegistered ) ) {
        logger.warn( 'registerViewerContext : Viewer type is invalid' );
        return;
    }

    var viewerCtxData = viewerCtxDataProvider.getViewerContextData( viewerCtxNamespace,
        viewerTypeToBeRegistered, contextData, is2D, viewerAtomicData );
    viewerCtxData.addViewerConnectionCloseListener( cleanUpViewerApplicationContext );
    viewerCtxData.initialize( exports );
    registeredViewerContext[ viewerCtxNamespace ] = viewerCtxData;
    viewerContextNamespaceKeyMap[viewerCtxData.getOccmgmtContextKey()] = viewerCtxNamespace;
    exports.updateViewerApplicationContext( 'viewer', 'viewerType', viewerType );
    return viewerCtxData;
};

/**
 * Update registered viewer context namespace
 *
 * @function updateRegisteredViewerContext
 *
 *
 * @param {String} viewerCtxNamespace Viewer context namespace to be registered
 * @param {String} contextData Context data. This is an optional field for viewerType
 *            'GwtViewer'. It should be the view object in case of 'JsViewer'
 */
export let updateRegisteredViewerContext = function( viewerCtxNamespace, contextData ) {
    if( _.isUndefined( viewerCtxNamespace ) || _.isNull( viewerCtxNamespace ) ||
        _.isEmpty( viewerCtxNamespace ) ) {
        logger.warn( 'registerViewerContext : Viewer context namespace is invalid' );
        return;
    }
    registeredViewerContext[ viewerCtxNamespace ] = contextData;
};


/**
 * Unregister viewer with viewer context namespace
 *
 * @function unregisterViewerContext
 *
 *
 * @param {Object} viewerCtxData Viewer context data
 */
export let unregisterViewerContext = function( viewerCtxData ) {
    viewerCtxData.removeViewerConnectionCloseListener( cleanUpViewerApplicationContext );
    delete registeredViewerContext[ viewerCtxData.getViewerCtxNamespace() ];
};

/**
 * Handle browser close event
 *
 * @function handleBrowserUnload
 *
 * @param {Boolean} isPageClose true if page is getting closed
 *
 */
export let handleBrowserUnload = function( isPageClose ) {
    _.forOwn( registeredViewerContext, ( registeredObj ) => {
        if( typeof registeredObj.close === 'function' ) {
            registeredObj.close( isPageClose );
        }
    } );
};

/**
 * Get registered viewer context object with viewer context namespace
 *
 * @function getRegisteredViewerContext
 *
 *
 * @param {String} viewerCtxNamespace Viewer context namespace to be registered
 * @return {Object} Registered viewer context if found
 */
export let getRegisteredViewerContext = function( viewerCtxNamespace ) {
    if( _.isUndefined( viewerCtxNamespace ) || _.isNull( viewerCtxNamespace ) ||
        _.isEmpty( viewerCtxNamespace ) ) {
        logger.warn( 'getRegisteredViewerContext : Viewer context namespace is invalid' );
        return;
    }

    var registeredCtx = registeredViewerContext[ viewerCtxNamespace ];

    if( _.isUndefined( registeredCtx ) || _.isNull( registeredCtx ) ) {
        logger.warn( 'getRegisteredViewerContext : Viewer context namespace is not registered' );
        return;
    }

    return registeredCtx;
};

/**
 * Gets registered viewer contexts name keys
 *
 * @function getRegisteredViewerContextNamseSpaces
 *
 *
 * @return {String[]}  Registered viewer contexts array
 */
export let getRegisteredViewerContextNamseSpaces = function() {
    return Object.keys( registeredViewerContext );
};

/**
 * Activate viewer command panel
 *
 * @function activateViewerCommandPanel
 *
 *
 * @param {String} commandId - ID of the command to open. Should map to the view model to
 *            activate.
 * @param {String} location - Which panel to open the command in. "aw_navigation" or
 *            "aw_toolsAndInfo"
 * @param {String}  context - Viewer context data for active viewer command
 * @param {Boolean} closeWhenCommandHidden - If you have to show the panel even though the commandId is different then set it to false.
 */
export let activateViewerCommandPanel = function( commandId, location, context, closeWhenCommandHidden ) {
    if( context && context.viewerContextData ) {
        if( context.viewerContextData.getValueOnViewerAtomicData( VIEWER_IS_SUB_COMMANDS_TOOLBAR_ENABLED ) ) {
            exports.closeSubCommandsToolbar( context.viewerContextData );
        } else {
            context.viewerContextData.getViewerAtomicDataSubject().notify( VIEWER_COMMAND_PANEL_LAUNCHED, { commandId:commandId } );
        }
        //override and switch off area select mode if it is active
        if( context.viewerContextData.getValueOnViewerAtomicData( VIEWER_IS_NAV_MODE_AREA_SELECT ) === true ) {
            exports.setNavigationMode( context.viewerContextData, context.viewerContextData.getValueOnViewerAtomicData( 'viewerPreference.AWC_visNavigationMode' ) );
        }
    }
    commandPanelService.activateCommandPanel( commandId, location, context, undefined, closeWhenCommandHidden );
};

/**
 * Activate viewer command panel
 *
 * @function activateViewerCommandDialog
 *
 *
 * @param {String} commandId - ID of the command to open. Should map to the view model to
 *            activate.
 * @param {String}  context - Viewer context data for active viewer command
 * @param {Boolean} closeWhenCommandHidden - If you have to show the panel even though the commandId is different then set it to false.
 */
export let activateViewerCommandDialog = function( commandId, context ) {
    if( context && context.viewerContextData ) {
        if( context.viewerContextData.getValueOnViewerAtomicData( VIEWER_IS_SUB_COMMANDS_TOOLBAR_ENABLED ) ) {
            exports.closeSubCommandsToolbar( context.viewerContextData );
        } else {
            context.viewerContextData.getViewerAtomicDataSubject().notify( VIEWER_COMMAND_PANEL_LAUNCHED, { commandId:commandId } );
        }
        //override and switch off area select mode if it is active
        if( context.viewerContextData.getValueOnViewerAtomicData( VIEWER_IS_NAV_MODE_AREA_SELECT ) === true ) {
            exports.setNavigationMode( context.viewerContextData, context.viewerContextData.getValueOnViewerAtomicData( 'viewerPreference.AWC_visNavigationMode' ) );
        }
    }
    let options = {
        view: commandId,
        parent: '.aw-layout-workareaMain',
        width: 'STANDARD',
        height: 'FULL',
        context,
        isCloseVisible: false,
        subPanelContext: context
    };
    context.dialogAction.show( options  );
};


/**
 * Close viewer sub commands toolbar
 * @param {Object} viewerCtxData - Viewer context data
 */
export let closeSubCommandsToolbar = function( viewerCtxData ) {
    viewerCtxData.closeSubCommandsToolbar();
};

/**
 * Set markup command visibility
 *
 * @function setMarkupCommandVisibility
 *
 * @param {Boolean} isVisible or not
 * @param {Object} modelObj object or view model object
 */
export let setMarkupCommandVisibility = function( isVisible, modelObj, viewerContextData ) {
    let currentViewerContext = viewerContextData.getValueOnViewerAtomicData( 'onScreen2dMarkupContext' );
    if( isVisible ) {
        let vmoObj = null;
        if( vmoSvc.isViewModelObject( modelObj ) ) {
            vmoObj = modelObj;
        } else {
            vmoObj = vmoSvc.constructViewModelObjectFromModelObject( modelObj );
        }
        currentViewerContext.vmo = vmoObj;
        currentViewerContext.type = 'aw-image-viewer';
    } else {
        currentViewerContext.vmo = null;
        currentViewerContext.type = null;
    }
    viewerContextData.updateViewerAtomicData( 'onScreen2dMarkupContext', currentViewerContext );
};

/**
 * Update the selection display mode
 *
 * @function setUseTransparency
 *
 * @param {Object} viewerContextData  -viewer context data
 * @param {Boolean} isUseTransparency - true if UseTransparency option should be turned on
 *
 */
export let setUseTransparency = function( viewerContextData, isUseTransparency ) {
    if( isUseTransparency ) {
        viewerContextData.getSelectionManager().setViewerSelectionDisplayStyle(
            viewerPreferenceService.SelectionDisplayStyle.BBOX_GRAYSEETHRU );
        viewerContextData.getSelectionManager().setViewerContextDisplayStyle(
            viewerPreferenceService.ContextDisplayStyle.COLOREDSEETHRU );
    } else {
        viewerContextData.getSelectionManager().setViewerSelectionDisplayStyle(
            viewerPreferenceService.SelectionDisplayStyle.HIGHLIGHT );
        viewerContextData.getSelectionManager().setViewerContextDisplayStyle(
            viewerPreferenceService.ContextDisplayStyle.NONE );
    }
    viewerPreferenceService.setSelectionDisplayPreference( isUseTransparency.toString(), null, viewerContextData );
    let prefName = 'AWC_visSelectionDisplay';
    prefService.setStringValue( prefName, [ isUseTransparency.toString() ] );
};

/**
 * Toggle the selection display mode
 *
 * @function toggleUseTransparency
 *
 * @param {Object} viewerContextData - viewer Context Data
 */
export let toggleUseTransparency = function( viewerContextData ) {
    var isUseTransparency = viewerContextData.getValueOnViewerAtomicData( 'viewerPreference.AWC_visSelectionDisplay' );
    isUseTransparency = !isUseTransparency;
    if( isUseTransparency ) {
        viewerContextData.getSelectionManager().setViewerSelectionDisplayStyle(
            viewerPreferenceService.SelectionDisplayStyle.BBOX_GRAYSEETHRU );
        viewerContextData.getSelectionManager().setViewerContextDisplayStyle(
            viewerPreferenceService.ContextDisplayStyle.COLOREDSEETHRU );
    } else {
        viewerContextData.getSelectionManager().setViewerSelectionDisplayStyle(
            viewerPreferenceService.SelectionDisplayStyle.HIGHLIGHT );
        viewerContextData.getSelectionManager().setViewerContextDisplayStyle(
            viewerPreferenceService.ContextDisplayStyle.NONE );
    }
    viewerPreferenceService.setSelectionDisplayPreference( isUseTransparency.toString(), null, viewerContextData );
    let prefName = 'AWC_visSelectionDisplay';
    prefService.setStringValue( prefName, [ isUseTransparency.toString() ] );
};

/**
 * Update viewer navigation mode
 *
 * @function setNavigationMode
 *
 * @param {String} viewerContextData - viewer context data
 * @param {String} navigationModeStr - valid navigation mode string
 */
export let setNavigationMode = function( viewerContextData, navigationModeStr ) {
    let navigationMode = navigationModeStr;
    if( navigationMode === 'AREA_SELECT' ) {
        if( viewerContextData.getValueOnViewerAtomicData( VIEWER_IS_NAV_MODE_AREA_SELECT ) === true ) {
            if( viewerContextData.getValueOnViewerAtomicData( 'viewerPreference.AWC_visNavigationMode' ) === null ) {
                navigationMode = 'ROTATE';
            } else {
                navigationMode = viewerContextData.getValueOnViewerAtomicData( 'viewerPreference.AWC_visNavigationMode' );
            }
        }
    }
    viewerContextData.getNavigationManager().setDefaultAction(
        viewerPreferenceService.ViewerNavigationModes[ navigationMode ] );
    if( navigationMode !== 'AREA_SELECT' ) {
        viewerPreferenceService.setNavigationMode( navigationMode );
    }
    var prefName = 'AWC_visNavigationMode';
    if ( navigationMode !== 'AREA_SELECT' ) {
        prefService.setStringValue( prefName, [ navigationMode ] );
        viewerContextData.updateViewerAtomicData( VIEW_PREF_NAVMODE_PATH, navigationMode );
        viewerContextData.updateViewerAtomicData( VIEWER_IS_NAV_MODE_AREA_SELECT, false );
    } else {
        viewerContextData.updateViewerAtomicData( VIEWER_IS_NAV_MODE_AREA_SELECT, true );
    }

    //override the panels
    if( navigationMode === 'AREA_SELECT' ) {
        exports.closePanelsWhenAreaSelectIsActive( viewerContextData );
    }
};

export let closePanelsWhenAreaSelectIsActive = function( viewerContextData ) {
    viewerContextData.getViewerAtomicDataSubject().notify( VIEWER_AREA_SELECT );

    //close subcommand toolbar -> measurement

    if( viewerContextData.getValueOnViewerAtomicData( VIEWER_IS_SUB_COMMANDS_TOOLBAR_ENABLED ) ) {
        let subCommandsActive = viewerContextData.getValueOnViewerAtomicData( VIEWER_SUB_COMMANDS_LIST );
        if( !subCommandsActive.Awv0MoveParts ) {
            exports.closeSubCommandsToolbar( viewerContextData );
        }
    } else {
    //closing any panels if they are active when area select is invoked
        viewerContextData.closeActiveDialog();
    }
};

/**
 * Execute ViewOrientation command.
 *
 * @param {Object} viewerContextData Viewer context data
 * @param {String} camOrientation - camera orientation name
 */
export let executeViewOrientationCommand = function( viewerContextData, camOrientation ) {
    var cameraOrientation = viewerPreferenceService.getViewOrientation( camOrientation );
    viewerContextData.getNavigationManager().setCameraToStandardView(
        window.JSCom.Consts.StandardView[ cameraOrientation ] )
        .catch( ( error )=>{
            logger.error( 'Failed to set orientation: ' + error );
        } );
};

/**
 * Execute AllOn command.
 *
 * @param {Object} viewerContextData Viewer context data
 *
 */
export let executeAllOnCommand = function( viewerContextData ) {
    var csidChains = [];
    csidChains.push( ROOT_CSID );
    viewerContextData.getVisibilityManager().setPartsVisibility( csidChains, [], true, true )
        .catch( ( error )=>{
            logger.error( 'Failed to set parts visibility for AllOn: ' + error );
        } );
};

/**
 * Execute AllOff command.
 *
 * @param {Object} viewerContextData Viewer context data
 *
 */
export let executeAllOffCommand = function( viewerContextData ) {
    var csidChains = [];
    csidChains.push( ROOT_CSID );
    viewerContextData.getVisibilityManager().setPartsVisibility( csidChains, [], false, true )
        .catch( ( error )=>{
            logger.error( 'Failed to set parts visibility for All off: ' + error );
        } );
};

/**
 * Execute SelectedOff command.
 *
 * @param {Object} viewerContextData Viewer context data
 * @param {Object} allSelectedCSIDS - all selected csids
 * @param {Object} partitionSelectedCSIDS - partition selected csids
 */
export let executeSelectedOffCommand = function( viewerContextData, allSelectedCSIDS, partitionSelectedCSIDS ) {
    viewerContextData.getVisibilityManager().setPartsVisibility( allSelectedCSIDS, partitionSelectedCSIDS, false, true )
        .catch( ( error ) => {
            logger.error( 'Failed to set parts visibility for selected off: ' + error );
        } );
};

/**
 * Execute SelectedOn command.
 *
 * @param {Object} viewerContextData Viewer context data
 * @param {Object} allSelectedCSIDS - all selected csids
 * @param {Object} partitionSelectedCSIDS - partition selected csids
 *
 */
export let executeSelectedOnCommand = function( viewerContextData, allSelectedCSIDS, partitionSelectedCSIDS ) {
    viewerContextData.getVisibilityManager().setPartsVisibility( allSelectedCSIDS, partitionSelectedCSIDS, true, true )
        .catch( ( error ) => {
            logger.error( 'Failed to set parts visibility for selected on: ' + error );
        } );
};

/**
 * Execute SelectedOnly command.
 *
 * @param {Object} viewerContextData Viewer context data
 * @param {Object} allSelectedCSIDS - all selected csids
 * @param {Object} partitionSelectedCSIDS - partition selected csids
 *
 */
export let executeSelectedOnlyCommand = function( viewerContextData, allSelectedCSIDS, partitionSelectedCSIDS ) {
    viewerContextData.getVisibilityManager().setVisibleState( allSelectedCSIDS, partitionSelectedCSIDS, true )
        .catch( ( error ) => {
            logger.error( 'Failed to set parts visibility for selected only: ' + error );
        } );
};

/**
 * Execute Fit command.
 *
 * @param {Object} viewerContextData Viewer context data
 * @param {Object} occmgmtContext occurence management context
 *
 */
export let executeFitCommand = function( viewerContextData, occmgmtContext ) {
    let selectedCSIDs = viewerContextData.getSelectionManager().getSelectedCsids();
    let currentSelectedMO = viewerContextData.getSelectionManager().getSelectedModelObjects();
    try{
        if( Array.isArray( selectedCSIDs ) && selectedCSIDs.length > 0 ) {
            if( currentSelectedMO &&
                occmgmtContext && occmgmtContext.openedElement &&
                selectedCSIDs.length === 1 &&
                currentSelectedMO[ 0 ].uid === occmgmtContext.openedElement.uid ) {
                viewerContextData.getNavigationManager().viewAll();
            } else {
                viewerContextData.getNavigationManager().viewSelected();
            }
        } else {
            viewerContextData.getNavigationManager().viewAll();
        }
    } catch ( error ) {
        logger.error( 'Failed to execute fit command: ' + error );
    }
};


/**
 * Create JSCom.EMM.Occurence object
 *
 * @param {String} keyOrStr key or occurrence string identifying the specific occurrence
 * @param {Object} viewerContextData viewer context data
 * @return {Object} JSCom.EMM.Occurence object
 */
export let createViewerOccurance = function( keyOrStr, viewerContextData ) {
    return new window.JSCom.EMM.Occurrence( viewerPreferenceService.getViewerOccuranceType( viewerContextData ), keyOrStr );
};

/**
 * Create JSCom.EMM.Occurence object of type Partition
 *
 * @param {String} partitionKeyOrStr key or occurrence string identifying the specific partition occurrence
 * @return {Object} JSCom.EMM.Occurence object
 */
export let createViewerPartitionOccurance = function( partitionKeyOrStr ) {
    return new window.JSCom.EMM.Occurrence( viewerPreferenceService.occurrenceTypeList.PartitionUIDChain, partitionKeyOrStr );
};

/**
 * Create JSCom.EMM.Occurence object of type Partition Scheme
 *
 * @param {String} partitionSchemeKeyOrStr key or occurrence string identifying the specific partition scheme occurrence
 * @return {Object} JSCom.EMM.Occurence object
 */
export let createViewerPartitionSchemeOccurance = function( partitionSchemeKeyOrStr ) {
    return new window.JSCom.EMM.Occurrence( viewerPreferenceService.occurrenceTypeList.PartitionSchemeUID, partitionSchemeKeyOrStr );
};


/**
 * Remove Analysis result
 *
 * @param {Object} viewerContextData - viewer context data
 */
export let executeRemoveAnalysisResultCommand = function( viewerContextData ) {
    viewerContextData.closeActiveDialog();
    let manipulatorEnabled = viewerContextData.getValueOnViewerAtomicData( 'moveParts.isManipulatorEnabled' );
    if( manipulatorEnabled ) {
        viewerContextData.getMotionManager().setManipulator();
    }
    AwTimeoutService.instance( function() {
        viewerContextData.getVisibilityManager().removeAnalysisResult().then( () => {
            viewerContextData.getSectionManager().resetSectionListInViewerContext();
            viewerContextData.getMeasurementManager().resetMeasurementListInViewerContext();
        } ).catch( error => {
            logger.error( 'executeRemoveAnalysisResultCommand error : ' + error );
        } );
    } );
};

/**
 * Update atomic data
 * @param {Object} pathOnData path to be updated
 * @param {Object} value value to be update
 * @param {Object} target can be atomic data structure / context key
 */
export function updateAtomicDataValue( pathOnData, value, target ) {
    if( target ) {
        let newValue = { ...target.getValue() };
        if( pathOnData && !_.isEmpty( pathOnData ) ) {
            _.set( newValue, pathOnData, value );
        } else {
            newValue = value;
        }
        target.update( newValue );
    }
}

/**
 * Get active viewer context namespace key
 * @param {String} occmgmtActiveCtxKey occurence management context key
 * @returns {String} active viewer context namespace key
 */
export let getActiveViewerContextNamespaceKey = ( occmgmtActiveCtxKey )=>{
    return viewerContextNamespaceKeyMap[occmgmtActiveCtxKey] ? viewerContextNamespaceKeyMap[occmgmtActiveCtxKey] : 'awDefaultViewer';
};

/**
 * This is a method that is exposed via the UI in Viewer Options, but can be executed by users by
 * entering the following command into the chrome console:
 *
 * afxDynamicImport([`js/viewerContext.service`], (o)=>{o.logVisDiagnostics(true)})
 *
 * This will output to the console various diagnostics for the Vis view,
 * including the vis related preferences set on the Tc server,
 * relavent environment variables set on the Vis server,
 * and the overall health of the Vis server.
 * @param {boolean} consoleOutput set to true to also log info to console
 */
export let logVisDiagnostics = function( consoleOutput ) {
    var awcVisPrefs = {};
    var envVars = {};
    var visHealth = null;
    var returnPromise = AwPromiseService.instance.defer();

    viewerPreferenceService.getAllVisAWCPreferences().then( function( tcOutput ) {
        awcVisPrefs = tcOutput;
        var connectionUrl = browserUtils.getBaseURL() + 'VisProxyServlet';

        window.JSCom.Health.HealthUtils.getServerHealthInfo( connectionUrl ).then( function( jscomOutput ) {
            visHealth = jscomOutput;
            if( jscomOutput && jscomOutput.poolManagers[0] && jscomOutput.poolManagers[0].config
                && jscomOutput.poolManagers[0].config.resolvedEnvironment ) {
                var allEnvs = jscomOutput.poolManagers[0].config.resolvedEnvironment;
                var neededEnvs = [ 'TCVIS_LOGGING_LEVEL', 'TCVIS_LOGGING_PATH',
                    'TCVIS_DA_DEBUG_LOG', 'TC_SOACLIENT_LOGGING',
                    'TCVIS_DISABLE_BOMWINDOW_SHARING',
                    'TCVIS_DISABLE_PAGE_BASED_EXPANSION_FOR_GENERAL_LOADING', 'AW_CSR_COMPRESSION',
                    'TCVIS_SERVER_DISABLE_LAZY_STRUCTURE_LOAD', 'TCVIS_DISABLE_USE_OF_ENCODED_XFORM_PROPS',
                    'TCVIS_DISABLE_USE_OF_ENCODED_XFORM_PROPS_FOR_CHILD_OF_APP_GROUP_BOP_LINE',
                    'TCVIS_ENABLE_BVR_PARTITION_PRELOAD', 'TCVIS_DO_NOT_ASK_TC_TO_RESOLVE_NGID' ];

                neededEnvs.forEach( element => envVars[ element ] = extractEnvVar( allEnvs, element ) );
            }

            var output = 'AWC Vis Preferences\n';
            output += '-----------------------\n';
            Object.keys( awcVisPrefs ).forEach( key => {
                output +=  key + ' = ' + awcVisPrefs[key][0] + '\n';
            } );
            output += '\n'; //newline

            var envKeysArr = Object.keys( envVars );
            if( envKeysArr.length !== 0 ) {
                output += 'Environment Variables\n';
                output += '-----------------------\n';
                envKeysArr.forEach( key => {
                    output +=  key + ' = ' + envVars[key] + '\n';
                } );
                output += '\n';
            }

            output += 'Vis Health\n';
            output += '-----------------------\n';
            output += visHealth.toString() + '\n';
            output += '\n';

            if( consoleOutput ) {
                logger.info( output );
            }

            returnPromise.resolve( output );
        } );
    } );

    return returnPromise.promise;
};

let extractEnvVar = function( allEnvs, env ) {
    var startOfEnv = allEnvs.indexOf( env );
    if( startOfEnv === -1 ) {
        return '<not defined>';
    }
    var startOfValue = allEnvs.indexOf( '=', startOfEnv ) + 1;
    var endOfValue = allEnvs.indexOf( ',', startOfEnv );
    if( endOfValue === -1 ) {
        // last in list, look for '}'
        endOfValue = allEnvs.indexOf( '}', startOfEnv );
    }
    return allEnvs.substring( startOfValue, endOfValue );
};

/**
 * Set global cutlines off for section
 * @param {Object} viewerView view opened
 */
export let turnOffGlobalCutlinesForSection = function( viewerView ) {
    viewerView.sectionMgr.setGlobalCutLines( false );
};

export default exports = {
    VIEWER_VISIBILITY_TOKEN,
    ViewerType,
    VIEWER_VIEW_MODE_TOKEN,
    VIEWER_IS_BOM_WINDOW_SHARED,
    ViewerViewModes,
    ViewerLicenseLevels,
    VIEWER_CSID_SELECTION_TOKEN,
    VIEWER_PARTITION_CSID_SELECTION_TOKEN,
    VIEWER_IS_MMV_ENABLED_TOKEN,
    VIEWER_MODEL_OBJECT_SELECTION_TOKEN,
    VIEWER_CURRENT_PRODUCT_CONTEXT_TOKEN,
    VIEWER_SELECTED_OFF_VISIBILITY_TOKEN,
    VIEWER_SELECTED_ON_VISIBILITY_TOKEN,
    VIEWER_CONTEXT_ON_VISIBILITY_TOKEN,
    VIEWER_LICENSE_LEVEL_TOKEN,
    VIEWER_NAMESPACE_TOKEN,
    VIEWER_OCCMGMTCONTEXT_NAMESPACE_TOKEN,
    VIEWER_HAS_ALTERNATE_PCI_TOKEN,
    VIEWER_HAS_DISCLOSED_MV_DATA_TOKEN,
    VIEWER_IS_SUB_COMMANDS_TOOLBAR_ENABLED,
    VIEWER_IS_EXPLODE_VIEW_VISIBLE,
    VIEWER_SUB_COMMANDS_LIST,
    VIEWER_COMMAND_PANEL_LAUNCHED,
    VIEWER_ACTIVE_DIALOG_ENABLED,
    VIEWER_SUB_PRODUCT_LAUNCH_EVENT,
    VIEWER_SUB_SAVE_VIS_AUTO_BOOKMARK,
    VIEWER_UPDATE_VIEW_WITH_CAPTURED_IMAGE,
    VIEWER_DEACTIVATE_IMAGE_CAPTURE_DISPLAY,
    VIEWER_AREA_SELECT,
    VIEWER_CAPTURE_SNAPSHOT_BEGIN,
    VIEWER_CREATE_SECTION_BEGIN,
    VIEWER_CREATE_MARKUP_BEGIN,
    VIEWER_IS_NAV_MODE_AREA_SELECT,
    createViewerApplicationContext,
    updateViewerApplicationContext,
    getViewerApplicationContext,
    registerViewerContext,
    updateRegisteredViewerContext,
    unregisterViewerContext,
    handleBrowserUnload,
    getRegisteredViewerContext,
    activateViewerCommandPanel,
    setMarkupCommandVisibility,
    setUseTransparency,
    toggleUseTransparency,
    setNavigationMode,
    closePanelsWhenAreaSelectIsActive,
    executeViewOrientationCommand,
    executeAllOnCommand,
    executeAllOffCommand,
    executeSelectedOffCommand,
    executeSelectedOnCommand,
    executeSelectedOnlyCommand,
    executeFitCommand,
    createViewerOccurance,
    createViewerPartitionOccurance,
    createViewerPartitionSchemeOccurance,
    executeRemoveAnalysisResultCommand,
    getRegisteredViewerContextNamseSpaces,
    updateAtomicDataValue,
    closeSubCommandsToolbar,
    getActiveViewerContextNamespaceKey,
    logVisDiagnostics,
    turnOffGlobalCutlinesForSection,
    activateViewerCommandDialog
};
