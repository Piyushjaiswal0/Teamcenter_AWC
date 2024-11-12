// Copyright (c) 2022 Siemens

/**
 * This module defines the classes, services
 *
 * @module js/hosting/hostFactoryService
 * @namespace hostFactoryService
 */
import AwPromiseService from 'js/awPromiseService';
import hostInteropSvc from 'js/hosting/hostInteropService';
import logger from 'js/logger';
import browserUtils from 'js/browserUtils';

/**
 * {Boolean} TRUE if ... should be logged.
 */
var _debug_logFailedHostServiceCalls = browserUtils.getUrlAttributes().logFailedHostServiceCalls !== undefined;

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// BaseDataContractImpl
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Base class for common message contract behavior.
 *
 * @constructor
 * @memberof hostFactoryService
 *
 * @param {String} version - (Optional) Version of the message (default: '1.0')
 */
var BaseDataContractImpl = function( version ) {
    this.Version = version ? version : '1.0';
};

/**
 * access to the common Version property
 *
 * @function getVersion
 * @memberof hostFactoryService.BaseDataContractImpl
 *
 * @return {String} version property value.
 */
BaseDataContractImpl.prototype.getVersion = function() {
    return this.Version;
};

/**
 * access to the common Version property
 *
 * @function setVersion
 * @memberof hostFactoryService.BaseDataContractImpl
 *
 * @param {String} version - Version property value.
 */
BaseDataContractImpl.prototype.setVersion = function( version ) {
    this.Version = version;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// BaseCallableService
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Defines a base class to represent a callable Service wrapper (client-side implementations and host-side
 * proxies).
 *
 * @constructor
 * @memberof hostFactoryService
 *
 * @param {String} fqn - Fully qualified name of the new service.
 * @param {String} version - Version of the new service.
 */
var BaseCallableService = function( fqn, version ) {
    var self = this;

    self._targetSvc = hostInteropSvc.createServiceDescriptor( fqn, version );

    /**
     * Called by the host to process an 'event' type call.
     *
     * @param {String} payload - Incomming JSON string that represents the input to the client-side service
     * implementation being called.
     */
    self._clientEventHandler = function( payload ) {
        try {
            self.handleIncomingEvent( payload );
        } catch ( ex ) {
            logger.error( ex );
        }
    };

    /**
     * Called by the host to process an 'method' type call.
     *
     * @param {String} payload - Incomming JSON string that represents the input to the client-side service
     * implementation being called.
     *
     * @returns {Void} (nothing)
     */
    self._clientMethodHandler = function( payload ) {
        try {
            return self.handleIncomingMethod( payload );
        } catch ( ex ) {
            logger.error( ex );
        }
    };

    /**
     * Called by the 'client' to process an 'event' type call on the 'host.
     *
     * @param {String} payload - Outgoing JSON string that represents the input to the host-side service
     * implementation being called.
     */
    self._hostEventHandler = function( payload ) {
        try {
            self.fireHostEvent( payload );
        } catch ( ex ) {
            logger.error( ex );
        }
    };

    /**
     * Called by the 'client' to process a 'method' type call on the 'host.
     *
     * @param {String} payload - Outgoing JSON string that represents the input to the host-side service
     * implementation being called.
     *
     * @returns {Void} (nothing)
     */
    self._hostMethodHandler = function( payload ) {
        try {
            return self.callHostMethod( payload );
        } catch ( ex ) {
            logger.error( ex );
        }
    };

    /**
     * Register this service with the dispatch infrastructure.
     */
    self._registerClientService = function() {
        /**
         * Attempt to look up this service (which is normally added during bootstrap 'postInit' processing).
         * <P>
         * If not found (for some reason), just register it here now.
         */
        var targetSvc = hostInteropSvc.findClientService( self._targetSvc );

        if( !targetSvc ) {
            targetSvc = hostInteropSvc.createServiceDescriptor( self._targetSvc.FQN, self._targetSvc.SvcVersion );

            hostInteropSvc.clientServices.push( targetSvc );

            logger.warn( 'Client service was not found in hosting configuration JSON: ' + JSON.stringify( targetSvc ) );
        }

        /** Host->Client */
        targetSvc.handleMethodCall = self._clientMethodHandler;
        targetSvc.handleEventCall = self._clientEventHandler;

        /** Client->Host */
        targetSvc.handleHostMethodCall = self._hostMethodHandler;
        targetSvc.handleHostEventCall = self._hostEventHandler;
    };
};

/**
 * Attempt to call the 'event' type host-side service associated within this proxy service.
 * <P>
 * Note: This acts as 'protected' funciton for use by the subclasses.
 *
 * @function _invokeHostEvent
 * @memberof hostFactoryService.BaseCallableService
 * @private
 *
 * @param {String} payload - message to send service
 *
 * @throws Exception any error
 */
BaseCallableService.prototype._invokeHostEvent = function( payload ) {
    if( !hostInteropSvc.isHostServiceAvailable( this._targetSvc.FQN, this._targetSvc.SvcVersion ) ) {
        if( _debug_logFailedHostServiceCalls ) {
            logger.error( 'BaseCallableService: ' + '_invokeHostEvent' + ':' + 'Host-side service not available: ' +
                JSON.stringify( this._targetSvc ) );
        }
    } else {
        hostInteropSvc.callHostEvent( this._targetSvc, payload );
    }
};

/**
 * Attempt to call the 'method' type host-side service associated within this proxy service.
 * <P>
 * Note: This acts as 'protected' funciton for use by the subclasses.
 *
 * @function _invokeHostMethod
 * @memberof hostFactoryService.BaseCallableService
 * @private
 *
 * @param {String} payload - JSON encoded message to send the host-side service.
 *
 * @return {Object} service response or error (or NULL if services is unavailable).
 */
BaseCallableService.prototype._invokeHostMethod = function( payload ) {
    if( !hostInteropSvc.isHostServiceAvailable( this._targetSvc.FQN, this._targetSvc.SvcVersion ) ) {
        if( _debug_logFailedHostServiceCalls ) {
            logger.error( 'BaseCallableService: ' + '_invokeHostMethod' + ':' + 'Host-side service not available: ' +
                JSON.stringify( this._targetSvc ) );
        }

        return null;
    }

    return hostInteropSvc.callHostMethod( this._targetSvc, payload );
};

/**
 * Attempt to call the 'method' type host-side service associated within this proxy service.
 * <P>
 * Note: This acts as 'protected' function for use by the subclasses.
 *
 * @function _invokeHostMethodAsync
 * @memberof hostFactoryService.BaseCallableService
 * @private
 *
 * @param {String} payload - JSON encoded message to send the host-side service.
 *
 * @return {Promise} Resolved with the service response {Object} (or promise rejection if services is
 * unavailable).
 */
BaseCallableService.prototype._invokeHostMethodAsync = function( payload ) {
    if( !hostInteropSvc.isHostServiceAvailable( this._targetSvc.FQN, this._targetSvc.SvcVersion ) ) {
        var msg = 'BaseCallableService: ' + '_invokeHostMethodAsync' + ':' + 'Host-side service not available: ' +
            JSON.stringify( this._targetSvc );

        if( _debug_logFailedHostServiceCalls ) {
            logger.error( msg );
        }

        return AwPromiseService.instance.reject( msg );
    }

    return hostInteropSvc.callHostMethodAsync( this._targetSvc, payload );
};

/**
 * Process incoming service 'event' type call from the host.
 * <P>
 * Note: To be overridden by subclasses acting as client-side service implementations.
 *
 * @function handleIncomingEvent
 * @memberof hostFactoryService.BaseCallableService
 *
 * @param {String} jsonData - Message data in string format. Typically json
 *
 * @throws Exception any error back to the communication stack.
 */
BaseCallableService.prototype.handleIncomingEvent = function( jsonData ) { // eslint-disable-line no-unused-vars
    // TODO throw an Ex??
    logger.warn( 'BaseCallableService: ' + 'handleIncomingEvent' + ':' + '(Default) FQN: ' +
        JSON.stringify( this._targetSvc ) );
};

/**
 * Process incoming service 'method' type call from the host.
 * <P>
 * Note: To be overridden by subclasses acting as client-side service implementations.
 *
 * @function handleIncomingMethod
 * @memberof hostFactoryService.BaseCallableService
 *
 * @param {String} jsonData - Message data in string format. Typically JSON format.
 *
 * @return {String} Reply from the service invocation.
 * @throws Exception any error back down to the communication stack.
 */
BaseCallableService.prototype.handleIncomingMethod = function( jsonData ) { // eslint-disable-line no-unused-vars
    // TODO throw an Ex??
    logger.warn( 'BaseCallableService: ' + 'handleIncomingMethod' + ':' + '(Default) FQN: ' +
        JSON.stringify( this._targetSvc ) );
    return null;
};

/**
 * Process outgoing 'event' type call to the host.
 * <P>
 * Note: To be overridden by subclasses acting as client-side proxy to a host-side service implementations.
 *
 * @function fireHostEvent
 * @memberof hostFactoryService.BaseCallableService
 *
 * @param {Object} inputData - Data object who's properties define data {in whatever form the implementation
 * is expecting) to process into a call to the host-side service.
 *
 * @throws Exception any error back to the communication stack.
 */
BaseCallableService.prototype.fireHostEvent = function( inputData ) { // eslint-disable-line no-unused-vars
    // TODO throw an Ex??
    logger.warn( 'BaseCallableService: ' + 'fireHostEvent' + ':' + '(Default) FQN: ' +
        JSON.stringify( this._targetSvc ) );
};

/**
 * Process outgoing 'method' type call to the host.
 * <P>
 * Note: To be overridden by subclasses acting as client-side proxy to a host-side service implementations.
 *
 * @function callHostMethod
 * @memberof hostFactoryService.BaseCallableService
 *
 * @param {Object} inputData - Data object who's properties define data {in whatever form the implementation
 * is expecting) to process into a call to the host-side service.
 *
 * @return {String} Reply from the service invocation.
 * @throws Exception any error back down to the communication stack.
 */
BaseCallableService.prototype.callHostMethod = function( inputData ) { // eslint-disable-line no-unused-vars
    // TODO throw an Ex??
    logger.warn( 'BaseCallableService: ' + 'callHostMethod' + ':' + '(Default) FQN: ' +
        JSON.stringify( this._targetSvc ) );

    return null;
};

/**
 * Process outgoing 'method' type call to the host.
 * <P>
 * Note: To be overridden by subclasses acting as client-side proxy to a host-side service implementations.
 *
 * @function callHostMethodAsync
 * @memberof hostFactoryService.BaseCallableService
 *
 * @param {Object} inputData - Data object who's properties define data {in whatever form the implementation
 * is expecting) to process into a call to the host-side service.
 *
 * @returns {Promise} Resolved with the {String} result from the 'host' (or NULL).
 * @throws Exception any error back down to the communication stack.
 */
BaseCallableService.prototype.callHostMethodAsync = function( inputData ) { // eslint-disable-line no-unused-vars
    // TODO throw an Ex??
    logger.warn( 'BaseCallableService: ' + 'callHostMethodAsync' + ':' + '(Default) FQN: ' +
        JSON.stringify( this._targetSvc ) );

    return AwPromiseService.instance.resolve( null );
};

/**
 * Initialize this client-side services and include it in the collection of services.
 *
 * @function register
 * @memberof hostFactoryService.BaseCallableService
 */
BaseCallableService.prototype.register = function() {
    this._registerClientService();
};

/**
 * Set version property.
 *
 * @function setVersion
 * @memberof hostFactoryService.BaseCallableService
 *
 * @param {String} version - Version to set.
 */
BaseCallableService.prototype.setVersion = function( version ) {
    this._targetSvc.SvcVersion = version;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Return new prototype based on {BaseDataContractImpl}.
 *
 * @memberof hostFactoryService
 *
 * @return {Prototype} A new prototype based on the {BaseDataContractImpl} class.
 */
export let extendDataContract = function() {
    return Object.create( BaseDataContractImpl.prototype );
};

/**
 * Return {BaseDataContractImpl} class constructor function.
 *
 * @memberof hostFactoryService
 *
 * @return {ClassObject} The constructor function for the {BaseDataContractImpl} class.
 */
export let getDataContract = function() {
    return BaseDataContractImpl;
};

/**
 * Return new prototype based on 'BaseCallableService'.
 *
 * @memberof hostFactoryService
 *
 * @return {Prototype} A new prototype based on the 'BaseCallableService' class.
 */
export let extendCallableService = function() {
    return Object.create( BaseCallableService.prototype );
};

/**
 * Return 'BaseCallableService' class constructor function.
 *
 * @memberof hostFactoryService
 *
 * @return {ClassObject} The 'BaseCallableService' class constructor function.
 */
export let getCallableService = function() {
    return BaseCallableService;
};

/**
 * Return new prototype based on 'BaseCallableService'.
 *
 * @memberof hostFactoryService
 *
 * @return {Prototype} A new prototype based on the 'BaseCallableService' class.
 */
export let extendProxy = function() {
    return Object.create( BaseCallableService.prototype );
};

/**
 * Return 'BaseCallableService' class constructor function.
 *
 * @memberof hostFactoryService
 *
 * @return {ClassObject} The 'BaseCallableService' class constructor function.
 */
export let getProxy = function() {
    return BaseCallableService;
};

export default exports = {
    extendDataContract,
    getDataContract,
    extendCallableService,
    getCallableService,
    extendProxy,
    getProxy
};
