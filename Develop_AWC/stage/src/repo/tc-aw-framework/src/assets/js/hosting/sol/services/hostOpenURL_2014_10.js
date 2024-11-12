// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostOpenURL_2014_10
 * @namespace hostOpenURL_2014_10
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import _ from 'lodash';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostOpenURLProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostOpenURL_2014_10
 * @extends hostFactoryService.BaseCallableService
 */
var HostOpenURLProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_HOST_OPEN_URL,
        hostServices.VERSION_2014_10 );
};

HostOpenURLProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Process outgoing 'event' type call to the host.
 *
 * @function fireHostEvent
 * @memberof hostOpenURL_2014_10.HostOpenProxy
 *
 * @param {HostOpenURLRequestMsg} inputData - Data object who's properties define data {in whatever form the
 * implementation is expecting) to process into a call to the host-side service.
 */
HostOpenURLProxy.prototype.fireHostEvent = function( inputData ) {
    var payload = JSON.stringify( inputData );

    this._invokeHostEvent( payload );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostOpenURLRequestMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends the open request info to the host via {@link HostOpenProxy}.
 * <P>
 * The message has a list of targets to be opened. Representation is similar to the selection service
 * contract.
 *
 * @constructor
 * @memberof hostOpenURL_2014_10
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var HostOpenURLRequestMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2014_10 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

HostOpenURLRequestMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current value.
 *
 * @memberof hostOpenURL_2014_10.HostOpenURLRequestMsg
 *
 * @return {InteropObjectRefArray} Context property value.
 */
HostOpenURLRequestMsg.prototype.getURL = function() {
    return _.get( this, 'OpenURL', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostOpenURL_2014_10.HostOpenURLRequestMsg
 *
 * @param {String} url - Context property value.
 */
HostOpenURLRequestMsg.prototype.setURL = function( url ) {
    this.OpenURL = url;
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
 * @memberof hostOpenURL_2014_10
 *
 * @returns {HostOpenURLProxy} New instance of the service message API object.
 */
export let createHostOpenURLProxy = function() {
    return new HostOpenURLProxy();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostOpenURL_2014_10
 *
 * @param {String} payload - (Optional) String from the 'host' to use when initializing the message object.
 *
 * @returns {HostOpenURLRequestMsg} New instance of the service message object.
 */
export let createHostOpenURLRequestMsg = function( payload ) {
    return new HostOpenURLRequestMsg( payload );
};

// ---------------------------------------------------------------------------------

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostOpenURL_2014_10
 */
export let registerHostingModule = function() {
    //
};

export default exports = {
    createHostOpenURLProxy,
    createHostOpenURLRequestMsg,
    registerHostingModule
};
