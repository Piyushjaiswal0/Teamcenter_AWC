/* eslint-env node */
/* eslint-disable no-implicit-globals */
/* eslint-disable valid-jsdoc */

const _ = require( 'lodash' );
const { task } = require('@swf/tooling/js/orchestrator');
const logger = require( '@swf/tooling/js/logger' );
const util = require( '@swf/tooling/js/util' );

//Generates the api documentation viewer in out/soa/api
task( 'genSoaApi').series(async () => {
    const {generate} = require( './build/js/genSoaApi' );
    await generate();
    if( process.platform === 'win32' ) {
        try {
            await util.spawn( 'cmd', [ '/c', 'start', 'out/soa/api/index.html' ] )
        }catch(error){
            logger.pipeErrorHandler(error);
        }
    }
} );
