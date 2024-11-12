// Copyright (c) 2021 Siemens

/**
 * JS Service defined to handle Configuration related method execution only.
 *
 * @module js/configureReportService
 */
import appCtxService from 'js/appCtxService';
import listBoxService from 'js/listBoxService';
import messagingService from 'js/messagingService';
import uwPropSrv from 'js/uwPropertyService';
import filterPanelUtils from 'js/filterPanelUtils';
import cmm from 'soa/kernel/clientMetaModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import reportsCommonService from 'js/reportsCommonService';

var exports = {};

var _selectedReportTab = null;

/**
 * @param  {any} data - The data
 */
export let populateReportsContext = function( data, i18nData, reportsContext ) {
    if( appCtxService.ctx.state.params.configure === 'false' ) { return; }
    let newreportsContext = { ...reportsContext };
    var _reportCtx = { ChartVisibility: { chart1Visible: false, chart2Visible: false, chart3Visible: false }, RuntimeInformation: {} };
    //check if ctx is set..
    var reportExtCtx = appCtxService.getCtx( 'ReportsContext.reportParameters' );
    if( reportExtCtx === undefined || newreportsContext.fontPropList === undefined ) {
        //Build a list of Color and Font properties.
        var colorList = [];
        colorList.push( i18nData.Black );
        colorList.push( i18nData.DarkGray );
        colorList.push( i18nData.Gray );
        colorList.push( i18nData.LightGray );
        colorList.push( i18nData.Blue );
        colorList.push( i18nData.LightBlue );
        colorList.push( i18nData.Orange );
        colorList.push( i18nData.Yellow );
        var fontList = [];
        fontList.push( i18nData.SegoeUI );
        fontList.push( i18nData.Arial );
        fontList.push( i18nData.ArialBlack );
        fontList.push( i18nData.CourierNew );
        fontList.push( i18nData.Helvetica );
        fontList.push( i18nData.HelveticaNeue );
        fontList.push( i18nData.Georgia );
        fontList.push( i18nData.LucidaSansUnicode );
        fontList.push( i18nData.Tahoma );
        fontList.push( i18nData.TimesNewRoman );
        fontList.push( i18nData.TrebuchetMS );
        fontList.push( i18nData.Verdana );
        var vmColorList = listBoxService.createListModelObjectsFromStrings( colorList );
        for( var index = 0; index < vmColorList.length; index++ ) {
            vmColorList[ index ].propInternalValue = data.colorInternalNameList[ index ];
        }
        _reportCtx.RuntimeInformation.ColorVmProps = vmColorList;
        var vmFontList = listBoxService.createListModelObjectsFromStrings( fontList );
        for( index = 0; index < vmFontList.length; index++ ) {
            vmFontList[ index ].propInternalValue = data.fontInternalNameList[ index ];
        }
        _reportCtx.RuntimeInformation.FontVmProps = vmFontList;
        var vmChartTypeList = [];
        vmChartTypeList.push( data.i18n.Column );
        vmChartTypeList.push( data.i18n.Line );
        vmChartTypeList.push( data.i18n.Pie );
        vmChartTypeList = listBoxService.createListModelObjectsFromStrings( vmChartTypeList );
        vmChartTypeList[ 0 ].propInternalValue = 'column';
        vmChartTypeList[ 1 ].propInternalValue = 'line';
        vmChartTypeList[ 2 ].propInternalValue = 'pie';
        _reportCtx.RuntimeInformation.ChartTypeVmProps = vmChartTypeList;
        _reportCtx.RuntimeInformation.ColumnWSOPros = exports.getWSOPreferenceProps( data );
        data.ReportParameters = _reportCtx;
        if( reportExtCtx !== undefined && reportExtCtx.ReportDefProps ) {
            _reportCtx.ReportDefProps = reportExtCtx.ReportDefProps;
            _reportCtx.ChartVisibility.chart1Visible = reportExtCtx.ReportDefProps.ReportChart1 !== undefined;
            _reportCtx.ChartVisibility.chart2Visible = reportExtCtx.ReportDefProps.ReportChart2 !== undefined;
            _reportCtx.ChartVisibility.chart3Visible = reportExtCtx.ReportDefProps.ReportChart3 !== undefined;
        }
        appCtxService.updatePartialCtx( 'ReportsContext.reportParameters', data.ReportParameters );

        let repCtxValues = {
            chartTypeList: vmChartTypeList,
            colorPropList: vmColorList,
            fontPropList: vmFontList,
            chartVisibility: _reportCtx.ChartVisibility,
            columnWsoProps:  _reportCtx.RuntimeInformation.ColumnWSOPros,
            activeView: reportsContext.activeView,
            rootClassObject: [],
            rootClassSampleObject: [],
            segments: [],
            segmentTree: []
        };
        newreportsContext = { ...repCtxValues };
    }
    return newreportsContext;
};

const getWSODataType = ( valueType ) => {
    if( valueType === '2' ) {
        return 'DATE';
    } else if( valueType === '5' ) {
        return 'DOUBLE';
    }
    return 'STRING';
};

export let getWSOPreferenceProps = function( data ) {
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
        _.forEach( commonList, function( currPropName ) {
            if( wsoType !== null && wsoType.propertyDescriptorsMap[ currPropName ] ) {
                wsoProps.push( wsoType.propertyDescriptorsMap[ currPropName ].displayName );
                wsoPropInterName.push( 'WorkspaceObject.' + wsoType.propertyDescriptorsMap[ currPropName ].name );
                wsoPropDataType.push( getWSODataType( wsoType.propertyDescriptorsMap[ currPropName ].valueType ) );
            }
        } );
        wsoProps.push( data.i18n.objectStrColumnName );
        wsoPropInterName.push( 'WorkspaceObject.object_string' );
        wsoPropDataType.push( 'STRING' );
        var vmWsoPros = listBoxService.createListModelObjectsFromStrings( wsoProps );
        for( var index = 0; index < vmWsoPros.length; index++ ) {
            vmWsoPros[ index ].propInternalValue = wsoPropInterName[ index ];
            vmWsoPros[ index ].dataType = wsoPropDataType[ index ];
        }
        return vmWsoPros;
    }
};

const getDataType = ( typeFilter ) => {
    if( typeFilter === 'NumericFilter' ) {
        return 'DOUBLE';
    } else if( typeFilter === 'DateFilter' ) {
        return 'DATE';
    }
    return 'STRING';
};

/**
 * @returns {any} filtersList
 */
export let getChartByPropertiesList = function( searchContext ) {
    //var searchContext = appCtxService.getCtx( 'ReportsContext.searchIncontextInfo' );
    var filtersList = [];
    if( searchContext && searchContext.searchFilterCategories ) {
        var searchFilterCategories = searchContext.searchFilterCategories;
        for( var index = 0; index < searchFilterCategories.length; index++ ) {
            var filterProp = searchFilterCategories[ index ].displayName;
            filtersList.push( filterProp );
        }
        filtersList = listBoxService.createListModelObjectsFromStrings( filtersList );
        for( index = 0; index < searchFilterCategories.length; index++ ) {
            var filterCat = searchFilterCategories[ index ];
            filtersList[ index ].propInternalValue = filterCat.internalName;
            filtersList[ index ].dataType = getDataType( filterCat.type );
        }
    }
    return filtersList;
};

/**
 * @param {*} schema
 * @param {*} scope
 * @param {*} filter
 * @param {*} data
 * @param {*} reportsContext
 * @returns {any} filtersList
 */
export let populateFilterrColumnPropList = function( schema, scope, filter, data, reportsContext ) {
    var propsList = [];
    if( reportsContext && reportsContext.searchFilterColumnProps ) {
        propsList = reportsContext.searchFilterColumnProps;
        propsList.sort( ( data1, data2 ) => { return data1.propDisplayValue.localeCompare( data2.propDisplayValue ); } );
    } else if( reportsContext && reportsContext.SearchDataInfo && reportsContext.SearchDataInfo.SearchPerformed ) {
        propsList = getChartByPropertiesList( reportsContext );
    }
    if( propsList.length === 0 ) {
        messagingService.reportNotyMessage( data, data._internal.messages, 'showSearchNotRunColumnMessage' );
    } else if( filter && filter !== '' ) {
        propsList = propsList.filter( function( prop ) {
            return prop.propDisplayValue.toLowerCase().indexOf( filter.toLowerCase() ) >= 0;
        } );
    }
    return { filterColumnProps: propsList };
};

export let setReportElementPropertyValue = function( property, displayValue, value ) {
    uwPropSrv.setDisplayValue( property, displayValue );
    uwPropSrv.setDirty( property, true );
    if( value !== undefined ) {
        uwPropSrv.setValue( property, value );
    }
};


export let setupLayoutPanelProperties = function( data, titleText  ) {
    var reportsCtx = appCtxService.getCtx( 'ReportsContext.reportParameters' );
    let nwaddChart1 = { ...data.addChart1 };
    let nwremoveChart1 = { ...data.removeChart1 };
    let nwaddChart2 = { ...data.addChart2 };
    let nwremoveChart2 = { ...data.removeChart2 };
    let nwaddChart3 = { ...data.addChart3 };
    let nwremoveChart3 = { ...data.removeChart3 };

    if( reportsCtx.ReportDefProps ) {
        var reportDefProps = JSON.parse( JSON.stringify( reportsCtx.ReportDefProps ) );
        var isThumbnailChartExist = false;

        for( var key in reportDefProps ) {
            if( key === 'ReportChart1' ) {
                nwaddChart1.dbValue = false;
                nwremoveChart1.dbValue = true;
            } else if( key === 'ReportChart2' ) {
                nwaddChart2.dbValue = false;
                nwremoveChart2.dbValue = true;
            } else if( key === 'ReportChart3' ) {
                nwaddChart3.dbValue = false;
                nwremoveChart3.dbValue = true;
            } else if( key === 'ReportTable1' ) {
                exports.setReportElementPropertyValue( data.tableColumnList, reportDefProps[ key ].ColumnPropName, reportDefProps[ key ].ColumnPropInternalName );
            } else if( key === 'ThumbnailChart' ) {
                const chartName = reportDefProps[ key ].ChartName;
                data.chart1Thumbnail.dbValue = chartName === reportsCommonService.getReportChart1();
                data.chart2Thumbnail.dbValue = chartName === reportsCommonService.getReportChart2();
                data.chart3Thumbnail.dbValue = chartName === reportsCommonService.getReportChart3();
                data.table1Thumbnail.dbValue = chartName === reportsCommonService.getReportTable1();
                isThumbnailChartExist = true;
            }
        }
        if( !isThumbnailChartExist ) {
            data.chart1Thumbnail.dbValue = true;
        }
        if( appCtxService.ctx.state.params.referenceId === 'edit' && appCtxService.ctx.ReportsContext.showPreview === false ) {
            eventBus.publish( 'ShowReportService.InitiateReportDisplay' );
        }
    }
    //set title text default value
    let nwTitleText;
    if( data.titleText.dbValue === '' ) {
        nwTitleText = { ...titleText };
        var stateCtx = appCtxService.getCtx( 'state' );
        nwTitleText.dbValue = stateCtx.params.title;
        nwTitleText.uiValue = stateCtx.params.title;
    }else{
        nwTitleText = { ...titleText };
    }
    return { titleText: nwTitleText, addChart1: nwaddChart1, removeChart1: nwremoveChart1, addChart2: nwaddChart2, removeChart2: nwremoveChart2,
        addChart3: nwaddChart3, removeChart3: nwremoveChart3 };
};

/**
 * Add a new chart section on Set Layout Panel
 * Additionally set properties.
 *
 * @param {*} data
 */
export let setLayoutAddNewChart = function( data ) {
    if( data.addChart1.dbValue ) {
        eventBus.publish( 'configureReport.addChart1' );
    } else if( data.addChart2.dbValue ) {
        eventBus.publish( 'configureReport.addChart2' );
    } else if( data.addChart3.dbValue ) {
        eventBus.publish( 'configureReport.addChart3' );
    }
};

export let getTitleElement = function( data ) {
    return {
        TitleText: data.titleText.dbValue,
        TitleColor: data.titleColor.dbValue,
        TitleDispColor: data.titleColor.displayValues[ 0 ],
        TitleFont: data.titleFont.dbValue,
        TitleDispFont: data.titleFont.displayValues[ 0 ]
    };
};

export let checkIfTitleNeedsUpdate = function( reportsCtx, data, UpdatedLayoutElement ) {
    var title = reportsCtx.reportParameters.ReportDefProps.ReportTitle;
    if( title && data.titleText.dbValue === '' ) {
        // Title is removed
        delete reportsCtx.reportParameters.ReportDefProps.ReportTitle;
        UpdatedLayoutElement.ElementToRemove.push( 'ReportTitle' );
    } else if( title && ( title.TitleText !== data.titleText.dbValue || title.TitleColor !== data.titleColor.dbValue || title.TitleFont !== data.titleFont.dbValue ) ) {
        // Title is updated
        UpdatedLayoutElement.ElementToUpdate.push( 'ReportTitle' );
        reportsCtx.reportParameters.ReportDefProps.ReportTitle = exports.getTitleElement( data );
    } else if( title === undefined && data.titleText.dbValue !== undefined && data.titleText.dbValue !== '' ) {
        //Title is newly added
        UpdatedLayoutElement.ElementToUpdate.push( 'ReportTitle' );
        reportsCtx.reportParameters.ReportDefProps.ReportTitle = exports.getTitleElement( data );
    }
};

var getChartElement = function( chartTitle, chartType, chartByProperty ) {
    return {
        ChartTitle: chartTitle.dbValue,
        ChartType: chartType.uiValue,
        ChartTpIntName: chartType.dbValue,
        ChartPropName: chartByProperty.uiValue,
        ChartPropInternalName: chartByProperty.dbValue
    };
};

//<REVISIT> work on chart visibility, to avoid this processing
var isGivenChartVisibile = function( reportsConfigState, chartId ) {
    if( chartId === 'ReportChart1' ) {
        return reportsConfigState.chartVisibility.chart1Visible;
    } else if( chartId === 'ReportChart2' ) {
        return reportsConfigState.chartVisibility.chart2Visible;
    } else if( chartId === 'ReportChart3' ) {
        return reportsConfigState.chartVisibility.chart3Visible;
    }
};

var checkIfChartNeedsUpdate = function( reportsConfigState, reportsCtx, chartId, chartTitle, chartType, chartByProperty, UpdatedLayoutElement ) {
    var chart = reportsCtx.reportParameters.ReportDefProps[chartId];
    var newChartObj = null;
    if( chart && chartByProperty.uiValue.length === 0 ) {
        //Chart3 mandatory property is removed.
        delete reportsCtx.reportParameters.ReportDefProps[chartId];
        UpdatedLayoutElement.ElementToRemove.push( chartId );
    } else if( chart && ( chart.ChartTitle !== chartTitle.dbValue || chart.ChartType !== chartType.uiValue ||
            JSON.stringify( chartByProperty.uiValue ) !== JSON.stringify( chart.ChartPropName ) ) ) {
        //Chart3 is updated
        newChartObj = JSON.parse( JSON.stringify( getChartElement( chartTitle, chartType, chartByProperty ) ) );
    } else if( chart === undefined && isGivenChartVisibile( reportsConfigState, chartId ) && chartByProperty.dbValue.length !== 0 ) {
        newChartObj = JSON.parse( JSON.stringify( getChartElement( chartTitle, chartType, chartByProperty ) ) );
    }
    if( newChartObj !== null ) {
        UpdatedLayoutElement.ElementToUpdate.push( chartId );
        reportsCtx.reportParameters.ReportDefProps[chartId] = newChartObj;
    }
};

const getDataTypeList = ( filterProps, tableColumnList )=> {
    var typeList = [];
    _.forEach( tableColumnList.displayValues, ( value )=> {
        _.forEach( filterProps, ( filter )=> {
            if( filter.propDisplayValue === value ) {
                typeList.push( filter.dataType );
            }
        } );
    } );
    return typeList;
};

export let getTable1Element = function( data ) {
    return {
        ColumnDataType: getDataTypeList( data.filterColumnProps, data.tableColumnList ),
        ColumnPropInternalName: data.tableColumnList.dbValue,
        ColumnPropName: data.tableColumnList.displayValues
    };
};

export let checkIfTable1NeedsUpdate = function( reportsCtx, data, UpdatedLayoutElement ) {
    var table1 = reportsCtx.reportParameters.ReportDefProps.ReportTable1;
    var newTableObj = null;
    if( table1 && data.tableColumnList.dbValue.length === 0 ) {
        //Table1 mandatory property is removed.
        delete reportsCtx.reportParameters.ReportDefProps.ReportTable1;
        UpdatedLayoutElement.ElementToRemove.push( 'ReportTable1' );
    } else if( table1 && JSON.stringify( table1.ColumnPropName ) !== JSON.stringify( data.tableColumnList.displayValues ) ) {
        //Table1 is updated
        newTableObj = JSON.parse( JSON.stringify( exports.getTable1Element( data ) ) );
    } else if( table1 === undefined && data.tableColumnList.dbValue.length !== 0 ) {
        newTableObj = JSON.parse( JSON.stringify( exports.getTable1Element( data ) ) );
    }

    if( newTableObj !== null ) {
        UpdatedLayoutElement.ElementToUpdate.push( 'ReportTable1' );
        reportsCtx.reportParameters.ReportDefProps.ReportTable1 = newTableObj;
    }
};

var getNumericFilterValue = function( filter, filterSelVal ) {
    if( filterSelVal.indexOf( 'NumericRange' ) > 0 ) {
        var range = filterSelVal.split( '_TO_' );
        return {
            searchFilterType: filter.type,
            stringValue: '',
            startNumericValue: Number( range[ 0 ].substring( range[ 0 ].lastIndexOf( '_' ) + 1 ) ),
            endNumericValue: Number( range[ 1 ] ),
            startEndRange: 'NumericRange'
        };
    }
    return {
        searchFilterType: filter.type,
        stringValue: filterSelVal.substring( filterSelVal.lastIndexOf( '_' ) + 1 ),
        startNumericValue: Number( filterSelVal.substring( filterSelVal.lastIndexOf( '_' ) + 1 ) ),
        endNumericValue: Number( filterSelVal.substring( filterSelVal.lastIndexOf( '_' ) + 1 ) )
    };
};

var geDateFilterValue = function( filter, filterSelVal ) {
    var range = filterSelVal.split( '_TO_' );
    return {
        searchFilterType: filter.type,
        stringValue: '',
        startDateValue:  range[ 0 ].substring( range[ 0 ].lastIndexOf( '_' ) + 1 ),
        endDateValue:  range[ 1 ]
    };
};

export let updateReportSearchInfo = function( reportsCtx, searchState ) {
    var searchInContext = appCtxService.getCtx( 'ReportsContext.searchIncontextInfo' );
    if( searchState ) {
        var ReportSearchInfo = {};

        //ReportSearchInfo.SearchCriteria = getSearchCriteria( reportsCtx );
        ReportSearchInfo.SearchCriteria = searchState.criteria.searchString;

        var activeFilterMap = {};
        if( searchState.appliedFilters ) {
            searchState.appliedFilters.forEach( filter => {
                var filterCategory = filter.name;
                var compiledfilters = [];
                filter.values.forEach( filterSelVal => {
                    var filterVals = {};
                    if( filter.type === 'NumericFilter' ) {
                        filterVals = getNumericFilterValue( filter, filterSelVal );
                    } else if( filter.type === 'DateFilter' ) {
                        filterVals = geDateFilterValue( filter, filterSelVal );
                    } else {
                        filterVals.searchFilterType = filter.type;
                        filterVals.stringValue = filterSelVal;
                    }
                    compiledfilters.push( filterVals );
                } );
                if( compiledfilters.length > 0 ) { activeFilterMap[ filterCategory ] = compiledfilters; }
            } );
        }
        ReportSearchInfo.activeFilterMap = activeFilterMap;
        reportsCtx.reportParameters.ReportDefProps.ReportSearchInfo = ReportSearchInfo;
        reportsCtx.translatedSearchCriteria = searchState.additionalSearchInfoMap?.translatedSearchCriteriaForPropertySpecificSearch;
    }
};

var getItemReportClassParameters = function( reportParams ) {
    return {
        rootClassUid: reportParams.rootClassObject[0].uid,
        rootSampleUid: reportParams.rootClassSampleObject[0].uid
    };
};

/**
 *  Store Segment information.
 *
 * @param {*} data  -
 * @param {*} existSegment -
 * @returns {*} segement parameters
 */
var getItemReportSegmentTreeParams = function( data, existSegment ) {
    var treeSegment = data.segmentTree[ 0 ].children[ 0 ];
    var segmentParams = [];
    for( var i = 0; i < data.segments.length; i++ ) {
        var segment = data.segments[ i ];
        var relRefType = reportsCommonService.getRelationTraversalType( segment, existSegment );
        segmentParams.push( {
            TreeVal: treeSegment.label,
            Direction: segment.props.fnd0Direction.dbValue,
            Destination: segment.props.fnd0DestinationType.dbValue,
            RelOrRef: segment.props.fnd0RelationOrReference.dbValue,
            Source: segment.props.fnd0SourceType.dbValue,
            RelRefType: relRefType
        } );
        treeSegment = treeSegment.children[ 0 ];
    }
    return segmentParams;
};

/**
 * Function to set report ctx parameters.
 *
 * @param  {any} data - The data
 */
export let setupReportxContext = function( data, subPanelCtx ) {
    var ReportDefProps = {};
    var UpdatedLayoutElement = {
        ElementToRemove: [],
        ElementToUpdate: []
    };

    const searchState = subPanelCtx.searchState;
    const reportsConfigState = subPanelCtx.reportsContext.value;

    var reportsCtx = appCtxService.getCtx( 'ReportsContext' );

    if( subPanelCtx.searchState.totalFound === 0 ) {
        messagingService.reportNotyMessage( data, data._internal.messages, 'previewFailedNoObjectMessage' );
        return;
    }

    if( reportsCtx.reportParameters.ReportDefProps === undefined ) {
        //Setup Context for initial Report Preview..
        //Report Title Properties.
        if( data.titleText.dbValue !== undefined && data.titleText.dbValue !== '' ) {
            ReportDefProps.ReportTitle = exports.getTitleElement( data );
        }
        //Report Charts Properties
        if( reportsConfigState.chartVisibility.chart1Visible && data.chart1ByProperty.dbValue.length !== 0 ) {
            ReportDefProps.ReportChart1 = getChartElement( data.chart1Title, data.chart1Type, data.chart1ByProperty );
        }

        if( reportsConfigState.chartVisibility.chart2Visible && data.chart2ByProperty.dbValue.length !== 0 ) {
            ReportDefProps.ReportChart2 = getChartElement( data.chart2Title, data.chart2Type, data.chart2ByProperty );
        }

        if( reportsConfigState.chartVisibility.chart3Visible && data.chart3ByProperty.dbValue.length !== 0 ) {
            ReportDefProps.ReportChart3 = getChartElement( data.chart3Title, data.chart3Type, data.chart3ByProperty );
        }

        // Report Tables..
        if( data.tableColumnList.dbValue.length !== 0 ) {
            ReportDefProps.ReportTable1 = JSON.parse( JSON.stringify( exports.getTable1Element( data ) ) );
        }

        if( reportsConfigState.ThumbnailChart !== undefined ) {
            ReportDefProps.ThumbnailChart = reportsConfigState.ThumbnailChart;
        }

        if( reportsConfigState.rootClassObject && reportsConfigState.rootClassObject.length > 0 && reportsConfigState.rootClassSampleObject && reportsConfigState.rootClassSampleObject.length > 0 ) {
            ReportDefProps.ReportClassParameters = getItemReportClassParameters( reportsConfigState );
        }

        if( reportsConfigState.segments && reportsConfigState.segments.length > 0 ) {
            ReportDefProps.ReportSegmentParams = getItemReportSegmentTreeParams( reportsConfigState, null );
        }

        reportsCtx.reportParameters.ReportDefProps = ReportDefProps;
    } else {
        //Its an update into layout panel, identify modified element
        exports.checkIfTitleNeedsUpdate( reportsCtx, data, UpdatedLayoutElement );

        //Check if chart1 is updated.
        checkIfChartNeedsUpdate( reportsConfigState, reportsCtx, 'ReportChart1', data.chart1Title, data.chart1Type, data.chart1ByProperty, UpdatedLayoutElement );

        //Check if chart2 is updated
        checkIfChartNeedsUpdate( reportsConfigState, reportsCtx, 'ReportChart2', data.chart2Title, data.chart2Type, data.chart2ByProperty, UpdatedLayoutElement );

        //Check if chart3 is updated
        checkIfChartNeedsUpdate( reportsConfigState, reportsCtx, 'ReportChart3', data.chart3Title, data.chart3Type, data.chart3ByProperty, UpdatedLayoutElement );

        //Check if Table is updated
        exports.checkIfTable1NeedsUpdate( reportsCtx, data, UpdatedLayoutElement );

        reportsCtx.reportParameters.UpdatedLayoutElement = UpdatedLayoutElement;
        if( reportsConfigState.ThumbnailChart !== undefined ) {
            reportsCtx.reportParameters.ReportDefProps.ThumbnailChart = reportsConfigState.ThumbnailChart;
        }

        if( reportsConfigState.rootClassObject && reportsConfigState.rootClassObject.length > 0 && reportsConfigState.rootClassSampleObject && reportsConfigState.rootClassSampleObject.length > 0 ) {
            reportsCtx.reportParameters.ReportDefProps.ReportClassParameters = getItemReportClassParameters( reportsConfigState );
        }

        if( reportsConfigState.segments && reportsConfigState.segments.length > 0 ) {
            reportsCtx.reportParameters.ReportDefProps.ReportSegmentParams = getItemReportSegmentTreeParams( reportsConfigState, reportsCtx.reportParameters );
        }
    }

    // Add Search Parameters....
    exports.updateReportSearchInfo( reportsCtx, searchState );

    //Update totalFound-
    reportsCtx.reportParameters.totalFound = searchState.totalFound;

    //Finally Update then in Ctx
    appCtxService.updatePartialCtx( 'ReportsContext.reportParameters', reportsCtx.reportParameters );

    //<REVISIT> This needs revisit..

    var searchInfo = {};
    searchInfo.saveSearchFilterMap = searchState.appliedFilters;
    searchInfo.searchFilterCategories = searchState.categories ? searchState.categories.value :  [];
    //<TODO> need rework
    searchInfo.searchFilterMap = searchState.searchFilterMap ?  searchState.searchFilterMap.value ? searchState.searchFilterMap.value : searchState.searchFilterMap : [];
    appCtxService.updatePartialCtx( 'ReportsContext.searchIncontextInfo', searchInfo );

    //ReportsContext set now preview can be rendered/updated.
    eventBus.publish( 'ConfigureReportPanel.showReportPreview' );
};

/* *
 *
 * Get parameters for ReportDefinition properties.
 *
 * @param  {any} data - Data
 *
 */
export let getReportParameterAndValues = function( data, subPanelCtx ) {
    var vecNameVal = [];

    if( data.totalFound === 0 ) {
        messagingService.reportNotyMessage( data, data._internal.messages, 'saveFailedNoObjectMessage' );
        return vecNameVal;
    }

    //Ensure Preview is updated before going to Save the report.
    exports.setupReportxContext( data, subPanelCtx );

    var reportsDefProps = appCtxService.getCtx( 'ReportsContext.reportParameters.ReportDefProps' );
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

            if( appCtxService.ctx.ReportsContext.translatedSearchCriteria && appCtxService.ctx.ReportsContext.translatedSearchCriteria.length > 0 ) {
                _.forEach( appCtxService.ctx.ReportsContext.translatedSearchCriteria, function( value ) {
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
        } else if( key === 'ReportChart1' || key === 'ReportChart2' || key === 'ReportChart3' ) {
            var newChartObj1 = JSON.parse( JSON.stringify( reportsDefProps[ key ] ) );

            var chrtIntProps = JSON.stringify( newChartObj1.ChartPropInternalName );
            //now remove chart props
            delete newChartObj1.ChartPropInternalName;
            var remainChartStr = JSON.stringify( newChartObj1 );
            params.push( key + '_0' );
            paramValues.push( remainChartStr );

            params.push( key + '_1' );
            paramValues.push( chrtIntProps );
        } else if( key === 'ThumbnailChart' ) {
            params.push( key );
            paramValues.push( reportsDefProps[ key ].ChartName );
        } else if( key === 'ReportSegmentParams' ) {
            counter = 0;
            _.forEach( reportsDefProps[ key ], function( value ) {
                params.push( 'ReportSegment' + ( 1 + counter ) );
                paramValues.push( JSON.stringify( value ) );
                counter++;
            } );
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

    if( appCtxService.ctx.state.params.reportType === '1' ) {
        // var selectedRoot = appCtxService.getCtx( 'ReportsContext.reportParameters.rootSampleObjectSelected' );
        // var rootType = selectedRoot ? selectedRoot.type : '';
        var rootType = subPanelCtx.reportsContext.rootClassSampleObject[0].type;
        vecNameVal.push( {
            name: 'rd_class',
            values: [ rootType ]
        } );

        vecNameVal.push( {
            name: 'fnd0IsClassOnly',
            values: [ 'true' ]
        } );
    }

    return vecNameVal;
};

export let getObjectTypeList = function( searchContext ) {
    //var searchContext = appCtxService.getCtx( 'ReportsContext.searchIncontextInfo' );
    var objectTypes = [];
    if( searchContext && searchContext.searchFilterMap ) {
        if( searchContext.searchResultFilters && searchContext.searchResultFilters.length > 1 ) {
            searchContext.searchResultFilters.forEach( resultFilter => {
                if( resultFilter.searchResultCategoryInternalName === 'WorkspaceObject.object_type' ) {
                    resultFilter.filterValues.forEach( filter => {
                        objectTypes.push( filter.internalName );
                    } );
                }
            } );
        }
        if( objectTypes.length === 0 ) {
            var typeFilters = searchContext.searchFilterMap[ 'WorkspaceObject.object_type' ];
            if( typeFilters !== undefined && typeFilters.length > 0 ) {
                typeFilters.forEach( filter => {
                    objectTypes.push( filter.stringValue );
                } );
            }
        }
    }
    return objectTypes;
};

export let getObjectPropertyListFromPreference = function( ) {
    var prefObjPropList = [];
    if( 'preferences' in appCtxService.ctx && 'REPORT_AW_ObjectType_Properties' in appCtxService.ctx.preferences ) {
        prefObjPropList = appCtxService.ctx.preferences.REPORT_AW_ObjectType_Properties;
    }

    var prefObjProps = {};
    _.forEach( prefObjPropList, function( objPropStr ) {
        var objPropStrSplit = objPropStr.split( ':' );
        //TODO remove {} from prop list, need to change once server CP is modified.
        var propList = objPropStrSplit[ 1 ].replace( '{', '' ).replace( '}', '' );
        prefObjProps[ objPropStrSplit[ 0 ] ] = propList.split( ',' );
    } );
    return prefObjProps;
};

export let getVMObjectPropertyListFromPreference = function( searchState ) {
    //Object types returned in search
    var objTypes = exports.getObjectTypeList( searchState );

    //Now get the prop names from Report preferences...
    var prefObjProps = exports.getObjectPropertyListFromPreference(  );

    var allObjProps = [];
    if( objTypes.length > 0 && prefObjProps ) {
        for( var key in prefObjProps ) {
            //Check if ObjectType is specified in preferences.
            if( _.includes( objTypes, key ) ) {
                //Get cached type value
                var propList = prefObjProps[ key ];
                var objType = cmm.getType( key );

                var objProps = [];
                var objPropInterName = [];
                //Get property display and internal name..
                _.forEach( propList, function( currPropName ) {
                    if( objType !== null && objType.propertyDescriptorsMap[ currPropName ] ) {
                        objProps.push( objType.propertyDescriptorsMap[ currPropName ].displayName );
                        objPropInterName.push( key + '.' + currPropName );
                    }
                } );
                if( objProps.length > 0 ) {
                    //Create VM props
                    var vmObjPros = listBoxService.createListModelObjectsFromStrings( objProps );
                    for( var index = 0; index < vmObjPros.length; index++ ) {
                        vmObjPros[ index ].propInternalValue = objPropInterName[ index ];
                    }
                    //get
                    allObjProps.push.apply( allObjProps, vmObjPros );
                }
            }
        }
    }
    return allObjProps;
};

export let getFileredWsoProps = function( data, wsoProps, serchFiltrProps ) {
    var filteredWsoProp = [];
    if( wsoProps && wsoProps.length === 0 ) {
        wsoProps = exports.getWSOPreferenceProps( data );
    }
    if( wsoProps.length > 0 && serchFiltrProps.length > 0 ) {
        wsoProps.forEach( function( wsoProp ) {
            var propFound = false;
            serchFiltrProps.forEach( function( filtrProp ) {
                if( filtrProp.propDisplayValue === wsoProp.propDisplayValue ) {
                    propFound = true;
                }
            } );
            if( propFound ) {
                filteredWsoProp.push( wsoProp );
            }
        } );

        filteredWsoProp.forEach( function( propToRemove ) {
            wsoProps.splice( wsoProps.indexOf( propToRemove ), 1 );
        } );
        filteredWsoProp = wsoProps;
    }
    return filteredWsoProp;
};

export let updateReportsCtxForFilters = function( subPanelContext, data ) {
    var nwReportsState = subPanelContext.reportsContext.getValue();
    //TODO:need to handle this condns
    if( appCtxService.ctx.state.params.configure === 'true' ) {
        const searchState = data.atomicData.searchState ? data.atomicData.searchState : subPanelContext.searchState;
        const reportCtx = subPanelContext.reportsContext;
        var reportsCtxRtInfo = nwReportsState.reportParameters.RuntimeInformation;

        //process preference 'REPORT_AW_ObjectType_Properties' values and object types found
        //It should generate a common list of VM properties.
        var allObjPropsFromPref = exports.getVMObjectPropertyListFromPreference( searchState );
        var chartByFilterList = exports.getChartByPropertiesList( searchState );
        var finalFilterList = [];
        finalFilterList.push.apply( finalFilterList, chartByFilterList );
        if( reportCtx.columnWsoProps ) {
            var filteredWsoProps = exports.getFileredWsoProps( data, reportCtx.columnWsoProps, chartByFilterList );
            //TODO Temporary change to use Columns in Item report.
            if( appCtxService.ctx.state.params.reportType === '4' ) {
                finalFilterList.push.apply( finalFilterList, filteredWsoProps );
            } else {
                finalFilterList.push.apply( finalFilterList, reportCtx.columnWsoProps );
            }
        }
        if( allObjPropsFromPref.length > 0 ) {
            finalFilterList.push.apply( finalFilterList, allObjPropsFromPref );
        }

        finalFilterList = _.uniqBy( finalFilterList, 'propInternalValue' );
        reportsCtxRtInfo.searchFilterColumnProps = finalFilterList;
        reportsCtxRtInfo.searchFilterChartProps = chartByFilterList;
        data.filterProps = chartByFilterList;

        //update reportsContext state with new prop values..
        nwReportsState.searchFilterColumnProps = finalFilterList;
        nwReportsState.searchFilterChartProps = chartByFilterList;
        nwReportsState.reportParameters.RuntimeInformation = reportsCtxRtInfo;
        reportCtx.update( nwReportsState );


        // appCtxService.updatePartialCtx( 'ReportsContext.reportParameters.RuntimeInformation', reportsCtxRtInfo );

        var isSearchAndLayoutConfigured = appCtxService.ctx.ReportsContext?.reportParameters?.ReportDefProps;

        if( appCtxService.ctx.state.params.referenceId === 'edit' && appCtxService.ctx.ReportsContext.showPreview === false && isSearchAndLayoutConfigured !== undefined ) {
            var tab = {
                tabKey: 'setLayout'
            };
            eventBus.publish( 'awTab.setSelected', tab );
        }
    }

    if( nwReportsState.initRepDisp ) {
        //<REVISIT> This needs revisit..
        const searchState = data.atomicData.searchState ? data.atomicData.searchState : subPanelContext.searchState;
        var searchInfo = {};
        searchInfo.saveSearchFilterMap = searchState.appliedFilters;
        searchInfo.searchFilterCategories = searchState.categories;
        searchInfo.searchFilterMap = searchState.searchFilterMap;
        // appCtxService.updatePartialCtx( 'ReportsContext.searchIncontextInfo', searchInfo );
        // appCtxService.updatePartialCtx( 'ReportsContext.reportParameters.totalFound', searchState.totalFound );
        nwReportsState.searchIncontextInfo = searchInfo;
        nwReportsState.reportParameters.totalFound = searchState.totalFound;
        subPanelContext.reportsContext.update( nwReportsState );

        eventBus.publish( 'showReportImage.updatePrviewForFilterUpdate' );
    }

    //Need to store Results tab object. So that it can be set as a selectedTab
    //When user navigated back to Search Data from Set Layout
    //if( data.selectedTab && data.selectedTab.tabKey === 'results' ) { _selectedReportTab = data.selectedTab; }
};

/**
 * Multiple scenarios handled in this function. Called when user selected Checkbox for setting particular chart as thumbnail.
 * When Chart is selected, other check-boxes are de-selected.
 * When user tries to manually de-select any check-box, it is reset to selected.
 * @param {*} selectedChart - Chart as thumbnail
 * @param {*} data  - Data
 */
export let setChartThumbnailValue = function( chartProp, selectedChart, prop1, prop2, prop3, subPanelCtx ) {
    const reportCtx = subPanelCtx.reportsContext;
    let nwreportContext = { ...reportCtx.value };
    if( nwreportContext.ThumbnailChart === undefined ) {
        nwreportContext.ThumbnailChart = {};
    }

    let nwchartProp = { ...chartProp };
    let nwprop1 = { ...prop1 };
    let nwprop2 = { ...prop2 };
    let nwprop3 = { ...prop3 };

    if( chartProp.dbValue ) {
        nwreportContext.ThumbnailChart.ChartName = selectedChart;
        nwprop1.dbValue = false;
        nwprop2.dbValue = false;
        nwprop3.dbValue = false;
    } else if( !chartProp.dbValue ) {
        nwchartProp.dbValue = true;
    }

    reportCtx.update( nwreportContext );
    return{ chartProp: nwchartProp, prop1: nwprop1, prop2: nwprop2, prop3: nwprop3 };
};

export let initializeRepSearchState = function( searchState ) {
    //let newSearchState = subPanelContext.searchState ? subPanelContext.searchState.value : { ...searchState.value };
    let newSearchState = { ...searchState.value };

    // this code initializes the searchState for 'Search' Tab
    let searchContext = {
        showChartColorBars: false,
        bulkFilteringPreference: 'AWC_Discovery_Delayed_Filter_Apply',
        bulkFiltering: true,
        criteria: { forceThreshold: 'true' },
        provider: 'Awp0FullTextSearchProvider',
        sortType: 'Priority'
    };
    //let updatedSearchContext = searchStateHelperService.constructBaseSearchCriteria( searchContext );
    newSearchState = { ...searchContext };
    newSearchState.objectsGroupedByProperty = null;
    newSearchState.selectedFiltersString = '';
    newSearchState.activeFilterMap = {};
    newSearchState.sourceSearchFilterMap = {};
    newSearchState.autoApplyFilters = true;

    const reportsDefProps = appCtxService.getCtx( 'ReportsContext.reportParameters.ReportDefProps' );

    if( reportsDefProps && reportsDefProps.ReportSearchInfo !== undefined ) {
        newSearchState.criteria.searchString = reportsDefProps.ReportSearchInfo.SearchCriteria;
        newSearchState.activeFilterMap = reportsDefProps.ReportSearchInfo.activeFilterMap;
        newSearchState.appliedFilters = [];
        newSearchState.activeFilters = {};
        for( var key in reportsDefProps.ReportSearchInfo.activeFilterMap ) {
            let filters = reportsDefProps.ReportSearchInfo.activeFilterMap[ key ];
            let values = [];
            let type;
            filters.forEach( filter => {
                values.push( filter.stringValue );
                type = filter.searchFilterType;
            } );
            var actvFiltr = { name: key, type: type, values: values };
            newSearchState.appliedFilters.push( actvFiltr );
            newSearchState.activeFilters[key] = values;
        }
    }
    return newSearchState;
};

export default exports = {
    populateReportsContext,
    getWSOPreferenceProps,
    getChartByPropertiesList,
    populateFilterrColumnPropList,
    setReportElementPropertyValue,
    setupLayoutPanelProperties,
    getTitleElement,
    checkIfTitleNeedsUpdate,
    getTable1Element,
    checkIfTable1NeedsUpdate,
    updateReportSearchInfo,
    setupReportxContext,
    getReportParameterAndValues,
    getObjectTypeList,
    getObjectPropertyListFromPreference,
    getVMObjectPropertyListFromPreference,
    getFileredWsoProps,
    updateReportsCtxForFilters,
    setChartThumbnailValue,
    setLayoutAddNewChart,
    initializeRepSearchState
};
