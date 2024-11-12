// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/inf/services/hostTheme_2019_05
 * @namespace hostTheme_2019_05
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import hostTheme1 from 'js/hosting/inf/services/hostTheme_2014_02';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// GetAvailableThemeService
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Create new client-side service.
 *
 * @constructor
 * @memberof hostTheme_2019_05
 * @extends hostFactoryService.BaseCallableService
 */
var GetAvailableThemeService = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_GET_AVAILABLE_THEMES_SVC,
        hostServices.VERSION_2019_05 );
};

GetAvailableThemeService.prototype = hostFactorySvc.extendCallableService();

/**
 * Receives incoming service call from the host.
 * <P>
 * Note: This is the service invocation trigger from the host.
 *
 * @function handleIncomingEvent
 * @memberof hostTheme_2019_05.GetAvailableThemeService
 *
 * @param {String} payload - JSON string with input parameters from the host.
 *
 * @returns {String} JSON string with result of this operation.
 */
GetAvailableThemeService.prototype.handleIncomingMethod = function( payload ) { // eslint-disable-line no-unused-vars
    var themeObjs = [];

    themeObjs.push( hostTheme1.createThemeObject( 'My Light Theme', 'ui-lightTheme' ) );
    themeObjs.push( hostTheme1.createThemeObject( 'My Dark Theme', 'ui-darkTheme' ) );

    var msg = hostTheme1.createGetAvailableThemesMsg();

    msg.setThemes( themeObjs );

    return JSON.stringify( msg );
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
 * @memberof hostTheme_2019_05
 *
 * @returns {GetAvailableThemeService} New GetAvailableThemeService.
 */
export let createGetAvailableThemeService = function() {
    return new GetAvailableThemeService();
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostTheme_2019_05
 */
export let registerHostingModule = function() {
    exports.createGetAvailableThemeService().register();
};

export default exports = {
    createGetAvailableThemeService,
    registerHostingModule
};
