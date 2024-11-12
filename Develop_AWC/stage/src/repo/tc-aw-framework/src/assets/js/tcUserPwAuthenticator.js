// Copyright (c) 2021 Siemens

/**
 * authenticator implementation for handling user/password based authentication interaction.
 *
 * @module js/tcUserPwAuthenticator
 */
import _ from 'lodash';
import AwPromiseService from 'js/awPromiseService';
import AwTimeoutService from 'js/awTimeoutService';
import dataManagementSvc from 'soa/dataManagementService';
import sessionService from 'soa/sessionService';
import localeSvc from 'js/localeService';
import tcSessionData from 'js/TcSessionData';
import cfgSvc from 'js/configurationService';
import TypeDisplayNameService from 'js/typeDisplayName.service';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import localStrg from 'js/localStorage';
import sessionCtxSvc from 'js/sessionContext.service';

let exports = {};

// this authenticator has UI
export const isInteractive = true;

/**
 * Hold the initial promised created during the authenticate request. It won't get resolved until after the
 * server authentication/signin.
 */
let _loginPromise;

/**
 * handler for processing the GetTCSessionInfo response message. Fires a session.updated event.
 *
 * NOTE: - this subroutine logic is duplicated in the ssoAuthenticator. If you make changes, ensure it stays
 * in sync.
 *
 * @param {String} soaOkResp - soa response string from GetTCSessionInfo
 */
function sessionInfoSuccessHandling( soaOkResp ) {
    if( tcSessionData ) {
        tcSessionData.parseSessionInfo( soaOkResp );
    }

    // replaces the GWT SessionUpdateEvent
    logger.trace( 'UPW: sessionInfoSuccess - fire session.updated event' );
    eventBus.publish( 'session.updated' );
}

/**
 * function to determine if there is already a valid web session or not.
 *
 * @return {Promise} promise invoked when the state is known.
 */
export const checkIfSessionAuthenticated = function() {
    // Initialize Type Display Name Service, Previously it was initialized in TcSessionData through angular
    // injection but after service conversion and typeDisplayName service is a class we need to initialize here.
    TypeDisplayNameService.instance;
    return dataManagementSvc.getTCSessionInfo().then( function( soaOkResp ) {
        sessionInfoSuccessHandling( soaOkResp );
        return soaOkResp;
    } );
};

/**
 * authenticator specific function to carry out authentication. In the interactive case, we just resolve
 * directly to continue the pipeline.
 *
 * @returns {Promise} Resolved when UI interaction completes
 */
export const authenticate = function() {
    _loginPromise = AwPromiseService.instance.defer();
    // return the promise - upon completion of the UI interaction it will get resolved.
    return _loginPromise.promise;
};
/**
 * resolve the login promise after login successful
 */
export const loginSuccessful = function() {
    if( _loginPromise ) {
        _loginPromise.resolve();
    }
};

/**
 * @return {String} current session discriminator
 */
export const getCurrentDiscriminator = function() {
    let _currentDiscriminator = localStrg.get( sessionService.SESSION_DISCRIMINATOR_KEY );
    if ( !_currentDiscriminator ) {
        _currentDiscriminator = `AWC${_.random( 1, 32767 )}`;
        localStrg.publish( sessionService.SESSION_DISCRIMINATOR_KEY, _currentDiscriminator );
    }
    return _currentDiscriminator;
};

sessionCtxSvc.getSessionDiscriminator = getCurrentDiscriminator;

/**
 * this is called during the authentication process. It gets invoked after the authentication is
 * completed/ready. It is a spot to do any session level initialization.
 *
 * @return {Promise} promise to be resolved after the authenticator does self initialization
 */
export const postAuthInitialization = function() {
    return dataManagementSvc.getTCSessionInfo().then( function( soaOkResp ) {
        sessionInfoSuccessHandling( soaOkResp );
        return soaOkResp;
    } );
};

/**
 * triggers the authenticator sign out logic. Returns a promise invoked upon completion
 *
 * @return {Promise} promise to be invoked upon completion of the signout tasks
 */
export const signOut = function() {
    return sessionService.signOut();
};

/**
 * @param {String[]} installedLanguages - array of installed languages
 * @return {Array} language list
 */
function prepareJsonObject( installedLanguages ) {
    const languageList = [];
    _.forEach( installedLanguages, function( installedLanguage ) {
        _.forOwn( installedLanguage, function( value, key ) {
            let item = {};
            item.uiValue = value;
            item.dbValue = key;
            item.isSelected = false;
            languageList.push( item );
        } );
    } );
    return languageList;
}

/**
 * @param {Object} $scope - scope
 */
function setLoginPageLanguageWithPopupDetails( $scope ) {
    eventBus.subscribe( 'locale.changed', function() {
        setLocalizedTextOnLoginPage( $scope );
        setLanguageDataOnScope( $scope, false );
        //reload to ensure memory has been cleared
        window.location.reload( false );
    } );

    setLanguageDataOnScope( $scope, true );
}

/**
 * @param {Object} $scope - scope
 * @param {Boolean} updateLocalStorage - update local storage?
 */
function setLanguageDataOnScope( $scope, updateLocalStorage ) {
    $scope.$evalAsync( function() {
        let _localTextBundle;

        localeSvc.getTextPromise( 'LoginLocale' ).then( function( textBundle ) {
            _localTextBundle = textBundle;

            return true; // ensure completion before completing promise
        } ).then( function() {
            const _installedLocales = localeSvc.getInstalledLocales();
            const _installedLanguages = [];

            for( let localeKey in _localTextBundle ) {
                if( _installedLocales.indexOf( localeKey ) !== -1 ) {
                    let obj = {};

                    obj[ localeKey ] = _localTextBundle[ localeKey ];

                    _installedLanguages.push( obj );
                }
            }

            $scope.installedLanguages = prepareJsonObject( _installedLanguages );

            $scope.defaultLanguage = localeSvc.getDefaultLanguage( $scope.installedLanguages, _localTextBundle );

            if( updateLocalStorage ) {
                localeSvc.setLocaleInLocalStorage( $scope.defaultLanguage.dbValue );
            }
        } );
    } );
}

/**
 * set up the scope values needed by the login view
 *
 * @param {Object} $scope - scope
 */
function setLocalizedTextOnLoginPage( $scope ) {
    let solution;
    let localTextBundle;

    AwPromiseService.instance.all( [
        cfgSvc.getCfg( 'solutionDef' ).then( function( solutionDef ) {
            solution = solutionDef;
            return true; // ensure completion before completing promise
        } ),
        localeSvc.getTextPromise( 'LoginMessages' ).then( function( textBundle ) {
            localTextBundle = textBundle;
            return true; // ensure completion before completing promise
        } )
    ] ).then( function() {
        if( solution && solution.brandName ) {
            $scope.brandName = solution.brandName;
        }

        if( solution && solution.solutionName ) {
            $scope.productName = solution.solutionName + ' ' +
                solution.solutionVersion;
        }

        if( solution && solution.companyName ) {
            $scope.companyName = solution.companyName;
        }

        if( solution && solution.copyrightText ) {
            $scope.copyright = solution.copyrightText;
        }

        $scope.userNamePlaceHolder = localTextBundle.USER_NAME_PLACEHOLDER;
        $scope.passwordPlaceHolder = localTextBundle.PASSWORD_PLACEHOLDER;
        $scope.signInText = localTextBundle.SIGN_IN_TEXT;
    } );
}

/**
 * revisitme- move this logic to LoginService/LoginViewModel
 * set up the scope values needed by the login view
 *
 * @param {Object} $scope - scope
 */
export const setScope = function( $scope ) {
    setLoginPageLanguageWithPopupDetails( $scope );

    $scope.userName = '';
    $scope.password = '';
    $scope.group = '';
    $scope.role = '';
    $scope.errorText = '';
    $scope.showpopup = false;

    $scope.hideInstalledLanguagePopup = function() {
        $scope.$evalAsync( function() {
            $scope.showpopup = false;
            AwTimeoutService.instance( function() {
                $( 'body' ).off( 'click', $scope.hideLinkPopUp );
            }, 200 );
        } );
    };

    $scope.showInstalledLanguagePopup = function( $event ) {
        $scope.showpopup = !$scope.showpopup;
        if( $scope.showpopup ) {
            $scope.setPopupHeight( $event );

            $scope.$on( 'windowResize', $scope.hideInstalledLanguagePopup );

            // delay click subscription to avoid getting notified of the show popup click
            AwTimeoutService.instance( function() {
                $( 'body' ).on( 'click', $scope.hideLinkPopUp );
            }, 200 );
        }
    };

    $scope.setPopupHeight = function( event ) {
        const maxHeight = $( window ).innerHeight() - event.pageY - 15;
        $scope.popupStyle = {
            'max-height': maxHeight + 'px'
        };
    };

    $scope.hideLinkPopUp = function( event ) {
        event.stopPropagation();
        let parent = event.target;
        while( parent && parent.className !== 'aw-layout-popup aw-layout-popupOverlay afx-content-background' ) {
            parent = parent.parentNode;
        }
        // above logic is fragile, below would be better, but needs a more sophisticated test to support
        // let parent = $( event.target ).closest( '.aw-layout-popup.aw-layout-popupOverlay' )[0];

        if( !parent ) {
            $scope.hideInstalledLanguagePopup();
        }
    };

    $scope.setSelectedLanguage = function( selectedLang ) {
        $scope.hideInstalledLanguagePopup();
        if( selectedLang.dbValue !== $scope.defaultLanguage.dbValue ) {
            localeSvc.setLocale( selectedLang.dbValue );
        }
    };

    setLocalizedTextOnLoginPage( $scope );
    //Show / hide the progress indicator depending on network activity
    const progressStartListener = eventBus.subscribe( 'progress.start', function() {
        $scope.$evalAsync( function() {
            $scope.networkActive = true;
        } );
    } );

    const progressStopListener = eventBus.subscribe( 'progress.end', function() {
        $scope.$evalAsync( function() {
            $scope.networkActive = false;
        } );
    } );

    $scope.$on( '$destroy', function() {
        eventBus.unsubscribe( progressStartListener );
        eventBus.unsubscribe( progressStopListener );
    } );

    /**
     * Note: Bound to 'ng-click' of 'sign in' button.
     */
    $scope.login = function() {
        // clear any error text
        $scope.errorText = '';

        sessionService.signIn( $scope.userName, $scope.password, $scope.group, $scope.role,
            localeSvc.getLocale(), getCurrentDiscriminator() ).then( function( responseData ) {
            // create AuthenticationCompleteInfo structure?
            if( _loginPromise ) {
                _loginPromise.resolve();
            }
            return responseData;
        } ).catch( function( err ) {
            if( _.has( err, 'cause.message' ) ) {
                // If exception message from Teamcenter server, report as is...
                $scope.errorText = err.cause.message;
            } else {
                // If unexpected error, report generic message to user.
                localeSvc.getTextPromise( 'LoginMessages' ).then(
                    function( localTextBundle ) {
                        $scope.errorText = localTextBundle.UNABLE_TO_CONNECT;
                    } );
            }
            // create AuthenticationCompleteInfo structure?
        } );
    };
};

export default exports = {
    isInteractive,
    checkIfSessionAuthenticated,
    authenticate,
    postAuthInitialization,
    signOut,
    setScope,
    loginSuccessful,
    getCurrentDiscriminator
};
