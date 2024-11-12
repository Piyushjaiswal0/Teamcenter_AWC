// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/bootstrap/services/hostLogging_2014_02
 * @namespace hostLogging_2014_02
 */
import AwPromiseService from 'js/awPromiseService';
import hostInteropSvc from 'js/hosting/hostInteropService';
import hostFactorySvc from 'js/hosting/hostFactoryService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// LoggerForwardMessage
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends info via {LoggerForwardProxy}.
 * <P>
 * Note: Changes to this definition MUST BE coordinated with the master service contract definition.
 *
 * @constructor
 * @memberof hostLogging_2014_02
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} level - Severity level of the message.
 * @param {String} output - Text of the message to log.
 */
var LoggerEntryMsg = function( level, output ) {
    hostFactorySvc.getDataContract().call( this );

    this.Level = level;
    this.FormatMessage = output;
};

LoggerEntryMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * access to the FormatMessage property
 *
 * @memberof hostLogging_2014_02.LoggerEntryMsg
 *
 * @return {String} message string.
 */
LoggerEntryMsg.prototype.getFormatMessage = function() {
    return _.get( this, 'FormatMessage', null );
};

/**
 * access to the Level property
 *
 * @memberof hostLogging_2014_02.LoggerEntryMsg
 *
 * @return {String} level value.
 */
LoggerEntryMsg.prototype.getLevel = function() {
    return _.get( this, 'Level', null );
};

/**
 * Access to the FormatMessage property
 *
 * @memberof hostLogging_2014_02.LoggerEntryMsg
 *
 * @param {String} msg - message string.
 */
LoggerEntryMsg.prototype.setFormatMessage = function( msg ) {
    this.FormatMessage = msg;
};

/**
 * access to the Level property
 *
 * @memberof hostLogging_2014_02.LoggerEntryMsg
 *
 * @param {String} level - level value.
 */
LoggerEntryMsg.prototype.setLevel = function( level ) {
    this.Level = level;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// LoggerForwardProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostLogging_2014_02
 * @extends hostFactoryService.BaseCallableService
 */
var LoggerForwardProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_LOGGER_FORWARD_SVC,
        hostServices.VERSION_2014_02 );
};

LoggerForwardProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Send a log message to the hosting service.
 *
 * @function fireHostEvent
 * @memberof hostLogging_2014_02.LoggerForwardProxy
 *
 * @param {LoggerForwardMessage} inputData - Object defining input properties used in forming the call to the host-side
 * service.
 * <pre>
 *  {String} level - log level
 *  {String} output - log output
 * </pre>
 *
 * @returns {Object} (Not Used)
 */
LoggerForwardProxy.prototype.fireHostEvent = function( inputData ) {
    var entry = new LoggerEntryMsg( inputData.level, inputData.output );

    return this._invokeHostEvent( JSON.stringify( entry ) );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Create new service proxy.
 *
 * @memberof hostLogging_2014_02
 *
 * @return {LoggerForwardProxy} New host-side service proxy.
 */
export let createLoggerForwardProxy = function() {
    return new LoggerForwardProxy();
};

/**
 * Finsh initialization of this service such that it will interact with other hosting APIs that are also
 * being initialized.
 *
 * @memberof hostLogging_2014_02
 *
 * @returns {Promise} Resolved when this service is fully initialized.
 */
export let initialize = function() {
    if( hostInteropSvc.isHostServiceAvailable(
        hostServices.HS_LOGGER_FORWARD_SVC,
        hostServices.VERSION_2014_02 ) ) {
        /**
         * Create logger forwarding service proxy after initiate hand shake. This service will
         * channel client-side messages to the host. Setup to feed all logging to the host via this
         * proxy.
         */
        var proxy = exports.createLoggerForwardProxy();

        eventBus.subscribe( 'log', function( data ) {
            proxy.fireHostEvent( data );
        } );
    }

    return AwPromiseService.instance.resolve();
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostLogging_2014_02
 */
export let registerHostingModule = function() {
    // Nothing to contribute (at this time)
};

export default exports = {
    createLoggerForwardProxy,
    initialize,
    registerHostingModule
};
