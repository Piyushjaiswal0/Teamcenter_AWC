// Copyright (c) 2021 Siemens

import AwCommandSubPanel from 'viewmodel/AwCommandSubPanelViewModel';
import localeSvc from 'js/localeService';
import { DerivedStateResult } from 'js/derivedContextService';

const newTabTitle = localeSvc.getLoadedTextFromKey( 'awAddDirectiveMessages.newTabTitle' );
const paletteTabTitle = localeSvc.getLoadedTextFromKey( 'awAddDirectiveMessages.paletteTabTitle' );
const searchText = localeSvc.getLoadedTextFromKey( 'UIMessages.searchText' );
const results = localeSvc.getLoadedTextFromKey( 'UIMessages.results' );
const filterTabTitle = localeSvc.getLoadedTextFromKey( 'awAddDirectiveMessages.filterTabTitle' );

export const awAddRenderFunction = ( {
    targetObject,
    relationMap,
    typeFilter,
    searchFilter,
    subPanelContext,
    addPanelState,
    searchState,
    loadSubTypes,
    typeOverrideId,
    autoSelectOnUniqueType,
    maxRecentCount,
    editHandler,
    selectionMode,
    preferredType,
    isIncludeSubTypes,
    isCustomDatasetAction,
    hideRelation,
    includeTypes,
    formObject,
    ctxMin: { AddTabModelsClass, SearchFilterTabModelsClass, RelationMapClass },
    activeState,
    xrtState,
    projectState
} ) => {
    let relationMapIn = relationMap;
    let addPanelTabModels = AddTabModelsClass[ 0 ];
    let searchFilterTabModels = SearchFilterTabModelsClass[ 0 ];

    let loadSubTypesIn =  loadSubTypes === false || loadSubTypes === 'false'  ? 'false' : 'true';
    let typeOverrideIdIn = !typeOverrideId ? '' : typeOverrideId;

    if( !relationMap ) {
        relationMapIn = RelationMapClass[ 0 ];
    }

    let subPanelContextIn = { ...subPanelContext };
    // delete searchState from subPanelContext which is conflicted with the searchState passed as separate prop
    delete subPanelContextIn.searchState;

    let defaultPolicy = {
        types: [ {
            name: 'Item',
            properties: [ {
                name: 'revision_list'
            } ]
        } ]
    };

    let context = {
        addPanelTabModels: addPanelTabModels,
        searchFilterTabModels: searchFilterTabModels,
        targetObject: targetObject,
        typeFilter: typeFilter,
        searchFilter: searchFilter,
        preferredType: preferredType,
        loadSubTypes: loadSubTypesIn,
        includeTypes: includeTypes,
        shouldClipboardObjsBeSelectedOnLoad : true,
        typeOverrideId: typeOverrideIdIn,
        isIncludeSubTypes: isIncludeSubTypes,
        isCustomDatasetAction,
        hideRelation,
        autoSelectOnUniqueType: autoSelectOnUniqueType,
        maxRecentCount: maxRecentCount,
        addPanelState,
        searchState,
        activeState,
        xrtState,
        projectState,
        relationMap: relationMapIn,
        selectionMode: selectionMode,
        formObject: formObject,
        policy: defaultPolicy,
        editHandler: editHandler,
        ...subPanelContextIn
    };
    return <AwCommandSubPanel panelId='AddObjectPrimarySub' subPanelContext={context}>
    </AwCommandSubPanel>;
};

const _buildTabModel = ( tabKey, pageId, viewName, tabTitle, priority, isSelected ) => {
    return {
        tabKey,
        pageId,
        view: viewName,
        name: tabTitle,
        recreatePanel: true,
        priority,
        selectedTab: isSelected
    };
};
/**
 * createComponentMemo that uses derived state
 *
 * @param {Object} vmDef View model
 * @param {Object} prop Current properties
 * @param {Object} data Current data
 * @returns {[DerivedStateResult]} Derived state configurations
 */
export const getAddTabModels = ( vmDef, prop, data ) => {
    return [ new DerivedStateResult( {
        ctxParameters: [ data.ctxParameters ],
        additionalParameters: [ prop.visibleTabs, prop.defaultTab, data.optionalTabs ],
        compute: ( renderContext, visibleTabs, defaultTab, optionalTabs ) => {
            let newTabKey = 'new';
            let paletteTabKey = 'palette';
            let searchTabKey = 'search';
            let classificationTabKey = 'classification';

            let visibleAddPanelTabKeys = visibleTabs ? visibleTabs.split( ',' ) : [ newTabKey, paletteTabKey, searchTabKey, classificationTabKey ];
            let optionalTabsData = optionalTabs ? optionalTabs : [];
            let addPanelTabModels = [];
            let defaultTabKey = visibleAddPanelTabKeys.filter( function( tab ) {
                return tab === defaultTab;
            } )[ 0 ];

            if( visibleAddPanelTabKeys.indexOf( newTabKey ) > -1 ) {
                if( defaultTabKey === newTabKey ) {
                    addPanelTabModels.push( _buildTabModel( newTabKey, newTabKey, 'NewTabPageSub', newTabTitle, 0, true ) );
                } else {
                    addPanelTabModels.push( _buildTabModel( newTabKey, newTabKey, 'NewTabPageSub', newTabTitle, 0 ) );
                }
            }

            if( visibleAddPanelTabKeys.indexOf( paletteTabKey ) > -1 ) {
                if( defaultTabKey === paletteTabKey ) {
                    addPanelTabModels.push( _buildTabModel( paletteTabKey, paletteTabKey, 'PaletteTabPageSub', paletteTabTitle, 1, true ) );
                } else {
                    addPanelTabModels.push( _buildTabModel( paletteTabKey, paletteTabKey, 'PaletteTabPageSub', paletteTabTitle, 1 ) );
                }
            }

            if( visibleAddPanelTabKeys.indexOf( searchTabKey ) > -1 ) {
                if( defaultTabKey === searchTabKey ) {
                    addPanelTabModels.push( _buildTabModel( searchTabKey, searchTabKey, 'SearchTabPageSub', searchText, 2, true ) );
                } else {
                    addPanelTabModels.push( _buildTabModel( searchTabKey, searchTabKey, 'SearchTabPageSub', searchText, 2 ) );
                }
            }

            for( let optionalTabData of optionalTabsData ) {
                if( optionalTabData.visibleWhen && visibleAddPanelTabKeys.indexOf( optionalTabData.key ) > -1 ) {
                    if( defaultTabKey === optionalTabData.key ) {
                        addPanelTabModels.push( _buildTabModel( optionalTabData.key, optionalTabData.key, optionalTabData.view, optionalTabData.name, optionalTabData.priority, true ) );
                    } else {
                        addPanelTabModels.push( _buildTabModel( optionalTabData.key, optionalTabData.key, optionalTabData.view, optionalTabData.name, optionalTabData.priority ) );
                    }
                }
            }

            return addPanelTabModels;
        }
    } ) ];
};

/**
 * createComponentMemo that uses derived state
 *
 * @param {Object} vmDef View model
 * @param {Object} prop Current properties
 * @returns {[DerivedStateResult]} Derived state configurations
 */
export const getSearchFilterTabModels = ( vmDef, prop ) => {
    return [ new DerivedStateResult( {
        ctxParameters: [],
        additionalParameters: [ prop.searchState ],
        compute: ( renderContext, searchState ) => {
            let resultsTabKey = 'results';
            let filtersTabKey = 'filters';
            let visibleSearchFilterPanelTabKeys = searchState && searchState.hideFilters ? [ resultsTabKey ] : [ resultsTabKey, filtersTabKey ];
            let searchFilterTabModels = [];
            if( visibleSearchFilterPanelTabKeys.indexOf( resultsTabKey ) > -1 ) {
                searchFilterTabModels.push( _buildTabModel( resultsTabKey, resultsTabKey, undefined, results, 0 ) );
            }

            if( visibleSearchFilterPanelTabKeys.indexOf( filtersTabKey ) > -1 ) {
                searchFilterTabModels.push( _buildTabModel( filtersTabKey, filtersTabKey, undefined, filterTabTitle, 1 ) );
            }

            return searchFilterTabModels;
        }
    } ) ];
};

/**
 * createComponentMemo that uses derived state
 *
 * @param {Object} vmDef View model
 * @param {Object} prop Current properties
 * @returns {[DerivedStateResult]} Derived state configurations
 */
export const getRelationMap = ( vmDef, prop ) => {
    return [ new DerivedStateResult( {
        ctxParameters: [],
        additionalParameters: [ prop.typeFilter, prop.includeTypes, prop.relations ],
        compute: ( renderContext, typeFilter, includeTypes, relations ) => {
            const relationsIn = relations ? relations.split( ',' ) : [];
            return [ ...( typeFilter || '' ).split( ',' ), ...( includeTypes || '' ).split( ',' ) ].reduce( ( acc, nxt ) => {
                acc[ nxt ] = relationsIn;
                acc[ `${nxt}Revision` ] = relationsIn;
                return acc;
            }, {} );
        }
    } ) ];
};
