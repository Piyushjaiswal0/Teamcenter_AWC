// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostUserMessaging_2019_12
 * @namespace hostUserMessaging_2019_12
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import notySvc from 'js/NotyModule';
import fireCommandProxy from 'js/hosting/sol/services/hostFireCommand_2018_07';
import _ from 'lodash';
import logger from 'js/logger';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// UserMessagingSvc
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 *  Hosting service to ...
 *
 * @constructor
 * @memberof hostUserMessaging_2019_12
 * @extends hostFactoryService.BaseCallableService
 */
var UserMessagingSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_USER_MESSAGING_SVC,
        hostServices.VERSION_2019_12 );
};

UserMessagingSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * This is an incoming call to this service. Trigger the related event handlers.
 *
 * @function handleIncomingEvent
 * @memberof hostUserMessaging_2019_12.UserMessagingSvc
 *
 * @param {String} jsondata - JSON encoded payload from the host.
 */
UserMessagingSvc.prototype.handleIncomingEvent = function( jsondata ) {
    try {
        var msg = exports.createUserMessagingMsg( jsondata );

        if( msg ) {
            var message = msg.getMessage();
            var buttons = msg.getButtons();

            var buttonArray = [];
            for( var i = 0; i < buttons.length; i++ ) {
                buttonArray.push( {
                    addClass: 'btn btn-notify',
                    text: buttons[ i ],
                    onClick: function( $noty ) {
                        var commandId = this[ '0' ].textContent + '_fired';
                        fireCommandProxy.createFireCommandProxy().fireCommand( commandId, null );
                        $noty.close();
                    }
                } );
            }

            notySvc.showWarning( message, buttonArray );
        }
    } catch ( ex ) {
        logger.error( ex );
    }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// UserMessagingMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The data contract used for the {UserMessagingSvc}.
 *
 * @constructor
 * @memberof hostUserMessaging_2019_12
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var UserMessagingMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2019_12 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

UserMessagingMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current value.
 *
 * @memberof hostUserMessaging_2019_12.UserMessagingMsg
 *
 * @return {String} Property value.
 */
UserMessagingMsg.prototype.getMessage = function() {
    return _.get( this, 'message', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostUserMessaging_2019_12.UserMessagingMsg
 *
 * @param {Boolean} value - Property value.
 */
UserMessagingMsg.prototype.setMessage = function( value ) {
    this.message = value;
};

/**
 * Get buttons
 *
 * @memberof hostUserMessaging_2019_12.UserMessagingMsg
 *
 * @return {String} Property value.
 */
UserMessagingMsg.prototype.getButtons = function() {
    return _.get( this, 'buttons', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostUserMessaging_2019_12.UserMessagingMsg
 *
 * @param {Boolean} value - Property value.
 */
UserMessagingMsg.prototype.setButtons = function( value ) {
    this.buttons = value;
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
 * @memberof hostUserMessaging_2019_12
 *
 * @returns {UserMessagingSvc} New instance of the service message API object.
 */
export let createUserMessagingSvc = function() {
    return new UserMessagingSvc();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostUserMessaging_2019_12
 *
 * @param {String} payload - (Optional) String from the 'host' to use when initializing the message object.
 *
 * @returns {UserMessagingMsg} New instance of the service message object.
 */
export let createUserMessagingMsg = function( payload ) {
    return new UserMessagingMsg( payload );
};

// ---------------------------------------------------------------------------------

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostUserMessaging_2019_12
 */
export let registerHostingModule = function() {
    exports.createUserMessagingSvc().register();
};

export default exports = {
    createUserMessagingSvc,
    createUserMessagingMsg,
    registerHostingModule
};
