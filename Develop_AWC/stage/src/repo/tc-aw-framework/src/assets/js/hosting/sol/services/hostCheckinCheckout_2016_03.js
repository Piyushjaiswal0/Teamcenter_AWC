// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostCheckinCheckout_2016_03
 * @namespace hostCheckinCheckout_2016_03
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import _ from 'lodash';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostCheckinCheckoutProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostCheckinCheckout_2016_03
 * @extends hostFactoryService.BaseCallableService
 */
var HostCheckinCheckoutProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_HOST_CHECKIN_CHECKOUT,
        hostServices.VERSION_2016_03 );
};

HostCheckinCheckoutProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Process outgoing 'event' type call to the host.
 *
 * @function fireHostEvent
 * @memberof hostCheckinCheckout_2016_03.HostCheckinCheckoutProxy
 *
 * @param {HostCheckinCheckoutRequestMsg} inputData - Data object who's properties define data {in whatever
 * form the implementation is expecting) to process into a call to the host-side service.
 */
HostCheckinCheckoutProxy.prototype.fireHostEvent = function( inputData ) {
    var payload = JSON.stringify( inputData );

    this._invokeHostEvent( payload );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostCheckinCheckoutRequestMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends the open request info to the host via {@link HostCheckinCheckoutProxy}.
 * <P>
 * The message has a list of targets to be opened. Representation is similar to the selection service
 * contract.
 *
 * @constructor
 * @memberof hostCheckinCheckout_2016_03
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var HostCheckinCheckoutRequestMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2016_03 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

HostCheckinCheckoutRequestMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current value.
 *
 * @memberof hostCheckinCheckout_2016_03.HostCheckinCheckoutRequestMsg
 *
 * @return {Boolean} Operation property value.
 */
HostCheckinCheckoutRequestMsg.prototype.getOperation = function() {
    return _.get( this, 'Operation', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostCheckinCheckout_2016_03.HostCheckinCheckoutRequestMsg
 *
 * @param {Boolean} value - Operation property value.
 */
HostCheckinCheckoutRequestMsg.prototype.setOperation = function( value ) {
    this.Operation = value;
};

/**
 * Get current value.
 *
 * @memberof hostCheckinCheckout_2016_03.HostCheckinCheckoutRequestMsg
 *
 * @return {InteropObjectRefArray} Targets property value.
 */
HostCheckinCheckoutRequestMsg.prototype.getTargets = function() {
    return _.get( this, 'Targets', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostCheckinCheckout_2016_03.HostCheckinCheckoutRequestMsg
 *
 * @param {InteropObjectRefArray} value - Targets property value.
 */
HostCheckinCheckoutRequestMsg.prototype.setTargets = function( value ) {
    this.Targets = value;
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
 * @memberof hostCheckinCheckout_2016_03
 *
 * @returns {HostCheckinCheckoutProxy} New instance of the service message API object.
 */
export let createHostCheckinCheckoutProxy = function() {
    return new HostCheckinCheckoutProxy();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostCheckinCheckout_2016_03
 *
 * @param {String} payload - (Optional) JSON encoded String to use when initializing the message object.
 *
 * @returns {HostCheckinCheckoutRequestMsg} New instance of the service message object.
 */
export let createHostCheckinCheckoutRequestMsg = function( payload ) {
    return new HostCheckinCheckoutRequestMsg( payload );
};

// ---------------------------------------------------------------------------------

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostCheckinCheckout_2016_03
 */
export let registerHostingModule = function() {
    //
};

export default exports = {
    createHostCheckinCheckoutProxy,
    createHostCheckinCheckoutRequestMsg,
    registerHostingModule
};
