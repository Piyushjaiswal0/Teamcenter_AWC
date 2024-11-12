// Copyright (c) 2022 Siemens
/* eslint-disable no-await-in-loop */

/**
 * @module js/hosting/sol/services/hostQuery_2015_10
 * @namespace hostQuery_2015_10
 */
import { loadDependentModule } from 'js/moduleLoader';
import hostFactorySvc from 'js/hosting/hostFactoryService';
import hostQueryFactorySvc from 'js/hosting/hostQueryFactoryService';
import hostInteropSvc from 'js/hosting/hostInteropService';
import _ from 'lodash';
import logger from 'js/logger';
import hostServices from 'js/hosting/hostConst_Services';
import cfgSvc from 'js/configurationService';
import 'config/hosting';

/**
 * Data field prefix for integer data fields
 */
var PREFIX_INT = 'int:';

/**
 * Map of messageId to the {HostQueryHandler} regististed to handle it when the 'host' responds from an
 * async request.
 */
var _messageIdToResponseHandlerMap = {};

/**
 * Cache of hostQuery 'handlers'.
 */
var _map_query_to_handler = {};

/**
 * Data field prefix for boolean data fields
 */
var PREFIX_BOOLEAN = 'bool:';

/**
 * Data field prefix for string data fields
 */
var PREFIX_STRING = 'string:';

/**
 * Data field prefix for model object reference data fields
 */
var PREFIX_MODEL_OBJECT = 'modelobject:';

/**
 * UID field in a model object data field
 */
var MODEL_OBJECT_UID_FIELD = 'uid=';

/**
 * Object type field in a model object data field
 */
var MODEL_OBJECT_TYPE_FIELD = 'objectType=';

/**
 * Process json formatted query messages and return all responses.
 *
 * @param {String} jsonData - json formatted message
 *
 * @return {HostQueryMessageArray} query responses
 */
async function _processMessage( jsonData ) {
    var nativeMessage = exports.createMessageObject( jsonData );

    var parsedMessages = _buildResponsesFromNative( nativeMessage );

    var responseMessages = [];
    for ( const queryMessage of parsedMessages ) {
        // Check if the message is async query response.
        if( queryMessage.isResponseMessage ) {
            exports.handleQueryResponse( queryMessage );
        } else {
            const queryHandler = await exports.getQueryHandler( queryMessage.queryId );

            if( queryHandler ) {
                var queryResponseMessage = queryHandler.handleQuery( queryMessage );

                if ( queryResponseMessage ) {
                    responseMessages.push( queryResponseMessage );
                }
            } else {
                logger.warn( 'No query handler for host query id: ' + queryMessage.queryId );
            }
        }
    }

    return responseMessages;
}

/**
 * Build a new object based on given inputs.
 *
 * @param {HostQueryMessageNative} nativeMessage - native query response message
 *
 * @return {HostQueryMessageArray} query responses
 */
function _buildResponsesFromNative( nativeMessage ) {
    var responseMessages = [];

    var nativeQueries = nativeMessage.getQueries();

    _.forEach( nativeQueries, function( nativeQuery ) {
        var queryId = nativeQuery.QueryId;
        var messageId = nativeQuery.MessageId;
        var nativeDataObjects = nativeQuery.DataObjects;

        var hostQueryDataObjects = [];

        _.forEach( nativeDataObjects, function( nativeDataObject ) {
            var hostQueryData = _parseNativeDataFields( nativeDataObject.DataFields );

            hostQueryDataObjects.push( hostQueryData );
        } );

        var queryMessage = hostQueryFactorySvc.createMessage( queryId, messageId, false, hostQueryDataObjects );

        responseMessages.push( queryMessage );
    } );

    return responseMessages;
}

/**
 * Convert any prefixed values into native values.
 *
 * @param {PairArray} nativeDataFields - Data fields.
 *
 * @return {HostQueryData} Object created from the native data fields.
 */
function _parseNativeDataFields( nativeDataFields ) {
    var parsedDataFields = {};

    _.forEach( nativeDataFields, function( pair ) {
        var key = pair.Key;
        var value = pair.Value;

        var parsedKey;

        if( _.startsWith( key, PREFIX_BOOLEAN ) ) {
            parsedKey = key.substring( PREFIX_BOOLEAN.length );

            parsedDataFields[ parsedKey ] = value;
        } else if( _.startsWith( key, PREFIX_INT ) ) {
            parsedKey = key.substring( PREFIX_INT.length );

            parsedDataFields[ parsedKey ] = value;
        } else if( _.startsWith( key, PREFIX_STRING ) ) {
            parsedKey = key.substring( PREFIX_STRING.length );

            parsedDataFields[ parsedKey ] = value;
        } else if( _.startsWith( key, PREFIX_MODEL_OBJECT ) ) {
            parsedKey = key.substring( PREFIX_MODEL_OBJECT.length );

            var indexOfTypeField = value.indexOf( MODEL_OBJECT_TYPE_FIELD );
            var indexOfType = indexOfTypeField + MODEL_OBJECT_TYPE_FIELD.length;
            var indexOfUid = MODEL_OBJECT_UID_FIELD.length;

            var objectUid = value.substring( indexOfUid, indexOfTypeField );
            var objectType = value.substring( indexOfType );

            parsedDataFields[ parsedKey ] = hostQueryFactorySvc.createModelObject( objectUid, objectType );
        }
    } );

    return hostQueryFactorySvc.createData( parsedDataFields );
}

/**
 * Create a new {HostQueryDataObject} (a.k.a. 'native query data object') based on the given inputs.
 *
 * @param {HostQueryData} queryData - Query data to build native object from.
 *
 * @return {HostQueryDataObject} native query data object.
 */
function _buildNativeDataObject( queryData ) {
    var dataFields = [];

    _.forEach( queryData.dataFields, function( value, key ) {
        if( _.isBoolean( value ) ) {
            dataFields.push( {
                Key: PREFIX_BOOLEAN + key,
                Value: String( value )
            } );
        } else if( _.isNumber( value ) ) {
            dataFields.push( {
                Key: PREFIX_INT + key,
                Value: String( value )
            } );
        } else if( _.isString( value ) ) {
            dataFields.push( {
                Key: PREFIX_STRING + key,
                Value: value
            } );
        } else if( value.hasOwnProperty( 'objectUid' ) ) {
            dataFields.push( {
                Key: PREFIX_MODEL_OBJECT + key,
                Value: MODEL_OBJECT_UID_FIELD + value.objectUid +
                    MODEL_OBJECT_TYPE_FIELD + value.objectType
            } );
        }
    } );

    return exports.createDataObject( dataFields );
}

/**
 * Convert given 'service' format messages into 'native' format messages.
 *
 * @param {HostQueryMessageArray} queryMessages - Data object who's properties define data {in whatever form
 * the implementation is expecting) to process into a call to the host-side service.
 *
 * @returns {HostQueryMessageNative} New message object.
 */
function _buildNativeMessageResponse( queryMessages ) {
    var nativeMessage = exports.createMessageObject();

    _.forEach( queryMessages, function( queryMessage ) {
        var nativeData = [];

        _.forEach( queryMessage.queryData, function( queryDatum ) {
            nativeData.push( _buildNativeDataObject( queryDatum ) );
        } );

        var nativeQuery = exports.createQueryObject( queryMessage.queryId, nativeData );

        nativeQuery.setMessageId( queryMessage.messageId );
        nativeQuery.setIsResponseMessage( queryMessage.isResponseMessage );

        nativeMessage.addQuery( nativeQuery );
    } );

    return nativeMessage;
}

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostQuerySvc
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Service to handle queries coming from the host.
 *
 * @constructor
 * @memberof hostQuery_2015_10
 * @extends hostFactoryService.BaseCallableService
 */
var HostQuerySvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_INTEROPQUERY_SVC,
        hostServices.VERSION_2015_10 );
};

HostQuerySvc.prototype = hostFactorySvc.extendCallableService();

/**
 * This is an incoming call to this service trigger the related event handlers.
 *
 * @function handleIncomingEvent
 * @memberof hostQuery_2015_10.HostQuerySvc
 *
 * @param {String} jsondata - JSON encoded payload from the host.
 *
 * @returns {String} ...
 */
HostQuerySvc.prototype.handleIncomingMethod = function( jsondata ) {
    var response;

    try {
        if( jsondata ) {
            _processMessage( jsondata ).then ( (responseMessages) => {

                if( !_.isEmpty( responseMessages ) ) {
                    var nativeMessage = _buildNativeMessageResponse( responseMessages );

                    response = JSON.stringify( nativeMessage );
                    return response;
                }
            }, ( err ) => {
                logger.error ( 'hostQuery_2015_10' + ':'+ 'handleIncomingMethod'+ ':' + err );
                var errorMessageOut = exports.createMessageObject( "Error in Executing Query Handler" );
                return JSON.stringify ( errorMessageOut );
            } );
        }
    } catch ( ex ) {
        logger.error( ex );
    }
};

/**
 * This is an incoming call to this service trigger the related event handlers.
 *
 * @function handleIncomingEvent
 * @memberof hostQuery_2015_10.HostQuerySvc
 *
 * @param {String} jsonData - JSON encoded payload from the host.
 */
HostQuerySvc.prototype.handleIncomingEvent = function( jsonData ) {
    try {
        if( jsonData ) {
            if( exports.canQueryHost() ) {
                var proxy = exports.createHostQueryProxy();

                _processMessage( jsonData ).then ( (responseMessages) => {
                    if( !_.isEmpty( responseMessages ) ) {
                        proxy.fireHostEvent( responseMessages );
                    }
                });
            }
        }
    } catch ( ex ) {
        logger.error( ex );
    }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostQueryProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostQuery_2015_10
 * @extends hostFactoryService.BaseCallableService
 */
var HostQueryProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_INTEROPQUERY_SVC,
        hostServices.VERSION_2015_10 );
};

HostQueryProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Process outgoing 'method' type call to the host.
 *
 * @function callHostMethod
 * @memberof hostQuery_2015_10.HostOpenProxy
 *
 * @param {HostQueryMessageArray} inputData - Data object who's properties define data {in whatever form the
 * implementation is expecting) to process into a call to the host-side service.
 *
 * @returns {HostQueryMessageArray} Collection of responses resulting from this call.
 */
HostQueryProxy.prototype.callHostMethod = function( inputData ) {
    var nativeMessageIn = _buildNativeMessageResponse( inputData );

    var payload = JSON.stringify( nativeMessageIn );

    var jsonData = this._invokeHostMethod( payload );

    var nativeMessageOut = exports.createMessageObject( jsonData );

    return _buildResponsesFromNative( nativeMessageOut );
};

/**
 * Process outgoing 'method' type call to the host.
 *
 * @function callHostMethod
 * @memberof hostQuery_2015_10.HostOpenProxy
 *
 * @param {HostQueryMessageArray} inputData - Data object who's properties define data {in whatever form the
 * implementation is expecting) to process into a call to the host-side service.
 *
 * @returns {Promise} Resolved with the {HostQueryMessageArray} result from the 'host' (or NULL).
 */
HostQueryProxy.prototype.callHostMethodAsync = function( inputData ) {
    var nativeMessageIn = _buildNativeMessageResponse( inputData );

    var payload = JSON.stringify( nativeMessageIn );

    return this._invokeHostMethodAsync( payload ).then( function( jsonData ) {
        var nativeMessageOut = exports.createMessageObject( jsonData );

        return _buildResponsesFromNative( nativeMessageOut );
    } );
};

/**
 * Process outgoing 'event' type call to the host.
 *
 * @function fireHostEvent
 * @memberof hostQuery_2015_10.HostOpenProxy
 *
 * @param {HostOpenURLRequestMsg} inputData - Data object who's properties define data {in whatever form the
 * implementation is expecting) to process into a call to the host-side service.
 */
HostQueryProxy.prototype.fireHostEvent = function( inputData ) {
    var nativeMessage = _buildNativeMessageResponse( inputData );

    var payload = JSON.stringify( nativeMessage );

    this._invokeHostEvent( payload );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostQuery
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Native representation of a single host query
 *
 * @constructor
 * @memberof hostQuery_2015_10
 *
 * @param {String} queryId - ID of the new query.
 * @param {HostQueryDataObjectArray} queryData - Initial data objects.
 */
var HostQuery = function( queryId, queryData ) {
    this.QueryId = queryId;
    this.DataObjects = queryData ? queryData : [];

    this.getDataObjects = function() {
        return _.get( this, 'DataObjects', null );
    };

    this.setDataObjects = function( value ) {
        this.DataObjects = value;
    };

    this.getQueryId = function() {
        return _.get( this, 'QueryId', null );
    };

    this.setQueryId = function( value ) {
        this.QueryId = value;
    };

    this.getMessageId = function() {
        return _.get( this, 'MessageId', null );
    };

    this.setMessageId = function( value ) {
        this.MessageId = value;
    };

    this.isResponseMessage = function() {
        return _.get( this, 'IsResponse', null );
    };

    this.setIsResponseMessage = function( value ) {
        this.IsResponse = value;
    };

    /**
     * Append given object to this {HostQuery}.
     *
     * @param {HostQueryDataObject} dataObject - Object to add.
     */
    this.addDataObject = function( dataObject ) {
        this.DataObjects.push( dataObject );
    };
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostQueryDataObject
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Represents a single READ-ONLY data object in a host query.  The data objects consist of multiple
 * key/value data fields.
 *
 * @constructor
 * @memberof hostQuery_2015_10
 *
 * @param {PairArray} dataFields - (Optional) The initial collectio of {Pair} objects.
 */
var HostQueryDataObject = function( dataFields ) {
    /**
     * {PairArray} Collection of data fields.
     */
    this.DataFields = dataFields ? dataFields : [];

    /**
     * Get current values.
     *
     * @returns {PairArray} Current collection of {Pair} objects.
     */
    this.getDataFields = function() {
        return this.DataFields;
    };

    /**
     * Add given data {Pair} to the collection in this class.
     *
     * @param {Pair} pair = Key/Value pair to add.
     */
    this.addDataField = function( pair ) {
        this.DataFields.push( pair );
    };
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostQueryMessageNative
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Message object in the format used when passing data between the 'client' and the 'host'.
 *
 * @constructor
 * @memberof hostQuery_2015_10
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) JSON encoded string with the initial data for the new object.
 */
var HostQueryMessageNative = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2015_10 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }

    if( !this.Queries ) {
        this.Queries = [];
    }
};

HostQueryMessageNative.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current value.
 *
 * @memberof hostQuery_2015_10.HostQueryMessageNative
 *
 * @returns {HostQueryArray} Collection of {HostQuery} object in this {HostQueryMessageNative}.
 */
HostQueryMessageNative.prototype.getQueries = function() {
    return _.get( this, 'Queries', null );
};

/**
 * Set current value.
 *
 * @memberof hostQuery_2015_10.HostQueryMessageNative
 *
 * @param {HostQueryArray} value - Collection of {HostQuery} object in this {HostQueryMessageNative}.
 */
HostQueryMessageNative.prototype.setQueries = function( value ) {
    this.Queries = value;
};

/**
 * Append the given {HostQuery} to the collection.
 *
 * @memberof hostQuery_2015_10.HostQueryMessageNative
 *
 * @param {HostQuery} hostNativeQuery - Object to add.
 */
HostQueryMessageNative.prototype.addQuery = function( hostNativeQuery ) {
    this.Queries.push( hostNativeQuery );
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
 * @memberof hostQuery_2015_10
 *
 * @returns {HostQuerySvc} New instance of the service message object.
 */
export let createHostQuerySvc = function() {
    return new HostQuerySvc();
};

/**
 * Return <ctor> for {HostQuerySvc} class.
 *
 * @memberof hostQuery_2015_10
 *
 * @returns {Function} The <ctor> function for the {HostQuerySvc} class.
 */
export let getHostQuerySvc = function() {
    return HostQuerySvc;
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostQuery_2015_10
 *
 * @returns {HostQueryProxy} New instance of the service message API object.
 */
export let createHostQueryProxy = function() {
    return new HostQueryProxy();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostQuery_2015_10
 *
 * @param {PairArray} dataFields - (Optional) The initial collectio of {Pair} objects.
 *
 * @returns {HostQueryDataObject} New initialized instance of this class.
 */
export let createDataObject = function( dataFields ) {
    return new HostQueryDataObject( dataFields );
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostQuery_2015_10
 *
 * @param {String} queryId - ID of the new query.
 * @param {HostQueryDataObjectArray} queryData - Initial data objects.
 *
 * @returns {HostQueryDataObject} New initialized instance of this class.
 */
export let createQueryObject = function( queryId, queryData ) {
    return new HostQuery( queryId, queryData );
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostQuery_2015_10
 *
 * @param {String} inputData - (Optional) JSON encoded string with the initial data for the new object.
 *
 * @returns {HostQueryMessageNative} New initialized instance of this class.
 */
export let createMessageObject = function( inputData ) {
    return new HostQueryMessageNative( inputData );
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostQuery_2015_10
 */
export let registerHostingModule = function() {
    exports.createHostQuerySvc().register();
};

/**
 * Handle an async query response.
 *
 * @memberof hostQueryService
 *
 * @param {HostQueryMessage} queryResponse - The query response to handle.
 */
export let handleQueryResponse = function( queryResponse ) {
    var msgId = queryResponse.getMessageId();

    var responseHandler = _.get( _messageIdToResponseHandlerMap, msgId, null );

    if( responseHandler ) {
        responseHandler.handleQueryResponse( queryResponse );

        // Remove the handler after the response is received
        delete _messageIdToResponseHandlerMap[ msgId ];
    } else {
        logger.warn( 'No host query handler found for query id: ' + queryResponse.getQueryId() + ' with message id: ' + msgId );
    }
};

/**
 * Send an async query to the 'host'.
 *
 * @memberof hostQueryService
 *
 * @param {HostQueryMessage} query -
 * @param {HostQueryAsyncResponseHandler} responseHandler -
 */
export let sendAsyncQueryToHost = function( query, responseHandler ) {
    if( exports.canQueryHost() ) {
        _messageIdToResponseHandlerMap[ query.getMessageId() ] = responseHandler;

        hostQueryFactorySvc.createHostQueryProxy().fireHostEvent( query );
    }
};

/**
 * Get the {HostQueryHandler} registed for the given ID.
 *
 * @param {String} queryId - ID of the {HostQueryHandler} to return.
 *
 * @returns  {HostQueryHandler} The handler registed for the given ID.
 */
export let getQueryHandler = async function( queryId ) {
    var hostingConfig = cfgSvc.getCfgCached( 'hosting' );

    var handlerInfo = hostingConfig.queries[ queryId ];

    if( handlerInfo ) {
        if( _map_query_to_handler[ queryId ] ) {
            return _map_query_to_handler[ queryId ];
        }
        /**
         * TODO: The delayed module loading only works if handler can be loaded async. However, the current
         * code assumes 'sync' return of the handler.
         */
        // <PRE>
        // if( handlerInfo.module ) {
        //     var deferred = $q.defer();
        //     requirejs( handlerInfo.module, function() {
        //         var handlerSvc = AwInjectorService.instance.get( handlerInfo.service );
        //         ...
        //         deferred.resolve( handler );
        //     } );
        //
        //     return deferred.promise;
        // }
        // </PRE>

        const factorSvc = await loadDependentModule( handlerInfo.module );

        if( factorSvc && factorSvc[ handlerInfo.constructor ] ) {
            var handler = factorSvc[ handlerInfo.constructor ]();

            _map_query_to_handler[ queryId ] = handler;

            return handler;
        }
    }

    return null;
};

/**
 * Is it possible to send queries to the 'host'.
 *
 * @memberof hostQueryService
 *
 * @return {Boolean} TRUE if the 'host' supports receiving {HostQueryMessage} calls.
 */
export let canQueryHost = function() {
    return hostInteropSvc.isHostServiceAvailable(
        hostServices.HS_INTEROPQUERY_SVC,
        hostServices.VERSION_2015_10
    );
};

/**
 * Convert given 'service' format messages into 'native' format messages.
 *
 * @param {HostQueryMessageArray} queryMessages - Data object who's properties define data {in whatever form
 * the implementation is expecting) to process into a call to the host-side service.
 *
 * @returns {HostQueryMessageNative} New message object.
 */
export let buildNativeMessageResponse = function( queryMessages ) {
    return _buildNativeMessageResponse( queryMessages );
};

/**
 * Build a new object based on given inputs.
 *
 * @param {HostQueryMessageNative} nativeMessage - native query response message
 *
 * @return {HostQueryMessageArray} query responses
 */
export let buildResponsesFromNative = function( nativeMessage ) {
    return _buildResponsesFromNative( nativeMessage );
};

/**
 * Process json formatted query messages and return all responses.
 *
 * @param {String} jsonData - json formatted message
 *
 * @return {HostQueryMessageArray} query responses
 */
export let processMessage = function( jsonData ) {
    return _processMessage( jsonData );
};

export default exports = {
    createHostQuerySvc,
    getHostQuerySvc,
    createHostQueryProxy,
    createDataObject,
    createQueryObject,
    createMessageObject,
    registerHostingModule,
    handleQueryResponse,
    sendAsyncQueryToHost,
    getQueryHandler,
    canQueryHost,
    buildNativeMessageResponse,
    buildResponsesFromNative,
    processMessage
};
