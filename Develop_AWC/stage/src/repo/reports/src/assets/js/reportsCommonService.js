// Copyright (c) 2022 Siemens

/**
 * This service implements commonly used functions by Reports module.
 *
 * @module js/reportsCommonService
 */
import appCtxService from 'js/appCtxService';
import awChartDataProviderService from 'js/awChartDataProviderService';
import adapterService from 'js/adapterService';
import _ from 'lodash';
import localeService from 'js/localeService';

var arrayOfSeriesDataForChart = [];
var keyValueDataForChart = [];
var localTextBundle = null;

//################# ALL STRING CONSTANTS ###################
var m_dashboardCtxList = 'ReportsPersistCtx.MyDashboardReportList';
var m_reportDashboardPrefName = 'REPORT_AW_MyDashboard_TC_Report';
var m_preferences = 'preferences.';
var m_ctxPrefName = m_preferences + m_reportDashboardPrefName;
var m_awSourceName = 'Active Workspace';
var m_repCtxSearchInfo = 'ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo';
var m_reportChart1 = 'ReportChart1';
var m_reportChart2 = 'ReportChart2';
var m_reportChart3 = 'ReportChart3';
var m_reportTable1 = 'ReportTable1';

export let getReportDashboardPrefName = function() {
    return m_reportDashboardPrefName;
};

export let getAWReportSourceName = function() {
    return m_awSourceName;
};

export let getCtxForReportsPreference = function() {
    return m_ctxPrefName;
};

export let getCtxMyDashboardList = function() {
    return m_dashboardCtxList;
};

export let getReportsCtxSearchInfo = function() {
    return m_repCtxSearchInfo;
};

export let getReportChart1 = function() {
    return m_reportChart1;
};

export let getReportChart2 = function() {
    return m_reportChart2;
};

export let getReportChart3 = function() {
    return m_reportChart3;
};

export let getReportTable1 = function() {
    return m_reportTable1;
};


//###################### END ################################
var exports = {};


export let setupReportPersistCtx = function( preferenceName ) {
    var rdIdList = [];
    if( !preferenceName ) {
        preferenceName = m_reportDashboardPrefName;
    }
    var reports = appCtxService.getCtx( m_preferences + preferenceName );
    reports?.forEach( element => {
        if( element.length !== 0 ) {
            var val = JSON.parse( element.substring( element.indexOf( ':' ) + 1, element.length ) );
            if( val.sourceObjUid !== undefined ) {
                rdIdList.push( val.ID + val.sourceObjUid );
            } else {
                rdIdList.push( val.ID );
            }
        }
    } );
    appCtxService.updatePartialCtx( m_dashboardCtxList, rdIdList );
};

export let getRelationTraversalType = function( segment, ctxParams ) {
    var refProp = '';
    if( segment && segment.props.fnd0RelationOrReference.selectedLovEntries && segment.props.fnd0RelationOrReference.selectedLovEntries.length > 0 &&
        segment.props.fnd0RelationOrReference.selectedLovEntries[ 0 ].propDisplayDescription.endsWith( '(Reference)' ) ) {
        refProp = 'REF';
    } else if( segment && segment.props.fnd0RelationOrReference.selectedLovEntries && segment.props.fnd0RelationOrReference.selectedLovEntries.length > 0 &&
        segment.props.fnd0RelationOrReference.selectedLovEntries[ 0 ].propDisplayDescription.endsWith(
            '(Relation)' ) && segment.props.fnd0Direction.dbValue ) {
        refProp = 'GRM';
    }else if( segment && segment.props.fnd0RelationOrReference.selectedLovEntries && segment.props.fnd0RelationOrReference.selectedLovEntries.length > 0 &&
        segment.props.fnd0RelationOrReference.selectedLovEntries[ 0 ].propDisplayDescription.endsWith(
            '(Relation)' ) && !segment.props.fnd0Direction.dbValue ) {
        refProp = 'GRMS2P';
    } else if( ctxParams && ctxParams.ReportDefProps && ctxParams.ReportDefProps.ReportSegmentParams && ctxParams.ReportDefProps.ReportSegmentParams.length > 0 &&
        ctxParams.ReportDefProps.ReportSegmentParams.length > segment.index - 1 ) {
        refProp = ctxParams.ReportDefProps.ReportSegmentParams[ segment.index - 1 ].RelRefType;
    }
    if ( segment.props && segment.props.bomExpansionCheckbox && segment.props.bomExpansionCheckbox.dbValue ) {
        refProp = 'BOM';
    }
    return refProp;
};

export let getUnderlyingObject = function( ctx ) {
    var underlyingObj = null;
    if( ctx ) {
        underlyingObj = ctx;

        var srcObjs = adapterService.getAdaptedObjectsSync( [ ctx ] );
        if( srcObjs !== null && srcObjs.length > 0 ) {
            underlyingObj = srcObjs[ 0 ];
        }
    }
    return underlyingObj;
};

export let getReportUpdateTime = ( data ) => {
    let month_short = [];
    month_short.push( data.i18n.rep_month_Jan );
    month_short.push( data.i18n.rep_month_Feb );
    month_short.push( data.i18n.rep_month_Mar );
    month_short.push( data.i18n.rep_month_Apr );
    month_short.push( data.i18n.rep_month_May );
    month_short.push( data.i18n.rep_month_Jun );
    month_short.push( data.i18n.rep_month_Jul );
    month_short.push( data.i18n.rep_month_Aug );
    month_short.push( data.i18n.rep_month_Sep );
    month_short.push( data.i18n.rep_month_Oct );
    month_short.push( data.i18n.rep_month_Nov );
    month_short.push( data.i18n.rep_month_Dec );

    var currentdate = new Date();
    return ' ' + ( '0' + currentdate.getDate() ).slice( -2 ) + '-' + //get date in 2 digit like 01
        month_short[ currentdate.getMonth() ] + '-' +
        currentdate.getFullYear() + ' ' +
        currentdate.getHours() + ':' +
        currentdate.getMinutes();
};

/**
 * processFinalColumnsForChart
 *
 * @function processFinalColumnsForChart
 * @param {ObjectArray} searchFilterColumns5 searchFilterColumns5
 * @returns {ObjectArray} processed final columns
 */
var processFinalColumnsForChart = function( searchFilterColumns5 ) {
    return searchFilterColumns5.map( function( option ) {
        //Add an extension to date filters
        option.internalExtension = awChartDataProviderService.getFilterExtension( option );
        //Give a label and value
        option.value = option.count;
        option.label = option.stringDisplayValue;
        //Append a checkmark if the filter is active
        if( option.selected ) {
            option.label = '\u2713 ' + option.label;
        }
        return option;
    } );
};

/**
 * processUnassignedColumnsForChart
 *
 * @function processUnassignedColumnsForChart
 * @param {ObjectArray} dataPointsChart dataPointsChart
 */
var processUnassignedColumnsForChart = function( dataPointsChart ) {
    _.forEach( dataPointsChart, function( option ) {
        if( option.stringValue === '$NONE' && option.stringDisplayValue === '' ) {
            option.stringDisplayValue = localTextBundle.noFilterValue;
        }
    } );
};

/**
 * Finds category based on property name comparison.
 * @param {*} targetCategories - categories of target Objects.
 * @param {*} sourceFilterPropName  - filter prop selected/defined.
 * @returns {*} target category matching to the source property.
 */
var getFilterCategoryFromPropertyName = function( targetCategories, sourceFilterPropName ) {
    const sourcePropName = sourceFilterPropName.substr( sourceFilterPropName.indexOf( '.' ) + 1 ); // ItemRevision.owning_user - it removes type name and returns owning_user.
    var returnCategory = undefined;
    _.forEach( targetCategories, function( category ) {
        const propNameInCategory = category.internalName.substr( category.internalName.indexOf( '.' ) + 1 );// Part Revision.owning_user - it will remove type so that property name will be checked.
        if ( propNameInCategory === sourcePropName ) {
            returnCategory = category;
            return false;//it will break
        }
    } );
    return returnCategory;
};

/**
 * processSearchDataAndGetChartPoints
 * Process Search data to build chart points.
 *
 * @param {ObjectArray} searchResultFilters searchResultFilters
 * @param {ObjectArray} filterCategories filterCategories
 * @param {Object} filterMap filterMap
 * @param {Object} reportConfig reportConfig
 * @returns {ObjectArray} array series for entire chart
 */
export let processSearchDataAndGetChartPoints = function( searchResultFilters, filterCategories, filterMap, reportConfig ) {
    arrayOfSeriesDataForChart = [];
    keyValueDataForChart = [];
    var internalNameData;
    var searchFilterColumns3 = [];

    // Programatic generation of series
    var searchFilterName = Array.isArray( reportConfig.ChartPropInternalName ) ? reportConfig.ChartPropInternalName[ 0 ] : reportConfig.ChartPropInternalName;
    keyValueDataForChart = [];
    _.forEach( filterCategories, function( category ) {
        // extract internal data for appropriate category to use later
        if( category.internalName === searchFilterName ) {
            internalNameData = category;
        }
    } );

    //This is required in a scenario where chartProp is defined on ItemRevision but during execution
    //filterCategories are built on PartRevision...... Source->BOMLines
    if( internalNameData === undefined && searchFilterName !== undefined && filterCategories.length > 0 ) {
        internalNameData = getFilterCategoryFromPropertyName( filterCategories, searchFilterName );
    }

    if( internalNameData === undefined || filterMap === undefined ) {
        return arrayOfSeriesDataForChart;
    }

    //Merge filters that have multiple keys (typically date filters)
    var groupedFilters = awChartDataProviderService.groupByCategory( filterMap );

    //Create a column for each filter option in that category
    var searchFilterColumns1 = groupedFilters[ internalNameData.internalName ];

    searchFilterColumns3 = [];
    // if no searchResultFilters no need to filter out results
    var count = 1;

    if( searchResultFilters !== undefined && searchResultFilters.length !== 0 ) {
        // need to check filter matched column category
        _.every( searchResultFilters, function( searchFilter ) {
            var columnFound = false;
            if( searchFilter.name === internalNameData.internalName ) {
                _.forEach( searchFilterColumns1, function( column ) {
                    // filtering from selected columns when filter should apply to category
                    if( column.selected ) {
                        searchFilterColumns3.push( column );
                        columnFound = true;
                    }
                } );

                //check if columns found, if true- don't need to process other filters break the loop.
                if( columnFound ) {
                    //returning false to break
                    return false;
                }
                return true;
            } else if( count === searchResultFilters.length ) {
                // condition to add those that do not need to be filtered out
                // if there are no filters left but there is data still, we need to add it to graph
                _.forEach( searchFilterColumns1, function( column ) {
                    searchFilterColumns3.push( column );
                } );
                return false; // so that every() will break
            }
            count++;
            return true;
        } );
    } else {
        // if nothing has to be filtered out:
        searchFilterColumns3 = searchFilterColumns1;
    }
    var dataPointsChart = searchFilterColumns3;

    //Remove non string filter values
    //The "merged" date filters will be string filters
    if( internalNameData.type === 'DateFilter' ) {
        var searchFilterColumns2 = searchFilterColumns1.filter( function( option ) {
            return option.searchFilterType === 'StringFilter';
        } );
        searchFilterColumns3 = [];
        _.forEach( internalNameData.filterValues, function( searchFilter ) {
            _.forEach( searchFilterColumns2, function( option ) {
                if( option.stringValue === searchFilter.internalName ) {
                    searchFilterColumns3.push( option );
                }
            } );
        } );
        dataPointsChart = searchFilterColumns3;
        // case for numeric filter
    } else if( internalNameData.type === 'NumericFilter' ) {
        var isRangeFilter = false;
        searchFilterColumns3 = searchFilterColumns1.filter( function( option ) {
            if( option.startEndRange === 'NumericRange' ) {
                isRangeFilter = true;
            }
            return option.startEndRange !== 'NumericRange';
        } );
        if( isRangeFilter ) {
            dataPointsChart = searchFilterColumns3;
        }
    }
    //  should handle NONE values still
    processUnassignedColumnsForChart( dataPointsChart );

    //Build a column for each of the remaining filters
    dataPointsChart = processFinalColumnsForChart( dataPointsChart );

    //This is additional processing in case of Date filter..
    //We need to keep only leaf level columns which are not selected. Like Keep only Month if YEAR is also available.
    //One more additional step required when leaf level Day value filter is applied.
    //Only selected Day value should be shown on chart.
    var reportSearchInfo = appCtxService.getCtx( m_repCtxSearchInfo );
    var dayFilterApplied = false;
    if( reportSearchInfo && reportSearchInfo.activeFilterMap.hasOwnProperty( searchFilterName + '_0Z0_year_month_day' ) ) {
        dayFilterApplied = true;
    }
    if( internalNameData.type === 'DateFilter' ) {
        dataPointsChart = dataPointsChart.filter( function( dataPoint ) {
            if( dayFilterApplied && dataPoint.internalExtension === '_0Z0_year_month_day' ) {
                return dataPoint.selected;
            }
            return !dataPoint.selected;
        } );
    }

    // for every data point create a label and value
    for( var i = 0; i < dataPointsChart.length; i++ ) {
        keyValueDataForChart.push( {
            label: dataPointsChart[ i ].stringDisplayValue,
            name: dataPointsChart[ i ].stringDisplayValue,
            value: dataPointsChart[ i ].count
        } );
    }
    // push series of datapoints to entire chart series array
    arrayOfSeriesDataForChart.push( {
        seriesName: Array.isArray( reportConfig.ChartPropName ) ? reportConfig.ChartPropName[ 0 ] : reportConfig.ChartPropName,
        keyValueDataForChart: keyValueDataForChart
    } );
    return arrayOfSeriesDataForChart;
};

export let checkForDashboardConfigCommand = function( selectedReport, selectedObject ) {
    if( selectedReport ) {
        // Need this changes in future
        var prefKey = selectedReport.props.rd_id.dbValues[0] + ( selectedObject && selectedObject.uid ? selectedObject.uid : '' );
        var reportNameKey = prefKey + ':{"ID":"' + selectedReport.props.rd_id.dbValues[0] + ( selectedObject && selectedObject.uid ? '",' + '"sourceObjUid":"' + selectedObject.uid : '' ) + '"}';
        var reportList = appCtxService.getCtx( getCtxForReportsPreference() );
        // var reportNameKey = selectedReport.props.rd_id.dbValues[0] + ( selectedObject && selectedObject.uid ? selectedObject.uid : '' );
        // var reportList = appCtxService.getCtx( m_dashboardCtxList );
        appCtxService.updatePartialCtx( 'showAddToDashboardCommand', reportList && reportList.indexOf( reportNameKey ) === -1 );
    }
};


var loadConfiguration = function() {
    localeService.getTextPromise( 'SearchMessages', true ).then(
        function( localTextBundle_ ) {
            localTextBundle = localTextBundle_;
        } );
};
export const convertJsonToString = ( object ) => {
    if( object ) {
        return JSON.stringify( object ).toString();
    }
    return '';
};
loadConfiguration();

/**
 * reportsCommonService factory
 *
 */
export default exports = {
    getReportDashboardPrefName,
    getAWReportSourceName,
    getCtxForReportsPreference,
    getCtxMyDashboardList,
    getReportsCtxSearchInfo,
    setupReportPersistCtx,
    getReportChart1,
    getReportChart2,
    getReportChart3,
    getRelationTraversalType,
    getReportTable1,
    processSearchDataAndGetChartPoints,
    getUnderlyingObject,
    getReportUpdateTime,
    checkForDashboardConfigCommand,
    convertJsonToString
};
