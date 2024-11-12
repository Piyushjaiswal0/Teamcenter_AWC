// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostAppContext_2017_11
 * @namespace hostAppContext_2017_11
 */
import appCtxSvc from 'js/appCtxService';
import hostFactorySvc from 'js/hosting/hostFactoryService';
import _ from 'lodash';
import logger from 'js/logger';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// SetAppContextMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Definition of the JSON data moved to/from the {@link OpenLocationSvc}.
 *
 * @constructor
 * @memberof hostAppContext_2017_11
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) JSON encoded data to set as the properties of the new instance.
 */
var SetAppContextMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2017_11 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

SetAppContextMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get the context
 *
 * @memberof hostAppContext_2017_11.SetAppContextMsg
 *
 * @return {String} The ID of the context value.
 */
SetAppContextMsg.prototype.getContext = function() {
    return _.get( this, 'context', null );
};

/**
 * Set the context
 *
 * @memberof hostAppContext_2017_11.SetAppContextMsg
 *
 * @param {String} context - The ID of the context value to set.
 */
SetAppContextMsg.prototype.setContext = function( context ) {
    this.context = context;
};

/**
 * Get the value key to set in the context
 *
 * @memberof hostAppContext_2017_11.SetAppContextMsg
 *
 * @return {String} Current value.
 */
SetAppContextMsg.prototype.getKey = function() {
    return _.get( this, 'key', null );
};

/**
 * Set the value key
 *
 * @memberof hostAppContext_2017_11.SetAppContextMsg
 *
 * @param {String} key - the app context value's key
 */
SetAppContextMsg.prototype.setKey = function( key ) {
    this.key = key;
};

/**
 * Get the value to set in the context
 *
 * @memberof hostAppContext_2017_11.SetAppContextMsg
 *
 * @return {Object} Value to set.
 */
SetAppContextMsg.prototype.getValue = function() {
    return _.get( this, 'value', null );
};

/**
 * Set the value key
 *
 * @memberof hostAppContext_2017_11.SetAppContextMsg
 *
 * @param {Object} value - the app context value
 */
SetAppContextMsg.prototype.setValue = function( value ) {
    this.value = value;
};

/**
 * Get the value to set in the context
 *
 * @memberof hostAppContext_2017_11.SetAppContextMsg
 *
 * @return {ObjectArray} Values to set.
 */
SetAppContextMsg.prototype.getArrayValue = function() {
    return _.get( this, 'arrayValue', null );
};

/**
 * Set the value key
 *
 * @memberof hostAppContext_2017_11.SetAppContextMsg
 *
 * @param {ObjectArray} value - the app context value
 */
SetAppContextMsg.prototype.setArrayValue = function( value ) {
    this.arrayValue = value;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// SetAppContextSvc
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 *  Hosting service to display summary page for identified object.
 *
 * @constructor
 * @memberof hostAppContext_2017_11
 * @extends hostFactoryService.BaseCallableService
 */
var SetAppContextSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_SET_APP_CONTEXT_SVC,
        hostServices.VERSION_2017_11 );
};

SetAppContextSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * This is an incoming call to this service trigger the related event handlers.
 *
 * @function handleIncomingEvent
 * @memberof hostAppContext_2017_11.SetAppContextSvc
 *
 * @param {String} jsondata - JSON encoded payload from the host.
 */
SetAppContextSvc.prototype.handleIncomingEvent = function( jsondata ) {
    try {
        // attempt to deserialize the input data contract.
        var msg = exports.createSetAppContextMsg( jsondata );

        var value = {};

        if( msg.getValue() ) {
            value[ msg.getKey() ] = msg.getValue();
        } else if( msg.getArrayValue() ) {
            value[ msg.getKey() ] = msg.getArrayValue();
        } else {
            value = null;
        }

        var ctxName = msg.getContext();

        var existingCtx = appCtxSvc.getCtx( ctxName );

        if( existingCtx ) {
            appCtxSvc.updateCtx( ctxName, value );
        } else if( value ) {
            appCtxSvc.registerCtx( ctxName, value );
        }
    } catch ( ex ) {
        logger.error( ex );
    }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Create new client-side service.
 *
 * @memberof hostAppContext_2017_11
 *
 * @returns {SetAppContextSvc} New instance of the service message object.
 */
export let createSetAppContextSvc = function() {
    return new SetAppContextSvc();
};

/**
 * Create new client-side service message object.
 *
 * @memberof hostAppContext_2017_11
 *
 * @param {String} jsonString - (Optional) JSON encoded data to set as the properties of the new instance.
 *
 * @returns {SetAppContextMsg} New instance of the service message object.
 */
export let createSetAppContextMsg = function( jsonString ) {
    return new SetAppContextMsg( jsonString );
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostAppContext_2017_11
 */
export let registerHostingModule = function() {
    exports.createSetAppContextSvc().register();
};

export default exports = {
    createSetAppContextSvc,
    createSetAppContextMsg,
    registerHostingModule
};
