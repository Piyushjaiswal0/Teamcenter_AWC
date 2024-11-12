/* eslint-disable max-lines */
// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 *
 * @module js/searchFolderService
 */

import viewModelObjectService from 'js/viewModelObjectService';
import clientDataModel from 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'soa/preferenceService';
import advancedSearchUtils from 'js/advancedSearchUtils';
import advancedSearchSvc from 'js/advancedSearchService';
import soaService from 'soa/kernel/soaService';
import logger from 'js/logger';
import uwPropertyService from 'js/uwPropertyService';
import preferredAdvancedSearchService from 'js/preferredAdvancedSearchService';
import AwStateService from 'js/awStateService';
import saveSearchUtils from 'js/Awp0SaveSearchUtils';
import searchFilterSvc from 'js/aw.searchFilter.service';
import shapeSearchService from 'js/Awp0ShapeSearchService';
import searchFolderCommonService from 'js/searchFolderCommonService';
import searchCommonUtils from 'js/searchCommonUtils';
import commandPanelService from 'js/commandPanel.service';
import searchStateHelperService from 'js/searchStateHelperService';
import Awp0SaveSearchService from 'js/Awp0SaveSearchService';
import filterPanelUtils from 'js/filterPanelUtils';

let FULLTEXT_PROVIDER = 'Awp0FullTextSearchProvider';
let ADVANCED_PROVIDER = 'Awp0SavedQuerySearchProvider';
let SEARCH_FOLDER = 'searchFolder';
let UNKNOWN = 'Unknown';
let CURRENT_RULE = 'currentRule';
let NEW_RULE = 'newRule';
let SAVED_SEARCH = 'savedSearch';
let RULE_CHANGED_EVENT = 'searchFolder.ruleChanged';
/**
  * add folder
  * @function addActiveFolder
  * @param {STRING} parentFolderUID - parent folder uid
  * @param {STRING} searchFolderName - searchFolderName
  * @param {STRING} searchFolderDescription - searchFolderDescription
  */
export let addActiveFolder = function( parentFolderUID, searchFolderName, searchFolderDescription ) {
    searchFolderCommonService.addActiveFolder( parentFolderUID, searchFolderName, searchFolderDescription );
};

/**
  * edit folder
  * @function editActiveFolder
  * @param {STRING} parentFolderUID - parent folder uid
  * @param {STRING} searchFolderUID - searchFolderUID
  * @param {STRING} reportDefinitionUID - reportDefinitionUID
  * @param {Object} criteria - criteria
  */
export let editActiveFolder = function( parentFolderUID, searchFolder, reportDefinitionUID, criteria ) {
    searchFolderCommonService.editActiveFolder( parentFolderUID, searchFolder, reportDefinitionUID, criteria );
};

export let addObjectToSearchFolder = function( panelContext ) {
    commandPanelService.activateCommandPanel( 'Awp0SearchFolderCreate', 'aw_toolsAndInfo' );
};
/**
  * setCanExecuteSearch
  * @function setCanExecuteSearch
  * @param {*} defaultActiveFolders defaultActiveFolders
  */
export let setCanExecuteSearch = function( defaultActiveFolders ) {
    if( defaultActiveFolders && defaultActiveFolders.length > 0 ) {
        soaService.post( 'Internal-AWS2-2020-05-FullTextSearch', 'getSearchSettings', {
            searchSettingInput: {
                inputSettings: {
                    searchFolderExecution: defaultActiveFolders
                }
            }
        } );
    }
};

/**
  * get Data Provider name for the search( Full Text Search/ Shape Search/ Advanced Search )
  * @function getSearchFolderDataProviderInt
  * @param {Object}searchFolder - searchFolder
  *
  * @return {Object} data provider
  */
export let getSearchFolderDataProviderInt = function( searchFolder ) {
    //Need to change when shapeSearch is ready.
    let searchState = {};
    if( searchFolder && searchState.isShapeSearch ) {
        return 'SS1ShapeSearchDataProvider';
    } else if( searchFolder && searchFolder.awp0SearchType ) {
        return searchFolder.awp0SearchType;
    }
    return FULLTEXT_PROVIDER;
};

/**
  * get Data Provider name for the search( Full Text Search/ Shape Search/ Advanced Search )
  * @function getSearchFolderDataProvider
  * @param {Object}searchFolder - searchFolder
  *
  * @return {Object} data provider
  */
export let getSearchFolderDataProvider = function( searchState ) {
    return searchFolderService.getSearchFolderDataProviderInt( searchState );
};

/**
  * @function getSearchFolderDefinitionIntFulltext_CheckShapeSearch
  * @param {STRING}filter - filter
  * @param {Object}searchFolderCtx - searchFolderCtx
  */
export let getSearchFolderDefinitionIntFulltext_CheckShapeSearch = function( filter, searchFolderCtx ) {
    if( filter === 'ShapeSearchProvider' || filter === 'SS1partShapeFilter' || filter === 'SS1shapeBeginFilter' || filter === 'SS1shapeEndFilter' ) {
        searchFolderCtx.isShapeSearch = true;
    }
};
/**
  * @function getSearchFolderDefinitionIntFulltextStringFilter
  * @param {STRING}filterName - filter name
  * @param {Object}filterValue - filterValue
  * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
  */
export let getSearchFolderDefinitionIntFulltextStringFilter = function( filterName, filterValue, searchFilters ) {
    if( filterValue.stringDisplayValue ) {
        searchFilters.push( filterName + '=' + filterValue.stringDisplayValue );
    } else {
        searchFilters.push( filterName + '=' + filterValue.stringValue );
    }
};

/**
  * @function getSearchFolderDefinitionIntFulltext_ProcessFilterTypes
  * @param {STRING}filterName - filter name
  * @param {Object}filterValue - filterValue
  * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
  */
export let getSearchFolderDefinitionIntFulltext_ProcessFilterTypes = function( filterName, filterValue, searchFilters ) {
    if( filterValue.searchFilterType === 'DateFilter' ) {
        searchFilters.push( filterName + '=' + filterValue.startDateValue + ' - ' + filterValue.endDateValue );
    } else if( filterValue.startEndRange === 'NumericRange' ) {
        searchFilters.push( filterName + '=' + filterValue.startNumericValue + ' - ' + filterValue.endNumericValue );
    } else {
        searchFolderService.getSearchFolderDefinitionIntFulltextStringFilter( filterName, filterValue, searchFilters );
    }
};

/**
  * utiltiy function of getSearchFolderDefinitionIntFulltextInt
  * @function getSearchFolderDefinitionIntFulltextInt_setFilterMap
  * @param {Object}filter - filter
  * @param {Object}searchFolderFilterMap - searchFolderFilterMap
  * @param {Object}filterValue - filter value.
  */
export let getSearchFolderDefinitionIntFulltextInt_setFilterMap = function( filter, searchFolderFilterMap, filterValue ) {
    if( !searchFolderFilterMap[ filter ] ) {
        searchFolderFilterMap[ filter ] = [ filterValue ];
    } else {
        searchFolderFilterMap[ filter ].push( filterValue );
    }
};

/**
  *  utility function of get report definition for fulltext
  * @function getSearchFolderDefinitionIntFulltextInt
  * @param {Object}filter - filter
  * @param {Object}searchFolderCtx - searchFolderCtx
  * @param {Object}paramValue - paramValue of report definition
  * @param {Object}searchFolderFilterMap - searchFolderFilterMap
  * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
  */
export let getSearchFolderDefinitionIntFulltextInt = function( filter, searchFolderCtx, paramValue, searchFolderFilterMap, searchFilters ) {
    searchFolderService.getSearchFolderDefinitionIntFulltext_CheckShapeSearch( filter, searchFolderCtx );
    let sanitizedFilterValue = paramValue.replace( /^\[+|\]+$/g, '' );
    let filterValue = JSON.parse( sanitizedFilterValue );
    searchFolderService.getSearchFolderDefinitionIntFulltextInt_setFilterMap( filter, searchFolderFilterMap, filterValue );
    let filterName = searchFilterSvc.getCategoryDisplayName( filter );
    if( filterName === '' ) {
        filterName = filter;
    }
    searchFolderService.getSearchFolderDefinitionIntFulltext_ProcessFilterTypes( filterName, filterValue, searchFilters );
};

/**
  * get report definition for fulltext
  * @function getSearchFolderDefinitionIntFulltext
  * @param {Object}searchFolderCtx - searchFolderCtx
  * @param {Object}params - params of report definition
  * @param {Object}paramValues - paramValues of report definition
  * @param {Object}searchFolderCriteria - searchFolderCriteria
  * @param {Object}searchFolderFilterMap - searchFolderFilterMap
  * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
  */
export let getSearchFolderDefinitionIntFulltext = function( searchFolderCtx, params, paramValues, searchFolderCriteria, searchFolderFilterMap, searchFilters ) {
    let index = 0;
    let updateSearchFolderCtx = false;
    while( index < paramValues.length ) {
        let param = params[ index ];
        if( param === 'ReportSearchCriteria' ) {
            searchFolderCriteria.searchString = paramValues[ index ];
            ++index;
        } else if( param === 'ReportTranslatedSearchCriteria' ) {
            ++index;
        } else if( param === 'DefaultActiveFolder' ) {
            searchFolderCtx.defaultActiveFolder = paramValues[ index ];
            updateSearchFolderCtx = true;
            ++index;
        } else if( param === 'RecentlyModifiedType' ) {
            searchFolderCtx.recentlyModifiedType = paramValues[ index ];
            updateSearchFolderCtx = true;
            ++index;
        } else if( param === 'shapeSearchUID' ) {
            //skip this parameter as it's purely for server side execution of shapesearch. searchFolderCriteria.shapeSearchUID = paramValues[ index ];
            ++index;
        } else if( param === 'searchStringInContent' ) {
            searchFolderCriteria.searchStringInContent = paramValues[ index ];
            ++index;
        } else {
            let filter = paramValues[ index ];
            let paramValue = paramValues[ ++index ];
            searchFolderService.getSearchFolderDefinitionIntFulltextInt( filter, searchFolderCtx, paramValue, searchFolderFilterMap, searchFilters );
            ++index;
        }
    }
    if( updateSearchFolderCtx ) {
        appCtxService.updatePartialCtx( 'searchFolder', searchFolderCtx );
    }
};

/**
  * @function deleteAllProps
  * @param {Object}jsonObject - jsonObject
  */
export let deleteAllProps = function( jsonObject ) {
    for( let prop in jsonObject ) {
        if( jsonObject.hasOwnProperty( prop ) ) {
            delete jsonObject[ prop ];
        }
    }
};

/**
  * get report definition for shape search
  * @function getSearchFolderDefinitionIntShapeSearch
  * @param {Object}searchFolderCriteria - searchFolderCriteria
  */
export let getSearchFolderDefinitionIntShapeSearch = function( searchFolderCriteria ) {
    let searchString = searchFolderCriteria.searchString;
    let searchStringInContent = searchFolderCriteria.searchStringInContent;
    searchFolderService.deleteAllProps( searchFolderCriteria );
    searchFolderCriteria.searchString = searchString;
    if( searchStringInContent ) {
        searchFolderCriteria.searchStringInContent = searchStringInContent;
    }
};

/**
  * get report definition for advanced
  * @function getSearchFolderDefinitionIntAdvanced
  * @param {Object}searchFolderCtx - searchFolderCtx
  * @param {Object}params - params of report definition
  * @param {Object}paramValues - paramValues of report definition
  * @param {Object}searchFolderCriteria - searchFolderCriteria
  * @param {Object}searchCriteriaAdvPopulated - adv search attributes that actually have values
  * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
  */
export let getSearchFolderDefinitionIntAdvanced = function( searchFolderCtx, params, paramValues, searchFolderCriteria, searchCriteriaAdvPopulated, searchFilters ) {
    let index = 0;
    searchFolderCtx.savedQueryName = searchFolderCtx.props.awp0Rule.uiValues[ 0 ];
    let savedsearch_attr_names = [];
    let savedsearch_attr_values = [];
    let savedsearch_query = {};
    while( index < paramValues.length ) {
        let param = params[ index ];
        if( param === 'ReportSearchCriteria' ) {
            searchFolderCriteria.queryUID = paramValues[ index ];
            savedsearch_query.dbValue = paramValues[ index ];
            savedsearch_query.dbValues = [ paramValues[ index ] ];
            searchFolderCriteria.searchID = advancedSearchUtils.getSearchId( searchFolderCriteria.queryUID );
            ++index;
        } else if( param === 'savedQueryName' ) {
            savedsearch_query.uiValue = paramValues[ index ];
            savedsearch_query.uiValues = [ paramValues[ index ] ];
            // skip the field as we already got it from the props. searchFolderCtx.savedQueryName = paramValues[ index ];
            ++index;
        } else {
            let paramName = paramValues[ index ];
            let paramValue = paramValues[ ++index ];
            let multiValues = paramValue.split( advancedSearchUtils._delimiterForArray );
            let filterValue = '';
            if( multiValues && multiValues.length > 1 && paramValue.indexOf( searchFolderCommonService.INTERNAL_KEYWORD ) !== -1 ) {
                filterValue = searchFolderCommonService.splitInternalAndDisplayNameUsingInternalKeyword( multiValues, false );
            } else {
                let eachDisplayInternalPair2 = multiValues[ 0 ].split( searchFolderCommonService.INTERNAL_KEYWORD );
                if( eachDisplayInternalPair2 && eachDisplayInternalPair2.length > 1 ) {
                    filterValue += eachDisplayInternalPair2[ 1 ];
                } else {
                    filterValue += paramValue;
                }
            }
            searchFolderCriteria[ paramName ] = filterValue;
            searchCriteriaAdvPopulated[ paramName ] = paramValue;
            savedsearch_attr_names.push( paramName );
            savedsearch_attr_values.push( paramValue );
            searchFilters.push( paramName + '=' + paramValue );
            ++index;
        }
    }
    searchFolderCtx.savedSearchObject = {
        props: {
            savedsearch_query: savedsearch_query,
            savedsearch_attr_names: {
                dbValues: savedsearch_attr_names,
                uiValues: savedsearch_attr_names
            },
            savedsearch_attr_values: {
                dbValues: savedsearch_attr_values,
                uiValues: savedsearch_attr_values
            }
        },
        uid: searchFolderCtx.uid,
        type: 'SavedSearch'
    };
    searchFolderCtx.savedSearchObject = Awp0SaveSearchService.updateSavedSearchObjectAttributeValues( searchFolderCtx.savedSearchObject );
    searchFolderCtx.updateSavedSearchAttributeValues = false;
};

/**
  * Set Search Folder Ctx
  * @function setSearchFolderCtxForReportDefinition
  *
  * @param {Object}searchFolderCtx - searchFolderCtx
  * @param {Object}searchFolderCriteria - searchFolderCriteria
  * @param {Object}searchFolderFilterMap - searchFolderFilterMap
  * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
  * @param {BOOLEAN}isEditMode - isEditMode
  */
export let setSearchFolderCtxForReportDefinition = function( searchFolderCtx, searchFolderCriteria, searchFolderFilterMap, searchFilters, isEditMode ) {
    searchFolderCtx.searchFolderCriteria = searchFolderCriteria;
    searchFolderCtx.searchFolderFilterMap = searchFolderFilterMap;
    searchFolderCtx.isEditMode = isEditMode;
    searchFolderCtx.searchFilters = searchFilters;
    appCtxService.updateCtx( SEARCH_FOLDER, searchFolderCtx );
};

/**
  *  utility function of get report definition of search folder
  * @function processSearchFolderDefinitionInt_Fulltext
  * @param {Object}searchFolderCtx - searchFolderCtx
  * @param {Object}searchFolderCriteria - searchFolderCriteria
  * @param {Object}params - params of report definition
  * @param {Object}paramValues - paramValues of report definition
  * @param {Object}searchFolderFilterMap - searchFolderFilterMap
  * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
  */
export let processSearchFolderDefinitionInt_Fulltext = function( searchFolderCtx, searchFolderCriteria, params, paramValues, searchFolderFilterMap, searchFilters ) {
    searchFolderService.setBaseCriteriaParameters( searchFolderCriteria );
    searchFolderService.getSearchFolderDefinitionIntFulltext( searchFolderCtx, params, paramValues, searchFolderCriteria, searchFolderFilterMap, searchFilters );
    if( searchFolderCtx.isShapeSearch ) {
        searchFolderService.getSearchFolderDefinitionIntShapeSearch( searchFolderCriteria );
    }
};

/**
  *  utility function of get report definition of search folder
  * @function processSearchFolderDefinitionInt_Advanced
  * @param {Object}searchFolderCtx - searchFolderCtx
  * @param {Object}searchFolderCriteria - searchFolderCriteria
  * @param {Object}params - params of report definition
  * @param {Object}paramValues - paramValues of report definition
  * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
  */
export let processSearchFolderDefinitionInt_Advanced = function( searchFolderCtx, searchFolderCriteria, params, paramValues, searchFilters ) {
    searchFolderCriteria.typeOfSearch = 'ADVANCED_SEARCH';
    searchFolderCriteria.utcOffset = String( -1 * new Date().getTimezoneOffset() );
    searchFolderCriteria.lastEndIndex = '';
    searchFolderCriteria.totalObjectsFoundReportedToClient = '';
    let searchCriteriaAdvPopulated = {};
    searchFolderCtx.savedsearch_attr_names = {
        uiValues: [],
        dbValues: []
    };
    searchFolderCtx.savedsearch_attr_values = {
        uiValues: [],
        dbValues: []
    };
    searchFolderService.getSearchFolderDefinitionIntAdvanced( searchFolderCtx, params, paramValues, searchFolderCriteria, searchCriteriaAdvPopulated, searchFilters );
    searchFolderCtx.searchCriteriaAdvPopulated = searchCriteriaAdvPopulated;
};

/**
  * utility function of get report definition of search folder
  * @function getSearchFolderDefinitionInt
  * @param {Object}searchFolderCtx - searchFolderCtx
  * @param {Object}searchFolderCriteria - searchFolderCriteria
  * @param {Object}params - params of report definition
  * @param {Object}paramValues - paramValues of report definition
  * @param {Object}searchFolderFilterMap - searchFolderFilterMap
  * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
  */
export let getSearchFolderDefinitionInt = function( searchFolderCtx, searchFolderCriteria, params, paramValues, searchFolderFilterMap, searchFilters ) {
    if( searchFolderCtx.awp0SearchType === FULLTEXT_PROVIDER ) {
        searchFolderService.processSearchFolderDefinitionInt_Fulltext( searchFolderCtx, searchFolderCriteria, params, paramValues, searchFolderFilterMap, searchFilters );
    } else {
        searchFolderService.processSearchFolderDefinitionInt_Advanced( searchFolderCtx, searchFolderCriteria, params, paramValues, searchFilters );
    }
};

/**
  *  utility function of get report definition of search folder
  * @function getSearchFolderDefinition_procParamValues
  * @param {Object}searchCriteria0 - criteria part of the reportDefinition in active folder
  * @param {Object}searchFolderCtx - searchFolderCtx
  * @param {Object}searchFolderCriteria - searchFolderCriteria
  * @param {Object}searchFolderFilterMap - searchFolderFilterMap
  * @param {Object}searchFilters - searchFilters, for display, not to be stored in report definition.
  */
export let getSearchFolderDefinition_procParamValues = function( searchCriteria0, searchFolderCtx, searchFolderCriteria, searchFolderFilterMap, searchFilters ) {
    let params = searchCriteria0.props.rd_parameters.dbValues;
    let paramValues = searchCriteria0.props.rd_param_values.dbValues;
    if( paramValues && paramValues.length > 0 ) {
        searchFolderService.getSearchFolderDefinitionInt( searchFolderCtx, searchFolderCriteria, params, paramValues, searchFolderFilterMap, searchFilters );
    }
};

/**
  * get report definition of search folder
  * @function getSearchFolderDefinition
  * @param {Object}searchFolderCtx - searchFolderCtx
  * @param {BOOLEAN}isEditMode - isEditMode
  */
export let getSearchFolderDefinition = function( searchFolderCtx, isEditMode ) {
    let searchFolderCriteria = {};
    let searchFolderFilterMap = {};
    let searchFilters = [];
    let searchDefinition0Id = searchFolderCtx.props.awp0SearchDefinition.dbValues[ 0 ];
    let searchCriteria0 = clientDataModel.getObject( searchDefinition0Id );
    if( searchCriteria0.props.rd_param_values ) {
        searchFolderService.getSearchFolderDefinition_procParamValues( searchCriteria0, searchFolderCtx, searchFolderCriteria, searchFolderFilterMap, searchFilters );
    }
    searchFolderService.setSearchFolderCtxForReportDefinition( searchFolderCtx, searchFolderCriteria, searchFolderFilterMap, searchFilters, isEditMode );
};

/**
  * Utility function - Get Search Folder
  * @function getSearchFolderInt_procKnownType
  * @param {Object}searchFolderCtx - searchFolderCtx
  */
export let getSearchFolderInt_procKnownType = function( searchFolderCtx ) {
    let awp0SearchType = searchFolderCtx.props.awp0SearchType;
    if( awp0SearchType && awp0SearchType.dbValues[ 0 ] === '1' || awp0SearchType && awp0SearchType.dbValues[ 0 ] === '3' ) {
        searchFolderCtx.awp0SearchType = FULLTEXT_PROVIDER;
    } else if( awp0SearchType && awp0SearchType.dbValues[ 0 ] === '2' ) {
        searchFolderCtx.awp0SearchType = ADVANCED_PROVIDER;
    } else {
        searchFolderCtx.awp0SearchType = UNKNOWN;
    }
    searchFolderService.getSearchFolderDefinition( searchFolderCtx, searchFolderCtx.isEditMode );
};

/**
  * Utility function - Get Search Folder
  * @function getSearchFolderInt
  * @param {Object}awp0SearchDefinition - report definition object
  * @param {Object}searchFolderCtx - searchFolderCtx
  */
export let getSearchFolderInt = function( awp0SearchDefinition, searchFolderCtx ) {
    if( awp0SearchDefinition && awp0SearchDefinition.dbValues && awp0SearchDefinition.dbValues[ 0 ] ) {
        searchFolderService.getSearchFolderInt_procKnownType( searchFolderCtx );
    } else {
        searchFolderCtx.awp0SearchType = UNKNOWN;
    }
};

/**
  * Get Search Folder
  * @function getSearchFolder
  *
  * @param {Object}uidFolder - uid of Active Folder
  * @return {Object} searchFolderCtx
  */
export let getSearchFolder = function( uidFolder ) {
    let searchFolderCtx = viewModelObjectService.createViewModelObject( uidFolder, 'SpecialEdit' );
    let awp0SearchDefinition = searchFolderCtx.props.awp0SearchDefinition;
    searchFolderService.getSearchFolderInt( awp0SearchDefinition, searchFolderCtx );
    searchFolderCtx.props.object_name.isRequired = searchFolderCtx.isEditMode;
    return searchFolderCtx;
};

/**
  * Get Search Folder Criteria
  * @function getSearchDefinitionCriteria
  *
  * @param {Object}searchFolder - searchFolder
  * @return {Object} search criteria
  */
export let getSearchDefinitionCriteria = function( searchFolder ) {
    if( searchFolder.awp0SearchType === FULLTEXT_PROVIDER || searchFolder.awp0SearchType === 'ShapeSearchProvider' ) {
        return searchFolder.searchFolderCriteria;
    } else if( searchFolder.awp0SearchType === ADVANCED_PROVIDER ) {
        return searchFolder.advancedSearchCriteria;
    }
};

/**
  * Get Search Folder filter map
  * @function getSearchDefinitionFilterMap
  *
  * @param {Object}searchFolder - searchFolder
  * @return {Object} search filter map
  */
export let getSearchDefinitionFilterMap = function( searchFolder ) {
    return searchFolder.searchFolderFilterMap;
};

/**
  *  utility function of set initial edit mode
  * @function setInitialEditModeInt
  *
  * @param {Object}data - view model data
  * @param {Object} searchFolderObject - model object of active folder
  */
export let setInitialEditModeInt = function( data, searchFolderObject ) {
    let searchFolderCtx = searchFolderService.getSearchFolder( searchFolderObject.uid );
    searchFolderCtx.onRulePage = true;
    searchFolderCtx.isEditMode = false;
    if( searchFolderCtx.awp0SearchType === UNKNOWN ) {
        searchFolderCtx.useRule = NEW_RULE;
    } else {
        searchFolderCtx.useRule = CURRENT_RULE;
    }
    return searchFolderCtx;
};

/**
  *  utility function of get full properties of active folder
  * @function getFolderFullProperties
  * @param {STRING}searchDefinitionId - report definition id
  * @param {Object}data - view model data
  * @param {Object} searchFolderObject - model object of active folder
  */
export let getFolderFullPropertiesInt = function( searchDefinitionId, data, searchFolderObject ) {
    let searchDefinitionObject = clientDataModel.getObject( searchDefinitionId );
    if( !searchDefinitionObject.props.rd_parameters ) {
        let getPropertiesInput = {
            objects: [ searchDefinitionObject ],
            attributes: [ 'rd_parameters', 'rd_param_values', 'rd_source' ]
        };
        return soaService.post( 'Core-2006-03-DataManagement', 'getProperties', getPropertiesInput ).then( function() {
            let searchDefinitionObject2 = clientDataModel.getObject( searchDefinitionId );
            if( searchDefinitionObject2.props.rd_source.dbValues[ 0 ] === 'AdvancedSearch' ) {
                let getPropertiesInput2 = {
                    objects: [ { type: 'SavedQueryCriteria', uid: searchDefinitionObject2.props.rd_param_values.dbValues[ 0 ] } ],
                    attributes: [ 'fnd0AttributeDisplayValues' ]
                };
                return soaService.post( 'Core-2006-03-DataManagement', 'getProperties', getPropertiesInput2 ).then( function() {
                    return searchFolderService.setInitialEditModeInt( data, searchFolderObject );
                } );
            }
            return searchFolderService.setInitialEditModeInt( data, searchFolderObject );
        } );
    }
    return searchFolderService.setInitialEditModeInt( data, searchFolderObject );
};

/**
  * get full properties of active folder
  * @function getFolderFullProperties
  *
  * @param {Object}data - view model data
  * @param {Object} searchFolderObject - model object of active folder
  */
export let getFolderFullProperties = function( data, searchFolderObject ) {
    let searchDefinitionId = searchFolderObject.props.awp0SearchDefinition.dbValues[ 0 ];
    if( searchDefinitionId ) {
        return searchFolderService.getFolderFullPropertiesInt( searchDefinitionId, data, searchFolderObject );
    }
    return searchFolderService.setInitialEditModeInt( data, searchFolderObject );
};

/**
  * set initial edit mode
  * @function setInitialEditMode
  *
  * @param {Object}data - view model data
  * @param {Object}uidFolder - uid of Active Folder
  */
export let setInitialEditMode = function( data, searchFolderSelected ) {
    let searchFolderObject = clientDataModel.getObject( searchFolderSelected.uid );
    if( !searchFolderObject.props.awp0SearchDefinition ) {
        //if certain view mode does not bring in awp0SearchDefinition property, we need to go fetch it
        let getPropertiesInput = {
            objects: [ searchFolderObject ],
            attributes: [ 'awp0SearchDefinition', 'awp0SearchType', 'awp0CanExecuteSearch', 'awp0Rule' ]
        };
        return soaService.post( 'Core-2006-03-DataManagement', 'getProperties', getPropertiesInput ).then( function() {
            return searchFolderService.getFolderFullProperties( data, searchFolderObject );
        } );
    }
    return searchFolderService.getFolderFullProperties( data, searchFolderObject );
};

export let updateState = function( searchFolderSelected, searchFolder ) {
    let newSearchState = {};
    let criteria = searchFolderSelected.searchFolderCriteria;
    if( searchFolderSelected.awp0SearchType === UNKNOWN ) {
        newSearchState = { ...searchFolderSelected };
    } else if( searchFolderSelected.awp0SearchType === FULLTEXT_PROVIDER ) {
        searchFolderService.setBaseCriteriaParameters( criteria );
        let searchContext = {
            showChartColorBars: false,
            bulkFiltering: true,
            criteria: criteria,
            provider: 'Awp0FullTextSearchProvider',
            sortType: 'Priority'
        };
        let updatedSearchContext = searchStateHelperService.constructBaseSearchCriteria( searchContext );
        newSearchState = { ...updatedSearchContext, ...searchFolderSelected };
        newSearchState.criteria = searchFolderSelected.searchFolderCriteria;

        let activeFiltersInfo = searchCommonUtils.createActiveFiltersFromActiveFilterMap( newSearchState.searchFolderFilterMap );
        newSearchState.filterString = activeFiltersInfo.filterString;
        newSearchState.activeFilters = activeFiltersInfo.activeFilters;
        newSearchState.activeFilterMap = activeFiltersInfo.activeFilterMap;
    } else if( searchFolderSelected.awp0SearchType === ADVANCED_PROVIDER ) {
        newSearchState = { ...searchFolderSelected };
        newSearchState.awp0SearchType = ADVANCED_PROVIDER;
        newSearchState.criteria = searchFolderSelected.searchFolderCriteria;
        newSearchState.activeFilterMap = searchFolderSelected.searchFolderFilterMap;
        newSearchState.referencingSavedQuery = searchFolderSelected.savedQueryName;
        newSearchState.advancedSearchCriteria = searchFolderSelected.searchFolderCriteria;
        newSearchState.advancedSearchJSONString = JSON.stringify( searchFolderSelected.searchFolderCriteria );
        newSearchState.showIntermediateResultCount = true;
        newSearchState.WSOMFindSetSearchLimit = advancedSearchUtils.getWSOMFindSetSearchLimit();
    }
    newSearchState.showLoadingText = true;
    return Object.assign( { ...searchFolder, ...newSearchState } );
};

/**
  * set non-edit mode
  * @function setNonEditMode
  *
  * @param {Object}data - view model data
  * @param {Object}searchFolderCtx - searchFolderCtx
  */
export let setNonEditMode = function( data, searchFolderCtx ) {
    searchFolderCtx.onRulePage = true;
    searchFolderCtx.isEditMode = false;
    searchFolderCtx.useRule = CURRENT_RULE;
    searchFolderCtx.isDirty = false;
};

/**
  * set non-edit mode
  * @function setExitEditMode
  *
  * @param {Object}searchFolder - searchFolder
  */
export let setExitEditMode = function( searchFolder ) {
    if( searchFolder.isEditMode === false ) {
        let newSearchFolder = searchFolderService.getSearchFolder( searchFolder.uid );
        newSearchFolder.onRulePage = true;
        newSearchFolder.isEditMode = false;
        searchFolder.update( newSearchFolder );
    }
};

/**
  * editSearchFolderRule
  * @function editSearchFolderRule
  *
  * @param {Object}searchFolder - searchFolder
  */
export let editSearchFolderRule = function( searchFolder ) {
    const newSearchFolder = { ...searchFolder.value };
    newSearchFolder.isEditMode = true;
    newSearchFolder.props.object_name.isRequired = true;
    if( newSearchFolder.awp0SearchType === UNKNOWN ) {
        newSearchFolder.useRule = NEW_RULE;
    } else {
        newSearchFolder.useRule = CURRENT_RULE;
    }
    searchFolder.update( newSearchFolder );
};

/**
  * getAdvancedSearchViewModelFromServer
  * @function getAdvancedSearchViewModelFromServer
  * @param {Object}data - data
  */
export let getAdvancedSearchViewModelFromServer = function( data ) {
    data.awp0AdvancedQueryName = {};
    data.isAdvancedSearchSupported = {
        dbValue: true
    };
    let request = {};
    soaService.postUnchecked( 'Internal-AWS2-2016-12-AdvancedSearch', 'createAdvancedSearchInput', request )
        .then(
            function( response ) {
                advancedSearchSvc.getAdvancedSearchViewModelFromCache( response.advancedSearchInput, data );
                preferredAdvancedSearchService.setPreferredSearchesVisibilityCtx();
            } ).then(
            function() {
                if( AwStateService.instance.params.savedQueryName ) {
                    advancedSearchSvc.getAdvancedSearchViewModelFromURL( data );
                }
            } );
};

/**
  * reset advanced search mode
  * @function resetAdvancedSearch
  * @param {Object}data - view model data
  */
export let resetAdvancedSearch = function( data ) {
    data.isAdvancedSearch.dbValue = false;
};

/**
  * set rule type
  * @function initRuleType
  * @param {Object}data - view model data
  * @param {Object}searchFolder - searchFolder
  */
export let initRuleType = function( ruleType, searchFolder ) {
    let updatedRuleType = _.cloneDeep( ruleType );
    if( searchFolder.useRule === CURRENT_RULE ) {
        updatedRuleType.dbValue = searchFolder.ruleType;
        if( searchFolder.awp0SearchType === ADVANCED_PROVIDER ) {
            updatedRuleType.dbValue = ADVANCED_PROVIDER;
        } else if( searchFolder.awp0SearchType === FULLTEXT_PROVIDER ) {
            updatedRuleType.dbValue = FULLTEXT_PROVIDER;
        } else {
            updatedRuleType.dbValue = 'saved';
        }
        // searchFolder.update( searchFolder );
    } else {
        updatedRuleType.dbValue = FULLTEXT_PROVIDER;
        const newSearchFolder = { ...searchFolder.value };
        newSearchFolder.awp0SearchType = FULLTEXT_PROVIDER;
        searchFolder.update( newSearchFolder );
    }
    return updatedRuleType;
};

/**
  * set rule type
  * @function setRuleType
  * @param {Object}data - view model data
  * @param {Object}searchFolder - searchFolder
  */
export let setRuleType = function( ruleType, searchFolder ) {
    const newSearchFolder = { ...searchFolder.value };
    if( ruleType.dbValue === ADVANCED_PROVIDER ) {
        newSearchFolder.awp0SearchType = ADVANCED_PROVIDER;
        newSearchFolder.useRule = NEW_RULE;
    } else if( ruleType.dbValue === FULLTEXT_PROVIDER ) {
        newSearchFolder.awp0SearchType = FULLTEXT_PROVIDER;
        newSearchFolder.useRule = NEW_RULE;
    } else {
        newSearchFolder.awp0SearchType = UNKNOWN;
        newSearchFolder.useRule = SAVED_SEARCH;
    }
    searchFolder.update( newSearchFolder );
};

/**
  * do fulltext search
  * @function doFulltextSearch
  * @param {Object}data - view model data
  * @param {Object}searchFolder - searchFolder
  */
export let doFulltextSearch = function( data, searchFolder ) {
    let newSearchFolder = { ...searchFolder.value };
    if( newSearchFolder.awp0SearchType === UNKNOWN ) {
        newSearchFolder.useRule = NEW_RULE;
    }
    newSearchFolder.awp0SearchType = FULLTEXT_PROVIDER;
    //here it's searchCriteria, not searchFolderCriteira.
    if( newSearchFolder.useRule === NEW_RULE ) {
        newSearchFolder.criteria = {
            searchString: data.searchBox.dbValue
        };
    }
    if( data.searchBox.dbValue ) {
        newSearchFolder.criteria.searchString = data.searchBox.dbValue;
    }
    searchFolderService.setBaseCriteriaParameters( newSearchFolder.criteria );
    let searchContext = {
        showChartColorBars: false,
        bulkFiltering: true,
        criteria: newSearchFolder.criteria,
        provider: 'Awp0FullTextSearchProvider',
        sortType: 'Priority'
    };
    let updatedSearchContext = searchStateHelperService.constructBaseSearchCriteria( searchContext );
    newSearchFolder = { ...updatedSearchContext, ...newSearchFolder };
    newSearchFolder.isEditMode = true;
    newSearchFolder.isDirty = true;
    newSearchFolder.criteriaJSONString = JSON.stringify( newSearchFolder.criteria );
    searchFolder.update( newSearchFolder );
};

export let setBaseCriteriaParameters = function( searchCriteria ) {
    searchCriteria.forceThreshold = 'true';
    searchCriteria.searchFromLocation = 'addPanel';
    searchCriteria.dcpSortByDataProvider = 'true';
    searchCriteria.getGroupedCategories = 'true';
};

/**
  * cancel edits on the active folder rule editing page
  * @function cancelEditSearchFolderRule
  *
  * @param {Object}searchFolderCtx - searchFolderCtx
  */
export let cancelEditSearchFolderRule = function( searchFolder ) {
    const newSearchFolder = searchFolderService.getSearchFolder( searchFolder.uid );
    newSearchFolder.isEditMode = false;
    newSearchFolder.isRuleDirty = false;
    newSearchFolder.onRulePage = true;
    newSearchFolder.useRule = CURRENT_RULE;
    searchFolder.update( newSearchFolder );
};

export let setSearchFolderRuleDirty = function( searchFolder ) {
    if( !searchFolder.isRuleDirty && ( searchFolder.searchFolderCriteria !== searchFolder.criteria || searchFolder.searchFolderFilterMap !== searchFolder.activeFilterMap ) ) {
        const newSearchFolder = { ...searchFolder.value };
        newSearchFolder.isRuleDirty = true;
        searchFolder.update( newSearchFolder );
    }
};

/**
  * save the rule and props for active folder
  * @function saveSearchFolderRule
  * @param {Object}searchFolderCtx - searchFolderCtx
  */
export let saveSearchFolderRule = function( searchFolderCtx ) {
    eventBus.publish( 'searchFolder.save' );
};
/**
  * @function updateNonEditState
  * @param {Object}searchFolder - view model data
  * @param {Object}newSearchFolder - search folder atomic data object
  * @param {Object}translatedSearchString - translated search string in case of property specific search
  */
export let updateNonEditState = ( searchFolder, newSearchFolder, translatedSearchString ) => {
    let criteria = newSearchFolder.searchFolderCriteria;
    if( newSearchFolder.awp0SearchType === UNKNOWN ) {
        //no op
    } else if( newSearchFolder.awp0SearchType === FULLTEXT_PROVIDER ) {
        searchFolderService.setBaseCriteriaParameters( criteria );
        let searchContext = {
            showChartColorBars: false,
            bulkFiltering: true,
            criteria: criteria,
            provider: 'Awp0FullTextSearchProvider',
            sortType: 'Priority'
        };
        let updatedSearchContext = searchStateHelperService.constructBaseSearchCriteria( searchContext );
        newSearchFolder = { ...updatedSearchContext, ...newSearchFolder };
        newSearchFolder.criteria = newSearchFolder.searchFolderCriteria;
        newSearchFolder.criteria.searchString = translatedSearchString.length > 0 ? translatedSearchString : newSearchFolder.criteria.searchString;
        newSearchFolder.criteriaJSONString = JSON.stringify( newSearchFolder.criteria );
        if( !newSearchFolder.activeFilterMap && !newSearchFolder.activeFilters && !newSearchFolder.filterString ) {
            let activeFilterMap = newSearchFolder.searchFolderFilterMap;
            let activeFiltersInfo = searchCommonUtils.createActiveFiltersFromActiveFilterMap( activeFilterMap );
            newSearchFolder.filterString = activeFiltersInfo.filterString;
            newSearchFolder.activeFilters = activeFiltersInfo.activeFilters;
            newSearchFolder.activeFilterMap = activeFiltersInfo.activeFilterMap;
        }
        newSearchFolder.getSearchSettingsSOACallFinished = true;
    } else if( searchFolder.awp0SearchType === ADVANCED_PROVIDER ) {
        newSearchFolder.criteria = newSearchFolder.searchFolderCriteria;
        newSearchFolder.activeFilterMap = newSearchFolder.searchFolderFilterMap;
        newSearchFolder.referencingSavedQuery = newSearchFolder.savedQueryName;
        newSearchFolder.advancedSearchCriteria = newSearchFolder.searchFolderCriteria;
    }
    searchFolder.update( newSearchFolder );
};
/**
  * update the display for criteria and filters
  * @function updateCriteriaAndFilters
  *
  * @param {Object}data - view model data
  * @param {STRING}uidFolder - uid of active folder
  */
export let updateCriteriaAndFilters = function( data, searchFolderCtx ) {
    if( !searchFolderCtx.uid ) {
        return;
    }
    let newSearchFolder = { ...searchFolderCtx.value };
    const updatedSearchFolder = searchFolderService.getSearchFolder( searchFolderCtx.uid );
    newSearchFolder = { ...newSearchFolder, ...updatedSearchFolder };
    newSearchFolder.isEditMode = false;

    newSearchFolder.onRulePage = true;
    newSearchFolder.useRule = CURRENT_RULE;
    if( searchFolderCtx.isRuleDirty ) {
        newSearchFolder.isRuleDirty = false;
        data.updatePrimaryWorkarea = true;
    } else {
        data.updatePrimaryWorkarea = false;
        if( searchFolderCtx.awp0SearchType === ADVANCED_PROVIDER && searchFolderCtx.props ) {
            let uiValues = searchFolderCtx.props.awp0Rule.uiValues;
            data.searchFolderCriteria.uiValue = uiValues[ 0 ];
            let filterString = searchFolderCommonService.processAttributes( uiValues );
            data.searchFolderFilters.uiValue = filterString ? _.join( filterString, '\n' ) : '';
        } else if( searchFolderCtx.awp0SearchType === FULLTEXT_PROVIDER && searchFolderCtx.searchFolderCriteria ) {
            if( searchFolderCtx.searchFolderCriteria.searchStringInContent ) {
                data.searchFolderCriteria.uiValue = searchFolderCtx.searchFolderCriteria.searchString + ', ' + searchFolderCtx.searchFolderCriteria.searchStringInContent;
            } else {
                data.searchFolderCriteria.uiValue = searchFolderCtx.searchFolderCriteria.searchString;
            }
            let searchFiltersFromRule = _.clone( searchFolderCtx.props.awp0Rule.uiValues );
            searchFiltersFromRule = searchFiltersFromRule.slice( 1, searchFiltersFromRule.length );
            data.searchFolderFilters.uiValue = searchFiltersFromRule ? _.join( searchFiltersFromRule, '\n' ) : '';
        }
    }
    searchFolderService.updateNonEditState( searchFolderCtx, newSearchFolder, data.translatedSearchString );
    return data;
};
/**
  * updatePanelForSelectedSavedShapeSearch
  *
  * @function updatePanelForSelectedSavedShapeSearch
  * @param {ViewModelProperty} prop - prop
  * @param {ViewModel} searchFolderCtx - Advanced Saved search object
  * @param {Object} searchFolderFilterMap - searchFolderFilterMap
  */
export let updatePanelForSelectedSavedShapeSearch = function( prop, searchFolderCtx, searchFolderFilterMap ) {
    searchFolderCtx.isShapeSearch = true;
    let shapeSearchCriteria = shapeSearchService.getSearchCriteriaForShapeSearch( searchFolderFilterMap );
    searchFolderCtx.searchFolderCriteria = shapeSearchCriteria;
    let searchContext = {
        activeFilterMap: {},
        activeFilters: []
    };
    searchFilterSvc.buildSearchFiltersInt( searchContext, searchFolderFilterMap );
    shapeSearchService.updateFilterMapForShapeSearch( searchContext.activeFilterMap );
    searchFolderCtx.searchFolderFilterMap = searchContext.activeFilterMap;
};

/**
  * updatePanelForSelectedFulltextSavedSearch
  *
  * @function updatePanelForSelectedFulltextSavedSearch
  * @param {ViewModelProperty} prop - prop
  * @param {ViewModel} vmo - vmo
  * @param {ViewModel} searchFolderCtx - Advanced Saved search object
  */
export let updatePanelForSelectedFulltextSavedSearch = function( prop, vmo, searchFolderCtx ) {
    searchFolderCtx.savedSearchId = prop.dbValue;
    searchFolderCtx.awp0SearchType = FULLTEXT_PROVIDER;
    searchFolderService.setBaseCriteriaParameters( searchFolderCtx.searchFolderCriteria );
    searchFolderCtx.searchFolderCriteria.searchString = vmo.props.awp0search_string.dbValue;
    let searchFolderFilterMap = saveSearchUtils.getFilterMap( vmo );
    if( searchFolderFilterMap && searchFolderFilterMap.ShapeSearchProvider ) {
        searchFolderService.updatePanelForSelectedSavedShapeSearch( prop, searchFolderCtx, searchFolderFilterMap );
    } else {
        let searchContext = {
            activeFilterMap: {},
            activeFilters: []
        };
        searchFilterSvc.buildSearchFiltersInt( searchContext, searchFolderFilterMap );
        searchFolderCtx.searchFolderFilterMap = searchContext.activeFilterMap;
    }
    searchFolderCtx.isDirty = true;
    eventBus.publish( RULE_CHANGED_EVENT );
};

/**
  * updatePanelForSelectedAdvancedSavedSearch
  *
  * @function updatePanelForSelectedAdvancedSavedSearch
  * @param {ViewModelProperty} prop - prop
  * @param {ViewModel} vmo - vmo
  * @param {ViewModel} searchFolderCtx - Advanced Saved search object
  */
export let updatePanelForSelectedAdvancedSavedSearch = function( prop, vmo, searchFolderCtx ) {
    searchFolderCtx.awp0SearchType = ADVANCED_PROVIDER;
    let searchFolderCriteria = {
        typeOfSearch: 'ADVANCED_SEARCH',
        utcOffset: String( -1 * new Date().getTimezoneOffset() ),
        lastEndIndex: '',
        totalObjectsFoundReportedToClient: ''
    };
    searchFolderCtx.savedsearch_attr_names = {
        uiValues: [],
        dbValues: []
    };
    searchFolderCtx.savedsearch_attr_values = {
        uiValues: [],
        dbValues: []
    };

    searchFolderCriteria.queryUID = vmo.props.savedsearch_query.dbValue;
    let eventData = {};
    if( searchFolderCtx.savedSearchId && searchFolderCtx.savedSearchId !== prop.dbValue ) {
        eventData.forceRefresh = true;
    } else {
        searchFolderCtx.savedSearchId = prop.dbValue;
    }

    searchFolderCriteria.searchID = advancedSearchUtils.getSearchId( searchFolderCriteria.queryUID );
    let savedQueryCriteriaUID = vmo.props.saved_search_criteria.dbValues[ 0 ];
    let savedQueryCriteriaObject = clientDataModel.getObject( savedQueryCriteriaUID );
    let savedSearchAttributeDisplayValues = savedQueryCriteriaObject.props.fnd0AttributeDisplayValues.dbValues;
    vmo.props.savedsearch_attr_values.uiValues = savedSearchAttributeDisplayValues;

    for( let i = 0; i < vmo.props.savedsearch_attr_names.dbValues.length; i++ ) {
        searchFolderCriteria[ vmo.props.savedsearch_attr_names.dbValues[ i ] ] = vmo.props.savedsearch_attr_values.dbValues[ i ];
        searchFolderCtx.savedsearch_attr_names.uiValues.push( vmo.props.savedsearch_attr_names.uiValues[ i ] );
        searchFolderCtx.savedsearch_attr_names.dbValues.push( vmo.props.savedsearch_attr_names.dbValues[ i ] );
        searchFolderCtx.savedsearch_attr_values.uiValues.push( vmo.props.savedsearch_attr_values.uiValues[ i ] );
        searchFolderCtx.savedsearch_attr_values.dbValues.push( vmo.props.savedsearch_attr_values.dbValues[ i ] );
        searchFolderCtx.searchFilters += vmo.props.savedsearch_attr_names.uiValues[ i ] + '=' + vmo.props.savedsearch_attr_values.uiValues[ i ] + ';';
    }
    searchFolderCtx.savedQueryName = vmo.props.savedsearch_query.uiValue;
    searchFolderCtx.searchFolderCriteria = searchFolderCriteria;
    searchFolderCtx.searchFolderFilterMap = {};
    eventBus.publish( 'searchFolder.revealAdvancedSearchPanel', eventData );
};

/**
  * updatePanelForSelectedSavedSearch
  *
  * @function updatePanelForSelectedSavedSearch
  * @param {ViewModelProperty} prop - prop
  * @return {Function} call back function
  */
export let updatePanelForSelectedSavedSearch = function( prop ) {
    return function() {
        let searchFolderCtx = appCtxService.getCtx( SEARCH_FOLDER );
        searchFolderCtx.useRule = SAVED_SEARCH;
        if( !( prop && prop.dbValue ) ) {
            return;
        }
        let vmo = viewModelObjectService.createViewModelObject( prop.dbValue, 'SpecialEdit' );
        if( vmo.type === 'Awp0FullTextSavedSearch' ) {
            searchFolderService.updatePanelForSelectedFulltextSavedSearch( prop, vmo, searchFolderCtx );
        } else {
            searchFolderService.updatePanelForSelectedAdvancedSavedSearch( prop, vmo, searchFolderCtx );
        }
    };
};

/**
  * getQueryParametersMap
  *
  * @function getQueryParametersMap
  * @param {Object} savedSearchObject savedSearchObject - the selected saved search object
  * @return {Object} queryParametersMap - a map containing saved query parameters
  */
export let getQueryParametersMap = function( savedSearchObject ) {
    let queryParametersMap = {};
    let savedSearchAttributeNames = savedSearchObject.props.savedsearch_attr_names.uiValues;
    let savedsearch_attr_values = savedSearchObject.props.savedsearch_attr_values.uiValues;

    for( let j = 0; j < savedSearchAttributeNames.length; j++ ) {
        let key = savedSearchAttributeNames[ j ];
        let value = savedsearch_attr_values[ j ];
        let multipleValues = value.split( advancedSearchUtils._delimiterForArray );
        let filterValue = '';
        if( multipleValues && multipleValues.length > 0 && value.indexOf( searchFolderCommonService.INTERNAL_KEYWORD ) !== -1 ) {
            filterValue = searchFolderCommonService.splitInternalAndDisplayNameUsingInternalKeyword( multipleValues, true );
            queryParametersMap[ key ] = filterValue;
        } else {
            queryParametersMap[ key ] = value;
        }
    }
    return queryParametersMap;
};

/**
  * doAdvancedSearch
  *
  * @function doAdvancedSearch
  * @param {String} data the view model data
  * @param {BOOLEAN} forceRefresh - force refresh
  */
export let doAdvancedSearch = function( data, forceRefresh ) {
    advancedSearchSvc.doAdvancedSearch( data, true );
    let searchFolderCtx = appCtxService.getCtx( SEARCH_FOLDER );

    searchFolderCtx.awp0AdvancedQueryName = data.awp0AdvancedQueryName;
    searchFolderCtx.awp0AdvancedQueryAttributes = data.awp0AdvancedQueryAttributes;
    searchFolderCtx.searchFolderCriteria = data.criteria;
    if( forceRefresh ) {
        searchFolderCtx.isDirty = true;
        eventBus.publish( RULE_CHANGED_EVENT );
    }
};

/**
  * Utility function of populateAdvSearchPanel
  *
  * @function populateAdvSearchPanelInt
  * @param {Object} data - view model data
  * @param {BOOLEAN} doExecute - actually perform the search
  * @param {BOOLEAN} forceRefresh - force refresh,
  * @param {Object} response - SOA response object
  */
export let populateAdvSearchPanelInt = function( data, doExecute, forceRefresh, response ) {
    if( data.awp0AdvancedQueryName.dbValues ) {
        //The following line needs to be replaced most likely with updateAttributesAdvSavedSearch
        //advancedSearchSvc.getReviewAndExecuteViewModel(data, response);
        if( doExecute ) {
            searchFolderService.doAdvancedSearch( data, forceRefresh );
        }
    }
};

/**
  * populateAdvSearchPanel
  *
  * @function populateAdvSearchPanel
  * @param {ViewModel} savedSearchObject - Advanced Saved search object
  * @param {Object} data - view model data
  * @param {BOOLEAN} doExecute - actually perform the search
  * @param {BOOLEAN} forceRefresh - force refresh
  */
export let populateAdvSearchPanel = function( savedSearchObject, data, doExecute, forceRefresh ) {
    data.awp0AdvancedQueryName = savedSearchObject.props.savedsearch_query;
    data.awp0AdvancedQueryName.propertyName = 'awp0AdvancedQueryName';
    data.awp0AdvancedQueryName.isEnabled = true;
    data.awp0QuickSearchName = {};
    data.awp0AdvancedQueryAttributes = {};

    let request = {
        selectedQuery: {
            uid: savedSearchObject.props.savedsearch_query.dbValues[ 0 ],
            type: 'ImanQuery'
        }
    };
    soaService.post( 'Internal-AWS2-2016-12-AdvancedSearch', 'getSelectedQueryCriteria', request ).then(
        function( response ) {
            let modelObject = clientDataModel.getObject( response.advancedQueryCriteria.uid );
            let props = advancedSearchSvc.getRealProperties( modelObject, null, null, 'Advanced' );

            let savedSearchCriteria = '';
            for( let i = 0; i < savedSearchObject.props.savedsearch_attr_names.dbValues.length; i++ ) {
                try {
                    savedSearchObject.props.savedsearch_attr_names.uiValues[ i ] = props[ savedSearchObject.props.savedsearch_attr_names.dbValues[ i ] ].propertyDescriptor.displayName;
                    savedSearchCriteria = savedSearchCriteria + savedSearchObject.props.savedsearch_attr_names.uiValues[ i ] + '=' +
                         savedSearchObject.props.savedsearch_attr_values.uiValues[ i ] + ';';
                } catch ( e ) {
                    logger.info( savedSearchObject.props.savedsearch_attr_names.dbValues[ i ] +
                         ' attribute does not exist in the list of attributes defined for the ' +
                         savedSearchObject.props.savedsearch_query.uiValues[ 0 ] + ' saved query' );
                }
            }
            data.awp0AdvancedQueryAttributesPopulated = searchFolderService.getQueryParametersMap( savedSearchObject );
            searchFolderService.populateAdvSearchPanelInt( data, doExecute, forceRefresh, response );
        } );
};

/**
  * updateSavedAdvSearchContextForSearchFolder
  *
  * @function updateSavedAdvSearchContextForSearchFolder
  * @param {OBJECT} searchFolderCtx - searchFolderCtx
  * @param {Object} data - view model data
  * @param {BOOLEAN} doExecute - actually perform the search
  * @param {BOOLEAN} forceRefresh - force refresh
  */
export let updateSavedAdvSearchContextForSearchFolder = function( searchFolderCtx, data, doExecute, forceRefresh ) {
    let propertyName = 'awp0AdvancedQueryName';
    let dataType = 'STRING';
    let dbValue = searchFolderCtx.searchFolderCriteria.queryUID;
    let displayValuesIn = [ searchFolderCtx.savedQueryName ];
    if( dbValue ) {
        let queryProp = uwPropertyService.createViewModelProperty( propertyName, searchFolderCtx.savedQueryName, dataType, dbValue, displayValuesIn );
        queryProp.dbValues = [ queryProp.dbValue ];
        queryProp.uiValues = [ queryProp.uiValue ];
        let savedSearchObject = {
            props: {
                savedsearch_query: queryProp,
                savedsearch_attr_names: searchFolderCtx.savedsearch_attr_names,
                savedsearch_attr_values: searchFolderCtx.savedsearch_attr_values
            }
        };
        searchFolderService.populateAdvSearchPanel( savedSearchObject, data, doExecute, forceRefresh );
    }
};

/**
  * updateAdvancedSearchContextForSearchFolder
  *
  * @function updateAdvancedSearchContextForSearchFolder
  * @param {ViewModel} searchFolderCtx - Advanced Saved search object
  * @param {Object} data - view model data
  */
export let updateAdvancedSearchContextForSearchFolder = function( searchFolderCtx, data ) {
    if( searchFolderCtx.useRule === NEW_RULE ) {
        eventBus.publish( 'loadSavedQueryViewModel' );
    } else if( searchFolderCtx.useRule === CURRENT_RULE ) {
        eventBus.publish( 'loadSavedSearchViewModel' );
        searchFolderService.updateSavedAdvSearchContextForSearchFolder( searchFolderCtx, data );
    } else if( searchFolderCtx.useRule === SAVED_SEARCH ) {
        if( data.eventData && data.eventData.forceRefresh ) {
            searchFolderService.updateSavedAdvSearchContextForSearchFolder( searchFolderCtx, data, true, true );
        } else {
            searchFolderService.updateSavedAdvSearchContextForSearchFolder( searchFolderCtx, data, true );
        }
    }
};

/**
  * update context for fulltext saved search
  * @function updateSavedFullTextSearchContextForSearchFolder
  *
  * @param {Object}searchFolderCtx - searchFolderCtx
  */
export let updateSavedFullTextSearchContextForSearchFolder = function( searchFolderCtx ) {
    //no op for now.
};

/**
  * reroute for selected saved search based on its type
  * @function updateSavedSearchContextForSearchFolder
  *
  * @param {Object}searchFolderCtx - searchFolderCtx
  * @param {Object}data - view model data
  */
export let updateSavedSearchContextForSearchFolder = function( searchFolderCtx, data ) {
    if( searchFolderCtx.awp0SearchType === FULLTEXT_PROVIDER ) {
        // if the saved search object type is Full Text Saved Search
        searchFolderService.updateSavedFullTextSearchContextForSearchFolder( searchFolderCtx );
    } else if( searchFolderCtx.awp0SearchType === ADVANCED_PROVIDER ) {
        // if the saved search object type is Advanced Saved Search
        searchFolderCtx.useRule = SAVED_SEARCH;
        searchFolderCtx.awp0SearchType = ADVANCED_PROVIDER;
        searchFolderService.updateSavedAdvSearchContextForSearchFolder( searchFolderCtx, data );
    }
};

/**
  * getReportDefinitionCriteriaForSave
  * @function getReportDefinitionCriteriaForSave
  * @param {Object}searchFolderCtx - searchFolderCtx
  */
export let getReportDefinitionCriteriaForSave = function( searchFolderCtx ) {
    if( searchFolderCtx.awp0SearchType === FULLTEXT_PROVIDER ) {
        return searchFolderService.getFulltextReportDefinitionCriteriaForSave( searchFolderCtx );
    } else if( searchFolderCtx.awp0SearchType === ADVANCED_PROVIDER ) {
        return searchFolderService.getAdvancedReportDefinitionCriteriaForSave( searchFolderCtx );
    }
};

/**
  * Utility function of setSearchFiltersAfterSave
  *
  * @function setSearchFiltersAfterSave_procStringFilter
  * @param {Object}value - filter
  */
export let setSearchFiltersAfterSave_procStringFilter = function( value ) {
    delete value.startDateValue;
    delete value.endDateValue;
    delete value.startNumericValue;
    delete value.endNumericValue;
    delete value.startEndRange;
    if( value.stringDisplayValue === value.stringValue ) {
        delete value.stringDisplayValue;
    }
};

/**
  * Utility function of setSearchFiltersAfterSave
  *
  * @function setSearchFiltersAfterSave_procDateFilter
  * @param {Object}value - filter
  */
export let setSearchFiltersAfterSave_procDateFilter = function( value ) {
    delete value.startNumericValue;
    delete value.endNumericValue;
    delete value.startEndRange;
    delete value.stringDisplayValue;
    if( value.startDateValue && value.startDateValue.startsWith( filterPanelUtils.BEGINNING_OF_TIME ) ) {
        delete value.startDateValue;
    }
    if( value.endDateValue && value.endDateValue.startsWith( '2100-12-3' ) ) {
        delete value.endDateValue;
    }
};

/**
  * Utility function of setSearchFiltersAfterSave
  *
  * @function setSearchFiltersAfterSave_procNumericFilter
  * @param {Object}value - filter

  */
export let setSearchFiltersAfterSave_procNumericFilter = function( value ) {
    delete value.startDateValue;
    delete value.endDateValue;
    delete value.stringDisplayValue;
    if( !value.startNumericValue ) {
        delete value.startNumericValue;
    }
    if( !value.endNumericValue ) {
        delete value.endNumericValue;
    }
};

/**
  * setSearchFiltersAfterSave
  *
  * @function setSearchFiltersAfterSave
  * @param {STRING}prop - prop
  * @param {Object}value - filter

  * @param {INTEGER}index - index
  * @param {Object}searchFolderCriteria - searchFolderCriteria
  */
export let setSearchFiltersAfterSave = function( prop, value, index, searchFolderCriteria ) {
    delete value.colorValue;
    delete value.count;
    delete value.selected;
    if( value.searchFilterType === 'StringFilter' || value.searchFilterType === 'RadioFilter' ) {
        searchFolderService.setSearchFiltersAfterSave_procStringFilter( value );
    } else if( value.searchFilterType === 'DateFilter' ) {
        searchFolderService.setSearchFiltersAfterSave_procDateFilter( value );
    } else if( value.searchFilterType === 'NumericFilter' ) {
        searchFolderService.setSearchFiltersAfterSave_procNumericFilter( value );
    }

    let reportFilter = {
        criteriaName: 'ReportFilter_' + String( index ),
        criteriaValues: [ prop ]
    };
    let reportFilterValue = {
        criteriaName: 'ReportFilterValue_' + String( index ),
        criteriaValues: []
    };
    let filterString = JSON.stringify( value );
    reportFilterValue.criteriaValues.push( filterString );
    searchFolderCriteria.push( reportFilter );
    searchFolderCriteria.push( reportFilterValue );
};

/**
 * getFulltextReportDefinitionCriteriaForSave
 *
 * @function getFulltextReportDefinitionCriteriaForSave
 * @param {Object}searchFolderCtx - searchFolderCtx
 * @return {Object} searchFolderCriteria
 */
export let getFulltextReportDefinitionCriteriaForSave = function( searchFolderCtx ) {
    let criteria = [];

    if( !searchFolderCtx.criteria.searchString ) {
        return criteria;
    }
    let searchString = {
        criteriaName: 'searchString',
        criteriaValues: [ searchFolderCtx.criteria.searchString ]
    };
    criteria.push( searchString );
    if( searchFolderCtx.translatedSearchCriteriaForPropertySpecificSearch &&
        searchFolderCtx.translatedSearchCriteriaForPropertySpecificSearch.length > 0 ) {
        _.forEach( searchFolderCtx.translatedSearchCriteriaForPropertySpecificSearch, function( value ) {
            if( value && value.length > 0 ) {
                let translatedSearchString = {
                    criteriaName: 'ReportTranslatedSearchCriteria',
                    criteriaValues: [ value ]
                };
                criteria.push( translatedSearchString );
            }
        } );
    }

    if( searchFolderCtx.defaultActiveFolder ) {
        let isDefaultActiveFolder = {
            criteriaName: 'DefaultActiveFolder',
            criteriaValues: [ searchFolderCtx.defaultActiveFolder ]
        };
        criteria.push( isDefaultActiveFolder );
    }

    if( searchFolderCtx.recentlyModifiedType ) {
        let recentlyModifiedType = {
            criteriaName: 'RecentlyModifiedType',
            criteriaValues: [ searchFolderCtx.recentlyModifiedType ]
        };
        criteria.push( recentlyModifiedType );
    }

    if( searchFolderCtx.isShapeSearch ) {
        let shapeSearchUID = {
            criteriaName: 'shapeSearchUID',
            criteriaValues: [ searchFolderCtx.criteria.searchString ]
        };
        criteria.push( shapeSearchUID );
        if( searchFolderCtx.criteria.searchStringInContent ) {
            let searchStringInContent = {
                criteriaName: 'searchStringInContent',
                criteriaValues: [ searchFolderCtx.criteria.searchStringInContent ]
            };
            criteria.push( searchStringInContent );
        }
    }
    let index = -1;

    for( let prop in searchFolderCtx.activeFilterMap ) {
        if( searchFolderCtx.activeFilterMap.hasOwnProperty( prop ) ) {
            _.forEach( searchFolderCtx.activeFilterMap[ prop ], function( value, key ) {
                ++index;


                searchFolderService.setSearchFiltersAfterSave( prop, value, index, criteria );
            } );
        }
    }
    return criteria;
};

/**
  * Utility function of getAdvancedReportDefinitionCriteriaForSave
  * @function getAdvancedReportDefinitionCriteriaForSaveInt
  * @param {Object}criteria - criteria object
  * @param {Object} searchFilters the view model data
  * @param {Object} data the view model data
  * @return {Object} searchFolderCriteria
  */
export let getAdvancedReportDefinitionCriteriaForSaveInt = function( criteria, searchFilters, searchFolderCriteria, data ) {
    let index = -1;
    for( let prop in data.searchCriteriaMap ) {
        if( data.searchCriteriaMap.hasOwnProperty( prop ) ) {
            let internalValues = undefined;
            let displayValues = undefined;
            if( data.searchCriteriaMap[ prop ][ 2 ] !== data.searchCriteriaMap[ prop ][ 3 ] ) {
                internalValues = data.searchCriteriaMap[ prop ][ 2 ].split( advancedSearchUtils._delimiterForArray );
                displayValues = data.searchCriteriaMap[ prop ][ 3 ].split( advancedSearchUtils._delimiterForArray );
            }
            searchFilters.push( prop + '=' + data.savedQueryAttributes[ prop ] );
            ++index;
            let reportFilter = {
                criteriaName: 'ReportFilter_' + String( index ),
                criteriaValues: [ prop ]
            };
            let filterValue = '';
            if( internalValues && displayValues && internalValues.length === displayValues.length ) {
                for( let index = 0; index < internalValues.length; index++ ) {
                    filterValue += displayValues[ index ] + searchFolderCommonService.INTERNAL_KEYWORD + internalValues[ index ];
                    if( index !== internalValues.length - 1 ) {
                        filterValue += advancedSearchUtils._delimiterForArray;
                    }
                }
            } else {
                filterValue = data.searchCriteriaMap[ prop ][ 3 ];
            }
            let reportFilterValue = {
                criteriaName: 'ReportFilterValue_' + String( index ),
                criteriaValues: [ filterValue ]
            };
            searchFolderCriteria.push( reportFilter );
            searchFolderCriteria.push( reportFilterValue );
        }
    }
};

/**
  * setAdvancedSearchCriteriaMap
  * @function setAdvancedSearchCriteriaMap
  * @param {Object}searchFolderCtx - the view model data
  * @param {Object}searchCriteriaMap - searchCriteriaMap
  * @return {Object} searchCriteriaUiValueMap
  */
export const setAdvancedSearchCriteriaMap = ( searchFolderCtx, searchCriteriaMap ) => {
    let searchCriteriaUiValueMap = {};
    for( let prop in searchFolderCtx.savedQueryAttributes ) {
        if( searchFolderCtx.savedQueryAttributes.hasOwnProperty( prop ) ) {
            advancedSearchUtils.setAdvancedSearchCriteria( searchCriteriaMap, prop, searchCriteriaUiValueMap );
        }
    }
    return searchCriteriaUiValueMap;
};

/**
  * getAdvancedReportDefinitionCriteriaForSave
  * @function getAdvancedReportDefinitionCriteriaForSave
  * @param {Object}searchFolderCtx - searchFolderCtx
  * @param {Object} data the view model data
  * @return {Object} searchFolderCriteria
  */
export let getAdvancedReportDefinitionCriteriaForSave = function( searchFolderCtx ) {
    let searchFolderCriteria = [];
    let searchFilters = [];
    let savedQueryUID = {
        criteriaName: 'savedQueryUID',
        criteriaValues: [ searchFolderCtx.savedQuery.value ]
    };
    searchFolderCriteria.push( savedQueryUID );
    let savedQueryName = {
        criteriaName: 'savedQueryName',
        criteriaValues: [ searchFolderCtx.savedQuery.name ]
    };
    searchFolderCriteria.push( savedQueryName );
    let utcOffset = {
        criteriaName: 'utcOffset',
        criteriaValues: [ String( -1 * new Date().getTimezoneOffset() ) ]
    };
    searchFolderCriteria.push( utcOffset );
    let criteria = {};
    //setAdvancedSearchCriteriaMap( searchFolderCtx, criteria );
    searchFolderService.getAdvancedReportDefinitionCriteriaForSaveInt( criteria, searchFilters, searchFolderCriteria, searchFolderCtx );
    searchFolderCtx.searchFilters = searchFilters;
    return searchFolderCriteria;
};

/**
  * createSavedSearchList
  * @function createSavedSearchList
  * @param {Object} data the view model data
  */
export let createSavedSearchList = function( data ) {
    data.awp0AdvancedQueryName = {};
    let prop = uwPropertyService.createViewModelProperty( data.awp0SavedSearchName.propertyName, data.awp0SavedSearchName.propertyDisplayName, data.awp0SavedSearchName.type, '', [] );
    prop.isArray = false;
    prop.lovApi = {};
    prop.propApi = {};
    prop.lovApi.getInitialValues = function( filterStr, deferred ) {
        let lovEntries = [];
        _.forEach( appCtxService.ctx.search.savedSearchObjects.objects, function( entry ) {
            let savedSearchObject = clientDataModel.getObject( entry.uid );
            let savedSearchViewModelObj = viewModelObjectService.constructViewModelObjectFromModelObject(
                savedSearchObject, 'Search' );
            let lovEntry = {
                propDisplayValue: savedSearchViewModelObj.props.object_name.uiValue,
                propInternalValue: savedSearchViewModelObj.uid,
                propDisplayDescription: '',
                hasChildren: false,
                children: {},
                sel: savedSearchViewModelObj.selected === 'true'
            };
            lovEntries.push( lovEntry );
        } );
        return deferred.resolve( lovEntries );
    };
    prop.propApi.fireValueChangeEvent = searchFolderService.updatePanelForSelectedSavedSearch( prop );

    prop.lovApi.getNextValues = function( deferred ) {
        deferred.resolve( null );
    };
    prop.lovApi.validateLOVValueSelections = function( lovEntries ) { // eslint-disable-line no-unused-vars
        // Either return a promise or don't return anything. In this case, we don't want to return anything
    };
    prop.hasLov = true;
    prop.isSelectOnly = true;
    prop.emptyLOVEntry = true;
    data.awp0SavedSearchName = prop;
};

/**
  * getReportDefinitionUID
  * @function getReportDefinitionUID
  * @param {String} value the report definition db value in search folder context
  */
export let getReportDefinitionUID = function( value ) {
    if( value === null || value === undefined ) {
        value = '';
    }
    return value;
};

/**
  * getInputSearchCriteriaForSearchSettings
  * @function getInputSearchCriteriaForSearchSettings
  * @param {Object} searchFolder the selected active folder
  * @returns {Array} translatedSearchCriteriaInput - the array contains the rd_param_values for input for search settings SOA input
  */
export let getInputSearchCriteriaForSearchSettings = function( searchFolder ) {
    let reportDefinitionUID = searchFolder &&
         searchFolder.props &&
         searchFolder.props.awp0SearchDefinition &&
         searchFolder.props.awp0SearchDefinition.dbValues ? searchFolder.props.awp0SearchDefinition.dbValues[ 0 ] : undefined;
    // let searchFolderCtx = appCtxService.getCtx( SEARCH_FOLDER );
    let translatedSearchCriteriaInput = [];
    if( reportDefinitionUID && !searchFolder.isEditMode ) {
        let reportDefinition = clientDataModel.getObject( reportDefinitionUID );
        let params = reportDefinition.props.rd_parameters.dbValues;
        let paramValues = reportDefinition.props.rd_param_values.dbValues;
        if( paramValues && paramValues.length > 0 ) {
            translatedSearchCriteriaInput = searchCommonUtils.scanReportDefinitionForTranslatedSearchCriteria( params, paramValues );
        }
    }
    return translatedSearchCriteriaInput;
};

/**
  * setTranslatedSearchString
  * @function setTranslatedSearchString
  * @param {Object} response the search settings SOA response
  * @returns {String} translatedSearchString - the view model property which contains the translated search criteria
  */
export let setTranslatedSearchString = ( response ) => {
    let translatedSearchStringFromSOA;
    if( response && response.outputValues && response.outputValues.getTranslatedSearchCriteriaForCurrentLocale &&
         response.outputValues.getTranslatedSearchCriteriaForCurrentLocale[ 0 ] && response.outputValues.getTranslatedSearchCriteriaForCurrentLocale[ 0 ].length > 0 ) {
        translatedSearchStringFromSOA = response.outputValues.getTranslatedSearchCriteriaForCurrentLocale[ 0 ];
    }
    if( translatedSearchStringFromSOA && translatedSearchStringFromSOA.length > 0 && translatedSearchStringFromSOA.indexOf( 'V_A_L' ) === -1 ) {
        return translatedSearchStringFromSOA;
    }
    return '';
};

/**
  * getActiveFolderUids
  * This function feeds the SOA deleteActiveFolders with the UIDs of the objects to be deleted.
  * The SOA actually will delete any objects passed in, not just the active folders (active folders need special processing
  * to set parent folder's parameter). So after deletion instead of firing the event of cdm.relatedModified,
  * we'll do a primaryWorkArea.reset to refresh the root folder, MyActiveFolder,
  * because the selection can be heterogeneous and it is uncertain what parent active folder should be set the focus on.
  * @function getActiveFolderUids
  * @param {Object} selected selected objects
  * @returns {ARRAY} array of uids
  */
export let getActiveFolderUids = function( selected ) {
    return _.map( selected, 'uid' );
};
export let initActiveFolderFulltextState = function( searchFolder ) {
    let newSearchFolder = { ...searchFolder.value };
    if( searchFolder.autoApplyFilters === undefined ) {
        newSearchFolder.autoApplyFilters = true;
        searchFolder.update( newSearchFolder );
    }
};

const searchFolderService = {
    addActiveFolder,
    editActiveFolder,
    addObjectToSearchFolder,
    setCanExecuteSearch,
    getSearchFolderDataProviderInt,
    getSearchFolderDataProvider,
    getSearchFolderDefinitionIntFulltextInt_setFilterMap,
    getSearchFolderDefinitionIntFulltextInt,
    getSearchFolderDefinitionIntFulltext_ProcessFilterTypes,
    getSearchFolderDefinitionIntFulltextStringFilter,
    getSearchFolderDefinitionIntFulltext_CheckShapeSearch,
    getSearchFolderDefinitionIntFulltext,
    deleteAllProps,
    getSearchFolderDefinitionIntShapeSearch,
    getSearchFolderDefinitionIntAdvanced,
    setSearchFolderCtxForReportDefinition,
    processSearchFolderDefinitionInt_Fulltext,
    processSearchFolderDefinitionInt_Advanced,
    getSearchFolderDefinitionInt,
    getSearchFolderDefinition_procParamValues,
    getSearchFolderDefinition,
    getSearchFolderInt_procKnownType,
    getSearchFolderInt,
    getSearchFolder,
    getSearchDefinitionCriteria,
    getSearchDefinitionFilterMap,
    setInitialEditModeInt,
    getFolderFullPropertiesInt,
    getFolderFullProperties,
    updateNonEditState,
    updateState,
    setInitialEditMode,
    setExitEditMode,
    setNonEditMode,
    editSearchFolderRule,
    getAdvancedSearchViewModelFromServer,
    resetAdvancedSearch,
    initRuleType,
    setRuleType,
    doFulltextSearch,
    cancelEditSearchFolderRule,
    saveSearchFolderRule,
    populateAdvSearchPanelInt,
    populateAdvSearchPanel,
    updatePanelForSelectedSavedShapeSearch,
    updatePanelForSelectedFulltextSavedSearch,
    updatePanelForSelectedAdvancedSavedSearch,
    updatePanelForSelectedSavedSearch,
    createSavedSearchList,
    updateCriteriaAndFilters,
    updateAdvancedSearchContextForSearchFolder,
    updateSavedSearchContextForSearchFolder,
    updateSavedFullTextSearchContextForSearchFolder,
    updateSavedAdvSearchContextForSearchFolder,
    getQueryParametersMap,
    doAdvancedSearch,
    setSearchFiltersAfterSave_procStringFilter,
    setSearchFiltersAfterSave_procDateFilter,
    setSearchFiltersAfterSave_procNumericFilter,
    setSearchFiltersAfterSave,
    getFulltextReportDefinitionCriteriaForSave,
    setAdvancedSearchCriteriaMap,
    getAdvancedReportDefinitionCriteriaForSaveInt,
    getAdvancedReportDefinitionCriteriaForSave,
    getReportDefinitionCriteriaForSave,
    getReportDefinitionUID,
    getInputSearchCriteriaForSearchSettings,
    setTranslatedSearchString,
    getActiveFolderUids,
    setSearchFolderRuleDirty,
    setBaseCriteriaParameters,
    initActiveFolderFulltextState
};

export default searchFolderService;

