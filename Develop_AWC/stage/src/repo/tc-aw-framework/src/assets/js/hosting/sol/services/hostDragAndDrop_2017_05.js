// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostDragAndDrop_2017_05
 * @namespace hostDragAndDrop_2017_05
 */
import hostInteropSvc from 'js/hosting/hostInteropService';
import hostFactorySvc from 'js/hosting/hostFactoryService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import localStrg from 'js/localStorage';
import hostServices from 'js/hosting/hostConst_Services';

/**
 * Convert the event object into JSON
 *
 * @param {Object} eventInfo - The event object
 *
 * @return {Object} JSON representation of the event object
 */
function _getJSONEventInfo( eventInfo ) {
    var dragJSON = localStrg.get( 'awDragData' );

    var dragInfo = '';

    if( dragJSON && _.startsWith( dragJSON, '{' ) ) {
        dragInfo = JSON.parse( dragJSON );
    }

    var str = {
        clientX: eventInfo.clientX,
        clientY: eventInfo.clientY,
        layerX: eventInfo.layerX,
        layerY: eventInfo.layerY,
        movementX: eventInfo.movementX,
        movementY: eventInfo.movementY,
        offsetX: eventInfo.offsetX,
        offsetY: eventInfo.offsetY,
        pageX: eventInfo.pageX,
        pageY: eventInfo.pageY,
        x: eventInfo.x,
        y: eventInfo.y,
        BOInfo: dragInfo
    };

    return JSON.stringify( str );
}

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// DragAndDropProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostDragAndDrop_2017_05
 * @extends hostFactoryService.BaseCallableService
 */
var DragAndDropProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_DRAG_AND_DROP_SVC,
        hostServices.VERSION_2017_05 );
};

DragAndDropProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Process outgoing 'event' type call to the host.
 *
 * @function fireHostEvent
 * @memberof hostDragAndDrop_2017_05.DragAndDropProxy
 *
 * @param {DragAndDropMsg} inputData - Data object who's properties define data {in whatever
 * form the implementation is expecting) to process into a call to the host-side service.
 */
DragAndDropProxy.prototype.fireHostEvent = function( inputData ) {
    var payload = JSON.stringify( inputData );

    this._invokeHostEvent( payload );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// DragAndDropMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends the open request info to the host via {@link DragAndDropProxy}.
 * <P>
 * The message has a list of targets to be opened. Representation is similar to the selection service
 * contract.
 *
 * @constructor
 * @memberof hostDragAndDrop_2017_05
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var DragAndDropMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2017_05 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

DragAndDropMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current value.
 *
 * @memberof hostDragAndDrop_2017_05.DragAndDropMsg
 *
 * @return {String} Property value.
 */
DragAndDropMsg.prototype.getEventType = function() {
    return _.get( this, 'EventType', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostDragAndDrop_2017_05.DragAndDropMsg
 *
 * @param {String} value - Property value.
 */
DragAndDropMsg.prototype.setEventType = function( value ) {
    this.EventType = value;
};

/**
 * Get current value.
 *
 * @memberof hostDragAndDrop_2017_05.DragAndDropMsg
 *
 * @return {String} Property value.
 */
DragAndDropMsg.prototype.getEventInfo = function() {
    return _.get( this, 'EventInfo', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostDragAndDrop_2017_05.DragAndDropMsg
 *
 * @param {String} value - Property value.
 */
DragAndDropMsg.prototype.setEventInfo = function( value ) {
    this.EventInfo = value;
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
 * @memberof hostDragAndDrop_2017_05
 *
 * @returns {DragAndDropProxy} New instance of the service message API object.
 */
export let createDragAndDropProxy = function() {
    return new DragAndDropProxy();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostDragAndDrop_2017_05
 *
 * @param {String} payload - (Optional) JSON encoded String to use when initializing the message object.
 *
 * @returns {DragAndDropMsg} New instance of the service message object.
 */
export let createDragAndDropMsg = function( payload ) {
    return new DragAndDropMsg( payload );
};

// ---------------------------------------------------------------------------------

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostDragAndDrop_2017_05
 */
export let registerHostingModule = function() {
    if( hostInteropSvc.isHostServiceAvailable(
        hostServices.HS_DRAG_AND_DROP_SVC,
        hostServices.VERSION_2017_05 ) ) {
        eventBus.subscribe( 'hosting.DragDropEvent', function( eventData ) {
            var msg = exports.createDragAndDropMsg();

            msg.setEventType( eventData.type );
            msg.setEventInfo( _getJSONEventInfo( eventData.event ) );

            exports.createDragAndDropProxy().fireHostEvent( msg );
        } );
    }
};

export default exports = {
    createDragAndDropProxy,
    createDragAndDropMsg,
    registerHostingModule
};
