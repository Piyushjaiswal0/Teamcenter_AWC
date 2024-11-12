// Copyright (c) 2022 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/showMyReportsService
 */
import appCtxService from 'js/appCtxService';
import awSearchService from 'js/awSearchService';

var exports = {};
var userSessionCtx = 'userSession';
var FIND_LIST_SEPERATOR = ';';

export let getDateOffset = function() {
    return new Date( new Date().getTime() ).getTimezoneOffset() * -1;
};

export let getCurrentUser = function() {
    var userSession = appCtxService.getCtx( userSessionCtx );
    if( userSession && userSession.props.user ) {
        return userSession.props.user.uiValues[ 0 ];
    }
};

export let processOutput = function( data, dataCtxNode, searchData ) {
    awSearchService.processOutput( data, dataCtxNode, searchData );
};

/**
 * @param  {any} startIndex - The start Index.
 *
 * @returns {any} searchCriteria - The search criteria.
 */
export let getSearchCriteria = function( startIndex ) {
    var searchResponseInfo = appCtxService.getCtx( 'searchResponseInfo' );
    var searchCriteria = {};
    if( appCtxService.ctx.preferences.WSOM_find_list_separator && appCtxService.ctx.preferences.WSOM_find_list_separator[0] ) {
        FIND_LIST_SEPERATOR = appCtxService.ctx.preferences.WSOM_find_list_separator[0];
    }
    searchCriteria.DatasetType = 'CrfOutputHtml' + FIND_LIST_SEPERATOR + 'CrfOutputText' + FIND_LIST_SEPERATOR + 'CrfOutputExcel';

    searchCriteria.queryName = 'Dataset...';
    searchCriteria.searchID = 'REPORTSDATASETSEARCH';
    searchCriteria.typeOfSearch = 'ADVANCED_SEARCH';
    searchCriteria.utcOffset = getDateOffset().toString();
    searchCriteria.OwningUser = getCurrentUser();

    if( searchResponseInfo && startIndex > 0 ) {
        //it's a scrolling case
        searchCriteria.totalObjectsFoundReportedToClient = searchResponseInfo.totalFound.toString();
        searchCriteria.lastEndIndex = searchResponseInfo.lastEndIndex.toString();
    } else {
        searchCriteria.totalObjectsFoundReportedToClient = '0';
        searchCriteria.lastEndIndex = '0';
    }

    return searchCriteria;
};
/**
 * @param  {any} sortCriteria - The sort criteria
 * @param  {any} columnCriteria - The column criteria
 * @returns {any} sortCriteria - The sort criteria
 */
export let getSortCriteria = function( sortCriteria, columnCriteria ) {
    if( !sortCriteria ) {
        sortCriteria = [];
    }

    if( columnCriteria.length !== 0 ) {
        sortCriteria.push( {
            fieldName: columnCriteria[ 0 ].fieldName,
            sortDirection: columnCriteria[ 0 ].sortDirection
        } );
    } else {
        sortCriteria.push( {
            fieldName: 'creation_date',
            sortDirection: 'DESC'
        } );
    }

    return sortCriteria;
};

export let getActionName = function( response ) {
    var defaultAction = 'showMyDashboard';
    if( response && response.ServiceData.modelObjects ) {
        var tileObj = Object.values( response.ServiceData.modelObjects )[ 0 ];
        defaultAction = tileObj.props.awp0Action.dbValues[0];
    }
    return defaultAction;
};

export default exports = {
    getDateOffset,
    getSearchCriteria,
    getCurrentUser,
    getSortCriteria,
    processOutput,
    getActionName
};
