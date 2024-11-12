// Copyright (c) 2022 Siemens

/**
 * JS Service defined to handle Show My Dashboard related method execution only.
 *
 * @module js/showMyDashboardService
 */
import appCtxService from 'js/appCtxService';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import soaService from 'soa/kernel/soaService';
import reportsCommSrvc from 'js/reportsCommonService';
import modelPropertySvc from 'js/modelPropertyService';
import viewModelService from 'js/viewModelObjectService';
import { initializeRepSearchState } from 'js/configureReportService';
import soa_kernel_propertyPolicyService from 'soa/kernel/propertyPolicyService';
import cdm from 'soa/kernel/clientDataModel';

var exports = {};
var _reportsList = null;
var _pageSize = 8;
var _totalLoaded = -1;
var _previous = 'previous';
var _next = 'next';
var _add = 'add';

export let getReportDefinitionSOAInput = function( data, reportIdInput = 'reportDefinitionId', subPanelContext ) {
    var repIdList = [];
    var preference = appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report;
    var preference_Name = reportsCommSrvc.getReportDashboardPrefName();
    if( subPanelContext && subPanelContext.preferenceName && appCtxService.ctx.preferences[ subPanelContext
        .preferenceName ] !== undefined ) {
        preference_Name = subPanelContext.preferenceName;
        preference = appCtxService.ctx.preferences[ preference_Name ];
    }
    if( 'preferences' in appCtxService.ctx && preference_Name in appCtxService.ctx.preferences ) {
        repIdList.push.apply( repIdList, preference );
    }

    //scenario for no report configured
    if( repIdList.length === 1 && repIdList[0].length === 0 ) {
        repIdList = [];
    }

    var soaInput = [];
    if( repIdList.length > 0 ) {
        repIdList.forEach( idVal => {
            var val = JSON.parse( idVal.substring( idVal.indexOf( ':' ) + 1, idVal.length ) );
            var inputStr = {};
            inputStr[reportIdInput] = val.ID;
            if( reportIdInput === 'reportID' ) {
                inputStr.reportUID = '';
                inputStr.reportSource = '';
            }
            soaInput.push( inputStr );
        } );
    } else{
        var inputStr = {};
        inputStr[reportIdInput] = 'RANDOME###$$$$';
        inputStr.reportUID = '';
        inputStr.reportSource = '';
        soaInput.push( inputStr );
    }
    reportsCommSrvc.setupReportPersistCtx( preference_Name );
    return soaInput;
};

export let getReportDefinitionValList = function( response, searchData ) {
    _reportsList = response.reportdefinitions.filter( function( rDef ) {
        var repDefObj = response.ServiceData.modelObjects[ rDef.reportdefinition.uid ];
        return repDefObj.props.rd_type.dbValues[ 0 ] !== '1';
    } ).map( function( rDef ) {
        return response.ServiceData.modelObjects[ rDef.reportdefinition.uid ];
    } );
    if( searchData ) {
        const newSearchData = searchData.getValue();
        newSearchData.totalFound = _reportsList.length;
        searchData.update( newSearchData );
    }
    return {
        reportdefinitions: _reportsList
    };
};

export let setupDashboardReportViewer = function( data ) {
    data.urlFrameSize = getFrameSize();
    $( 'aw-secondary-workarea' ).find( '.aw-jswidget-tabBar' ).addClass( 'aw-viewerjs-hideContent' );
};

var getFrameSize = function() {
    var areas = document.getElementsByTagName( 'aw-secondary-workarea' );
    if( areas.length > 0 ) {
        var totalHeight = areas[ 0 ].clientHeight - 23;
        var totalWidth = areas[ 0 ].clientWidth - 20;
    }
    return {
        height: totalHeight,
        width: totalWidth
    };
};

//Get index of report in preference  list
export let getPreferenceIndex = function( prefvalList, rd_id ) {
    for ( var j = 0; j < prefvalList.length; j++ ) {
        if ( prefvalList[j].startsWith( rd_id ) ) {
            return j;
        }
    }
    return -1;
};

//Get preference values according to prefernce name provided
let getReportsListFromPreference = ( preferenceName )=> {
    var prefValList; var  currentPrefName;
    if( preferenceName ) {
        prefValList = appCtxService.ctx.preferences[ preferenceName ];
        currentPrefName = preferenceName;
    } else {
        prefValList = appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report;
        currentPrefName = reportsCommSrvc.getReportDashboardPrefName();
    }
    return { currentPrefValList: prefValList, preference_Name: currentPrefName };
};

//Preparing inputdata for soa of updating preferences values
let inputDataForPreferenceUpdateSoa = ( currentPrefValList, preference_Name )=> {
    var setLocation = [];
    setLocation.push( {
        location: {
            object: '',
            location: 'User'
        },
        preferenceInputs: {
            preferenceName: preference_Name,
            values: currentPrefValList.length === 0 ? null : currentPrefValList
        }
    } );
    return setLocation;
};

//Calling SOA to update prefernce value
let callSoaForPreferenceUpdate = ( preference_Name, currentPrefValList, crntMyDashboardCtxList, state, selectedReportDef, index, operation, showAddToDashboardCommand )=> {
    var inputData = {
        setPreferenceIn: inputDataForPreferenceUpdateSoa( currentPrefValList, preference_Name )
    };
    soaService.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'setPreferencesAtLocations', inputData ).then(
        function( response ) {
            if( showAddToDashboardCommand !== null ) {
                appCtxService.updatePartialCtx( 'showAddToDashboardCommand', showAddToDashboardCommand );
            }
            appCtxService.updatePartialCtx( 'preferences.' + preference_Name, currentPrefValList.length === 0 ? null : currentPrefValList );
            crntMyDashboardCtxList && appCtxService.updatePartialCtx( reportsCommSrvc.getCtxMyDashboardList(), crntMyDashboardCtxList );
            if( state && selectedReportDef ) {
                var newSearchState = state.getValue();
                newSearchState.reportDashboard = { reportDef: selectedReportDef, operation: operation, tileIndex: index };
                state.update( newSearchState );
            }else if( selectedReportDef ) {
                eventBus.publish( 'reportDashboard.update', { reportDef: selectedReportDef, operation: operation, tileIndex: index } );
            }
        } );
};

//TODO Refactor
export let removeSelectedDashboardReport = function( selectedReportDef, preferenceName, state ) {
    var { currentPrefValList, preference_Name } = getReportsListFromPreference( preferenceName );
    var chkPrefValue = selectedReportDef.props.rd_type.dbValues[ 0 ] === '1' ? selectedReportDef.props.rd_id.dbValues[ 0 ] + selectedReportDef.props.rd_sourceObject.dbValue : selectedReportDef.props
        .rd_id.dbValues[ 0 ];
    var index = getPreferenceIndex( currentPrefValList, chkPrefValue );
    currentPrefValList.splice( index, 1 );
    var crntList = appCtxService.getCtx( reportsCommSrvc.getCtxMyDashboardList() );
    crntList?.splice( index, 1 );
    callSoaForPreferenceUpdate( preference_Name, currentPrefValList, crntList, state, selectedReportDef, index, null, true );
};

//TODO Refactor
export let addSelectedReportToDashboard = function( selectedReportDef, preferenceName, sourceUid, state, reportJson ) {
    var { currentPrefValList, preference_Name } = getReportsListFromPreference( preferenceName );
    if( currentPrefValList === null || currentPrefValList.length === 1 && currentPrefValList[0].length === 0  ) {
        currentPrefValList = [];
    }
    var reportIdVal = selectedReportDef !== null ? selectedReportDef.props.rd_id.dbValues[0] : null;
    if( selectedReportDef?.props?.rd_source?.dbValues[0] === 'Active Workspace' && !sourceUid ) {
        currentPrefValList[currentPrefValList.length] = reportIdVal + ':{"ID":"' + reportIdVal + '"}';
    } else if( selectedReportDef?.props?.rd_source?.dbValues[0] === 'Active Workspace' && sourceUid ) {
        var prefKey = reportIdVal + sourceUid;
        currentPrefValList[ currentPrefValList.length ] = prefKey + ':{"ID":"' + reportIdVal + '",' + '"sourceObjUid":"' + sourceUid + '"}';
        //update id value for persist CTX..
        reportIdVal = prefKey;
    } else if( selectedReportDef?.props?.rd_source?.dbValues[0] === 'TcRA' ) {
        currentPrefValList[currentPrefValList.length] = reportJson;
    }
    var crntList = appCtxService.getCtx( reportsCommSrvc.getCtxMyDashboardList() );
    crntList?.push( reportIdVal );
    callSoaForPreferenceUpdate( preference_Name, currentPrefValList, crntList, state, selectedReportDef, null, _add, false );
};

let swappingOfReports = ( momentTo, currentPrefValList, index ) => {
    if( momentTo === _previous ) {
        let element = currentPrefValList[index - 1];
        currentPrefValList[index - 1] = currentPrefValList[index];
        currentPrefValList[index] = element;
    } else {
        let element = currentPrefValList[index + 1];
        currentPrefValList[index + 1] = currentPrefValList[index];
        currentPrefValList[index] = element;
    }
    return currentPrefValList;
};

export let reportDashboardMove = ( selectedReport, preferenceName, searchState, momentTo )=> {
    var { currentPrefValList, preference_Name } = getReportsListFromPreference( preferenceName );
    var chkPrefValue = selectedReport.props.rd_type.dbValues[ 0 ] === '1' ? selectedReport.props.rd_id.dbValues[ 0 ] + selectedReport.props.rd_sourceObject.dbValue : selectedReport.props
        .rd_id.dbValues[ 0 ];
    var index = getPreferenceIndex( currentPrefValList, chkPrefValue );
    currentPrefValList = swappingOfReports( momentTo, currentPrefValList, index );
    var crntList = appCtxService.getCtx( reportsCommSrvc.getCtxMyDashboardList() );
    crntList = swappingOfReports( momentTo, crntList, index );
    callSoaForPreferenceUpdate( preference_Name, currentPrefValList, crntList, searchState, selectedReport, index, momentTo, null );
};

//################# MY DASHBOARD TILE VIEW METHODS ####################
/**
 *  fsd
 * @param {*} startIndex -
 * @returns {*} cursorObject
 */
var getCursorObject = function( startIndex ) {
    var totalFound = _reportsList.length;
    var mEndIndex = null;
    var mEndReached = null;

    if( startIndex === 0 ) {
        if( totalFound === _pageSize ) {
            mEndIndex = _pageSize;
            mEndReached = true;
        }
        if( totalFound > _pageSize ) {
            mEndIndex = _pageSize;
            mEndReached = false;
        } else {
            mEndIndex = totalFound;
            mEndReached = true;
        }
    } else {
        if( _pageSize + startIndex > totalFound ) {
            mEndIndex = totalFound;
            mEndReached = true;
        } else {
            mEndIndex = _pageSize + startIndex;
            mEndReached = false;
        }
    }
    return {
        endIndex: mEndIndex,
        endReached: mEndReached,
        startIndex: startIndex,
        startReached: true
    };
};

/**
 *  fsd
 * @param {*} startIndex -
 * @returns {*} rederingFlg
 */
var getRenderingFlg = function( startIndex ) {
    let renderingFlg = null;
    if( _pageSize + startIndex >= _reportsList.length ) {
        renderingFlg = false;
    } else {
        renderingFlg = true;
    }
    return renderingFlg;
};

var addSearchRecipeProps = function( reportDef, recipe, index ) {
    var props = [ 'reportChartObjects', 'translatedBaseCriteria', 'translatedFilterQueries', 'reportSearchRecipeExtraInfo' ];

    props.forEach( propName => {
        //set search receipe as a property value..
        var propAttrHolder = {
            displayName: propName,
            type: 'STRING',
            dbValue: recipe[ propName ]
        };
        var property = modelPropertySvc.createViewModelProperty( propAttrHolder );
        reportDef.props[propName] = property;
    } );
    reportDef.reportUid = reportDef.uid;
    if( reportDef.props.rd_type.dbValues[ 0 ] === '1' ) {
        const repIndex = parseInt( recipe.reportSearchRecipeExtraInfo.reportIndex );
        //get source uid value from preference and add it as a propValue
        // var prefValue = appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report[index];
        // var prefValJSON = JSON.parse( prefValue.substring( prefValue.indexOf( ':' ) + 1, prefValue.length ) );
        // var propAttrHolder = {
        //     displayName: 'rd_sourceObject',
        //     type: 'STRING',
        //     dbValue: prefValJSON.sourceObjUid
        // };
        // var property = modelPropertySvc.createViewModelProperty( propAttrHolder );
        // reportDef.props.rd_sourceObject = property;

        //var uidNew = reportDef.uid.substring( 0, 0 ) + '0' + reportDef.uid.substring( 0 + 1 );
        //reportDef.uid = uidNew;
        //s.substring(0, index) + 'x' + s.substring(index + 1);
        //var newReportDef = JSON.parse( JSON.stringify( reportDef ) );
        //reportDef = newReportDef;
        var modelObject = {};
        modelObject = viewModelService.constructViewModelObjectFromModelObject( null, '' );
        modelObject.uid = 'unstaffedUI' + recipe.reportSearchRecipeExtraInfo.reportIndex;

        modelObject.props = reportDef.props;
        modelObject.type = reportDef.type;
        modelObject.modeType = reportDef.modeType;
        // var uidNew = finalRepList[i].uid.substring( 0, 0 ) + i.toString() + finalRepList[i].uid.substring( 0 + 1 );
        // finalRepList[i].uid = uidNew;
        // //s.substring(0, index) + 'x' + s.substring(index + 1);
        // listWithIndex[ i ] = JSON.parse( JSON.stringify( finalRepList[ i ] ) );
        var prefValue = appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report[ repIndex ];
        var prefValJSON = JSON.parse( prefValue.substring( prefValue.indexOf( ':' ) + 1, prefValue.length ) );
        var propAttrHolder = {
            displayName: 'rd_sourceObject',
            type: 'STRING',
            dbValue: prefValJSON.sourceObjUid
        };
        var property = modelPropertySvc.createViewModelProperty( propAttrHolder );
        modelObject.props.rd_sourceObject = property;
        //listWithIndex.push( JSON.parse( JSON.stringify( modelObject ) ) );
        modelObject.reportUid = reportDef.reportUid;
        reportDef = JSON.parse( JSON.stringify( modelObject ) );
    }
    return reportDef;
};

var getReportDefinitions = function( response, searchData ) {
    var index = 0;
    _reportsList = response.reportSearchRecipeObjects.map( function( receipe ) {
        var reportDef = response.ServiceData.modelObjects[ receipe.reportObject.uid ];
        var propAttrHolder = {
            displayName: 'tileIndex',
            type: 'STRING',
            dbValue: index.toString()
        };
        var property = modelPropertySvc.createViewModelProperty( propAttrHolder );
        reportDef.props.tileIndex = property;
        index++;
        return addSearchRecipeProps( reportDef, receipe, index - 1 );
    } );
    if( searchData ) {
        const newSearchData = { ...searchData.value };
        newSearchData.totalFound = _reportsList.length;
        searchData.update( newSearchData );
    }
    return {
        reportdefinitions: _reportsList
    };
};

let getDeletedReportIDs = ( soaInputs, reportdefinitions )=> {
    try {
        let deletedReport = [];
        if( soaInputs.length > reportdefinitions.length ) {
            _.forEach( soaInputs, ( soaInput )=> {
                let report = _.find( reportdefinitions, ( reportdefinition ) => {
                    return soaInput.reportID === reportdefinition.props.rd_id.dbValues[0];
                } );
                if( !report ) {
                    deletedReport.push( soaInput.reportID );
                }
            } );
        }
        return deletedReport;
    } catch( err ) {
        console.log( 'Failure occurred in getDeletedReportIDs and error is ' + err );
    }
};

export let removeDeletedReportAndUpdate = ( response, preferenceName )=> {
    try {
        var deletedRepList = response.deletedRepList;
        if( deletedRepList?.length > 0 ) {
            var { currentPrefValList, preference_Name } = getReportsListFromPreference( preferenceName );
            var crntList = appCtxService.getCtx( reportsCommSrvc.getCtxMyDashboardList() );
            _.forEach( deletedRepList, deleteRep => {
                var index = getPreferenceIndex( currentPrefValList, deleteRep );
                currentPrefValList.splice( index, 1 );
                crntList?.splice( index, 1 );
            } );
            callSoaForPreferenceUpdate( preference_Name, currentPrefValList, crntList );
        }
        return deletedRepList;
    } catch( err ) {
        console.log( 'Failure occurred in removeDeletedReportAndUpdate and error is ' + err );
    }
};

/**
 * Main entry point for Rendering Report Tiles.
 * Performs the SOA call to get required ReportDefinition BO's.
 * For Sub-sequent scroll, next set of RD are returned.
 * @param {*} data - data
 * @param {*} startIndex - Scroll index value
 * @returns {*} List of ReportDefinition and cursor object.
 */
export let getReportDefinitionsForTileView = function( data, dashboardLastRefresh, startIndex, searchData, subPanelContext  ) {
    //Get dashboard update time..
    let nwdashboardLastRefresh = { ...dashboardLastRefresh };
    nwdashboardLastRefresh.uiValue = reportsCommSrvc.getReportUpdateTime( data );
    var policyId = soa_kernel_propertyPolicyService.register( {
        types: [ {
            name: 'ReportDefinition',
            properties: [ { name: 'rd_parameters' }, { name: 'rd_param_values' }, { name: 'owning_user' },
                { name: 'rd_name' }, { name: 'rd_type' }, { name: 'rd_class' }, { name: 'rd_source' }, { name: 'rd_id' }  ]
        } ]
    } );

    if( appCtxService.ctx.preferences.REPORT_AW_MyDashboard_PageSize ) {
        _pageSize = parseInt( appCtxService.ctx.preferences.REPORT_AW_MyDashboard_PageSize[0] );
    }
    console.log( 'New call with startIndex ' + startIndex );

    //Tile config ReportDefinition processing
    if( startIndex === 0 ) {
        ////get SOA input
        var soaInput = getReportDefinitionSOAInput( data, 'reportID', subPanelContext );

        return soaService.postUnchecked( 'Internal-Search-2020-12-SearchFolder', 'getTranslatedReportSearchRecipe', {
            reportDefinitionCriteria: soaInput
        } ).then(
            function( response ) {
                var repDefList = getReportDefinitions( response, searchData );
                var deletedRepList = getDeletedReportIDs( soaInput, repDefList.reportdefinitions );
                var finalRepList = repDefList.reportdefinitions.slice( 0, _pageSize );
                let showLastUpdateTime = subPanelContext.showLastUpdateTime !== undefined ? subPanelContext.showLastUpdateTime : true;
                appCtxService.updatePartialCtx( 'ReportsContext.SearchParameters', response.commonSearchParameters );
                _totalLoaded = finalRepList.length;
                soa_kernel_propertyPolicyService.unregister( policyId );
                return {
                    reportdefinitions: finalRepList,
                    cursor: getCursorObject( startIndex ),
                    refreshtime: nwdashboardLastRefresh,
                    showLastUpdateTm: showLastUpdateTime,
                    totalFound: _reportsList.length,
                    rendering: getRenderingFlg( startIndex ),
                    deletedRepList: deletedRepList
                };
            } );
    } else if( startIndex > 0 ) {
        startIndex = _totalLoaded;
        var tempRepList = _reportsList.slice( startIndex, startIndex + _pageSize );
        _totalLoaded += tempRepList.length;
        return {
            reportdefinitions: tempRepList,
            cursor: getCursorObject( startIndex ),
            refreshtime: nwdashboardLastRefresh,
            totalFound: _reportsList.length,
            rendering: getRenderingFlg( startIndex )
        };
    }
};

const findDataProviderIndex = ( vmos, rdName ) => {
    let tileIndex = -1;
    _.forEach( vmos, ( vmo, index )=>{
        vmo.props.rd_name.dbValues[0] === rdName ? tileIndex = index : '';
    } );
    return tileIndex;
};

/**
 * Updates the dataprovider after user removes a report from Dashboard
 * Instead of a whole reload of the page, only dataprovider is updated
 * @param {*} data - data
 * @param {*} reportId - ID of report to be removed
 * @param {*} searchData - to update number of reports on dashboard
 */
export let myDashboardUpdate = function( dataProviders, reportDefObj, operation, tileIndex, searchData ) {
    //TODO client refresh need to handle as this is not refreshing the UI
    if( reportDefObj ) {
        operation !== _add ? tileIndex = findDataProviderIndex( dataProviders.viewModelCollection.loadedVMObjects, reportDefObj.props.rd_name.dbValues[0] ) : '';
        if( operation === _add ) {
            _reportsList.push( reportDefObj );
            dataProviders.resetDataProvider();
        } else if( ( operation === _previous || operation === _next ) && ( tileIndex || tileIndex === 0 ) ) {
            swappingOfReports( operation, dataProviders.viewModelCollection.loadedVMObjects, tileIndex );
            swappingOfReports( operation, _reportsList, tileIndex );
            dataProviders.update( dataProviders.viewModelCollection.loadedVMObjects, dataProviders.viewModelCollection.loadedVMObjects.length );
        } else if( tileIndex || tileIndex === 0 ) {
            dataProviders.viewModelCollection.loadedVMObjects.splice( tileIndex, 1 );
            _reportsList.splice( tileIndex, 1 );
            _reportsList.length === 0 ? dataProviders.resetDataProvider() :
                dataProviders.update( dataProviders.viewModelCollection.loadedVMObjects, dataProviders.viewModelCollection.loadedVMObjects.length );
        }
        if( searchData ) {
            const newSearchData = searchData.getValue();
            newSearchData.totalFound = _reportsList.length;
            searchData.update( newSearchData );
        }
    }
};

//################# MY DASHBOARD TILE VIEW METHODS END #################

//################# EASILY ADD TO DASHBOARD METHODS #################

export let processSearchResults = ( response, searchString ) => {
    var searchResults = [];
    var reportDefinitions = JSON.parse( response.searchResultsJSON ).objects.map( function( rDef ) {
        return response.ServiceData.modelObjects[ rDef.uid ];
    } );
    reportDefinitions.forEach( reportdef => {
        var searchResult = {
            propDisplayValue: reportdef.props.rd_name.dbValues[0],
            propDisplayDescription: reportdef.props.rd_description.dbValues[0],
            propInternalValue: reportdef.props.rd_id.dbValues[0],
            reportType: reportdef.props.rd_type.dbValues[0],
            reportdefinition: reportdef
        };
        searchResults.push( searchResult );
    } );
    if( searchString && searchString !== '' ) {
        searchResults = searchResults.filter( function( prop ) {
            return prop.propDisplayValue.toLowerCase().indexOf( searchString.toLowerCase() ) >= 0;
        } );
    }
    var reportList = appCtxService.getCtx( reportsCommSrvc.getCtxMyDashboardList() );
    let i = 0;
    for( i = 0; i < searchResults.length; i++ ) {
        reportList.forEach( ( reportId )=> {
            if( searchResults.length > 0 && i < searchResults.length && reportId.startsWith( searchResults[i].propInternalValue ) && searchResults[i].reportType !== '1' ) {
                searchResults.splice( i, 1 );
            }
        } );
    }
    searchResults.sort( ( data1, data2 ) => { return data1.propDisplayValue.localeCompare( data2.propDisplayValue ); } );
    return searchResults;
};

export let addItemSelected = ( state, panelId, selected ) => {
    state.activeView = panelId;
    state.itemSource = selected;
    return state;
};

export let getselectedItemSource = ( repContext ) => {
    return repContext.itemSource;
};

export let updateDataProvider = ( dataProvider, selected, reportsList ) => {
    reportsList.dbValue = selected.propDisplayValue;
    reportsList.uiValue = selected.propDisplayValue;
    dataProvider.selectionModel.setSelection( selected );
    dataProvider.update( [ selected ], 1 );
    return reportsList;
};

export let initializeAndAddActiveFilters = ( searchState, rdClassName ) => {
    appCtxService.updatePartialCtx( 'selected', null );
    var newSearchState = initializeRepSearchState( searchState );
    if( rdClassName ) {
        var activeFilterMap = {
            'WorkspaceObject.object_type': [
                {
                    searchFilterType: 'StringFilter',
                    stringValue: rdClassName
                }
            ]
        };
        newSearchState.sourceSearchFilterMap = activeFilterMap;
        newSearchState.activeFilterMap = activeFilterMap;
        newSearchState.applyPresetTypeFilters = true;
    }
    searchState.update( newSearchState );
};

export let appendRdSourceAndReturnSelectedReportDef = ( selectedReportDef, sourceObjUid ) => {
    if ( sourceObjUid ) {
        var propAttrHolder = {
            displayName: 'rd_sourceObject',
            type: 'STRING',
            dbValue: sourceObjUid,
            dbValues: [ sourceObjUid ]
        };
        var property = modelPropertySvc.createViewModelProperty( propAttrHolder );
        selectedReportDef.props.rd_sourceObject = property;
    }
    return selectedReportDef;
};

export let getSelectedRepObject = ( selectedReport ) => {
    if( selectedReport?.type === 'ReportDefinition' ) {
        return selectedReport;
    } else if( appCtxService.ctx.state.params.reportId ) {
        let modelObject = cdm.getObject( appCtxService.ctx.state.params.uid );
        if( appCtxService.ctx.state.params.referenceId && appCtxService.ctx.state.params.reportType === '1' ) {
            var propAttrHolder = {
                displayName: 'rd_sourceObject',
                type: 'STRING',
                dbValue: appCtxService.ctx.state.params.referenceId
            };
            var property = modelPropertySvc.createViewModelProperty( propAttrHolder );
            modelObject.props.rd_sourceObject = property;
        }
        return modelObject;
    } else if( appCtxService.ctx.selected?.type === 'ReportDefinition' ) {
        return appCtxService.ctx.selected;
    } else if( appCtxService.ctx.ReportsContext.selected?.type === 'ReportDefinition' ) {
        return appCtxService.ctx.ReportsContext.selected;
    }
};

export let getUIDForSelectObject = ( selectedReport ) => {
    if( selectedReport?.props?.rd_type?.dbValues[ 0 ] === '1' ) {
        var obj = reportsCommSrvc.getUnderlyingObject( appCtxService.ctx.selected );
        return obj.uid;
    }
    return undefined;
};

export let getReportDefSearchCriteria = () => {
    var traversePath = {
        relationsPath: [ {
            searchMethod: 'REPORT_DEF',
            inputCriteria: [
                {
                    category: '',
                    source: 'Active Workspace',
                    contextObjects: []
                }
            ],
            objectType: 'ReportDefinition'
        } ]
    };

    return {
        sourceObject: '',
        relationsPath: JSON.stringify( traversePath ),
        isFilterMapRequired: 'False'
    };
};

//################# EASILY ADD TO DASHBOARD METHODS END #################

export default exports = {
    getReportDefinitionValList,
    getReportDefinitionSOAInput,
    setupDashboardReportViewer,
    removeSelectedDashboardReport,
    addSelectedReportToDashboard,
    getPreferenceIndex,
    getReportDefinitionsForTileView,
    myDashboardUpdate,
    processSearchResults,
    addItemSelected,
    getselectedItemSource,
    updateDataProvider,
    initializeAndAddActiveFilters,
    appendRdSourceAndReturnSelectedReportDef,
    reportDashboardMove,
    getSelectedRepObject,
    getUIDForSelectObject,
    removeDeletedReportAndUpdate,
    getReportDefSearchCriteria
};
