// Copyright (c) 2021 Siemens
// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 *
 * @module js/preferredAdvancedSearchService
*/
import _ from 'lodash';
import 'soa/preferenceService';

'use strict';

let INTERNAL_KEYWORD = '_I_N_T_E_R_N_A_L__N_A_M_E_';

/**
 * determining if to show the preferred search settings command group to the logged in user
 * @returns {Boolean} bool value
 */

export let setPreferredSearchesVisibilityInSearchState = ( response ) => {
    return response && response.outputValues && response.outputValues.preferredSearchCheck && response.outputValues.preferredSearchCheck[0] === 'true';
};

/**
 * remove empty value from an array
 * @param {Array} values array with preferred search values
 * @return {Array} newValues - updated array with non-empty values
 */
export let removeEmptyValues = function( values ) {
    var newValues = [];
    _.forEach( values, function( value ) {
        if( value !== '' ) {
            newValues.push( value );
        }
    } );
    return newValues;
};

/**
 * get internal and display values of preferred searches
 * @param {Array} preferredSearches array with preferred search values
 * @return {Object} values - object containing internal and display values of preferred searches
 */
export let getPreferredSearchesInternalAndDisplayValues = ( preferredSearches ) => {
    let dbValues = [];
    let uiValues = [];
    for( let index = 0; index < preferredSearches.length; index++ ) {
        let displayAndInternalValuePair = preferredSearches[ index ].split( INTERNAL_KEYWORD );
        if( displayAndInternalValuePair && displayAndInternalValuePair.length === 2 ) {
            dbValues[ index ] = displayAndInternalValuePair[ 1 ];
            uiValues[ index ] = displayAndInternalValuePair[ 0 ];
        } else {
            dbValues[ index ] = preferredSearches[ index ];
            uiValues[ index ] = preferredSearches[ index ];
        }
    }
    return {
        uiValues: uiValues,
        dbValues: dbValues
    };
};

/**
 * get the preferred searches object containing uiValues and dbValues
 * @param {Object} response SOA response
 * @param {Array} preferredValues view model property for preferred searches
 * @return {Object} values - object containing internal and display values of preferred searches
 */
export let getPreferredSearches = ( response, preferredValues ) => {
    let newPreferredValues = _.cloneDeep( preferredValues );
    if( response && response.outputValues && response.outputValues.getQRYColumnsShownPref && response.outputValues.getQRYColumnsShownPref.length > 0 ) {
        let nonEmptyPreferredValues = preferredAdvancedSearchService.removeEmptyValues( response.outputValues.getQRYColumnsShownPref );
        newPreferredValues = preferredAdvancedSearchService.getPreferredSearchesInternalAndDisplayValues( nonEmptyPreferredValues );
    } else {
        newPreferredValues.dbValues = [];
        newPreferredValues.uiValues = [];
    }
    return newPreferredValues;
};

/**
 * get the status of the current selected saved query - whether it is preferred or not
 * @param {Object} preferredSearch current selected saved query view model object for preferred search
 * @param {Array} preferredValues view model property for preferred searches list
 * @param {Object} savedQueryDbValue internal value of the current selected saved query
 * @return {Object} newPreferredSearch - updated value for preferredSearch variable
 */
export let getPreferredSearchStatus = ( preferredSearch, preferredValues, savedQueryDbValue ) => {
    let newPreferredSearch = _.cloneDeep( preferredSearch );
    var exists = preferredAdvancedSearchService.existsInArray( preferredValues.dbValues, savedQueryDbValue );
    newPreferredSearch.dbValue = exists;
    return newPreferredSearch;
};

/**
 * get the status of the current selected saved query after tagging/untagging it
 * @param {Object} preferredSearch current selected saved query view model object for preferred search
 * @param {Boolean} isCurrentSelectedQueryPreferred whether the current selected query is being tagged or untagged.
 * @return {Object} newPreferredSearch - updated value for preferredSearch variable containing the status of the toggle button
 */
export let togglePreferredStatus = ( preferredSearch, isCurrentSelectedQueryPreferred ) => {
    let newPreferredSearch = _.cloneDeep( preferredSearch );
    newPreferredSearch.dbValue = !isCurrentSelectedQueryPreferred;
    return newPreferredSearch;
};

/**
 * check if the given savedQueryDbValue is in the preferred searches list
 * @param {Object} savedQueryDbValue current selected saved query db value
 * @param {Object} preferredValues preferred searches list
 * @return {Boolean} newPreferredSearch - if the current saved query selected is preferred or not
 */
export let isSavedQueryPreferred = ( savedQueryDbValue, preferredValues ) => {
    return preferredAdvancedSearchService.existsInArray( preferredValues.dbValues, savedQueryDbValue );
};

/**
 * a value exists in an array or not
 * @param {Array} array array of values
 * @param {Object} value the value to be searched
 * @return {Boolean} if the value exists in the array or not
 */
export let existsInArray = ( array, value ) => {
    var exist = _.indexOf( array, value );
    if( exist > -1 ) {
        return true;
    }
    return false;
};

const preferredAdvancedSearchService = {
    removeEmptyValues,
    getPreferredSearches,
    getPreferredSearchStatus,
    togglePreferredStatus,
    existsInArray,
    isSavedQueryPreferred,
    setPreferredSearchesVisibilityInSearchState,
    getPreferredSearchesInternalAndDisplayValues
};

export default preferredAdvancedSearchService;

