// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 *
 * @module js/Awp0SearchHighlightingService
 */

import highlighterSvc from 'js/highlighterService';
import appCtxService from 'js/appCtxService';
import sanitizer from 'js/sanitizer';
import $ from 'jquery';
import _ from 'lodash';
/**
 * getHighlightKeywords - function to get the keywords for highlighting from performSearchViewModel5 response
 * @param { Object } data
 * @returns { Boolean } true/false
 */
const HIGHLIGHT_CSS = 'aw-ui-showHighlight';
const COLOR_FILTERING_CSS = 'aw-ui-hideColorFiltering';
const LOCATOR_TO_ADD_CSS = '.aw-layout-sublocationContainer';
export let getHighlightKeywords = function( data ) {
    if( data.additionalSearchInfoMap !== undefined ) {
        highlighterSvc.highlightKeywords( data.additionalSearchInfoMap.searchTermsToHighlight );
        return true;
    }
    return false;
};

/**
 * initHighlight - init the body tag and context for highlighting
 */

export let initHighlight = function() {
    let prefVal = appCtxService.getCtx( 'preferences' ).AW_Highlighting;
    if( !prefVal ) {
        prefVal = [ 'true' ];
    }
    let booleanPrefValue = prefVal[ 0 ] && prefVal[ 0 ].toLowerCase() === 'true';
    if( booleanPrefValue ) {
        $( LOCATOR_TO_ADD_CSS ).addClass( HIGHLIGHT_CSS );
    } else {
        $( LOCATOR_TO_ADD_CSS ).removeClass( HIGHLIGHT_CSS );
    }
    return booleanPrefValue;
};

/**
 * resetHighlight - remove the body tag and context for highlighting
 */
export let resetHighlight = function() {
    //removeClass will go through regardless css class exists or not, so no need to check its existence.
    $( LOCATOR_TO_ADD_CSS ).removeClass( HIGHLIGHT_CSS );
};

/**
 * toggleHighlightSelection - toggle to turn highlighting on/off
 * @param { Object } prefVals
 * @param { Boolean } toToggle
 * @returns { Boolean } return the preference value of AW_Highlighting
 */

export let toggleHighlightSelection = function( prefVals, toToggle, searchTermsToHighlight, searchState ) {
    let prefVal = prefVals.AW_Highlighting;
    if( !prefVal ) {
        // if the preference is not (yet) defined. This should not happen in production env.
        prefVal = [ 'true' ];
    }
    let booleanPrefValue = prefVal[ 0 ] && prefVal[ 0 ].toLowerCase() === 'true';
    if( toToggle ) {
        booleanPrefValue = !booleanPrefValue;
        prefVal[ 0 ] = booleanPrefValue ? 'true' : 'false';
        appCtxService.updateCtx( 'preferences.AW_Highlighting', prefVal );
        if( booleanPrefValue && searchTermsToHighlight ) {
            highlighterSvc.highlightKeywords( searchTermsToHighlight );
        } else {
            highlighterSvc.highlightKeywords( [] );
        }
        if( booleanPrefValue ) {
            $( LOCATOR_TO_ADD_CSS ).addClass( HIGHLIGHT_CSS );
        } else {
            $( LOCATOR_TO_ADD_CSS ).removeClass( HIGHLIGHT_CSS );
        }
    }
    let newSearchState = { ...searchState.value };
    newSearchState.highlighting = booleanPrefValue;
    searchState.update( newSearchState );
    return prefVal;
};

/**
 * toggleColorFiltering - toggle to turn color filtering on/off
 * @returns { Boolean } return the preference value of AWC_ColorFiltering
 */
export let toggleColorFiltering = function( forceToggleOff ) {
    if ( forceToggleOff ) {
        $( LOCATOR_TO_ADD_CSS ).addClass( COLOR_FILTERING_CSS );
        return;
    }
    let colorPrefs = appCtxService.getCtx( 'preferences' ).AWC_ColorFiltering;
    let decoratorToggle = colorPrefs ? colorPrefs[ 0 ] === 'true' : false;
    if( decoratorToggle ) {
        $( LOCATOR_TO_ADD_CSS ).removeClass( COLOR_FILTERING_CSS );
    } else {
        $( LOCATOR_TO_ADD_CSS ).addClass( COLOR_FILTERING_CSS );
    }
    return decoratorToggle;
};
/**
 * escapeRegexSpecialChars
 *
 * @function escapeRegexSpecialChars
 * @param {Object} regex regex
 * @return {String} escaped regex string
 */
export let escapeRegexSpecialChars = function( regex ) {
    return regex.replace( /[-\/\\^$*+?.()|[\]{}]/g, '\\$&' );
};

/**
 * highlightSearchResults
 *
 * @function highlightSearchResults
 * @param {Object} item item
 * @param {String} text text
 * @return {HTML} HTML string with bold texts
 */
export let highlightSearchResults = function( item, text ) {
    if( item === undefined || item === '' ) {
        return undefined;
    }
    let cleanText = sanitizer.htmlEscapeAllowEntities( text );
    let cleanItem = sanitizer.htmlEscapeAllowEntities( item );
    if( !cleanText ) {
        return cleanItem;
    }
    var words = Awp0SearchHighlightingService.escapeRegexSpecialChars( cleanText ).split( ' ' ).join( '|' );
    var regExp = new RegExp( '(' + words + ')', 'gi' );
    return cleanItem.toString().replace( regExp, '<strong>$1</strong>' );
};

/* eslint-disable-next-line valid-jsdoc*/

const Awp0SearchHighlightingService = {
    getHighlightKeywords,
    initHighlight,
    resetHighlight,
    toggleHighlightSelection,
    escapeRegexSpecialChars,
    highlightSearchResults,
    toggleColorFiltering
};

export default Awp0SearchHighlightingService;
