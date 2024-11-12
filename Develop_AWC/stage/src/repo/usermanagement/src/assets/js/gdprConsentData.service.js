// Copyright (c) 2022 Siemens

/**
 * This represents the data handling for the GDPR Consent Page interactions
 *
 * @module js/gdprConsentData.service
 */
import soaSvc from 'soa/kernel/soaService';

var exports = {};
/*
 * service call to record user consent
 *
 * @param {String} acceptedConsent - record GDPR Concent status
 */
export let recordUserConsent = function( acceptedConsent ) {
    var input = {
        userConsent: acceptedConsent
    };
    return soaSvc.post( 'Administration-2018-11-OrganizationManagement', 'recordUserConsent', input ).then(
        function( resp ) {
            return resp;
        },
        function( errObj ) {
            var msg = errObj;
            // default to the full Error object, but if there is a message prop, use that.
            if( errObj && errObj.message ) {
                msg = errObj.message;
            }
        } );
};

export let setConsentStatement = function( response ) {
    var consentStatement = response.consentStatement;
    document.getElementById( 'ConsentStatement' ).innerHTML = consentStatement;
};

exports = {
    setConsentStatement,
    recordUserConsent
};

export default exports;
