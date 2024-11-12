// @<COPYRIGHT>@
// ==================================================
// Copyright 2022.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * @module js/peoplePickerUtils
 */
import _ from 'lodash';
import searchFilterService from 'js/aw.searchFilter.service';
import AwPromiseService from 'js/awPromiseService';
import filterPanelUtils from 'js/filterPanelUtils';
import logger from 'js/logger';
import _soaService from 'soa/kernel/soaService';
import _cmm from 'soa/kernel/clientMetaModel';
var exports = {};

/**
 * Update the input user panel state based on view mode. If view mode is mobile then we
 * need to set isAddButtonNeeded to true so that we can show add button in narrow mode.
 *
 * @param {String} sideNavMode Side nav mode string
 * @param {Object} addUserPanelState User panel state object
 */
export let updateSideNavUserPanelState = function( sideNavMode, addUserPanelState ) {
    if( sideNavMode && addUserPanelState ) {
        const userPanelState = { ...addUserPanelState.value };
        let isAddButtonNeeded = false;
        if( sideNavMode === 'mobile' ) {
            isAddButtonNeeded = true;
        }
        userPanelState.isAddButtonNeeded = isAddButtonNeeded;
        // Reset the propName to empty string when we are changing the sideNavMode
        userPanelState.propName = '';
        addUserPanelState.update && addUserPanelState.update( userPanelState );
    }
};

/**
 * Replace all instances of a given string within a larger string.
 *
 * @param {String} input - input string to replace content
 * @param {String} toFind - string to locate
 * @param {String} toReplace - string to replace
 * @return {String} modified string
 */
export function replaceAll( input, toFind, toReplace ) {
    let output = input;
    if( output.indexOf( toFind ) > -1 ) {
        output = output.split( toFind ).join( toReplace );
    }
    return output;
}

/**
 * Based on the input search string, replace the occurrences like value seperator to ',' and
 * filter category seprator (~) to ' AND '. So that this formated string can be used to make
 * the correct filters and will be shown on UI.
 *
 * @param {String} presetFilterString Filter string hat has been set on search state
 * @returns {String} Updated search filter string that can be passed as search filter prop
 *           to aw-add component
 */
export let getSearchFilterString = function( presetFilterString ) {
    // Check if input filter string is null or empty then no need to pass any value and return
    // null string from here.
    if( !presetFilterString || _.isEmpty( presetFilterString ) ) {
        return null;
    }
    var customFilterString = _.clone( presetFilterString );
    var filterValueSeperator = searchFilterService._filterValueSeparator;
    var filterSeperator = searchFilterService._filterSeparator;

    // First replace all argument values from ^ seperator to ',' and then seperate the categories
    // seperator from ~ to ' AND '.
    customFilterString = exports.replaceAll( customFilterString, filterValueSeperator, ',' );
    return exports.replaceAll( customFilterString, filterSeperator, ' AND ' );
};

/**
 * Merge the differnt category filters and return the signle object.
 *
 * @param {Object} objectTypeFilters Object type filter that need to be apply here.
 * @param {Object} presetFilters Object filters that need to be apply on initial load.
 *
 * @returns {Object} Merger filter object that will contain all filters that need to be apply on initial load
 */
export let populatePresetSearchFilters = function( objectTypeFilters, presetFilters ) {
    let cumulativeFilterMap = objectTypeFilters && Object.keys( objectTypeFilters ).length > 0 ?
        _.cloneDeep( objectTypeFilters ) : {};
    let currentActiveFilterMap = presetFilters && Object.keys( presetFilters ).length > 0 ?
        _.cloneDeep( presetFilters ) : {};
    let currentObjectTypeFilterMap = objectTypeFilters && Object.keys( objectTypeFilters ).length > 0 ?
        _.cloneDeep( objectTypeFilters ) : {};
    for( let[ activeMapKey, activeMapValue ] of Object.entries( currentActiveFilterMap ) ) {
        let keyFound = false;
        for( let[ pendingMapKey, positiveMapValue ] of Object.entries( currentObjectTypeFilterMap ) ) {
            if( activeMapKey === pendingMapKey ) {
                let cumulativeValues = activeMapValue.concat( positiveMapValue );
                cumulativeFilterMap[ activeMapKey ] = cumulativeValues;
                keyFound = true;
                break;
            }
        }
        if( !keyFound ) {
            cumulativeFilterMap[ activeMapKey ] = activeMapValue;
        }
    }
    return cumulativeFilterMap;
};

/**
 * Get the updated search state with active filters, filter string and search filter string.
 *
 * @param {Object} searchState Search state object
 * @param {Object} objectTypeFilters Object type filter that need to be apply here.
 * @param {Object} presetFilters Object filters that need to be apply on initial load.
 *
 * @returns {Object} Updated search state object along with search filter string.
 *
 */
export let updateSearchStateWithPresetFilters = function( searchState, objectTypeFilters, presetFilters ) {
    var deferred = AwPromiseService.instance.defer();
    let newSearchState =  { ...searchState };
    // Get the merge filter list first and then get the filter string from active filters object.
    var presetActiveFilters = exports.populatePresetSearchFilters( objectTypeFilters, presetFilters );
    var filterString = searchFilterService.buildFilterString( presetActiveFilters );
    // Generate the search filter string from filter string that need some specific character replacement
    let searchFilterString = exports.getSearchFilterString( filterString );


    var searchFilterMap = {};
    var context = {
        isCustomSearchFilterPresent : true
    };
    // Check if search filter string is not null and not empty then only update the search state with active filters
    // along with filter string.
    if( searchFilterString && !_.isEmpty( searchFilterString ) ) {
        newSearchState.filterString = filterString;
        newSearchState.activeFilters = presetActiveFilters;
        // Process the search filters and set it on search state so that by default those filters can be shown as checked
        exports.processSearchFilters( searchFilterString, searchFilterMap, context ).then( function( processResultResponse ) {
            // Check if response is not null then we need to get search filter map from response and
            // set it on the search state.
            if( processResultResponse !== null ) {
                searchFilterMap = processResultResponse.searchFilterMap;
            }
            newSearchState.activeFilterMap = searchFilterMap;
            deferred.resolve( {
                searchState: newSearchState,
                isSearchDataInit: true
            } );
        } );
    } else {
        // When search filter string is not present then we need to retun input search state
        // as it is and return from here
        deferred.resolve( {
            searchState: newSearchState,
            isSearchDataInit: true
        } );
    }
    return deferred.promise;
};

/**
 * Get the selectionMode from parent component and set it for people picker component.
 *
 * @param {String} selectionMode - selection mode - 'single'/'multiple'
 * @param {Object} selectionModels - selection models for the people picker model
 * @returns {Object} updatedSelectionModels - the updated selectionModels for people picker view model
 */
export let initializeSelectionModel = ( selectionMode, selectionModels ) => {
    let updatedSelectionModels = _.cloneDeep( selectionModels );
    if( selectionMode && selectionMode.length > 0 ) {
        updatedSelectionModels.searchSelectionModel.setMode( selectionMode );
    }
    return updatedSelectionModels;
};

/**
 * Clear the selection from selection model. Check if selection is not empty then only
 * clear the selection.
 *
 * @param {Object} selectionModel Selection model object
 */
export const resetSearchSelection = ( selectionModel ) => {
    // Check if selection Model is not null then clear the selection from people picker panel.
    // Previously we were checking selectionModel.getSelection().length > 0 before clearing the selection
    // but that was not working it correctly af framework level. So now removed that condition and when
    // this reset search selection trigger then go blindly and clear the selection
    // old condition - if( selectionModel && selectionModel.getSelection().length > 0 ) {
    if( selectionModel ) {
        selectionModel.selectNone();
    }
};

/**
 * Process Search Filters. This method is same as searchCommonUtils.processSearchFilters but
 * we can't use same method as it will be wrong kit dependency.
 *
 * @param {String} searchFilter - The search filter to be processed
 *
 * @param {String} searchFilterMap - The existing search filter map
 * @param {Object} subPanelContext Sub panel context object
 *
 * @return {processResult} the process result that contains the processed search filter map and error info.
 */
export let processSearchFilters = function( searchFilter, searchFilterMap, subPanelContext ) {
    var processResult = {};
    var _searchFilterMap = searchFilterMap;
    var hasInvalidFilter = false;

    var filterNameValues = searchFilter.split( ' AND ' );
    var aTypePropertyNames = [];
    for( var ii = 0; ii < filterNameValues.length; ii++ ) {
        var aFilterNameValue = filterNameValues[ ii ].split( '=' );
        var aTypeProperty = aFilterNameValue[ 0 ].split( '.' );
        aTypePropertyNames[ ii ] = aTypeProperty[ 0 ].trim();
    }
    return _soaService.ensureModelTypesLoaded( aTypePropertyNames ).then( function() {
        for( var ii = 0; ii < filterNameValues.length; ii++ ) {
            var aSearchFilter;
            var aFilterNameValue = filterNameValues[ ii ].split( '=' );
            var aTypeProperty = aFilterNameValue[ 0 ].split( '.' );
            var filterType;
            var aTypePropertyName = aTypeProperty[ 0 ].trim();
            var toIndex = aFilterNameValue[ 1 ].indexOf( ' TO ' );
            if( aTypePropertyName === 'Classification' ) {
                //it's a classification filter, no support yet.
                hasInvalidFilter = true;
                logger.error( 'Classification filter is not supported and will be ignored:', filterNameValues[ ii ] );
                continue;
            } else {
                var type = _cmm.getType( aTypePropertyName );
                if( !type ) {
                    hasInvalidFilter = true;
                    logger.error( 'The pre-filter will be ignored because the specified type cannot be found:',
                        aTypeProperty[ 0 ] );
                    continue;
                }
                var aPropertyName = aTypeProperty[ 1 ].trim();
                var propName = filterPanelUtils.getPropertyFromFilter( aPropertyName );
                var pd = type.propertyDescriptorsMap[ propName ];
                // Check if property descriptor is not null then we need to get the filter type based on property descriptor
                // else if isCustomSearchFilterPresent is true that means this property is custom search filter and actual property
                // does not exist and that will be going to use by default String filter only.
                if( pd ) {
                    filterType = filterPanelUtils.getFilterType( pd.valueType );
                } else if( subPanelContext && subPanelContext.isCustomSearchFilterPresent ) {
                    filterType = 'StringFilter';
                    logger.info( 'The search-filter is a custom property which does not actually exist',
                        propName );
                } else {
                    hasInvalidFilter = true;
                    logger.error( 'The pre-filter will be ignored because the specified property cannot be found:',
                        propName );
                    continue;
                }

                var aFilterValue = aFilterNameValue[ 1 ].trim();
                // Filter all values with ',' that need to applied for single category. So here iterate for
                // all values and then create the filter catory and search filter input for all values and
                // then finally return the search filters.
                var filterSplitValues = aFilterValue.split( ',' );
                _.forEach( filterSplitValues, function( filterValue  ) {
                    if( toIndex !== -1 ) {
                        aSearchFilter = filterPanelUtils.getRangeSearchFilter( filterType, filterValue );
                    } else {
                        aSearchFilter = filterPanelUtils.getSingleSearchFilter( filterType, filterValue );
                    }

                    if( aSearchFilter ) {
                        var categoryName = aFilterNameValue[ 0 ].trim();
                        var existingFilters = _searchFilterMap[ categoryName ];
                        if( filterPanelUtils.getHasTypeFilter() && categoryName === filterPanelUtils.PRESET_CATEGORY || !existingFilters ) {
                            _searchFilterMap[ categoryName ] = [ aSearchFilter ];
                        } else {
                            _searchFilterMap[ categoryName ].push( aSearchFilter );
                        }
                        if( filterPanelUtils.getHasTypeFilter() && categoryName === filterPanelUtils.PRESET_CATEGORY ) {
                            filterPanelUtils.setPresetFilters( false );
                        }
                    } else {
                        hasInvalidFilter = true;
                    }
                } );
            }
        }
        processResult.searchFilterMap = _searchFilterMap;
        processResult.hasInvalidFilter = hasInvalidFilter;
        return processResult;
    } );
};

// export let getUserDetailsFromClientDataModel = function( props ) {
//     var vmo = props.subPanelContext.vmo;

//     if ( vmo.type === 'GroupMember' ) {
//         if ( vmo && vmo.props && vmo.props.user ) {
//             const userModelObject = cdm.getObject( vmo.props.user.dbValues[0] );

//             if ( userModelObject ) {
//                 const userDetailsModelObject = cdm.getObject( userModelObject.props.person.dbValues[0] );

//                 if ( userDetailsModelObject ) {
//                     return {
//                         username : userDetailsModelObject.props.user_name.uiValues[ 0 ],
//                         user_id : userModelObject.props.user_id.uiValues[ 0 ],
//                         default_group : vmo.props.group.uiValues[ 0 ],
//                         role : vmo.props.role.uiValues[ 0 ],
//                         type : vmo.type
//                     };
//                 }
//             }
//         }
//     } else if ( vmo.type === 'User' ) {
//         return {
//             username : vmo.props.user_name.uiValues[ 0 ],
//             user_id : vmo.props.user_id.uiValues[ 0 ],
//             default_group : vmo.props.default_group.uiValues[ 0 ],
//             type : vmo.type
//         };
//     }
// };

export default exports = {
    updateSideNavUserPanelState,
    replaceAll,
    getSearchFilterString,
    populatePresetSearchFilters,
    updateSearchStateWithPresetFilters,
    resetSearchSelection,
    initializeSelectionModel,
    processSearchFilters
};
