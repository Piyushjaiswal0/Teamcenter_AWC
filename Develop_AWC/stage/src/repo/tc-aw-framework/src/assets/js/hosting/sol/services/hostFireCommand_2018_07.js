// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostFireCommand_2018_07
 * @namespace hostFireCommand_2018_07
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import _ from 'lodash';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// FireCommandProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostFireCommand_2018_07
 * @extends hostFactoryService.BaseCallableService
 */
var FireCommandProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_FIRE_COMMAND_SERVICE,
        hostServices.VERSION_2018_07 );
};

FireCommandProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Process outgoing 'event' type call to the host.
 *
 * @function fireCommand
 * @memberof fireCommandProxy
 *
 * @param {String} commandID ID - The ID of the command being fired
 * @param {String} parameters - Key/Value map of values of parameters for the fired command
 */
FireCommandProxy.prototype.fireCommand = function( commandID, parameters ) {
    var payload = JSON.stringify( exports.createFireCommandMsg( commandID, parameters ) );

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
 * @memberof fireCommandProxy
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var FireCommandMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2018_07 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

FireCommandMsg.prototype = hostFactorySvc.extendDataContract();

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Return a new instance of this class.
 *
 * @memberof fireCommandProxy
 *
 * @returns {FireCommandProxy} New instance of the service message API object.
 */
export let createFireCommandProxy = function() {
    return new FireCommandProxy();
};

/**
 * Return a new instance of this class.
 *
 * @memberof fireCommandProxy
 *
 * @param {String} _commandId ID - The ID of the command being fired
 * @param {String} _parameters - Key/Value map of values of parameters for the fired command
 *
 * @returns {FireCommandProxyMsg} New instance of the service message object.
 */
export let createFireCommandMsg = function( _commandId, _parameters ) {
    var msg = new FireCommandMsg();
    msg.CommandId = _commandId;
    msg.Parameters = _parameters;
    return msg;
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
    createFireCommandProxy,
    createFireCommandMsg,
    registerHostingModule
};
