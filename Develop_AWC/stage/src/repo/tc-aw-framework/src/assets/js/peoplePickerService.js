// Copyright (c) 2022 Siemens

/**
 * @module js/peoplePickerService
 */
import _ from 'lodash';
import eventBus from 'js/eventBus';
import policySvc from 'soa/kernel/propertyPolicyService';
import appCtxSvc from 'js/appCtxService';
import peoplePickerUtils from 'js/peoplePickerUtils';
var exports = {};

/**
  * Check if preference name exist in input array and based on that return true or false.
  *
  * @param {Array} preferenceCriteria Preference array that consumers wants to consider.
  * @param {String} preferenceName Preference name that need to be check.
  * @returns {Boolean} True/False based on preference need to consider or not.
  */
var _isPreferenceCriteriaExist = function( preferenceCriteria, preferenceName ) {
    if( !preferenceCriteria || !preferenceName ) {
        return false;
    }
    if( preferenceCriteria.indexOf( preferenceName ) > -1 ) {
        return true;
    }
    return false;
};

/**
  * Check if specific content type present in original provider type.
  * @param {String} providerType Provider type string that need to be check
  * @param {String} contentType Specific content type that need to be check
  * @returns {boolean} True/False based on specific content type exist in original provider type
  */
var _isProviderContentTypePresent = function( providerType, contentType ) {
    if( !providerType || _.isEmpty( providerType ) ) {
        return false;
    }
    var splitValues = providerType.split( ',' );
    if( splitValues && splitValues.length > 0 ) {
        return splitValues.indexOf( contentType ) > -1;
    }
    return false;
};

/**
  * Update the search criteria based on preference consumes wants to use. It will consider only certian
  * preferences right now.
  * Preference name - WRKFLW_user_panel_content_display
  * Preference name - WRKFLW_allow_resourcepool_assignments
  * Preference name - WRKFLW_show_user_assignment_options
  *
  * @param {Object} criteria Criteria object that will contain differnet values that will be used
  *               to search users.
  * @param {Object} userSearchState User search state object
  * @returns {Object} Updated search criteria object
  */
var _evaluatePreferenceBaseSearchCriteria = function( criteria, userSearchState ) {
    var objectTypeFilters = {};
    if( !userSearchState || !userSearchState.preferenceCriteria ) {
        return {
            criteria : criteria,
            objectTypeFilters: objectTypeFilters
        };
    }
    let localSearchCriteria = { ...criteria };
    var providerContentType = localSearchCriteria.providerContentType;
    var existingProviderContentType = _.clone( providerContentType );
    var providerTypeArrayValues = existingProviderContentType.split( ',' );
    if( !providerTypeArrayValues ) {
        providerTypeArrayValues = [];
    }
    // Check if preference exist then only we need to check it's value and update the provider type
    if( _isProviderContentTypePresent( existingProviderContentType, 'User' )
     && _isProviderContentTypePresent( existingProviderContentType, 'GroupMember' )
     && _isPreferenceCriteriaExist( userSearchState.preferenceCriteria, 'WRKFLW_user_panel_content_display' ) ) {
        var prefValue = '2';
        // If user want to consider User and GroupMember and also the preference value then we remove user and
        // group member from list first and then based on preference value add it.
        if( providerTypeArrayValues && providerTypeArrayValues.length > 0 ) {
            _.pull( providerTypeArrayValues, 'User' );
            _.pull( providerTypeArrayValues, 'GroupMember' );
        }
        // Based on preference value we set the proeprty value and return the updated proeprty.
        if( appCtxSvc.ctx.preferences && appCtxSvc.ctx.preferences.WRKFLW_user_panel_content_display
             && appCtxSvc.ctx.preferences.WRKFLW_user_panel_content_display[ 0 ] ) {
            prefValue = appCtxSvc.ctx.preferences.WRKFLW_user_panel_content_display[ 0 ];
        }
        // Based on different value update the provider content type
        if( prefValue === '0' ) {
            providerTypeArrayValues.push( 'User' );
        } else if( prefValue === '1' ) {
            providerTypeArrayValues.push( 'User' );
            providerTypeArrayValues.push( 'GroupMember' );
            objectTypeFilters['GroupMember.object_type'] = [
                'User', 'ResourcePool'
            ];
        } else if( prefValue === '2' ) {
            providerTypeArrayValues.push( 'GroupMember' );
        } else if( prefValue === '3' ) {
            providerTypeArrayValues.push( 'GroupMember' );
            providerTypeArrayValues.push( 'User' );
            objectTypeFilters['GroupMember.object_type'] = [
                'GroupMember', 'ResourcePool'
            ];
        }
    }

    // Check if preference exist then only we need to check it's value and update the provider type and search for resource
    // pools as well.
    if( _isProviderContentTypePresent( existingProviderContentType, 'ResourcePool' ) && _isPreferenceCriteriaExist( userSearchState.preferenceCriteria, 'WRKFLW_allow_resourcepool_assignments' )  ) {
        // If user want to consider ResourcePool and also the preference value then we remove
        //ResourcePool from list first and then based on preference value add it.
        _.pull( providerTypeArrayValues, 'ResourcePool' );
        // Check if resource pool can be search based on preference value or based on state present
        // on add user state then only add the resource pool as provider content type.
        if( appCtxSvc.ctx.preferences.WRKFLW_allow_resourcepool_assignments
             &&  appCtxSvc.ctx.preferences.WRKFLW_allow_resourcepool_assignments[ 0 ] === 'true' ) {
            providerTypeArrayValues.push( 'ResourcePool' );
        }
    }
    localSearchCriteria.providerContentType = providerTypeArrayValues.join( ',' );

    // Check if calling panel needs WRKFLW_show_user_assignment_options preference validation then we need to
    // get the preference value and then pass that value to server using search criteria. We are using preference
    // as the key here and send preference value as value.
    if( _isPreferenceCriteriaExist( userSearchState.preferenceCriteria, 'WRKFLW_show_user_assignment_options' ) ) {
        var userOptionValue = 'org_default';
        // Based on preference value we set the property value and return the updated proeprty.
        if( appCtxSvc.ctx.preferences && appCtxSvc.ctx.preferences.WRKFLW_show_user_assignment_options
                     && appCtxSvc.ctx.preferences.WRKFLW_show_user_assignment_options[ 0 ] ) {
            userOptionValue = appCtxSvc.ctx.preferences.WRKFLW_show_user_assignment_options[ 0 ];
        }
        localSearchCriteria.WRKFLW_show_user_assignment_options = userOptionValue;
    }

    return {
        criteria : localSearchCriteria,
        objectTypeFilters: objectTypeFilters
    };
};

/**
  * Populate the search state based on input search state and then return it.
  *
  * @param {Object} searchState Search state that need to be set and return so that
  *  it can be used in child components to render the users.
  * @param {Object} userSearchState User search state coming from parent component.
  *
  * @returns {Object} Search state object
  */
export let initializeSearchState = function( searchState, userSearchState ) {
    let newSearchState =  { ...searchState };

    // If input user search state doesn't contain valid resource provider and content type
    // then use the default one
    if( !userSearchState || !userSearchState.value ) {
        newSearchState.provider = 'Awp0PeoplePickerProvider';
        newSearchState.criteria = {
            providerContentType : 'GroupMember'
        };
    }

    const localUserState = { ...userSearchState.value };

    // Get the criteria based on certian preferences and then update the search provider type based on
    // these preference values.
    var criteriaObject = _evaluatePreferenceBaseSearchCriteria( localUserState.criteria, localUserState );
    newSearchState.criteria = criteriaObject.criteria;

    // Check if search state doesn't contain provider then set the default one.
    if( !newSearchState.provider ) {
        newSearchState.provider = 'Awp0PeoplePickerProvider';
    }

    // Check if search state doesn't contain the criteria then intialize the default
    // criteria and add the default resource provider content type
    if( !newSearchState.criteria ) {
        newSearchState.criteria = {
            searchString : '*'
        };
    }
    // Check if provider type is null then set it as group member
    if( !newSearchState.criteria.providerContentType ) {
        newSearchState.criteria.providerContentType = 'GroupMember';
    }
    // If search string is null or empty string then set the search string as *.
    if( !newSearchState.criteria.searchString || newSearchState.criteria.searchString === '' ) {
        newSearchState.criteria.searchString = '*';
    }
    // If user is searching only for User then we need to hide filters as per Ux recommendation
    // that no filter is needed for User.
    if( newSearchState.criteria.providerContentType === 'User' || localUserState.hideFilters ) {
        newSearchState.hideFilters = true;
    }

    // Check if additionalSearchCriteria present then we need to add it to searchState so that search state
    // will be correct and updated
    for ( var searchKey in localUserState.additionalSearchCriteria ) {
        newSearchState[ searchKey ] = localUserState.additionalSearchCriteria[ searchKey ];
    }

    // Set the immutableSearchString on immutableSearchInfo object on search state and that will be used
    // to pass the immutable search filters and search string to search state and framework component
    // can use that search state and call SOA and render the UI.
    if( newSearchState.immutableSearchInfo && localUserState.criteria && localUserState.criteria.searchString ) {
        newSearchState.immutableSearchInfo.immutableSearchString = localUserState.criteria.searchString;
    }

    // When triggerUpdateSearchCriteria variable is set to true that means user is trying to change the selection from profiles
    // or deselect the profile. So on those cases if there is any filters applied then we are clearing those filters along with
    // the search text box present in incontent search box. To reset the incontent search box we are using resetInContextSearchCriteria
    // onUpdate hook present in aw-search-objects component. If there are multile calls while clearing the search text then we might
    // need to talk to search team and see why onUpdate hook is getting triggered.
    if( localUserState.triggerUpdateSearchCriteria ) {
        newSearchState.activeFilters = {};
        newSearchState.activeFilterMap = {};
        let newResetInContextSearchCriteria = newSearchState.resetInContextSearchCriteria ? newSearchState.resetInContextSearchCriteria : 0;
        newResetInContextSearchCriteria += 1;
        newSearchState.resetInContextSearchCriteria = newResetInContextSearchCriteria;
    }

    newSearchState.criteriaJSONString = JSON.stringify( newSearchState.criteria );
    // Get the updated search state with active filters that need to be applied on initial load itself along with search filter string value as well
    return peoplePickerUtils.updateSearchStateWithPresetFilters( newSearchState, criteriaObject.objectTypeFilters, userSearchState.presetFilters );
};

/**
  * Update the input selected users to the state object which is coming from parent component.
  *
  * @param {Array} selectedObjects Selected users from UI that need to be added
  * @param {Object} searchState Search state that willcontain active filters that are currently applied on people picker
  *               that can be used if applications need selected filters info on people picker
  * @param {Object} addUserPanelState Context object where selected objects will be added
  */
export let updateSelectedUserState = function( selectedObjects, searchState, addUserPanelState ) {
    if( addUserPanelState ) {
        const localState = { ...addUserPanelState.value };
        localState.selectedUsers = selectedObjects;
        localState.baseActiveFiltersStructure = {
            activeFilters: { ...searchState.activeFilters },
            activeFilterMap: { ...searchState.activeFilterMap }
        };
        addUserPanelState.update && addUserPanelState.update( localState );
    }
};

/**
  * Return if selectiom mode is multiple then return true else return false..
  *
  * @param {Object} multiSelectMode - To define that multi select mode is enabled or not
  *
  * @return {boolean} The boolean value to tell that multi select mode is enabled or not
  */

export let getMultiSelectMode = function( multiSelectMode ) {
    if( multiSelectMode && multiSelectMode === 'multiple' ) {
        return true;
    }
    return false;
};

/**
  * Get the select object from provider from UI and add to the input sub panel context so that it can be consume
  * further to display on UI.
  *
  * @param {Boolean} multiSelectEnabled - The multiple select enabled or not
  * @param {Array} selection - The selection object array
  * @param {Object} searchState Search state that willcontain active filters that are currently applied on people picker
  *               that can be used if applications need selected filters info on people picker
  * @param {Object} subPanelContext Add user panel context object
  */
export let addUserObject = function( multiSelectEnabled, selection, searchState, subPanelContext ) {
    // Check if context is not null and selection is also not null then we need to set
    // the selected users on context based on selection mode.
    if( subPanelContext && selection ) {
        var selectedUsers = [];
        // In case of multiple selection mode then we need add input selection as selected users else
        // we will use 0th index object as selected users.
        if( multiSelectEnabled ) {
            selectedUsers = selection;
        } else if( !multiSelectEnabled && selection[ 0 ] ) {
            selectedUsers = [ selection[ 0 ] ];
        }
        // Update the context with selected users
        let localContext = { ...subPanelContext.value };
        localContext.selectedUsers = selectedUsers;
        localContext.baseActiveFiltersStructure = {
            activeFilters: { ...searchState.activeFilters },
            activeFilterMap: { ...searchState.activeFilterMap }
        };
        subPanelContext.update && subPanelContext.update( localContext );
        // Fire the event to do further processing if needed by consumer
        eventBus.publish( 'peoplePicker.addSelectedUsers', {  selectedObjects: selectedUsers } );
    }
};

/**
  * Register the property polciy that need to be registered when user go to
  * assignment tab for assign all task.
  *
  * @param {object} policy Policy that need to register
  *
  * @returns {String} Registered policy id
  */
export let registerPropPolicy = function( policy ) {
    return policySvc.register( policy );
};

/**
  *
  * UnRegister the property polciy that need to be removed from policy when user go out from
  * assignment tab for assign all task.
  *
  * @param {object} policyId Registered policy id
  *
  */
export let unRegisterPropPolicy = function( policyId ) {
    if( policyId ) {
        policySvc.unregister( policyId );
    }
};

/**
  * This factory creates a service and returns exports
  *
  * @member peoplePickerService
  */
export default exports = {
    initializeSearchState,
    updateSelectedUserState,
    registerPropPolicy,
    unRegisterPropPolicy,
    getMultiSelectMode,
    addUserObject
};

