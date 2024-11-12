// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/inf/services/hostSelection_2014_10
 * @namespace hostSelection_2014_10
 */
import appCtxSvc from 'js/appCtxService';
import hostInteropSvc from 'js/hosting/hostInteropService';
import hostFactorySvc from 'js/hosting/hostFactoryService';
import hostBaseRefSvc from 'js/hosting/hostBaseRefService';
import hostBaseSelSvc from 'js/hosting/hostBaseSelService';
import hostSelection0 from 'js/hosting/inf/services/hostSelection_2014_02';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import hostServices from 'js/hosting/hostConst_Services';
import hostUtils from 'js/hosting/hostUtils';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// UidSelectionParser
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Selection type handler for uid selections
 *
 * @constructor
 * @memberof hostSelection_2014_10
 */
var UidSelectionParser = function() {
    hostBaseSelSvc.getBaseSelectionObjectParser().call( this );
};

UidSelectionParser.prototype = hostBaseSelSvc.extendBaseSelectionObjectParser();

/**
 * See prototype.
 *
 * @function parse
 * @memberof hostSelection_2014_10.UidSelectionParser
 *
 * @param {String} object - see prototype.
 *
 * @returns {ParsedSelectionObject} A new instance populated from given input.
 */
UidSelectionParser.prototype.parse = function( object ) {
    return hostBaseSelSvc.createParsedSelectionObject( object );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// UidSelectionTypeHandler
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Selection type handler for uid selections
 *
 * @constructor
 * @memberof hostSelection_2014_10
 * @extends  hostBaseSelService.ISelectionTypeHandler
 */
var UidSelectionTypeHandler = function() {
    hostBaseSelSvc.getBaseSelectionTypeHandler().call( this );
};

UidSelectionTypeHandler.prototype = hostBaseSelSvc.extendBaseSelectionTypeHandler();

/**
 * Handle selection based on given object references.
 *
 * @function processObjects
 * @memberof hostSelection_2014_10.UidSelectionTypeHandler
 *
 * @param {StringArray} objects - Array of JSON encoded object references.
 *
 * @param {ISelectionObjectParser} parser - API used to convert an object string into
 * {ParsedSelectionObject}
 *
 * @param {Number} selectionTime - Time the selection arrived from the host.
 */
UidSelectionTypeHandler.prototype.processObjects = function( objects, parser, selectionTime ) { // eslint-disable-line no-unused-vars
    /**
     * Check if we are currently in an ACE sublocation.
     * <P>
     * If So: Do not process a UID type selection.
     * <P>
     * Note: While it is not great to have ACE specific logic in otherwise 'neutral' code, this is
     * temporarily necessary until this and the OCC specific code can be converted to native JS in aw4.0.
     */
    var occMgmtContext = appCtxSvc.getCtx( 'occmgmtContext' );

    if( occMgmtContext ) {
        return;
    }

    var selectedUIDs = [];

    _.forEach( objects, function( obj ) {
        var selectedObject = parser.parse( obj );

        var targetUid = selectedObject.getValue( hostBaseSelSvc.OBJ_ID );

        if( targetUid ) {
            selectedUIDs.push( targetUid );
        }
    } );

    // Notify listeners of the selection
    eventBus.publish( 'hosting.changeSelection', {
        operation: 'replace',
        selected: selectedUIDs
    } );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// FilenameSelectionParser
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Selection type handler for uid selections
 *
 * @constructor
 * @memberof hostSelection_2014_10
 */
var FilenameSelectionParser = function() {
    hostBaseSelSvc.getBaseSelectionObjectParser().call( this );
};

FilenameSelectionParser.prototype = hostBaseSelSvc.extendBaseSelectionObjectParser();

/**
 * See prototype.
 *
 * @function parse
 * @memberof hostSelection_2014_10.FilenameSelectionParser
 *
 * @param {String} object - see prototype.
 *
 * @returns {ParsedSelectionObject} A new instance populated from given input.
 */
FilenameSelectionParser.prototype.parse = function( object ) {
    var parsedObj = hostBaseSelSvc.createParsedSelectionObject();

    parsedObj.setValue( hostBaseSelSvc.FILENAME, object );

    return parsedObj;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// FilenameSelectionTypeHandler
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Selection type handler for uid selections
 *
 * @constructor
 * @memberof hostSelection_2014_10
 * @extends  hostBaseSelService.ISelectionTypeHandler
 */
var FilenameSelectionTypeHandler = function() {
    hostBaseSelSvc.getBaseSelectionTypeHandler().call( this );
};

FilenameSelectionTypeHandler.prototype = hostBaseSelSvc.extendBaseSelectionTypeHandler();

/**
 * Handle selection based on given object references.
 *
 * @function processObjects
 * @memberof hostSelection_2014_10.FilenameSelectionTypeHandler
 *
 * @param {StringArray} objects - Array of JSON encoded object references.
 *
 * @param {ISelectionObjectParser} parser - API used to convert an object string into
 * {ParsedSelectionObject}
 *
 * @param {Number} selectionTime - Time the selection arrived from the host.
 */
FilenameSelectionTypeHandler.prototype.processObjects = function( objects, parser, selectionTime ) { // eslint-disable-line no-unused-vars
    if( !_.isEmpty( objects ) ) {
        var selectedObject = parser.parse( objects[ 0 ] );

        var fileName = selectedObject.getValue( hostBaseSelSvc.FILENAME );

        if( !_.isEmpty( fileName ) ) {
            var fileCtx = appCtxSvc.getCtx( 'HostedFileNameContext' );

            if( !fileCtx ) {
                fileCtx = {};

                fileCtx[ hostBaseSelSvc.FILENAME ] = fileName;
            } else {
                fileCtx[ hostBaseSelSvc.FILENAME ] = fileName;
            }

            appCtxSvc.updateCtx( 'HostedFileNameContext', fileCtx );
        }
    }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// SelectionListenerSvc (_2014_10)
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This is the web side service for receiving selection notifications from the host side. This needs to wire
 * up to some event trigger mechanism that observers can register against.
 *
 * @constructor
 * @memberof hostSelection_2014_10
 * @extends hostFactoryService.BaseCallableService
 */
var SelectionListenerSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_SELECTION_LISTENER_SVC,
        hostServices.VERSION_2014_10 );
};

SelectionListenerSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * This is an incoming call to this service trigger the related event handlers.
 *
 * @function handleIncomingEvent
 * @memberof hostSelection_2014_10.SelectionListenerSvc
 *
 * @param {String} jsondata - JSON encoded payload from the host.
 */
SelectionListenerSvc.prototype.handleIncomingEvent = function( jsondata ) {
    this.handleIncomingMethod( jsondata );
};

/**
 * This is an incoming call to this service trigger the related event handlers.
 *
 * @function handleIncomingMethod
 * @memberof hostSelection_2014_10.SelectionListenerSvc
 *
 * @param {String} jsondata - JSON encoded payload from the host.
 *
 * @returns {String} Response message.
 */
SelectionListenerSvc.prototype.handleIncomingMethod = function( jsondata ) {
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

                var selectionTime = Date.now();

                // Process selections for each type
                _.forEach( mapTypeToSelections, function( selections, type ) {
                    var hostingState = appCtxSvc.ctx.aw_hosting_state;

                    var handler = hostingState.map_selection_type_to_handler[ type ];
                    var parser = hostingState.map_selection_type_to_parser[ type ];

                    if( handler && parser ) {
                        handler.processObjects( selections, parser, selectionTime );
                    }
                } );
            }

            return 'OK';
        }
    } catch ( ex ) {
        logger.error( ex );

        return 'Fail - ' + ex;
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
 * @memberof hostSelection_2014_10
 * @extends hostFactoryService.BaseCallableService
 */
var SelectionProviderProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_SELECTION_PROVIDER_SVC,
        hostServices.VERSION_2014_10 );
};

SelectionProviderProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Invoke the service call in the host.
 *
 * @function callHostMethod
 * @memberof hostSelection_2014_10.SelectionProviderProxy
 *
 * @param {Object} inputData - Object defining input properties used in forming the call to the host-side
 * service.
 * <pre>
 *  {InteropObjectRefArray} objRefList - selection change list.
 * </pre>
 */
SelectionProviderProxy.prototype.callHostMethod = function( inputData ) {
    if( !hostInteropSvc.isStartupComplete() ) {
        return;
    }

    var message = exports.createSelectionMessage();

    message.setSingleSelect( true );

    if( inputData.objRefList ) {
        message.setSelection( inputData.objRefList );
    }

    var payload = JSON.stringify( message );

    this._invokeHostMethod( payload );
};

/**
 * Invoke the service call in the host.
 *
 * @function fireHostEvent
 * @memberof hostSelection_2014_10.SelectionProviderProxy
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
 * @memberof hostSelection_2014_10
 *
 * @returns {SelectionListenerSvc} New instance of the service API object.
 */
export let createSelectionListenerSvc = function() {
    return new SelectionListenerSvc();
};

/**
 * Create new client-side message.
 *
 * @memberof hostSelection_2014_10
 *
 * @returns {SelectionMessage} New instance of the service message object.
 */
export let createSelectionMessage = function() {
    return hostSelection0.createSelectionMessage();
};

/**
 * Create new client-side proxy.
 *
 * @memberof hostSelection_2014_10
 *
 * @returns {SelectionProviderProxy} New instance of the proxy API object.
 */
export let createSelectionProviderProxy = function() {
    return new SelectionProviderProxy();
};

/**
 * Create new middle-level service.
 *
 * @memberof hostSelection_2014_10
 *
 * @returns {UidSelectionTypeHandler} New instance of the API object.
 */
export let createUidSelectionTypeHandler = function() {
    return new UidSelectionTypeHandler();
};

/**
 * Create new middle-level service.
 *
 * @memberof hostSelection_2014_10
 *
 * @returns {UidSelectionParser} New instance of the API object.
 */
export let createUidSelectionParser = function() {
    return new UidSelectionParser();
};

/**
 * Create new middle-level service.
 *
 * @memberof hostSelection_2014_10
 *
 * @returns {FilenameSelectionTypeHandler} New instance of the API object.
 */
export let createFilenameSelectionTypeHandler = function() {
    return new FilenameSelectionTypeHandler();
};

/**
 * Create new middle-level service.
 *
 * @memberof hostSelection_2014_10
 *
 * @returns {FilenameSelectionParser} New instance of the API object.
 */
export let createFilenameSelectionParser = function() {
    return new FilenameSelectionParser();
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostSelection_2014_10
 */
export let registerHostingModule = function() {
    exports.createSelectionListenerSvc().register();

    var hostingState = appCtxSvc.ctx.aw_hosting_state;

    hostingState.map_selection_type_to_handler[ hostBaseRefSvc.UID_TYPE ] = exports.createUidSelectionTypeHandler();
    hostingState.map_selection_type_to_parser[ hostBaseRefSvc.UID_TYPE ] = exports.createUidSelectionParser();

    hostingState.map_selection_type_to_handler[ hostBaseRefSvc.FILENAME_TYPE ] = exports.createFilenameSelectionTypeHandler();
    hostingState.map_selection_type_to_parser[ hostBaseRefSvc.FILENAME_TYPE ] = exports.createFilenameSelectionParser();
};

export default exports = {
    createSelectionListenerSvc,
    createSelectionMessage,
    createSelectionProviderProxy,
    createUidSelectionTypeHandler,
    createUidSelectionParser,
    createFilenameSelectionTypeHandler,
    createFilenameSelectionParser,
    registerHostingModule
};
