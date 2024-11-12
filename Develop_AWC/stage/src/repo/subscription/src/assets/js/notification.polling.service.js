// Copyright (c) 2022 Siemens

/**
 * Defines {@link notificationPollingService} which manages unread message count.
 *
 * @module js/notification.polling.service
 */
import appCtxService from 'js/appCtxService';
import preferenceSvc from 'soa/preferenceService';
import soaSvc from 'soa/kernel/soaService';
import AwIntervalService from 'js/awIntervalService';
import AwTimeoutService from 'js/awTimeoutService';
import eventBus from 'js/eventBus';

/**
 * Constant notification polling interval preference name
 */
var AWS_NOTIFICATIONS_POLLING_INTERVAL = 'AWS_Notifications_Polling_Interval';

var unreadMessageCount = '';

var pollingInterval = 0;

var initialDelay = 45 * 1000; //miliSecs

/**
 *  update context object
 */
export const updateContext = function( response ) {
    unreadMessageCount = response.messages.length;
    if( unreadMessageCount === 0 ) {
        unreadMessageCount = '';
    }
    if( appCtxService.getCtx( 'unreadMessageCount' ) ) {
        appCtxService.updateCtx( 'unreadMessageCount', unreadMessageCount );
    } else {
        appCtxService.registerCtx( 'unreadMessageCount', unreadMessageCount );
    }
};

/**
 * Set the theme to the theme in local storage or the default theme
 */
export const updateUnreadMessages = function() {
    soaSvc.request( 'Internal-Notification-2015-10-MessageManagement', 'getUnreadMessages', null, {
        checkPartialErrors: true,
        polling: true
    } ).then( function( response ) {
        updateContext( response );
    } ).catch( () => {
        // ignore error for polling call. this may indicate session is idle.
    } );
};

/**
 * setting notification timeout's preference value
 */
function getPollingIntervalFromPref() {
    return preferenceSvc.getStringValue( AWS_NOTIFICATIONS_POLLING_INTERVAL ).then( function( result ) {
        if( result ) {
            result = parseInt( result );
            if( !isNaN( result ) && result > 0 ) {
                pollingInterval = result * 60 * 1000;
                AwTimeoutService.instance( function() {
                    updateUnreadMessages();
                }, initialDelay );
                AwIntervalService.instance( function() {
                    updateUnreadMessages();
                }, pollingInterval );
            } else if( result <= 0 ) {
                pollingInterval = 0;
            }
            eventBus.unsubscribe( 'bulkPreferencesLoaded' );
            return true;
        }
        return false;
    } );
}

/**
 * Initialize the theme service
 */
export const init = function() {
    appCtxService.registerCtx( 'unreadMessageCount', unreadMessageCount );
    getPollingIntervalFromPref().then( function( result ) {
        if( !result ) {
            // sets the notification timeout's preference value only after preference get loaded
            eventBus.subscribe( 'bulkPreferencesLoaded', function() {
                getPollingIntervalFromPref();
            } );
        }
    } );
};

const exports = {
    init,
    updateUnreadMessages,
    updateContext
};

export default exports;
