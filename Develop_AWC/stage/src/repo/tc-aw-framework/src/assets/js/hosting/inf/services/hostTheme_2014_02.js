// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/inf/services/hostTheme_2014_02
 * @namespace hostTheme_2014_02
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import hostConfigSvc from 'js/hosting/hostConfigService';
import themeSvc from 'js/theme.service';
import _ from 'lodash';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// ThemeObject
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Represents an object reference that we can marshal across the hosting interop boundary.
 *
 * @constructor
 * @memberof hostTheme_2014_02
 *
 * @param {String} displayName - Displayable name of the theme
 * @param {String} id - Internal identifier for the theme
 */
var ThemeObject = function( displayName, id ) {
    this.displayName = displayName;
    this.id = id;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// GetAvailableThemesMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Class used to communicate with the 'host'.
 *
 * @constructor
 * @memberof hostTheme_2014_02
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var GetAvailableThemesMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

GetAvailableThemesMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get list of themes.
 *
 * @memberof hostTheme_2014_02.GetAvailableThemesMsg
 *
 * @return {StringArray} Themes list property value.
 */
GetAvailableThemesMsg.prototype.getThemes = function() {
    return _.get( this, 'Themes', null );
};

/**
 * Set list of themes.
 *
 * @memberof hostTheme_2014_02.GetAvailableThemesMsg
 *
 * @param {ThemeObjectArray} list - Themes list property value.
 */
GetAvailableThemesMsg.prototype.setThemes = function( list ) {
    this.Themes = list;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// GetAvailableThemeService
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Create new client-side service.
 *
 * @constructor
 * @memberof hostTheme_2014_02
 * @extends hostFactoryService.BaseCallableService
 */
var GetAvailableThemeService = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_GET_AVAILABLE_THEMES_SVC,
        hostServices.VERSION_2014_02 );
};

GetAvailableThemeService.prototype = hostFactorySvc.extendCallableService();

/**
 * Receives incoming service call from the host.
 * <P>
 * Note: This is the service invocation trigger from the host.
 *
 * @function handleIncomingEvent
 * @memberof hostTheme_2014_02.GetAvailableThemeService
 *
 * @param {String} payload - JSON string with input parameters from the host.
 *
 * @returns {String} JSON string with result of this operation.
 */
GetAvailableThemeService.prototype.handleIncomingMethod = function( payload ) { // eslint-disable-line no-unused-vars
    var themeObjs = [];

    themeObjs.push( new ThemeObject( 'My Light Theme', 'ui-lightTheme' ) );
    themeObjs.push( new ThemeObject( 'My Dark Theme', 'ui-darkTheme' ) );

    var msg = new GetAvailableThemesMsg();

    msg.setThemes( themeObjs );

    return JSON.stringify( msg );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// SetThemeService
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Create new client-side service.
 *
 * @constructor
 * @memberof hostTheme_2014_02
 * @extends hostFactoryService.BaseCallableService
 */
var SetThemeService = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_SET_THEME_SVC,
        hostServices.VERSION_2014_02 );
};

SetThemeService.prototype = hostFactorySvc.extendCallableService();

/**
 * Receives incoming service call from the host.
 * <P>
 * Note: This is the service invocation trigger from the host.
 *
 * @param {String} payload - JSON content from the host.
 *
 * @function handleIncomingEvent
 * @memberof hostTheme_2014_02.SetThemeService
 */
SetThemeService.prototype.handleIncomingEvent = function( payload ) {
    if( payload ) {
        var themeName = hostConfigSvc.mapThemeName( payload );

        themeSvc.setTheme( themeName );
    }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Create new client-side service.
 *
 * @memberof hostTheme_2014_02
 *
 * @returns {GetAvailableThemeService} New GetAvailableThemeService.
 */
export let createGetAvailableThemeService = function() {
    return new GetAvailableThemeService();
};

/**
 * Create new client-side service.
 *
 * @memberof hostTheme_2014_02
 *
 * @returns {SetThemeService} New SetThemeService.
 */
export let createSetThemeService = function() {
    return new SetThemeService();
};

/**
 * Create new {ThemeObject} Object}.
 *
 * @memberof hostTheme_2014_02
 *
 * @param {String} displayName - Displayable name of the theme
 * @param {String} id - Internal identifier for the theme
 *
 * @returns {ThemeObject} New Object initialized with the given values.
 */
export let createThemeObject = function( displayName, id ) {
    return new ThemeObject( displayName, id );
};

/**
 * Create new {GetAvailableThemesMsg} Object}.
 *
 * @memberof hostTheme_2014_02
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 *
 * @returns {GetAvailableThemesMsg} New Object initialized with the given values.
 */
export let createGetAvailableThemesMsg = function( jsonData ) {
    return new GetAvailableThemesMsg( jsonData );
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostTheme_2014_02
 */
export let registerHostingModule = function() {
    exports.createGetAvailableThemeService().register();
    exports.createSetThemeService().register();
};

export default exports = {
    createGetAvailableThemeService,
    createSetThemeService,
    createThemeObject,
    createGetAvailableThemesMsg,
    registerHostingModule
};
