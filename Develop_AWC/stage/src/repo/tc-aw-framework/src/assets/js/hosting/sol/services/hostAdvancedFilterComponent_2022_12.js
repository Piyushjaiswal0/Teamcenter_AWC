// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostAdvancedFilterComponent_2022_12
 * @namespace hostAdvancedFilterComponent_2022_12
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
// AdvancedFilterComponentInputSvc
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 *  Hosting service to ...
 *
 *  @constructor
 *  @memberof hostAdvancedFilterComponent_2022_12
 *  @extends hostFactoryService.BaseCallableService
 */
var AdvancedFilterComponentInputSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_ADVANCED_FILTER_COMPONENT_INPUT_SVC,
        hostServices.VERSION_2022_12 );
};

AdvancedFilterComponentInputSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * This is an incoming call to this service. Trigger the related event handlers.
 *
 * @function handleIncomingEvent
 * @memberof hostAdvancedFilterComponent_2022_12.ComponentConfigSvc
 *
 * @param {String} jsondata - JSON encoded payload from the host.
 */
AdvancedFilterComponentInputSvc.prototype.handleIncomingEvent = function( jsondata ) {
    try {
        var msg = exports.createAdvancedFilterComponentInputRequestMsg( jsondata );

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

                    let msgData = msg.getData();
                    appCtxSvc.registerCtx( 'advanced_filter_candidates', {
                        filteringObjects: modelObjUids2,
                        data: msgData[0],
                        subsetCsid: msgData[1],
                        IsEmbeddedComponent: true
                    } );

                    appCtxSvc.registerCtx( 'aw_hosting_state.worksetUid', modelObjUids2[0] );
                    let filterObjCandidates = appCtxSvc.getCtx( 'advanced_filter_candidates' );
                    appCtxSvc.registerCtx( 'stringifiedRecipeFromNX', JSON.stringify( filterObjCandidates.data.Value ) );

                    /**
                     * Component ID for the advanced filter hosted component (command to location).
                     */
                    eventBus.publish( 'aw.hosting.component.context', {
                        componentId: 'com.siemens.splm.client.occmgmtsubset.published.AdvancedFilter',
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
// AdvancedFilterComponentInputRequestMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends info via {@link AdvancedFilterComponentInputSvc}.
 *
 * @constructor
 * @memberof hostAdvancedFilterComponent_2022_12
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var AdvancedFilterComponentInputRequestMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2022_12 );
    appCtxSvc.registerCtx( 'recipeFromNx', jsonData );
    var formattedJson = jsonData;
    if( jsonData.indexOf( 'Value' ) !== -1 ) {
        formattedJson = jsonData.slice( 0, jsonData.indexOf( 'Value' ) + 8 ) + jsonData.slice( jsonData.indexOf( 'Value' ) + 9, jsonData.length - 54 ) + jsonData.slice( jsonData.length - 53 );
    }
    if( jsonData ) {
        let newJson = undefined;
        try {
            newJson = JSON.parse( formattedJson );
        } catch( ex ) {
            newJson = JSON.parse( jsonData );
        }
        appCtxSvc.registerCtx( 'recipeFromNxFormatted', newJson );
        _.assign( this, newJson );
    }
};

AdvancedFilterComponentInputRequestMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current value.
 *
 * @memberof hostAdvancedFilterComponent_2022_12.AdvancedFilterComponentInputRequestMsg
 *
 * @return {InteropObjectRefArray} Context property value.
 */
AdvancedFilterComponentInputRequestMsg.prototype.getObjects = function() {
    return _.get( this, 'ObjectRefs', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostAdvancedFilterComponent_2022_12.AdvancedFilterComponentInputRequestMsg
 *
 * @param {InteropObjectRefArray} objRefs - Property value.
 */
AdvancedFilterComponentInputRequestMsg.prototype.setObjects = function( objRefs ) {
    this.ObjectRefs = objRefs;
};

/**
 * Get current value.
 *
 * @memberof hostAdvancedFilterComponent_2022_12.AdvancedFilterComponentInputRequestMsg
 *
 * @return {PairArray} Context property value.
 */
AdvancedFilterComponentInputRequestMsg.prototype.getData = function() {
    return _.get( this, 'Data', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostAdvancedFilterComponent_2022_12.AdvancedFilterComponentInputRequestMsg
 *
 * @param {PairArray} pairs - Property value.
 */
AdvancedFilterComponentInputRequestMsg.prototype.setData = function( pairs ) {
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
 * @memberof hostAdvancedFilterComponent_2022_12.js
 *
 * @returns {AdvancedFilterComponentInputSvc} New instance of the service message API object.
 */
export let createAdvancedFilterComponentInputSvc = function() {
    return new AdvancedFilterComponentInputSvc();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostAdvancedFilterComponent_2022_12
 *
 * @param {String} payload - (Optional) String from the 'host' to use when initializing the message object.
 *
 * @returns {AdvancedFilterComponentInputRequestMsg} New instance of the service message object.
 */
export let createAdvancedFilterComponentInputRequestMsg = function( payload ) {
    return new AdvancedFilterComponentInputRequestMsg( payload );
};

// ---------------------------------------------------------------------------------

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostAdvancedFilterComponent_2022_12
 */
export let registerHostingModule = function() {
    exports.createAdvancedFilterComponentInputSvc().register();
};

export default exports = {
    createAdvancedFilterComponentInputSvc,
    createAdvancedFilterComponentInputRequestMsg,
    registerHostingModule
};
