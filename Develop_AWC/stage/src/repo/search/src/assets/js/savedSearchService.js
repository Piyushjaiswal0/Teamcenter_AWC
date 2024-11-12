// @<COPYRIGHT>@
// ==================================================
// Copyright 2022.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global */

/**
 *
 * @module js/savedSearchService
 */

import _ from 'lodash';
import searchStateHelperService from 'js/searchStateHelperService';
import awSearchService from './awSearchService';
import searchCommonUtils from 'js/searchCommonUtils';
import searchFilterSvc from 'js/aw.searchFilter.service';
import awChartDataProviderService from 'js/awChartDataProviderService';
const FULLTEXT_PROVIDER = 'Awp0FullTextSearchProvider';
const ADVANCED_PROVIDER = 'Awp0SavedQuerySearchProvider';
const clientScopeURIFullTextSearch = 'Awp0SearchResults';
const clientScopeURIAdvancedSearch = 'Awp0AdvancedSearch';

export let updateSelectAll = function( searchData ) {
    if ( searchData.dataProvider && searchData.dataProvider.selectionModel ) {
        const newSearchData = { ...searchData.value };
        if ( newSearchData.dataProvider.selectionModel.selectionState === 'all' ) {
            newSearchData.dataProvider.selectionModel.selectionState = 'none';
        } else {
            newSearchData.dataProvider.selectionModel.selectionState = 'all';
        }
        searchData.update( newSearchData );
    }
};

export let updateMultiSelectEnabled = function( searchData ) {
    if ( searchData.dataProvider && searchData.dataProvider.selectionModel ) {
        const newSearchData = { ...searchData.value };
        newSearchData.dataProvider.selectionModel.multiSelectEnabled = !newSearchData.dataProvider.selectionModel.multiSelectEnabled;
        searchData.update( newSearchData );
    }
};

/**
  * update the display for criteria and filters
  * @function updateCriteriaAndFilters
  *
  * @param {Object}data - view model data
  * @param {STRING}searchState - search state
  * @returns {Object}data - updated view model data
  */
export let updateCriteriaAndFilters = function( data, searchState ) {
    if ( searchState && searchState.criteria ) {
        data.criteria.uiValue = searchState.criteria.searchString;
        data.filters.uiValue = searchState.filterString;
    }
    return data;
};

export let getSavedSearchPropertiesInt = function( vmo, newSearchState ) {
    newSearchState.clientScopeURI = clientScopeURIFullTextSearch;
    newSearchState.vmo = vmo;
    if( vmo.type === 'Awp0FullTextSavedSearch' ) {
        newSearchState.provider = FULLTEXT_PROVIDER;
        newSearchState.clientScopeURI = clientScopeURIFullTextSearch;
        newSearchState.columnConfigId = 'searchResultsColConfig';
        let searchContext = {
            showChartColorBars: false,
            bulkFiltering: true,
            criteria: {
                searchString: vmo.props.awp0search_string.dbValue,
                forceThreshold: 'true',
                searchFromLocation: 'addPanel'
            },
            provider: 'Awp0FullTextSearchProvider',
            sortType: 'Priority'
        };
        let updatedSearchContext = searchStateHelperService.constructBaseSearchCriteria( searchContext );
        newSearchState = { ...newSearchState, ...updatedSearchContext };
        newSearchState.objectsGroupedByProperty = null;
        newSearchState.selectedFiltersString = '';
        newSearchState.label = {
            source: '/i18n/SearchMessages',
            key: 'resultsText'
        };

        let activeFilterMap = awSearchService.getSavedSearchFilterMap( vmo );
        let activeFiltersInfo = searchCommonUtils.createActiveFiltersFromActiveFilterMap( activeFilterMap );
        newSearchState.filterString = activeFiltersInfo.filterString;
        newSearchState.activeFilters = activeFiltersInfo.activeFilters;
        newSearchState.activeFilterMap = activeFiltersInfo.activeFilterMap;
        newSearchState.filterStringDisplay = _.join( vmo.props.awp0SearchFilterArray.uiValues, ',' );
        newSearchState.chartBy = vmo.props.awp0ChartOn.uiValue;
        if( newSearchState.criteria && !newSearchState.criteriaJSONString ) {
            newSearchState.criteriaJSONString = JSON.stringify( newSearchState.criteria );
        }
    } else {
        newSearchState.provider = ADVANCED_PROVIDER;
        newSearchState.clientScopeURI = clientScopeURIAdvancedSearch;
        newSearchState.columnConfigId = 'advancedSearchResultsColConfig';
    }
    newSearchState.readyToLoad = true;
    return newSearchState;
};

export let getSavedSearchProperties = function( vmo, searchState ) {
    let newSearchState = { ...searchState.value };
    newSearchState = savedSearchService.getSavedSearchPropertiesInt( vmo, newSearchState );
    searchState.update( newSearchState );
};
export let initFulltextState = function( searchState ) {
    let newSearchState = { ...searchState.value };
    let isDirty = false;
    if( searchState.autoApplyFilters === undefined ) {
        newSearchState.autoApplyFilters = true;
        isDirty = true;
    }
    if( searchState.chartTitle === undefined ) {
        newSearchState.chartTitle = 'dummy_chart_title';
        isDirty = true;
    }
    if( searchState.forceChart === undefined ) {
        newSearchState.forceChart = true;
        isDirty = true;
    }
    if ( isDirty ) {
        searchState.update( newSearchState );
    }
};
/**
  *
  * @function updateState
  *
  * @param {Object}data - view model data
  * @param {Object}uidFolder - uid of Active Folder
  */
export let updateState = function( savedSearchSelected, searchState, searchStateUpdater ) {
    const updateAtomicData = searchStateUpdater.searchState;
    let newSearchState = { ...searchState };
    newSearchState = savedSearchService.getSavedSearchPropertiesInt( savedSearchSelected, newSearchState );
    newSearchState.onRulePage = true;
    newSearchState.isEditMode = false;
    updateAtomicData( { ...searchState, ...newSearchState } );
};

export let editSavedSearchRule = function( searchState ) {
    const newSearchState = { ...searchState.value };
    newSearchState.isEditMode = true;
    searchState.update( newSearchState );
};

export let cancelEditSavedSearchRule = function( vmo, searchState ) {
    let newSearchState = { ...searchState.value };
    newSearchState = savedSearchService.getSavedSearchPropertiesInt( vmo, newSearchState );
    newSearchState.isEditMode = false;
    newSearchState.onRulePage = true;
    newSearchState.isRuleDirty = false;
    searchState.update( newSearchState );
};

export let initRuleType = function( ruleType, searchState ) {
    let updatedRuleType = _.cloneDeep( ruleType );
    updatedRuleType.dbValue = searchState.ruleType;
    if( searchState.provider === ADVANCED_PROVIDER ) {
        updatedRuleType.dbValue = ADVANCED_PROVIDER;
    } else if( searchState.provider === FULLTEXT_PROVIDER ) {
        updatedRuleType.dbValue = FULLTEXT_PROVIDER;
    }

    return updatedRuleType;
};

/**
  * set rule type
  * @function setRuleType
  * @param {Object}data - view model data
  * @param {Object}searchFolder - searchFolder
  */
export let setRuleType = function( ruleType, searchState ) {
    const newSearchState = { ...searchState.value };
    if( ruleType.dbValue === ADVANCED_PROVIDER ) {
        newSearchState.provider = ADVANCED_PROVIDER;
    } else if( ruleType.dbValue === FULLTEXT_PROVIDER ) {
        newSearchState.provider = FULLTEXT_PROVIDER;
    }
    searchState.update( newSearchState );
};


export let setSavedSearchRuleDirty = function( searchState ) {
    // if( !searchState.isRuleDirty && ( searchState.criteria.searchString !== searchState.vmo.props.awp0search_string || searchState.filterString !== searchState.vmo.props.awp0string_filters ) ) {

    if( !searchState.isRuleDirty &&  searchState.criteria.searchString !== searchState.vmo.props.awp0search_string  ) {
        const newSearchState = { ...searchState.value };
        newSearchState.isRuleDirty = true;
        searchState.update( newSearchState );
    }
};

export let getChartByDisplayValue = function( chartOnProperty ) {
    let chartBy = _.cloneDeep( chartOnProperty );
    let chartByDispValue =  chartBy.dbValue ? searchFilterSvc.getCategoryDisplayName( chartBy.dbValue ) : '';
    chartBy.uiValue = chartByDispValue;
    chartBy.uiValues = [ chartByDispValue ];
    chartBy.displayValues = [ chartByDispValue ];
    return chartBy;
};

export let getChartProvider = function( searchState, chartListboxPropData ) {
    let chartListboxProp = _.cloneDeep( chartListboxPropData );
    awChartDataProviderService.createChartProvider( searchState, chartListboxPropData );
    return chartListboxProp;
};
/* eslint-disable-next-line valid-jsdoc*/

const savedSearchService = {
    // setInitialEditMode,
    getSavedSearchPropertiesInt,
    getSavedSearchProperties,
    initFulltextState,
    updateState,
    updateCriteriaAndFilters,
    updateSelectAll,
    updateMultiSelectEnabled,
    editSavedSearchRule,
    initRuleType,
    setRuleType,
    setSavedSearchRuleDirty,
    cancelEditSavedSearchRule,
    getChartByDisplayValue,
    getChartProvider
};

export default savedSearchService;
