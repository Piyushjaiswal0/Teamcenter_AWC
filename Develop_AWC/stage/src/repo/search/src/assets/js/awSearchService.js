// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 *
 * @module js/awSearchService
 */
import appCtxService from 'js/appCtxService';
import searchFilterSvc from 'js/aw.searchFilter.service';
import soaService from 'soa/kernel/soaService';
import viewModelObjectService from 'js/viewModelObjectService';
import globalSearchService from 'js/globalSearchService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import searchHighlightingService from 'js/Awp0SearchHighlightingService';
import searchSnippetsService from 'js/searchSnippetsService';
import searchCommonUtils from 'js/searchCommonUtils';
import localeService from 'js/localeService';
import analyticsSvc from 'js/analyticsService';
import searchFolderService from 'js/searchFolderService';
import filterPanelService from 'js/filterPanelService';
import AwStateService from 'js/awStateService';
import { getSelectedFiltersMap } from 'js/awSearchSublocationService';
import lovService from 'js/lovService';
import AwPromiseService from 'js/awPromiseService';
import saveSearchUtils from 'js/Awp0SaveSearchUtils';
import AwGroupedFilterPanelUtils from 'js/AwGroupedFilterPanelUtils';
const FULLTEXT_PROVIDER = 'Awp0FullTextSearchProvider';
const ADVANCED_PROVIDER = 'Awp0SavedQuerySearchProvider';
/**
   * wrapper function to call Awp0SearchHighlighting.getHighlightKeywords
   * @param { Object }  data
   */

export let getHighlightKeywords = function( data ) {
    return searchHighlightingService.getHighlightKeywords( data );
};

export let getSearchSnippets = function( data ) {
    return searchSnippetsService.getSearchSnippets( data );
};


/**
  * Validate the revision rule change in the header
  *
  * @param {String} filterStr - the filter string
  * @param lovPageSize - lovPageSize
  * @param {Object} viewModelObj - view Model Object
  * @param {Object} viewProp - viewModel Property
  * @param {String} operationName - operationName
  */
export let getInitialValuesWrapper = function( filterStr, lovPageSize, viewModelObj, viewProp, operationName ) {
    let deferred = AwPromiseService.instance.defer();
    lovService.getInitialValues( filterStr, deferred, viewProp,  operationName, viewModelObj, null,  lovPageSize, '', '', null );
    return deferred.promise.then( ( response ) => {
        //process the response to get lov entries
        return lovService.processLOVEntries( response );
    } ).catch( error => error );
};

/**
   * Validate the revision rule change in the header
   *
   * @function validateLOV
   * @param {Object} data - declViewModel for the validateLOV
   */
export let validateLOV = _.debounce( function( data ) {
    const eventData = {
        revisionRuleName: data.eventData.property.dbValue.propDisplayValue,
        revisionRuleUID: data.eventData.property.dbValue.propInternalValue
    };
    const validatedLOV = [];
    validatedLOV.push( data.eventData.property.dbValue );
    return data.dataProviders.revisionLink.validateLovAction( {
        lovEntries: [ {
            propInternalValue: data.eventData.property.dbValue.propInternalValue,
            propDisplayValue: data.eventData.property.dbValue.propDisplayValue
        } ],
        viewModelProp: data.eventData.property,
        vmo: data.ctx.userSession
    } ).then( function() {
        let analyticsEvtData = globalSearchService.instance.populateAnalyticsParams( 'Awp0RevRule', 'Revision Rule' );
        analyticsSvc.logCommands( analyticsEvtData );
        eventBus.publish( 'aw.revisionRuleChangeEvent', eventData );
    }, function() {
        data.eventData.propScope.prop = data.eventData.propScope.prevSelectedProp;
    } );
}, 300 );

/**
   * Update filter map
   *
   * @function updateFilterMap
   * @param {Object}filterMap - filterMap
   *
   * @return {Object} Updated Filter Map
   */
export let updateFilterMap = function( filterMap ) {
    var cloneOfFilterMap = JSON.parse( JSON.stringify( filterMap ) );
    var prop = {};
    prop = cloneOfFilterMap ? cloneOfFilterMap : prop;
    return prop;
};

/**
   * get Data Provider name for the search( Full Text Search/ Shape Search/ Advanced Search )
   * @function getSearchFolderDataProvider
   * @param {Object}selectedFolders - selectedFolders
   *
   * @return {Object} data provider
   */
export let getSearchFolderDataProvider = function( selectedFolders ) {
    return searchFolderService.getSearchFolderDataProvider( selectedFolders );
};

/**
   * Get Search Folder Criteria
   * @function getSearchDefinitionCriteria
   *
   * @param {Object}selectedFolders - selectedFolder
   * @return {Object} search criteria
   */
export let getSearchDefinitionCriteria = function( selectedFolders ) {
    return searchFolderService.getSearchDefinitionCriteria( selectedFolders );
};
/**
   * Get Search Folder filter map
   * @function getSearchDefinitionFilterMap
   *
   * @param {Object}selectedFolders - selectedFolder
   * @return {Object} search criteria
   */
export let getSearchDefinitionFilterMap = function( selectedFolders ) {
    return searchFolderService.getSearchDefinitionFilterMap( selectedFolders );
};

/**
   * Sets the search folder sort criteria
   *
   * @function getSearchFolderSortCriteria
   * @param {Object}selectedFolders - selectedFolder
   * @param {Object} sortCriteria - the sort criteria
   * @return {Object} the sort criteria
   */
export let getSearchFolderSortCriteria = function( selectedFolders, sortCriteria ) {
    let useProperyNameOnly = false;
    let searchFolderProvider = searchFolderService.getSearchFolderDataProvider( selectedFolders );
    if( searchFolderProvider === 'Awp0SavedQuerySearchProvider' ) {
        useProperyNameOnly = true;
    }
    return awSearchService.getSearchSortCriteria( sortCriteria, useProperyNameOnly );
};

export let getSearchSortCriteria = function( sortCriteria, searchState, usePropertyNameOnly ) {
    let categories = searchState && searchState.categories ? searchState.categories.value : undefined;
    let sublocationCtx = appCtxService.getCtx( 'sublocation' );
    let currentSearchSortCriteria = sublocationCtx && sublocationCtx.sortCriteria ? sublocationCtx.sortCriteria : undefined;
    if( !sortCriteria && currentSearchSortCriteria ) {
        // sort criteria is undefined, usually in the case of List or Image view
        // pull criteria from searchState if set from previous table sorting
        if( !categories || categories && categories.length > 0 ) {
            // There is a filter selection, so not a new search
            return currentSearchSortCriteria;
        } else if( categories && categories.length === 0 ) {
            // new search
            return [];
        }
    } else if( !sortCriteria && !currentSearchSortCriteria ) {
        return [];
    } else if( sortCriteria && sortCriteria.length === 0 ) {
        // sort criteria is empty, usually this is table view without any sorting applied
        return [];
    }

    // Determine the correct search name for this sort criteria
    // table sort action only gives us the property name search requires
    // the full ObjectType.PropertyName for sorting
    if( sortCriteria && !usePropertyNameOnly ) {
        if( categories && categories.length === 0 ) {
            // new search
            return [];
        }
        if( currentSearchSortCriteria && currentSearchSortCriteria.length > 0 && searchState.columnConfig && searchState.columnConfig.columns && searchState.columnConfig.columns.length === 0 ) {
            return currentSearchSortCriteria;
        }
        let updatedSortCriteria = awSearchService.setFieldNameForSortCriteria( sortCriteria, searchState.columnConfig );
        sublocationCtx.sortCriteria = updatedSortCriteria;
        appCtxService.updatePartialCtx( 'sublocation', sublocationCtx );
        return updatedSortCriteria;
    }

    return sortCriteria;
};

export let setFieldNameForSortCriteria = function( sortCriteria, columnConfig ) {
    if( sortCriteria && sortCriteria.length > 0 && columnConfig && columnConfig.columns ) {
        var index = _.findIndex( columnConfig.columns, function( o ) {
            return o.propertyName === sortCriteria[ 0 ].fieldName;
        } );
        if( index > -1 && !searchCommonUtils.checkIfDCPProperty( columnConfig.columns[ index ].propertyName ) ) {
            // retain state
            sortCriteria[ 0 ].fieldName = columnConfig.columns[ index ].associatedTypeName + '.' +
                  columnConfig.columns[ index ].propertyName;
        }
    }
    return sortCriteria;
};

/**
   * getSaveSearchFilterMap
   *
   * @function getSaveSearchFilterMap

   *
   * @return {Object} saveSearchFilterMap
   */
export let getSaveSearchFilterMap = function( searchData ) {
    return searchFilterSvc.convertFilterMapToSavedSearchFilterMap( searchData );
};

/**
   * getEmptyString
   *
   * @function getEmptyString

   *
   * @return {String} Empty string ""
   */
export let getEmptyString = function() {
    return '';
};

/**
   * Returns the internal property name of charted on category if search was executed from saved search Otherwise
   * returns empty string and defaults to existing logic for charting
   *
   * @function getInternalPropertyName

   *
   * @return {String} InternalPropertyName
   */
export let getInternalPropertyName = function( provider ) {
    var emptyCategory = '';
    let searchChartByInURL = AwStateService.instance.params.chartBy;
    let searchChartBySessionInfo = sessionStorage.getItem( 'searchChartBy' );

    // check to see if the saved search or user has overridden the property to highlight
    if( provider === 'Awp0FullTextSearchProvider' ) {
        if( searchChartByInURL && searchChartByInURL.length > 0 ) {
            return searchChartByInURL;
        } else if( searchChartBySessionInfo && searchChartBySessionInfo.length > 0 ) {
            return searchChartBySessionInfo;
        }
    }
    return emptyCategory;
};

/**
   * Returns the criteria for shape search
   *
   * @function getShapeSearchCriteria

   *
   * @return {Object} criteria
   */
export let getShapeSearchCriteria = function( criteria ) {
    const prefix = 'FMSTICKETASSEARCHSTRING__';
    if( criteria && criteria.searchString && _.startsWith( criteria.searchString, prefix ) ) {
        let fmsCriteria = Object.assign( {}, criteria );
        let fmsTicketSubstring = criteria.searchString.substring( prefix.length, criteria.searchString.length );
        fmsCriteria.fmsTicketAsSearchString = fmsTicketSubstring;
        delete fmsCriteria.searchString;
        return fmsCriteria;
    }
    return criteria;
};
export let loadSavedSearchData = function( columnConfigInput, saveColumnConfigData, searchInput ) {
    if ( searchInput.searchCriteria && searchInput.searchCriteria.searchString && searchInput.searchCriteria.searchString.length > 0 ) {
        return awSearchService.loadData( columnConfigInput, saveColumnConfigData, searchInput );
    }
};

export let loadData = function( columnConfigInput, saveColumnConfigData, searchInput ) {
    let soaPath = 'Internal-AWS2-2023-06-Finder';
    let soaName = 'performSearchViewModel5';
    return soaService
        .postUnchecked( soaPath, soaName, {
            columnConfigInput: columnConfigInput,
            saveColumnConfigData: saveColumnConfigData,
            searchInput: searchInput,
            inflateProperties: true,
            noServiceData: false
        } )
        .then(
            function( response ) {
                if( response.searchResultsJSON ) {
                    response.searchResults = JSON.parse( response.searchResultsJSON );
                    delete response.searchResultsJSON;
                }

                // Create view model objects
                response.searchResults = response.searchResults && response.searchResults.objects ? response.searchResults.objects
                    .map( function( vmo ) {
                        return viewModelObjectService.createViewModelObject( vmo.uid, 'EDIT', null, vmo );
                    } ) : [];

                return response;
            } );
};

/**
   * Returns the actual totalFound, as the raw count may included the inaccessible objects.
   * @function getActualTotalFound
   * @param {Object} soaResponse perform search SOA response
   * @param {Object} searchState search state object
   * @return {Integer} actual totalFound
   */
export let getActualTotalFound = function( soaResponse, searchState ) {
    let diffofStartAndEndIdx = soaResponse.cursor ? soaResponse.cursor.endIndex + 1 - soaResponse.cursor.startIndex : 0;
    let singleObjectFoundAndInaccessibleCondition = diffofStartAndEndIdx === soaResponse.totalLoaded && diffofStartAndEndIdx === 0 && soaResponse.cursor.endIndex === -1;
    if( searchState && searchState.provider === 'Awp0FullTextSearchProvider' && ( diffofStartAndEndIdx !== soaResponse.totalLoaded && soaResponse.cursor.endReached || singleObjectFoundAndInaccessibleCondition ) ) {
        soaResponse.totalFound = soaResponse.cursor.startIndex + soaResponse.totalLoaded;
    }
    return soaResponse.totalFound;
};

export let setVNCThreshold = function( preferenceNames, includePreferenceDescriptions, ctx ) {
    soaService.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'getPreferences', {
        preferenceNames: preferenceNames,
        includePreferenceDescriptions: includePreferenceDescriptions
    }, {} ).then( function( result ) {
        if( result && result.response && result.response[ 0 ] && result.response[ 0 ].values && result.response[ 0 ].values.values[ 0 ] ) {
            ctx.vncThreshold = result.response[ 0 ].values.values[ 0 ];
        }
    } );
};

/**
   * getSelectedUids
   *
   * @function getSelectedUids

   * @param {Object} ctx - The application context object
   * @return {array} objectUids - array of object UIDs
   */
export let getSelectedUids = ( ctx ) => {
    return searchCommonUtils.getSelectedUids();
};

/**
   * Get the default page size used for max to load/return.
   *
   * @param {Array|Object} defaultPageSizePreference - default page size from server preferences
   * @returns {Number} The amount of objects to return from a server SOA response.
   */
export let getDefaultPageSize = function( defaultPageSizePreference ) {
    return searchCommonUtils.getDefaultPageSize( defaultPageSizePreference );
};

export let getThresholdState = function( data ) {
    if( data.additionalSearchInfoMap && data.additionalSearchInfoMap.searchExceededThreshold ) {
        let thresholdExceeded = data.additionalSearchInfoMap.searchExceededThreshold[ 0 ];
        if( thresholdExceeded ) {
            return thresholdExceeded;
        }
    }
    return 'false';
};

export let setColumnConfig = function( response ) {
    let newColumnConfig = {
        columnConfigId: '',
        columns: [],
        operationType: ''
    };
    let tempValue = _.clone( response.columnConfig );
    let prefValue = appCtxService.getCtx( 'preferences.AWC_SearchUseUIConfigDefinedDefaultSortInplaceOfRelevance' );
    if( prefValue && prefValue[0] === 'false' ) {
        _.forEach( tempValue.columns, ( val )=>{
            val.sortPriority = 0;
            val.sortDirection = '';
        } );
    }
    newColumnConfig = tempValue;
    return newColumnConfig;
};

/**
   * Returns a single clubbed message with newline as a delimiter provided an array of string messages
   *
   * @function getInfoMessages
   *
   * @return {String} Concatenated string representing multiple info messages separated by newline character
   */
export let getInfoMessages = function( data ) {
    let listOfMessages = '';
    if( data.additionalSearchInfoMap && data.additionalSearchInfoMap.additionalInfoMessages ) {
        listOfMessages = data.additionalSearchInfoMap.additionalInfoMessages;
        if( Array.isArray( listOfMessages ) ) {
            return listOfMessages.join( '\n' );
        }
    }
    return listOfMessages;
};

export const processShapeSearchOutput = ( data, dataCtxNode, searchData ) => {
    if( data.totalFound > 0 ) {
        localeService.getTextPromise( 'SearchMessages', true ).then(
            function( localTextBundle2_ ) {
                let catSS1PartShapeFilter = {
                    defaultFilterValueDisplayCount: 5,
                    displayName: localTextBundle2_.SS1ShapeSearchShapeLabel,
                    internalName: 'SS1partShapeFilter'
                };
                let catSS1SizeShapeFilter = {
                    defaultFilterValueDisplayCount: 5,
                    displayName: localTextBundle2_.SS1ShapeSearchSizeLabel,
                    internalName: 'SS1sizeShapeFilter'
                };
                data.searchFilterCategories.unshift( catSS1SizeShapeFilter );
                data.searchFilterCategories.unshift( catSS1PartShapeFilter );
                data.searchFilterMap.SS1partShapeFilter[ 0 ].searchFilterType = 'ShapeFilter';
                data.searchFilterMap.SS1sizeShapeFilter = [ {
                    searchFilterType: 'ShapeFilter'
                } ];
                awSearchService.processOutput( data, dataCtxNode, searchData );
            } );
    }
};

export const processSavedSearchOutput = ( data, dataCtxNode, searchData ) => {
    searchData.dataProvider = dataCtxNode.dataProviders.contentsDataProvider;
    awSearchService.processOutput( data, dataCtxNode, searchData );
};


export const processOutput = ( data, dataCtxNode, searchData ) => {
    const newSearchData = { ...searchData.value };
    newSearchData.totalFound = data.totalFound;
    newSearchData.totalLoaded = data.totalLoaded;
    newSearchData.endIndex = data.endIndex;
    newSearchData.startIndex = data.cursor.startIndex;
    newSearchData.cursorInfo = data.cursor;
    newSearchData.cursorInfo.totalFound = data.totalFound;
    newSearchData.cursorInfo.totalLoaded = data.totalLoaded;
    newSearchData.cursorInfoString = JSON.stringify( newSearchData.cursorInfo );
    newSearchData.searchFilterCategories = searchCommonUtils.processOutputSearchFilterCategories( newSearchData, data.searchFilterCategories );
    newSearchData.additionalSearchInfoMap = data.additionalSearchInfoMap;
    newSearchData.searchGroupedCategories = data.additionalSearchInfoMap && data.additionalSearchInfoMap.searchGroupedCategories ? data.additionalSearchInfoMap.searchGroupedCategories : [];
    newSearchData.translatedSearchCriteriaForPropertySpecificSearch = data.additionalSearchInfoMap ? data.additionalSearchInfoMap.translatedSearchCriteriaForPropertySpecificSearch : [];
    newSearchData.unpopulatedSearchFilterCategories = data.searchFilterCategoriesUnpopulated;
    newSearchData.searchFilterMap = searchCommonUtils.processOutputFilterMap( newSearchData, data.searchFilterMap );
    newSearchData.objectsGroupedByProperty = data.objectsGroupedByProperty;
    newSearchData.columnConfig = data.columnConfig;
    newSearchData.propDescriptors = data.propDescriptors;
    newSearchData.hasMoreFacetValues = data.additionalSearchInfoMap ? data.additionalSearchInfoMap.categoryHasMoreFacetValuesList : {};
    newSearchData.defaultFilterFieldDisplayCount = data.defaultFilterFieldDisplayCount;
    newSearchData.additionalInfoMessages = awSearchService.getInfoMessages( data );
    newSearchData.thresholdExceeded = awSearchService.getThresholdState( data );
    delete newSearchData.chartProvider;
    newSearchData.bulkFiltersApplied = false;
    newSearchData.recreateChartProvider = newSearchData.thresholdExceeded === 'true' ? 'false' : 'true';
    newSearchData.searchSnippets = awSearchService.getSearchSnippets( data );
    newSearchData.categories = filterPanelService.getCategories3( newSearchData, !newSearchData.hideRange );
    const appliedFiltersMap = getSelectedFiltersMap( newSearchData.categories );
    const appliedFiltersInfo = searchFilterSvc.buildSearchFiltersFromSearchState( appliedFiltersMap );
    newSearchData.appliedFilterMap = appliedFiltersInfo.activeFilterMap;
    newSearchData.categoryInternalToDisplayNameMap = searchCommonUtils.constructCategoryInternalToDisplayNameMap( newSearchData );
    const [ appliedFilters, categories ] = searchCommonUtils.constructAppliedFiltersAndCategoriesWhenEmptyCategoriesAndZeroResults( newSearchData, appliedFiltersInfo.activeFilters );
    newSearchData.groupedCategories = AwGroupedFilterPanelUtils.getGroupedCategories( newSearchData );
    newSearchData.appliedFilters = appliedFilters;
    newSearchData.saveSearchFilterMap = awSearchService.getSaveSearchFilterMap( newSearchData );
    newSearchData.criteria = searchCommonUtils.updateSavedSearchCriteria( newSearchData );
    newSearchData.categoriesForRangeSearches = categories;
    delete newSearchData.isFacetSearch;
    delete newSearchData.searchInProgress;
    newSearchData.categoriesToShowCount = searchCommonUtils.getInitialNumberOfCategoriesToShow();
    newSearchData.regroupColors = false;
    newSearchData.dataProvider = searchData.dataProvider;
    let firstObjectSelected = awSearchService.processSelectionOfFirstObject( data, newSearchData.selectFirstObjectPreference );
    if( firstObjectSelected ) {
        searchHighlightingService.toggleColorFiltering( firstObjectSelected );
        newSearchData.isChartVisible = !firstObjectSelected;
    }
    newSearchData.highlighting = awSearchService.getHighlighting();
    searchData.update( newSearchData );

    newSearchData.colorToggle = awSearchService.getColorToggle();
    searchData.update( newSearchData );
};

export const getHighlighting = () => {
    let preferenceCtx = appCtxService.getCtx( 'preferences' );
    return preferenceCtx.AW_Highlighting === undefined || preferenceCtx.AW_Highlighting && preferenceCtx.AW_Highlighting.length > 0 && preferenceCtx.AW_Highlighting[0] === 'true';
};

export const getColorToggle = () => {
    let preferenceCtx = appCtxService.getCtx( 'preferences' );
    return preferenceCtx.AWC_ColorFiltering === undefined || preferenceCtx.AWC_ColorFiltering && preferenceCtx.AWC_ColorFiltering.length > 0 && preferenceCtx.AWC_ColorFiltering[0] === 'true';
};

/**
   * processInputSearchFilterMap - remove duplicate entries out of the input search filter map
   * @param {Object} searchState - search state atomic data object
   * @returns {Object} inputSearchFilterMap - updated inputSearchFilterMap for SOA.
   */
export const processInputSearchFilterMap = ( searchState ) => {
    let inputSearchFilterMap = searchState.activeFilterMap ? _.cloneDeep( searchState.activeFilterMap ) : {};
    if( searchState.immutableSearchInfo && searchState.immutableSearchInfo.immutableSearchFilterMap &&
          searchState.activeFilterMap && Object.keys( searchState.activeFilterMap ).length > 0 ) {
        for( const [ key, value ] of Object.entries( searchState.activeFilterMap ) ) {
            let searchFilterType;
            let values = [];
            let filterObjectArray = [];
            for( let index = 0; index < value.length; index++ ) {
                searchFilterType = value[ index ].searchFilterType;
                values.push( value[ index ].stringValue );
            }
            let setOfValues = values.length > 0 ? new Set( values ) : new Set();
            let arrayOfValues = setOfValues.size > 0 ? Array.from( setOfValues ) : [];
            for( let index = 0; index < arrayOfValues.length; index++ ) {
                filterObjectArray.push( {
                    searchFilterType: searchFilterType,
                    stringValue: arrayOfValues[ index ]
                } );
            }
            if( filterObjectArray.length > 0 ) {
                inputSearchFilterMap[ key ] = filterObjectArray;
            }
        }
    }
    return inputSearchFilterMap;
};

export const initSearch = ( action, actionName, tableLoaded = true ) => {
    if( tableLoaded ) {
        action[ actionName ]();
    }
};

export const processSelectionOfFirstObject = ( response, selectFirstObjectPreference ) => {
    if( selectFirstObjectPreference && selectFirstObjectPreference.length > 0 ) {
        const selectionPreference = appCtxService.getCtx( 'preferences.' + selectFirstObjectPreference );
        const defaultPageSizePreference = appCtxService.getCtx( 'preferences.AWC_DefaultPageSize' );
        const selectionPreferenceValue = selectionPreference && selectionPreference[ 0 ] ? selectionPreference[ 0 ].toLowerCase() : undefined;
        const pageSizePreferenceValue = defaultPageSizePreference && defaultPageSizePreference[ 0 ] ? parseInt( defaultPageSizePreference[ 0 ] ) : 50;
        if( selectionPreferenceValue && selectionPreferenceValue === 'true' &&
              response.totalLoaded > 0 && response.cursor.endIndex <= pageSizePreferenceValue ||
              response.totalLoaded === 1 ) {
            return true;
        }
    }
    return false;
};

export let setColoringOnVMO = function( groupedObjectsMap, vmo ) {
    let uidVMO = vmo.uid;
    let foundIndex = _.findIndex( groupedObjectsMap[ 0 ], { uid: uidVMO } );
    if( foundIndex > -1 ) {
        vmo.cellDecoratorStyle = _.replace( groupedObjectsMap[ 1 ][ foundIndex ], 'aw-charts-chartColor', 'aw-border-chartColor' );
        vmo.gridDecoratorStyle = groupedObjectsMap[ 1 ][ foundIndex ];
    }
};

/**
   * Returns View model objects after processing the search response
   * @param {Object} response - search SOA response
   * @param {Boolean} showChartColorBars whether to show PWA color bars
   * @returns {ObjectArray} vmos with updated information
   */
export let getVMOsWithColoring = function( response, showChartColorBars ) {
    let vmos = [];
    let objectFromJson;
    let mos;
    let groupedObjectsMap = response.objectsGroupedByProperty.groupedObjectsMap;
    let colorToggle;
    var ctxPreference = appCtxService.getCtx( 'preferences.AWC_ColorFiltering' );
    if( ctxPreference ) {
        colorToggle = ctxPreference[ 0 ] === 'true';
    }
    if( response.searchResults ) {
        //table view
        if( !showChartColorBars || !colorToggle || !groupedObjectsMap || groupedObjectsMap.length < 1 ) {
            vmos = response.searchResults;
        } else {
            _.forEach( response.searchResults, function( vmo ) {
                awSearchService.setColoringOnVMO( groupedObjectsMap, vmo );
                vmos.push( vmo );
            } );
        }
    } else {
        //List view
        objectFromJson = JSON.parse( response.searchResultsJSON );
        mos = objectFromJson.objects;
        if( !showChartColorBars || !colorToggle || !groupedObjectsMap || groupedObjectsMap.length < 1 ) {
            _.forEach( mos, function( mo ) {
                let vmo = viewModelObjectService.createViewModelObject( mo.uid, 'EDIT' );
                vmos.push( vmo );
            } );
        } else {
            _.forEach( mos, function( mo ) {
                let vmo = viewModelObjectService.createViewModelObject( mo.uid, 'EDIT' );
                awSearchService.setColoringOnVMO( groupedObjectsMap, vmo );
                vmos.push( vmo );
            } );
        }
    }
    return vmos;
};

export const populatePropetyPolicy = ( props ) => {
    if( props.subPanelContext && props.subPanelContext.searchState && props.subPanelContext.searchState.policy && props.subPanelContext.searchState.policy.types ) {
        return props.subPanelContext.searchState.policy.types;
    }
    return [ {
        name: 'BusinessObject',
        properties: [ {
            name: 'awp0CellProperties'
        } ]
    } ];
};

/**
   * Retuns the localized threshold message to be displayed in the pwa
   *
   * @function getThresholdDisplayMessage

   *
   * @return {String} ThresholdDisplayMessage
   */
export let getThresholdDisplayMessage = function( data, searchKeyword ) {
    return localeService.getLocalizedTextFromKey( 'UIMessages.thresholdExceeded' ).then( function( result ) {
        return result.format( searchKeyword );
    } );
};
/**
   * @param {subPanelContext} subPanelContext - subPanelContext.
   * @param {dataProvider} provider - dataProvider
   */
export let initSearchListView = function( subPanelContext, provider ) {
    //using subPanelContext for signature is intentional so that we can do more init in this function w/o the need to change the signature.
    if ( subPanelContext.hasOwnProperty( 'commandsAnchor' ) ) {
        provider.json.commandsAnchor = subPanelContext.commandsAnchor;
    }
    return provider;
};

/**
   * Checks the selected revision rule present in rev rule list or not
   * If not then marks the first entry from rev rule list as selected
   * and publish the event revisionRuleChangeEvent.
   *
   * @function setActiveRevRule
   * @param {Object} data - declViewModel for the validateLOV
   */
export let setActiveRevRule = function( data ) {
    let isRevRuleChangeValid = { ...data.isRevRuleChangeValid };
    if( isRevRuleChangeValid && isRevRuleChangeValid.dbValue ) {
        let needToUpdate = false;

        let selectedRevRule = appCtxService.getCtx( 'userSession.props.awp0RevRule' );

        if( selectedRevRule && data && data.lovDataInfo && data.lovDataInfo.lovEntries ) {
            needToUpdate = true;
            let lovs = data.lovDataInfo.lovEntries;
            for( let iVal = 0; iVal < lovs.length; ++iVal ) {
                if( selectedRevRule.dbValue === lovs[iVal].propInternalValue ) {
                    needToUpdate = false;
                    break;
                }
            }
        }


        if( needToUpdate ) {
            selectedRevRule.dbValue = data.lovDataInfo.lovEntries[0].propInternalValue;
            selectedRevRule.uiValue = data.lovDataInfo.lovEntries[0].propDisplayValue;

            appCtxService.updatePartialCtx( 'userSession.props.awp0RevRule', selectedRevRule );

            const eventData = {
                revisionRuleName: data.lovDataInfo.lovEntries[0].propDisplayValue,
                revisionRuleUID: data.lovDataInfo.lovEntries[0].propInternalValue
            };

            let vmprop = data.lovDataInfo.lovEntries[0];
            vmprop.dbValue = data.lovDataInfo.lovEntries[0];
            vmprop.propertyName = selectedRevRule.propertyName;

            data.dataProviders.revisionLink.validateLovAction( {
                lovEntries: [ {
                    propInternalValue: data.lovDataInfo.lovEntries[0].propInternalValue,
                    propDisplayValue: data.lovDataInfo.lovEntries[0].propDisplayValue
                } ],
                viewModelProp:vmprop,
                vmo: data.ctx.userSession
            } ).then( function() {
                let analyticsEvtData = globalSearchService.instance.populateAnalyticsParams( 'Awp0RevRule', 'Revision Rule' );
                analyticsSvc.logCommands( analyticsEvtData );
                eventBus.publish( 'aw.revisionRuleChangeEvent', eventData );
            }, function() {} );
        }
    }

    isRevRuleChangeValid.dbValue = false;
    return isRevRuleChangeValid;
};

/**
   * Set the VMP isRevRuleChangeValid to true
   *
   * @function setIsRevRuleChangeValidToTrue
   * @param {Object} data - declViewModel for the validateLOV
   */
export let setIsRevRuleChangeValidToTrue = function( isRevRuleChangeValid ) {
    isRevRuleChangeValid.dbValue = true;
    return isRevRuleChangeValid;
};

/**
   * getSavedSearchProvider
   * @function getSavedSearchProvider
   * @param {Object}vmo - the view model object
   */
export let getSavedSearchProvider = function( vmo ) {
    if ( vmo.type === 'Awp0FullTextSavedSearch' ) {
        return FULLTEXT_PROVIDER;
    }
    return ADVANCED_PROVIDER;
};

/**
   * getSavedSearchFilterMap
   * @function getSavedSearchFilterMap
   * @param {Object}vmo - the view model object
   */
export let getSavedSearchFilterMap = function( vmo ) {
    let nativeFilterMap = saveSearchUtils.getFilterMap( vmo );
    let searchContext = {
        activeFilterMap: {},
        activeFilters: []
    };
    searchFilterSvc.buildSearchFiltersInt( searchContext, nativeFilterMap );
    return searchContext.activeFilterMap;
};

/**
    * Get the correct sortCriteria constructed for Full Text Search related Contents section for Active Folder.
    * @param {Array} sortCriteria - sort criteria constructed from view model.
    * @param {String} clientScopeURI - client scope.
    * @param {Object} columnConfig - columns returned in SOA response.
    * @returns {Array} The sort criteria containing TypeName.propName for Full Text Search, same as input sort criteria if otherwise.
    */
export let getSavedSearchSortCriteria = function( sortCriteria, clientScopeURI, columnConfig ) {
    if( clientScopeURI === 'Awp0SearchResults' ) {
        if( columnConfig ) {
            var columns = columnConfig.columns;
            if( columns && columns.length > 0 && sortCriteria && sortCriteria.length > 0 ) {
                var index = _.findIndex( columns, function( o ) {
                    return o.propertyName === sortCriteria[ 0 ].fieldName;
                } );
                if( index > -1 ) {
                    sortCriteria[ 0 ].fieldName = columns[ index ].associatedTypeName + '.' + columns[ index ].propertyName;
                }
            }
        }
    }
    return sortCriteria;
};

const awSearchService = {
    validateLOV,
    getSearchFolderDataProvider,
    updateFilterMap,
    getSearchDefinitionCriteria,
    getSearchDefinitionFilterMap,
    getSearchFolderSortCriteria,
    getSearchSortCriteria,
    getSaveSearchFilterMap,
    getEmptyString,
    getInternalPropertyName,
    getShapeSearchCriteria,
    loadData,
    getActualTotalFound,
    setVNCThreshold,
    getSelectedUids,
    getDefaultPageSize,
    getThresholdState,
    setColumnConfig,
    getHighlightKeywords,
    getSearchSnippets,
    setFieldNameForSortCriteria,
    getInfoMessages,
    processShapeSearchOutput,
    processOutput,
    getHighlighting,
    getColorToggle,
    processInputSearchFilterMap,
    initSearchListView,
    initSearch,
    processSelectionOfFirstObject,
    setColoringOnVMO,
    getVMOsWithColoring,
    populatePropetyPolicy,
    getThresholdDisplayMessage,
    setActiveRevRule,
    setIsRevRuleChangeValidToTrue,
    getInitialValuesWrapper,
    loadSavedSearchData,
    getSavedSearchProvider,
    getSavedSearchFilterMap,
    getSavedSearchSortCriteria,
    processSavedSearchOutput
};

export default awSearchService;


