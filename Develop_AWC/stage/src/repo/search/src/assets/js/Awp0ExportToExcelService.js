// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/**
 * logic surrounding exporting search results to excel
 * @module js/Awp0ExportToExcelService
 */

import appCtxService from 'js/appCtxService';
import localeService from 'js/localeService';
import _ from 'lodash';
import { DerivedStateResult } from 'js/derivedContextService';

let selectedResultsText = '';
let asShownTabNameText = '';
let templateTabNameText = '';
let formattedTextForAllResults = '';

export let createExportPanel = () => {
    return [ new DerivedStateResult( {
        ctxParameters: [],
        additionalParameters: [],
        compute: ( renderContext ) => {
            let tabs = [];

            let asShownTab = {
                name: asShownTabNameText,
                tabKey: 'searchExport',
                pageId: asShownTabNameText,
                recreatePanel: true
            };
            let templateTab = {
                name: templateTabNameText,
                tabKey: 'template',
                pageId: templateTabNameText,
                view: 'Arm0ExportToOfficeAppSub',
                panelId: 'Arm0ExportToOfficeAppSub',
                recreatePanel: true
            };

            let selectedObjects = appCtxService.getCtx( 'mselected' );
            let selectedObject = appCtxService.getCtx( 'selected' );
            let clientScopeURI = appCtxService.getCtx( 'sublocation.clientScopeURI' );
            let hasSelected = selectedObjects && selectedObjects.length > 0;
            let isSearchLocation = clientScopeURI === 'Awp0SearchResults' || clientScopeURI === 'Awp0AdvancedSearch';

            if( isSearchLocation ) {
                tabs.push( asShownTab );
            }

            if( hasSelected ) {
                let isWSOSelected = selectedObject.modelType && selectedObject.modelType.typeHierarchyArray.indexOf( 'WorkspaceObject' ) > -1;
                if( isWSOSelected ) {
                    tabs.push( templateTab );
                }
            }
            return tabs;
        }
    } ) ];
};

export let initializeExportTypes = ( exportType ) => {
    let updatedExportTypeProp = _.cloneDeep( exportType );
    updatedExportTypeProp.propertyRadioTrueText = formattedTextForAllResults;
    updatedExportTypeProp.propertyRadioFalseText = selectedResultsText;
    return updatedExportTypeProp;
};

export let initializeSearchType = ( historyNameToken ) => {
    return historyNameToken;
};

export let getExportPreferenceValue = ( searchExportMaxRowsPreference ) => {
    if( searchExportMaxRowsPreference && searchExportMaxRowsPreference[ 0 ] ) {
        return parseInt( searchExportMaxRowsPreference[ 0 ] );
    }
    return 1000;
};

let loadConfiguration = () => {
    localeService.getTextPromise( 'SearchMessages', true ).then(
        function( localTextBundle2_ ) {
            selectedResultsText = localTextBundle2_.selectedResults;
            asShownTabNameText = localTextBundle2_.asShownTabTitle;
            templateTabNameText = localTextBundle2_.templateTabTitle;
            let searchExportMaxRows = appCtxService.getCtx( 'preferences.AW_Search_Results_Export_Max_Rows' );
            if( searchExportMaxRows && searchExportMaxRows.length > 0 ) {
                formattedTextForAllResults = localTextBundle2_.allResults.format( searchExportMaxRows[ 0 ] );
            } else {
                formattedTextForAllResults = localTextBundle2_.allResults.format( 1000 );
                console.error( 'The preference \'AW_Search_Results_Export_Max_Rows\' is not set in this environment. The display value is the default value.' );
            }
        } );
};

loadConfiguration();

/* eslint-disable-next-line valid-jsdoc*/

const Awp0ExportToExcelService = {
    createExportPanel,
    initializeExportTypes,
    initializeSearchType,
    getExportPreferenceValue
};

export default Awp0ExportToExcelService;
