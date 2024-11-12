#!/usr/bin/env node

/* eslint-disable require-jsdoc */
/* eslint-disable sonarjs/cognitive-complexity */

const _ = require( 'lodash' );
const { src, dest } = require( '@swf/tooling/js/orchestrator' );
const fs = require( 'fs' );

const logger = require( '@swf/tooling/js/logger' );
const util = require( '@swf/tooling/js/util' );

const toJs = require( __dirname + '/xmlReader' );

const start = async function( argv ) {
    if( argv.length === 2 ) {
        logger.severe( 'No arguments provided!' );
    }

    const srcDir = [];
    for( let ii = 2; ii < argv.length; ii++ ) {
        let templateDir = argv[ ii ];
        if( fs.existsSync( templateDir ) ) {
            if( fs.existsSync( templateDir + '/out' ) ) {
                templateDir += '/out';
            }
            if( fs.existsSync( templateDir + '/templates' ) ) {
                templateDir += '/templates';
            }
            srcDir.push( templateDir + '/*_template.xml' );
        }
    }
    const outDir = util.normalizePath( 'out/soa/json' );
    await src( srcDir ).then( result =>{
        _.forEach( result, file =>{
            toJs( file );
            minimize( file );
        } );
        return Promise.resolve( result );
    } ).then( result =>{
        return dest( result, outDir, { mode:0o777 } );
    } ).then( ()=> logger.success( 'Finished converting templates from XML to JSON in ' + util.shortenPath( outDir ) ) ).catch( error =>{
        logger.pipeErrorHandler( error );
    } );

    function collapse( template ) {
        _.forEach( template, ( value, key ) => {
            if( key === '$' ) {
                _.forEach( value, ( value2, key2 ) => {
                    template[ key2 ] = value2;
                } );
                delete template.$;
            } else {
                collapse( value );
            }
        } );
    }

    /**
     * recursively sort object keys alphabetically
     * implementation sensitive - json is unsorted, this only works because v8 sorts objects based on when the property was set
     *
     * @param {Object} obj - object
     * @return {Object} sorted object
     */
    function sortObject( obj ) {
        if( typeof obj !== 'object' ) {
            return obj;
        }
        let retVal;
        if( Array.isArray( obj ) ) {
            retVal = [];
            Object.keys( obj ).sort().forEach( k => retVal.push( sortObject( obj[ k ] ) ) );
        } else {
            retVal = {};
            Object.keys( obj ).sort().forEach( k => retVal[ k ] = sortObject( obj[ k ] ) );
        }
        return retVal;
    }

    /**
     * @param {Object} file the file Object
     */
    function minimize( file ) {
        const handledProperties = [
            'Struct', // structs
            'MetaEnum', // enums
            'Typedef', // maps
            'Operation', // operation descriptions
            'OperationTemplate', // operations
            'TemplateDataType', // maps, sets, etc
            'PrimitiveDataType', // primitives
            'BusinessObjectInterface', // stuff that becomes ModelObjects
            'ExternalDataType', // ModelObject, etc
            'Release', // release info - used to determine service year
            'Library', // libraries
            'ServiceInterface', // services
            '$' // build info
        ];

        /**
         * @param {Object} a - first object
         * @param {Object} b - second object
         * @returns {Number} 0 - same, 1 - a > b, 2 - a < b
         */
        function nameCmp( a, b ) {
            if( a.$.name < b.$.name ) {
                return -1;
            }
            if( a.$.name > b.$.name ) {
                return 1;
            }
            return 0;
        }

        function transform( file ) {
            try {
                let template = JSON.parse( file.contents.toString() );
                template.TcBusinessData.Add[ 0 ].$ = template.TcBusinessData.$;
                template = template.TcBusinessData.Add[ 0 ];
                if( _.isString( template ) ) {
                    logger.warn( `Skipping ${file.path.replace( /\.json$/, '.xml' )} due to no content in Add block.` );
                    file.contents = Buffer.from( JSON.stringify( {}, null, 2 ) );
                    return;
                }
                for( const i in template ) {
                    if( !handledProperties.includes( i ) ) {
                        delete template[ i ];
                    }
                }
                for( const i in template ) {
                    if( i !== '$' ) {
                        template[ i ].sort( nameCmp );
                    }
                }
                collapse( template );
                template = sortObject( template );
                file.contents = Buffer.from( JSON.stringify( template, null, 2 ) );
            } catch ( err ) {
                logger.severe( `Error processing ${file.path.replace( /\.json/, '.xml' )}` );
                logger.severe( err );
                file.contents = Buffer.from( JSON.stringify( {}, null, 2 ) );
            }
        }

        transform( file );
    }
};
module.exports = start;

( async() => {
    if( require.main === module ) {
        await start( process.argv );
    }
} )();
