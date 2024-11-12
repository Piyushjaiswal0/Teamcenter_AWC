// Copyright (c) 2021 Siemens

/**
 * authenticator implementation for handling SSO authentication interaction
 *
 * @module js/ssoAuthenticator
 */
import AwPromiseService from 'js/awPromiseService';
import dataManagementSvc from 'soa/dataManagementService';
import sessionService from 'soa/sessionService';
import tcSessionData from 'js/TcSessionData';
import TypeDisplayNameService from 'js/typeDisplayName.service';
import sessionMgrSvc from 'js/sessionManager.service';
import localeSvc from 'js/localeService';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import browserUtils from 'js/browserUtils';
import $ from 'jquery';
import localStrg from 'js/localStorage';
import serviceUtils from 'js/serviceUtils';
import configSvc from 'js/configurationService';

const _debug = logger.isDebugEnabled();

let exports = {};

// this authenticator has NO client UI
export const isInteractive = false;

/**
 * called during login interaction, for ui scope population, not needed here.
 */
export const setScope = function() {
    // nothing to do here.
};

/**
 * wrap window object access in a function we can mock.
 *
 * @return {Object} structure with window.location pathname, search, and href values
 */
export const getWindowLocProps = function() {
    return {
        pathname: window.location.pathname,
        search: window.location.search,
        href: window.location.href
    };
};

/**
 * wrapper function around the window object access to allow for unit test execution.
 *
 * Having a distinct method allows test logic to mock out the actual call.
 *
 * @param {String} redirectURL - url to redirect
 */
export const triggerOpen = function( redirectURL ) {
    // eslint-disable-next-line no-debugger
    debugger;

    window.open( redirectURL, '_self', '' );
};

/**
 * handler for processing the GetTCSessionInfo response message. Fires the session.updated event.
 *
 * @param {String} soaOkResp - soa response string from GetTCSessionInfo
 */
const sessionInfoSuccessHandling = function( soaOkResp ) {
    if ( _debug ) {
        logger.debug( 'SSOAuth: post getSessionInfo success' );
    }

    if ( tcSessionData ) {
        tcSessionData.parseSessionInfo( soaOkResp );
    }

    // replaces the GWT SessionUpdateEvent
    eventBus.publish( 'session.updated' );
};

/**
 * function to determine if there is already a valid web session or not. Once SSO authentication is done,
 * this should get a valid response. First request of a fresh web load will not be authenticated.
 *
 * @return {Promise} promise invoked when the state is known.
 */
export const checkIfSessionAuthenticated = function() {
    if ( _debug ) {
        logger.debug( 'SSOAuth: attempt getSessionInfo3() checkIfAuth' );
    }
    // Initialize Type Display Name Service, Previously it was initialized in TcSessionData through angular
    // injection but after service conversion and typeDisplayName service is a class we need to initialize here.
    TypeDisplayNameService.instance;

    return dataManagementSvc.getTCSessionInfo().then( function( soaOkResp ) {
        sessionInfoSuccessHandling( soaOkResp );

        // for SSO since the auth is handled externally, we actually expect this to succeed.
        // rather than drive web UI interaction.  So treat this as the result of successful
        // authentication, and let the session manager continue.
        return sessionMgrSvc.authenticationSuccessful();
    } );
};

/**
 * authenticator specific function to carry out authentication. There is a promise returned, but based on
 * the way SSO redirects and reloads, the promise will never get resolved... so the downstream logic never
 * gets called.
 *
 * @return {Promise} promise
 */
export const authenticate = function() {
    if ( _debug ) {
        logger.debug( 'SSOAuth: authenticate function' );
    }

    const devModePath = configSvc.getDevModePath();
    const base = browserUtils.getBaseURL();
    const props = exports.getWindowLocProps();
    const path = props.pathname;
    let queryStr = props.search;
    const href = props.href;
    const hashLoc = href.indexOf( '#' );
    const hash = hashLoc > 0 ? href.substring( hashLoc ) : '';

    let locale = localeSvc.getLocale();
    if ( locale.length === 2 ) {
        // SSO needs the 5 character locale, so "special case" the supported locales
        switch ( locale ) {
            case 'en':
                locale = 'en_US';
                break;
            case 'es':
                locale = 'es_ES';
                break;
            case 'de':
                locale = 'de_DE';
                break;
            case 'fr':
                locale = 'fr_FR';
                break;
            case 'it':
                locale = 'it_IT';
                break;
            default:
                // do nothing
                break;
        }
    }

    if ( !queryStr ) {
        queryStr = '?';
    } else {
        queryStr += '&';
    }


    queryStr += 'locale=' + locale;

    // Correlation Id
    queryStr += `&correlationId=${logger.getCorrelationID2()}`;

    // Operation Id
    queryStr += `&operationId=${logger.getCorrelationID()}`;

    // Session Id
    queryStr += `&sessionId=${serviceUtils.getSessionID()}`;

    //devMode path
    const devModePathRegEx = new RegExp( `^/${devModePath}`, 'i' );
    if( devModePathRegEx.test( path ) ) {
        queryStr += '&devModePath=' + devModePath;
    }

    const redirectURL = base + 'auth' + path + queryStr + hash;

    if ( _debug ) {
        logger.debug( 'SSOAuth:  redirect URL: ' + redirectURL );
    }

    exports.triggerOpen( redirectURL );

    // due to the redirect that happens, this promise never gets resolved.
    return AwPromiseService.instance.defer().promise;
};

/**
 * this is called during the authentication process. It gets invoked after the authentication is
 * completed/ready. It is a spot to do any session level initialization.
 *
 * @return {Promise} promise to be resolved after the authenticator does self initialization
 */
export const postAuthInitialization = function() {
    if ( _debug ) {
        logger.debug( 'SSOAuth:  postAuthInitialization' );
    }

    getSessionDiscriminator().then( sd => {
        localStrg.publish( sessionService.SESSION_DISCRIMINATOR_KEY, sd );
    } );

    // sso has already processed the getTCSessionInfo request, continue the auth flow
    return AwPromiseService.instance.resolve();
};

/**
 * @returns {String} session discriminator
 */
async function getSessionDiscriminator() {
    return new Promise( resolve => {
        $.get( browserUtils.getBaseURL() + 'getSessionDiscriminator' ).done( function( data, status ) {
            if ( status === 'success' ) {
                resolve( data );
            }
            resolve();
        } ).fail( function() {
            resolve();
        } );
    } );
}

/**
 * authenticator function to perform the signout. In this SSO situation we do the same Tc soa call to end
 * the tc session, but then also need to terminate the sso managed session.
 *
 * @return {Promise} promise to be invoked upon completion of the signout tasks
 */
export const signOut = function() {
    return sessionService.signOut();
};

/**
 * @return {String} URL to use post sign out
 */
export const getPostSignOutURL = function() {
    return browserUtils.getBaseURL() + 'logoff' + location.search;
};

export default exports = {
    isInteractive,
    setScope,
    getWindowLocProps,
    triggerOpen,
    checkIfSessionAuthenticated,
    authenticate,
    postAuthInitialization,
    signOut,
    getPostSignOutURL
};
