// Copyright (c) 2021 Siemens

/* global JSCom */

/**
 * Defines {@link NgServices.viewerPreferenceService} which provides utility functions to work with viewer preferneces
 *
 * @module js/viewerPreference.service
 */
import preferenceService from 'soa/preferenceService';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import logger from 'js/logger';
import '@swf/ClientViewer';
import appCtxService from 'js/appCtxService';
// import 'manipulator';

/**
 * NavigationMode's server preference String
 */
var NAVIGATION_MODE = 'AWC_visNavigationMode';

/**
 * 3DNavigationMode's server preference String
 */
var NAVIGATION_3D_MODE = 'AWC_vis3DNavigationMode';

/**
 * Shading's server preference String
 */
var SHADING = 'AWC_visShading';

/**
 * Material's server preference String
 */
var MATERIAL = 'AWC_visMaterial';

/**
 * Trihedron's server preference String
 */
var TRIHEDRON = 'AWC_visTrihedronOn';

/**
 * FloorVisiblity's server preference String
 */
var FLOOR_VISIBILITY = 'AWC_visFloorOn';

/**
 * FloorOrientation's server preference String
 */
var FLOOR_ORIENTATION = 'AWC_visFloorPlaneOrientation';

/**
 * FloorOffset's server preference String
 */
var FLOOR_OFFSET = 'AWC_visFloorOffset';

/**
 * Grid's server preference String
 */
var GRID = 'AWC_visGridOn';

/**
 * Shadow's server preference String
 */
var SHADOW = 'AWC_visShadowOn';

/**
 * Reflection's server preference String
 */
var REFLECTION = 'AWC_visReflectionOn';

/**
 * ViewOrientationTop's server preference String
 */
var VIEW_ORIENTATION_TOP = 'AWC_visStdViewOrientationTop';

/**
 * ViewOrientationLeft's server preference String
 */
var VIEW_ORIENTATION_LEFT = 'AWC_visStdViewOrientationLeft';

/**
 * ViewOrientationFront's server preference String
 */
var VIEW_ORIENTATION_FRONT = 'AWC_visStdViewOrientationFront';

/**
 * server preference var for apply true shading material.
 */
var APPLYTRUESHADINGMATERIAL = 'AWC_applyTrueShadingMaterial';

/**
 * server preference var for effectivity visibility.
 */
var EFFECTIVITY = 'AWC_visOverlayDisplayEffectivity';

/**
 * server preference var for user affinity when loading assemblies.
 */
var ASSEMBLYUSERAFFINITY = 'AWC_visAssemblyUserAffinity';

/**
 * server preference for selection behavior in viewer
 */
var VIEWER_SELECTION_DISPLAY = 'AWC_visSelectionDisplay';

/**
 * Preference for occurance type in viewer
 */
var OCCURANCE_TYPE = 'AWC_occuranceType';

/**
 * server preference to show\hide caps and lines in section in viewer
 */
var VIEWER_SHOW_CAPS_AND_LINES = 'AWV0SectionCapsEdgesInitialState';

/**
 * Preference to determine if default model views to be applied when a product is opened for 3D viewing
 */
let VIEWER_APPLY_DEFAULT_MODEL_VIEW = 'AWV0ApplyDefaultModelViewOnOpen';

/**
 * local preference for alternatePCI in viewer
 */
var VIEWER_INDEXED_MODEL = 'AWC_indexedModel';

/**
 * server preference for zoom direction in viewer
 */
var VIEWER_ZOOM_IN = 'AWC_visExamineZoomIn';

/**
 * Reference to open model preferences for viewer
 */
var _openModelPreferences = null;

/**
 * Flag for enable/disable draw preference
 */
var _isDrawingEnabled = true;

/**
 * display unit
 */
var DISPLAY_UNIT = 'AWC_3DViewerDisplayUnit';

/**
 * model unit
 */
var MODEL_UNIT = 'AWC_modelUnit';

/**
 * server preference to set All On behavior for opening 3D model
 */
var ALL_ON = 'AWC_visAllOn';

/**
 * Render source
 */
var VIEWER_RENDER_OPTION = 'AWV0ViewerRenderOption';

var VIEWER_EXPOSED_BETA = 'AWC_visExposedBetaFeatures';

/**
 * preference to determine how PV should be opened
 */
var PV_OPEN_CONFIG = 'AWC_visProductViewOpenConfiguration';

/**
 * Preference to determine color theme
 */
var VIS_COLOR_SCHEME = 'AWC_visColorScheme';

/**
 * preference for area select limit
 */
var SELECTION_LIMIT = 'AWC_visSelectionLimit';

/**
 * Preference to determine weather PMI is flat or screen
 */
let VIEWER_PMI_OPTION = 'pmiChecked';

/**
 * reference to self
 */
var exports = {};

/**
 * Preference to determine if CSR browser caching is on or off
 */
let VIS_BROWSER_CACHING = 'AWV0VisBrowserCaching';


/**
 * Preference to determine CSR Loading strategy
 */
let VIS_USE_BOM_DELTA_STRUCTURE_UPDATE = 'AWV0UseBOMDeltaForStructureUpdates';

/**
 * Viewer 3-D Navigation Mode
 */
export const ThreeDNavigationMode = {
    WALK: 'WALK',
    EXAMINE: 'EXAMINE'
};

/**
 * Viewer materials
 */
export let ViewerMaterial = {
    SHINY_METAL: window.JSCom.Consts.Material.SHINY_METAL,
    BRUSHED_METAL: window.JSCom.Consts.Material.BRUSHED_METAL,
    SHINY_PLASTIC: window.JSCom.Consts.Material.SHINY_PLASTIC,
    ANALYSIS: window.JSCom.Consts.Material.ANALYSIS,
    FLAT: window.JSCom.Consts.Material.FLAT,
    RED_GLOSSY_PLASTIC: window.JSCom.Consts.Material.RED_GLOSSY_PLASTIC,
    BLUE_GLOSSY_PLASTIC: window.JSCom.Consts.Material.BLUE_GLOSSY_PLASTIC,
    GREEN_GLOSSY_PLASTIC: window.JSCom.Consts.Material.GREEN_GLOSSY_PLASTIC,
    GRAY_GLOSSY_PLASTIC: window.JSCom.Consts.Material.GRAY_GLOSSY_PLASTIC,
    BLACK_GLOSSY_PLASTIC: window.JSCom.Consts.Material.BLACK_GLOSSY_PLASTIC,
    BROWN_GLOSSY_PLASTIC: window.JSCom.Consts.Material.BROWN_GLOSSY_PLASTIC,
    YELLOW_GLOSSY_PLASTIC: window.JSCom.Consts.Material.YELLOW_GLOSSY_PLASTIC,
    TEAL_GLOSSY_PLASTIC: window.JSCom.Consts.Material.TEAL_GLOSSY_PLASTIC,
    WHITE_GLOSSY_PLASTIC: window.JSCom.Consts.Material.WHITE_GLOSSY_PLASTIC,
    CLEAR_PLASTIC: window.JSCom.Consts.Material.CLEAR_PLASTIC,
    CHROME: window.JSCom.Consts.Material.CHROME,
    COPPER: window.JSCom.Consts.Material.COPPER,
    GOLD: window.JSCom.Consts.Material.GOLD,
    BRASS: window.JSCom.Consts.Material.BRASS,
    STEEL: window.JSCom.Consts.Material.STEEL,
    BRUSHED_CHROME: window.JSCom.Consts.Material.BRUSHED_CHROME,
    BRUSHED_ALUMINUM: window.JSCom.Consts.Material.BRUSHED_ALUMINUM,
    BRUSHED_TITANIUM: window.JSCom.Consts.Material.BRUSHED_TITANIUM,
    GLASS: window.JSCom.Consts.Material.GLASS,
    SMOKEY_GLASS: window.JSCom.Consts.Material.SMOKEY_GLASS,
    RED_PAINT: window.JSCom.Consts.Material.RED_PAINT,
    GRAY_PAINT: window.JSCom.Consts.Material.GRAY_PAINT,
    BLACK_PAINT: window.JSCom.Consts.Material.BLACK_PAINT,
    BLUE_PAINT: window.JSCom.Consts.Material.BLUE_PAINT,
    RUBBER: window.JSCom.Consts.Material.RUBBER
};

/**
 * Viewer floor plane
 */
export let ViewerFloorPlane = {
    XY: window.JSCom.Consts.FloorPlane.XY,
    XZ: window.JSCom.Consts.FloorPlane.XZ,
    YZ: window.JSCom.Consts.FloorPlane.YZ,
    NEGATIVE_XY: window.JSCom.Consts.FloorPlane.NEGATIVE_XY,
    NEGATIVE_XZ: window.JSCom.Consts.FloorPlane.NEGATIVE_XZ,
    NEGATIVE_YZ: window.JSCom.Consts.FloorPlane.NEGATIVE_YZ
};

/**
 * Viewer shaded with edges
 */
export let ViewerShadedWithEdges = {
    SHADED: window.JSCom.Consts.ShadedWithEdges.SHADED,
    SHADED_WITH_EDGES: window.JSCom.Consts.ShadedWithEdges.SHADED_WITH_EDGES
};

/**
 * Viewer selection types
 */
export let SelectionDisplayStyle = {
    BBOX: window.JSCom.Consts.SelectionDisplayStyle.BBOX,
    HIGHLIGHT: window.JSCom.Consts.SelectionDisplayStyle.HIGHLIGHT,
    BBOX_GRAYSEETHRU: window.JSCom.Consts.SelectionDisplayStyle.BBOX_GRAYSEETHRU
};

/**
 * Viewer context display types
 */
export let ContextDisplayStyle = {
    NONE: window.JSCom.Consts.ContextDisplayStyle.NONE,
    COLOREDSEETHRU: window.JSCom.Consts.ContextDisplayStyle.COLOREDSEETHRU
};

/**
 * Viewer context display types
 */
export let ViewerNavigationModes = {
    ZOOM: 2,
    ROTATE: 0,
    PAN: 1,
    AREA_SELECT: 3,
    AREA_QUERY: 4
    //                'ZOOM': window.JSCom.Consts.NavigationMode.ZOOM,
    //                'ROTATE': window.JSCom.Consts.NavigationMode.ROTATE,
    //                'PAN': window.JSCom.Consts.NavigationMode.PAN
    //                'AREA_SELECT': window.JSCom.Consts.NavigationMode.AREA_SELECT
    //                'AREA_QUERY': window.JSCom.Consts.NavigationMode.AREA_QUERY
};

/**
 * List of various viewer orientations
 */
export let viewOrientationList = {
    LEFT: 'PlusX',
    FRONT: 'PlusY',
    BOTTOM: 'PlusZ',
    RIGHT: 'MinusX',
    BACK: 'MinusY',
    TOP: 'MinusZ',
    ISOMETRIC: 'PlusIsometric',
    TRIMETRIC: 'MinusIsometric'
};


/**
 * List of Occurance Type
 */
export let occurrenceTypeList = {
    Key: JSCom.Consts.OccurrenceType.Key,
    CloneStableUIDChain: JSCom.Consts.OccurrenceType.CloneStableUIDChain,
    ItemRev: JSCom.Consts.OccurrenceType.ItemRev,
    OTP: JSCom.Consts.OccurrenceType.OTP,
    SubsetUIDChain: JSCom.Consts.OccurrenceType.SubsetUIDChain,
    PartitionUIDChain: JSCom.Consts.OccurrenceType.PartitionUIDChain,
    PartitionSchemeUID: JSCom.Consts.OccurrenceType.PartitionSchemeUID
};

var AreaSelectLimitMaximum = 1000;

/**
 * Properties present on a model view.
 */
export let ModelViewProperties = {
    VISIBLE: window.JSCom.Consts.ModelViewProperties.VISIBLE,
    NAME: window.JSCom.Consts.ModelViewProperties.NAME
};

/**
 * Returns the preferences for current user session
 *
 * @param {Boolean} isShowAll Sets whether or not all geometry should be visible in the 3D scene
 * @param {Boolean} applyBookmarkWhileOpeningModel Sets whether or not apply bookmark while opening model
 * @param {Boolean} disableBookMark disable bookmark while opening model
 * @param {Boolean} showSuppressed show suppressd or not
 * @param {Number} selectionLimit selection limit
 * @param {Object} viewerContextData viewer context data
 * @return {Promise} A promise resolved once we get viewer preferences
 */
export let getViewerPreferences = function( isShowAll, applyBookmarkWhileOpeningModel, disableBookMark, showSuppressed, selectionLimit, viewerContextData ) {
    return initViewerPreferences( isShowAll, applyBookmarkWhileOpeningModel, disableBookMark, showSuppressed, selectionLimit, viewerContextData );
};

/**
 * Returns the occurnace type value.
 * If doesnot present then set it with CloneStableUIDChain
 * @param {Object} viewerContextData viewer context data
 * @return {String} occurance type value
 */
export let getViewerOccuranceType = function( viewerContextData ) {
    var occuranceType = getPreferenceValue( OCCURANCE_TYPE, viewerContextData );
    if( !occuranceType ) {
        exports.setViewerOccuranceType( exports.occurrenceTypeList.CloneStableUIDChain, viewerContextData );
        return exports.occurrenceTypeList.CloneStableUIDChain;
    }
    return occuranceType;
};

/**
 * Set the occurence type
 * @param {String} occuranceType occurance type value
 */
export let setViewerOccuranceType = function( occuranceType, viewerContextData ) {
    updatePreferenceValue( OCCURANCE_TYPE, occuranceType, false, viewerContextData );
};

/**
 * set the display unit
 */
export let setDisplayUnit = function( displayUnit, viewerContextData ) {
    updatePreferenceValue( DISPLAY_UNIT, [ displayUnit.toString() ], true, viewerContextData );
};

/**
 * get the display unit
 */
export let getDisplayUnit = function( viewerContextData ) {
    return parseInt( getPreferenceValue( DISPLAY_UNIT, viewerContextData ) );
};

/**
 * set the floor offset
 */
export let setFloorOffset = function( floorOffset, viewerContextData ) {
    updatePreferenceValue( FLOOR_OFFSET, [ floorOffset.toString() ], true, viewerContextData );
};

/**
 * get the floor offset
 */
export let getFloorOffset = function( viewerContextData ) {
    return parseFloat( getPreferenceValue( FLOOR_OFFSET, viewerContextData ) );
};

/**
 * set Shadow Visibility
 */
export let setShadowVisibility = function( isVisible, viewerContextData ) {
    updatePreferenceValue( SHADOW, isVisible, true, viewerContextData );
};

/**
 * set Grid Visibility
 */
export let setGridVisibility = function( isVisible, viewerContextData ) {
    updatePreferenceValue( GRID, isVisible, true, viewerContextData );
};

/**
 * set Floor Visibility
 */
export let setFloorVisibility = function( isVisible, viewerContextData ) {
    updatePreferenceValue( FLOOR_VISIBILITY, isVisible, true, viewerContextData );
};

/**
 * set Global Material
 */
export let setGlobalMaterial = function( materialIndex, viewerContextData ) {
    viewerContextData.updateViewerAtomicData( 'viewerPreference.' + MATERIAL, materialIndex );
    preferenceService.setStringValue( MATERIAL, [ materialIndex ] );
};

/**
 * set reflection Visibility
 */
export let setReflectionVisibility = function( isVisible, viewerContextData ) {
    updatePreferenceValue( REFLECTION, isVisible, true, viewerContextData );
};
/**
 * set Trihedron Visibility
 */
export let setTrihedronVisibility = function( isVisible, viewerContextData ) {
    updatePreferenceValue( TRIHEDRON, isVisible, true, viewerContextData );
};

/**
 * set viewer floor orientation
 */
export let setFloorOrientation = function( planeId, viewerContextData ) {
    updatePreferenceValue( FLOOR_ORIENTATION, planeId, true, viewerContextData );
};

/**
 * set viewer PMI FlatToScreen true/false
 */
export let setPMIOption = function( setFlatToScreen, viewerContextData ) {
    updatePreferenceValue( VIEWER_PMI_OPTION, setFlatToScreen, true, viewerContextData );
};

/**
 * set the Color Theme
 */
export let setColorTheme = function( viewerBackgroundColorTheme, viewerContextData ) {
    updatePreferenceValue( VIS_COLOR_SCHEME, [ viewerBackgroundColorTheme ], true, viewerContextData );
};

/**
 * get the Color Theme
 */
export let getColorTheme = function( viewerContextData ) {
    return getPreferenceValue( VIS_COLOR_SCHEME, viewerContextData );
};

/**
 * set the model unit
 */
export let setModelUnit = function( modelUnit, viewerContextData ) {
    updatePreferenceValue( MODEL_UNIT, modelUnit, false, viewerContextData );
};

/**
 * get the model unit
 * @returns {Number} returns model unit
 */
export let getModelUnit = function( viewerContextData ) {
    return getPreferenceValue( MODEL_UNIT, viewerContextData );
};


/**
 * get viewer beta preference
 * @returns {String} returns beta preference value
 */
export let getViewerBetaPref = function( viewerContextData ) {
    return getPreferenceValue( VIEWER_EXPOSED_BETA, viewerContextData );
};

/**
 * get area select limit
 * @return {Promise} A promise resolved once selection limit is returned from preference
 */
export let getSelectionLimit = function() {
    let returnPromise = AwPromiseService.instance.defer();
    let viewerPrefPromise = preferenceService.getStringValue( SELECTION_LIMIT );
    viewerPrefPromise.then( function( selectionLimit ) {
        if( !selectionLimit ) {
            returnPromise.resolve( 0 );
        } else {
            selectionLimit = parseInt( selectionLimit );
            if( selectionLimit < AreaSelectLimitMaximum ) {
                returnPromise.resolve( selectionLimit );
            } else {
                logger.warn( 'Selection limit exceeds the maximum limit defaulting to 1000' );
                returnPromise.resolve( AreaSelectLimitMaximum );
            }
        }
    }, function( error ) {
        logger.error( 'Error while getting preference : ' + SELECTION_LIMIT );
        logger.error( error );
        returnPromise.resolve( 0 );
    } ).catch( function( error ) {
        logger.error( 'Error while getting preference : ' + SELECTION_LIMIT +
            '. Default value will be used for preference.' );
        logger.error( error );
        returnPromise.resolve( 0 );
    } );
    return returnPromise.promise;
};

/**
 * get viwer brower caching preference
 * @returns {boolean} vis browser caching pref
 */
export let getBrowserCachingPref = function( viewerContextData ) {
    return getPreferenceValue( VIS_BROWSER_CACHING, viewerContextData );
};

/**
 * Enables draw preference
 *
 * @param {Boolean} isToEnable true if set to be ON
 */
export let setEnableDrawingPref = function( isToEnable ) {
    _isDrawingEnabled = isToEnable;

    if( _openModelPreferences && _openModelPreferences.draw ) {
        _openModelPreferences.draw.drawPolicy =
            isToEnable ? window.JSCom.Consts.DrawPolicy.AUTOMATIC : window.JSCom.Consts.DrawPolicy.DISABLED;
    }
};

/**
 * Sets draw preference Internal
 */
function _setDrawingOption() {
    if( _openModelPreferences && _openModelPreferences.draw ) {
        _openModelPreferences.draw.drawPolicy =
            _isDrawingEnabled ? window.JSCom.Consts.DrawPolicy.AUTOMATIC : window.JSCom.Consts.DrawPolicy.DISABLED;
    }
}

let getPsSippingPref = function( betaPrefValues ) {
    for( const prefValue of betaPrefValues ) {
        if( prefValue === 'enablePsSipping' ) {
            return true;
        }
        if( prefValue === 'disablePsSipping' ) {
            return false;
        }
    }
    return true;
};

/**
 * Gets memory threshold
 * @return {Number} memory threshold
 */
let getMemoryThreshold = function( viewerContextData ) {
    if( viewerContextData ) {
        if( appCtxService.getCtx( 'splitView.mode' ) ) {
            return viewerContextData.getMemoryThreshold() / 2;
        }
        return viewerContextData.getMemoryThreshold();
    }
};

/**
 * Initialize the preferences for current user session
 * @param {Boolean} isShowAll Sets whether or not all geometry should be visible in the 3D scene
 * @param {Boolean} applyBookmarkWhileOpeningModel Sets whether or not apply bookmark while opening model
 * @param {Boolean} disableBookMark disable bookmark while opening model
 * @param {Boolean} showSuppressed show suppressd or not
 * @param {Number} selectionLimit selection limit
 * @param {Object} viewerContextData viewer context data
 * @return {Promise} A promise resolved once we initialize viewer preferences
 */
var initViewerPreferences = function( isShowAll, applyBookmarkWhileOpeningModel, disableBookMark, showSuppressed, selectionLimit, viewerContextData ) {
    var returnPromise = AwPromiseService.instance.defer();
    _openModelPreferences = new window.JSCom.Render.OpenModelPreferences();
    var allViewerPrefs = [ NAVIGATION_MODE, NAVIGATION_3D_MODE, SHADING, MATERIAL, TRIHEDRON,
        FLOOR_VISIBILITY, FLOOR_ORIENTATION, FLOOR_OFFSET, GRID, SHADOW, REFLECTION, VIEW_ORIENTATION_TOP,
        VIEW_ORIENTATION_LEFT, VIEW_ORIENTATION_FRONT, APPLYTRUESHADINGMATERIAL, EFFECTIVITY,
        VIEWER_SELECTION_DISPLAY, VIEWER_ZOOM_IN, ALL_ON, DISPLAY_UNIT, VIEWER_EXPOSED_BETA,
        VIS_COLOR_SCHEME, VIS_BROWSER_CACHING, VIEWER_APPLY_DEFAULT_MODEL_VIEW
    ];

    var allViewerPrefsDefaultVals = [ 'ROTATE', 'EXAMINE', 'false', '4',
        'true', 'false', '1', '0',
        'true', 'false', 'false',
        '-z', '+x', '+y', 'true',
        'false', 'true', 'Push', 'true', '3', '', 'siemens', 'true', 'false'
    ];

    var viewerPrefPromise = preferenceService.getMultiStringValues( allViewerPrefs.slice() );
    viewerPrefPromise.then( function( viewerPrefValuesMap ) {
        _.forEach( allViewerPrefs, function( prefVal, key ) {
            if( _.isNull( viewerPrefValuesMap[ prefVal ] ) || _.isUndefined( viewerPrefValuesMap[ prefVal ] ) ) {
                logger.error( 'Viewer preference not available on TC server : ' + prefVal +
                    '. Add this preference on TC server for normal functioning of viewer. Default value will be used for preference.' );
                viewerPrefValuesMap[ prefVal ] = [ allViewerPrefsDefaultVals[ key ] ];
            } else if( Array.isArray( viewerPrefValuesMap[ prefVal ] ) &&
                _.isNull( viewerPrefValuesMap[ prefVal ][ 0 ] ) ||
                _.isUndefined( viewerPrefValuesMap[ prefVal ][ 0 ] ) ) {
                logger.error( 'Viewer preference value not set in TC server : ' + prefVal +
                    '. Default value will be used for preference.' );
                viewerPrefValuesMap[ prefVal ] = [ allViewerPrefsDefaultVals[ key ] ];
            }
        } );
        exports.setNavigationMode( viewerPrefValuesMap[ NAVIGATION_MODE ][ 0 ], null, viewerContextData );
        exports.setSelectionDisplayPreference( viewerPrefValuesMap[ VIEWER_SELECTION_DISPLAY ][ 0 ], null, viewerContextData );
        _setDrawingOption();
        parseOrientations( 'TOP', viewerPrefValuesMap[ VIEW_ORIENTATION_TOP ][ 0 ] );
        parseOrientations( 'LEFT', viewerPrefValuesMap[ VIEW_ORIENTATION_LEFT ][ 0 ] );
        parseOrientations( 'FRONT', viewerPrefValuesMap[ VIEW_ORIENTATION_FRONT ][ 0 ] );
        _openModelPreferences.trueShade.material = parseInt( viewerPrefValuesMap[ MATERIAL ][ 0 ] );
        _openModelPreferences.trueShade.floorPlane = parseInt( viewerPrefValuesMap[ FLOOR_ORIENTATION ][ 0 ] );
        _openModelPreferences.trueShade.floorDistance = parseInt( viewerPrefValuesMap[ FLOOR_OFFSET ][ 0 ] );
        _openModelPreferences.trueShade.applyMaterial = viewerPrefValuesMap[ APPLYTRUESHADINGMATERIAL ][ 0 ] === 'true';
        _openModelPreferences.trueShade.gridVisible = viewerPrefValuesMap[ GRID ][ 0 ] === 'true';
        _openModelPreferences.trueShade.floorReflectionVisible = viewerPrefValuesMap[ REFLECTION ][ 0 ] === 'true';
        _openModelPreferences.trueShade.shadowVisible = viewerPrefValuesMap[ SHADOW ][ 0 ] === 'true';
        _openModelPreferences.trueShade.floorVisible = viewerPrefValuesMap[ FLOOR_VISIBILITY ][ 0 ] === 'true';
        _openModelPreferences.trueShade.shadedWithEdges = viewerPrefValuesMap[ SHADING ][ 0 ] === 'true' ? ViewerShadedWithEdges.SHADED_WITH_EDGES : ViewerShadedWithEdges.SHADED;
        _openModelPreferences.draw.trihedronVisible = viewerPrefValuesMap[ TRIHEDRON ][ 0 ] === 'true';
        _openModelPreferences.draw.navigationCubeVisible = viewerPrefValuesMap[ TRIHEDRON ][ 0 ] === 'true';
        _openModelPreferences.navigation.zoomReversed = viewerPrefValuesMap[ VIEWER_ZOOM_IN ][ 0 ] !== 'Pull';
        if( parseCam( viewerPrefValuesMap[ VIEW_ORIENTATION_TOP ][ 0 ] ) ){
            _openModelPreferences.navigation.stdViewOrientation.top = parseCam( viewerPrefValuesMap[ VIEW_ORIENTATION_TOP ][ 0 ] );
        }
        if( parseCam( viewerPrefValuesMap[ VIEW_ORIENTATION_LEFT ][ 0 ] ) ){
            _openModelPreferences.navigation.stdViewOrientation.left = parseCam( viewerPrefValuesMap[ VIEW_ORIENTATION_LEFT ][ 0 ] );
        }
        if( parseCam( viewerPrefValuesMap[ VIEW_ORIENTATION_FRONT ][ 0 ] ) ){
            _openModelPreferences.navigation.stdViewOrientation.front = parseCam( viewerPrefValuesMap[ VIEW_ORIENTATION_FRONT ][ 0 ] );
        }
        _openModelPreferences.isExamineNavigationMode = viewerPrefValuesMap[ NAVIGATION_3D_MODE ][ 0 ] === ThreeDNavigationMode.EXAMINE;
        _openModelPreferences.isWalkNavigationMode = viewerPrefValuesMap[ NAVIGATION_3D_MODE ][ 0 ] === ThreeDNavigationMode.WALK;
        _openModelPreferences.viewerBetaPref = viewerPrefValuesMap[ VIEWER_EXPOSED_BETA ];
        if( _openModelPreferences.applyDefaultModelViewOnOpen ) {
            _openModelPreferences.applyDefaultModelViewOnOpen = viewerPrefValuesMap[ VIEWER_APPLY_DEFAULT_MODEL_VIEW ][ 0 ] === 'true';
        }
        _openModelPreferences.viewerBackgroundColorTheme = viewerPrefValuesMap[ VIS_COLOR_SCHEME ][ 0 ];
        _openModelPreferences.selection.clientSelectionLimit = parseInt( selectionLimit );
        _openModelPreferences.displayUnit = parseInt( viewerPrefValuesMap[ DISPLAY_UNIT ][ 0 ] );
        _openModelPreferences.performance.useClientCaching = viewerPrefValuesMap[ VIS_BROWSER_CACHING ][ 0 ] === 'true';
        if( isShowAll ) {
            _openModelPreferences.allGeometryVisible = viewerPrefValuesMap[ ALL_ON ][ 0 ] === 'true';
        } else {
            _openModelPreferences.allGeometryVisible = false;
        }
        _openModelPreferences.enableProductStructureSipping = getPsSippingPref( viewerPrefValuesMap[ VIEWER_EXPOSED_BETA ] );
        _openModelPreferences.applyBookmarkWhileOpeningModel = applyBookmarkWhileOpeningModel;
        _openModelPreferences.disableBookMark = disableBookMark;
        _openModelPreferences.showSuppressed = showSuppressed;
        _openModelPreferences.memoryThreshold = getMemoryThreshold( viewerContextData );
        updateViewerPreferences( viewerContextData );
        returnPromise.resolve( _openModelPreferences );
    }, function() {
        returnPromise.resolve( _openModelPreferences );
    } );
    return returnPromise.promise;
};

/**
 * Initialize the preferences from vis session
 * @param {ViewerContextData} viewerCtxData Sets whether or not all geometry should be visible in the 3D scene
 */
export let loadViewerPreferencesFromVisSession = function( viewerCtxData ) {
    let allPromises = [ viewerCtxData.getVqSceneManager().getGlobalMaterial(),
        viewerCtxData.getVqSceneManager().getFloorPlaneOrientation(),
        viewerCtxData.getVqSceneManager().getFloorOffset(),
        viewerCtxData.getVqSceneManager().areMaterialsEnabled(),
        viewerCtxData.getVqSceneManager().getFloorGrid(),
        viewerCtxData.getVqSceneManager().isFloorReflectionEnabled(),
        viewerCtxData.getVqSceneManager().isFloorShadowEnabled(),
        viewerCtxData.getVqSceneManager().getFloor(),
        viewerCtxData.getThreeDViewManager().getBasicDisplayMode(),
        viewerCtxData.getDrawTrislingManager().isTrihedronEnabled(),
        viewerCtxData.getDrawTrislingManager().isNavCubeEnabled(),
        viewerCtxData.getThreeDViewManager().getBackgroundColorTheme()
    ];
    AwPromiseService.instance.all( allPromises ).then( function( viewerPreferenceDataResponse ) {
        _openModelPreferences.trueShade.material = viewerPreferenceDataResponse[ 0 ]; //Number
        _openModelPreferences.trueShade.floorPlane = viewerPreferenceDataResponse[ 1 ]; //Number
        _openModelPreferences.trueShade.floorDistance = viewerPreferenceDataResponse[ 2 ]; //Number
        _openModelPreferences.trueShade.applyMaterial = viewerPreferenceDataResponse[ 3 ]; // Boolean
        _openModelPreferences.trueShade.gridVisible = viewerPreferenceDataResponse[ 4 ]; //Boolean
        _openModelPreferences.trueShade.floorReflectionVisible = viewerPreferenceDataResponse[ 5 ]; //Boolean
        _openModelPreferences.trueShade.shadowVisible = viewerPreferenceDataResponse[ 6 ]; //Boolean
        _openModelPreferences.trueShade.floorVisible = viewerPreferenceDataResponse[ 7 ]; //Boolean
        _openModelPreferences.trueShade.shadedWithEdges = viewerPreferenceDataResponse[ 8 ]; //Number
        _openModelPreferences.draw.trihedronVisible = viewerPreferenceDataResponse[ 9 ]; //Boolean
        _openModelPreferences.draw.navigationCubeVisible = viewerPreferenceDataResponse[ 10 ]; //Boolean
        _openModelPreferences.viewerBackgroundColorTheme = viewerPreferenceDataResponse[ 11 ]; //String
        _openModelPreferences.navigation.zoomReversed = viewerCtxData.getNavigationManager().isZoomReversed(); //Boolean
        updateViewerPreferences( viewerCtxData );
    } ).catch( function( errorMsg ) {
        logger.error( 'Error while loading Vis preferences from session : ' + errorMsg );
    } );
};

/**
 * Set NavigationMode preference
 *
 * @param {String} navMode string representing viewer navigation mode
 * @param {Boolean} persistValue true if preference value should be persisted
 * @param {Object} viewerContextData viewer atomic data
 */
export let setNavigationMode = function( navMode, persistValue, viewerContextData ) {
    _openModelPreferences.navigation.defaultAction = exports.ViewerNavigationModes[ navMode ];
    updatePreferenceValue( NAVIGATION_MODE, navMode, persistValue, viewerContextData );
};

/**
 * Set Three Dimension NavigationMode preference
 *
 * @param {String} navMode string representing viewer navigation mode
 * @param {Boolean} persistValue true if preference value should be persisted
 * @param {Object} viewerContextData viewer atomic data
 */
export let setThreeDNavigationMode = function( navMode, viewerContextData ) {
    _openModelPreferences.isExamineNavigationMode = navMode === ThreeDNavigationMode.EXAMINE;
    _openModelPreferences.isWalkNavigationMode = navMode === ThreeDNavigationMode.WALK;
    updateViewerPreferences( viewerContextData );
    preferenceService.setStringValue( NAVIGATION_3D_MODE, [ navMode ] );
};

/**
 * Set the selection display preference.
 *
 * @param {String} selectionDisplayOption Selection behavior option
 * @param {Boolean} persistValue true if preference value should be persisted
 * @param {Object} viewerContextData viewer atomic data
 */
export let setSelectionDisplayPreference = function( selectionDisplayOption, persistValue, viewerContextData ) {
    var isUseTransparency = true;
    if( selectionDisplayOption && selectionDisplayOption !== 'true' ) { //$NON-NLS-1$
        isUseTransparency = false;
    }
    if( isUseTransparency ) {
        _openModelPreferences.selection.selectionDisplayStyle = exports.SelectionDisplayStyle.BBOX_GRAYSEETHRU;
        _openModelPreferences.contextDisplayStyle = exports.ContextDisplayStyle.COLOREDSEETHRU;
    } else {
        _openModelPreferences.selection.selectionDisplayStyle = exports.SelectionDisplayStyle.HIGHLIGHT;
        _openModelPreferences.contextDisplayStyle = exports.ContextDisplayStyle.NONE;
    }
    updatePreferenceValue( VIEWER_SELECTION_DISPLAY, isUseTransparency, persistValue, viewerContextData );
};

/**
 * Set the alternatePCi preference
 * @param {String} prefValue Preference to save
 *
 */
export let setUseAlternatePCIPreference = function( prefValue, viewerContextData ) {
    updatePreferenceValue( VIEWER_INDEXED_MODEL, prefValue, false, viewerContextData );
};

/**
 * Get the alternatePCi preference
 *
 * @returns {String} viewer indexed model preference
 */
export let getUseAlternatePCIPreference = function( viewerContextData ) {
    return getPreferenceValue( VIEWER_INDEXED_MODEL, viewerContextData );
};

/**
 * Get the all on pref value
 *
 * @param {Object} viewerContextData Preference to save
 * @returns {String} is all on value
 */
export let getIsAllOn = function( viewerContextData ) {
    return getPreferenceValue( ALL_ON, viewerContextData );
};

/**
 * Get the shaded with edges preference
 *
 * @returns {String} shaded with edegs preference
 */
export let getShadedWithEdgesPreference = function( viewerContextData ) {
    return getPreferenceValue( SHADING, viewerContextData );
};

/**
 * Set the shaded with edges preference
 *
 * @param {boolean} isShadedWithEdges with edegs preference
 * @param {Object} viewerContextData this contains Viewer Context Data
 */
export let setShadedWithEdgesPreference = function( isShadedWithEdges, viewerContextData ) {
    updatePreferenceValue( SHADING, isShadedWithEdges, true, viewerContextData );
};

/**
 * Set True Shading Material
 * @param {boolean} isApply is apply true Shading Material
 * @param {Object} viewerContextData this contains Viewer Context Data
 */
export let setApplyTrueShadingMaterial = function( isApply, viewerContextData ) {
    updatePreferenceValue( APPLYTRUESHADINGMATERIAL, isApply, true, viewerContextData );
};
/**
 * Provides orientation value based on the camera direction provided.
 *
 * @param {String} camDirection Camera direction selected to cause orientation.
 * @return {String} Orientation value.
 */
export let getViewOrientation = function( camDirection ) {
    return accessOrientationList( true, camDirection );
};

/**
 * Get PV open configuration
 *
 * @return {Promise} promise that will resolve with PV open config value
 */
export let getPVOpenConfiguration = function() {
    return preferenceService.getStringValue( PV_OPEN_CONFIG );
};

/**
 * Determines whether the 3D Viewer uses BOM-provided deltas when updating viewer 
 *
 * @return {Promise} promise that will resolve with whether to use BOM-provided deltas when updating viewer
 */
export let getUseBomDeltaStructureUpdate = function() {
    return preferenceService.getStringValue( VIS_USE_BOM_DELTA_STRUCTURE_UPDATE );
};

/**
 * Parses preferences string to list
 *
 * @param {String} cameraDirection Camera direction against orientation is to be set in list.
 * @param {String} mapping Orientation value as per the preference.
 */
var parseOrientations = function( cameraDirection, mapping ) {
    if( mapping ) {
        var cameraOrientation = parseCam( mapping );
        if( null !== cameraOrientation ) {
            accessOrientationList( false, cameraDirection, cameraOrientation );
            accessOrientationList( false, getOppositeDirection( cameraDirection ), parseCamOpposite( mapping ) );
        }
    }
};

/**
 * To update/access list based on the camera direction and value of orientation provided.
 * if fetchValue is set, it would return the value of orientation.
 *
 * @param {Boolean} fetchValue fetch value
 * @param {String} camDirection camera direction
 * @param {String} mapping mapping
 *
 * @returns {String} returns type of orientation
 */
var accessOrientationList = function( fetchValue, camDirection, mapping ) {
    if( camDirection === 'LEFT' ) {
        if( fetchValue ) {
            return exports.viewOrientationList.LEFT;
        }
        exports.viewOrientationList.LEFT = mapping;
    } else if( camDirection === 'RIGHT' ) {
        if( fetchValue ) {
            return exports.viewOrientationList.RIGHT;
        }
        exports.viewOrientationList.RIGHT = mapping;
    } else if( camDirection === 'TOP' ) {
        if( fetchValue ) {
            return exports.viewOrientationList.TOP;
        }
        exports.viewOrientationList.TOP = mapping;
    } else if( camDirection === 'BOTTOM' ) {
        if( fetchValue ) {
            return exports.viewOrientationList.BOTTOM;
        }
        exports.viewOrientationList.BOTTOM = mapping;
    } else if( camDirection === 'FRONT' ) {
        if( fetchValue ) {
            return exports.viewOrientationList.FRONT;
        }
        exports.viewOrientationList.FRONT = mapping;
    } else if( camDirection === 'ISOMETRIC' ) {
        if( fetchValue ) {
            return exports.viewOrientationList.ISOMETRIC;
        }
        exports.viewOrientationList.ISOMETRIC = mapping;
    } else if( camDirection === 'TRIMETRIC' ) {
        if( fetchValue ) {
            return exports.viewOrientationList.TRIMETRIC;
        }
        exports.viewOrientationList.TRIMETRIC = mapping;
    } else if( camDirection === 'BACK' ) {
        if( fetchValue ) {
            return exports.viewOrientationList.BACK;
        }
        exports.viewOrientationList.BACK = mapping;
    }
};

/**
 * Returns opposite camera direction.
 *
 * @param {String} cameraDirection Input camera direction e.g. FRONT, BACK
 * @returns {String} Opposite camera direction based on input.
 */
var getOppositeDirection = function( cameraDirection ) {
    var camDirection = null;
    if( cameraDirection === 'TOP' ) {
        camDirection = 'BOTTOM';
    } else if( cameraDirection === 'LEFT' ) {
        camDirection = 'RIGHT';
    } else if( cameraDirection === 'FRONT' ) {
        camDirection = 'BACK';
    }
    return camDirection;
};

/**
 * Parses string to opposite cameraOrientation
 *
 * @param {String} orientation Orientation whose oppsite value is desired.
 * @returns {String} Valid opposite orientation based on preference orientation.
 */
var parseCamOpposite = function( orientation ) {
    var camOrientation = null;
    if( orientation === '+x' ) {
        camOrientation = 'MinusX';
    } else if( orientation === '-x' ) {
        camOrientation = 'PlusX';
    } else if( orientation === '+y' ) {
        camOrientation = 'MinusY';
    } else if( orientation === '-y' ) {
        camOrientation = 'PlusY';
    } else if( orientation === '+z' ) {
        camOrientation = 'MinusZ';
    } else if( orientation === '-z' ) {
        camOrientation = 'PlusZ';
    }
    return camOrientation;
};

/**
 * Parses string to cameraOrientation
 *
 * @param {String} orientation Orientation whose relevant value is desired.
 * @returns {String} Valid orientation value.
 */
var parseCam = function( orientation ) {
    var camOrientation = null;
    if( orientation === '+x' ) {
        camOrientation = 'PlusX';
    } else if( orientation === '-x' ) {
        camOrientation = 'MinusX';
    } else if( orientation === '+y' ) {
        camOrientation = 'PlusY';
    } else if( orientation === '-y' ) {
        camOrientation = 'MinusY';
    } else if( orientation === '+z' ) {
        camOrientation = 'PlusZ';
    } else if( orientation === '-z' ) {
        camOrientation = 'MinusZ';
    }
    return camOrientation;
};

/**
 * Update preference value for user session
 *
 * @param {String} prefName viewer navigation mode
 * @param {String/Number} prefValue value of preference
 * @param {Boolean} persistValue true if preference value should be persisted
 * @param {Object} viewerContextData viewer context data
 */
var updatePreferenceValue = function( prefName, prefValue, persistValue, viewerContextData ) {
    if( !viewerContextData ) {
        return;
    }
    viewerContextData.updateViewerAtomicData( 'viewerPreference.' + prefName, prefValue );
    if( persistValue ) {
        var values = Array.isArray( prefValue ) ? prefValue : [ prefValue.toString() ];
        preferenceService.setStringValues( [ prefName ], [ values ] );
    }
};

var getPreferenceValue = function( prefName, viewerContextData ) {
    if( !viewerContextData ) {
        return;
    }
    var viewerPreference = viewerContextData.getValueOnViewerAtomicData( 'viewerPreference' );
    if( viewerPreference ) {
        return viewerPreference[ prefName ];
    }
    return;
};

var updateViewerPreferences = function( viewerContextData ) {
    if( _openModelPreferences && viewerContextData ) {
        const viewerPreference = viewerContextData.getValueOnViewerAtomicData( 'viewerPreference' );
        let updatedPreferences = { ...viewerPreference };
        updatedPreferences.AWC_visMaterial = _openModelPreferences.trueShade.material.toString();
        updatedPreferences.AWC_applyTrueShadingMaterial = _openModelPreferences.trueShade.applyMaterial;
        updatedPreferences.AWC_visGridOn = _openModelPreferences.trueShade.gridVisible;
        updatedPreferences.AWC_visShadowOn = _openModelPreferences.trueShade.shadowVisible;
        updatedPreferences.AWC_visReflectionOn = _openModelPreferences.trueShade.floorReflectionVisible;
        updatedPreferences.AWC_visFloorOn = _openModelPreferences.trueShade.floorVisible;
        updatedPreferences.AWC_visFloorPlaneOrientation = _openModelPreferences.trueShade.floorPlane.toString();
        updatedPreferences.AWC_visFloorOffset = _openModelPreferences.trueShade.floorDistance.toString();
        updatedPreferences.AWC_visShading = _openModelPreferences.trueShade.shadedWithEdges === 1;
        updatedPreferences.AWC_visTrihedronOn = _openModelPreferences.draw.trihedronVisible;
        updatedPreferences.isExamineNavigationMode = _openModelPreferences.isExamineNavigationMode;
        updatedPreferences.isWalkNavigationMode = _openModelPreferences.isWalkNavigationMode;
        updatedPreferences.AWC_visExamineZoomIn = _openModelPreferences.navigation.zoomReversed;
        updatedPreferences.AWC_visExposedBetaFeatures = _openModelPreferences.viewerBetaPref;
        updatedPreferences.AWC_3DViewerDisplayUnit = _openModelPreferences.displayUnit.toString();
        updatedPreferences.AWC_visColorScheme = [ _openModelPreferences.viewerBackgroundColorTheme ];
        updatedPreferences.AWC_visSelectionLimit = _openModelPreferences.selection.clientSelectionLimit;
        updatedPreferences.AWC_visAllOn = _openModelPreferences.allGeometryVisible;
        viewerContextData.updateViewerAtomicData( 'viewerPreference', updatedPreferences );
    }
};

/**
 * Makes a call to the Tc server to retrieve all the preferences listed. This
 * method only returns them, it does not save them to the viewerPreferenceContext.
 */
export let getAllVisAWCPreferences = function() {
    var returnPromise = AwPromiseService.instance.defer();

    var allPrefs = [
        'AWV02DViewerRenderOption',
        'AWV0AWVisReuseTCServer',
        'AWV0HostAWInVisUponLaunch',
        'AWV0LaunchAsSession',
        'AWV0SectionCapsEdgesInitialState',
        'AWV0UseAWAppConnect',
        'AWV0VisBrowserCaching',
        'AWV0VisReuseTCServer',
        'AWC_VisStructureContext.SUMMARYRENDERING',
        'AWC_vis3DNavigationMode',
        'AWC_visAllOn',
        'AWC_visColorScheme',
        'AWC_visExamineZoomIn',
        'AWC_visExposedBetaFeatures',
        'AWC_visFloorOffset',
        'AWC_visFloorOn',
        'AWC_visFloorPlaneOrientation',
        'AWC_visGridOn',
        'AWC_visMaterial',
        'AWC_visNavigationMode',
        'AWC_visOverlayDisplayEffectivity',
        'AWC_visProductViewOpenConfiguration',
        'AWC_visReflectionOn',
        'AWC_visSelectionDisplay',
        'AWC_visSelectionLimit',
        'AWC_visShading',
        'AWC_visShadowOn',
        'AWC_visStdViewOrientationFront',
        'AWC_visStdViewOrientationLeft',
        'AWC_visStdViewOrientationTop',
        'AWC_visTrihedronOn'
    ];

    var viewerPrefPromise = preferenceService.getMultiStringValues( allPrefs.slice() );
    viewerPrefPromise.then( ( output ) => { returnPromise.resolve( output ); } );

    return returnPromise.promise;
};

export default exports = {
    ViewerMaterial,
    ViewerFloorPlane,
    ViewerShadedWithEdges,
    SelectionDisplayStyle,
    ContextDisplayStyle,
    ViewerNavigationModes,
    viewOrientationList,
    occurrenceTypeList,
    ModelViewProperties,
    ThreeDNavigationMode,
    getViewerPreferences,
    getViewerOccuranceType,
    setViewerOccuranceType,
    setDisplayUnit,
    getDisplayUnit,
    getColorTheme,
    setColorTheme,
    setModelUnit,
    getModelUnit,
    getViewerBetaPref,
    setEnableDrawingPref,
    setNavigationMode,
    setSelectionDisplayPreference,
    setUseAlternatePCIPreference,
    getUseAlternatePCIPreference,
    getViewOrientation,
    getPVOpenConfiguration,
    loadViewerPreferencesFromVisSession,
    getShadedWithEdgesPreference,
    getSelectionLimit,
    getBrowserCachingPref,
    setFloorOffset,
    getFloorOffset,
    setThreeDNavigationMode,
    setShadowVisibility,
    setGridVisibility,
    setFloorVisibility,
    setReflectionVisibility,
    setGlobalMaterial,
    setShadedWithEdgesPreference,
    setApplyTrueShadingMaterial,
    setTrihedronVisibility,
    setFloorOrientation,
    setPMIOption,
    getAllVisAWCPreferences,
    getIsAllOn,
    getUseBomDeltaStructureUpdate
};
