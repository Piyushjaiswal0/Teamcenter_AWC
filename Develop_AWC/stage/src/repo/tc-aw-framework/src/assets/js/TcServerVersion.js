// Copyright (c) 2022 Siemens

/**
 * native implementation for the TcServerVersion logic. Tracks server version info and parses it. Generates a server
 * version string.
 *
 * @module js/TcServerVersion
 */
import eventBus from 'js/eventBus';
import logger from 'js/logger';

var exports = {};

var TC_SERVER_VERSION_DELIMITER_ESCAPED = '.';
var TC_SERVER_VERSION_DELIMITER = '.';

export let clear = function() {
    /**
     * members to hold the parts of the version data.
     */
    exports.releaseFlag = '';
    exports.majorVersion = 0;
    exports.minorVersion = 0;
    exports.qrmNumber = 0;
    exports.phase = '';
};

/**
 * parse the string into the expected values. Populates members with parsed data.
 *
 * @param {String} versionString - version info from TC
 */
export let parseVersionInfo = function( versionString ) {
    if( versionString ) {
        var tokens = versionString.split( TC_SERVER_VERSION_DELIMITER_ESCAPED );
        exports.releaseFlag = tokens[ 0 ].slice( 0, 1 );
        var major = tokens[ 0 ].slice( 1 ); // from 1 on
        exports.majorVersion = parseInt( major );
        if( exports.majorVersion > 1000 ) {
            exports.majorVersion /= 1000;
        }
        exports.minorVersion = parseInt( tokens[ 1 ] );
        exports.qrmNumber = parseInt( tokens[ 2 ] );
        exports.phase = tokens[ 3 ] + TC_SERVER_VERSION_DELIMITER + tokens[ 4 ];

        /*
         * This is a fix for an issue on 10.1.x where the version string does not match what is expected by the
         * above code. In this situation, the QRM number is actually stored in the 1st character of the phase token.
         */
        if( exports.majorVersion === 10 && exports.minorVersion === 1 && exports.qrmNumber === 0 ) {
            var qrm = parseInt( tokens[ 3 ][ 0 ] );
            if( !isNaN( qrm ) ) {
                exports.qrmNumber = qrm;
            }
        }
    }
};

/**
 * create a formatted string representation of the version parts
 *
 * @return {String} formatted version string
 */
export let toString = function() {
    return exports.releaseFlag + '.' + exports.majorVersion + '.' + exports.minorVersion + '.' + exports.qrmNumber +
        '.' + exports.phase;
};

let loadConfiguration = function() {
    exports.clear();

    eventBus.subscribe( 'afx.logVersionInfo', function() {
        var output = 'Server Version: ' + exports.toString();
        logger.info( output );
    } );
};
export default exports = {
    clear,
    parseVersionInfo,
    toString
};

loadConfiguration();
