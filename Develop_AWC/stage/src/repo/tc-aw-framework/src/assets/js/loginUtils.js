// Copyright (c) 2021 Siemens

/**
 * Helper function for Login
 *
 * @module js/loginUtils
 *
 * @namespace loginUtils
 */
import sessionSvc from 'soa/sessionService';
import _ from 'lodash';
import routeChangeHandler from 'js/routeChangeHandler';
import cfgSvc from 'js/configurationService';
import localeSvc from 'js/localeService';
import AwPromiseService from 'js/awPromiseService';
import eventBus from 'js/eventBus';
import 'config/solutionDef';

/**
 * Sign into the Teamcenter server with the given username and password.
 *
 * @param {String} username - The user name to sign in with.
 * @param {String} password - The user password to sign in with.
 *
 * @return {Promise} A promise that will be resolved when the login is completed.
 */
export async function signIn( username, password ) {
    // clear any error text
    let error;
    let signInPromise = AwPromiseService.instance.defer();
    let authenticator = await routeChangeHandler.pickAuthenticator();
    const group = '';
    const role = '';
    sessionSvc.signIn( username, password, group, role, localeSvc.getLocale(), authenticator.getCurrentDiscriminator() ).then( function( responseData ) {
        authenticator.loginSuccessful();
        signInPromise.resolve( {
            response: responseData,
            error: error
        } );
    } ).catch( function( err ) {
        if( _.has( err, 'cause.message' ) ) {
            // If exception message from Teamcenter server, report as is...
            error = err.cause.message;
            signInPromise.resolve( {
                error: error
            } );
        } else {
            // If unexpected error, report generic message to user.
            localeSvc.getTextPromise( 'LoginMessages' ).then(                function( localTextBundle ) {
                error = localTextBundle.UNABLE_TO_CONNECT;
                signInPromise.resolve( {
                    error: error
                } );
            } );
        }
    } );

    return signInPromise.promise;
}

// eslint-disable-next-line require-jsdoc
export function setSpinnerStatus( spinnerStatus ) {
    let status;

    if( spinnerStatus === 'Active' ) {
        status = null;
    } else if( !spinnerStatus ) {
        status = 'Active';
    }
    return {
        spinnerStatus: status
    };
}

export function updateLocale( localeValue ) {
    if( localeValue.valueUpdated ) {
        localeSvc.setLocale( localeValue.dbValue );
    }
}

/**
 * @param {Object} $scope - scope
 */
function setLoginPageLanguageWithPopupDetails( ) {
    eventBus.subscribe( 'locale.changed', function( ) {
        //reload to ensure memory has been cleared
        window.location.reload( false );
    } );

    return true;
}

/**
 * @param {String[]} installedLanguages - array of installed languages
 * @return {Array} language list
 */
function prepareJsonObject( installedLanguages ) {
    const languageList = [];
    _.forEach( installedLanguages, function( installedLanguage ) {
        _.forOwn( installedLanguage, function( value, key ) {
            languageList.push( {
                propDisplayValue: value,
                propInternalValue: key,
                Selected: false
            } );
        } );
    } );
    return languageList;
}

// eslint-disable-next-line require-jsdoc
export async function initializeData( localeTextLink, username, password, browserTitle ) {
    let newLocaleTextLink = { ...localeTextLink };
    let newUsername = { ...username };
    let newPassword = { ...password };
    setLoginPageLanguageWithPopupDetails();
    const solution = cfgSvc.getCfgCached( 'solutionDef' );

    if( browserTitle ) {
        document.title = browserTitle;
    }

    let brandName = '';
    let productName = '';
    let productVersion = '';
    let companyName = '';
    let copyright = '';

    if( solution && solution.brandName ) {
        brandName = solution.brandName;
    }

    if( solution && solution.solutionName ) {
        productName = solution.solutionName;
    }

    if( solution && solution.solutionVersion ) {
        productVersion = solution.solutionVersion;
    }

    if( solution && solution.companyName ) {
        companyName = solution.companyName.toUpperCase();
    }

    if( solution && solution.copyrightText ) {
        copyright = solution.copyrightText;
    }

    let languagePromise = AwPromiseService.instance.defer();
    let _localPopupTextBundle;

    AwPromiseService.instance.all( [
        localeSvc.getMultiLanguageListPromise( 'LoginLocale' ).then( function( textBundle ) {
            _localPopupTextBundle = textBundle;
            return true; // ensure completion before completing promise
        } )
    ] ).then( function() {
        const _installedLocales = localeSvc.getInstalledLocales();
        const _installedLanguages = [];

        for( let localeKey in _localPopupTextBundle ) {
            if( _installedLocales.indexOf( localeKey ) !== -1 ) {
                const obj = {};
                obj[ localeKey ] = _localPopupTextBundle[ localeKey ];
                _installedLanguages.push( obj );
            }
        }

        const installedLanguages = prepareJsonObject( _installedLanguages );

        const defaultLanguage = localeSvc.getDefaultLanguage( installedLanguages, _localPopupTextBundle );

        newLocaleTextLink.propertyDisplayName = defaultLanguage.uiValue;

        languagePromise.resolve( {
            brandName: brandName,
            productName: productName,
            productVersion: productVersion,
            companyName: companyName,
            copyright: copyright,
            localeTextLink: newLocaleTextLink,
            localeList: installedLanguages,
            totalFound: installedLanguages.length
        } );
    } );

    return languagePromise.promise;
}
