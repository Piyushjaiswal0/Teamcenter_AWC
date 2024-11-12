// Copyright 2021 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 *
 * @module js/AwFilterPanelUtils
 */

import filterPanelUtils from 'js/filterPanelUtils';
import appCtxService from 'js/appCtxService';
import searchCommonUtils from 'js/searchCommonUtils';
import filterPanelService from 'js/filterPanelService';
import searchHighlightingService from 'js/Awp0SearchHighlightingService';
import filterPanelCommonUtils from 'js/filterPanelCommonUtils';
import dateTimeService from 'js/dateTimeService';
import { getJSDate } from 'js/dateTimeService';
import _ from 'lodash';
import searchFilterService from 'js/aw.searchFilter.service';

const fullTextSearchProviderName = 'Awp0FullTextSearchProvider';
const shapeSearchProviderName = 'SS1ShapeSearchDataProvider';
const INTERNAL_KEYWORD = '_I_N_T_E_R_N_A_L__N_A_M_E_';
const FTS_KEYWORD_NONE = '$NONE';

export let createFilterNameAndCount = ( filter ) => {
    let nameAndCountDisplayName = '';
    if( filter.name ) {
        nameAndCountDisplayName += filter.name;
    }
    if( filter.showCount && filter.count > 0 ) {
        nameAndCountDisplayName += ' (';
        nameAndCountDisplayName += filter.count;
        nameAndCountDisplayName += ')';
    }
    return nameAndCountDisplayName;
};

export let restrictFilterValuesToNumberOfFiltersToShow = ( categoryObject, filtersObject, numberOfFiltersToShow ) => {
    let filterContentInfo = [];
    if( categoryObject && filtersObject && numberOfFiltersToShow > 0 ) {
        for( let index = 0; index < numberOfFiltersToShow; index++ ) {
            if( filtersObject[ index ] ) {
                filterContentInfo.push( filtersObject[ index ] );
            }
        }
    }
    return filterContentInfo;
};

export let getFilteredResults = ( filterValues, facetSearchString, hasMoreFacetValues ) => {
    let filterContentInfo = [];
    if( facetSearchString && facetSearchString.length === 0 || !facetSearchString || hasMoreFacetValues ) {
        for( let index = 0; index < filterValues.length; index++ ) {
            filterContentInfo.push( filterValues[ index ] );
        }
    } else if( facetSearchString && facetSearchString.length > 0 ) {
        let actualFacetSearchString = facetSearchString.trim();
        actualFacetSearchString = actualFacetSearchString.replace( '*', '' );
        for( let index = 0; index < filterValues.length; index++ ) {
            if( filterValues[ index ].name &&
                filterValues[ index ].name.toLowerCase().indexOf( actualFacetSearchString.toLowerCase() ) !== -1 ||
                filterValues[ index ].internalName &&
                filterValues[ index ].internalName.toLowerCase().indexOf( actualFacetSearchString.toLowerCase() ) !== -1 ) {
                filterContentInfo.push( filterValues[ index ] );
            }
        }
    }
    return filterContentInfo;
};

export const updateNumberOfFiltersToShowForMoreLink = ( props, numberOfFiltersToShow ) => {
    let { category, context } = props;
    let newSearchState = context && context.searchState ? context.searchState.getValue() : undefined;
    let categoriesWithMoreThanDefaultNumberOfFiltersShown = newSearchState && newSearchState.categoriesWithMoreThanDefaultNumberOfFiltersShown
        ? newSearchState.categoriesWithMoreThanDefaultNumberOfFiltersShown : new Set();
    let numberOfFilterValues = category.filterValues.length;
    if( numberOfFilterValues > numberOfFiltersToShow.dbValue ) {
        categoriesWithMoreThanDefaultNumberOfFiltersShown.add( category.internalName );
        if( newSearchState ) {
            newSearchState.categoriesWithMoreThanDefaultNumberOfFiltersShown = categoriesWithMoreThanDefaultNumberOfFiltersShown;
        }
        let newNumberOfFiltersToShow = _.cloneDeep( numberOfFiltersToShow );
        newNumberOfFiltersToShow.dbValue = numberOfFilterValues;
        if( context && context.searchState ) {
            context.searchState.update( newSearchState );
        }
        return newNumberOfFiltersToShow;
    }
    return numberOfFiltersToShow;
};

export const updateNumberOfFiltersToShowForLessLink = ( props, numberOfFiltersToShow ) => {
    let { category, context } = props;
    let newSearchState = context && context.searchState ? context.searchState.getValue() : undefined;
    let categoriesWithMoreThanDefaultNumberOfFiltersShown = newSearchState && newSearchState.categoriesWithMoreThanDefaultNumberOfFiltersShown
        ? newSearchState.categoriesWithMoreThanDefaultNumberOfFiltersShown : new Set();
    let numberOfFilterValues = category.filterValues.length;
    if( numberOfFilterValues === numberOfFiltersToShow.dbValue || numberOfFilterValues < numberOfFiltersToShow.dbValue ) {
        categoriesWithMoreThanDefaultNumberOfFiltersShown.delete( category.internalName );
        if( newSearchState ) {
            newSearchState.categoriesWithMoreThanDefaultNumberOfFiltersShown = categoriesWithMoreThanDefaultNumberOfFiltersShown;
        }
        let newNumberOfFiltersToShow = _.cloneDeep( numberOfFiltersToShow );
        newNumberOfFiltersToShow.dbValue = category.defaultFilterValueDisplayCount;
        if( context && context.searchState ) {
            context.searchState.update( newSearchState );
        }
        return newNumberOfFiltersToShow;
    }
    return numberOfFiltersToShow;
};

export const updateNumberOfFiltersShownAndFacetSearchString = ( props, numberOfFiltersToShow, facetSearchString ) => {
    let { category, context } = props;
    let newSearchState = context && context.searchState ? context.searchState.getValue() : undefined;
    let numberOfFiltersToShowUpdatedVMProp = _.cloneDeep( numberOfFiltersToShow );
    let facetSearchStringUpdatedVMProp = _.cloneDeep( facetSearchString );
    numberOfFiltersToShowUpdatedVMProp.dbValue = newSearchState && newSearchState.categoriesWithMoreThanDefaultNumberOfFiltersShown &&
        newSearchState.categoriesWithMoreThanDefaultNumberOfFiltersShown.has( category.internalName )
        && category.filterValues && Array.isArray( category.filterValues ) && category.filterValues.length > 0
        ? category.filterValues.length : category.defaultFilterValueDisplayCount;
    facetSearchStringUpdatedVMProp.dbValue = category.facetSearchString ? category.facetSearchString : '';
    return {
        numberOfFiltersToShow: numberOfFiltersToShowUpdatedVMProp,
        facetSearchString: facetSearchStringUpdatedVMProp
    };
};

export const updateVMPropFromPassedInValueOfDefaultFilterDisplayCount = ( props, numberOfFiltersToShow ) => {
    let { category } = props;
    let numberOfFiltersToShowUpdatedVMProp = _.cloneDeep( numberOfFiltersToShow );
    numberOfFiltersToShowUpdatedVMProp.dbValue = category.defaultFilterValueDisplayCount;
    return numberOfFiltersToShowUpdatedVMProp;
};

const getSelectedFiltersFromCategory = ( category ) => {
    let selectedFilters = [];
    let filterValues = category.filterValues;
    if( filterValues && filterValues.length ) {
        for( let index = 0; index < filterValues.length; index++ ) {
            let eachFilterValue = filterValues[ index ];
            if( eachFilterValue.selected.dbValue || eachFilterValue.selected.value ) {
                selectedFilters.push( eachFilterValue );
            }
        }
    }
    return selectedFilters;
};

export let constructActiveFilterMapForFacetSearch = ( activeFilters, selectedFilters ) => {
    let updatedActiveFilters = [];
    for( let index2 = 0; index2 < activeFilters.length; index2++ ) {
        let eachActiveFilter = activeFilters[ index2 ];
        let filterFound = false;
        for( let index3 = 0; index3 < selectedFilters.length; index3++ ) {
            let eachSelectedFilter = selectedFilters[ index3 ];
            if( eachSelectedFilter.internalName === eachActiveFilter.stringValue ) {
                eachActiveFilter.selected = eachSelectedFilter.selected.dbValue ? eachSelectedFilter.selected.dbValue : eachSelectedFilter.selected.value;
                eachActiveFilter.count = eachSelectedFilter.count;
                eachActiveFilter.stringDisplayValue = eachSelectedFilter.name;
                updatedActiveFilters.push( eachActiveFilter );
                filterFound = true;
                break;
            }
        }
        if( !filterFound ) {
            updatedActiveFilters.push( eachActiveFilter );
        }
    }
    return updatedActiveFilters;
};

export let getSearchFilterMapForFacetSearch = ( searchState, category ) => {
    let searchStateContext = { ...searchState.value };
    let selectedFiltersInFacetInputCategory;
    let categories = searchStateContext.categories;
    let activeFilterMapInSearchState = searchStateContext.activeFilterMap;
    if( categories && categories.length > 0 ) {
        for( let index = 0; index < categories.length; index++ ) {
            let eachCategory = categories[ index ];
            if( eachCategory.internalName === category.internalName ) {
                selectedFiltersInFacetInputCategory = getSelectedFiltersFromCategory( eachCategory );
                break;
            }
        }
        if( activeFilterMapInSearchState ) {
            for( const [ key, value ] of Object.entries( activeFilterMapInSearchState ) ) {
                if( key === category.internalName ) {
                    let activeFilters = value;
                    if( activeFilters && activeFilters.length > 0 && selectedFiltersInFacetInputCategory && selectedFiltersInFacetInputCategory.length > 0 ) {
                        activeFilterMapInSearchState[ key ] = constructActiveFilterMapForFacetSearch( activeFilters, selectedFiltersInFacetInputCategory );
                    }
                }
            }
        }
    }
    return activeFilterMapInSearchState;
};

export let arrangeFilterMap = ( searchStateContext, category ) => {
    var selectedFilters = {};
    var nonSelectedFilters = {};
    var selectedFiltersIndex = 0;
    var nonSelectedFiltersIndex = 0;
    _.forEach( searchStateContext.searchFilterMap[ category.internalName ], function( filterValue ) {
        if( filterValue.selected === true ) {
            selectedFilters[ selectedFiltersIndex ] = filterValue;
            selectedFiltersIndex++;
        } else {
            nonSelectedFilters[ nonSelectedFiltersIndex ] = filterValue;
            nonSelectedFiltersIndex++;
        }
    } );
    var updatedFilterMap = [];
    for( var index1 = 0; index1 < Object.keys( selectedFilters ).length; index1++ ) {
        updatedFilterMap.push( selectedFilters[ index1 ] );
    }
    for( var index2 = 0; index2 < Object.keys( nonSelectedFilters ).length; index2++ ) {
        updatedFilterMap.push( nonSelectedFilters[ index2 ] );
    }
    return updatedFilterMap;
};

export let removeDuplicateSelectedFilters = ( searchStateContext, category, filterValue ) => {
    let isDuplicateFilterValue = false;
    let indexOfDuplicateFilterValue = -1;
    let filterValues = searchStateContext.searchFilterMap[ category.internalName ];
    if( filterValues && filterValues.length > 0 ) {
        for( let index = 0; index < filterValues.length; index++ ) {
            if( filterValues[ index ].stringValue === filterValue.stringValue || filterValue.stringValue === '$ME' ) {
                isDuplicateFilterValue = true;
                indexOfDuplicateFilterValue = index;
                break;
            }
        }
    }
    return {
        isDuplicateFilterValue: isDuplicateFilterValue,
        indexOfDuplicateFilterValue: indexOfDuplicateFilterValue
    };
};

export let setMapForFilterValueSearch = ( searchFilterMap, searchStateContext, category, startIndex ) => {
    if( searchFilterMap ) {
        if( searchStateContext.unpopulatedSearchFilterCategories ) {
            for( let i = 0; i < searchStateContext.unpopulatedSearchFilterCategories.length; i++ ) {
                if( searchStateContext.unpopulatedSearchFilterCategories[ i ].internalName === category.internalName ) {
                    searchStateContext.searchFilterCategories.push( searchStateContext.unpopulatedSearchFilterCategories[ i ] );
                    break;
                }
            }
        }

        if( searchFilterMap[ category.internalName ] &&
            searchFilterMap[ category.internalName ][ 0 ] &&
            searchFilterMap[ category.internalName ][ 0 ].searchFilterType === 'DateFilter' ) {
            let categoryKeys = Object.keys( searchFilterMap );
            let currentDateCategoryKeys = Object.keys( searchStateContext.searchFilterMap );
            for( let indexOfCatInternalName = 0; indexOfCatInternalName < currentDateCategoryKeys.length; indexOfCatInternalName++ ) {
                let eachCategoryInternalName = currentDateCategoryKeys[ indexOfCatInternalName ];
                if( eachCategoryInternalName.indexOf( category.internalName ) !== -1 ) {
                    delete searchStateContext.searchFilterMap[ eachCategoryInternalName ];
                }
            }
            for( let catName in categoryKeys ) {
                searchStateContext.searchFilterMap[ categoryKeys[ catName ] ] = searchFilterMap[ categoryKeys[ catName ] ];
            }
        }

        // If more is clicked append the values else replace the values
        if( startIndex > 0 ) {
            let isDuplicateFilterValueInfo;
            let filterValues = searchFilterMap[ category.internalName ];
            if( filterValues && filterValues.length > 0 ) {
                for( let index = 0; index < filterValues.length; index++ ) {
                    let filterValue = filterValues[ index ];
                    isDuplicateFilterValueInfo = removeDuplicateSelectedFilters( searchStateContext, category, filterValue );
                    if( !isDuplicateFilterValueInfo.isDuplicateFilterValue ) {
                        searchStateContext.searchFilterMap[ category.internalName ].push( filterValue );
                    } else if( isDuplicateFilterValueInfo.isDuplicateFilterValue && filterValue.selected ) {
                        searchStateContext.searchFilterMap[ category.internalName ][ isDuplicateFilterValueInfo.indexOfDuplicateFilterValue ] = filterValue;
                    }
                }
            }
        } else {
            searchStateContext.searchFilterMap[ category.internalName ] = searchFilterMap[ category.internalName ];
        }

        //put the selected filter values at the top so that when the user clicks on the Less... link, they don't get lost
        searchStateContext.searchFilterMap[ category.internalName ] = arrangeFilterMap( searchStateContext, category );
    } else {
        searchStateContext.searchFilterMap[ category.internalName ] = [];
    }
    return searchStateContext.searchFilterMap;
};

const removeSelectedField = ( filterValues ) => {
    let updateFilterValues = [];
    if( filterValues && filterValues.length > 0 ) {
        for( let index = 0; index < filterValues.length; index++ ) {
            let eachFilterValue = { ...filterValues[ index ].value };
            eachFilterValue.selected = eachFilterValue.selected && eachFilterValue.selected.value ? eachFilterValue.selected.value : false;
            updateFilterValues.push( eachFilterValue );
        }
    }
    return updateFilterValues;
};

export let setCategoryExpandCollapseStateInSearchState = ( categoriesExpandCollapseMap, categoryInternalName, state ) => {
    if( categoriesExpandCollapseMap ) {
        categoriesExpandCollapseMap[ categoryInternalName ] = state;
    } else {
        let newCategoriesExpandCollapseMap = {};
        newCategoriesExpandCollapseMap[ categoryInternalName ] = state;
        return newCategoriesExpandCollapseMap;
    }
    return categoriesExpandCollapseMap;
};

export let readExpandCollapseValueFromSearchState = ( category, searchState ) => {
    let val;
    if( searchState && searchState.categoriesExpandCollapseMap &&
        ( searchState.categoriesExpandCollapseMap[ category.internalName ] === false || searchState.categoriesExpandCollapseMap[ category.internalName ] === true ) &&
        searchState.criteria && searchState.criteria.limitedFilterCategoriesEnabled !== 'true' ) {
        val = searchState.categoriesExpandCollapseMap[ category.internalName ];
    } else {
        val = category.expand;
    }
    return val;
};

export let updateCategoriesAfterFacetSearch = ( response, searchState, categoryForFacetSearchInput, category ) => {
    let searchStateContext = { ...searchState.value };
    category.filterValues = removeSelectedField( category.filterValues );
    searchStateContext.searchFilterMap = setMapForFilterValueSearch( response.searchFilterMap,
        searchStateContext, category, categoryForFacetSearchInput.startIndex );
    category.filterValues = filterPanelService.getFiltersForCategory( category,
        searchStateContext.searchFilterMap, searchStateContext.objectsGroupedByProperty.internalPropertyName, searchStateContext.colorToggle );
    category.hasMoreFacetValues = response.hasMoreFacetValues;
    if( !category.isServerSearch && category.hasMoreFacetValues ) {
        category.isServerSearch = true;
    }
    category.numberOfFiltersShown = category.filterValues.length;
    searchStateContext = searchCommonUtils.updateChartListBoxListData( category, searchStateContext );
    if( !category.type ) {
        category.type = searchStateContext.searchFilterMap &&
        searchStateContext.searchFilterMap[ category.internalName ] &&
        searchStateContext.searchFilterMap[ category.internalName ][ 0 ] ?
            searchStateContext.searchFilterMap[ category.internalName ][ 0 ].searchFilterType : 'StringFilter';
    }
    category.expand = true;
    searchStateContext.categoriesExpandCollapseMap =
        AwFilterPanelUtils.setCategoryExpandCollapseStateInSearchState( searchStateContext.categoriesExpandCollapseMap, category.internalName, category.expand );
    searchStateContext = searchStateContext && ( searchStateContext.provider === fullTextSearchProviderName || searchStateContext.provider === shapeSearchProviderName )
        ? AwFilterPanelUtils.updateListOfExpandedCategoriesInSearchState( searchStateContext, categoryForFacetSearchInput.name, category.expand ) : searchStateContext;
    category.isPopulated = Boolean( category.filterValues && ( _.isArray( category.filterValues ) && category.filterValues.length > 0 ||
        !_.isArray( category.filterValues ) ) );
    category.updateNumberOfFiltersShown = categoryForFacetSearchInput.startIndex > 0;
    category = filterPanelCommonUtils.processFilterCategories( true, category, searchStateContext.searchFilterMap );
    switch ( category.type ) {
        case 'StringFilter':
            category.facetSearchString = categoryForFacetSearchInput.facetSearchString;
            category.showFilterText =
                 category.filterValues &&
                    category.filterValues.length > category.defaultFilterValueDisplayCount * 2 ||
                    categoryForFacetSearchInput.isServerSearch;
            break;
        default:
    }

    let categories = searchStateContext.categories;
    for( let index = 0; index < categories.length; index++ ) {
        if( category.internalName === categories[ index ].internalName ) {
            categories[ index ] = category;
            break;
        }
    }
    searchStateContext.categories = categories;
    searchStateContext.isFacetSearch = true;
    searchState.update( searchStateContext );
};

export let updateListOfExpandedCategoriesInSearchState = ( searchState, categoryInternalName, currentCategoryExpandState ) => {
    let existingExpandedCategories = searchState.criteria.listOfExpandedCategories
        && searchState.criteria.listOfExpandedCategories.length > 0 ? searchState.criteria.listOfExpandedCategories.split( ',' ) : [];
    let existingExpandedCategoriesAsSet = new Set( existingExpandedCategories );
    existingExpandedCategories = existingExpandedCategoriesAsSet.size > 0 ? Array.from( existingExpandedCategoriesAsSet ) : [];
    if( currentCategoryExpandState ) {
        existingExpandedCategories.push( categoryInternalName );
        let categoriesString = '';
        for( let indx = 0; indx < existingExpandedCategories.length; indx++ ) {
            categoriesString += existingExpandedCategories[ indx ];
            if( indx < existingExpandedCategories.length - 1 ) {
                categoriesString += ',';
            }
        }
        searchState.criteria.listOfExpandedCategories = categoriesString;
    } else {
        let updatedExpandedCategoriesString = '';
        for( let index = 0; index < existingExpandedCategories.length; index++ ) {
            if( existingExpandedCategories[ index ] !== categoryInternalName ) {
                updatedExpandedCategoriesString += existingExpandedCategories[ index ];
                if( index < existingExpandedCategories.length - 1 ) {
                    updatedExpandedCategoriesString += ',';
                }
            }
        }
        searchState.criteria.listOfExpandedCategories = updatedExpandedCategoriesString;
    }
    return searchState;
};

export let updateExpandFlagForCategory = ( searchState, categoryForFacetSearchInput ) => {
    let searchStateContext = searchState.value;
    let categories = searchStateContext.categories;
    let currentCategoryExpandState;
    for( let index = 0; index < categories.length; index++ ) {
        let eachCategory = categories[ index ];
        if( eachCategory.internalName === categoryForFacetSearchInput.name ) {
            eachCategory.expand = categoryForFacetSearchInput.expanded;
            currentCategoryExpandState = eachCategory.expand;
            categories[ index ] = eachCategory;
            break;
        }
    }
    searchStateContext.categoriesExpandCollapseMap =
        AwFilterPanelUtils.setCategoryExpandCollapseStateInSearchState( searchStateContext.categoriesExpandCollapseMap, categoryForFacetSearchInput.name, currentCategoryExpandState );
    searchStateContext.categories = categories;
    searchStateContext = searchStateContext && ( searchStateContext.provider === fullTextSearchProviderName || searchStateContext.provider === shapeSearchProviderName )
        ? AwFilterPanelUtils.updateListOfExpandedCategoriesInSearchState( searchStateContext, categoryForFacetSearchInput.name, currentCategoryExpandState ) : searchStateContext;
    searchState.update( searchStateContext );
};

export let filterOutCategories = ( categorySearchString, categories ) => {
    let filteredOutCategories = [];
    if( categories && categorySearchString && categorySearchString.length > 0 ) {
        for( let index = 0; index < categories.length; index++ ) {
            if( categories[ index ].displayName.toLowerCase().indexOf( categorySearchString.toLowerCase() ) !== -1 ) {
                filteredOutCategories.push( categories[ index ] );
            }
        }
    } else {
        return categories;
    }
    return filteredOutCategories;
};

export let updateNumberOfFiltersToShowForMoreLinkAfterFacetSearch = ( props, numberOfFiltersToShow ) => {
    let { category } = props;
    if( category.updateNumberOfFiltersShown ) {
        let numberOfFiltersToShowUpdatedVMProp = _.cloneDeep( numberOfFiltersToShow );
        numberOfFiltersToShowUpdatedVMProp.dbValue = category.filterValues.length;
        return numberOfFiltersToShowUpdatedVMProp;
    }
    return numberOfFiltersToShow;
};

export let updateSearchStateWithNumericRangeCriteria = ( searchState, categoryForRangeSearch ) => {
    let searchStateContext = searchState.value;
    let rangeSearchCategory = categoryForRangeSearch.category.internalName;
    searchStateContext.lastSelectedFilterAndCategoryInfo = {
        lastNumericRangeSearchCategory: rangeSearchCategory,
        lastAction: 'numericRangeSearch'
    };
    let categories = searchStateContext.categories;
    for( let index = 0; index < categories.length; index++ ) {
        let eachCategory = categories[ index ];
        if( eachCategory.internalName === categoryForRangeSearch.category.internalName ) {
            eachCategory.numericRangeString = '';
            let startValue = categoryForRangeSearch.startValue;
            let endValue = categoryForRangeSearch.endValue;
            if( isNaN( startValue ) ) {
                startValue = null;
            }
            if( isNaN( endValue ) ) {
                endValue = null;
            }
            let numericRangeString = filterPanelUtils.getNumericRangeString( startValue, endValue );
            eachCategory.numericRangeString = numericRangeString;
            if( !searchStateContext.activeFilters ) {
                searchStateContext.activeFilters = {};
            }
            if( eachCategory.numericrange && eachCategory.numericrange.numericRangeSelected ) {
                let currentSelectedValues = searchStateContext.activeFilters[ eachCategory.internalName ];
                let updatedValues = [];
                for( let idx = 0; idx < currentSelectedValues.length; idx++ ) {
                    if( currentSelectedValues[ idx ].indexOf( '_NumericRange_' ) === -1 ) {
                        updatedValues.push( currentSelectedValues[ idx ] );
                    }
                }
                searchStateContext.activeFilters[ eachCategory.internalName ] = updatedValues;
            }
            if( searchStateContext.activeFilters && searchStateContext.activeFilters[ eachCategory.internalName ]
                && searchStateContext.activeFilters[ eachCategory.internalName ].length > 0 ) {
                searchStateContext.activeFilters[ eachCategory.internalName ].push( numericRangeString );
            } else {
                searchStateContext.activeFilters[ eachCategory.internalName ] = [];
                searchStateContext.activeFilters[ eachCategory.internalName ].push( numericRangeString );
            }
            categories[ index ] = eachCategory;
            break;
        }
    }
    searchStateContext.categories = categories;
    searchState.update( searchStateContext );
};

export let updateSearchStateWithDateRangeCriteria = ( searchState, categoryForRangeSearch ) => {
    let searchStateContext = searchState.value;
    let rangeSearchCategory = categoryForRangeSearch.category.internalName;
    rangeSearchCategory += '_0Z0_year';
    searchStateContext.lastSelectedFilterAndCategoryInfo = {
        lastDateRangeSearchCategory: rangeSearchCategory,
        lastAction: 'dateRangeSearch'
    };
    let categories = searchStateContext.categories;
    for( let index = 0; index < categories.length; index++ ) {
        let eachCategory = categories[ index ];
        if( eachCategory.internalName === categoryForRangeSearch.category.internalName ) {
            eachCategory.dateRangeString = '';
            let startValue = 0;
            let endValue = 0;
            if( categoryForRangeSearch.startValue && categoryForRangeSearch.startValue.dateApi && categoryForRangeSearch.startValue.dateApi.dateObject ) {
                startValue = categoryForRangeSearch.startValue.dateApi.dateObject;
            }
            if( categoryForRangeSearch.endValue && categoryForRangeSearch.endValue.dateApi && categoryForRangeSearch.endValue.dateApi.dateObject ) {
                endValue = categoryForRangeSearch.endValue.dateApi.dateObject;
            }
            let dateRangeString = filterPanelUtils.getDateRangeString( startValue, endValue );
            eachCategory.dateRangeString = dateRangeString;
            if( !searchStateContext.activeFilters ) {
                searchStateContext.activeFilters = {};
            }
            if( eachCategory.daterange && eachCategory.daterange.dateRangeSelected ) {
                let currentSelectedValues = searchStateContext.activeFilters[ eachCategory.internalName ];
                let updatedValues = [];
                for( let idx = 0; idx < currentSelectedValues.length; idx++ ) {
                    if( currentSelectedValues[ idx ].indexOf( '_DateFilter_' ) === -1 ) {
                        updatedValues.push( currentSelectedValues[ idx ] );
                    }
                }
                searchStateContext.activeFilters[ eachCategory.internalName ] = updatedValues;
            }
            if( searchStateContext.activeFilters && searchStateContext.activeFilters[ eachCategory.internalName ]
                && searchStateContext.activeFilters[ eachCategory.internalName ].length > 0 ) {
                searchStateContext.activeFilters[ eachCategory.internalName ].push( dateRangeString );
            } else {
                searchStateContext.activeFilters[ eachCategory.internalName ] = [];
                searchStateContext.activeFilters[ eachCategory.internalName ].push( dateRangeString );
            }
            categories[ index ] = eachCategory;
            break;
        }
    }
    searchStateContext.categories = categories;
    searchState.update( searchStateContext );
};

export let initializeDefaultNumericRangeValues = ( defaultStartValue, startValue, defaultEndValue, endValue ) => {
    startValue.dbValue = defaultStartValue ? defaultStartValue : '';
    endValue.dbValue = defaultEndValue ? defaultEndValue : '';
    return {
        startValue: startValue,
        endValue: endValue
    };
};

export let updateDefaultDateRangeValues = ( defaultStartValue, startValue, defaultEndValue, endValue ) => {
    startValue = defaultStartValue ? defaultStartValue : 0;
    endValue = defaultEndValue ? defaultEndValue : 0;
    return {
        startValue: startValue,
        endValue: endValue
    };
};

export let initializeRadioButton = ( category, radioButton ) => {
    let radioButtonUpdatedVMProp = _.cloneDeep( radioButton );
    if( category && category.filterValues && category.filterValues.length > 0 ) {
        for( let index = 0; index < category.filterValues.length; index++ ) {
            let eachFilterValue = category.filterValues[ index ].value;
            if( eachFilterValue.selected && eachFilterValue.selected.dbValue ) {
                radioButtonUpdatedVMProp.dbValue = category.filterValues[ index ].internalName;
            }
        }
    }
    return radioButtonUpdatedVMProp;
};

export let initializeRadioList = ( category, radioFilterList ) => {
    let radioFilterListUpdatedVMProp = _.cloneDeep( radioFilterList );
    radioFilterListUpdatedVMProp.dbValue = [];
    if( category && category.filterValues && category.filterValues.length > 0 ) {
        for( let index = 0; index < category.filterValues.length; index++ ) {
            radioFilterListUpdatedVMProp.dbValue.push( {
                propDisplayValue: createFilterNameAndCount( category.filterValues[ index ] ),
                propInternalValue: category.filterValues[ index ].internalName
            } );
        }
    }
    return radioFilterListUpdatedVMProp;
};

export let changeRadioSelection = ( category, radioButton, radioAction ) => {
    for( let index = 0; index < category.filterValues.length; index++ ) {
        let eachFilterValue = category.filterValues[ index ];
        if( eachFilterValue.internalName === radioButton.dbValue ) {
            eachFilterValue.selected.dbValue = true;
        } else {
            eachFilterValue.selected.dbValue = false;
        }
        category.filterValues[ index ] = eachFilterValue;
    }
    radioAction( category );
};

export let updateSearchStateForRadioFilter = ( searchState, radioFilterCategory ) => {
    let searchStateContext = searchState.value;
    let categories = searchStateContext.categories;
    for( let index = 0; index < categories.length; index++ ) {
        let eachCategory = categories[ index ];
        if( eachCategory.internalName === radioFilterCategory.category.internalName ) {
            categories[ index ] = _.cloneDeep( radioFilterCategory.category );
            if( !searchStateContext.activeFilters ) {
                searchStateContext.activeFilters = {};
            }
            for( let idx = 0; idx < radioFilterCategory.category.filterValues.length; idx++ ) {
                if( radioFilterCategory.category.filterValues[ idx ].selected.dbValue ) {
                    searchStateContext.activeFilters[ eachCategory.internalName ] = [ radioFilterCategory.category.filterValues[ idx ].internalName ];
                    break;
                }
            }
            break;
        }
    }
    searchStateContext.categories = categories;
    searchState.update( searchStateContext );
};

export const updateCategoryToChartBy = ( currentChartByCategoryName, oldChartByCategoryName, searchState ) => {
    const categories = searchState.categories;
    if( categories && categories.length > 0 ) {
        for( let index = 0; index < categories.length; index++ ) {
            let eachCategory = categories[ index ];
            if( eachCategory.internalName === currentChartByCategoryName ) {
                eachCategory = updateCategoryWithColorInfo( true, eachCategory );
                categories[ index ] = eachCategory;
            } else if( eachCategory.internalName === oldChartByCategoryName ) {
                eachCategory = updateCategoryWithColorInfo( false, eachCategory );
                categories[ index ] = eachCategory;
            }
        }
        searchState.categories = categories;
        searchState.objectsGroupedByProperty.internalPropertyName = currentChartByCategoryName;
        sessionStorage.setItem( 'searchChartBy', currentChartByCategoryName );
    }
    return searchState;
};

export let updateCategoryWithColorInfo = ( addColorInfo, category ) => {
    let filterValues = category.filterValues;
    category.showColor = addColorInfo;
    if( filterValues && filterValues.length > 0 ) {
        if( !addColorInfo ) {
            for( let index = 0; index < filterValues.length; index++ ) {
                filterValues[ index ].showColor = addColorInfo;
                delete filterValues[ index ].color;
            }
        } else {
            let updatedFiltersWithColorInfo = filterPanelUtils.getPropGroupValues( category );
            for( let index2 = 0; index2 < updatedFiltersWithColorInfo.length; index2++ ) {
                filterValues[ index2 ].color = updatedFiltersWithColorInfo[ index2 ].propertyGroupID;
                filterValues[ index2 ].colorIndex = updatedFiltersWithColorInfo[ index2 ].colorIndex;
                filterValues[ index2 ].showColor = addColorInfo;
            }
        }
    }
    category.filterValues = filterValues;
    return category;
};

const updateCategoryToChartByOnColorToggle = ( _showColor, searchState ) => {
    const newSearchState = searchState ? { ...searchState.value } : undefined;
    const categories = newSearchState ? newSearchState.categories : undefined;
    if( categories && categories.length > 0 ) {
        for( let index = 0; index < categories.length; index++ ) {
            let eachCategory = categories[ index ];
            if( newSearchState.objectsGroupedByProperty &&
                newSearchState.objectsGroupedByProperty.internalPropertyName === eachCategory.internalName ) {
                eachCategory = updateCategoryWithColorInfo( _showColor, eachCategory );
                categories[ index ] = eachCategory;
            }
        }
        newSearchState.categories = categories;
        newSearchState.colorToggle = filterPanelService.parseBoolean( _showColor );
        searchState.update( newSearchState );
    }
};

export let getToggleCommandSelection = ( prefValue, searchState ) => {
    let _showColor = false;
    var isCommandHighlighted = 'false';
    if( prefValue && prefValue[ 0 ] === 'false' ) {
        isCommandHighlighted = 'true';
        _showColor = true;
    }
    appCtxService.updatePartialCtx( 'decoratorToggle', _showColor );
    appCtxService.updatePartialCtx( 'preferences.AWC_ColorFiltering', [ isCommandHighlighted ] );
    updateCategoryToChartByOnColorToggle( _showColor, searchState );
    let commandSelect = searchHighlightingService.toggleColorFiltering();
    let newSearchState = searchState.getValue();
    newSearchState.colorToggle = commandSelect;
    searchState.update( newSearchState );
    return isCommandHighlighted;
};

export let updateFacetSearchStringInCategory = ( categoryForFacetSearchInput, searchState ) => {
    let searchStateContext = searchState.value;
    let categoryInput = _.cloneDeep( categoryForFacetSearchInput );
    let categories = searchStateContext.categories;
    if( categories && categories.length > 0 ) {
        for( let index = 0; index < categories.length; index++ ) {
            let eachCategory = categories[ index ];
            if( eachCategory.internalName === categoryInput.name ) {
                eachCategory.facetSearchString = categoryInput.facetSearchString;
                categories[ index ] = eachCategory;
            }
        }
        searchStateContext.categories = categories;
        searchState.update( searchStateContext );
    }
};

export let getDateDrillDownClass = ( filter ) => {
    let classValue = '';
    if( filter && filter.showDrilldown ) {
        switch ( filter.drilldown ) {
            case 1:
                classValue = 'aw-search-filterLabelDrilldown1';
                break;
            case 2:
                classValue = 'aw-search-filterLabelDrilldown2';
                break;
            case 3:
                classValue = 'aw-search-filterLabelDrilldown3';
                break;
            case 4:
                classValue = 'aw-search-filterLabelDrilldown4';
                break;
            default:
                break;
        }
    }
    return classValue;
};

export const applyBulkFilters = ( searchState ) => {
    let newSearchState = { ...searchState.value };
    newSearchState.bulkFiltersApplied = true;
    delete newSearchState.positivePendingFilters;
    delete newSearchState.negativePendingFilters;
    delete newSearchState.positivePendingFilterMap;
    delete newSearchState.negativePendingFilterMap;
    searchState.update( newSearchState );
};

export const updateAutoUpdateVMPropAfterSettingPreference = ( searchState, autoApplyFiltersVMPropBoolValue ) => {
    const newSearchState = { ...searchState.value };
    const stringValue = autoApplyFiltersVMPropBoolValue ? 'true' : 'false';
    appCtxService.updatePartialCtx( 'preferences.' + newSearchState.bulkFilteringPreference, [ stringValue ] );
    newSearchState.autoApplyFilters = autoApplyFiltersVMPropBoolValue;
    newSearchState.bulkFiltersApplied = false;
    searchState.update( newSearchState );
};

export const expandUnExpandedCategory = ( isCollapsed, name, props ) => {
    let { category, facetAction } = props;
    if( !isCollapsed && name && category.internalName && name === category.internalName ) {
        let categoryForFacetSearch = {};
        categoryForFacetSearch.name = category.internalName;
        categoryForFacetSearch.facetSearchString = category.facetSearchString;
        categoryForFacetSearch.startIndex = 0;
        categoryForFacetSearch.isServerSearch = category.isServerSearch;
        categoryForFacetSearch.expanded = true;
        categoryForFacetSearch.zeroFiltersFound = Boolean( category.filterValues && !category.isPopulated );
        facetAction( categoryForFacetSearch, category );
    } else if( isCollapsed && name && category.internalName && name === category.internalName ) {
        let categoryForFacetSearch = {};
        categoryForFacetSearch.name = category.internalName;
        categoryForFacetSearch.expanded = false;
        facetAction( categoryForFacetSearch, category );
    }
};

export const isDateRangeValid = ( startVal, endVal ) => {
    let NULL_DATE = -62135579040000;
    let boolValid = false;
    let startValn = startVal.dbValue > 0 ? startVal : 0;
    let endValn = endVal.dbValue > 0 ? endVal : 0;
    //Following takes care of the clearing calendar input case.
    if ( startVal.dbValue === NULL_DATE && endVal.dbValue === NULL_DATE ) {
        return false;
    }
    let startValAsDate = startValn ? getJSDate( startVal.dbValue ) : 0;
    let endValAsDate = endValn ? getJSDate( endVal.dbValue ) : 0;
    let isStartValueValid = startVal && startVal.dbValue !== NULL_DATE && !isNaN( startValAsDate );
    let isEndValueValid = endVal && endVal.dbValue !== NULL_DATE && !isNaN( endValAsDate );
    let areStartAndEndValuesValid = isStartValueValid && isEndValueValid;
    if( isStartValueValid && !isEndValueValid && !isNaN( endValAsDate ) ||
        !isStartValueValid && isEndValueValid && !isNaN( startValAsDate ) ||
        areStartAndEndValuesValid && ( endValAsDate >= startValAsDate || endValn === 0 ) && ( startValAsDate || endValAsDate ) ) {
        boolValid = true;
    }
    return boolValid;
};

export const isNumericRangeValid = ( startVal, endVal ) => {
    let boolValid = false;
    let startValAsNumeric = startVal.dbValue ? parseFloat( startVal.dbValue ) : 0.0;
    let endValAsNumeric = endVal.dbValue ? parseFloat( endVal.dbValue ) : 0.0;
    let isStartValueValid = startVal && startVal.dbValue !== '' && !isNaN( startValAsNumeric );
    let isEndValueValid = endVal && endVal.dbValue !== '' && !isNaN( endValAsNumeric );
    let areStartAndEndValuesValid = isStartValueValid && isEndValueValid;
    if( isStartValueValid && !isEndValueValid && !isNaN( endValAsNumeric ) ||
        !isStartValueValid && isEndValueValid && !isNaN( startValAsNumeric ) ||
        areStartAndEndValuesValid && endValAsNumeric >= startValAsNumeric ) {
        boolValid = true;
    }
    return boolValid;
};

export let getDateRangeString = ( startDate, endDate ) => {
    let startDateUTC = filterPanelUtils.isNullDate( startDate ) ? dateTimeService.NULLDATE : dateTimeService.formatUTC( startDate );
    let endDateUTC = filterPanelUtils.isNullDate( endDate ) ? filterPanelUtils.NO_ENDDATE : dateTimeService.formatUTC( endDate );
    return startDateUTC.substring( 0, 10 ) + ' TO ' + endDateUTC.substring( 0, 10 );
};

export let updateSearchStateForStringFilterInBulkMode = ( category, facetSearchString, searchState ) => {
    const newSearchState = { ...searchState.value };
    let currentAdditionalSearchString = newSearchState.additionalSearchString ? newSearchState.additionalSearchString : newSearchState.criteria.searchString;
    if( facetSearchString.indexOf( ' ' ) > 0 ) {
        currentAdditionalSearchString += ' AND "' + category.displayName + '":' + '"' + facetSearchString + '"';
    } else {
        currentAdditionalSearchString += ' AND "' + category.displayName + '":' + facetSearchString;
    }
    newSearchState.additionalSearchString = currentAdditionalSearchString;
    searchState.update( newSearchState );
};

export let selectFilterCallBackAction = ( filter, selectFilterAction ) => {
    selectFilterAction( filter );
};

export let clearFilterFromProps = ( props ) => {
    //delete props.filter;
};

/**
 * processAddingSearchFiltersToActiveFilters - update the current selected values for the category and return it.
 * @param {Array} currentValues - current values for the category inside activeFilters
 * @param {Object} newFilter - filter object
 * @param {Boolean} isFullTextSearchProvider - is full text search provider
 * @param {Boolean} isInternalValDifferentThanDisplayVal - internal value for filter is different than display value
 * @returns currentValues - updated selected filter values for the category
 */

const processAddingSearchFiltersToActiveFilters = ( currentValues, newFilter, isFullTextSearchProvider, isInternalValDifferentThanDisplayVal ) => {
    if( isInternalValDifferentThanDisplayVal && isFullTextSearchProvider ) {
        currentValues.push( newFilter.name + INTERNAL_KEYWORD + newFilter.internalName );
    } else {
        currentValues.push( newFilter.internalName );
    }
    return currentValues;
};

/**
 * processRemovingSearchFiltersFromActiveFilters - update the current selected values for the category and return it.
 * @param {Array} currentValues - current values for the category inside activeFilters
 * @param {Object} newFilter - filter object
 * @returns currentValues - updated selected filter values for the category
 */

const processRemovingSearchFiltersFromActiveFilters = ( currentValues, newFilter ) => {
    let updatedValues = [];
    for( let index = 0; index < currentValues.length; index++ ) {
        let eachValueArray = currentValues[ index ].split( INTERNAL_KEYWORD );
        let eachInternalVal = eachValueArray && eachValueArray.length === 2 ? eachValueArray[ 1 ] : currentValues[ index ];
        if( eachInternalVal !== newFilter.internalName ) {
            updatedValues.push( eachInternalVal );
        }
    }
    return updatedValues;
};

export let updateInputSearchFilterMap = ( filter, category, searchState ) => {
    let newSearchState = { ...searchState.value };
    let newFilter = { ...filter.value };
    let isFullTextSearchProvider = newSearchState.provider === 'Awp0FullTextSearchProvider';
    newSearchState.lastSelectedFilterAndCategoryInfo = {
        lastSelectedFilter: newFilter,
        lastAction: 'selectFilter'
    };
    if( !newSearchState.activeFilters ) {
        newSearchState.activeFilters = {};
    }
    let isInternalValDifferentThanDisplayVal = newFilter.internalName !== newFilter.name && newFilter.internalName !== FTS_KEYWORD_NONE;
    if( newSearchState.activeFilters[ newFilter.categoryName ] ) {
        let currentValues = newSearchState.activeFilters[ newFilter.categoryName ];
        let updatedValues = [];
        if( newFilter.selected.dbValue ) {
            switch( category.type ) {
                case 'NumericFilter':
                    currentValues.push( filterPanelUtils.INTERNAL_NUMERIC_FILTER + newFilter.internalName );
                    break;
                case 'ObjectFilter':
                    currentValues = [ newFilter.internalName ];
                    break;
                case 'StringFilter': {
                    currentValues = processAddingSearchFiltersToActiveFilters( currentValues, newFilter, isFullTextSearchProvider, isInternalValDifferentThanDisplayVal );
                    break;
                }
                default:
                    currentValues.push( newFilter.internalName );
                    break;
            }
            newSearchState.activeFilters[ newFilter.categoryName ] = currentValues;
        } else {
            switch( category.type ) {
                case 'ObjectFilter': {
                    updatedValues = searchFilterService.removeDependentClassificationFilters( newFilter );
                    break;
                }
                case 'NumericFilter': {
                    for( let index = 0; index < currentValues.length; index++ ) {
                        if( currentValues[ index ] !==  filterPanelUtils.INTERNAL_NUMERIC_FILTER + newFilter.internalName  ) {
                            updatedValues.push( currentValues[ index ] );
                        }
                    }
                    break;
                }
                case 'StringFilter': {
                    updatedValues = processRemovingSearchFiltersFromActiveFilters( currentValues, newFilter );
                    break;
                }
                default: {
                    for( let index = 0; index < currentValues.length; index++ ) {
                        if( currentValues[ index ] !== newFilter.internalName ) {
                            updatedValues.push( currentValues[ index ] );
                        }
                    }
                    break;
                }
            }
            if( updatedValues.length > 0 ) {
                newSearchState.activeFilters[ newFilter.categoryName ] = updatedValues;
            } else {
                delete newSearchState.activeFilters[ newFilter.categoryName ];
            }
        }
    } else {
        switch( category.type ) {
            case 'NumericFilter':
                newSearchState.activeFilters[ newFilter.categoryName ] = [ filterPanelUtils.INTERNAL_NUMERIC_FILTER + newFilter.internalName ];
                break;
            case 'StringFilter': {
                let values = processAddingSearchFiltersToActiveFilters( [], newFilter, isFullTextSearchProvider, isInternalValDifferentThanDisplayVal );
                newSearchState.activeFilters[ newFilter.categoryName ] = values;
                break;
            }
            default:
                newSearchState.activeFilters[ newFilter.categoryName ] = [ newFilter.internalName ];
                break;
        }
    }
    switch( category.type ) {
        case 'DateFilter':
            newSearchState.activeFilters = searchState.dependentDateFilters !== false ?
                searchFilterService.removeDependentDateFilters( newSearchState.activeFilters ) : newSearchState.activeFilters;
            break;
        default:
            break;
    }
    if( newSearchState.activeFilters && Object.keys( newSearchState.activeFilters ).length > 0 ) {
        for( const[ key, value ] of Object.entries( newSearchState.activeFilters ) ) {
            let eachSetOfValues = value;
            let setOfValues = new Set( eachSetOfValues );
            eachSetOfValues = setOfValues.size > 0 ? Array.from( setOfValues ) : [];
            if( eachSetOfValues.length > 0 ) {
                newSearchState.activeFilters[ key ] = eachSetOfValues;
            } else {
                delete newSearchState.activeFilters[ key ];
            }
        }
    }
    searchState.update( newSearchState );
};

export const showAllCategories = ( searchState ) => {
    let newSearchState = { ...searchState.value };
    newSearchState.categoriesToShowCount = 0;
    newSearchState.allCategoriesVisible = true;
    searchState.update( newSearchState );
};

export const excludeCategory = ( searchState, category, excludeCategoryToggleValue ) => {
    let newSearchState = { ...searchState.value };
    let updatedCategories = newSearchState.categories.map( ( cat ) => {
        if( cat.internalName === category.internalName ) {
            let updatedCategory = { ...cat };
            updatedCategory.excludeCategory = !excludeCategoryToggleValue;
            return updatedCategory;
        }
        return cat;
    } );
    newSearchState.categories = updatedCategories;
    searchState.update( newSearchState );
};

export const filterCategoryToggle = ( toggleStatus, toggleFunction ) => {
    toggleFunction( !toggleStatus.dbValue );
};

export const updateToggleState = ( toggleState )=>{
    return toggleState;
};

export const setFocusForFilter = ( filter ) => {
    if( filter && filter.autoFocus ) {
        filter.selected.autoFocus = filter.autoFocus ? filter.autoFocus : false;
    }
    return filter;
};

const AwFilterPanelUtils = {
    createFilterNameAndCount,
    updateNumberOfFiltersToShowForMoreLink,
    updateNumberOfFiltersToShowForLessLink,
    updateNumberOfFiltersShownAndFacetSearchString,
    updateVMPropFromPassedInValueOfDefaultFilterDisplayCount,
    updateCategoriesAfterFacetSearch,
    getSearchFilterMapForFacetSearch,
    getFilteredResults,
    restrictFilterValuesToNumberOfFiltersToShow,
    filterOutCategories,
    updateNumberOfFiltersToShowForMoreLinkAfterFacetSearch,
    updateExpandFlagForCategory,
    updateSearchStateWithNumericRangeCriteria,
    initializeDefaultNumericRangeValues,
    updateSearchStateWithDateRangeCriteria,
    updateDefaultDateRangeValues,
    initializeRadioButton,
    initializeRadioList,
    changeRadioSelection,
    updateSearchStateForRadioFilter,
    getToggleCommandSelection,
    updateCategoryToChartBy,
    updateFacetSearchStringInCategory,
    getDateDrillDownClass,
    applyBulkFilters,
    updateAutoUpdateVMPropAfterSettingPreference,
    expandUnExpandedCategory,
    setCategoryExpandCollapseStateInSearchState,
    readExpandCollapseValueFromSearchState,
    isDateRangeValid,
    isNumericRangeValid,
    getDateRangeString,
    updateSearchStateForStringFilterInBulkMode,
    constructActiveFilterMapForFacetSearch,
    arrangeFilterMap,
    removeDuplicateSelectedFilters,
    setMapForFilterValueSearch,
    updateCategoryWithColorInfo,
    updateListOfExpandedCategoriesInSearchState,
    selectFilterCallBackAction,
    clearFilterFromProps,
    updateInputSearchFilterMap,
    showAllCategories,
    excludeCategory,
    filterCategoryToggle,
    updateToggleState,
    setFocusForFilter
};

export default AwFilterPanelUtils;
