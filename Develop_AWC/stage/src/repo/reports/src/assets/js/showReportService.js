// Copyright (c) 2022 Siemens

/**
 * JS Service defined to handle Show Report related method execution only.
 *
 * @module js/showReportService
 */
import appCtxService from 'js/appCtxService';
import soa_kernel_soaService from 'soa/kernel/soaService';
import soa_kernel_propertyPolicyService from 'soa/kernel/propertyPolicyService';
import localeService from 'js/localeService';
import filtrPanelSrvc from 'js/filterPanelService';
import searchFilterService from 'js/aw.searchFilter.service';
import awChartDataProviderService from 'js/awChartDataProviderService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import commandPanelService from 'js/commandPanel.service';
import viewModelObjectService from 'js/viewModelObjectService';
import reportsCommSrvc from 'js/reportsCommonService';
import confgItemRepSrvc from 'js/configureItemReportService';
import configReportSrvc from 'js/configureReportService';
import cmm from 'soa/kernel/clientMetaModel';
import { getSelectedFiltersMap } from 'js/awSearchSublocationService';

var exports = {};
var arrayOfSeriesDataForChart = [];
var keyValueDataForChart = [];

var localTextBundle = null;
var _runtimeFilterApplied = false;
var _reportexistingFil = {};

/**
  * gets the translated search criteria from server with the current locale's display value of the property in case of property specific search
  * @function fetchAndUpdateTranslatedSearchCriteria
  */
export let fetchAndUpdateTranslatedSearchCriteria = function( ) {
    let translatedSearchCriteria = appCtxService.getCtx( 'ReportsContext.reportParameters.searchTraslatedCriteria' );
    soa_kernel_soaService.post( 'Internal-AWS2-2020-05-FullTextSearch', 'getSearchSettings', {
        searchSettingInput: { inputSettings: { getTranslatedSearchCriteriaForCurrentLocale: translatedSearchCriteria } }
    } ).then( function( result ) {
        if( result && result.outputValues && result.outputValues.getTranslatedSearchCriteriaForCurrentLocale
             && result.outputValues.getTranslatedSearchCriteriaForCurrentLocale.length === 1 && result.outputValues.getTranslatedSearchCriteriaForCurrentLocale[ 0 ].length > 0 ) {
            translatedSearchCriteria = result.outputValues.getTranslatedSearchCriteriaForCurrentLocale[ 0 ];
        }
        if( translatedSearchCriteria && translatedSearchCriteria.length > 0 && translatedSearchCriteria.indexOf( 'V_A_L' ) === -1 ) {
            let currentlyAppliedRevRule = confgItemRepSrvc.getCtxPayloadRevRule();
            appCtxService.ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria = translatedSearchCriteria;
            appCtxService.ctx.searchCriteria = translatedSearchCriteria;
            confgItemRepSrvc.setCtxPayloadRevRule( currentlyAppliedRevRule );
            eventBus.publish( 'ShowReportService.InitiateReportDisplay' );
        }
    } );
};


/**
  * rd_params:
  [
     0: "ReportTitle"
     1: "ReportFilter_0"
     2: "ReportFilterValue_0"
     3: "ReportFilter_1"
     4: "ReportFilterLargeValue_1_0"
     5: "ReportFilterLargeValue_1_1"
     6: "ReportFilterLargeValue_1_2"
     7: "ReportFilterLargeValue_1_3"
     8: "ReportSearchCriteria"
 ]
  * rd_param_values:
  [
     0: "{"TitleText":"Numeric filters...","TitleColor":"#000000","TitleDispColor":"","TitleFont":"Segoe UI","TitleDispFont":""}"
     1: "WorkspaceObject.object_type"
     2: "[{"searchFilterType":"StringFilter","stringValue":"AW2_Prop_SupportRevision"}]"
     3: "AW2_Prop_SupportRevision.aw2_Double"
     4: "{"searchFilterType":"NumericFilter","stringValue":"1.0E-4","startNumericValue":0.0001,"endNumericValue":0.0001}"
     5: "{"searchFilterType":"NumericFilter","stringValue":"0.007","startNumericValue":0.007,"endNumericValue":0.007}"
     6: "{"searchFilterType":"NumericFilter","stringValue":"0.2","startNumericValue":0.2,"endNumericValue":0.2}"
     7: "{"searchFilterType":"NumericFilter","stringValue":"0.37","startNumericValue":0.37,"endNumericValue":0.37}"
     8: "Search*"
 ]
  *
  *
  *
  * @param  {any} selectedReportDef - the report object
  */
export let rebuildReportDefProps = function( selectedReportDef ) {
    var rd_params = selectedReportDef.props.rd_parameters.dbValues;
    var rd_paramValues = selectedReportDef.props.rd_param_values.dbValues;
    var searchTraslatedCriteria = [];
    var initRepDisplay = true;
    var ReportDefProps = {};
    var ReportSearchInfo = { activeFilterMap: {} };
    var ReportTable1 = {};
    var ChartVisibility = { chart1Visible: false, chart2Visible: false, chart3Visible: false };
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
        } else if( rd_params[ index ] === 'ReportChart1_0' ) {
            var ReportChart1 = JSON.parse( rd_paramValues[ index ] );
            ReportChart1.ChartPropInternalName = JSON.parse( rd_paramValues[ index + 1 ] );
            ChartVisibility.chart1Visible = true;
            ReportChart1.ChartPropInternalName = Array.isArray( ReportChart1.ChartPropInternalName ) ? ReportChart1.ChartPropInternalName[ 0 ] : ReportChart1.ChartPropInternalName;
            ReportChart1.ChartPropName = Array.isArray( ReportChart1.ChartPropName ) ? ReportChart1.ChartPropName[ 0 ] : ReportChart1.ChartPropName;
            ReportDefProps.ReportChart1 = ReportChart1;
        } else if( rd_params[ index ] === 'ReportChart2_0' ) {
            var ReportChart2 = JSON.parse( rd_paramValues[ index ] );
            ReportChart2.ChartPropInternalName = JSON.parse( rd_paramValues[ index + 1 ] );
            ChartVisibility.chart2Visible = true;
            ReportChart2.ChartPropInternalName = Array.isArray( ReportChart2.ChartPropInternalName ) ? ReportChart2.ChartPropInternalName[ 0 ] : ReportChart2.ChartPropInternalName;
            ReportChart2.ChartPropName = Array.isArray( ReportChart2.ChartPropName ) ? ReportChart2.ChartPropName[ 0 ] : ReportChart2.ChartPropName;
            ReportDefProps.ReportChart2 = ReportChart2;
        } else if( rd_params[ index ] === 'ReportChart3_0' ) {
            var ReportChart3 = JSON.parse( rd_paramValues[ index ] );
            ReportChart3.ChartPropInternalName = JSON.parse( rd_paramValues[ index + 1 ] );
            ChartVisibility.chart3Visible = true;
            ReportChart3.ChartPropInternalName = Array.isArray( ReportChart3.ChartPropInternalName ) ? ReportChart3.ChartPropInternalName[ 0 ] : ReportChart3.ChartPropInternalName;
            ReportChart3.ChartPropName = Array.isArray( ReportChart3.ChartPropName ) ? ReportChart3.ChartPropName[ 0 ] : ReportChart3.ChartPropName;
            ReportDefProps.ReportChart3 = ReportChart3;
        } else if( rd_params[ index ] === 'ThumbnailChart' ) {
            ReportDefProps.ThumbnailChart = {
                ChartName: rd_paramValues[ index ]
            };
        }else if( rd_params[ index ] === 'ReportTranslatedSearchCriteria' ) {
            searchTraslatedCriteria.push( rd_paramValues[ index ] );
            //Report initiation should start, only when translated query is returned
            initRepDisplay = false;
        } else if( rd_params[ index ] === 'ReportClassParameters' ) {
            ReportDefProps.ReportClassParameters = {};
            var clsParams = JSON.parse( rd_paramValues[ index ] );
            ReportDefProps.ReportClassParameters.rootClassUid = clsParams.rootClassUid;
            ReportDefProps.ReportClassParameters.rootSampleUid = clsParams.rootSampleUid;
        } else if( rd_params[ index ].startsWith( 'ReportSegment' ) ) {
            if( ReportDefProps.ReportSegmentParams ) {
                ReportDefProps.ReportSegmentParams.push( JSON.parse( rd_paramValues[ index ] ) );
            }else{
                ReportDefProps.ReportSegmentParams = [];
                ReportDefProps.ReportSegmentParams.push( JSON.parse( rd_paramValues[ index ] ) );
            }
        }
    }

    ReportDefProps.ReportSearchInfo = ReportSearchInfo;
    if( ReportTable1.ColumnPropName !== undefined ) {
        ReportDefProps.ReportTable1 = ReportTable1;
    }
    var reportParams = {};
    reportParams.ReportDefProps = ReportDefProps;
    reportParams.ChartVisibility = ChartVisibility;
    if( searchTraslatedCriteria.length > 0 ) {
        reportParams.searchTraslatedCriteria = searchTraslatedCriteria;
    }

    appCtxService.updatePartialCtx( 'ReportsContext.reportParameters', reportParams );
    appCtxService.updatePartialCtx( 'ReportsContext.searchIncontextInfo', {} );
    return initRepDisplay;
};

/**
  *
  * @param  {any} params - the
  */
export let updateSelectedReport = function( data, params, subPanelContext, isFilteringEnabled ) {
    var selectedReportDef = null;
    if( selectedReportDef === null ) {
        //not live in current session.. get it from SOA
        var policyId = soa_kernel_propertyPolicyService.register( {
            types: [ {
                name: 'ReportDefinition',
                properties: [ { name: 'rd_parameters' }, { name: 'rd_param_values' }, { name: 'owning_user' },
                    { name: 'rd_name' }, { name: 'rd_type' }, { name: 'rd_class' } ]
            } ]
        } );
        var soaInput = [];
        soaInput.push( {
            source: 'Active Workspace',
            reportDefinitionId: params.reportId
        } );
        soa_kernel_soaService.postUnchecked( 'Reports-2008-06-CrfReports', 'getReportDefinitions', {
            inputCriteria: soaInput
        } ).then(
            function( response ) {
                let currentlyAppliedRevRule = confgItemRepSrvc.getCtxPayloadRevRule();
                //exports.showReportInstructions( data, params );
                eventBus.publish( 'rb0ShowReport.updateReportInstruction' );

                soa_kernel_propertyPolicyService.unregister( policyId );
                selectedReportDef = response.reportdefinitions[ 0 ].reportdefinition;
                isFilteringEnabled = Boolean( selectedReportDef.props.rd_type.dbValues[0] === '1' || selectedReportDef.props.rd_parameters && selectedReportDef.props.rd_parameters.dbValues.indexOf( 'DataProvider' ) !== -1 && selectedReportDef.props.rd_param_values.dbValues[selectedReportDef.props.rd_parameters.dbValues.indexOf( 'DataProvider' )] !== 'Awp0FullTextSearchProvider' );
                appCtxService.updatePartialCtx( 'ReportsContext.selected', selectedReportDef );
                var reportObj = response.ServiceData.modelObjects[ selectedReportDef.uid ];
                if( reportObj.props.rd_parameters.dbValues.length > 0 && selectedReportDef ) {
                    var initRepDisplay = true;
                    //this is a execution of saved report.fetch rd_param_values and rd_parameters from selected report def
                    //and setup the ReportDefProps in report ctx.use ReportObject from response.ServiceData.
                    initRepDisplay = exports.rebuildReportDefProps( reportObj );

                    if( params.configure === 'false' && initRepDisplay ) {
                        confgItemRepSrvc.setCtxPayloadRevRule( currentlyAppliedRevRule );
                        eventBus.publish( 'ShowReportService.InitiateReportDisplay' );
                        appCtxService.ctx.searchCriteria = appCtxService.ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria;
                    } else if( params.configure === 'false' ) {
                        eventBus.publish( 'initiateCalltoFetchTranslatedSearchCriteria' );
                    }

                    if( params.configure === 'false' && params.referenceId !== null && reportObj.props.rd_type.dbValues[ 0 ] === '1' ) {
                        eventBus.publish( 'reportDashboard.getSourceObject' );
                    }
                }
                if( params.configure === 'true' ) {
                    var commandId = 'Rb0ConfigureReport';
                    commandId = params.reportType === '4' ? 'Rb0ConfigureReport' : 'Rb0ConfigureItemReport';

                    var location = 'aw_toolsAndInfo';
                    //Shows Configure Template panel with search string.
                    commandPanelService.activateCommandPanel( commandId, location, subPanelContext, null, null, {
                        isPinUnpinEnabled: true
                    } );
                }
                data.dispatch( { path: 'data.isFilterEnabled', value: isFilteringEnabled } );
                return isFilteringEnabled;
            } );
    }
};

/**
  * processFinalColumnsForChart
  *
  * @function filterUpdated
  * @param {int} totalObjsFound totalObjsFound
  * @returns {Object} containing boolean indicating whether a refresh on a table is needed
  */
export let filterUpdated = function( data, repTotalObj, repTime ) {
    var repParameters = appCtxService.getCtx( 'ReportsContext.reportParameters' );
    var showPreview = appCtxService.getCtx( 'ReportsContext.showPreview' );
    var updateTable = false;
    let nwrepTotalObj = { ...repTotalObj };
    let nwrepTime = { ...repTime };

    var requTime = updateTimeOfRequest( data );
    nwrepTime.dbValue = requTime;
    nwrepTime.uiValue = requTime;

    var totFnd = appCtxService.ctx.ReportsContext.reportParameters.totalFound;
    nwrepTotalObj.dbValue  = data.i18n.totalObjsFound + totFnd;
    nwrepTotalObj.uiValue  = data.i18n.totalObjsFound + totFnd;

    // check to see if showpreview has been click
    // if it has not been clicked, we do not want to auto refresh charts
    if( showPreview ) {
        if( repParameters.ReportDefProps.ReportChart1 ) {
            eventBus.publish( 'updateChartGen1' );
        }
        if( repParameters.ReportDefProps.ReportChart2 ) {
            eventBus.publish( 'updateChartGen2' );
        }
        if( repParameters.ReportDefProps.ReportChart3 ) {
            eventBus.publish( 'updateChartGen3' );
        }

        if( repParameters.ReportDefProps.ReportTable1 !== undefined ) {
            // conditions in order to properly destroy and recreate the table with new specifications
            //updateTable = true;
            //appCtxService.updatePartialCtx( 'updateTable', updateTable );
            eventBus.publish( 'gridView.plTable.reload' );
        }
        eventBus.publish( 'showReportService.updateTotalFoundOnCtx' );
        return {
            updateTable,
            repTotalObj: nwrepTotalObj,
            repTime: nwrepTime
        };
    }
};

/**
  * getSearchFilterMap
  *
  * @function getSearchFilterMap
  * @param {Object} ctx ctx
  * @returns {Object} containing filters to be processed by table
  */
export let getSearchFilterMap = function( ctx ) {
    return ctx.ReportsContext.reportParameters.ReportDefProps !== undefined ? ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.activeFilterMap : {};
};

// Method to disable condition for chart visibility
export let chartRemoveGen1 = function() {
    return { dataIsReadyChartGen1: false };
};

// Method to disable condition for chart visibility
export let chartRemoveGen2 = function() {
    return { dataIsReadyChartGen2: false };
};

// Method to disable condition for chart visibility
export let chartRemoveGen3 = function() {
    return { dataIsReadyChartGen3: false };
};

// Method to enable condition for chart visibility
export let chartReadyGen1 = function() {
    return { dataIsReadyChartGen1: true };
};

// Method to enable condition for chart visibility
export let chartReadyGen2 = function() {
    return { dataIsReadyChartGen2: true };
};

// Method to enable condition for chart visibility
export let chartReadyGen3 = function() {
    return { dataIsReadyChartGen3: true };
};

export let _dateFilterMarker = '_0Z0_';

export let updateReportInstruction = function( i18n, instructionsTitle, params ) {
    let nwinstructionsTitle = { ...instructionsTitle };
    var reportName = params.title;
    var reportInstructions;
    if( params.reportType === '4' ) {
        reportInstructions = i18n.instructionsTitle;
        reportInstructions = reportInstructions.replace( '{0}', reportName );
        nwinstructionsTitle.dbValue = reportInstructions;
        nwinstructionsTitle.uiValue = reportInstructions;
    } else {
        reportInstructions = i18n.itemReportinstructions;
        reportInstructions = reportInstructions.replace( '{0}', reportName );
        nwinstructionsTitle.dbValue = reportInstructions;
        nwinstructionsTitle.uiValue = reportInstructions;
    }
    return { instructionsTitle: nwinstructionsTitle };
};

/**
  * initiateReportDisplay
  *
  * @function initiateReportDisplay
  * @param {Object} data data
  * @param {Object} ctx ctx
  * @returns {Object} containing boolean indicating we need to show instructions
  */
export let initiateReportDisplay = function( data, ctx, subPanelContext, eventData ) {
    if( eventData && eventData.type && eventData.type === 'ReportDefinition' ) {
        subPanelContext = eventData;
    }
    var isFilteringEnabled;
    appCtxService.updatePartialCtx( 'ReportsContext.showPreview', false );
    appCtxService.updatePartialCtx( 'ReportsContext.saveReportConfigActionComplete', false );
    let currentlyAppliedRevRule = confgItemRepSrvc.getCtxPayloadRevRule();
    var params = ctx.state.params;

    if( params.configure === 'true' ) {
        data.instructions = true;
    }
    if( ctx.selected && ctx.selected.type === 'ReportDefinition' ) {
        //use-case - show showReportImage view when ReportDef is selelected
        //in list with Summary view in My Dashboard
        appCtxService.updatePartialCtx( 'ReportsContext.selected', ctx.selected );
        var initRepDisplay = exports.rebuildReportDefProps( ctx.selected );
        if( initRepDisplay ) {
            confgItemRepSrvc.setCtxPayloadRevRule( currentlyAppliedRevRule );
            eventBus.publish( 'ShowReportService.InitiateReportDisplay' );
            appCtxService.ctx.searchCriteria = appCtxService.ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria;
        } else{
            eventBus.publish( 'initiateCalltoFetchTranslatedSearchCriteria' );
        }
        isFilteringEnabled =  Boolean( ctx.selected.props.rd_type.dbValues[0] === '1' || ctx.selected.props.rd_parameters && ctx.selected.props.rd_parameters.dbValues.indexOf( 'dataprovider' ) !== -1 && ctx.selected.props.rd_param_values.dbValues[ctx.selected.props.rd_parameters.dbValues.indexOf( 'dataprovider' )] !== 'Awp0FullTextSearchProvider' );
    } else if( ctx.selected === null && subPanelContext && subPanelContext.reportId === undefined ) {
        //use-case: Open Active report in showReportImage - Image view

        var title = params.title;
        //get ReportDefinition Object and update it in reports ctx
        exports.updateSelectedReport( data, params, subPanelContext, isFilteringEnabled  );
    } else if( subPanelContext  && subPanelContext.reportId ) {
        //use-case: Display ShowReport Component in different sub-locations, like Change->Dashboard
        let newParams = {
            reportId: subPanelContext.reportId,
            configure: 'false'
        };
        updateSelectedReport( data, newParams, subPanelContext, isFilteringEnabled );
    } else if( subPanelContext && subPanelContext.type === 'ReportDefinition' ) {
        //use-case - showReportImage using aw-include and ReportDef object
        //is passed as a subPanelContext.
        appCtxService.updatePartialCtx( 'ReportsContext.selected', subPanelContext );
        initRepDisplay = exports.rebuildReportDefProps( subPanelContext );
        if( initRepDisplay ) {
            confgItemRepSrvc.setCtxPayloadRevRule( currentlyAppliedRevRule );
            eventBus.publish( 'ShowReportService.InitiateReportDisplay' );
        }
        isFilteringEnabled = Boolean( subPanelContext.props.rd_type.dbValues[0] === '1' || subPanelContext.props.rd_parameters && subPanelContext.props.rd_parameters.dbValues.indexOf( 'dataprovider' ) !== -1 && subPanelContext.props.rd_param_values.dbValues[subPanelContext.props.rd_parameters.dbValues.indexOf( 'dataprovider' )] !== 'Awp0FullTextSearchProvider' );
    }
    return isFilteringEnabled;
};

/**
  * Register the policy
  * @returns {any} policyId
  */
export let registerPolicy = function() {
    var reportDefs = appCtxService.getCtx( 'ReportsContext.reportParameters.ReportDefProps' );
    var types = {};
    var typeList = [];
    if( reportDefs && reportDefs.ReportTable1 ) {
        var propList = reportDefs.ReportTable1.ColumnPropInternalName;
        for( var x = 0; x < propList.length; x++ ) {
            var propAndObj = propList[ x ].split( '.' );
            var typePropList = {};
            typePropList.name = propAndObj[ 0 ];
            var prop = {};
            prop.name = propAndObj[ 1 ];
            typePropList.properties = [ prop ];
            typeList.push( typePropList );
        }
        types.types = typeList;
        return soa_kernel_propertyPolicyService.register( types );
    }
};

export let getValidSortCriteriaField = function( sortCriteria, dataColumns ) {
    if( dataColumns ) {
        var propName = sortCriteria.fieldName;
        var selColumn = dataColumns.filter( function( column ) {
            return column.name === propName;
        } );
        return selColumn.length > 0 ? selColumn[ 0 ].associatedTypeName + '.' + propName : propName;
    }
};

/**
  *
  * Load Table
  * @param {any} data - Data
  * @param  {any} searchInput - The Search Input
  * @param  {any} columnConfigInput - The Column Config Input
  * @param  {any} saveColumnConfigData - Save Column Config Data
  *
  * @returns {any} response
  */
export let loadData = function( data, searchInput, columnConfigInput, saveColumnConfigData ) {
    //register property policy
    var policyId = exports.registerPolicy();

    if( searchInput.searchSortCriteria !== undefined && searchInput.searchSortCriteria.length > 0 && searchInput.cursor !== undefined && searchInput.cursor.startIndex === 0 ) {
        var fieldName = exports.getValidSortCriteriaField( searchInput.searchSortCriteria[ 0 ], data.dataProviders.gridDataProvider.columnConfig.columns );
        searchInput.searchSortCriteria[ 0 ].fieldName = fieldName;
    }

    if( data.grids && data.grids.gridView && data.grids.gridView.columnProviderInstance ) {
        searchInput.columnFilters = data.grids.gridView.columnProviderInstance.columnFilters;
    }

    return soa_kernel_soaService.postUnchecked( 'Internal-AWS2-2023-06-Finder', 'performSearchViewModel5', {
        columnConfigInput: columnConfigInput,
        inflateProperties: false,
        noServiceData: false,
        saveColumnConfigData: saveColumnConfigData,
        searchInput: searchInput
    } ).then(
        function( response ) {
            soa_kernel_propertyPolicyService.unregister( policyId );
            if( response.searchResultsJSON ) {
                response.searchResults = JSON.parse( response.searchResultsJSON );
                delete response.searchResultsJSON;
            }

            // Create view model objects
            response.searchResults = response.searchResults && response.searchResults.objects ? response.searchResults.objects
                .map( function( vmo ) {
                    return viewModelObjectService.createViewModelObject( vmo.uid, 'EDIT', null, vmo );
                } ) : [];

            return response;
        } );
};

/**
  * loadColumns
  *
  * @function loadColumns
  * @param {Object} dataprovider dataprovider
  * @param {Object} reportTable reportTable
  */
export let loadColumns = function( dataprovider, reportTable, colmnWidth ) {
    var corrected = [];
    var colWidth = colmnWidth === undefined ? 200 : colmnWidth;

    var typeN = reportTable.ColumnPropInternalName[ 0 ].split( '.' );
    var objectMeta = cmm.getType( typeN[ 0 ] );
    var displayName = reportTable.ColumnPropName[ 0 ];
    if( !reportTable.ColumnDataType ) {
        reportTable.ColumnDataType = Array( reportTable.ColumnPropInternalName.length ).fill( 'STRING' );
    }
    var dataType = reportTable.ColumnDataType[ 0 ];
    if( objectMeta && objectMeta.propertyDescriptorsMap.hasOwnProperty( typeN[ 1 ] ) ) {
        displayName = objectMeta.propertyDescriptorsMap[ typeN[ 1 ] ].displayName;
    }
    var initialCol = {
        name: typeN[ 1 ],
        displayName: displayName,
        dataType: dataType,
        typeName: typeN[ 0 ],
        width: 250,
        pinnedLeft: true,
        enableColumnMenu: true
    };

    corrected.push( initialCol );
    // var searchFilterCategories = appCtxService.getCtx( 'ReportsContext.searchIncontextInfo.searchFilterCategories' );
    for( var x = 1; x < reportTable.ColumnPropInternalName.length; x++ ) {
        typeN = reportTable.ColumnPropInternalName[ x ].split( '.' );
        objectMeta = cmm.getType( typeN[ 0 ] );
        displayName = reportTable.ColumnPropName[x ];
        dataType = reportTable.ColumnDataType[ x ];
        if( objectMeta && objectMeta.propertyDescriptorsMap.hasOwnProperty( typeN[ 1 ] ) ) {
            displayName = objectMeta.propertyDescriptorsMap[ typeN[ 1 ] ].displayName;
        }
        var obj = { name: typeN[ 1 ], displayName: displayName, dataType: dataType, typeName: typeN[ 0 ], width: colWidth };
        if( typeN[ 1 ] === 'release_status_list' || typeN[ 1 ] === 'release_statuses' ) {
            obj.enableSorting = false;
        }
        corrected.push( obj );
    }
    // if( dataprovider !== null ) {
    //     dataprovider.columnConfig = {
    //         columns: corrected
    //     };
    // }
    return corrected;
};

/**
  * removeDataTable
  *
  * @function removeDataTable
  * @return {Object} object with dataIsReadyTable boolean to trigger condition for removind the data table
  */
export let removeDataTable = function() {
    return { dataIsReadyTable: false };
};

/**
  * updateDataTable - set boolean to trigger condition for when table has already been updated
  *
  * @function updateDataTable
  */
export let updateDataTable = function( data ) {
    var updateTable = appCtxService.getCtx( 'updateTable' );
    if( updateTable ) {
        //appCtxService.updatePartialCtx( 'updateTable', false );
        return false;
    }
    return data.updateTable;
};

/**
  * updateTimeOfRequest
  *
  * @function updateTimeOfRequest
  */
export let updateTimeOfRequest = function( data ) {
    return data.i18n.dashboardLastRefresh + reportsCommSrvc.getReportUpdateTime( data );
};

/**
  * getNumCharts
  *
  * @function getNumCharts
  * @param {Object} charts charts config objects
  * @return {int} number of chosen charts
  */
export let getNumCharts = function( repDefProps ) {
    var numCharts = 0;
    if( repDefProps.ReportChart1 !== undefined ) { numCharts++; }
    if( repDefProps.ReportChart2 !== undefined ) { numCharts++; }
    if( repDefProps.ReportChart3 !== undefined ) { numCharts++; }
    return numCharts;
};

/**
  *
  * @function showPreviewClicked
  * @param {Object} data data variable from config panel scope
  * @return {Object} containing configuration for show preview panel
  */
export let showPreviewClicked = function( data, repTitle, repTotalObj, repTime ) {
    // showPreviewClicked aknowledgement
    var previewShown = appCtxService.ctx.ReportsContext.showPreview;

    // Handle Condition for when nothing is updated:
    var repParameters = appCtxService.getCtx( 'ReportsContext.reportParameters' );
    // var repParameters = appCtxService.getCtx( 'ReportParameters' );
    //setupLayoutPanelForItemReport( repParameters );

    let nwrepTitle = { ... repTitle };
    let nwrepTotalObj = { ...repTotalObj };
    let nwrepTime = { ...repTime };

    var requTime = updateTimeOfRequest( data );
    nwrepTime.dbValue = requTime;
    nwrepTime.uiValue = requTime;

    var totFnd = appCtxService.ctx.ReportsContext.reportParameters.totalFound;
    nwrepTotalObj.dbValue  = data.i18n.totalObjsFound + totFnd;
    nwrepTotalObj.uiValue  = data.i18n.totalObjsFound + totFnd;

    var updateTable = false;
    // Checks if there are items to update
    if( previewShown && repParameters !== undefined && repParameters.UpdatedLayoutElement !== undefined &&
         ( repParameters.UpdatedLayoutElement.ElementToUpdate.length > 0 || repParameters.UpdatedLayoutElement.ElementToRemove.length > 0 ) ) {
        var updateElem = repParameters.UpdatedLayoutElement;
        var output = {};

        var charts = repParameters.ChartVisibility;
        // Check to see if there are no elements to update

        _.forEach( updateElem.ElementToUpdate, function( element ) {
            if( element === 'ReportChart1' ) {
                eventBus.publish( 'updateChartGen1' );
            }

            if( element === 'ReportChart2' ) {
                eventBus.publish( 'updateChartGen2' );
            }

            if( element === 'ReportChart3' ) {
                eventBus.publish( 'updateChartGen3' );
            }

            if( element === 'ReportTitle' ) {
                nwrepTitle.dbValue = repParameters.ReportDefProps.ReportTitle.TitleText;
                nwrepTitle.uiValue = repParameters.ReportDefProps.ReportTitle.TitleText;
            }

            if( element === 'ReportTable1' ) {
                updateTable = true;
            }
        } );

        _.forEach( updateElem.ElementToRemove, function( element ) {
            if( element === 'ReportChart1' ) {
                eventBus.publish( 'chartRemovedGen1' );
            }
            if( element === 'ReportChart2' ) {
                eventBus.publish( 'chartRemovedGen2' );
            }
            if( element === 'ReportChart3' ) {
                eventBus.publish( 'chartRemovedGen3' );
            }
            if( element === 'ReportTitle' ) {
                nwrepTitle.dbValue = repParameters.ReportDefProps.ReportTitle.TitleText;
                nwrepTitle.uiValue = repParameters.ReportDefProps.ReportTitle.TitleText;
            }
            if( element === 'ReportTable1' ) {
                eventBus.publish( 'removeTable' );
            }
        } );

        // get number of charts to persist layout correctly
        var numCharts = exports.getNumCharts( repParameters.ReportDefProps );
        if( repParameters.ReportDefProps.ReportTitle !== undefined ) {
            titleChosen = true;
        }

        var tableChosen = false;
        if( repParameters.ReportDefProps.ReportTable1 !== undefined ) { tableChosen = true; }

        output = {
            updateTable,
            dataIsReady: true,
            numCharts,
            dataIsReadyChart1: repParameters.ReportDefProps.ReportChart1 !== undefined,
            dataIsReadyChart2: repParameters.ReportDefProps.ReportChart2 !== undefined,
            dataIsReadyChart3: repParameters.ReportDefProps.ReportChart3 !== undefined,
            dataIsReadyTable: tableChosen,
            dataIsReadyTitle: titleChosen,
            repTitle: nwrepTitle,
            repTotalObj: nwrepTotalObj,
            repTime: nwrepTime
        };
        appCtxService.updatePartialCtx( 'updateTable', output.updateTable );
    } else if( !previewShown && repParameters.ReportDefProps !== undefined ) {
        var titleChosen = false;

        if( repParameters.ReportDefProps.ReportTitle !== undefined ) {
            titleChosen = true;
            nwrepTitle.dbValue = repParameters.ReportDefProps.ReportTitle.TitleText;
            nwrepTitle.uiValue = repParameters.ReportDefProps.ReportTitle.TitleText;
        }

        // need check number of charts
        var chartVisibility = repParameters.ChartVisibility;
        // var numCharts = 2;
        numCharts = 0;

        if( repParameters.ReportDefProps.ReportChart1 ) {
            numCharts++;
            eventBus.publish( 'updateChartGen1' );
            // call exports directly
        }
        if( repParameters.ReportDefProps.ReportChart2 ) {
            numCharts++;
            eventBus.publish( 'updateChartGen2' );
        }
        if( repParameters.ReportDefProps.ReportChart3 ) {
            numCharts++;
            eventBus.publish( 'updateChartGen3' );
        }

        tableChosen = false;
        if( repParameters.ReportDefProps.ReportTable1 !== undefined ) {
            tableChosen = true;
        }
        output = {
            updateTable,
            dataIsReady: true,
            numCharts,
            dataIsReadyChart1: repParameters.ReportDefProps.ReportChart1 !== undefined,
            dataIsReadyChart2: repParameters.ReportDefProps.ReportChart2 !== undefined,
            dataIsReadyChart3: repParameters.ReportDefProps.ReportChart3 !== undefined,
            dataIsReadyTable: tableChosen,
            dataIsReadyTitle: titleChosen,
            repTitle: nwrepTitle,
            repTotalObj: nwrepTotalObj,
            repTime: nwrepTime
        };
        appCtxService.updatePartialCtx( 'ReportsContext.showPreview', true );
        appCtxService.updatePartialCtx( 'updateTable', output.updateTable );
    }
    return output;
};

export let callRepGetCategories = function( response ) {
    var categories = response.searchFilterCategories;
    var categoryValues = response.searchFilterMap || response.searchFilterMap6;
    var groupByProperty = response.objectsGroupedByProperty.internalPropertyName;
    var searchResultFilters = [];
    categories.refineCategories = [];
    categories.navigateCategories = [];
    var contextObject = appCtxService.getCtx( 'ReportsContext.searchIncontextInfo' );
    if( contextObject === undefined ) { contextObject = {}; }

    _.forEach( categories, function( category, index ) {
        filtrPanelSrvc.getCategories2Int( category, index, categories, categoryValues, groupByProperty, false, true, true, contextObject, searchResultFilters );
    } );

    // const stateObj = response;
    // stateObj.searchFilterMap = response.searchFilterMap;

    // const nwcategories = filtrPanelSrvc.getCategories3( stateObj, true );

    //getSelectedFiltersMap( categories );
    var selectedFiltersMap = getSelectedFiltersMap( categories );
    const selectedFiltersInfo = searchFilterService.buildSearchFiltersFromSearchState( selectedFiltersMap );

    contextObject.saveSearchFilterMap = selectedFiltersInfo.activeFilters;
    contextObject.searchFilterCategories = categories;

    appCtxService.updatePartialCtx( 'ReportsContext.searchIncontextInfo', contextObject );

    return categories;
};

/**
  *
  * @function callRepGetProviderName
  * @param {Object} ctx - ctx
  * @return {Object} data provider name
  */
export let callRepGetProviderName = function( ctx ) {
    if( ctx.ReportsContext.selected && ctx.ReportsContext.selected.props.rd_type.dbValues[0] === '1' ) {
        return 'Rb0ReportsDataProvider';
    }else if ( ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.dataProviderName ) {
        return ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.dataProviderName;
    }
    return 'Awp0FullTextSearchProvider';
};

var getSourceObjectUid = function( ctx ) {
    if( ctx.sublocation.nameToken === 'com.siemens.splm.reports:showReport' && ctx.ReportsContext.reportParameters.ReportDefProps.ReportClassParameters &&
    ctx.state.params.configure !== 'false' ) {
        return ctx.ReportsContext.reportParameters.ReportDefProps.ReportClassParameters.rootSampleUid;
    } else if( ctx.sublocation.nameToken === 'com.siemens.splm.reports:showReport' && ctx.state.params.referenceId !== null ) {
        return ctx.state.params.referenceId;
    } else if( ctx.selected ) {
        var selected = reportsCommSrvc.getUnderlyingObject( ctx.selected );
        return selected.uid;
    }
};

var getSourceObjectTraversalPath = function( ctx ) {
    if( ctx.sublocation.nameToken === 'com.siemens.splm.reports:showReport' ) {
        return confgItemRepSrvc.getTraversalPath( ctx.ReportsContext.reportParameters );
    } else if( ctx.ReportsContext.reportParameters && ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo ) {
        return ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria;
    }
};

/**
  *
  * @function callRepGetSearchCriteria
  * @param {Object} ctx - ctx
  * @return {Object} additional search criteria to perform search
  */
export let callRepGetSearchCriteria = function( ctx ) {
    var searchCriteria = {};

    if( ctx.ReportsContext.selected && ctx.ReportsContext.selected.props.rd_type.dbValues[0] === '1' ) {
        searchCriteria = {
            sourceObject: getSourceObjectUid( ctx ),
            relationsPath: getSourceObjectTraversalPath( ctx )
        };
    } else {
        searchCriteria = { searchString: ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria };
    }

    var reportSearchInfo = ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo;
    // Iterate for all entries in additional search criteria and add to main search criteria
    for( var searchCriteriaKey in reportSearchInfo.additionalSearchCriteria ) {
        if( searchCriteriaKey !== 'SearchCriteria' && searchCriteriaKey !== 'activeFilterMap' ) {
            searchCriteria[ searchCriteriaKey ] = reportSearchInfo.additionalSearchCriteria[ searchCriteriaKey ];
        }
    }
    return searchCriteria;
};

var updateFiltersAndInitiateReportDisplay = function( reportSearchInfo, filterVals, filter, data ) {
    appCtxService.updatePartialCtx( reportsCommSrvc.getReportsCtxSearchInfo(), reportSearchInfo );
    appCtxService.updatePartialCtx( 'ReportsContext.filterApplied', true );
    var filterChip = { uiIconId: 'miscRemoveBreadcrumb', chipType: 'BUTTON',
        labelDisplayName: filter.displayName + ': ' + filterVals.name,
        labelInternalName: filterVals.categoryName
    };
    data.filterChips.push( filterChip );
    _runtimeFilterApplied = true;
    eventBus.publish( 'ShowReportService.InitiateReportDisplay' );
};

var isActiveItemReport = function() {
    return   appCtxService.ctx.ReportsContext.selected && appCtxService.ctx.ReportsContext.selected.props.rd_type.dbValues[ 0 ] === '1';
};

export let applyFilterAndInitiateReportUpdate = function( filterValue, filterProperty, data ) {
    var searchFiltCat = appCtxService.getCtx( 'ReportsContext.searchIncontextInfo.searchFilterCategories' );
    var filterPropertyInternalName = null;
    if( data.chartProviders ) {
        // Get the selected chart provider and from chart provider get the series internal name
        // if present and then it will be used to filter based on internal name
        var selChartProvider = _.find( data.chartProviders, {
            seriesPropName: filterProperty
        } );
        if( selChartProvider && selChartProvider.seriesInternalName ) {
            filterPropertyInternalName = selChartProvider.seriesInternalName;
        }
    }

    if( searchFiltCat && searchFiltCat.length !== 0 && !isActiveItemReport() ) {
        _.every( searchFiltCat, function( filter ) {
            // Compare if property display name is matching and if not then try to match the internal name
            if( filter.displayName === filterProperty ||
                 filterPropertyInternalName && filter.internalName === filterPropertyInternalName ) {
                _.every( filter.filterValues, function( filterVals ) {
                    if( filterVals.name === filterValue ) {
                        var selectedFilter = {};
                        if( filterVals.type === 'NumericFilter' ) {
                            selectedFilter = { searchFilterType: 'NumericFilter', stringDisplayValue: filterVals.name, stringValue: filterVals.internalName, startNumericValue: filterVals.startNumericValue,
                                endNumericValue: filterVals.endNumericValue };
                        } else {
                            selectedFilter = { searchFilterType: 'StringFilter', stringDisplayValue: filterVals.name, stringValue: filterVals.internalName };
                        }
                        var reportSearchInfo = appCtxService.getCtx( reportsCommSrvc.getReportsCtxSearchInfo() );
                        //check if report has existing filters
                        if( !_runtimeFilterApplied && Object.keys( reportSearchInfo.activeFilterMap ).length !== 0 ) {
                            _reportexistingFil = JSON.parse( JSON.stringify( reportSearchInfo.activeFilterMap ) );
                            appCtxService.updatePartialCtx( 'ReportsContext.reportParameters.RuntimeInformation.ReportExistingFilters', _reportexistingFil );
                        }
                        var tempArray = [];
                        tempArray.push( selectedFilter );
                        if( !reportSearchInfo.activeFilterMap.hasOwnProperty( filterVals.categoryName ) ) {
                            reportSearchInfo.activeFilterMap[ filterVals.categoryName ] = tempArray;
                            updateFiltersAndInitiateReportDisplay( reportSearchInfo, filterVals, filter, data );
                        } else if( _reportexistingFil !== undefined && _reportexistingFil.hasOwnProperty( filterVals.categoryName ) ) {
                            delete reportSearchInfo.activeFilterMap[ filterVals.categoryName ];
                            reportSearchInfo.activeFilterMap[ filterVals.categoryName ] = tempArray;
                            updateFiltersAndInitiateReportDisplay( reportSearchInfo, filterVals, filter, data );
                        }
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

export let removeReportFilter = function( data, filterChips, chipToRemove ) {
    filterChips.splice( filterChips.indexOf( chipToRemove ), 1 );
    data.filterChips = filterChips;
    var reportSearchInfo = appCtxService.getCtx( reportsCommSrvc.getReportsCtxSearchInfo() );
    if( reportSearchInfo.activeFilterMap.hasOwnProperty( chipToRemove.labelInternalName ) ) {
        delete reportSearchInfo.activeFilterMap[ chipToRemove.labelInternalName ];
        //check if there are any stored existing filters stored.
        if( _reportexistingFil !== undefined && _reportexistingFil.hasOwnProperty( chipToRemove.labelInternalName ) ) {
            reportSearchInfo.activeFilterMap[ chipToRemove.labelInternalName ] = JSON.parse( JSON.stringify( _reportexistingFil[ chipToRemove.labelInternalName ] ) );
        }
        appCtxService.updatePartialCtx( reportsCommSrvc.getReportsCtxSearchInfo(), reportSearchInfo );
        eventBus.publish( 'ShowReportService.InitiateReportDisplay' );
    }
};

var loadConfiguration = function() {
    localeService.getTextPromise( 'SearchMessages', true ).then(
        function( localTextBundle_ ) {
            localTextBundle = localTextBundle_;
        } );
};

loadConfiguration();

export default exports = {
    rebuildReportDefProps,
    updateSelectedReport,
    filterUpdated,
    getSearchFilterMap,
    chartRemoveGen1,
    chartRemoveGen2,
    chartRemoveGen3,
    chartReadyGen1,
    chartReadyGen2,
    chartReadyGen3,
    updateReportInstruction,
    initiateReportDisplay,
    registerPolicy,
    getValidSortCriteriaField,
    loadData,
    loadColumns,
    removeDataTable,
    updateDataTable,
    updateTimeOfRequest,
    getNumCharts,
    showPreviewClicked,
    callRepGetCategories,
    applyFilterAndInitiateReportUpdate,
    removeReportFilter,
    callRepGetProviderName,
    callRepGetSearchCriteria,
    fetchAndUpdateTranslatedSearchCriteria
};

