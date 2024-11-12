// Copyright (c) 2021 Siemens

/**
 * JS Service defined to handle Configuration related method execution only.
 *
 * @module js/reportChartService
 */
import appCtxService from 'js/appCtxService';
import reportsCommSrvc from 'js/reportsCommonService';

var exports = {};

export let addNewChartAction = function( chartTitle,  addChart, removeChart, subPanelCtx, chartVisibleNos, thumbnailElem ) {
    let nwchartTitle = { ...chartTitle };
    let nwaddChart = { ...addChart };
    let nwremoveChart = { ...removeChart };
    let nwthumbnailElem = { ...thumbnailElem };

    nwaddChart.dbValue = false;
    nwremoveChart.dbValue = true;
    nwchartTitle.dbValue = '';
    nwchartTitle.uiValue = '';

    const reportCtx = subPanelCtx.reportsContext;
    let nwreportContext = { ...reportCtx.value };
    nwreportContext.chartVisibility[chartVisibleNos] = true;
    reportCtx.update( nwreportContext );

    if( reportCtx.ThumbnailChart === undefined ) {
        nwthumbnailElem.dbValue = true;
    }

    return { chartTitle: nwchartTitle, addChart: nwaddChart, removeChart: nwremoveChart, thumbnailElem: nwthumbnailElem  };
};

export let removeChartAction = function( addChart, removeChart, chartByProp, subPanelCtx, chartVisibleNos  ) {
    let nwaddChart = { ...addChart };
    let nwchartByProp = { ...chartByProp };
    let nwremoveChart = { ...removeChart };

    nwaddChart.dbValue = true;
    nwremoveChart.dbValue = false;
    nwchartByProp.dbValue = '';
    nwchartByProp.uiValue = '';

    const reportCtx = subPanelCtx.reportsContext;
    let nwreportContext = { ...reportCtx.value };
    nwreportContext.chartVisibility[chartVisibleNos] = false;
    reportCtx.update( nwreportContext );


    return { addChart: nwaddChart, removeChart: nwremoveChart, chartByProp: nwchartByProp };
};

//Genric method to build chart points
export let getReportChartConfiguration = function( chartName, saveSearchFilterMap, filterCategories, filterMap, data, reportConfig ) {
    try {
        var chartPoints = reportsCommSrvc.processSearchDataAndGetChartPoints( saveSearchFilterMap, filterCategories, filterMap, reportConfig );
        return {
            chartName: chartName,
            chartPoints: chartPoints,
            chartTitle: reportConfig.ChartTitle,
            chartType: reportConfig.ChartTpIntName !== undefined ? reportConfig.ChartTpIntName : reportConfig.ChartType.toLowerCase(),
            seriesInternalName: Array.isArray( reportConfig.ChartPropInternalName ) ? reportConfig.ChartPropInternalName[ 0 ] : reportConfig.ChartPropInternalName,
            seriesPropName: Array.isArray( reportConfig.ChartPropName ) ? reportConfig.ChartPropName[ 0 ] : reportConfig.ChartPropName,
            dataIsReadyChartGen: true,
            chartNoData: chartPoints.length === 0
        };
    } catch ( error ) {
        console.log( 'Failure occurred in Chart 1 for ' + reportConfig );
    }
};

/**
 * Service variable initialization
/**
 * @param {any} appCtxService - the
 * @param  {any} listBoxService - the
 *
 * @returns {any} exports - the Exports.
 */

export default exports = {
    addNewChartAction,
    removeChartAction,
    getReportChartConfiguration
};
