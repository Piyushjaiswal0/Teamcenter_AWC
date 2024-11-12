// Copyright (c) 2021 Siemens

/**
 * Defines {@link NgServices.viewerInteractionService} which provides utility functions for viewer
 *
 * @module js/viewerInteractionService
 */
import viewerPreferenceService from 'js/viewerPreference.service';
import '@swf/ClientViewer';
// import 'manipulator';

/**
 * viewer context service
 */
var _viewerCtxSvc = null;

/**
 * Root csid
 */
var ROOT_CSID = '';

/**
 * Set the viewer context service
 *
 * @param {Object} viewerCtxSvc - viewer context service instance
 */
export let setViewerContextService = function( viewerCtxSvc ) {
    _viewerCtxSvc = viewerCtxSvc;
};

/**
 * Update viewer navigation mode
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Boolean} navigationModeStr - valid navigation mode string
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 *
 * @return {Promise} A promise resolved once navigation mode is set in viewer
 */
export let setNavigationMode = function( viewerContextNamespace, navigationModeStr, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getNavigationManager().setDefaultAction(
        viewerPreferenceService.ViewerNavigationModes[ navigationModeStr ] );
    if( navigationModeStr !== 'AREA_SELECT' ) {
        viewerPreferenceService.setNavigationMode( navigationModeStr );
    }
    deferred.resolve();
};

/**
 * Execute ViewOrientation command.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} cameraOrientation - camera orientation name
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 *
 * @return {Promise} A promise resolved once navigation mode is set in viewer
 */
export let executeViewOrientationCommand = function( viewerContextNamespace, cameraOrientation, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getNavigationManager().setCameraToStandardView(
        window.JSCom.Consts.StandardView[ cameraOrientation ] );
    deferred.resolve();
};

/**
 * Set use transparency in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Boolean} isUseTransparency - true if UseTransparency option should be turned on
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 *
 */
export let setUseTransparency = function( viewerContextNamespace, isUseTransparency, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    if( isUseTransparency ) {
        viewerCtx.getSelectionManager().setViewerSelectionDisplayStyle(
            viewerPreferenceService.SelectionDisplayStyle.BBOX_GRAYSEETHRU );
        viewerCtx.getSelectionManager().setViewerContextDisplayStyle(
            viewerPreferenceService.ContextDisplayStyle.COLOREDSEETHRU );
    } else {
        viewerCtx.getSelectionManager().setViewerSelectionDisplayStyle(
            viewerPreferenceService.SelectionDisplayStyle.HIGHLIGHT );
        viewerCtx.getSelectionManager().setViewerContextDisplayStyle(
            viewerPreferenceService.ContextDisplayStyle.NONE );
    }
    viewerPreferenceService.setSelectionDisplayPreference( isUseTransparency.toString() );
    deferred.resolve();
};

/**
 * Set all on in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 */
export let executeAllOnCommand = function( viewerContextNamespace, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    var csidChains = [];
    csidChains.push( ROOT_CSID );
    viewerCtx.getVisibilityManager().setPartsVisibility( csidChains, [], true, true );
    deferred.resolve();
};

/**
 * Set all off in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 */
export let executeAllOffCommand = function( viewerContextNamespace, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    var csidChains = [];
    csidChains.push( ROOT_CSID );
    viewerCtx.getVisibilityManager().setPartsVisibility( csidChains, [], false, true );
    deferred.resolve();
};

/**
 * Set selected off in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Object} allSelectedCSIDS - all selected csids
 * @param {Object} partitionSelectedCSIDS - partition selected csids
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 */
export let executeSelectedOffCommand = function( viewerContextNamespace, allSelectedCSIDS, partitionSelectedCSIDS, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getVisibilityManager().setPartsVisibility( allSelectedCSIDS, partitionSelectedCSIDS, false, true );
    deferred.resolve();
};

/**
 * Set selected on in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Object} allSelectedCSIDS - all selected csids
 * @param {Object} partitionSelectedCSIDS - partition selected csids
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 */
export let executeSelectedOnCommand = function( viewerContextNamespace, allSelectedCSIDS, partitionSelectedCSIDS, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getVisibilityManager().setPartsVisibility( allSelectedCSIDS, partitionSelectedCSIDS, true, true );
    deferred.resolve();
};

/**
 * Set selected only in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Object} allSelectedCSIDS - all selected csids
 * @param {Object} partitionSelectedCSIDS - partition selected csids
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 */
export let executeSelectedOnlyCommand = function( viewerContextNamespace, allSelectedCSIDS, partitionSelectedCSIDS, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getVisibilityManager().setVisibleState( allSelectedCSIDS, partitionSelectedCSIDS, true );
    deferred.resolve();
};

/**
 * Set context off in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Object} allSelectedCSIDS - all selected csids
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 */
export let executeContextOffCommand = function( viewerContextNamespace, allSelectedCSIDS, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getVisibilityManager().setPartsVisibility( allSelectedCSIDS, false, true );
    deferred.resolve();
};

/**
 * Set context on in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Object} allSelectedCSIDS - all selected csids
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 */
export let executeContextOnCommand = function( viewerContextNamespace, allSelectedCSIDS, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getVisibilityManager().setPartsVisibility( allSelectedCSIDS, true, true );
    deferred.resolve();
};

/**
 * Set context only in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Object} allSelectedCSIDS - all selected csids
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 */
export let executeContextOnlyCommand = function( viewerContextNamespace, allSelectedCSIDS, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getVisibilityManager().setVisibleState( allSelectedCSIDS, true );
    deferred.resolve();
};

/**
 * Select context in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Array} contextCSIDS - context csids
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 */
export let executeSelectContextCommand = function( viewerContextNamespace, contextCSIDS, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSelectionManager().selectContextInViewerUsingCsid( contextCSIDS );
    deferred.resolve();
};

/**
 * Execute fit command in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 */
export let executeFitCommand = function( viewerContextNamespace, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    var selectedCSIDs = viewerCtx.getSelectionManager().getSelectedCsids();
    var currentSelectedMO = viewerCtx.getSelectionManager().getSelectedModelObjects();
    var currentProdViewerCtx = viewerCtx.getCurrentViewerProductContext();
    if( Array.isArray( selectedCSIDs ) && selectedCSIDs.length > 0 ) {
        if( currentSelectedMO &&
            currentProdViewerCtx &&
            selectedCSIDs.length === 1 &&
            currentSelectedMO[ 0 ].uid === currentProdViewerCtx.uid ) {
            viewerCtx.getNavigationManager().viewAll();
        } else {
            viewerCtx.getNavigationManager().viewSelected();
        }
    } else {
        viewerCtx.getNavigationManager().viewAll();
    }
    deferred.resolve();
};

/**
 * Check if model has pmi data
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 *
 */
export let hasPMIData = function( viewerContextNamespace, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getPmiManager().getHasPMI( deferred );
};

/**
 * Get all sections data
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 */
export let getAllSections = function( viewerContextNamespace, deferred ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSectionManager().getAllSections( deferred );
};

/**
 * Reset sections data
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Promise} deferred - promise from calling function to be resolved. Will be removed in future
 */
export let resetSectionListInViewerContext = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getSectionManager().resetSectionListInViewerContext();
};

/**
 * Sets the Basic display Mode value locally and on the server
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Boolean} inPlane - 'true' if the PMI should appear flat otherwise 'false'.
 */
export let setInPlane = function( viewerContextNamespace, inPlane ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getPmiManager().setInPlane( inPlane );
};

/**
 * Gets the In Plane property of all PMI in the view. When set to true, the PMI
 * will be parrallel to the XY plane. When set to false, the PMI will be parrallel with the camera's viewing plane.
 *
 * @return {Promise} Promise resolved with inPlane property value for the current model.
 */
export let getInPlane = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getPmiManager().getInPlane();
};

/**
 * To toggle whether triad should appear in 3D scene or not
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Boolean} isVisible - 'true' if the trihedron should appear in the bottom left-hand corner of the 3D scene and 'false' otherwise
 */
export let setTrihedron = function( viewerContextNamespace, isVisible ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getDrawTrislingManager().drawTrihedron( isVisible );
};

/**
 * Sets the Floor property value locally and on the server.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Boolean} isVisible - 'true' if floor is to be visible other wise false.
 */
export let setFloorVisibility = function( viewerContextNamespace, isVisible ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getVqSceneManager().setFloor( isVisible );
};

/**
 * To toggle whether grid should be seen or not in 3D scene.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Boolean} isVisible - 'true' if grid should be visible otherwise false.
 */
export let setGridVisibility = function( viewerContextNamespace, isVisible ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getVqSceneManager().setFloorGrid( isVisible );
};

/**
 * Updates the floor offset value to given one.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Number} offsetValue - Floor offset value.
 */
export let setFloorOffset = function( viewerContextNamespace, offsetValue ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getVqSceneManager().setFloorOffset( offsetValue );
};

/**
 * Updates the current floor plane orientation to given one.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Number} planeId - Floor plane orientation value.
 */
export let setFloorOrientation = function( viewerContextNamespace, planeId ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getVqSceneManager().setFloorPlaneOrientation( planeId );
};

/**
 * Set reflection visibility in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Boolean} enableReflection - Boolean flag indicating whether to apply reflection in viewer or not.
 *
 * @return {Promise} A promise resolved once floor reflection is applied based on boolean input.
 */
export let setReflectionVisibility = function( viewerContextNamespace, enableReflection ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getVqSceneManager().enableFloorReflection( enableReflection );
};

/**
 * Set shadow visibility in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Boolean} enableShadow - Boolean flag indicating whether to apply shadow in viewer or not.
 *
 * @return {Promise} A promise resolved once floor shadow is applied based on boolean input.
 */
export let setShadowVisibility = function( viewerContextNamespace, enableShadow ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getVqSceneManager().enableFloorShadow( enableShadow );
};

/**
 * Apply true shading material in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Boolean} enableShade - Boolean flag indicating whether to apply shading material in viewer or not.
 *
 * @return {Promise} A promise resolved once shading material is applied based on boolean input.
 */
export let applyTrueShadingMaterials = function( viewerContextNamespace, enableShade ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getVqSceneManager().enableMaterials( enableShade );
};

/**
 * Set global material in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Boolean} materialIndex - Global material index to be set
 *
 * @return {Promise} A promise resolved once material is set in viewer
 */
export let setGlobalMaterial = function( viewerContextNamespace, materialIndex ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getVqSceneManager().setGlobalMaterial( materialIndex );
};

/**
 * Set shaded mode in viewer
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Boolean} shadedModeIndex - Number indicating shaded mode
 *
 * @return {Promise} A promise resolved once shading is set in viewer
 */
export let setShadedMode = function( viewerContextNamespace, shadedModeIndex ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getThreeDViewManager().setBasicDisplayMode( shadedModeIndex );
};

/**
 * Set 3D navigation modes i.e. Examine and Walk.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Number} navigation3DMode - Numerical value of the corresponding navigation mode.
 */
export let setNavigation3Dmode = function( viewerContextNamespace, navigation3DMode ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getNavigationManager().setManipulatorType( navigation3DMode );
};

/**
 * Returns the active basic display mode
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 */
export let getBasicDisplayMode = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getThreeDViewManager().getBasicDisplayMode();
};

/**
 * Returns the current context Display Style
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 */
export let getContextDisplayStyle = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getThreeDViewManager().getContextDisplayStyle();
};

/**
 * Returns the current Selection Display Style Percentage Done
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 */
export let getSelectionDisplayStyle = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getThreeDViewManager().getSelectionDisplayStyle();
};

/**
 * Sets the Basic display Mode value locally and on the server
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {JSCom.Consts.BasicDisplayMode} displayMode - The Basic Display Mode
 */
export let setBasicDisplayMode = function( viewerContextNamespace, displayMode ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getThreeDViewManager().setBasicDisplayMode( displayMode );
};

/**
 * Updates the current context Display Style to given one
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Array.<Object>} occs - An array of JSCom.EMM.Occurrence objects to set context
 */
export let setContext = function( viewerContextNamespace, occs ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getThreeDViewManager().setContext( occs );
};

/**
 * Updates the current context Display Style to given part/assembly
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {JSCom.Consts.ContextDisplayStyle} displayStyle - context display style
 */
export let setContextDisplayStyle = function( viewerContextNamespace, displayStyle ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getThreeDViewManager().setContextDisplayStyle( displayStyle );
};

/**
 * Updates the current Selection Display Style to given one
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {JSCom.Consts.SelectionDisplayStyle} displayStyle - Selection display style
 */
export let setSelectionDisplayStyle = function( viewerContextNamespace, displayStyle ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    viewerCtx.getThreeDViewManager().setSelectionDisplayStyle( displayStyle );
};

/**
 * Displays JSCom.EMM.Occurrence objects passed in only and does a fitall on them.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Array.<Object>} occList - JSCom.EMM.Occurrence An array of occurrences
 *
 *  @return {Promise}
 */
export let viewOnly = function( viewerContextNamespace, occList ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getThreeDViewManager().viewOnly( occList );
};

/**
 * Get model Unit
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @returns {JSCom.Consts.DisplayUnit}
 *
 */
export let getModelUnit = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getThreeDViewManager().getModelUnit();
};

/**
 * set display Unit
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {JSCom.Consts.DisplayUnit} displayUnit
 *
 */
export let setDisplayUnit = function( viewerContextNamespace, displayUnit ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getThreeDViewManager().setDisplayUnit( displayUnit );
};

/**
 * set display Unit
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @returns {JSCom.Consts.DisplayUnit}
 */
export let getDisplayUnit = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getThreeDViewManager().getDisplayUnit();
};

/**
 * get Color Theme
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @returns {String} current background theme
 */
export let getBackgroundColorTheme = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getThreeDViewManager().getBackgroundColorTheme();
};

/**
 * set Color Theme
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} colorTheme - JSCom.EMM.colorTheme color theme to set
 *
 */
export let setBackgroundColorTheme = function( viewerContextNamespace, colorTheme ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getThreeDViewManager().setBackgroundColorTheme( colorTheme );
};

/**
 * get Color Themes
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @returns {Array.<Object>} list of available background themes
 */
export let getBackgroundColorThemes = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getThreeDViewManager().getBackgroundColorThemes();
};

/**
 * Remove Analysis result
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 */
export let executeRemoveAnalysisResultCommand = function( viewerContextNamespace ) {
    var viewerCtx = _viewerCtxSvc.getRegisteredViewerContext( viewerContextNamespace );
    return viewerCtx.getVisibilityManager().removeAnalysisResult();
};

/**
 * Get the viewer api object
 *
 * @return {Object} An object that provides access to viewer api's
 */
export let getViewerApi = function() {
    return exports;
};


const exports = {
    setViewerContextService,
    setNavigationMode,
    executeViewOrientationCommand,
    setUseTransparency,
    executeAllOnCommand,
    executeAllOffCommand,
    executeSelectedOffCommand,
    executeSelectedOnCommand,
    executeSelectedOnlyCommand,
    executeContextOffCommand,
    executeContextOnCommand,
    executeContextOnlyCommand,
    executeSelectContextCommand,
    executeFitCommand,
    hasPMIData,
    getAllSections,
    resetSectionListInViewerContext,
    setInPlane,
    getInPlane,
    setTrihedron,
    setFloorVisibility,
    setGridVisibility,
    setFloorOffset,
    setFloorOrientation,
    setReflectionVisibility,
    setShadowVisibility,
    applyTrueShadingMaterials,
    setGlobalMaterial,
    setShadedMode,
    setNavigation3Dmode,
    getBasicDisplayMode,
    getContextDisplayStyle,
    getSelectionDisplayStyle,
    setBasicDisplayMode,
    setContext,
    setContextDisplayStyle,
    setSelectionDisplayStyle,
    viewOnly,
    getModelUnit,
    setDisplayUnit,
    getDisplayUnit,
    getBackgroundColorTheme,
    setBackgroundColorTheme,
    getBackgroundColorThemes,
    executeRemoveAnalysisResultCommand,
    getViewerApi
};

export default exports;
