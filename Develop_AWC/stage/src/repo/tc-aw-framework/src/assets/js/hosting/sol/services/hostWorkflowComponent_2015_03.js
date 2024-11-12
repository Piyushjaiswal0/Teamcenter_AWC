// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostWorkflowComponent_2015_03
 * @namespace hostWorkflowComponent_2015_03
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import appCtxSvc from 'js/appCtxService';
import dms from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import hostUtils from 'js/hosting/hostUtils';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// WorkflowComponentInputSvc
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 *  Hosting service to ...
 *
 *  @constructor
 *  @memberof hostWorkflowComponent_2015_03
 *  @extends hostFactoryService.BaseCallableService
 */
var WorkflowComponentInputSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_WORKFLOW_COMPONENT_INPUT_SVC,
        hostServices.VERSION_2015_03 );
};

WorkflowComponentInputSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * This is an incoming call to this service. Trigger the related event handlers.
 *
 * @function handleIncomingEvent
 * @memberof hostWorkflowComponent_2015_03.ComponentConfigSvc
 *
 * @param {String} jsondata - JSON encoded payload from the host.
 */
WorkflowComponentInputSvc.prototype.handleIncomingEvent = function( jsondata ) {
    try {
        var msg = exports.createWorkflowComponentInputRequestMsg( jsondata );

        if( msg ) {
            var modelObjUids = [];

            _.forEach( msg.getObjects(), function( objRef ) {
                if( objRef.Data ) {
                    var target = JSON.parse( hostUtils.decodeEmbeddedJson( objRef.Data ) );

                    modelObjUids.push( target.ObjId );
                }
            } );

            if( modelObjUids.length > 0 ) {
                var modelObjs = [];

                dms.loadObjects( modelObjUids ).then( function() {
                    var modelObjUids2 = [];

                    _.forEach( modelObjUids, function( uid ) {
                        var obj = cdm.getObject( uid );

                        if( obj ) {
                            modelObjs.push( obj );
                            modelObjUids2.push( obj.uid );
                        }
                    } );

                    appCtxSvc.registerCtx( 'workflow_process_candidates', {
                        workFlowObjects: modelObjs,
                        IsEmbeddedComponent: true
                    } );

                    /**
                     * Component ID for the new workflow process hosted component (command ot location).
                     */
                    eventBus.publish( 'aw.hosting.component.context', {
                        componentId: 'com.siemens.splm.client.workflow.published.NewWorkflowProcess',
                        modelObjects: modelObjUids2,
                        embeddedLocationView: true
                    } );
                } );
            }
        }
    } catch ( ex ) {
        logger.error( ex );
    }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// WorkflowComponentInputRequestMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends info via {@link WorkflowComponentInputSvc}.
 *
 * @constructor
 * @memberof hostWorkflowComponent_2015_03
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var WorkflowComponentInputRequestMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2015_03 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

WorkflowComponentInputRequestMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current value.
 *
 * @memberof hostWorkflowComponent_2015_03.WorkflowComponentInputRequestMsg
 *
 * @return {InteropObjectRefArray} Context property value.
 */
WorkflowComponentInputRequestMsg.prototype.getObjects = function() {
    return _.get( this, 'ObjectRefs', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostWorkflowComponent_2015_03.WorkflowComponentInputRequestMsg
 *
 * @param {InteropObjectRefArray} objRefs - Property value.
 */
WorkflowComponentInputRequestMsg.prototype.setObjects = function( objRefs ) {
    this.ObjectRefs = objRefs;
};

/**
 * Get current value.
 *
 * @memberof hostWorkflowComponent_2015_03.WorkflowComponentInputRequestMsg
 *
 * @return {PairArray} Context property value.
 */
WorkflowComponentInputRequestMsg.prototype.getData = function() {
    return _.get( this, 'Data', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostWorkflowComponent_2015_03.WorkflowComponentInputRequestMsg
 *
 * @param {PairArray} pairs - Property value.
 */
WorkflowComponentInputRequestMsg.prototype.setData = function( pairs ) {
    this.Data = pairs;
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
 * @returns {WorkflowComponentInputSvc} New instance of the service message API object.
 */
export let createWorkflowComponentInputSvc = function() {
    return new WorkflowComponentInputSvc();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostFeedback_2015_03
 *
 * @param {String} payload - (Optional) String from the 'host' to use when initializing the message object.
 *
 * @returns {WorkflowComponentInputRequestMsg} New instance of the service message object.
 */
export let createWorkflowComponentInputRequestMsg = function( payload ) {
    return new WorkflowComponentInputRequestMsg( payload );
};

// ---------------------------------------------------------------------------------

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostTheme_2014_02
 */
export let registerHostingModule = function() {
    exports.createWorkflowComponentInputSvc().register();
};

export default exports = {
    createWorkflowComponentInputSvc,
    createWorkflowComponentInputRequestMsg,
    registerHostingModule
};
