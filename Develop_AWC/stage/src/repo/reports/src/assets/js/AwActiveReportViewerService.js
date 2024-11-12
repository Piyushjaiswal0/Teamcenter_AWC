// Copyright (c) 2022 Siemens

/**
 * Defines {@link AwActiveReportViewerService}
 *
 * @module js/AwActiveReportViewerService
 */
import appCtxService from 'js/appCtxService';
import AwParseService from 'js/awParseService';
import reportsCommSrvc from 'js/reportsCommonService';
import AwChipList from 'viewmodel/AwChipListViewModel';
import AwPanel from 'viewmodel/AwPanelViewModel';
import AwPanelHeader from 'viewmodel/AwPanelHeaderViewModel';
import AwPanelBody from 'viewmodel/AwPanelBodyViewModel';
import AwReportChart from 'viewmodel/AwReportChartViewModel';
import AwReportHeader from 'viewmodel/AwReportHeaderViewModel';
import AwReportTable from 'viewmodel/AwReportTableViewModel';
import { ExistWhen } from 'js/hocCollection';

const DivExistWhen = ExistWhen( 'div' );
const AwPanelBodyExistWhen = ExistWhen( AwPanelBody );
const AwPanelExistWhen = ExistWhen( AwPanel );
const AwReportTableExistWhen = ExistWhen( AwReportTable );
//ISSUE: On opening report from 'My Dashboard' getting 2 SOA calls
export const awActiveReportViewerServiceRenderFunction = ( props ) => {
    let { viewModel, actions, fields } = props;
    let { data, dataProviders, conditions } = viewModel;
    let reportsState = viewModel.reportsState;
    let subPanelContext = props.subPanelContext;
    const chartContainerClass = reportsState?.reportParameters?.ReportDefProps?.allChartsList?.length > 0 ? 'aw-reports-chartContainer sw-row h-7' : '';
    const tableContainerClass = reportsState?.reportParameters?.ReportDefProps?.allChartsList?.length > 0 ? 'sw-row h-5' : 'sw-row h-12';
    var chartNumber = reportsState?.reportParameters?.ReportDefProps?.allChartsList?.length ? 'w-' + 12 / reportsState.reportParameters.ReportDefProps.allChartsList.length : 'w-12';
    return (
        <div className='sw-column w-12 h-12'>
            <DivExistWhen className='sw-row' existWhen={conditions.shouldShowFilterChips}>
                <AwChipList
                    dataprovider={dataProviders.filtersDataProvider}
                    action={actions.removeFilterAction}
                    uiIconAction={actions.removeFilterAction}
                    chipCondition={conditions = { conditions }}>
                </AwChipList>
            </DivExistWhen>
            <div className={chartContainerClass}>
                <AwPanelExistWhen existWhen={reportsState?.reportParameters?.totalFound > 0 || reportsState?.reportParameters?.totalFound === 0}>
                    <AwPanelHeader>
                        <AwReportHeader reportsState={fields.reportsState}></AwReportHeader>
                    </AwPanelHeader>
                    <AwPanelBodyExistWhen existWhen={ reportsState?.reportParameters?.ReportDefProps?.allChartsList?.length > 0 } className='sw-row h-12 sw-column w-12'>
                        {
                            reportsState?.reportParameters?.ReportDefProps?.allChartsList &&
                            Object.entries( reportsState.reportParameters.ReportDefProps.allChartsList ).map( ( [ $index, reportChartConfig ] ) =>
                                <AwReportChart
                                    className={chartNumber}
                                    id={$index}
                                    key={$index}
                                    chartConfig={reportChartConfig}
                                    filterChips={data.filterChips}
                                    subPanelContext={AwParseService.instance( '{reportsState:fields.reportsState}' )( { props, data, fields, dataProviders, subPanelContext } ) }>
                                </AwReportChart>
                            )
                        }
                    </AwPanelBodyExistWhen>
                </AwPanelExistWhen>
            </div>
            <div className={tableContainerClass}>
                <AwReportTableExistWhen
                    existWhen={ fields.reportsState?.selectedReport || fields.reportsState?.searchInfo }
                    subPanelContext={AwParseService.instance( '{reportsState:fields.reportsState, ...subPanelContext}' )( { props, data, fields, dataProviders, subPanelContext } ) }
                />
            </div>
        </div>
    );
};

export const removeReportFilter = ( filterChips, chipToRemove, reportsState  ) => {
    filterChips.splice( filterChips.indexOf( chipToRemove ), 1 );
    var nwReportsState = reportsState.getValue();
    var reportSearchInfo = nwReportsState.reportParameters.ReportDefProps.ReportSearchInfo;
    if( reportSearchInfo.activeFilterMap.hasOwnProperty( chipToRemove.labelInternalName ) ) {
        var existingFilter = nwReportsState.reportexistingFil?.[chipToRemove.labelInternalName];
        delete reportSearchInfo.activeFilterMap[ chipToRemove.labelInternalName ];
        //check if there are any stored existing filters stored.
        if( nwReportsState.reportexistingFil !== undefined && existingFilter !== undefined ) {
            reportSearchInfo.activeFilterMap[ chipToRemove.labelInternalName ] = JSON.parse( JSON.stringify( existingFilter ) );
        }
        let appliedFilters = nwReportsState.runtimeInfo.appliedFilters;
        delete appliedFilters[chipToRemove.labelInternalName];
        nwReportsState.runtimeInfo.appliedFilters = appliedFilters;
        nwReportsState.runtimeInfo.appliedFilterString = JSON.stringify( appliedFilters ).toString();
        nwReportsState.reportParameters.ReportDefProps.ReportSearchInfo = reportSearchInfo;
        reportsState.update( nwReportsState );
    }

    return filterChips;
};

export const processResponseToPopulateReportState = ( response, reportsState ) => {
    const selectedReportTemplate = response && response.reportdefinitions[0] && response.reportdefinitions[0].reportdefinition;
    processTemplateToPopulateReportState( selectedReportTemplate, reportsState );
};

var getChartInfo = ( ReportChart, ChartPropInternalName )=> {
    ReportChart.ChartPropInternalName = Array.isArray( ChartPropInternalName ) ? ChartPropInternalName[ 0 ] : ChartPropInternalName;
    ReportChart.ChartPropName = Array.isArray( ReportChart.ChartPropName ) ? ReportChart.ChartPropName[ 0 ] : ReportChart.ChartPropName;
    ReportChart.ChartType = ReportChart.ChartType.toLowerCase();
    return ReportChart;
};

/**
 * rd_params:
 [
     0: 'ReportTitle'
    1: 'ReportFilter_0'
    2: 'ReportFilterValue_0'
    3: 'ReportFilter_1'
    4: 'ReportFilterLargeValue_1_0'
    5: 'ReportFilterLargeValue_1_1'
    6: 'ReportFilterLargeValue_1_2'
    7: 'ReportFilterLargeValue_1_3'
    8: 'ReportSearchCriteria'
]
* rd_param_values:
[
    0: '{'TitleText':'Numeric filters...','TitleColor':'#000000','TitleDispColor':'','TitleFont':'Segoe UI','TitleDispFont':''}'
    1: 'WorkspaceObject.object_type'
    2: '[{'searchFilterType':'StringFilter','stringValue':'AW2_Prop_SupportRevision'}]'
    3: 'AW2_Prop_SupportRevision.aw2_Double'
    4: '{'searchFilterType':'NumericFilter','stringValue':'1.0E-4','startNumericValue':0.0001,'endNumericValue':0.0001}'
    5: '{'searchFilterType':'NumericFilter','stringValue':'0.007','startNumericValue':0.007,'endNumericValue':0.007}'
    6: '{'searchFilterType':'NumericFilter','stringValue':'0.2','startNumericValue':0.2,'endNumericValue':0.2}'
    7: '{'searchFilterType':'NumericFilter','stringValue':'0.37','startNumericValue':0.37,'endNumericValue':0.37}'
    8: 'Search*'
]
*
*
*
* @param  {any} selectedReportDef - the report object
*/
// eslint-disable-next-line complexity
export const processTemplateToPopulateReportState = ( selectedReportDef, reportsState ) => {
    if( !selectedReportDef ) { return; }
    var rd_params = selectedReportDef.props.rd_parameters.dbValues;
    var rd_paramValues = selectedReportDef.props.rd_param_values.dbValues;
    var ReportDefProps = { allChartsList:[] };
    var ReportSearchInfo = { activeFilterMap: {} };
    var reportParams = {};
    var ReportTable1 = {};

    let nwReportsState = reportsState.getValue();

    for( var index = 0; index < rd_params.length; index++ ) {
        if( rd_params[ index ] === 'ReportTitle' ) {
            ReportDefProps[ rd_params[ index ] ] = JSON.parse( rd_paramValues[ index ] );
        } else if( rd_params[ index ].startsWith( 'ReportFilter' ) ) {
            var filtrSplit = rd_params[ index ].split( '_' );
            if( filtrSplit[ 0 ] === 'ReportFilter' ) {
                //ReportSearchInfo.activeFilterMap.push( rd_paramValues[ index ] );
            } else if( filtrSplit[ 0 ] === 'ReportFilterLargeValue' ) {
                // If multiple filter values they are stored as ReportFilterLargeValue_1_1
                //filterName key will be always at constant location in
                var filtIndex = index - 1 - parseInt( filtrSplit[ 2 ] );
                var filtKey = rd_paramValues[ filtIndex ];
                var value = [];
                if( ReportSearchInfo.activeFilterMap.hasOwnProperty( filtKey ) ) {
                    value = ReportSearchInfo.activeFilterMap[ filtKey ];
                    value.push( JSON.parse( rd_paramValues[ index ] ) );
                    ReportSearchInfo.activeFilterMap[ filtKey ] = value;
                } else {
                    value.push( JSON.parse( rd_paramValues[ index ] ) );
                    ReportSearchInfo.activeFilterMap[ filtKey ] = value;
                }
            } else if( filtrSplit[ 0 ] === 'ReportFilterValue' ) {
                ReportSearchInfo.activeFilterMap[ rd_paramValues[ index - 1 ] ] = JSON.parse( rd_paramValues[ index ] );
            }
        } else if( rd_params[ index ] === 'ReportSearchCriteria' ) {
            ReportSearchInfo.SearchCriteria = rd_paramValues[ index ];
        } else if( rd_params[ index ] === 'DataProvider' ) {
            ReportSearchInfo.dataProviderName = rd_paramValues[ index ];
        } else if( rd_params[ index ] === 'AdditionalSearchCriteria' ) {
            ReportSearchInfo.additionalSearchCriteria = JSON.parse( rd_paramValues[ index ] );
        } else if( rd_params[ index ].startsWith( 'ReportTable1' ) ) {
            if( rd_params[ index ] === 'ReportTable1ColumnPropName' ) {
                ReportTable1.ColumnPropName = JSON.parse( rd_paramValues[ index ] );
            } else if( rd_params[ index ].startsWith( 'ReportTable1ColumnPropInternalName_0' ) ) {
                var strClProps = [];
                strClProps = JSON.parse( rd_paramValues[ index ] );
                strClProps.push.apply( strClProps, JSON.parse( rd_paramValues[ index + 1 ] ) );
                ReportTable1.ColumnPropInternalName = strClProps;
            } else if( rd_params[ index ].startsWith( 'ReportTable1ColumnDataType' ) ) {
                ReportTable1.ColumnDataType = JSON.parse( rd_paramValues[ index ] );
            }
        } else if( rd_params[ index ].startsWith( 'ReportChart' ) && rd_params[ index ].split( '_' )[1] === '0' ) {
            var chartInfo = getChartInfo( JSON.parse( rd_paramValues[ index ] ), JSON.parse( rd_paramValues[ index + 1 ] ) );
            chartInfo.genericName = 'genericChart' + ( ReportDefProps.allChartsList.length + 1 );
            chartInfo.chartIndex = ReportDefProps.allChartsList.length + 1;
            chartInfo.visible = true;
            ReportDefProps.allChartsList.push( chartInfo );
        } else if( rd_params[ index ] === 'ThumbnailChart' ) {
            ReportDefProps.ThumbnailChart = {
                ChartName: rd_paramValues[ index ]
            };
        }else if( rd_params[ index ] === 'ReportTranslatedSearchCriteria' ) {
            if( !nwReportsState.searchTraslatedCriteria ) {
                nwReportsState.searchTraslatedCriteria = [];
            }
            nwReportsState.searchTraslatedCriteria.push( rd_paramValues[ index ] );
        } else if( rd_params[ index ] === 'ReportClassParameters' ) {
            ReportDefProps.ReportClassParameters = {};
            var clsParams = JSON.parse( rd_paramValues[ index ] );
            ReportDefProps.ReportClassParameters.rootClassUid = clsParams.rootClassUid;
            ReportDefProps.ReportClassParameters.rootSampleUid = clsParams.rootSampleUid;
        } else if( rd_params[ index ].startsWith( 'ReportSegment' ) ) {
            if( !ReportDefProps.ReportSegmentParams ) {
                ReportDefProps.ReportSegmentParams = [];
            }
            ReportDefProps.ReportSegmentParams.push( JSON.parse( rd_paramValues[ index ] ) );
        }
    }

    ReportDefProps.ReportSearchInfo = ReportSearchInfo;

    if( ReportTable1.ColumnPropName !== undefined ) {
        ReportDefProps.ReportTable1 = ReportTable1;
    }

    if( !nwReportsState.searchTraslatedCriteria ) {
        //initiate report display only when translated query is not required.
        nwReportsState.initRepDisp = true;
    }
    reportParams.ReportDefProps = ReportDefProps;

    //Update all parameters into the state now...
    nwReportsState.selectedReport = selectedReportDef;
    reportsCommSrvc.checkForDashboardConfigCommand( selectedReportDef, { uid: reportParams.ReportDefProps.ReportClassParameters?.rootSampleUid } );
    nwReportsState.reportParameters = reportParams;
    nwReportsState.runtimeInfo = {};
    nwReportsState.searchIncontextInfo = {};
    nwReportsState.reportexistingFil = { ...ReportSearchInfo.activeFilterMap };
    nwReportsState.isArrangeMenuEnabled = appCtxService.ctx.sublocation.historyNameToken === 'createReportTemplate';
    nwReportsState.isFilterEnabled = Boolean( selectedReportDef.props.rd_type.dbValues[0] === '1' || selectedReportDef.props.rd_parameters && selectedReportDef.props.rd_parameters.dbValues.indexOf( 'DataProvider' ) !== -1 && selectedReportDef.props.rd_param_values.dbValues[selectedReportDef.props.rd_parameters.dbValues.indexOf( 'DataProvider' )] !== 'Awp0FullTextSearchProvider' );
    reportsState.update( nwReportsState );
};
export const updateReportPropsToReportsState = ( reportsState, reportProps )=> {
    var nwReportsState = reportsState.getValue();
    reportProps?.value ? nwReportsState = reportProps.value : '';
    reportsState.update( nwReportsState );
};

const AwActiveReportViewer = {
    awActiveReportViewerServiceRenderFunction,
    removeReportFilter,
    processResponseToPopulateReportState,
    processTemplateToPopulateReportState,
    updateReportPropsToReportsState
};
export default AwActiveReportViewer;
