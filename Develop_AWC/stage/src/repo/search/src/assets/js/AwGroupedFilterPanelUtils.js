// Copyright 2023 Siemens.

/* global */
/**
 * Utils file for all APIs related to grouped filter categories feature.
 * @module js/AwGroupedFilterPanelUtils
 */

import _ from 'lodash';

/**
 * the function constrcuts the categories which belong to no group which is defined, so they go into the miscellaneous group which is passed by the application teams
 * @param {Array} categories - filter categories structure.
 * @param {Array} groupedCategoryKeys - the array containing keys, each key is the internal name of the group.
 * @param {Object} groupNameWithItsCategories - Object containing each group internal name with its group information.
 * @param {String} otherCategoriesGroupName - The name of the miscellaneous group, default value is Other.
 * @returns {Object} groupNameWithItsCategories - updated object containing each group internal name with its group information.
 */
export const constructMiscellaneousGroupCategories = ( categories, groupedCategoryKeys, groupNameWithItsCategories, otherCategoriesGroupName ) => {
    for( let categoryIndex = 0; categoryIndex < categories.length; categoryIndex++ ) {
        if( !groupedCategoryKeys.has( categories[ categoryIndex ].internalName ) ) {
            if( groupNameWithItsCategories[ otherCategoriesGroupName ] ) {
                groupNameWithItsCategories[ otherCategoriesGroupName ].categoryIndexes.push( categoryIndex );
            } else {
                groupNameWithItsCategories[ otherCategoriesGroupName ] = {};
                // The group which contains categories not belonging to any pre-defined group is always collapsed
                groupNameWithItsCategories[ otherCategoriesGroupName ].expand = false;
                groupNameWithItsCategories[ otherCategoriesGroupName ].categoryIndexes = [ categoryIndex ];
            }
        }
    }
    return groupNameWithItsCategories;
};

/**
 * the function constrcuts the miscellaneous group info with pieces like expand state, the categories inside itself and the display name of the group.
 * @param {Object} groupNameWithItsCategories - Object containing each group internal name with its group information.
 * @param {Object} existingGroupedCategories - existing grouped categories object containing each group internal name with its group information which is inside searchState.
 * @param {String} otherCategoriesGroupName - The name of the miscellaneous group, default value is Other.
 * @param {Boolean} showAllGroupsAsExpanded - The flag which reveals if we need to show all groups as expanded.
 * @returns {Object} groupNameWithItsCategories - updated object containing each group internal name with its group information.
 */
export const constructMiscellaneousGroupInfo = ( groupNameWithItsCategories, existingGroupedCategories, otherCategoriesGroupName, showAllGroupsAsExpanded ) => {
    if( groupNameWithItsCategories[ otherCategoriesGroupName ] ) {
        let miscellaneousValues = groupNameWithItsCategories[ otherCategoriesGroupName ].categoryIndexes;
        delete groupNameWithItsCategories[ otherCategoriesGroupName ];
        if( !existingGroupedCategories ) {
            groupNameWithItsCategories = Object.assign( groupNameWithItsCategories,
                { [ otherCategoriesGroupName ]: {
                    expand: showAllGroupsAsExpanded,
                    categoryIndexes: miscellaneousValues,
                    groupDisplayName: otherCategoriesGroupName  } } );
        } else {
            groupNameWithItsCategories = Object.assign( groupNameWithItsCategories,
                { [ otherCategoriesGroupName ]: {
                    showAllCategories: existingGroupedCategories[ otherCategoriesGroupName ].showAllCategories,
                    expand: existingGroupedCategories[ otherCategoriesGroupName ].expand,
                    categoryIndexes: miscellaneousValues,
                    groupDisplayName: otherCategoriesGroupName } } );
        }
    }
    return groupNameWithItsCategories;
};

/**
 * Is a helper function of constructGroupedCategoriesInfo which constructs the expand state and the array of indexes of the categories for each group.
 * @param {Object} groupNameWithItsCategories - Object containing each group internal name with its group information.
 * @param {String} key - internal name of the group.
 * @param {Object} value - the group information corresponding to the internal name of the group.
 * @param {Integer} categoryIndex - index of the category which is being processed.
 * @param {Boolean} showAllGroupsAsExpanded - The flag which reveals if we need to show all groups as expanded.
 * @returns {Object} groupNameWithItsCategories - updated object containing each group internal name with its group information.
 */
const constructGroupedCategoriesInfoHelper = ( groupNameWithItsCategories, key, value, categoryIndex, showAllGroupsAsExpanded ) => {
    if( groupNameWithItsCategories[ key ] ) {
        groupNameWithItsCategories[ key ].categoryIndexes.push( categoryIndex );
    } else {
        groupNameWithItsCategories[ key ] = {};
        if( showAllGroupsAsExpanded ) {
            groupNameWithItsCategories[ key ].expand = true;
        } else {
            if( value.expanded === 'true' ) {
                groupNameWithItsCategories[ key ].expand = true;
            } else {
                groupNameWithItsCategories[ key ].expand = false;
            }
        }
        groupNameWithItsCategories[ key ].categoryIndexes = [ categoryIndex ];
    }
    return groupNameWithItsCategories;
};

/**
 * Is a function which constructs the expand state and the array of indexes of the categories for each group along with the display name of group.
 * @param {Object} groupedCategoriesStruct - Object containing each group internal name with its group information coming from server side.
 * @param {Array} categories - filter categories structure.
 * @param {Array} groupedCategoryKeys - the array containing keys, each key is the internal name of the group.
 * @param {Object} groupNameWithItsCategories - Object containing each group internal name with its group information.
 * @param {Boolean} showAllGroupsAsExpanded - The flag which reveals if we need to show all groups as expanded.
 * @returns {Object} groupNameWithItsCategories - updated object containing each group internal name with its group information.
 */
export const constructGroupedCategoriesInfo = ( groupedCategoriesStruct, categories, groupedCategoryKeys, groupNameWithItsCategories, showAllGroupsAsExpanded ) => {
    for( let[ key, value ] of Object.entries( groupedCategoriesStruct ) ) {
        let categoriesArray = value.categoriesArray;
        for( let categoryIndex = 0; categoryIndex < categories.length; categoryIndex++ ) {
            for( const element of categoriesArray ) {
                if( element === categories[ categoryIndex ].internalName ) {
                    groupNameWithItsCategories = constructGroupedCategoriesInfoHelper( groupNameWithItsCategories, key, value, categoryIndex, showAllGroupsAsExpanded );
                    groupedCategoryKeys.add( categories[ categoryIndex ].internalName );
                    groupNameWithItsCategories[ key ].groupDisplayName = value.groupDisplayName;
                    break;
                }
            }
        }
    }
    return groupNameWithItsCategories;
};

/**
 * Is a function which constructs the showAllCategories flag for each group.
 * @param {Object} groupNameWithItsCategories - Object containing each group internal name with its group information.
 * @param {Object} existingGroupedCategories - existing grouped categories object containing each group internal name with its group information which is inside searchState.
 * @param {Integer} noOfGroupsToShow - the maximum groups to show in the filter panel before we show the link to show all the rest of the groups
 * @returns {Object} groupNameWithItsCategories - updated object containing each group internal name with its group information.
 */
export const setShowAllCategoriesFlagForGroups = ( groupNameWithItsCategories, existingGroupedCategories, noOfGroupsToShow ) => {
    for( let[ groupName, groupInfo ] of Object.entries( groupNameWithItsCategories ) ) {
        if( !existingGroupedCategories ) {
            // new search scenario
            if( groupInfo.categoryIndexes.length <= noOfGroupsToShow ) {
                groupNameWithItsCategories[ groupName ].showAllCategories = true;
            } else {
                groupNameWithItsCategories[ groupName ].showAllCategories = false;
            }
        } else {
            groupNameWithItsCategories[ groupName ].showAllCategories = existingGroupedCategories[ groupName ].showAllCategories;
        }
    }
    return groupNameWithItsCategories;
};

/**
 * Is a function which constructs the grouped categories object after parsing the searchGroupedCategories structure available in the SOA response.
 * @param {Array} groupedCategoriesJSONStringArray - Array, each value is a JSON string containing the group internal name and its corresponding group information.
 * @param {Object} groupedCategoriesStruct - Object containing each group internal name with its group information coming from server side.
 * @returns {Object} groupedCategoriesStruct - Object containing each group internal name with its group information coming from server side.
 */
export const constructGroupedCategoriesStructureFromSOA = ( groupedCategoriesJSONStringArray, groupedCategoriesStruct ) => {
    if( groupedCategoriesJSONStringArray && groupedCategoriesJSONStringArray.length > 0 ) {
        for( const element of groupedCategoriesJSONStringArray ) {
            let eachJSONObject = JSON.parse( element );
            let key = Object.keys( eachJSONObject )[ 0 ];
            let value = eachJSONObject[ key ];
            groupedCategoriesStruct[ key ] = value;
        }
    }
    return groupedCategoriesStruct;
};

/**
 * Is a function which constructs the grouped categories object.
 * @param {Object} searchData - searchState object.
 * @returns {Object} groupNameWithItsCategories - Object containing each group internal name with its group information.
 */
export let getGroupedCategories = ( searchData ) => {
    if( searchData.criteria && searchData.criteria.getGroupedCategories === 'true' ) {
        if( searchData.getGroupedCategoriesCallBack ) {
            return searchData.getGroupedCategoriesCallBack( searchData );
        }
        let categories = searchData.categories;
        let groupedCategoriesJSONStringArray = searchData.searchGroupedCategories;
        let existingGroupedCategories = searchData.groupedCategories;
        let showAllGroupsAsExpanded = searchData.showAllGroupsAsExpanded;
        let otherCategoriesGroupName = searchData.miscellaneousGroupName;
        let noOfGroupsToShow = searchData.noOfGroupsToShow;
        let groupNameWithItsCategories = undefined;
        if( categories && categories.length > 0 ) {
            groupNameWithItsCategories = {};
            let groupedCategoriesStruct = {};
            let groupedCategoryKeys = new Set();
            groupedCategoriesStruct = AwGroupedFilterPanelUtils.constructGroupedCategoriesStructureFromSOA( groupedCategoriesJSONStringArray, groupedCategoriesStruct );

            if( Object.keys( groupedCategoriesStruct ).length > 0 ) {
                groupNameWithItsCategories = AwGroupedFilterPanelUtils.constructGroupedCategoriesInfo(
                    groupedCategoriesStruct, categories, groupedCategoryKeys, groupNameWithItsCategories, showAllGroupsAsExpanded );
                groupNameWithItsCategories = AwGroupedFilterPanelUtils.constructMiscellaneousGroupCategories(
                    categories, groupedCategoryKeys, groupNameWithItsCategories, otherCategoriesGroupName );
                groupNameWithItsCategories = AwGroupedFilterPanelUtils.setShowAllCategoriesFlagForGroups(
                    groupNameWithItsCategories, existingGroupedCategories, noOfGroupsToShow );
            }
            groupNameWithItsCategories = AwGroupedFilterPanelUtils.constructMiscellaneousGroupInfo(
                groupNameWithItsCategories, existingGroupedCategories, otherCategoriesGroupName, showAllGroupsAsExpanded );
        }
        return groupNameWithItsCategories;
    }
    return undefined;
};

/**
 * Is a function which sets the showAllCategories flag inside the input group.
 * @param {String} groupedCategoryName - internal name of the group
 * @param {Object} searchState - searchState object.
 */
export const setShowAllCategoriesInsideInputGroup = ( groupedCategoryName, searchState ) => {
    let newSearchState = searchState.getValue();
    newSearchState.groupedCategories[ groupedCategoryName ].showAllCategories = true;
    searchState.update( newSearchState );
};

/**
 * Is a helper function which sets the showAllCategories flag inside the input group.
 * @param {String} groupedCategoryName - internal name of the group
 * @param {FunctionStringCallback} showAllCategoriesInsideGroup - call back function.
 */
export const showAllCategoriesInsideGroupAction = ( groupedCategoryName, showAllCategoriesInsideGroup ) => {
    showAllCategoriesInsideGroup( groupedCategoryName );
};

/**
 * Is a function which sets the showAllCategories flag inside the input group.
 * @param {String} groupedCategoryInternalName - internal name of the group
 * @param {Boolean} currentGroupExpandState - the expansion state of the group currently.
 * @param {Object} searchState - searchState object.
 * @returns {Object} searchState - updated search state object.
 */
export const setGroupsToExpandInSearchState = ( groupedCategoryInternalName, currentGroupExpandState, searchState ) => {
    let existingExpandedGroups = searchState.criteria.listOfExpandedGroups
        && searchState.criteria.listOfExpandedGroups.length > 0 ? searchState.criteria.listOfExpandedGroups.split( ',' ) : [];
    let existingExpandedGroupsAsSet = new Set( existingExpandedGroups );
    existingExpandedGroups = existingExpandedGroupsAsSet.size > 0 ? Array.from( existingExpandedGroupsAsSet ) : [];
    if( !currentGroupExpandState ) {
        existingExpandedGroups.push( groupedCategoryInternalName );
        searchState.criteria.listOfExpandedGroups = existingExpandedGroups.join( ',' );
    } else {
        let updatedExpandedGroups = [];
        for( const element of existingExpandedGroups ) {
            if( element !== groupedCategoryInternalName ) {
                updatedExpandedGroups.push( element );
            }
        }
        searchState.criteria.listOfExpandedGroups = updatedExpandedGroups.join( ',' );
    }
    return searchState;
};

/**
 * Is a function which sets the showAllGroupsVisible flag inside the searchState object.
 * @param {Object} searchState - searchState object.
 */
export const showAllGroups = ( searchState ) => {
    let newSearchState = searchState.getValue();
    newSearchState.showAllGroupsVisible = !newSearchState.showAllGroupsVisible;
    searchState.update( newSearchState );
};

/**
 * Is a function which sets the expand flag inside the given group.
 * @param {String} groupedCategoryName - internal name of the group
 * @param {Boolean} currentGroupExpandState - the expansion state of the group currently.
 * @param {Object} searchState - searchState object.
 */
export const setExpandFlagForGroup = ( groupedCategoryName, currentGroupExpandState, searchState ) => {
    let newSearchState = searchState.getValue();
    newSearchState = AwGroupedFilterPanelUtils.setGroupsToExpandInSearchState( groupedCategoryName, currentGroupExpandState, newSearchState );
    newSearchState.groupedCategories[ groupedCategoryName ].expand = !currentGroupExpandState;
    searchState.update( newSearchState );
};

/**
 * Is a function which sets the expand flag inside the given group.
 * @param {String} categorySearchString - the search string put by the user in the filter panel
 * @param {Object} groupedCategories - the grouped categories structure inside searchState.
 * @param {Array} categories - filter categories structure.
 * @returns {Object} filteredOutGroupedCategories - after filtering by the search string, the groups that are valid to be shown
 */
export let filterOutGroupedCategories = ( categorySearchString, groupedCategories, categories ) => {
    let filteredOutGroupedCategories = {};
    let groupsMatched = false;
    if( groupedCategories && categories && _.isArray( categories ) && categorySearchString && categorySearchString.length > 0 ) {
        for( let[ key, value ] of Object.entries( groupedCategories ) ) {
            if( value && value.groupDisplayName && value.groupDisplayName.toLowerCase().indexOf( categorySearchString.toLowerCase() ) !== -1 ) {
                groupsMatched = true;
                filteredOutGroupedCategories[ key ] = value;
                filteredOutGroupedCategories[ key ].expand = true;
                filteredOutGroupedCategories[ key ].showAllCategories = true;
                filteredOutGroupedCategories[ key ].groupDisplayName = value.groupDisplayName;
            }
        }
        if( !groupsMatched ) {
            for( let[ key, value ] of Object.entries( groupedCategories ) ) {
                let categoryIndexes = value.categoryIndexes;
                filteredOutGroupedCategories[ key ] = {};
                filteredOutGroupedCategories[ key ].expand = true;
                filteredOutGroupedCategories[ key ].showAllCategories = true;
                filteredOutGroupedCategories[ key ].categoryIndexes = [];
                filteredOutGroupedCategories[ key ].groupDisplayName = value.groupDisplayName;
                for( const element of categoryIndexes ) {
                    if( categories[ element ].displayName.toLowerCase().indexOf( categorySearchString.toLowerCase() ) !== -1 ) {
                        filteredOutGroupedCategories[ key ].categoryIndexes.push( element );
                    }
                }
                if( filteredOutGroupedCategories[ key ].categoryIndexes.length === 0 ) {
                    delete filteredOutGroupedCategories[ key ];
                }
            }
        }
    } else {
        return groupedCategories;
    }
    return filteredOutGroupedCategories;
};

const AwGroupedFilterPanelUtils = {
    getGroupedCategories,
    constructMiscellaneousGroupCategories,
    constructMiscellaneousGroupInfo,
    constructGroupedCategoriesInfo,
    setShowAllCategoriesFlagForGroups,
    constructGroupedCategoriesStructureFromSOA,
    showAllCategoriesInsideGroupAction,
    setShowAllCategoriesInsideInputGroup,
    setExpandFlagForGroup,
    filterOutGroupedCategories,
    setGroupsToExpandInSearchState,
    showAllGroups
};

export default AwGroupedFilterPanelUtils;
