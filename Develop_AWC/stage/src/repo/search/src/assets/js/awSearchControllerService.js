// Copyright (c) 2021 Siemens
import eventBus from 'js/eventBus';
import localStrg from 'js/localStorage';
import sanitizer from 'js/sanitizer';
import _ from 'lodash';
var ctrl = {};
const _LS_TOPIC = '__awRecentSearchObjectList';
const No_search_history = 'No_search_history';

export let initAwSearch = function( userUidString ) {
    ctrl.displayClearAll = true;
    ctrl.showMoreFlag = true;
    ctrl._LS_TOPIC = userUidString + _LS_TOPIC;
    ctrl.searchBoxSelected = false;
    ctrl.showRecentSearch = false;
    awSearchControllerService.handleSearchListener();
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
 * Filter to filter and rank recent search objects based on the search criteria provided
 */
export let recentSearchFilter = function( items, criteria ) {
    if( items === undefined || !items || items.length === 0 ) {
        return [];
    }

    if( !criteria ) {
        for( var i = 0; i < items.length; i++ ) {
            items[ i ].score = 0;
        }
        return items;
    }

    // split search criteria on space
    var searchTerms = criteria.split( ' ' );

    for( var k = 0; k < items.length; k++ ) {
        items[ k ].score = 0;
        searchTerms.forEach( function( term ) {
            if( term && term.length ) {
                var regExp = new RegExp( awSearchControllerService.escapeRegexSpecialChars( term ), 'gi' );
                var result = items[ k ].value.criteria.match( regExp );
                if( result ) {
                    for( var j = 0; j < result.length; j++ ) {
                        items[ k ].score += result[ j ].length;
                    }
                }
            }
        } );
    }
    items.sort( function( a, b ) {
        return b.score - a.score;
    } );
    //return only the items that match something
    return items.filter( function( item ) {
        return item.score > 0;
    } );
};

export let handlePerformSearchEvent = function( eventData ) {
    if( !eventData || !eventData.criteria ) {
        return;
    }

    eventData.criteria = sanitizer.htmlEscapeAllowEntities( eventData.criteria );
    var currentSearch = {
        key: eventData.criteria,
        searchHistoryCache:eventData.searchHistoryCache,
        value: {
            criteria: eventData.criteria.trim(),
            filter: eventData.filterMap,
            date_created: new Date().getTime()
        }
    };
    awSearchControllerService.saveCurrentSearch( currentSearch );
    ctrl.showRecentSearch = false;
    ctrl.showPopup = false;
};

//Event listeners
export let handleSearchListener = function() {
    //Action invoked when perform search event encountered
    awSearchControllerService.releaseSearchListener();
    //Listen to global search event
    ctrl.doSearchListener = eventBus.subscribe( 'search.doSearch', function( eventData ) {
        awSearchControllerService.handlePerformSearchEvent( eventData );
    } );

    //Listen to global search 2 event
    ctrl.doSearchListener2 = eventBus.subscribe( 'search.doSearch2', function( eventData ) {
        awSearchControllerService.handlePerformSearchEvent( eventData );
    } );

    ctrl.addPanelSearch = eventBus.subscribe( 'search.suggestiveSearch', function( eventData ) {
        if( eventData.searchHistoryCache !== No_search_history ) {
            awSearchControllerService.handlePerformSearchEvent( eventData );
        }
    } );
};

//Event listeners
export let releaseSearchListener = function() {
    if( ctrl.doSearchListener ) {
        eventBus.unsubscribe( ctrl.doSearchListener );
    }
    if( ctrl.doSearchListener2 ) {
        eventBus.unsubscribe( ctrl.doSearchListener2 );
    }
    if( ctrl.addPanelSearch ) {
        eventBus.unsubscribe( ctrl.addPanelSearch );
    }
};

//Utility function to create a name for recent search
export let convertToKey = function( keyString ) {
    if( !keyString ) {
        return '';
    }
    return keyString.replace( /\s/g, '_' );
};
/**
 * Saves the passed search object in the local storage
 *
 * @memberof NgControllers.awSearchController
 * @param {Object} currentSearch currentSearch
 */
export let saveCurrentSearch = function( currentSearch ) {
    if ( currentSearch.searchHistoryCache ) {
        var cache = localStrg.get( `${ctrl._LS_TOPIC}_${currentSearch.searchHistoryCache}` );
    } else {
        var cache = localStrg.get( ctrl._LS_TOPIC );
    }
    currentSearch.key = awSearchControllerService.convertToKey( currentSearch.key );

    var cachedSearchObjects = [];
    var duplicate = false;
    if( !cache ) {
        cachedSearchObjects = [];
    } else {
        cachedSearchObjects = JSON.parse( cache );
        for( var i = 0; i < cachedSearchObjects.length; i++ ) {
            if( cachedSearchObjects[ i ].key === currentSearch.key ) {
                duplicate = true;
                // cachedSearchObjects[ i ].value.filter = ngModule.copy( currentSearch.value.filter );
                cachedSearchObjects[ i ].value.filter = currentSearch.value.filter;
                cachedSearchObjects[ i ].value.date_created = currentSearch.value.date_created;
                break;
            }
        }
    }

    if( !duplicate ) {
        cachedSearchObjects.push( currentSearch );
    }

    if( cachedSearchObjects.length > 1 ) {
        cachedSearchObjects.sort( function( a, b ) {
            return b.value.date_created - a.value.date_created;
        } );
    }

    //Limit the size to 100
    if( cachedSearchObjects.length > 100 ) {
        cachedSearchObjects = cachedSearchObjects.slice( 0, 100 );
    }
    awSearchControllerService.publishSavedSearchList( cachedSearchObjects, currentSearch.searchHistoryCache );
};

/**
 * Retrieves all recent searches for the active user
 *
 * @memberof NgControllers.awSearchController
 *
 * @return {ObjectArray} Array of recent search objects
 */
export let retrieveRecentSearchObjects = function( userUidString, searchHistoryCache ) {
    var recentSearchObjs = [];
    if ( searchHistoryCache ) {
        var cache = localStrg.get( `${userUidString + _LS_TOPIC}_${searchHistoryCache}` );
    } else {
        var cache = localStrg.get( userUidString + _LS_TOPIC );
    }
    if( cache ) {
        var cachedSearchObjects = JSON.parse( cache );
        if( cachedSearchObjects.length > 0 ) {
            cachedSearchObjects.sort( function( a, b ) {
                return b.value.date_created - a.value.date_created;
            } );

            for( var i = 0; i < cachedSearchObjects.length; i++ ) {
                recentSearchObjs.push( cachedSearchObjects[ i ] );
            }
        }
    }
    return recentSearchObjs;
};

/**
 * render function for AwSuggestions
 * @param {STRING} userUidString userUidString
 * @param {STRING} criteria criteria
 * @returns {Array} recents
 */
export const retrieveRecentSearchObjectsFiltered = ( userUidString, criteria, searchHistoryCache ) => {
    let recents = [];
    let recentsValue = [];
    let recentsAll = [];
    if( searchHistoryCache !== No_search_history ) {
        recentsAll = awSearchControllerService.retrieveRecentSearchObjects( userUidString, searchHistoryCache );
    }
    if( recentsAll && recentsAll.length > 0 ) {
        if( criteria ) {
            let recentsFiltered = awSearchControllerService.recentSearchFilter( recentsAll, criteria );
            recentsValue = _.map( recentsFiltered, 'value' );
            recents = _.map( recentsValue, 'criteria' );
        } else {
            recentsValue = _.map( recentsAll, 'value' );
            recents = _.map( recentsValue, 'criteria' );
        }
    }
    if( ctrl.showMoreFlag ) {
        return _.slice( recents, 0, 5 );
    }
    return _.slice( recents, 0, 10 );
};

//Publish the search list to the local storage
export let publishSavedSearchList = function( savedSearchList, searchHistoryCache ) {
    if ( searchHistoryCache ) {
        localStrg.publish( `${ctrl._LS_TOPIC}_${searchHistoryCache}`, JSON.stringify( savedSearchList ) );
    } else {
        localStrg.publish( ctrl._LS_TOPIC, JSON.stringify( savedSearchList ) );
    }
};

//Unpublish the search list from the local storage
export let clearLocalStorage = function( displayClearAll, searchHistoryCache ) {
    if ( displayClearAll === false ) {
        if ( searchHistoryCache ) {
            localStrg.removeItem( `${ctrl._LS_TOPIC}_${searchHistoryCache}` );
        } else {
            localStrg.removeItem( ctrl._LS_TOPIC );
        }
    }
    ctrl.showMoreFlag = true;
};

/**
 * Clears the recent search list. This operation followed by clearLocalStorage will permanently delete all
 * recent searches
 *
 * @memberof NgControllers.awSearchController
 */
export let deleteAllRecentSearches = function() {
    return [];
};

/**
 * Undos the delete done by deleteAllRecentSearches
 *
 * @memberof NgControllers.awSearchController
 */
export let undoDeleteAllRecentSearches = function() {
    return awSearchControllerService.retrieveRecentSearchObjects();
};

//Enables/disables the show more/show less options
export let toggleShowMoreFlag = function( userUidString, criteria ) {
    ctrl.showMoreFlag = !ctrl.showMoreFlag;
    return awSearchControllerService.retrieveRecentSearchObjectsFiltered( userUidString, criteria );
};
export let getMoreFlag = function() {
    return ctrl.showMoreFlag;
};

const awSearchControllerService = {
    initAwSearch,
    releaseSearchListener,
    escapeRegexSpecialChars,
    recentSearchFilter,
    handleSearchListener,
    convertToKey,
    saveCurrentSearch,
    retrieveRecentSearchObjects,
    retrieveRecentSearchObjectsFiltered,
    publishSavedSearchList,
    clearLocalStorage,
    deleteAllRecentSearches,
    undoDeleteAllRecentSearches,
    toggleShowMoreFlag,
    getMoreFlag,
    handlePerformSearchEvent
};

export default awSearchControllerService;
