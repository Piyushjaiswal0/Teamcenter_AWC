// Copyright (c) 2021 Siemens

/**
 * @module js/Awp0InContextReportsService
 */
import AwPromiseService from 'js/awPromiseService';
import listBoxService from 'js/listBoxService';
import modelPropertySvc from 'js/modelPropertyService';
import messagingService from 'js/messagingService';
import appCtxService from 'js/appCtxService';
import reportstabpageservice from 'js/Rb0ReportsPage';
import localeSvc from 'js/localeService';
import tcVmoService from 'js/tcViewModelObjectService';
import cdm from 'soa/kernel/clientDataModel';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import fmsUtils from 'js/fmsUtils';
import _ from 'lodash';
import AwStateService from 'js/awStateService';
import reportsCommSrvc from 'js/reportsCommonService';

var exports = {};

var stylesheetNametoUID = {};
var stylesheetNameToUidForTC = {};
var oldselected = null;

var _inCtxReportDefs = null;
var _tcRAReportList = [];

var FIND_LIST_SEPERATOR = ';';

/**
 * Add the subpanel to the existing panel.
 *
 * @param {String} data - The view model data
 *
 */
export let displayCriteriaPanel = function( selectedObject, data, subPanelContext ) {
    if( data && selectedObject ) {
        var source_Name = selectedObject.props.rd_source.dbValues[ 0 ];
        if( source_Name === 'Active Workspace' ) {
            return;
        }
        eventBus.publish( 'performNavigateAction', { selectedReport: selectedObject } );
    }
};

export let updateActiveViewAndNavigate = function( eventData ) {
    return {
        activeView: 'Awp0InContextReportsSub',
        selectedReport: eventData.selectedReport
    };
};

/**
 * Set the stylesheets to the widget
 *
 * @param {Object} selectedSummaryObject - selectedSummaryObject
 * @param {Object} data - The qualified data of the viewModel
 */
export let displayStylesheet = function( selectedReport ) {
    if( selectedReport !== null ) {
        eventBus.publish( 'getListOfReportStylesheet', {
            selectedReport: selectedReport
        } );
    }
};

export let getListOfReportStylesheetAction = function( data, selectedReport ) {
    if( data !== null ) {
        if( data.selectStyleSheet ) {
            data.selectStyleSheet.dbValue = null;
            data.selectStyleSheet.uiValue = null;
        }

        data.officestylesheets = [];
        data.stylesheetsUIDs = [];

        var reportStylesheets = [];
        var selectedObject = null;

        if( !data.dataProviders ) {
            selectedObject = selectedReport;
        } else {
            selectedObject = data.dataProviders.getInContextReportDefinitions.selectedObjects[ 0 ];
        }

        var source_Name = selectedObject.props.rd_source.dbValues[ 0 ];
        if( source_Name === 'Teamcenter' && selectedObject.props.rd_style_sheets.dbValues !== null ) {
            for( var i = 0; i < selectedObject.props.rd_style_sheets.dbValues.length; i++ ) {
                reportStylesheets.push( selectedObject.props.rd_style_sheets.uiValues[ i ] );
                stylesheetNameToUidForTC[ selectedObject.props.rd_style_sheets.uiValues[ i ] ] = selectedObject.props.rd_style_sheets.dbValues[ i ];
            }
            return listBoxService.createListModelObjectsFromStrings( reportStylesheets );
        }
    }
};
/*
 * Fire an event to be picked by the ViewModel to initiate a SOA call @param { Object }data - The qualified data
 * of the viewModel
 */
export let getLanguageList = function( data ) {
    if( data ) {
        eventBus.publish( 'getLocaleInfo_temp', {
            scope: {
                data: data
            }
        } );
    }
};

export let getRevRuleLovListFromLovValues = ( responseData ) => {
    var revRuleLovList = [];
    if( responseData && responseData.lovValues && responseData.lovValues.length > 0 ) {
        responseData.lovValues.map( ( revRuleObj ) => {
            if( revRuleObj.propDisplayValues && revRuleObj.propDisplayValues.object_name ) {
                var revRuleVMObj = {
                    propDisplayValue: revRuleObj.propDisplayValues.object_name[ 0 ],
                    propInternalValue: revRuleObj.uid,
                    propDisplayDescription: revRuleObj.propDisplayValues.object_desc[ 0 ],
                    dispValue: revRuleObj.propDisplayValues.object_name[ 0 ]
                };
                revRuleLovList.push( revRuleVMObj );
            }
        } );
    }
    return revRuleLovList;
};

/*
 * Default properties like process, output, needs to display in localized text.
 * So get their values from data as SOA props will have only values in en_US.
 */
self.getCustomReportDefaultPropName = function( propName, data ) {
    if( propName === 'process' ) {
        return data.process.propertyDisplayName;
    } else if( propName === 'output' ) {
        return data.output.propertyDisplayName;
    } else if( propName === 'Method_Name' ) {
        return data.methodName.propertyDisplayName;
    }
    return propName;
};

/*
 * process and output should be read-only properties.
 */
self.isEditable = function( propName ) {
    if( propName === 'process' || propName === 'output' || propName === '-p' ) {
        return 'false';
    }
    return 'true';
};

export let getCustomPropList = function( rd_params, rd_paramVals, data ) {
    var customRepConfig = {
        customRepProps: [],
        propConfigs: false
    };
    for( var i = 0; i < rd_params.length; i++ ) {
        if( rd_params[i] !== 'Hide_Report_Attribute' ) {
            var propDisplayName = self.getCustomReportDefaultPropName( rd_params[ i ], data );
            var isEditable = self.isEditable( rd_params[ i ] );
            var value = propDisplayName === '-p' ? '*****' : rd_paramVals[ i ];

            var propAttrHolder = {
                displayName: propDisplayName,
                propName: rd_params[ i ],
                type: 'STRING',
                isRequired: 'false',
                isEditable: isEditable,
                isEnabled: isEditable,
                hasLov: false,
                labelPosition: isEditable === 'false' ? 'PROPERTY_LABEL_AT_SIDE' : 'PROPERTY_LABEL_AT_TOP',
                value: value,
                dbValue: value,
                uiValue: value,
                dispValue: value

            };
            var property = modelPropertySvc.createViewModelProperty( propAttrHolder );
            customRepConfig.customRepProps.push( property );
        } else if( rd_params[i] === 'Hide_Report_Attribute' && rd_paramVals[ i ] === 'TRUE' ) {
            customRepConfig.propConfigs = true;
        }
    }
    return customRepConfig;
};

/**
 * Create view model properties for custom report parameters
 *
 * @param {Object} selectedReportDefinitionObject Currently selected custom report definition object
 * @param {object} data  Data
 *
 * @returns {any} promise
 *
 */
export let createwidgetsforCustom = function( selectedReportDefinitionObject, data ) {
    var customRepConfig = {};

    if( selectedReportDefinitionObject.props.rd_parameters && selectedReportDefinitionObject.props.rd_parameters.dbValues.length > 0 ) {
        customRepConfig = exports.getCustomPropList( selectedReportDefinitionObject.props.rd_parameters.dbValues, selectedReportDefinitionObject.props.rd_param_values.dbValues, data );
        return customRepConfig;
    }
    var deferred = AwPromiseService.instance.defer();
    var propNames = [ 'rd_parameters', 'rd_param_values' ];
    var objs = [ selectedReportDefinitionObject ];
    tcVmoService.getViewModelProperties( objs, propNames ).then( function() {
        exports.getCustomPropList( objs[ 0 ].props.rd_parameters.dbValues, objs[ 0 ].props.rd_param_values.dbValues, data );
        deferred.resolve( customRepConfig );
    } );
    return deferred.promise;
};

/*
 * Extracts report file extension, it will be used to decide to shown report in Tab or download. @param response
 * {Object} the response from the generateReport SOA @return {string} the extension of Report file.
 */
export let getTicketExtension = function( response ) {
    var extension;
    if( response && response.asyncFlagInfo === false && response.transientFileTicketInfos &&
        response.transientFileTicketInfos.length > 0 ) {
        var ticket = response.transientFileTicketInfos[ 0 ].ticket;
        extension = ticket.substr( ticket.lastIndexOf( '.' ) + 1 );
        eventBus.publish( 'reportbuilder.generateitemreportcomplete', {
            reportInfo: {
                fileTicket: response.transientFileTicketInfos[ 0 ].ticket,
                reportFileName: response.transientFileTicketInfos[ 0 ].transientFileInfo.fileName
            }
        } );
    }

    return extension;
};

/**
 * Processing logic which will check if any TcRA report exist. Analytics tab visibility will be set accordingly.
 * Also maintains array which holds ReportDefs for TC and TcRA reports seperately.
 * @param {*} response - SOA response to be processes.
 */
export let processResponseToStoreReportDefs = function( response, data ) {
    _inCtxReportDefs = null;
    _tcRAReportList = [];
    appCtxService.updatePartialCtx( 'awp0Reports.startLoadingReportsList', false );
    _inCtxReportDefs = JSON.parse( response.searchResultsJSON ).objects.map( function( rDef ) {
        return response.ServiceData.modelObjects[ rDef.uid ];
    } );
    //TODO find better way..
    _inCtxReportDefs = _inCtxReportDefs.filter( function( validRepDef ) {
        return validRepDef !== undefined;
    } );
    _.forEach( _inCtxReportDefs, ( repDefObj ) => {
        if( repDefObj.type === 'ReportDefinition' && ( repDefObj.props.rd_source.dbValues[ 0 ] === 'Teamcenter' || repDefObj.props.rd_source.dbValues[ 0 ] === 'Office Template' || repDefObj.props.rd_source.dbValues[ 0 ] === 'Active Workspace' ) ) {
            return repDefObj;
        } else if( repDefObj.type === 'ReportDefinition' && repDefObj.props.rd_source.dbValues[ 0 ] === 'TcRA' ) {
            _tcRAReportList.push( repDefObj );
        }
    } );

    if( _tcRAReportList.length > 0 ) {
        //appCtxService.updatePartialCtx( 'awp0Reports.tcRAReportsAvailable', true );
        data.dispatch( { path: 'data.tcraReportsAvailable.dbValue', value: true } );
    } else {
        //appCtxService.updatePartialCtx( 'awp0Reports.tcRAReportsAvailable', false );
        data.dispatch( { path: 'data.tcraReportsAvailable.dbValue', value: false } );
    }

    if( _inCtxReportDefs.length > 0 ) {
        //appCtxService.updatePartialCtx( 'awp0Reports.tcReportsAvailable', true );
        data.dispatch( { path: 'data.tcReportsAvailable.dbValue', value: true } );
    } else {
        //appCtxService.updatePartialCtx( 'awp0Reports.tcReportsAvailable', false );
        data.dispatch( { path: 'data.tcReportsAvailable.dbValue', value: false } );
    }
};

/**
 * Get Teamcenter InContext ReportDefinition's
 */
export let getTCInContextReportDefs = function( subPanelContext ) {
    _inCtxReportDefs.sort( ( data1, data2 ) => {
        return data1.props.rd_name.dbValues[0].localeCompare( data2.props.rd_name.dbValues[0] );
    } );
    return _inCtxReportDefs;
};

/**
 * Get TcRA InContext ReportDefinition's
 */
export let getTCRAReportDefs = function() {
    return _tcRAReportList;
};

/**
 *Flag to set on ctx which will enable tab sets.
 */
export let loadListViewModel = function( tcReportsAvailable, tcraReportsAvailable, showList, context ) {
    let newtcReportsAvailable = { ...tcReportsAvailable };
    let newtcraReportsAvailable = { ...tcraReportsAvailable };
    let newShowList = { ...showList };
    newtcReportsAvailable.dbValue = _inCtxReportDefs.length > 0;
    newtcraReportsAvailable.dbValue = _tcRAReportList.length > 0;
    newShowList.dbValue = true;

    return { tcReportsAvailable: newtcReportsAvailable, tcraReportsAvailable: newtcraReportsAvailable, showList: newShowList };
};

/**
 * Clean ctx and remove all of awp0Reports.
 */
export let cleanctxonpanelclose = function() {
    appCtxService.unRegisterCtx( 'awp0Reports' );
};

/*
 * Get the language list @param { Object } response - SOA response @return { ObjectArray } - List of objects for
 * listbox
 */
export let prepareLanguageList = function( response ) {
    if( response.languageList ) {
        var languageList = [];
        //Get user locale
        var currentLocaleCode = localeSvc.getLocale(); //this returns value in en-US format

        //Set User Language as first entry in the list
        for( var ii = 0; ii < response.languageList.length; ii++ ) {
            if( currentLocaleCode === response.languageList[ ii ].languageCode ) {
                languageList.push( response.languageList[ ii ] );
                break;
            }
        }

        var reportLocale = appCtxService.ctx.preferences.Report_Generate_Display_Locale_List;
        if( reportLocale !== undefined ) {
            for( var jj = 0; jj < reportLocale.length; jj++ ) {
                var value = reportLocale[ jj ];
                for( var k = 0; k < response.languageList.length; k++ ) {
                    if( response.languageList[ k ].languageCode === value && response.languageList[ k ].languageCode !== currentLocaleCode ) {
                        languageList.push( response.languageList[ k ] );
                    }
                }
            }
            if( languageList.length <= 1 ) {
                for( var i = 0; i < response.languageList.length; i++ ) {
                    if( response.languageList[ i ].languageCode !== currentLocaleCode ) {
                        languageList.push( response.languageList[ i ] );
                    }
                }
            }
        } else {
            //Now add other languages except user language.
            for( var i = 0; i < response.languageList.length; i++ ) {
                if( response.languageList[ i ].languageCode !== currentLocaleCode ) {
                    languageList.push( response.languageList[ i ] );
                }
            }
        }
        return listBoxService.createListModelObjects( languageList, 'languageName' );
    }
};

/*
 * Retrieves the list of OfficeStyleSheets from the SOA Also, create a map to fetch the UID from the
 * DisplayValue @param { Object }response - Response of the SOA
 */
export let getOfficeStyleSheets = function( response ) {
    var stylesheetDisplayName = [];
    if( response.ServiceData.modelObjects ) {
        _.forEach( response.ServiceData.modelObjects, function( mdlObject ) {
            if( mdlObject.type !== 'User' && mdlObject.props && mdlObject.props.object_name && !mdlObject.type.endsWith( 'Revision' ) && !stylesheetDisplayName.includes( mdlObject.props
                .object_name.dbValues[ 0 ] ) ) {
                stylesheetDisplayName.push( mdlObject.props.object_name.dbValues[ 0 ] );
                stylesheetNametoUID[ mdlObject.uid ] = mdlObject;
            }
        } );
        return listBoxService.createListModelObjectsFromStrings( stylesheetDisplayName );
    }
};
/**
 * Input for getreportdefinition SOA.
 */
export let getReportDefSearchCriteria = function( data, ctxObj ) {
    var ctxObjs = [];
    ctxObj.forEach( element => {
        var underlyingCtx = reportsCommSrvc.getUnderlyingObject( element );
        ctxObjs.push( underlyingCtx.uid );
    } );
    data.selectedObjects = ctxObjs;

    var traversePath = {
        relationsPath: [ {
            searchMethod: 'REPORT_DEF',
            inputCriteria: [ {
                category: 'ItemReports',
                source: 'Teamcenter',
                contextObjects: ctxObjs
            },
            {
                category: 'ItemReports',
                source: 'Office Template',
                contextObjects: ctxObjs
            },
            {
                category: 'ItemReports',
                source: 'TcRA',
                contextObjects: ctxObjs
            },
            {
                category: '',
                source: 'Active Workspace',
                contextObjects: ctxObjs
            } ],
            objectType: 'ReportDefinition'
        } ]
    };

    return {
        sourceObject: '',
        relationsPath: JSON.stringify( traversePath ),
        isFilterMapRequired: 'False'
    };
};


/**
 * Retrieve the UID from DisplayValues
 *
 * @param {Object} styleSheetName - Selected stylesheet displayValue
 * @param {Object} data - The qualified data of the viewModel
 */
export let getStylesheetTag = function( styleSheetName, selectedReport ) {
    if( selectedReport !== null ) {
        var source_Name = selectedReport.props.rd_source.dbValues[ 0 ];
        if( source_Name === 'Teamcenter' ) {
            return {
                uid: stylesheetNameToUidForTC[ styleSheetName ],
                type: 'CrfHtmlStylesheet'
            };
        } else if( source_Name === 'Office Template' ) {
            for( var key in stylesheetNametoUID ) {
                if( stylesheetNametoUID[ key ].props.object_name.uiValues[ 0 ] === styleSheetName ) {
                    return {
                        uid: key,
                        type: stylesheetNametoUID[ key ].type
                    };
                }
            }
        }
    }
};

/**
 * Get the context keys of source and target topline objects from split view.
 *
 */
export let getContextKeys = function() {
    var _contextKeys = {
        leftCtxKey: null,
        rightCtxKey: null
    };
    var _multipleContext = appCtxService.getCtx( 'ace.multiStructure' );
    if( _multipleContext ) {
        _contextKeys.leftCtxKey = _multipleContext.leftCtxKey;
        _contextKeys.rightCtxKey = _multipleContext.rightCtxKey;
    } else {
        _multipleContext = appCtxService.getCtx( 'splitView' );
        if( _multipleContext ) {
            _contextKeys.leftCtxKey = _multipleContext.viewKeys[ 0 ];
            _contextKeys.rightCtxKey = _multipleContext.viewKeys[ 1 ];
        }
    }
    return _contextKeys;
};

/**
 * Retrieve topline objects from split view or selected objects if not in split view.
 *
 * @param {Object} data - The qualified data of the viewModel
 * @param {Object} ctx - Context parameter
 */
export let getSelectedObjects = function( data, ctx ) {
    var selObjects;
    if( ctx.splitView && ctx.splitView.mode === true ) {
        var contextKeys = getContextKeys();
        var topSrcElement = appCtxService.getCtx( contextKeys.leftCtxKey + '.topElement' );
        var srcObj;
        if( topSrcElement.props.awb0UnderlyingObject !== undefined ) {
            srcObj = cdm.getObject( topSrcElement.props.awb0UnderlyingObject.dbValues[ 0 ] );
        }
        var topTrgElement = appCtxService.getCtx( contextKeys.rightCtxKey + '.topElement' );
        var trgObj;
        if( topTrgElement.props.awb0UnderlyingObject !== undefined ) {
            trgObj = cdm.getObject( topTrgElement.props.awb0UnderlyingObject.dbValues[ 0 ] );
        }
        selObjects = [ srcObj, trgObj ];
    } else {
        var ctxObjs = [];
        ctx.mselected.forEach( element => {
            var underlyingCtx = reportsCommSrvc.getUnderlyingObject( element );
            ctxObjs.push( underlyingCtx );
        } );
        selObjects = ctxObjs;
    }

    return selObjects;
};

/**
 * Object will be opened and Reports tab will be highlighted to display HTML report
 */
self.openObjectAndShowReport = function( $state, ctxObj, reportsPage ) {
    var toParams = {};
    var options = {};
    var showObject = 'com_siemens_splm_clientfx_tcui_xrt_showObject';

    toParams.page = reportsPage;
    toParams.pageId = 'tc_xrt_Rb0Reports';

    toParams.uid = ctxObj.uid;
    toParams.edit = 'false';
    options.inherit = false;
    $state.go( showObject, toParams, options );
};

/**
 * Will update displayed HTML Report.
 */
self.updateDisplayedReport = function( ctxObj, fileTicket ) {
    eventBus.publish( 'updateHTMLReport', {
        scope: {
            selected: ctxObj,
            urlPath: fileTicket
        }
    } );
};
self.isShowObjectLocation = function() {
    var isShowObject = false;
    var locationCtx = appCtxService.getCtx( 'locationContext' );
    if( locationCtx && ( locationCtx[ 'ActiveWorkspace:SubLocation' ] === 'com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation' &&
            locationCtx[ 'ActiveWorkspace:Location' ] === 'com.siemens.splm.clientfx.tcui.xrt.showObjectLocation' ||
            locationCtx[ 'ActiveWorkspace:SubLocation' ] === 'com.siemens.splm.clientfx.tcui.xrt.objectNavigationSubLocation' &&
            locationCtx[ 'ActiveWorkspace:Location' ] === 'com.siemens.splm.clientfx.tcui.xrt.showObjectLocation' ) ) {
        //show object location, but occ management sublocation, where tabs are available instead of Pages.
        isShowObject = false;
    } else if( locationCtx && locationCtx[ 'ActiveWorkspace:Location' ] === 'com.siemens.splm.clientfx.tcui.xrt.showObjectLocation' ) {
        isShowObject = true;
    }
    return isShowObject;
};

self.isReportTabExist = function() {
    return $( '[name=\'tc_xrt_Rb0Reports\']' ).length > 0;
};

/**
 * Performs JQuery and returns the ReportTab Object.
 *
 * <TODO> It will need a refactor based on object selection PWA or showObject.
 * Method checks for availability of Reports tab, and if available is it a selected tab
 * Based on that actions like navigation, update etc. are performed.
 * in BA, we don't have a good way to know about xrtTabs. That needs to be identified
 * and based on that this method should be refactored.
 */
self.getReportsTabScope = function( reportsPage, data, ctx, commandContext ) {
    let context = commandContext.pageContext ? commandContext.pageContext.sublocationState : null;
    var reportsTab = null;
    if( ctx.panelContext && ctx.panelContext.showObjectContext ) {
        if( ctx.panelContext.showObjectContext.subLocationTabs ) {
            ctx.panelContext.showObjectContext.subLocationTabs.forEach( tab => {
                if( tab.name === reportsPage && tab.tabKey === 'tc_xrt_Rb0Reports' ) {
                    data.isTabAvailable = true;
                }
            } );
        }
        if( ctx.panelContext && ctx.panelContext.contextKey === 'occmgmtContext' ) {
            reportsTab = {};
            data.isTabAvailable = true;
            if( context && context.secondaryActiveTabId === 'tc_xrt_Rb0Reports' ) {
                reportsTab.selectedTab = true;
            } else if( commandContext.selectionData && commandContext.selectionData.selected && commandContext.selectionData.selected.length > 1 ) {
                reportsTab = null;
                data.isTabAvailable = false;
            }
        } else if( context && self.isReportTabExist() ) {
            reportsTab = {};
            if( context.secondaryActiveTabId === 'tc_xrt_Rb0Reports' ) {
                reportsTab.selectedTab = true;
            }
        }
    } else if( context && self.isReportTabExist() ) {
        reportsTab = {};
        if( context.secondaryActiveTabId === 'tc_xrt_Rb0Reports' ) {
            reportsTab.selectedTab = true;
        }
    }

    var tabContainer = $( 'div.aw-xrt-tabsContainer' );
    if( tabContainer.length === 1 && tabContainer[ 0 ].childNodes[ 0 ].length > 0 ) {
        //var tabBarContentScope = ngModule.element( tabContainer[0].childNodes[0].childNodes[0].children ).scope();
    }

    //var tabBar = $( 'div.aw-jswidget-tabBar' );
    // var tabBar = $( 'div.sw-row div.align-items-center' );
    // var reportsTab = null;
    // if( tabBar[ 1 ] && !self.isShowObjectLocation() ) {
    //     var tabBarContent = tabBar[ 1 ].childNodes[ 1 ];
    //     var tabBarContentScope = ngModule.element( tabBarContent ).scope();

    //     _.forEach( tabBarContentScope.tabsModel, function( tab ) {
    //         if( tab.name === reportsPage && tab.tabKey === 'tc_xrt_Rb0Reports' ) {
    //             reportsTab = tab;
    //         }
    //     } );

    //     if( !reportsTab ) {
    //         data.isTabAvailable = false;
    //     }
    // } else if( tabBar[ 0 ] && self.isShowObjectLocation() ) {
    //     tabBarContent = tabBar[ 0 ].childNodes[ 1 ];
    //     tabBarContentScope = ngModule.element( tabBarContent ).scope();

    //     _.forEach( tabBarContentScope.tabsModel, function( tab ) {
    //         if( tab.name === reportsPage && tab.tabKey === 'tc_xrt_Rb0Reports' ) {
    //             data.isTabAvailable = true;
    //         }
    //     } );
    // }
    return reportsTab;
};

var setupExecutingReportOnCtx = function( data ) {
    if( data.dataProviders && data.dataProviders.getInContextReportDefinitions.selectedObjects[ 0 ].props.rd_type.dbValue === 1 &&
        data.dataProviders.getInContextReportDefinitions.selectedObjects[ 0 ].props.rd_source.dbValue === 'Active Workspace' ) {
        appCtxService.updatePartialCtx( 'selectedReportDefinition', data.dataProviders.getInContextReportDefinitions.selectedObjects[ 0 ] );
        reportsCommSrvc.setupReportPersistCtx();
    } else {
        var repOnCtx = appCtxService.getCtx( 'selectedReportDefinition' );
        if( repOnCtx ) {
            appCtxService.unRegisterCtx( 'selectedReportDefinition' );
        }
    }
};

let navigateToReportsTab = ( subLocation = {} ) => {
    const newSublocationCtx = { ...subLocation.value = {} };
    var x = appCtxService.getCtx( 'sublocation' ).clientScopeURI;
    newSublocationCtx.secondaryActiveTabId = 'tc_xrt_Rb0Reports';
    subLocation.update && subLocation.update( newSublocationCtx );
};

/**
 * Open and Display HTML report in the Reports tab. Depending on object type, actions will be performed.
 * ReportDefinition: It will be shown in sub-location ItemRevision and such BO: Open and show in sub-location.
 *
 * @param {Object} selectedObj - currently selected object
 * @param {Object} fileTicket - FMS file ticket returned by server for the HTML Report
 * @param {Object} data - Data
 * @param {Object} occCtx - Occurrence management context
 */
export let openFileInNewTab = function( selected, fileTicket, data, commandContext ) {
    var ctxObj = reportsCommSrvc.getUnderlyingObject( selected );

    if( ctxObj && ctxObj.uid ) {
        setupExecutingReportOnCtx( data );

        //Set selected object and its associated file ticket parameters
        reportstabpageservice.setReportsParameter( ctxObj, fileTicket );

        var $state = AwStateService.instance;
        var pageName = $state.params.page;
        var ctx = appCtxService.ctx;
        var reportsTab = self.getReportsTabScope( data.i18n.reportsPage, data, ctx, commandContext );

        if( !( ctx.splitView && ctx.splitView.mode === true ) && (
            reportsTab || pageName === data.i18n.reportsPage ) ) {
            if( reportsTab && reportsTab.selectedTab === true || pageName === data.i18n.reportsPage ) {
                self.updateDisplayedReport( ctxObj, fileTicket );
            } else {
                navigateToReportsTab( commandContext.pageContext.sublocationState );
            }
        } else if( data.isTabAvailable === false || data.isTabAvailable === undefined ) {
            if( data.dataProviders && data.dataProviders.getInContextReportDefinitions.selectedObjects[ 0 ].props.rd_type.dbValue === 1 &&
                data.dataProviders.getInContextReportDefinitions.selectedObjects[ 0 ].props.rd_source.dbValue === 'Active Workspace' ) {
                //message when Reports tab is not available to display Active item report.
                messagingService.reportNotyMessage( data, data._internal.messages, 'awReportNotDisplayedMsg' );
            } else {
                fmsUtils.openFile( fileTicket );
            }
        } else {
            self.openObjectAndShowReport( $state, ctxObj, data.i18n.reportsPage );
        }
    }
};

export let processAsyncReport = function( data ) {
    //if it is async report, check and show message
    //further processing not required...
    if( data.m_async ) {
        messagingService.reportNotyMessage( data, data._internal.messages, 'showAsyncReportMessage' );
        return;
    }
};

export let getPasswordValue = function( selectedReport ) {
    for( var i = 0; i < selectedReport.props.rd_parameters.dbValues.length; i++ ) {
        if( selectedReport.props.rd_parameters.dbValues[ i ] === '-p' ) {
            return selectedReport.props.rd_param_values.dbValues[ i ];
        }
    }
};

export let getCriteriaNames = function( data, selectedReport ) {
    var criteriaNames = [];
    var criteriaValues = [];
    if( data !== null && selectedReport !== null ) {
        if( selectedReport.props.rd_type.dbValues[ 0 ] === '0' ) {
            getSummaryReportCriteria( data, criteriaNames, criteriaValues );
        } else if( selectedReport.props.rd_type.dbValues[ 0 ] === '2' ) {
            for( var i = 0; i < data.customProps.length; i++ ) {
                criteriaNames.push( data.customProps[ i ].propertyName );
                if( data.customProps[ i ].propertyName === '-p' ) {
                    criteriaValues.push( exports.getPasswordValue( data.selectedReportDef ) );
                } else {
                    criteriaValues.push( data.customProps[ i ].dbValue );
                }
            }
        } else if( selectedReport.props.rd_type.dbValues[ 0 ] === '1' ) {
            getItemReportCriteria( data, criteriaNames, criteriaValues, selectedReport );
        }

        data.criteriaNames = criteriaNames;
        data.criteriaValues = criteriaValues;
    }
    return criteriaNames;
};

/**
 * @param data
 * @param criteriaNames
 * @param criteriaValues
 */
function getItemReportCriteria( data, criteriaNames, criteriaValues, selectedObject ) {
    if( selectedObject.props.rd_parameters.dbValues !== null &&
        selectedObject.props.rd_parameters.dbValues[ 0 ] === 'BOM_REPORT' ) {
        criteriaNames.push( 'BOM_REPORT' );
        criteriaValues.push( 'TRUE' );

        criteriaNames.push( 'REV_RULE' );
        criteriaValues.push( data.revRuleProp.uiValue );

        criteriaNames.push( 'PACKED_BOM' );
        if( data.packedbom.dbValue === data.i18n.trueVal ) {
            criteriaValues.push( 'TRUE' );
        } else if( data.packedbom.dbValue === data.i18n.falseVal ) {
            criteriaValues.push( 'FALSE' );
        }
    }
}

/**
 * @param Multiple values for property LOV need to be processed and formatted.
 * @param curntUiValue - Current UI value
 */
var getCriteriaValuesLocal = function( curntUiValue ) {
    if( appCtxService.ctx.preferences.WSOM_find_list_separator && appCtxService.ctx.preferences.WSOM_find_list_separator[0] ) {
        FIND_LIST_SEPERATOR = appCtxService.ctx.preferences.WSOM_find_list_separator[0];
    }
    return curntUiValue.join( FIND_LIST_SEPERATOR );
};

/**
 * @param data
 * @param criteriaNames
 * @param criteriaValues
 */
function getSummaryReportCriteria( data, criteriaNames, criteriaValues ) {
    _.forEach( data.rb0ReportQueryAttributes.props, function( prop ) {
        if( prop.uiValue !== '' || prop.hasLov && prop.dbValue.length > 0 ) {
            criteriaNames.push( prop.propertyDisplayName );
            if( prop.hasLov ) {
                criteriaValues.push( getCriteriaValuesLocal( prop.dbValue === undefined ? prop.dbValues : prop.dbValue ) );
            } else {
                criteriaValues.push( prop.uiValue );
            }
        }
    } );
}

export let evaluateCriteriaAndCallGenerateReport = function( data ) {
    var isCriteriaEntered = false;
    if( data !== null ) {
        if( data.dataProviders === undefined && data.selectedReportDef.props.rd_type.dbValues[ 0 ] === '0' ) {
            _.forEach( data.rb0ReportQueryAttributes.props, function( prop ) {
                if( prop.uiValue !== '' || prop.hasLov && prop.dbValue !== null ) {
                    isCriteriaEntered = true;
                }
            } );
        } else if( data.dataProviders === undefined && data.selectedReportDef.props.rd_type.dbValues[ 0 ] === '2' &&
            data.customProps.length > 0 ) {
            isCriteriaEntered = true;
        }

        if( isCriteriaEntered ) {
            eventBus.publish( 'executeGenerateReport', {
                scope: {
                    data: data
                }
            } );
        } else {
            messagingService.reportNotyMessage( data, data._internal.messages, 'showNoCriteriaMessage' );
        }
    }
};

export let getCriteriaValues = function( data ) {
    return data.criteriaValues;
};

export let convertDisplayLocaleValuetoString = function( propDbValue ) {
    if( propDbValue === true ) {
        return 'true';
    }
    return 'false';
};

export let getReportOptionNames = function( data, selectedObject ) {
    var reportOptionNames = [];
    var reportOptionValues = [];

    if( data !== null && selectedObject !== null ) {
        var source_Name = selectedObject.props.rd_source.dbValues[ 0 ];
        if( source_Name === 'Office Template' ) {
            reportOptionNames.push( 'officeLive' );
            reportOptionValues
                .push( exports.convertDisplayLocaleValuetoString( data.doLiveIntegration.dbValue ) );
        }
        if( source_Name === 'Teamcenter' ) {
            reportOptionNames.push( 'report_locale' );
            reportOptionValues.push( data.displayLocale.dbValue.languageCode );
        }

        if( data.runReportAsync !== undefined && data.runReportAsync ) {
            reportOptionNames.push( 'runAsync' );
            reportOptionValues.push( exports.convertDisplayLocaleValuetoString( data.runReportAsync.dbValue ) );
        }

        data.reportOptionNames = reportOptionNames;
        data.reportOptionValues = reportOptionValues;
    }
    return reportOptionNames;
};

export let getReportOptionValues = function( data ) {
    return data.reportOptionValues;
};

export let loadReportCriteria = function( context, data, runReportAsync ) {
    var packbomProps;
    let newRunReportAsync = { ...runReportAsync };
    newRunReportAsync.dbValue = context.selectedReport.props.fnd0IsAsync.dbValues[ 0 ] === '1';

    if( context.selectedReport.props.rd_parameters.dbValues[ 0 ] === 'BOM_REPORT' ) {
        packbomProps = listBoxService.createListModelObjectsFromStrings( [ data.i18n.trueVal, data.i18n.falseVal ] );
    }
    var customRepConfig = {
        customRepProps:[],
        propConfigs: false
    };
    if( context.selectedReport.props.rd_type.dbValues[ 0 ] === '2' ) {
        customRepConfig = createwidgetsforCustom( context.selectedReport, data );
    }
    var reportStylesheets = null;
    var isOfficeSource = true;
    if( context.selectedReport.props.rd_source.dbValues[ 0 ] === 'Teamcenter' ) {
        reportStylesheets = getListOfReportStylesheetAction( data, context.selectedReport );
        isOfficeSource = false;
    }
    return {
        stylesheets: reportStylesheets,
        languageList: context.languageList,
        packBOM: packbomProps,
        isOfficeSource: isOfficeSource,
        runReportAsync: newRunReportAsync,
        customProps: customRepConfig.customRepProps,
        customConfigProp: customRepConfig.propConfigs
    };
};

export default exports = {
    displayCriteriaPanel,
    displayStylesheet,
    getLanguageList,
    getCustomPropList,
    createwidgetsforCustom,
    getTicketExtension,
    processResponseToStoreReportDefs,
    getTCInContextReportDefs,
    getTCRAReportDefs,
    loadListViewModel,
    cleanctxonpanelclose,
    prepareLanguageList,
    getOfficeStyleSheets,
    getReportDefSearchCriteria,
    getStylesheetTag,
    openFileInNewTab,
    processAsyncReport,
    getPasswordValue,
    getCriteriaNames,
    evaluateCriteriaAndCallGenerateReport,
    getCriteriaValues,
    convertDisplayLocaleValuetoString,
    getReportOptionNames,
    getReportOptionValues,
    getSelectedObjects,
    getContextKeys,
    getListOfReportStylesheetAction,
    loadReportCriteria,
    updateActiveViewAndNavigate,
    getRevRuleLovListFromLovValues
};
