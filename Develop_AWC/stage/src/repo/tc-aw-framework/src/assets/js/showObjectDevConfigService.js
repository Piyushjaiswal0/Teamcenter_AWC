// Copyright (c) 2022 Siemens

/**
 * @module js/showObjectDevConfigService
 */
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import localStrg from 'js/localStorage';

var _LS_SCHEMA_VERSION = '1.0.0';

var _LS_TOPIC = 'awShowObjectDevConfig';

var _CTX_NAME = 'showObjectDevConfig';

/**
 * Define default showObjectDevConfig values
 */
var _defaultConfig = {
    schemaVersion: _LS_SCHEMA_VERSION,
    useMock: false,
    useNewOcc: false,
    useDeclShowObj: false,
    nodeDelay: 1000,
    propertyDelay: 3000,
    maxTreeLevel: 3,
    initialChildNdx: 0,
    loadPageSize: 20
};

var exports = {};

/**
 * Update all showObjectDevConfig values in the appContextService and LocalStorage using values from given
 * 'declViewModel'.
 * 
 * @param {DeclViewModel} data - The declViewModel data context object.
 */
export let updateConfigFromViewModel = function( data ) { // eslint-disable-line no-unused-vars
    var showObjectDevConfig = exports.getCurrentConfig();

    showObjectDevConfig.useMock = data.useMockData.dbValue;
    showObjectDevConfig.useNewOcc = data.useNewOcc.dbValue;
    showObjectDevConfig.useDeclShowObj = data.useDeclShowObj.dbValue;
    showObjectDevConfig.nodeDelay = data.delayTimeTree.dbValue;
    showObjectDevConfig.propertyDelay = data.delayTimeProperty.dbValue;
    showObjectDevConfig.maxTreeLevel = data.maxTreeLevel.dbValue;
    showObjectDevConfig.initialChildNdx = data.initialChildNdx.dbValue;
    showObjectDevConfig.loadPageSize = data.loadPageSize.dbValue;

    // Update AppCtxService
    appCtxSvc.updateCtx( _CTX_NAME, showObjectDevConfig );

    // Update LocalStorage
    localStrg.publish( _LS_TOPIC, JSON.stringify( showObjectDevConfig ) );
};

/**
 * Update all showObjectDevConfig values in the appContextService using any previous values from LocalStorage.
 */
export let updateFromSaved = function() {
    /**
     * Load from local storage and merge any of its values with the default values.
     */
    var showObjectDevConfig = _defaultConfig;

    var showObjectDevConfigJSON = localStrg.get( _LS_TOPIC );

    if( showObjectDevConfigJSON ) { // pre-existing values
        var showObjectDevConfigPrev = JSON.parse( showObjectDevConfigJSON );

        if( showObjectDevConfigPrev.schemaVersion === _LS_SCHEMA_VERSION ) {
            showObjectDevConfig = _.merge( _defaultConfig, showObjectDevConfigPrev );
        }
    }

    localStrg.publish( _LS_TOPIC, JSON.stringify( showObjectDevConfig ) );

    // Register updated options
    appCtxSvc.registerCtx( _CTX_NAME, showObjectDevConfig );
};

/**
 * @return {Object} The current 'showObjectDevConfig' values in the appContextService.
 */
export let getCurrentConfig = function() {
    var showObjectDevConfig = appCtxSvc.getCtx( _CTX_NAME );

    if( !showObjectDevConfig ) {
        showObjectDevConfig = _defaultConfig;

        appCtxSvc.registerCtx( _CTX_NAME, showObjectDevConfig );
    }

    return showObjectDevConfig;
};

export default exports = {
    updateConfigFromViewModel,
    updateFromSaved,
    getCurrentConfig
};
