// Copyright 2022 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 *
 * @module js/awSearchCoreService
 */
import appCtxService from 'js/appCtxService';
import commandPanelService from 'js/commandPanel.service';
import eventBus from 'js/eventBus';
import AwStateService from 'js/awStateService';
import $ from 'jquery';
import _ from 'lodash';
/**
 * Open search panel as needed
 *
 * @function openSearchPanelAsNeeded

 */
export let openSearchPanelAsNeeded = function() {
    let isNarrowMode = window.matchMedia( '(max-width: 63.76em)' ).matches;
    let sublocationNameCtx = appCtxService.getCtx( 'sublocation' );
    let isSearchResultsSubloc = sublocationNameCtx && sublocationNameCtx.nameToken === 'com.siemens.splm.client.search:SearchResultsSubLocation';
    if( awSearchCoreService.isSearchPanelVisible() ) {
        if( !isNarrowMode ) {
            // If it is not narrow mode and not search results sub location, close the navigation panel - Awp0Search
            let eventData = {
                source: 'navigationPanel'
            };
            eventBus.publish( 'complete', eventData );
        }
    } else if( isSearchResultsSubloc && isNarrowMode ) {
        const stateProvider = AwStateService.instance;
        const changedParams = stateProvider.params;
        if( changedParams.hasOwnProperty( 'searchCriteria' ) ) {
            const searchString = changedParams.searchCriteria;
            if( !searchString || searchString.length < 1 ) {
                // In search location, if no search has been done, the search panel should auto-open when window size enters near narrow mode.
                awSearchCoreService.openNarrowModeSearchPanel();
            }
        }
    }
};

/**
 * Determines if search panel is visible
 * @function isSearchPanelVisible
 *
 * @return {Boolean} true if search panel is visible
 */
export let isSearchPanelVisible = function() {
    let activationCommand = appCtxService.getCtx( 'activeNavigationCommand' );
    return activationCommand && activationCommand.commandId === 'Awp0Search';
};

/**
 * Toggle narrow mode search panel

 */
export let openNarrowModeSearchPanel = function() {
    commandPanelService.activateCommandPanel( 'Awp0Search', 'aw_navigation' );
};

export const bodyClickListener = ( event ) => {
    if( !wasClickEventInsideTheElement( event ) && !wasPrefilterPopupOpen() ) {
        setTimeout( () => {
            eventBus.publish( 'search.expandCollapseSearchBox' );
        }, 300 );
    }
};

const wasClickEventInsideTheElement = ( event ) => {
    let isChild = $( '.aw-search-globalSearchWidgetContainer' ).find( event.target ).length > 0;

    if( !isChild ) {
        //if the click is on the prefilter popup, the popup should still be considered a child.
        let className = event.target.className;
        isChild = className && className.toString().indexOf( 'aw-widgets-cellListCellText' ) > -1;
    }
    let isSelf = $( '.aw-search-globalSearchWidgetContainer' )[ 0 ] === event.target;
    return isChild || isSelf;
};

const wasPrefilterPopupOpen = () => {
    let prefilterPopup = '.sw-popup-contentContainer';
    let prefilterPopupElement = $( prefilterPopup );
    return prefilterPopupElement && prefilterPopupElement.length > 0;
};

export const publishEventsInHalfSeconds = _.debounce( ( event ) => {
    eventBus.publish( event );
}, 500 );

export const doActionInHalfSeconds = _.debounce( ( action ) => {
    action();
}, 500 );

const awSearchCoreService = {
    isSearchPanelVisible,
    openSearchPanelAsNeeded,
    openNarrowModeSearchPanel,
    bodyClickListener,
    publishEventsInHalfSeconds,
    doActionInHalfSeconds
};

export default awSearchCoreService;
