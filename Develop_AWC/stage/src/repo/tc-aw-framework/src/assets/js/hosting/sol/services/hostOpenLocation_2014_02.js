// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostOpenLocation_2014_02
 * @namespace hostOpenLocation_2014_02
 */
import AwStateService from 'js/awStateService';
import hostFactorySvc from 'js/hosting/hostFactoryService';
import _ from 'lodash';
import logger from 'js/logger';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// OpenLocationMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Definition of the JSON data moved to/from the {@link OpenLocationSvc}.
 *
 * @constructor
 * @memberof hostOpenLocation_2014_02
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) JSON encoded data to set as the properties of the new instance.
 */
var OpenLocationMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2014_02 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

OpenLocationMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current value.
 *
 * @memberof hostOpenLocation_2014_02.OpenLocationMsg
 *
 * @return {String} Location property value.
 */
OpenLocationMsg.prototype.getLocation = function() {
    return _.get( this, 'location', null );
};

/**
 * Set current value.
 *
 * @memberof hostOpenLocation_2014_02.OpenLocationMsg
 *
 * @param {String} location - location property value.
 */
OpenLocationMsg.prototype.setLocation = function( location ) {
    this.location = location;
};

/**
 * Get current value.
 *
 * @memberof hostOpenLocation_2014_02.OpenLocationMsg
 *
 * @return {InteropObjectRefArray} OpenItems property value.
 */
OpenLocationMsg.prototype.getOpenComponent = function() {
    return _.get( this, 'OpenComponent', null );
};

/**
 * Set current value.
 *
 * @memberof hostOpenLocation_2014_02.OpenLocationMsg
 *
 * @param {InteropObjectRefArray} list - OpenTargets property value.
 */
OpenLocationMsg.prototype.setOpenComponent = function( list ) {
    this.OpenComponent = list;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// OpenLocationSvc
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 *  Hosting service to display given page for identified object.
 *
 * @constructor
 * @memberof hostOpenLocation_2014_02
 * @extends hostFactoryService.BaseCallableService
 */
var OpenLocationSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_OPEN_LOCATION_SERVICE,
        hostServices.VERSION_2014_02 );
};

OpenLocationSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * This is an incoming call to this service trigger the related event handlers.
 *
 * @function handleIncomingEvent
 * @memberof hostOpenLocation_2014_02.OpenLocationSvc
 *
 * @param {String} jsondata - JSON encoded payload from the host.
 */
OpenLocationSvc.prototype.handleIncomingEvent = function( jsondata ) {
    try {
        // attempt to deserialize the input data contract.
        var msg = exports.createOpenLocationMsg( jsondata );

        if( msg ) {
            var locationRoute = msg.getLocation();

            if( locationRoute ) {
                var route = locationRoute.replace( /\./g, '_' );

                var componentList = msg.getOpenComponent();

                var compUIDs = [];

                _.forEach( componentList, function( objRef ) {
                    if( objRef.ObjId ) {
                        compUIDs.push( objRef.ObjId );
                    }
                } );

                var uids = compUIDs.join( ';' );

                // if we got a target, then trigger the display.
                if( uids ) {
                    AwStateService.instance.go( route, {
                        uid: uids
                    }, { inherit: false } );
                } else {
                    AwStateService.instance.go( route );
                }
            }
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
 * Create new client-side service.
 *
 * @memberof hostOpenLocation_2014_02
 *
 * @returns {OpenLocationSvc} New instance of the service message object.
 */
export let createOpenLocationSvc = function() {
    return new OpenLocationSvc();
};

/**
 * Create new client-side message.
 *
 * @memberof hostOpenLocation_2014_02
 *
 * @param {String} jsonString - (Optional) JSON encoded data to set as the properties of the new instance.
 *
 * @returns {OpenLocationMsg} New instance of the service message object.
 */
export let createOpenLocationMsg = function( jsonString ) {
    return new OpenLocationMsg( jsonString );
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostOpenLocation_2014_02
 */
export let registerHostingModule = function() {
    exports.createOpenLocationSvc().register();
};

export default exports = {
    createOpenLocationSvc,
    createOpenLocationMsg,
    registerHostingModule
};
