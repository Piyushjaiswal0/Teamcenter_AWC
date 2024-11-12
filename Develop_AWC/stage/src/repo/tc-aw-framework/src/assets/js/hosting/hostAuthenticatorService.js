// Copyright (c) 2022 Siemens

/**
 * Authenticator implementation for handling authentication interaction in a hosted environment.
 *
 * @module js/hosting/hostAuthenticatorService
 * @namespace hostAuthenticatorService
 */
import tcSessionData from 'js/TcSessionData';
import appCtxSvc from 'js/appCtxService';
import dms from 'soa/dataManagementService';
import contextSvc from 'js/sessionContext.service';
import sessionMgrSvc from 'js/sessionManager.service';
import soaSvc from 'soa/kernel/soaService';
import sessionSvc from 'soa/sessionService';
import hostSupportSvc from 'js/hosting/hostSupportService';
import hostConfigSvc from 'js/hosting/hostConfigService';
import hostInteropSvc from 'js/hosting/hostInteropService';
import hostSessionSvc from 'js/hosting/inf/services/hostSession_2014_07';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import eventBus from 'js/eventBus';
import hostServices from 'js/hosting/hostConst_Services';
import hostConfigKeys from 'js/hosting/hostConst_ConfigKeys';
import TypeDisplayNameService from 'js/typeDisplayName.service';
import $ from 'jquery';
import localStrg from 'js/localStorage';

// service
import AwBaseService from 'js/awBaseService';
import AwPromiseService from 'js/awPromiseService';

class HostAuthenticatorService extends AwBaseService {
    constructor() {
        super();

        /**
         * {Boolean} TRUE if ... should be logged.
         */
        this._debug_logHandShakeActivity = browserUtils.getUrlAttributes().logHandShakeActivity !== undefined;

        /**
         * this is a continuation used by the canIProcess logic.
         */
        this._canIProcessDeferral;

        /**
         * Object used to hold the result of the last successful call to 'getTCSessionInfo' API.
         */
        this._tcSessionInfoResponse = null;

        /**
         * A 'timeout' used to handle when the 'host' does not responde is a fix period of time.
         */
        this._hostingStartupTimeoutHdlr;

        /**
         * Register for this hosting specific event.  It gets triggered once all the Hosting service
         * registration and Handshake process completes. Can't really invoke any host interop services or checks
         * till that completes.
         */
        this._configuredDeferral = AwPromiseService.instance.defer();

        /**
         * This authenticator has NO client UI
         *
         * @memberof hostAuthenticatorService
         */
        this.isInteractive = false;

        if( hostConfigSvc.isSet() ) {
            if( this._debug_logHandShakeActivity ) {
                hostInteropSvc.log( 'hostAuthenticatorService: hosting.configured already set' );
            }
            this._configuredDeferral.resolve();
        } else {
            eventBus.subscribe( 'hosting.configured', () => {
                if( this._debug_logHandShakeActivity ) {
                    hostInteropSvc.log( 'hostAuthenticatorService: hosting.configured' );
                }

                this._configuredDeferral.resolve();
            } );
        }
    }

    /**
     * Stop pending timeout
     *
     * @param {String} reasonMsg - Debug msg for how we got here.
     */
    clearTimeoutFunc( reasonMsg ) {
        if( this._hostingStartupTimeoutHdlr ) {
            if( this._debug_logHandShakeActivity ) {
                hostSupportSvc.log( 'hostAuthenticatorService: Clearing startup timeout function - clearTimeout: ' + reasonMsg );
            }

            clearTimeout( this._hostingStartupTimeoutHdlr ); // kill the timeout function

            this._hostingStartupTimeoutHdlr = null;
        }
    }

    /**
     * handler for processing the GetTCSessionInfo response message.
     *
     * Not - this subroutine logic is duplicated in the ssoAuthenticator. If you make changes, ensure it
     * stays in sync.
     *
     * @param {String} soaOkResp - Response string from the service call.
     */
    static _sessionInfoSuccessHandling( soaOkResp ) {
        if( tcSessionData ) {
            tcSessionData.parseSessionInfo( soaOkResp );
        }

        // replaces the SessionUpdateEvent
        eventBus.publish( 'session.updated' );
    }

    /**
     * Get Secure Tokens Method When Hosted if we have to view the viewer Tab, we must make a Login call
     * from AW with all the available information. To get the password we make the _getSecureToken call, and
     * the password is valid for 5 minutes which is enough in this case.
     *
     * @param {String} discriminator - host session discriminator used during SOA login
     *
     * @returns {Promise} Promise resolved when the new login is sucessful.
     */
    static getSecureToken( discriminator ) {
        const input = {
            duration: 300
        };

        return soaSvc.postUnchecked( 'Internal-Core-2014-11-Session', 'getSecurityToken', input ).then( ( responseData ) => {
            //const userName = answer['userName'];
            const secureToken = responseData.out;

            if( secureToken && contextSvc ) {
                const role = contextSvc.getUserRole();
                const group = contextSvc.getUserGroup();
                const userName = contextSvc.getUserName();
                const userLocale = contextSvc.getUserLocale();

                /*
                 * LCS-408704
                 * https://gitlab.industrysoftware.automation.siemens.com/ActiveWorkspace/BrowserInterOp/-/wikis/clientID-header-and-lingering-tcserver-processes
                 * Set the clientID header to nothing such that hosted AW isn't counted in tcserver's ref count
                 */
                soaSvc.setClientIdHeader( '' );

                return $.get( `${browserUtils.getBaseURL()}getSessionVars` ).done( function() {
                    //Direct use 'getTCSessionAnalyticsInfo' without set userSession object property policy, no userid
                    //is returned from server, causing late gateway authentication validation on fms ticket failed. 
                    //use soaSvc.getTCSeessionInfo API to get user object back with minimum impact for hosting. 
                    return soaSvc.getTCSessionInfo( true ).then( () => {
                        // Since there's already an established session, continue using it w/o logging.
                        if( hostInteropSvc.isRemoteHostingEnabled() ) {
                            hostSupportSvc.setSoaSupportEnabled( false );
                        }
                    } ).catch( () => {
                        // Store/publish session discriminator in local storage
                        localStrg.publish( sessionSvc.SESSION_DISCRIMINATOR_KEY, discriminator );

                        return sessionSvc.signIn( userName, secureToken, group, role, userLocale, discriminator, true ).then( () => {
                            return dms.getTCSessionInfo( true );
                        } ).then( () => {
                            if( hostInteropSvc.isRemoteHostingEnabled() ) {
                                hostSupportSvc.setSoaSupportEnabled( false );
                            }
                        } );
                    } );
                } );
            }
        } );
    }

    /**
     * @returns {Boolean} TRUE if the User session is active.
     */
    static async getIsUserSessionActive() {
        if( !hostSessionSvc.isHostSessionAccessible() ) {
            return false;
        }

        const userName = await hostSessionSvc.getHostSessionUserInfo();
        return Boolean( userName );
    }

    /**
     * Called during login interaction, for ui scope population, not needed here.
     *
     * @memberof hostAuthenticatorService
     */
    // eslint-disable-next-line class-methods-use-this
    setScope() {
        // nothing to do here.
    }

    /**
     * can I process authentication.... for Hosting this is really complicated. Since all the interop
     * services and hosting handshake is still run in GWT, we have to wait for that to complete. Then this
     * native code can start to deal with authentication. So there is a promise set up here to "wait" for
     * the gwt code to complete before we deal with the authentication checks.
     *
     * @memberof hostAuthenticatorService
     *
     * @returns {Promise} Resolved with true/false result.
     */
    canIProcess() {
        if( this._debug_logHandShakeActivity ) {
            hostInteropSvc.log( 'hostAuthenticatorService: canIProcess Waiting on hosting.configured event' );
        }

        this._canIProcessDeferral = AwPromiseService.instance.defer();

        /**
         * We have to wait for the Host Handshake and configuration setup complete.
         */
        this._configuredDeferral.promise.then( () => { // success
            this.clearTimeoutFunc( 'Configured' );

            HostAuthenticatorService.getIsUserSessionActive().then( ( isUserSessionActive ) => {
                if( this._debug_logHandShakeActivity ) {
                    hostInteropSvc.log( 'hostAuthenticatorService: isUserSessionActive:' + isUserSessionActive );
                }

                /**
                 * Check if we do not have a valid session yet.
                 * <P>
                 * If so: Wait for an event from the session manager once we are logged in.
                 */
                if( !isUserSessionActive ) {
                    /**
                     * The 'session.updated' event is fired by the SessionManager when the user is
                     * reusing an existing session. If this happens, we should report back to the host
                     * that client-side startup is complete.
                     */
                    const subDef = eventBus.subscribe( 'session.updated', () => {
                        if( this._debug_logHandShakeActivity ) {
                            hostInteropSvc.log( 'hostAuthenticatorService: session.updated' );
                        }

                        eventBus.unsubscribe( subDef );

                        /**
                         * Announce that we should finish 'startup' now that we are signed in.
                         */
                        const startSvc = hostInteropSvc.findClientService2( hostServices.HS_CS_STARTUP_NOTIFICATION_SVC,
                            hostServices.VERSION_2014_02 );

                        if( startSvc ) {
                            startSvc.handleHostEventCall( 'OK' );
                        }
                    } );
                }

                /**
                 * Go ahead and resolve the 'can I process' promise.
                 */
                this._canIProcessDeferral.resolve( isUserSessionActive );
            } );
        }, () => { //failure
            if( this._debug_logHandShakeActivity ) {
                hostSupportSvc.log( 'hostAuthenticatorService: Startup defer ERROR handler.  Only resolved so should never get here.' );
            }

            this.clearTimeoutFunc( 'Error: Unconfigured' );

            this._canIProcessDeferral.resolve( false );
        } );

        // we need to set some timeout for the hosting startup, otherwise the client would just hang.
        this._hostingStartupTimeoutHdlr = setTimeout( () => {
            if( this._debug_logHandShakeActivity ) {
                hostSupportSvc.log( 'hostAuthenticatorService: Timeout function fires in hosting Auth!!' );
            }

            // put up an alert here?  we've waited long enough for hosting handshake...
            this._hostingStartupTimeoutHdlr = null;

            this._canIProcessDeferral.resolve( false );
        }, 120 * 1000 ); // 120 seconds

        return this._canIProcessDeferral.promise;
    }

    /**
     * function to determine if there is already a valid web session or not.
     *
     * @memberof hostAuthenticatorService
     */
    async checkIfSessionAuthenticated() {
        if( this._debug_logHandShakeActivity ) {
            hostInteropSvc.log( 'hostAuthenticatorService: checkIfSessionAuthenticated\n' +
                JSON.stringify( _.get( appCtxSvc.ctx, 'tcSessionData.server' ) ) );
        }

        this._tcSessionInfoResponse = null;
        // Initialize Type Display Name Service, Previously it was initialized in TcSessionData through angular
        // injection but after service conversion and typeDisplayName service is a class we need to initialize here.
        TypeDisplayNameService.instance;

        const soaOkResp = await dms.getTCSessionInfo();
        HostAuthenticatorService._sessionInfoSuccessHandling( soaOkResp );

        this._tcSessionInfoResponse = soaOkResp;

        /**
         * For Hosting, since the auth is handled externally, we actually expect this to succeed. rather
         * than drive web UI interaction.  So treat this as the result of successful authentication, and
         * let the session manager continue.
         */
        await sessionMgrSvc.authenticationSuccessful();
    }

    /**
     * authenticator specific function to carry out authentication.
     *
     * For Hosting, since the authentication is in the host process, we can skip this and just resolve the
     * promise.
     *
     * @memberof hostAuthenticatorService
     *
     * @returns {Promise} Promise resolved when user is authenticated.
     */
    async authenticate() {
        if( this._debug_logHandShakeActivity ) {
            hostInteropSvc.log( 'hostAuthenticatorService: authenticate' );
        }

        /**
         * Sort of like the SSO case, we shouldn't really get here, as the check path should find a valid
         * host session and never come to the checkAuth route.... hosting and we just talked to the host, so
         * proceed....
         */
    }

    /**
     * Called during the authentication process. It gets invoked after the authentication is
     * completed/ready. It is a spot to do any session level initialization.
     *
     * @memberof hostAuthenticatorService
     *
     * @returns {Promise} Promise resolved at the end of user authorization.
     */
    postAuthInitialization() {
        if( this._debug_logHandShakeActivity ) {
            hostInteropSvc.log( 'hostAuthenticatorService: postAuthInitialization' );
        }

        const deferred = AwPromiseService.instance.defer();

        /**
         * Check if NO response was received during 'checkIfSessionAuthenticated' OR if there is no 'window'
         * object because we are being run during karma/jasmine unit testing
         * <P>
         * If so: Call 'getTCSessionInfo' now to make sure this SOA API gets called.
         */
        if( !this._tcSessionInfoResponse || !window ) {
            if( this._debug_logHandShakeActivity ) {
                hostInteropSvc.log( 'hostAuthenticatorService: postAuthInitialization: 1\n' +
                    JSON.stringify( _.get( appCtxSvc.ctx, 'tcSessionData.server' ) ) );
            }

            dms.getTCSessionInfo().then( ( soaOkResp ) => {
                if( this._debug_logHandShakeActivity ) {
                    hostInteropSvc.log( 'hostAuthenticatorService: postAuthInitialization: 2' );
                }

                HostAuthenticatorService._sessionInfoSuccessHandling( soaOkResp );

                deferred.resolve();
            }, ( err ) => {
                if( this._debug_logHandShakeActivity ) {
                    hostInteropSvc.log( 'hostAuthenticatorService: postAuthInitialization: 4 err=' + err );
                }

                deferred.reject( err );
            } );
        } else {
            if( this._debug_logHandShakeActivity ) {
                hostInteropSvc.log( 'hostAuthenticatorService: postAuthInitialization: 5' );
            }

            if( !hostConfigSvc.isSet() ) {
                eventBus.subscribe( 'hosting.configured', () => {
                    let result;
                    /**
                     * Make the getSecureToken call and trigger a new login call from AW (but only if a valid
                     * 'discriminator' was provided by this 'host')
                     */
                    const discriminator = hostConfigSvc.getOption( hostConfigKeys.HOST_DISCRIMINATOR );

                    if( discriminator ) {
                        result = HostAuthenticatorService.getSecureToken( discriminator );
                    }

                    deferred.resolve( result );
                } );
            } else {
                let result;
                const discriminator = hostConfigSvc.getOption( hostConfigKeys.HOST_DISCRIMINATOR );

                if( discriminator ) {
                    result = HostAuthenticatorService.getSecureToken( discriminator );
                }

                deferred.resolve( result );
            }
        }

        if( this._debug_logHandShakeActivity ) {
            hostInteropSvc.log( 'hostAuthenticatorService: postAuthInitialization: 6' );
        }

        this._tcSessionInfoResponse = null;

        /**
         * Setup to tell host setup is complete AFTER authentication is complete.
         */
        const startupNotificationSvc = hostInteropSvc.findClientService2(
            hostServices.HS_CS_STARTUP_NOTIFICATION_SVC,
            hostServices.VERSION_2014_02 );

        if( startupNotificationSvc ) {
            eventBus.subscribe( 'authentication.complete', ( eventData ) => {
                if( this._debug_logHandShakeActivity ) {
                    hostInteropSvc.log( 'hostAuthenticatorService: postAuthInitialization: 7\n' +
                        JSON.stringify( eventData ) );
                }
                startupNotificationSvc.handleHostEventCall( eventData.status );
            } );
        }

        return deferred.promise;
    }

    /**
     * authenticator function to perform the signout. In this SSO situation we do the same Tc soa call to
     * end the tc session, but then also need to terminate the sso managed session.
     *
     * @memberof hostAuthenticatorService
     *
     * @returns {Promise} Promise resolved once operation is complete.
     */
    async signOut() {
        if( this._debug_logHandShakeActivity ) {
            hostInteropSvc.log( 'hostAuthenticatorService: signOut' );
        }

        localStrg.removeItem( sessionSvc.SESSION_DISCRIMINATOR_KEY );

        /**
         * Note: This is a no-op for the hosted situation. The host process owns any connection.
         */
    }
}

export default HostAuthenticatorService.instance;
