// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 *
 * @module js/advancedSearchService
 */

import AwStateService from 'js/awStateService';
import lovService from 'js/lovService';
import Awp0SaveSearchUtils from 'js/Awp0SaveSearchUtils';
import advancedSearchUtils from 'js/advancedSearchUtils';
import viewModelObjectService from 'js/viewModelObjectService';
import clientDataModel from 'soa/kernel/clientDataModel';
import localeService from 'js/localeService';
import searchCommonUtils from 'js/searchCommonUtils';
import _ from 'lodash';
import awSearchService from 'js/awSearchService';
import preferenceService from 'soa/preferenceService';
import soaService from 'soa/kernel/soaService';
const SAVED_QRY_PREFIX = 'AW_SD_QRY_PRE__';
/**
 * setMaxAttributeIndex
 * @function setMaxAttributeIndex
 * @param {Object} attributeIndex - attribute index
 * @param {Object} maxAttributeIndex - maximum attribute index
 * @returns {Object} maxAttributeIndex
 */
export let setMaxAttributeIndex = function( attributeIndex, maxAttributeIndex ) {
    if( attributeIndex > parseInt( maxAttributeIndex, 10 ) ) {
        maxAttributeIndex = attributeIndex;
    }

    return maxAttributeIndex;
};

/**
 * returnPropsInOrderedList
 * @function returnPropsInOrderedList
 * @param {*} maxAttributeIndex - maximum attribute index
 * @param {*} propsInterested - props of interest
 * @param {*} propsInterestedOrdered - ordered props of interest
 * @param {Boolean} clearAll - clearAll
 * @returns {Object} OrderedProperties
 */
export let returnPropsInOrderedList = function( maxAttributeIndex, propsInterested, propsInterestedOrdered, clearAll ) {
    for( var i = 0; i <= maxAttributeIndex; i++ ) {
        var prop = propsInterested[ i ];
        if( prop ) {
            if( clearAll ) {
                prop.uiValues = [];
                prop.dbValues = [];
            }
            propsInterestedOrdered[ prop.propName ] = prop;
        }
    }
    return propsInterestedOrdered;
};

export let checkIfPropertyIsLOV = function( prop ) {
    if( prop.propertyDescriptor && prop.propertyDescriptor.lovCategory === 1 ) {
        prop.propertyDescriptor.anArray = true;
        prop.propertyDescriptor.fieldType = 1;
        prop.propertyDescriptor.maxArraySize = -1;
        if( prop.uiValues.length === 1 && prop.uiValues[ 0 ] === '' ) {
            prop.uiValues = [];
            prop.dbValues = [];
        }
        getRealLovValues( prop );
    }
    return prop;
};

export let getRealLovValues = function( prop ) {
    if( prop.uiValues.length > 0 && prop.dbValues.length > 0  ) {
        let uiValue = prop.uiValues[0];
        let dbValue = prop.dbValues[0];
        if ( uiValue.startsWith( SAVED_QRY_PREFIX ) ) {
            //extract the substring after SAVED_QRY_PREFIX
            uiValue = uiValue.substring( 15 );
        }
        if ( dbValue.startsWith( SAVED_QRY_PREFIX ) ) {
            dbValue = dbValue.substring( 15 );
        }
        prop.uiValues[0] = uiValue;
        prop.dbValues[0] = dbValue;
    }
};

/**
 * updateSearchAttributesWithSelectedQuery
 *
 * @function updateSearchAttributesWithSelectedQuery
 * @param {Object}response - response from SOA getSelectedQueryCriteria
 * @return {Object} SavedQuery
 */
export let updateSearchAttributesWithSelectedQuery = function( response ) {
    return clientDataModel.getObject( response.advancedQueryCriteria.uid );
};

/**
 * createAdvancedSearchViewModelObject
 * @function createAdvancedSearchViewModelObject
 * @param {Object} response - object
 * @param {Object} searchState - object
 * @param {Object} dataProvider - dataProvider
 * @return {Object} viewModelObj
 */
export let createAdvancedSearchViewModelObject = function( response, searchState, dataProvider ) {
    var modelObject = response.advancedSearchInput;
    var viewModelObj = viewModelObjectService.createViewModelObject( modelObject.uid, 'SpecialEdit' );
    viewModelObj.uid = 'AAAAAAAAAAAAAA';
    var localTextBundle1 = localeService.getLoadedText( 'SearchMessages' );
    viewModelObj.props.awp0AdvancedQueryName.propertyLabelDisplay = 'NO_PROPERTY_LABEL';
    viewModelObj.props.awp0AdvancedQueryName.propertyRequiredText = localTextBundle1.selectSearchTip;
    viewModelObj.props.awp0AdvancedQueryName.propertyName = searchState && searchState.lovPropertyName ? searchState.lovPropertyName : 'awp0AdvancedQueryName';
    if( searchState && searchState.savedQuery && searchState.savedQuery.value ) {
        viewModelObj.props.awp0AdvancedQueryName.dbValue = searchState.savedQuery.value;
        viewModelObj.props.awp0AdvancedQueryName.uiValue = searchState.savedQuery.name;
        viewModelObj.props.awp0AdvancedQueryName.uiValues[ 0 ] = searchState.savedQuery.name;
        viewModelObj.props.awp0AdvancedQueryName.dataProvider = dataProvider;
    } else {
        let awp0QuickSearchName = response.advancedSearchInput.props.awp0QuickSearchName;
        viewModelObj.props.awp0AdvancedQueryName.dbValue = awp0QuickSearchName.dbValues[0];
        viewModelObj.props.awp0AdvancedQueryName.uiValue = awp0QuickSearchName.uiValues[0];
        viewModelObj.props.awp0AdvancedQueryName.uiValues[ 0 ] = awp0QuickSearchName.uiValues[0];
        viewModelObj.props.awp0AdvancedQueryName.dataProvider = dataProvider;
    }
    return viewModelObj;
};
/**
 * conditional advanced search if criteria not poupulated
 * @function doAdvancedSearchIfCriteriaNotPresent
 * @param {*} awp0AdvancedQueryName awp0AdvancedQueryName
 * @param {*} awp0AdvancedQueryAttributes awp0AdvancedQueryAttributes
 * @param {*} searchState searchState
 */
export let doAdvancedSearchIfCriteriaNotPresent = function( awp0AdvancedQueryName, awp0AdvancedQueryAttributes, searchState ) {
    if( searchState.advancedSearchCriteria === '' && searchState.savedQuery.name !== '' ) {
        advancedSearchService.doAdvancedSearch( awp0AdvancedQueryName, awp0AdvancedQueryAttributes, searchState );
    }
};

/**
 * doAdvancedSearch
 * @function doAdvancedSearch
 * @param {Object} savedQueryObject savedQueryObject
 * @param {Object} awp0AdvancedQueryAttributes awp0AdvancedQueryAttributes
 * @param {Object} searchState searchState
 */
export let doAdvancedSearch = function( savedQueryObject, awp0AdvancedQueryAttributes, searchState, skipUrl, skipTimeStampForJSON ) {
    var queryUID = savedQueryObject.dbValue;
    var criteria = {
        queryUID: queryUID,
        typeOfSearch: 'ADVANCED_SEARCH',
        lastEndIndex: '',
        totalObjectsFoundReportedToClient: '',
        ...searchState.additionalCriteria
    };

    //Key is propName
    //Value is Array of [propName, displayName, dbValue, uiValue]
    var searchCriteriaUiValueMap = advancedSearchUtils.setAdvancedSearchCriteriaMap( awp0AdvancedQueryAttributes, criteria );

    let searchCriteriaUIVal = '';
    let savedQueryAttributes = {};
    for( const [ key, value ] of Object.entries( searchCriteriaUiValueMap ) ) {
        searchCriteriaUIVal += value[ 1 ] + '=' + ( value[ 3 ] ? value[ 3 ] : value[ 2 ] ) + '; ';
        savedQueryAttributes[ value[ 0 ] ] = value[ 3 ] ? value[ 3 ] : value[ 2 ];
    }
    const newSearchState = { ...searchState.value };
    newSearchState.advancedSearchCriteria = criteria;
    //Need to splice the space and semi colon from the last entry for the breadcrumb
    newSearchState.referencingSavedQuery = searchCriteriaUIVal.slice( 0, -2 );
    newSearchState.searchCriteriaMap = searchCriteriaUiValueMap;
    if( !skipUrl ) {
        advancedSearchUtils.updateURLForAdvancedSearch( savedQueryObject, awp0AdvancedQueryAttributes );
    }
    const savedQuery = {
        name: savedQueryObject.uiValues[ 0 ],
        value: savedQueryObject.dbValue
    };

    newSearchState.savedQuery = savedQuery;
    newSearchState.savedQueryAttributes = savedQueryAttributes;
    newSearchState.WSOMFindSetSearchLimit = advancedSearchUtils.getWSOMFindSetSearchLimit();
    let utcOffset = String( -1 * new Date().getTimezoneOffset() );
    if ( skipTimeStampForJSON ) {
        newSearchState.advancedSearchJSONString = JSON.stringify( criteria );
        criteria.searchID = advancedSearchUtils.getSearchId( queryUID );
        criteria.utcOffset = utcOffset;
    } else{
        // reset the totalFound to undefined so that we see the Loading.. text.
        newSearchState.totalFound = undefined;
        criteria.searchID = advancedSearchUtils.getSearchId( queryUID );
        criteria.utcOffset = utcOffset;
        newSearchState.advancedSearchJSONString = JSON.stringify( criteria );
    }
    searchState.update( newSearchState );
    //below we will save the last search to the preference so that it's restored for the next time launch of adv search panel.
    preferenceService.setStringValue( 'Default_Quick_Access_Query', [ savedQueryObject.uiValues[ 0 ] ] );
};


/**
 * create the search state from url
 * @function createStateFromUrl
 * @param {*} searchState search state
 * @param {*} searchStateUpdater dispatcher
 */
export const createStateFromUrl = ( searchState, searchStateUpdater ) => {
    const stateParams = AwStateService.instance.params;
    const savedQueryParameters = stateParams.savedQueryParameters;
    if( savedQueryParameters ) {
        const savedQueryMap = advancedSearchUtils.getSavedQueryAttributesFromURL( savedQueryParameters );
        const savedQueryAttributes = savedQueryMap.savedQueryAttributesMap;
        const savedQuery = {
            name: stateParams.savedQueryName,
            value: savedQueryMap.savedQueryNameMap[ 0 ]
        };
        const newSearchState = { ...searchState };
        newSearchState.savedQuery = savedQuery;
        newSearchState.savedQueryAttributes = savedQueryAttributes;
        searchStateUpdater.searchState( newSearchState );
    }
};

/**
 * doAdvancedSavedSearch
 * @function doAdvancedSavedSearch
 * @param {String} targetState - the Advanced Search SubLocation
 * @param {Object} savedQueryName  - data for the saved query
 * @param {Object} savedQueryParametersMap - A map containing saved query attributes
 */
export let doAdvancedSavedSearch = function( targetState, savedQueryName, savedQueryParametersMap ) {
    AwStateService.instance.go( targetState ? targetState : '.', {
        savedQueryParameters: advancedSearchUtils.buildURLForAdvancedSavedSearch( savedQueryParametersMap ),
        savedQueryName: savedQueryName
    } );
};

/**
 * Get the default page size used for max to load/return.
 * @param {Array|Object} defaultPageSizePreference - default page size from server preferences
 * @returns {Number} The amount of objects to return from a server SOA response.
 */
export let getDefaultPageSize = function( defaultPageSizePreference ) {
    return searchCommonUtils.getDefaultPageSize( defaultPageSizePreference );
};

/**
 * @function getSelectedUids
 * @returns {Array} selectedUids
 */
export let getSelectedUids = () => {
    return searchCommonUtils.getSelectedUids();
};

/**
 * getSearchCriteria
 * @function getSearchCriteria
 * @param {Number} startIndex - startIndex
 * @param {Object} searchState - searchState
 * @return {Object} search criteria
 */
export let getSearchCriteria = function( startIndex, searchState ) {
    const criteria = searchState.advancedSearchCriteria;
    if( criteria ) {
        if( searchState && startIndex > 0 ) {
            //it's a scrolling case
            criteria.totalObjectsFoundReportedToClient = searchState.totalFound.toString();
            criteria.lastEndIndex = searchState.lastEndIndex.toString();
        } else {
            criteria.totalObjectsFoundReportedToClient = 0;
            criteria.lastEndIndex = 0;
        }
        searchState.update( { ...searchState.value, advancedSearchCriteria: criteria } );
    }
    return criteria;
};
export const processSavedSearchOutput = ( data, dataCtxNode, searchData ) => {
    searchData.dataProvider = dataCtxNode.dataProviders.contentsDataProvider;
    advancedSearchService.processOutput( data, searchData );
};
/**
 * @function processOutput
 * @param {*} data - response
 * @param {*} searchState - searchState
 */
export const processOutput = ( data, searchState ) => {
    const newSearchData = { ...searchState.value };
    // generic
    newSearchData.totalFound = data.totalFound;
    newSearchData.totalLoaded = data.totalLoaded;
    newSearchData.startIndex = data.cursor.startIndex;
    newSearchData.endIndex = data.endIndex;
    newSearchData.cursorInfo = data.cursor;
    newSearchData.cursorInfo.totalFound = data.totalFound;
    newSearchData.cursorInfo.totalLoaded = data.totalLoaded;
    newSearchData.cursorInfoString = JSON.stringify( newSearchData.cursorInfo );
    newSearchData.filterCategories = data.searchFilterCategories;
    newSearchData.objectsGroupedByProperty = data.objectsGroupedByProperty;
    newSearchData.lastEndIndex = data.endIndex;
    newSearchData.searchString = searchState.criteria ? searchState.criteria.searchString : '';
    newSearchData.searchFilterCategories = data.searchFilterCategories;
    newSearchData.searchFilterMap = data.searchFilterMap;
    newSearchData.filterMap = data.searchFilterMap;
    newSearchData.additionalSearchInfoMap = data.additionalSearchInfoMap;
    // for table
    newSearchData.columnConfig = data.columnConfig;
    newSearchData.propDescriptors = data.propDescriptors;
    newSearchData.showIntermediateResultCount = true;
    newSearchData.dataProvider = searchState.dataProvider;
    // update state
    searchState.update( newSearchData );
};

/**
 * updateOrClearSearchAttributes
 * @function updateOrClearSearchAttributes
 * @param {Object}data - the view model data
 * @param {string}searchState - the search type
 * @return {Object} AdvancedQueryAttributes
 */
export let updateOrClearSearchAttributes = function( data, searchState ) {
    var searchUid = data.awp0AdvancedVMObject.props.awp0AdvancedQueryName.dbValue;
    var modelObject = data.advancedQueryAttributeModelObject;
    var newSearchState = { ...searchState.value };
    if( searchState && searchState.savedQuery && searchState.savedQuery.value !== searchUid && searchState.savedQueryAttributes ) {
        delete newSearchState.savedQueryAttributes;
        searchState.update( newSearchState );
    }
    var attributesViewModelObj = advancedSearchService.processAttributesViewModelObj( createAttributesViewModelObject( searchUid, modelObject ) );

    return advancedSearchUtils.populateQueryAttributesForSavedSearch( attributesViewModelObj, newSearchState.savedQueryAttributes );
};

/**
 * updateAttributesAdvSavedSearch
 * @function updateAttributesAdvSavedSearch
 * @param {Object} modelObject - modelObject
 * @param {Object} savedSearchObject - the search type
 * @return {Object} AdvancedQueryAttributes
 */
export let updateAttributesAdvSavedSearch = function( modelObject, savedSearchObject ) {
    let searchUid = savedSearchObject.props.savedsearch_query.dbValue;
    let attributesViewModelObj = advancedSearchService.processAttributesViewModelObj( createAttributesViewModelObject( searchUid, modelObject ) );
    let savedQueryParametersMap = Awp0SaveSearchUtils.getQueryParametersMap( savedSearchObject, attributesViewModelObj.props );
    return advancedSearchUtils.populateQueryAttributesForSavedSearch( attributesViewModelObj, savedQueryParametersMap );
};

/**
 * createAttributesViewModelObject
 * @function createAttributesViewModelObject
 * @param {Object} searchUid - The uid of the model object
 * @param {Object} modelObject - modelObject
 * @return {Object} Attributes ViewModelObject
 */
export let createAttributesViewModelObject = function( searchUid, modelObject ) {
    var modelObjectForDisplay = {
        uid: searchUid,
        props: getRealProperties( modelObject, false ),
        type: 'ImanQuery',
        modelType: modelObject.modelType
    };
    return viewModelObjectService.constructViewModelObjectFromModelObject( modelObjectForDisplay, 'Search' );
};

/**
 * processAttributesViewModelObj
 * @function processAttributesViewModelObj
 * @param {Object} attributesViewModelObj - attributesViewModelObj
 * @return {Object} attributesViewModelObj
 */
export let processAttributesViewModelObj = function( attributesViewModelObj ) {
    _.forEach( attributesViewModelObj.props, function( prop ) {
        if( prop.lovApi ) {
            lovService.initNativeCellLovApi( prop, null, 'Search', attributesViewModelObj );
            prop.hint = 'checkboxoptionlov';
            prop.isSelectOnly = false;
            prop.propertyRequiredText = '';
        }
        if( prop.type === 'BOOLEAN' ) {
            prop.hint = 'triState';
            prop.propertyLabelDisplay = 'PROPERTY_LABEL_AT_TOP';
            advancedSearchUtils.initTriState( prop );
        }
    } );
    return attributesViewModelObj;
};

/**
 * getRealProperties
 * @function getRealProperties
 * @param {Object} modelObject - modelObject
 * @param {Boolean} clearAll - clearAll
 * @return {Object} saved query attributes
 */
export let getRealProperties = function( modelObject, clearAll ) {
    var propsInterested = {};
    var propsInterestedOrdered = {};
    var maxAttributeIndex = 0;
    _.forEach( modelObject.props, function( prop ) {
        var displayName = prop.propertyDescriptor.displayName;
        if( displayName && displayName.trim() ) {
            var attributeNameOriginal = prop.propertyDescriptor.name;
            var indexOf_ = attributeNameOriginal.indexOf( '_' );
            //if indexOf_<0, it is not an attribute interested in, e.g., an attribute inherited from the parent which is not a query clause
            if( indexOf_ >= 0 ) {
                var attributeIndexStr = attributeNameOriginal.substring( 0, indexOf_ );
                try {
                    var attributeIndex = parseInt( attributeIndexStr, 10 );
                    if( !isNaN( attributeIndex ) ) {
                        maxAttributeIndex = setMaxAttributeIndex( attributeIndex, maxAttributeIndex );
                        var attributeName = attributeNameOriginal.substring( indexOf_ + 1 );

                        prop.propName = attributeName;
                        //check if LOV
                        prop = checkIfPropertyIsLOV( prop );
                        propsInterested[ attributeIndex ] = prop;
                    }
                } catch ( e ) {
                    //not an attribute interested in, e.g., an attribute inherited from the parent which is not a query clause
                }
            }
        }
    } );
    //return the props in ordered list
    propsInterestedOrdered = returnPropsInOrderedList( maxAttributeIndex, propsInterested, propsInterestedOrdered, clearAll );

    //Date query critiera attribute should always show time, it doesn't honor Fnd0EnableTimeForDateProperty property constant
    //Since there is no information about timeEnabled from query criteria property descript constant map, add timeEnable=1 to
    //always show time widget in advanced search page.
    _.forEach( propsInterestedOrdered, function( property ) {
        if( property ) {
            var propDesc = property.propertyDescriptor;
            var constantsMap;
            if( propDesc && propDesc.valueType === 2 ) {
                constantsMap = propDesc.constantsMap;
            }
            if( constantsMap ) {
                if( _.isUndefined( constantsMap.timeEnabled ) ) {
                    constantsMap.timeEnabled = '1';
                }
            }
        }
    } );
    return propsInterestedOrdered;
};

/**
 * @function removeDuplicateEntries
 * @param {*} lovDataInfo - lov data with loventries.
 * @param {*} preferredValues - preferred values.
 * @param {*} choices - existing preferred choices.
 * @param {*} dataProvider - dataProvider to update.
 * @param {*} isNextValues - check call is from getInitialLov or getNextValuesLov.
 */
export const  removeDuplicateEntries = ( lovDataInfo, preferredValues, choices, dataProvider, isNextValues ) =>{
    var prefChoices = [];
    let maxLength = lovDataInfo.lovEntries.length;
    var loadedVmos = isNextValues ? dataProvider.viewModelCollection.loadedVMObjects : [];
    lovDataInfo.lovEntries.forEach( ( lov )=> {
        loadedVmos.push( lov );
    } );
    for( let j = 0; j < preferredValues.dbValues.length; j++ ) {
        for( let i = 0; i < loadedVmos.length; i++ ) {
            if( loadedVmos[i].propInternalValue === preferredValues.dbValues[j] ) {
                prefChoices.push( loadedVmos[i] );
                loadedVmos.splice( i, 1 );
                break;
            }
        }
    }
    if( !isNextValues && prefChoices.length === maxLength ) {
        prefChoices.forEach( ( choice ) => {
            loadedVmos.push( choice );
        } );
    } else if( prefChoices.length > preferredValues.dbValues.length ) {
        prefChoices = prefChoices.splice( 0, preferredValues.dbValues.length );
    }
    let forFirstVmos = loadedVmos;
    let forSecondVmos = loadedVmos;
    var first = forFirstVmos.splice( 0, loadedVmos.length - maxLength );
    var second = forSecondVmos.length > maxLength ? forSecondVmos.splice( forSecondVmos.length - maxLength, forSecondVmos.length ) : forSecondVmos;
    if( second.length > 0 ) {
        lovDataInfo.lovEntries = second;
        prefChoices = isNextValues && second.length === prefChoices.length ? [] : prefChoices;
    } else if( prefChoices.length > 0 ) {
        lovDataInfo.lovEntries = prefChoices;
        prefChoices = [];
    }
    dataProvider.update( first, first.length );
    return { preferredChoices: prefChoices, lovDataInfo:lovDataInfo };
};


/**
 * @function getPreferredChoices
 * @param {*} preferredValues - preferred values.
 * */
export const getPreferredChoices = ( preferredValues ) =>{
    return { preferredChoices:preferredValues };
};

export const updateResultsCaption = ( resultsText, searchState, customCount ) => {
    // customCount, searchState.calculateResultCountUsingCursorObject, searchState.showIntermediateResultCount will be passed by the consumer
    let customResultsCount = customCount;
    if( searchState.calculateResultCountUsingCursorObject ) {
        let cursorInfo = searchState.cursorInfo;
        // if endReached is false, then pick the current endIndex of the cursor object
        if( cursorInfo && cursorInfo.endReached === false ) {
            customResultsCount = cursorInfo.endIndex;
        } else {
            customResultsCount = searchState.totalFound;
        }
    }
    if( Number.isInteger( searchState.totalFound ) ) {
        // if the purpose is to show intermediate count due to inaccurate count of results, then the next if block applies
        if( searchState.totalFound > customResultsCount && searchState.showIntermediateResultCount ) {
            return {
                resultsText: searchState.hideResultsCount ? resultsText : resultsText + ' (' + customResultsCount + '+)'
            };
        }
        // if the purpose is to show direct totalFound as the count, then the next block of code applies.
        return {
            resultsText: searchState.hideResultsCount ? resultsText : resultsText + ' (' + searchState.totalFound + ')'
        };
    }
    // if searchState.totalFound is not an integer, then do not add count and just return resultsText as it is
    return {
        resultsText: resultsText
    };
};

export const collapseInputSection = () => {
    return true;
};

export const toggleInputSection = ( eventData, searchContext ) => {
    if( searchContext.addPanelState ) {
        let addPanelState = searchContext.addPanelState;
        let newAddPanelState = { ...addPanelState.getValue() };
        newAddPanelState.searchInputExpanded = !eventData.isCollapsed;
        addPanelState.update( newAddPanelState );
    }
    return eventData.isCollapsed;
};

export const populateInputCaption = ( inputText ) => {
    return { inputText: inputText };
};

export const resetInputView = ( searchState, resultSectionID, selectionModel, attributes ) => {
    searchCommonUtils.resetSearchState( searchState, selectionModel );
    const awp0AdvancedQueryAttributes = attributes ? advancedSearchUtils.clearAllAction( attributes ) : attributes;
    return { isInputSectionCollapsed: false, resultSectionID: resultSectionID + 1, resultsText: null, awp0AdvancedQueryAttributes };
};

export const populatePropetyPolicy = ( props ) => {
    return awSearchService.populatePropetyPolicy( props );
};

export let loadAdvancedSearchData = function( columnConfigInput, saveColumnConfigData, searchInput ) {
    if ( searchInput.searchCriteria && searchInput.searchCriteria.queryUID && searchInput.searchCriteria.queryUID.length > 0 ) {
        return awSearchService.loadData( columnConfigInput, saveColumnConfigData, searchInput );
    }
};

const advancedSearchService = {
    getRealProperties,
    updateSearchAttributesWithSelectedQuery,
    updateOrClearSearchAttributes,
    doAdvancedSearch,
    doAdvancedSavedSearch,
    getDefaultPageSize,
    getSearchCriteria,
    checkIfPropertyIsLOV,
    getRealLovValues,
    returnPropsInOrderedList,
    setMaxAttributeIndex,
    createAdvancedSearchViewModelObject,
    processOutput,
    createStateFromUrl,
    doAdvancedSearchIfCriteriaNotPresent,
    updateAttributesAdvSavedSearch,
    getSelectedUids,
    createAttributesViewModelObject,
    processAttributesViewModelObj,
    updateResultsCaption,
    collapseInputSection,
    toggleInputSection,
    populateInputCaption,
    resetInputView,
    populatePropetyPolicy,
    removeDuplicateEntries,
    getPreferredChoices,
    processSavedSearchOutput,
    loadAdvancedSearchData
};
export default advancedSearchService;
