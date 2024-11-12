// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostOpenNewView_2016_04
 * @namespace hostOpenNewView_2016_04
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import _ from 'lodash';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostOpenNewViewProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostOpenNewView_2016_04
 * @extends hostFactoryService.BaseCallableService
 */
var HostOpenNewViewProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_HOST_OPEN_NEW_VIEW_SVC,
        hostServices.VERSION_2016_04 );
};

HostOpenNewViewProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Process outgoing 'event' type call to the host.
 *
 * @function fireHostEvent
 * @memberof hostOpenNewView_2016_04.HostOpenNewViewProxy
 *
 * @param {HostOpenNewViewMessage} inputData - Data object who's properties define data {in whatever form
 * the implementation is expecting) to process into a call to the host-side service.
 */
HostOpenNewViewProxy.prototype.fireHostEvent = function( inputData ) {
    var payload = JSON.stringify( inputData );

    this._invokeHostEvent( payload );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostOpenNewViewMessage
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends the open request info to the host via {@link HostOpenNewViewProxy}.
 * <P>
 * The message has a list of targets to be opened. Representation is similar to the selection service
 * contract.
 *
 * @constructor
 * @memberof hostOpenNewView_2016_04
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var HostOpenNewViewMessage = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2016_04 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

HostOpenNewViewMessage.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current value.
 *
 * @memberof hostOpenNewView_2016_04.HostOpenNewViewMessage
 *
 * @return {InteropObjectRefArray} Property value.
 */
HostOpenNewViewMessage.prototype.getObjects = function() {
    return _.get( this, 'Objects', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostOpenNewView_2016_04.HostOpenNewViewMessage
 *
 * @param {InteropObjectRefArray} list - Property value.
 */
HostOpenNewViewMessage.prototype.setObjects = function( list ) {
    this.Objects = list;
};

/**
 * Get current value.
 *
 * @memberof hostOpenNewView_2016_04.HostOpenNewViewMessage
 *
 * @return {KeyValuePairArray} Property value.
 */
HostOpenNewViewMessage.prototype.getOptionalParameters = function() {
    return _.get( this, 'OptionalParameters', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostOpenNewView_2016_04.HostOpenNewViewMessage
 *
 * @param {KeyValuePairArray} list - Property value.
 */
HostOpenNewViewMessage.prototype.setOptionalParameters = function( list ) {
    this.OptionalParameters = list;
};

/**
 * Get current value.
 *
 * @memberof hostOpenNewView_2016_04.HostOpenNewViewMessage
 *
 * @return {String} Property value.
 */
HostOpenNewViewMessage.prototype.getURL = function() {
    return _.get( this, 'URL', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostOpenNewView_2016_04.HostOpenNewViewMessage
 *
 * @param {String} value - Property value.
 */
HostOpenNewViewMessage.prototype.setURL = function( value ) {
    this.URL = value;
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
 * @memberof hostOpenNewView_2016_04
 *
 * @returns {HostOpenNewViewProxy} New instance of the service message API object.
 */
export let createHostOpenNewViewProxy = function() {
    return new HostOpenNewViewProxy();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostOpenNewView_2016_04
 *
 * @param {String} payload - (Optional) String from the 'host' to use when initializing the message object.
 *
 * @returns {HostOpenNewViewMessage} New instance of the service message object.
 */
export let createHostOpenNewViewMessage = function( payload ) {
    return new HostOpenNewViewMessage( payload );
};

// ---------------------------------------------------------------------------------

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostOpenNewView_2016_04
 */
export let registerHostingModule = function() {
    //
};

export default exports = {
    createHostOpenNewViewProxy,
    createHostOpenNewViewMessage,
    registerHostingModule
};
