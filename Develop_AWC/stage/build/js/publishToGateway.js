#!/usr/bin/env node

/* eslint-env node */

const{ uniqBy } = require( 'lodash' );
const { src, dest } = require( '@swf/tooling/js/orchestrator' );
const { remove } = require( '@swf/tooling/js/util' );
const { basename, dirname, join, extname } = require( 'path' );
const { get, put } = require( 'superagent' );
const { pathExists, readJson, writeJson, readFile, readdir, readFileSync } = require( 'fs-extra' );

const logger = require( '@swf/tooling/js/logger' );
const { copyFile, writeFile } = require( '@swf/tooling/js/util' );

if( require.main === module ) {
    ( async function() {
        const argv = require( 'yargs' )
            .usage( 'Usage: node $0 <folder path> <Gateway URL>' )
            .options( {
                siteDir: {
                    alias: 'path',
                    description: 'path to site directory',
                    default: process.env.DMS ? './out/site_last' : './out/site',
                    normalize: true
                },
                url: {
                    description: 'Gateway URL'
                }
            } )
            .example( 'node $0', 'Publish local site to remote gateway' )
            .example( 'node $0 --siteDir out/war/xyz --url http://localhost:3000', 'Import files from local directory to a remote gateway' )
            .argv;

        let url = argv._[ 0 ] || argv.url || await _getURLFromTemProperties();
        if( !url ) {
            logger.warn( 'No Gateway URL provided to publish site' );
            return;
        }
        url = url.replace( /\/*$/, '' ); // remove trailing slashes

        if( !await pathExists( argv.siteDir ) ) {
            logger.warn( `Site directory does not exists [${argv.siteDir}]` );
            return;
        }

        // The following is required to support working with self signed certificates (https)
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
        const authtoken = await _getAuthToken( url );

        if( await pathExists( 'out/pathMap.json' ) ) {
            const stopwatch = new logger.Stopwatch();
            const pathMap = await readJson( 'out/pathMap.json' );
            const siteDir = argv.siteDir.substring( 1 );
            const darsiRepo = join( process.cwd(), 'out/darsi_repo' );
            const darsiFileZip = 'darsi_files.zip';
            logger.info( `Creating ${join( darsiRepo, darsiFileZip )}` );

            let srcPaths = [
                'package*.json',
                'build.json',
                'build/js/*',
                'src/build/js/*',
                'src/soa/json/*',
                'out/pathMap.json',
                'node_modules/**/*',
                'node_modules/**/.*.*'
            ];
            if( await pathExists( 'src/image' ) ) {
                srcPaths.push( 'src/image/**/*' );
            }

            await src( srcPaths
                .concat( pathMap.kitsPathArray )
                .concat( pathMap.modulesPathArray ), {
                base: '.',
                dot: true,
                ignore: '**/@(test|examples|flash|.cache)/**'
            } ).then( result => {
                result = uniqBy( result, 'path' );
                return dest( result, darsiRepo, { zip: true, zipFileName: darsiFileZip } );
            } ); // follow flag is used to process through symlink folders
            await src( [
                `${process.cwd()}${siteDir}/assets/**/config/*`,
                `${process.cwd()}${siteDir}/assets/**/image/*`
            ] ).then( result => {
                return dest( result, darsiRepo );
            } );

            // Copy src/images to darsi_repo, so that all the images are copied to darsi_repo
            const rootNodeModules = process.env.NODE_MODULES_OVERRIDE || join( process.cwd(), 'node_modules' );
            let imagesPath = 'src/image/**';
            if( await pathExists( `${rootNodeModules}/@swf/core/src/image` ) ) {
                imagesPath = `${rootNodeModules}/@swf/core/src/image/**`;
            }
            await copyFile( imagesPath, `${darsiRepo}/image` );

            // schema path
            if( await pathExists( `${rootNodeModules}/@swf/tooling/conf` ) ) {
                const schemasPath = `${rootNodeModules}/@swf/tooling/conf/*.json`;
                await copyFile( schemasPath, `${darsiRepo}/schema` );

                const outSchemasPath = `${process.cwd()}${siteDir}/assets/**/config/*Schema.json`;
                await src( outSchemasPath, { base: `${process.cwd()}${siteDir}/assets/config/` } ).then( result => dest( result, `${darsiRepo}/schema` ) );
            }

            let imagesJson = { images: {} };
            for( const child of await readdir( 'out/darsi_repo/image' ) ) {
                if( extname( child ) === '.svg' && !child.startsWith( 'type' ) ) {
                    let file = readFileSync( `out/darsi_repo/image/${child}`, 'utf8' );
                    let fileName = child.replace( /[0-9]+\.svg/, '' );
                    file = transformSVG( fileName, file.replace( /\n/g, '' ) );
                    imagesJson.images[ fileName ] = file;
                }
            }
            await writeFile( `${darsiRepo}/config/images.json`, JSON.stringify( imagesJson ) );

            logger.success( `>>> ${join( darsiRepo, darsiFileZip )} created${stopwatch.end()}` );
        }

        const uploads = [ {
            zipFile: join( dirname( argv.siteDir ), 'site.zip' ),
            zipFolder: argv.siteDir
        } ];

        if( await pathExists( 'out/darsi_repo' ) ) {
            uploads.push( {
                zipFile: join( dirname( argv.siteDir ), 'siteDev.zip' ),
                zipFolder: argv.siteDir
            } );
            uploads.push( {
                zipFile: join( dirname( argv.siteDir ), 'darsi.zip' ),
                zipFolder: join( process.cwd(), 'out', 'darsi_repo' )
            } );
        }

        await Promise.all( uploads.map( async( { zipFile, zipFolder } ) => {
            await remove( zipFile );
            await _zipDirectory( zipFolder, zipFile );
            await _uploadFile( zipFile, url, authtoken );
        } ) );
    } )().catch( err => {
        logger.error( err );
        process.exit( 1 );
    } );
}

/**
 * Get the default URL from tem.properties file
 */
async function _getURLFromTemProperties() {
    const temPropertiesPath = './tem.properties';
    if( await pathExists( temPropertiesPath ) ) {
        const temFile = await readFile( temPropertiesPath, 'utf-8' );
        const temConfig = temFile.split( '\n' )
            .reduce( ( acc, line ) => {
                const [ key, value ] = line.split( '=' );
                acc[ key ] = value ? value.replace( '\r', '' ) : '';
                return acc;
            }, {} );
        return temConfig.gatewayURL;
    }
}

/**
 * @param {String} url - URL for gateway
 * @return {String} authtoken for publish
 */
async function _getAuthToken( url ) {
    const keyPath = join( process.cwd(), 'publish.json' );
    let key = {};
    if( await pathExists( keyPath ) ) {
        key = await readJson( keyPath );
    }
    const authtokenPrefix = '9e5b33cd-ad92-4530-a4c9-ba10dfa1e249';
    let authtoken = `${authtokenPrefix}::${key.key && key.key || ''}`;

    let failed = '';
    const getRes = await get( `${url}/publish` )
        .set( 'authtoken', authtoken )
        .catch( err => {
            if( err.status ) { failed += `${err.status} `; }
            if( err.message ) { failed += `${err.message} `; }
        } );
    if( failed ) {
        throw new Error( `No gateway available at [${url}] - ${failed}` );
    }

    if( getRes && getRes.text && !key.key ) {
        key.key = getRes.text;
        authtoken = `${authtokenPrefix}::${key.key}`;
    }
    await writeJson( keyPath, key );
    return authtoken;
}

/**
 * @param {String} dirPath - directory path
 * @param {String} zipFile - zip file
 */
async function _zipDirectory( dirPath, zipFile ) {
    const stopwatch = new logger.Stopwatch();
    logger.info( `>>> Creating ${zipFile}` );
    const result = await src( [ `${dirPath}/**` ], { dot: true } );
    await dest( result, dirname( zipFile ), { zip: true, zipFileName: basename( zipFile ) } );
    logger.success( `>>> ${zipFile} created${stopwatch.end()}` );
}

/**
 * @param {File} file - path of zip file to upload
 * @param {url} gatewayURL - gateway url
 * @param {String} authtoken - authtoken
 */
async function _uploadFile( file, gatewayURL, authtoken ) {
    const stopwatch = new logger.Stopwatch();
    logger.info( `>>> Uploading to ${gatewayURL}...` );
    await put( `${gatewayURL}/publish` )
        .set( 'authtoken', authtoken )
        .type( 'multipart/form-data' )
        .query( {
            json: JSON.stringify( {
                relPath: basename( file ),
                isBinary: 'T',
                unzip: 'T'
            } )
        } )
        .attach( 'FMS_FORMPART_REPLACE_FILEDATA', file );
    logger.success( `>>> ${file} uploaded to ${gatewayURL}${stopwatch.end()}` );
}

/**
 * Remove or replace certain contents of the given SVG file
 * Used in processing images.json
 *
 * @param {ID} iconName - Icon id
 * @param {String} fileContents - SVG file contents
 * @return {String} transformed SVG
 */
function transformSVG( iconName, fileContents ) {
    let contents = fileContents.replace( /([\r\n]+)/g, '' );
    const replaceAll = ( input, toFind, toReplace ) => input.split( toFind ).join( toReplace );

    // Remove common attributes from the SVG files that are not needed in
    // the icon service.
    // We do this to minimize the VM size of the AW client
    contents = replaceAll( contents, ' xmlns="http://www.w3.org/2000/svg"', '' );
    contents = replaceAll( contents, ' xmlns:xlink="http://www.w3.org/1999/xlink"', '' );
    contents = contents.replace( / id="(Layer_[0-9]+|Artwork)"/, '' );
    contents = replaceAll( contents, ' version="1.1"', '' );
    contents = replaceAll( contents, ' xml:space="preserve"', '' );
    contents = replaceAll( contents, ' x="0px" y="0px"', '' );

    contents = replaceAll( contents, ' data-name="Layer 1"', '' );
    contents = contents.replace( / enable-background="new [0-9]+ [0-9]+ [0-9]+ [0-9]+"/g, '' );
    contents = contents.replace( /[\t]+/g, ' ' ); // Make a 'tab' into a space
    contents = contents.replace( /[ ]+/g, ' ' ); // Make 1-n spaces into a single
    // space
    contents = contents.replace( /> </g, '><' ); // Eliminate spaces between tags
    contents = contents.replace( / = /g, '=' ); // Eliminate spaces between operands

    // FIXME Need to search for id="XYZ" & replace with unique id throughout
    // file. The below is a fragile solution.
    contents = replaceAll( contents, 'Dark_Blue_Grad', 'DRGID_' + iconName );
    contents = replaceAll( contents, 'front_', 'FID_' + iconName + '_' );
    contents = replaceAll( contents, 'Layer_', 'Layer_' + iconName + '_' );
    contents = replaceAll( contents, 'Light_Blue_Grad', 'LBGID_' + iconName );
    contents = replaceAll( contents, 'linear-gradient', 'LGID_' + iconName );
    contents = replaceAll( contents, 'paper_gradient', 'PGID_' + iconName );
    contents = replaceAll( contents, 'New_Gradient_Swatch', 'NGSID_' + iconName );
    contents = replaceAll( contents, 'SVGID_', 'SVGID_' + iconName + '_' );
    contents = replaceAll( contents, 'XMLID_', 'XMLID_' + iconName + '_' );

    return contents;
}
