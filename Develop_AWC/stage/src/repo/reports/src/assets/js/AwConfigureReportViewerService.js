// Copyright (c) 2022 Siemens

/**
 * Defines {@link AwConfigureReportViewerService}
 *
 * @module js/AwConfigureReportViewerService
 */
import _ from 'lodash';
import AwParseService from 'js/awParseService';
import appCtxService from 'js/appCtxService';
import AwTextbox from 'viewmodel/AwTextboxViewModel';
import AwPropertyLabel from 'viewmodel/AwPropertyLabelViewModel';
import searchFilterService from 'js/aw.searchFilter.service';
import AwPanelHeader from 'viewmodel/AwPanelHeaderViewModel';
import AwPanelBody from 'viewmodel/AwPanelBodyViewModel';
import AwConfigureChart from 'viewmodel/AwConfigureChartViewModel';
import AwReportTable from 'viewmodel/AwReportTableViewModel';
import AwActiveReportViewer from 'viewmodel/AwActiveReportViewerViewModel';
import myDashboardSrvc from 'js/showMyDashboardService';
import AwStateService from 'js/awStateService';
import aw_searchFilter from 'js/aw.searchFilter.service';
import { processTemplateToPopulateReportState } from 'js/AwActiveReportViewerService';
import { convertJsonToString } from 'js/reportsCommonService';
import AwSplmTable from 'viewmodel/AwSplmTableViewModel';
import { ExistWhen, EnableWhen } from 'js/hocCollection';
import dmSvc from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';
import viewModelObjectService from 'js/viewModelObjectService';
import confgItemRepSrvc from 'js/configureItemReportService';
import AwListbox from 'viewmodel/AwListboxViewModel';
import messagingService from 'js/messagingService';
import AwButton from 'viewmodel/AwButtonViewModel';
import AwI18n from 'viewmodel/AwI18nViewModel';
import cmm from 'soa/kernel/clientMetaModel';
const AwSplmTableExistWhen = ExistWhen( AwSplmTable );
const AwPanelHeaderEnableWhen = EnableWhen( AwPanelHeader );
const INTERNAL_KEYWORD = '_I_N_T_E_R_N_A_L__N_A_M_E_';
const DivExistWhen = ExistWhen( 'div' );
export const awConfigureReportViewerViewRenderFunction = ( props ) => {
    let { viewModel, fields } = props;
    let { data, conditions, i18n, actions } = viewModel;
    var classToApplyForChart = data.chartCountList.dbValue > 0 ? 'sw-column h-12 w-' + 12 / data.chartCountList.dbValue : 'sw-column h-12 w-12';
    var classToApplyForTable = data.chartCountList.dbValue > 0 ? 'sw-column h-5' : 'sw-column h-12';
    var chartContainerClass = data.chartCountList.dbValue > 0 ? 'aw-reports-chartContainer sw-row h-7' : '';
    const updateReportTitle = ( newValue ) => {
        var nwReportsState = props.reportsState.getValue();
        nwReportsState.reportParameters.ReportDefProps = {
            ...nwReportsState.reportParameters.ReportDefProps,
            ReportTitle: {
                TitleText: newValue
            }
        };
        props.reportsState.update( nwReportsState );
    };
    const renderActiveReportView = ()=> {
        return props.reportsState.selectedReport ?
            <AwActiveReportViewer reportTemplate={props.reportsState.selectedReport} subPanelContext={props.subPanelContext}/> :
            <AwActiveReportViewer reportProps={props.reportsState} subPanelContext={props.subPanelContext}/>;
    };
    const defaultItemReportView = ()=> {
        return (
            <AwSplmTableExistWhen existWhen={props.reportsState.rootClassSampleObject && props.reportsState.rootClassSampleObject[0]} { ...viewModel.grids.sourceObjectView } gridid={'sourceObjectView'} showContextMenu={true}></AwSplmTableExistWhen>
        );
    };
    return (
        <div className='w-12'>
            {
                conditions.notPreviewed ?
                    <div className='sw-column h-12'>
                        <AwPanelHeaderEnableWhen className='aw-reports-reportViewHeader sw-row' enableWhen={conditions.renderCondition }>
                            <div className='aw-reports-templateTitle sw-column w-4'>
                                <AwTextbox {...fields.reportTitleWidget} onSwChange={updateReportTitle}></AwTextbox>
                            </div>
                            <div className='aw-reports-chartCount sw-row'>
                                <AwPropertyLabel className='aw-reports-templateTitle sw-column' {...fields.reportChartNumber}></AwPropertyLabel>
                                <AwListbox className='sw-column aw-reports-chartCountList' {...fields.chartCountList} list={data.chartCountListValues}></AwListbox>
                            </div>

                        </AwPanelHeaderEnableWhen>
                        <AwPanelBody>
                            <div className={chartContainerClass}>
                                {
                                    ( props.reportsState.searchInfo || !conditions.isSummaryReport ) &&
                                    props.reportsState.value.reportParameters?.ReportDefProps?.allChartsList?.length > 0 &&
                                    Object.entries( props.reportsState.value.reportParameters.ReportDefProps.allChartsList ).map( ( [ $index, reportChartConfig ] ) =>
                                        reportChartConfig.visible &&
                                        <AwConfigureChart
                                            id={$index}
                                            className={classToApplyForChart}
                                            chartCount={data.chartCountList.dbValue}
                                            reportsState={props.reportsState}
                                            chartConfig={reportChartConfig}
                                        />
                                    )
                                }
                            </div>
                            <div className={classToApplyForTable}>
                                {
                                    conditions.renderCondition ?
                                        <AwReportTable
                                            subPanelContext={AwParseService.instance( '{reportsState:props.reportsState, ...props.subPanelContext}' )( { props, data, fields } ) }>
                                        </AwReportTable>
                                        : defaultItemReportView()
                                }
                                {
                                    <DivExistWhen existWhen={conditions.shourceObjectDeleted} className='sw-row h-10 justify-center'>
                                        <div className='sw-column justify-center'>
                                            <strong className='sw-row aw-reports-noRelationContext justify-center'>{i18n.noItemAvailable}</strong>
                                            <AwI18n className='sw-row justify-center'>{i18n.itemMissing}</AwI18n>
                                            <div className='sw-row justify-center'>
                                                <AwButton className='medium aw-reports-regularFontStyle' buttonType='chromeless' action={actions.openPanel}>{i18n.searchItem}</AwButton>
                                            </div>
                                        </div>
                                    </DivExistWhen>
                                }
                            </div>
                        </AwPanelBody>
                    </div> : renderActiveReportView()
            }
        </div>
    );
};
export let getRootClassSampleObject = async function( reportsState, dataProvider ) {
    var modelObjects = [];
    var propList = [ 'object_string', 'object_desc', 'object_type', 'owning_user' ];
    return await dmSvc.getProperties( [ reportsState.rootClassSampleObject[0].uid ], propList ).then( function() {
        // Create view model objects
        let vmo = cdm.getObject( reportsState.rootClassSampleObject[0].uid );
        let object = viewModelObjectService.createViewModelObject( vmo.uid, 'EDIT', null, vmo );
        modelObjects.push( object );
        dataProvider.update( modelObjects, modelObjects.length );
        return modelObjects;
    } );
};
export const initializeChartList = ( chartCount, reportsState, i18n ) => {
    if( !chartCount && appCtxService.ctx.state.params.reportId && chartCount !== 0 ) { return; }
    var chartConfig = {
        ChartTitle: '',
        ChartType: 'column',
        ChartPropName: '',
        ChartPropInternalName: '',
        ChartTypeName: i18n.barChart,
        ChartIconName: 'cmdBarChart'
    };
    var nwReportsState = reportsState.getValue();
    if( !nwReportsState.reportParameters?.ReportDefProps?.allChartsList ) {
        nwReportsState.reportParameters = {
            ReportDefProps: {
                allChartsList: Array( chartCount ).fill( { ...chartConfig } )
            }
        };
    } else {
        var x = chartCount - nwReportsState.reportParameters.ReportDefProps.allChartsList.length;
        if( x > 0 ) {
            _.times( x, ()=>{ nwReportsState.reportParameters.ReportDefProps.allChartsList.push( { ...chartConfig } ); } );
        }
    }
    let count = chartCount;
    _.forEach( nwReportsState.reportParameters.ReportDefProps.allChartsList, ( chart, index )=>{
        chart.chartName = 'generic' + index;
        if( index < count ) {
            nwReportsState.reportParameters.ReportDefProps.allChartsList[index].visible = true;
        } else {
            nwReportsState.reportParameters.ReportDefProps.allChartsList[index].visible = false;
        }
    } );
    reportsState.update( nwReportsState );
};

export const getConfigureSearchCriteria = ( searchCriteria ) => {
    if( appCtxService.ctx.state.params.reportId ) {
        return searchCriteria;
    }
    return appCtxService.ctx.state.params.searchCriteria;
};
export const getSearchCriteriaForItemReport = ( searchObjUid ) => {
    var object = {
        sourceObject: searchObjUid
    };
    return convertJsonToString( object );
};
export const getConfigureFilterString = ( activeFilterMap ) => {
    if( appCtxService.ctx.state.params.reportId ) {
        return convertJsonToString( activeFilterMap );
    }
    return appCtxService.ctx.state.params.filter;
};
export const getFilterString = ( searchState ) => {
    return searchState.activeFilters ? aw_searchFilter.buildFilterString( searchState.activeFilters ) : null;
};

export let initializeSearchState = ( searchState, searchCriteria, filter ) => {
    var nwSearchState = searchState.getValue();
    if( searchCriteria && appCtxService.ctx.state.params.reportType === '4' ) {
        const selectedFiltersInfo = searchFilterService.buildSearchFiltersFromSearchState( searchFilterService.getFilters() );
        nwSearchState.criteria = {
            searchString: searchCriteria
        };
        nwSearchState.activeFilterMap = appCtxService.ctx.state.params.reportId ? JSON.parse( filter ) : selectedFiltersInfo.activeFilterMap;
        nwSearchState.activeFilters = {};
        var savedFilterMap = aw_searchFilter.convertFilterMapToSavedSearchFilterMap( nwSearchState );
        _.forEach( savedFilterMap, ( filters, index )=>{
            nwSearchState.activeFilters[index] = [];
            _.forEach( filters, ( filter, i )=>{
                if( nwSearchState.activeFilterMap[index][i].searchFilterType === 'StringFilter' && nwSearchState.provider === 'Awp0FullTextSearchProvider' && nwSearchState.activeFilterMap[index][i].stringDisplayValue !== nwSearchState.activeFilterMap[index][i].stringValue ) {
                    nwSearchState.activeFilters[index].push( nwSearchState.activeFilterMap[index][i].stringDisplayValue + INTERNAL_KEYWORD + filter.stringValue );
                } else {
                    nwSearchState.activeFilters[index].push( filter.stringValue );
                }
            } );
        } );
    }
    return nwSearchState;
};

export const updateSelectReport = ( reportState )=>{
    processTemplateToPopulateReportState( reportState.selectedReport, reportState );
    var newState = reportState.getValue();
    _.forEach( newState.reportParameters.ReportDefProps.allChartsList, ( chart, index )=>{
        newState.reportParameters.ReportDefProps.allChartsList[index].visible = true;
    } );
    reportState.update( newState );
};

export const updateTitleAndChartCount = ( reportState, validCharts, title, chartCountList, chartCountListValues, i18n )=>{
    var nwReportState = reportState.getValue();
    if( validCharts.length === 0 ) {
        nwReportState.reportParameters.ReportDefProps?.allChartsList?.length === 0 ? _.times( 1, ()=>{
            nwReportState.reportParameters.ReportDefProps.allChartsList.push( {
                ChartTitle: '',
                ChartType: 'column',
                ChartPropName: '',
                ChartPropInternalName: '',
                ChartTypeName: i18n.barChart,
                ChartIconName: 'cmdBarChart',
                visible: true
            } );
        } ) : '';
        validCharts = nwReportState.reportParameters.ReportDefProps?.allChartsList ? nwReportState.reportParameters.ReportDefProps.allChartsList : [];
    }
    reportState.update( nwReportState );
    chartCountList.dbValue = validCharts.length;
    chartCountList.dbValues[0] = chartCountList.dbValue;
    chartCountListValues.forEach( ( value )=>{
        if( value.propInternalValue === chartCountList.dbValue ) {
            chartCountList.uiValue = value.propDisplayValue;
        }
    } );
    var nwTitle = { ...title };
    nwTitle.dbValue = nwReportState.reportParameters.ReportDefProps?.ReportTitle?.TitleText;
    nwTitle.uiValue = nwReportState.reportParameters.ReportDefProps?.ReportTitle?.TitleText;
    return nwTitle;
};

export const updateReportDefProps = ( reportState, validCharts )=>{
    var nwReportState = reportState.getValue();
    var ColumnPropNameValues = [];
    var ColumnPropInternalNameValues = [];
    var ColumnDataTypeValues = [];
    _.forEach( nwReportState.reportParameters.columns, ( column )=>{
        ColumnPropNameValues.push( column.displayName );
        ColumnPropInternalNameValues.push( column.associatedTypeName + '.' + column.name );
        ColumnDataTypeValues.push( column.dataType );
    } );

    if( appCtxService.ctx.state?.params?.searchCriteria ) {
        const selectedFiltersInfo = searchFilterService.buildSearchFiltersFromSearchState( searchFilterService.getFilters() );
        nwReportState.reportParameters.ReportDefProps = {
            ...nwReportState.reportParameters.ReportDefProps,
            ReportSearchInfo: {
                activeFilterMap: appCtxService.ctx.state.params.filter ? selectedFiltersInfo.activeFilterMap : {},
                SearchCriteria: appCtxService.ctx.state.params.reportType === '4' ? appCtxService.ctx.state.params.searchCriteria : nwReportState.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria
            },
            ReportTable1: {
                ColumnPropName: ColumnPropNameValues,
                ColumnPropInternalName: ColumnPropInternalNameValues,
                ColumnDataType: ColumnDataTypeValues
            }
        };
    } else{
        nwReportState.reportParameters.ReportDefProps = {
            ...nwReportState.reportParameters.ReportDefProps,
            ReportTable1: {
                ColumnPropName: ColumnPropNameValues,
                ColumnPropInternalName: ColumnPropInternalNameValues,
                ColumnDataType: ColumnDataTypeValues
            }
        };
    }
    nwReportState.reportParameters.ReportDefProps.allChartsList = validCharts;
    reportState.update( nwReportState );
};

export const showPreviewed = ( reportState, title, chartCountList, chartCountListValues, i18n ) => {
    var notPreviewed = appCtxService.ctx.state.params.previewMode === 'false';
    if( notPreviewed && reportState.selectedReport ) {
        updateSelectReport( reportState );
    }
    var nwReportState = reportState.getValue();
    let validCharts = [];
    _.forEach( nwReportState.reportParameters?.ReportDefProps?.allChartsList, ( chart )=> {
        chart.ChartPropInternalName !== '' && chart.visible ? validCharts.push( chart ) : '';
    } );
    if( !notPreviewed ) {
        updateReportDefProps( reportState, validCharts );
    } else {
        return updateTitleAndChartCount( reportState, validCharts, title, chartCountList, chartCountListValues, i18n );
    }
};

export const updateThumbnail = ( reportState, thumbnail )=>{
    let nwReportsState = reportState.getValue();
    var thumbnailValue = '';
    if( thumbnail ) {
        thumbnailValue = thumbnail.dbValue;
    }else {
        var thumbIndex = nwReportsState.selectedReport.props.rd_parameters.dbValues.indexOf( 'ThumbnailChart' );
        thumbnailValue = nwReportsState.selectedReport.props.rd_param_values.dbValues[thumbIndex];
        if( thumbnailValue.startsWith( 'ReportChart' ) ) {
            var index = thumbnailValue.slice( 11 ) - 1;
            let validCharts = [];
            _.forEach( reportState.reportParameters.ReportDefProps.allChartsList, ( chart )=> {
                chart.ChartPropInternalName !== '' && chart.visible ? validCharts.push( chart ) : '';
            } );
            thumbnailValue = validCharts.length > index ? thumbnailValue : 'ReportTable1';
        }
    }
    nwReportsState.reportParameters.ReportDefProps.ThumbnailChart = { ChartName:thumbnailValue };
    reportState.update( nwReportsState );
};

export const saveReportProps = ( reportState ) => {
    var vecNameVal = [];
    var reportsDefProps = reportState?.value?.reportParameters?.ReportDefProps;
    var params = [];
    var paramValues = [];

    //Currently we need to break Filter and table columns strings due to size restrictions from
    //setProperties() SOA. We may need to find better solution in future releases.
    for( var key in reportsDefProps ) {
        if( key === 'ReportSearchInfo' ) {
            var counter = 0;
            for( var actvFilter in reportsDefProps[ key ].activeFilterMap ) {
                var filterName = 'ReportFilter_' + counter.toString();
                params.push( filterName );
                paramValues.push( actvFilter );

                //start processing filters, max filter string length can be 240
                var filterStr = JSON.stringify( reportsDefProps[ key ].activeFilterMap[ actvFilter ] );
                var filterValue;
                if( filterStr.length < 240 ) {
                    filterValue = 'ReportFilterValue_' + counter.toString();
                    params.push( filterValue );
                    paramValues.push( JSON.stringify( reportsDefProps[ key ].activeFilterMap[ actvFilter ] ) );
                    counter++;
                } else {
                    var filtCounter = 0;
                    filterValue = 'ReportFilterLargeValue_' + counter.toString() + '_';
                    var filterValues = reportsDefProps[ key ].activeFilterMap[ actvFilter ];
                    filterValues.forEach( val => {
                        params.push( filterValue + filtCounter );
                        paramValues.push( JSON.stringify( val ) );
                        filtCounter++;
                    } );
                }
            }
            params.push( 'ReportSearchCriteria' );
            paramValues.push( reportsDefProps[ key ].SearchCriteria );

            if( reportState?.translatedSearchCriteriaForPropertySpecificSearch?.length > 0 ) {
                _.forEach( reportState.translatedSearchCriteriaForPropertySpecificSearch, function( value ) {
                    if( value && value.length > 0 ) {
                        params.push( 'ReportTranslatedSearchCriteria' );
                        paramValues.push( value );
                    }
                } );
            }
        } else if( key === 'ReportTable1' ) {
            params.push( 'ReportTable1ColumnPropName' );
            paramValues.push( JSON.stringify( reportsDefProps[ key ].ColumnPropName ) );

            //Divide columns in half and then convert its string.
            var halfLen = Math.ceil( reportsDefProps[ key ].ColumnPropInternalName.length / 2 );
            var PropNameList1 = reportsDefProps[ key ].ColumnPropInternalName.slice( 0, halfLen );
            var PropNameList2 = reportsDefProps[ key ].ColumnPropInternalName.slice( halfLen, reportsDefProps[ key ].ColumnPropInternalName.lengthF );
            params.push( 'ReportTable1ColumnPropInternalName_0' );
            paramValues.push( JSON.stringify( PropNameList1 ) );

            params.push( 'ReportTable1ColumnPropInternalName_1' );
            paramValues.push( JSON.stringify( PropNameList2 ) );

            params.push( 'ReportTable1ColumnDataType' );
            paramValues.push( JSON.stringify( reportsDefProps[ key ].ColumnDataType ) );
        } else if( key === 'allChartsList' ) {
            _.forEach( reportsDefProps[ key ], ( chart, index )=> {
                if( chart.visible && chart.ChartPropInternalName !== '' ) {
                    var chartProp = {
                        ChartPropName: chart.ChartPropName,
                        ChartTitle: chart.ChartTitle,
                        ChartTpIntName: chart.ChartTpIntName,
                        ChartType: chart.ChartType
                    };
                    var chartIntProps = chart.ChartPropInternalName;
                    var keyValue = 'ReportChart' + ( index + 1 );
                    params.push( keyValue + '_0' );
                    paramValues.push( JSON.stringify( chartProp ) );
                    params.push( keyValue + '_1' );
                    paramValues.push( JSON.stringify( chartIntProps ) );
                }
            } );
        } else if( key === 'ReportSegmentParams' ) {
            counter = 0;
            _.forEach( reportsDefProps[ key ], function( value ) {
                params.push( 'ReportSegment' + ( 1 + counter ) );
                paramValues.push( JSON.stringify( value ) );
                counter++;
            } );
        } else if( key === 'ThumbnailChart' ) {
            // storing this without json stringifying as per old storing
            params.push( key );
            paramValues.push( reportsDefProps[ key ].ChartName );
        } else {
            params.push( key );
            paramValues.push( JSON.stringify( reportsDefProps[ key ] ) );
        }
    }
    vecNameVal.push( {
        name: 'rd_parameters',
        values: params
    } );

    vecNameVal.push( {
        name: 'rd_param_values',
        values: paramValues
    } );
    //TODO
    if( appCtxService.ctx.state.params.reportType === '1' ) {
        var rootType = reportState?.rootClassSampleObject[0].type;
        vecNameVal.push( {
            name: 'rd_class',
            values: [ rootType ]
        } );

        vecNameVal.push( {
            name: 'fnd0IsClassOnly',
            values: [ true ]
        } );
    }
    return { params:vecNameVal, reportType:getReportType() };
};

const dashboardActionOnSavedReport = ( dashboardFlag, selectedReport )=>{
    if( appCtxService.ctx.state.params.reportType === '4' && dashboardFlag && ( appCtxService.ctx.showAddToDashboardCommand === true || typeof appCtxService.ctx.showAddToDashboardCommand === 'undefined' ) ) {
        myDashboardSrvc.addSelectedReportToDashboard( selectedReport );
    }else if( appCtxService.ctx.state.params.reportType === '4' && !dashboardFlag && appCtxService.ctx.showAddToDashboardCommand === false ) {
        myDashboardSrvc.removeSelectedDashboardReport( selectedReport );
    }
};

export let updateSelectedReportAndAddToDashboard = ( response, reportsState, dashboardFlag ) => {
    var nwReportsState = reportsState.getValue();
    if( !nwReportsState.selectedReport && response.output.length > 0 ) {
        nwReportsState.newSavedReport = response.output[0].objects[0].uid;
        dashboardActionOnSavedReport( dashboardFlag, response.ServiceData.modelObjects[nwReportsState.newSavedReport] );
    } else if( nwReportsState.selectedReport ) {
        nwReportsState.selectedReport = response.ServiceData.modelObjects[nwReportsState.selectedReport.uid];
        dashboardActionOnSavedReport( dashboardFlag, nwReportsState.selectedReport );
    }
    reportsState.update( nwReportsState );
    return nwReportsState.selectedReport;
};
export let getEscapedUrlParameters = ( previewMode, params )=>{
    var reportParam = { ...params };
    reportParam.previewMode = previewMode;
    var options = {};
    options.inherit = false;
    AwStateService.instance.go( 'createReportTemplate', reportParam, options );
};
export let updateChartCountAndTitle = ( reportsState, chartCountList, chartCountListValues, reportTitleWidget )=>{
    var nwReportsState = reportsState.getValue();
    var nwChartCountList = { ...chartCountList };
    var nwReportTitleWidget = { ...reportTitleWidget };
    nwChartCountList.dbValue = nwReportsState.reportParameters?.ReportDefProps?.allChartsList?.length || nwReportsState.reportParameters?.ReportDefProps?.allChartsList?.length === 0 ?
        nwReportsState.reportParameters.ReportDefProps.allChartsList.length : 1;
    chartCountListValues.forEach( ( value )=>{
        if( value.propInternalValue === nwChartCountList.dbValue ) {
            nwChartCountList.uiValue = value.propDisplayValue;
        }
    } );
    nwReportTitleWidget.uiValue = nwReportsState.reportParameters?.ReportDefProps?.ReportTitle?.TitleText ? nwReportsState.reportParameters.ReportDefProps.ReportTitle.TitleText : '';
    nwReportTitleWidget.dbValue = nwReportTitleWidget.uiValue;
    return { chartCountList:nwChartCountList, reportTitleWidget:nwReportTitleWidget };
};

let processSegmentTree = ( reportsState, nwReportsState )=>{
    if( nwReportsState.reportParameters.ReportDefProps?.ReportSegmentParams ) {
        confgItemRepSrvc.updateSegmentTree( nwReportsState );
    }
    reportsState.update( nwReportsState );
};

export const updateReportInformation = async( reportsState ) => {
    var nwReportsState = reportsState.getValue();
    //Update sourceObject
    if( nwReportsState.reportParameters.ReportDefProps?.ReportClassParameters ) {
        await dmSvc.loadObjects( [ nwReportsState.reportParameters.ReportDefProps.ReportClassParameters.rootSampleUid ] ).then( function() {
            let sampleObj = cdm.getObject( nwReportsState.reportParameters.ReportDefProps.ReportClassParameters.rootSampleUid );
            nwReportsState.rootClassSampleObject = sampleObj?.uid ? [ viewModelObjectService.createViewModelObject( sampleObj.uid, 'EDIT', null, sampleObj ) ] : [];
            processSegmentTree( reportsState, nwReportsState );
        }, function() {
            processSegmentTree( reportsState, nwReportsState );
        } );
    }
};

export let getRdMetaDataInfo = function( reportsState, title, description ) {
    var input = [];
    var rd_parameters = reportsState.selectedReport.props.rd_parameters.dbValues;
    var rd_param_values = reportsState.selectedReport.props.rd_param_values.dbValues;
    rd_param_values[rd_parameters.indexOf( 'ThumbnailChart' )] = reportsState.reportParameters.ReportDefProps.ThumbnailChart.ChartName;
    var dataVal = {
        object:{
            uid: reportsState.selectedReport.uid,
            type: reportsState.selectedReport.type
        },
        vecNameVal: [ {
            name: 'rd_parameters',
            values: rd_parameters
        }, {
            name:'rd_param_values',
            values:rd_param_values
        }, {
            name:'rd_name',
            values:[ title ]
        }, {
            name:'rd_description',
            values:[ description ]
        } ]
    };
    input.push( dataVal );
    return input;
};
export let getReportInfo = function( reportsState, rd_params, title, description ) {
    var input = [];
    //rd_class needs to be handled if changes that info will be in rd_params[2]
    var dataVal = {
        object:{
            uid: reportsState.selectedReport.uid,
            type: reportsState.selectedReport.type
        },
        vecNameVal: [ {
            name: rd_params[0].name,
            values: rd_params[0].values
        }, {
            name:rd_params[1].name,
            values:rd_params[1].values
        }, {
            name:'rd_name',
            values:[ title ]
        }, {
            name:'rd_description',
            values:[ description ]
        }  ]
    };
    input.push( dataVal );
    return input;
};
export const setReportTypeName = ( reportType, reportTypeName, i18n ) =>{
    var nwReportTypeName = { ...reportTypeName };
    if( reportType === '1' || reportType === 1 ) {
        nwReportTypeName.uiValue = i18n.advItemReport;
        nwReportTypeName.dbValue = '1';
    } else {
        nwReportTypeName.uiValue = i18n.advSummReport;
        nwReportTypeName.dbValue = '4';
    }
    return nwReportTypeName;
};
export const updateState = ( state, value, i18n ) => {
    var nwState = {
        ...value,
        reportParameters:{ ...state.value.reportParameters, ReportDefProps: { allChartsList:[ {
            ChartTitle: '',
            ChartType: 'column',
            ChartPropName: '',
            ChartPropInternalName: '',
            ChartTypeName: i18n.barChart,
            visible: true
        } ] } },
        rootClassSampleObject: [],
        segments: []
    };
    state.update( nwState );
    return [];
};
export let updateSourceObject = ( selectionData, reportsState, i18n )=>{
    var nwReportsState = reportsState.getValue();
    if( nwReportsState.selectedReport && nwReportsState.rootClassSampleObject?.length > 0 ) {
        nwReportsState.tableRefresh = true;
    }
    nwReportsState.rootClassSampleObject = [ selectionData ];
    if( !nwReportsState.reportParameters.ReportDefProps ) {
        nwReportsState.reportParameters.ReportDefProps = {};
    }
    var tree = {
        label: nwReportsState.rootClassSampleObject[0].modelType.displayName + ' (' + i18n.parentSource + ')',
        value: nwReportsState.rootClassSampleObject[0].modelType.displayName + ' (' + i18n.parentSource + ')',
        expanded: true,
        children: []
    };
    nwReportsState.segmentTree ? '' : nwReportsState.segmentTree = [ tree ];
    nwReportsState.reportParameters.ReportDefProps.ReportClassParameters = {
        rootClassUid: nwReportsState.rootClassSampleObject[0].modelType.uid,
        rootSampleUid: nwReportsState.rootClassSampleObject[0].uid
    };
    reportsState.update( nwReportsState );
};
export let loadSourceObject = ( uid, reportsState, data )=>{
    let nwReportsState = reportsState.getValue();
    return dmSvc.loadObjects( [ uid ] ).then( function() {
        var sourceObj = cdm.getObject( uid );
        nwReportsState.rootClassSampleObject = [ viewModelObjectService.createViewModelObject( sourceObj.uid, 'EDIT', null, sourceObj ) ];
        var tree = {
            label: nwReportsState.rootClassSampleObject[0].modelType.displayName + ' (' + data.i18n.parentSource + ')',
            value: nwReportsState.rootClassSampleObject[0].modelType.displayName + ' (' + data.i18n.parentSource + ')',
            expanded: true,
            children: []
        };
        if( !nwReportsState.segmentTree ) {
            nwReportsState.segmentTree = [ tree ];
            confgItemRepSrvc.updateSegmentTree( nwReportsState );
        }
        nwReportsState.reportParameters.ReportDefProps.ReportClassParameters = {
            rootClassUid: nwReportsState.rootClassSampleObject[0].modelType.uid,
            rootSampleUid: nwReportsState.rootClassSampleObject[0].uid
        };
        reportsState.update( nwReportsState );
        return [ {
            iconId: nwReportsState.rootClassSampleObject[0].typeIconURL,
            chipType: 'BUTTON',
            labelDisplayName: nwReportsState.rootClassSampleObject[0].cellHeader1
        } ];
    }, function() {
        return [];
    } );
};
export let updateSourceObjectBreadcrumb = async( reportsState, data )=>{
    if( appCtxService.ctx.state.params.searchCriteria && JSON.parse( appCtxService.ctx.state.params.searchCriteria ).sourceObject
        && ( !reportsState.rootClassSampleObject || reportsState.rootClassSampleObject.length <= 0 ) ) {
        let object = JSON.parse( appCtxService.ctx.state.params.searchCriteria );
        return loadSourceObject( object.sourceObject, reportsState, data );
    } else if( appCtxService.ctx.state.params.reportId && reportsState.reportParameters?.ReportDefProps?.ReportClassParameters?.rootSampleUid
        && ( !reportsState.rootClassSampleObject || reportsState.rootClassSampleObject.length <= 0 ) ) {
        return loadSourceObject( reportsState.reportParameters.ReportDefProps.ReportClassParameters.rootSampleUid, reportsState, data );
    }
    if( reportsState.rootClassSampleObject.length > 0 ) {
        return [ {
            iconId: reportsState.rootClassSampleObject[0].typeIconURL,
            chipType: 'BUTTON',
            labelDisplayName: reportsState.rootClassSampleObject[0].cellHeader1
        } ];
    }
    return [];
};
export let updateSegmentChips = ( reportsState, i18n )=>{
    if( reportsState.segmentTree.length > 0 ) {
        var child = reportsState.segmentTree[0];
        var label = child.label;
        let idx = 0;

        while( child.children.length > 0 ) {
            child = child.children[0];
            idx += 1;
        }
        if( idx === 1 ) {
            label = child.label;
        }else{
            //label = String( idx ).concat( ' Segments' );
            label = i18n.totalSegments.replace( '{0}', idx );
        }
        return [ {
            chipType: 'BUTTON',
            labelDisplayName: label
        } ];
    }
    return [];
};
/**
 * Get Type value for new Report
 * @returns {int} repType - Type value
 */
let getReportType = function() {
    if( appCtxService.ctx.state.params.reportType === '1' ) {
        return 1;
    }
    return 4;
};
export let updateReportSearchInfo = ( searchState, reportsState )=>{
    var nwReportsState = reportsState.getValue();
    nwReportsState.reportParameters.ReportDefProps.ReportSearchInfo = {
        activeFilterMap: searchState.activeFilterMap,
        SearchCriteria: searchState.criteria.searchString
    };
    nwReportsState.tableRefresh = true;
    reportsState.update( nwReportsState );
};
export let loadColumnsForSourceObject = ()=>{
    let iconColumn = {
        name: 'icon',
        displayName: '',
        maxWidth: 70,
        minWidth: 70,
        width: 70,
        enableColumnMenu: false,
        pinnedLeft: true,
        enableColumnResizing: false
    };
    let columnsRequired = [ 'WorkspaceObject.object_string', 'WorkspaceObject.object_desc', 'WorkspaceObject.object_type', 'WorkspaceObject.owning_user' ];
    let columns = [];
    columns.push( iconColumn );
    _.forEach( columnsRequired, columnName => {
        var typeN = columnName.split( '.' );
        var objectMeta = cmm.getType( typeN[ 0 ] );
        var displayName = '';
        if( objectMeta && objectMeta.propertyDescriptorsMap.hasOwnProperty( typeN[ 1 ] ) ) {
            displayName = objectMeta.propertyDescriptorsMap[ typeN[ 1 ] ].displayName;
        }
        let obj = {
            name: typeN[ 1 ],
            displayName: displayName,
            maxWidth: 375,
            minWidth: 200,
            width: 250,
            enableColumnMenu: false,
            pinnedLeft: false,
            enableColumnResizing: false,
            enableColumnMoving: false
        };
        columns.push( obj );
    } );
    return columns;
};
const AwConfigureReportViewerService = {
    awConfigureReportViewerViewRenderFunction,
    getRootClassSampleObject,
    initializeChartList,
    getConfigureSearchCriteria,
    getSearchCriteriaForItemReport,
    getConfigureFilterString,
    getFilterString,
    initializeSearchState,
    updateSelectReport,
    updateTitleAndChartCount,
    updateReportDefProps,
    showPreviewed,
    updateThumbnail,
    saveReportProps,
    updateSelectedReportAndAddToDashboard,
    getEscapedUrlParameters,
    updateChartCountAndTitle,
    updateReportInformation,
    getReportInfo,
    setReportTypeName,
    updateState,
    updateSourceObject,
    updateSourceObjectBreadcrumb,
    updateSegmentChips,
    updateReportSearchInfo,
    loadSourceObject,
    getRdMetaDataInfo,
    loadColumnsForSourceObject
};
export default AwConfigureReportViewerService;
