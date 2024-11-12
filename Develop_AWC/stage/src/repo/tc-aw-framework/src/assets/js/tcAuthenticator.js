// Copyright (c) 2022 Siemens

/**
 * @module js/tcAuthenticator
 */
import AwHttpService from 'js/awHttpService';
import browserUtils from 'js/browserUtils';
import logger from 'js/logger';
import configSvc from 'js/configurationService';
import io from 'socket.io-client/dist/socket.io';
import eventBus from 'js/eventBus';

/**
 * {Boolean} TRUE if logging of certain milstone activities should occur.
 */
const _debug_logAuthActivity = browserUtils.getUrlAttributes().logAuthActivity !== undefined;

const logPrefix = 'tcAuthenticator: getAuthenticator: ';

let webSocketsEnabled;

export let _sessionWS = null;


/**
 * Delegate to the user name/password type authentication.
 *
 * @return {Promise} Resolved with reference to {tcUserPwAuthenticator} service when loaded.
 */
function userAuth() {
    if ( _debug_logAuthActivity ) {
        logger.info( logPrefix + 'Using userAuth' );
    }
    return import( 'js/tcUserPwAuthenticator' );
}

/**
 * Call the afx-gateway to get the configured session variables
 *
 * @returns {Object} - session variables
 */
async function getSessionVars() {
    const $http = AwHttpService.instance;
    const { data, status } = await $http.get( browserUtils.getBaseURL() + 'getSessionVars' );
    if( status === 200 ) {
        exports.ConfigValues = data; // key value pairs?
        const devModePath = data.devModePath || 'devMode';
        webSocketsEnabled = data.webSocketsEnabled || true;
        const regEx = new RegExp( `/${devModePath}(|/)$`, 'i' );
        configSvc.setDarsiEnabled( regEx.test( window.location.pathname ), devModePath );
    }
    return data || {};
}

/**
 * Delegate to the Single Sign On (SSO) type authentication (if enabled)
 *
 * @param {Object} sessionVars - The session variables recieved from afx-gateway
 * @return {Promise} Resolved with reference to {ssoAuthenticator} (or undefined if not using SSO).
 */
function ssoAuth( sessionVars ) {
    return new Promise( resolve => {
        // Find the SSOenabled value - for explicit exposure.  It is a string.
        if ( sessionVars.tcSSOEnabled && sessionVars.tcSSOEnabled.toLowerCase() === 'true' ) {
            if ( _debug_logAuthActivity ) {
                logger.info( logPrefix + 'Using ssoAuth' );
            }
            import( 'js/ssoAuthenticator' ).then( resolve );
            return; // don't resolve yet
        }
        resolve();
    } );
}

/**
 * Check if the app is being hosted and (if so) does it thing the user is authorized.
 *
 * @return {Promise} Resolved with a reference to the {hostAuthenticatorService} once it is determined
 * hosting is not being used OR the host returns TRUE from 'canIProcess' call (or NULL otherwise).
 */
function hostAuth() {
    // 1-A) is hosting flag on the URL  (-ah query string) see Hosting startup handler checks, and
    //     HostDetection.  The hosting case relies heavily on GWT, so that gets triggered in the bootstrap

    // only use the hosting authenticator if hosting flag is actually set.
    const urlAttrs = browserUtils.getWindowLocationAttributes();

    if ( urlAttrs.ah ? urlAttrs.ah.toLowerCase() === 'true' : false ) {
        let _hostAuthenticatorSvc;

        return import( 'js/hosting/hostAuthenticatorService' )
            .then( function( hostAuthenticatorSvc ) {
                _hostAuthenticatorSvc = hostAuthenticatorSvc.default;
                return _hostAuthenticatorSvc.canIProcess();
            } ).then( function( canIProcess ) {
                if ( _debug_logAuthActivity ) {
                    logger.info( `tcAuthenticator: hostAuth: hostAuthenticatorSvc.canIProcess: ${canIProcess}` );
                }
                if ( canIProcess ) {
                    if ( _debug_logAuthActivity ) {
                        logger.info( logPrefix + 'Using hostAuth' );
                    }
                    return _hostAuthenticatorSvc;
                }
                return null;
            } );
    }

    if ( _debug_logAuthActivity ) {
        logger.info( 'tcAuthenticator: hostAuth: ' + 'Not in host mode' );
    }

    return Promise.resolve( null );
}

/**
 * Establish web-socket connection for each session (tab AW is opened in)
 */
let sessionWebSocket = function() {
    let baseUrl = new URL( browserUtils.getBaseURL() );
    let protocol = baseUrl.protocol === 'https:' ? 'wss' : 'ws';
    let urlPath = baseUrl.pathname.replace( /\/$/, '' ); //remove trailing slash

    _sessionWS = io( `${protocol}://${baseUrl.host}/session-namespace`, {
        transports: [ 'websocket' ],
        path: `${urlPath}/socket.io`,
        upgrade: false
    } );

    _sessionWS.on( 'connect_error', () => {
        _sessionWS.close();
    } );

    _sessionWS.on( 'connect', () => {
        _sessionWS.emit( 'join-room', {
            roomId: 1,
            memberId: 1
        } );
    } );
};

/**
 * session.updated is fired after every successful getTCSessionAnalyticsInfo call, which is when we should register a new session websocket
 */
eventBus.subscribe( 'session.updated', () => {
    if( webSocketsEnabled === true ) {
        sessionWebSocket();
    }
} );


// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

let exports = {};

/**
 * Determine which authenticator we have access to.
 *
 * @returns {Promise} Resolved with the authenticator we determined to to use ('hosting', 'sso' or 'user').
 */
export let getAuthenticator = async function() {
    // Decision algorithm for which authenticator
    // 1) hosting gets first dibs.   (that decision is a bit complicated)
    // 2) if NOT hosting, then check for SSO
    // 3) if NOT hosting and not SSO Enabled, then fallback to userPW
    const sessionVars = await getSessionVars();

    return await hostAuth() || await ssoAuth( sessionVars ) || await userAuth();
};

export default exports = {
    getAuthenticator
};
