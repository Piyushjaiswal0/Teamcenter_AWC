// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostOpen_2014_02
 * @namespace hostOpen_2014_02
 */
import AwStateService from 'js/awStateService';
import hostFactorySvc from 'js/hosting/hostFactoryService';
import hostSelection1 from 'js/hosting/inf/services/hostSelection_2014_02';
import _ from 'lodash';
import logger from 'js/logger';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostAddComponentProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostOpen_2014_02
 * @extends hostFactoryService.BaseCallableService
 */
var HostAddComponentProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_HOST_ADD_COMPONENT,
        hostServices.VERSION_2014_02 );
};

HostAddComponentProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Process outgoing 'event' type call to the host.
 *
 * @function handleIncomingEvent
 * @memberof hostOpen_2014_02.HostAddComponentProxy
 *
 * @param {HostAddComponentRequestMsg} inputData - Data object who's properties define data {in whatever form the
 * implementation is expecting) to process into a call to the host-side service.
 */
HostAddComponentProxy.prototype.fireHostEvent = function( inputData ) {
    var payload = JSON.stringify( inputData );

    this._invokeHostEvent( payload );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostAddComponentRequestMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends the open request info to the host via {@link HostOpenProxy}.
 * <P>
 * The message has a list of targets to be opened. Representation is similar to the selection service
 * contract.
 *
 * @constructor
 * @memberof hostOpen_2014_02
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - String from the 'host' to use when initializing the message object.
 */
var HostAddComponentRequestMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2014_02 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

HostAddComponentRequestMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current property value.
 *
 * @memberof hostOpen_2014_02.HostAddComponentRequestMsg
 *
 * @return {InteropObjectRefArray} OpenTargets property value.
 */
HostAddComponentRequestMsg.prototype.getAddComponentTargets = function() {
    return _.get( this, 'AddComponentTargets', null );
};

/**
 * Get current property value.
 *
 * @memberof hostOpen_2014_02.HostAddComponentRequestMsg
 *
 * @param {InteropObjectRefArray} list - OpenTargets property value.
 */
HostAddComponentRequestMsg.prototype.setAddComponentTargets = function( list ) {
    this.AddComponentTargets = list;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostOpenProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostOpen_2014_02
 * @extends hostFactoryService.BaseCallableService
 */
var HostOpenProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_HOST_OPEN,
        hostServices.VERSION_2014_02 );
};

HostOpenProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Process outgoing 'event' type call to the host.
 *
 * @function handleIncomingEvent
 * @memberof hostOpen_2014_02.HostOpenProxy
 *
 * @param {HostOpenRequestMsg} inputData - Data object who's properties define data {in whatever form the
 * implementation is expecting) to process into a call to the host-side service.
 */
HostOpenProxy.prototype.fireHostEvent = function( inputData ) {
    var payload = JSON.stringify( inputData );

    this._invokeHostEvent( payload );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostOpenRequestMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends the open request info to the host via {@link HostOpenProxy}.
 * <P>
 * The message has a list of targets to be opened. Representation is similar to the selection service
 * contract.
 *
 * @constructor
 * @memberof hostOpen_2014_02
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - String from the 'host' to use when initializing the message object.
 */
var HostOpenRequestMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2014_02 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

HostOpenRequestMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current property value.
 *
 * @memberof hostOpen_2014_02.HostOpenRequestMsg
 *
 * @return {InteropObjectRefArray} OpenTargets property value.
 */
HostOpenRequestMsg.prototype.getOpenTargets = function() {
    return _.get( this, 'OpenTargets', null );
};

/**
 * Get current property value.
 *
 * @memberof hostOpen_2014_02.HostOpenRequestMsg
 *
 * @param {InteropObjectRefArray} value - OpenTargets property value.
 */
HostOpenRequestMsg.prototype.setOpenTargets = function( value ) {
    this.OpenTargets = value;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// ShowSummarySvc
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 *  Hosting service to display summary page for identified object.
 *
 * @constructor
 * @memberof hostOpen_2014_02
 * @extends hostFactoryService.BaseCallableService
 */
var ShowSummarySvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_SHOW_SUMMARY,
        hostServices.VERSION_2014_02 );
};

ShowSummarySvc.prototype = hostFactorySvc.extendCallableService();

/**
 * This is an incoming call to this service trigger the related event handlers.
 *
 * @function handleIncomingEvent
 * @memberof hostOpen_2014_02.ShowSummarySvc
 *
 * @param {String} jsondata - JSON encoded payload from the host.
 */
ShowSummarySvc.prototype.handleIncomingEvent = function( jsondata ) {
    // this is an incoming call to this service
    // trigger the related event handlers.
    try {
        var targetUid;

        // attempt to deserialize the input data contract.
        var msg = hostSelection1.createSelectionMessage( jsondata );

        if( msg ) {
            // TODO - what if we get more than 1 target?
            var target = msg.getSelection()[ 0 ];

            if( target ) {
                targetUid = target.ObjId;
            }
        }

        // if we got a target, then trigger the display.
        if( targetUid ) {
            AwStateService.instance.go( 'com_siemens_splm_clientfx_tcui_xrt_showObject', {
                uid: targetUid
            }, {
                inherit: false
            } );
        }
    } catch ( ex ) {
        logger.error( ex );
    }
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
 * @memberof hostOpen_2014_02
 *
 * @returns {HostAddComponentProxy} New instance of the service API object.
 */
export let createHostAddComponentProxy = function() {
    return new HostAddComponentProxy();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostOpen_2014_02
 *
 * @param {String} payload - (Optional) String from the 'host' to use when initializing the message object.
 *
 * @returns {HostAddComponentRequestMsg} New instance of the service message object.
 */
export let createHostAddComponentRequestMsg = function( payload ) {
    return new HostAddComponentRequestMsg( payload );
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostOpen_2014_02
 *
 * @returns {HostOpenProxy} New instance of the service message API object.
 */
export let createHostOpenProxy = function() {
    return new HostOpenProxy();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostOpen_2014_02
 *
 * @param {String} payload - (Optional) String from the 'host' to use when initializing the message object.
 *
 * @returns {HostOpenRequestMsg} New instance of the service message object.
 */
export let createHostOpenRequestMsg = function( payload ) {
    return new HostOpenRequestMsg( payload );
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostOpen_2014_02
 *
 * @returns {ShowSummarySvc} New instance of the service API object.
 */
export let createShowSummarySvc = function() {
    return new ShowSummarySvc();
};

// ---------------------------------------------------------------------------------

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostOpen_2014_02
 */
export let registerHostingModule = function() {
    exports.createShowSummarySvc().register();
};

export default exports = {
    createHostAddComponentProxy,
    createHostAddComponentRequestMsg,
    createHostOpenProxy,
    createHostOpenRequestMsg,
    createShowSummarySvc,
    registerHostingModule
};
