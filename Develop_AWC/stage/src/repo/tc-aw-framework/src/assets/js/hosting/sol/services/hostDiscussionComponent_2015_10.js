// Copyright 2022 Siemens

/**
 * @module js/hosting/sol/services/hostDiscussionComponent_2015_10
 * @namespace hostDiscussionComponent_2015_10
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
 // DiscussionComponentInputSvc
 // -------------------------------------------------------------------------------
 // -------------------------------------------------------------------------------
 
 /**
  *  Hosting service to ...
  *
  *  @constructor
  *  @memberof hostDiscussionComponent_2015_10
  *  @extends hostFactoryService.BaseCallableService
  */
 var DiscussionComponentInputSvc = function() {
     hostFactorySvc.getCallableService().call( this,
         hostServices.CS_DISCUSSION_COMPONENT_INPUT_SVC,
         hostServices.VERSION_2015_10 );
 };
 
 DiscussionComponentInputSvc.prototype = hostFactorySvc.extendCallableService();
 
 /**
  * This is an incoming call to this service. Trigger the related event handlers.
  *
  * @function handleIncomingEvent
  * @memberof hostDiscussionComponent_2015_10.ComponentConfigSvc
  *
  * @param {String} jsondata - JSON encoded payload from the host.
  */
 DiscussionComponentInputSvc.prototype.handleIncomingEvent = function( jsondata ) {
     try {
         var msg = exports.createDiscussionComponentInputRequestMsg( jsondata );
 
         if( msg ) {
             var modelObjUids = [];
             var vmobject;
             _.forEach( msg.getObjects(), function( objRef ) {
                 if( objRef.Data ) {
                    var decodedJson =  hostUtils.decodeEmbeddedJson( objRef.Data );
                    modelObjUids.push( decodedJson );
                 }
             } );
 
             if( modelObjUids.length > 0 ) {
                 var modelObjs = [];
 
                     dms.loadObjects( modelObjUids ).then( function() {
                         var modelObjUids2 = []; _.forEach( modelObjUids, function( uid ) {
                             var obj = cdm.getObject( uid );
                             if( obj ) {
                                 modelObjUids2.push( obj.uid );
                             }                    
                          } );
                     
                         /**
                          * Component ID for the new workflow process hosted component (command ot location).
                          */
                         eventBus.publish( 'aw.hosting.component.context', {
                             componentId: 'com.siemens.splm.clientfx.tcui.xrt.published.Discussion',
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
 // DiscussionComponentInputRequestMsg
 // -------------------------------------------------------------------------------
 // -------------------------------------------------------------------------------
 
 /**
  * The service contract which sends info via {@link DiscussionComponentInputSvc}.
  *
  * @constructor
  * @memberof hostDiscussionComponent_2015_10
  * @extends hostFactorySvc.BaseDataContractImpl
  *
  * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
  */
 var DiscussionComponentInputRequestMsg = function( jsonData ) {
     hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2015_10 );
 
     if( jsonData ) {
         _.assign( this, JSON.parse( jsonData ) );
     }
 };
 
 DiscussionComponentInputRequestMsg.prototype = hostFactorySvc.extendDataContract();
 
 /**
  * Get current value.
  *
  * @memberof hostDiscussionComponent_2015_10.DiscussionComponentInputRequestMsg
  *
  * @return {InteropObjectRefArray} Context property value.
  */
 DiscussionComponentInputRequestMsg.prototype.getObjects = function() {
     return _.get( this, 'ObjectRefs', null );
 };
 
 /**
  * Set currrent value.
  *
  * @memberof hostDiscussionComponent_2015_10.DiscussionComponentInputRequestMsg
  *
  * @param {InteropObjectRefArray} objRefs - Property value.
  */
 DiscussionComponentInputRequestMsg.prototype.setObjects = function( objRefs ) {
     this.ObjectRefs = objRefs;
 };
 
 /**
  * Get current value.
  *
  * @memberof hostDiscussionComponent_2015_10.DiscussionComponentInputRequestMsg
  *
  * @return {PairArray} Context property value.
  */
 DiscussionComponentInputRequestMsg.prototype.getData = function() {
     return _.get( this, 'Data', null );
 };
 
 /**
  * Set currrent value.
  *
  * @memberof hostDiscussionComponent_2015_10.DiscussionComponentInputRequestMsg
  *
  * @param {PairArray} pairs - Property value.
  */
 DiscussionComponentInputRequestMsg.prototype.setData = function( pairs ) {
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
  * @memberof hostDiscussionComponent_2015_10
  *
  * @returns {DiscussionComponentInputSvc} New instance of the service message API object.
  */
 export let createDiscussionComponentInputSvc = function() {
     return new DiscussionComponentInputSvc();
 };
 
 /**
  * Return a new instance of this class.
  *
  * @memberof hostDiscussionComponent_2015_10
  *
  * @param {String} payload - (Optional) String from the 'host' to use when initializing the message object.
  *
  * @returns {DiscussionComponentInputRequestMsg} New instance of the service message object.
  */
 export let createDiscussionComponentInputRequestMsg = function( payload ) {
     return new DiscussionComponentInputRequestMsg( payload );
 };
 
 // ---------------------------------------------------------------------------------
 
 /**
  * Register any client-side (CS) services (or other resources) contributed by this module.
  *
  * @memberof hostDiscussionComponent_2014_02
  */
 export let registerHostingModule = function() {
     exports.createDiscussionComponentInputSvc().register();
 };
 
 export default exports = {
     createDiscussionComponentInputSvc,
     createDiscussionComponentInputRequestMsg,
     registerHostingModule
 };
 