// Copyright (c) 2022 Siemens

/**
 * @module js/aw.subscription.settings.service
 */
import preferenceSvc from 'soa/preferenceService';
import appCtxService from 'js/appCtxService';
import soaSvc from 'soa/kernel/soaService';
import _ from 'lodash';

/** Preference Name of notification mode */
var SCM_NOTIFICATION_MODE = 'SCM_notification_mode'; //$NON-NLS-1$

/** Preference Name of periodic notification digest */
var SCM_NOTIFICATION_DIGEST = 'SCM_notification_digest'; //$NON-NLS-1$

/** Preference Name of newsfeed message purging threshold */
var SCM_NEWSFEED_PURGE_THRESHOLD = 'SCM_newsfeed_purge_threshold'; //$NON-NLS-1$

export let getNotificationMode = function( data ) {
    var newData = _.cloneDeep( data );
    var notificationModeValues = [
        { propDisplayValue : newData.i18n.emailNotificationText, dispValue : newData.i18n.emailNotificationText, propInternalValue : '1' },
        { propDisplayValue : newData.i18n.newsfeedNotificationText, dispValue : newData.i18n.newsfeedNotificationText, propInternalValue : '2' },
        { propDisplayValue : newData.i18n.allNotificationsText, dispValue : newData.i18n.allNotificationsText, propInternalValue : '3' }
    ];
    newData.notificationModeValues.dbValue = notificationModeValues;
    return preferenceSvc.getStringValue( SCM_NOTIFICATION_MODE )
        .then(
            function( prefValue ) {
                if( prefValue ) {
                    if( prefValue.length > 0 ) {
                        var result = newData.notificationModeValues.dbValue.filter( ( elem ) => {
                            return elem.propInternalValue === prefValue[0];
                        } );
                        newData.notificationModes.dbValue = prefValue[0];
                        newData.notificationModes.uiValue = result[0].dispValue;
                    }
                    return newData;
                }
            } );
};

/**
 * When user-> profile page is loaded it will read the preference value and mark the checkbox true and false.
 */
export let loadPreference = function( data ) {
    var newData = _.cloneDeep( data );
    var notificationDigestPref = appCtxService.getCtx( 'preferences.SCM_notification_digest' );
    if( notificationDigestPref ) {
        newData.usePeriodicDigest.dbValue = notificationDigestPref[ 0 ] === '2';
    }

    return soaSvc.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'getPreferences', {
        preferenceNames: [ SCM_NEWSFEED_PURGE_THRESHOLD ],
        includePreferenceDescriptions: false
    }, {} ).then(
        function( result ) {
            if( result.response.length > 0 ) { // Preference Found
                newData.isNewsfeedPurgeAvailable = true;
                var dbValue = '';
                var displayValue = '';
                if( result.response[ 0 ].values.values && result.response[ 0 ].values.values > 0 ) {
                    dbValue = result.response[ 0 ].values.values[ 0 ];
                    displayValue = dbValue;
                } else if( result.response[ 0 ].values.values < 0 ) {
                    displayValue = newData.i18n.invalidConfigurationValueLabel;
                    dbValue = result.response[ 0 ].values.values[ 0 ];
                } else {
                    displayValue = newData.i18n.keepAlwaysValueLabel;
                    dbValue = result.response[ 0 ].values.values ? result.response[ 0 ].values.values[ 0 ] : '';
                }
                newData.newsfeedPurgeThreshold.dbValue = dbValue;
                newData.newsfeedPurgeThreshold.uiValue = displayValue;
                var newsfeedPurgePrefVal = [];
                newsfeedPurgePrefVal[ 0 ] = dbValue;
                appCtxService.updateCtx( 'preferences.SCM_newsfeed_purge_threshold', newsfeedPurgePrefVal );
            } else { // Preference not found
                newData.isNewsfeedPurgeAvailable = false;
            }
            return newData;
        } );
};

/**
 * Sets the purge threshold for newsfeed message preference
 * setPreferences2 to update the preference value.
 */
export let setNewsFeedPurgeThreshold = function( data, newsfeedPurgeThreshold ) {
    var newData = _.cloneDeep( data );
    var prefValue = appCtxService.getCtx( 'preferences.SCM_newsfeed_purge_threshold' );
    newData.newsfeedPurgeError = '';

    if( prefValue && newData.newsfeedPurgeThreshold.dbValue === prefValue[ 0 ] ) {
        newData.newsfeedPurgeError = null;
        return newData;
    }
    //data.newsfeedPurgeThreshold.validationCriteria[ 0 ] === null
    if( newData.newsfeedPurgeThreshold.dbValue >= 0 && (
        newData.newsfeedPurgeThreshold.error === '' || newData.newsfeedPurgeThreshold.error === null ) ) {
        if( newData.newsfeedPurgeThreshold.dbValue === '' || newData.newsfeedPurgeThreshold.dbValue === 0 ) {
            newData.newsfeedPurgeThreshold.uiValue = newData.i18n.keepAlwaysValueLabel;
        }
        var newsfeedPurgeValue = [];
        newsfeedPurgeValue[ 0 ] = newData.newsfeedPurgeThreshold.dbValue.toString();
        appCtxService.updateCtx( 'preferences.SCM_newsfeed_purge_threshold', newsfeedPurgeValue );
        newData.newsfeedPurgeError = '';
        preferenceSvc.setStringValue( SCM_NEWSFEED_PURGE_THRESHOLD,
            newsfeedPurgeValue );
        return newData;
    }
    if( prefValue ) {
        newData.newsfeedPurgeThreshold.error = null;
        newData.newsfeedPurgeError = newData.i18n.invalidConfigurationValueLabel;
        newData.newsfeedPurgeThreshold.dbValue = prefValue[ 0 ];
        newsfeedPurgeThreshold.update( prefValue[ 0 ] );
        if( prefValue[ 0 ] === '' || prefValue[ 0 ] === 0 || prefValue[ 0 ] === '0' ) {
            newData.newsfeedPurgeThreshold.uiValue = newData.i18n.keepAlwaysValueLabel;
        } else if( prefValue[ 0 ] < 0 ) {
            newData.newsfeedPurgeThreshold.uiValue = newData.i18n.invalidConfigurationValueLabel;
        } else {
            newData.newsfeedPurgeThreshold.uiValue = prefValue[ 0 ];
        }
    }
    return newData;
};

/**
 * Resets the purge threshold for newsfeed message preference
 * On cancel Edits.
 */
export let resetNewsFeedPurgeThreshold = function( data, newsfeedPurgeThreshold ) {
    var newData = _.cloneDeep( data );
    var prefValue = appCtxService.getCtx( 'preferences.SCM_newsfeed_purge_threshold' );
    newData.newsfeedPurgeError = '';
    if( prefValue ) {
        newData.newsfeedPurgeThreshold.dbValue = prefValue[ 0 ];
        newsfeedPurgeThreshold.update( prefValue[ 0 ] );
        if( prefValue[ 0 ] === '' || prefValue[ 0 ] === 0 || prefValue[ 0 ] === '0' ) {
            newData.newsfeedPurgeThreshold.uiValue = newData.i18n.keepAlwaysValueLabel;
        } else if( prefValue[ 0 ] < 0 ) {
            newData.newsfeedPurgeThreshold.uiValue = newData.i18n.invalidConfigurationValueLabel;
        } else {
            newData.newsfeedPurgeThreshold.uiValue = prefValue[ 0 ];
        }
    }
    return newData;
};

/**
 * If user modifies the periodic digest settings than it will update the context value and make a SOA call
 * setPreferences2 to update the preference value.
 */
export let usePeriodicDigestClick = function( data ) {
    var newData = _.cloneDeep( data );
    var usePeriodicDigestValue = newData.usePeriodicDigest.dbValue;
    newData.periodicDigest = '1';
    if( usePeriodicDigestValue === true ) {
        newData.periodicDigest = '2';
    }
    return preferenceSvc.getStringValue( SCM_NOTIFICATION_DIGEST ).then(
        function( prefValue ) {
            if( _.isNull( prefValue ) || _.isUndefined( prefValue ) || prefValue !== newData.periodicDigest ) {
                var prefValue = [];
                prefValue[ 0 ] = newData.periodicDigest;
                appCtxService.updateCtx( 'preferences.SCM_notification_digest', prefValue );
                preferenceSvc.setStringValue( SCM_NOTIFICATION_DIGEST,
                    prefValue );
                return newData;
            }
            return newData;
        } );
};

/**
 * If user modifies the notification method than it will update the context value and make a SOA call
 * setPreferences2 to update the preference value.
 */
export let notificationModeUpdated = function( data ) {
    return preferenceSvc.getStringValue( SCM_NOTIFICATION_MODE )
        .then(
            function( prefValue ) {
                if( _.isNull( prefValue ) || _.isUndefined( prefValue ) ||
                    prefValue !== data.notificationModes.dbValue ) {
                    var notificationMode = [];
                    notificationMode[ 0 ] = data.notificationModes.dbValue;
                    appCtxService.updateCtx( 'preferences.SCM_notification_mode', notificationMode );
                    return preferenceSvc.setStringValue( SCM_NOTIFICATION_MODE,
                        notificationMode );
                }
                return null;
            } );
};

const exports = {
    getNotificationMode,
    loadPreference,
    setNewsFeedPurgeThreshold,
    resetNewsFeedPurgeThreshold,
    usePeriodicDigestClick,
    notificationModeUpdated
};
export default exports;
