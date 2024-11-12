import AwSplmTable from 'viewmodel/AwSplmTableViewModel';
import viewModelObjectService from 'js/viewModelObjectService';
import soa_kernel_soaService from 'soa/kernel/soaService';
import appCtxService from 'js/appCtxService';
import soa_kernel_propertyPolicyService from 'soa/kernel/propertyPolicyService';
import filtrPanelSrvc from 'js/filterPanelService';
import { getSelectedFiltersMap } from 'js/awSearchSublocationService';
import searchFilterService from 'js/aw.searchFilter.service';
import reportsCommSrvc from 'js/reportsCommonService';
import confgItemRepSrvc from 'js/configureItemReportService';
import cmm from 'soa/kernel/clientMetaModel';
import _ from 'lodash';
import dmSvc from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';
import listBoxService from 'js/listBoxService';
import { ExistWhen } from 'js/hocCollection';
var exports = {};
const AwSplmTableExistWhen = ExistWhen( AwSplmTable );
export const awReportTableServiceRenderFunction = ( props ) => {
    let { viewModel, ...prop } = props;
    let { grids } = viewModel;
    return (
        <AwSplmTableExistWhen existWhen={!props.subPanelContext.reportsState.tableRefresh} gridid={'gridView'} {...grids.gridView} ></AwSplmTableExistWhen>
    );
};

var getSearchSortCriteria = ( data ) => {
    if( data.columnProviders.staticColumnProvider?.sortCriteria && data.dataProviders.gridDataProvider.columnConfig?.columns && data.columnProviders.staticColumnProvider?.sortCriteria.length > 0 ) {
        var propName = data.columnProviders.staticColumnProvider?.sortCriteria[0].fieldName;
        var dataColumns = data.dataProviders.gridDataProvider.columnConfig.columns;
        var selColumn = dataColumns.filter( function( column ) {
            return column.name === propName;
        } );
        var fieldName = selColumn.length > 0 ? selColumn[ 0 ].associatedTypeName + '.' + propName : propName;
        data.columnProviders.staticColumnProvider.sortCriteria[0].fieldName = fieldName;
        return data.columnProviders.staticColumnProvider.sortCriteria;
    }
    return [];
};

var getSearchFilterMap = ( reportsState ) => {
    var activeFilters;
    if( !appCtxService.ctx.state.params.filter ) {
        activeFilters = reportsState.reportParameters?.ReportDefProps?.ReportSearchInfo?.activeFilterMap;
    } else {
        activeFilters = searchFilterService.getFilters();
        const selectedFiltersInfo = searchFilterService.buildSearchFiltersFromSearchState( activeFilters );
        activeFilters = selectedFiltersInfo.activeFilterMap;
    }
    if( activeFilters && reportsState.runtimeInfo && reportsState.runtimeInfo.appliedFilters ) {
        for( var key in reportsState.runtimeInfo.appliedFilters ) {
            activeFilters[key] = reportsState.runtimeInfo.appliedFilters[key];
        }
    }
    return activeFilters;
};

var getColumnFilters = ( data ) =>{
    if( data.grids.gridView.columnProviderInstance?.columnFilters ) {
        return data.grids.gridView.columnProviderInstance?.columnFilters;
    }
};

var getSourceObjectUid = function( reportsState ) {
    let ctx = appCtxService.getCtx( '' );
    if( ctx.sublocation.nameToken === 'com.siemens.splm.reports:createReportTemplate' && reportsState.rootClassSampleObject?.length > 0 ) {
        return reportsState.rootClassSampleObject[0].uid;
    } else if( ctx.sublocation.nameToken === 'com.siemens.splm.reports:createReportTemplate' && reportsState.reportParameters.ReportDefProps.ReportClassParameters ) {
        return reportsState.reportParameters.ReportDefProps.ReportClassParameters.rootSampleUid;
    } else if( ctx.state.params.referenceId ) {
        return ctx.state.params.referenceId;
    } else if( ctx.selected ) {
        var selected = reportsCommSrvc.getUnderlyingObject( ctx.selected );
        return selected.uid;
    }
};

var getSourceObjectTraversalPath = function( reportsState ) {
    let nameToken = appCtxService.getCtx( 'sublocation.nameToken' );
    if( nameToken === 'com.siemens.splm.reports:createReportTemplate' && reportsState.segments?.length > 0 ) {
        return confgItemRepSrvc.getTraversalPath( reportsState );
    } else if( reportsState.reportParameters && reportsState.reportParameters.ReportDefProps.ReportSearchInfo ) {
        return reportsState.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria;
    }
};

/**
  *
  * @function callRepGetSearchCriteria
  * @param {Object} reportsState - reportsState
  * @return {Object} additional search criteria to perform search
  */
export let callRepGetSearchCriteria = function( reportsState ) {
    var searchCriteria = {};

    if( reportsState.selectedReport && reportsState.selectedReport.props.rd_type.dbValues[0] === '1' || appCtxService.ctx.state.params.reportType === '1' ) {
        searchCriteria = {
            sourceObject: getSourceObjectUid( reportsState ),
            relationsPath: getSourceObjectTraversalPath( reportsState )
        };
    } else if( appCtxService.ctx.state.params.searchCriteria ) {
        searchCriteria = { searchString: appCtxService.ctx.state.params.searchCriteria };
    } else {
        searchCriteria = { searchString: reportsState.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria };
    }
    var reportSearchInfo = reportsState.reportParameters?.ReportDefProps?.ReportSearchInfo;
    // Iterate for all entries in additional search criteria and add to main search criteria
    for( var searchCriteriaKey in reportSearchInfo?.additionalSearchCriteria ) {
        if( searchCriteriaKey !== 'SearchCriteria' && searchCriteriaKey !== 'activeFilterMap' ) {
            searchCriteria[ searchCriteriaKey ] = reportSearchInfo.additionalSearchCriteria[ searchCriteriaKey ];
        }
    }
    return searchCriteria;
};

/**
  *
  * @function callRepGetProviderName
  * @param {Object} reportsState - reportsState
  * @return {Object} data provider name
  */
export let callRepGetProviderName = function( reportsState ) {
    if ( reportsState?.reportParameters?.ReportDefProps?.ReportSearchInfo?.dataProviderName ) {
        return reportsState.reportParameters.ReportDefProps.ReportSearchInfo.dataProviderName;
    }else if( reportsState?.selectedReport && reportsState.selectedReport.props.rd_type.dbValues[0] === '1' || appCtxService.ctx.state.params.reportType === '1' ) {
        return 'Rb0ReportsDataProvider';
    }
    return 'Awp0FullTextSearchProvider';
};

var attributesToInflate = ( displayColumns )=>{
    var attributes = [];
    if( displayColumns ) {
        _.forEach( displayColumns, function( displayColumn ) {
            displayColumn.propertyName ? attributes.push( displayColumn.propertyName ) : '';
        } );
    }
    return attributes;
};

var getSearchInput = ( reportsState, data ) => {
    return {
        attributesToInflate: attributesToInflate( data.displayColumns ),
        internalPropertyName: '',
        maxToLoad: 50,
        maxToReturn: 50,
        providerName: callRepGetProviderName( reportsState ), //assign provider
        searchCriteria: callRepGetSearchCriteria( reportsState ), //assign the search criteria
        searchFilterFieldSortType: 'Priority',
        cursor: {
            startIndex: data.dataProviders.gridDataProvider.startIndex //startIndex based on the cursor for the report table
        },
        columnFilters: getColumnFilters( data ),
        searchFilterMap6: getSearchFilterMap( reportsState ),
        searchSortCriteria: getSearchSortCriteria( data ) //check if any sort criteria exist
    };
};

/**
  * Register the policy
  * @returns {any} policyId
  */
var registerPolicy = function( reportDefs ) {
    var types = {};
    var typeList = [ {
        name:'WorkspaceObject',
        properties:[ { name:'object_string' } ]
    } ];
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

export let callRepGetCategories = function( response, nwReportsState ) {
    var categories = response.searchFilterCategories;
    var categoryValues = response.searchFilterMap;
    var groupByProperty = response.objectsGroupedByProperty.internalPropertyName;
    var searchResultFilters = [];
    categories.refineCategories = [];
    categories.navigateCategories = [];
    var contextObject = nwReportsState.searchIncontextInfo;
    if( contextObject === undefined ) { contextObject = {}; }
    _.forEach( categories, function( category, index ) {
        filtrPanelSrvc.getCategories2Int( category, index, categories, categoryValues, groupByProperty, false, true, true, contextObject, searchResultFilters );
    } );
    var selectedFiltersMap = getSelectedFiltersMap( categories );
    const selectedFiltersInfo = searchFilterService.buildSearchFiltersFromSearchState( selectedFiltersMap );
    contextObject.saveSearchFilterMap = selectedFiltersInfo.activeFilters;
    contextObject.searchFilterCategories = categories;
    nwReportsState.searchIncontextInfo = contextObject;
    return categories;
};

const getDataType = ( typeFilter ) => {
    if( typeFilter === 'NumericFilter' ) {
        return 'DOUBLE';
    } else if( typeFilter === 'DateFilter' ) {
        return 'DATE';
    }
    return 'STRING';
};

const getColumnsAsPerArrangedColumns = ( arrangedColumns, columns ) => {
    let nwColumns = [];
    _.forEach( arrangedColumns, ( columnName )=> {
        let matchedColumn = _.find( columns, ( column )=>{
            if( column.internalName.includes( columnName, 0 ) || columnName.includes( column.internalName, 0 ) ) {
                return column;
            }
        } );
        matchedColumn ? nwColumns.push( matchedColumn ) : console.log( 'Column not found :', columnName );
    } );
    return nwColumns;
};

const createColumnProperty = ( property, index, searchFilterMap6, hiddenColumns, sortCriteria )=> {
    // Both if for WSO values
    if( !property.internalName ) {
        property.internalName = property.propInternalValue;
    }
    if( !property.displayName ) {
        property.displayName = property.propDisplayValue;
    }
    var typeN = property.internalName.split( '.' );
    var objectMeta = cmm.getType( typeN[ 0 ] );
    var displayName = property.displayName;
    var internalName = property.internalName;
    var dataType = property.dataType ? property.dataType : getDataType( searchFilterMap6 && searchFilterMap6[internalName] ? searchFilterMap6[internalName][0].searchFilterType : 'StringFilter' );
    if( objectMeta && objectMeta.propertyDescriptorsMap.hasOwnProperty( typeN[ 1 ] ) ) {
        displayName = objectMeta.propertyDescriptorsMap[ typeN[ 1 ] ].displayName;
        dataType = objectMeta.propertyDescriptorsMap[ typeN[ 1 ] ].valueType ? getWSODataType( objectMeta.propertyDescriptorsMap[ typeN[ 1 ] ].valueType ) : dataType;
    }
    var obj = {
        name: typeN[ 1 ],
        displayName: displayName,
        dataType: dataType,
        associatedTypeName: typeN[ 0 ],
        width: index === 0 ? 250 : 200,
        internalName: internalName,
        propertyName: internalName,
        hiddenFlag: columnHiddenOrNot( internalName, hiddenColumns ),
        sortDirection: getSortDirection( sortCriteria, internalName )
    };
    if( typeN[ 1 ] === 'release_status_list' || typeN[ 1 ] === 'release_statuses' ) {
        obj.enableSorting = false;
    }
    return obj;
};

const hideSomeColumns = ( columns, reportTable ) => {
    if( reportTable && reportTable.ColumnPropInternalName.length > 0 ) {
        var reportTableColumnProp = [];
        var nwColumns = [];
        _.forEach( columns, ( column, index )=>{
            columns[index].hiddenFlag = reportTable.ColumnPropInternalName.indexOf( column.internalName ) === -1;
            reportTable.ColumnPropInternalName.indexOf( column.internalName ) === -1 && nwColumns.push( column );
        } );
        _.forEach( reportTable.ColumnPropInternalName, ( columnName )=>{
            _.forEach( columns, ( column )=>{
                column.internalName === columnName && reportTableColumnProp.push( column );
            } );
        } );
        columns = reportTableColumnProp.concat( nwColumns );
    } else {
        // For now putting 10 columns visible
        if( columns.length > 9 ) {
            for( let i = 9; i < columns.length; i++ ) {
                columns[i].hiddenFlag = true;
            }
        }
    }
    return columns;
};

const getWSODataType = ( valueType ) => {
    if( valueType === '2' || valueType === 2 ) {
        return 'DATE';
    } else if( valueType === '5' || valueType === 5 ) {
        return 'DOUBLE';
    }
    return 'STRING';
};

const getWSOPreferenceProps = function( data ) {
    //Get the prop names from preference for WorkspaceObject.
    var commonList = [];
    if( 'preferences' in appCtxService.ctx && 'WORKSPACEOBJECT_object_columns_shown' in appCtxService.ctx.preferences ) {
        commonList.push.apply( commonList, appCtxService.ctx.preferences.WORKSPACEOBJECT_object_columns_shown );
    }
    if( 'preferences' in appCtxService.ctx && 'WORKSPACEOBJECT_object_columns_hidden' in appCtxService.ctx.preferences ) {
        commonList.push.apply( commonList, appCtxService.ctx.preferences.WORKSPACEOBJECT_object_columns_hidden );
    }
    if( commonList.length > 0 ) {
        var wsoType = cmm.getType( 'WorkspaceObject' );
        var wsoProps = [];
        var wsoPropInterName = [];
        var wsoPropDataType = [];
        var wsoPropName = [];
        _.forEach( commonList, function( currPropName ) {
            if( wsoType !== null && wsoType.propertyDescriptorsMap[ currPropName ] ) {
                wsoProps.push( wsoType.propertyDescriptorsMap[ currPropName ].displayName );
                wsoPropInterName.push( 'WorkspaceObject.' + wsoType.propertyDescriptorsMap[ currPropName ].name );
                wsoPropName.push( wsoType.propertyDescriptorsMap[ currPropName ].name );
                wsoPropDataType.push( getWSODataType( wsoType.propertyDescriptorsMap[ currPropName ].valueType ) );
            }
        } );
        wsoProps.push( data.i18n.objectStrColumnName );
        wsoPropInterName.push( 'WorkspaceObject.object_string' );
        wsoPropName.push( 'object_string' );
        wsoPropDataType.push( 'STRING' );
        var vmWsoPros = listBoxService.createListModelObjectsFromStrings( wsoProps );
        for( var index = 0; index < vmWsoPros.length; index++ ) {
            vmWsoPros[ index ].propInternalValue = wsoPropInterName[ index ];
            vmWsoPros[ index ].dataType = wsoPropDataType[ index ];
            vmWsoPros[index].name = wsoPropName[index];
        }
        return vmWsoPros;
    }
};

export let overWriteColumns = function( data, response, hiddenColumns, arrangedColumns, ReportTable1 ) {
    var columns = response.columnConfig.columns;
    ReportTable1 && _.forEach( ReportTable1.ColumnPropInternalName, ( prop, index )=>{
        var property = {
            internalName:prop,
            displayName:ReportTable1.ColumnPropName[index],
            dataType:ReportTable1.ColumnDataType ? ReportTable1.ColumnDataType[index] : undefined
        };
        columns.push( createColumnProperty( property, undefined, undefined, hiddenColumns, data.columnProviders.staticColumnProvider.sortCriteria ) );
    } );
    if( response && response.searchFilterCategories ) {
        var searchFilterCategories = response.searchFilterCategories;
        var searchFilterMap6 = response.searchFilterMap;
        for( var index = 0; index < searchFilterCategories.length; index++ ) {
            var foundCol = columns.find( ( { internalName } )=>{
                return internalName.includes( searchFilterCategories[index].internalName, 0 ) || searchFilterCategories[index].internalName.includes( internalName, 0 );
            } );
            !foundCol && columns.push( createColumnProperty( searchFilterCategories[index], index, searchFilterMap6, hiddenColumns, data.columnProviders.staticColumnProvider.sortCriteria ) );
        }
        var wsoColumProps = getWSOPreferenceProps( data );
        _.forEach( wsoColumProps, ( wsoColumn )=> {
            let matchedColumn  = _.find( columns, ( column )=>{
                if( column.name === wsoColumn.name ) {
                    return column;
                }
            } );
            if( !matchedColumn ) {
                wsoColumn.name === 'object_string' ?
                    columns.unshift( createColumnProperty( wsoColumn, searchFilterCategories.length, searchFilterMap6, hiddenColumns, data.columnProviders.staticColumnProvider.sortCriteria ) ) :
                    columns.push( createColumnProperty( wsoColumn, searchFilterCategories.length, searchFilterMap6, hiddenColumns, data.columnProviders.staticColumnProvider.sortCriteria ) );
            }
        } );
    }
    columns = arrangedColumns ? getColumnsAsPerArrangedColumns( arrangedColumns, columns ) : hideSomeColumns( columns, ReportTable1 );
    return columns;
};

export let saveDisplyColumns = ( eventData, reportsState ) => {
    var nwReportsState = reportsState.getValue();
    nwReportsState.reportParameters.hiddenColumns = [];
    nwReportsState.reportParameters.arrangedColumns = [];
    _.forEach( eventData.columns, ( column )=> {
        column.hiddenFlag ? nwReportsState.reportParameters.hiddenColumns.push( column.name ) : '';
        nwReportsState.reportParameters.arrangedColumns.push( column.name );
    } );
    reportsState.update( nwReportsState );
    return eventData.columns;
};

const getColumnConfigData = ( columnConfig, nwReportsState, data, response ) => {
    columnConfig.columnConfigId = 'awReportTableColConfig';
    let params = appCtxService.ctx.state.params;
    let reportTable = nwReportsState.reportParameters.ReportDefProps.ReportTable1;
    // Needs to revisit
    if( reportTable && params.previewMode !== 'false' ) {
        columnConfig.columns = loadColumns( data.columnProviders.staticColumnProvider.sortCriteria, nwReportsState.reportParameters.ReportDefProps.ReportTable1,
            undefined, nwReportsState.reportParameters.hiddenColumns, nwReportsState.reportParameters.arrangedColumns );
    } else {
        columnConfig.columns = overWriteColumns( data, response,
            nwReportsState.reportParameters.hiddenColumns,
            nwReportsState.reportParameters.arrangedColumns,
            nwReportsState.reportParameters.ReportDefProps.ReportTable1 );
    }
    columnConfig.operationType = 'Intersection';
    //Updating visible columns on reportsState
    nwReportsState.reportParameters.columns = [];
    var ColumnPropNameValues = [];
    var ColumnPropInternalNameValues = [];
    var ColumnDataTypeValues = [];
    _.forEach( columnConfig.columns, ( column )=> {
        if( !column.hiddenFlag ) {
            nwReportsState.reportParameters.columns.push( column );
            ColumnPropNameValues.push( column.displayName );
            ColumnPropInternalNameValues.push( column.associatedTypeName + '.' + column.name );
            ColumnDataTypeValues.push( column.dataType );
        }
    } );
    nwReportsState.reportParameters.ReportDefProps.ReportTable1 = {
        ColumnPropName: ColumnPropNameValues,
        ColumnPropInternalName: ColumnPropInternalNameValues,
        ColumnDataType: ColumnDataTypeValues
    };
};

export let getReportData = ( reportsState, data ) => {
    try {
        //register policy
        var policyId = registerPolicy( reportsState?.reportParameters?.ReportDefProps );
        let nwReportsState = reportsState.getValue();
        //build search input
        var searchInput = getSearchInput( reportsState, data );
        return soa_kernel_soaService.postUnchecked( 'Internal-AWS2-2023-06-Finder', 'performSearchViewModel5', {
            columnConfigInput: { clientName: '', clientScopeURI: '' },
            inflateProperties: false,
            noServiceData: false,
            saveColumnConfigData: '',
            searchInput: searchInput } ).then( function( response ) {
            soa_kernel_propertyPolicyService.unregister( policyId );
            if( response.searchResultsJSON ) {
                response.searchResults = JSON.parse( response.searchResultsJSON );
                delete response.searchResultsJSON;
            }
            //getTranslated criterias
            if( response.additionalSearchInfoMap?.translatedSearchCriteriaForPropertySpecificSearch.length > 0 ) {
                nwReportsState.translatedSearchCriteriaForPropertySpecificSearch = response.additionalSearchInfoMap.translatedSearchCriteriaForPropertySpecificSearch;
            }
            var searchInfo = {};
            //update the reportsState with search info..
            if( response.totalFound > 0 ) {
                searchInfo = {
                    searchFilterCategories: callRepGetCategories( response, nwReportsState ),
                    categories: response.searchFilterCategories,
                    searchFilterMap: response.searchFilterMap
                };
            }
            nwReportsState.searchInfo = searchInfo;
            if( !nwReportsState.reportParameters ) {
                nwReportsState.reportParameters = {
                    ReportDefProps: {
                    }
                };
            }
            nwReportsState.reportParameters.totalFound = response.totalFound;
            //getColumnConfig fn
            var columnConfig = response.columnConfig;
            getColumnConfigData( columnConfig, nwReportsState, data, response );
            reportsState.update( nwReportsState );
            // getproperties fn
            var propList = [];
            response.searchFilterCategories.forEach( ( category )=> {
                var namesArr = category.internalName.split( '.' );
                propList.push( namesArr[1] );
            } );
            var arrayUids = [];
            response.searchResults.objects.forEach( ( object )=> arrayUids.push( object.uid ) );
            dmSvc.getProperties( arrayUids, propList ).then( function() {
                // Create view model objects
                response.searchResults = response.searchResults && response.searchResults.objects ? response.searchResults.objects.map( function( vmo ) {
                    vmo = cdm.getObject( vmo.uid );
                    return viewModelObjectService.createViewModelObject( vmo.uid, 'EDIT', null, vmo );
                } ) : [];
            } );
            return { totalFound: response.totalFound, searchResults: response.searchResults, columnConfig: columnConfig };
        } );
    } catch ( error ) {
        console.log( 'Failed', error );
        return error;
    }
};

export const processAndUpdateSearchCriteria = ( response, reportsState ) => {
    let translatedSearchCriteria;
    if( response?.outputValues?.getTranslatedSearchCriteriaForCurrentLocale?.length === 1 && response.outputValues.getTranslatedSearchCriteriaForCurrentLocale[ 0 ]?.length > 0 ) {
        translatedSearchCriteria = response.outputValues.getTranslatedSearchCriteriaForCurrentLocale[ 0 ];
    }
    if( translatedSearchCriteria?.length > 0 && translatedSearchCriteria.indexOf( 'V_A_L' ) === -1 ) {
        let nwReportsState = reportsState.getValue();
        nwReportsState.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria = translatedSearchCriteria;
        nwReportsState.initRepDisp = true;
        reportsState.update( nwReportsState );
    }
};

let columnHiddenOrNot = ( columnPropInternalName, hiddenColumns ) => {
    let hidden = false;
    hiddenColumns && _.forEach( hiddenColumns, ( hiddenColumnName )=>{
        if( hiddenColumnName.includes( columnPropInternalName, 0 ) || columnPropInternalName.includes( hiddenColumnName, 0 ) ) {
            hidden = true;
        }
    } );
    return hidden;
};

let getSortDirection = ( sortCriteria, propertyVal ) => {
    let sortDirection = '';
    if( sortCriteria?.length > 0 && sortCriteria[0].fieldName === propertyVal && sortCriteria[0].sortDirection === 'ASC' ) {
        sortDirection = 'Ascending';
    } else if( sortCriteria?.length > 0 && sortCriteria[0].fieldName === propertyVal && sortCriteria[0].sortDirection === 'DESC' ) {
        sortDirection = 'Descending';
    }
    return sortDirection;
};

/**
  * loadColumns
  *
  * @function loadColumns
  * @param {Object} dataprovider dataprovider
  * @param {Object} reportTable reportTable
  */
export let loadColumns = function( sortCriteria, reportTable, colmnWidth, hiddenColumns, arrangedColumns ) {
    var corrected = [];
    var colWidth = colmnWidth === undefined ? 200 : colmnWidth;
    if( !reportTable ) {
        return;
    }
    var typeN = reportTable.ColumnPropInternalName[ 0 ].split( '.' );
    var objectMeta = cmm.getType( typeN[ 0 ] );
    var displayName = reportTable.ColumnPropName[ 0 ];
    var dataType = reportTable.ColumnDataType && reportTable.ColumnDataType[ 0 ] ? reportTable.ColumnDataType[ 0 ] : 'STRING';
    for( var x = 0; x < reportTable.ColumnPropInternalName.length; x++ ) {
        typeN = reportTable.ColumnPropInternalName[ x ].split( '.' );
        objectMeta = cmm.getType( typeN[ 0 ] );
        displayName = reportTable.ColumnPropName[x ];
        dataType = reportTable.ColumnDataType && reportTable.ColumnDataType[ x ] ? reportTable.ColumnDataType[ x ] : 'STRING';
        if( objectMeta && objectMeta.propertyDescriptorsMap.hasOwnProperty( typeN[ 1 ] ) ) {
            displayName = objectMeta.propertyDescriptorsMap[ typeN[ 1 ] ].displayName;
            dataType = objectMeta.propertyDescriptorsMap[ typeN[ 1 ] ].valueType ? getWSODataType( objectMeta.propertyDescriptorsMap[ typeN[ 1 ] ].valueType ) : dataType;
        }
        var obj = {
            name: typeN[ 1 ],
            displayName: displayName,
            dataType: dataType,
            associatedTypeName: typeN[ 0 ],
            width: x === 0 ? 250 : colWidth,
            internalName: reportTable.ColumnPropInternalName[ x ],
            propertyName: reportTable.ColumnPropInternalName[ x ],
            hiddenFlag: columnHiddenOrNot( reportTable.ColumnPropInternalName[ x ], hiddenColumns ),
            sortDirection: getSortDirection( sortCriteria, reportTable.ColumnPropInternalName[ x ] )
        };
        if( typeN[ 1 ] === 'release_status_list' || typeN[ 1 ] === 'release_statuses' ) {
            obj.enableSorting = false;
        }
        corrected.push( obj );
    }
    arrangedColumns ? corrected = getColumnsAsPerArrangedColumns( arrangedColumns, corrected ) : '';
    return corrected;
};
export default exports = {
    awReportTableServiceRenderFunction,
    callRepGetSearchCriteria,
    callRepGetProviderName,
    callRepGetCategories,
    overWriteColumns,
    saveDisplyColumns,
    getReportData,
    processAndUpdateSearchCriteria,
    loadColumns
};
