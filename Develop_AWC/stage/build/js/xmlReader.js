/* eslint-disable require-jsdoc */

const xml2js = require( 'xml2js' );

const logger = require( '@swf/tooling/js/logger' );

/**
 * Converts xml files to json in a gulp stream
 * @param {Object} file - the file object
 * @param {Boolean} log - log?
 */
module.exports = function toXml( file, log ) {
    const localVars = {
        parseString: null
    };

    function transform( file ) {
        localVars.parseString = new xml2js.Parser( { mergeAttrs: false } ).parseString;
        if( log ) {
            logger.info( 'Converting ' + file.relative + '...' );
        }
        file.path = file.path.replace( '.xml', '.json' );
        file.relative = file.relative.replace( '.xml', '.json' );
        localVars.parseString( file.contents.toString(), ( err, result ) => {
            file.contents = Buffer.from( JSON.stringify( result, null, 2 ) );
        } );
    }
    transform( file );
};
