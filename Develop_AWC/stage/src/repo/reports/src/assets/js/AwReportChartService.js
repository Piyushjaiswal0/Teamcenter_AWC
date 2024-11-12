import AwChart from 'viewmodel/AwChartViewModel';
import reportsCommSrvc from 'js/reportsCommonService';
import _ from 'lodash';
import { ExistWhen } from 'js/hocCollection';

const AwChartExistWhen = ExistWhen( AwChart );

export const awReportChartServiceRenderFunction = ( props ) => {
    let { viewModel, ...prop } = props;
    let { data } = viewModel;
    return (
        <AwChartExistWhen
            className={prop.className}
            chartProvider={data.chartProviders.genericChart}
            chartPoints={data.genericChart_chartPoints}
            existWhen={props.chartConfig.ChartPropInternalName !== '' }
            name= {'ChartSection' + props.subPanelContext.id}
            id= {'ChartSection' + props.subPanelContext.id}
        />
    );
};

var isActiveItemReportAndReportProvider = function( reportsState ) {
    return reportsState?.selectedReport?.props.rd_type.dbValues[ 0 ] === '1' && !reportsState?.reportParameters?.ReportDefProps?.ReportSearchInfo?.dataProviderName;
};

export let applyChartFilter = ( filterValue, filterProperty, data, subPnlCtx, filterChips ) => {
    var searchFiltCat = subPnlCtx.reportsState.searchInfo.categories;
    var filterPropertyInternalName = null;
    if( data.chartProviders.genericChart.seriesInternalName &&  data.chartProviders.genericChart.seriesInternalName !== '' ) {
        filterPropertyInternalName = data.chartProviders.genericChart.seriesInternalName;
    }
    if( searchFiltCat && searchFiltCat.length !== 0 && !isActiveItemReportAndReportProvider( subPnlCtx.reportsState ) && data.chartProviders.genericChart.seriesPropName === filterProperty ) {
        _.every( searchFiltCat, function( filter ) {
            // Compare if property display name is matching and if not then try to match the internal name
            if( ( filter.displayName === filterProperty ||
                 filterPropertyInternalName && filter.internalName === filterPropertyInternalName ) &&
                 !( subPnlCtx.reportsState.runtimeInfo.appliedFilters && subPnlCtx.reportsState.runtimeInfo.appliedFilters[filterPropertyInternalName] ) ) {
                _.every( filter.filterValues, function( filterVals ) {
                    if( filterVals.name === filterValue ) {
                        var selectedFilter = {};
                        if( filterVals.type === 'NumericFilter' ) {
                            selectedFilter = { searchFilterType: 'NumericFilter', stringDisplayValue: filterVals.name, stringValue: filterVals.internalName, startNumericValue: filterVals.startNumericValue,
                                endNumericValue: filterVals.endNumericValue };
                        } else {
                            selectedFilter = { searchFilterType: 'StringFilter', stringDisplayValue: filterVals.name, stringValue: filterVals.internalName };
                        }
                        //filter prepared, update reportState, so that viewer initiates performSearch with additional new filter.
                        var currentFilter = [];
                        var nwReportState = subPnlCtx.reportsState.getValue();
                        currentFilter.push( selectedFilter );

                        var appliedFilters = nwReportState.runtimeInfo.appliedFilters ? nwReportState.runtimeInfo.appliedFilters : {};
                        appliedFilters[ filterVals.categoryName ] = currentFilter;
                        nwReportState.runtimeInfo.appliedFilters = appliedFilters;
                        nwReportState.runtimeInfo.appliedFilterString = JSON.stringify( appliedFilters ).toString();

                        //set filterChip value
                        let filterChip = {
                            uiIconId: 'miscRemoveBreadcrumb',
                            chipType: 'BUTTON',
                            labelDisplayName: filter.displayName + ': ' + filterVals.name,
                            labelInternalName: filterVals.categoryName
                        };
                        filterChips.push( filterChip );
                        subPnlCtx.reportsState.update( nwReportState );
                        return false;
                    }
                    return true;
                } );
                return false;
            }
            return true;
        } );
    }
};

export let getReportChartConfiguration = function( repChartConfig, subPanelCtx ) {
    try {
        const filterCategories = subPanelCtx.reportsState.searchInfo.categories;
        const saveSearchFilterMap = subPanelCtx.reportsState.searchIncontextInfo.saveSearchFilterMap;
        const filterMap = subPanelCtx.reportsState.searchInfo.searchFilterMap;
        var chartPoints = reportsCommSrvc.processSearchDataAndGetChartPoints( saveSearchFilterMap, filterCategories, filterMap, repChartConfig );
        return {
            chartName: 'genericChart',
            chartPoints: chartPoints,
            chartTitle: repChartConfig.ChartTitle,
            chartType: repChartConfig.ChartTpIntName !== undefined ? repChartConfig.ChartTpIntName : repChartConfig.ChartType.toLowerCase(),
            seriesInternalName: Array.isArray( repChartConfig.ChartPropInternalName ) ? repChartConfig.ChartPropInternalName[ 0 ] : repChartConfig.ChartPropInternalName,
            seriesPropName: Array.isArray( repChartConfig.ChartPropName ) ? repChartConfig.ChartPropName[ 0 ] : repChartConfig.ChartPropName,
            dataIsReadyChartGen: true,
            chartNoData: chartPoints.length === 0
        };
    } catch ( error ) {
        console.log( 'Failure occurred in Chart for ' + repChartConfig );
    }
};

const AwReportChartService = {
    awReportChartServiceRenderFunction,
    applyChartFilter,
    getReportChartConfiguration
};
export default AwReportChartService;
