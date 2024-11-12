// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostQuery_2019_05
 * @namespace hostQuery_2019_05
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import hostInteropSvc from 'js/hosting/hostInteropService';
import hostQuery1 from 'js/hosting/sol/services/hostQuery_2015_10';
import _ from 'lodash';
import logger from 'js/logger';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostQuerySvc (VERSION_2019_05)
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Service to handle queries coming from the host.
 *
 * @constructor
 * @memberof hostQuery_2019_05
 * @extends hostFactoryService.BaseCallableService
 */
var HostQuerySvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_INTEROPQUERY_SVC,
        hostServices.VERSION_2019_05 );
};

HostQuerySvc.prototype = hostFactorySvc.extendCallableService();

/**
 * This is an incoming call to this service trigger the related event handlers.
 *
 * @function handleIncomingEvent
 * @memberof hostQuery_2019_05.HostQuerySvc
 *
 * @param {String} jsondata - JSON encoded payload from the host.
 *
 * @returns {String} ...
 */
HostQuerySvc.prototype.handleIncomingMethod = function( jsondata ) {
    var response;

    try {
        if( jsondata ) {
            hostQuery1.processMessage( jsondata ).then ( (responseMessages) => {
                if( !_.isEmpty( responseMessages ) ) {
                    var nativeMessage = hostQuery1.buildNativeMessageResponse( responseMessages );
    
                    response = JSON.stringify( nativeMessage );
                    return response;
                }
            }, ( err ) => {
                logger.error ( 'hostQuery_2019_05' + ':'+ 'handleIncomingMethod'+ ':' + err );
                var errorMessageOut = hostQuery1.createMessageObject( "Error in Executing Query Handler" );
                return JSON.stringify ( errorMessageOut );
            });            
        }
    } catch ( ex ) {
        logger.error( ex );
    }
};

/**
 * This is an incoming call to this service trigger the related event handlers.
 *
 * @function handleIncomingEvent
 * @memberof hostQuery_2019_05.HostQuerySvc
 *
 * @param {String} jsonData - JSON encoded payload from the host.
 */
HostQuerySvc.prototype.handleIncomingEvent = function( jsonData ) {
    try {
        if( jsonData ) {
            if( exports.canQueryHost() ) {
                var proxy = exports.createHostQueryProxy();

                hostQuery1.processMessage( jsonData ).then ( ( responseMessages ) => {
                    if( !_.isEmpty( responseMessages ) ) {
                        proxy.fireHostEvent( responseMessages );
                    }
                } );
            }
        }
    } catch ( ex ) {
        logger.error( ex );
    }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostQueryProxy (VERSION_2019_05)
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostQuery_2019_05
 * @extends hostFactoryService.BaseCallableService
 */
var HostQueryProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_INTEROPQUERY_SVC,
        hostServices.VERSION_2019_05 );
};

HostQueryProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Process outgoing 'method' type call to the host.
 *
 * @function callHostMethod
 * @memberof hostQuery_2019_05.HostOpenProxy
 *
 * @param {HostQueryMessageArray} inputData - Data object who's properties define data {in whatever form the
 * implementation is expecting) to process into a call to the host-side service.
 *
 * @returns {Promise} Resolved with the {HostQueryMessageArray} result from the 'host' (or NULL).
 */
HostQueryProxy.prototype.callHostMethodAsync = function( inputData ) {
    var nativeMessageIn = hostQuery1.buildNativeMessageResponse( inputData );
    nativeMessageIn.Version = '_2019_05';
    var payload = JSON.stringify( nativeMessageIn );

    return this._invokeHostMethodAsync( payload ).then( function( jsonData ) {
        var nativeMessageOut = hostQuery1.createMessageObject( jsonData );

        return hostQuery1.buildResponsesFromNative( nativeMessageOut );
    } );
};

/**
 * Process outgoing 'event' type call to the host.
 *
 * @function fireHostEvent
 * @memberof hostQuery_2019_05.HostOpenProxy
 *
 * @param {HostOpenURLRequestMsg} inputData - Data object who's properties define data {in whatever form the
 * implementation is expecting) to process into a call to the host-side service.
 */
HostQueryProxy.prototype.fireHostEvent = function( inputData ) {
    var nativeMessage = hostQuery1.buildNativeMessageResponse( inputData );

    var payload = JSON.stringify( nativeMessage );

    this._invokeHostEvent( payload );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Create new client-side service.
 *
 * @memberof hostQuery_2019_05
 *
 * @returns {HostQuerySvc} New instance of the service message object.
 */
export let createHostQuerySvc = function() {
    return new HostQuerySvc();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostQuery_2019_05
 *
 * @returns {HostQueryProxy} New instance of the service message API object.
 */
export let createHostQueryProxy = function() {
    return new HostQueryProxy();
};

/**
 * Is it possible to send queries to the 'host'.
 *
 * @memberof hostQuery_2019_05
 *
 * @return {Boolean} TRUE if the 'host' supports receiving {HostQueryMessage} calls.
 */
export let canQueryHost = function() {
    return hostInteropSvc.isHostServiceAvailable(
        hostServices.HS_INTEROPQUERY_SVC,
        hostServices.VERSION_2019_05
    );
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostQuery_2019_05
 */
export let registerHostingModule = function() {
    exports.createHostQuerySvc().register();
};

export default exports = {
    createHostQuerySvc,
    createHostQueryProxy,
    canQueryHost,
    registerHostingModule
};
