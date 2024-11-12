// Copyright (c) 2021 Siemens

import appCtxService from 'js/appCtxService';
import cfgSvc from 'js/configurationService';
import localeService from 'js/localeService';
import { notify } from 'js/centralAggregationService';

const populateHeaderTitle = async() => {
    return await cfgSvc.getCfg( 'solutionDef' ).then( solution => {
        if( solution && solution.browserTitle ) {
            return solution.browserTitle;
        }
        return localeService.getLocalizedText( 'UIMessages', 'browserTitle' ).then(
            browserTitle => {
                return browserTitle;
            } );
    } );
};

export const initializePage = () => {
    appCtxService.registerCtx( 'fullscreenDisabled', true );
    notify({
        widgetInfo: { selectedPageUrl: 'showHome' },
        userGesture: 'onHomeLoad',
        subject: {}
    });
    return populateHeaderTitle().then( browserTitle => {
        return {
            headerTitle: browserTitle
        };
    } );
};

export const cleanupPage = () => {
    appCtxService.registerCtx( 'fullscreenDisabled', false );
};
