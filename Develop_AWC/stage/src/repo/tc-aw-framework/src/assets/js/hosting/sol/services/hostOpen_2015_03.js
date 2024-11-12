// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostOpen_2015_03
 * @namespace hostOpen_2015_03
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import _ from 'lodash';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostOpenWithProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostOpen_2015_03
 * @extends hostFactoryService.BaseCallableService
 */
var HostOpenWithProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_HOST_OPEN_WITH,
        hostServices.VERSION_2015_03 );
};

HostOpenWithProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Process outgoing 'event' type call to the host.
 *
 * @function fireHostEvent
 * @memberof hostOpen_2015_03.HostOpenWithProxy
 *
 * @param {HostOpenWithRequestMsg} inputData - Data object who's properties define data {in whatever form the
 * implementation is expecting) to process into a call to the host-side service.
 */
HostOpenWithProxy.prototype.fireHostEvent = function( inputData ) {
    var payload = JSON.stringify( inputData );

    this._invokeHostEvent( payload );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostOpenWithRequestMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends the open request info to the host via {@link HostOpenProxy}.
 * <P>
 * The message has a list of targets to be opened. Representation is similar to the selection service
 * contract.
 *
 * @constructor
 * @memberof hostOpen_2015_03
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var HostOpenWithRequestMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2015_03 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

HostOpenWithRequestMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current value.
 *
 * @memberof hostOpen_2015_03.HostOpenWithRequestMsg
 *
 * @return {String} Context property value.
 */
HostOpenWithRequestMsg.prototype.getContext = function() {
    return _.get( this, 'Context', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostOpen_2015_03.HostOpenWithRequestMsg
 *
 * @param {String} context - Context property value.
 */
HostOpenWithRequestMsg.prototype.setContext = function( context ) {
    this.Context = context;
};

/**
 * Get current value.
 *
 * @memberof hostOpen_2015_03.HostOpenWithRequestMsg
 *
 * @return {InteropObjectRefArray} Targets property value.
 */
HostOpenWithRequestMsg.prototype.getTargets = function() {
    return _.get( this, 'Targets', null );
};

/**
 * Set current value.
 *
 * @memberof hostOpen_2015_03.HostOpenWithRequestMsg
 *
 * @param {InteropObjectRefArray} list - Targets property value.
 */
HostOpenWithRequestMsg.prototype.setTargets = function( list ) {
    this.Targets = list;
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
 * @memberof hostOpen_2015_03
 *
 * @returns {HostOpenWithProxy} New instance of the service message API object.
 */
export let createHostOpenWithProxy = function() {
    return new HostOpenWithProxy();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostOpen_2015_03
 *
 * @param {String} payload - (Optional) String from the 'host' to use when initializing the message object.
 *
 * @returns {HostOpenWithRequestMsg} New instance of the service message object.
 */
export let createHostOpenWithRequestMsg = function( payload ) {
    return new HostOpenWithRequestMsg( payload );
};

// ---------------------------------------------------------------------------------

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostOpen_2015_03
 */
export let registerHostingModule = function() {
    //
};

export default exports = {
    createHostOpenWithProxy,
    createHostOpenWithRequestMsg,
    registerHostingModule
};
