// Copyright (c) 2022 Siemens

/**
 * native implementation for TcSessionData. This tracks some Teamcenter specific version information and user session
 * related apis.
 *
 * @module js/TcSessionData
 */
import tcSvrVer from 'js/TcServerVersion';
import awSvrVer from 'js/TcAWServerVersion';
import appCtxSvc from 'js/appCtxService';
import cfgSvc from 'js/configurationService';
import sessionCtxSvc from 'js/sessionContext.service';
import themeSvc from 'js/theme.service';
import _ from 'lodash';
import localStrg from 'js/localStorage';
import analyticsSvc from 'js/analyticsService';
import browserUtils from 'js/browserUtils';
import hostConfigKeys from 'js/hosting/hostConst_ConfigKeys';
import eventBus from 'js/eventBus';

var _displayCurrentCountry = false;
var _hasProjects = false;

var _siteId;
var _itemPreferredOnPasteEnabled;
var _userLicenseLevel;

var WEB_XML_SOA_PROXY_CONTEXT = 'tc/';
var _postLoginStages = [];
var exports = {};

/**
 * Given a complete path and file name, return just the file name
 * @param {*} longFilename complete absolute path
 * @return {String} Complete path and name of the log file.
 */
function getFilename( longFilename ) {
    var logFilename = longFilename;
    var lastSlash = logFilename.lastIndexOf( '\\' );
    if( lastSlash !== -1 ) {
        logFilename = logFilename.substring( lastSlash + 1 );
    }
    return logFilename;
}

/**
 * Build the analytics data logging from the given SOA response.
 *
 * @param {*} appCtxSvc application CTX service from hasProjects
 *
 * @param {String} soaResponse - soa payload from GetTCSessionInfo with the version information and other
 *            parameters.
 */
function _logSessionData( appCtxSvc, soaResponse ) {
    if( soaResponse.analyticsData && soaResponse.analyticsData.isDataCollectionEnabled ) {
        var solution;

        // Some of the data are required to be set before the SAN is initialized.
        var preInitData = {};
        preInitData.user_id = soaResponse.userSession.props.user_id.dbValues[ 0 ];
        if( soaResponse.analyticsData.analyticsExtraInfo.tenantId ) {
            preInitData.vendor_id = soaResponse.analyticsData.analyticsExtraInfo.tenantId;
        } else {
            preInitData.vendor_id = soaResponse.analyticsData.analyticsExtraInfo.Vendor;
        }
        preInitData.user_license_level = soaResponse.analyticsData.analyticsExtraInfo.UserLicenseLevel;
        if( soaResponse.analyticsData.analyticsExtraInfo.ApplicationContext ) {
            preInitData.applicationContext = soaResponse.analyticsData.analyticsExtraInfo.ApplicationContext;
        }
        if( soaResponse.analyticsData.analyticsExtraInfo.ApplicationEdition ) {
            preInitData.applicationEdition = soaResponse.analyticsData.analyticsExtraInfo.ApplicationEdition;
        }

        analyticsSvc.setPreInitData( preInitData );
        analyticsSvc.enable( soaResponse.analyticsData.useInternalServer, soaResponse.analyticsData.analyticsExtraInfo.TC_SAN_Product_Repo ).then( function() {
            return cfgSvc.getCfg( 'solutionDef' );
        } ).then( function( solutionDef ) {
            solution = solutionDef;
            return cfgSvc.getCfg( 'versionConstants' );
        } ).then( function( versionConstants ) {
            var licenseUsageInfo = [];
            var dataModelInfo = [];
            var key;
            var deploymentType = soaResponse.analyticsData.analyticsExtraInfo.DeploymentType;
            var isManagedSvs = soaResponse.analyticsData.analyticsExtraInfo.isManagedSvs;

            for( key in soaResponse.analyticsData.analyticsExtraInfo ) {
                if( key.startsWith( 'licenseUsageInfo' ) ) {
                    var feature = key.substr( 'licenseUsageInfo'.length + 1 );
                    var data = soaResponse.analyticsData.analyticsExtraInfo[ key ].split( ' | ' );
                    var license_usage = data[ 0 ];
                    var date_range = data[ 1 ];
                    var user_count = data[ 2 ];
                    var purchased_lic = data[ 3 ];
                    var site = soaResponse.analyticsData.analyticsExtraInfo.Site;
                    licenseUsageInfo.push( {
                        feature,
                        date_range,
                        license_usage,
                        site,
                        user_count,
                        purchased_lic
                    } );
                    delete soaResponse.analyticsData.analyticsExtraInfo[ key ];
                } else if( key === 'DeploymentType' || key === 'isManagedSvs' ) {
                    delete soaResponse.analyticsData.analyticsExtraInfo[ key ];
                } else if( key === 'InstalledTemplates' ) {
                    // Template names are sent in the format "template1-date1 | template2-date2 | template3-date3"
                    var templates = soaResponse.analyticsData.analyticsExtraInfo[ key ].split( ' | ' );
                    var siteId = soaResponse.analyticsData.analyticsExtraInfo.Site;
                    templates.forEach( function( template ) {
                        var templateInfo = template.split( '-' );
                        var internalTemplateName = templateInfo[ 0 ];
                        var deployDate = templateInfo[ 1 ];
                        if( internalTemplateName && deployDate ) {
                            dataModelInfo.push( { siteId, deployDate, internalTemplateName } );
                        }
                    } );
                    delete soaResponse.analyticsData.analyticsExtraInfo[ key ];
                }
            }

            var idleReporting = eventBus.subscribe( 'idle', function() {
                licenseUsageInfo.forEach( function( item ) {
                    analyticsSvc.logAnalyticsEvent( solution.solutionName + ' licenseUsageInfo', item );
                } );
                dataModelInfo.forEach( function( item ) {
                    analyticsSvc.logAnalyticsEvent( solution.solutionName + ' dataModel', item );
                } );
                eventBus.unsubscribe( idleReporting );
            } );

            // Add the analytics properties from the SOA Response to property object
            // and Teamcenter Server version, Active workspace server version, theme
            var property = _.assign( {}, soaResponse.analyticsData.analyticsExtraInfo );

            property.clientVersion = versionConstants.version;
            property.serverVersion = awSvrVer.baseLine;
            property.clientLocale = soaResponse.userSession.props.fnd0locale.dbValues[ 0 ];
            var currentTheme = themeSvc.getTheme();
            currentTheme = analyticsSvc.publishableValue( currentTheme, 'Theme' );

            property[ 'Theme In Use' ] = currentTheme;
            property[ 'AW Client Width' ] = parseInt( window.innerWidth );
            property[ 'AW Client Height' ] = parseInt( window.innerHeight );
            property[ 'Browser Zoom Level' ] = Math.round( window.devicePixelRatio * 100 );

            property.Participating = 'true';

            // Add the Host application details
            var hostType = 'Standalone';
            if( appCtxSvc && appCtxSvc.ctx.aw_host_type ) {
                hostType = appCtxSvc.ctx.aw_host_type;
            }
            property[ 'Host Application' ] = hostType;

            if( appCtxSvc.ctx.aw_hosting_config ) {
                var hostVersion = appCtxSvc.ctx.aw_hosting_config[ hostConfigKeys.HOST_VERSION_INFO ];
                if( hostVersion ) {
                    property[ 'Host Version' ] = hostVersion;
                }
            }

            // Make sure that we are not reporting Vendor Id
            if( property.Vendor ) {
                delete property.Vendor;
            }

            analyticsSvc.logEvent( solution.solutionName, property );
            analyticsSvc.logProductInfo( 'Participating', 'Opt-In' );
            analyticsSvc.logProductInfo( 'DeploymentType', deploymentType );
            analyticsSvc.logProductInfo( 'isManagedService', isManagedSvs );
        } );
    } else if( soaResponse.analyticsData && !soaResponse.analyticsData.isDataCollectionEnabled ) {
        // Disable the Analytics reporting, if it is disabled in the tcserver.
        if( soaResponse.analyticsData.analyticsExtraInfo ) {
            // Replace Vendor Id with Site Id for reporting the opt-out.
            var encodedSiteIdInfo = '';
            if( soaResponse.analyticsData.analyticsExtraInfo.Site ) {
                encodedSiteIdInfo = soaResponse.analyticsData.analyticsExtraInfo.Site;
            }

            analyticsSvc.disable( soaResponse.analyticsData.useInternalServer, encodedSiteIdInfo, soaResponse.analyticsData.analyticsExtraInfo.TC_SAN_Product_Repo );
        }
    }
}

/**
 * set isCommandBuilderAdmin into ctx.
 *
 * @param {*} appCtxSvc application CTX service
 *
 * @param {String} soaResponse - soa payload from GetTCSessionInfo with the version information and other
 *            parameters.
 */
function _setCommandBuilderAdmin( appCtxSvc, soaResponse ) {
    var dbaPrivilege = false;
    var groupUID = _.get( soaResponse, 'userSession.props.group.dbValues[0]' );
    if( groupUID && groupUID !== '' ) {
        var privilege = _.get( soaResponse, 'ServiceData.modelObjects.' + groupUID + '.props.privilege.dbValues[0]' );
        if( privilege === '1' ) {
            dbaPrivilege = true;
        }
    }
    appCtxSvc.registerCtx( 'isCommandBuilderAdmin', dbaPrivilege );
}

/**
 * given the SOA response for GetTCSessionInfo3, pull out the version strings and other information.
 *
 * @param {String} soaResponse - soa payload from GetTCSessionInfo with the version information and other
 *            parameters.
 */
export let parseSessionInfo = function( soaResponse ) {
    // expecting the literal from string to be exact case match
    if( soaResponse.extraInfoOut && soaResponse.extraInfoOut.hasProjects ) {
        _hasProjects = soaResponse.extraInfoOut.hasProjects === 'true';
    } else {
        _hasProjects = false;
    }

    if( soaResponse.extraInfoOut && soaResponse.extraInfoOut.displayCurrentCountryPage ) {
        _displayCurrentCountry = soaResponse.extraInfoOut.displayCurrentCountryPage === 'true';
    } else {
        _displayCurrentCountry = false;
    }

    appCtxSvc.registerCtx( 'hasProjects', _hasProjects );
    _postLoginStages = soaResponse.extraInfoOut.AWC_PostLoginStages;

    if( _postLoginStages && _postLoginStages.length > 0 ) {
        exports.setpostLoginStageList( _postLoginStages );
    }

    var svrVer = soaResponse.extraInfoOut.TCServerVersion;
    tcSvrVer.parseVersionInfo( svrVer );
    var awVer = soaResponse.extraInfoOut.AWServerVersion;
    awSvrVer.parseVersionInfo( awVer );

    _logSessionData( appCtxSvc, soaResponse );

    _setCommandBuilderAdmin( appCtxSvc, soaResponse );

    if( soaResponse.analyticsData && soaResponse.analyticsData.analyticsExtraInfo ) {
        _siteId = soaResponse.extraInfoOut.SiteID;
    }

    if( soaResponse.extraInfoOut.Fnd0ItemRevPasteOnTargetUponCreate ) {
        _itemPreferredOnPasteEnabled = soaResponse.extraInfoOut.Fnd0ItemRevPasteOnTargetUponCreate;
    }

    var tcSessionData = {};
    tcSessionData.tcMinorVersion = exports.getTCMinorVersion();
    tcSessionData.tcMajorVersion = exports.getTCMajorVersion();
    tcSessionData.tcQRMNumber = exports.getTCQRMNumber();
    tcSessionData.serverVersion = exports.toString();
    tcSessionData.protocol = exports.getProtocol();
    tcSessionData.server = browserUtils.getBaseURL() + WEB_XML_SOA_PROXY_CONTEXT;

    if( soaResponse.extraInfoOut.LogFile ) {
        tcSessionData.logFile = getFilename( soaResponse.extraInfoOut.LogFile );
    }

    var userAgentInfo = {};
    userAgentInfo.userApplication = sessionCtxSvc.getClientID();
    userAgentInfo.userAppVersion = sessionCtxSvc.getClientVersion();

    appCtxSvc.registerCtx( 'tcSessionData', tcSessionData );
    appCtxSvc.registerCtx( 'userAgentInfo', userAgentInfo );
};

/**
 * prop getter for the hasProjects boolean value
 *
 * @return {Boolean} value for whether or not there is any projects data.
 */
export let hasProjects = function() {
    return _hasProjects;
};

/**
 * prop getter for the displayCurrentCountry boolean value
 *
 * @return {Boolean} display country/geography
 */
export let displayCurrentCountry = function() {
    return _displayCurrentCountry;
};

export let getpostLoginStages = function() {
    return _postLoginStages;
};

export let setpostLoginStageList = function( postLoginStage ) {
    var splitArray = postLoginStage.split( ',' );
    var postLoginStageKey = 'postLoginStagesKey';
    var postLoginStages = localStrg.get( postLoginStageKey );

    if( !postLoginStages ) {
        postLoginStages = [];
        for( var i = 0; i < splitArray.length; i++ ) {
            var stage = {};
            stage.name = splitArray[ i ];
            stage.status = false;
            stage.priority = i;
            postLoginStages.push( stage );
        }
        localStrg.publish( postLoginStageKey, JSON.stringify( postLoginStages ) );
    }
};

/**
 * property getter for the Tc version string, Major number.
 *
 * defer to the nested version construct.
 *
 * @returns {int} Major version information
 */
export let getTCMajorVersion = function() {
    if( tcSvrVer && tcSvrVer.majorVersion ) {
        return tcSvrVer.majorVersion;
    }
    return 0;
};

/**
 * property getter for the Tc version string, Minor number.
 *
 * defer to the nested version construct.
 *
 * @returns {int} Minor version information
 */
export let getTCMinorVersion = function() {
    if( tcSvrVer && tcSvrVer.minorVersion ) {
        return tcSvrVer.minorVersion;
    }
    return 0;
};

/**
 * property getter for the Tc version string, QRM number.
 *
 * defer to the nested version construct.
 *
 * @returns {int} QRM bumber
 */
export let getTCQRMNumber = function() {
    if( tcSvrVer && tcSvrVer.qrmNumber ) {
        return tcSvrVer.qrmNumber;
    }
    return 0;
};

/**
 * some odd logic - uses the version info to determine signed in state??
 *
 * TODO - migrate this to something more specific or remove? SessionManagerService should be the authority.
 *
 * @return {Boolean} true if a server version exists, false otherwise.
 */
export let isSignedIn = function() {
    return Boolean( tcSvrVer );
};

/**
 * generate a version display string
 *
 * @return {String} formatted version string
 */
export let toString = function() {
    return 'Server Build: ' + awSvrVer.toString() + '\nServer Version: ' + tcSvrVer.toString() + '\nSite: ' + ( _siteId ? _siteId.toString() : '' );

};

/**
 * prop getter for the getProtocol string value
 *
 * @return {String} value for protocol.
 */
export let getProtocol = function() {
    var baseUrl = browserUtils.getBaseURL();
    if( baseUrl !== null && baseUrl !== '' ) {
        return baseUrl.substring( 0, baseUrl.indexOf( '://', 0 ) );
    }
    return null;
};

export default exports = {
    parseSessionInfo,
    hasProjects,
    displayCurrentCountry,
    getpostLoginStages,
    setpostLoginStageList,
    getTCMajorVersion,
    getTCMinorVersion,
    getTCQRMNumber,
    isSignedIn,
    toString,
    getProtocol
};
