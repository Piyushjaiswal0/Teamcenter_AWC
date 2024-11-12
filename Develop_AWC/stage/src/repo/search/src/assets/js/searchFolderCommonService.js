// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 *
 * @module js/searchFolderCommonService
 */

import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'soa/preferenceService';
import soaService from 'soa/kernel/soaService';
import advancedSearchUtils from 'js/advancedSearchUtils';
import dateTimeSvc from 'js/dateTimeService';
import messagingService from 'js/messagingService';
import localeService from 'js/localeService';
var INTERNAL_KEYWORD = '__I_N_T_E_R_N_A_L__';
var AWP0_SEARCH_FOLDER = 'Awp0SearchFolder';
var SEARCH_FOLDER = 'searchFolder';

var policyIOverride = {
    types: [ {
        name: AWP0_SEARCH_FOLDER,
        properties: [ {
            name: 'awp0SearchDefinition',
            modifiers: [ {
                name: 'withProperties',
                Value: 'true'
            } ]
        }, {
            name: 'object_string'
        }, {
            name: 'awp0SearchType'
        }, {
            name: 'awp0CanExecuteSearch'
        }, {
            name: 'awp0Rule'
        } ]
    },
    {
        name: 'ReportDefinition',
        properties: [ {
            name: 'rd_parameters'
        }, {
            name: 'rd_param_values'
        }, {
            name: 'rd_source'
        } ]
    }
    ]
};

/**
 * add folder
 * @function addActiveFolder
 * @param {STRING} parentFolderUID - parent folder uid
 * @param {STRING} searchFolderName - searchFolderName
 * @param {STRING} searchFolderDescription - searchFolderDescription
 */
export let addActiveFolder = function( parentFolderUID, searchFolderName, searchFolderDescription ) {
    var searchFoldersInputArr = [];
    var searchFolderInput = {};

    searchFolderInput.parentFolderUID = parentFolderUID;
    searchFolderInput.searchFolderUID = '';
    searchFolderInput.reportDefinitionUID = '';
    searchFolderInput.searchFolderAttributes = {
        searchFolderName: searchFolderName,
        searchFolderDescription: [ searchFolderDescription ? searchFolderDescription : '' ]
    };
    searchFolderInput.searchCriteria = [];
    searchFoldersInputArr.push( searchFolderInput );
    searchFolderCommonService.addObjectToSearchFolderInt( searchFoldersInputArr, true );
};

/**
 * edit folder
 * @function editActiveFolder
 * @param {STRING} parentFolderUID - parent folder uid
 * @param {STRING} searchFolderUID - searchFolderUID
 * @param {STRING} reportDefinitionUID - reportDefinitionUID
 * @param {Object} searchCriteria - searchCriteria
 */
export let editActiveFolder = function( parentFolderUID, searchFolder, reportDefinitionUID, searchCriteria ) {
    var searchFoldersInputArr = [];
    var searchFolderInput = {};

    searchFolderInput.parentFolderUID = parentFolderUID;
    searchFolderInput.searchFolderUID = searchFolder.uid;
    searchFolderInput.reportDefinitionUID = reportDefinitionUID;
    searchFolderInput.searchCriteria = searchCriteria;
    searchFoldersInputArr.push( searchFolderInput );
    searchFolderCommonService.addObjectToSearchFolderInt( searchFoldersInputArr, false, searchFolder );
};

/**
 * display confirmation
 * @function displayConfirmation
 * @param {Object} response - response
 */
export let displayConfirmation = function( response ) {
    let createdObjTitle = response.searchFolders[ 0 ].searchFolder.props.object_string.dbValues[ 0 ];
    localeService.getLocalizedText( 'awAddDirectiveMessages', 'pasteSuccessful' ).then( function( pasteSuccessful ) {
        let msg = pasteSuccessful.replace( '{0}', createdObjTitle );
        messagingService.showInfo( msg );
    } );
};

/**
 * Add active folder silently
 * @function addObjectToSearchFolderInt
 * @param {Object} searchFoldersInputArr - searchFoldersInputArr
 * @param {BOOLEAN} isAdd - true if add folder
 */
export let addObjectToSearchFolderInt = function( searchFoldersInputArr, isAdd, searchFolder ) {
    //SOA
    soaService.post( 'Internal-Search-2020-12-SearchFolder', 'createOrEditSearchFolders', {
        input: searchFoldersInputArr
    }, policyIOverride ).then(
        function( response ) {
            if( isAdd ) {
                let locationContext = appCtxService.getCtx( 'locationContext.ActiveWorkspace:SubLocation' );
                let refresh =  locationContext === 'showObject';
                if ( !refresh ) {
                    //Parse SOA Response for created uid
                    var createdSearchFolderuid = response.searchFolders[ 0 ].searchFolder.uid;
                    let newSearchfolder = { createdSearchFolderuid };
                    appCtxService.updatePartialCtx( SEARCH_FOLDER, newSearchfolder );
                }
                searchFolderCommonService.displayConfirmation( response );
                eventBus.publish( 'cdm.relatedModified', {
                    refreshLocationFlag: refresh,
                    relations: '',
                    isPinnedFlag: false,
                    relatedModified: [ appCtxService.ctx.mselected[ 0 ] ],
                    createdObjects: [ response.searchFolders[ 0 ].searchFolder ]
                } );
            } else {
                const newSearchFolder = { ...searchFolder.value };
                newSearchFolder.isRuleDirty = true;
                newSearchFolder.isEditMode = false;
                searchFolder.update( newSearchFolder );
            }
        }
    );
};

/**
 * processAttributes
 * @function addObjectToSearchFolderInt
 * @param {Array} uiValues- raw ui values of saved query attributes from server
 * @return {Array} displayValues - cleaned up values for rendering
 */
export let processAttributes = function( uiValues ) {
    // The uiValues comes in the following array:
    //
    // 0: "Created After"
    // 1: "##DateTime"
    // 2: "01-Jun-2021 04:00"
    // 3: "Created Before"
    // 4: "##DateTime"
    // 5: "22-Jun-2021 04:00"
    // 6: "Type"
    // 7: "##String"
    // 8: "Item"
    let attributeValues = _.slice( uiValues, 1, uiValues.length );
    let displayValues = [];
    for( var i = 0; i < attributeValues.length; i++ ) {
        let attribute = attributeValues[i];
        let pairedAttribute = '';
        if ( _.startsWith( attribute, '##' ) ) {
            if ( _.startsWith( attribute, '##DateTime' ) ) {
                let attributeDate = attributeValues[i + 1];
                let attributeDateRevised = new Date( new Date( attributeDate ).getTime() - new Date().getTimezoneOffset() * 60000 );
                attributeValues[i + 1] = dateTimeSvc.formatSessionDateTime( attributeDateRevised );
            }
            let multipleValues = attributeValues[i + 1].split( advancedSearchUtils._delimiterForArray );
            let filterValue = '';
            if( multipleValues && multipleValues.length > 0 && attributeValues[i + 1].indexOf( INTERNAL_KEYWORD ) !== -1 ) {
                filterValue = searchFolderCommonService.splitInternalAndDisplayNameUsingInternalKeyword( multipleValues, true );
            } else {
                filterValue += attributeValues[i + 1];
            }
            pairedAttribute = attributeValues[i - 1] + ': ' + filterValue;
            displayValues.push( pairedAttribute );
        }
    }
    return displayValues;
};

export let splitInternalAndDisplayNameUsingInternalKeyword = function( multiValues, getDisplayName ) {
    let filterValue = '';
    for( let index = 0; index < multiValues.length; index++ ) {
        let eachDisplayInternalPair = multiValues[ index ].split( INTERNAL_KEYWORD );
        if( eachDisplayInternalPair && eachDisplayInternalPair.length > 1 ) {
            filterValue += getDisplayName ? eachDisplayInternalPair[ 0 ] : eachDisplayInternalPair[ 1 ];
            if( index !== multiValues.length - 1 ) {
                filterValue += ';';
            }
        }
    }
    return filterValue;
};

const searchFolderCommonService = {
    INTERNAL_KEYWORD,
    addActiveFolder,
    editActiveFolder,
    addObjectToSearchFolderInt,
    processAttributes,
    displayConfirmation,
    splitInternalAndDisplayNameUsingInternalKeyword
};

export default searchFolderCommonService;
