// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/inf/services/hostSelection_2019_05
 * @namespace hostSelection_2019_05
 */
import appCtxSvc from 'js/appCtxService';
import hostInteropSvc from 'js/hosting/hostInteropService';
import hostFactorySvc from 'js/hosting/hostFactoryService';
import hostSelection_2014_10 from 'js/hosting/inf/services/hostSelection_2014_10';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import hostServices from 'js/hosting/hostConst_Services';
import hostUtils from 'js/hosting/hostUtils';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// SelectionListenerSvc (_2019_05)
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This is the web side service for receiving selection notifications from the host side. This needs to wire
 * up to some event trigger mechanism that observers can register against.
 *
 * @constructor
 * @memberof hostSelection_2019_05
 * @extends hostFactoryService.BaseCallableService
 */
var SelectionListenerSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_SELECTION_LISTENER_SVC,
        hostServices.VERSION_2019_05 );
};

SelectionListenerSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * This is an incoming call to this service trigger the related event handlers.
 *
 * @function handleIncomingEvent
 * @memberof hostSelection_2019_05.SelectionListenerSvc
 *
 * @param {String} jsondata - JSON encoded payload from the host.
 */
SelectionListenerSvc.prototype.handleIncomingEvent = function( jsondata ) {
    try {
        // attempt to deserialize the input data contract.
        var msg = JSON.parse( jsondata );

        if( msg ) {
            // If no selection, this means the 'host' want's 'nothing' selected (which usually means the
            // sublocation context object will be selected instead).
            if( _.isEmpty( msg.Selection ) ) {
                eventBus.publish( 'hosting.changeSelection', {
                    operation: 'replace',
                    selected: []
                } );
            } else {
                var mapTypeToSelections = {};

                // Process each selection and 'gather' by objectRef encoded types.
                _.forEach( msg.Selection, function( objRef ) {
                    // Decode the data field
                    var decodedData = hostUtils.decodeEmbeddedJson( objRef.Data );

                    // Add data to the appropriate handler for the type
                    var typeSelections = mapTypeToSelections[ objRef.Type ];

                    if( !typeSelections ) {
                        typeSelections = [];
                        mapTypeToSelections[ objRef.Type ] = typeSelections;
                    }

                    typeSelections.push( decodedData );
                } );

                // Process selections for each type
                _.forEach( mapTypeToSelections, function( selections, type ) {
                    var hostingState = appCtxSvc.ctx.aw_hosting_state;

                    var handler = hostingState.map_selection_type_to_handler[ type ];
                    var parser = hostingState.map_selection_type_to_parser[ type ];

                    if( handler && parser ) {
                        handler.processObjects( selections, parser );
                    }
                } );
            }
        }
    } catch ( ex ) {
        logger.error( ex );
    }
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
 * @memberof hostSelection_2019_05
 * @extends hostFactoryService.BaseCallableService
 */
var SelectionProviderProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_SELECTION_PROVIDER_SVC,
        hostServices.VERSION_2019_05 );
};

SelectionProviderProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Invoke the service call in the host.
 *
 * @function fireHostEvent
 * @memberof hostSelection_2019_05.SelectionProviderProxy
 *
 * @param {Object} inputData - Object defining input properties used in forming the call to the host-side
 * service.
 * <pre>
 *  {InteropObjectRefArray} objRefList - selection change list.
 * </pre>
 */
SelectionProviderProxy.prototype.fireHostEvent = function( inputData ) {
    if( !hostInteropSvc.isStartupComplete() ) {
        return;
    }

    var message = hostSelection_2014_10.createSelectionMessage();

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
 * @memberof hostSelection_2019_05
 *
 * @returns {SelectionListenerSvc} New instance of the service API object.
 */
export let createSelectionListenerSvc = function() {
    return new SelectionListenerSvc();
};

/**
 * Create new client-side proxy.
 *
 * @memberof hostSelection_2019_05
 *
 * @returns {SelectionProviderProxy} New instance of the proxy API object.
 */
export let createSelectionProviderProxy = function() {
    return new SelectionProviderProxy();
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostSelection_2019_05
 */
export let registerHostingModule = function() {
    exports.createSelectionListenerSvc().register();
};

export default exports = {
    createSelectionListenerSvc,
    createSelectionProviderProxy,
    registerHostingModule
};
