// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostComponent_2014_07
 * @namespace hostComponent_2014_07
 */
import AwPromiseService from 'js/awPromiseService';
import AwStateService from 'js/awStateService';
 import hostInteropSvc from 'js/hosting/hostInteropService';
 import hostSupportSvc from 'js/hosting/hostSupportService';
 import hostFactorySvc from 'js/hosting/hostFactoryService';
 import commandSvc from 'js/command.service';
 import cfgSvc from 'js/configurationService';
 import dms from 'soa/dataManagementService';
 import cdm from 'soa/kernel/clientDataModel';
 import selectionSvc from 'js/selection.service';
 import appCtxSvc from 'js/appCtxService';
 import _ from 'lodash';
 import eventBus from 'js/eventBus';
 import logger from 'js/logger';
 import hostServices from 'js/hosting/hostConst_Services';
 import viewModelObjectService from 'js/viewModelObjectService';

 /**
  * {MapComponentIdToModelObjectUIDs}
  */
 var _contextObjUidsMap = {};
 
 /**
  * {MapComponentIdToExtraParams}
  */
 var _contextParamsMap = {};
 
 /**
  * {MapComponentIdToEmbeddedLocationView}
  */
 var _contextEmbeddedLocationViewMap = {};
 
 /**
  * Execute/Navigate based on the information in the specified hostedComponent.
  *
  * @param {String} componentId - ID of the hostedComponent to process.
  * @param {Boolean} embeddedLocationView - TRUE if the component should look 'embedded' (i.e. minimum
  * 'chrome').
  * @param {Object} hostedComponents - Object holding the definition of all configured hostedComponents.
  */
 function _processHostedComponent( componentId, embeddedLocationView, hostedComponents ) {
     /**
      * Handle embedded view on/off
      */
     hostSupportSvc.setEmbeddedLocationView( embeddedLocationView );
 
     /**
      * Check if they gave us a componentId we know about.
      */
     if( componentId ) {
         var hostedComponent = hostedComponents[ componentId ];
 
         if( hostedComponent ) {
             /**
              * Put this ID where the {aw.hosted.page.controller} can see it.
              */
             appCtxSvc.ctx.aw_hosting_state.currentHostedComponentId = componentId;
             appCtxSvc.ctx.aw_hosting_state.currentEmbeddedLocationView = embeddedLocationView;
 
             /**
              * Check if the 'host' want's us to execute a command or go to a location.
              */
             if( hostedComponent.commandId ) {
                 // If there are any selection in the contextObjectUidsMap, 
                 // we need to set this to selection before calling the command. 
                 // If a command needs a selection, we would need to use this. 
                 exports.setupComponentContext( _contextObjUidsMap[ componentId ], AwStateService.instance.params,
                     _contextParamsMap[ componentId ], null ).then(
                         function(params){
 
                     /**
                      * Add any extra parameters that may have been set for this component.
                      */
                     var cmdCtxScope = hostInteropSvc.getHostingScope().$new();
 
                     if( _contextParamsMap[ componentId ] ) {
                         _.assign( cmdCtxScope, _contextParamsMap[ componentId ] );
                     }
 
                //TODO: executeCommand requires the "runActionWithViewModel" API which is only accessible from render function
                     commandSvc.executeCommand( hostedComponent.commandId, null, cmdCtxScope );
                 } );
             } else if( hostedComponent.componentLocation ) {
                 /**
                  * Check if the 'host' has already set a UID in the context map they want to use for this
                  * component.
                  * <P>
                  * If so: Locate the associated model object and set it in the context and AwStateService.instance params
                  * where it can be found.
                  */
                 exports.setupComponentContext( _contextObjUidsMap[ componentId ], AwStateService.instance.params,
                     _contextParamsMap[ componentId ], null ).then(
                     function( params ) {
                         /**
                          * Add access to the ID of the component associated with the location.
                          */
                         params.componentId = componentId;
 
                         var location = hostedComponent.componentLocation.replace( /\./g, '_' );
 
                         AwStateService.instance.go( location, params, {
                            location: 'replace',
                            reload : true
                         } );
                     } );
             } else {
                 logger.error( 'Missing hosted component property (commandId, componentLocation, etc.)' + '\n' +
                     'componentId: ' + componentId );
             }
         } else {
             if( componentId !== 'dummy' ) {
                 logger.error( 'Missing hosted component: ' + componentId );
             }
         }
     }
 }
 
 // -------------------------------------------------------------------------------
 // -------------------------------------------------------------------------------
 // ComponentConfigSvc
 // -------------------------------------------------------------------------------
 // -------------------------------------------------------------------------------
 
 /**
  *  Hosting service to ...
  *
  *  @constructor
  *  @memberof hostComponent_2014_07
  *  @extends hostFactoryService.BaseCallableService
  */
 var ComponentConfigSvc = function() {
     hostFactorySvc.getCallableService().call( this,
         hostServices.CS_COMPONENTCONFIG_SERVICE,
         hostServices.VERSION_2014_07 );
 };
 
 ComponentConfigSvc.prototype = hostFactorySvc.extendCallableService();
 
 /**
  * This is an incoming call to this service. Trigger the related event handlers.
  *
  * @function handleIncomingEvent
  * @memberof hostComponent_2014_07.ComponentConfigSvc
  *
  * @param {String} jsonData - JSON encoded payload from the host.
  */
 ComponentConfigSvc.prototype.handleIncomingEvent = function( jsonData ) {
     try {
         var msg = exports.createComponentConfigMsg( jsonData );
 
         if( msg ) {
             cfgSvc.getCfg( 'hosting.hostedComponents' ).then( function( hostedComponents ) {
                 _processHostedComponent( msg.getComponentId(), msg.getUseEmbeddedLocationView(), hostedComponents );
             } );
         }
     } catch ( ex ) {
         logger.error( ex );
     }
 };
 
 // -------------------------------------------------------------------------------
 // -------------------------------------------------------------------------------
 // ComponentConfigMsg
 // -------------------------------------------------------------------------------
 // -------------------------------------------------------------------------------
 
 /**
  * The service contract which sends the open request info to the host via {@link ComponentConfigSvc}.
  * <P>
  * The message has a list of targets to be opened. Representation is similar to the selection service
  * contract.
  *
  * @constructor
  * @memberof hostComponent_2014_07
  * @extends hostFactorySvc.BaseDataContractImpl
  *
  * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
  */
 var ComponentConfigMsg = function( jsonData ) {
     hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2014_07 );
 
     if( jsonData ) {
         _.assign( this, JSON.parse( jsonData ) );
     }
 };
 
 ComponentConfigMsg.prototype = hostFactorySvc.extendDataContract();
 
 /**
  * Get current value.
  *
  * @memberof hostComponent_2014_07.ComponentConfigMsg
  *
  * @return {String} Property value.
  */
 ComponentConfigMsg.prototype.getComponentId = function() {
     return _.get( this, 'ComponentId', null );
 };
 
 /**
  * Set currrent value.
  *
  * @memberof hostComponent_2014_07.ComponentConfigMsg
  *
  * @param {String} value - Property value.
  */
 ComponentConfigMsg.prototype.setComponentId = function( value ) {
     this.ComponentId = value;
 };
 
 /**
  * Get current value.
  *
  * @memberof hostComponent_2014_07.ComponentConfigMsg
  *
  * @return {Boolean} Property value.
  */
 ComponentConfigMsg.prototype.getUseEmbeddedLocationView = function() {
     return _.get( this, 'UseEmbeddedLocationView', null );
 };
 
 /**
  * Set currrent value.
  *
  * @memberof hostComponent_2014_07.ComponentConfigMsg
  *
  * @param {Boolean} value - Property value.
  */
 ComponentConfigMsg.prototype.setUseEmbeddedLocationView = function( value ) {
     this.UseEmbeddedLocationView = value;
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
  * @memberof hostComponent_2014_07
  *
  * @returns {ComponentConfigSvc} New instance of the service message API object.
  */
 export let createComponentConfigSvc = function() {
     return new ComponentConfigSvc();
 };
 
 /**
  * Return a new instance of this class.
  *
  * @memberof hostComponent_2014_07
  *
  * @param {String} payload - (Optional) String from the 'host' to use when initializing the message object.
  *
  * @returns {ComponentConfigMsg} New instance of the service message object.
  */
 export let createComponentConfigMsg = function( payload ) {
     return new ComponentConfigMsg( payload );
 };
 
 /**
  * @param {String} componentId - The ID of the 'component' to check.
  *
  * @returns {StringArray} UIDs of any IModelObjects currently registered with the given 'component' (via
  * eventBus 'aw.hosting.component.context' topic) (or null if no IModelObjects have been registered with
  * that component).
  */
 export let getComponentContextUids = function( componentId ) {
     return _contextObjUidsMap[ componentId ] ? _contextObjUidsMap[ componentId ] : null;
 };
 
 /**
  * Check if the 'host' has already set a UID in the context map they want to use for this component.
  * <P>
  * If so: Locate the associated model object and set it in the context and AwStateService.instance params where it can be
  * found.
  *
  * @param {StringArray} objectUids - Array of UIDs to consider (or null if nothing to consider).
  * @param {Object} paramsIn - The parameter map object to use as bases for returned object.
  * @param {Object} extraParams - (Optional) Any extra parameters to include in the returned object.
  * @param {Object} $scope - (Optional) The dataContextNode to set the 'vmo' property on.
  *
  * @returns {Promise} Resolved with resulting parameter map object.
  */
 export let setupComponentContext = function( objectUids, paramsIn, extraParams, $scope ) {
     var paramsRet = _.clone( paramsIn );
 
     var validUids = [];
 
     _.forEach( objectUids, function( objectUid ) {
         if( objectUid ) {
             validUids.push( objectUid );
         }
     } );
 
     if( !_.isEmpty( validUids ) ) {
         return dms.loadObjects( validUids ).then( function() {
             var objUid = validUids[ 0 ];
 
             var modelObj = cdm.getObject( objUid );
 
             if( modelObj ) {
                var vmo = viewModelObjectService.createViewModelObject( modelObj); 

                 selectionSvc.updateSelection( vmo );
 
                 paramsRet.uid = objUid;
 
                 if( $scope ) {
                     $scope.vmo = modelObj;
                 }
             } else {
                 logger.warn( 'hostComponent_2014_07: ' + 'setupComponentContext: ' + 'Unable to locate object via UID=' + objUid );
             }
 
             _.set( appCtxSvc, 'ctx.aw_hosting_state.enableEditing', paramsIn.enableEditing === 'true' );
 
             /**
              * Add any extra parameters that may have been specified.
              */
             if( extraParams ) {
                 _.assign( paramsRet, extraParams );
             }
 
             return paramsRet;
         } );
     }
 
     if( extraParams ) {
         _.assign( paramsRet, extraParams );
     }
 
     return AwPromiseService.instance.resolve( paramsRet );
 };
 
 // ---------------------------------------------------------------------------------
 
 /**
  * Register any client-side (CS) services (or other resources) contributed by this module.
  *
  * @memberof hostComponent_2014_07
  */
 export let registerHostingModule = function() {
     exports.createComponentConfigSvc().register();
 
     eventBus.subscribe( 'aw.hosting.component.context', function( eventData ) {
         if( eventData.componentId ) {
             _contextObjUidsMap[ eventData.componentId ] = eventData.modelObjects;
             _contextParamsMap[ eventData.componentId ] = eventData.params;
             _contextEmbeddedLocationViewMap[ eventData.componentId ] = eventData.embeddedLocationView;
 
             cfgSvc.getCfg( 'hosting.hostedComponents' ).then( function( hostedComponents ) {
                 _processHostedComponent( eventData.componentId, eventData.embeddedLocationView, hostedComponents );
             } );
         }
     } );
 };
 
 export default exports = {
     createComponentConfigSvc,
     createComponentConfigMsg,
     getComponentContextUids,
     setupComponentContext,
     registerHostingModule
 };
 
