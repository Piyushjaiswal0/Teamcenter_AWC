// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/bootstrap/services/hostSoa_2014_02
 * @namespace hostSoa_2014_02
 */
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import hostFactorySvc from 'js/hosting/hostFactoryService';
import hostConfigSvc from 'js/hosting/hostConfigService';
import hostInteropSvc from 'js/hosting/hostInteropService';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import logger from 'js/logger';
import hostServices from 'js/hosting/hostConst_Services';
import hostConfigKeys from 'js/hosting/hostConst_ConfigKeys';
import hostUtils from 'js/hosting/hostUtils';

var urlAttrs = browserUtils.getUrlAttributes();

/**
 * {Boolean} TRUE if SOA basic request/response details should be logged.
 * <P>
 * Note: This can be 'a little' NOISY. Use sparingly.
 */
var _debug_logHostSoaActivity = urlAttrs.logHostSoaActivity !== undefined;

/**
 * {Boolean} TRUE if SOA request/response details should be logged.
 * <P>
 * Note: This can be VERY NOISY. Use sparingly.
 */
var _debug_logHostSoaActivityDetails = urlAttrs.logHostSoaActivityDetails !== undefined;

/**
 * {Boolean} TRUE if 'raw' SOA response details should be logged (i.e. the string exactly as it arrived from
 * the host).
 * <P>
 * Note: This can be VERY NOISY. Use sparingly.
 */
var _debug_logHostSoaActivityRaw = urlAttrs.logHostSoaActivityRaw !== undefined;

/**
 * Map of ID of an SOA request and the 'deferred' being used to track the request's lifecycle.
 *
 * @private
 */
var _mapCacheId2Deferred = {};


/**
 * {Function} GWT-side Function to call to encode/decode SOA message contents.
 */
var _encodingApi;

/**
 * {String} What encoding to use for JSON payloads being sent to (or returned from) the host.
 *
 * <PRE>
 * hostConst_Services.VERSION_2014_02 - Use older BASE64 encoding
 * hostConst_Services.VERSION_2014_07 - Use newer BASE64 encoding (compatible with JavaScript 'atob' and 'btoa')
 * hostConst_Services.VERSION_2015_10 - Use no encoding
 * </PRE>
 */
var _encodingVersion;

/**
 * @private
 */
var _internalCount = 1;

/**
 * Called by the client to have the host process a SOA call
 *
 * @see SoaJsonRequestSvc
 */
var SOA_REQUEST_SERVICE = hostInteropSvc.createServiceDescriptor(
    hostServices.HS_ASYNC_SOA_JSON_MESSAGE_SVC,
    hostServices.VERSION_2014_02 );

/** Response service description */
var SOA_RESPONSE_SERVICE_JSON = JSON.stringify( hostInteropSvc.createServiceDescriptor(
    hostServices.CS_SOA_JSON_REQUEST_SVC,
    hostServices.VERSION_2014_02 ) );

/**
 * Called by the client to have the host reauthentication
 *
 * @see RequestHostAuthReplySvc
 */
var REQUEST_HOST_AUTH_SERVICE = hostInteropSvc.createServiceDescriptor(
    hostServices.HS_REQUEST_HOST_AUTH_SVC,
    hostServices.VERSION_2014_02 );

/** Response service description */
var HOST_AUTH_RESPONSE_SERVICE_JSON = JSON.stringify( hostInteropSvc.createServiceDescriptor(
    hostServices.CS_REQUEST_HOST_AUTH_REPLY_SVC,
    hostServices.VERSION_2014_02 ) );
    
/**
 * {Boolean} TRUE if we have encountered use of the older SOA encoding methods and that we have logged this
 * as a warning.
 */
var _debug_possibleEncoderMismatchReported;

/**
 * Determine which encoing method to use based on host config options.
 *
 * @returns {String} Message encoding to use.
 */
function _getResponseEncodingVersion() {
    if( !_encodingVersion ) {
        /**
         * Set the options in this service based on the given config.
         */
        if( hostConfigSvc.getOption( hostConfigKeys.USE_2015_10_SOA ) ) {
            _encodingVersion = hostServices.VERSION_2015_10;
        } else if( hostConfigSvc.getOption( hostConfigKeys.USE_2014_07_SOA ) ) {
            _encodingVersion = hostServices.VERSION_2014_07;
        } else {
            _encodingVersion = hostServices.VERSION_2014_02;
        }
    }
    return _encodingVersion;
}

/**
 * @param {String} sourceVersion - Encoding version of the input.
 * @param {String} soaResponse - The 'raw' SOA response to decode.
 *
 * @return {String} Decoded soa response.
 */
function _decodeSoaResponse( sourceVersion, soaResponse ) {
    var soaResponseJSON = hostUtils.decodeEmbeddedJson( soaResponse );

    if( !_debug_possibleEncoderMismatchReported ) {
        _debug_possibleEncoderMismatchReported = true;

        logger.warn( 'hostSoa_2014_02: ' + '_decodeSoaResponse: ' + 'Encoding API not set: ' + sourceVersion + '\n' +
            'Using common base64 encoding instead.' + '\n' +
            'Note: For improved speed and stability the host should use VERSION_2015_10 style SOA responses' );
    }

    if( _debug_logHostSoaActivity || _debug_logHostSoaActivityDetails ) {
        if( _debug_logHostSoaActivity ) {
            logger.info( 'hostSoa_2014_02: ' + '_decodeSoaResponse: ' + 'soaResponseJSON: (length)' + soaResponseJSON.length );
        } else {
            logger.info( 'hostSoa_2014_02: ' + '_decodeSoaResponse: ' + '\n' +
                'Decoded soaResponseJSON: ' + '\n' +
                soaResponseJSON );
        }
    }

    return soaResponseJSON;
}

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostSessionInfoResponseMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends info via {@link HostSessionInfoProxy}.
 *
 * @constructor
 * @memberof hostSoa_2014_02
 */
var HostSessionInfoResponseMsg = function() {
    /**
     * Get value.
     *
     * @return {Boolean} IsSessionActive value.
     */
    this.getIsSessionActive = function() {
        return _.get( this, 'IsSessionActive', null );
    };

    /**
     * Get value.
     *
     * @return {String} UserName value.
     */
    this.getUserName = function() {
        return _.get( this, 'UserName', null );
    };

    /**
     * Access to the IsSessionActive property
     *
     * @param {Boolean} resp - IsSessionActive value.
     */
    this.setIsSessionActive = function( resp ) {
        this.IsSessionActive = resp;
    };

    /**
     * Access to the UserName property
     *
     * @param {String} name - UserName value.
     */
    this.setUserName = function( name ) {
        if( name ) {
            this.UserName = name;
        }
    };
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostSessionInfoProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Called by the client to have the host return its session information
 *
 * @constructor
 * @memberof hostSoa_2014_02
 * @extends hostFactoryService.BaseCallableService
 */
var HostSessionInfoProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_HOST_SESSION_INFO_SVC,
        hostServices.VERSION_2014_02 );
};

HostSessionInfoProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Call host to return session information.
 *
 * @function callHostMethod
 * @memberof hostSoa_2014_02.HostSessionInfoProxy
 *
 * @return {HostSessionInfoResponseMsg} Current host session info.
 */
HostSessionInfoProxy.prototype.callHostMethod = function() {
    var reply = this._invokeHostMethod();

    if( reply ) {
        return JSON.parse( reply );
    }

    return {};
};

/**
 * Call host to return session information.
 *
 * @function callHostMethodAsync
 * @memberof hostSoa_2014_02.HostSessionInfoProxy
 *
 * @returns {Promise} Resolved with the {HostSessionInfoResponseMsg} result from the 'host'.
 */
HostSessionInfoProxy.prototype.callHostMethodAsync = function() {
    return this._invokeHostMethodAsync.then( function( reply ) {
        if( reply ) {
            return JSON.parse( reply );
        }

        return {};
    } );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// SoaJsonResponseMessage
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Class used to communicate the response of an SOA service call.
 *
 * @constructor
 * @memberof hostSoa_2014_02
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var SoaJsonResponseMessage = function( jsonData ) {
    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

/**
 * Get current value.
 *
 * @memberof hostSoa_2014_02.SoaJsonResponseMessage
 *
 * @returns {String} version - The 'sending' version of this message since the interpretation of the
 *            contents (or the intended results) can vary based on the version of the sender (e.g.
 *            _2014_02).
 */
SoaJsonResponseMessage.prototype.getVersion = function() {
    return _.get( this, 'Version', null );
};

/**
 * Get current value.
 *
 * @memberof hostSoa_2014_02.SoaJsonResponseMessage
 *
 * @returns {String} cacheId - The client-side generated ID used (by the client-side) to associated the
 *            response back to the specific code requesting the SOA operation processing.
 */
SoaJsonResponseMessage.prototype.getCacheId = function() {
    return _.get( this, 'CacheId', null );
};

/**
 * Get current value.
 *
 * @memberof hostSoa_2014_02.SoaJsonResponseMessage
 *
 * @returns {String} soaResponse - The 'encoded' response string from the SOA operation.
 */
SoaJsonResponseMessage.prototype.getSoaResponse = function() {
    return _.get( this, 'SoaResponse', null );
};

/**
 * Get current value.
 *
 * @memberof hostSoa_2014_02.SoaJsonResponseMessage
 *
 * @returns {ExceptionInfo} exception - An Object with the 'name' and 'message' properties set for any error
 *            that occurred during the operation.
 */
SoaJsonResponseMessage.prototype.getException = function() {
    return _.get( this, 'Exception', null );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// SoaJsonRequestMessage
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Message sent from the client-side to be processed by the host-side.
 *
 * @constructor
 * @memberof hostSoa_2014_02
 *
 * @param {String} version - The 'sending' version of this message since the interpretation of the contents
 *            (or the intended results) can vary based on the version of the sender (e.g. _2014_02).
 * @param {String} cacheId - The client-side generated ID used (by the client-side) to associated the
 *            response back to the specific code requesting the SOA operation processing.
 * @param {String} replyServiceDescriptor - JSON encoded string of the client-side service descriptor to
 *            send the response to.
 * @param {String} serviceName - Name of the SOA service to invoke.
 * @param {String} operationName - Name of the operation in the service to invoke.
 * @param {String} message - JSON encoded string of the 'message' (i.e. input parameters) to provide to the
 *            operation.
 *
 * <pre>
 * Example:
 * {
 *     'header': {
 *         'state': {
 *             'clientID': 'ActiveWorkspaceClient',
 *             'clientVersion': '10000.1.2',
 *             'logCorrelationID': '-3',
 *             'stateless': true,
 *             'group': 'Engineering',
 *             'role': 'Designer',
 *             'formatProperties': true,
 *             'locale': 'en_US'
 *         },
 *         'policy': {
 *             ...Property Poloicy...
 *         }
 *     },
 *     'body': {
 *         ...Input to Operation...
 *     }
 * }
 * </pre>
 */
var SoaJsonRequestMessage = function( version, cacheId, replyServiceDescriptor, serviceName, operationName, message ) {
    this.Version = version;
    this.CacheId = cacheId;
    this.ReplyServiceDescriptor = replyServiceDescriptor;
    this.ServiceName = serviceName;
    this.OperationName = operationName;
    this.Message = message;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// SoaJsonRequestSvc
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This service supports async SOA Json requests thru a remote hosted service. There is a proxy method to
 * initiate the async request, and then this service receives the callback responses and will send that
 * response to the provided callback handler. Only the event portion of this service is supported.
 *
 * @constructor
 * @memberof hostSoa_2014_02
 * @extends hostFactoryService.BaseCallableService
 */
var SoaJsonRequestSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_SOA_JSON_REQUEST_SVC,
        hostServices.VERSION_2014_02 );
};

SoaJsonRequestSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * This function is called by the client-side service (SoaJsonRequestSvc) to resolve a previous call to
 * 'post' to access SOA service operations.
 * <P>
 * Note: This is the service invocation trigger from the host.
 *
 * @function handleIncomingEvent
 * @memberof hostSoa_2014_02.SoaJsonRequestSvc
 *
 * @param {String} jsonData - JSON encoding of a SoaJsonResponseMessage object.
 */
SoaJsonRequestSvc.prototype.handleIncomingEvent = function( jsonData ) {
    if( _debug_logHostSoaActivityRaw ) {
        logger.info( 'hostSoa_2014_02: ' + 'handleIncomingEvent: ' +
            'jsonData (RAW): length: ' + jsonData.length + ' lastChar: ' + jsonData[ jsonData.length - 1 ] + '\n' +
            jsonData );
    }

    var msg = exports.createSoaJsonResponseMessage( jsonData );

    var cacheId = msg.getCacheId();

    var mapObject = _mapCacheId2Deferred[ cacheId ];

    /**
     *
     */
    var logServiceDetails = false;
    var qname;

    if( _debug_logHostSoaActivity || _debug_logHostSoaActivityDetails ) {
        var diff = mapObject ? diff = Date.now() - mapObject.postTime : 0;

        qname = msg.getSoaResponse()[ '.QName' ];

        if( qname && qname.length > 7 ) {
            qname = qname.substring( 7 );
        }

        logServiceDetails = qname !== 'fnd0.com/Schemas/Internal/Notification/2015-10/MessageManagement.Java.lang.Class';

        if( _debug_logHostSoaActivity && logServiceDetails ) {
            logger.info( 'hostSoa_2014_02: ' + 'handleIncomingEvent: ' +
                '.QName=' + qname + ' ' +
                'cacheId=' + cacheId + ' ' + 'time=' + diff + ' ms' );
        }
    }

    /**
     *
     */
    if( mapObject ) {
        delete _mapCacheId2Deferred[ cacheId ];

        var deferred = mapObject.deferred;

        if( _debug_logHostSoaActivityDetails && logServiceDetails ) {
            /**
             * Setup to report resolve/reject result.
             */
            deferred.promise.then( function( response ) {
                var responseLogObj = response;

                if( qname === 'awp0.com/Schemas/Internal/AWS2/2016-12/DataManagement.GetDeclarativeStyleSheetResponse' &&
                    response.declarativeUIDefs &&
                    response.declarativeUIDefs.length > 0 ) {
                    responseLogObj = _.cloneDeep( response );

                    responseLogObj.declarativeUIDefs[ 0 ].viewModel = JSON.parse( responseLogObj.declarativeUIDefs[ 0 ].viewModel );
                } else if( qname === 'awp0.com/Schemas/Internal/AWS2/2017-12/Finder.SearchResponse4' && response.searchResultsJSON ) {
                    responseLogObj = _.cloneDeep( response );

                    responseLogObj.searchResultsJSON = JSON.parse( responseLogObj.searchResultsJSON );
                }

                logger.info( 'hostSoa_2014_02: ' + 'handleIncomingEvent: ' + '.QName=' + qname + ' ' +
                    'cacheId=' + cacheId + ' ' + 'time=' + diff + 'ms' + '\n' + 'Resolved' + '\n' +
                    JSON.stringify( responseLogObj, null, 2 ) );
            }, function( err ) {
                logger.info( 'hostSoa_2014_02: ' + 'handleIncomingEvent: ' + '.QName=' + qname + ' ' +
                    'cacheId=' + cacheId + ' ' + '\n' + 'Rejected: ' + err );
            } );
        }

        if( msg.getException() ) {
            deferred.reject( msg.getException().message );
        } else {
            var soaResponseJSON;
            var soaResponseObj;

            var sourceVersion = msg.getVersion();
            var soaResponse = msg.getSoaResponse();

            if( sourceVersion === hostServices.VERSION_2014_02 ) {
                if( _encodingApi ) {
                    soaResponseJSON = _encodingApi( soaResponse, true );
                    soaResponseObj = JSON.parse( soaResponseJSON );
                } else {
                    soaResponseJSON = _decodeSoaResponse( sourceVersion, soaResponse );
                    soaResponseObj = JSON.parse( soaResponseJSON );
                }
            } else if( sourceVersion === hostServices.VERSION_2014_07 ) {
                if( _encodingApi ) {
                    soaResponseJSON = _encodingApi( soaResponse, false );
                    soaResponseObj = JSON.parse( soaResponseJSON );
                } else {
                    soaResponseJSON = _decodeSoaResponse( sourceVersion, soaResponse );
                    soaResponseObj = JSON.parse( soaResponseJSON );
                }
            } else if( sourceVersion === hostServices.VERSION_2015_10 ) {
                soaResponseObj = soaResponse;
            } else {
                deferred.reject( 'Unsupported response encoding: ' + sourceVersion );
            }

            if( soaResponseObj ) {
                deferred.resolve( soaResponseObj );
            } else {
                deferred.reject( 'No reponse object resulted: ' + sourceVersion );
            }
        }
    } else {
        logger.warn( 'hostSoa_2014_02: ' + 'handleIncomingEvent: ' + 'No matching pending response found' + ' cacheId=' + cacheId );
    }

    /**
     * Check if there are any previous requests that have not been resolved within a reasonable amount of
     * time.
     */
    if( !_.isEmpty( _mapCacheId2Deferred ) ) {
        var keys = Object.keys( _mapCacheId2Deferred );

        var postCutoff = Date.now() - 300000; // Ignore requests >300 seconds old.

        _.forEach( keys, function( key ) {
            if( _mapCacheId2Deferred[ key ].postTime < postCutoff ) {
                delete _mapCacheId2Deferred[ key ];
            }
        } );
    }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// RequestHostAuthResponseMessage
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Class used to communicate the response of Request host authentication.
 *
 * @constructor
 * @memberof hostSoa_2014_02
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
 var RequestHostAuthResponseMessage = function( jsonData ) {
    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

/**
 * Get cache id value.
 *
 * @memberof hostSoa_2014_02.RequestHostAuthResponseMessage
 *
 * @returns {String} cacheId - The client-side generated ID used (by the client-side) to associated the
 *            response back to the specific code requesting the SOA operation processing.
 */
 RequestHostAuthResponseMessage.prototype.getCacheId = function() {
    return _.get( this, 'CacheId', null );
};

/**
 * Get exception value.
 *
 * @memberof hostSoa_2014_02.RequestHostAuthResponseMessage
 *
 * @returns {ExceptionInfo} exception - An Object with the 'name' and 'message' properties set for any error
 *            that occurred during the operation.
 */
 RequestHostAuthResponseMessage.prototype.getException = function() {
    return _.get( this, 'Exception', null );
};

/**
 * Get authentication successful verdict
 *
 * @memberof hostSoa_2014_02.RequestHostAuthResponseMessage
 *
 * @returns {Boolean} IsAuthenticated - An Object with the 'name' and 'message' properties set if host 
 *            is authenticated
 */
 RequestHostAuthResponseMessage.prototype.getIsAuthenticated = function() {
    return _.get( this, 'IsAuthenticated', null );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// RequestHostAuthRequestMessage
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var RequestHostAuthRequestMessage = function( version, cacheId, replyServiceDescriptor ) {
    this.Version = version;
    this.CacheId = cacheId;
    this.ReplyServiceDescriptor = replyServiceDescriptor;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// RequestHostAuthReplyProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This service supports async request host reauthentication requests thru a remote
 * hosted service. There is a proxy method to initiate the async request, and then
 * this service receives the callback responses and will send that response to the
 * provided callback handler. Only the event portion of this service is supported.
 *
 * @constructor
 * @memberof hostSoa_2014_02
 * @extends hostFactoryService.BaseCallableService
 */
 var RequestHostAuthReplySvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_REQUEST_HOST_AUTH_REPLY_SVC,
        hostServices.VERSION_2014_02 );
};

RequestHostAuthReplySvc.prototype = hostFactorySvc.extendCallableService();

RequestHostAuthReplySvc.prototype.handleIncomingEvent = function( jsonData ) {
    var msg = exports.createRequestHostAuthResponseMessage( jsonData );
    var cacheId = msg.getCacheId();

    var mapObject = _mapCacheId2Deferred[ cacheId ];

    if ( mapObject ) {
        delete _mapCacheId2Deferred[ cacheId ];
        var deferred = mapObject.deferred;
        if( msg.getException() ) {
            deferred.reject( msg.getException().message );
        } else {
            var hostAuthResponseObj =  msg.getIsAuthenticated();
            if ( hostAuthResponseObj ) {
                deferred.resolve ( hostAuthResponseObj );
            } else {
                deferred.reject ( 'No response from host');
            }
        }
    } else {
        logger.error( 'hostSoa_2014_02: ' + 'handleHostAuthIncomingEvent: ' + 'No matching pending response found' + ' cacheId=' + cacheId );
    }

    /**
     * Check if there are any previous requests that have not been resolved within a reasonable amount of
     * time.
     */
     if( !_.isEmpty( _mapCacheId2Deferred ) ) {
        var keys = Object.keys( _mapCacheId2Deferred );

        var postCutoff = Date.now() - 300000; // Ignore requests >300 seconds old.

        _.forEach( keys, function( key ) {
            if( _mapCacheId2Deferred[ key ].postTime < postCutoff ) {
                delete _mapCacheId2Deferred[ key ];
            }
        } );
    }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Create new host-to-client-side service
 *
 * @memberof hostSoa_2014_02
 *
 * @returns {SoaJsonRequestSvc} New instance of a 'SoaJsonRequestSvc' type object.
 */
export let createSoaJsonRequestSvc = function() {
    return new SoaJsonRequestSvc();
};

/**
 * Create new service response message.
 *
 * @memberof hostSoa_2014_02
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 *
 * @returns {SoaJsonResponseMessage} New instance of this object class.
 */
export let createSoaJsonResponseMessage = function( jsonData ) {
    return new SoaJsonResponseMessage( jsonData );
};

/**
 * Create new host-to-client-side service
 *
 * @memberof hostSoa_2014_02
 *
 * @returns {RequestHostAuthReplySvc} New instance of a 'RequestHostAuthReplySvc' type object.
 */
export let createRequestHostAuthReplySvc = function() {
    return new RequestHostAuthReplySvc();
};

/**
 * Create new service response message.
 *
 * @memberof hostSoa_2014_02
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 *
 * @returns {SoaJsonResponseMessage} New instance of this object class.
 */
export let createRequestHostAuthResponseMessage = function( jsonData ) {
    return new RequestHostAuthResponseMessage( jsonData );
};

/**
 * Create new client-side-to-host proxy.
 *
 * @memberof hostSoa_2014_02
 *
 * @returns {HostSessionInfoProxy} New instance of this object class.
 */
export let createHostSessionInfoProxy = function() {
    return new HostSessionInfoProxy();
};

/**
 * Create new service response message.
 *
 * @memberof hostSoa_2014_02
 *
 * @returns {HostSessionInfoResponseMsg} New instance of this object class.
 */
export let createHostSessionInfoResponseMsg = function() {
    return new HostSessionInfoResponseMsg();
};

/**
 * Call SOA service.
 *
 * @memberof hostSoa_2014_02
 *
 * @param {String} serviceName - Name of the SOA service to invoke.
 *
 * @param {String} operationName - Name of the operation in the service to invoke.
 *
 * @param {Object} messageObj - Object containing the 'header' and 'body' properties of the input to the given
 *            operation.
 *
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its
 *          response data is available.
 */
export let post = function( serviceName, operationName, messageObj ) {
    var deferred = AwPromiseService.instance.defer();

    var now = new Date();
    var nextId = _internalCount++;
    var cacheId = nextId.toString() + '_' + now.getTime();

    /**
     * Set the deferred to be resolved when the SOA operation with the given ID is handled.
     */
    _mapCacheId2Deferred[ cacheId ] = {
        postTime: Date.now(),
        deferred: deferred
    };

    var soaMessage = new SoaJsonRequestMessage( _getResponseEncodingVersion(), cacheId,
        SOA_RESPONSE_SERVICE_JSON, serviceName, operationName, JSON.stringify( messageObj ) );

    if( _debug_logHostSoaActivity || _debug_logHostSoaActivityDetails ) {
        if( operationName !== 'getUnreadMessages' ) {
            if( _debug_logHostSoaActivity ) {
                logger.info( 'hostSoa_2014_02: ' + 'post: ' + 'serviceName=' + serviceName + ' ' + 'operationName=' + operationName + ' ' + 'cacheId=' + cacheId );
            } else {
                var jsonObj = _.clone( messageObj );
                delete jsonObj.header;
                logger.info( 'hostSoa_2014_02: ' + 'post: ' + 'serviceName=' + serviceName + ' ' + 'operationName=' + operationName + ' ' + 'cacheId=' + cacheId + '\n' +
                    'Message=' + '\n' +
                    JSON.stringify( jsonObj, null, 2 ) );
            }
        }
    }

    hostInteropSvc.callHostEvent( SOA_REQUEST_SERVICE, JSON.stringify( soaMessage ) );

    return deferred.promise.then( function( data ) {
        return data;
    }, function() {
        delete _mapCacheId2Deferred[ cacheId ];

        throw new Error('Post to ' + serviceName + ':' + operationName + ' Failed' + '\n' + messageObj );
    } );
};

/**
 * Request host authentication service.
 *
 * @memberof hostSoa_2014_02
 *
 * @returns {Promise} This promise will be 'resolved' as true for successful authentication or 'rejected' 
 *          when host auththe service is failed
 */
export let requestHostAuthentication = function () {
    var deferred = AwPromiseService.instance.defer();

    var now = new Date();
    var nextId = _internalCount++;
    var cacheId = nextId.toString() + '_'+ now.getTime();

    _mapCacheId2Deferred[ cacheId ] = {
        postTime: Date.now(),
        deferred:deferred
    };

    var requestHostAuthMessage = new RequestHostAuthRequestMessage ( _getResponseEncodingVersion(), cacheId,  HOST_AUTH_RESPONSE_SERVICE_JSON );

    hostInteropSvc.callHostEvent ( REQUEST_HOST_AUTH_SERVICE, JSON.stringify( requestHostAuthMessage ) );

    return deferred.promise.then ( function (data ) {
        return data;
    }, function () {
        delete _mapCacheId2Deferred[ cacheId ];
        throw new Error ( 'Request Host Authentication Failed' );
    } );
};

/**
 * This function is called by the client-side service to resolve a previous 'post' event.
 *
 * @memberof hostSoa_2014_02
 *
 * @param {SoaJsonResponseMessage} responseMsg - Message object returned by the 'post'
 */
export let handleMethodResponse = function( responseMsg ) {
    logger.info( 'handleMethodResponse: ' + responseMsg );
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostSoa_2014_02
 */
export let registerHostingModule = function() {
    exports.createSoaJsonRequestSvc().register();
    exports.createRequestHostAuthReplySvc().register();

    var encodingApi = appCtxSvc.ctx.aw_hosting_state.soa_encodingApi;

    if( encodingApi ) {
        _encodingApi = encodingApi;
    }
};

export default exports = {
    createSoaJsonRequestSvc,
    createRequestHostAuthReplySvc,
    createSoaJsonResponseMessage,
    createRequestHostAuthResponseMessage,
    createHostSessionInfoProxy,
    createHostSessionInfoResponseMsg,
    post,
    requestHostAuthentication,
    handleMethodResponse,
    registerHostingModule
};
