// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/searchSettingsService
 */
import appCtxService from 'js/appCtxService';
import soaSvc from 'soa/kernel/soaService';
import _ from 'lodash';
import AwStateService from 'js/awStateService';

function selectExpandedList( dbValues ) {
    let tempList = [];
    _.forEach( dbValues, function( tempItem2 ) {
        tempList.push( tempItem2 );
    } );
    return tempList;
}

function isSaveValid( item, expandedPref ) {
    let counter1 = 0;
    let dbValue = item.dbValue;
    let tempPref = expandedPref;
    if( expandedPref.length === 1 && expandedPref[ 0 ] === '' ) {
        expandedPref.pop();
    }
    if( dbValue.length !== tempPref.length ) {
        return true;
    }

    dbValue = item.dbValues;
    if( tempPref.length ) {
        _.forEach( dbValue, function( temp3 ) {
            _.forEach( tempPref, function( temp4 ) {
                if( temp3 === temp4 ) {
                    counter1++;
                }
            } );
        } );

        if( counter1 !== tempPref.length ) {
            return true;
        }
        return false;
    }
}

/**
 * validate_AW_TypeAheadFacetSearch_Delay
 * @function validate_AW_TypeAheadFacetSearch_Delay
 * @param {INTEGER}dbValue - dbValue
 */
export let validate_AW_TypeAheadFacetSearch_Delay = function( dbValue ) {
    return dbValue > 50 && dbValue < 1000;
};

/**
 * doAddToChangedPreferences
 * @function doAddToChangedPreferences
 * @param {ViewModelProperty}prop - ViewModelProperty
 */

export let doAddToChangedPreferences = function( viewModelPrefs ) {
    var changedPreferenceValues = [];
    _.map( viewModelPrefs, function( item ) {
        if( item.value !== item.dbValue && item.valueUpdated === true && item.propertyName !== 'AWC_Limited_Filter_Categories_Expanded' && item.propertyName !== 'AWC_Search_Filter_Panel_Groups_Expanded' ) {
            changedPreferenceValues.push( item );
        }
        if( item.propertyName === 'AWC_Limited_Filter_Categories_Expanded' ) {
            if( isSaveValid( item, viewModelPrefs.expandedPref ) ) {
                _.forEach( item.displayValsModel, function( selection ) {
                    selection.selected = true;
                } );
                changedPreferenceValues.push( item );
            }
        }
        if( item.propertyName === 'AWC_Search_Filter_Panel_Groups_Expanded' ) {
            if( isSaveValid( item, viewModelPrefs.expandedGroupPref ) ) {
                _.forEach( item.displayValsModel, function( selection ) {
                    selection.selected = true;
                } );
                changedPreferenceValues.push( item );
            }
        }
    } );

    return changedPreferenceValues;
};

/**
 * load all the preferences
 * @function loadViewModel
 * @param {Object}data - the view model data
 */
export let loadViewModel = function( data ) {
    let prefs = appCtxService.getCtx( 'preferences' );
    let expandedPref = prefs.AWC_Limited_Filter_Categories_Expanded ? prefs.AWC_Limited_Filter_Categories_Expanded : [];
    let expandedGroupPref = prefs.AWC_Search_Filter_Panel_Groups_Expanded ? prefs.AWC_Search_Filter_Panel_Groups_Expanded : [];
    let wildCardPref = prefs.AWC_search_filter_wildcard;
    var wildCard = data.wildCard[ wildCardPref ];
    let new_AWC_Limited_Filter_Categories_Expanded = { ...data.AWC_Limited_Filter_Categories_Expanded };
    let new_AWC_Search_Filter_Panel_Groups_Expanded = { ...data.AWC_Search_Filter_Panel_Groups_Expanded };
    let new_AWC_search_filter_wildcard = { ...data.AWC_search_filter_wildcard };
    let dbV = [];
    let uiValuesToBeShown = [];
    let tempData = '';
    var display = [];
    let dbVGroup = [];
    let groupUiValuesToBeShown = [];
    let groupTempData = '';
    var groupDisplay = [];

    let new_AWC_Search_Filter_Categories_Display_Mode = { ...data.AWC_Search_Filter_Categories_Display_Mode };
    new_AWC_Search_Filter_Categories_Display_Mode.dbValue = prefs.AWC_Search_Filter_Categories_Display_Mode[0] === '1' ? true : false;
    new_AWC_Search_Filter_Categories_Display_Mode.value = prefs.AWC_Search_Filter_Categories_Display_Mode[0] === '1' ? true : false;

    _.forEach( data.defaultExpandedFilterList, function( item ) {
        _.forEach( expandedPref, function( temp ) {
            let property = JSON.parse( item );
            if( temp === property.internalName ) {
                uiValuesToBeShown.push( property.displayName );
                display.push( property.displayName );
                dbV.push( property.internalName );
                tempData += tempData === '' ? '' : ', ';
                tempData += property.displayName;
            }
        } );
    } );


    new_AWC_search_filter_wildcard.dbValue = wildCard;
    new_AWC_search_filter_wildcard.uiValue = wildCard;
    new_AWC_search_filter_wildcard.uiValues = wildCard;

    new_AWC_Limited_Filter_Categories_Expanded.dbValue = uiValuesToBeShown;
    new_AWC_Limited_Filter_Categories_Expanded.uiValue = tempData;
    new_AWC_Limited_Filter_Categories_Expanded.uiValues = display;
    new_AWC_Limited_Filter_Categories_Expanded.displayValues = display;
    new_AWC_Limited_Filter_Categories_Expanded.dbValues = dbV;

    _.forEach( data.defaultExpandedGroupList, function( item ) {
        _.forEach( expandedGroupPref, function( temp ) {
            let property = JSON.parse( item );
            if( temp === property.internalName ) {
                groupUiValuesToBeShown.push( property.displayName );
                groupDisplay.push( property.displayName );
                dbVGroup.push( property.internalName );
                groupTempData += groupTempData === '' ? '' : ', ';
                groupTempData += property.displayName;
            }
        } );
    } );

    new_AWC_Search_Filter_Panel_Groups_Expanded.dbValue = groupUiValuesToBeShown;
    new_AWC_Search_Filter_Panel_Groups_Expanded.uiValue = groupTempData;
    new_AWC_Search_Filter_Panel_Groups_Expanded.uiValues = groupDisplay;
    new_AWC_Search_Filter_Panel_Groups_Expanded.displayValues = groupDisplay;
    new_AWC_Search_Filter_Panel_Groups_Expanded.dbValues = dbVGroup;
    

    return {
        expandedPref: expandedPref,
        AWC_Limited_Filter_Categories_Expanded: new_AWC_Limited_Filter_Categories_Expanded,
        AWC_search_filter_wildcard: new_AWC_search_filter_wildcard,
        AWC_Search_Filter_Panel_Groups_Expanded: new_AWC_Search_Filter_Panel_Groups_Expanded,
        expandedGroupPref: expandedGroupPref,
        AWC_Search_Filter_Categories_Display_Mode: new_AWC_Search_Filter_Categories_Display_Mode
    };
};

/**
 * getFiltersExpanded
 * @function getFiltersExpanded
 * @param {ViewModelProperty}prop - the view model property
 * @param {BOOLEAN}isDefault - true if getting default/site
 * @param {BOOLEAN}isGroup - true if getting group
 */
export let getFiltersExpanded = function( prop, isDefault, isGroup, data ) {
    let filterListStringArray;
    if ( isGroup )
    {
        filterListStringArray = data.defaultExpandedGroupList;
    }
    else
    {
        filterListStringArray = isDefault ? data.defaultExpandedFilterList : data.custom;
    }
    let expandedListInUse = [];
    let allSelectedList = selectExpandedList( prop.dbValues );
    _.forEach( filterListStringArray, function( item ) {
        let property = JSON.parse( item );
        if( allSelectedList.length > 0 ) {
            _.forEach( allSelectedList, function( tempItem ) {
                if( tempItem === property.internalName ) {
                    property.selected = 'true';
                }
            } );
        }
        expandedListInUse.push( property );
    } );

    let filtersSelected = _.filter( expandedListInUse, function( o ) { return o.selected === 'true'; } );
    if( !isDefault ) {
        //this is the original custom SELECTED filters
        data.filtersSelected = filtersSelected;
    }
    var db = [];
    var display = [];
    let displayValStr = '';
    if( filtersSelected && filtersSelected.length > 0 ) {
        filtersSelected.forEach( function( val ) {
            db.push( val.internalName );
            display.push( val.displayName );
            displayValStr += displayValStr === '' ? '' : ', ';
            displayValStr += val.displayName;
        } );
    }
    let newprop = { ...prop };
    newprop.dbValue = db;
    newprop.uiValues = display;
    newprop.displayValues = display;
    newprop.uiValue = displayValStr;

    return {
        expandedListInUse: expandedListInUse,
        newprop: newprop
    };
};

/**
 * updateSearchStateAndPreferencesForSaveAction
 * @param {Object} changedPreferenceValues - the updated view model properties
 * @param {Object} searchState - searchState info
 * @param {Array} propertyNames - the keys of the view model properties
 * @param {Object} updatedPreferenceValues - updated preference values
 */
export let updateSearchStateAndPreferencesForSaveAction = ( changedPreferenceValues, searchState, propertyNames, updatedPreferenceValues ) => {
    let newSearchState = { ...searchState.value };
    let updateSearchState = false;
    _.forEach( propertyNames, function( propertyName ) {
        let eachProp = changedPreferenceValues[ propertyName ];
        let value = eachProp.newValue;
        switch ( eachProp.propertyName ) {
            case 'AWC_Limited_Filter_Categories_Expanded': {
                updatedPreferenceValues[ eachProp.propertyName ] = value;
                break;
            }
            case 'AWC_Search_Show_Auto_Update_Filters': {
                newSearchState.showAutoUpdateFilteringOption = eachProp.dbValue;
                updateSearchState = true;
                break;
            }
            case 'AWC_Limited_Filter_Categories_Enabled': {
                if( newSearchState.criteria ) {
                    newSearchState.criteria.limitedFilterCategoriesEnabled = value.toString();
                    updateSearchState = true;
                }
                break;
            }
            case 'AWC_select_firstobject_inSearchLocation': {
                newSearchState.forceChart = !value;
                updateSearchState = true;
                break;
            }
            case 'AWC_Search_Filter_Panel_Groups_Expanded': {
                updatedPreferenceValues[ eachProp.propertyName ] = value;
                break;
            }
            case 'AWC_Search_Filter_Categories_Display_Mode': {
                if( newSearchState.criteria ) {
                    newSearchState.criteria.groupCategoriesEnabled = value.toString();
                    updateSearchState = true;
                }
                break;
            }
            default:
                updatedPreferenceValues[ eachProp.propertyName ] = [ value.toString() ];
                break;
        }
    } );
    if( updateSearchState ) {
        searchState.update( newSearchState );
    }
    appCtxService.updatePartialCtx( 'preferences', updatedPreferenceValues );
};

/**
 * saveSettings
 * @param {Object} data - view model data
 * @param {Object} searchState - searchState info
 */
export let saveSettings = ( data, searchState ) => {
    let preferenceInput = [];

    let newPrefs = appCtxService.getCtx( 'preferences' );
    var keys = Object.keys( data.changedPreferenceValues );
    _.forEach( keys, function( propertyName ) {
        let eachProp = data.changedPreferenceValues[ propertyName ];
        if( eachProp.isArray && eachProp.dbValue && eachProp.dbValue.length > 1 ) {
            newPrefs[ eachProp.propertyName ] = eachProp.newValue;
            preferenceInput.push( {
                preferenceName: eachProp.propertyName,
                values: eachProp.newValue
            } );
        } else {
            let tempVal;
            if( eachProp.dbValue && eachProp.dbValue.length === 0) {
                tempVal= eachProp.dbValue;
            } else {
                tempVal = [ eachProp.dbValue || eachProp.dbValue === false || eachProp.dbValue === 0 ? eachProp.dbValue.toString() : '' ];
            }   
            newPrefs[ eachProp.propertyName ] = tempVal;
            if ( eachProp.propertyName === 'AWC_Search_Filter_Categories_Display_Mode' ){
                if ( tempVal[0] === 'false' ){
                    tempVal[0] = '2';
                } else{
                    tempVal[0] = '1';
                }
            }

            preferenceInput.push( {
                preferenceName: eachProp.propertyName,
                values: tempVal
            } );
             
        }
    } );
    soaSvc.post( 'Administration-2012-09-PreferenceManagement', 'setPreferences2', { preferenceInput: preferenceInput } ).then( function() {
        searchSettingsService.updateSearchStateAndPreferencesForSaveAction( data.changedPreferenceValues, searchState, keys, newPrefs );
        searchSettingsService.refreshSettings();
    }, function( reason ) {
        console.error( reason );
    } );
};

export let loadWildCardInfo = function( data, prop ) {
    let lovEntries = [];
    var wildCards = {
        0: data.i18n.noWildCard,
        1: data.i18n.trailingWildCard,
        2: data.i18n.leadingWildCard,
        3: data.i18n.bothWildCard
    };

    lovEntries.push( {
        propDisplayValue: wildCards[ '0' ],
        propInternalValue: '0',
        propDisplayDescription: '',
        hasChildren: false,
        children: {},
        sel: prop.dbValue === '0'
    } );
    lovEntries.push( {
        propDisplayValue: wildCards[ '1' ],
        propInternalValue: '1',
        propDisplayDescription: '',
        hasChildren: false,
        children: {},
        sel: prop.dbValue === '1'
    } );
    lovEntries.push( {
        propDisplayValue: wildCards[ '2' ],
        propInternalValue: '2',
        propDisplayDescription: '',
        hasChildren: false,
        children: {},
        sel: prop.dbValue === '2'
    } );
    lovEntries.push( {
        propDisplayValue: wildCards[ '3' ],
        propInternalValue: '3',
        propDisplayDescription: '',
        hasChildren: false,
        children: {},
        sel: prop.dbValue === '3'
    } );

    return {
        wildCardValues: lovEntries,
        wildCardTotalFound: lovEntries.length
    };
};
export let loadData_FilterExpanded = function( prop, data ) {
    let output = searchSettingsService.getFiltersExpanded( prop, true, false, data );

    let newProp = output.newprop;
    var lovEntries = [];
    _.forEach( output.expandedListInUse, function( entry ) {
        let lovEntry = {
            propDisplayValue: entry.displayName,
            propInternalValue: entry.internalName,
            propDisplayDescription: '',
            sel: entry.selected === 'true',
            isChecked: entry.selected === 'true',
            disabled: entry.disabled
        };
        lovEntries.push( lovEntry );
    } );

    return {
        filtersExpandedValues: lovEntries,
        filtersExpandedTotalFound: lovEntries.length,
        newProp: newProp
    };
};

export let loadData_GroupExpanded = function( prop, data ) {
    let output = searchSettingsService.getFiltersExpanded( prop, true, true, data );

    let newProp = output.newprop;
    var lovEntries = [];
    _.forEach( output.expandedListInUse, function( entry ) {
        let lovEntry = {
            propDisplayValue: entry.displayName,
            propInternalValue: entry.internalName,
            propDisplayDescription: '',
            sel: entry.selected === 'true',
            isChecked: entry.selected === 'true',
            disabled: entry.disabled
        };
        lovEntries.push( lovEntry );
    } );

    return {
        groupsExpandedValues: lovEntries,
        groupssExpandedTotalFound: lovEntries.length,
        newProp: newProp
    };
};

export let refreshSettings = function() {
    //search settings panel can be launched on any Search sublocations,
    //but the existing settings are really about fulltext search, so we only reload when it's fulltext.
    //We can remove the if statement when this is no longer true.
    let clientScopeCtx = appCtxService.getCtx( 'sublocation' );
    let clientState = appCtxService.getCtx( 'state' );
    let criteria = clientState.params.searchCriteria;
    let filterString = clientState.params.filter;
    if ( !criteria ) {
        return;
    }
    let res = criteria.charAt( criteria.length - 1 );
    if( res !== ' ' ) {
        criteria += ' ';
    } else {
        criteria = _.trimEnd( criteria, ' ' );
    }
    let options = {
        inherit: false,
        reload: true
    };
    if( clientScopeCtx && clientScopeCtx.clientScopeURI === 'Awp0SearchResults' ) {
        if( filterString && filterString.length > 0 ) {
            AwStateService.instance.go( '.', { searchCriteria: criteria, filter: filterString }, options );
        } else {
            AwStateService.instance.go( '.', { searchCriteria: criteria }, options );
        }
    }
};

const searchSettingsService = {
    validate_AW_TypeAheadFacetSearch_Delay,
    doAddToChangedPreferences,
    loadViewModel,
    getFiltersExpanded,
    saveSettings,
    refreshSettings,
    loadWildCardInfo,
    loadData_FilterExpanded,
    loadData_GroupExpanded,
    updateSearchStateAndPreferencesForSaveAction
};

export default searchSettingsService;
