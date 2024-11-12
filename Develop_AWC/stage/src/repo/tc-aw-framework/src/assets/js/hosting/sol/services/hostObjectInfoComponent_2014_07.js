// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostObjectInfoComponent_2014_07
 * @namespace hostObjectInfoComponent_2014_07
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import _ from 'lodash';
import logger from 'js/logger';
import eventBus from 'js/eventBus';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// ObjectInfoComponentInputSvc
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 *  Hosting service to ...
 *
 * @constructor
 * @memberof hostObjectInfoComponent_2014_07
 * @extends hostFactoryService.BaseCallableService
 */
var ObjectInfoComponentInputSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_OBJECTINFO_COMPONENT_INPUT_SVC,
        hostServices.VERSION_2014_07 );
};

ObjectInfoComponentInputSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * This is an incoming call to this service. Trigger the related event handlers.
 *
 * @function handleIncomingEvent
 * @memberof hostObjectInfoComponent_2014_07.ComponentConfigSvc
 *
 * @param {String} jsondata - JSON encoded payload from the host.
 */
ObjectInfoComponentInputSvc.prototype.handleIncomingEvent = function( jsondata ) {
    try {
        var msg = exports.createObjectInfoComponentInputRequestMsg( jsondata );

        if( msg ) {
            var objRef = msg.getObject();

            if( objRef && objRef.ObjId ) {
                /**
                 * Component identifier token for the object info presenter widget.
                 */
                eventBus.publish( 'aw.hosting.component.context', {
                    componentId: 'com.siemens.splm.clientfx.tcui.xrt.published.ObjectInfo',
                    modelObjects: [ objRef.ObjId ],
                    embeddedLocationView: true
                } );
            }
        }
    } catch ( ex ) {
        logger.error( ex );
    }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// ObjectInfoComponentInputRequestMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends info via {@link ObjectInfoComponentInputSvc}.
 *
 * @constructor
 * @memberof hostObjectInfoComponent_2014_07
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var ObjectInfoComponentInputRequestMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2014_07 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

ObjectInfoComponentInputRequestMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current value.
 *
 * @memberof hostObjectInfoComponent_2014_07.ObjectInfoComponentInputRequestMsg
 *
 * @return {InteropObjectRef} Context property value.
 */
ObjectInfoComponentInputRequestMsg.prototype.getObject = function() {
    return _.get( this, 'ObjectRef', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostObjectInfoComponent_2014_07.ObjectInfoComponentInputRequestMsg
 *
 * @param {InteropObjectRef} objRef - Property value.
 */
ObjectInfoComponentInputRequestMsg.prototype.setObject = function( objRef ) {
    this.ObjectRef = objRef;
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
 * @memberof hostFeedback_2015_03
 *
 * @returns {ObjectInfoComponentInputSvc} New instance of the service message API object.
 */
export let createObjectInfoComponentInputSvc = function() {
    return new ObjectInfoComponentInputSvc();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostFeedback_2015_03
 *
 * @param {String} payload - (Optional) String from the 'host' to use when initializing the message object.
 *
 * @returns {ObjectInfoComponentInputRequestMsg} New instance of the service message object.
 */
export let createObjectInfoComponentInputRequestMsg = function( payload ) {
    return new ObjectInfoComponentInputRequestMsg( payload );
};

// ---------------------------------------------------------------------------------

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostTheme_2014_02
 */
export let registerHostingModule = function() {
    exports.createObjectInfoComponentInputSvc().register();
};

export default exports = {
    createObjectInfoComponentInputSvc,
    createObjectInfoComponentInputRequestMsg,
    registerHostingModule
};
