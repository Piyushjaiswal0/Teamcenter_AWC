// Copyright (c) 2021 Siemens
/* eslint-env node */
const { join, basename, dirname } = require( 'path' );
const logger = require( '@swf/tooling/js/logger' );
const { spawn, replaceEnvVar, normalizePath } = require( '@swf/tooling/js/util' );
const { existsSync, readdirSync, lstatSync, writeFileSync, ensureDirSync } = require( 'fs-extra' );
const _ = require( 'lodash' );
const { src } = require( '@swf/tooling/js/orchestrator' );
const xml2js = require( 'xml2js' );
const preAuditPrep = require( '@swf/tooling/js/preAuditPrep' );
const staticCodeAnalysis = require( '@swf/tooling/js/staticCodeAnalysis' );
const buildJson = require( '../../build.json' );

const cmdSuffix = process.platform === 'win32' && '.cmd' || ''; // path.join( process.env.NODEJS_HOME, 'npm.cmd' );
const msgPrefix = '+ ';
let cache = null;
let createCachePromise = null;

const stopwatchAll = new logger.Stopwatch();

( async function() {
    await pregulp();
    await prepareCacheForAudit();

    const dirsToSkip = [
        'build', 'generator', 'repo', 'soa'
    ];
    const eslintArgs = [
        '--quiet',
        '--no-error-on-unmatched-pattern',
        join( process.cwd(), 'src/*.js' )
    ];
    const srcContents = readdirSync( 'src' );
    for( const srcDir of srcContents ) {
        if( !dirsToSkip.includes( srcDir ) && lstatSync( `src/${srcDir}` ).isDirectory() ) {
            eslintArgs.push( join( process.cwd(), `src/${srcDir}/**/*.js` ) );
        }
    }
    for( let ndx = 2; ndx < process.argv.length; ndx++ ) {
        eslintArgs.push( process.argv[ ndx ] );
    }

    const eslintPatterns = generateIgnorePatternsForEslint();
    _.forEach( eslintPatterns, pattern => eslintArgs.push( pattern ) );

    await eslintAudit( eslintArgs );
    await staticCodeAudit();

} )().catch( err => {
    process.exitCode = process.exitCode || 1;
    logger.debug( err.stack );
    logger.error( `FAILED! Exit code = ${process.exitCode}${stopwatchAll.end()}` );
} );

/**
 * Generate ESlint Ignore patterns
 * @returns {Array} Array of String ignore patterns
 */
const generateIgnorePatternsForEslint = () => {
    let patterns = [];
    if( !cache && !cache.name2moduleJson ) {
        return patterns;
    }
    let cwd = process.cwd();
    cwd = cwd.replace( /\\/g, '/' );
    _.forEach( cache.name2moduleJson, moduleJson => {
        if( moduleJson.skipAudit === true && !/[\\/](node_modules)[\\/]/.test( moduleJson.moduleDir ) && !/\/repo\//.test( moduleJson.moduleDir ) ) {
            const regex = `**${moduleJson.moduleDir.replace( cwd, '' ).replace(/\/module.json/,'')}/**`;
            patterns.push( '--ignore-pattern' );
            patterns.push( regex );
        }
    } );
    return patterns;
};

/**
 * Eslint Function - lints all JavaScript code based on the eslint rules defined in the .eslintrc.js
 *
 * @param {Array} args array of arguments
 */
async function eslintAudit( args ) {
    const stopwatchEslint = new logger.Stopwatch();
    let count = 0;
    const cwdRegEx = new RegExp( `^${process.cwd().replace( /\\/g, '\\\\' )}` );
    const eslint = join( process.cwd(), `node_modules/.bin/eslint${cmdSuffix}` );
    const code = await spawn( eslint, args, null, null, line => {
        if( cwdRegEx.test( line ) ) {
            count++;
        }
    }, msgPrefix );
    if( count ) {
        logger.error( `${count} files with issues.` );
    }
    if( code !== 0 ) {
        process.exitCode = code;
        throw new Error( 'eslintAudit' );
    } else {
        logger.success( `Eslint Successful${stopwatchEslint.end()}` );
    }
}

/**
 * Ensure that the createCache.js can create a valid cache.json
 */
async function pregulp() {
    const locals = await createCache();
    await ensureDirSync( 'out' );
    await writeFileSync( 'out/cache.json', JSON.stringify( locals.cache, null, 2 ) );
}

/**
 * Prepare cache for audit
 */
async function prepareCacheForAudit() {
    const stopwatchPreAudit = new logger.Stopwatch();
    const cacheJsonPath = `${process.cwd()}/out/cache.json`;
    const internalCache = existsSync( cacheJsonPath ) && require( cacheJsonPath ) || {};

    //Static Code Analysis
    internalCache.name2moduleJson = {};
    _.forEach( internalCache.filePath2moduleJson, ( moduleJson ) => {
        internalCache.name2moduleJson[ moduleJson.name ] = moduleJson;
    } );

    internalCache.name2kitJson = {};
    _.forEach( internalCache.filePath2kitJson, ( kitJson ) => {
        internalCache.name2kitJson[ kitJson.name ] = kitJson;
    } );
    await preAuditPrep( internalCache );
    cache = internalCache;

    logger.success( `PreAuditPrep Successful${stopwatchPreAudit.end()}` );
}

/**
 * Static Code Analysis - run the staticCodeAnalysis.js to analyzes files to identify any potential antipatterns
 */
async function staticCodeAudit() {
    const stopwatchStaticCodeAnalysis = new logger.Stopwatch();
    _.forEach( cache.filePath2moduleJson, async ( moduleJson, filePath ) => {
        if( /\/node_modules\//.test( filePath ) ||
            moduleJson.type.includes( 'repo' ) ||
            moduleJson.type.includes( 'selenium' ) ||
            moduleJson.excludeFromAuditDeps ||
            moduleJson.skipAudit ) {
            return; // continue
        }

        moduleJson.auditPromise = new Promise( resolve => { { moduleJson.auditResolve = resolve; } } );
        let srcSCA = [
            moduleJson.moduleDir + '/commandsViewModel.json',
            moduleJson.moduleDir + '/syncStrategy.json',
            moduleJson.moduleDir + '/states.json',
            moduleJson.moduleDir + '/workspace*.json',
            moduleJson.moduleDir + '/actionTemplateDefs.json',
            moduleJson.moduleDir + '/paste.json',
            moduleJson.moduleDir + '/nodeDefs.json',
            moduleJson.moduleDir + '/dragAndDrop.json',
            moduleJson.moduleDir + '/secondaryWorkareaTabs.json',
            moduleJson.moduleDir + '/decorators.json',
            moduleJson.moduleDir + '/propertyRendererTemplates.json',
            moduleJson.moduleDir + '/deltas.json'

        ];

        if( moduleJson.type.includes( 'java' ) ) {
            srcSCA = srcSCA.concat( [
                moduleJson.srcDir + '/**/*.java'
            ] );
        }

        if( moduleJson.srcDir ) {
            srcSCA = srcSCA.concat( [
                moduleJson.srcDir + '/*.@(css|scss)',
                moduleJson.srcDir + '/**/*.@(html|js|json|xml)'
            ] );
        }

        if( moduleJson.testDir ) {
            srcSCA.push( moduleJson.testDir + '/**/*.js' );
        }

        const srcDirPathsXsd = [];
        const srcDirPathsI18n = [];
        for( const moduleJson2 of Object.values( cache.name2moduleJson ) ) {
            if( moduleJson2.srcDir ) {
                srcDirPathsXsd.push( moduleJson2.srcDir + '/schema/**/*.xsd' );
                srcDirPathsI18n.push( moduleJson2.srcDir + '/i18n/*Messages.json' );
                srcDirPathsI18n.push( moduleJson2.srcDir + '/i18n/*Constants.json' );
            }
        }
        srcDirPathsXsd.sort();
        srcDirPathsI18n.sort();
        cache.audit.xsd = {};
        cache.audit.i18n = {};

        const i18nSCA = src( srcDirPathsI18n ).then( result => {
            _.forEach( result, file => {
                if( file.contents ) {
                    const filename = basename( file.path, '.json' );
                    const contents = JSON.parse( file.contents.toString() );
                    cache.audit.i18n[ filename ] = Object.keys( contents );
                }
            } )
        } );

        const xsdSCA = src( srcDirPathsXsd ).then( result => {
            _.forEach( result, file => {
                if( file.contents ) {
                    const filename = basename( file.path, '.xsd' );
                    const parser = new xml2js.Parser();
                    parser.parseString( file.contents.toString(), ( err, results ) => {
                        if( err ) {
                            logger.error( `Error parsing ${filename}\n${err}`, 'pre-audit: ' );
                        } else if( !results[ 'declUI:schema' ] || Object.keys( results ).length !== 1 ) {
                            logger.error( `Invalid schema for ${file.path}`, 'pre-audit: ' );
                        } else {
                            cache.audit.xsd[ filename ] = results[ 'declUI:schema' ];
                        }
                    } );
                }
            } );
        } );

        const prePromises = [];
        prePromises.push( i18nSCA );
        prePromises.push( xsdSCA );
        await Promise.all( prePromises ).catch( err => {
            logger.error( err, 'pre-audit: ' );
            logger.pipeErrorHandler( new Error( `Module ${moduleJson.name} failed audit!` ) );
        } );

        const promises = [];

        const gulpSrcSCA = src( srcSCA ).then( result => {
            _.forEach( result, file => {
                staticCodeAnalysis( file, moduleJson.name, cache );
            } )
        } );

        promises.push( gulpSrcSCA );
        Promise.all( promises ).then( () => {
            logger.success( `Static Code Analysis Successful${stopwatchStaticCodeAnalysis.end()}` );
        } ).catch( err => {
            logger.error( err, 'audit: ' );
            logger.pipeErrorHandler( new Error( `Module ${moduleJson.name} failed audit!` ) );
        } );
    } );
}

/**
 * Creates cache required for audit.
 *
 * @returns {Promise} Promise to write cache.
 */
async function createCache() {
    const cache = {
        filePath2moduleJson: {},
        filePath2kitJson: {},
        name2moduleJson: {},
        audit: {
            xsd: {}
        }
    };

    const kitJsons = [];

    // Add a module to the cache
    // eslint-disable-next-line require-jsdoc
    function addModule( file ) {
        let filePath = normalizePath( file.path );
        const folder = normalizePath( dirname( file.path ) );
        const moduleJson = JSON.parse( file.contents );
        cache.name2moduleJson[ moduleJson.name ] = moduleJson;
        moduleJson.moduleDir = folder;
        if( !moduleJson.name ) {
            moduleJson.name = basename( folder );
        }
        if( !moduleJson.type ) {
            moduleJson.type = [ 'native' ];
        }
        cache.filePath2moduleJson[ filePath ] = moduleJson;
        const hasSrcDir = moduleJson.hasOwnProperty( 'srcDir' );
        if( !hasSrcDir && ( moduleJson.type.includes( 'native' ) || moduleJson.type.includes( 'repo' ) ) ) {
            moduleJson.srcDir = 'src';
        }
        if( moduleJson.type.includes( 'repo' ) ||
            moduleJson.type.includes( 'native' ) && ( hasSrcDir && moduleJson.srcDir.length === 0 ) ) {
            moduleJson.skipAudit = true; // nothing to audit (tests?)
            moduleJson.skipTest = true; // nothing to test
        }
        if( !moduleJson.testDir &&
            moduleJson.type.includes( 'native' ) &&
            existsSync( `${folder}/test` ) ) {
            moduleJson.testDir = 'test';
        }
        if( moduleJson.testDir ) {
            moduleJson.testDir = `${folder}/${moduleJson.testDir}`;
            if( !moduleJson.skipTest && !existsSync( moduleJson.testDir ) ) {
                throw new Error( `Directory does not exist! - ${moduleJson.testDir}` );
            }
        }
        if( moduleJson.siteDir ) {
            moduleJson.siteDir = replaceEnvVar( moduleJson.siteDir );
        }
        if( moduleJson.featureDir ) {
            moduleJson.featureDir = `${folder}/${moduleJson.featureDir}`;
        }
        if( moduleJson.propertiesDir ) {
            moduleJson.propertiesDir = `${folder}/${moduleJson.propertiesDir}`;
        }
        if( moduleJson.jars ) {
            // Update jar references to be absolute paths
            for( let ii = 0; ii < moduleJson.jars.length; ii++ ) {
                moduleJson.jars[ ii ] = `${folder}/${moduleJson.jars[ ii ]}.jar`;
            }
        }
        if( moduleJson.srcDir ) {
            moduleJson.srcDir = `${folder}/${moduleJson.srcDir}`;
            if( !existsSync( moduleJson.srcDir ) ) {
                // throw new Error( `Directory does not exist! - ${moduleJson.srcDir}` );
                delete moduleJson.srcDir;
            }
        }
    }

    // Add a kit to the cache
    // eslint-disable-next-line require-jsdoc
    function addKit( file ) {
        const kitJson = JSON.parse( file.contents );
        kitJsons.push( kitJson );
        cache.filePath2kitJson[ file.path ] = kitJson;
    }
    let srcPaths = [
        'build.json',
        '!out/**',
        '!**/conf/generator/**'
    ];
    if( buildJson && buildJson.srcPaths ) {
        for( const srcPath of buildJson.srcPaths ) {
            if( /^!/.test( srcPath ) ) {
                srcPaths.push( srcPath );
            } else {
                srcPaths.push( `${srcPath}/**/@(kit|module|site_*|war_*).json` );
            }
        }
    }

    createCachePromise = createCachePromise || src( srcPaths ).then( result => {
        _.forEach( result, file => {
            const filePath = file.path;
            if( /module\.json$/.test( filePath ) ) {
                addModule( file );
            } else if( /kit\.json$/.test( filePath ) ) {
                addKit( file );
            } else {}
        } )
        return Promise.resolve( result );
    } ).then( () => {
        cache.sca = require( '../../conf/staticCodeAnalysis.json' );
        return {
            cache: cache,
            kitJsons: kitJsons
        };
    } ).catch( e => logger.error( e.stack ) );

    return createCachePromise;
}

process.on( 'SIGINT', () => {
    logger.warn( 'SIGINT' );
    logger.verbose( `Runtime${stopwatchAll.end()}` );
    process.exit( 2 );
} );
