// Copyright (c) 2022 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Dma1SetBaseURLService
 */
import preferenceService from 'soa/preferenceService';
import browserUtils from 'js/browserUtils';
import soaService from 'soa/kernel/soaService';

var exports = {};

/**
 * Initialize the AW base URL preference
 * @returns {Promise} the promise
 */
export let setBaseURL = function() {
    /**
     * Get the preference value for the AW base URL
     */
    const preferenceName = 'AW_BASE_URL';
    return preferenceService.getStringValue( preferenceName ).then( function( prefSvcResult ) {
        if( prefSvcResult === null || prefSvcResult.length === 0 || !prefSvcResult.startsWith( 'http' ) ) {
            // the preference is not set, so we must set it
            let preferenceInput = [ {
                preferenceName: preferenceName,
                values: [ browserUtils.getBaseURL() ]
            } ];
            soaService.post( 'Administration-2012-09-PreferenceManagement', 'setPreferences2', { preferenceInput: preferenceInput } );
        }
    } );
};

export default exports = {
    setBaseURL
};
