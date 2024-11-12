// Copyright (c) 2022 Siemens

/**
 *
 * @module js/Sub0UserEventsConfigService
 */
import preferenceSvc from 'soa/preferenceService';
import _ from 'lodash';

/** Preference Name of my events configuration */
var CONST_AWC_followMultiEventConfiguredEventTypes = 'AWC_followMultiEventConfiguredEventTypes'; //$NON-NLS-1$

export let parseResponse = function( response ) {
    return parseInt( response.response[ 0 ].values.values );
};

/**
 * Add the event type to the available list
 * @param {viewModelObject} data - json object
 */

export let addEventToUserConfig = function( data ) {
    var AddObjects = data.dataProviders.availableEventTypesProvider.selectedObjects;
    if( AddObjects.length > 0 ) {
        var prefNewValues = [];

        // Collect already configured events
        var configuredObjects = data.dataProviders.configuredEventTypesProvider.viewModelCollection.loadedVMObjects;
        for( var i = 0; i < configuredObjects.length; i++ ) {
            prefNewValues.push( configuredObjects[ i ].props.eventtype_id.dbValues[ 0 ] );
        }

        // Append selected events from availableEventTypesProvider data provider
        for( var j = 0; j < AddObjects.length; j++ ) {
            prefNewValues.push( AddObjects[ j ].props.eventtype_id.dbValues[ 0 ] );
        }

        // update configuration
        return preferenceSvc.setStringValue( CONST_AWC_followMultiEventConfiguredEventTypes, prefNewValues );
    }
    return null;
};

/**
 * Removes the event type from the configuration
 *
 * @param {viewModelObject} data - json object
 *
 * @param {ViewModelObject} vmo- selected event type object
 *
 *
 */

export let removeEventFromUserConfig = function( data ) {
    var removeObjects = data.dataProviders.configuredEventTypesProvider.selectedObjects;
    if( removeObjects.length > 0 ) {
        var configuredObjects = data.dataProviders.configuredEventTypesProvider.viewModelCollection.loadedVMObjects;
        var remainObjects = _.difference( configuredObjects, removeObjects );

        var prefNewValues = [];
        for( var i = 0; i < remainObjects.length; i++ ) {
            prefNewValues.push( remainObjects[ i ].props.eventtype_id.dbValues[ 0 ] );
        }

        // update configuration
        return preferenceSvc.setStringValue( CONST_AWC_followMultiEventConfiguredEventTypes, prefNewValues );
    }
    return null;
};
const exports = {
    parseResponse,
    addEventToUserConfig,
    removeEventFromUserConfig
};
export default exports;
