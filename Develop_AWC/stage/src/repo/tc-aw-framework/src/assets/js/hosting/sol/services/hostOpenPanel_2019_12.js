// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostOpenPanel_2019_12
 * @namespace hostOpenPanel_2019_12
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import commmandPanelSvc from 'js/commandPanel.service';
import _ from 'lodash';
import hostServices from 'js/hosting/hostConst_Services';
import logger from 'js/logger';

/**
 *  Hosting service to ...
 *
 *  @constructor
 *  @memberof hostFileTicket_2014_10
 *  @extends hostFactoryService.BaseCallableService
 */
var OpenPanelSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_OPEN_PANEL_SVC,
        hostServices.VERSION_2019_12 );
};

OpenPanelSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * This is an incoming call to this service. Trigger the related event handlers.
 *
 * @function handleIncomingEvent
 * @memberof hostFileTicket_2014_10.OpenPanelSvc
 *
 * @param {String} jsonData - JSON encoded payload from the host.
 */
OpenPanelSvc.prototype.handleIncomingEvent = function( jsonData ) {
    try {
        var msg = exports.createOpenPanelMsg( jsonData );

        if( msg ) {
            commmandPanelSvc.activateCommandPanel( msg.getPanelID(), msg.getLocation() );
        }
    } catch ( ex ) {
        logger.error( ex );
    }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// OpenPanelMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends the open panel request
 * <P>
 * The message has panel ID, and location to display the panel
 *
 * @constructor
 * @memberof hostOpenPanel_2019_12
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var OpenPanelMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2016_03 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

OpenPanelMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get panel ID
 *
 * @memberof hostOpenPanel_2019_12.OpenPanelMsg
 *
 * @return {String} panel ID
 */
OpenPanelMsg.prototype.getPanelID = function() {
    return _.get( this, 'PanelID', null );
};

/**
 * Set currrent panel ID
 *
 * @memberof hostOpenPanel_2019_12.OpenPanelMsg
 *
 * @param {String} panelID - ID of the panel to be opened
 */
OpenPanelMsg.prototype.setPanelID = function( panelID ) {
    this.PanelID = panelID;
};

/**
 * Get the location
 *
 * @memberof hostOpenPanel_2019_12.OpenPanelMsg
 *
 * @return {String} location
 */
OpenPanelMsg.prototype.getLocation = function() {
    return _.get( this, 'Location', null );
};

/**
 * Set currrent panel ID
 *
 * @memberof hostOpenPanel_2019_12.OpenPanelMsg
 *
 * @param {String} location - location to open the panel
 */
OpenPanelMsg.prototype.setLocation = function( location ) {
    this.Location = location;
};

var exports = {};

/**
 * Return a new instance of this class.
 *
 * @memberof hostFileTicket_2014_10
 *
 * @returns {GetTicketSvc} New instance of the service message API object.
 */
export let createOpenPanelSvc = function() {
    return new OpenPanelSvc();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostOpenPanel_2019_12
 *
 * @param {String} payload - (Optional) JSON encoded String to use when initializing the message object.
 *
 * @returns {OpenPanelMsg} New instance of the service message object.
 */
export let createOpenPanelMsg = function( payload ) {
    return new OpenPanelMsg( payload );
};

// ---------------------------------------------------------------------------------

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostOpenPanel_2019_12
 */
export let registerHostingModule = function() {
    exports.createOpenPanelSvc().register();
};

export default exports = {
    createOpenPanelSvc,
    createOpenPanelMsg,
    registerHostingModule
};
