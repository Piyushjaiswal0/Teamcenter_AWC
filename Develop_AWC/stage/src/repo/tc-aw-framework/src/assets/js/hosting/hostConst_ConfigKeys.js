// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global define */

/**
 * List of 'keys' for known host configuration settings map entries.
 *
 * @module js/hosting/hostConst_ConfigKeys
 * @namespace hostConst_ConfigKeys
 */

'use strict';

/**
 * The string to be used to represent the 'Add to host' command for the UIConfigured application
 * <P>
 * String = <value> (default = '')
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {String}
 */
export let ADD_COMPONENT_HOSTED_DISPLAY_NAME = 'AddComponentHostedDisplayName';

/**
 * Allow change location
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let ALLOW_CHANGE_LOCATION = 'AllowChangeLocation';

/**
 * Allow the user to change the default location code?
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let ALLOW_DEFAULT_LOCATION_CODE_CHANGE = 'AllowDefaultLocationCodeChange';

/**
 * Allow the user to change the default project?
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let ALLOW_DEFAULT_PROJECT_CHANGE = 'AllowDefaultProjectChange';

/**
 * Provide UI to allow the user to jump to 'home' (e.g. 'gateway') at any time?
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let ALLOW_GO_HOME = 'AllowGoHome';

/**
 * Allow the group and Role Change from inside the host
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let ALLOW_GROUP_ROLE_CHANGE = 'AllowGroupRoleChange';

/**
 * Disable OS Copy from inside the host
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let ALLOW_OS_COPY = 'AllowOSCopy';

/**
 * Provide UI to allow the user to change the theme?
 * <P>
 * Boolean = 'true' or 'false' (default = 'true')
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let ALLOW_THEME_CHANGE = 'AllowThemeChange';

/**
 * The string to be used to represent the allow user revision rule change boolean = <value> (default = '')
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let ALLOW_USER_REVISION_RULE_CHANGE = 'AllowUserRevisionRuleChange';

/**
 * Provide UI to allow the user session information to be changed; i.e. can the user signOut or login as different
 * user?
 * <P>
 * Boolean = 'true' or 'false' (default = 'true')
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let ALLOW_USER_SESSION_CHANGE = 'AllowUserSessionChange';

/**
 * Allows the display and use of the MCAD Integration specific Hosted commands.
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let ENABLE_MCAD_INTEGRATION_HOSTED_COMMANDS = 'EnableMCADIntegrationHostedCommands';

/**
 * /** Provide UI to allow displaying the client in full screen mode?
 * <P>
 * Boolean = 'true' or 'false' (default = 'true')
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let HAS_FULL_SCREEN_SUPPORT = 'HasFullScreenSupport';

/**
 * Hide the search command button if requested by the host.
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let HIDE_SEARCH_COMMAND_BUTTON = 'HideSearchCommandButton';

/**
 * TRUE if the 'host' passes the clone stable path IDs top-down. FALSE if the IDs are bottom-up.
 * <P>
 * Note: The 'client' always passes the IDs to the 'host' top-down.
 *
 * @type {Boolean}
 */
export let HOST_CLONE_STABLE_ID_PATH_TOP_DOWN = 'HostCloneStableIdPathTopDown';

/**
 * Host Discriminator. This is required if 3D viewer is enabled in the host.
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {String}
 */
export let HOST_DISCRIMINATOR = 'HOST_DISCRIMINATOR';

/**
 * If the host supports multiple selection (default = false)
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let HOST_SUPPORTS_MULTIPLE_SELECTION = 'HostSupportsMultipleSelection';

/**
 * Identifier of the type of host inter-operating with the client.
 * <P>
 * String = <value> (default = '')
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {String}
 */
export let HOST_TYPE = 'HostType';

/**
 * Version of the host inter-operating with the client.
 * <P>
 * String = <value> (default = '')
 *
 * @memberof hostConst_ConfigKeys
 */
export let HOST_VERSION_INFO = 'HostVersionInfo';

/**
 * If test mode is running
 *
 * @memberof hostConst_ConfigKeys
 */
export let IS_RUNNING_TEST_MODE = 'IsRunningTestMode';

/**
 * Set to true if the Host Supports 3D Viewer.
 *
 * @memberof hostConst_ConfigKeys
 */
export let IS_VIEWER_SUPPORTED = 'IS_VIEWER_SUPPORTED';

/**
 * Command text to display for the Open New View in host command
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {String}
 */
export let OPEN_NEW_VIEW_COMMAND_DISPLAY_NAME = 'OpenNewViewCommandDisplayName';

/**
 * If this theme is provided by the host, it will override the 'Theme' value
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {String}
 */
export let PREFERRED_THEME = 'PreferredTheme';

/**
 * The sublocation title for the Sublocation Select Item.
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {String}
 */
export let SELECT_OBJECT_SUBLOCATION_TITLE = 'SelectObjectSubLocationTitle';

/**
 * The string to be used to represent the SendTo command for the UIConfigured application
 * <P>
 * String = <value> (default = '')
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {String}
 */
export let SEND_TO_COMMAND_DISPLAY_NAME = 'SendToCommandDisplayName';

/**
 * The string to be used to represent the 'SendTo new view' command for the UIConfigured application
 * <P>
 * String = <value> (default = '')
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {String}
 */
export let SEND_TO_NEW_VIEW_COMMAND_DISPLAY_NAME = 'SendToNewViewCommandDisplayName';

/**
 * The string to be used to represent the name of the preference for supported types
 * <P>
 * String = <value> (default = '')
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {String}
 */
export let SEND_TO_SUPPORTED_TYPES_PREFERENCE = 'SendToTypesPreference';

/**
 * The ID of the session currently being used to communicate with SOA
 * <P>
 * String = <value> (default = '')
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {String}
 */
export let SESSION_ID = 'SessionID';

/**
 * Display the Siemens logo?
 * <P>
 * Boolean = 'true' or 'false' (default = 'true')
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let SHOW_SIEMENS_LOGO = 'ShowSiemensLogo';

/**
 * If the host supports opening from the content tab; this flag is set to true.
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let SUPPORTS_OPENING_CONTENT = 'SupportsOpeningContent';

/**
 * The fully qualified theme name requested for use.
 * <P>
 * String = <value> (default = '')
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {String}
 */
export let THEME = 'Theme';

/**
 * The string to be used to represent the use 2014_07 soa encoding boolean = <value> (default = '')
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let USE_2014_07_SOA = 'Use2014_07_SOA';

/**
 * Use the _2015_10 version of the Occurrence selection object boolean = <value> (default = false)
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let USE_2015_10_OCC_SELECTION_OBJECT = 'Use2015_10_OccObject';

/**
 * The string to be used to represent the use 2015_10 soa encoding boolean = <value> (default = '')
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let USE_2015_10_SOA = 'Use2015_10_SOA';

/**
 * The string to be used to represent the 'open file via URL service instead of file service' boolean = <value>
 * (default = '')
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let USE_OPEN_FILE_VIA_SERVICE = 'UseOpenFileViaService';

/**
 * The flag that indicates the 'open in host' command should NOT be seen
 * (default = 'false')
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let SUPPRESS_SEND_TO_COMMAND = 'SuppressSendToCommand';

/**
 * The flag that indicates the 'open in host in new view' command should NOT be seen
 * (default = 'false')
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let SUPPRESS_SEND_TO_NEW_VIEW_COMMAND = 'SuppressSendToNewViewCommand';

/**
 * The flag that indicates the 'add component hosted' command should NOT be seen
 * (default = 'false')
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let SUPPRESS_ADD_COMPONENT_HOSTED_COMMAND = 'SuppressAddComponentHostedCommand';

/**
 * The flag that indicates the unload objects flag in each soa request
 * (default = 'false')
 *
 * @memberof hostConst_ConfigKeys
 *
 * @type {Boolean}
 */
export let UNLOAD_OBJECTS = 'UnloadObjects';

/**
 * Configuration key used to access the associated option value.
 * <P>
 * Note: This option is ignored in aw3.4 and later versions as the 'optional' behavior it was meant to indicate is
 * now the default behavior. An entry for this option remains here as a reference for the future in the event this
 * option si seen from the host.
 *
 * @memberof hostConst_ConfigKeys
 */
// exports.ENABLE_SELECTION_BY_VISIBLE_COMMAND_CTX : 'EnableSelectionByVisibleCommandCtx';

export default {
    ADD_COMPONENT_HOSTED_DISPLAY_NAME,
    ALLOW_DEFAULT_LOCATION_CODE_CHANGE,
    ALLOW_DEFAULT_PROJECT_CHANGE,
    ALLOW_GO_HOME,
    ALLOW_GROUP_ROLE_CHANGE,
    ALLOW_OS_COPY,
    ALLOW_THEME_CHANGE,
    ALLOW_USER_REVISION_RULE_CHANGE,
    ALLOW_USER_SESSION_CHANGE,
    ENABLE_MCAD_INTEGRATION_HOSTED_COMMANDS,
    HAS_FULL_SCREEN_SUPPORT,
    HIDE_SEARCH_COMMAND_BUTTON,
    HOST_CLONE_STABLE_ID_PATH_TOP_DOWN,
    HOST_DISCRIMINATOR,
    HOST_SUPPORTS_MULTIPLE_SELECTION,
    HOST_TYPE,
    HOST_VERSION_INFO,
    IS_RUNNING_TEST_MODE,
    IS_VIEWER_SUPPORTED,
    OPEN_NEW_VIEW_COMMAND_DISPLAY_NAME,
    PREFERRED_THEME,
    SELECT_OBJECT_SUBLOCATION_TITLE,
    SEND_TO_COMMAND_DISPLAY_NAME,
    SEND_TO_NEW_VIEW_COMMAND_DISPLAY_NAME,
    SEND_TO_SUPPORTED_TYPES_PREFERENCE,
    SESSION_ID,
    SHOW_SIEMENS_LOGO,
    SUPPORTS_OPENING_CONTENT,
    THEME,
    USE_2014_07_SOA,
    USE_2015_10_OCC_SELECTION_OBJECT,
    USE_2015_10_SOA,
    USE_OPEN_FILE_VIA_SERVICE,
    SUPPRESS_SEND_TO_COMMAND,
    SUPPRESS_SEND_TO_NEW_VIEW_COMMAND,
    SUPPRESS_ADD_COMPONENT_HOSTED_COMMAND,
    UNLOAD_OBJECTS
};
