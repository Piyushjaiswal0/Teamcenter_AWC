// Copyright (c) 2022 Siemens
/* eslint max-nested-callbacks: 0 */

/**
 * This module places on the global window object functions that are called TO the 'client'. This defines the
 * client-side API layer handling communication FROM the 'host'.
 * <P>
 * The JavaScript in this file provides functions and variables used to establish and manage host-client communication,
 * synchronization and bidirectional service discovery and invocation.
 *
 * <pre>
 * hostInteropSvc
 * splmInterop_Ping
 * splmInterop_HostServiceListUpdate
 * splmInterop_RequestWebServiceList
 * splmInterop_WebMethod
 * splmInterop_WebEvent
 * </pre>
 *
 * @module js/hosting/hostInteropService
 * @namespace hostInteropService
 */
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import hostRemoteSvc from 'js/hosting/hostRemoteService';
import assert from 'assert';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import cfgSvc from 'js/configurationService';
import logger from 'js/logger';
import hostConstService from 'js/hosting/hostConst_Services';
import hostUtils from 'js/hosting/hostUtils';
import eventBus from 'js/eventBus';
import 'config/hosting';

var urlAttributes = browserUtils.getUrlAttributes();

/**
 * {Boolean} TRUE if ... should be logged.
 */
var _debug_logHostCallsToClient = urlAttributes.logHostCallsToClient !== undefined;

/**
 * {Boolean} TRUE if ... should be logged.
 */
var _debug_logHostCallsToClientDetails = urlAttributes.logHostCallsToClientDetails !== undefined;

/**
 * {Boolean} TRUE if ... should be logged.
 */
var _debug_logClientCallsToHost = urlAttributes.logClientCallsToHost !== undefined;

/**
 * {Boolean} TRUE if ... should be logged.
 */
var _debug_logClientCallsToHostDetails = urlAttributes.logClientCallsToHostDetails !== undefined;

/**
 * {Boolean} TRUE if ... should be logged.
 */
var _debug_logHandShakeActivity = urlAttributes.logHandShakeActivity !== undefined;

/**
 * {Boolean} TRUE if we should use remote hosting APIs instead of browser global functions.
 * <P>
 * Note: The attribute value is used by 'hostRemoteService' to define the ID of the 'room' all 'client'
 * communications will pass thru to the 'host'.
 */
var _remoteHostingRoomId = urlAttributes.room;

/**
 * {Boolean} TRUE if we should use remote hosting APIs instead of browser global functions.
 * <P>
 * Note: The attribute value is used by 'hostRemoteService' to define the ID of the 'room' all 'client'
 * communications will pass thru to the 'host'.
 */
var _isRemoteHostingEnabled = Boolean( _remoteHostingRoomId );

/**
 * {Boolean} TRUE if we should use the postMessage API instead of calling the functions directly
 */
var _isPostMessageEnabled = Boolean( urlAttributes.PostMsg );

/**
  * {Object} host configuration cache
  */
var _hostConfig;

/**
  * {Object} session info cache
  */
var _sessionInfo;

/**
 * {StringArray} Set of service FQNs to NOT log back to the client (generally too noisy w/these included)
 */
var _debug_FilteredFQNs = [ hostConstService.HS_LOGGER_FORWARD_SVC, hostConstService.HS_ASYNC_SOA_JSON_MESSAGE_SVC,
    hostConstService.CS_SOA_JSON_REQUEST_SVC, hostConstService.HS_CLIENT_STATUS_SVC, hostConstService.HS_REQUEST_HOST_AUTH_SVC,
    hostConstService.CS_REQUEST_HOST_AUTH_REPLY_SVC
];

// var _debug_FilteredFQNs = [ hostServices.HS_LOGGER_FORWARD_SVC ];

/**
 * Register service.
 *
 * @member hostInteropService
 * @memberof NgService
 */

/**
 * {Window} Window containing the browser callback functions.
 */
var _mainHostWindow;

/**
 * {@link hostInteropService.ServiceDescriptor} Cached service descriptor for the service back on the host
 * to send logging messages to.
 */
var _loggerForwardSvc;

/**
 * {Boolean} TRUE if we can  talk to the host process.
 */
var _canTalk = false;

/**
 * {Boolean} TRUE if we have checked settings yet or not? (One time)
 */
var _haveChecked = false;

/**
 * {AngularJScopeObject} A scope object of th used to communicate information to hosting-related services and commands.
 */
var _hostingScope = {};

/**
 * {Boolean} TRUE if the 'client' and 'host' have sucessfully completed all phases of the startup and can
 * interact freely.
 */
var _isStartupComplete = false;

/**
 * Utility function to do the state checks. This can be a one-time lookup upon first access. Look at the
 * state of the internal structures and set the detection state members accordingly.
 */
var _doChecks = function() {
    var version = null;

    if( _.isFunction( exports.hostversion ) ) {
        version = exports.hostversion();
    } else {
        version = exports.hostversion;
    }

    if( !_.isEmpty( version ) ) {
        _canTalk = true;
    }

    _haveChecked = true;
};

/**
 * Decode service payload into specific result Object.
 *
 * @private
 *
 * @param {ServiceDescription} serviceDesc - Service the given payload is associated with.
 *
 * @param {String} payloadString - The 'payload' string to decode.
 *
 * @return {Object} Decoded results.
 */
function _decodePayloadString( serviceDesc, payloadString ) {
    if( _.isEmpty( payloadString ) ) {
        return '{Empty Payload}';
    }

    if( !_.isString( payloadString ) ) {
        return '{Non-String Payload}';
    }

    /**
     * Try and decode any common structures contained within the payload<BR> Note: If we are unable to
     * parse, then maybe payload is just a simple string and we just want to return it.
     */
    var payloadObj = {};

    try {
        if( _.startsWith( payloadString, '{' ) ) {
            payloadObj = JSON.parse( payloadString );
        } else {
            return 'String: ' + payloadString;
        }
    } catch ( ex ) {
        return 'String Ex: ' + payloadString;
    }

    if( serviceDesc.FQN === hostConstService.CS_SELECTION_LISTENER_SVC &&
        serviceDesc.SvcVersion === hostConstService.VERSION_2014_10 ) {
        if( !_.isEmpty( payloadObj.Selection ) ) {
            _.forEach( payloadObj.Selection, function( selection ) {
                var decodedData = hostUtils.decodeEmbeddedJson( selection.Data );
                if( decodedData ) {
                    if( _.startsWith( decodedData, '{' ) ) {
                        selection.Data = JSON.parse( decodedData );
                        if( selection.Data.Properties ) {
                            for( var j = 0; j < selection.Data.Properties.length; j++ ) {
                                var prop = selection.Data.Properties[ j ];

                                if( _.isString( prop.Value ) ) {
                                    prop.Value = JSON.parse( prop.Value );
                                }
                            }
                        }
                    } else {
                        selection.Data = decodedData;
                    }
                }
            } );
        }
    } else if( serviceDesc.FQN === hostConstService.HS_HOST_OPEN &&
        serviceDesc.SvcVersion === hostConstService.VERSION_2015_10 ) {
        if( !_.isEmpty( payloadObj.OpenTargets ) ) {
            _.forEach( payloadObj.OpenTargets, function( openTarget ) {
                var decodedData = hostUtils.decodeEmbeddedJson( openTarget.Data );

                if( decodedData ) {
                    openTarget.Data = JSON.parse( decodedData );
                }
            } );
        }
    } else if( serviceDesc.FQN === hostConstService.HS_SELECTION_PROVIDER_SVC &&
        serviceDesc.SvcVersion === hostConstService.VERSION_2014_10 ) {
        if( !_.isEmpty( payloadObj.Selection ) ) {
            _.forEach( payloadObj.Selection, function( selection ) {
                var decodedData = hostUtils.decodeEmbeddedJson( selection.Data );

                if( decodedData ) {
                    selection.Data = JSON.parse( decodedData );

                    if( selection.Data.Properties ) {
                        for( var j = 0; j < selection.Data.Properties.length; j++ ) {
                            var prop = selection.Data.Properties[ j ];

                            if( _.isString( prop.Value ) ) {
                                prop.Value = JSON.parse( prop.Value );
                            }
                        }
                    }
                }
            } );
        }
    } else if( serviceDesc.FQN === hostConstService.CS_SOA_JSON_REQUEST_SVC &&
        serviceDesc.SvcVersion === hostConstService.VERSION_2014_02 ) {
        if( payloadObj.SoaResponse ) {
            var qname = payloadObj.SoaResponse[ '.QName' ];

            if( qname !== 'http://teamcenter.com/Schemas/Core/2008-03/Session.ConnectResponse' ) {
                payloadObj.SoaResponse = {};
                payloadObj.SoaResponse[ '.QName' ] = qname;
            }
        }
    } else if( serviceDesc.FQN === hostConstService.HS_ASYNC_SOA_JSON_MESSAGE_SVC &&
        serviceDesc.SvcVersion === hostConstService.VERSION_2014_02 ) {
        payloadObj.Message = '...';
    } else if( serviceDesc.FQN === hostConstService.HS_CLIENT_STATUS_SVC &&
        serviceDesc.SvcVersion === hostConstService.VERSION_2014_07 ) {
        return payloadString;
    }

    return JSON.stringify( payloadObj, null, 2 );
} // _decodePayloadString

/**
 * Function to retrieve a reference to the host window.
 * <P>
 * Note: The host may be in the top-level window or within an iframe in the hosted content's hierarchy
 * (parent window).
 * <P>
 * This function is intended to be invoked with 'window.parent' and allow the hierarchy to be recursed
 * 'upward' until the host window is found or there are no more parents to check.
 *
 * @private
 * @param {Window} parent - Current window to check if it is the host's main window.
 *
 * @param {Number} level - Current number of levels above the starting window (e.g. 0 = the window we are
 *            performing the lookup for. 1 = that window's immediate parent)
 *
 * @returns {Window} The window object containing the global host interop functions.
 */
function _getHostWindowSync( parent, level ) {
    /**
     * Check if we have already located it.
     */
    if( _mainHostWindow ) {
        return _mainHostWindow;
    }

    var result = null;

    if( parent !== null ) {
        /**
         * If parent is in a different domain than this script, checking 'parent.splmHostPing' will throw an
         * exception. Do we catch here or allow it to be bubbled up?
         */
        try {
            /**
             * Note: At least for the C++ based browser, the 'typeof' test actually causes the function to
             * be invoked. We would like to avoid that. However, until we can determine a way to do that, we
             * will reference a more 'trivial' function like 'ping'.
             */
            if( parent.splmHostPing && typeof parent.splmHostPing === 'function' ) {
                result = parent;
            } else if( parent.external && parent.external.splmHostPing ) {
                result = parent.external;
            }
        } catch ( ex ) {
            logger.error( 'hostInterop.getHostWindow: Unable to locate host-side window' );
        }
    }

    /**
     * Do this outside the try/catch to handle the case where parent.external is true but
     * parent.external.splmHostPing is not. This will be the case when we are in an iframe with JavaScript
     * hosting, but also in an embedded IE WebComponent that isn't doing the hosting. In that case the check
     * for parent.external will throw an exception which we want to ignore, but still check
     * parent.window.parent where the JavaScript hosting global functions will be found.
     */
    if( result === null && parent && parent.window && parent !== parent.window.parent ) {
        result = _getHostWindowSync( parent.window.parent, level + 1 );
    }

    /**
     * Remember the final result once we find the host window.
     */
    if( result ) {
        _mainHostWindow = result;
    }

    return result;
}

/**
 * Check for an error reply and turn it into a JS exception.... {Exception:{name:nm, message: msg}}
 *
 * @private
 * @param {String} response - response
 *
 * @throws Exception if the response contains an exception.
 */
function _checkResponseForError( response ) {
    if( response ) {
        if( response.length > 11 ) {
            if( response.slice( 0, 11 ) === '{"Exception' ) {
                var errorObj = JSON.parse( response );

                /**
                 * Get a simple exception obj back, with name & message.
                 */
                var error = errorObj.Exception;
                if( error ) {
                    throw error;
                }
            }
        }
    }
}

/**
 * Determine the {hostInteropService.ServiceDescriptor} based on the given {ServiceDefinition}.
 *
 * @param {ServiceDefinition} serviceDef - The
 *
 * @returns {hostInteropService.ServiceDescriptor} The descriptor related to the given {ServiceDefinition}.
 */
function _getServiceDescriptor( serviceDef ) {
    if( serviceDef.target ) {
        return serviceDef.target;
    }

    var fqn = hostConstService[ serviceDef.symbolicName ];
    var version = hostConstService[ serviceDef.symbolicVersion ];

    return exports.createServiceDescriptor( fqn, version );
}

/**
 * Atempt to find the host-window up the window containment tree (The window containing the host-side global
 * functions).
 *
 * @param {Number} count - The iteration count being attempted.
 *
 * @returns {Promise} Resolved when host window is found or rejected if not found.
 */
function _deferWindowLookUp( count ) {
    var deferred = AwPromiseService.instance.defer();

    if( _debug_logHandShakeActivity ) {
        logger.info( '_deferWindowLookUp: ' + 'Retry locating host window: ' + count );
    }

    _.defer( function() {
        try {
            var hostWnd = _getHostWindowSync( window, 0 );

            if( hostWnd ) {
                if( _debug_logHandShakeActivity ) {
                    logger.info( '_deferWindowLookUp: ' + 'Found host window' );
                }

                deferred.resolve( hostWnd );
            } else {
                deferred.reject( 'Global functions not found' );
            }
        } catch ( err ) {
            deferred.reject( 'Global functions not found' + ' err: ' + err );
        }
    } );

    return deferred.promise;
}

/**
 * Atempt to find the host-window up the window containment tree (The window containing the host-side global
 * functions). First attempt using 'sync' and then attempt using 'async' (multiple times). Only reject the
 * promise if the host-window is not found after those attempts.
 *
 * @return {Promise} Resolved with hostWindow
 */
function _getHostWindowAsync() {
    try {
        /**
         * Attempt to find the host-window immediately.
         */
        var hostWnd = _getHostWindowSync( window, 0 );

        if( hostWnd ) {
            return AwPromiseService.instance.resolve( hostWnd );
        }

        /**
         * Attempt to find the host-window after a series of short 'deferrals'.
         */
        return _deferWindowLookUp( 1 ).then( function( hostWnd ) {
            return hostWnd;
        }, function() {
            return _deferWindowLookUp( 2 ).then(
                function( hostWnd ) {
                    return hostWnd;
                },
                function( err ) {
                    return AwPromiseService.instance.reject( 'Unable to locate host functions : ' + '2' + ' err: ' + err );
                } ); // 2
        } ); // 1
    } catch ( ex ) {
        return AwPromiseService.instance.reject( ex );
    }
}

/**
 * Call the host-side 'splmHostEvent' method with the given inputs.
 *
 * @param {ServiceDescriptor} serviceDesc - Service to invoke.
 * @param {String} payload - JSON formatted input parameter(s) to the service.
 * @param {Window} hostWnd - The host-window where the host-side services are defined.
 */
function _fireHostEvent( serviceDesc, payload, hostWnd ) {
    _logCallActivity( 'Client->Host', 'callHostEvent', serviceDesc, payload );

    var descriptor = JSON.stringify( serviceDesc ); // json string for

    var response = hostWnd.splmHostEvent( descriptor, payload );

    // _logCallActivityResponse( 'Client->Host', 'callHostEvent', serviceDesc, response );

    // check for an error reply and turn it into a JS exception.... {Exception:{name:nm, message: msg}}
    _checkResponseForError( response );
}

/**
 * Callback function used to process incomming message activity.
 *
 * @param {Object} msgObj -
 *
 * @returns {Object} Result
 */
function _processMessageCb( msgObj ) {
    if( _debug_logHandShakeActivity ) {
        exports.log( '_processMessageCb: ' + 'remoteHosting' + ' ' + 'Host sent: ' + '\n' +
            JSON.stringify( msgObj, null, 2 ) );
    }

    var payloadObj = msgObj.payload;

    switch ( msgObj.bioFunction ) {
        case 'splmInterop_Ping':
            return splmInterop_Ping( payloadObj.hostVersion );

        case 'splmInterop_HostServiceListUpdate':
            return splmInterop_HostServiceListUpdate( payloadObj.action, payloadObj.jsonList, payloadObj.sendList );

        case 'splmInterop_RequestWebServiceList':
            return splmInterop_RequestWebServiceList();

        case 'splmInterop_WebMethod':
            return splmInterop_WebMethod( msgObj.service, msgObj.payload );

        case 'splmInterop_WebEvent':
            return splmInterop_WebEvent( msgObj.service, msgObj.payload );

        case 'config': {
            _hostConfig = msgObj.payload;
            return;
        }
        case 'host_session': {
            _sessionInfo = msgObj.payload;
            return;
        }

        default:
            logger.error( 'startHostHandShake: ' + 'remoteHosting' + '\n' +
                'Host called unknown BIO function: ' + msgObj.bioFunction );
    }
}

/**
 * Log Client->Host interface communications (if debug flags are set).
 *
 * @param {String} direction - The 'Client->Host' or 'Host->Client' direction of the service call.
 * @param {String} bioFunction - BIO Function logging on behalf of.
 * @param {ServiceDescriptor} serviceDesc - Service being invoked
 * @param {String} payload - The JSON formatted parmeters being sent to the service.
 */
function _logCallActivity( direction, bioFunction, serviceDesc, payload ) {
    if( !_.isObject( serviceDesc ) ) {
        assert( false, 'Invalid input to ' + bioFunction + ': ' + typeof serviceDesc + ' val: ' + serviceDesc );
    }

    if( _debug_logClientCallsToHostDetails ) {
        if( !_.includes( _debug_FilteredFQNs, serviceDesc.FQN ) ) {
            exports.log( direction + ' (' + bioFunction + '):' + '\n' +
                JSON.stringify( serviceDesc ) + '\n' +
                'payload:' + '\n' +
                _decodePayloadString( serviceDesc, payload ) );
        }
    } else if( _debug_logClientCallsToHost ) {
        if( !_.includes( _debug_FilteredFQNs, serviceDesc.FQN ) ) {
            exports.log( direction + ' (' + bioFunction + '):' + '\n' +
                JSON.stringify( serviceDesc ) );
        }
    }
}

/**
 * Log Client->Host interface communications (if debug flags are set).
 *
 * @param {String} direction - The 'Client->Host' or 'Host->Client' direction of the service call.
 * @param {String} bioFunction - BIO Function logging on behalf of.
 * @param {ServiceDescriptor} serviceDesc - Service being invoked
 * @param {String} response - The JSON formatted result returned by the service.
 */
function _logCallActivityResponse( direction, bioFunction, serviceDesc, response ) {
    if( _debug_logClientCallsToHostDetails ) {
        if( !_.includes( _debug_FilteredFQNs, serviceDesc.FQN ) ) {
            exports.log( direction + ' (' + bioFunction + '):' + '*** Response ***' + '\n' +
                JSON.stringify( serviceDesc ) + '\n' +
                'Response:' + '\n' +
                _decodePayloadString( serviceDesc, response ) );
        }
    }
}

// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
// Private Classes
// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------

/**
 * Simple data container for the information used to identify and invoke 'target' hosting services.
 *
 * @constructor
 * @memberof hostInteropService
 *
 * @param {String} fqn - fully qualified name
 * @param {String} version - version
 */
var ServiceDescriptor = function( fqn, version ) {
    this.FQN = fqn;
    this.SvcVersion = version;

    /**
     * access to the FQN - fully qualified name property
     *
     * @returns {String} ...
     */
    this.getFQN = function() {
        return this.FQN;
    };

    /**
     * access to the version property
     *
     * @returns {String} ...
     */
    this.getSvcVersion = function() {
        return this.SvcVersion;
    };

    /**
     * access to the FQN - fully qualified name property
     *
     * @param {String} fqn - Fully qualified name of this service.
     */
    this.setFQN = function( fqn ) {
        this.FQN = fqn;
    };

    /**
     * access to the version property
     *
     * @param {String} ver - Version of this service.
     */
    this.setSvcVersion = function( ver ) {
        this.SvcVersion = ver;
    };
};

/**
 * Class used to communicate details of an exception.
 *
 * @constructor
 * @memberof hostInteropService
 *
 * @param {String} name - name
 * @param {String} message - message
 */
var ExceptionInfo = function( name, message ) {
    this.name = name;
    this.message = message;
};

// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
// Public Properties
// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------

var exports = {};

/**
 * @property {String}
 * @memberof hostInteropService
 */
export let title = 'AW BrowserInterop Configuration Data';

/**
 * Static version id.
 *
 * @property {String}
 * @memberof hostInteropService
 */
export let version = '4.0.0';

/**
 * Host-side version (for negotiation).
 *
 * @property {String}
 * @memberof hostInteropService
 */
export let hostversion = '';

/**
 * Host-side available services (descriptors).
 *
 * @property {ServiceDescriptor[]}
 * @memberof hostInteropService
 */
export let hostServices = [];

/**
 * Client-side registered services.
 *
 * @property {ServiceDescriptor[]}
 * @memberof hostInteropService
 */
export let clientServices = [];

/**
 * Client-side registered proxy services.
 *
 * @property {ServiceDescriptor[]}
 * @memberof hostInteropService
 */
export let clientProxies = [];

// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
// Public Functions
// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------

/**
 * This function is called by the client-side service to log an 'INFO' level message back at the host.
 *
 * @memberof hostInteropService
 *
 * @param {String} message - Message to send to the host.
 */
export let log = function( message ) {
    /**
     * Check if we have found the necessary host-side functions on a browser window.
     */
    if( _mainHostWindow ) {
        if( !_loggerForwardSvc ) {
            _loggerForwardSvc = exports.createServiceDescriptor( hostConstService.HS_LOGGER_FORWARD_SVC,
                hostConstService.VERSION_2014_02 );
        }

        var logMessage = {
            Version: hostConstService.VERSION_2014_02,
            FormatMessage: message,
            Level: 'INFO'
        };

        eventBus.publish( 'log', {
            level: logMessage.Level,
            output: logMessage.FormatMessage
        } );

        exports.callHostEvent( _loggerForwardSvc, JSON.stringify( logMessage ) );
    } else {
        logger.info( 'hostInteropService.log: ' + '\n' + message );
        eventBus.publish( 'log', {
            output: message
        } );
    }
};

/**
 * Class used to communicate details of an exception.
 *
 * @memberof hostInteropService
 *
 * @param {String} name - name
 * @param {String} message - message
 *
 * @returns {ExceptionInfo} New object of this class.
 */
export let createExceptionInfo = function( name, message ) {
    return new ExceptionInfo( name, message );
};

/**
 * The JS definition for a service descriptor. Exposed by HostedInfo.
 *
 * @memberof hostInteropService
 *
 * @param {hostInteropService.ServiceDescriptor} input - Existing ServiceDescriptor to create a new
 * ServiceDescriptor from.
 *
 * @returns {hostInteropService.ServiceDescriptor} New instance based on given input.
 */
export let cloneServiceDescriptor = function( input ) {
    return new ServiceDescriptor( input.FQN, input.SvcVersion );
};

/**
 * The JS definition for a service descriptor. Exposed by HostedInfo.
 *
 * @memberof hostInteropService
 *
 * @param {String} fqn - fully qualified name
 * @param {String} version - version
 *
 * @returns {hostInteropService.ServiceDescriptor} New instance based on given input.
 */
export let createServiceDescriptor = function( fqn, version ) {
    return new ServiceDescriptor( fqn, version );
};

/**
 * isRemoteHostingSupported?
 *
 * @memberof hostInteropService
 *
 * @returns {promise} Whether a remote hosting connection worked or not .
 */
export let isRemoteHostingSupported = function() {
    return hostRemoteSvc.isRemoteHostingSupported();
};

/**
 * Triggers initial startup handshake with the host.
 *
 * @memberof hostInteropService
 *
 * @returns {Promise} Resolved with the host-window object when the host-side functions are found and
 * 'splmHost_WebSideStartHandShake' has been called.
 */
export let startHostHandShake = function() {
    if( _debug_logHandShakeActivity ) {
        exports.log( 'startHostHandShake: ' );
    }
    if ( _isPostMessageEnabled ) {
        return new Promise( ( resolve ) => {
            var msgObj = {
                bioFunction: 'splmHost_WebSideStartHandShake'
            };

            /**
             * Setup the event listener for the global functions
             */
            window.addEventListener( 'message', ( event ) => {
                // Check the source to make sure it's coming from the right place
                if ( event.source === parent ) {
                    _processMessageCb( event.data );
                }
            }, false );

            // NOTE: We must use target origin "*" for file: URLs, such as the one in the Adobe extension
            // Address coverity issue. Since we don't use postMessage for adobe/AW integration from 6.1,
            // just use "/" to restrict to the same orgin
            parent.postMessage( msgObj, '/' );
            resolve();
        } );
    } else if( _isRemoteHostingEnabled ) {
        return exports.isRemoteHostingSupported().then( () => {
            hostRemoteSvc.attach( _remoteHostingRoomId, true, _processMessageCb );

            if( _debug_logHandShakeActivity ) {
                exports.log( 'startHostHandShake: ' + 'remoteHosting' + '\n' +
                    'splmHost_WebSideStartHandShake' + ' ' + 'Called' );
            }

            var msgObj = {
                bioFunction: 'splmHost_WebSideStartHandShake'
            };

            return hostRemoteSvc.sendAsync( msgObj ).then( function() {
                appCtxSvc.ctx.aw_hosting_remote_enabled = true;
                return 'remote hosting started';
            } );
        } );
    }

    return _getHostWindowAsync().then( function( hostWnd ) {
        /**
         * Attach the client-side BIO functions to the window this client is running it as global functions.
         * <P>
         * Note: The 'window' in this case may infact be the 'contentWindow' of the IFrame this 'client' is
         * being hosted in.
         */
        window.splmInterop_Ping = splmInterop_Ping;
        window.splmInterop_HostServiceListUpdate = splmInterop_HostServiceListUpdate;
        window.splmInterop_RequestWebServiceList = splmInterop_RequestWebServiceList;
        window.splmInterop_WebMethod = splmInterop_WebMethod;
        window.splmInterop_WebEvent = splmInterop_WebEvent;

        if( _debug_logHandShakeActivity ) {
            exports.log( 'startHostHandShake: ' + 'Found host window' );
        }

        // 'tickle' the host-side.
        var result = hostWnd.splmHost_WebSideStartHandShake();

        if( _debug_logHandShakeActivity ) {
            exports.log( 'startHostHandShake: ' + 'Host Returned: ' + result );
        }

        return hostWnd;
    } );
};

/**
 * Invoke a host-side service method.
 *
 * @memberof hostInteropService
 *
 * @param {hostInteropService.ServiceDescriptor} serviceDesc - service description
 *
 * @param {String} payload - The JSON encoded data to pass as the input to the host-side method.
 *
 * @return {String} The JSON encoded data returned from the service.
 */
export let callHostMethod = function( serviceDesc, payload ) {
    /**
     * Check if we are running 'remote'
     * <P>
     * If so: There is no way to respond with a synchronous response. So, throw and exception.
     */
    if ( _isPostMessageEnabled ) {
        throw new Error( 'Client->Host' + ' (' + 'callHostMethod' + '):' + '\n' +
            'Not Supported' + ' ' + 'isPostMessageEnable=' + _isPostMessageEnabled + '. Please use 2019_05 versions for Post Message hosting' );
    } else if( _isRemoteHostingEnabled ) {
        throw new Error( 'Client->Host' + ' (' + 'callHostMethod' + '):' + '\n' +
            'Not Supported' + ' ' + 'isRemoteHostingEnabled=' + _isRemoteHostingEnabled + '. Please use 2019_05 versions for remote hosting' );
    }

    /**
     * The 'host' does not like 'nil' payloads. Use an empty string instead.
     */
    if( hostUtils.isNil( payload ) ) {
        payload = '';
    }

    /**
     * Do this on the host-side.
     * <P>
     * Validate that the target service is known.
     * <P>
     * Check if the provided descriptor matches one of the host service descriptors
     */
    var hostWnd = _getHostWindowSync( window, 0 );

    assert( hostWnd, 'Unable to locate host window. Please check for a cross-site scripting error.' );

    _logCallActivity( 'Client->Host', 'callHostMethod', serviceDesc, payload );

    var descriptor = JSON.stringify( serviceDesc );

    var response = hostWnd.splmHostMethod( descriptor, payload );

    _logCallActivityResponse( 'Client->Host', 'callClientMethod', serviceDesc, response );

    // check for an error reply and turn it into a JS exception.... {Exception:{name:nm, message: msg}}
    _checkResponseForError( response );

    return response;
    // debug for exception
    // window.alert("callHostMethod-Error Name: " + ex['name'] + " msg " + ex['message']);
};

/**
 * Invoke a host-side service method.
 *
 * @memberof hostInteropService
 *
 * @param {hostInteropService.ServiceDescriptor} serviceDesc - service description
 *
 * @param {String} payload - The JSON encoded data to pass as the input to the host-side method.
 *
 * @return {Promise} Resolved with The JSON encoded data {String} returned from the service.
 */
export let callHostMethodAsync = function( serviceDesc, payload ) {
    /**
     * Check if we are NOT running 'remote'
     * <P>
     * If so: Just call the synchronouse method and resolve the promise with the returned response.
     */
    if( !_isRemoteHostingEnabled && !_isPostMessageEnabled ) {
        var response = exports.callHostMethod( serviceDesc, payload );

        return AwPromiseService.instance.resolve( response );
    }

    /**
     * The 'host' does not like 'nil' payloads. Use an empty string instead.
     */
    if( hostUtils.isNil( payload ) ) {
        payload = '';
    }

    /**
     * Do this on the host-side.
     * <P>
     * Validate that the target service is known.
     * <P>
     * Check if the provided descriptor matches one of the host service descriptors
     */
    _logCallActivity( 'Client->Host', 'callHostMethodAsync', serviceDesc, payload );

    var descriptor = JSON.stringify( serviceDesc );

    var msgObj = {
        bioFunction: 'splmHostMethod',
        service: descriptor,
        payload: payload
    };

    return hostRemoteSvc.sendAsync( msgObj ).then( function( response ) {
        _logCallActivityResponse( 'Client->Host', 'callHostMethodAsync', serviceDesc, response );

        // check for an error reply and turn it into a JS exception.... {Exception:{name:nm, message:
        // msg}}
        _checkResponseForError( response );

        return response;
    }, function( error ) {
        throw new Error( error );
    } );

    // debug for exception
    // window.alert("callHostMethod-Error Name: " + ex['name'] + " msg " + ex['message']);
};

/**
 * Invoke a host-side service event.
 *
 * @memberof hostInteropService
 *
 * @param {hostInteropService.ServiceDescriptor} serviceDesc - The host-side service to invoke.
 *
 * @param {Object} payload - Object containing the properties to pass to the host-side service.
 */
export let callHostEvent = function( serviceDesc, payload ) {
    _logCallActivity( 'Client->Host', 'callHostEvent', serviceDesc, payload );
    var descriptor = JSON.stringify( serviceDesc ); // json string for
    var msgObj = {
        bioFunction: 'splmHostEvent',
        service: descriptor,
        payload: payload
    };
    if ( _isPostMessageEnabled ) {
        let deferred = AwPromiseService.instance.defer();

        // NOTE: We must use target origin "*" for file: URLs, such as the one in the Adobe extension
        // Address coverity issue. Since we don't use postMessage for adobe/AW integration from 6.1,
        // just use "/" to restrict to the same orgin
        parent.postMessage( msgObj, '/' );
    } else if( _isRemoteHostingEnabled ) {
        hostRemoteSvc.sendAsync( msgObj ).then( function() {
            // _logCallActivityResponse( 'Client->Host', 'callHostEvent', serviceDesc, response );
        }, function( error ) {
            throw new Error( error );
        } );
    } else {
        var hostWnd = _getHostWindowSync( window, 0 );

        if( hostWnd ) {
            _fireHostEvent( serviceDesc, payload, hostWnd );
        } else {
            _getHostWindowAsync().then(
                function( hostWnd ) {
                    _fireHostEvent( serviceDesc, payload, hostWnd );
                },
                function( err ) {
                    logger.error( 'callHostEvent' + ' ' + 'Unable to locate host window' + '\n' + 'err: ' + err );
                } );
        }
    }

    // debug for exception
    // if( _debug_logHandShakeActivity ) {if( _.isString( ex ) ) {window.alert( "callHostEvent-Error
    //     Name: " + '\n' + ex );} else {window.alert( "callHostEvent-Error Name: " + '\n' +
    //     JSON.stringify( ex, null, 2 ) );
    //     }
    // }
};

/**
 * Use the given FQN and service version to find a host-side service 'proxy' match.
 *
 * @memberof hostInteropService
 *
 * @param {String} fqn - The Fully Qualified Name of the 'proxy' to locate.
 *
 * @param {String} svcVersion - The specific version of the  'proxy' to locate.
 *
 * @returns {hostFactoryService.BaseCallableService} A reference to the host-side service 'proxy' entry (or
 * NULL if not found)
 */
export let findClientProxy2 = function( fqn, svcVersion ) {
    var foundEntry = _.find( exports.clientProxies, {
        FQN: fqn,
        SvcVersion: svcVersion
    } );

    return foundEntry ? foundEntry : null;
};

/**
 * Use the given {ServiceDescription} to find a host-side service 'proxy' match.
 *
 * @memberof hostInteropService
 *
 * @param {ServiceDescription} targetSvc - The service to locate.
 *
 * @returns {hostFactoryService.BaseCallableService} A reference to the host-side service 'proxy' entry (or
 * NULL if not found)
 */
export let findClientProxy = function( targetSvc ) {
    var foundEntry = _.find( exports.clientProxies, {
        FQN: targetSvc.FQN,
        SvcVersion: targetSvc.SvcVersion
    } );

    return foundEntry ? foundEntry : null;
};

/**
 * Use the given FQN and service version to find a client-side 'service' match.
 *
 * @memberof hostInteropService
 *
 * @param {String} fqn - The Fully Qualified Name of the service to locate.
 *
 * @param {String} svcVersion - The specific version of the service to locate.
 *
 * @returns {hostFactoryService.BaseCallableService} A reference to the client-side 'service' entry (or NULL
 * if not found)
 */
export let findClientService2 = function( fqn, svcVersion ) {
    var foundEntry = _.find( exports.clientServices, {
        FQN: fqn,
        SvcVersion: svcVersion
    } );

    return foundEntry ? foundEntry : null;
};

/**
 * Use the given {ServiceDescription} to find a client-side 'service' match.
 *
 * @memberof hostInteropService
 *
 * @param {ServiceDescription} targetSvc - The service to locate.
 *
 * @returns {hostFactoryService.BaseCallableService} A reference to the client-side 'service' entry (or NULL
 * if not found)
 */
export let findClientService = function( targetSvc ) {
    var foundEntry = _.find( exports.clientServices, {
        FQN: targetSvc.FQN,
        SvcVersion: targetSvc.SvcVersion
    } );

    return foundEntry ? foundEntry : null;
};

/**
 * Generates an interop exception representation from a JS exception
 * <P>
 * Note: This needs to match with the other technologies. ExceptionInfo and ExceptionHolder.
 *
 * @memberof hostInteropService
 *
 * @param {Exception} exObj - Exception object to act upon.
 *
 * @returns {String} String representation of the given exception object.
 */
export let getJsonForException = function( exObj ) {
    var ex = exports.createExceptionInfo( exObj.name || 'no Name', exObj.message || 'no Message' );

    var errInfo = {
        Exception: ex
    };

    return JSON.stringify( errInfo );
};

/**
 * Check if the given service is supported in the client.
 *
 * @memberof hostInteropService
 *
 * @param {String} fqn - Fully Qualified Name of the service to check
 * @param {String} svcVersion - Version of the service to check
 *
 * @returns {Boolean} TRUE if the service is supported.
 */
export let isClientServiceAvailable = function( fqn, svcVersion ) {
    return Boolean( exports.findClientService2( fqn, svcVersion ) );
};

/**
 * Register the given client-side service.
 *
 * @memberof hostInteropService
 *
 * @param {ServiceDescription} svcDesc - service description
 * @param {Function} methodFn - method function
 * @param {Function} eventFn - event function
 */
export let registerClientService = function( svcDesc, methodFn, eventFn ) {
    var clientSvc = exports.cloneServiceDescriptor( svcDesc );

    clientSvc.handleMethodCall = methodFn;
    clientSvc.handleEventCall = eventFn;

    exports.clientServices.push( clientSvc );
};

/**
 * Determine if a specific host-side Service is registered or known. (Can only interact with
 * known/registered host services).
 *
 * @memberof hostInteropService
 *
 * @param {String} fqn - Fully Qualified Name of the service to check
 * @param {String} svcVersion - Version of the service to check
 *
 * @return {Boolean} TRUE if the given service is supported by the current host.
 */
export let isHostServiceAvailable = function( fqn, svcVersion ) {
    // TODO - assert that fqn and svcVersion are nonNull strings
    var count = exports.hostServices.length;

    // can't do the normal array.indexOf due to the complex type.  Just look for a match.
    for( var idx = 0; idx < count; idx += 1 ) {
        var entry = exports.hostServices[ idx ];

        if( entry.FQN === fqn && entry.SvcVersion === svcVersion ) {
            return true;
        }
    }

    return false;
};

/**
 * Determine if we should use the 'Host' for authorization at startup.
 *
 * @memberof hostInteropService
 *
 * @return {Boolean} TRUE if there is an available Host side SOA connection.
 */
export let isHostAuthorizationEnabled = function() {
    var enabled = true;

    if( !exports.isHostServiceAvailable(
        hostConstService.HS_HOST_SESSION_INFO_SVC,
        hostConstService.VERSION_2014_02 ) ) {
        enabled = false;

        if( _debug_logHandShakeActivity ) {
            exports.log( 'isHostAuthorizationEnabled: ' + 'Missing: ' +
                hostConstService.HS_HOST_SESSION_INFO_SVC );
        }
    }

    if( !exports.isHostServiceAvailable(
        hostConstService.HS_ASYNC_SOA_JSON_MESSAGE_SVC,
        hostConstService.VERSION_2014_02 ) ) {
        enabled = false;

        if( _debug_logHandShakeActivity ) {
            exports.log( 'isHostAuthorizationEnabled: ' + 'Missing: ' +
                hostConstService.HS_ASYNC_SOA_JSON_MESSAGE_SVC );
        }
    }

    if( !exports.isHostServiceAvailable(
        hostConstService.HS_REQUEST_HOST_AUTH_SVC,
        hostConstService.VERSION_2014_02 ) ) {
        enabled = false;

        if( _debug_logHandShakeActivity ) {
            exports.log( 'isHostAuthorizationEnabled: ' + 'Missing: ' +
                hostConstService.HS_REQUEST_HOST_AUTH_SVC );
        }
    }

    return enabled;
};

/**
 * Check if host' can communicate with the 'client'.
 *
 * @memberof hostInteropService
 *
 * @returns {Boolean} TRUE if 'host' can communicate with the 'client'.
 */
export let getCanTalkWithHost = function() {
    if( !_haveChecked ) {
        _doChecks();

        if( _debug_logHandShakeActivity ) {
            exports.log( 'getCanTalkWithHost: ' + 'Can talk to the host: ' + _canTalk + ' hostVersion: ' + exports.hostversion );
        }
    }

    return _canTalk;
};

/**
 * Return a reference to the $scope object used for hosting specific purposes.
 *
 * @memberof hostInteropService
 *
 * to hosting-related services and commands.
 */
export let getHostingScope = function() {
    return _hostingScope;
};

/**
 * Set whether the 'client' and 'host' have sucessfully completed all phases of the startup and can interact
 * freely.
 *
 * @memberof hostInteropService
 *
 * @param {Boolean} isStartupComplete - TRUE if the 'client' and 'host' have sucessfully completed all
 * phases of the startup and can interact freely.
 */
export let setStartupComplete = function( isStartupComplete ) {
    _isStartupComplete = isStartupComplete;
};

/**
 * Check if the {HostQueryHandler} is registed in hosting configuration for the given ID .
 * 
 * @param {String} queryId - ID of the {HostQueryHandler} to return. 
 * @returns {boolean} - if query handler is registered given query ID  
 */
export let isQueryHandled = function( queryId ) { 
    var hostingConfig = cfgSvc.getCfgCached( 'hosting' );

    var handlerInfo = hostingConfig.queries[ queryId ];

    if( handlerInfo ) {
        if ( handlerInfo.constructor ) {      
            return true;
        }
    }
    return false;
};

/**
 * Load client-side 'service' and 'proxy' information from the 'hosting.json' configuration definitions into
 * the structures of this service.
 *
 * @returns {StringArray} Array of module names to load before host configuration is complete.
 */
export let loadClientConfiguration = function() {
    /**
     * Load the light-weight knowledge of all the client-side services and proxies that have been
     * contributed.
     * <P>
     * Note: The actual implementing modules will only be loaded and initialized later if needed. However,
     * we need to know about them now so that they are included in the 'handshake' with the host.
     */
    var hostingConfig = cfgSvc.getCfgCached( 'hosting' );

    assert( !_.isEmpty( hostingConfig ), 'Hosting configuration is missing' );

    var initialModulesToLoad = [];

    _.forEach( hostingConfig.initialModules, function( moduleDef ) {
        _.forEach( moduleDef.services, function( serviceDef ) {
            exports.clientServices.push( _getServiceDescriptor( serviceDef ) );
        } );

        _.forEach( moduleDef.proxies, function( serviceDef ) {
            exports.clientProxies.push( _getServiceDescriptor( serviceDef ) );
        } );

        initialModulesToLoad.push( moduleDef.module );
    } );

    _.forEach( hostingConfig.postHandshakeModules, function( moduleDef ) {
        _.forEach( moduleDef.services, function( serviceDef ) {
            exports.clientServices.push( _getServiceDescriptor( serviceDef ) );
        } );

        _.forEach( moduleDef.proxies, function( serviceDef ) {
            exports.clientProxies.push( _getServiceDescriptor( serviceDef ) );
        } );
    } );

    /**
     * Create empty maps to hold optional selection contributions (and other handlers).
     */
    var hostingState = {
        map_ref_type_to_factory: {}, // IInteropObjectTypeFactory
        map_ref_type_to_encoder: {}, // IInteropObjectRefEncoder
        map_selection_type_to_handler: {}, // ISelectionTypeHandler
        map_selection_type_to_parser: {} // ISelectionObjectParser
    };

    appCtxSvc.ctx.aw_hosting_state = hostingState;

    return initialModulesToLoad;
};

/**
 * Set whether the 'client' and 'host' have sucessfully completed all phases of the startup and can interact
 * freely.
 *
 * @memberof hostInteropService
 *
 * @return {Boolean} TRUE if the 'client' and 'host' have sucessfully completed all phases of the startup
 * and can interact freely.
 */
export let isStartupComplete = function() {
    return _isStartupComplete;
};

/**
 * Set the encoding API to use with SOA.
 *
 * @param {Function} encodingApi - (Optional) GWT-side Function to call to encode/decode SOA message
 * contents.
 */
export let setEncodingAPI = function( encodingApi ) {
    if( appCtxSvc.ctx.aw_hosting_state ) {
        appCtxSvc.ctx.aw_hosting_state.soa_encodingApi = encodingApi;
    }
};

/**
 * @returns {Boolean} TRUE if using 'remote hosting' APIs instead of browser global functions.
 */
export let isRemoteHostingEnabled = function() {
    return _isRemoteHostingEnabled;
};

/**
 * @returns {Boolean} TRUE if using 'Post Message' APIs instead of browser global functions.
 */
export let isPostMessageEnabled = function() {
    return _isPostMessageEnabled;
};

export let getHostConfig = function() {
    return _hostConfig;
};

export let getSessionInfo = function() {
    return _sessionInfo;
};


/**
 * ****************************************************************************************************************<BR>
 * This section sets the well defined "Global" (or SIO) functions that form the basis of the Hosting Interop
 * Equivalent to the HostAPI methods on the host-side.<BR>
 * <P>
 * Note: Prefixed with 'splmInterop_'
 * ****************************************************************************************************************
 */
/**
 * Function that 'Pings' the client-side and allows the version of the host to be set.
 *
 * @param {String} hostVersion - String describing the specific version of the host-side APIs.
 * @returns {String} String describing the specific version of the client-side APIs.
 */
var splmInterop_Ping = function( hostVersion ) {
    if( hostVersion ) {
        exports.hostversion = hostVersion;
    }

    return exports.version;
};

/**
 * Function called when the host-side has an updated list of supported services it wants the client-side to
 * know about.
 * <P>
 * Note: This function can be called multiple times with new services that should be added to the list.
 *
 * @param {String} action - (Ignored)
 * @param {String} jsonList - JSON encoded string containing an array of service descriptors to set.
 * @param {String} sendList - Send an updated list of client side supported services back
 * @returns {String} Either 'OK' or the JSON encoded details of any exception that may have occurred during
 *          processing.
 */
var splmInterop_HostServiceListUpdate = function( action, jsonList, sendList ) {
    try {
        var list = JSON.parse( jsonList );

        for( var i = 0; i < list.length; i += 1 ) {
            exports.hostServices.push( exports.cloneServiceDescriptor( list[ i ] ) );
        }

        if( _debug_logHostCallsToClient || _debug_logHostCallsToClientDetails ) {
            exports.log( 'Host->Client' + ' (' + 'splmInterop_HostServiceListUpdate' + '):' + '\n' +
                'payload:' + '\n' + JSON.stringify( list, null, 2 ) );
        }

        /**
         * Now that the host has set its services, make sure we check the support for SOA later.
         */
        appCtxSvc.ctx.aw_hosting_soa_support_checked = false;

        if( sendList ) {
            var entries = exports.clientServices;

            // window.alert("host call to RequestWebServiceList len: "+entries.length);

            if( _debug_logHostCallsToClient || _debug_logHostCallsToClientDetails ) {
                exports.log( 'Host->Client' + ' (' + 'splmHost_WebSideServiceListUpdate' + '):' + '*** Response ***' + '\n' +
                    JSON.stringify( entries, null, 2 ) );
            }

            var result = JSON.stringify( entries );
            if ( _isPostMessageEnabled ) {
                var msgObj = {
                    bioFunction: 'splmHost_WebSideServiceListUpdate',
                    payLoad: result
                };

                // NOTE: We must use target origin "*" for file: URLs, such as the one in the Adobe extension
                // Address coverity issue. Since we don't use postMessage for adobe/AW integration from 6.1,
                // just use "/" to restrict to the same orgin
                parent.postMessage( msgObj, '/' );
            } else {
                var hostWnd = _getHostWindowSync( window, 0 );

                assert( hostWnd, 'Unable to locate host window. Please check for a cross-site scripting error.' );

                hostWnd.splmHost_WebSideServiceListUpdate( result );
            }
        }
    } catch ( ex ) {
        return exports.getJsonForException( ex );
    }

    return 'OK'; // some ACK
};

/**
 * Function called when the host-side wishes to know what client-side services are available.
 * <P>
 * Note: Called during the initial host-to-client handshake. If there are any 'clientServices' entries, send
 * them back to the caller.
 *
 * @returns {String} JSON encoded array of client-side service descriptors.
 */
var splmInterop_RequestWebServiceList = function() {
    var entries = exports.clientServices;

    // window.alert("host call to RequestWebServiceList len: "+entries.length);

    if( _debug_logHostCallsToClient || _debug_logHostCallsToClientDetails ) {
        exports.log( 'Host->Client' + ' (' + 'splmInterop_RequestWebServiceList' + '):' + '*** Response ***' + '\n' +
            JSON.stringify( entries, null, 2 ) );
    }

    return JSON.stringify( entries );
};

/**
 * Function used to invoke a registered client-side service method. Attempts to match the requested
 * descriptor with the registered service descriptors. Dispatches the payload to the associated service
 * handler.
 *
 * @param {String} descJson - JSON string with the service's descriptor.
 *
 * @param {String} payload - JSON string with the input to the service (if any).
 *
 * @returns {String} The JSON encoded string of any value returned by the method or that of any exception
 *          thrown during execution of the service.
 */
var splmInterop_WebMethod = function( descJson, payload ) {
    /**
     * Dispatch the incoming Method request to one of the registered services
     */
    try {
        var serviceDesc = JSON.parse( descJson );

        if( serviceDesc ) {
            var clientSvcToCall;

            _.forEach( exports.clientServices, function( clientSvc ) {
                if( clientSvc.FQN === serviceDesc.FQN && clientSvc.SvcVersion === serviceDesc.SvcVersion &&
                    clientSvc.handleMethodCall ) {
                    clientSvcToCall = clientSvc;
                    return false;
                }
            } );

            if( clientSvcToCall ) {
                _logCallActivity( 'Host->Client', 'splmInterop_WebMethod', serviceDesc, payload );

                var response = clientSvcToCall.handleMethodCall( payload );

                _logCallActivityResponse( 'Host->Client', 'splmInterop_WebMethod', serviceDesc, response );

                return response;
            }
        }

        // if we get this far, there was no entry to invoke
        throw exports.createExceptionInfo( 'InternalError', 'No service available for: ' + descJson );
    } catch ( ex ) {
        return exports.getJsonForException( ex );
    }
}; // splmInterop_WebMethod

/**
 * Function used to invoke a registered client-side service event. Attempts to match the requested
 * descriptor with the registered service descriptors. Dispatches the payload to the associated service
 * handler.
 *
 * @param {String} descJson - JSON string with the service's descriptor.
 *
 * @param {String} payload - JSON string with the input to the service (if any).
 *
 * @returns {String} Either an empty string or the JSON encoded string of any exception thrown during
 *          execution of the service.
 */
var splmInterop_WebEvent = function( descJson, payload ) {
    try {
        var serviceDesc = JSON.parse( descJson );

        if( serviceDesc ) {
            var clientSvcToCall;

            _.forEach( exports.clientServices, function( clientSvc ) {
                if( clientSvc.FQN === serviceDesc.FQN && clientSvc.SvcVersion === serviceDesc.SvcVersion &&
                    clientSvc.handleEventCall ) {
                    clientSvcToCall = clientSvc;
                    return false;
                }
            } );

            if( clientSvcToCall ) {
                _logCallActivity( 'Host->Client', 'splmInterop_WebEvent', serviceDesc, payload );

                var response = clientSvcToCall.handleEventCall( payload );

                // _logCallActivityResponse( 'Host->Client', 'splmInterop_WebEvent', serviceDesc, response
                // );

                if( response ) {
                    return response;
                }

                return ''; // happy path, empty string
            }
        }

        // if we get this far, there was no entry to invoke
        throw exports.createExceptionInfo( 'InternalError', 'No service available for: ' + descJson );
    } catch ( ex ) {
        return exports.getJsonForException( ex );
    }
};

export default exports = {
    title,
    version,
    hostversion,
    hostServices,
    clientServices,
    clientProxies,
    log,
    createExceptionInfo,
    cloneServiceDescriptor,
    createServiceDescriptor,
    isRemoteHostingSupported,
    startHostHandShake,
    callHostMethod,
    callHostMethodAsync,
    callHostEvent,
    findClientProxy2,
    findClientProxy,
    findClientService2,
    findClientService,
    getJsonForException,
    isClientServiceAvailable,
    registerClientService,
    isHostServiceAvailable,
    isHostAuthorizationEnabled,
    isQueryHandled,
    getCanTalkWithHost,
    getHostingScope,
    setStartupComplete,
    loadClientConfiguration,
    isStartupComplete,
    setEncodingAPI,
    isRemoteHostingEnabled,
    isPostMessageEnabled,
    getHostConfig,
    getSessionInfo
};
