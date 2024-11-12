// Copyright (c) 2020 Siemens

/**
 * @module js/autoSaveContextPreferenceService
 */
import autoSaveContextService from 'js/autoSaveContextService';
import appCtxService from 'js/appCtxService';
import preferenceService from 'soa/preferenceService';
import eventBus from 'js/eventBus';

const AUTO_SAVE_PREFERENCE = 'preferences.AWC_Autosave';

export const init = async function() {
    // Subscribe to autosave toggle changes and update preference with new value
    eventBus.subscribe( 'autoSaveToggleChanged', function( isEnabled ) {
        const autoSavePreferenceExists = appCtxService.getCtx( AUTO_SAVE_PREFERENCE );
        if( autoSavePreferenceExists ) {
            preferenceService.setStringValue( 'AUTO_SAVE', [ isEnabled.toString() ] );
        }
    } );

    const updateToggleWithPreferenceValue = function() {
        const autoSavePreferenceValue = appCtxService.getCtx( AUTO_SAVE_PREFERENCE ) && appCtxService.getCtx( AUTO_SAVE_PREFERENCE )[ 0 ];
        autoSaveContextService.setAutoSaveToggle( autoSavePreferenceValue === 'true' );
    };

    // Apply value from preference to autoSave toggle if preference exists
    if( !appCtxService.getCtx( 'preferences' ) ) {
        const preferenceSubscribe = eventBus.subscribe( 'bulkPreferencesLoaded', function() {
            eventBus.unsubscribe( preferenceSubscribe );
            updateToggleWithPreferenceValue();
        } );
    } else {
        updateToggleWithPreferenceValue();
    }
};

export default {
    init
};
