// @<COPYRIGHT>@
// ==================================================
// Copyright 2016.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * 
 * 
 * @module js/xrtViewModelUtils
 */
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

export let getUpdatedObjectSetSourceObject = function processEventData( eventData ) {
    var name = eventData.name;

    // Check if event name is not start with "objectSet:" then no need to process further
    if( !_.startsWith( name, "objectSet:" ) ) {
        return null;
    }

    // Get the event value and check if null then no need to process otherwise get the values
    // from value object and use
    var value = eventData.value;
    if( value === null || value === undefined ) {
        return null;
    }

    // Get the source property value that will determine that which object sets to update
    var sources = _.get( value, 'sources' );
    if( sources === null || sources === undefined || sources.length <= 0 ) {
        return null;
    }

    // Get the search criteria to be used to get the results with additional criteria
    var searchCriteria = _.get( value, 'searchCriteria' );

    // Check if search criteria is null then return null from here
    if( searchCriteria === null || searchCriteria === undefined ) {
        return null;
    }

    return sources;
};

export default exports = {
    getUpdatedObjectSetSourceObject
};
