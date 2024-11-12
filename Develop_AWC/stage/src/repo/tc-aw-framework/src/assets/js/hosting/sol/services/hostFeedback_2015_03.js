// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostFeedback_2015_03
 * @namespace hostFeedback_2015_03
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import _ from 'lodash';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostFeedbackProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostFeedback_2015_03
 * @extends hostFactoryService.BaseCallableService
 */
var HostFeedbackProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_HOST_FEEDBACK,
        hostServices.VERSION_2015_03 );
};

HostFeedbackProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Process outgoing 'event' type call to the host.
 *
 * @function fireHostEvent
 * @memberof hostFeedback_2015_03.HostFeedbackProxy
 *
 * @param {HostFeedbackRequestMsg} inputData - Data object who's properties define data {in whatever form
 * the implementation is expecting) to process into a call to the host-side service.
 */
HostFeedbackProxy.prototype.fireHostEvent = function( inputData ) {
    var payload = JSON.stringify( inputData );

    this._invokeHostEvent( payload );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostFeedbackRequestMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends the open request info to the host via {@link HostOpenProxy}.
 * <P>
 * The message has a list of targets to be opened. Representation is similar to the selection service
 * contract.
 *
 * @constructor
 * @memberof hostFeedback_2015_03
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var HostFeedbackRequestMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2015_03 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

HostFeedbackRequestMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current value.
 *
 * @memberof hostFeedback_2015_03.HostFeedbackRequestMsg
 *
 * @return {InteropObjectRef} Context property value.
 */
HostFeedbackRequestMsg.prototype.getFeedbackTarget = function() {
    return _.get( this, 'FeedbackTarget', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostFeedback_2015_03.HostFeedbackRequestMsg
 *
 * @param {InteropObjectRef} objRef - Property value.
 */
HostFeedbackRequestMsg.prototype.setFeedbackTarget = function( objRef ) {
    this.FeedbackTarget = objRef;
};

/**
 * Get current value.
 *
 * @memberof hostFeedback_2015_03.HostFeedbackRequestMsg
 *
 * @return {InteropObjectRefArray} Targets property value.
 */
HostFeedbackRequestMsg.prototype.getFeedbackString = function() {
    return _.get( this, 'FeedbackString', null );
};

/**
 * Set current value.
 *
 * @memberof hostFeedback_2015_03.HostFeedbackRequestMsg
 *
 * @param {String} feedback - Property value.
 */
HostFeedbackRequestMsg.prototype.setFeedbackString = function( feedback ) {
    this.FeedbackString = feedback;
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
 * @memberof hostFeedback_2015_03
 *
 * @returns {HostFeedbackProxy} New instance of the service message API object.
 */
export let createHostFeedbackProxy = function() {
    return new HostFeedbackProxy();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostFeedback_2015_03
 *
 * @param {String} payload - (Optional) String from the 'host' to use when initializing the message object.
 *
 * @returns {HostFeedbackRequestMsg} New instance of the service message object.
 */
export let createHostFeedbackRequestMsg = function( payload ) {
    return new HostFeedbackRequestMsg( payload );
};

// ---------------------------------------------------------------------------------

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostFeedback_2015_03
 */
export let registerHostingModule = function() {
    //
};

export default exports = {
    createHostFeedbackProxy,
    createHostFeedbackRequestMsg,
    registerHostingModule
};
