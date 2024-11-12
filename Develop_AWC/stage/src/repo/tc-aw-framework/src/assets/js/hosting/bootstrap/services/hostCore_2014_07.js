// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/bootstrap/services/hostCore_2014_07
 * @namespace hostCore_2014_07
 */
import AwPromiseService from 'js/awPromiseService';
import hostInteropSvc from 'js/hosting/hostInteropService';
import hostFactorySvc from 'js/hosting/hostFactoryService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import hostServices from 'js/hosting/hostConst_Services';

/**
 * Ref count of progress events, only stop progress bar if ref count is zero
 */
var _progressRefCount = 0;

/**
 * How long to wait to see if we become busy again, in ms
 */
var BUSY_DELAY = 1000;

/**
 * {Boolean} TRUE if there have been one or more 'progress.start' events than 'progress.end' events and that
 * the last 'progress.end' occurred within the 'BUSY_DELAY' debound allowance.
 */
var _clientBusy = false;

/**
 * The singleton timer that updates the client with our current busy/idle state.
 */
var _pingIdleDebounce = _.debounce( function() {
    _pingIdleDebounce.cancel();

    var statusMsg = exports.createClientStatusMsg();

    statusMsg.setState( IClientStatusConstants.STATE_IDLE );

    exports.createClientStatusProxy().fireHostEvent( statusMsg );

    _clientBusy = false;
}, BUSY_DELAY, {
    maxWait: 10000,
    trailing: true,
    leading: false
} );

/**
 * Announce client state changed to 'busy' to the host and/or cancel any pending 'idle' announcement.
 */
function _onStartProgress() {
    _progressRefCount++;

    if( !_clientBusy ) {
        _clientBusy = true;

        _pingIdleDebounce.cancel();

        var statusMsg = exports.createClientStatusMsg();

        statusMsg.setState( IClientStatusConstants.STATE_BUSY );

        exports.createClientStatusProxy().fireHostEvent( statusMsg );
    }
}

/**
 * Announce client state changed to 'idle' to the host after a short delay with no new 'progress.start'
 * events.
 */
function _onEndProgress() {
    _progressRefCount--;

    if( _progressRefCount <= 0 && _clientBusy ) {
        _pingIdleDebounce( _progressRefCount );
        _progressRefCount = 0;
    }
}

/**
 * Definition of constants used as part of the interaction with {@link ClientStatusProxy}.
 * <P>
 * Note: These constants are used as part of the {@link ClientStatusMsg}.
 *
 * @member IClientStatusConstants
 * @memberof hostCore_2014_07
 */
var IClientStatusConstants = {
    /**
     * Value of {@link ClientStatusMsg#getState()} when the client-side is 'busy' and is temporarily
     * unavailable for any host-side interaction.
     */
    STATE_BUSY: 'busy',

    /**
     * Value of {@link ClientStatusMsg#getState()} when the client-side is 'idle' and available for any
     * host-side interaction.
     */
    STATE_IDLE: 'idle'
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// ClientStatusMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends info via {@link ClientStatusProxy}.
 * <P>
 * Note: Changes to this definition MUST BE coordinated with the master service contract definition.
 *
 * @constructor
 * @memberof hostCore_2014_07
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) JSON encoded object retured from the server to set the properties of the new
 * message instance.
 *
 * @extends hostFactoryService.BaseDataContractImpl
 */
var ClientStatusMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

ClientStatusMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Access to the 'State' property
 *
 * @function getState
 * @memberof hostCore_2014_07.ClientStatusMsg
 *
 * @return {String} The current state of the client-side.
 *
 * @see IClientStatusConstants#STATE_BUSY
 * @see IClientStatusConstants#STATE_IDLE
 */
ClientStatusMsg.prototype.getState = function() {
    return _.get( this, 'State', null );
};

/**
 * Access to the 'State' property
 *
 * @function setState
 * @memberof hostCore_2014_07.ClientStatusMsg
 *
 * @param {String} state The current state of the client-side.
 *
 * @see IClientStatusConstants#STATE_BUSY
 * @see IClientStatusConstants#STATE_IDLE
 */
ClientStatusMsg.prototype.setState = function( state ) {
    this.State = state;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// ClientStatusProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostCore_2014_07
 * @extends hostFactoryService.BaseCallableService
 */
var ClientStatusProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_CLIENT_STATUS_SVC,
        hostServices.VERSION_2014_07 );
};

ClientStatusProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Announce change in client status to the 'host'.
 *
 * @function fireHostEvent
 * @memberof hostCore_2014_07.ClientStatusProxy
 *
 * @param {ClientStatusMsg} inputData - Object containing the details of client's current status to pass
 * along to the host.
 */
ClientStatusProxy.prototype.fireHostEvent = function( inputData ) {
    this._invokeHostEvent( JSON.stringify( inputData ) );
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
 * @memberof hostCore_2014_07
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - JSON encoded object retured from the server to set the properties of the new
 */
var RequestHostConfigResponseMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2014_07 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

RequestHostConfigResponseMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Return current value.
 *
 * @memberof hostCore_2014_07.RequestHostConfigResponseMsg
 *
 * @returns {Boolean} "true" if ...
 */
RequestHostConfigResponseMsg.prototype.getSettings = function() {
    return _.get( this, 'Settings', null );
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
 * @memberof hostCore_2014_07
 * @extends hostFactoryService.BaseCallableService
 */
var RequestHostConfigProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_HOST_CONFIGURATION_SVC,
        hostServices.VERSION_2014_07 );
};

RequestHostConfigProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Ask host for its configuration options.
 *
 * @memberof hostCore_2014_07.RequestHostConfigProxy
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
 * @memberof hostCore_2014_07.RequestHostConfigProxy
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
 * Create a new service message Object.
 *
 * @memberof hostCore_2014_07
 *
 * @param {String} payload - (Optional) String from the 'host' to use when initializing the message object.
 *
 * @returns {ClientStatusMsg} New instance of the service's input message.
 */
export let createClientStatusMsg = function( payload ) {
    return new ClientStatusMsg( payload );
};

/**
 * Create a new service proxy Object.
 *
 * @memberof hostCore_2014_07
 *
 * @returns {ClientStatusProxy} New instance of the host-side service proxy.
 */
export let createClientStatusProxy = function() {
    return new ClientStatusProxy();
};

/**
 * Return a new instance of the host-side service proxy.
 *
 * @memberof hostCore_2014_07
 *
 * @returns {RequestHostConfigProxy} New instance of the service proxy.
 */
export let createRequestHostConfigProxy = function() {
    return new RequestHostConfigProxy();
};

/**
 * Returns reference to object containing service constants.
 *
 * @memberof hostCore_2014_07
 *
 * @returns {IClientStatusConstants} Reference to service constants.
 */
export let getClientStatusConstants = function() {
    return IClientStatusConstants;
};

/**
 * Finsh initialization of this service such that it will interact with other hosting APIs that are also
 * being initialized.
 *
 * @memberof hostCore_2014_07
 *
 * @returns {Promise} Resolved when this service is fully initialized.
 */
export let initialize = function() {
    if( hostInteropSvc.isHostServiceAvailable(
        hostServices.HS_CLIENT_STATUS_SVC,
        hostServices.VERSION_2014_07 ) ) {
        /**
         * Register to receive notification of SOA service 'traffic' so that we can maintain and announce
         * the current 'State' of the client-side. Setup to pass client status changes back to the host.
         */
        eventBus.subscribe( 'progress.start', function() {
            _onStartProgress();
        } );

        eventBus.subscribe( 'progress.end', function() {
            _onEndProgress();
        } );
    }

    return AwPromiseService.instance.resolve();
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostCore_2014_07
 */
export let registerHostingModule = function() {
    // Nothing to contribute (at this time)
};

export default exports = {
    createClientStatusMsg,
    createClientStatusProxy,
    createRequestHostConfigProxy,
    getClientStatusConstants,
    initialize,
    registerHostingModule
};
