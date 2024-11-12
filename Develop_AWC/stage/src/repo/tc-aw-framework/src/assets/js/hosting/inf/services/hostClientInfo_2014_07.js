// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/inf/services/hostClientInfo_2014_07
 * @namespace hostClientInfo_2014_07
 */
import { getBaseUrlPath } from 'app';
import hostFactorySvc from 'js/hosting/hostFactoryService';
import _ from 'lodash';
import cfgSvc from 'js/configurationService';
import hostServices from 'js/hosting/hostConst_Services';
import 'config/versionConstants';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// ClientInfoMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Create new {ClientInfoMsg} Object}.
 *
 * @memberof hostTheme_2014_02
 *
 * @param {String} clientFullVersionIdentifier - Client full version string
 * @param {String} clientVersionNumber - Client Version #
 * @param {String} clientBuildLabel - Client build label
 * @param {String} clientUrl - Client URL
 *
 * @returns {ClientInfoMsg} New Object initialized with the given values.
 */
export let createClientInfoMsg = function( clientFullVersionIdentifier, clientVersionNumber, clientBuildLabel, clientUrl ) {
    return new ClientInfoMsg( clientFullVersionIdentifier, clientVersionNumber, clientBuildLabel, clientUrl );
};


/**
 * Used to allow the host to request information about the client.
 *
 * @constructor
 * @memberof hostClientInfo_2014_07
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} clientFullVersionIdentifier - Client full version string
 * @param {String} clientVersionNumber - Client Version #
 * @param {String} clientBuildLabel - Client build label
 */
var ClientInfoMsg = function( clientFullVersionIdentifier, clientVersionNumber, clientBuildLabel ) {
    hostFactorySvc.getDataContract().call( this, '1.0' );

    this.Data = [];

    var pair1 = {
        Key: 'clientFullVersionIdentifier',
        Value: clientFullVersionIdentifier ? clientFullVersionIdentifier : ''
    };

    var pair2 = {
        Key: 'clientVersionNumber',
        Value: clientVersionNumber ? clientVersionNumber : ''
    };

    var pair3 = {
        Key: 'clientBuildLabel',
        Value: clientBuildLabel ? clientBuildLabel : ''
    };

    var pair4 = {
        Key: 'clientUrl',
        Value: getBaseUrlPath()
    };

    this.Data.push( pair1 );
    this.Data.push( pair2 );
    this.Data.push( pair3 );
    this.Data.push( pair4 );
};

ClientInfoMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get data value array.
 *
 * @memberof hostClientInfo_2014_07.ClientInfoMsg
 *
 * @returns {PairArray} Array of key/value data values.
 */
ClientInfoMsg.prototype.getData = function() {
    return _.get( this, 'Data', null );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// ClientInfoSvc
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Service used to allow the host to request information about the client.
 *
 * @constructor
 * @memberof hostClientInfo_2014_07
 * @extends hostFactoryService.BaseCallableService
 */
var ClientInfoSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_GET_CLIENT_INFO_SVC,
        hostServices.VERSION_2014_07 );
};

ClientInfoSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * Handle request from host for client information.
 *
 * @memberof hostClientInfo_2014_07.ClientInfoSvc
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

    var msg = new ClientInfoMsg( versionConstants.name, versionConstants.version, versionConstants.buildTime );

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
 * @memberof hostClientInfo_2014_07
 *
 * @returns {ClientInfoSvc} New instance of the service API object.
 */
export let createClientInfoSvc = function() {
    return new ClientInfoSvc();
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostClientInfo_2014_07
 */
export let registerHostingModule = function() {
    exports.createClientInfoSvc().register();
};

export default exports = {
    createClientInfoSvc,
    registerHostingModule,
    createClientInfoMsg
};
