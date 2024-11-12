// Copyright (c) 2022 Siemens

/**
 * This is a contribution for a login process blocking step definition
 *
 * @module js/geographyLoginPipelineContrib
 */
import tcSesnData from 'js/TcSessionData';

var contribution = {
    getPipelineStepDefinition: function() {
        // get the service

        var geographyStepDefn = {
            name: 'PickGeography',
            priority: 40,
            active: false,
            routeName: 'pickGeography', // either routeName or workFunction, not both
            workFunction: null
        };

        if( tcSesnData.displayCurrentCountry() ) {
            geographyStepDefn.active = true;
        }

        return geographyStepDefn;
    }
};

export default function( key, deferred ) {
    if( key === 'postLoginPipeline' ) {
        deferred.resolve( contribution );
    } else {
        deferred.resolve();
    }
}
