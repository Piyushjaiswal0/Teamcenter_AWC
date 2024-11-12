// Copyright (c) 2021 Siemens

/**
 * Defines {@link NgServices.frameAdapterService} which provides utility functions for viewer
 *
 * @module js/frameAdapter.service
 *
 * @namespace frameAdapterService
 */
import AwPromiseService from 'js/awPromiseService';
import sessionCtxSvc from 'js/sessionContext.service';
import soaSvc from 'soa/kernel/soaService';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import logger from 'js/logger';
import '@swf/ClientViewer';
import messagingSvc from 'js/messagingService';
// import 'manipulator';
import preferenceService from 'soa/preferenceService';

const Default_AWTc_SharePreference = 'SharePartViewer';
/**
 * The TC (SOA) proxy servlet context. This must be the same as the FmsProxyServlet mapping in the web.xml
 */
var WEB_XML_SOA_PROXY_CONTEXT = 'tc';

/**
 * Relative path to client side accessible SOA services. Specifically this is the root path, not the path
 * which AWC client generally sends requests to.
 */
var CLIENT_SOA_PATH = WEB_XML_SOA_PROXY_CONTEXT + '/';

/**
 * The Vis proxy servlet context. This must be the same as the VisPoolProxy mapping in the web.xml
 */
var WEB_XML_VIS_PROXY_CONTEXT = 'VisProxyServlet' + '/';

/**
 * {Boolean} TRUE if various processing steps should be logged.
 */
var _debug_logLaunchActivity = browserUtils.getWindowLocationAttributes().logLaunchActivity !== undefined;

/**
 * {String} Variable holding the soa path url.
 */
var _soaPath;

/**
 * Get connection url
 *
 * @returns {String} URL
 */
export let getConnectionUrl = function() {
    return browserUtils.getBaseURL() + WEB_XML_VIS_PROXY_CONTEXT;
};

/**
 * Create launch file api
 *
 * @function createLaunchFile
 * @memberof frameAdapterService
 *
 * @param {Object} contextObject - context model object
 * @param {Object} additionalInfo - Additional information
 * @param {Object} pvOpenConfig - Additional information
 *
 * @return {Promise} A promise which resolves once fms ticket is obtained.
 */
export let createLaunchFile = function( contextObject, additionalInfo, pvOpenConfig ) {
    return AwPromiseService.instance.all( [ _getAWTcSharePreference(), _getServerInfo() ] ).then( function( values ) {
        var userAgentInfo = _getUserAgentInfo();

        let useTcSharePref = values[ 0 ];
        var idInfo = _getIdInfo( contextObject, additionalInfo, pvOpenConfig );
        var sessionDescVal = null;

        if( ( _.isUndefined( additionalInfo ) || _.isNull( additionalInfo ) ) && useTcSharePref === Default_AWTc_SharePreference || useTcSharePref === 'ShareAllViewers' ) {
            sessionDescVal = sessionCtxSvc.getSessionDiscriminator();
        }

        var sessionInfo = {};

        sessionInfo.sessionDescriminator = sessionDescVal;
        sessionInfo.sessionAdditionalInfo = {};
        sessionInfo.sessionAdditionalInfo.CLIENT = 'AW';

        var idInfos = [];

        idInfos.push( idInfo );

        var input = {};

        input.idInfos = idInfos;
        input.serverInfo = values[ 1 ];
        input.userDataAgentInfo = userAgentInfo;
        input.sessionInfo = sessionInfo;

        return soaSvc.post( 'Visualization-2011-02-DataManagement', 'createLaunchFile', input )
            .then( function( response ) {
                return response.ticket;
            } ).catch( error => {
                logger.error( 'Error while creating launch file : ' + error );
                var errMessage = messagingSvc.getSOAErrorMessage( error );
                return AwPromiseService.instance.reject( errMessage );
            } );
    } );
};

/**
 * Create launch Info server request
 *
 * @param {Object} idInfo - context model object and additional info.
 * @param {Object} serverInfo - host server info object.
 *
 * @returns {Promise} Resolved with SOA response from "ActiveWorkspaceVis-2015-03-DataManagement" -
 * "createLaunchInfo" service call.
 */
var _createLaunchInfoServerRequest = function( idInfo, serverInfo ) {
    return _getTCVisTcSharePrefrence().then( function( value ) {
        let input = {
            idInfos: idInfo,
            serverInfo: serverInfo,
            sessionInfo: {
                sessionAdditionalInfo: {
                    CLIENT: 'AW'
                },
                sessionOptions: {
                    UseTransientVolume: {
                        includeInLaunchFile: false,
                        optionValue: 'True'
                    }
                }
            },
            userDataAgentInfo: _getUserAgentInfo()
        };

        if( value ) {
            input.sessionInfo.sessionDescriminator = sessionCtxSvc.getSessionDiscriminator();
        }
        return soaSvc.post( 'ActiveWorkspaceVis-2015-03-DataManagement', 'createLaunchInfo', input );
    } ).catch( error => {
        logger.error( 'Error while loading TC Vis Share preference: ' + error );
        var errMessage = messagingSvc.getSOAErrorMessage( error );
        return AwPromiseService.instance.reject( errMessage );
    } );
};

/**
 * Create Info file api
 *
 * @param {Object} idInfo - context model object and additional info.
 * @param {Object} serverInfo - host server info object.
 *
 * @returns {Promise} Resolved with response from 'createLaunchInfo' SOA operation.
 */
export let createLaunchInfo = function( idInfo, serverInfo ) {
    if( !serverInfo ) {
        return _getServerInfo().then( function( serverInfo ) {
            return _createLaunchInfoServerRequest( idInfo, serverInfo );
        } );
    }

    return _createLaunchInfoServerRequest( idInfo, serverInfo );
};

/**
 * Get server information from vis server
 *
 * @function _getServerInfo
 * @memberof frameAdapterService
 *
 * @return {Promise} A promise resolved once server info is obtained
 */
function _getServerInfo() {
    return _getSoaPath().then( function( soaPath ) {
        if( _debug_logLaunchActivity ) {
            logger.info( 'frameAdapterService:' + '_getServerInfo: ' + 'soaPath=' + soaPath );
        }

        var protocol = soaPath.substring( 0, soaPath.indexOf( '://', 0 ) );

        var returnObject = {};

        returnObject.protocol = protocol;
        returnObject.hostpath = soaPath;
        returnObject.servermode = 4;

        return returnObject;
    } );
}

/**
 * Get AW tc Share preference value
 */
function _getAWTcSharePreference() {
    return preferenceService.getStringValue( 'AWV0AWVisReuseTCServer' ).then( ( value ) => {
        return value ? value : Default_AWTc_SharePreference;
    } ).catch( function() {
        return Default_AWTc_SharePreference;
    } );
}

/**
 * Get TC VIS tc Share preference value
 */
function _getTCVisTcSharePrefrence() {
    let deferred = AwPromiseService.instance.defer();
    preferenceService.getStringValue( 'AWV0VisReuseTCServer' ).then( function( result ) {
        if( result !== null && result.length > 0 && result.toUpperCase() === 'TRUE' ) {
            deferred.resolve( true );
        } else {
            deferred.resolve( false );
        }
    } ).catch( function() {
        deferred.resolve( false );
    } );

    return deferred.promise;
}

/**
 * Get SOA path information from vis server
 *
 * @function _getSoaPath
 * @memberof frameAdapterService
 *
 * @return {Promise} A promise resolved once SOA path info is obtained
 */
function _getSoaPath() {
    if( !_.isEmpty( _soaPath ) ) {
        return AwPromiseService.instance.resolve( _soaPath );
    }

    var connectionUrl = browserUtils.getBaseURL() + WEB_XML_VIS_PROXY_CONTEXT;

    if( _debug_logLaunchActivity ) {
        logger.info( 'frameAdapterService:' + '_getSoaPath: ' + 'connectionUrl=' + connectionUrl );
    }

    return window.JSCom.Health.HealthUtils.getSOAFullPath( connectionUrl ).then(
        function( soaPathFromVisServer ) {
            if( !_.isEmpty( soaPathFromVisServer ) ) {
                _soaPath = soaPathFromVisServer;
            } else {
                _soaPath = _getDefaultSoaPath();
            }

            if( _debug_logLaunchActivity ) {
                logger.info( 'frameAdapterService:' + '_getSoaPath: ' + '_soaPath=' + soaPathFromVisServer );
            }

            return _soaPath;
        },
        function( err ) {
            logger.error( 'Failed to get soa path : ' + err );

            _soaPath = _getDefaultSoaPath();

            return _soaPath;
        } );
}

/**
 * Get default SOA path information
 *
 * @function _getDefaultSoaPath
 * @memberof frameAdapterService
 *
 * @return {Object} A default SOA path string
 */
function _getDefaultSoaPath() {
    return browserUtils.getBaseURL() + CLIENT_SOA_PATH;
}

/**
 * Get client information
 *
 * @function _getUserAgentInfo
 * @memberof frameAdapterService
 *
 * @return {Object} Client information
 */
function _getUserAgentInfo() {
    var userAgentInfo = {};

    userAgentInfo.userApplication = sessionCtxSvc.getClientID() ? sessionCtxSvc.getClientID() : 'ActiveWorkspaceClient';
    userAgentInfo.userAppVersion = sessionCtxSvc.getClientVersion();

    return userAgentInfo;
}

/**
 * Construct the object containing information about the item to be launched in visualization.
 *
 * @function _getIdInfo
 * @memberof frameAdapterService
 *
 * @param {String} id - A required parameter that references the object to be launched. If needed, launched
 *            object will be resolved by the server to a launch able object.
 *
 * @param {Object} additionalInfo additional information to be added to vvi launch file
 * @param {Object} pvOpenConfig - Additional information
 *
 * @return {IdInfo} IdInfo object
 */
function _getIdInfo( id, additionalInfo, pvOpenConfig ) {
    var additionalInfoToBeReturned = {};

    if( !_.isUndefined( additionalInfo ) && !_.isNull( additionalInfo ) ) {
        if( !_.isUndefined( additionalInfo.OVERRIDE_VisDoc_Type ) && !_.isNull( additionalInfo.OVERRIDE_VisDoc_Type ) ) {
            additionalInfoToBeReturned.OVERRIDE_VisDoc_Type = additionalInfo.OVERRIDE_VisDoc_Type;
        }
        if( !_.isUndefined( additionalInfo.TransientDoc ) && !_.isNull( additionalInfo.TransientDoc ) ) {
            additionalInfoToBeReturned.TransientDoc = additionalInfo.TransientDoc;
        }
        if( !_.isUndefined( additionalInfo.isFilteredProduct ) && !_.isNull( additionalInfo.isFilteredProduct ) ) {
            additionalInfoToBeReturned.isFilteredProduct = additionalInfo.isFilteredProduct;
        }
        if( !_.isUndefined( additionalInfo.underlyingObjectType ) && !_.isNull( additionalInfo.underlyingObjectType ) ) {
            additionalInfoToBeReturned.underlyingObjectType = additionalInfo.underlyingObjectType;
        }
        if( !_.isUndefined( additionalInfo.FileTypeID ) && !_.isNull( additionalInfo.FileTypeID ) ) {
            additionalInfoToBeReturned.FileTypeID = additionalInfo.FileTypeID;
        }
        if( !_.isUndefined( additionalInfo.splitMode ) && !_.isNull( additionalInfo.splitMode ) ) {
            additionalInfoToBeReturned.splitMode = additionalInfo.splitMode.toString();
        }
        if( !_.isUndefined( additionalInfo.reloadSession ) && !_.isNull( additionalInfo.reloadSession ) && additionalInfo.reloadSession !== false ) {
            additionalInfoToBeReturned.dirtyAppSessionInClient = additionalInfo.reloadSession.toString();
        }
        if( !_.isUndefined( additionalInfo.IGNOREKEY_TOPLINE_UID ) && !_.isNull( additionalInfo.IGNOREKEY_TOPLINE_UID ) ) {
            additionalInfoToBeReturned.IGNOREKEY_TOPLINE_UID = additionalInfo.IGNOREKEY_TOPLINE_UID;
        }
        if( !_.isUndefined( additionalInfo.splitMode ) && !_.isNull( additionalInfo.splitMode ) ) {
            additionalInfoToBeReturned.splitMode = additionalInfo.splitMode.toString();
        }
        if( !_.isUndefined( additionalInfo.reloadSession ) && !_.isNull( additionalInfo.reloadSession ) && additionalInfo.reloadSession !== false ) {
            additionalInfoToBeReturned.dirtyAppSessionInClient = additionalInfo.reloadSession.toString();
        }
    }

    if( pvOpenConfig ) {
        additionalInfoToBeReturned.OVERRIDE_OperationStructure = pvOpenConfig;
    }

    return {
        id: id,
        item: null,
        operation: 'Open',
        idAdditionalInfo: additionalInfoToBeReturned
    };
}

export default {
    getConnectionUrl,
    createLaunchFile,
    createLaunchInfo
};
