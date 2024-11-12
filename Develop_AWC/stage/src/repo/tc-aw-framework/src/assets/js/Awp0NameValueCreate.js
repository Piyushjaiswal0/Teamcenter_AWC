// @<COPYRIGHT>@
// ==================================================
// Copyright 2021.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import soa_kernel_soaService from 'soa/kernel/soaService';
import dateTimeService from 'js/dateTimeService';
import _ from 'lodash';

/**
 * Fetches all the BO Type Name for Creation of Name Value Property
 * @param {object} response - the soa response
 */
export let loadTypes = function( response ) {
    let boName = [];
    if( response.output ) {
        for( let i = 0; i < response.output.length; i++ ) {
            let output = response.output[ i ];
            _.forEach( output.displayableBOTypeNames, function( bOTypeNameObject ) {
                boName.push( bOTypeNameObject.boName );
            } );
        }
    }
    soa_kernel_soaService.ensureModelTypesLoaded( boName, response );
};

/**
 * Creates the row for the grid of name value
 * @param {Object} nameValueRow - Name value row
 * @return {Object} return the struct for the row creation in the grid
 */
export let createInitialRowData = function( nameValueRow ) {
    return nameValueRow;
};

/**
 * Assign Value to the specific field
 * @param {object} data - the data structure from Json
 * @return {Object} value
 */

export let getRowValue = function( data ) {
    let result = null;
    /**
     *  For double  - Fnd0NameValueDoubleCreI
     *  For boolean - Fnd0NameValueLogicalCreI
     *  For integer - Fnd0NameValueIntCreI
     *  For date    - Fnd0NameValueDateCreI
     *  For string  - Fnd0NameValueStringCreI
     */
    const typeHierarchyArray = data.modelProperty.modelType.typeHierarchyArray;
    const fnd0Value = data.modelProperty.props.fnd0Value;
    if( typeHierarchyArray.includes( 'Fnd0NameValueIntCreI' ) || typeHierarchyArray.includes( 'Fnd0NameValueDoubleCreI' ) ) {
        result = fnd0Value.uiValue;
    } else if( typeHierarchyArray.includes( 'Fnd0NameValueDateCreI' ) ) {
        // swf\core\src\propertyrender\src\js\uwPropertyService.js ( Function setDateValueOnDateApi ).
        // The above code is setting dateApi.dateValue(formatSessionDate) if isDateEnabled is true and isTimeEnabled is false.
        // It is setting dateApi.timeValue(formatSessionTime) if isTimeEnabled is true and isDateEnabled is false.
        // If both date and time are enabled, then it sets the full date(formatSessionDateTime) to the dateApi.dateValue itself.
        if( fnd0Value.dateApi.isTimeEnabled && !fnd0Value.dateApi.isDateEnabled ) {
            result = dateTimeService.formatUTC( fnd0Value.dateApi.timeValue );
        } else {
            result = dateTimeService.formatUTC( fnd0Value.dateApi.dateValue );
        }
    } else if( typeHierarchyArray.includes( 'Fnd0NameValueStringCreI' ) ) {
        result = fnd0Value.dbValue;
    } else if( typeHierarchyArray.includes( 'Fnd0NameValueLogicalCreI' ) ) {
        if( fnd0Value.dbValue === null ) {
            result = false;
        } else {
            result = fnd0Value.dbValue.toString();
        }
    }
    return result;
};

export default {
    loadTypes,
    createInitialRowData,
    getRowValue
};
