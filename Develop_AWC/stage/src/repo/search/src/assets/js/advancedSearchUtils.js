// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 *
 * @module js/advancedSearchUtils
 */

import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import narrowModeService from 'js/aw.narrowMode.service';
import AwStateService from 'js/awStateService';
import dateTimeService from 'js/dateTimeService';

'use strict';

var _delimiterForArray = ';';
const INTERNAL_KEYWORD = '__I_N_T_E_R_N_A_L__';

/**
 * initTriState
 *
 * @function initTriState
 * @param {Object}prop - prop
 */
export let initTriState = function( prop ) {
    // if LOV entries were not provided, create one
    if( !prop.hasLov ) {
        prop.lovApi = {};
        // prop.propertyLabelDisplay = 'NO_PROPERTY_LABEL';
        prop.lovApi.getInitialValues = function( filterStr, deferred ) {
            var listModelTrue = {
                propDisplayValue: prop.propertyRadioTrueText,
                propInternalValue: true,
                propDisplayDescription: '',
                hasChildren: false,
                children: {},
                sel: false
            };
            var listModelFalse = {
                propDisplayValue: prop.propertyRadioFalseText,
                propInternalValue: false,
                propDisplayDescription: '',
                hasChildren: false,
                children: {},
                sel: false
            };
            var lovEntries = [];
            lovEntries.push( listModelTrue );
            lovEntries.push( listModelFalse );
            return deferred.resolve( lovEntries );
        };

        prop.lovApi.getNextValues = function( deferred ) {
            deferred.resolve( null );
        };

        prop.lovApi.validateLOVValueSelections = function( lovEntries ) { // eslint-disable-line no-unused-vars
            // Either return a promise or don't return anything. In this case, we don't want to return anything
        };
        prop.hasLov = true;
        prop.isSelectOnly = true;
    }
};

/**
 * populateAdvancedSearchCriteria
 *
 * @function populateAdvancedSearchCriteria
 * @param {Object}dbValue - dbValue
 * @param {Object}prop - prop
 * @param {Object}uiValue - uiValue
 * @param {Object}searchCriteriaMap - searchCriteriaMap
 * @param {Object}propName - propName
 * @param {Object}searchCriteriaUiValueMap - searchCriteriaUiValueMap
 */
export let populateAdvancedSearchCriteria = function( dbValue, prop, uiValue, searchCriteriaMap, propName, searchCriteriaUiValueMap ) {
    if( dbValue !== undefined && dbValue !== null ) {
        if( prop.propertyDescriptor && prop.propertyDescriptor.lovCategory === 1 && Array.isArray( dbValue ) && Array.isArray( uiValue ) ) {
            searchCriteriaMap[ propName ] = dbValue.join( _delimiterForArray );
            searchCriteriaUiValueMap[ propName ] = [ prop.propertyName, prop.propertyDisplayName, dbValue.join( _delimiterForArray ), uiValue.join( _delimiterForArray ) ];
        } else {
            searchCriteriaMap[ propName ] = advancedSearchUtils.removeTrailingSpecialCharacterFromCriteria( dbValue.toString() );
            searchCriteriaUiValueMap[ propName ] = [ prop.propertyName, prop.propertyDisplayName, String( prop.dbValue ), String( prop.uiValue ) ];
        }
    }
};

/**
 * getEnglishDateTime
 *
 * @function toMonthName
 * @param {Object}date - monthNumber
 * @return {Object}date
 */
const toMonthName=(monthNumber) =>{
    const date = new Date();
    date.setMonth(monthNumber - 1);
  
    return date.toLocaleString('en-US', {
      month: 'short'
    });
  };

/**
 * getEnglishDateTime
 *
 * @function getEnglishDateTime
 * @param {Object}d - date
 * @return {Object}dformat
 */
const getEnglishDateTime = (d) =>{
        var dformat = [(d.getDate()<10?'0'+d.getDate():d.getDate()),
        (toMonthName(d.getMonth()+1)),
        d.getFullYear()].join('-') +' ' +
        [d.getHours()<10?'0'+d.getHours():d.getHours(),
        d.getMinutes()<10?'0'+d.getMinutes():d.getMinutes()].join(':');
    return dformat;
}; 

/**
 * setAdvancedSearchCriteria
 *
 * @function setAdvancedSearchCriteria
 * @param {Object}searchCriteriaMap - searchCriteriaMap
 * @param {Object}prop - prop
 * @param {Object}searchCriteriaUiValueMap - searchCriteriaMap
 */
export let setAdvancedSearchCriteria = function( searchCriteriaMap, prop, searchCriteriaUiValueMap ) {
    var propName = prop.propertyName;
    var propDisplayName = prop.propertyDisplayName;
    if( propName && propDisplayName && !isPropEmpty( prop.uiValue ) ) {
        propName = propName.trim();
        propDisplayName = propDisplayName.trim();
        var pickedValue = {};
        var dbValue = null;
        var uiValue = null;
        if( prop.type === 'DATE' ) {
            if( prop.dateApi && prop.dateApi.dateValue ) {
                var date = new Date( prop.dbValue );
                if( date.getTime() ) {
                    var newDate = getEnglishDateTime(date);
                    dbValue = dateTimeService.formatSessionDateTime( newDate );
                }
            }
        } else {
            if( prop.propertyDescriptor && prop.propertyDescriptor.lovCategory === 1 ) {
                advancedSearchUtils.pickPropValues( prop, pickedValue );
                dbValue = pickedValue.dbValue;
                uiValue = pickedValue.uiValue;
            } else {
                dbValue = prop.dbValue;
            }
        }
        advancedSearchUtils.populateAdvancedSearchCriteria( dbValue, prop, uiValue, searchCriteriaMap, propName, searchCriteriaUiValueMap );
    }
};

/**
 * pickPropValuesWhenPropIsEmpty
 *
 * @function pickPropValuesWhenPropIsEmpty
 * @param {Object}prop - prop
 * @param {Array}valuesPicked - valuesPicked
 * @return {Array}valuesPicked
 */
let pickPropValuesWhenPropIsEmpty = function( prop, valuesPicked ) {
    if( Array.isArray( prop.uiValue ) ) {
        valuesPicked = prop.uiValue;
    } else {
        valuesPicked.push( prop.uiValue );
    }
    return valuesPicked;
};

/**
 * pickPropValuesWhenPropIsNotEmpty
 *
 * @function pickPropValuesWhenPropIsNotEmpty
 * @param {Object}prop - prop
 * @param {Array}valuesPicked - valuesPicked
 * @return {Array}valuesPicked
 */
let pickPropValuesWhenPropIsNotEmpty = function( prop, valuesPicked ) {
    if( prop.uiValues.join( ',' ) === prop.uiValue ) {
        valuesPicked = prop.uiValues;
    } else {
        if( Array.isArray( prop.uiValue ) ) {
            valuesPicked = prop.uiValue;
        } else {
            valuesPicked.push( prop.uiValue );
        }
    }
    return valuesPicked;
};

/**
 * pickPropValues
 *
 * @function pickPropValues
 * @param {Object}prop - prop
 * @param {Object}pickedValue - pickedValue
 */
export let pickPropValues = function( prop, pickedValue ) {
    pickedValue.dbValue = [];
    pickedValue.uiValue = [];
    if( prop.newDisplayValues && prop.newDisplayValues.length > 0 ) {
        if( prop.dbValue && prop.dbValue.length > 0 && prop.dbValue !== prop.uiValue ) {
            pickedValue.dbValue = prop.dbValue;
        }

        pickedValue.uiValue = prop.newDisplayValues;
    } else {
        var valuesPicked = [];
        if( !isPropEmpty( prop.dbValue ) ) {
            if( isPropEmpty( prop.uiValues ) ) {
                valuesPicked = pickPropValuesWhenPropIsEmpty( prop, valuesPicked );
            } else {
                valuesPicked = pickPropValuesWhenPropIsNotEmpty( prop, valuesPicked );
            }
        } else {
            //only uiValue, this is for type-in value
            valuesPicked = prop.uiValue;
        }
        assignDbValue( pickedValue, valuesPicked );
        pickedValue.uiValue = valuesPicked;
    }
};

/**
 * setAdvancedSearchCriteriaMap
 * @function setAdvancedSearchCriteriaMap
 * @param {Object}awp0AdvancedQueryAttributes - awp0AdvancedQueryAttributes
 * @param {Object}searchCriteriaMap - searchCriteriaMap
 * @return {Object} searchCriteriaUiValueMap
 */
export const setAdvancedSearchCriteriaMap = ( awp0AdvancedQueryAttributes, searchCriteriaMap ) => {
    var searchCriteriaUiValueMap = {};
    _.forEach( awp0AdvancedQueryAttributes.props, function( prop ) {
        advancedSearchUtils.setAdvancedSearchCriteria( searchCriteriaMap, prop, searchCriteriaUiValueMap );
    } );

    return searchCriteriaUiValueMap;
};

/**
 * removeTrailingSpecialCharacterFromCriteria
 * @function removeTrailingSpecialCharacterFromCriteria
 * @param {String}criteria - criteria
 * @return {String} cleaned criteria
 */
export let removeTrailingSpecialCharacterFromCriteria = function( criteria ) {
    if( criteria && criteria.endsWith( _delimiterForArray ) ) {
        criteria = criteria.substr( 0, criteria.length - 1 );
    }
    return criteria;
};

/**
 * getSearchId
 * @function getSearchId
 * @param {String}queryUID - queryUID
 * @return {String} advanced search Id
 */
export let getSearchId = function( queryUID ) {
    //Unique Search ID: search_object_UID + logged_in_user_UID + current_time
    var userCtx = appCtxService.getCtx( 'user' );
    var loggedInUserUid = userCtx.uid;
    var timeSinceEpoch = new Date().getTime();
    return queryUID + loggedInUserUid + timeSinceEpoch;
};

/**
 * closeAdvancedPanelNarrow
 * @function closeAdvancedPanelNarrow
 * @param {Number}source - source
 */
export let closeAdvancedPanelNarrow = function( source ) {
    if( narrowModeService.isNarrowMode() ) {
        eventBus.publish( 'complete', {
            source: source
        } );
    }
};

/**
 * isPropEmpty
 * @function isPropEmpty
 * @param {Object}prop - prop
 * @returns {BOOLEAN} - true if not empty
 */
export let isPropEmpty = function( prop ) {
    return prop === undefined || prop === null || prop === '' || prop.length === 0 || prop.length === 1 && prop[ 0 ] === '';
};

/**
 * buildURLForAdvancedSavedSearch
 * @function buildURLForAdvancedSavedSearch
 * @param {Object}savedQueryParametersMap - A map containing saved query attributes
 * @returns {String}filterString - A String containing the saved query attributes for the URL
 */
export let buildURLForAdvancedSavedSearch = function( savedQueryParametersMap ) {
    var filterString = '';
    var i = 0;
    _.forEach( savedQueryParametersMap, function( value, key ) {
        i++;
        filterString += key;
        filterString += '=';
        if( Array.isArray( value ) ) {
            filterString += value.join( _delimiterForArray );
        } else {
            filterString += value;
        }
        if( i < Object.keys( savedQueryParametersMap ).length ) {
            filterString += '~';
        }
    } );
    return filterString;
};

/**
 * updateURLForAdvancedSearch
 * @function updateURLForAdvancedSearch
 * @param {Object}data - the view model data
 */
export let updateURLForAdvancedSearch = function( savedQueryObject, awp0AdvancedQueryAttributes ) {
    var savedQueryParametersMap = {};
    var savedQueryAttributes = awp0AdvancedQueryAttributes.props;

    if( savedQueryObject !== null && !isPropEmpty( savedQueryObject.dbValue ) ) {
        savedQueryParametersMap[ savedQueryObject.dbValue ] = savedQueryObject.uiValue;
        savedQueryParametersMap = advancedSearchUtils.populateSavedQueryParametersMap( savedQueryAttributes, savedQueryParametersMap );
        AwStateService.instance.go( '.', {
            savedQueryParameters: advancedSearchUtils.buildURLForAdvancedSavedSearch( savedQueryParametersMap ),
            savedQueryName: savedQueryObject.uiValues[ 0 ]
        } );
    }
};

/**
 * populateQueryAttributesForLovProperty - populate the viewmodel property with the info from the queryAttributes created from URL
 * @function populateQueryAttributesForLovProperty
 * @param {Object} prop - the view model property for the LOV
 * @param {string} attributeValue - the LOV attribute value from the URL
 * @returns {Object} prop - updated view model property for the LOV
 */
export let populateQueryAttributesForLovProperty = function( prop, attributeValue ) {
    var values = attributeValue.split( _delimiterForArray );
    prop.newDisplayValues = [];
    prop.displayValues = [];
    for( let index = 0; index < values.length; index++ ) {
        let displayAndInternalPair = values[ index ].split( INTERNAL_KEYWORD );
        let internalValue;
        let displayValue;
        if( displayAndInternalPair && displayAndInternalPair.length === 2 ) {
            internalValue = displayAndInternalPair[ 1 ];
            displayValue = displayAndInternalPair[ 0 ];
            prop.dbValue.push( internalValue );
            prop.dbValues.push( internalValue );
        } else {
            displayValue = values[ index ];
            prop.dbValue.push( values[ index ] );
            prop.dbValues.push( values[ index ] );
        }
        prop.uiValues.push( displayValue );
        prop.newDisplayValues.push( displayValue );
        prop.displayValues.push( displayValue );
        prop.value.push( displayValue );
        prop.displayValsModel.push( {
            displayValue: displayValue,
            selected: false
        } );
        if( index !== values.length - 1 ) {
            prop.uiValue += displayValue;
            prop.uiValue += ', ';
        } else {
            prop.uiValue += displayValue;
        }
    }
    return prop;
};

/**
 * populateQueryAttributesForSavedSearch
 * @function populateQueryAttributesForSavedSearch
 * @param {Object} queryAttributesVMO - queryAttributesVMO
 * @param {string} queryAttributeValues - queryAttributeValues
 * @returns {Object} updatedAttributesVMO
 */
export let populateQueryAttributesForSavedSearch = function( queryAttributesVMO, queryAttributeValues ) {
    let updatedAttributesVMO = _.cloneDeep( queryAttributesVMO );
    updatedAttributesVMO = queryAttributeValues ? advancedSearchUtils.clearAllAction( updatedAttributesVMO ) : updatedAttributesVMO;
    _.forEach( updatedAttributesVMO.props, function( prop ) {
        var keepGoing = true;

        _.forEach( queryAttributeValues, function( val, key ) {
            if( keepGoing === true ) {
                if( key === prop.propertyName && prop.type !== 'DATE' ) {
                    if( prop.propertyDescriptor && prop.propertyDescriptor.lovCategory === 1 ) {
                        prop = advancedSearchUtils.populateQueryAttributesForLovProperty( prop, val );
                    } else {
                        prop.uiValue = val;
                        advancedSearchUtils.assignDbValue( prop, val );
                    }
                    keepGoing = false;
                } else if( prop.type === 'DATE' && key === prop.propertyName ) {
                    prop.dbValue = new Date( val ).getTime();
                    prop.dateApi.dateObject = new Date( val );
                    prop.dateApi.dateValue = dateTimeService.formatDate( prop.dateApi.dateObject, dateTimeService.getSessionDateFormat() );
                    prop.dateApi.timeValue = dateTimeService.formatTime( prop.dateApi.dateObject, dateTimeService.getSessionTimeFormat() );
                    prop.uiValue = val;
                    keepGoing = false;
                }
            }
        } );
    } );
    return updatedAttributesVMO;
};

/**
 * clearAllAction
 * @function clearAllAction
 * @param {Object}attributes - attributes
 * @returns {Object}newAttributes
 */
export let clearAllAction = function( attributes ) {
    let newAttributes = _.cloneDeep( attributes );
    _.forEach( newAttributes.props, function( prop ) {
        prop.searchText = '';
        if( prop.type === 'DATE' ) {
            prop.newDisplayValues = [ '' ];
            prop.newValue = dateTimeService.getNullDate();
            prop.dbValue = dateTimeService.getNullDate();
            prop.dateApi.dateObject = null;
            prop.dateApi.dateValue = '';
            prop.dateApi.timeValue = '';
            prop.dbValues = [];
            prop.displayValues = [];
            prop.uiValue = '';
            prop.uiValues = [];
            prop.value = 0;
        } else {
            var propName = prop.propertyName;
            var propDisplayName = prop.propertyDisplayName;
            if( propName && propDisplayName && ( prop.dbValue || prop.newValue ) ) {
                if( prop.propertyDescriptor && prop.propertyDescriptor.lovCategory === 1 ) {
                    prop.dbValue = [];
                    prop.value = [];
                    prop.displayValsModel = [];
                } else {
                    prop.dbValue = '';
                    prop.value = '';
                }
                prop.dbValues = [];
                prop.displayValues = [];
                prop.uiValue = '';
                prop.uiValues = [];
                prop.newValue = '';
                prop.newDisplayValues = [];
            }
        }
    } );
    return newAttributes;
};

/**
 * getSavedQueryAttributesFromURL
 * @function getSavedQueryAttributesFromURL
 * @param {String}savedQueryParametersString - the URL string
 * @returns {Object}savedQueryMap - object containing name/value pair for saved query attributes
 */
export let getSavedQueryAttributesFromURL = function( savedQueryParametersString ) {
    var savedQueryAttributes = savedQueryParametersString.split( '~' );
    var savedQueryAttributesMap = {};
    var savedQueryNameMap = {};
    var firstNameValuePairFlag = true;
    _.forEach( savedQueryAttributes, function( nameValuePairString ) {
        if( !firstNameValuePairFlag ) {
            var nameValuePair = nameValuePairString.split( '=' );
            savedQueryAttributesMap[ nameValuePair[ 0 ] ] = nameValuePair[ 1 ];
        } else {
            nameValuePair = nameValuePairString.split( '=' );
            savedQueryNameMap[ 0 ] = nameValuePair[ 0 ];
            savedQueryNameMap[ 1 ] = nameValuePair[ 1 ];
            firstNameValuePairFlag = false;
        }
    } );
    var savedQueryMap = {};
    savedQueryMap.savedQueryNameMap = savedQueryNameMap;
    savedQueryMap.savedQueryAttributesMap = savedQueryAttributesMap;
    return savedQueryMap;
};

/**
 * populateSavedQueryParametersMap
 * @function populateSavedQueryParametersMap
 * @param {Object}savedQueryAttributes - saved query attribute values
 * @param {Object}savedQueryParametersMap - saved query parameters map with saved query dbValue and uiValue pair
 * @returns {Object}savedQueryParametersMap - the saved query parameters populated in a Map
 */
export let populateSavedQueryParametersMap = function( savedQueryAttributes, savedQueryParametersMap ) {
    _.forEach( savedQueryAttributes, function( prop ) {
        if( prop.type !== 'DATE' && !advancedSearchUtils.isPropEmpty( prop.dbValue ) ) {
            if( prop.propertyDescriptor && prop.propertyDescriptor.lovCategory === 1 ) {
                let displayAndInternalVals = [];
                for( let index = 0; index < prop.displayValues.length; index++ ) {
                    displayAndInternalVals[ index ] = prop.displayValues[ index ] + INTERNAL_KEYWORD + prop.dbValue[ index ];
                }
                savedQueryParametersMap[ prop.propertyName ] = displayAndInternalVals;
            } else {
                savedQueryParametersMap[ prop.propertyName ] = prop.uiValue;
            }
        } else if( prop.type === 'DATE' && prop.uiValue !== '' ) {
            savedQueryParametersMap[ prop.propertyName ] = prop.uiValue;
        }
    } );
    return savedQueryParametersMap;
};

/**
 * getAdvancedSearchParametersForURL
 * @function getAdvancedSearchParametersForURL
 * @param {Object}savedSearchObject - the saved search VMO
 * @param {Object}advancedSearchViewModelObject - the advanced search VMO with values populated from Saved Search Object
 * @returns {Object} advancedSearchParam - object containing advanced search parameters for creating URL
 */
export let getAdvancedSearchParametersForURL = ( savedSearchObject, advancedSearchViewModelObject ) => {
    let savedQueryParametersMap = {};
    savedQueryParametersMap[ savedSearchObject.props.savedsearch_query.dbValues[ 0 ] ] = savedSearchObject.props.savedsearch_query.uiValues[ 0 ];
    savedQueryParametersMap = advancedSearchUtils.populateSavedQueryParametersMap( advancedSearchViewModelObject.props, savedQueryParametersMap );
    let url = advancedSearchUtils.buildURLForAdvancedSavedSearch( savedQueryParametersMap );
    let advancedSearchParam = {};
    advancedSearchParam.savedQueryName = savedSearchObject.props.savedsearch_query.uiValues[ 0 ];
    advancedSearchParam.savedQueryParameters = url;
    advancedSearchParam.pinned = 'true';
    return advancedSearchParam;
};

/**
 * assignDbValue
 * @function assignDbValue
 * @param {Object}prop - prop
 * @param {Object}val - val
 * @returns {Object}prop - after dbValue is assigned
 */
export let assignDbValue = function( prop, val ) {
    if( prop.type === 'BOOLEAN' ) {
        if ( val === true || val === false ) {
            prop.dbValue = val;
        }else{
            let valTemp = val.toUpperCase();
            if ( valTemp === 'YES' || valTemp === 'TRUE' ) {
                prop.dbValue = true;
            } else{
                prop.dbValue = false;
            }
        }
    } else{
        prop.dbValue = val;
    }
    return prop;
};

export let generateAccumulatedStringForAttributeValues = ( getDisplayName, attributeValue ) => {
    let values = attributeValue.split( advancedSearchUtils._delimiterForArray );
    let accumulativeValue = '';
    for( let index = 0; index < values.length; index++ ) {
        let displayInternalNamePair = values[ index ].split( advancedSearchUtils.INTERNAL_KEYWORD );
        let value;
        if( displayInternalNamePair.length === 2 ) {
            value = getDisplayName ? displayInternalNamePair[ 0 ] : displayInternalNamePair[ 1 ];
        } else {
            value = displayInternalNamePair[ 0 ];
        }
        accumulativeValue += value;
        if( index !== values.length - 1 ) {
            accumulativeValue += advancedSearchUtils._delimiterForArray;
        }
    }
    return accumulativeValue;
};

var loadConfiguration = function() {
    let listSeparator = appCtxService.getCtx( 'preferences.WSOM_find_list_separator' );
    _delimiterForArray = listSeparator && _.isArray( listSeparator ) ? listSeparator[ 0 ] : ';';
};

export const getWSOMFindSetSearchLimit = function() {
    var preferenceValue = appCtxService.getCtx( 'preferences.WSOM_find_set_search_limit' );
    if( preferenceValue && parseInt(preferenceValue) > 0 ) {
        return parseInt(preferenceValue);
    }
    return null;
};

loadConfiguration();

const advancedSearchUtils = {
    _delimiterForArray,
    INTERNAL_KEYWORD,
    initTriState,
    populateAdvancedSearchCriteria,
    setAdvancedSearchCriteria,
    pickPropValues,
    setAdvancedSearchCriteriaMap,
    removeTrailingSpecialCharacterFromCriteria,
    getSearchId,
    closeAdvancedPanelNarrow,
    isPropEmpty,
    buildURLForAdvancedSavedSearch,
    updateURLForAdvancedSearch,
    populateQueryAttributesForSavedSearch,
    getSavedQueryAttributesFromURL,
    populateSavedQueryParametersMap,
    getAdvancedSearchParametersForURL,
    assignDbValue,
    clearAllAction,
    populateQueryAttributesForLovProperty,
    generateAccumulatedStringForAttributeValues,
    getWSOMFindSetSearchLimit
};
export default advancedSearchUtils;
