// Copyright 2019 Siemens.

/* global */

/**
 *
 * @module js/searchCommonUtils
 */

import filterPanelUtils from 'js/filterPanelUtils';
import filterPanelService from 'js/filterPanelService';
import searchFilterService from 'js/aw.searchFilter.service';
import { getSelectedFiltersMap } from 'js/awSearchSublocationService';
import searchStateHelperService from 'js/searchStateHelperService';
import soaService from 'soa/kernel/soaService';
import appCtxService from 'js/appCtxService';
import AwStateService from 'js/awStateService';
import _cmm from 'soa/kernel/clientMetaModel';
import AwPromiseService from 'js/awPromiseService';
import logger from 'js/logger';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import GlobalSearchService from 'js/globalSearchService';
import dateTimeService from 'js/dateTimeService';

const updatedResultsHiddenCategoryName = 'UpdatedResults.hidden_filter';
const searchStateAttributes = [ 'totalFound', 'totalLoaded', 'endIndex', 'startIndex', 'searchFilterCategories', 'additionalSearchInfoMap', 'unpopulatedSearchFilterCategories', 'searchFilterMap',
    'objectsGroupedByProperty', 'columnConfig', 'propDescriptors', 'hasMoreFacetValues', 'defaultFilterFieldDisplayCount', 'additionalInfoMessages', 'thresholdExceeded', 'chartProvider',
    'bulkFiltersApplied', 'recreateChartProvider', 'searchSnippets', 'categories', 'appliedFilterMap', 'categoryInternalToDisplayNameMap', 'appliedFilters', 'saveSearchFilterMap',
    'categoriesForRangeSearches', 'isFacetSearch', 'searchInProgress', 'categoriesToShowCount', 'regroupColors', 'advancedSearchCriteria', 'filterCategories', 'objectsGroupedByProperty', 'lastEndIndex',
    'searchString', 'searchFilterCategories', 'searchFilterMap', 'filterMap', 'referencingSavedQuery', 'advancedSearchJSONString', 'savedQuery', 'savedQueryAttributes', 'searchCriteriaMap'
];

let searchHistoryCache = undefined;

/**
 * @function processSoaResponse
 * @param {ObjectArray} properties properties
 * @returns {ObjectArray} Filters.
 */
export let processSoaResponse = function( properties ) {
    var filters = [];

    if( properties ) {
        _.forEach( properties, function( property ) {
            var filter = {};
            filter.internalName = property.internalName;
            filter.displayName = property.displayName;
            filter.listItems = property.values.map( function( value ) {
                return {
                    staticDisplayValue: value.displayName,
                    staticElementObject: value.internalName
                };
            } );
            filters.push( filter );
        } );
    }
    return filters;
};

/**
 * Process response of getSubTypeNames SOA
 * @param {Object} response - response of getSubTypeNames SOA
 * @returns {StringArray} type names array
 */
const processGetSubTypeNamesSoaResponse = ( response ) => {
    var typeNames = [];
    if( response.output ) {
        for( var ii = 0; ii < response.output.length; ii++ ) {
            var displayableBOTypeNames = response.output[ ii ].subTypeNames;
            for( var jj = 0; jj < displayableBOTypeNames.length; jj++ ) {
                var SearchFilter = {
                    searchFilterType: 'StringFilter',
                    stringValue: ''
                };
                SearchFilter.stringValue = displayableBOTypeNames[ jj ];
                typeNames.push( SearchFilter );
            }
        }
    }
    return typeNames;
};

/**
 * @function getLimitedFilterCategoriesEnabled - this function checks if AWC_LIMITED_FILTER_CATEGORIES_ENABLED is true
 * @returns { String } 'true'/'false'
 */

export let getLimitedFilterCategoriesEnabled = function() {
    var isLimitedFilterCategoriesEnabled = filterPanelUtils.isLimitedCategoriesFeatureEnabled();
    if( isLimitedFilterCategoriesEnabled ) {
        return 'true';
    }
    return 'false';
};

/**
 * @function getThresholdState - gets the threshold value from additionalSearchInfoMap in SOA response.
 * @returns {String} 'true'/'false'
 */

export let getThresholdState = function( data ) {
    if( data.additionalSearchInfoMap && data.additionalSearchInfoMap.searchExceededThreshold ) {
        //Check search exceeded threshold
        return data.additionalSearchInfoMap.searchExceededThreshold[ 0 ];
    }
    return 'false';
};

/**
 * Get the default page size used for max to load/return.
 * @param {Array|Object} defaultPageSizePreference - default page size from server preferences
 * @returns {Number} The amount of objects to return from a server SOA response.
 */
export let getDefaultPageSize = function( defaultPageSizePreference ) {
    var defaultPageSize = 50;

    if( defaultPageSizePreference ) {
        if( _.isArray( defaultPageSizePreference ) ) {
            defaultPageSize = searchCommonUtils.getDefaultPageSize( defaultPageSizePreference[ 0 ] );
        } else if( _.isString( defaultPageSizePreference ) ) {
            defaultPageSize = parseInt( defaultPageSizePreference );
        } else if( _.isNumber( defaultPageSizePreference ) && defaultPageSizePreference > 0 ) {
            defaultPageSize = defaultPageSizePreference;
        }
    }

    return defaultPageSize;
};

/**
 * Get the search threshold state value based on the count of the first filter value of 'TYPE' category from context.
 * @param {Array|Object} filterMap - search Filter Map stored in context
 * @returns {Boolean} is threshold state true or false.
 */
export let checkFilterMapForThreshold = ( filterMap ) => {
    //Go through filter map to find type category
    //check the count against the first filter in type category
    //If the category and the filter exist but the count is 0 then we know threshold was applied
    let count;
    if( filterMap ) {
        for( let index = 0; index < filterMap.length; index++ ) {
            let category = filterMap[ index ];
            // category.filterValues added in temp basis, search team can make it correct
            if( category.internalName === 'WorkspaceObject.object_type' && category.filterValues ) {
                count = category.filterValues[ 0 ].count;
                return count === 0;
            }
        }
    }
    return false;
};

/**
 * Converts the date range search into UTC time so that property specific search for date properties is done properly.
 * @param {*} searchCriteria - the search criteria for global search/ add panel search
 * @returns {String} searchCriteria - modified search criteria if it is non range date criteria
 */
var processSingleDateSearch = function( searchCriteria ) {
    var result;
    //Now handling the remaining individual date strings in the format ": yyyy-mm-dd"
    var datePattern = /[^:|^\s]+:\s*[\[|\{]{0,1}\s*((\d{4})-(\d{1,2})-(\d{1,2}))\s*[\]|\}]{0,1}$/gi;
    while( ( result = datePattern.exec( searchCriteria ) ) !== null ) {
        var fromDateUTC1 = new Date( result[ 2 ], result[ 3 ] - 1, result[ 4 ], 0, 0, 0 )
            .toISOString().split( '.' )[ 0 ] + 'Z';
        var toDateUTC1 = new Date( result[ 2 ], result[ 3 ] - 1, result[ 4 ], 23, 59, 59 )
            .toISOString().split( '.' )[ 0 ] + 'Z';

        if( result[ 0 ].indexOf( '{' ) === -1 && result[ 0 ].indexOf( '[' ) === -1 ) {
            fromDateUTC1 = '[' + fromDateUTC1;
        }
        if( result[ 0 ].indexOf( '}' ) === -1 && result[ 0 ].indexOf( ']' ) === -1 ) {
            toDateUTC1 += ']';
        }

        var result1 = result[ 0 ].replace( result[ 1 ], fromDateUTC1 + ' TO ' + toDateUTC1 );
        searchCriteria = searchCriteria.replace( result[ 0 ], result1 );
    }
    return searchCriteria;
};

/**
 * Converts the date range search into UTC time so that property specific search is done properly.
 * Fixes the part where the date is not correctly converted into UTC time
 * @param {String} searchCriteria - the search criteria for global search/ add panel search
 * @returns {String} searchCriteria - modified search criteria if it is date criteria
 */
export let processDateSearchCriteria = function( searchCriteria ) {
    //Regex for date range pattern to handle "prop:[|{NOW|*|yyyy-mm-dd to NOW|*|yyyy-mm-dd}|]" format
    var dateRangePattern = /([^:|^\s]+:)(\s*[\[|\{]{0,1})\s*(\*|NOW|(\d{4})-(\d{1,2})-(\d{1,2}))\s+TO\s+((\d{4})-(\d{1,2})-(\d{1,2})|NOW|\*)([\]|\}]{0,1})/gi;

    //Example of regex matching and groups
    //Date:{2016-01-01 TO 2016-01-03}
    //Breakdown:
    // Group 0 :  Entire String
    // Group 1 :  Date:
    // Group 2 :  {
    // Group 3 :  2016-01-01
    // Group 4 :  2016
    // Group 5 :  01
    // Group 6 :  01
    // Group 7 :  2016-01-03
    // Group 8 :  2016
    // Group 9 :  01
    // Group 10:  03
    // Group 11:  }

    var result;
    while( ( result = dateRangePattern.exec( searchCriteria ) ) !== null ) {
        var fromDate;
        var fromDateUTC;
        if( result[ 2 ] && result[ 2 ].indexOf( ' ' ) !== -1 && ( result[ 2 ].indexOf( '[' ) !== -1 || result[ 2 ].indexOf( '{' ) !== -1 ) ) {
            result[ 2 ] = result[ 2 ].trim();
        }

        //Check if the first part of the date range is actual date or * or NOW
        if( result[ 3 ] !== '*' && result[ 3 ] !== 'NOW' ) {
            fromDate = new Date( result[ 4 ], result[ 5 ] - 1, result[ 6 ], 0, 0, 0 );
            //If the date expression starts with {, then move the date forward by 1 day
            if( result[ 2 ] === '{' ) {
                fromDate.setDate( fromDate.getDate() + 1 );
            }
            fromDateUTC = fromDate.toISOString().split( '.' )[ 0 ] + 'Z';
        } else {
            fromDate = result[ 3 ];
            fromDateUTC = fromDate;
        }

        var toDate;
        var toDateUTC;
        //Check if the second part of date range is * or NOW
        if( result[ 7 ] !== '*' && result[ 7 ] !== 'NOW' ) {
            toDate = new Date( result[ 8 ], result[ 9 ] - 1, result[ 10 ], 23, 59, 59 );
            //If the date expression ends with }, we will have to move the day back by 1
            if( result[ 11 ] === '}' ) {
                toDate.setDate( toDate.getDate() - 1 );
            }
            toDateUTC = toDate.toISOString().split( '.' )[ 0 ] + 'Z';
        } else {
            toDate = result[ 7 ];
            toDateUTC = toDate;
        }

        //Reconstruct range query: exp: bracket(?) + fromDate + TO + toDate + bracket(?)
        if( !result[ 2 ] || !result[ 11 ] ) {
            result[ 2 ] = '[';
            result[ 11 ] = ']';
        }
        var modifiedRange;
        if( result[ 11 ] === ']' && result[ 7 ] !== '*' ) {
            modifiedRange = result[ 1 ] + result[ 2 ] + fromDateUTC + ' TO ' + toDateUTC + '-1SECOND' + result[ 11 ];
        } else {
            modifiedRange = result[ 1 ] + result[ 2 ] + fromDateUTC + ' TO ' + toDateUTC + result[ 11 ];
        }
        searchCriteria = searchCriteria.replace( result[ 0 ], modifiedRange );
    }

    searchCriteria = processSingleDateSearch( searchCriteria );

    return searchCriteria;
};

/**
 * gets the translated search criteria from server with the current locale's display value of the property in case of property specific search
 * @function getTranslatedSearchCriteria
 * @param {Array} searchCriteriaWithInternalNames - search criteria with internal names of the property
 * @param {String} searchCriteria - original search criteria
 */
export let getTranslatedSearchCriteria = function( searchCriteriaWithInternalNames, searchCriteria ) {
    let translatedSearchCriteria = searchCriteriaWithInternalNames;
    soaService.post( 'Internal-AWS2-2020-05-FullTextSearch', 'getSearchSettings', {
        searchSettingInput: {
            inputSettings: {
                getTranslatedSearchCriteriaForCurrentLocale: searchCriteriaWithInternalNames
            }
        }
    } ).then( function( result ) {
        if( result && result.outputValues && result.outputValues.getTranslatedSearchCriteriaForCurrentLocale &&
            result.outputValues.getTranslatedSearchCriteriaForCurrentLocale.length === 1 && result.outputValues.getTranslatedSearchCriteriaForCurrentLocale[ 0 ].length > 0 ) {
            translatedSearchCriteria = result.outputValues.getTranslatedSearchCriteriaForCurrentLocale[ 0 ];
        }
        if( translatedSearchCriteria && translatedSearchCriteria.length > 0 && translatedSearchCriteria.indexOf( 'V_A_L' ) === -1 ) {
            searchCriteria.searchString = translatedSearchCriteria;
        }
    } );
};

/**
 * scans the report definition to get all the information related to translated report definition criteria
 * @function scanReportDefinitionForTranslatedSearchCriteria
 * @param {Array} params - rd_params in ReportDefinition object
 * @param {Array} paramValues - rd_param_values in ReportDefinition object
 * @returns {Array} values - array containing the translated report definition criteria
 */
export let scanReportDefinitionForTranslatedSearchCriteria = function( params, paramValues ) {
    let index = 0;
    let values = [];
    while( index < paramValues.length ) {
        let param = params[ index ];
        if( param === 'ReportTranslatedSearchCriteria' ) {
            values.push( paramValues[ index ] );
        }
        index++;
    }
    return values;
};

/**
 * checks if the property name is of type DCP ( Dynamic Compound Property )
 * @function checkIfDCPProperty
 * @param {String} propertyName - name of the property
 * @returns {Boolean} - returns whether the property is a dynamic compound property or not.
 */
export let checkIfDCPProperty = function( propertyName ) {
    if( propertyName.indexOf( '.' ) !== -1 &&
        propertyName.indexOf( '(' ) !== -1 &&
        ( propertyName.indexOf( 'REFBY' ) !== -1 ||
            propertyName.indexOf( 'GRMREL' ) !== -1 ||
            propertyName.indexOf( 'GRMS2PREL' ) !== -1 ||
            propertyName.indexOf( 'GRM' ) !== -1 ||
            propertyName.indexOf( 'GRMS2P' ) !== -1 ||
            propertyName.indexOf( 'REF' ) !== -1
        )
    ) {
        return true;
    }
    return false;
};

export const initializeSearchState = ( searchState, sourceSearchFilterMap, subPanelContext ) => {
    let newSearchState = subPanelContext.searchState ? subPanelContext.searchState.value : { ...searchState.value };
    //if subPanelContext contains searchState, that should be set
    if( !subPanelContext.searchState ) {
        // this code initializes the searchState for 'Search' Tab
        let searchContext = {
            showChartColorBars: false,
            bulkFiltering: true,
            criteria: {
                forceThreshold: 'true',
                searchFromLocation: 'addPanel',
                getGroupedCategories: 'true'
            },
            provider: 'Awp0FullTextSearchProvider',
            sortType: 'Priority'
        };
        let updatedSearchContext = searchStateHelperService.constructBaseSearchCriteria( searchContext );
        newSearchState = { ...updatedSearchContext };
        newSearchState.objectsGroupedByProperty = null;
        newSearchState.selectedFiltersString = '';
        newSearchState.label = {
            source: '/i18n/SearchMessages',
            key: 'resultsText'
        };
    }
    const applyPresetTypeFilters = subPanelContext.typeFilter &&
        filterPanelUtils.isPresetFilters();
    newSearchState.applyPresetTypeFilters = applyPresetTypeFilters;
    let updatedSourceSearchFilterMap = _.cloneDeep( sourceSearchFilterMap );
    if( newSearchState.immutableSearchInfo ) {
        newSearchState.criteria.searchString = newSearchState.immutableSearchInfo.immutableSearchString;
        updatedSourceSearchFilterMap = searchCommonUtils.addImmutableSearchFilterMapToActiveFilterMap( updatedSourceSearchFilterMap, newSearchState.immutableSearchInfo );
    }
    newSearchState.activeFilterMap = updatedSourceSearchFilterMap;
    newSearchState.sourceSearchFilterMap = sourceSearchFilterMap;

    let isSearchStringValid = searchState &&
        searchState.criteria && searchState.criteria.searchString && searchState.criteria.searchString.length > 0;
    if( isSearchStringValid && applyPresetTypeFilters ) {
        newSearchState.filterString = '';
    }
    if( isSearchStringValid && !filterPanelUtils.isPresetFilters() ) {
        let selectedFiltersInfo = searchCommonUtils.createActiveFiltersFromActiveFilterMap( searchState.activeFilterMap );
        newSearchState.filterString = selectedFiltersInfo.filterString;
        newSearchState.activeFilters = selectedFiltersInfo.activeFilters;
    }
    if( newSearchState.criteria && !newSearchState.criteriaJSONString ) {
        newSearchState.criteriaJSONString = JSON.stringify( newSearchState.criteria );
    }
    return newSearchState;
};

export const createActiveFiltersFromActiveFilterMap = ( activeFilterMap ) => {
    let activeFiltersMap = {};
    for( const [ key, value ] of Object.entries( activeFilterMap ) ) {
        for( const element of value ) {
            let stringValue = element.stringValue;
            if( activeFiltersMap[ key ] && activeFiltersMap[ key ].length > 0 ) {
                let existingValues = activeFiltersMap[ key ];
                if ( element.searchFilterType === 'DateFilter' ) {
                    let dateElement = element;
                    if( !dateElement.startDateValue || dateElement.startDateValue && dateElement.startDateValue.includes( filterPanelUtils.BEGINNING_OF_TIME ) ) {
                        dateElement.startDateValue = filterPanelUtils.NO_STARTDATE;
                    }
                    if( !dateElement.endDateValue ) {
                        let endDate = new Date( filterPanelUtils.ENDING_OF_TIME );
                        dateElement.endDateValue = dateTimeService.formatUTC( endDate.setHours( 23, 59, 59 ) );
                    }
                    stringValue = filterPanelUtils.INTERNAL_DATE_FILTER + dateElement.startDateValue + filterPanelUtils.INTERNAL_TO + dateElement.endDateValue;
                } else if ( element.startEndRange === filterPanelUtils.NUMERIC_RANGE
                    || element.startEndRange === filterPanelUtils.NumericRangeBlankStart
                    || element.startEndRange === filterPanelUtils.NumericRangeBlankEnd ) {
                    stringValue = filterPanelUtils.getNumericRangeString(
                        element.startNumericValue, element.endNumericValue );
                }
                existingValues.push( stringValue );
                activeFiltersMap[ key ] = existingValues;
            } else {
                if ( element.searchFilterType === 'DateFilter' ) {
                    let dateElement = element;
                    if( !dateElement.startDateValue || dateElement.startDateValue && dateElement.startDateValue.includes( filterPanelUtils.BEGINNING_OF_TIME ) ) {
                        dateElement.startDateValue = filterPanelUtils.NO_STARTDATE;
                    }
                    if( !dateElement.endDateValue ) {
                        let endDate = new Date( filterPanelUtils.ENDING_OF_TIME );
                        dateElement.endDateValue = dateTimeService.formatUTC( endDate.setHours( 23, 59, 59 ) );
                    }
                    stringValue = filterPanelUtils.INTERNAL_DATE_FILTER + dateElement.startDateValue + filterPanelUtils.INTERNAL_TO + dateElement.endDateValue;
                    activeFiltersMap[ key ] = [ stringValue ];
                } else if ( element.startEndRange === filterPanelUtils.NUMERIC_RANGE
                    || element.startEndRange === filterPanelUtils.NumericRangeBlankStart
                    || element.startEndRange === filterPanelUtils.NumericRangeBlankEnd ) {
                    stringValue = filterPanelUtils.getNumericRangeString(
                        element.startNumericValue, element.endNumericValue );
                }
                activeFiltersMap[ key ] = [ stringValue ];
            }
        }
    }
    let activeFiltersInfo = searchFilterService.buildSearchFiltersFromSearchState( activeFiltersMap );
    activeFiltersInfo.filterString = searchFilterService.buildFilterString( activeFiltersMap );
    activeFiltersInfo.activeFilters = activeFiltersMap;
    return activeFiltersInfo;
};

const setActiveFilterMapWithPrefilters = ( showPrefilter, selectPrefilter3, newSearchState ) => {
    if( showPrefilter ) {
        newSearchState.activeFilterMap = {
            sources: []
        };

        _.forEach( selectPrefilter3, function( value ) {
            let overWriteSource = {
                searchFilterType: 'StringFilter',
                stringValue: value,
                stringDisplayValue: value,
                colorValue: '',
                startDateValue: '',
                endDateValue: '',
                startNumericValue: 0,
                endNumericValue: 0,
                count: 0,
                selected: false,
                startEndRange: ''
            };
            newSearchState.activeFilterMap.sources.push( overWriteSource );
        } );
    }
    return newSearchState;
};

export const updateSearchHistoryCache = ( props ) => {
    searchHistoryCache = props.searchHistoryCache ? props.searchHistoryCache : undefined;
};

export const updateSearchState = ( searchString, subPanelContext, categoryPrefilter, showPrefilter ) => {
    const selectedSource = GlobalSearchService.instance._prevSelectedDataSources;
    if( subPanelContext.disableEmptySearch === 'true' && !searchString ) {
        return;
    }
    const searchState = subPanelContext.searchState;
    const preFilterContext = subPanelContext.preFilterContext;
    const applyPresetTypeFilters = preFilterContext && preFilterContext.typeFilter &&
        filterPanelUtils.isPresetFilters();
    let newSearchState = { ...searchState.value };
    let oldSearchString = newSearchState?.criteria?.searchString;
    const hasSearchStringChanged = newSearchState && newSearchState.criteria && _.trimEnd( newSearchState.criteria.searchString ) !== _.trimEnd( searchString );
    if( !newSearchState.criteria ) {
        newSearchState.criteria = {};
    }
    let criteria = searchStateHelperService.getCriteriaForNewSearch( newSearchState, searchString );
    newSearchState.criteria = { ...criteria, ...searchState.additionalCriteria };
    if( searchState.updateSearchCriteriaCallback ) {
        newSearchState.criteria = searchState.updateSearchCriteriaCallback( newSearchState.criteria );
    }
    newSearchState.filterString = '';
    newSearchState.applyPresetTypeFilters = applyPresetTypeFilters;
    delete newSearchState.searchFilterCategories;
    delete newSearchState.categories;
    delete newSearchState.groupedCategories;
    delete newSearchState.searchGroupedCategories;
    delete newSearchState.activeFilters;
    delete newSearchState.appliedFilters;
    delete newSearchState.categoriesExpandCollapseMap;
    delete newSearchState.userSelectedTypeFiltersApplied;
    delete newSearchState.categoriesWithMoreThanDefaultNumberOfFiltersShown;
    newSearchState.totalFound = undefined;
    newSearchState.searchInProgress = true;
    newSearchState.allCategoriesVisible = undefined;
    newSearchState.activeFilterMap = searchState.sourceSearchFilterMap;

    if( preFilterContext && preFilterContext.searchFilter ) {
        let searchFiltersMap = _.cloneDeep( newSearchState.activeFilterMap );
        if( applyPresetTypeFilters ) {
            delete searchFiltersMap[ filterPanelUtils.PRESET_CATEGORY ];
        }
        let activeFiltersInfo = searchCommonUtils.createActiveFiltersFromActiveFilterMap( searchFiltersMap );
        newSearchState.filterString = activeFiltersInfo.filterString;
        newSearchState.activeFilters = activeFiltersInfo.activeFilters;
    }
    if( oldSearchString && hasSearchStringChanged === false ) {
        newSearchState.criteria.searchString = toggleSearchString( oldSearchString );
    }
    newSearchState.criteriaJSONString = JSON.stringify( newSearchState.criteria );

    newSearchState = setActiveFilterMapWithPrefilters( showPrefilter, selectedSource, newSearchState );

    searchState.update( newSearchState );
    eventBus.publish( 'search.suggestiveSearch', {
        criteria: newSearchState.criteria.searchString,
        filterMap: null,
        filterString: newSearchState.filterString,
        source: 'addPanelSearch',
        searchHistoryCache: searchHistoryCache || null
    } );
};

export const toggleSearchString = ( searchString ) => {
    let newSearchString = searchString;
    if( _.endsWith( searchString, ' ' ) ) {
        newSearchString = _.trimEnd( searchString );
    } else {
        newSearchString += ' ';
    }
    return newSearchString;
};

const constructActiveFilterMapFromOutputSearchFilterMap = ( searchState ) => {
    let newSearchState = _.cloneDeep( searchState );
    let categories = filterPanelService.getCategories3( newSearchState, !searchState.hideRange );
    let activeSelectedFiltersMap = getSelectedFiltersMap( categories );
    let activeFiltersInfo = searchFilterService.buildSearchFiltersFromSearchState( activeSelectedFiltersMap );
    return activeFiltersInfo.activeFilterMap;
};

const updateActiveFilterMapWithImmmutableSearchFilters = ( currentActiveFilterMap, sourceSearchFilterMap, searchState ) => {
    let updatedActiveFilterMap = {};
    if( searchState.immutableCategories && searchState.immutableCategories.length > 0 ) {
        for( const [ categoryKey, categoryValue ] of Object.entries( currentActiveFilterMap ) ) {
            let filterType = categoryValue[ 0 ].searchFilterType;
            if( Object.keys( sourceSearchFilterMap ).includes( categoryKey ) ) {
                let immutableFilterMapValue = searchState.immutableFilterMap[ categoryKey ];
                let immutableFilterMapValues = immutableFilterMapValue.map( a => a.stringValue );
                let currentFilterMapWithCategoryKeyValues = currentActiveFilterMap[ categoryKey ].map( b => b.stringValue );
                let combinedValues = Array.from( new Set( immutableFilterMapValues.concat( currentFilterMapWithCategoryKeyValues ) ) );
                let updatedCategoryValues = [];
                for( let index = 0; index < combinedValues.length; index++ ) {
                    updatedCategoryValues.push( {
                        stringValue: combinedValues[ index ],
                        searchFilterType: filterType
                    } );
                }
                updatedActiveFilterMap[ categoryKey ] = updatedCategoryValues;
            } else {
                updatedActiveFilterMap[ categoryKey ] = categoryValue;
            }
        }
        for( const [ categoryKey2, categoryValue2 ] of Object.entries( sourceSearchFilterMap ) ) {
            if( !updatedActiveFilterMap[ categoryKey2 ] ) {
                updatedActiveFilterMap[ categoryKey2 ] = categoryValue2;
            }
        }
    } else {
        return currentActiveFilterMap;
    }
    return updatedActiveFilterMap;
};

/**
 * addImmutableSearchFilterMapToActiveFilterMap - add the immutable filters to activeFilterMap
 * @param {Object} activeFilterMap original active filter map
 * @param {Object} immutableSearchInfo the object containing immutable info for search
 * @returns {Object} activeFilterMap - updated active filter map
 */
export const addImmutableSearchFilterMapToActiveFilterMap = ( activeFilterMap, immutableSearchInfo ) => {
    let immutableSearchFilterMap = immutableSearchInfo ? immutableSearchInfo.immutableSearchFilterMap : undefined;
    if( immutableSearchFilterMap && Object.keys( immutableSearchFilterMap ).length > 0 ) {
        for( const [ key, value ] of Object.entries( immutableSearchFilterMap ) ) {
            if( activeFilterMap[ key ] ) {
                let existingValues = activeFilterMap[ key ];
                for( let index = 0; index < value.length; index++ ) {
                    existingValues.push( value[ index ] );
                }
                activeFilterMap[ key ] = existingValues;
            } else {
                let newValues = [];
                for( let index = 0; index < value.length; index++ ) {
                    newValues.push( value[ index ] );
                }
                activeFilterMap[ key ] = newValues;
            }
        }
    }
    return activeFilterMap;
};


const setSearchFilterMapSourcesWithActiveFilterMapSources = ( showPrefilter, newSearchState, searchState ) => {
    if( showPrefilter && newSearchState ) {
        const selectedSource = GlobalSearchService.instance._prevSelectedDataSources;
        newSearchState.activeFilterMap.sources = [];
        _.forEach( selectedSource, function( value ) {
            let overWriteSource = {
                searchFilterType: 'StringFilter',
                stringValue: value,
                stringDisplayValue: value,
                colorValue: '',
                startDateValue: '',
                endDateValue: '',
                startNumericValue: 0,
                endNumericValue: 0,
                count: 0,
                selected: false,
                startEndRange: ''
            };
            newSearchState.activeFilterMap.sources.push( overWriteSource );
        } );
    }
    return newSearchState;
};

export const updateSearchStateAfterFilterAction = ( searchState, showPrefilter ) => {
    let newSearchState = { ...searchState.value };
    if( newSearchState && newSearchState.activeFilters ) {
        const selectedFiltersInfo = searchFilterService.buildSearchFiltersFromSearchState( newSearchState.activeFilters );
        const updatedActiveFilterMap = updateActiveFilterMapWithImmmutableSearchFilters( selectedFiltersInfo.activeFilterMap, newSearchState.sourceSearchFilterMap, newSearchState );
        const selectedFiltersString = searchFilterService.buildFilterString( newSearchState.activeFilters );
        if( newSearchState.filterString !== selectedFiltersString && ( newSearchState.autoApplyFilters || newSearchState.bulkFiltersApplied ) ) {
            newSearchState.filterString = selectedFiltersString;
            newSearchState.userSelectedTypeFiltersApplied = newSearchState.activeFilters &&
                newSearchState.activeFilters[ filterPanelUtils.PRESET_CATEGORY ] && newSearchState.activeFilters[ filterPanelUtils.PRESET_CATEGORY ].length > 0;
            newSearchState.criteria = searchStateHelperService.getCriteriaAfterFilterSelection( newSearchState );
            newSearchState.searchFilterMap = updatedActiveFilterMap;
            newSearchState.activeFilterMap = selectedFiltersInfo.activeFilterMap;
            if( newSearchState.applyPresetTypeFilters && !newSearchState.activeFilterMap[ filterPanelUtils.PRESET_CATEGORY ] ) {
                newSearchState.activeFilterMap[ filterPanelUtils.PRESET_CATEGORY ] = newSearchState.sourceSearchFilterMap[ filterPanelUtils.PRESET_CATEGORY ];
            }
            newSearchState.activeFilterMap = searchCommonUtils.addImmutableSearchFilterMapToActiveFilterMap( newSearchState.activeFilterMap, searchState.immutableSearchInfo );
            newSearchState.searchInProgress = true;
            newSearchState.categories = undefined;
            newSearchState.additionalSearchString = undefined;

            newSearchState = setSearchFilterMapSourcesWithActiveFilterMapSources( showPrefilter, newSearchState, searchState );

            searchState.update( newSearchState );
        } else if( selectedFiltersString !== newSearchState.selectedFiltersString && !newSearchState.autoApplyFilters && !newSearchState.bulkFiltersApplied ) {
            newSearchState.selectedFiltersString = selectedFiltersString;
            const activeFilterMap = constructActiveFilterMapFromOutputSearchFilterMap( newSearchState );
            const pendingFilterMapInfo = searchFilterService.getPendingFiltersMap( newSearchState.activeFilters, activeFilterMap );
            const positivePendingFiltersInfo = searchFilterService.buildSearchFiltersFromSearchState( pendingFilterMapInfo.positivePendingFilterMap );
            const negativePendingFiltersInfo = searchFilterService.buildSearchFiltersFromSearchState( pendingFilterMapInfo.negativePendingFilterMap );
            newSearchState.positivePendingFilters = positivePendingFiltersInfo.activeFilters;
            newSearchState.negativePendingFilters = negativePendingFiltersInfo.activeFilters;
            newSearchState.positivePendingFilterMap = positivePendingFiltersInfo.activeFilterMap;
            newSearchState.negativePendingFilterMap = negativePendingFiltersInfo.activeFilterMap;
            searchState.update( newSearchState );
        }
    }
};

export const processOutputSearchFilterCategories = ( searchState, outputSearchFilterCategories ) => {
    let updatedSearchFilterCategories = [];
    if( searchState.immutableCategories && searchState.immutableCategories.length > 0 && outputSearchFilterCategories.length > 0 ) {
        let immutableCategories = searchState.immutableCategories.split( ',' );
        for( let indexOfCategory = 0; indexOfCategory < outputSearchFilterCategories.length; indexOfCategory++ ) {
            if( !immutableCategories.includes( outputSearchFilterCategories[ indexOfCategory ].internalName ) ) {
                updatedSearchFilterCategories.push( outputSearchFilterCategories[ indexOfCategory ] );
            }
        }
    } else {
        return outputSearchFilterCategories;
    }
    return updatedSearchFilterCategories;
};

/**
 * updateSelectedFlagForImmutableSearchFiltersInOutputSearchFilterMap - update the selected flag for immutable search filters to false
 * @param {Object} searchState - search state atomic data object
 * @param {Object} outputSearchFilterMap - the filter map output from SOA response
 * @returns {Object} outputSearchFilterMap - outputsearchfiltermap with updated selected flags for immutable search filters
 */
export const updateSelectedFlagForImmutableSearchFiltersInOutputSearchFilterMap = ( searchState, outputSearchFilterMap ) => {
    if( searchState.immutableSearchInfo && searchState.immutableSearchInfo.immutableSearchFilterMap &&
        Object.keys( searchState.immutableSearchInfo.immutableSearchFilterMap ).length > 0 &&
        outputSearchFilterMap && Object.keys( outputSearchFilterMap ).length > 0 ) {
        for( const [ immutableSearchFilterMapKey, immutableSearchFilterMapValues ] of Object.entries( searchState.immutableSearchInfo.immutableSearchFilterMap ) ) {
            for( const [ searchFilterMapKey, searchFilterMapValues ] of Object.entries( outputSearchFilterMap ) ) {
                if( searchFilterMapKey === immutableSearchFilterMapKey ) {
                    let activeFilterValues = searchState.activeFilters && searchState.activeFilters[ searchFilterMapKey ] ? searchState.activeFilters[ searchFilterMapKey ] : [];
                    for( let index = 0; index < searchFilterMapValues.length; index++ ) {
                        for( let immutablSearchFilterValueIndex = 0; immutablSearchFilterValueIndex < immutableSearchFilterMapValues.length; immutablSearchFilterValueIndex++ ) {
                            if( immutableSearchFilterMapValues[ immutablSearchFilterValueIndex ].stringValue === searchFilterMapValues[ index ].stringValue &&
                                outputSearchFilterMap[ searchFilterMapKey ][ index ].selected &&
                                !activeFilterValues.includes( immutableSearchFilterMapValues[ immutablSearchFilterValueIndex ].stringValue ) ) {
                                outputSearchFilterMap[ searchFilterMapKey ][ index ].selected = false;
                            }
                        }
                    }
                }
            }
        }
    }
    return outputSearchFilterMap;
};

export const processOutputFilterMap = ( searchState, outputSearchFilterMap ) => {
    let updatedSearchFilterMap = outputSearchFilterMap ? _.cloneDeep( outputSearchFilterMap ) : {};
    let onlySelectedTypeFilters = [];
    if( searchState.immutableCategories && searchState.immutableCategories.length > 0 && Object.keys( updatedSearchFilterMap ).length > 0 ) {
        let immutableCategories = searchState.immutableCategories.split( ',' );
        _.forEach( immutableCategories, ( eachImmutableCategory ) => {
            delete updatedSearchFilterMap[ eachImmutableCategory ];
        } );
    }
    if( searchState.applyPresetTypeFilters && !searchState.userSelectedTypeFiltersApplied &&
        updatedSearchFilterMap[ filterPanelUtils.PRESET_CATEGORY ] &&
        updatedSearchFilterMap[ filterPanelUtils.PRESET_CATEGORY ].length > 0 ) {
        for( let index = 0; index < updatedSearchFilterMap[ filterPanelUtils.PRESET_CATEGORY ].length; index++ ) {
            if( updatedSearchFilterMap[ filterPanelUtils.PRESET_CATEGORY ][ index ].selected ) {
                updatedSearchFilterMap[ filterPanelUtils.PRESET_CATEGORY ][ index ].selected = false;
                onlySelectedTypeFilters.push( updatedSearchFilterMap[ filterPanelUtils.PRESET_CATEGORY ][ index ] );
            }
        }
        updatedSearchFilterMap[ filterPanelUtils.PRESET_CATEGORY ] = onlySelectedTypeFilters;
    }
    updatedSearchFilterMap = searchCommonUtils.updateSelectedFlagForImmutableSearchFiltersInOutputSearchFilterMap( searchState, updatedSearchFilterMap );
    return updatedSearchFilterMap;
};

const doesCatNameAlreadyExistInChartListBox = ( dbValues, category ) => {
    var exists = false;
    _.forEach( dbValues, function( eachCategory ) {
        if( eachCategory && eachCategory.propInternalValue === category.internalName && !exists ) {
            exists = true;
        }
    } );
    return exists;
};

export let updateChartListBoxListData = ( category, searchState ) => {
    let chartProvider = searchState.chartProvider;
    if( chartProvider && chartProvider.chartListboxListData ) {
        let dbValues = chartProvider.chartListboxListData.dbValue;
        if( !dbValues ) {
            dbValues = [];
        }
        if( category && category.displayName && category.internalName && !doesCatNameAlreadyExistInChartListBox( dbValues, category ) ) {
            var dbValue = {};
            dbValue.propDisplayValue = category.displayName;
            dbValue.propDisplayDescription = '';
            dbValue.displayValue = category.displayName;
            dbValue.propInternalValue = category.internalName;
            dbValues.push( dbValue );
            chartProvider.chartListboxListData.dbValue = dbValues;
            searchState.chartProvider = chartProvider;
        }
    }
    return searchState;
};

export let constructCategoryInternalToDisplayNameMap = ( searchState ) => {
    let searchFilterCategories = searchState.searchFilterCategories;
    let extraSearchFilterCategories = searchState.additionalSearchInfoMap && searchState.additionalSearchInfoMap.displayNamesOfPropsInFilterMap ?
        searchState.additionalSearchInfoMap.displayNamesOfPropsInFilterMap : [];
    let categoryInternalToDisplayNameMap = {};
    for( let index = 0; index < searchFilterCategories.length; index++ ) {
        categoryInternalToDisplayNameMap[ searchFilterCategories[ index ].internalName ] = searchFilterCategories[ index ].displayName;
    }
    for( let idx = 0; idx < extraSearchFilterCategories.length; idx++ ) {
        let internalName = extraSearchFilterCategories[ idx ].split( '|' )[ 0 ];
        let displayName = extraSearchFilterCategories[ idx ].split( '|' )[ 1 ];
        if( !categoryInternalToDisplayNameMap[ internalName ] && internalName && internalName.length > 0 && displayName && displayName.length > 0 ) {
            categoryInternalToDisplayNameMap[ internalName ] = displayName;
        }
    }
    return categoryInternalToDisplayNameMap;
};

export let constructAppliedFiltersAndCategoriesWhenEmptyCategoriesAndZeroResults = ( searchState, currentActiveFilters ) => {
    let categories = undefined;
    if( searchState && currentActiveFilters && searchState.categories &&
        searchState.categories.length === 0 && currentActiveFilters.length === 0 &&
        searchState.categoryInternalToDisplayNameMap && Object.keys( searchState.categoryInternalToDisplayNameMap ).length > 0 ) {
        let searchFilterCategories = [];
        for( const [ key, value ] of Object.entries( searchState.categoryInternalToDisplayNameMap ) ) {
            let eachObject = {
                internalName: key,
                displayName: value,
                defaultFilterValueDisplayCount: 5
            };
            searchFilterCategories.push( eachObject );
        }
        const inputForGetCategories = {
            searchFilterCategories: searchFilterCategories,
            categoryValues: searchState.searchFilterMap,
            defaultFilterFieldDisplayCountFromSOA: searchState.defaultFilterFieldDisplayCount,
            showRange: true,
            provider: searchState.provider,
            showExtraChips: true
        };
        categories = filterPanelService.getCategories2( inputForGetCategories );
        const activeSelectedFiltersMap = getSelectedFiltersMap( categories );
        const activeFiltersInfo = searchFilterService.buildSearchFiltersFromSearchState( activeSelectedFiltersMap );
        return [ activeFiltersInfo.activeFilters, categories ];
    }
    return [ currentActiveFilters, categories ];
};

export let getSelectedUids = () => {
    let mselected = appCtxService.getCtx( 'mselected' );
    return _.map( mselected, 'uid' );
};

export const updateSavedSearchCriteria = ( searchState ) => {
    if( searchState.searchFilterMap && searchState.searchFilterMap[ updatedResultsHiddenCategoryName ] ) {
        if( searchState.searchFilterMap[ updatedResultsHiddenCategoryName ][ 0 ].stringValue
            .indexOf( searchState.criteria.savedSearchUid ) < 0 ) {
            searchState.criteria.savedSearchUid = searchState.criteria.savedSearchUid + '|' +
                searchState.searchFilterMap[ updatedResultsHiddenCategoryName ][ 0 ].stringValue;
        } else {
            searchState.criteria.savedSearchUid = searchState.searchFilterMap[ updatedResultsHiddenCategoryName ][ 0 ].stringValue;
        }
    }
    return searchState.criteria;
};

export const getInitialNumberOfCategoriesToShow = () => {
    let defaultValue = 10;
    let defaultCategoryShowCount = appCtxService.getCtx( 'preferences.AWC_Search_Default_Categories_Show_Count' );
    if( defaultCategoryShowCount && defaultCategoryShowCount[ 0 ] ) {
        defaultValue = parseInt( defaultCategoryShowCount[ 0 ] );
    }
    return defaultValue;
};

export const toggleFilterView = ( activeSection ) => {
    return activeSection === 'filter' ? 'result' : 'filter';
};

export const toggleSearchView = ( activeView, activeViewState, selectionModel, searchState ) => {
    searchCommonUtils.resetSearchState( searchState, selectionModel );
    activeViewState.update( { ...activeViewState.value, name: activeView } );
};

export const resetSearchState = ( searchState, selectionModel ) => {
    selectionModel && selectionModel.selectNone();
    let searchStateValue = { ...searchState.value };
    for( var key in searchStateValue ) {
        if( searchStateAttributes.includes( key ) ) {
            delete searchStateValue[ key ];
        }
    }
    searchStateValue && searchStateValue.criteria && delete searchStateValue.criteria.searchString;
    searchState.update( searchStateValue );
};

export const validateCriteriaAndFilterString = () => {
    const stateParams = AwStateService.instance.params;
    const searchCriteria = stateParams.searchCriteria;
    const filterCriteria = stateParams.filter;
    return searchCriteria && searchCriteria.length > 0 || filterCriteria && filterCriteria.length > 0;
};

/**
 * Find Subtype Business Object
 * @param {Object} data the view model data object


 */
export let findSubBusinessObjectsAndInvokeSearch = function( data, context ) {
    var deferred = AwPromiseService.instance.defer();

    var subBusinessObjects = null;
    // showSearchFilter is set for the condition of showing the Search-Filter panel
    var showSearchFilter = true;
    var selectedSearchFilters = [];
    var inputData = {
        inBOTypeNames: []
    };
    // if user added type-filter, then the inputData.input.boTypeName is set to typeFilter[0].
    // User who don't use type-filter or the value is "", by default the inputData.input = []
    if( context.typeFilter ) {
        var typeFilter = context.typeFilter.split( ',' );
        for( var type in typeFilter ) {
            if( typeFilter.hasOwnProperty( type ) ) {
                inputData.inBOTypeNames.push( {
                    typeName: typeFilter[ type ],
                    contextName: 'subtypes',
                    exclusionPreference: ''
                } );
            }
        }
        filterPanelUtils.setHasTypeFilter( true );
    } else {
        filterPanelUtils.setHasTypeFilter( false );
    }

    filterPanelUtils.setPresetFilters( true );

    soaService.postUnchecked( 'Core-2013-05-DataManagement', 'getSubTypeNames', inputData ).then( function( response ) {
        if( response ) {
            subBusinessObjects = processGetSubTypeNamesSoaResponse( response );
            if( !context.typeFilter ) {
                data.searchFilterMap = {};
            } else {
                data.searchFilterMap = {
                    'WorkspaceObject.object_type': subBusinessObjects
                };
            }
            if( context.searchFilter ) {
                try {
                    searchCommonUtils.processSearchFilters( context.searchFilter, data.searchFilterMap, context ).then( function( processResultResponse ) {
                        if( processResultResponse !== null ) {
                            data.searchFilterMap = processResultResponse.searchFilterMap;
                            if( processResultResponse.hasInvalidFilter ) {
                                filterPanelUtils.displayPrefilterError( context.searchFilter );
                            }
                        }

                        deferred.resolve( {
                            showSearchFilter: showSearchFilter,
                            selectedSearchFilters: selectedSearchFilters,
                            searchFilterMap: data.searchFilterMap
                        } );
                    } );
                } catch ( e ) {
                    filterPanelUtils.displayPrefilterError( data.searchFilter );

                    deferred.resolve( {
                        showSearchFilter: showSearchFilter,
                        selectedSearchFilters: selectedSearchFilters,
                        searchFilterMap: data.searchFilterMap
                    } );
                }
            }

            deferred.resolve( {
                showSearchFilter: showSearchFilter,
                selectedSearchFilters: selectedSearchFilters,
                searchFilterMap: data.searchFilterMap
            } );
        }
    } );

    return deferred.promise;
};

/**
 * Process Search Filters.
 *
 * @param {String} searchFilter - The search filter to be processed
 *
 * @param {String} searchFilterMap - The existing search filter map
 *
 * @return {processResult} the process result that contains the processed search filter map and error info.
 */
export let processSearchFilters = function( searchFilter, searchFilterMap, subPanelContext ) {
    var processResult = {};
    var _searchFilterMap = searchFilterMap;
    var hasInvalidFilter = false;

    var filterNameValues = searchFilter.split( ' AND ' );
    var aTypePropertyNames = [];
    for( var ii = 0; ii < filterNameValues.length; ii++ ) {
        var aFilterNameValue = filterNameValues[ ii ].split( '=' );
        var aTypeProperty = aFilterNameValue[ 0 ].split( '.' );
        aTypePropertyNames[ ii ] = aTypeProperty[ 0 ].trim();
    }
    return soaService.ensureModelTypesLoaded( aTypePropertyNames ).then( function() {
        for( var ii = 0; ii < filterNameValues.length; ii++ ) {
            var aSearchFilter;
            var aFilterNameValue = filterNameValues[ ii ].split( '=' );
            var aTypeProperty = aFilterNameValue[ 0 ].split( '.' );
            var filterType;
            var aTypePropertyName = aTypeProperty[ 0 ].trim();
            var toIndex = aFilterNameValue[ 1 ].indexOf( ' TO ' );
            if( aTypePropertyName === 'Classification' ) {
                //it's a classification filter, no support yet.
                hasInvalidFilter = true;
                logger.error( 'Classification filter is not supported and will be ignored:', filterNameValues[ ii ] );
                continue;
            } else {
                var type = _cmm.getType( aTypePropertyName );
                if( !type ) {
                    hasInvalidFilter = true;
                    logger.error( 'The pre-filter will be ignored because the specified type cannot be found:',
                        aTypeProperty[ 0 ] );
                    continue;
                }
                var aPropertyName = aTypeProperty[ 1 ].trim();
                var propName = filterPanelUtils.getPropertyFromFilter( aPropertyName );
                var pd = type.propertyDescriptorsMap[ propName ];
                // Check if property descriptor is not null then we need to get the filter type based on property descriptor
                // else if isCustomSearchFilterPresent is true that means this property is custom search filter and actual property
                // does not exist and that will be going to use by default String filter only.
                if( pd ) {
                    filterType = filterPanelUtils.getFilterType( pd.valueType );
                } else if( subPanelContext && subPanelContext.isCustomSearchFilterPresent ) {
                    filterType = 'StringFilter';
                    logger.info( 'The search-filter is a custom property which does not actually exist',
                        propName );
                } else {
                    hasInvalidFilter = true;
                    logger.error( 'The pre-filter will be ignored because the specified property cannot be found:',
                        propName );
                    continue;
                }

                var aFilterValue = aFilterNameValue[ 1 ].trim();
                if( toIndex !== -1 ) {
                    aSearchFilter = filterPanelUtils.getRangeSearchFilter( filterType, aFilterValue );
                } else {
                    aSearchFilter = filterPanelUtils.getSingleSearchFilter( filterType, aFilterValue );
                }

                if( aSearchFilter ) {
                    var categoryName = aFilterNameValue[ 0 ].trim();
                    var existingFilters = _searchFilterMap[ categoryName ];
                    if( filterPanelUtils.getHasTypeFilter() && categoryName === filterPanelUtils.PRESET_CATEGORY || !existingFilters ) {
                        _searchFilterMap[ categoryName ] = [ aSearchFilter ];
                    } else {
                        _searchFilterMap[ categoryName ].push( aSearchFilter );
                    }
                    if( filterPanelUtils.getHasTypeFilter() && categoryName === filterPanelUtils.PRESET_CATEGORY ) {
                        filterPanelUtils.setPresetFilters( false );
                    }
                } else {
                    hasInvalidFilter = true;
                }
            }
        }
        processResult.searchFilterMap = _searchFilterMap;
        processResult.hasInvalidFilter = hasInvalidFilter;
        return processResult;
    } );
};

/**
 * Get the selectionMode from parent component and set it for search tab component.
 *
 * @param {String} selectionMode - selection mode - 'single'/'multiple'
 * @param {Object} selectionModels - selection models for the search tab view model
 * @returns {Object} updatedSelectionModels - the updated selectionModels for search tab view model
 */
export let initializeSelectionModel = ( selectionMode, selectionModels ) => {
    let updatedSelectionModels = _.cloneDeep( selectionModels );
    if( selectionMode && selectionMode.length > 0 ) {
        updatedSelectionModels.resultTabModel.setMode( selectionMode );
    }
    return updatedSelectionModels;
};

/**
 * updateSearchStateWithIncontentCriteria - updates the searchState with incontent criteria when there is immutableSearchInfo object inside searchState.
 * @param {Object} searchState - search state atomic data object
 * @param {String} incontentSearchBoxString - current incontent search criteria string
 */
export let updateSearchStateWithIncontentCriteria = ( searchState, incontentSearchBoxString ) => {
    const newSearchState = { ...searchState.getValue() };
    let oldSearchString = newSearchState?.criteria?.searchString;
    const hasSearchStringChanged = newSearchState && newSearchState.criteria && _.trimEnd( newSearchState.criteria.searchString ) !== _.trimEnd( incontentSearchBoxString );
    if( !newSearchState.criteria ) {
        newSearchState.criteria = {};
        newSearchState.criteria = searchStateHelperService.getCriteriaForNewSearch( searchState );
        if( !newSearchState.criteria.searchString ) {
            newSearchState.criteria.searchString = '';
        }
    }
    if( newSearchState.immutableSearchInfo ) {
        if( newSearchState.immutableSearchInfo.immutableSearchString === '*' ) {
            newSearchState.criteria.searchString = incontentSearchBoxString && incontentSearchBoxString.length > 0 ? incontentSearchBoxString : newSearchState.immutableSearchInfo.immutableSearchString;
        } else {
            newSearchState.criteria.searchString = incontentSearchBoxString && incontentSearchBoxString.length > 0 ?
                newSearchState.immutableSearchInfo.immutableSearchString + ' AND ' + incontentSearchBoxString : newSearchState.immutableSearchInfo.immutableSearchString;
        }
    }else{
        newSearchState.criteria.searchString = incontentSearchBoxString && incontentSearchBoxString.length > 0 ? incontentSearchBoxString : '';
    }

    newSearchState.criteria = { ...newSearchState.criteria, ...searchState.additionalCriteria };
    delete newSearchState.searchFilterCategories;
    delete newSearchState.categories;
    newSearchState.totalFound = undefined;
    newSearchState.searchInProgress = true;
    newSearchState.allCategoriesVisible = undefined;

    if( oldSearchString && hasSearchStringChanged === false ) {
        newSearchState.criteria.searchString = toggleSearchString( oldSearchString );
    }
    newSearchState.criteriaJSONString = JSON.stringify( newSearchState.criteria );
    searchState.update( newSearchState );
    eventBus.publish( 'search.suggestiveSearch', {
        criteria: newSearchState.criteria.searchString,
        filterMap: null,
        filterString: newSearchState.filterString,
        source: 'addPanelSearch',
        searchHistoryCache: searchHistoryCache || null
    } );
};

/**
 *
 * @param { Object } searchBox - field Object
 * @param { Object } subPanelContext -For reading the values
 */
export let updateSearchString = function( searchBox, subPanelContext ) {
    let val = subPanelContext.searchState.criteria.searchString;
    searchBox.update( val, {}, { markModified : true } );
};

/**
 * Reset the in content search box widget to empty string. By default it will be
 * always empty.
 *
 * @param {Object} incontentSearchBox In content search box property widget
 * @returns {Object} Updated in content search box with empty db and UI value
 */
export let resetInContextSearchBoxCriteria = function( incontentSearchBox ) {
    // Check if input widget is not valid then return from here
    if( !incontentSearchBox ) {
        return incontentSearchBox;
    }
    // Reset the dbValue and uiValue for proeprty widget.
    const incontentSearchBoxWidget = { ...incontentSearchBox };
    incontentSearchBoxWidget.dbValue = '';
    incontentSearchBoxWidget.uiValue = '';
    return incontentSearchBoxWidget;
};

/* eslint-disable-next-line valid-jsdoc*/

const searchCommonUtils = {
    processSoaResponse,
    getLimitedFilterCategoriesEnabled,
    getThresholdState,
    checkFilterMapForThreshold,
    getDefaultPageSize,
    processDateSearchCriteria,
    getTranslatedSearchCriteria,
    scanReportDefinitionForTranslatedSearchCriteria,
    checkIfDCPProperty,
    initializeSearchState,
    updateSearchState,
    toggleSearchString,
    updateSearchStateAfterFilterAction,
    createActiveFiltersFromActiveFilterMap,
    updateChartListBoxListData,
    processOutputFilterMap,
    getSelectedUids,
    processOutputSearchFilterCategories,
    constructCategoryInternalToDisplayNameMap,
    constructAppliedFiltersAndCategoriesWhenEmptyCategoriesAndZeroResults,
    updateSavedSearchCriteria,
    getInitialNumberOfCategoriesToShow,
    toggleFilterView,
    toggleSearchView,
    resetSearchState,
    validateCriteriaAndFilterString,
    findSubBusinessObjectsAndInvokeSearch,
    processSearchFilters,
    initializeSelectionModel,
    updateSearchStateWithIncontentCriteria,
    addImmutableSearchFilterMapToActiveFilterMap,
    updateSelectedFlagForImmutableSearchFiltersInOutputSearchFilterMap,
    resetInContextSearchBoxCriteria,
    updateSearchHistoryCache,
    updateSearchString
};

export default searchCommonUtils;
