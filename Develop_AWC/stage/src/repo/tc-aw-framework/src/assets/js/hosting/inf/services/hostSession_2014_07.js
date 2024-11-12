// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/inf/services/hostSession_2014_07
 * @namespace hostSession_2014_07
 */
import hostInteropSvc from 'js/hosting/hostInteropService';
import hostFactorySvc from 'js/hosting/hostFactoryService';
import hostBaseRefSvc from 'js/hosting/hostBaseRefService';
import lovSvc from 'js/lovService';
import messagingSvc from 'js/messagingService';
import commandSvc from 'js/command.service';
import sessionService from 'soa/sessionService';
import cdm from 'soa/kernel/clientDataModel';
import dms from 'soa/dataManagementService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import hostServices from 'js/hosting/hostConst_Services';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';

/**
 * {Boolean} Are we already updating? If so, do not start it again.
 */
var _revRuleUpdateInProgress;

/**
 * {Boolean} Are we already updating? If so, do not start it again.
 */
var _sessionUpdateInProgress;

/**
 * {String} UID of the last RevisionRule object sent to the host or recieved by the client. This is used to
 * prevent an 'echo' of the same data bing sent.
 */
var _lastRevRuleUid;

/**
 * Get the specified object from the session objects.
 *
 * @param {InteropObjectRefArray} sessionObjects - session objects
 * @param {String} objType - Object type to return
 *
 * @returns {InteropObjectRef} Specified object
 */
function _getSessionObject( sessionObjects, objType ) {
    for( var i = 0; i < sessionObjects.length; ++i ) {
        var target = sessionObjects[ i ];

        if( target.ObjType === objType ) {
            return target;
        }
    }

    return null;
}

/**
 * Calls SOA to set session states
 *
 * @param {ObjectArray} states - ...
 *
 * @returns {Promise} Resolved with the results
 */
function _doSetUserSessionStates( states ) {
    return sessionService.setUserSessionStateWithoutDefaults( states );
}

/**
 * Calls SOA to get revision rules
 *
 * @param {String} revisionRuleUid - UID of the revitions rule to set.
 *
 * @returns {Promise} Resolved with the results
 */
function _doSetRevisionRule( revisionRuleUid ) { // eslint-disable-line no-unused-vars
    //Core-2013-05-LOV/validateLOVValueSelections
    return lovSvc.getInitialLOVValues();
}

/**
 * Calls provider to set RevisionRule
 *
 * @param {InteropObjectRef} revisionRule - new revision rule
 */
function _setRevisionRule( revisionRule ) {
    if( revisionRule.ObjId !== _lastRevRuleUid ) {
        var uids = [ revisionRule.ObjId ];

        dms.loadObjects( uids ).then( function() {
            dms.getProperties( uids, [ 'object_string' ] ).then( function() {
                var revRuleObj2 = cdm.getObject( revisionRule.ObjId );

                if( revRuleObj2 ) {
                    _lastRevRuleUid = revisionRule.ObjId;

                    var revRuleUid = revRuleObj2.uid || '';

                    var userSession = cdm.getUserSession();

                    var userSessionUid = '';

                    if( userSession ) {
                        userSessionUid = userSession.uid || '';
                    }

                    var hostingScope = hostInteropSvc.getHostingScope();

                    hostingScope.hosting = {
                        revRuleUid: revRuleUid,
                        userSessionUid: userSessionUid,
                        revRuleName: _.get( revRuleObj2, 'props.object_string.dbValues[ 0 ]', '' )
                    };

                    //Call validateLOVValueSelections to sync up the revision rule selection
                    var inputData = {
                        "lovInput": {
                            "boName": "UserSession",
                            "operationName": "Edit",
                            "owningObject": {
                                "type": "UserSession",
                                "uid": userSessionUid
                            },
                            "propertyValues": {
                                "awp0RevRule": [
                                    revRuleUid
                                ]
                            }
                        },
                        "propName": "awp0RevRule",
                        "uidOfSelectedRows": []
                    };
                      
                    var validateLOVResponse = soaSvc.post("Core-2013-05-LOV", "validateLOVValueSelections", inputData);
                    validateLOVResponse.then(
                        ( response ) => {
                            location.reload(false);
                        }
                    )
                        .catch(
                            ( exception ) => {
                                logger.error( 'Failed to validate revision rule selection.' );
                                logger.error( exception );
                                messagingSvc.showError( exception.message );
                            }
                        );
                }
            } );
        } );
    }
}

/**
 * Calls provider to set User session states
 *
 * @param {ObjectArray} states - StateNameValue objects
 */
function _setUserSessionStates( states ) {
    _sessionUpdateInProgress = true;

    _doSetUserSessionStates( states ).then( function() {
        // Nothing to do. If this call succeeded, a reload should have happened.
        _sessionUpdateInProgress = false;
    }, function( err ) {
        messagingSvc.showError( err );

        _sessionUpdateInProgress = false;
    } );
}

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// SessionMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Definition of the JSON data moved to/from the {@link SessionSvc}.
 *
 * @constructor
 * @memberof hostSession_2014_07
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var SessionMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2014_07 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

SessionMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current property value.
 *
 * @memberof hostSession_2014_07.SessionMsg
 *
 * @return {StringToArrapMap} Preferences property value.
 */
SessionMsg.prototype.getPreferences = function() {
    return _.get( this, 'Preferences', null );
};

/**
 * Get current property value.
 *
 * @memberof hostSession_2014_07.SessionMsg
 *
 * @return {InteropObjectRefArray} SessionObjects property value.
 */
SessionMsg.prototype.getSessionObjects = function() {
    return _.get( this, 'SessionObjects', null );
};

/**
 * Set current property value.
 *
 * @memberof hostSession_2014_07.SessionMsg
 *
 * @param {StringToArrapMap} list - Preferences property value.
 */
SessionMsg.prototype.setPreferences = function( list ) {
    this.Preferences = list;
};

/**
 * Set current property value.
 *
 * @memberof hostSession_2014_07.SessionMsg
 *
 * @param {InteropObjectRefArray} list - SessionObjects property value.
 */
SessionMsg.prototype.setSessionObjects = function( list ) {
    this.SessionObjects = list;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// SessionSvc
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Create new client-side service.
 *
 * @constructor
 * @memberof hostSession_2014_07
 * @extends hostFactoryService.BaseCallableService
 */
var SessionSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_SESSION_SVC,
        hostServices.VERSION_2014_07 );

    //
};

SessionSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * Receives incoming service call from the host.
 * <P>
 * Note: This is the service invocation trigger from the host.
 *
 * @function handleIncomingEvent
 * @memberof hostSession_2014_07.SessionSvc
 *
 * @param {String} payload - JSON string with input parameters from the host.
 */
SessionSvc.prototype.handleIncomingEvent = function( payload ) {
    // var self = this;

    try {
        // Attempt to deserialize the input data contract.
        var msg = exports.createSessionMsg( payload );

        if( msg && !_revRuleUpdateInProgress && !_sessionUpdateInProgress ) {
            var sessionObjects = msg.getSessionObjects();

            if( !_revRuleUpdateInProgress ) {
                // Check for rev rule change
                var revRuleObj = _getSessionObject( sessionObjects, 'RevisionRule' );

                if( revRuleObj && revRuleObj.ObjId ) {
                    _setRevisionRule( revRuleObj );
                }
            }

            if( !_sessionUpdateInProgress ) {
                var userSession = cdm.getUserSession();

                if( userSession ) {
                    var states = [];

                    // Check for group/role change
                    var groupMemberObj = _getSessionObject( sessionObjects, 'GroupMember' );

                    if( groupMemberObj && groupMemberObj.ObjId ) {
                        var currentGroupMember = userSession.props.fnd0groupmember;

                        if( currentGroupMember &&
                            currentGroupMember.dbValues[ 0 ] !== groupMemberObj.ObjId ) {
                            states.push( {
                                name: 'groupMember',
                                value: groupMemberObj.ObjId
                            } );
                        }
                    }

                    // Check for project change
                    var projectObj = _getSessionObject( sessionObjects, 'TC_Project' );

                    if( projectObj ) {
                        var currentProject = userSession.props.project;

                        if( currentProject &&
                            currentProject.dbValues[ 0 ] !== projectObj.ObjId ) {
                            states.push( {
                                name: 'currentProject',
                                value: projectObj.ObjId
                            } );
                        }
                    }

                    if( !_.isEmpty( states ) ) {
                        _setUserSessionStates( states );
                    }
                }
            }
        }
    } catch ( ex ) {
        logger.error( ex );
    }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// SessionProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke a service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostSession_2014_07
 * @extends hostFactoryService.BaseCallableService
 */
var SessionProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_SESSION_SVC,
        hostServices.VERSION_2014_07 );
};

SessionProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Update session info on the host.
 *
 * @function fireHostEvent
 * @memberof hostSession_2014_07.SessionProxy
 *
 * @param {Object} inputData - Object defining input properties used in forming the call to the host-side
 * service.
 * <pre>
 *  {InteropObjectRefArray} sessionObjects - list of session objects
 *  {StringToArrapMap} preferences - list of preferences
 * </pre>
 */
SessionProxy.prototype.fireHostEvent = function( inputData ) {
    if( hostInteropSvc.isHostServiceAvailable(
        hostServices.HS_SESSION_SVC,
        hostServices.VERSION_2014_07 ) ) {
        var msg = exports.createSessionMsg();

        if( inputData.sessionObjects ) {
            msg.setSessionObjects( inputData.sessionObjects );
        }

        if( inputData.preferences ) {
            msg.setPreferences( inputData.preferences );
        }

        var payload = JSON.stringify( msg );

        this._invokeHostEvent( payload );
    }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostSessionInfoProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Define an initial hook to determine if the host process has an active SOA Session or not.
 * HostSessionProcessor.
 *
 * @constructor
 * @memberof hostSession_2014_07
 * @extends hostFactoryService.BaseCallableService
 */
var HostSessionInfoProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_HOST_SESSION_INFO_SVC,
        hostServices.VERSION_2014_02 );
};

HostSessionInfoProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Call host to get current user session information (username, isActive, etc.).
 *
 * @function callHostMethod
 * @memberof hostSession_2014_07.HostSessionInfoProxy
 *
 * @param {Object} inputData - (Not Used)
 *
 * @return {HostSessionInfoMsg} Object returned by the 'host' (or NULL).
 */
HostSessionInfoProxy.prototype.callHostMethod = function( inputData ) { // eslint-disable-line no-unused-vars
    var reply = this._invokeHostMethod();

    if( reply ) {
        return JSON.parse( reply );
    }

    return null;
};

/**
 * Call host to get current user session information (username, isActive, etc.).
 *
 * @function callHostMethodAsync
 * @memberof hostSession_2014_07.HostSessionInfoProxy
 *
 * @param {Object} inputData - (Not Used)
 *
 * @returns {Promise} Resolved with the {HostSessionInfoMsg} result from the 'host' (or NULL).
 */
HostSessionInfoProxy.prototype.callHostMethodAsync = function( inputData ) { // eslint-disable-line no-unused-vars
    return this._invokeHostMethodAsync( inputData ).then( function( reply ) {
        if( reply ) {
            return JSON.parse( reply );
        }

        return null;
    } );
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
 * @memberof hostSession_2014_07
 *
 * @returns {SessionSvc} New instance of the service API object.
 */
export let createSessionSvc = function() {
    return new SessionSvc();
};

/**
 * Create new client-side message.
 *
 * @memberof hostSession_2014_07
 *
 * @param {String} jsonString - (Optional) JSON encoded data to set as the properties of the new instance.
 *
 * @returns {SessionMsg} New instance of the service message object.
 */
export let createSessionMsg = function( jsonString ) {
    return new SessionMsg( jsonString );
};

/**
 * Create new client-side proxy.
 *
 * @memberof hostSession_2014_07
 *
 * @returns {SessionProxy} New instance of the proxy API object.
 */
export let createSessionProxy = function() {
    return new SessionProxy();
};

/**
 * Create new client-side proxy.
 *
 * @memberof hostSession_2014_07
 *
 * @returns {HostSessionInfoProxy} New instance of the proxy API object.
 */
export let createHostSessionInfoProxy = function() {
    return new HostSessionInfoProxy();
};

/**
 * Define an initial hook to determine if the host process has an active SOA Session or not.
 *
 * @memberof hostSession_2014_07
 *
 * @return {Promise} Resolved with the {String} UserName currently logged into the 'host' (or NULL if no authenticated user)
 */
export let getHostSessionUserInfo = function() {
    if ( hostInteropSvc ) {
        var sessionInfo = hostInteropSvc.getSessionInfo();
        if ( sessionInfo ) { return AwPromiseService.instance.resolve( sessionInfo.UserName ); }
    }
    return exports.createHostSessionInfoProxy().callHostMethodAsync().then( function( reply ) {
        if( reply && reply.IsSessionActive ) {
            return reply.UserName;
        }

        return null;
    } );
};

/**
 * Determine if we can use the 'host' SOA session.
 * <P>
 * Note: The 'host' must be active and support the set of needed SOA & session interop services.
 *
 * @memberof hostSession_2014_07
 *
 * @return {Boolean} true if there is an available Host side SOA connection.
 */
export let isHostSessionAccessible = function() {
    //  1) can we talk to the host
    //  2) is the SOA request service available?  (May not want to check that here?
    if( hostInteropSvc.getCanTalkWithHost() ) {
        if ( hostInteropSvc.getSessionInfo() ) {
            return true;
        }
        if( hostInteropSvc.isHostAuthorizationEnabled() ) {
            return true;
        }
    }

    return false;
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostSession_2014_07
 */
export let registerHostingModule = function() {
    exports.createSessionSvc().register();

    if( hostInteropSvc.isHostServiceAvailable(
        hostServices.HS_SESSION_SVC,
        hostServices.VERSION_2014_07 ) ) {
        eventBus.subscribe( 'aw.revisionRuleChangeEvent', function( eventData ) {
            /**
             * Make sure we are not listening to our own generated event.
             */
            if( !eventData.isSourceHosting ) {
                var inputData = {
                    sessionObjects: [ hostBaseRefSvc.createBasicObjectRef( '', eventData.revisionRuleUID, 'RevisionRule' ) ]
                };

                exports.createSessionProxy().fireHostEvent( inputData );
            }
        } );
    }
};

/**
 * Set revision
 *
 * @memberof hostSession_2014_07
 *
 * @param {String} revRuleUid - ...
 */
export let setRevisionRule = function( revRuleUid ) {
    logger.info( 'We are here: ' + revRuleUid );
};

export default exports = {
    createSessionSvc,
    createSessionMsg,
    createSessionProxy,
    createHostSessionInfoProxy,
    getHostSessionUserInfo,
    isHostSessionAccessible,
    registerHostingModule,
    setRevisionRule
};
