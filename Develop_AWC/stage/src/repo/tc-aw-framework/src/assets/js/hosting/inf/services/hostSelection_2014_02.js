// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/inf/services/hostSelection_2014_02
 * @namespace hostSelection_2014_02
 */
import hostInteropSvc from 'js/hosting/hostInteropService';
import hostFactorySvc from 'js/hosting/hostFactoryService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// SelectionMessage
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Class used to communicate with the 'host'.
 *
 * @constructor
 * @memberof hostSelection_2014_02
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) JSON encoded data to set as the properties of the new instance.
 */
var SelectionMessage = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

SelectionMessage.prototype = hostFactorySvc.extendDataContract();

/**
 * Get selection.
 *
 * @memberof hostSelection_2014_02.SelectionMessage
 *
 * @returns {InteropObjectRefArray} Current selection.
 */
SelectionMessage.prototype.getSelection = function() {
    return _.get( this, 'Selection', null );
};

/**
 * Set selection.
 *
 * @memberof hostSelection_2014_02.SelectionMessage
 *
 * @param {InteropObjectRefArray} selections - Arrayf of UIDs to select.
 */
SelectionMessage.prototype.setSelection = function( selections ) {
    this.Selection = selections;
};

/**
 * Get if in single select mode.
 *
 * @memberof hostSelection_2014_02.SelectionMessage
 *
 * @returns {Boolean} TRUE if in single select mode.
 */
SelectionMessage.prototype.getSingleSelect = function() {
    return _.get( this, 'SingleSelect', null );
};

/**
 * Set single select mode.
 *
 * @memberof hostSelection_2014_02.SelectionMessage
 *
 * @param  {Boolean} enabled - TRUE if in single select mode.
 */
SelectionMessage.prototype.setSingleSelect = function( enabled ) {
    this.SingleSelect = enabled;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// SelectionListenerSvc (_2014_02)
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This is the web side service for receiving selection notifications from the host side. This needs to wire
 * up to some event trigger mechanism that observers can register against.
 *
 * @constructor
 * @memberof hostSelection_2014_02
 * @extends hostFactoryService.BaseCallableService
 */
var SelectionListenerSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_SELECTION_LISTENER_SVC,
        hostServices.VERSION_2014_02 );
};

SelectionListenerSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * This is an incoming call to this service trigger the related event handlers.
 *
 * @memberof hostSelection_2014_02.SelectionListenerSvc
 * @function handleIncomingMethod
 *
 * @param {String} jsondata - JSON encoded payload from the host.
 */
SelectionListenerSvc.prototype.handleIncomingEvent = function( jsondata ) {
    this.handleIncomingMethod( jsondata );
};

/**
 * This is an incoming call to this service trigger the related event handlers.
 *
 * @memberof hostSelection_2014_02.SelectionListenerSvc
 * @function handleIncomingMethod
 *
 * @param {String} jsondata - JSON encoded payload from the host.
 *
 * @return {String} Empty string
 */
SelectionListenerSvc.prototype.handleIncomingMethod = function( jsondata ) {
    try {
        // attempt to deserialize the input data contract.
        var msg = JSON.parse( jsondata );

        if( msg ) {
            var selectedUIDs = [];

            for( var i = 0; i < msg.Selection.length; ++i ) {
                var target = msg.Selection[ i ];

                if( target ) {
                    selectedUIDs.push( target.ObjId );
                }
            }

            eventBus.publish( 'hosting.changeSelection', {
                operation: 'replace',
                selected: selectedUIDs
            } );
        }
    } catch ( ex ) {
        logger.error( ex );
    }

    return '';
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// SelectionProviderProxy (_2014_02)
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This is a proxy component for sending selection notifications to the hosting side service.
 *
 * @constructor
 * @memberof hostSelection_2014_02
 * @extends hostFactoryService.BaseCallableService
 */
var SelectionProviderProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_SELECTION_PROVIDER_SVC,
        hostServices.VERSION_2014_02 );
};

SelectionProviderProxy.prototype = hostFactorySvc.extendProxy();

/**
 * invoke the service call in the host.
 *
 * @function callHostMethod
 * @memberof hostSelection_2014_02.SelectionProviderProxy
 *
 * @param {Object} inputData - Object defining input properties used in forming the call to the host-side
 * service.
 * <pre>
 * {InteropObjectRefArray} objRefList selection change list.
 * </pre>
 */
SelectionProviderProxy.prototype.callHostMethod = function( inputData ) {
    if( !hostInteropSvc.isStartupComplete() ) {
        return;
    }

    // since it is an overlay type, need a factory method.
    var message = exports.createSelectionMessage();

    message.setSingleSelect( true );

    if( inputData.objRefList ) {
        message.setSelection( inputData.objRefList );
    }

    var payload = JSON.stringify( message );

    this._invokeHostMethod( payload );
};

/**
 * invoke the service call in the host.
 *
 * @function fireHostEvent
 * @memberof hostSelection_2014_02.SelectionProviderProxy
 *
 * @param {Object} inputData - Object defining input properties used in forming the call to the host-side
 * service.
 * <pre>
 * {InteropObjectRefArray} objRefList selection change list.
 * </pre>
 */
SelectionProviderProxy.prototype.fireHostEvent = function( inputData ) {
    if( !hostInteropSvc.isStartupComplete() ) {
        return;
    }

    // since it is an overlay type, need a factory method.
    var message = exports.createSelectionMessage();

    message.setSingleSelect( true );

    if( inputData.objRefList ) {
        message.setSelection( inputData.objRefList );
    }

    var payload = JSON.stringify( message );

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
 * @memberof hostSelection_2014_02
 *
 * @returns {SelectionListenerSvc} New instance of the service API object.
 */
export let createSelectionListenerSvc = function() {
    return new SelectionListenerSvc();
};

/**
 * Create new client-side message.
 *
 * @memberof hostSelection_2014_02
 *
 * @param {String} jsonString - (Optional) JSON encoded data to set as the properties of the new instance.
 *
 * @returns {SelectionMessage} New instance of the service message object.
 */
export let createSelectionMessage = function( jsonString ) {
    return new SelectionMessage( jsonString );
};

/**
 * Create new client-side proxy.
 *
 * @memberof hostSelection_2014_02
 *
 * @returns {SelectionProviderProxy} New instance of the proxy API object.
 */
export let createSelectionProviderProxy = function() {
    return new SelectionProviderProxy();
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostSelection_2014_02
 */
export let registerHostingModule = function() {
    exports.createSelectionListenerSvc().register();
};

export default exports = {
    createSelectionListenerSvc,
    createSelectionMessage,
    createSelectionProviderProxy,
    registerHostingModule
};
