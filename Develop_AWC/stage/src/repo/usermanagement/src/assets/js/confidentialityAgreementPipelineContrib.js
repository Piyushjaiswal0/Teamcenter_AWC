// Copyright (c) 2022 Siemens

/**
 * This is a contribution for a login process blocking step definition
 *
 * @module js/confidentialityAgreementPipelineContrib
 */
var contribution = {
    getPipelineStepDefinition: function() {
        // get the service

        var confAgreementStepDefn = {
            name: 'ConfidentialityAgreement',
            active: false,
            routeName: 'confidentialityAgreement', // either routeName or workFunction, not both
            workFunction: null
        };

        confAgreementStepDefn.active = true;

        return confAgreementStepDefn;
    }
};

export default function( key, deferred ) {
    if( key === 'postLoginPipeline' ) {
        deferred.resolve( contribution );
    } else {
        deferred.resolve();
    }
}
