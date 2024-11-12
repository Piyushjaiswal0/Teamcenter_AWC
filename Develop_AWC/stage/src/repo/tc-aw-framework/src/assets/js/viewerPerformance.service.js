// @<COPYRIGHT>@
// ==================================================
// Copyright 2022.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/viewerPerformance.service
 */
import splmStatsService from 'js/splmStatsService';
import logger from 'js/logger';
import cfgSvc from 'js/configurationService';
import uwPropertyService from 'js/uwPropertyService';
import localeService from 'js/localeService';
import 'config/plstatsConfig';

/**
 * Export
 */
let exports = {};
var activePerformanceParameter = null;
var isPLStatsEnabled = null;

/* Enum viewer performance parameters */
export const viewerPerformanceParameters = {
    InitialLoading: 'InitialLoading',
    SessionSave: 'SessionSave',
    CaptureProductSnapshot: 'CaptureProductSnapshot',
    CaptureSessionSnapshot: 'CaptureSessionSnapshot',
    ApplyProductSnapshot: 'ApplyProductSnapshot',
    ApplySessionSnapshot: 'ApplySessionSnapshot',
    CreateSection: 'CreateSection',
    AreaSelect: 'AreaSelect',
    Measurement: 'Measurement',
    Proximity: 'Proximity',
    Volume: 'Volume'
};
Object.freeze( viewerPerformanceParameters );

/**
 * Function to enable 3D viewer wait flag
 */
export let enable3DViewerWaitFlag = function() {
    window.autiomationTestStepWaitFlag = true;
};

/**
 * Function to disable 3D viewer wait flag
 */
export let disable3DViewerWaitFlag = function() {
    window.autiomationTestStepWaitFlag = false;
};

/**
 * Set 3D viewer perfromance mode
 *
 * @param {Boolean} mode true if viewer is visible
 */
export let setViewerPerformanceMode = function( isEnabled ) {
    if( isEnabled ) {
        exports.enable3DViewerWaitFlag();
    } else {
        exports.disable3DViewerWaitFlag();
    }
};

/**
 * Start viewer performance data capture
 *
 * @param {String} active performance parameter
 */
export let startViewerPerformanceDataCapture = function( activePerformanceParam ) {
    if( viewerPerformanceParameters.hasOwnProperty( activePerformanceParam ) ) {
        activePerformanceParameter = activePerformanceParam;

        window.startInitialise3Dusecase = window.performance.now();
    } else {
        window.startInitialiseSelectionUsecase = window.performance.now();
    }
};

/**
 * update performace info
 *
 * @param {Object} vis performance metrics
 */
let populatePlstatsVisDataWithDefaultValue = function( plstatsVisData ) {
    let plstatsConfig = cfgSvc.getCfgCached( 'plstatsConfig' );
    plstatsConfig.forEach( function( visActivityType, idx ) {
        if( visActivityType.appid === 'vis' ) {
            visActivityType.displayName = getLocalizedText( visActivityType.name );
            if( visActivityType.type === 'string' ) {
                plstatsVisData.props[ visActivityType.name ] = uwPropertyService.createViewModelProperty( visActivityType.displayName, visActivityType.displayName,
                    'STRING', '0.00 s', [ '0.00 s' ] );
            } else {
                plstatsVisData.props[ visActivityType.name ] = uwPropertyService.createViewModelProperty( visActivityType.displayName, visActivityType.displayName,
                    'STRING', '0', [ '0' ] );
            }
        }
    } );
    return plstatsVisData;
};

/**
 * update performace info
 *
 * @param {String} vis activity time
 */
let updatePerformaceInfo = function( viewerActivityTime ) {
    let plstatsConfig = cfgSvc.getCfgCached( 'plstatsConfig' );
    plstatsConfig.filter( function( slots ) {
        if( slots.appid === 'vis' ) {
            slots.displayName = getLocalizedText( slots.name );
            if( slots.name === 'VisServerTime' ) {
                slots.value = viewerActivityTime;
            }
        }
    } );
    splmStatsService.setCustomMetricsDetails( plstatsConfig );
};

/**
 * Print performace info
 *
 * @param {String} active Performance param
 */
let printPerformaceInfo = function( activePerformanceInfo, performanceCaptureStartTime ) {
    let viewerActivityTime = ( ( window.performance.now() - performanceCaptureStartTime ) / 1000 ).toFixed( 4 ) + ' s';
    updatePerformaceInfo( viewerActivityTime );
    logger.info( '+=========================================================================+' );
    logger.info( '| ' + activePerformanceInfo, viewerActivityTime );
    logger.info( '+=========================================================================+' );
};

/**
 * Stop viewer performance data capture
 *
 * @param {String} active Performance Parameter
 * @param {Boolean} true in case of Intermittent Capture
 */
export let stopViewerPerformanceDataCapture = function( activePerformanceInfo, viewerAction ) {
    if( viewerAction === 'IntermittentCapture' ) {
        printPerformaceInfo( activePerformanceInfo, window.startInitialise3Dusecase );
    } else if( viewerAction === 'viewerOrTreeSelection' && window.startInitialiseSelectionUsecase ) {
        printPerformaceInfo( activePerformanceInfo, window.startInitialiseSelectionUsecase );
        delete window.startInitialiseSelectionUsecase;
    } else if( window.startInitialise3Dusecase ) {
        printPerformaceInfo( activePerformanceInfo, window.startInitialise3Dusecase );
        delete window.startInitialise3Dusecase;
        activePerformanceParameter = null;
    }
};

/**
 * Get Viewer Actions Info
 *
 ** @returns {String} active performance parameter
 */
export let getViewerPerformanceInfo = function() {
    return activePerformanceParameter;
};

/**
 * Check if performance monitor is enabled
 *
 * @returns {Boolean} true/false
 */
export let isPerformanceMonitoringEnabled = function() {
    if( !isPLStatsEnabled ) {
        isPLStatsEnabled = splmStatsService.isPLStatsEnabled();
        return isPLStatsEnabled;
    }
    return isPLStatsEnabled;
};

/**
 * update vis specific data, populated on performance monitoring panel
 *
 * @param {String} vis activity string
 * @return {Object} plstats vis object
 */
export let updatePerformanceDisplayData = function( activityType ) {
    let newPLStatsData = splmStatsService.getPLStatsPerformanceData();
    let plstatsVisData = {
        props: {}
    };

    if( newPLStatsData.customMetrics && newPLStatsData.customMetrics.length > 0 ) {
        newPLStatsData.customMetrics.filter( function( customActivityType ) {
            if( customActivityType.name === 'EMMRequests' && activityType === 'requestCount' ) {
                let reqCount = newPLStatsData.Network.XhrDetails.filter( function( networkCall ) {
                    return  networkCall.logCorrelationID === 0 && networkCall.responseUrl.indexOf( 'VisProxyServlet' ) > -1;
                } ).length;
                customActivityType.value = reqCount;
                plstatsVisData.props[ customActivityType.name ] = uwPropertyService.createViewModelProperty( customActivityType.displayName, customActivityType.displayName,
                    'STRING', customActivityType.value, [ customActivityType.value ] );
            } else if( customActivityType.name === 'VisServerTime' && activityType === 'serverTime' ) {
                plstatsVisData.props[ customActivityType.name ] = uwPropertyService.createViewModelProperty( customActivityType.displayName, customActivityType.displayName,
                    'STRING', customActivityType.value, [ customActivityType.value ] );
            }
        } );
    } else {
        plstatsVisData = populatePlstatsVisDataWithDefaultValue( plstatsVisData );
    }

    for( const [ _, value ] of Object.entries( plstatsVisData.props ) ) {
        uwPropertyService.setPropertyLabelDisplay( value, 'PROPERTY_LABEL_AT_TOP' );
    }
    return plstatsVisData;
};

/**
 * Get the localized text for given key
 *
 * @param {String} key Key for localized text
 * @return {String} The localized text
 */
function getLocalizedText( key ) {
    var localeTextBundle = getLocaleTextBundle();
    return localeTextBundle[ key ];
}

/**
 * This method finds and returns an instance for the locale resource.
 *
 * @return {Object} The instance of locale resource if found, null otherwise.
 */
function getLocaleTextBundle() {
    var resource = 'Awv0threeDViewerMessages';
    var localeTextBundle = localeService.getLoadedText( resource );
    if( localeTextBundle ) {
        return localeTextBundle;
    }
    return null;
}

/**
 * reset vis specific data, populated on performance monitoring panel
 */
export let resetPerformanceDisplayData = function( activityType ) {
    let plstatsVisData = {
        props: {}
    };
    plstatsVisData = populatePlstatsVisDataWithDefaultValue( plstatsVisData );
    for( const [ _, value ] of Object.entries( plstatsVisData.props ) ) {
        uwPropertyService.setPropertyLabelDisplay( value, 'PROPERTY_LABEL_AT_TOP' );
    }

    return plstatsVisData;
};

/**
 *A glue code to support viewer performance service
 *
 *
 * @return {Object} - Service instance
 *
 * @member viewerPerformanceService
 *
 */
export default exports = {
    enable3DViewerWaitFlag,
    disable3DViewerWaitFlag,
    setViewerPerformanceMode,
    startViewerPerformanceDataCapture,
    stopViewerPerformanceDataCapture,
    isPerformanceMonitoringEnabled,
    getViewerPerformanceInfo,
    viewerPerformanceParameters,
    updatePerformanceDisplayData,
    resetPerformanceDisplayData
};
