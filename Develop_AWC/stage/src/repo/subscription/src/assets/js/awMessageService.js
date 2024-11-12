// Copyright (c) 2022 Siemens

/**
 * @module js/awMessageService
 */
import appCtxService from 'js/appCtxService';
import soaService from 'soa/kernel/soaService';
import preferenceSvc from 'soa/preferenceService';
import searchFilterService from 'js/aw.searchFilter.service';
import navigationSvc from 'js/navigationService';
import { isStateChangeStartEvent } from 'js/leavePlace.service';
import AwStateService from 'js/awStateService';

var CONST_AWC_NewsFeed_SavedFilters = 'AWC_NewsFeed_SavedFilters'; //$NON-NLS-1$
let _locationChangeSubscription = null;

/**
 * Set location change listener to unregister context
 */
export let setLocationChangeListener = function(  ) {
    if( !_locationChangeSubscription ) {
        _locationChangeSubscription = AwStateService.instance.transitionHooks.onBefore( {}, ( transition ) => {
            if( transition._targetState._definition.parent.name !== 'com_siemens_splm_client_subscription_follow_internal_MySubscriptionLocation' && isStateChangeStartEvent( transition ) ) {
                appCtxService.unRegisterCtx( 'savedFilters' );
                if( _locationChangeSubscription ) {
                    _locationChangeSubscription = null;
                }
            }
        } );
    }
};

/**
 * This return true if the message has been viewed by me
 *
 * @param {ModelObject} messageObject -- Message object
 * @return {Boolean} -- return true if the task passed in has been viewed by me
 */
export let checkTaskViewedByMe = function( messageObject ) {
    return messageObject && messageObject.props.fnd0MessageReadFlag &&
        messageObject.props.fnd0MessageReadFlag.dbValues[ 0 ] === '1';
};

/**
 *
 * setViewedByMeIfNeeded
 *
 * @function setViewedByMeIfNeeded
 */
export let setViewedByMeIfNeeded = function( mo ) {
    if( mo && !checkTaskViewedByMe( mo ) ) {
        var inputData2 = setPropertiesInput( mo );
        soaService.postUnchecked( 'Core-2010-09-DataManagement', 'setProperties', inputData2 );
    }
};
export let updatePrimarySelection = function( selection ) {
    if( selection && selection.selected.length === 1 && !checkTaskViewedByMe( selection.value.selected[0] ) ) {
        setViewedByMeIfNeeded( selection.value.selected[0] );

        const updatedSelection = { ...selection.value };
        updatedSelection.selected[0].props.fnd0MessageReadFlag.dbValue = true;
        updatedSelection.selected[0].props.fnd0MessageReadFlag.dbValues[ 0 ] = '1';

        selection.update(  updatedSelection  );
    }
};

/**
 * Open delegate for retail object
 *
 * @param {data} data from declViewModel *
 * @param {uidPath} path to UID which needs to be opened *
 * @param {uidPath} If object needs to be opened in edit model
 */
export let messageOpenDelegateJS = function( selectedCell, uidPath, isInEditMode ) {
    var vmo = selectedCell;
    if( vmo ) {
        setViewedByMeIfNeeded( vmo );
        //showObjectCommandHandler.execute( vmo, null, isInEditMode );
        var navigationParams = {
            uid: vmo.uid
        };
        var action = {
            actionType: 'Navigate',
            navigateTo: 'com_siemens_splm_clientfx_tcui_xrt_showObject'
        };

        navigationSvc.navigate( action, navigationParams );
    }
};

/**
 * Set properties input to set the property
 *
 * @function setPropertiesInput
 *
 * @param {ModelObject} actionableObject - The new selection
 *
 */
var setPropertiesInput = function( actionableObject ) {
    var input = {
        info: [],
        options: []
    };
    var inputInfo = {
        object: actionableObject
    };
    inputInfo.vecNameVal = [];
    inputInfo.vecNameVal.push( {
        name: 'fnd0MessageReadFlag',
        values: [ 'true' ]
    } );
    input.info.push( inputInfo );

    return input;
};

//function to update the newsfeed filter preference
export let updateNewsFeedFilterPreference = function( subPanelContext ) {
    var selectedFilter = subPanelContext.searchState.appliedFilters;
    var prefValues = [];
    for( var i = 0; i < selectedFilter.length; i++ ) {
        var filterCategory = selectedFilter[ i ].name;
        var prefElement = '';
        for( var j = 0; j < selectedFilter[ i ].values.length; j++ ) {
            prefElement = filterCategory + ':' + selectedFilter[ i ].values[ j ];
            prefValues.push( prefElement );
        }
    }
    // update configuration
    preferenceSvc.setStringValue( CONST_AWC_NewsFeed_SavedFilters, prefValues ).then( function() {
        //update ctx to make save selection filter button invisible
        var value = {
            saveFilterSelectionVisibility:false
        };
        updateSearchState( subPanelContext.searchState, value );
        appCtxService.updateCtx( 'savedFilters', selectedFilter );
    } );
};

//function to decide whether Save Selection Filter button should be visible or not on load
export let initializeSaveFilterSelectionVisibility = function( userSavedFilterConfig, selectedFilter ) {
    var selectedFilterValues = [];

    if( typeof selectedFilter === 'undefined' ) {
        return false;
    }

    for( var i = 0; i < selectedFilter.length; i++ ) {
        var filterCategory = selectedFilter[ i ].name;
        var prefElement = '';
        for( var j = 0; j < selectedFilter[ i ].values.length; j++ ) {
            prefElement = filterCategory + ':' + selectedFilter[ i ].values[ j ];
            selectedFilterValues.push( prefElement );
        }
    }
    if( selectedFilterValues.length !== userSavedFilterConfig.length ) {
        return true;
    }
    selectedFilterValues.sort();
    userSavedFilterConfig.sort();

    var len = selectedFilterValues.length;
    for( var k = 0; k < len; k++ ) {
        if( selectedFilterValues[ k ] !== userSavedFilterConfig[ k ] ) {
            return true;
        }
    }
    return false;
};
// function to watch for active filters and enable-diable Save Filter Selection Button visibility on filter changes.
export let filterChanges = function( subPanelContext ) {
    var savedFilters = appCtxService.getCtx( 'savedFilters' );
    var saveFilterSelectionVisibility = false;
    if( typeof savedFilters !== 'undefined' ) {
        saveFilterSelectionVisibility = initializeSaveFilterSelectionVisibility( savedFilters, subPanelContext.searchState.appliedFilters );
    }
    var value = {
        saveFilterSelectionVisibility:saveFilterSelectionVisibility
    };
    updateSearchState( subPanelContext.searchState, value );
};

export let loadFromSaveSelection = function( data, subPanelContext ) {
    var searchFilterMap = {};
    if( data.userSavedFilterConfig === undefined ) {
        data.userSavedFilterConfig = [];
    }
    if( data.userSavedFilterConfig.length === 1 && data.userSavedFilterConfig[ 0 ] === '' ) {
        data.userSavedFilterConfig.length = 0;
    }

    var selectionVisibility = initializeSaveFilterSelectionVisibility( data.userSavedFilterConfig, subPanelContext.searchState.activeFilters );
    var isSaveButtonVisible = {
        saveFilterSelectionVisibility:selectionVisibility
    };
    updateSearchState( subPanelContext.searchState, isSaveButtonVisible );
    appCtxService.updateCtx( 'savedFilters', data.userSavedFilterConfig );
    var activeFilters = subPanelContext.searchState.activeFilters;
    if( !activeFilters.length ) {
        activeFilters = [];
    }

    if( activeFilters.length < 1 && data.userSavedFilterConfig.length > 0 ) {
        for( var i = 0; i < data.userSavedFilterConfig.length; i++ ) {
            var keyValePair = data.userSavedFilterConfig[ i ].split( ':' );
            var key = keyValePair[ 0 ];
            var value = keyValePair[ 1 ];
            var filters = [];
            if( searchFilterMap[ key ] === undefined ) {
                filters.push( value );
                searchFilterMap[ key ] = filters;
            } else {
                filters = searchFilterMap[ key ];
                filters.push( value );
                searchFilterMap[ key ] = filters;
            }
        }
        searchFilterService.doSearch( 'com_siemens_splm_client_subscription_follow_NewsFeedSubscriptions', '', searchFilterMap );
    }
};
export let updateSearchState = function( searchState, value ) {
    if( searchState ) {
        let newSearchState = { ...searchState.value };

        if( value ) {
            for( const key of Object.keys( value ) ) {
                newSearchState[ key ] = value[ key ];
            }
        }

        if( searchState.update ) {
            searchState.update( newSearchState );
        }
    }
};

const exports = {
    messageOpenDelegateJS,
    setViewedByMeIfNeeded,
    updatePrimarySelection,
    checkTaskViewedByMe,
    updateNewsFeedFilterPreference,
    initializeSaveFilterSelectionVisibility,
    loadFromSaveSelection,
    filterChanges,
    updateSearchState,
    setLocationChangeListener
};
export default exports;
