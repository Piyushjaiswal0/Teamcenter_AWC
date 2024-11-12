// Copyright (c) 2022 Siemens

/**
 * native construct to hold the server version information related to the AW server release.
 *
 * @module js/TcAWServerVersion
 */
import eventBus from 'js/eventBus';
import logger from 'js/logger';

var exports = {};

/**
 * members to hold the parts of the version data.
 */
export let baseLine = '';
export let buildDate = '';
export let buildTime = '';

var AW_SERVER_VERSION_DELIMITER_ESCAPED = ';';

/**
 * parse the string into the expected values. Populates members with parsed data.
 *
 * @param {String} versionString - version info from TC
 */
export let parseVersionInfo = function( versionString ) {
    if( versionString ) {
        var tokens = versionString.split( AW_SERVER_VERSION_DELIMITER_ESCAPED );
        exports.baseLine = tokens[ 0 ];
        exports.buildDate = tokens[ 1 ];
        exports.buildTime = tokens[ 2 ];
    }
};

/**
 * create a formatted string representation of the version parts
 *
 * @return {String} formatted version string
 */
export let toString = function() {
    return exports.baseLine + ';' + exports.buildDate + ';' + exports.buildTime;
};

let loadConfiguration = function() {
    eventBus.subscribe( 'afx.logVersionInfo', function() {
        var output = 'Server Build: ' + exports.toString();
        logger.info( output );
    } );
};

export default exports = {
    baseLine,
    buildDate,
    buildTime,
    parseVersionInfo,
    toString
};
loadConfiguration();
