import _ from 'lodash';
import appCtxService from 'js/appCtxService';
import AwCommandBar from 'viewmodel/AwCommandBarViewModel';
import AwPic from 'viewmodel/AwPicViewModel';
import AwButton from 'viewmodel/AwButtonViewModel';
import AwI18n from 'viewmodel/AwI18nViewModel';
import AwReportChart from 'viewmodel/AwReportChartViewModel';
import configureReportService from 'js/configureReportService';
import { EnableWhen } from 'js/hocCollection';
const DivEnableWhen = EnableWhen( 'div' );
var exports = {};
export const awConfigureChartRenderFunction = ( props ) => {
    let { actions, viewModel, reportsState, id } = props;
    let { i18n, conditions } = viewModel;
    var chartView = props.className + ' aw-reports-chartView';
    var defaultChartView = props.className + ' aw-reports-defaultChart w-12';
    let chartEmptyIcon = '';
    if( props.chartConfig.ChartType === 'column' ) {
        chartEmptyIcon = 'graEmptyBarChartSummary';
    } else if( props.chartConfig.ChartType === 'pie' ) {
        chartEmptyIcon = 'graEmptyPieChartSummary';
    } else{
        chartEmptyIcon = 'graEmptyLineChartSummary';
    }
    return (
        <div className='h-12'>
            <DivEnableWhen enableWhen={conditions.renderCondition} id={'reportCommandArea' + props.id} className='sw-row aw-reports-commandBar'>
                <AwCommandBar className='w-12' anchor='configureChartCommands' alignment='HORIZONTAL' context={props}></AwCommandBar>
                {
                    parseInt( props.chartCount ) > 1 &&
                        <AwCommandBar anchor='configureShowMoreCommands' alignment='HORIZONTAL' context={props}></AwCommandBar>
                }
            </DivEnableWhen>
            <div className='sw-row h-12'>
                {
                    reportsState.reportParameters?.ReportDefProps?.allChartsList[id]?.ChartPropName !== '' ?
                        <AwReportChart
                            className={chartView}
                            chartConfig={reportsState.reportParameters.ReportDefProps.allChartsList[id]}
                            subPanelContext={props}>
                        </AwReportChart> :
                        <div className={defaultChartView}>
                            {
                                !conditions.addRelationContextView ?
                                    <div className='aw-reports-chartMessageContainer'>
                                        <div className='sw-row justify-center' wrap-style='wrap'>
                                            <div className='sw-column'>
                                                <AwPic className='sw-pic-small' iconId={chartEmptyIcon}></AwPic>
                                            </div>
                                        </div>
                                        <div className='aw-reports-verticalCenterAlign'>
                                            {i18n.defaultChartViewText}
                                        </div>
                                    </div>
                                    :
                                    <div className='aw-reports-chartMessageContainer'>
                                        <strong className='aw-reports-noRelationContext'>{i18n.noRelationsAvailable}</strong>
                                        <AwI18n>{i18n.addRelationContext}</AwI18n>
                                        <AwButton className='medium aw-reports-regularFontStyle' buttonType='chromeless' action={actions.openAddRelationPanel}>{i18n.addRelations}</AwButton>
                                    </div>
                            }
                        </div>
                }
            </div>
        </div>
    );
};
/**
 *  Updates the chart properties on the reportsState and returns the updated chartType.
 *
 * @param {object} reportsState - Currently selected custom report definition object
 * @param {object} chartTypeList - chart type of the selected chart
 * @param {object} id - Chart No.
 * @param {object} chartTypeListValues - List containing available chart types
 * @returns {object} - updated chartType
 *
 */
export let updateChartProperties = ( reportsState, chartTypeList, id, chartTypeListValues ) => {
    var nwReportsState = reportsState.getValue();
    var nwChartTypeList = { ...chartTypeList };
    var nwChartTypeListValues = { ...chartTypeListValues };
    if( nwReportsState.reportParameters?.ReportDefProps?.allChartsList[id] ) {
        if( !nwReportsState.reportParameters.ReportDefProps.allChartsList[id].isMoved && !nwReportsState.reportParameters.ReportDefProps.allChartsList[id].isChartTypeChanged
            && !nwReportsState.selectedReport ) {
            // Doing Lower Case of chartType i.e. 'Line' -> 'line'
            nwReportsState.reportParameters.ReportDefProps.allChartsList[id].ChartTpIntName = nwChartTypeList.dbValue.toLowerCase();
            nwReportsState.reportParameters.ReportDefProps.allChartsList[id].ChartType = nwChartTypeList.dbValue;
            _.forEach( nwChartTypeListValues, value => {
                if( value.propInternalValue === nwChartTypeList.dbValue ) {
                    nwReportsState.reportParameters.ReportDefProps.allChartsList[id].ChartTypeName = value.propDisplayValue;
                    nwChartTypeList.uiValue = value.propDisplayValue;
                }
            } );
            nwReportsState.reportParameters.ReportDefProps.allChartsList[id].ChartIconName = nwChartTypeList.iconName;
        } else {
            nwChartTypeList.uiValue = nwReportsState.reportParameters.ReportDefProps.allChartsList[id].ChartTypeName;
            nwChartTypeList.dbValue = nwReportsState.reportParameters.ReportDefProps.allChartsList[id].ChartType;
            nwChartTypeList.iconName = nwReportsState.reportParameters.ReportDefProps.allChartsList[id].ChartIconName;
            if( nwReportsState.reportParameters.ReportDefProps.allChartsList[id].isMoved ) {
                nwReportsState.reportParameters.ReportDefProps.allChartsList[id].isMoved = false;
            }
            if( nwReportsState.reportParameters.ReportDefProps.allChartsList[id].isChartTypeChanged ) {
                nwReportsState.reportParameters.ReportDefProps.allChartsList[id].isChartTypeChanged = false;
            }
        }
    }
    reportsState.update( nwReportsState );
    return nwChartTypeList;
};
/**
 *  Loads the chart properties list based on the searchCriteria.
 *
 * @param {object} reportsState - Currently selected custom report definition object
 *
 */
export let getChartPropList = ( reportsState ) => {
    var chartPropList = configureReportService.getChartByPropertiesList( reportsState.searchIncontextInfo );
    var nwReportsState = reportsState.getValue();
    nwReportsState.searchFilterChartProps = chartPropList;
    reportsState.update( nwReportsState );
};
/**
 *  Updates the chart title based on the selected chart property from the list.
 *
 * @param {object} title - Chart title to be updated
 * @param {object} chartProperty - selected chartOn property from the list.
 * @param {object} id - Chart No
 * @returns {object} - updated title
 *
 */
export let changeTitle = ( title, chartProperty ) => {
    var nwTitle = { ...title };
    nwTitle.uiValue = chartProperty.uiValue;
    nwTitle.dbValue = chartProperty.uiValue;
    return nwTitle;
};
/**
 *  Saves the chart properties by updating its data on the reportsState.
 *
 * @param {object} reportsState  - Currently selected custom report definition object
 * @param {object} title - Chart title
 * @param {object} chartProperty - selected chartOn property from the list.
 * @param {object} id - Chart No
 */
export let saveChartProperties = ( reportsState, title, chartProperty, id ) => {
    var nwReportsState = reportsState.getValue();
    nwReportsState.reportParameters.ReportDefProps.allChartsList[id].visible = true;
    nwReportsState.reportParameters.ReportDefProps.allChartsList[id].ChartTitle = title.uiValue;
    nwReportsState.reportParameters.ReportDefProps.allChartsList[id].ChartPropName = chartProperty.uiValue;
    nwReportsState.reportParameters.ReportDefProps.allChartsList[id].ChartPropInternalName = chartProperty.dbValue;
    reportsState.update( nwReportsState );
};
/**
 *  Clears the selected chart by removing its data from the reportsState
 *
 * @param {object} reportsState  - Currently selected custom report definition object
 * @param {object} id - Chart No.
 */
export let clearChartConfig = ( reportsState, id ) => {
    var nwReportsState = reportsState.getValue();
    nwReportsState.reportParameters.ReportDefProps.allChartsList[id].ChartTitle = '';
    nwReportsState.reportParameters.ReportDefProps.allChartsList[id].ChartPropName = '';
    nwReportsState.reportParameters.ReportDefProps.allChartsList[id].ChartPropInternalName = '';
    reportsState.update( nwReportsState );
};
/**
 *  Moves the chart (previous or next) by swapping its properties with the adjacent chart.
 *
 * @param {String} movement  - Direction of movement (prev/nxt)
 * @param {object} id - Chart No.
 * @param {object} reportsState - Currently selected custom report definition object
 */

export let moveChart = ( movement, id, reportsState ) => {
    var nwReportsState = reportsState.getValue();
    id = parseInt( id );
    if( movement === 'next' && id + 1 <= nwReportsState.reportParameters.ReportDefProps.allChartsList.length ) {
        var nextChart = { ...nwReportsState.reportParameters.ReportDefProps.allChartsList[id + 1] };
        nwReportsState.reportParameters.ReportDefProps.allChartsList[id + 1] = { ...nwReportsState.reportParameters.ReportDefProps.allChartsList[id] };
        nwReportsState.reportParameters.ReportDefProps.allChartsList[id] = { ...nextChart };
        nwReportsState.reportParameters.ReportDefProps.allChartsList[id + 1].isMoved = true;
    } else if( movement === 'previous' && id > 0 ) {
        var previousChart = { ...nwReportsState.reportParameters.ReportDefProps.allChartsList[id - 1] };
        nwReportsState.reportParameters.ReportDefProps.allChartsList[id - 1] = { ...nwReportsState.reportParameters.ReportDefProps.allChartsList[id] };
        nwReportsState.reportParameters.ReportDefProps.allChartsList[id] = { ...previousChart };
        nwReportsState.reportParameters.ReportDefProps.allChartsList[id - 1].isMoved = true;
    }
    nwReportsState.reportParameters.ReportDefProps.allChartsList[id].isMoved = true;
    reportsState.update( nwReportsState );
};
/**
 * Updates the popupId of particular chart on the reportsState
 *
 * @param {Object} response - The response from the SOA
 * @param {object} id - Chart No.
 * @param {String} reportsState - Currently selected custom report definition object
 */
export let updatePopUpId = ( response, id, reportsState )=> {
    var nwReportsState = reportsState.getValue();
    nwReportsState.reportParameters.ReportDefProps.allChartsList[id].popUpId = response.panelEl;
    reportsState.update( nwReportsState );
};

/**
 * Creates the chart with the given properties.
 *
 * @param {Object} reportsState - Currently selected custom report definition object
 * @param {object} id - Chart No.
 * @param {String} nwChartType - indicates chart type (e.g line, pie, column)
 */
export let createChart = ( reportsState, id, nwChartType, i18n ) => {
    var nwReportsState = reportsState.getValue();
    nwReportsState.reportParameters.ReportDefProps.allChartsList[id].ChartType = nwChartType;
    nwReportsState.reportParameters.ReportDefProps.allChartsList[id].ChartTpIntName = nwChartType;
    var chartTypeName;
    if( nwChartType === 'column' ) {
        chartTypeName = i18n.barChart;
    }else if( nwChartType === 'pie' ) {
        chartTypeName = i18n.pieChart;
    }else if( nwChartType === 'line' ) {
        chartTypeName = i18n.lineChart;
    }
    nwReportsState.reportParameters.ReportDefProps.allChartsList[id].ChartTypeName = chartTypeName;
    nwReportsState.reportParameters.ReportDefProps.allChartsList[id].isChartTypeChanged = true;
    reportsState.update( nwReportsState );
};

/**
 * Updates thumbnail list as well as addToDashboard checkbox on the popup.
 *
 * @param {Object} reportsState - Currently selected custom report definition object
 * @param {object} thumbnailChartList - List containing available charts as well as table to be selected for thumbnail
 * @param {object} thumbnail - Selected chart/table as thumbnail of report
 * @param {boolean} addToDashboard - true/false
 * @returns {object} Updated thumbnail and addToDashboard
 *
 */

export const getThumbnailChartList = ( reportsState, { thumbnailChartList, thumbnail, editModeThumbnail, addToDashboard, i18n } ) => {
    var nwReportsState = reportsState.getValue();
    let validCharts = [];
    var nwThumbnail = { ...thumbnail };
    var nwEditModeThumbnail = { ...editModeThumbnail };
    var nwAddToDashboard = { ...addToDashboard };
    if( !nwReportsState.selectedReport ) {
        _.forEach( nwReportsState.reportParameters.ReportDefProps.allChartsList, ( chart )=> {
            chart.ChartPropInternalName !== '' && chart.visible ? validCharts.push( chart ) : '';
        } );
        _.forEach( validCharts, ( chart, index ) => {
            chart.ChartPropInternalName !== '' && thumbnailChartList.push( { propDisplayValue: i18n.chart + ' ' + ( index + 1 ) + ': ' + chart.ChartPropName, propInternalValue: 'ReportChart' + ( index + 1 ) } );
        } );
        thumbnailChartList.push( { propDisplayValue: i18n.tablePanel, propInternalValue: 'ReportTable1' } );
        nwThumbnail.dbValue = thumbnailChartList[0].propInternalValue;
        nwThumbnail.uiValue = thumbnailChartList[0].propDisplayValue;
        nwThumbnail.value = thumbnailChartList[0].propDisplayValue;
    } else if( nwReportsState.selectedReport ) {
        var rd_params = nwReportsState.selectedReport.props.rd_parameters.dbValues;
        var rd_paramValues = nwReportsState.selectedReport.props.rd_param_values.dbValues;
        const reportChart = 'ReportChart';
        let i = 0;
        while( rd_params.indexOf( reportChart + ( i + 1 ) + '_0' ) > -1 ) {
            let chartName = reportChart + ( i + 1 ) + '_0';
            let paramIndex = rd_params.indexOf( chartName );
            let ReportChart = JSON.parse( rd_paramValues[paramIndex] );
            ReportChart.ChartPropName = Array.isArray( ReportChart.ChartPropName ) ? ReportChart.ChartPropName[ 0 ] : ReportChart.ChartPropName;
            validCharts.push( ReportChart );
            i++;
        }
        _.forEach( validCharts, ( chart, index ) => {
            thumbnailChartList.push( { propDisplayValue: i18n.chart + ' ' + ( index + 1 ) + ': ' + chart.ChartPropName, propInternalValue: 'ReportChart' + ( index + 1 ) } );
        } );
        thumbnailChartList.push( { propDisplayValue: i18n.tablePanel, propInternalValue: 'ReportTable1' } );
        // This processing needs to be done on selectedReport params related to chart
        var paramsCount = nwReportsState.selectedReport.props.rd_parameters.dbValues.indexOf( 'ThumbnailChart' );
        var thumbnailChart = nwReportsState.selectedReport.props.rd_param_values.dbValues[paramsCount];
        if( !thumbnailChart ) {
            thumbnailChart = thumbnailChartList[0].propInternalValue;
        }
        if( thumbnailChart.startsWith( 'ReportChart' ) ) {
            var index = thumbnailChart.slice( 11 ) - 1;
            index = validCharts.length > index ? index : 0;
            nwThumbnail.dbValue = thumbnailChartList[index].propInternalValue;
            nwThumbnail.uiValue = thumbnailChartList[index].propDisplayValue;
            nwThumbnail.value = thumbnailChartList[index].propDisplayValue;
        } else {
            var count = thumbnailChartList.length;
            nwThumbnail.dbValue = thumbnailChartList[count - 1].propInternalValue;
            nwThumbnail.uiValue = thumbnailChartList[count - 1].propDisplayValue;
            nwThumbnail.value = thumbnailChartList[count - 1].propDisplayValue;
        }
        nwAddToDashboard.dbValue = !appCtxService.ctx.showAddToDashboardCommand;
    }
    nwEditModeThumbnail.uiValue = nwThumbnail.uiValue;
    nwEditModeThumbnail.dbValue = nwThumbnail.dbValue;
    return { thumbnailChartList:thumbnailChartList, thumbnail:nwThumbnail, editModeThumbnail:nwEditModeThumbnail, addToDashboard: nwAddToDashboard };
};

export default exports = {
    awConfigureChartRenderFunction,
    updateChartProperties,
    getChartPropList,
    changeTitle,
    saveChartProperties,
    clearChartConfig,
    moveChart,
    updatePopUpId,
    createChart,
    getThumbnailChartList
};
