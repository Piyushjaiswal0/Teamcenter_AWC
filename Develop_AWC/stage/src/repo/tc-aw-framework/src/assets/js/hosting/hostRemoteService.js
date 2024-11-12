// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/hostRemoteService
 * @namespace hostRemoteService
 */
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import io from 'socket.io-client/dist/socket.io';
import logger from 'js/logger';
import ctxService from 'js/appCtxService';
import browserUtils from 'js/browserUtils';

/**
 * {PropertyMap} Map of ID of a request and the 'deferred' being used to track the request's lifecycle.
 * @private
 */
const _messageIdToDeferredResponse = {};

/**
 * Startup
 */
let exports = {};

export const _isClient = false;
export const _memberId = '?';
export const _memberType = '?';
export const _bioNS = null;

/**
 * {String} Path name from base URL
 */
let _cachedURLPath;

/**
 * @returns {String} ID to use for a message that is NOT currently in the map of deferred responses.
 */
function _getUnusedMessageId() {
    let messageInt = Date.now();

    /**
     * Check if we already have a message with this same ID being tracked.
     * <P>
     * If so: Keep trying to use a random # to create a unique ID
     */
    while( _messageIdToDeferredResponse[ messageInt ] ) {
        messageInt += _.random( 1, 5000 );
    }

    return _.toString( messageInt );
}

/**
 * @param {String} msg - Text of the error message to log.
 */
function _logError( msg ) {
    logger.error( msg );
}

/**
 * Get base url path name
 *
 */
function _getURLPathName() {
    let url = browserUtils.getBaseURL().replace( /(http:\/\/|https:\/\/)/, '' );
    let urlPath = url.match( /\/.*$/ );
    if( urlPath && urlPath.length > 0 ) {
        urlPath = urlPath[ 0 ].replace( /\/$/, '' );
    }
    else {
        urlPath = '';
    }
    _cachedURLPath = urlPath;
}

/**
 * isRemoteHostingSupported?
 * @memberof hostInteropService
 */
export const isRemoteHostingSupported = function() {
    return new Promise( ( resolve, reject ) => {
        if( !io ) {
            return;
        }

        if ( !_cachedURLPath ) {
            _getURLPathName();
        }
        //socket.io-client-cpp version we are using doesn't support path
        //Will put back once we upgrade to socket.io-client-cpp 3.x
        const bioNS = io( '/bio-namespace', {
            transports: [ 'websocket' ]
        } );

        bioNS.on( 'connect', () => {
            bioNS.close();
            resolve();
        } );

        bioNS.on( 'connect_error', () => {
            bioNS.close();
            reject();
        } );
    } );
};

let _processMessageCb;

/**
 * Setup Socket.IO API for the current browser document.
 * @param {String} roomId - ID of the room to attach to.
 * @param {Boolean} isClient - TRUE if we are attaching a 'client'
 * @param {Function} processMessageCb - Callback function used to process incomming message activity.
 */
export const attach = function( roomId, isClient, processMessageCb ) {
    exports._roomId = roomId;
    exports._isClient = isClient;
    _processMessageCb = processMessageCb;
};

/**
 */
function attach2() {
    if( exports._bioNS ) {
        return;
    }

    if ( !_cachedURLPath ) {
        _getURLPathName();
    }
    //socket.io-client-cpp version we are using doesn't support path
    //Will put back once we upgrade to socket.io-client-cpp 3.x
    exports._bioNS = io( '/bio-namespace', {
        transports: [ 'websocket' ]
    } );

    exports._memberId = _.toString( Date.now() );
    exports._memberType = exports._isClient ? 'client' : 'host';

    // this will cause socket.io close immediately after connected, need remove.
    //exports._bioNS.on( 'connect', () => {
    //    exports._bioNS.close();
    //} );

    exports._bioNS.on( 'connect_error', () => {
        exports._bioNS.close();
    } );

    /**
     * As soon as we are connected to the namespace sign-up for to receive messages for this room.
     */
    exports._bioNS.on( 'connect', () => {
        exports._bioNS.emit( 'join-room', {
            roomId: exports._roomId,
            memberId: exports._memberId,
            memberType: exports._memberType
        } );
    } );

    if( exports._isClient ) {
        /**
         * On all hosts leaving the room, stop hosting for AW too.
         */
        exports._bioNS.on( 'all-hosts-disconnected', () => {
            ctxService.ctx.aw_hosting_enabled = false;
        } );

        exports._bioNS.on( 'host-reconnected', () => {
            ctxService.ctx.aw_hosting_enabled = true;
        } );

        /**
         * Setup to receive async messages from the 'host' and to respond back to the 'host' with the result
         * using another messages when complete.
         */
        exports._bioNS.on( 'bio-host-request', hostMessage => {
            if( hostMessage.messageId ) {
                exports._bioNS.emit( 'bio-client-response', {
                    bioFunction: hostMessage.bioFunction,
                    source: exports._memberId,
                    roomId: hostMessage.roomId,
                    messageId: hostMessage.messageId,
                    callerId: hostMessage.source,
                    service: hostMessage.service,
                    result: _processMessageCb( hostMessage ),
                    timeSent: hostMessage.timeSent
                } );
            }
        } );

        exports._bioNS.on( 'bio-host-response', responseObj => {
            /**
             * Check if this is an async response to something this 'client' requested
             */
            if( responseObj.messageId && responseObj.callerId === exports._memberId ) {
                const deferred = _messageIdToDeferredResponse[ responseObj.messageId ];

                if( deferred ) {
                    delete _messageIdToDeferredResponse[ responseObj.messageId ];

                    deferred.resolve( responseObj.result );
                } else {
                    _logError( 'Unmatched async message: ID=' + responseObj.messageId + '\n' +
                        JSON.stringify( responseObj, null, 2 ) );
                }
            }
        } );
    } else {
        /**
         * Setup to receive async messages from a 'client' and to respond back to the 'client' with the
         * result using another messages when complete.
         */
        exports._bioNS.on( 'bio-client-request', clientMessage => {
            if( clientMessage.messageId ) {
                exports._bioNS.emit( 'bio-host-response', {
                    bioFunction: clientMessage.bioFunction,
                    source: exports._memberId,
                    roomId: clientMessage.roomId,
                    messageId: clientMessage.messageId,
                    callerId: clientMessage.source,
                    service: clientMessage.service,
                    result: _processMessageCb( clientMessage ),
                    timeSent: clientMessage.timeSent
                } );
            }
        } );

        exports._bioNS.on( 'bio-client-response', responseObj => {
            /**
             * Check if this is an async response to something this 'host' requested
             */
            if( responseObj.messageId && responseObj.callerId === exports._memberId ) {
                const deferred = _messageIdToDeferredResponse[ responseObj.messageId ];

                if( deferred ) {
                    delete _messageIdToDeferredResponse[ responseObj.messageId ];

                    deferred.resolve( responseObj.result );
                } else {
                    _logError( 'Unmatched async message: ID=' + responseObj.messageId + '\n' +
                        JSON.stringify( responseObj, null, 2 ) );
                }
            }
        } );
    }
}

/**
 * @param {String} bioFunction - Id of the hosting API to invoke.
 * @param {String} serviceDesc - Service descriptor object (in JSON format) the API should invoke.
 * @param {Object} payload - (Optional) Object containing the parameter(s) to invoke the API/service with.
 */
export const send = function( bioFunction, serviceDesc, payload ) {
    attach2();

    // Build-send message to client/host
    const msgObj = {
        source: exports._memberId,
        roomId: exports._roomId,
        messageId: _getUnusedMessageId(),
        bioFunction: bioFunction,
        timeSent: Date.now().toString()
    };

    if( serviceDesc ) {
        msgObj.service = serviceDesc;
    }

    if( payload ) {
        msgObj.payload = payload;
    }

    if( exports._isClient ) {
        exports._bioNS.emit( 'bio-client-request', msgObj );
    } else {
        exports._bioNS.emit( 'bio-host-request', msgObj );
    }
};

/**
 * @param {Object} msgObj - Message object to send.
 * @return {Promise} Resolved with the result Object.
 */
export const sendAsync = function( msgObj ) {
    attach2();

    const msgToSend = _.clone( msgObj );

    msgToSend.source = exports._memberId;
    msgToSend.roomId = exports._roomId;
    msgToSend.messageId = _getUnusedMessageId();
    msgToSend.timeSent = Date.now().toString();

    const deferred = AwPromiseService.instance.defer();

    _messageIdToDeferredResponse[ msgToSend.messageId ] = deferred;

    if( exports._isClient ) {
        exports._bioNS.emit( 'bio-client-request', msgToSend );
    } else {
        exports._bioNS.emit( 'bio-host-request', msgToSend );
    }

    return deferred.promise;
};

export default exports = {
    _isClient,
    _memberId,
    _memberType,
    _bioNS,
    isRemoteHostingSupported,
    attach,
    send,
    sendAsync
};
