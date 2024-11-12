// Copyright (c) 2022 Siemens

/**
 * This interface defines a set of UI configurations options that can be specified to control various UI widgets
 * visibility and other optional UI behavior.
 *
 * @module js/hosting/hostConfigService
 * @namespace hostConfigService
 */
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import themeSvc from 'js/theme.service';
import localeSvc from 'js/localeService';
import preferenceSvc from 'soa/preferenceService';
import hostInteropSvc from 'js/hosting/hostInteropService';
import hostCoreSvc1 from 'js/hosting/bootstrap/services/hostCore_2014_02';
import hostCoreSvc2 from 'js/hosting/bootstrap/services/hostCore_2014_07';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import eventBus from 'js/eventBus';
import hostServices from 'js/hosting/hostConst_Services';
import hostConfigKeys from 'js/hosting/hostConst_ConfigKeys';
import hostConfigValues from 'js/hosting/hostConst_ConfigValues';
import { loadDependentModule } from 'js/moduleLoader';
import hostSupportSvc from 'js/hosting/hostSupportService';

/**
 * TRUE if we have already checked if we are running in UI Configured mode.
 */
var _isChecked = false;

/**
 * TRUE if the AW client is running a UI Configured mode.
 */
var _isConfigured = false;

/**
 * TRUE if AW has been configured
 */
var _isSet = false;

/**
 * {ObjectMap} Map who's properties are the currently loaded hostConst_ConfigValues.
 */
var _uiOptions = {};

/**
 * {Boolean} TRUE if ... should be logged.
 */
var _debug_logHostCallsToClientDetails = browserUtils.getUrlAttributes().logHostCallsToClientDetails !== undefined;

/**
 * {MapStringToStringArray} Model object types allowed to be sent to a specific host.
 */
var _defaultHostTypeSendToTypes = {
    NX: [
        'Item',
        'ItemRevision',
        'UGMASTER',
        'UGALTREP',
        'DirectModel',
        'UGPART',
        'CAEGeom',
        'CAEMesh',
        'CAESolution',
        'NXMotion'
    ],
    RAC: [
        'Item',
        'ItemRevision',
        'UGMASTER',
        'UGALTREP',
        'DirectModel',
        'UGPART',
        'CAEGeom',
        'CAEMesh',
        'CAESolution',
        'NXMotion',
        'Folder',
        'Dataset',
        'GIF',
        'JPEG',
        'Newstuff Folder'
    ],
    Vis: [
        'Dataset',
        'Item',
        'ItemRevision',
        'BOMVIEW_REVISION',
        'BOMView',
        'BOMLine'
    ]
};

/**
 * {StringArray} Model object types allowed to be sent to any non-specific host.
 */
var _defaultSendToTypes = [
    'Item',
    'ItemRevision',
    'UGMASTER',
    'UGALTREP',
    'DirectModel',
    'UGPART',
    'CAEGeom',
    'CAEMesh',
    'CAESolution',
    'NXMotion',
    'Folder',
    'Dataset',
    'GIF',
    'JPEG'
];

/**
 * Return the appCtxService key safe 'symbolic name' of the given Fully Qualified Name (FQN).
 *
 * @param {String} fqnToMap - FQN of the service to map.
 *
 * @returns {String} The 'symbolic name' of the given FQN (or the given FQN if no match found in
 * {hostServices}.
 */
function _mapToContextServiceName( fqnToMap ) {
    var symbolicNameRet;

    _.forEach( hostServices, function( fqn, symbolicName ) {
        if( fqn === fqnToMap ) {
            symbolicNameRet = symbolicName;
            return false;
        }
    } );

    if( !symbolicNameRet ) {
        symbolicNameRet = fqnToMap.replace( /\./, '_' );
    }

    return symbolicNameRet;
}

/**
 * Return the appCtxService key safe 'symbolic name' of the given service version name (SvcVersion).
 *
 * @param {String} svcVersionToMap - Service version to map.
 *
 * @returns {String} The 'symbolic name' of the given service version name (SvcVersion) (or the given
 * version if no match found in {hostServices}.
 */
function _mapToContextVersionName( svcVersionToMap ) {
    var symbolicNameRet;

    _.forEach( hostServices, function( svcVersion, symbolicName ) {
        if( svcVersion === svcVersionToMap ) {
            symbolicNameRet = symbolicName;
            return false;
        }
    } );

    if( !symbolicNameRet ) {
        symbolicNameRet = svcVersionToMap.replace( /\./, '_' );
    }

    return symbolicNameRet;
}

/**
 * Set option values to their defaults when NOT running in hosted mode.
 */
function _setNonHostedDefaults() {
    // Add default values for configurations options.
    _uiOptions[ hostConfigKeys.ADD_COMPONENT_HOSTED_DISPLAY_NAME ] = '';
    _uiOptions[ hostConfigKeys.ALLOW_CHANGE_LOCATION ] = true;
    _uiOptions[ hostConfigKeys.ALLOW_DEFAULT_LOCATION_CODE_CHANGE ] = true;
    _uiOptions[ hostConfigKeys.ALLOW_DEFAULT_PROJECT_CHANGE ] = true;
    _uiOptions[ hostConfigKeys.ALLOW_GO_HOME ] = true;
    _uiOptions[ hostConfigKeys.ALLOW_GROUP_ROLE_CHANGE ] = true;
    _uiOptions[ hostConfigKeys.ALLOW_OS_COPY ] = true;
    _uiOptions[ hostConfigKeys.ALLOW_THEME_CHANGE ] = true;
    _uiOptions[ hostConfigKeys.ALLOW_USER_REVISION_RULE_CHANGE ] = true;
    _uiOptions[ hostConfigKeys.ALLOW_USER_SESSION_CHANGE ] = true;
    _uiOptions[ hostConfigKeys.ENABLE_MCAD_INTEGRATION_HOSTED_COMMANDS ] = false;
    _uiOptions[ hostConfigKeys.HAS_FULL_SCREEN_SUPPORT ] = true;
    _uiOptions[ hostConfigKeys.HIDE_SEARCH_COMMAND_BUTTON ] = false;
    _uiOptions[ hostConfigKeys.HOST_CLONE_STABLE_ID_PATH_TOP_DOWN ] = false;
    _uiOptions[ hostConfigKeys.HOST_DISCRIMINATOR ] = null;
    _uiOptions[ hostConfigKeys.HOST_SUPPORTS_MULTIPLE_SELECTION ] = false;
    _uiOptions[ hostConfigKeys.HOST_TYPE ] = '';
    _uiOptions[ hostConfigKeys.HOST_VERSION_INFO ] = '';
    _uiOptions[ hostConfigKeys.IS_RUNNING_TEST_MODE ] = false;
    _uiOptions[ hostConfigKeys.IS_VIEWER_SUPPORTED ] = true;
    _uiOptions[ hostConfigKeys.OPEN_NEW_VIEW_COMMAND_DISPLAY_NAME ] = '';
    _uiOptions[ hostConfigKeys.PREFERRED_THEME ] = '';
    _uiOptions[ hostConfigKeys.SELECT_OBJECT_SUBLOCATION_TITLE ] = null;
    _uiOptions[ hostConfigKeys.SEND_TO_COMMAND_DISPLAY_NAME ] = '';
    _uiOptions[ hostConfigKeys.SEND_TO_NEW_VIEW_COMMAND_DISPLAY_NAME ] = '';
    _uiOptions[ hostConfigKeys.SEND_TO_SUPPORTED_TYPES_PREFERENCE ] = '';
    _uiOptions[ hostConfigKeys.SESSION_ID ] = '';
    _uiOptions[ hostConfigKeys.SHOW_SIEMENS_LOGO ] = true;
    _uiOptions[ hostConfigKeys.SUPPORTS_OPENING_CONTENT ] = false;
    _uiOptions[ hostConfigKeys.THEME ] = '';
    _uiOptions[ hostConfigKeys.USE_2014_07_SOA ] = false;
    _uiOptions[ hostConfigKeys.USE_2015_10_OCC_SELECTION_OBJECT ] = false;
    _uiOptions[ hostConfigKeys.USE_2015_10_SOA ] = false;
    _uiOptions[ hostConfigKeys.USE_OPEN_FILE_VIA_SERVICE ] = false;
    _uiOptions[ hostConfigKeys.SUPPRESS_SEND_TO_COMMAND ] = false;
    _uiOptions[ hostConfigKeys.SUPPRESS_SEND_TO_NEW_VIEW_COMMAND ] = false;
    _uiOptions[ hostConfigKeys.SUPPRESS_ADD_COMPONENT_HOSTED_COMMAND ] = false;
    _uiOptions[ hostConfigKeys.UNLOAD_OBJECTS ] = false;
}

/**
 * Set option values to their defaults when running in hosted mode.
 */
function _setHostedDefaults() {
    /**
     * These options are considered defaults for all hosts, if that changes the option needs to be specified
     * by the host in the {RequestHostConfigResponseMsg}
     */
    _uiOptions[ hostConfigKeys.ADD_COMPONENT_HOSTED_DISPLAY_NAME ] = '';
    _uiOptions[ hostConfigKeys.ALLOW_CHANGE_LOCATION ] = true;
    _uiOptions[ hostConfigKeys.ALLOW_DEFAULT_LOCATION_CODE_CHANGE ] = false;
    _uiOptions[ hostConfigKeys.ALLOW_DEFAULT_PROJECT_CHANGE ] = false;
    _uiOptions[ hostConfigKeys.ALLOW_GO_HOME ] = false;
    _uiOptions[ hostConfigKeys.ALLOW_GROUP_ROLE_CHANGE ] = false;
    _uiOptions[ hostConfigKeys.ALLOW_OS_COPY ] = false;
    _uiOptions[ hostConfigKeys.ALLOW_THEME_CHANGE ] = false;
    _uiOptions[ hostConfigKeys.ALLOW_USER_REVISION_RULE_CHANGE ] = false;
    _uiOptions[ hostConfigKeys.ALLOW_USER_SESSION_CHANGE ] = false;
    _uiOptions[ hostConfigKeys.ENABLE_MCAD_INTEGRATION_HOSTED_COMMANDS ] = false;
    _uiOptions[ hostConfigKeys.HAS_FULL_SCREEN_SUPPORT ] = false;
    _uiOptions[ hostConfigKeys.HIDE_SEARCH_COMMAND_BUTTON ] = false;
    _uiOptions[ hostConfigKeys.HOST_CLONE_STABLE_ID_PATH_TOP_DOWN ] = false;
    _uiOptions[ hostConfigKeys.HOST_DISCRIMINATOR ] = null;
    _uiOptions[ hostConfigKeys.HOST_SUPPORTS_MULTIPLE_SELECTION ] = false;
    _uiOptions[ hostConfigKeys.HOST_TYPE ] = '';
    _uiOptions[ hostConfigKeys.HOST_VERSION_INFO ] = '';
    _uiOptions[ hostConfigKeys.IS_RUNNING_TEST_MODE ] = false;
    _uiOptions[ hostConfigKeys.IS_VIEWER_SUPPORTED ] = false;
    _uiOptions[ hostConfigKeys.OPEN_NEW_VIEW_COMMAND_DISPLAY_NAME ] = '';
    _uiOptions[ hostConfigKeys.PREFERRED_THEME ] = '';
    _uiOptions[ hostConfigKeys.SELECT_OBJECT_SUBLOCATION_TITLE ] = null;
    _uiOptions[ hostConfigKeys.SEND_TO_COMMAND_DISPLAY_NAME ] = '';
    _uiOptions[ hostConfigKeys.SEND_TO_NEW_VIEW_COMMAND_DISPLAY_NAME ] = '';
    _uiOptions[ hostConfigKeys.SEND_TO_SUPPORTED_TYPES_PREFERENCE ] = '';
    _uiOptions[ hostConfigKeys.SESSION_ID ] = '';
    _uiOptions[ hostConfigKeys.SHOW_SIEMENS_LOGO ] = false;
    _uiOptions[ hostConfigKeys.SUPPORTS_OPENING_CONTENT ] = false;
    _uiOptions[ hostConfigKeys.THEME ] = '';
    _uiOptions[ hostConfigKeys.USE_2014_07_SOA ] = false;
    _uiOptions[ hostConfigKeys.USE_2015_10_OCC_SELECTION_OBJECT ] = false;
    _uiOptions[ hostConfigKeys.USE_2015_10_SOA ] = false;
    _uiOptions[ hostConfigKeys.USE_OPEN_FILE_VIA_SERVICE ] = false;
    _uiOptions[ hostConfigKeys.SUPPRESS_SEND_TO_COMMAND ] = false;
    _uiOptions[ hostConfigKeys.SUPPRESS_SEND_TO_NEW_VIEW_COMMAND ] = false;
    _uiOptions[ hostConfigKeys.SUPPRESS_ADD_COMPONENT_HOSTED_COMMAND ] = false;
    _uiOptions[ hostConfigKeys.UNLOAD_OBJECTS ] = false;
}

function _process_2014_07_Settings( settings ) {
    /**
         * Start by using current (default) values.
         */
    var uiOptionsLcl = _.clone( _uiOptions );

    /**
          * Check if the 'host' has no opinion (unlikely)
          */
    if( _.isEmpty( settings ) ) {
        return uiOptionsLcl;
    }

    for( var i = 0; i < settings.length; i++ ) {
        var pair = settings[ i ];

        if( !_.isEmpty( pair ) ) {
            var key = pair.Key;
            var value = pair.Value;

            if( !_.isEmpty( key ) && !_.isEmpty( value ) ) {
                switch ( key ) {
                    case hostConfigKeys.ALLOW_CHANGE_LOCATION:
                    case hostConfigKeys.ALLOW_DEFAULT_LOCATION_CODE_CHANGE:
                    case hostConfigKeys.ALLOW_DEFAULT_PROJECT_CHANGE:
                    case hostConfigKeys.ALLOW_GO_HOME:
                    case hostConfigKeys.ALLOW_GROUP_ROLE_CHANGE:
                    case hostConfigKeys.ALLOW_OS_COPY:
                    case hostConfigKeys.ALLOW_THEME_CHANGE:
                    case hostConfigKeys.ALLOW_USER_REVISION_RULE_CHANGE:
                    case hostConfigKeys.ALLOW_USER_SESSION_CHANGE:
                    case hostConfigKeys.ENABLE_MCAD_INTEGRATION_HOSTED_COMMANDS:
                    case hostConfigKeys.HAS_FULL_SCREEN_SUPPORT:
                    case hostConfigKeys.HIDE_SEARCH_COMMAND_BUTTON:
                    case hostConfigKeys.HOST_CLONE_STABLE_ID_PATH_TOP_DOWN:
                    case hostConfigKeys.HOST_SUPPORTS_MULTIPLE_SELECTION:
                    case hostConfigKeys.IS_RUNNING_TEST_MODE:
                    case hostConfigKeys.IS_VIEWER_SUPPORTED:
                    case hostConfigKeys.SHOW_SIEMENS_LOGO:
                    case hostConfigKeys.SUPPORTS_OPENING_CONTENT:
                    case hostConfigKeys.USE_2014_07_SOA:
                    case hostConfigKeys.USE_2015_10_OCC_SELECTION_OBJECT:
                    case hostConfigKeys.USE_2015_10_SOA:
                    case hostConfigKeys.USE_OPEN_FILE_VIA_SERVICE:
                    case hostConfigKeys.SUPPRESS_SEND_TO_COMMAND:
                    case hostConfigKeys.SUPPRESS_SEND_TO_NEW_VIEW_COMMAND:
                    case hostConfigKeys.SUPPRESS_ADD_COMPONENT_HOSTED_COMMAND:
                    case hostConfigKeys.UNLOAD_OBJECTS:
                        /**
                              * Handle cases known to be boolean.
                              */
                        if( _.isString( value ) ) {
                            uiOptionsLcl[ key ] = value.toLowerCase() === 'true';
                        } else if( _.isBoolean( value ) ) {
                            uiOptionsLcl[ key ] = value;
                        }
                        break;

                    case hostConfigKeys.PREFERRED_THEME:
                        uiOptionsLcl[ hostConfigKeys.THEME ] = value;
                        break;

                    case hostConfigKeys.THEME:
                        /**
                              * Check if we have NOT already set the 'theme' via the 'PREFERRED_THEME'
                              * option.
                              */
                        if( !uiOptionsLcl[ hostConfigKeys.THEME ] ) {
                            uiOptionsLcl[ hostConfigKeys.THEME ] = value;
                        }
                        break;

                    case hostConfigKeys.ADD_COMPONENT_HOSTED_DISPLAY_NAME:
                    case hostConfigKeys.HOST_TYPE:
                    case hostConfigKeys.HOST_VERSION_INFO:
                    case hostConfigKeys.HOST_DISCRIMINATOR:
                    case hostConfigKeys.OPEN_NEW_VIEW_COMMAND_DISPLAY_NAME:
                    case hostConfigKeys.SELECT_OBJECT_SUBLOCATION_TITLE:
                    case hostConfigKeys.SEND_TO_COMMAND_DISPLAY_NAME:
                    case hostConfigKeys.SEND_TO_NEW_VIEW_COMMAND_DISPLAY_NAME:
                    case hostConfigKeys.SEND_TO_SUPPORTED_TYPES_PREFERENCE:
                    case hostConfigKeys.SESSION_ID:
                        /**
                              * In these cases we just move the value over as is.
                              */
                        uiOptionsLcl[ key ] = value;
                        break;

                    default:
                        if( _debug_logHostCallsToClientDetails ) {
                            hostInteropSvc.log( 'hostConfigService._useHostConfiguration_2014_07:' +
                                     'Encountered a previously unknown config option key: ' + key + '\n' +
                                     'Processing as a string value: ' + value + '\n' +
                                     '...Continuing' );
                        }

                        /**
                              * All other cases we just move the value over as is.
                              */
                        uiOptionsLcl[ key ] = value;
                        break;
                }
            }
        }
    }

    return uiOptionsLcl;
}

/**
 * Gets the settings cached during start up
 *
 * @returns {Promise} Resolved with the {UiOptions} with properties set from the 'host' (or defaulted).
 */
function _useCachedHostConfig() {
    var deferred = AwPromiseService.instance.defer();
    _.defer( function() {
        var configSettings = hostInteropSvc.getHostConfig();
        if ( configSettings ) {
            deferred.resolve( _process_2014_07_Settings( JSON.parse( configSettings ) ) );
        } else {
            deferred.reject( 'No host configuration settings' );
        }
    } );
}

/**
 * Call the 2014 07 Host Configuration to get our host settings
 *
 * @returns {Promise} Resolved with the {UiOptions} with properties set from the 'host' (or defaulted).
 */
function _useHostConfiguration_2014_07() { //eslint-disable-line complexity
    // Request the configuration from the host
    return hostCoreSvc2.createRequestHostConfigProxy().callHostMethodAsync().then( function( hostConfig ) { //eslint-disable-line complexity
        return _process_2014_07_Settings( hostConfig.getSettings() );
    } );
} // _useHostConfiguration_2014_07

/**
 * Call the 2014 02 Host Configuration to get our host settings.
 */
function _useHostConfiguration_2014_02() {
    // Request the configuration from the host
    var hostConfig = hostCoreSvc1.createRequestHostConfigProxy().callHostMethod();

    // Set the configuration fields.
    if( !_.isEmpty( hostConfig ) ) {
        var value = hostConfig.getAllowGoHome();

        if( _.isEmpty( value ) ) {
            _uiOptions[ hostConfigKeys.ALLOW_GO_HOME ] = value.toLowerCase() === 'true';
        }

        value = hostConfig.getAllowThemeChange();

        if( !_.isEmpty( value ) ) {
            _uiOptions[ hostConfigKeys.ALLOW_THEME_CHANGE ] = value.toLowerCase() === 'true';
        }

        value = hostConfig.getAllowUserSessionChange();

        if( !_.isEmpty( value ) ) {
            _uiOptions[ hostConfigKeys.ALLOW_USER_SESSION_CHANGE ] =
                value.toLowerCase() === 'true';
        }

        value = hostConfig.getHasFullScreenSupport();

        if( !_.isEmpty( value ) ) {
            _uiOptions[ hostConfigKeys.HAS_FULL_SCREEN_SUPPORT ] = value.toLowerCase() === 'true';
        }

        value = hostConfig.getHostType();

        if( !_.isEmpty( value ) ) {
            _uiOptions[ hostConfigKeys.HOST_TYPE ] = value;
        }

        value = hostConfig.getShowSiemensLogo();

        if( !_.isEmpty( value ) ) {
            _uiOptions[ hostConfigKeys.SHOW_SIEMENS_LOGO ] = value.toLowerCase() === 'true';

            /**
             * Note: This is odd that the 'logo' would/should effect copy behavior, but this matches the
             * logic in aw3.4.x. The good news is few (if any) hosts actually use this older service
             * version.
             */
            _uiOptions[ hostConfigKeys.ALLOW_OS_COPY ] = value.toLowerCase() === 'true';
        }

        value = hostConfig.getTheme();

        if( !_.isEmpty( value ) ) {
            _uiOptions[ hostConfigKeys.THEME ] = value;

            /**
             * Note: This is odd that the 'theme' would/should effect session change behavior, but this
             * matches the logic in aw3.4.x. The good news is few (if any) hosts actually use this older
             * service version.
             */
            _uiOptions[ hostConfigKeys.ALLOW_GROUP_ROLE_CHANGE ] = value.toLowerCase() === 'true';
        }

        /**
         * Indicate we want to use the default types for_2014_02.
         */
        _uiOptions[ hostConfigKeys.SEND_TO_SUPPORTED_TYPES_PREFERENCE ] =
            hostConfigValues.PREF_NAME_HOST_CONFIG_2014_02_OPEN_SUPPORTED_TYPES;
    }
} // _useHostConfiguration_2014_02

/**
 *
 * @param {Object} objectToSort - Object who's keys to sort.
 *
 * @returns {Object} New object with sorted keys.
 */
function sortObject( objectToSort ) {
    var key;

    var a = [];

    for( key in objectToSort ) {
        if( objectToSort.hasOwnProperty( key ) ) {
            a.push( key );
        }
    }

    a.sort();

    var sorted = {};

    for( key = 0; key < a.length; key++ ) {
        sorted[ a[ key ] ] = objectToSort[ a[ key ] ];
    }

    return sorted;
}

/**
 * Query the now running 'host' for it's set of option used to configure the 'client' UI and operation.
 *
 * @returns {Promise} Resolved when the host has provided its desired configuration options.
 */
function _onInitialization() {
    // Set the hosted default option values
    _setHostedDefaults();

    var promise;

    if ( hostInteropSvc.isPostMessageEnabled() ) {
        promise = _useCachedHostConfig();
    } else if( hostInteropSvc.isHostServiceAvailable(
        hostServices.HS_HOST_CONFIGURATION_SVC,
        hostServices.VERSION_2014_07 ) ) {
        promise = _useHostConfiguration_2014_07();
    } else if( hostInteropSvc.isHostServiceAvailable(
        hostServices.HS_HOST_CONFIGURATION_SVC,
        hostServices.VERSION_2014_02 ) ) {
        _useHostConfiguration_2014_02();
    }

    if( promise ) {
        return promise.then( function( uiOptions ) {
            _uiOptions = _.clone( uiOptions );

            var hostType = _uiOptions[ hostConfigKeys.HOST_TYPE ];

            /**
             * Make sure we have text for the send-to command
             */
            if( !_uiOptions[ hostConfigKeys.SEND_TO_COMMAND_DISPLAY_NAME ] ) {
                /**
                 * Use a default of 'english' but setup to use locale specific text later.
                 */
                _uiOptions[ hostConfigKeys.SEND_TO_COMMAND_DISPLAY_NAME ] = 'Send To ' + hostType + ' *';
                localeSvc.getLocalizedTextFromKey( 'hostingMessages.sendToCommandTitle' ).then( result => {
                    if( result ) {
                        _uiOptions[ hostConfigKeys.SEND_TO_COMMAND_DISPLAY_NAME ] = result.replace( '{0}', hostType );
                    }
                } );
            }

            /**
             * Make sure we have text for the send-to new view command
             */
            if( !_uiOptions[ hostConfigKeys.SEND_TO_NEW_VIEW_COMMAND_DISPLAY_NAME ] ) {
                /**
                 * Use a default of 'english' but setup to use locale specific text later.
                 */
                _uiOptions[ hostConfigKeys.SEND_TO_NEW_VIEW_COMMAND_DISPLAY_NAME ] = 'Send To ' + hostType + ' In New View' + ' *';
                localeSvc.getLocalizedTextFromKey( 'hostingMessages.sendToNewViewCommandTitle' ).then( result => {
                    if( result ) {
                        _uiOptions[ hostConfigKeys.SEND_TO_NEW_VIEW_COMMAND_DISPLAY_NAME ] = result.replace( '{0}', hostType );
                    }
                } );
            }

            /**
             * Make sure we have text for the add-to command
             */
            if( !_uiOptions[ hostConfigKeys.ADD_COMPONENT_HOSTED_DISPLAY_NAME ] ) {
                /**
                 * Use a default of 'english' but setup to use locale specific text later.
                 */
                _uiOptions[ hostConfigKeys.ADD_COMPONENT_HOSTED_DISPLAY_NAME ] = 'Add To ' + hostType + ' *';

                localeSvc.getLocalizedTextFromKey( 'hostingMessages.addToCommandTitle' ).then( result => {
                    if( result ) {
                        _uiOptions[ hostConfigKeys.ADD_COMPONENT_HOSTED_DISPLAY_NAME ] = result.replace( '{0}', hostType );
                    }
                } );
            }

            if( _debug_logHostCallsToClientDetails ) {
                hostInteropSvc.log( 'hostConfigService._onInitialization: _uiOptions:' + '\n' +
                    JSON.stringify( sortObject( _uiOptions ), null, 2 ) );
            }

            /**
             * Handle setting up the theme based on the given value.
             * <P>
             * Note: We have to map the old (legacy) theme name to the new one.
             */
            var themeValue = _uiOptions[ hostConfigKeys.THEME ];

            if( themeValue ) {
                themeValue = exports.mapThemeName( themeValue );

                themeSvc.setTheme( themeValue );
            }

            /**
             * Set configuration and services information into the 'appCtxService' for easier use by declarative
             * components.
             * <P>
             * Format: <symbolic service name>-<symbolic version>
             */
            var ctxHostServices = {};
            appCtxSvc.registerCtx( 'isRunningTestMode', _uiOptions[ hostConfigKeys.IS_RUNNING_TEST_MODE ] );

            _.forEach( hostInteropSvc.hostServices, function( hostSvc ) {
                var ctxFqn = _mapToContextServiceName( hostSvc.FQN );
                var ctxVersion = _mapToContextVersionName( hostSvc.SvcVersion );

                ctxHostServices[ ctxFqn + '__' + ctxVersion ] = true;
            } );

            appCtxSvc.ctx.aw_hosting_hostServices = ctxHostServices;

            /**
             * Register the maps of options as 'aw_hosting_config' as well as some (slightly) easier to use
             * common cases as 1st level properties.
             */
            appCtxSvc.ctx.aw_hosting_config = _uiOptions;

            if( _uiOptions[ hostConfigKeys.HOST_TYPE ] ) {
                appCtxSvc.ctx.aw_host_type = _uiOptions[ hostConfigKeys.HOST_TYPE ];
            } else {
                appCtxSvc.ctx.aw_host_type = 'unknown';
            }

            if( _uiOptions[ hostConfigKeys.ALLOW_DEFAULT_PROJECT_CHANGE ] ) {
                appCtxSvc.ctx.projectChangeDisabled = false;
            } else {
                appCtxSvc.ctx.projectChangeDisabled = true;
            }

            if( _uiOptions[ hostConfigKeys.ALLOW_GO_HOME ] ) {
                appCtxSvc.ctx.goHomeDisabled = false;
            } else {
                appCtxSvc.ctx.goHomeDisabled = true;
            }

            if( _uiOptions[ hostConfigKeys.ALLOW_GROUP_ROLE_CHANGE ] ) {
                appCtxSvc.ctx.groupRoleChangeDisabled = false;
            } else {
                appCtxSvc.ctx.groupRoleChangeDisabled = true;
            }

            if( _uiOptions[ hostConfigKeys.ALLOW_USER_REVISION_RULE_CHANGE ] ) {
                appCtxSvc.ctx.userRevisionRuleDisabled = false;
            } else {
                appCtxSvc.ctx.userRevisionRuleDisabled = true;
            }

            if( _uiOptions[ hostConfigKeys.ALLOW_USER_SESSION_CHANGE ] ) {
                appCtxSvc.ctx.signOutDisabled = false;
            } else {
                appCtxSvc.ctx.signOutDisabled = true;
            }

            if( _uiOptions[ hostConfigKeys.ALLOW_THEME_CHANGE ] ) {
                appCtxSvc.ctx.changeThemeDisabled = false;
            } else {
                appCtxSvc.ctx.changeThemeDisabled = true;
            }

            if ( _uiOptions[ hostConfigKeys.UNLOAD_OBJECTS ] ) {
                appCtxSvc.ctx.aw_hosting_unloadObjects = true;
            } else {
                appCtxSvc.ctx.aw_hosting_unloadObjects = false;
            }

            appCtxSvc.registerCtx( 'hostingFullscreenDisabled', !_uiOptions[ hostConfigKeys.HAS_FULL_SCREEN_SUPPORT ] );

            /**
             * Resolve 'aw_hosting_sendToTypes' either via host-type default or optional preference.
             */
            if( _defaultHostTypeSendToTypes[ appCtxSvc.ctx.aw_host_type ] ) {
                appCtxSvc.ctx.aw_hosting_sendToTypes = _defaultHostTypeSendToTypes[ appCtxSvc.ctx.aw_host_type ];
            } else {
                appCtxSvc.ctx.aw_hosting_sendToTypes = _defaultSendToTypes;
            }

            if( _uiOptions[ hostConfigKeys.SEND_TO_SUPPORTED_TYPES_PREFERENCE ] ) {
                preferenceSvc.getStringValues( _uiOptions[ hostConfigKeys.SEND_TO_SUPPORTED_TYPES_PREFERENCE ] )
                    .then( function( sendToTypes ) {
                        if( !_.isEmpty( sendToTypes ) ) {
                            appCtxSvc.ctx.aw_hosting_sendToTypes = sendToTypes;
                        }
                    } );
            }

            /**
             * Indicate we are now setup.
             */
            _isChecked = false;

            return _isChecked;
        } );
    }
    return Promise.resolve();
}

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Access to UI options accessed by using the key for the option.
 * <P>
 * If the option isn't in the configuration, null is returned.
 *
 * @memberof hostConfigService
 *
 * @param {String} key - Key string of the option to lookup the value for.
 *
 * @return {Object} value for the option with the inputed key
 */
export let getOption = function( key ) {
    return _uiOptions[ key ];
};

/**
 * Return the fully qualified theme name requested for use.
 *
 * @memberof hostConfigService
 *
 * @return {String} The fully qualified theme name requested for use.
 */
export let getTheme = function() {
    return _uiOptions[ hostConfigKeys.THEME ];
};

/**
 * Checks if the configuration has been set.
 *
 * @memberof hostConfigService
 *
 * @return {Boolean} TRUE if in UI Configured mode, FALSE otherwise.
 */
export let isSet = function() {
    if( _uiOptions[ hostConfigKeys.HOST_TYPE ] || _isSet ) {
        return true;
    }

    return false;
};

/**
 * Helper method to allow other modules to easily check if the AW client is running in a UI Configured mode.
 *
 * @memberof hostConfigService
 *
 * @return {Boolean} TRUE if the AW client is running in a UI Configured mode.
 */
export let isEnabled = function() {
    if( !_isChecked ) {
        if( exports.isSet() ) {
            _isConfigured = true;
        }
        _isChecked = true;
    }

    return _isConfigured;
};

/**
 * Finsh initialization of this service such that it will interact with other hosting APIs that are also
 * being initialized.
 *
 * @memberof hostConfigService
 *
 * @returns {Promise} Resolved when this service is fully initialized and the 'hosting.configured' event has
 * been fired.
 */
export let initialize = function() {
    return _onInitialization().then( function() {
        _isSet = true;
        eventBus.publish( 'hosting.configured' );
    } );
};

/**
 * Return the type of host.
 *
 * @memberof hostConfigService
 *
 * @return {String} The type of host.
 */
export let getHostType = function() {
    return _uiOptions[ hostConfigKeys.HOST_TYPE ];
};

/**
 * Return TRUE if the logo should be shown.
 *
 * @memberof hostConfigService
 *
 * @return {Boolean} TRUE if the logo should be shown.
 */
export let isLogoEnabled = function() {
    return _uiOptions[ hostConfigKeys.SHOW_SIEMENS_LOGO ];
};

/**
 * Return the name of the SCSS file to use for the given 'legacy' theme name. If the given name does not
 * match any of the 'legacy' names, it will be returned as the name of the SCSS resource.
 *
 * @param {String} themeName - The name to map.
 *
 * @returns {String} Name of the theme to use for the given theme name.
 */
export let mapThemeName = function( themeName ) {
    if( themeName === 'hostedLightTheme' ) {
        return 'hostedLightTheme';
    } else if( themeName === 'com.siemens.splm.clientfx.ui.lightTheme' || themeName === 'Light' || themeName === 'light' || themeName === 'Nx11CustomTheme' || themeName === 'NxCustomTheme' ) {
        return 'ui-lightTheme';
    } else if( themeName === 'Dark' || themeName === 'dark' || themeName === 'com.siemens.splm.clientfx.ui.darkTheme' ) {
        return 'ui-darkTheme';
    }
    return 'ui-lightTheme';
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Finish Initialization
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

export default exports = {
    getOption,
    getTheme,
    isSet,
    isEnabled,
    initialize,
    getHostType,
    isLogoEnabled,
    mapThemeName
};

/**
 * Setup defaults
 */
_setNonHostedDefaults();
