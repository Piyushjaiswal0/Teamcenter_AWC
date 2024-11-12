// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/bootstrap/services/hostCore_2014_02
 * @namespace hostCore_2014_02
 */
import hostInteropSvc from 'js/hosting/hostInteropService';
import hostFactorySvc from 'js/hosting/hostFactoryService';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import hostServices from 'js/hosting/hostConst_Services';

//eslint-disable-next-line valid-jsdoc

/**
 * {Boolean} TRUE if ... should be logged.
 */
var _debug_logHandShakeActivity = browserUtils.getUrlAttributes().logHandShakeActivity !== undefined;

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// StartupNotificationSvc
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Service used for startup handshake synchronization. This is used in the hosted application scenario to
 * have the client-side content wait until the host-side process has completed handshake processing.
 *
 * @constructor
 * @memberof hostCore_2014_02
 * @extends hostFactoryService.BaseCallableService
 */
var StartupNotificationSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.HS_CS_STARTUP_NOTIFICATION_SVC,
        hostServices.VERSION_2014_02 );
};

StartupNotificationSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * Receives incoming service call from the host at the very start just after 'host' and 'client' have
 * exchanged available services.
 * <P>
 * Note: This is the service invocation trigger from the host.
 *
 * @function handleIncomingEvent
 * @memberof hostCore_2014_02.StartupNotificationSvc
 */
StartupNotificationSvc.prototype.handleIncomingEvent = function() {
    /**
     * Check if he timer is still active
     * <P>
     * If so: Stop it.
     */
    if( this._pingTimeoutDebounce ) {
        this._pingTimeoutDebounce.cancel();
    }

    /**
     * Invoke the notification delegate (if not already triggered).
     */
    if( !this._timerAlreadyFired ) {
        this._timerAlreadyFired = true;

        eventBus.publish( 'hosting.startup', true );
    }

    /**
     * Check if we need to take over listening for the 'signIn' or if the {hostAuthorizationService} will
     * take care of this.
     */
    if( !hostInteropSvc.isHostAuthorizationEnabled() ) {
        /**
         * The session.signin event is fired by the SessionManager when the user actually logs in
         * (manually). If this happens, we should report back to the host that client-side startup is
         * complete.
         */
        var selfSvc = this; // eslint-disable-line consistent-this

        eventBus.subscribe( 'session.signIn', function() {
            if( _debug_logHandShakeActivity ) {
                hostInteropSvc.log( 'StartupNotificationSvc: session.signIn' );
            }

            selfSvc.fireHostEvent( 'OK' );
        } );

        eventBus.subscribe( 'authentication.complete', function() {
            if( _debug_logHandShakeActivity ) {
                hostInteropSvc.log( 'StartupNotificationSvc: authentication.complete' );
            }

            selfSvc.fireHostEvent( 'OK' );
        } );
    }
};

/**
 * Announce 'client' is not fully setup and user is authenticated (logged in) and ready to interact eith the
 * 'host'.
 *
 * @function fireHostEvent
 * @memberof hostCore_2014_02.StartupNotificationSvc
 *
 * @param {String} inputData - 'OK' or 'Failed' or 'Failed: ' + errorMessage.
 */
StartupNotificationSvc.prototype.fireHostEvent = function( inputData ) {
    /**
     * Cancel the timeout used to prevent an infinite lockup with the handshake/startup does not complete
     * within a given time.
     */
    this._timerAlreadyFired = true;

    hostInteropSvc.setStartupComplete( inputData === 'OK' );

    /**
     * Note: We have to call the 'host' API directly instead of checking if it supports(which
     * '_invokeHostEvent' does) this service because, for some reason not all 'host' applications have
     * supported this in the past and we need to support them. So, they listen for it, but did not send it
     * in the list of host services.
     */
    hostInteropSvc.callHostEvent( this._targetSvc, inputData );
};

/**
 * Initialize this client-side services and include it in the collection of services.
 *
 * @function register
 * @memberof hostCore_2014_02.StartupNotificationSvc
 */
StartupNotificationSvc.prototype.register = function() {
    var self = this;

    self._registerClientService();

    /**
     * Startup notification.
     * <P>
     * We cannot directly start the session as hosting handshake may still be in progress. Use this
     * notification service with completion delegate to signal when application processing can begin. This
     * service uses a timer to wait for a timeout or for the host to send success notification.
     */
    var timeout = 1000 * 180; // 3 minutes

    self._pingTimeoutDebounce = _.debounce( function() {
        logger.error( 'The hosting handshake phase did not complete within the maximum allowed time.' );

        eventBus.publish( 'hosting.startup', false );
    }, timeout, {
        maxWait: 100000,
        trailing: true,
        leading: false
    } );

    this._pingTimeoutDebounce();
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// RequestHostConfigResponseMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends info via the host-side service proxy.
 *
 * @constructor
 * @memberof hostCore_2014_02
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) JSON encoded object retured from the server to set the properties of the new
 * message instance.
 */
var RequestHostConfigResponseMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2014_02 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

RequestHostConfigResponseMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Return current value.
 *
 * @memberof hostCore_2014_02.RequestHostConfigResponseMsg
 *
 * @returns {Boolean} "true" if ...
 */
RequestHostConfigResponseMsg.prototype.getAllowGoHome = function() {
    return _.get( this, 'AllowGoHome', null );
};

/**
 * Return current value.
 *
 * @memberof hostCore_2014_02.RequestHostConfigResponseMsg
 *
 * @returns {Boolean} "true" if ...
 */
RequestHostConfigResponseMsg.prototype.getAllowThemeChange = function() {
    return _.get( this, 'AllowThemeChange', null );
};

/**
 * Return current value.
 *
 * @memberof hostCore_2014_02.RequestHostConfigResponseMsg
 *
 * @returns {Boolean} "true" if ...
 */
RequestHostConfigResponseMsg.prototype.getAllowUserSessionChange = function() {
    return _.get( this, 'AllowUserSessionChange', null );
};

/**
 * Return current value.
 *
 * @memberof hostCore_2014_02.RequestHostConfigResponseMsg
 *
 * @returns {Boolean} "true" if ...
 */
RequestHostConfigResponseMsg.prototype.getHasFullScreenSupport = function() {
    return _.get( this, 'HasFullScreenSupport', null );
};

/**
 * Return current value.
 *
 * @memberof hostCore_2014_02.RequestHostConfigResponseMsg
 *
 * @return {String} HostType property value
 */
RequestHostConfigResponseMsg.prototype.getHostType = function() {
    return _.get( this, 'HostType', null );
};

/**
 * Return current value.
 *
 * @memberof hostCore_2014_02.RequestHostConfigResponseMsg
 *
 * @returns {Boolean} "true" if ...
 */
RequestHostConfigResponseMsg.prototype.getShowSiemensLogo = function() {
    return _.get( this, 'ShowSiemensLogo', null );
};

/**
 * Return current value.
 *
 * @memberof hostCore_2014_02.RequestHostConfigResponseMsg
 *
 * @return {String} Theme property value
 */
RequestHostConfigResponseMsg.prototype.getTheme = function() {
    return _.get( this, 'Theme', null );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// RequestHostConfigProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostCore_2014_02
 * @extends hostFactoryService.BaseCallableService
 */
var RequestHostConfigProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_HOST_CONFIGURATION_SVC,
        hostServices.VERSION_2014_02 );
};

RequestHostConfigProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Send a message to the host-side service requesting its configuration information.
 *
 * @function callHostMethod
 * @memberof hostCore_2014_02.RequestHostConfigProxy
 *
 * @param {Object} inputData - (Unused)
 *
 * @returns {RequestHostConfigResponseMsg} Result from the host.
 */
RequestHostConfigProxy.prototype.callHostMethod = function( inputData ) {
    var replyJSON = this._invokeHostMethod( inputData );

    return new RequestHostConfigResponseMsg( replyJSON );
};

/**
 * Send a message to the host-side service requesting its configuration information.
 *
 * @function callHostMethod
 * @memberof hostCore_2014_02.RequestHostConfigProxy
 *
 * @param {Object} inputData - (Unused)
 *
 * @returns {Promise} Resolved with the {RequestHostConfigResponseMsg} result from the 'host'.
 */
RequestHostConfigProxy.prototype.callHostMethodAsync = function( inputData ) {
    return this._invokeHostMethodAsync( inputData ).then( function( replyJSON ) {
        return new RequestHostConfigResponseMsg( replyJSON );
    } );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Return a new instance of the service.
 *
 * @memberof hostCore_2014_02
 *
 * @returns {StartupNotificationSvc} New instance of the 'StartupNotificationSvc' service.
 */
export let createStartupNotificationSvc = function() {
    return new StartupNotificationSvc();
};

/**
 * Return a new instance of the host-side service proxy.
 *
 * @memberof hostCore_2014_02
 *
 * @returns {RequestHostConfigProxy} New instance of the service proxy.
 */
export let createRequestHostConfigProxy = function() {
    return new RequestHostConfigProxy();
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostCore_2014_02
 */
export let registerHostingModule = function() {
    exports.createStartupNotificationSvc().register();
};

export default exports = {
    createStartupNotificationSvc,
    createRequestHostConfigProxy,
    registerHostingModule
};
