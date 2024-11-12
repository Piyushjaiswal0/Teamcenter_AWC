// Copyright (c) 2022 Siemens

/**
 * This is a contribution for a login process blocking step definition
 *
 * @module js/gdprConsentPipelineContrib
 */
import appCtxSvc from 'js/appCtxService';

var contribution = {
    getPipelineStepDefinition: function() {
        // get the service

        var gdprConsentStepDefn = {
            name: 'GDPRConsent',
            active: false,
            routeName: 'gdprConsent', // either routeName or workFunction, not both
            workFunction: null
        };

        if( appCtxSvc.ctx.userSession.props.fnd0ShowGDPR && appCtxSvc.ctx.userSession.props.fnd0ShowGDPR.dbValues[ 0 ] === '1' ) {
            gdprConsentStepDefn.active = true;
        }

        return gdprConsentStepDefn;
    }
};

export default function( key, deferred ) {
    if( key === 'postLoginPipeline' ) {
        deferred.resolve( contribution );
    } else {
        deferred.resolve();
    }
}
