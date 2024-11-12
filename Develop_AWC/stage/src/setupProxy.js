// Copyright (c) 2021 Siemens
/* eslint-disable no-undef */
// https://create-react-app.dev/docs/proxying-api-requests-in-development/
const { createProxyMiddleware } = require( 'http-proxy-middleware' );
const { writeJsonSync, ensureDirSync } = require( 'fs-extra' );
const logger = require( '@swf/tooling/js/logger' );

const devServerPath = 'out/devServer.json';

let awGateway = process.env.ENDPOINT_GATEWAY || process.env.AW_PROXY_SERVER;
if( /^http:\/\/\bawc\b/.test( awGateway ) ) {
    // if proxy add /aw suffix
    awGateway += '/aw';
}
logger.info( `setupProxy: Routing non-file communication to ${awGateway}` );

ensureDirSync( 'out' );
// Write out a JSON file to allow
writeJsonSync( devServerPath, {
    gatewayURL: awGateway,
    port: process.env.PORT || 3000
}, { spaces: 2 } );
logger.info( `setupProxy: ${devServerPath} written` );

module.exports = function( app ) {
    app.use( [
        // Primary routes
        '/fms/**',
        '/graphql',
        '/hosting',
        '/micro/**',
        '/sd/**',
        '/tc/**',
        '/VisProxyServlet/**',
        '/ping',
        '/performance',
        '/darsi/**',
        // SSO routes
        '/auth',
        '/AWSSOLogin/**',
        '/getSessionVars',
        '/logoff/**',
        '/reauth/**',
        // Test fixtures
        '/cfg_hosted_tests',
        '/ldf_hosted_tests',
        '/mcad_hosted_tests',
        '/nx_hosted_tests'
    ], createProxyMiddleware( {
        target: awGateway,
        changeOrigin: true,
        logProvider: () => {
            return {
                log: logger.log,
                debug: logger.debug, // lower output to silly level
                info: logger.debug, // lower output to silly level
                warn: logger.warn,
                error: logger.error
            };
        }
    } ) );
};
