// Copyright (c) 2022 Siemens

/**
 * JS Service defined to handle Add Report related method execution only.
 *
 * @module js/addNewReportService
 */
import AwStateService from 'js/awStateService';
import navigationUtils from 'js/navigationUtils';
import myDashboardSrvc from 'js/showMyDashboardService';
import appCtxService from 'js/appCtxService';

var exports = {};

/**
 * Open newly created report object to enable its configuration
 *
 * @param {any} chartReportObject - The newly created ReportDefinition object.
 */
export let openNewReportObject = function( chartReportObject ) {
    if( appCtxService.ctx.sublocation.nameToken === 'com.siemens.splm.reports:showMyDashboard' && chartReportObject[0].props.rd_type.dbValues[0] === '4'  ) {
        myDashboardSrvc.addSelectedReportToDashboard( chartReportObject[0] );
    }
    var toParams = {};
    var options = {};
    var shownewReport = 'showReport';

    toParams.uid = chartReportObject[ 0 ].uid;
    toParams.title = chartReportObject[ 0 ].props.rd_name.dbValues;
    toParams.reportId = chartReportObject[ 0 ].props.rd_id.dbValues;
    toParams.configure = 'true';
    toParams.referenceId = 'new';
    toParams.reportType = chartReportObject[0].props.rd_type.dbValues[0];
    options.inherit = false;
    AwStateService.instance.go( shownewReport, toParams, options );
};

/**
 * Get Type value for new Report
 * @param {*} data -
 * @returns {int} repType - Type value
 */
export let getReportType = function( data ) {
    if( data.reportType.dbValue === 'AdvanceSummaryReport' || data.reportType === '4' ) {
        return 4;
    } else if( data.reportType.dbValue === 'AdvanceItemReport' || data.reportType === '1' ) {
        return 1;
    }
};

/**
 * @param  {any} data - the
 * @param  {any} selectedReport - selected report
 * @returns {any} encodedParamString
 */
export let getEscapedUrlParameters = function( data, selectedReport ) {
    var reportParam = {};
    reportParam.title = selectedReport.props.rd_name.dbValues;
    reportParam.reportId = selectedReport.props.rd_id.dbValues;
    reportParam.uid = selectedReport.uid;
    reportParam.configure = 'false';
    return navigationUtils.buildEncodedParamString( 'showReport', reportParam );
};

export let getNewReportId = function( response, reportId ) {
    let nwreportId = { ...reportId };
    nwreportId.dbValue = response.reportdefinitionIds[ 0 ].reportDefinitionId;
    nwreportId.uiValue = response.reportdefinitionIds[ 0 ].reportDefinitionId;
    return nwreportId;
};

export let  updateSearchStateWithUID = ( state, data ) => {
    var value = state.getValue();
    value.saveAsReportUID = data;
    state.update( value );
};

export let getSaveAsReportName = ( i18nName, replaceTxt, reportName )=>{
    let nwReportName = { ...reportName };
    let replacedName = i18nName.replace( '{0}', replaceTxt );
    nwReportName.dbValue = replacedName;
    nwReportName.uiValue = replacedName;
    nwReportName.dbValues[0] = replacedName;
    nwReportName.uiValues[0] = replacedName;
    return nwReportName;
};

export default exports = {
    openNewReportObject,
    getEscapedUrlParameters,
    getReportType,
    getNewReportId,
    updateSearchStateWithUID,
    getSaveAsReportName
};
