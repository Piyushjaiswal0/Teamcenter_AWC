// Copyright (c) 2021 Siemens
// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global*/

/**
 *
 * @module js/awSearchLocationFilterPanelService
 */
import eventBus from 'js/eventBus';
import 'lodash';
import appCtxService from 'js/appCtxService';
import commandPanelService from 'js/commandPanel.service';

export let openCloseFilterPanelActionWhenCategoriesFound = ( autoOpenFilterPanel, openSearchFilterPanel, activationNavigationCommand, isNarrowMode, activationToolsAndInfoCommand ) => {
    if( !autoOpenFilterPanel && activationNavigationCommand
        && activationNavigationCommand.commandId === 'Awp0SearchFilter' ) {
        // this is the case when the auto open filter panel preference is false
        eventBus.publish( 'complete', { source: 'navigationPanel' } );
    } else if( activationNavigationCommand && activationNavigationCommand.commandId === 'Awp0Search' && isNarrowMode ) {
        // this is for the use case where executing search using the narrow mode should result in closing the search panel and showing the results
        eventBus.publish( 'complete', { source: 'navigationPanel' } );
    } else if( !isNarrowMode && openSearchFilterPanel && ( !activationNavigationCommand && !activationToolsAndInfoCommand || activationNavigationCommand && activationNavigationCommand.commandId !== 'Awp0SearchFilter' ) ) {
        // this is for the use case where executing a search and getting back categories should result in filter panel opening up if it is already not open
        commandPanelService.activateCommandPanel( 'Awp0SearchFilter', 'aw_navigation' );
    }
};

export let openCloseFilterPanelAction = ( searchState ) => {
    let activationNavigationCommand = appCtxService.getCtx( 'activeNavigationCommand' );
    let activationToolsAndInfoCommand = appCtxService.getCtx( 'activeToolsAndInfoCommand' );
    let autoOpenPrefValue = appCtxService.getCtx( 'preferences.AW_Search_Auto_Open_Filter_Panel' );
    let autoOpenFilterPanel = !autoOpenPrefValue || autoOpenPrefValue && autoOpenPrefValue[ 0 ] === 'true';
    let openCloseStateInSession = sessionStorage.getItem( 'searchFilterPanelOpenCloseState' );
    let openSearchFilterPanel = openCloseStateInSession !== 'closed' && autoOpenFilterPanel;
    let isNarrowMode = window.matchMedia( '(max-width: 63.76em)' ).matches;
    if( searchState.totalLoaded !== undefined
        && searchState.totalLoaded === 0
        && searchState.additionalSearchInfoMap
        && activationNavigationCommand
        && activationNavigationCommand.commandId === 'Awp0SearchFilter'
        && searchState.additionalSearchInfoMap.searchExceededThreshold
        && ( searchState.additionalSearchInfoMap.searchExceededThreshold[ 0 ]
        && searchState.additionalSearchInfoMap.searchExceededThreshold[ 0 ].length > 0
        && searchState.additionalSearchInfoMap.searchExceededThreshold[ 0 ].toLowerCase() === 'false' || !searchState.additionalSearchInfoMap.searchExceededThreshold[ 0 ] ) ) {
        //this is when zero results are found and the panel needs to be closed.
        // but if search has exceeded threshold number of results, then panel won't be closed
        eventBus.publish( 'complete', { source: 'navigationPanel' } );
    } else if( searchState && searchState.categories && searchState.categories.length > 0 ) {
        awSearchLocationFilterPanelService.openCloseFilterPanelActionWhenCategoriesFound(
            autoOpenFilterPanel, openSearchFilterPanel, activationNavigationCommand, isNarrowMode, activationToolsAndInfoCommand );
    }
};

export let readAutoOpenFilterPanelPrefValue = () => {
    let autoOpenPrefValue = appCtxService.getCtx( 'preferences.AW_Search_Auto_Open_Filter_Panel' );
    let isAutoOpenPrefTrue = autoOpenPrefValue && autoOpenPrefValue[ 0 ] === 'true';
    let openCloseStateInSession = sessionStorage.getItem( 'searchFilterPanelOpenCloseState' );
    let openSearchFilterPanel = openCloseStateInSession !== 'closed';
    return !autoOpenPrefValue || isAutoOpenPrefTrue && openSearchFilterPanel;
};

export let setFilterPanelStateSessionVariableForCommand = ( isSearchFilterPanelCmdActive ) => {
    sessionStorage.setItem( 'searchFilterPanelOpenCloseState', isSearchFilterPanelCmdActive ? 'closed' : 'open' );
};

export let setFilterPanelStateSessionVariableForCloseButton = () => {
    sessionStorage.setItem( 'searchFilterPanelOpenCloseState', 'closed' );
    eventBus.publish( 'complete', { source: 'navigationPanel' } );
};

export let isSearchFilterPanelCmdActive = ( activeNavigationCmdCtx ) => {
    return activeNavigationCmdCtx && activeNavigationCmdCtx.commandId === 'Awp0SearchFilter';
};

const awSearchLocationFilterPanelService = {
    openCloseFilterPanelAction,
    readAutoOpenFilterPanelPrefValue,
    setFilterPanelStateSessionVariableForCommand,
    isSearchFilterPanelCmdActive,
    setFilterPanelStateSessionVariableForCloseButton,
    openCloseFilterPanelActionWhenCategoriesFound
};

export default awSearchLocationFilterPanelService;
