// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostRouter_2020_01
 * @namespace hostRouter_2020_01
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostRouterProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostRouter_2020_01
 * @extends hostFactoryService.BaseCallableService
 */
var HostRouterProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_ROUTER_SVC,
        hostServices.VERSION_2020_01 );
};

HostRouterProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Process outgoing 'event' type call to the host.
 *
 * @function sendURLChange
 * @memberof hostRouter_2020_01.HostRouterProxy
 *
 * @param {HostRouterMsg} inputData - the message containing information about the url change
 */
HostRouterProxy.prototype.sendURLChange = function( inputData ) {
    var payload = JSON.stringify( inputData );

    this._invokeHostEvent( payload );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostRouterMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends the open request info to the host via {@link HostRouterProxy}.
 * <P>
 * The message has a list of targets to be opened. Representation is similar to the selection service
 * contract.
 *
 * @constructor
 * @memberof hostRouter_2020_01
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {Object} fromState - the from state
 * @param {Object} fromParams - the to state
 * @param {Object} toState - the to state
 * @param {Object} toParams - the to Params
 * @param {Object} options - the options
 */
var HostRouterMsg = function( fromState, fromParams, toState, toParams, options ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2020_01 );
    this.FromState = fromState;
    this.FromParams = fromState;
    this.ToState = toState;
    this.ToParams = toParams;
    this.Options = options;
};

HostRouterMsg.prototype = hostFactorySvc.extendDataContract();

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Return a new instance of this class.
 *
 * @memberof hostRouter_2020_01
 *
 * @returns {HostRouterProxy} New instance of the service message API object.
 */
export let createHostRouterProxy = function() {
    return new HostRouterProxy();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostRouter_2020_01
 *
 * @param {Object} fromState - the from State
 * @param {Object} fromParams - the from Parameters
 * @param {Object} toState - the to State
 * @param {Object} toParams - the to Parameters
 * @param {Object} options - the to Parameters
 *
 * @returns {HostRouterMsg} New instance of the service message object.
 */
export let createHostRouterMsg = function( fromState, fromParams, toState, toParams, options ) {
    return new HostRouterMsg( fromState, fromParams, toState, toParams, options );
};

// ---------------------------------------------------------------------------------

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostRouter_2020_01
 */
export let registerHostingModule = function() {
    //
};

export default exports = {
    createHostRouterProxy,
    createHostRouterMsg,
    registerHostingModule
};
