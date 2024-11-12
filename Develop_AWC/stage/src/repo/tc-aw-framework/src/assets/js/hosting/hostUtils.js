// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global window, define
 */

/**
 * Definition of classes & functions used throughout the hosting service APIs.
 *
 * @module js/hosting/hostUtils
 * @namespace hostUtils
 */
import _ from 'lodash';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Private Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Base ASCII character set used to help map to Base64 encoding.
 */
var _keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

/**
 * Decode a base64 encoded string.
 *
 * @private
 *
 * @param {String} e - Encoded string to be decoded.
 *
 * @return {String} Decoded string.
 */
function _utf8_decode( e ) {
    var t = '';
    var n = 0;
    var r;
    var c2;
    var c3 = 0;
    while( n < e.length ) {
        r = e.charCodeAt( n );
        if( r < 128 ) {
            t += String.fromCharCode( r );
            n++;
        } else if( r > 191 && r < 224 ) {
            c2 = e.charCodeAt( n + 1 );
            t += String.fromCharCode( ( r & 31 ) << 6 | c2 & 63 ); // eslint-disable-line no-bitwise
            n += 2;
        } else {
            c2 = e.charCodeAt( n + 1 );
            c3 = e.charCodeAt( n + 2 );
            t += String.fromCharCode( ( r & 15 ) << 12 | ( c2 & 63 ) << 6 | c3 & 63 ); // eslint-disable-line no-bitwise
            n += 3;
        }
    }

    return t;
}

/**
 * Encode a string into the base64 format.
 *
 * @private
 *
 * @param {String} e - Raw string to be encoded.
 *
 * @return {String} Encoded string.
 */
function _utf8_encode( e ) {
    e = String( e ); // Note, not all input parameters are actual string objects, go figure.
    e = e.replace( /\r\n/g, '\n' );
    var t = '';
    for( var n = 0; n < e.length; n++ ) {
        var r = e.charCodeAt( n );
        if( r < 128 ) {
            t += String.fromCharCode( r );
        } else if( r > 127 && r < 2048 ) {
            t += String.fromCharCode( r >> 6 | 192 ); // eslint-disable-line no-bitwise
            t += String.fromCharCode( r & 63 | 128 ); // eslint-disable-line no-bitwise
        } else {
            t += String.fromCharCode( r >> 12 | 224 ); // eslint-disable-line no-bitwise
            t += String.fromCharCode( r >> 6 & 63 | 128 ); // eslint-disable-line no-bitwise
            t += String.fromCharCode( r & 63 | 128 ); // eslint-disable-line no-bitwise
        }
    }
    return t;
}

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Encode a string into the base64 format.
 *
 * @memberof hostUtils
 *
 * @param {String} rawString - String to be encoded.
 *
 * @return {String} Encoded string.
 */
export let encode = function( rawString ) {
    var encoded = '';
    var n;
    var r;
    var i;
    var s;
    var o;
    var u;
    var a;
    var f = 0;
    rawString = _utf8_encode( rawString );
    while( f < rawString.length ) {
        n = rawString.charCodeAt( f++ );
        r = rawString.charCodeAt( f++ );
        i = rawString.charCodeAt( f++ );
        s = n >> 2; // eslint-disable-line no-bitwise
        o = ( n & 3 ) << 4 | r >> 4; // eslint-disable-line no-bitwise
        u = ( r & 15 ) << 2 | i >> 6; // eslint-disable-line no-bitwise
        a = i & 63; // eslint-disable-line no-bitwise
        if( isNaN( r ) ) {
            a = 64;
            u = a;
        } else if( isNaN( i ) ) {
            a = 64;
        }
        encoded = encoded + _keyStr.charAt( s ) + _keyStr.charAt( o ) + _keyStr.charAt( u ) + _keyStr.charAt( a );
    }
    return encoded;
};

/**
 * Decode the given base64 encoded string
 *
 * @memberof hostUtils
 *
 * @param {String} encodedString - String to be decoded.
 *
 * @return {String} Decoded result.
 */
export let decode = function( encodedString ) {
    var decoded = '';
    var n;
    var r;
    var i;
    var s;
    var o;
    var u;
    var a;
    var f = 0;
    encodedString = encodedString.replace( /[^A-Za-z0-9+/=]/g, '' );
    while( f < encodedString.length ) {
        s = _keyStr.indexOf( encodedString.charAt( f++ ) );
        o = _keyStr.indexOf( encodedString.charAt( f++ ) );
        u = _keyStr.indexOf( encodedString.charAt( f++ ) );
        a = _keyStr.indexOf( encodedString.charAt( f++ ) );
        n = s << 2 | o >> 4; // eslint-disable-line no-bitwise
        r = ( o & 15 ) << 4 | u >> 2; // eslint-disable-line no-bitwise
        i = ( u & 3 ) << 6 | a; // eslint-disable-line no-bitwise
        decoded += String.fromCharCode( n );
        if( u !== 64 ) {
            decoded += String.fromCharCode( r );
        }
        if( a !== 64 ) {
            decoded += String.fromCharCode( i );
        }
    }

    decoded = _utf8_decode( decoded );

    return decoded;
};

/**
 * Encodes a json string.
 *
 * @memberof hostUtils
 *
 * @param {String} jsonString - Json string to be encoded
 *
 * @return {String} Encoded json string.
 */
export let encodeEmbeddedJson = function( jsonString ) {
    return exports.encode( jsonString );
};

/**
 * Decodes a json string from 'encodeEmbeddedJson'
 *
 * @memberof hostUtils
 *
 * @param {String} encodedJsonString - JSON string to be decoded.
 *
 * @return {String} Decoded json string.
 */
export let decodeEmbeddedJson = function( encodedJsonString ) {
    return exports.decode( encodedJsonString );
};

/**
 * Check if given value is 'null' or 'undefined'
 *
 * @memberof hostUtils
 *
 * @param {*} valueToTest - Object to test.
 *
 * @returns {boolean} TRUE if the given value is 'null' or 'undefined'
 */
export let isNil = function( valueToTest ) {
    return valueToTest === null || valueToTest === undefined;
};

/**
 * Check if given value is NOT 'null' and NOT 'undefined'.
 *
 * @memberof hostUtils
 *
 * @param {*} valueToTest - Object to test.
 * @returns {boolean} TRUE if the given value is NOT 'null' and NOT 'undefined'
 */
export let isNotNil = function( valueToTest ) {
    return valueToTest !== null && valueToTest !== undefined;
};

/**
 * Execute the given command with the contents of the given {IModelObject} array as a command parameter.
 *
 * @param {String} commandId - ID of the command to execute.
 * @param {IModelObjectArray} modelObjs - Array of {IModelObject} (Note: Only 1st will be used).
 * @param {hostInteropService} hostInteropSvc - Service to use.
 * @param {commandService} commandSvc - Service to use.
 *
 * @returns {Promise} Resolved when the command execution is complete.
 */
export let executeCommand = function( commandId, modelObjs, hostInteropSvc, commandSvc ) {
    var firstModelObj;

    if( !_.isEmpty( modelObjs ) ) {
        firstModelObj = modelObjs[ 0 ];
    }

    var hostScope = hostInteropSvc.getHostingScope();

    hostScope.modelObject = firstModelObj;

    if( firstModelObj && firstModelObj.uid ) {
        //TODO: executeCommand requires the "runActionWithViewModel" API which is only accessible from render function
        return commandSvc.executeCommand( commandId, { uid: firstModelObj.uid }, hostScope );
    }

    //TODO: executeCommand requires the "runActionWithViewModel" API which is only accessible from render function
    return commandSvc.executeCommand( commandId, null, hostScope );
};

export default exports = {
    encode,
    decode,
    encodeEmbeddedJson,
    decodeEmbeddedJson,
    isNil,
    isNotNil,
    executeCommand
};
