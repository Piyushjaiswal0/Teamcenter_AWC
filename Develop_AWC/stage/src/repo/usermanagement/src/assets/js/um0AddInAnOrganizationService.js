// Copyright (c) 2022 Siemens

/**
 * @module js/um0AddInAnOrganizationService
 */
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import AwStateService from 'js/awStateService';

var exports = {};

/**
 * Publish doSearch event.
 *
 * @param {String} searchString - searchString
 * @param {bool} isGroupRadioButtonSelected - isGroupRadioButtonSelected
 */
export let doSearch = function( searchString, isGroupRadioButtonSelected ) {
    let lastSelectedObject = appCtxSvc.getCtx( 'lastSelectedObject' );
    if( searchString ) {
        if( lastSelectedObject !== null && lastSelectedObject.type === 'Role' ) {
            appCtxSvc.registerCtx( 'icsContentTypeString', 'User' );
        } else if( isGroupRadioButtonSelected ) {
            appCtxSvc.registerCtx( 'icsContentTypeString', 'Group' );
        } else {
            appCtxSvc.registerCtx( 'icsContentTypeString', 'Role' );
        }
        eventBus.publish( 'ics.doSearch' );
    }
};

export let getState = function() {
    return AwStateService.instance;
};

/**
 * Set command context for getting last selected Group object from URL when nothing selected on primaryworkArea
 */
export let getObjectFromBreadCrumb = function() {
    // Initialize variable to show search on add panel.
    appCtxSvc.registerCtx( 'showSearchOnPanel', false );

    appCtxSvc.registerCtx( 'lastSelectedObject', null );
    appCtxSvc.registerCtx( 'lastSelectedGroupObject', null );

    //Route the request and let appropriate listeners react to it
    var stateSvc = exports.getState();
    if( stateSvc && stateSvc.params ) {
        var newD_uid = '';
        var d_uid = stateSvc.params.d_uids;
        var s_uid = stateSvc.params.s_uid;
        var mObject;
        if( s_uid && s_uid !== 'SiteLevel') {
            appCtxSvc.registerCtx( 'showSearchOnPanel', true );
            mObject = cdm.getObject( s_uid );
            appCtxSvc.registerCtx( 'lastSelectedObject', mObject );
        }
        if( d_uid ) {
            appCtxSvc.registerCtx( 'showSearchOnPanel', true );
            var d_uidsArray = d_uid.split( '^' );
            if( s_uid ) {
                newD_uid = d_uidsArray[ d_uidsArray.length - 1 ];
                mObject = cdm.getObject( newD_uid );
                appCtxSvc.registerCtx( 'lastSelectedGroupObject', mObject );
            } else {
                newD_uid = d_uidsArray[ d_uidsArray.length - 2 ];
                s_uid = d_uidsArray[ d_uidsArray.length - 1 ];

                mObject = cdm.getObject( s_uid );
                appCtxSvc.registerCtx( 'lastSelectedObject', mObject );

                mObject = cdm.getObject( newD_uid );
                appCtxSvc.registerCtx( 'lastSelectedGroupObject', mObject );
            }
        }
    }
};

/**
 * @memberof TcSearchService
 * @param {Array} searchResults - searchResults
 */
export let getUsersToAdd = function( searchResults ) {
    var selected = [];
    if( searchResults ) {
        for( var i = 0; i < searchResults.length; i++ ) {
            var userObj = {};
            userObj.user = searchResults[ i ];
            selected.push( userObj );
        }
    }
    appCtxSvc.registerCtx( 'selectedUsers', selected );
};

/**
 * Publish addAdminObjects event.
 *
 * @param {String} selectedPanelId - selectedPanelId
 * @param {bool} isGroupRadioButtonSelected - isGroupRadioButtonSelected
 * @param {Array[]} searchResults - searchResults
 */
export let addAdminObjects = function( selectedPanelId, isGroupRadioButtonSelected, searchResults ) {
    exports.getObjectFromBreadCrumb();
    let lastSelectedObject = appCtxSvc.getCtx( 'lastSelectedObject' );
    let mselected = appCtxSvc.getCtx( 'mselected' );

    if( selectedPanelId === 'OrganizationNewTab' || selectedPanelId === 'SecondaryWorkAreaNewTab' ) {
        if( isGroupRadioButtonSelected === true ) {
            eventBus.publish( 'ics.createGroup' );
        } else if( isGroupRadioButtonSelected === false && lastSelectedObject !== null &&
            lastSelectedObject.type !== 'Role' ) {
            eventBus.publish( 'ics.createRoleInGroup' );
        } else if( lastSelectedObject !== null &&
            lastSelectedObject.type === 'Role' ) {
            eventBus.publish( 'ics.createPersonObject' );
        } else if( mselected !== null && mselected[ 0 ].type === 'Group' ) {
            eventBus.publish( 'ics.createRoleInGroup' );
        }
    } else if( selectedPanelId === 'OrganizationSearchTab' || selectedPanelId === 'SecondaryWorkAreaSearchTab' ) {
        if( mselected === null ) {
            if( lastSelectedObject !== null && lastSelectedObject.type === 'Role' ) {
                exports.getUsersToAdd( searchResults );
                eventBus.publish( 'ics.addUsers' );
            } else if( lastSelectedObject !== null &&
                lastSelectedObject.type === 'Group' ) {
                if( isGroupRadioButtonSelected ) {
                    // Group radio button selected
                    eventBus.publish( 'ics.addChildGroups' );
                } else {
                    // Role radio button selected
                    eventBus.publish( 'ics.addRoles' );
                }
            }
        } else if( mselected[ 0 ].type === 'Role' && lastSelectedObject !== null &&
            lastSelectedObject.type === 'Role' ) {
            exports.getUsersToAdd( searchResults );
            eventBus.publish( 'ics.addUsers' );
        } else if( mselected[ 0 ].type === 'User' && lastSelectedObject !== null &&
            lastSelectedObject.type === 'Role' ) {
            exports.getUsersToAdd( searchResults );
            eventBus.publish( 'ics.addUsers' );
        } else if( mselected[ 0 ].type === 'Group' ||
            lastSelectedObject !== null && lastSelectedObject.type === 'Group' ) {
            if( lastSelectedObject !== null &&
                lastSelectedObject.type === 'Group' ) {
                appCtxSvc.registerCtx( 'lastSelectedObject', lastSelectedObject );
            } else if( lastSelectedObject !== null &&
                mselected[ 0 ].type === 'Group' ) {
                appCtxSvc.registerCtx( 'lastSelectedObject', mselected[ 0 ] );
            }
            if( isGroupRadioButtonSelected ) {
                // Group radio button selected
                eventBus.publish( 'ics.addChildGroups' );
            } else {
                // Role radio button selected
                eventBus.publish( 'ics.addRoles' );
            }
        }
    }
};

/**
 * um0AddInAnOrganizationService service utility
 */
export let loadPanelTabs = function( visibleTabs ) {
    exports.getObjectFromBreadCrumb();
    const tabChangeCallback = ( pageId, tabTitle ) => {
        eventBus.publish( 'saveAsObject.tabChange', {
            pageId: pageId,
            tabTitle: tabTitle
        } );
    };
    return {
        visibleTabs: visibleTabs,
        api: tabChangeCallback
    };
};
export let handleTabChange = function( visibleTabs, pageId, tabTitle ) {
    let selectedTab = visibleTabs.filter( function( tab ) {
        return tab.pageId === pageId || tab.name === tabTitle;
    } )[ 0 ];
    return {
        activeTab: selectedTab
    };
};

/**
 * This function sets the toParent property value.
 * On selection in PWA, it pre populates toParent property field.
 * If group node is selected and trying to add a child group - set toParent from the selected group node
 * Else - try to read group id from the criteria and set it as toParent (In list with summary when navigated to group and trying to add childGroup)
 * @param {*} data
 * @param {*} selectionData
 * @param {*} subPanelContext
 * @returns
 */
export let setToParentProperty = function( data, selectionData, subPanelContext ) {
    var newParent = { ...data.modelPropGroup.props.parent };
    var groupObj = {};
    if( selectionData.selected && selectionData.selected.length > 0 ) {
        //set ToParent property when group is selected
        groupObj = cdm.getObject( selectionData.selected[ 0 ].uid );
    } else if( subPanelContext.searchState.criteria.groupUID ) {
        //set ToParent property when in list with summary mode and in group context without selection
        groupObj = cdm.getObject( subPanelContext.searchState.criteria.groupUID );
    }
    if( groupObj && groupObj.uid && groupObj.props.object_string ) {
        newParent.dbValue = groupObj.uid;
        newParent.uiValue = groupObj.props.object_string.dbValues[ 0 ];
    }
    return newParent;
};
exports = {
    doSearch,
    getState,
    getObjectFromBreadCrumb,
    getUsersToAdd,
    addAdminObjects,
    loadPanelTabs,
    handleTabChange,
    setToParentProperty
};
export default exports;
