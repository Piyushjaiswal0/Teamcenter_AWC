// Copyright (c) 2020 Siemens

/**
 * Defines {@link AwSearchBreadcrumbUtils} which provides the data for navigation bread crumb from url.
 *
 * @module js/AwSearchBreadcrumbUtils
 */

import searchFilterSvc from 'js/aw.searchFilter.service';
import localeService from 'js/localeService';
import _cdm from 'soa/kernel/clientDataModel';

/**
 * buildTitle
 * @function buildTitle
 * @param {Object}searchObject - search state object
 * @return {Promise} Promise containing the localized text
 */
export let buildTitle = function( searchObject ) {
    if( searchObject ) {
        let totalFound;
        let searchCriteria = '';
        let label = '';
        //Get search Criteria, Total Found and Crumbs
        if( searchObject.thresholdExceeded === 'true' ) {
            return '';
        }
        if( searchObject.totalFound >= 0 ) {
            totalFound = searchObject.totalFound;
        }
        if( searchObject.criteria && searchObject.criteria.searchString ) {
            searchCriteria = searchObject.criteria.searchString;
        }
        if( searchObject.label ) {
            label = searchObject.label;
        }
        if( searchObject.showNoCriteriaMessage && searchObject.noCriteriaMessage && searchObject.noCriteriaMessage.length > 0
            && ( !searchCriteria || searchCriteria && searchCriteria.length === 0 ) ) {
            return localeService.getLocalizedTextFromKey( searchObject.noCriteriaMessage ).then( ( localizedText ) => {
                if( localizedText && localizedText.length > 0 ) {
                    return localizedText;
                }
                return '';
            } );
        } else if( searchObject.showNoCriteriaMessage && !searchObject.noCriteriaMessage
            && ( !searchCriteria || searchCriteria && searchCriteria.length === 0 ) ) {
            return localeService.getLocalizedTextFromKey( 'SearchMessages.resultsNoCriteriaDefaultMessage' ).then( ( localizedText ) => {
                return localizedText;
            } );
        }
        return searchFilterSvc.loadBreadcrumbTitle( label, searchCriteria, totalFound ).then( ( localizedText ) => {
            return localizedText;
        } );
    }
    return Promise.resolve( {} );
};


/**
 * buildTitle for Shape breadcrumb.
 * @function buildTitle
 * @param {Object}searchObject - search state object
 * @return {Promise} Promise containing the localized text
 */
export let buildShapeTitle = function( searchObject ) {
    if( searchObject ) {
        let totalFound;
        let searchCriteria = '';
        let label = '';
        //Get search Criteria, Total Found and Crumbs
        if( searchObject.totalFound >= 0 ) {
            totalFound = searchObject.totalFound;
        }
        if( searchObject.criteria && searchObject.criteria.searchString ) {
            var targetObj = _cdm.getObject( searchObject.criteria.searchString );
            if( targetObj && targetObj.props && targetObj.props.object_name && targetObj.props.object_name.dbValues ) {
                searchCriteria = targetObj.props.object_name.dbValues[0];
            }else{
                searchCriteria = searchObject.criteria.searchString;
            }
        }
        if( searchObject.label ) {
            label = searchObject.label;
        }
        if( searchObject.showNoCriteriaMessage && searchObject.noCriteriaMessage && searchObject.noCriteriaMessage.length > 0
            && ( !searchCriteria || searchCriteria && searchCriteria.length === 0 ) ) {
            return localeService.getLocalizedTextFromKey( searchObject.noCriteriaMessage ).then( ( localizedText ) => {
                if( localizedText && localizedText.length > 0 ) {
                    return localizedText;
                }
                return '';
            } );
        } else if( searchObject.showNoCriteriaMessage && !searchObject.noCriteriaMessage
            && ( !searchCriteria || searchCriteria && searchCriteria.length === 0 ) ) {
            return localeService.getLocalizedTextFromKey( 'SearchMessages.resultsNoCriteriaDefaultMessage' ).then( ( localizedText ) => {
                return localizedText;
            } );
        }
        return searchFilterSvc.loadBreadcrumbTitle( label, searchCriteria, totalFound ).then( ( localizedText ) => {
            return localizedText;
        } );
    }
    return Promise.resolve( {} );
};


/**
 * buildAdvancedSearchTitle
 * @function buildAdvancedSearchTitle
 * @param {Object}searchObject - search state object
 * @return {Promise} Promise containing the localized text
 */
export let buildAdvancedSearchTitle = function( searchObject ) {
    if( searchObject ) {
        if( searchObject && searchObject.totalFound === undefined && searchObject.advancedSearchCriteria && Object.keys( searchObject.advancedSearchCriteria ).length > 0 ) {
            // when doing a search, Loading... text should be shown till the SOA call comes back with response.
            return localeService.getLocalizedTextFromKey( 'BaseMessages.LOADING_TEXT' ).then( ( localizedText ) => {
                return localizedText;
            } );
        }
        if( searchObject.searchFilterMap && searchObject.searchFilterMap.SAVED_QUERY_RESULT_TYPES.length > 0 && searchObject.totalFound > 0 ) {
            //return resultsFound text
            if( searchObject.WSOMFindSetSearchLimit && searchObject.WSOMFindSetSearchLimit <= searchObject.totalFound ) {
                return localeService.getLocalizedTextFromKey( 'SearchMessages.advancedSearchResultsFoundExceedWSOM' ).then( ( localizedText ) => {
                    return localizedText.format( searchObject.WSOMFindSetSearchLimit, searchObject.referencingSavedQuery );
                } );
            }
            return localeService.getLocalizedTextFromKey( 'SearchMessages.advancedSearchResultsFound' ).then( ( localizedText ) => {
                return localizedText.format( searchObject.totalFound, searchObject.referencingSavedQuery );
            } );
        } else if( searchObject.searchFilterMap && searchObject.searchFilterMap.SAVED_QUERY_RESULT_TYPES.length === 0 && searchObject.totalFound === 0 ) {
            // return noresults text
            return localeService.getLocalizedTextFromKey( 'SearchMessages.advancedSearchNoResultsFound' ).then( ( localizedText ) => {
                return localizedText.format( searchObject.referencingSavedQuery );
            } );
        }
        // return default text
        return localeService.getLocalizedTextFromKey( 'SearchMessages.advancedSearchPWADefaultMessage' ).then( ( localizedText ) => {
            return localizedText;
        } );
    }
    return Promise.resolve( {} );
};

/**
 * buildUnreadableTooltip
 * @function buildUnreadableTooltip
 * @param {Object}searchObject - search state object
 * @return {Promise} Promise containing the localized text
 */
export let buildUnreadableTooltip = function( count, subPanelContextCount ) {
    //Count is in global locations
    if( count ) {
        return localeService.getLocalizedTextFromKey( 'SearchMessages.unreadableCountTooltip' ).then( ( localizedText ) => {
            return localizedText.format( count );
        } );
    }
    //This is for checking panel locations
    else if( subPanelContextCount ) {
        return localeService.getLocalizedTextFromKey( 'SearchMessages.unreadableCountTooltip' ).then( ( localizedText ) => {
            return localizedText.format( subPanelContextCount.subPanelContext );
        } );
    }
    return Promise.resolve( {} );
};

const AwSearchBreadcrumbUtils = {
    buildTitle,
    buildAdvancedSearchTitle,
    buildShapeTitle,
    buildUnreadableTooltip
};
export default AwSearchBreadcrumbUtils;
