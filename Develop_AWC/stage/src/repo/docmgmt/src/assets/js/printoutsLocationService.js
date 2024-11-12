// Copyright (c) 2022 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/printoutsLocationService
 */
import soaService from 'soa/kernel/soaService';
import appCtxService from 'js/appCtxService';
import awSearchService from 'js/awSearchService';

let exports = {};

var userSessionCtx = 'userSession';

export let getDateOffset = function() {
    return new Date( new Date().getTime() ).getTimezoneOffset() * -1;
};

export let getCurrentUser = function() {
    var userSession = appCtxService.getCtx( userSessionCtx );
    if( userSession && userSession.props.user ) {
        return userSession.props.user.uiValues[ 0 ];
    }
};

export let loadData = function( searchInput, columnConfigInput, saveColumnConfigData ) {
    if( !searchInput.searchCriteria ) {
        searchInput.searchCriteria = {};
    }
    searchInput.searchCriteria.OwningUser = exports.getCurrentUser();
    searchInput.searchCriteria.utcOffset = exports.getDateOffset().toString();
    if( !searchInput.searchSortCriteria ) {
        searchInput.searchSortCriteria = [];
    }

    delete searchInput.searchCriteria.searchString;

    if( searchInput.searchSortCriteria.length === 0 ) {
        searchInput.searchSortCriteria.push( {
            fieldName: 'creation_date',
            sortDirection: 'DESC'
        } );
    }

    return soaService.postUnchecked( 'Internal-AWS2-2023-06-Finder', 'performSearchViewModel5', {
        columnConfigInput: columnConfigInput,
        inflateProperties: true,
        saveColumnConfigData: saveColumnConfigData,
        searchInput: searchInput
    } );
};

export let processOutput = ( data, dataCtxNode, searchData ) => {
    awSearchService.processOutput( data, dataCtxNode, searchData );
};

export default exports = {
    getDateOffset,
    getCurrentUser,
    loadData,
    processOutput
};
