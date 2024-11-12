//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/searchSnippetsService
 */
import _ from 'lodash';
import sanitizer from 'js/sanitizer';
import Awp0SearchHighlightingService from 'js/Awp0SearchHighlightingService';

/**
 * Get search snippets
 *
 * Expected response of searchSnippets list is in the below format for each object.
 *           {
 *              "rR1Ms1epgwwkB":{
 *                  "fileContentSnippet":[
 *                      "<em>Competitive</em> Dimensional Analysis"
 *                  ],
 *                  "fileNameSnippet":[
 *                     "<em>competition.pdf</em>"
 *                 ],
 *                  "attachmentNameSnippet":[
 *                     "<em>competition</em>,<em>competition.pdf</em>"
 *                 ]
 *              }
 *           }
 * Output will be like this
 * {
 *    "rR1Ms1epgwwkB":  {
 *           "fileContentSnippet": "Competitive Dimensional Analysis",
 *          "fileNameSnippet": "competition.pdf",
 *          "attachmentNameSnippet": "competition, competition.pdf"
 *      }
 *  }
 *
 * @function getSearchSnippets
 * @param {Object} data - declViewModel
 */
export let getSearchSnippets = function( data ) {
    let searchSnippets = {};
    let keywords = [];
    if( data.additionalSearchInfoMap !== undefined ) {
        let ssArray = data.additionalSearchInfoMap.searchSnippets;
        if( ssArray && ssArray.length > 0 ) {
            _.forEach( ssArray, function( ssEach ) {
                if( ssEach ) {
                    let snippet = {};
                    try {
                        snippet  = JSON.parse( ssEach );
                    } catch ( error ) {
                        console.log( 'Search input is not a valid json' );
                    }

                    for( var uid in snippet ) {
                        if( snippet.hasOwnProperty( uid ) ) {
                            let snippetObject = snippet[ uid ];
                            let displaySnippet = {};

                            if( snippetObject.fileContentSnippet && snippetObject.fileContentSnippet.length > 0 ) {
                                displaySnippet.fileContentSnippet = snippetObject.fileContentSnippet[0].replace( /<em>(.*?)<\/em>/g, function( match, keyword ) {
                                    keywords = _.union( keywords, [ keyword ] );
                                    return keyword;
                                } );
                            }
                            if( snippetObject.fileNameSnippet && snippetObject.fileNameSnippet.length > 0 ) {
                                displaySnippet.fileNameSnippet = snippetObject.fileNameSnippet[0].replace( /<em>(.*?)<\/em>/g, function( match, keyword ) {
                                    keywords = _.union( keywords, [ keyword ] );
                                    return keyword;
                                } );
                            }
                            if( snippetObject.attachmentNameSnippet && snippetObject.attachmentNameSnippet.length > 0 ) {
                                let attachmentNameSnippetArray = [];
                                _.forEach( snippetObject.attachmentNameSnippet, function( eachSnippet ) {
                                    let snippet = '';
                                    snippet = eachSnippet.replace( /<em>(.*?)<\/em>/g, function( match, keyword ) {
                                        keywords = _.union( keywords, [ keyword ] );
                                        return keyword;
                                    } );
                                    let trimmedSnippet = snippet.trim();
                                    attachmentNameSnippetArray.push( trimmedSnippet );
                                } );
                                displaySnippet.attachmentNameSnippet = attachmentNameSnippetArray.join( ', ' );
                            }
                            searchSnippets[ uid ] = displaySnippet;
                        }
                    }
                }
            } );
        }
        if( keywords.length > 0 ) {
            data.additionalSearchInfoMap.searchTermsToHighlight = _.union( keywords, data.additionalSearchInfoMap.searchTermsToHighlight );
        }
        searchSnippets.searchTermsToHighlight = data.additionalSearchInfoMap.searchTermsToHighlight;
        // highlighterSvc.highlightKeywords( data.additionalSearchInfoMap.searchTermsToHighlight );
    }
    return searchSnippets;
};

export let containsWordsToHighlight = function( part, words ) {
    let index = _.findIndex( words, function( word ) {
        return part.indexOf( word.toLowerCase() ) > -1;
    } );

    return index > -1;
};

export let getHighlightedText = function( text, highlight, wordsToHighlight, css ) {
    // Split on highlight term and include term into parts, ignore case
    const parts = text.split( highlight );

    return <span key={text}> { parts.map( ( part, i ) => {
        if ( css && containsWordsToHighlight( part.toLowerCase(), wordsToHighlight ) ) {
            return <span key={i} className={css.cssClass ? css.cssClass : ''} style={ css.cssStyle ? css.cssStyle : {} }>
                { part }
            </span>;
        }
        return <span key={i} >{ part }</span>;
    } )
    } </span>;
};
/**
 * highlightSearchResults
 *
 * @function highlightSearchResults
 * @param {Object} item item
 * @param {String} text text
 * @return {HTML} HTML string with bold texts
 */
export let highlightSearchResults = function( item, text, styleJsx ) {
    if( item === undefined || item === '' ) {
        return '';
    }
    let cleanText = sanitizer.htmlEscapeAllowEntities( text );
    let cleanItem = unEscapeHtml( item );
    if( !cleanText ) {
        return <span>{cleanItem}</span>;
    }
    var words = Awp0SearchHighlightingService.escapeRegexSpecialChars( cleanText ).split( '#HIGHLIGHT#' );
    var regExp = new RegExp( '(' + words.join( '|' ) + ')', 'gi' );

    var splitedCleanText = cleanText.split('#HIGHLIGHT#');

    let finalJsx = [];
    // let styleJsx = { fontWeight: 'bold' };
    finalJsx.push( getHighlightedText( cleanItem, regExp, splitedCleanText, styleJsx ) );
    return finalJsx;
};
export const unEscapeHtml = ( escapedSafe ) => { // eslint-disable-line no-unused-vars
    let cleanString = sanitizer.htmlEscapeAllowEntities( escapedSafe );
    cleanString = cleanString.replace( /&amp;/ig, '&' ).replace( /&lt;/ig, '<' ).replace( /&gt;/ig, '>' ).replace(
        /&quot;/ig, '"' ).replace( /&#39;/ig, '\'' );
    return cleanString;
};
export default {
    getSearchSnippets,
    containsWordsToHighlight,
    getHighlightedText,
    highlightSearchResults,
    unEscapeHtml
};
