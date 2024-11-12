// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/inf/services/hostClientInfo_2019_05
 * @namespace hostClientInfo_2019_05
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import cfgSvc from 'js/configurationService';
import hostClientInfo1 from 'js/hosting/inf/services/hostClientInfo_2014_07';
import hostServices from 'js/hosting/hostConst_Services';
import 'config/versionConstants';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// ClientInfoSvc
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Service used to allow the host to request information about the client.
 *
 * @constructor
 * @memberof hostClientInfo_2019_05
 * @extends hostFactoryService.BaseCallableService
 */
var ClientInfoSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_GET_CLIENT_INFO_SVC,
        hostServices.VERSION_2019_05 );
};

ClientInfoSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * Handle request from host for client information.
 *
 * @memberof hostClientInfo_2019_05.ClientInfoSvc
 * @function handleIncomingMethod
 *
 * @returns {String} JSON encoded string containing the {ClientInfoMsg} from the service invocation.
 */
ClientInfoSvc.prototype.handleIncomingMethod = function() {
    // TODO: Get real values here from build information

    var versionConstants = cfgSvc.getCfgCached( 'versionConstants' );

    if( !versionConstants ) {
        versionConstants = {
            name: '(Unknown)',
            version: '(Unknown)',
            description: '(Unknown)',
            buildTime: '(Unknown)'
        };
    }

    var msg = hostClientInfo1.createClientInfoMsg( versionConstants.name, versionConstants.version, versionConstants.buildTime );

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
 * @memberof hostClientInfo_2019_05
 *
 * @returns {ClientInfoSvc} New instance of the service API object.
 */
export let createClientInfoSvc = function() {
    return new ClientInfoSvc();
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostClientInfo_2019_05
 */
export let registerHostingModule = function() {
    exports.createClientInfoSvc().register();
};

export default exports = {
    createClientInfoSvc,
    registerHostingModule
};
