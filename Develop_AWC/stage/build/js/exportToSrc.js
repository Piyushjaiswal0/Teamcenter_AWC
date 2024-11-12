const { lstatSync } = require( 'fs' );
const { spawn } = require( '@swf/tooling/js/util' );
const darsiExport = require( '@swf/tooling/js/exportToSrc' );

const argv = require( 'yargs' )
    .demandCommand( 0 )
    .usage( 'Usage: $0 <AW URL>' )
    .example( 'node $0', 'Import changes from a server with Darsi enabled into dev unit' )
    .options( {
        moduleName: {
            description: 'module for all new source'
        }
    } )
    .argv;

let imagePath = '';


const awUrl = argv._[ 0 ] || 'http://localhost:3000';
const url = `${awUrl}/darsi`;
const options = {
    url: url,
    moduleName: argv.moduleName,
    imagePath: imagePath,
    checkoutFunction: process.env.DMS ? function( filePath ) {
        return spawn( 'jt.cmd', [
            'co',
            filePath
        ], null, null, () => null );
    } : null
};

darsiExport( options );
