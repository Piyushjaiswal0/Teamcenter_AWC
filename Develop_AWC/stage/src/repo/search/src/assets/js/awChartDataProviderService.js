// Copyright (c) 2022 Siemens

/**
 * @module js/awChartDataProviderService
 */
import appCtxService from 'js/appCtxService';
import localeService from 'js/localeService';
import filterPanelService from 'js/filterPanelService';
import awSearchFilterService from 'js/aw.searchFilter.service';
import _ from 'lodash';
import AwFilterPanelUtils from 'js/AwFilterPanelUtils';
import Awp0SearchHighlightingService from 'js/Awp0SearchHighlightingService';

var localTextBundle = null;
// Begin Charting code pulled out of AFX as part of
// AW-7471 - 1. Charting -  SWA (Pick property for charting)

var MAX_COLUMN_COUNT = 9;
var columnChartCount = 5;
const noChartCategories = [ 'CLS.type', 'Lbr0LibraryElement.lbr0Ancestors', 'SS1partShapeFilter', 'SS1sizeShapeFilter' ];

/**
 * triggerSearchFilterTargetCategoryEvent
 *
 * Called from Filter category listBox selection to determine correct category for selectCategory event
 *
 * @param {*} targetFilterCategory targetFilterCategory
 */
export let triggerSearchFilterTargetCategoryEvent = function( targetFilterCategory, searchState ) {
    let newSearchState = { ...searchState.value };
    let searchFilterMap = newSearchState.filterMap;
    let searchFilterTargetCategory = awChartDataProviderService.getTargetSearchFilterCategory( newSearchState, targetFilterCategory );
    newSearchState.currentChartBy = searchFilterTargetCategory;

    if( !searchFilterTargetCategory.filterValues ) {
        var filterArray = searchFilterMap[ targetFilterCategory ];
        searchFilterTargetCategory.filterValues = filterArray;
        searchFilterTargetCategory.type = filterArray[ 0 ].searchFilterType;
        var groupedFilters = awChartDataProviderService.groupByCategory( searchFilterMap );
        searchFilterTargetCategory.drilldown = groupedFilters[ targetFilterCategory ][ 0 ].drilldown;
    }

    if( targetFilterCategory !== newSearchState.objectsGroupedByProperty.internalPropertyName ) {
        delete newSearchState.objectsGroupedByProperty.groupedObjectsMap;
        newSearchState = AwFilterPanelUtils.updateCategoryToChartBy( targetFilterCategory, newSearchState.objectsGroupedByProperty.internalPropertyName, newSearchState );
    }
    const chartProvider = awChartDataProviderService.selectCat( newSearchState.chartProvider.chartListboxPropData, searchState );
    newSearchState.chartProvider = { ...chartProvider };
    newSearchState.regroupColors = true;
    searchState.update( newSearchState );
};

export let setChartVisible = function( searchState, forceToggleOff ) {
    Awp0SearchHighlightingService.toggleColorFiltering( forceToggleOff );
    let newSearchState = { ...searchState.value };
    newSearchState.isChartVisible = !forceToggleOff;
    searchState.update( newSearchState );
};

export let selectCat = function( chartListboxPropData, searchState ) {
    let searchContext = { ...searchState.value };
    var label = searchContext.chartTitle;
    if( !label || !searchContext.forceChart ) {
        return;
    }

    let currentHighlightedCategory = searchContext.objectsGroupedByProperty.internalPropertyName;
    var searchFilterMap = searchContext.searchFilterMap;
    var searchFilterCategories = searchContext.searchFilterCategories;

    //Get the category to display
    var searchFilterTargetCategory = awChartDataProviderService.getTargetSearchFilterCategory( searchContext, currentHighlightedCategory );
    if( !searchFilterTargetCategory ) {
        return {};
    }

    //Junit test - don'e cover below line,will visit later
    return awChartDataProviderService.selectCatInternal( columnChartCount, label, searchState, currentHighlightedCategory, searchContext, chartListboxPropData, searchFilterTargetCategory,
        searchFilterMap,
        searchFilterCategories );
};

export let selectCatInternal = ( columnChartCount, label, searchState, currentHighlightedCategory, searchContext, chartListboxPropData, searchFilterTargetCategory, searchFilterMap,
    searchFilterCategories ) => {
    searchContext.currentChartBy = searchFilterTargetCategory;

    if( !searchFilterTargetCategory.type ) {
        var colorPrefValue = appCtxService.getCtx( 'preferences' ).AWC_ColorFiltering[ 0 ];
        filterPanelService.getCategories2( searchFilterCategories, searchFilterMap,
            currentHighlightedCategory, colorPrefValue, true );
    }
    let tmpColumnChartCount = searchFilterCategories && searchFilterCategories.length > 0 ? searchFilterCategories[ 0 ].defaultFilterValueDisplayCount : columnChartCount;

    //Determine if columnChartCount needs update for date drilldown
    if( searchFilterTargetCategory.drilldown && searchFilterTargetCategory.drilldown > 0 ) {
        tmpColumnChartCount = columnChartCount + searchFilterTargetCategory.drilldown;
    }

    let chartProvider = searchContext.chartProvider;
    if( chartProvider ) {
        chartProvider.chartListboxPropData = chartListboxPropData;
        chartProvider = awChartDataProviderService.buildChartProvider( searchFilterTargetCategory, searchState, tmpColumnChartCount, chartProvider );
    } else if( /*!hideChart && */ searchFilterCategories && searchFilterCategories.length > 0 ) {
        chartProvider = {};
        chartProvider.chartListboxPropData = chartListboxPropData;
        chartProvider = awChartDataProviderService.buildChartProvider( searchFilterTargetCategory, searchState, tmpColumnChartCount, chartProvider );
    }
    if( chartProvider ) {
        if( typeof label === 'string' ) {
            chartProvider.chartTitleString = label + chartProvider.chartListboxPropData.dispValue;
        } else {
            //Otherwise get the label from the localized file
            localeService.getLocalizedText( label.source, label.key ).then( function( result ) {
                chartProvider.chartTitleString = result + chartProvider.chartListboxPropData.dispValue;
            } );
        }
    }
    return chartProvider;
};
/**
 * processSelectedColumnsForChart
 *
 * @function processSelectedColumnsForChart
 * @param {ObjectArray} selectedColumns selectedColumns
 * @param {ObjectArray} searchFilterColumns4 searchFilterColumns4
 */
export let processSelectedColumnsForChart = function( selectedColumns, searchFilterColumns4 ) {
    if( selectedColumns.length >= MAX_COLUMN_COUNT ) {
        searchFilterColumns4 = selectedColumns;
    } else {
        _.forEach( selectedColumns, function( option ) {
            var index = _.findIndex( searchFilterColumns4, function( o ) {
                return option.stringValue === o.stringValue;
            } );
            if( index < 0 ) {
                //not an existing column. Add it in, or replace
                if( searchFilterColumns4.length < MAX_COLUMN_COUNT ) {
                    //still has room. Add it in.
                    searchFilterColumns4.push( option );
                } else {
                    //no room, switch with the last one that's not selected.
                    var lastIndex = _.findLastIndex( searchFilterColumns4, function( o ) {
                        return o.selected === false;
                    } );
                    if( lastIndex > -1 ) {
                        _.pull( searchFilterColumns4, searchFilterColumns4[ lastIndex ] );
                        searchFilterColumns4.push( option );
                    }
                }
            }
        } );
    }
};

/**
 * processUnassignedColumnsForChart
 *
 * @function processUnassignedColumnsForChart
 * @param {ObjectArray} searchFilterColumns5 searchFilterColumns5
 */
export let processUnassignedColumnsForChart = function( searchFilterColumns5 ) {
    var unassignedValue = localTextBundle.noFilterValue;
    _.forEach( searchFilterColumns5, function( option ) {
        if( option.stringValue === '$NONE' && option.stringDisplayValue === '' ) {
            option.stringDisplayValue = unassignedValue;
        }
    } );
};

/**
 * processFinalColumnsForChart
 *
 * @function processFinalColumnsForChart
 * @param {ObjectArray} searchFilterColumns5 searchFilterColumns5
 * @returns {ObjectArray} processed final columns
 */
export let processFinalColumnsForChart = function( searchFilterColumns5 ) {
    return searchFilterColumns5.map( function( option ) {
        //Add an extension to date filters
        option.internalExtension = awChartDataProviderService.getFilterExtension( option );
        //Give a label and value
        option.value = option.count;
        option.label = option.stringDisplayValue;
        //Append a check mark if the filter is active
        if( option.selected ) {
            option.label = '\u2713 ' + option.label;
        }
        return option;
    } );
};

/**
 * buildChartProvider
 *
 * @function buildChartProvider
 * @param {Object} searchFilterTargetCategory searchFilterTargetCategory
 * @param {Object} filterMap filterMap
 * @param {ObjectArray} filterCategories filterCategories
 * @param {Integer} columnCount columnCount
 * @param {Object} chartProvider chartProvider
 * @returns {Object} updated chartProvider
 */
export let buildChartProvider = function( searchFilterTargetCategory, searchState, columnCount, chartProvider ) {
    let searchData = searchState.value;
    var filterMap = searchData.searchFilterMap;
    var filterCategories = searchData.searchFilterCategories;

    //Merge filters that have multiple keys (typically date filters)
    var groupedFilters = awChartDataProviderService.groupByCategory( filterMap );

    //Create a column for each filter option in that category
    var searchFilterColumns1 = groupedFilters[ searchFilterTargetCategory.internalName ];
    //Remove non string filter values
    //The "merged" date filters will be string filters
    var searchFilterColumns3 = searchFilterColumns1;
    if( searchFilterTargetCategory.type === 'DateFilter' ) {
        var searchFilterColumns2 = searchFilterColumns1.filter( function( option ) {
            return option.searchFilterType === 'StringFilter';
        } );
        searchFilterColumns3 = [];
        _.forEach( searchFilterTargetCategory.filterValues, function( filterValue ) {
            _.forEach( searchFilterColumns2, function( option ) {
                if( option.stringValue === filterValue.internalName ) {
                    searchFilterColumns3.push( option );
                }
            } );
        } );
    } else if( searchFilterTargetCategory.type === 'NumericFilter' ) {
        searchFilterColumns3 = searchFilterColumns1.filter( function( option ) {
            return option.startEndRange !== 'NumericRange';
        } );
    }

    var searchFilterColumns4 = searchFilterColumns3.filter( function( categoryValue, index ) {
        return index < columnCount || categoryValue.selected;
    } );
    var searchFilterColumns5;
    //Colors can only be shown on first 9. Remove items as necessary
    if( searchFilterColumns4.length < 9 ) {
        searchFilterColumns5 = searchFilterColumns4;
    } else {
        searchFilterColumns5 = searchFilterColumns4.filter( function( categoryValue, index ) {
            return index < 9;
        } );
    }
    //Junit test - don't cover above else block ,will visit later
    // Process any column with a value of $NONE and remove any column with a value of 0
    awChartDataProviderService.processUnassignedColumnsForChart( searchFilterColumns5 );
    searchFilterColumns5 = searchFilterColumns5.filter( function( option ) {
        return option && option.count > 0;
    } );
    //Build a column for each of the remaining filters
    var searchFilterColumns6 = awChartDataProviderService.processFinalColumnsForChart( searchFilterColumns5 );
    chartProvider.category = searchFilterTargetCategory;
    chartProvider.columns = searchFilterColumns6;
    //Junit test - don't cover below  onSelect block ,will visit later
    chartProvider.onSelect = function( column ) {
        try {
            let categoryName = chartProvider.chartListboxPropData.dbValue;
            let filterName = column.stringValue;
            let filters = searchState.categories
                .filter( ( category ) => category.internalName === categoryName )
                .map( ( category ) => category.filterValues.filter( ( filter ) => filter.internalName === filterName ) );
            filters = _.flatten( filters );
            filters.map( ( filter ) => {
                if( filter && filter.selected ) {
                    let event = {
                        target: {
                            value: !filter.selected.value,
                            checked: !filter.selected.checked
                        }
                    };
                    filter.selected.onChange( event );
                }
            } );
            AwFilterPanelUtils.updateInputSearchFilterMap( filters[ 0 ], chartProvider.category, searchState );
        } catch ( e ) {
            console.info( e );
        }
    };
    return awChartDataProviderService.addChartPropertySelectorData( filterCategories, chartProvider, filterMap );
};

export let createChartProvider = ( searchState, chartListboxPropData ) => {
    let newSearchState = searchState.value;
    let chartProvider = awChartDataProviderService.targetFilterCategoryUpdated( chartListboxPropData, searchState );
    if( newSearchState.recreateChartProvider === 'true' ) {
        newSearchState.recreateChartProvider = 'false';
        newSearchState.chartProvider = chartProvider;
        searchState.update( newSearchState );
    }
};

export let addChartPropertySelectorData = function( filterCategories, chartProvider, filterMap ) {
    if( !filterCategories ) {
        return chartProvider;
    }

    if( !chartProvider.chartListboxPropData ) {
        var chartListboxPropData = {};
        chartListboxPropData.displayName = 'Chart on';
        chartListboxPropData.type = 'STRING';
        chartListboxPropData.isRequired = 'true';
        chartListboxPropData.hasLov = 'true';

        chartProvider.chartListboxPropData = chartListboxPropData;
    }

    chartProvider.chartListboxPropData.dbValue = chartProvider.category.internalName;
    chartProvider.chartListboxPropData.dispValue = chartProvider.category.displayName;
    chartProvider.chartListboxPropData.uiValue = chartProvider.category.displayName;

    var dbValues = [];
    for( var index = 0; index < filterCategories.length; index++ ) {
        var internalName = filterCategories[ index ].internalName;
        var hasFilterValues = awChartDataProviderService.checkCategoryInFilterMapHasFilterValues( internalName, filterMap );
        // certain categories are not to be shown in the chart drop down options.
        if( hasFilterValues && !noChartCategories.includes( internalName ) ) {
            var dbValue = {};
            dbValue.propDisplayValue = filterCategories[ index ].displayName;
            dbValue.propDisplayDescription = '';
            dbValue.displayValue = filterCategories[ index ].displayName;
            dbValue.propInternalValue = filterCategories[ index ].internalName;
            dbValues.push( dbValue );
        }
    }

    chartProvider.chartListboxListData = {
        type: 'STRING',
        dbValue: dbValues
    };
    return chartProvider;
};

/**
 *  checkCategoryInFilterMapHasFilterValues - check whether the category with the internal name provided has filterValues with length > 0
 *  @param { String } internalNameOfCategory - the internal name of the category
 *  @returns { Boolean } true/false
 */
export let checkCategoryInFilterMapHasFilterValues = function( internalNameOfCategory, searchFilterMap ) {
    for( var index = 0; index < Object.keys( searchFilterMap ).length; index++ ) {
        var category = searchFilterMap[ Object.keys( searchFilterMap )[ index ] ];
        if( Object.keys( searchFilterMap )[ index ] === internalNameOfCategory ) {
            if( category.length > 0 ) {
                return true;
            }
            return false;
        }
    }
    return false;
};

export let getTargetSearchFilterCategoryWithSelectedFilters = function( categories, map ) {
    return categories.filter( function( category ) {
        var filterArray = map[ category.internalName ];
        if( filterArray && filterArray.length > 0 ) {
            for( var index = 0; index < filterArray.length; index++ ) {
                var filter = filterArray[ index ];
                if( filter.selected ) {
                    return true;
                }
            }
        }
        return false;
    } );
};

export let getTargetSearchFilterCategoryWithoutSelectedFilters = function( categories, map ) {
    return categories.filter( function( category ) {
        var filterArray = map[ category.internalName ];
        if( filterArray && filterArray.length === 1 ) {
            return false;
        }
        return awChartDataProviderService.getTargetSearchFilterCategoryWithoutSelectedFiltersInternal( categories, map );
    } );
};

export let getTargetSearchFilterCategoryWithoutSelectedFiltersInternal = ( categories, map ) => {
    return categories.filter( function( category ) {
        var filterArray = map[ category.internalName ];
        if( filterArray && filterArray.length > 0 ) {
            for( var index = 0; index < filterArray.length; index++ ) {
                var filter = filterArray[ index ];
                if( filter.selected ) {
                    return false;
                }
            }
        }
        return true;
    } );
};

export let getTargetSearchFilterCategoryIfDateFilter = function( categories, map ) {
    //Handle date filters
    return categories.filter( function( category ) {
        var options = map[ category.internalName ];
        if( _.isArray( options ) ) {
            var isValid = false;
            if( options[ 0 ] && options[ 0 ].searchFilterType === 'StringFilter' ) {
                isValid = true;
            } else if( options[ 0 ] && options[ 0 ].searchFilterType === 'DateFilter' ) {
                var dateCatName = category.internalName;

                var dateFilterArray = map[ dateCatName + '_0Z0_year' ];
                if( !dateFilterArray ) {
                    dateFilterArray = map[ dateCatName + '_0Z0_year_month' ];
                    if( !dateFilterArray ) {
                        dateFilterArray = map[ dateCatName + '_0Z0_week' ];
                        if( !dateFilterArray ) {
                            dateFilterArray = map[ dateCatName + '_0Z0_year_month_day' ];
                        }
                    }
                }

                var isSelectedFilterList = dateFilterArray.filter( function( filter ) {
                    return filter.selected;
                } );
                if( isSelectedFilterList.length === 0 ) {
                    isValid = true;
                }
            }

            return isValid;
        }
        return false;
    } );
};
/**
 * Get the search filter category that should be displayed in the chart
 * @function getTargetSearchFilterCategory
 * @param {Object[]} categories - The list of filter categories
 * @param {Object} map - The map containing the options for each category
 * @param {String} categoryToSelect - (Optional) Internal name of the category to select - selected over other
 *            options if given.
 * @return {Object} The filter category to use
 */
export let getTargetSearchFilterCategory = function( searchContext, categoryToSelect ) {
    let map = searchContext.searchFilterMap;
    let categories = searchContext.categories;
    if( !categories || !Array.isArray( categories ) || categories.length < 1 ) {
        return false;
    }
    if( !categoryToSelect ) {
        categoryToSelect = searchContext.objectsGroupedByProperty.internalPropertyName;
    }
    //Attempt to find the category matching the categoryToSelect
    var findByName = categories.filter( function( category ) {
        return category.internalName === categoryToSelect;
    } );
    if( findByName[ 0 ] ) {
        return findByName[ 0 ];
    }
    //Junit test - don't cover below line of code till end,will visit later
    //Handle date filters
    var filteredCategories = awChartDataProviderService.getTargetSearchFilterCategoryIfDateFilter( categories, map );

    //If there is a category with more than 1 option return it
    var moreThanOneCategories = filteredCategories.filter( function( category ) {
        return map[ category.internalName ].length > 1;
    } );
    if( moreThanOneCategories.length > 0 ) {
        var catWithSelections = awChartDataProviderService.getTargetSearchFilterCategoryWithSelectedFilters( categories, map );
        var catWithNoSelections = awChartDataProviderService.getTargetSearchFilterCategoryWithoutSelectedFilters( categories, map );

        if( catWithNoSelections.length > 0 ) {
            return catWithNoSelections[ 0 ];
        }
        if( catWithSelections.length > 0 ) {
            return catWithSelections[ catWithSelections.length - 1 ];
        }

        return moreThanOneCategories[ 0 ];
    }

    //If not just return the first category
    return filteredCategories[ 0 ];
};

/**
 * Group the filters by the actual category. Date filter properties will be merged (ex MyCategory_0Z0_year and
 * MyCategory_0Z0_week will be merged into MyCategory)
 * @function groupByCategory
 * @param {Object} params - Object where internal filter name is the key and value is the array of filters selected.
 * @return {Object} Same object with date filters merged
 */
export let groupByCategory = function( params ) {
    return _.reduce( params, function( acc, nxt, key ) {
        var trueKey = key.split( awSearchFilterService._dateFilterMarker )[ 0 ];
        if( trueKey !== key ) {
            _.forEach( nxt, function( aFilter ) {
                aFilter.startEndRange = key.substring( trueKey.length, key.length );
            } );
        }
        if( acc[ trueKey ] ) {
            acc[ trueKey ] = acc[ trueKey ].concat( nxt );
        } else {
            acc[ trueKey ] = nxt;
        }
        return acc;
    }, {} );
};

/**
 * Get the extension that should be added to the internal name of the filter.
 * @function getFilterExtension
 * @param {Object} filter - Filter object
 * @return {String} The extension
 */
export let getFilterExtension = function( filter ) {
    if( filter.startEndRange === '+1YEAR' ) {
        return awSearchFilterService._dateFilterMarker + awSearchFilterService._dateFilterLevels[ 0 ];
    }
    if( filter.startEndRange === '+1MONTH' ) {
        return awSearchFilterService._dateFilterMarker + awSearchFilterService._dateFilterLevels[ 1 ];
    }
    if( filter.startEndRange === '+7DAYS' ) {
        return awSearchFilterService._dateFilterMarker + awSearchFilterService._dateFilterLevels[ 2 ];
    }
    if( filter.startEndRange === '+1DAY' ) {
        return awSearchFilterService._dateFilterMarker + awSearchFilterService._dateFilterLevels[ 3 ];
    }
    return filter.startEndRange;
};

/**
 * Provide functionality to clear chartProvider or build/refresh chartProvider
 *
 * Called when targetFilterCategoryUpdated event is triggered by AFX code
 *
 * @param {*} chartListboxPropData chartListboxPropData
 */
export let targetFilterCategoryUpdated = function( chartListboxPropData = {}, searchState ) {
    let searchData = searchState.value;
    let chartProvider = null;
    const searchFilterMap = searchData.searchFilterMap;
    const searchFilterCategories = searchData.searchFilterCategories;
    if( searchFilterMap && searchFilterCategories ) {
        chartProvider = awChartDataProviderService.selectCat( chartListboxPropData, searchState );
    }
    return chartProvider;
};

export let getLocalTextBundle = function() {
    return localTextBundle;
};

export let loadConfiguration = function() {
    localeService.getTextPromise( 'SearchMessages', true ).then(
        function( localTextBundle_ ) {
            localTextBundle = localTextBundle_;
        } );
};

export let updateChartListboxPropData = ( chartListboxPropData, searchState )=> {
    //here we have to set dbValue and uiValue in chartListboxPropData
    let nwChartListboxPropData = _.clone( chartListboxPropData );
    if( searchState.searchFilterCategories && searchState.chartBy ) {
        let selCategory;
        _.forEach( searchState.searchFilterCategories, ( category )=>{
            if( category.internalName === searchState.chartBy ) {
                selCategory = category;
            }
        } );
        nwChartListboxPropData.dbValue = selCategory.internalName;
        nwChartListboxPropData.uiValue = selCategory.displayName;
        nwChartListboxPropData.uiValues = [ selCategory.displayName ];
        nwChartListboxPropData.displayValues = [ selCategory.displayName ];
    }
    return nwChartListboxPropData;
};

loadConfiguration();
/*eslint-disable-next-line valid-jsdoc*/

const awChartDataProviderService = {
    triggerSearchFilterTargetCategoryEvent,
    setChartVisible,
    selectCat,
    processSelectedColumnsForChart,
    processUnassignedColumnsForChart,
    processFinalColumnsForChart,
    buildChartProvider,
    addChartPropertySelectorData,
    checkCategoryInFilterMapHasFilterValues,
    getTargetSearchFilterCategory,
    groupByCategory,
    getFilterExtension,
    targetFilterCategoryUpdated,
    getLocalTextBundle,
    loadConfiguration,
    createChartProvider,
    getTargetSearchFilterCategoryIfDateFilter,
    getTargetSearchFilterCategoryWithoutSelectedFilters,
    getTargetSearchFilterCategoryWithSelectedFilters,
    selectCatInternal,
    getTargetSearchFilterCategoryWithoutSelectedFiltersInternal,
    updateChartListboxPropData
};

export default awChartDataProviderService;
