// @<COPYRIGHT>@
// ===========================================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ===========================================================================
// @<COPYRIGHT>@

/* global
 */

/**
 * A service that has implementation for Contents Section for Active Folder in Secondary work area.
 *
 * @module js/Awp0SearchFolderOverviewService
 */

import soaService from 'soa/kernel/soaService';
import searchCommonUtils from 'js/searchCommonUtils';
import searchFolderCommonService from 'js/searchFolderCommonService';
import appCtxService from 'js/appCtxService';
import awSearchService from 'js/awSearchService';
import advancedSearchUtils from 'js/advancedSearchUtils';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var getPropertiesServiceName = 'Core-2006-03-DataManagement';
var getPropertiesSOAName = 'getProperties';
var clientScopeURIFullTextSearch = 'Awp0SearchResults';
var clientScopeURIAdvancedSearch = 'Awp0AdvancedSearch';

var policyForSearchTypeAttribute = {
    types: [  {
        name: 'Awp0SearchFolder',
        properties: [ {
            name: 'awp0SearchType'
        } ]
    } ]
};
/**
  *  update the display for criteria and filters
  * @function updateOverviewCriteriaAndFilters
  *
  * @param {Object}data - view model data
  * @param {Object}eventData - eventData
  */
export let updateOverviewCriteriaAndFilters = function( data, eventData ) {
    if ( !( eventData.awp0SearchType && eventData.awp0SearchType.dbValues && eventData.awp0SearchType.dbValues.length > 0 ) ) {
        return;
    }
    let awp0SearchType = eventData.awp0SearchType.dbValues[ 0 ];
    let awp0Rule = eventData.awp0Rule;
    let uiValues = awp0Rule.uiValues;
    if(  awp0SearchType === '1' || awp0SearchType === '3'  ) {
        let criteria = uiValues[ 0 ];
        data.searchFolderCriteria.uiValue = criteria.substring( criteria.indexOf( ':' ) + 1, criteria.length );
    } else if( awp0SearchType === '2' ) {
        data.searchFolderCriteria.uiValue = uiValues[ 0 ];
    }
    if ( awp0SearchType === '2' ) {
        let uiValue1 = searchFolderCommonService.processAttributes( uiValues );
        data.searchFolderFilters.uiValue = uiValue1 ? _.join( uiValue1, '\n' ) : '';
    } else{
        let uiValue2 = _.slice( uiValues, 1, uiValues.length );
        data.searchFolderFilters.uiValue = uiValue2 ? _.join( uiValue2, '\n' ) : '';
    }
    return data;
};
/**
  * getProperties SOA call to get the awp0IsShared property for the selected Active Folder.
  * @param {Array} objects - array of objects , each with its uid and type.
  * @param {Array} attributes - array of attributes , which are being asked from the server.
  * @param {Object} data - view model data.
  */
export let getPropertiesForAwp0SearchType = function( objects, attributes, data ) {
    let searchState = {};
    if( appCtxService.ctx.editInProgress ) {
        return searchState;
    }
    var objectUID = objects[0].uid;
    return soaService.post( getPropertiesServiceName, getPropertiesSOAName, {
        objects: objects,
        attributes: attributes
    }, policyForSearchTypeAttribute ).then( function( response ) {
        var modelObject = null;
        if( response && response.modelObjects ) {
            modelObject = response.modelObjects[objectUID];
        }

        var defaultValue;
        if( modelObject && modelObject.props ) {
            var props = modelObject.props;
            defaultValue = props.awp0SearchType;
            let eventData = {
                awp0SearchType: props.awp0SearchType,
                awp0Rule: props.awp0Rule
            };
            eventBus.publish( 'searchFolder.updateCriteriaAndFilters', eventData );
        }

        searchState.clientScopeURI = clientScopeURIFullTextSearch;
        if( defaultValue ) {
            searchState.awp0SearchType = defaultValue.dbValues[ 0 ];
            if( defaultValue.dbValues[ 0 ] && ( defaultValue.dbValues[ 0 ] === '1' || defaultValue.dbValues[ 0 ] === '3' ) ) {
                searchState.clientScopeURI = clientScopeURIFullTextSearch;
                searchState.columnConfigId = 'searchResultsColConfig';
            } else if ( defaultValue.dbValues[ 0 ] && defaultValue.dbValues[ 0 ] === '2' ) {
                searchState.clientScopeURI = clientScopeURIAdvancedSearch;
                searchState.columnConfigId = 'advancedSearchResultsColConfig';
            }
            searchState.callDataProvider = true;
        }
        return searchState;
    } );
};

export const processOutput1 = ( data, dataCtxNode, searchData ) => {
    const newSearchData = Awp0SearchFolderOverviewService.processOutput( data, dataCtxNode, searchData );
    newSearchData.exportPanelContext = Awp0SearchFolderOverviewService.setExportPanelContextForSearchFolder1( data, dataCtxNode, dataCtxNode.dataProviders );
    searchData.update( newSearchData );
};

export const processOutput2 = ( data, dataCtxNode, searchData ) => {
    const newSearchData = Awp0SearchFolderOverviewService.processOutput( data, dataCtxNode, searchData );
    newSearchData.exportPanelContext = Awp0SearchFolderOverviewService.setExportPanelContextForSearchFolder2( data, dataCtxNode, dataCtxNode.dataProviders );
    searchData.update( newSearchData );
};

export const processOutput = ( data, dataCtxNode, searchData ) => {
    const newSearchData = { ...searchData.value };
    newSearchData.totalFound = data.totalFound;
    newSearchData.totalLoaded = data.totalLoaded;
    newSearchData.endIndex = data.endIndex;
    newSearchData.startIndex = data.cursor.startIndex;
    newSearchData.cursorInfo = data.cursor;
    newSearchData.cursorInfo.totalFound = data.totalFound;
    newSearchData.cursorInfo.totalLoaded = data.totalLoaded;
    newSearchData.cursorInfoString = JSON.stringify( newSearchData.cursorInfo );
    newSearchData.additionalSearchInfoMap = data.additionalSearchInfoMap;
    newSearchData.columnConfig = data.columnConfig;
    newSearchData.propDescriptors = data.propDescriptors;
    newSearchData.additionalInfoMessages = awSearchService.getInfoMessages( data );
    newSearchData.thresholdExceeded = awSearchService.getThresholdState( data );
    if( dataCtxNode && dataCtxNode.searchState && dataCtxNode.searchState.awp0SearchType === '2' ) {
        newSearchData.showIntermediateResultCount = true;
        newSearchData.WSOMFindSetSearchLimit = advancedSearchUtils.getWSOMFindSetSearchLimit();
    }
    return newSearchData;
};
/**
  * Get the default page size used for max to load/return.
  * @param {Array|Object} defaultPageSizePreference - default page size from server preferences
  * @returns {Number} The amount of objects to return from a server SOA response.
  */
export let getDefaultPageSize = function( defaultPageSizePreference ) {
    return searchCommonUtils.getDefaultPageSize( defaultPageSizePreference );
};

/**
  * Get the correct sortCriteria constructed for Full Text Search related Contents section for Active Folder.
  * @param {Array} sortCriteria - sort criteria constructed from view model.
  * @param {String} clientScopeURI - client scope.
  * @param {Object} columnConfig - columns returned in SOA response.
  * @returns {Array} The sort criteria containing TypeName.propName for Full Text Search, same as input sort criteria if otherwise.
  */
export let getSearchFolderContentsSortCriteria = function( sortCriteria, clientScopeURI, columnConfig ) {
    if( clientScopeURI === clientScopeURIFullTextSearch ) {
        if( columnConfig ) {
            var columns = columnConfig.columns;
            if( columns && columns.length > 0 && sortCriteria && sortCriteria.length > 0 ) {
                var index = _.findIndex( columns, function( o ) {
                    return o.propertyName === sortCriteria[ 0 ].fieldName;
                } );
                if( index > -1 ) {
                    sortCriteria[ 0 ].fieldName = columns[ index ].associatedTypeName + '.' + columns[ index ].propertyName;
                }
            }
        }
    }
    return sortCriteria;
};

/**
  * sets the searchFolder with the context which is needed for the export to excel panel and also for the select all/selection mode commands for list/image view.
  * @param {Object} data - viewModel data.
  * @param {Object} dataProviders - dataProvider information.
  * @returns {Object} contextObject - The context object to be set in searchFolder.
  */
export let setExportPanelContextForSearchFolder2 = function( data, dataCtxNode, dataProviders ) {
    var parentObject = appCtxService.getCtx( 'xrtSummaryContextObject' );
    return {
        providerName: 'Awp0ObjectSetRowProvider',
        dataProvider: dataCtxNode.dataProviders.listDataProvider,
        searchCriteria: {
            objectSet: 'contents.WorkspaceObject',
            parentUid: parentObject.uid,
            returnTargetObjs: 'true',
            exportActiveFolderContents: 'true'
        }
    };
};

/**
  * sets the searchFolder with the context which is needed for the export to excel panel and also for the select all/selection mode commands for table/compare view.
  * @param {Object} data - viewModel data.
  * @param {Object} dataProviders - dataProvider information.
  * @returns {Object} contextObject - The context object to be set in searchFolder.
  */
export let setExportPanelContextForSearchFolder1 = function( data, dataCtxNode, dataProviders ) {
    var parentObject = appCtxService.getCtx( 'xrtSummaryContextObject' );
    return {
        providerName: 'Awp0ObjectSetRowProvider',
        dataProvider: dataCtxNode.dataProviders.gridDataProvider,
        //columnProvider now requires function of getColumnFilters and getSortCriteria defined.
        //which is not applicable here. Till that is straightened up, set columnProvider to null to
        //skip the column filter and sort criteria as active folder anyway does not need such columnProvider.
        //columnProvider: dataCtxNode.columnProviders.clientScopeUI,
        searchCriteria: {
            objectSet: 'contents.WorkspaceObject',
            parentUid: parentObject.uid,
            returnTargetObjs: 'true',
            exportActiveFolderContents: 'true'
        }
    };
};

export let updateSelectAll = function( searchData ) {
    if( !_.isEmpty( searchData.value ) ) {
        const newSearchData = { ...searchData.value };
        const tmpSelectionModel = newSearchData.exportPanelContext.dataProvider.selectionModel;
        if( tmpSelectionModel && tmpSelectionModel.selectionState ) {
            if ( newSearchData.exportPanelContext.dataProvider.selectionModel.selectionState === 'all' ) {
                newSearchData.exportPanelContext.dataProvider.selectionModel.selectionState = 'none';
            } else {
                newSearchData.exportPanelContext.dataProvider.selectionModel.selectionState = 'all';
            }
        }
        searchData.update( newSearchData );
    }
};

export let updateMultiSelectEnabled = function( searchData ) {
    const newSearchData = { ...searchData.value };
    newSearchData.exportPanelContext.dataProvider.selectionModel.multiSelectEnabled = !newSearchData.exportPanelContext.dataProvider.selectionModel.multiSelectEnabled;
    searchData.update( newSearchData );
};

/* eslint-disable-next-line valid-jsdoc*/

const Awp0SearchFolderOverviewService = {
    updateOverviewCriteriaAndFilters,
    getPropertiesForAwp0SearchType,
    getDefaultPageSize,
    getSearchFolderContentsSortCriteria,
    setExportPanelContextForSearchFolder1,
    setExportPanelContextForSearchFolder2,
    processOutput1,
    processOutput2,
    processOutput,
    updateSelectAll,
    updateMultiSelectEnabled
};

export default Awp0SearchFolderOverviewService;

