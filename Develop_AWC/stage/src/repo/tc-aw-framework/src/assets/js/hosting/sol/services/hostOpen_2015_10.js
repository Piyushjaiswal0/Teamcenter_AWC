// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostOpen_2015_10
 * @namespace hostOpen_2015_10
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import _ from 'lodash';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostOpenProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostOpen_2015_10
 * @extends hostFactoryService.BaseCallableService
 */
var HostOpenProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_HOST_OPEN,
        hostServices.VERSION_2015_10 );
};

HostOpenProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Process outgoing 'event' type call to the host.
 *
 * @function fireHostEvent
 * @memberof hostOpen_2015_10.HostOpenProxy
 *
 * @param {HostOpenRequestMsg} inputData - Data object who's properties define data {in whatever form the
 * implementation is expecting) to process into a call to the host-side service.
 */
HostOpenProxy.prototype.fireHostEvent = function( inputData ) {
    var payload = JSON.stringify( inputData );

    this._invokeHostEvent( payload );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostOpenRequestMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends the open request info to the host via {@link HostOpenProxy}.
 * <P>
 * The message has a list of targets to be opened. Representation is similar to the selection service
 * contract.
 *
 * @constructor
 * @memberof hostOpen_2015_10
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var HostOpenRequestMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2015_10 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

HostOpenRequestMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current value.
 *
 * @memberof hostOpen_2015_10.HostOpenRequestMsg
 *
 * @return {InteropObjectRefArray} Property value.
 */
HostOpenRequestMsg.prototype.getOpenTargets = function() {
    return _.get( this, 'OpenTargets', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostOpen_2015_10.HostOpenRequestMsg
 *
 * @param {InteropObjectRefArray} value - Property value.
 */
HostOpenRequestMsg.prototype.setOpenTargets = function( value ) {
    this.OpenTargets = value;
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
 * @memberof hostOpen_2015_10
 *
 * @returns {HostOpenProxy} New instance of the service message API object.
 */
export let createHostOpenProxy = function() {
    return new HostOpenProxy();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostOpen_2015_10
 *
 * @param {String} payload - (Optional) String from the 'host' to use when initializing the message object.
 *
 * @returns {HostOpenRequestMsg} New instance of the service message object.
 */
export let createHostOpenRequestMsg = function( payload ) {
    return new HostOpenRequestMsg( payload );
};

// ---------------------------------------------------------------------------------

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostOpen_2015_10
 */
export let registerHostingModule = function() {
    //
};

export default exports = {
    createHostOpenProxy,
    createHostOpenRequestMsg,
    registerHostingModule
};
