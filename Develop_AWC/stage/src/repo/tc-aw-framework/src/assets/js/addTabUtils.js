/* eslint-disable max-lines */
// Copyright (c) 2022 Siemens

/**
 * @module js/addTabUtils
 */
import localeService from 'js/localeService';
import _ from 'lodash';
import cfgSvc from 'js/configurationService';
import { parseCondition } from 'js/conditionParser.service';
import { concat, flatten } from 'lodash';
import { getTabsState } from 'js/AwSelectionSummaryService';

var exports = {};

/**
 * Fetches the localized version of the tab's name and modifies the configuration point information with the result.
 *
 * @param {JSON} tab the configuration point information to extract the key for the localized name from.
 */
const loadTabTitle = tab => {
    if( typeof tab.name !== 'string' ) {
        localeService.getLocalizedText( tab.name.source, tab.name.key ).then( function( result ) {
            tab.name = result;
        } );
    }
};

/**
 * Fetches configuration point information and sets the title of the tab to localized string.
 *
 * @return {JSON} the set up and configured tab's data.
 */
export const getTabConfiguration = async function() {
    return await cfgSvc.getCfg( 'addPanelTabs' ).then( tabsConfig => {
        loadTabTitle( tabsConfig );
        return tabsConfig;
    } );
};

/**
 * Validates visible when condition of optional tabs and makes the tab data available to components.
 *
 * @return {[JSON]} the optional tabs to add to the add panel.
 */
export const initialize = ( ) => {
    return getTabConfiguration().then( tabsConfig => {
        tabsConfig = [ tabsConfig ];
        let tabStateChecker = {
            tabs: tabsConfig
        };
        const { ctxParameters, additionalParameters } = getTabsState( tabStateChecker );
        return { optionalTabs: tabsConfig,
            ctxParameters: ctxParameters,
            additionalParameters: additionalParameters
        };
    } );
};

export default exports = {
    initialize,
    getTabConfiguration
};
