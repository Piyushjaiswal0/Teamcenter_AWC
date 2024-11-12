// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostRemoteClipboard_2014_02
 * @namespace hostRemoteClipboard_2014_02
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import hostObjectRefSvc from 'js/hosting/hostObjectRefService';
import ClipboardService from 'js/clipboardService';
import dms from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import hostServices from 'js/hosting/hostConst_Services';

/**
 * {IModelObjectArray}
 */
var _remoteClipboardContents = [];

/**
 * Create selection change message to pass to the host-side service.
 *
 * @param {IModelObjectArray} currentLocalContents -
 *
 * @returns {RemoteClipboardMessage} New message set with additions/removals.
 */
function _onContentChange( currentLocalContents ) {
    // Generate the two deltas
    var addList = [];
    var removeList = [];

    // Get the items added
    // Make a copy of the current contents
    var oldRemoteClipboardContents = _.clone( _remoteClipboardContents );

    var uidCriteria = { uid: '' };

    _.forEach( currentLocalContents, function( modelObj ) {
        uidCriteria.uid = modelObj.uid;

        var foundNdx = _.findIndex( _remoteClipboardContents, uidCriteria );

        if( foundNdx === -1 ) {
            _remoteClipboardContents.push( modelObj );

            var addObj = hostObjectRefSvc.createBasicRefByModelObject( modelObj );

            addList.push( addObj );
        }
    } );

    _.forEach( oldRemoteClipboardContents, function( modelObj ) {
        uidCriteria.uid = modelObj.uid;

        var foundNdx = _.findIndex( currentLocalContents, uidCriteria );

        if( foundNdx === -1 ) {
            _.remove( _remoteClipboardContents, uidCriteria );

            var removeObject = hostObjectRefSvc.createBasicRefByModelObject( modelObj );

            removeList.push( removeObject );
        }
    } );

    _remoteClipboardContents = currentLocalContents;

    var updateMsg = exports.createRemoteClipboardMessage();

    updateMsg.setAdditions( addList );
    updateMsg.setRemovals( removeList );

    return updateMsg;
}

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// RemoteClipboardSvc
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 *  Hosting service to display given page for identified object.
 *
 *  @constructor
 *  @memberof hostRemoteClipboard_2014_02
 *  @extends hostFactoryService.BaseCallableService
 */
var RemoteClipboardSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_REMOTE_CLIPBOARD_SERVICE,
        hostServices.VERSION_2014_02 );
};

RemoteClipboardSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * This is an incoming call to this service trigger the related event handlers.
 *
 * @function handleIncomingEvent
 * @memberof hostRemoteClipboard_2014_02.RemoteClipboardSvc
 *
 * @param {String} jsondata - JSON encoded payload from the host.
 */
RemoteClipboardSvc.prototype.handleIncomingEvent = function( jsondata ) {
    try {
        // attempt to deserialize the inputData contract.
        var msg = exports.createRemoteClipboardMessage( jsondata );

        if( !_.isEmpty( msg ) ) {
            var addedObjRefs = msg.getAdditions();
            var removedObjRefs = msg.getRemovals();

            /**
             * Check for special case of no add/remove which indicates 'clear' clipboard.
             */
            if( _.isEmpty( addedObjRefs ) && _.isEmpty( removedObjRefs ) ) {
                ClipboardService.instance.copyHyperlinkToClipboard( [] );
            } else {
                /**
                 * Determine
                 */
                var nextContents = _.clone( ClipboardService.instance.getContents() );

                var missingObjUids = [];

                var uidCriteria = { uid: '' };

                _.forEach( msg.Additions, function( objRef ) {
                    uidCriteria.uid = objRef.ObjId;

                    var foundNdx = _.findIndex( nextContents, uidCriteria );

                    if( foundNdx === -1 ) {
                        var modelObj = cdm.getObject( objRef.ObjId );

                        if( modelObj ) {
                            nextContents.push( modelObj );
                        } else {
                            missingObjUids.push( objRef.ObjId );
                        }
                    }
                } );

                _.forEach( msg.Removals, function( objRef ) {
                    uidCriteria.uid = objRef.ObjId;

                    _.remove( nextContents, uidCriteria );
                } );

                /**
                 * Check if we found any NOT in the CDM.
                 * <P>
                 * If so: Try to locate them now and include them when we know if they are valid (or not).
                 */
                if( !_.isEmpty( missingObjUids ) ) {
                    dms.loadObjects( missingObjUids ).then( function() {
                        _.forEach( missingObjUids, function( uid ) {
                            var modelObj = cdm.getObject( uid );
                            if( modelObj ) {
                                nextContents.push( modelObj );
                            }
                        } );

                        ClipboardService.instance.copyHyperlinkToClipboard( nextContents );
                    } );
                } else {
                    ClipboardService.instance.copyHyperlinkToClipboard( nextContents );
                }
            }
        }
    } catch ( ex ) {
        logger.error( ex );
    }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// RemoteClipboardProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostRemoteClipboard_2014_02
 * @extends hostFactoryService.BaseCallableService
 */
var RemoteClipboardProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_REMOTE_CLIPBOARD_SERVICE,
        hostServices.VERSION_2014_02 );
};

RemoteClipboardProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Process outgoing 'event' type call to the host.
 *
 * @function fireHostEvent
 * @memberof hostRemoteClipboard_2014_02.HostOpenProxy
 *
 * @param {RemoteClipboardMessage} inputData - Data object who's properties define data {in whatever form
 * the implementation is expecting) to process into a call to the host-side service.
 */
RemoteClipboardProxy.prototype.fireHostEvent = function( inputData ) {
    var payload = JSON.stringify( inputData );

    this._invokeHostEvent( payload );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// RemoteClipboardMessage
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends the open request info to the host via {@link HostOpenProxy}.
 * <P>
 * The message has a list of targets to be opened. Representation is similar to the selection service
 * contract.
 *
 * @constructor
 * @memberof hostRemoteClipboard_2014_02
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var RemoteClipboardMessage = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2014_10 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

RemoteClipboardMessage.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current value.
 *
 * @memberof hostRemoteClipboard_2014_02.RemoteClipboardMessage
 *
 * @return {InteropObjectRefArray} Property value.
 */
RemoteClipboardMessage.prototype.getAdditions = function() {
    return _.get( this, 'Additions', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostRemoteClipboard_2014_02.RemoteClipboardMessage
 *
 * @param {InteropObjectRefArray} value - Property value.
 */
RemoteClipboardMessage.prototype.setAdditions = function( value ) {
    this.Additions = value;
};

/**
 * Get current value.
 *
 * @memberof hostRemoteClipboard_2014_02.RemoteClipboardMessage
 *
 * @return {InteropObjectRefArray} Property value.
 */
RemoteClipboardMessage.prototype.getRemovals = function() {
    return _.get( this, 'Removals', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostRemoteClipboard_2014_02.RemoteClipboardMessage
 *
 * @param {InteropObjectRefArray} value - Property value.
 */
RemoteClipboardMessage.prototype.setRemovals = function( value ) {
    this.Removals = value;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Return a new instance of this class.
 *
 * @memberof hostRemoteClipboard_2014_02
 *
 * @returns {RemoteClipboardSvc} New instance of the service message API object.
 */
export let createRemoteClipboardSvc = function() {
    return new RemoteClipboardSvc();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostRemoteClipboard_2014_02
 *
 * @returns {RemoteClipboardProxy} New instance of the service message API object.
 */
export let createRemoteClipboardProxy = function() {
    return new RemoteClipboardProxy();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostRemoteClipboard_2014_02
 *
 * @param {String} payload - (Optional) String from the 'host' to use when initializing the message object.
 *
 * @returns {RemoteClipboardMessage} New instance of the service message object.
 */
export let createRemoteClipboardMessage = function( payload ) {
    return new RemoteClipboardMessage( payload );
};

// ---------------------------------------------------------------------------------

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostRemoteClipboard_2014_02
 */
export let registerHostingModule = function() {
    exports.createRemoteClipboardSvc().register();

    eventBus.subscribe( 'appCtx.register', function( eventData ) {
        if( eventData.name === 'awClipBoardProvider' ) {
            var updateMsg = _onContentChange( eventData.value );

            exports.createRemoteClipboardProxy().fireHostEvent( updateMsg );
        }
    }, 'hostRemoteClipboard_2014_02' );
};

export default exports = {
    createRemoteClipboardSvc,
    createRemoteClipboardProxy,
    createRemoteClipboardMessage,
    registerHostingModule
};
