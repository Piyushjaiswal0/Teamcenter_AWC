// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 *
 * @module js/searchFolderRuleImportSavedSearchService
 */

import viewModelObjectService from 'js/viewModelObjectService';
import Awp0SaveSearchService from 'js/Awp0SaveSearchService';
import searchFilterService from 'js/aw.searchFilter.service';

export let createLOVEntriesForSavedSearchObjects = ( response ) => {
    let objectsFromJson = JSON.parse( response.searchResultsJSON );
    let modelObjects = objectsFromJson.objects;
    if( modelObjects && modelObjects.length > 0 ) {
        return modelObjects.map( obj => {
            let vmo = viewModelObjectService.createViewModelObject( obj.uid, 'EDIT' );
            return {
                propInternalValue: vmo.uid,
                propDisplayValue: vmo.props.object_string.uiValues[ 0 ],
                object: vmo
            };
        } );
    }
    return [];
};

export let updateSearchStateWhenSelectingFullTextSavedSearch = ( searchFilterMap, searchString, searchState ) => {
    let newSearchState = { ...searchState.value };
    let activeFilters = {};
    for( let[ activeMapKey, activeMapValue ] of Object.entries( searchFilterMap ) ) {
        for( let index = 0; index < activeMapValue.length; index++ ) {
            if( activeMapValue[ index ].searchFilterType === 'SearchStringFilter' ) {
                activeMapValue[ index ].searchFilterType = 'StringFilter';
            }
            if( activeFilters[ activeMapKey ] ) {
                let values = activeFilters[ activeMapKey ];
                values.push( activeMapValue[ index ].stringValue );
                activeFilters[ activeMapKey ] = values;
            } else {
                activeFilters[ activeMapKey ] = [ activeMapValue[ index ].stringValue ];
            }
        }
        searchFilterMap[ activeMapKey ] = activeMapValue;
    }
    newSearchState.activeFilters = activeFilters;
    newSearchState.awp0SearchType = 'Awp0FullTextSearchProvider';
    newSearchState.filterString = searchFilterService.buildFilterString( activeFilters );
    const selectedFiltersInfo = searchFilterService.buildSearchFiltersFromSearchState( activeFilters );
    if( !newSearchState.criteria ) {
        newSearchState.criteria = {};
    }
    newSearchState.criteria.searchString = searchString;
    newSearchState.activeFilterMap = selectedFiltersInfo.activeFilterMap;
    delete newSearchState.categories;
    delete newSearchState.searchFilterCategories;
    delete newSearchState.categoriesExpandCollapseMap;
    delete newSearchState.allCategoriesVisible;
    delete newSearchState.categoriesWithMoreThanDefaultNumberOfFiltersShown;
    newSearchState.searchInProgress = true;
    newSearchState.totalFound = newSearchState.showLoadingText ? undefined : 0;
    searchState.update( newSearchState );
};

export let showSavedSearchAttributes = ( searchState, selectedSavedSearch ) => {
    let savedSearchObject = selectedSavedSearch.object;

    switch( savedSearchObject.type ) {
        case 'Awp0FullTextSavedSearch': {
            let savedSearchInfo = Awp0SaveSearchService.constructFullTextSavedSearchParams( savedSearchObject );
            searchFolderRuleImportSavedSearchService.updateSearchStateWhenSelectingFullTextSavedSearch( savedSearchInfo.searchFilterMap, savedSearchInfo.searchString, searchState );
            break;
        }
        case 'SavedSearch': {
            let newSearchState = { ...searchState.value };
            newSearchState.updateSavedSearchAttributeValues = true;
            newSearchState.awp0SearchType = 'Awp0SavedQuerySearchProvider';
            newSearchState.savedSearchObject = savedSearchObject;
            searchState.update( newSearchState );
            break;
        }
        default:
            break;
    }
    return savedSearchObject.type;
};

const searchFolderRuleImportSavedSearchService = {
    createLOVEntriesForSavedSearchObjects,
    showSavedSearchAttributes,
    updateSearchStateWhenSelectingFullTextSavedSearch
};

export default searchFolderRuleImportSavedSearchService;
