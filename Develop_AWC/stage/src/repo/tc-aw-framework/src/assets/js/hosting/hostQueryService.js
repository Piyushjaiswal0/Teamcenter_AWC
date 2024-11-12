// Copyright (c) 2022 Siemens

/**
 * Service to assist in creating and sending {HostQueryMessage} objects.
 *
 * @module js/hosting/hostQueryService
 * @namespace hostQueryService
 */
import { loadDependentModule } from 'js/moduleLoader';
import AwPromiseService from 'js/awPromiseService';
import hostInteropSvc from 'js/hosting/hostInteropService';
import hostQueryFactorySvc from 'js/hosting/hostQueryFactoryService';
import hostQuerySvc1 from 'js/hosting/sol/services/hostQuery_2015_10';
import hostQuerySvc2 from 'js/hosting/sol/services/hostQuery_2019_05';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import logger from 'js/logger';
import hostServices from 'js/hosting/hostConst_Services';
import cfgSvc from 'js/configurationService';
import browserUtils from 'js/browserUtils';
import 'config/hosting';

/**
 * Map of messageId to the {HostQueryHandler} regististed to handle it when the 'host' responds from an
 * async request.
 */
var _messageIdToResponseHandlerMap = {};

/**
 * Object data field to hold a model object
 */
var OBJECT_DATA_FIELD = 'object';

/**
 * Is supported data field
 */
var IS_SUPPORTED_DATA_FILED = 'isSupported';

/**
 * TRUE if more detailed activitiy should be logged.
 */
var _debug_logQueryActivity = browserUtils.getUrlAttributes().logQueryActivity !== undefined;

/**
 * Cache of hostQuery 'handlers'.
 */
var _map_query_to_handler = {};

/**
 * Query id for 'IsQueryHandlerAvailable' query.
 * <P>
 * This query can go either from Host -> Client or Client -> Host and asks the other side if it has a
 * handler for a given query id.
 * <P>
 * The input is a string with key 'QueryId' and value of the query id to check.
 * <P>
 * The return value is a boolean with a key of 'HasQueryHandler'
 */
var IS_QUERY_HANLDER_AVAILABLE_ID = 'com.siemens.splm.client.hosted.IsQueryHandlerAvailable';

/**
 * @param {String} queryId -
 * @param {IModelObjectArray} modelObjects -
 *
 * @returns {QueryMessage} Message ready to send to the host.
 */
function _createMessageWithID( queryId, modelObjects ) {
    // Build list of input data from the list of model objects to check
    var dataObjects = [];

    _.forEach( modelObjects, function( modelObject ) {
        var dataObject = hostQueryFactorySvc.createEditableData();

        var queryModelObject = hostQueryFactorySvc.createModelObject( modelObject.uid, modelObject.type );

        dataObject.setData( OBJECT_DATA_FIELD, queryModelObject );

        dataObjects.push( dataObject );
    } );

    // Create the input query
    return hostQueryFactorySvc.createMessageWithID( queryId, dataObjects );
}

/**
 * Check if passed in objects are supported for the passed in command.
 *
 * @param {String} commandId - Command id to check if supported for.
 *
 * @param {IModelObjectArray} modelObjects - The model objects to check if they are supported.
 *
 * @return {MapUidToIsSupported} The model object UID to boolean indicating if they are supported.
 */
function _areObjectsSupported( commandId, modelObjects ) {
    var results = {};

    var queryId = _getQueryIdForCommand( commandId );

    if( queryId ) {
        // Create the input query
        var hostQuery = _createMessageWithID( queryId, modelObjects );

        // Send the query to the host
        var response = exports.sendQueryToHost( hostQuery );

        // Parse the query response
        if( response ) {
            var responseData = response.getData();

            _.forEach( responseData, function( data ) {
                var queryModelObject = data.getField( OBJECT_DATA_FIELD );

                var uid = queryModelObject.getObjectUid();

                var modelObject = cdm.getObject( uid );

                if( modelObject ) {
                    var isSupported = data.getField( IS_SUPPORTED_DATA_FILED );

                    results[ uid ] = isSupported;
                }
            } );
        }
    } else {
        logger.error( 'No supported query for command: ' + commandId );
    }

    return results;
}

/**
 * Check if passed in objects are supported for the passed in command.
 *
 * @param {String} commandId - Command id to check if supported for.
 *
 * @param {IModelObjectArray} modelObjects - The model objects to check if they are supported.
 *
 * @return {Promise} Resolved with {MapUidToIsSupported} The model object UID to boolean indicating if they
 * are supported.
 */
function _areObjectsSupportedAsync( commandId, modelObjects ) {
    var queryId = _getQueryIdForCommand( commandId );

    if( queryId ) {
        // Create the input query
        var hostQuery = _createMessageWithID( queryId, modelObjects );

        // Send the query to the host
        return exports.sendQueryToHostAsync( hostQuery ).then( function( response ) {
            var results = {};

            // Parse the query response
            if( response ) {
                var responseData = response.getData();

                _.forEach( responseData, function( data ) {
                    var queryModelObject = data.getField( OBJECT_DATA_FIELD );

                    var uid = queryModelObject.getObjectUid();

                    var modelObject = cdm.getObject( uid );

                    if( modelObject ) {
                        var isSupported = data.getField( IS_SUPPORTED_DATA_FILED );

                        results[ uid ] = isSupported;
                    }
                } );
            }

            return results;
        } );
    }

    logger.error( 'No supported query for command: ' + commandId );

    return AwPromiseService.instance.resolve( {} );
}

/**
 * Get the query id associated with the given in command id
 *
 * @param {String} commandId - Command id
 *
 * @return {String} query id for the command (or null)
 */
function _getQueryIdForCommand( commandId ) {
    var hostingConfig = cfgSvc.getCfgCached( 'hosting' );

    var queryId = null;

    _.forEach( hostingConfig.queries, function( value, key ) {
        if( value.commandId === commandId ) {
            queryId = key;
            return false;
        }
    } );

    return queryId;
}

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// IsQuerySupportedQueryHandler
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This {HostQueryHandler} allows simple check of support for a given quiey ID by the 'host'.
 *
 * @constructor
 * @memberof hostQueryService
 *
 * @extends {hostQueryFactoryService.HostQueryHandler}
 */
var IsQuerySupportedQueryHandler = function() {
    hostQueryFactorySvc.getHandler().call( this );
};

IsQuerySupportedQueryHandler.prototype = hostQueryFactorySvc.extendHandler();

/**
 * Handle an incomming query from the 'host'.
 *
 * @memberof hostQueryService.IsQuerySupportedQueryHandler
 *
 * @param {HostQueryMessage} inputMessage - The input message from the 'host'.
 *
 * @return {HostQueryMessage} The {HostQueryMessage} to send back to 'host' containing any details resulting
 * from handling the query.
 */
IsQuerySupportedQueryHandler.prototype.handleQuery = function( inputMessage ) {
    var dataObjects = inputMessage.queryData;

    if( !_.isEmpty( dataObjects ) ) {
        var queryIdDataObject = dataObjects[ 0 ];

        var queryId = queryIdDataObject.getField( 'QueryId' );

        if( queryId ) {
            var isHandled = hostInteropSvc.isQueryHandled( queryId );

            var responseData = hostQueryFactorySvc.createEditableData();

            responseData.setData( 'HasQueryHandler', isHandled );

            return hostQueryFactorySvc.createResponseMessage( inputMessage, [ responseData ] );
        }
    }

    return null;
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
 * @memberof hostQueryService
 *
 * @returns {HostQueryData} New initialized instance of this class.
 */
export let createIsQuerySupportedQueryHandler = function() {
    return new IsQuerySupportedQueryHandler();
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
         * TODO: The delayed loading only works if handler can be loaded async. However, the current code
         * assumes 'sync' return of the handler.
         */
        // <PRE>
        // if( handlerInfo.module ) {
        //     var deferred = AwPromiseService.instance.defer();
        //     requirejs( handlerInfo.module, function() {
        //         var handlerSvc = AwInjectorService.instance.get( handlerInfo.service );
        //         ...
        //         deferred.resolve( handler );
        //     } );
        //
        //     return deferred.promise;
        // }
        // </PRE>

        const handlerSvc = await loadDependentModule( handlerInfo.module );

        if( handlerSvc ) {
            var handler;

            if( handlerSvc[ handlerInfo.constructor ] ) {
                handler = handlerSvc[ handlerInfo.constructor ]();
            }

            if( handler ) {
                _map_query_to_handler[ queryId ] = handler;

                return handler;
            }

            logger.warn( 'hostQueryService' + ':' + 'Invalid handler constructor' + '\n' +
                JSON.stringify( handlerInfo, null, 2 ) );
        } else {
            logger.warn( 'hostQueryService' + ':' + 'Handler service not found' + '\n' +
                JSON.stringify( handlerInfo, null, 2 ) );
        }
    }

    return null;
};

/**
 * Send multiple {HostQueryMessage} objects to the 'host'.
 *
 * @param {HostQueryMessageArray} queries - A collection of {HostQueryMessage} to send to the 'host'.
 *
 * @return {HostQueryMessageArray} The responses from the 'host'.
 */
export let sendQueriesToHost = function( queries ) {
    if( exports.canQueryHost() ) {
        return hostQuerySvc1.createHostQueryProxy().callHostMethod( queries );
    }

    return null;
};

/**
 * Send multiple {HostQueryMessage} objects to the 'host'.
 *
 * @param {HostQueryMessageArray} queries - A collection of {HostQueryMessage} to send to the 'host'.
 *
 * @return {Promise} Resolved with {HostQueryMessageArray} The responses from the 'host'.
 */
export let sendQueriesToHostAsync = function( queries ) {
    if( exports.canQueryHostAsync() ) {
        return hostQuerySvc2.createHostQueryProxy().callHostMethodAsync( queries );
    }

    return AwPromiseService.instance.resolve( null );
};

/**
 * Send a {HostQueryMessage} object to the 'host'.
 *
 * @param {HostQueryMessage} query - The {HostQueryMessage} to send to the 'host'.
 *
 * @return {HostQueryMessage} The responses from the 'host'.
 */
export let sendQueryToHost = function( query ) {
    var responses = exports.sendQueriesToHost( [ query ] );

    if( !_.isEmpty( responses ) ) {
        return responses[ 0 ];
    }

    return null;
};

/**
 * Send a {HostQueryMessage} object to the 'host'.
 *
 * @param {HostQueryMessage} query - The {HostQueryMessage} to send to the 'host'.
 *
 * @return {Promise} Resolved with {HostQueryMessage} The responses from the 'host'.
 */
export let sendQueryToHostAsync = function( query ) {
    return exports.sendQueriesToHostAsync( [ query ] ).then( function( responses ) {
        if( !_.isEmpty( responses ) ) {
            return responses[ 0 ];
        }

        return null;
    } );
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

        hostQuerySvc1.createHostQueryProxy().fireHostEvent( query );
    }
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
 * Is it possible to send async queries to the 'host' using the '2019_05' service API.
 *
 * @memberof hostQueryService
 *
 * @return {Boolean} TRUE if the 'host' supports receiving {HostQueryMessage} calls and responding
 * asynchronously.
 */
export let canQueryHostAsync = function() {
    return hostInteropSvc.isHostServiceAvailable(
        hostServices.HS_INTEROPQUERY_SVC,
        hostServices.VERSION_2019_05
    );
};

/**
 * Check if the 'host' has a handler for the given query.
 *
 * @memberof hostQueryService
 *
 * @param {String} queryId - The ID of query to check.
 *
 * @return {Boolean} TRUE if the 'host' has a handler for the given query ID.
 */
export let canHostHandleQuery = function( queryId ) {
    var hostHasHandler = false;

    // Verify the host supports queries
    if( exports.canQueryHost() ) {
        // Query the host to check if it supports the passed in query id
        var data = hostQueryFactorySvc.createEditableData();

        data.setData( 'QueryId', queryId );

        var dataObjects = [];

        dataObjects.push( data );

        var queryMessage = hostQueryFactorySvc.createMessageWithID( IS_QUERY_HANLDER_AVAILABLE_ID, dataObjects );

        // Send query to host
        var response = exports.sendQueryToHost( queryMessage );

        if( !_.isEmpty( response ) ) {
            // Check the response data to see if the query is supported.
            var responseData = response.getData();

            if( !_.isEmpty( responseData ) ) {
                var dataObject = responseData[ 0 ];

                if( dataObject.hasField( 'HasQueryHandler' ) ) {
                    hostHasHandler = dataObject.getField( 'HasQueryHandler' );
                }
            }
        }
    }

    return hostHasHandler;
};

/**
 * Check if the 'host' has a handler for the given query.
 *
 * @memberof hostQueryService
 *
 * @param {String} queryId - The ID of query to check.
 *
 * @return {Promise} Resolved with {Boolean} TRUE if the 'host' has a handler for the given query ID.
 */
export let canHostHandleQueryAsync = function( queryId ) {
    // Verify the host supports queries
    if( exports.canQueryHostAsync() ) {
        // Query the host to check if it supports the passed in query id
        var data = hostQueryFactorySvc.createEditableData();

        data.setData( 'QueryId', queryId );

        var dataObjects = [];

        dataObjects.push( data );

        var queryMessage = hostQueryFactorySvc.createMessageWithID( IS_QUERY_HANLDER_AVAILABLE_ID, dataObjects );

        // Send query to host
        return exports.sendQueryToHostAsync( queryMessage ).then( function( response ) {
            if( !_.isEmpty( response ) ) {
                // Check the response data to see if the query is supported.
                var responseData = response.getData();

                if( !_.isEmpty( responseData ) ) {
                    var dataObject = responseData[ 0 ];

                    if( dataObject.hasField( 'HasQueryHandler' ) ) {
                        return dataObject.getField( 'HasQueryHandler' );
                    }
                }
            }

            return false;
        } );
    }

    return AwPromiseService.instance.resolve( false );
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
 * Checks if a query exists to check which objects the host currently supports for the passed in command id.
 *
 * @memberof hostQueryService
 *
 * @param {String} commandId - Command to check
 *
 * @return {Boolean} TRUE if a query exists
 */
export let isQueryAvailableForCommand = function( commandId ) {
    if( exports.canQueryHost() ) {
        var queryId = _getQueryIdForCommand( commandId );

        if( _debug_logQueryActivity ) {
            logger.info( 'Command id ' + commandId + ' has query id of ' + queryId );
        }

        return queryId && exports.canHostHandleQuery( queryId );
    }

    return false;
};

/**
 * Checks if a query exists to check which objects the host currently supports for the passed in command id.
 *
 * @memberof hostQueryService
 *
 * @param {String} commandId - Command to check
 *
 * @return {Boolean} TRUE if a query exists
 */
export let isQueryAvailableForCommandAsync = function( commandId ) {
    if( exports.canQueryHostAsync() ) {
        var queryId = _getQueryIdForCommand( commandId );

        if( _debug_logQueryActivity ) {
            logger.info( 'Command id ' + commandId + ' has query id of ' + queryId );
        }

        if( queryId ) {
            return exports.canHostHandleQueryAsync( queryId );
        }
    }

    return AwPromiseService.instance.resolve( false );
};

/**
 * Check if one or more of the passed in objects are supported for the passed in command.
 *
 * @memberof hostQueryService
 *
 * @param {String} commandId - Command id to check if supported for.
 *
 * @param {ImodelObjectArray} modelObjects - The objects to check if they are supported.
 *
 * @return {Boolean} TRUE if one or more of the objects are supported for the command.
 */
export let areAnyObjectsSupported = function( commandId, modelObjects ) {
    var anySupported = false;
    var supportedResults = null;

    if( hostInteropSvc.isRemoteHostingEnabled() ) {
        supportedResults = _areObjectsSupportedAsync( commandId, modelObjects );
    } else {
        supportedResults = _areObjectsSupported( commandId, modelObjects );
    }


    _.forEach( supportedResults, function( entry ) {
        if( entry === 'true' ) {
            anySupported = true;
        }
    } );
    return anySupported;
};

/**
 * Check if one or more of the passed in objects are supported for the passed in command.
 *
 * @memberof hostQueryService
 *
 * @param {String} commandId - Command id to check if supported for.
 *
 * @param {ImodelObjectArray} modelObjects - The objects to check if they are supported.
 *
 * @return {Promise} Resolved with {Boolean} TRUE if one or more of the objects are supported for the
 * command.
 */
export let areAnyObjectsSupportedAsync = function( commandId, modelObjects ) {
    return _areObjectsSupportedAsync( commandId, modelObjects ).then( function( supportedResults ) {
        var anySupported = false;

        _.forEach( supportedResults, function( entry ) {
            if( entry === 'true' ) {
                anySupported = true;
                return false;
            }
        } );

        return anySupported;
    } );
};

// ---------------------------------------------------------------------------------

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostQueryService
 */
export let registerHostingModule = function() {
    //
};

export default exports = {
    createIsQuerySupportedQueryHandler,
    getQueryHandler,
    sendQueriesToHost,
    sendQueriesToHostAsync,
    sendQueryToHost,
    sendQueryToHostAsync,
    sendAsyncQueryToHost,
    canQueryHost,
    canQueryHostAsync,
    canHostHandleQuery,
    canHostHandleQueryAsync,
    handleQueryResponse,
    isQueryAvailableForCommand,
    isQueryAvailableForCommandAsync,
    areAnyObjectsSupported,
    areAnyObjectsSupportedAsync,
    registerHostingModule
};
