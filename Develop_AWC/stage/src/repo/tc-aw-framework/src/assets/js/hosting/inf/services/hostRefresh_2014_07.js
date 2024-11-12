// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/inf/services/hostRefresh_2014_07
 * @namespace hostRefresh_2014_07
 */
import hostInteropSvc from 'js/hosting/hostInteropService';
import hostFactorySvc from 'js/hosting/hostFactoryService';
import hostObjectRefSvc from 'js/hosting/hostObjectRefService';
import cdm from 'soa/kernel/clientDataModel';
import dms from 'soa/dataManagementService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import hostServices from 'js/hosting/hostConst_Services';

/**
 * TRUE if additional status/processing messages should be logged.
 */
var _debug_logRefreshAcvitity = false;

/**
 * TRUE if updates should not request a reset of the Primary Work Area (PWA).
 * <P>
 * Note: Resetting the PWA is VERY EXPENSIVE (like an F5). The non-reset machinery of AW (i.e. cdm events)
 * should be sufficient to update the AW UI. If the host really knows it needs to reset, it can use the
 */
var _debug_neverReset = true;

/** */
var _BASIC_PROPS = [ 'object_string' ];

/**
 * Shared proxy to the host service.
 */
var _refreshProxy;

/**
 * Check if the given IModelObject is 'significant' enough for a full reset.
 *
 * @param {Boolean} isSignificant - TRUE if we already know there is at least one 'significant' object being
 * updated.
 * @param {IModelObject} modelObject - IModelobject to check
 *
 * @return {Boolean} TRUE if we now know there is at least one 'significant' object being updated.
 */
function _checkSignificanceForPWAReset( isSignificant, modelObject ) {
    if( !isSignificant ) {
        var targetType = modelObject.modelType;

        if( targetType ) {
            if( targetType !== 'Awb0AutoBookmark' ) {
                isSignificant = true;
            }
        }
    }

    return isSignificant;
}

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// RefreshMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Definition of the JSON data moved to/from the {@link RefreshSvc}.
 *
 * @constructor
 * @memberof hostRefresh_2014_07
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var RefreshMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

RefreshMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current property value.
 *
 * @memberof hostRefresh_2014_07.RefreshMsg
 *
 * @return {InteropObjectRefArray} ChildChangeObjects property value.
 */
RefreshMsg.prototype.getChildChangeObjects = function() {
    return _.get( this, 'ChildChangeObjects', null );
};

/**
 * Get current property value.
 *
 * @memberof hostRefresh_2014_07.RefreshMsg
 *
 * @return {InteropObjectRefArray} CreatedObjects property value.
 */
RefreshMsg.prototype.getCreatedObjects = function() {
    return _.get( this, 'CreatedObjects', null );
};

/**
 * Get current property value.
 *
 * @memberof hostRefresh_2014_07.RefreshMsg
 *
 * @return {InteropObjectWithProperties} DataObjects property value.
 */
RefreshMsg.prototype.getDataObjects = function() {
    return _.get( this, 'DataObjects', null );
};

/**
 * Get current property value.
 *
 * @memberof hostRefresh_2014_07.RefreshMsg
 *
 * @return {InteropObjectRefArray} DeletedObjects property value.
 */
RefreshMsg.prototype.getDeletedObjects = function() {
    return _.get( this, 'DeletedObjects', null );
};

/**
 * Get current property value.
 *
 * @memberof hostRefresh_2014_07.RefreshMsg
 *
 * @return {InteropObjectRefArray} PlainObjects property value.
 */
RefreshMsg.prototype.getPlainObjects = function() {
    return _.get( this, 'PlainObjects', null );
};

/**
 * Get current property value.
 *
 * @memberof hostRefresh_2014_07.RefreshMsg
 *
 * @return {InteropObjectRefArray} UpdatedObjects property value.
 */
RefreshMsg.prototype.getUpdatedObjects = function() {
    return _.get( this, 'UpdatedObjects', null );
};

/**
 * Get current property value.
 *
 * @memberof hostRefresh_2014_07.RefreshMsg
 *
 * @param {InteropObjectRefArray} list - ChildChangeObjects property value.
 */
RefreshMsg.prototype.setChildChangeObjects = function( list ) {
    this.ChildChangeObjects = list;
};

/**
 * Get current property value.
 *
 * @memberof hostRefresh_2014_07.RefreshMsg
 *
 * @param {InteropObjectRefArray} list - CreatedObjects property value.
 */
RefreshMsg.prototype.setCreatedObjects = function( list ) {
    this.CreatedObjects = list;
};

/**
 * Get current property value.
 *
 * @memberof hostRefresh_2014_07.RefreshMsg
 *
 * @param {InteropObjectWithProperties} list - DataObjects property value.
 */
RefreshMsg.prototype.setDataObjects = function( list ) {
    this.DataObjects = list;
};

/**
 * Get current property value.
 *
 * @memberof hostRefresh_2014_07.RefreshMsg
 *
 * @param {InteropObjectRefArray} list - DeletedObjects property value.
 */
RefreshMsg.prototype.setDeletedObjects = function( list ) {
    this.DeletedObjects = list;
};

/**
 * Get current property value.
 *
 * @memberof hostRefresh_2014_07.RefreshMsg
 *
 * @param {InteropObjectRefArray} list - PlainObjects property value.
 */
RefreshMsg.prototype.setPlainObjects = function( list ) {
    this.PlainObjects = list;
};

/**
 * Get current property value.
 *
 * @memberof hostRefresh_2014_07.RefreshMsg
 *
 * @param {InteropObjectRefArray} list - UpdatedObjects property value.
 */
RefreshMsg.prototype.setUpdatedObjects = function( list ) {
    this.UpdatedObjects = list;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// RefreshSvc
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Create new client-side service.
 *
 * @constructor
 * @memberof hostRefresh_2014_07
 * @extends hostFactoryService.BaseCallableService
 */
var RefreshSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_REFRESH_SVC,
        hostServices.VERSION_2014_07 );

    /**
     * Are we already refreshing? If so, do not refresh again
     */
    this._refreshing = false;

    /**
     * Set of UPDATED objects that were reported while we were processing an earlier batch
     */
    this._pendingUpdatedUIDs = {};

    /**
     * Set of CREATED objects that were reported while we were processing an earlier batch
     */
    this._pendingCreatedUIDs = {};
};

RefreshSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * Receives incoming service call from the host.
 * <P>
 * Note: This is the service invocation trigger from the host.
 *
 * @function handleIncomingEvent
 * @memberof hostRefresh_2014_07.RefreshSvc
 *
 * @param {String} payload - JSON string with input parameters from the host.
 */
RefreshSvc.prototype.handleIncomingEvent = function( payload ) {
    var self = this;

    // Attempt to deserialize the input data contract.
    var msg = exports.createRefreshMsg( payload );

    if( msg ) {
        // Check for any deleted IModelObjects still in the cache
        var deletedObjects = [];

        var objRefsToDelete = msg.getDeletedObjects();

        _.forEach( objRefsToDelete, function( objRef ) {
            if( objRef ) {
                // This should be removed from the client data model.
                deletedObjects.push( objRef.ObjId );
            }
        } );

        // Process deleted
        if( !_.isEmpty( deletedObjects ) ) {
            // Remove these from the client data model cache and broadcast the ModelObjectDeletedEvent
            cdm.removeObjects( deletedObjects );
        }

        /**
         * Handle cases where an earlier refresh request left some objects out. Check if we still need
         * them.
         * <P>
         * Note: This could be done as a 'recursion' on this method, but that will require a significant
         * re-write of this soon-to-be-dead code. At least allow a 'catch up' pass.
         */
        var updatedUIDsToAnnounce = {};
        var createdUIDsToAnnounce = {};

        var objUIDsToLoad = {};

        if( !_.isEmpty( self._pendingUpdatedUIDs ) ) {
            _.forEach( self._pendingUpdatedUIDs, function( pendingUID ) {
                if( cdm.containsObject( pendingUID ) ) {
                    objUIDsToLoad[ pendingUID ] = true;
                    updatedUIDsToAnnounce[ pendingUID ] = true;
                }
            } );

            self._pendingUpdatedUIDs = {};
        }

        if( !_.isEmpty( self._pendingCreatedUIDs ) ) {
            _.forEach( self._pendingCreatedUIDs, function( pendingUID ) {
                objUIDsToLoad[ pendingUID ] = true;
                createdUIDsToAnnounce[ pendingUID ] = true;
            } );

            self._pendingCreatedUIDs = {};
        }

        /**
         * Handle updated and created objects
         */
        var objRefsToUpdate = msg.getUpdatedObjects();

        _.forEach( objRefsToUpdate, function( objRef ) {
            if( objRef ) {
                if( cdm.containsObject( objRef.ObjId ) ) {
                    updatedUIDsToAnnounce[ objRef.ObjId ] = true;
                    objUIDsToLoad[ objRef.ObjId ] = true;
                }
            }
        } );

        var objRefsToCreate = msg.getCreatedObjects();

        _.forEach( objRefsToCreate, function( objRef ) {
            if( objRef ) {
                createdUIDsToAnnounce[ objRef.ObjId ] = true;
                objUIDsToLoad[ objRef.ObjId ] = true;
            }
        } );

        /**
         * Check if we have something to work on and we are NOT in the middle of another 'refresh'
         */
        if( self._refreshing ) {
            var pendingUpdatedUIDs = self._pendingUpdatedUIDs;

            _.forEach( updatedUIDsToAnnounce, function( value, uid ) {
                pendingUpdatedUIDs[ uid ] = true;
            } );

            var pendingCreatedUIDs = self._pendingCreatedUIDs;

            _.forEach( createdUIDsToAnnounce, function( value, uid ) {
                pendingCreatedUIDs[ uid ] = true;
            } );

            if( _debug_logRefreshAcvitity ) {
                logger.info( 'Add pending:' + '\n' +
                    'updatedUIDsToAnnounce: ' + updatedUIDsToAnnounce.length + '\n' +
                    'createdUIDsToAnnounce: ' + createdUIDsToAnnounce.length );
            }
        } else if( !_.isEmpty( objUIDsToLoad ) ) {
            try {
                self._refreshing = true; // Process updated

                var objsToLoadArray = Object.keys( objUIDsToLoad );

                dms.loadObjects( objsToLoadArray ).then( function() {
                    var objsToRefresh = [];

                    var updatedObjsToAnnounce = [];
                    var createdObjsToAnnounce = [];

                    var isSignificant = false;

                    _.forEach( updatedUIDsToAnnounce, function( dummy, targetUid ) {
                        // We will only update objects that are in the client cache.
                        var modelObject = cdm.getObject( targetUid );

                        if( modelObject ) {
                            isSignificant = _checkSignificanceForPWAReset( isSignificant, modelObject );

                            objsToRefresh.push( modelObject );
                            updatedObjsToAnnounce.push( modelObject );
                        }
                    } );

                    _.forEach( createdUIDsToAnnounce, function( dummy, targetUid ) {
                        // We will only update objects that are in the client cache.
                        var modelObject = cdm.getObject( targetUid );

                        if( modelObject ) {
                            isSignificant = _checkSignificanceForPWAReset( isSignificant, modelObject );

                            objsToRefresh.push( modelObject );
                            createdObjsToAnnounce.push( modelObject );
                        }
                    } );

                    if( _debug_logRefreshAcvitity ) {
                        logger.info( 'Loading properties: ' + '\n' +
                            'isSignificant: ' + isSignificant + '\n' +
                            'objsToRefresh: ' + objsToRefresh.size() + '\n' +
                            'updatedUIDsToAnnounce: ' + updatedUIDsToAnnounce.length + '\n' +
                            'createdUIDsToAnnounce: ' + createdUIDsToAnnounce.length );
                    }

                    if( isSignificant && _debug_neverReset ) {
                        isSignificant = false;
                    }

                    var doPwaReset = isSignificant;

                    dms.getPropertiesUnchecked( objsToRefresh, _BASIC_PROPS ).then(
                        function() {
                            if( !_.isEmpty( updatedObjsToAnnounce ) || !_.isEmpty( createdObjsToAnnounce ) ) {
                                /**
                                 * Note: While the 'host' told us that there were certain objects
                                 * 'created' we only want to report them as 'modified'. All objects
                                 * reported as 'created' via the 'cdm.relatedModified' event will be
                                 * automatically added to the top of the current objectNavigation list
                                 * (if that containing folder is also included in the set of modified
                                 * objects, which is common).
                                 * <P>
                                 * We just want to let the 'client' know that any 'created' objects
                                 * warrent being looked at. So, we announce them as 'modified'.
                                 */
                                var combinedObjsToAnnounce = _.concat( updatedObjsToAnnounce, createdObjsToAnnounce );

                                var uniqueObjsToAnnounce = _.uniqWith( combinedObjsToAnnounce, function( objA, objB ) {
                                    return objA.uid === objB.uid;
                                } );

                                /**
                                 * This will refresh secondary panels which are in the context of the
                                 * updated object.
                                 */
                                eventBus.publish( 'cdm.relatedModified', {
                                    refreshLocationFlag: doPwaReset,
                                    relations: '',
                                    relatedModified: uniqueObjsToAnnounce,
                                    createdObjects: []
                                } );
                            }

                            self._refreshing = false;
                        },
                        function( ex ) { // getProperties failure
                            logger.error( ex );

                            self._refreshing = false;
                        } );
                }, function( ex ) { // loadObjects failure
                    logger.error( ex );

                    self._refreshing = false;
                } );
            } catch ( err ) {
                logger.error( err );

                self._refreshing = false;
            }
        }
    }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// RefreshProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke a service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostRefresh_2014_07
 * @extends hostFactoryService.BaseCallableService
 */
var RefreshProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_REFRESH_SVC,
        hostServices.VERSION_2014_07 );
};

RefreshProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Send the given various objects to the host.
 *
 * @function fireHostEvent
 * @memberof hostRefresh_2014_07.RefreshProxy
 *
 * @param {RefreshMsg} inputData - Object defining input properties used in forming the call to the
 * host-side service.
 * <pre>
 *  {InteropObjectRefArray} createdObjects - list of objects that were created
 *  {InteropObjectRefArray} deletedObjects - list of objects that were deleted
 *  {InteropObjectRefArray} updatedObjects - list of objects that were updated
 *  {InteropObjectRefArray} plainObjects - list of plain objects
 *  {InteropObjectRefArray} childChangeObjects - list of child change objects
 *  {InteropObjectWithPropertiesArray} dataObjects - list of data objects
 * </pre>
 */
RefreshProxy.prototype.fireHostEvent = function( inputData ) {
    if( !hostInteropSvc.isStartupComplete() ) {
        return;
    }

    var msg = exports.createRefreshMsg();

    if( !_.isEmpty( inputData.createdObjects ) ) {
        msg.setCreatedObjects( inputData.createdObjects );
    }
    if( !_.isEmpty( inputData.deletedObjects ) ) {
        msg.setDeletedObjects( inputData.deletedObjects );
    }
    if( !_.isEmpty( inputData.updatedObjects ) ) {
        msg.setUpdatedObjects( inputData.updatedObjects );
    }
    if( !_.isEmpty( inputData.plainObjects ) ) {
        msg.setPlainObjects( inputData.plainObjects );
    }
    if( !_.isEmpty( inputData.childChangeObjects ) ) {
        msg.setChildChangeObjects( inputData.childChangeObjects );
    }
    if( !_.isEmpty( inputData.dataObjects ) ) {
        msg.setDataObjects( inputData.dataObjects );
    }

    var payload = JSON.stringify( msg );

    this._invokeHostEvent( payload );
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
 * @memberof hostRefresh_2014_07
 *
 * @returns {RefreshSvc} New instance of the service API.
 */
export let createRefreshService = function() {
    return new RefreshSvc();
};

/**
 * Create new host-side service proxy.
 *
 * @memberof hostRefresh_2014_07
 *
 * @returns {RefreshSvc} New instance of the service API.
 */
export let createRefreshProxy = function() {
    return new RefreshProxy();
};

/**
 * Create new client-side service.
 *
 * @memberof hostRefresh_2014_07
 *
 * @param {String} payload - String from the 'host' to use when initializing the message object.
 *
 * @returns {RefreshMsg} New instance of the service message API.
 */
export let createRefreshMsg = function( payload ) {
    return new RefreshMsg( payload );
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostRefresh_2014_07
 */
export let registerHostingModule = function() {
    exports.createRefreshService().register();

    /**
     * Setup to listen to model changes event, but only if the host wants to hear about them.
     */
    if( hostInteropSvc.isHostServiceAvailable(
        hostServices.HS_REFRESH_SVC,
        hostServices.VERSION_2014_07 ) ) {
        _refreshProxy = exports.createRefreshProxy();

        /** */
        eventBus.subscribe( 'cdm.created', function( eventData ) {
            if( !_.isEmpty( eventData.createdObjects ) ) {
                var objRefs = [];

                _.forEach( eventData.createdObjects, function( modelObject ) {
                    objRefs.push( hostObjectRefSvc.createBasicRefByModelObject( modelObject ) );
                } );

                var inputData = {
                    createdObjects: objRefs
                };

                _refreshProxy.fireHostEvent( inputData );
            }
        }, 'hostRefresh_2014_07' );

        eventBus.subscribe( 'cdm.updated', function( eventData ) {
            if( !_.isEmpty( eventData.updatedObjects ) ) {
                var objRefs = [];

                _.forEach( eventData.updatedObjects, function( modelObject ) {
                    objRefs.push( hostObjectRefSvc.createBasicRefByModelObject( modelObject ) );
                } );

                var inputData = {
                    updatedObjects: objRefs
                };

                _refreshProxy.fireHostEvent( inputData );
            }
        }, 'hostRefresh_2014_07' );

        eventBus.subscribe( 'cdm.deleted', function( eventData ) {
            if( !_.isEmpty( eventData.deletedObjectUids ) ) {
                var objRefs = [];

                _.forEach( eventData.deletedObjectUids, function( modelObject ) {
                    objRefs.push( hostObjectRefSvc.createBasicRefByModelObject( modelObject ) );
                } );

                var inputData = {
                    deletedObjects: objRefs
                };

                _refreshProxy.fireHostEvent( inputData );
            }
        }, 'hostRefresh_2014_07' );
    }
};

export default exports = {
    createRefreshService,
    createRefreshProxy,
    createRefreshMsg,
    registerHostingModule
};
