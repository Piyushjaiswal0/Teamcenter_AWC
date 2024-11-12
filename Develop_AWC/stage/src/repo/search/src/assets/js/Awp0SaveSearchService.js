// @<COPYRIGHT>@
// ==================================================
// Copyright 2015.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awp0SaveSearchService
 */
import saveSearchUtils from 'js/Awp0SaveSearchUtils';
import searchFilterSvc from 'js/aw.searchFilter.service';
import advancedSearchSvc from 'js/advancedSearchService';
import AwStateService from 'js/awStateService';
import advancedSearchUtils from 'js/advancedSearchUtils';
import _ from 'lodash';
import logger from 'js/logger';
import eventBus from 'js/eventBus';
import searchConstants from 'js/searchConstants';

var SEARCH_NAME_TOKEN = 'teamcenter_search_search';
var ADVANCED_SEARCH_NAME_TOKEN = 'teamcenter_search_advancedSearch';

export let updateVMPropsForFullTextSavedSearch = ( data, chartOnPropertyDisplayName, isShared, searchString, savedSearchName, filterDisplayString, savedSearchFilterMap ) => {
    let updatedChartProperty = _.cloneDeep( data.chartProperty );
    updatedChartProperty.uiValue = chartOnPropertyDisplayName;
    updatedChartProperty.dispValue = chartOnPropertyDisplayName;
    updatedChartProperty.dbValue = chartOnPropertyDisplayName;

    let updatedIsSharedProperty = _.cloneDeep( data.shareSavedSearch );
    updatedIsSharedProperty.dbValue = isShared;

    let updatedSearchStringProperty = _.cloneDeep( data.searchString );
    updatedSearchStringProperty.dbValue = searchString;
    updatedSearchStringProperty.uiValue = searchString;
    updatedSearchStringProperty.dispValue = searchString;

    let updatedSavedSearchName = _.cloneDeep( data.savedSearchName );
    updatedSavedSearchName.dbValue = savedSearchName;
    updatedSavedSearchName.uiValue = savedSearchName;
    updatedSavedSearchName.dispValue = savedSearchName;

    let updatedFilterDisplayString = _.cloneDeep( data.searchFilters );
    updatedFilterDisplayString.dbValue = filterDisplayString;
    updatedFilterDisplayString.uiValue = filterDisplayString;
    updatedFilterDisplayString.dispValue = filterDisplayString;

    return {
        savedSearchName: updatedSavedSearchName,
        searchString: updatedSearchStringProperty,
        searchFilters: updatedFilterDisplayString,
        chartProperty: updatedChartProperty,
        shareSavedSearch: updatedIsSharedProperty,
        savedSearchFilterMap: savedSearchFilterMap
    };
};

export let constructFullTextSavedSearchParams = ( savedSearchObject ) => {
    let searchFilterMap = {};
    let savedSearchFilterMap = {};

    let filterUIDs = savedSearchObject.props.awp0string_filters.dbValues;
    for( var i = 0; i < filterUIDs.length; i++ ) {
        saveSearchUtils.getSavedSearchFilterFromFilterUid( filterUIDs[ i ], searchFilterMap, savedSearchFilterMap );
    }

    let filterArray = savedSearchObject.props.awp0SearchFilterArray.dbValues;
    let filterDisplayString = '';
    for( i = 0; i < filterArray.length; i++ ) {
        filterDisplayString += filterArray[ i ];
        if( i + 1 < filterArray.length ) {
            filterDisplayString += ', ';
        }
    }

    let chartOnProperty = savedSearchObject.props.awp0ChartOn &&
        savedSearchObject.props.awp0ChartOn.uiValues[ 0 ] ? savedSearchObject.props.awp0ChartOn.uiValues[ 0 ] : undefined;
    let chartOnPropertyDisplayName = chartOnProperty ? searchFilterSvc.getCategoryDisplayName( chartOnProperty ) : '';
    let isShared = savedSearchObject.props.awp0is_global_shared &&
        savedSearchObject.props.awp0is_global_shared.uiValues[ 0 ] === 'True';
    let searchString = savedSearchObject.props.awp0search_string &&
        savedSearchObject.props.awp0search_string.uiValues[ 0 ] ? savedSearchObject.props.awp0search_string.uiValues[ 0 ] : '';
    let savedSearchName = savedSearchObject.props.object_name &&
        savedSearchObject.props.object_name.uiValues[ 0 ] ? savedSearchObject.props.object_name.uiValues[ 0 ] : '';
    return {
        chartOnProperty: chartOnProperty,
        chartOnPropertyDisplayName: chartOnPropertyDisplayName,
        isShared: isShared,
        searchString: searchString,
        savedSearchName: savedSearchName,
        filterDisplayString: filterDisplayString,
        searchFilterMap: searchFilterMap,
        savedSearchFilterMap: savedSearchFilterMap
    };
};

export let getFullTextSavedSearchObjectParams = function( savedSearchObject, data ) {
    let {
        chartOnProperty,
        chartOnPropertyDisplayName,
        isShared,
        searchString,
        savedSearchName,
        filterDisplayString,
        searchFilterMap,
        savedSearchFilterMap
    } = Awp0SaveSearchService.constructFullTextSavedSearchParams( savedSearchObject );

    return Awp0SaveSearchService.updateVMPropsForFullTextSavedSearch( data, chartOnPropertyDisplayName, isShared, searchString, savedSearchName, filterDisplayString, savedSearchFilterMap );
};

/**
 * updateSavedSearchObjectAttributeValues
 * @function updateSavedSearchObjectAttributeValues
 * @param {Object} savedSearchObject - saved search object
 * @returns {Object} savedSearchObject - updated saved search object
 */
export let updateSavedSearchObjectAttributeValues = function( savedSearchObject ) {
    let dbValues = _.map( savedSearchObject.props.savedsearch_attr_values.dbValues, function( dbValue ) {
        return advancedSearchUtils.generateAccumulatedStringForAttributeValues( false, dbValue );
    } );
    let uiValues = _.map( savedSearchObject.props.savedsearch_attr_values.uiValues, function( uiValue ) {
        return advancedSearchUtils.generateAccumulatedStringForAttributeValues( true, uiValue );
    } );
    savedSearchObject.props.savedsearch_attr_values.dbValues = dbValues;
    savedSearchObject.props.savedsearch_attr_values.uiValues = uiValues;
    return savedSearchObject;
};

export let setContext = ( isParentSavedSearchObject, executeAdvancedSavedSearch ) => {
    let validSavedSearchObject = isParentSavedSearchObject && isParentSavedSearchObject.uid ? isParentSavedSearchObject.uid.length > 0 : false;
    let validConditionForExecutingAdvancedSavedSearch = executeAdvancedSavedSearch && executeAdvancedSavedSearch === 'true';
    return {
        isSavedSearchObjectFromParent: validSavedSearchObject,
        executeAdvancedSavedSearch: validConditionForExecutingAdvancedSavedSearch
    };
};

export let initializeReviewAndExecuteSavedQuery = function( savedSearchObject, savedQuery, updateSavedSearchAttributeValues ) {
    let savedQueryUpdated = _.cloneDeep( savedQuery );
    let savedSearchObjectUpdated = updateSavedSearchAttributeValues ?
        saveSearchUtils.updateSavedSearchObjectWithSavedSearchCriteriaDisplayValues( savedSearchObject ) : savedSearchObject;
    savedQueryUpdated.uiValue = savedSearchObject.props.savedsearch_query.uiValues[ 0 ];
    savedQueryUpdated.dispValue = savedSearchObject.props.savedsearch_query.uiValues[ 0 ];
    savedQueryUpdated.dbValue = savedSearchObject.props.savedsearch_query.dbValues[ 0 ];
    return {
        savedQuery: savedQueryUpdated,
        savedSearchObject: savedSearchObjectUpdated
    };
};

export let getSavedSearchObjectParams = function( savedSearchObject, advSavedSearchModelObject, data ) {
    let updatedSavedSearchObject = saveSearchUtils.updateSavedSearchObjectWithSavedSearchCriteriaDisplayValues( savedSearchObject );

    let savedSearchName = updatedSavedSearchObject.props.object_name.dbValues[ 0 ];
    let props = advancedSearchSvc.getRealProperties( advSavedSearchModelObject, null, null, 'Advanced' );

    let savedSearchCriteria = '';
    for( var i = 0; i < updatedSavedSearchObject.props.savedsearch_attr_names.dbValues.length; i++ ) {
        try {
            updatedSavedSearchObject.props.savedsearch_attr_names.uiValues[ i ] = props[ updatedSavedSearchObject.props.savedsearch_attr_names.dbValues[ i ] ].propertyDescriptor.displayName;
            savedSearchCriteria = savedSearchCriteria + updatedSavedSearchObject.props.savedsearch_attr_names.uiValues[ i ] + '=' +
                updatedSavedSearchObject.props.savedsearch_attr_values.uiValues[ i ] + ';';
        } catch ( e ) {
            logger.info( updatedSavedSearchObject.props.savedsearch_attr_names.dbValues[ i ] +
                ' attribute does not exist in the list of attributes defined for the ' +
                updatedSavedSearchObject.props.savedsearch_query.uiValues[ 0 ] + ' saved query' );
        }
    }
    let updatedSavedSearchNameProp = _.cloneDeep( data.savedSearchName );
    let updatedSavedSearchCriteriaProp = _.cloneDeep( data.savedSearchCriteria );
    let updatedShareSavedSearchProp = _.cloneDeep( data.shareSavedSearch );

    updatedSavedSearchCriteriaProp.dbValue = savedSearchCriteria;
    updatedSavedSearchCriteriaProp.uiValue = savedSearchCriteria;
    updatedSavedSearchCriteriaProp.dispValue = savedSearchCriteria;

    updatedSavedSearchNameProp.dbValue = savedSearchName;
    updatedSavedSearchNameProp.uiValue = savedSearchName;
    updatedSavedSearchNameProp.dispValue = savedSearchName;

    updatedShareSavedSearchProp.dbValue = updatedSavedSearchObject.props.shared.dbValue;
    return {
        savedSearchName: updatedSavedSearchNameProp,
        savedSearchCriteria: updatedSavedSearchCriteriaProp,
        shareSavedSearch: updatedShareSavedSearchProp
    };
};

/**
 * setTypeForSavedSearchObject
 * @function setTypeForSavedSearchObject
 * @param {Object} vmo - view model object
 * @returns {String} vmo's type
 */
export let setTypeForSavedSearchObject = function( vmo ) {
    return vmo.type;
};

/**
 * executeFullTextSavedSearch
 * @function execFullTextSavedSearch
 * @param {Object}vmo - the view model object
 */
export let executeFullTextSavedSearch = function( vmo ) {
    var criteria = vmo.props.awp0search_string.dbValue;
    let filterMap = saveSearchUtils.getFilterMap( vmo );
    const categoryToChartOn = vmo.props.awp0ChartOn.dbValues[ 0 ];
    let tokenName = SEARCH_NAME_TOKEN;
    if( filterMap.hasOwnProperty( searchConstants.SS1_PART_SHAPE_FILTER ) || filterMap.hasOwnProperty( searchConstants.SS1_SHAPE_BEGIN_FILTER ) ||
     filterMap.hasOwnProperty( searchConstants.SS1_SHAPE_END_FILTER ) ) {
        tokenName = searchConstants.SHAPE_SEARCH_NAME_TOKEN;
    }

    AwStateService.instance.go( tokenName, {
        filter: searchFilterSvc.buildFilterString( filterMap ),
        searchCriteria: criteria,
        secondaryCriteria: '*',
        chartBy: categoryToChartOn,
        savedSearchUid: vmo.uid
    } );
};

/**
 * executeAdvancedSavedSearch
 * @function executeAdvancedSavedSearch
 * @param {Object}vmo - Saved Search VMO
 * @param {Object}advSavedSearchViewModelObject - the view model object containing empty advanced search attributes
 */
export let executeAdvancedSavedSearch = function( vmo, advSavedSearchViewModelObject ) {
    let savedQuery = {
        dbValue: vmo.props.savedsearch_query.dbValues[ 0 ],
        uiValue: vmo.props.savedsearch_query.uiValues[ 0 ]
    };
    Awp0SaveSearchService.reviewAndExecuteAdvancedSavedSearch( savedQuery, advSavedSearchViewModelObject, false, undefined );
};

/**
 * reviewAndExecuteAdvancedSavedSearch
 * @function reviewAndExecuteAdvancedSavedSearch
 * @param {Object}savedQuery - the saved query VMO
 * @param {Object}advSavedSearchViewModelObject - the view model object containing advanced search attributes
 * @param {Boolean}executeAdvancedSavedSearch - flag whether to directly execute advanced search or populate the saved query params map and then execute advanced search
 * @param {Object}searchState - searchState info
 */
export let reviewAndExecuteAdvancedSavedSearch = ( savedQuery, advSavedSearchViewModelObject, executeAdvancedSavedSearch, searchState ) => {
    if( executeAdvancedSavedSearch ) {
        advancedSearchSvc.doAdvancedSearch( savedQuery, advSavedSearchViewModelObject, searchState, true );
    } else {
        let savedQueryParametersMap = {};
        savedQueryParametersMap[ savedQuery.dbValue ] = savedQuery.uiValue;
        savedQueryParametersMap = advancedSearchUtils.populateSavedQueryParametersMap( advSavedSearchViewModelObject.props, savedQueryParametersMap );
        advancedSearchSvc.doAdvancedSavedSearch( ADVANCED_SEARCH_NAME_TOKEN, savedQuery.uiValue, savedQueryParametersMap );
    }
};

export let closeNavigationPanelInSavedSearchSublocation = ( searchState ) => {
    if( searchState.pwaSelection && searchState.pwaSelection.length === 0 ||
        searchState.pwaSelection && searchState.pwaSelection.length > 0 && searchState.pwaSelection[ 0 ].type === 'Awp0FullTextSavedSearch' ) {
        let eventData = {
            source: 'navigationPanel'
        };
        eventBus.publish( 'complete', eventData );
    }
};

export let getSavedSearchObjectParamsFromSearchState = ( searchState, data ) => {
    let savedSearchCriteria = '';
    for( const [ savedQueryAttributeKey, savedQueryAttributeValue ] of Object.entries( searchState.savedQueryAttributes ) ) {
        let displayName = searchState.searchCriteriaMap && searchState.searchCriteriaMap[ savedQueryAttributeKey ]
            && searchState.searchCriteriaMap[ savedQueryAttributeKey ].length > 0
            ? searchState.searchCriteriaMap[ savedQueryAttributeKey ][ 1 ] : savedQueryAttributeKey;
        savedSearchCriteria = savedSearchCriteria + displayName + '=' + savedQueryAttributeValue + ';';
    }

    let updatedSavedSearchCriteria = _.cloneDeep( data.savedSearchCriteria );
    updatedSavedSearchCriteria.dbValue = savedSearchCriteria;
    updatedSavedSearchCriteria.uiValue = savedSearchCriteria;
    updatedSavedSearchCriteria.dispValue = savedSearchCriteria;

    let updatedReferencingSavedQuery = _.cloneDeep( data.referencingSavedQuery );
    updatedReferencingSavedQuery.dbValue = searchState.savedQuery.value;
    updatedReferencingSavedQuery.uiValue = searchState.savedQuery.name;
    updatedReferencingSavedQuery.dispValue = searchState.savedQuery.name;

    return {
        savedSearchCriteria: updatedSavedSearchCriteria,
        referencingSavedQuery: updatedReferencingSavedQuery
    };
};

/* eslint-disable-next-line valid-jsdoc*/

const Awp0SaveSearchService = {
    getFullTextSavedSearchObjectParams,
    getSavedSearchObjectParams,
    setTypeForSavedSearchObject,
    executeFullTextSavedSearch,
    executeAdvancedSavedSearch,
    reviewAndExecuteAdvancedSavedSearch,
    updateSavedSearchObjectAttributeValues,
    initializeReviewAndExecuteSavedQuery,
    closeNavigationPanelInSavedSearchSublocation,
    getSavedSearchObjectParamsFromSearchState,
    constructFullTextSavedSearchParams,
    updateVMPropsForFullTextSavedSearch,
    setContext
};

export default Awp0SaveSearchService;
