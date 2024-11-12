// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostPreferences_2017_05
 * @namespace hostPreferences_2017_05
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import preferenceSvc from 'soa/preferenceService';
import _ from 'lodash';
import logger from 'js/logger';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// GetPreferencesSvc
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 *  Hosting service to display given page for identified object.
 *
 *  @constructor
 *  @memberof hostPreferences_2017_05
 *  @extends hostFactoryService.BaseCallableService
 */
var GetPreferencesSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_GET_PREFERENCES_SVC,
        hostServices.VERSION_2017_05 );
};

GetPreferencesSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * This is an incoming call to this service trigger the related event handlers.
 *
 * @function handleIncomingEvent
 * @memberof hostPreferences_2017_05.GetPreferencesSvc
 *
 * @param {String} jsonData - JSON encoded payload from the host.
 */
GetPreferencesSvc.prototype.handleIncomingEvent = function( jsonData ) {
    try {
        var msg = exports.createGetPreferencesMsg( jsonData );

        var prefNames = msg.getPreferences();

        preferenceSvc.getMultiStringValues( prefNames ).then( function( response ) {
            var pairs = [];

            _.forEach( response, function( value, name ) {
                pairs.push( {
                    Key: name,
                    Value: value
                } );
            } );

            var responseMsg = exports.createGetPreferencesResponseMsg();

            responseMsg.setPreferencesValues( pairs );

            exports.createGetPreferencesResponseProxy().fireHostEvent( responseMsg );
        }, function( err ) {
            logger.error( 'hostPreferences_2017_05' + ':' + 'handleIncomingEvent' + ':' + err );

            var responseMsg = exports.createGetPreferencesResponseMsg();

            responseMsg.setPreferences( [] );

            exports.createGetPreferencesResponseProxy().fireHostEvent( responseMsg );
        } );
    } catch ( ex ) {
        logger.error( ex );
    }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// GetPreferencesResponseProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostPreferences_2017_05
 * @extends hostFactoryService.BaseCallableService
 */
var GetPreferencesResponseProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_GET_PREFERENCES_RESPONSE_SVC,
        hostServices.VERSION_2017_05 );
};

GetPreferencesResponseProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Process outgoing 'event' type call to the host.
 *
 * @function fireHostEvent
 * @memberof hostPreferences_2017_05.HostOpenProxy
 *
 * @param {GetPreferencesResponseMsg} inputData - Data object who's properties define data {in whatever form
 * the implementation is expecting) to process into a call to the host-side service.
 */
GetPreferencesResponseProxy.prototype.fireHostEvent = function( inputData ) {
    var payload = JSON.stringify( inputData );

    this._invokeHostEvent( payload );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// GetPreferencesMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends ...
 *
 * @constructor
 * @memberof hostPreferences_2017_05
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var GetPreferencesMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2017_05 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

GetPreferencesMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current value.
 *
 * @memberof hostPreferences_2017_05.GetPreferencesResponseMsg
 *
 * @return {StringArray} The names of the preference values to return.
 */
GetPreferencesMsg.prototype.getPreferences = function() {
    return _.get( this, 'preferences', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostPreferences_2017_05.GetPreferencesResponseMsg
 *
 * @param {StringArray} value - The names of the preference values to return.
 */
GetPreferencesMsg.prototype.setPreferences = function( value ) {
    this.preferences = value;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// GetPreferencesResponseMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends ...
 *
 * @constructor
 * @memberof hostPreferences_2017_05
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var GetPreferencesResponseMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2017_05 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

GetPreferencesResponseMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current value.
 *
 * @memberof hostPreferences_2017_05.GetPreferencesResponseMsg
 *
 * @return {PairArray} The names (Key) and values (Value) of the preferences being returned.
 */
GetPreferencesResponseMsg.prototype.getPreferencesValues = function() {
    return _.get( this, 'preferences', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostPreferences_2017_05.GetPreferencesResponseMsg
 *
 * @param {PairArray} value - The names (Key) and values (Value) of the preferences being returned.
 */
GetPreferencesResponseMsg.prototype.setPreferencesValues = function( value ) {
    this.preferences = value;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Return a new instance of this class.
 *
 * @memberof hostPreferences_2017_05
 *
 * @returns {GetPreferencesSvc} New instance of the service message API object.
 */
export let createGetPreferencesSvc = function() {
    return new GetPreferencesSvc();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostPreferences_2017_05
 *
 * @returns {GetPreferencesResponseProxy} New instance of the service message API object.
 */
export let createGetPreferencesResponseProxy = function() {
    return new GetPreferencesResponseProxy();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostPreferences_2017_05
 *
 * @param {String} payload - (Optional) String from the 'host' to use when initializing the message object.
 *
 * @returns {GetPreferencesMsg} New instance of the service message object.
 */
export let createGetPreferencesMsg = function( payload ) {
    return new GetPreferencesMsg( payload );
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostPreferences_2017_05
 *
 * @param {String} payload - (Optional) String from the 'host' to use when initializing the message object.
 *
 * @returns {GetPreferencesResponseMsg} New instance of the service message object.
 */
export let createGetPreferencesResponseMsg = function( payload ) {
    return new GetPreferencesResponseMsg( payload );
};

// ---------------------------------------------------------------------------------

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostPreferences_2017_05
 */
export let registerHostingModule = function() {
    exports.createGetPreferencesSvc().register();
};

export default exports = {
    createGetPreferencesSvc,
    createGetPreferencesResponseProxy,
    createGetPreferencesMsg,
    createGetPreferencesResponseMsg,
    registerHostingModule
};
