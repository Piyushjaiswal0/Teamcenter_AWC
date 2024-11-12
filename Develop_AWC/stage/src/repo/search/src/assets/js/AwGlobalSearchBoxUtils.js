import awSearchCoreService from 'js/awSearchCoreService';
import $ from 'jquery';


export const expandCollapseSearchBox = ( expand, searchString ) => {
    if ( !searchString || searchString.trim().length < 1 ) {
        const newExpand = { ...expand };
        newExpand.value = false;
        expand.update( newExpand );
    }
};

export const addRemoveClickListener = ( expand ) => {
    if ( expand.value === 'true' ) {
        document.body.addEventListener( 'click', awSearchCoreService.bodyClickListener, true );
    } else{
        document.body.removeEventListener( 'click', awSearchCoreService.bodyClickListener, true );
    }
};

/**
 * function to add and remove aw-search-suggestionSelected
 * @param liIndex selected object index
 */
export let suggestionSelectedArrowDown = function( liIndex ) {
    $( '.aw-search-suggestionsPopup .aw-base-scrollPanel .aw-widgets-cellListItem ' ).eq( liIndex + 1 ).addClass( 'aw-search-suggestionSelected' );
    $( '.aw-search-suggestionsPopup .aw-base-scrollPanel .aw-widgets-cellListItem ' ).eq( liIndex ).removeClass( 'aw-search-suggestionSelected' );
};

/**
 * function to add and remove aw-search-suggestionSelected
 * @param liIndex selected object index
 */
export let suggestionSelectedArrowUp = function( liIndex ) {
    $( '.aw-search-suggestionsPopup .aw-base-scrollPanel .aw-widgets-cellListItem ' ).eq( liIndex - 1 ).addClass( 'aw-search-suggestionSelected' );
    $( '.aw-search-suggestionsPopup .aw-base-scrollPanel .aw-widgets-cellListItem ' ).eq( liIndex ).removeClass( 'aw-search-suggestionSelected' );
};

/**
 * function to update Searchbox With Title
 * @param fields fields
 */
export let updateSearchboxWithTitle = function( fields ) {
    let liIndexTitle =  $( '.aw-search-suggestionSelected' ).attr( 'title' );
    fields.searchBox.update( liIndexTitle );
};

/**
 *  function to get Updated Index Arrowdown
 * @param fields fields
 */
export let getUpdateIndexArrowdown =  function( fields ) {
    var liIndex = parseInt( $( '.aw-search-suggestionSelected' ).attr( 'index' ) );
    suggestionSelectedArrowDown( liIndex );
    updateSearchboxWithTitle( fields );
};

/**
 * function for selecting Next Index On Arrow Down
 * @param fields fields
 */
export const selectNextIndexOnArrowDown = function( fields ) {
    var isSuggestionPopup = $( '.aw-search-suggestionsPopup' );
    var isRecentsPopup = $( '.aw-search-recentSearchPopup' );
    var isSuggestionSelected = $( '.aw-search-suggestionsPopup .aw-search-suggestionSelected' );
    var isRecentsdSelected = $( '.aw-search-recentSearchPopup .aw-search-suggestionSelected' );
    var selectedSuggestionIndex = $( '.aw-search-suggestionsPopup .aw-base-scrollPanel .aw-widgets-cellListItem' );
    var selectedRecentsIndex = $( '.aw-search-recentSearchPopup .aw-base-scrollPanel .aw-widgets-cellListItem' );
    var savedSearchLink = $( '.aw-search-globalSearchSavedLink' );
    var AdvancedSearchLink = $( '.aw-search-globalSearchLinksPanel1' );

    if( savedSearchLink.hasClass( 'aw-search-suggestionSelected' ) ) {
        savedSearchLink.removeClass( 'aw-search-suggestionSelected' );
        AdvancedSearchLink.addClass( 'aw-search-suggestionSelected' );
    } else if ( isSuggestionPopup.length === 0 && isRecentsPopup.length === 0 && savedSearchLink.length && !AdvancedSearchLink.hasClass( 'aw-search-suggestionSelected' ) ) {
        savedSearchLink.addClass( 'aw-search-suggestionSelected' );
    } else if ( AdvancedSearchLink.hasClass( 'aw-search-suggestionSelected' ) && isRecentsPopup.length === 0 && isSuggestionPopup.length ) {
        AdvancedSearchLink.removeClass( 'aw-search-suggestionSelected' );
        selectedSuggestionIndex.eq( 0 ).addClass( 'aw-search-suggestionSelected' );
    }else if ( AdvancedSearchLink.hasClass( 'aw-search-suggestionSelected' ) && isRecentsPopup.length && isSuggestionPopup.length === 0 ) {
        AdvancedSearchLink.removeClass( 'aw-search-suggestionSelected' );
        selectedRecentsIndex.eq( 0 ).addClass( 'aw-search-suggestionSelected' );
    } else if ( AdvancedSearchLink.hasClass( 'aw-search-suggestionSelected' ) && isRecentsPopup.length && isSuggestionPopup.length ) {
        AdvancedSearchLink.removeClass( 'aw-search-suggestionSelected' );
        selectedSuggestionIndex.eq( 0 ).addClass( 'aw-search-suggestionSelected' );
    }
    //Both suggestion and recent pop up
    else if ( isSuggestionPopup.length && isRecentsPopup.length ) {
        // Both suggestion and recent pop up and No index is selected
        if( isSuggestionSelected.length === 0 && isRecentsdSelected.length === 0 ) {
            selectedSuggestionIndex.eq( 0 ).addClass( 'aw-search-suggestionSelected' );
            updateSearchboxWithTitle( fields );
            // at last index of suggestions popup
        } else if( isSuggestionSelected.index() === selectedSuggestionIndex.length - 1 ) {
            var liIndex = parseInt( $( '.aw-search-suggestionSelected' ).attr( 'index' ) );
            selectedSuggestionIndex.eq( liIndex ).removeClass( 'aw-search-suggestionSelected' );
            if( isRecentsdSelected.length === 0 ) {
                selectedRecentsIndex.eq( 0 ).addClass( 'aw-search-suggestionSelected' );
                updateSearchboxWithTitle( fields );
            }
        } else if( isRecentsdSelected.length === 1 ) {
            // at last index of Recents popup
            if( isRecentsdSelected.index() === selectedRecentsIndex.length - 1 ) {
                var liIndex = parseInt( $( '.aw-search-suggestionSelected' ).attr( 'index' ) );
                selectedRecentsIndex.eq( liIndex ).removeClass( 'aw-search-suggestionSelected' );
                if( isSuggestionSelected.length === 0 && savedSearchLink.length === 0 ) {
                    selectedSuggestionIndex.eq( 0 ).addClass( 'aw-search-suggestionSelected' );
                    updateSearchboxWithTitle( fields );
                }else if( savedSearchLink.length === 1 ) {
                    savedSearchLink.addClass( 'aw-search-suggestionSelected' );
                }
            } else{
                var liIndex = parseInt( $( '.aw-search-suggestionSelected' ).attr( 'index' ) );
                selectedRecentsIndex.eq( liIndex + 1 ).addClass( 'aw-search-suggestionSelected' );
                selectedRecentsIndex.eq( liIndex ).removeClass( 'aw-search-suggestionSelected' );
                updateSearchboxWithTitle( fields );
            }
        }else {
            getUpdateIndexArrowdown( fields );
        }
    } else {
        // only suggestions popup
        if ( $( '.aw-search-suggestionsPopup' )[0] ) {
            if( $( '.aw-search-suggestionSelected' ).length === 0 ) {
                selectedSuggestionIndex.eq( 0 ).addClass( 'aw-search-suggestionSelected' );
                updateSearchboxWithTitle( fields );
            } else {
                if( isSuggestionSelected.index() === selectedSuggestionIndex.length - 1 ) {
                    if( savedSearchLink.length ) {
                        var liIndex = parseInt( $( '.aw-search-suggestionSelected' ).attr( 'index' ) );
                        selectedSuggestionIndex.eq( liIndex ).removeClass( 'aw-search-suggestionSelected' );
                        savedSearchLink.addClass( 'aw-search-suggestionSelected' );
                    }else{
                        var liIndex = parseInt( $( '.aw-search-suggestionSelected' ).attr( 'index' ) );
                        selectedSuggestionIndex.eq( liIndex ).removeClass( 'aw-search-suggestionSelected' );
                        selectedSuggestionIndex.eq( 0 ).addClass( 'aw-search-suggestionSelected' );
                        updateSearchboxWithTitle( fields );
                    }
                } else{
                    getUpdateIndexArrowdown( fields );
                }
            }// only Recents popup
        } else if( $( '.aw-search-recentSearchPopup' )[0] ) {
            if( $( '.aw-search-suggestionSelected' ).length === 0 ) {
                selectedRecentsIndex.eq( 0 ).addClass( 'aw-search-suggestionSelected' );
                updateSearchboxWithTitle( fields );
            }else {
                if( isRecentsdSelected.index() === selectedRecentsIndex.length - 1 ) {
                    if( savedSearchLink.length ) {
                        var liIndex = parseInt( $( '.aw-search-suggestionSelected' ).attr( 'index' ) );
                        selectedRecentsIndex.eq( liIndex ).removeClass( 'aw-search-suggestionSelected' );
                        savedSearchLink.addClass( 'aw-search-suggestionSelected' );
                    }else{
                        var liIndex = parseInt( $( '.aw-search-suggestionSelected' ).attr( 'index' ) );
                        selectedRecentsIndex.eq( liIndex ).removeClass( 'aw-search-suggestionSelected' );
                        selectedRecentsIndex.eq( 0 ).addClass( 'aw-search-suggestionSelected' );
                        updateSearchboxWithTitle( fields );
                    }
                }else{
                    var liIndex = parseInt( $( '.aw-search-suggestionSelected' ).attr( 'index' ) );
                    selectedRecentsIndex.eq( liIndex + 1 ).addClass( 'aw-search-suggestionSelected' );
                    selectedRecentsIndex.eq( liIndex ).removeClass( 'aw-search-suggestionSelected' );
                    updateSearchboxWithTitle( fields );
                }
            }
        }else {
            getUpdateIndexArrowdown( fields );
        }
    }
};

/**
 *  function for selecting Next Index On ArrowUp
 * @param fields fields
 */
export const selectNextIndexOnArrowUp = function( fields ) {
    var isSuggestionPopup = $( '.aw-search-suggestionsPopup' );
    var isRecentsPopup = $( '.aw-search-recentSearchPopup' );
    var isRecentsdSelected = $( '.aw-search-recentSearchPopup .aw-search-suggestionSelected' );
    var selectedSuggestionIndex = $( '.aw-search-suggestionsPopup .aw-base-scrollPanel .aw-widgets-cellListItem' );
    var selectedRecentsIndex = $( '.aw-search-recentSearchPopup .aw-base-scrollPanel .aw-widgets-cellListItem' );
    var savedSearchLink = $( '.aw-search-globalSearchSavedLink' );
    var AdvancedSearchLink = $( '.aw-search-globalSearchLinksPanel1' );
    //Both suggestion and recent pop up
    if( savedSearchLink.hasClass( 'aw-search-suggestionSelected' ) && isRecentsPopup.length && isSuggestionPopup.length ) {
        savedSearchLink.removeClass( 'aw-search-suggestionSelected' );
        var recentsSearchPopupIndex = parseInt( selectedRecentsIndex.length - 1 );
        selectedRecentsIndex.eq( recentsSearchPopupIndex ).addClass( 'aw-search-suggestionSelected' );
    } else if ( savedSearchLink.hasClass( 'aw-search-suggestionSelected' ) && isRecentsPopup.length === 0 && isSuggestionPopup.length ) {
        savedSearchLink.removeClass( 'aw-search-suggestionSelected' );
        var suggestionSearchPopupIndex = parseInt( selectedSuggestionIndex.length - 1 );
        selectedSuggestionIndex.eq( suggestionSearchPopupIndex ).addClass( 'aw-search-suggestionSelected' );
    } else if ( savedSearchLink.hasClass( 'aw-search-suggestionSelected' ) && isRecentsPopup.length && isSuggestionPopup.length === 0 ) {
        savedSearchLink.removeClass( 'aw-search-suggestionSelected' );
        var suggestionSearchPopupIndex = parseInt( selectedRecentsIndex.length - 1 );
        selectedRecentsIndex.eq( suggestionSearchPopupIndex ).addClass( 'aw-search-suggestionSelected' );
    } else if ( AdvancedSearchLink.hasClass( 'aw-search-suggestionSelected' ) && savedSearchLink.length ) {
        AdvancedSearchLink.removeClass( 'aw-search-suggestionSelected' );
        savedSearchLink.addClass( 'aw-search-suggestionSelected' );
    } else if ( selectedSuggestionIndex.eq( 0 ).hasClass( 'aw-search-suggestionSelected' ) &&  AdvancedSearchLink.length ) {
        selectedSuggestionIndex.eq( 0 ).removeClass( 'aw-search-suggestionSelected' );
        AdvancedSearchLink.addClass( 'aw-search-suggestionSelected' );
    } else if ( selectedRecentsIndex.eq( 0 ).hasClass( 'aw-search-suggestionSelected' )  &&  isSuggestionPopup.length === 0 &&  AdvancedSearchLink.length ) {
        selectedRecentsIndex.eq( 0 ).removeClass( 'aw-search-suggestionSelected' );
        AdvancedSearchLink.addClass( 'aw-search-suggestionSelected' );
    }else if ( isSuggestionPopup.length && isRecentsPopup.length ) {
        if( selectedRecentsIndex.eq( 0 ).hasClass( 'aw-search-suggestionSelected' ) ) {
            var suggestionSearchPopupIndex = parseInt( selectedSuggestionIndex.length - 1 );
            selectedRecentsIndex.eq( 0 ).removeClass( 'aw-search-suggestionSelected' );
            selectedSuggestionIndex.eq( suggestionSearchPopupIndex ).addClass( 'aw-search-suggestionSelected' );
            updateSearchboxWithTitle( fields );
        }else if( selectedSuggestionIndex.eq( 0 ).hasClass( 'aw-search-suggestionSelected' ) ) {
            var recentPopupIndex = parseInt( selectedRecentsIndex.length - 1 );
            selectedSuggestionIndex.eq( 0 ).removeClass( 'aw-search-suggestionSelected' );
            selectedRecentsIndex.eq( recentPopupIndex ).addClass( 'aw-search-suggestionSelected' );
            updateSearchboxWithTitle( fields );
        } else if( isRecentsdSelected.length === 1 ) {
            var liIndex = parseInt( $( '.aw-search-recentSearchPopup .aw-search-suggestionSelected' ).attr( 'index' ) );
            selectedRecentsIndex.eq( liIndex ).removeClass( 'aw-search-suggestionSelected' );
            selectedRecentsIndex.eq( liIndex - 1 ).addClass( 'aw-search-suggestionSelected' );
            updateSearchboxWithTitle( fields );
        }else{
            var liIndex = parseInt( $( '.aw-search-suggestionSelected' ).attr( 'index' ) );
            suggestionSelectedArrowUp( liIndex );
            updateSearchboxWithTitle( fields );
        }
    }else{
        if ( isSuggestionPopup.length ) {
            var liIndex = parseInt( $( '.aw-search-suggestionSelected' ).attr( 'index' ) );
            suggestionSelectedArrowUp( liIndex );
            updateSearchboxWithTitle( fields );
        } else if( isRecentsPopup.length ) {
            var liIndex = parseInt( $( '.aw-search-suggestionSelected' ).attr( 'index' ) );
            selectedRecentsIndex.eq( liIndex ).removeClass( 'aw-search-suggestionSelected' );
            selectedRecentsIndex.eq( liIndex - 1 ).addClass( 'aw-search-suggestionSelected' );
            updateSearchboxWithTitle( fields );
        }
    }
};

const AwGlobalSearchBoxUtils = {
    suggestionSelectedArrowUp,
    updateSearchboxWithTitle,
    getUpdateIndexArrowdown,
    suggestionSelectedArrowDown,
    selectNextIndexOnArrowDown,
    selectNextIndexOnArrowUp,
    expandCollapseSearchBox,
    addRemoveClickListener
};

export default AwGlobalSearchBoxUtils;
