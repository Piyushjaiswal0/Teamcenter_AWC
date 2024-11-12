// Copyright (c) 2021 Siemens

/**
 * @module js/objectNavigationService
 */

import soaService from 'soa/kernel/soaService';
import appCtxService from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import viewModelObjectService from 'js/viewModelObjectService';
import _ from 'lodash';
import AwStateService from 'js/awStateService';
import searchFilterService from 'js/aw.searchFilter.service';
import dms from 'soa/dataManagementService';
import { getEvaluatedId } from 'js/uwUtilService';
import viewModeService from 'js/viewMode.service';
import selectionService from 'js/selection.service';
import { DerivedStateResult } from 'js/derivedContextService';

let exports = {};

var DEFAULT_PAGE_SIZE = 50;

//Navigate context key
var _navigateContext = 'navigate';

export const processOutput = ( data, dataCtxNode, objNavState = {}, subPanelContext ) => {
    const newObjNavState = { ...objNavState };
    // pltable updates the sort information on ctx[<clientScopeURI>.sortCriteria] & hence fetching it from ctx and updating on field
    // once pltable comes with non-singleton solution , this will be replacedobjectNavTreeService
    let sortCriteria = appCtxService.getCtx( _.get( dataCtxNode, 'subPanelContext.provider.clientScopeURI' ) + '.sortCriteria' );
    let { totalFound, searchFilterCategories, searchFilterMap, objectsGroupedByProperty, columnConfig, propDescriptors } = data;
    newObjNavState.totalFound = totalFound;
    newObjNavState.sortCriteria = sortCriteria ? sortCriteria : [];
    newObjNavState.searchResponseInfo = {
        searchFilterCategories: searchFilterCategories,
        searchFilterMap: searchFilterMap,
        objectsGroupedByProperty: objectsGroupedByProperty,
        columnConfig: columnConfig,
        propDescriptors: propDescriptors
    };
    if( subPanelContext && subPanelContext.selectionModel.getSelection() ) {
        const selectionsInSM = subPanelContext.selectionModel.getSelection();
        if( selectionsInSM.length === 1 && data.cursor.startIndex === 0 ) { // requried only for first page
            let existingSearchResults = dataCtxNode.data.searchResults ? dataCtxNode.data.searchResults : [];
            const matched = [ ...existingSearchResults, ...data.searchResults ].filter( obj => {
                return selectionsInSM[ 0 ] === obj.uid;
            } );
            if( matched && matched.length === 0 ) {
                subPanelContext.selectionModel.removeFromSelection( selectionsInSM[ 0 ] );
            }
        }
    }
    if( objNavState.totalFound !== newObjNavState.totalFound || !_.isEqual( objNavState.sortCriteria, newObjNavState.sortCriteria ) ) {
        objNavState.update && objNavState.update( newObjNavState );
    }
    if( objNavState.defaultBaseSelection !== undefined && objNavState.baseSelection === undefined ) {
        newObjNavState.baseSelection = objNavState.defaultBaseSelection;
        objNavState.update && objNavState.update( newObjNavState );
    }
};

//Uids are not references to the actual object
var getRealUid = function( uid ) {
    var realMo = cdm.getObject( uid );
    if( realMo && realMo.props.awp0Target ) {
        return realMo.props.awp0Target.dbValues[ 0 ];
    }
    return uid;
};

export let isTreeMode = () => {
    return exports.isTreeViewMode( viewModeService.getViewMode() );
};

export let sortResults = function( parentUid, searchResults ) {
    //Sort by creation date if the context is set
    var navigationCreateContext = appCtxService.getCtx( _navigateContext + '.' + parentUid );
    if( navigationCreateContext && navigationCreateContext.length > 0 ) {
        var createOrderedObjects = searchResults.filter( function( mo ) {
            var uid = getRealUid( mo.uid );
            return navigationCreateContext.indexOf( uid ) !== -1;
        } ).sort( function( a, b ) {
            //context has oldest objects first
            return navigationCreateContext.indexOf( getRealUid( b.uid ) ) - navigationCreateContext.indexOf( getRealUid( a.uid ) );
        } );

        //Remove any created objects from the search results and
        //keep the original ordering for anything that was not created
        var originalOrderingResults = searchResults.filter( function( mo ) {
            var uid = getRealUid( mo.uid );
            return navigationCreateContext.indexOf( uid ) === -1;
        } );

        /**
         * Note: The current approach for moving newly created objects to the top will NOT
         * completely work for DCP, The model object the client has does not include DCP
         * properties, and the server does not always return all of the newly created objects.
         *
         * Replacing created objects with the objects returned from the server will fix this for
         * the first 50 items, but any newly created DCP object that is not in the first 50
         * folder items will not have DCP properties.
         */
        var serverUidsMap = searchResults.reduce( function( acc, nxt ) {
            var uid = getRealUid( nxt.uid );
            if( !acc[ uid ] ) {
                acc[ uid ] = [];
            }
            acc[ uid ].push( nxt );
            return acc;
        }, {} );
        createOrderedObjects.forEach( function( mo, idx ) {
            //If the server response also contains this object
            if( serverUidsMap[ mo.uid ] ) {
                createOrderedObjects[ idx ] = serverUidsMap[ mo.uid ];
            }
        } );
        //Flatten - can't do within forEach as it messes up indices
        createOrderedObjects = createOrderedObjects.reduce( function( acc, nxt ) {
            if( Array.isArray( nxt ) ) {
                return acc.concat( nxt );
            }
            acc.push( nxt );
            return acc;
        }, [] );

        //LCS-138644 - Above code will duplicate DCP objects in primary workarea, we are just getting rid of duplicates here.
        return _.uniq( createOrderedObjects.concat( originalOrderingResults ) );
    }
    return searchResults;
};

export let loadData = function( searchInput, columnConfigInput, saveColumnConfigData, inflateProperties = true ) {
    return soaService.postUnchecked( 'Internal-AWS2-2023-06-Finder', 'performSearchViewModel5', {
        columnConfigInput: columnConfigInput,
        saveColumnConfigData: saveColumnConfigData,
        searchInput: searchInput,
        inflateProperties: inflateProperties,
        noServiceData: false
    } )
        .then(
            function( response ) {
                if( response.searchResultsJSON ) {
                    response.searchResults = JSON.parse( response.searchResultsJSON );
                    delete response.searchResultsJSON;
                }

                // Create view model objects
                response.searchResults = response.searchResults &&
                    response.searchResults.objects ? response.searchResults.objects
                        .map( function( vmo ) {
                            return viewModelObjectService
                                .createViewModelObject( vmo.uid, 'EDIT', null, vmo );
                        } ) : [];

                // Update IncompleteHeadTailInfo
                if( response.cursor ) {
                    updateVMNodesWithIncompleteHeadTailInfo( response.cursor, response.searchResults );
                }

                // Collect all the prop Descriptors
                var propDescriptors = [];
                _.forEach( response.searchResults, function( vmo ) {
                    _.forOwn( vmo.propertyDescriptors, function( value ) {
                        propDescriptors.push( value );
                    } );
                } );

                // Weed out the duplicate ones from prop descriptors
                response.propDescriptors = _.uniq( propDescriptors, false,
                    function( propDesc ) {
                        return propDesc.name;
                    } );

                return response;
            } );
};

/**
 * @param {Object} cursorInfo - cursor
 * @param {Array|Object} vmNodes - view model objects
 */
function updateVMNodesWithIncompleteHeadTailInfo( cursorInfo, vmNodes ) {
    var headChild = _.head( vmNodes );
    var lastChild = _.last( vmNodes );

    if( !cursorInfo.startReached && headChild ) {
        headChild.incompleteHead = true;
    }

    if( !cursorInfo.endReached && lastChild ) {
        lastChild.incompleteTail = true;
    }
}

/**
 * Get the default page size used for max to load/return.
 *
 * @param {Array|Object} defaultPageSizePreference - default page size from server preferences
 * @returns {Number} The amount of objects to return from a server SOA response.
 */
export let getDefaultPageSize = function( defaultPageSizePreference ) {
    var defaultPageSize = DEFAULT_PAGE_SIZE;

    if( defaultPageSizePreference ) {
        if( _.isArray( defaultPageSizePreference ) ) {
            defaultPageSize = exports.getDefaultPageSize( defaultPageSizePreference[ 0 ] );
        } else if( _.isString( defaultPageSizePreference ) ) {
            defaultPageSize = parseInt( defaultPageSizePreference );
        } else if( _.isNumber( defaultPageSizePreference ) && defaultPageSizePreference > 0 ) {
            defaultPageSize = defaultPageSizePreference;
        }
    }

    return defaultPageSize;
};

/**
 * Sort Criteria is updated
 *
 * @param {Object} dataprovider - the data provider
 */
export let sortCriteriaUpdated = function( data ) {
    //Now reset the navigation create context as sort has been applied and objects should appear in sort order unless newly created.
    if( data && data.parentUid ) {
        appCtxService.updatePartialCtx( _navigateContext + '.' + data.parentUid, [] );
    }
};

/**
 * Returns valid column config object
 *
 * @param {Object} data - the data
 * @param {Object} columnConfig - the columnConfig
 */
export let getValidColumnConfig = function( data, columnConfig ) {
    if( data.columnConfig && data.columnConfig.columnConfigId && data.columnConfig.columns ) {
        return data.columnConfig;
    }
    return columnConfig;
};

export const getSearchContext = function( searchContext = {}, changedParams, baseSelection, selectionModel ) {
    if( !searchContext.criteria ) {
        searchContext.criteria = {};
    }
    searchContext.criteria.objectSet = 'contents.WorkspaceObject';
    searchContext.criteria.parentUid = changedParams.uid;
    searchContext.criteria.returnTargetObjs = 'true';

    var showConfiguredRev = 'true';
    if( appCtxService.ctx.preferences.AWC_display_configured_revs_for_pwa ) {
        showConfiguredRev = appCtxService.ctx.preferences.AWC_display_configured_revs_for_pwa[ 0 ];
    }
    searchContext.criteria.showConfiguredRev = showConfiguredRev;
    if( changedParams.d_uids ) {
        var d_uids = changedParams.d_uids.split( '^' );
        searchContext.criteria.parentUid = d_uids[ d_uids.length - 1 ];
    }

    const currentSelection = selectionModel.getSelection();
    if( currentSelection[ 0 ] !== changedParams.s_uid ) {
        const multipleSelections = currentSelection.length > 1;
        if( changedParams.s_uid && changedParams.s_uid !== searchContext.criteria.parentUid ) {
            let newSelection = changedParams.s_uid.split( ',' )[ 0 ];
            if( isTreeMode() ) {
                const altSel = exports.getAlternateId( newSelection );
                altSel !== currentSelection[ 0 ] && selectionModel.setSelection( altSel );
            } else {
                selectionModel.setSelection( newSelection );
            }
        } else if( !multipleSelections ) {
            //If s_uid is undefined and multiple objects are not selected, clear the selection
            selectionModel.setSelection( [] );
        }
    }

    if( baseSelection && baseSelection.uid !== searchContext.criteria.parentUid ) {
        //Note - This should not result in a SOA call in most cases because
        //AwShowObjectLocationService has been modified to ensure d_uids are also loaded before revealing sublocation
        return dms.loadObjects( [ searchContext.criteria.parentUid ] ).then( function() {
            return searchContext;
        } );
    }
    return Promise.resolve( searchContext );
};

//Utility to create relation info object
const getRelationInfo = function( baseSelection, childSelections ) {
    var navigableProps = [ 'contents' ];
    return childSelections.map( function( mo ) {
        return navigableProps.map( function( prop ) {
            return {
                primaryObject: exports.getParentOfSelection( viewModeService.getViewMode(), baseSelection, [ mo ] ),
                relationObject: null,
                relationType: prop,
                secondaryObject: mo
            };
        } );
    } )
        //Flatten
        .reduce( function( acc, nxt ) {
            return acc.concat( nxt );
        }, [] );
};

//Utility to add newly created objects to context
export const updateNavigateContext = function( uid, newObjects, cutObjects ) {
    var ctx = _navigateContext + '.' + uid;
    var currentCtx = appCtxService.getCtx( ctx ) || [];
    //If new objects were added, add them into the context
    if( newObjects ) {
        var newUids = newObjects.map( function( mo ) {
            return mo.alternateID ? mo.alternateID : mo.uid;
        } );
        currentCtx = currentCtx.concat( newUids.filter( function( x ) {
            return currentCtx.indexOf( x ) === -1;
        } ) );
    }
    //If objects were cut remove them from the context
    if( cutObjects ) {
        var cutUids = cutObjects.map( function( mo ) {
            return mo.alternateID ? mo.alternateID : mo.uid;
        } );
        currentCtx = currentCtx.filter( function( uid ) {
            return cutUids.indexOf( uid ) === -1;
        } );
    }
    appCtxService.updatePartialCtx( ctx, currentCtx );
};

const updatePrimarySelection = ( localBaseSelection, selectionData, selectionModel, objNavStateAtomicDataRef, objNavStateUpdater ) => {
    const selected = selectionData.selected;
    const baseSelection = selectionData.pselected ? selectionData.pselected : localBaseSelection;
    let currentViewMode = viewModeService.getViewMode();
    //If selected is empty revert to baseSelection
    //do not process base selection if there multi selection
    if( baseSelection && selected.length === 1 && baseSelection.uid === selected[ 0 ].uid ) {
        selectionService.updateSelection( selected[ 0 ], baseSelection );
    } else {
        // Tree view mode supports recursive folder behaviour. If root folder is recursively added in child folders
        // then adding item to nth root folder will auto expand the respective level folder and select the added child object.
        if( selected.length === 1 && baseSelection.uid === selected[ 0 ].alternateID ) {
            selectionService.updateSelection( baseSelection, baseSelection );
        } else {
            //Otherwise use as parent selection
            selectionService.updateSelection( selected, exports.getParentOfSelection( currentViewMode, baseSelection, selected ), getRelationInfo( baseSelection, selected ) );
        }
    }
    if( getEvaluatedId( selected ) === getParentUid() && selectionModel.getCurrentSelectedCount() < 2 ) {
        selectionService.updateSelection( [] );
    }

    let pwaSelection;
    let objNavState = objNavStateAtomicDataRef.getAtomicData();
    if( selectionData.source === 'primary' ) {
        pwaSelection = selected;
    } else if( selectionData.source === 'base' && objNavState.pwaSelection ) {
        pwaSelection = [];
    }
    if( !objNavState.baseSelection ) {
        objNavStateUpdater.objNavState( { ...objNavState, pwaSelection, baseSelection } );
    } else {
        objNavStateUpdater.objNavState( { ...objNavState, pwaSelection } );
    }
};

const updateSecondarySelection = function( selectionData ) {
    let { selected, pselected } = selectionData;
    if( selectionData.hasOwnProperty( 'relationInfo' ) ) {
        // Update the current selection with primary workarea selection as parent
        selectionService.updateSelection( selected, pselected, selectionData.relationInfo );
    } else if( selectionData.selected ) {
        if( selected[ 0 ].uid !== pselected.uid ) {
            //Update the current selection to primary workarea selection
            selectionService.updateSelection( selected, pselected, getRelationInfo( pselected, selected ) );
        } else {
            //Revert to the previous selection (parent)
            //Don't create relation between same object
            selectionService.updateSelection( selected, pselected );
        }
    }
};

/**
 * How the object navigation sublocation tracks selection.
 * The PWA selection model will track selection.
 *
 * @param {Any} input - The object that needs to be tracked.
 * @returns {String} - Returns uid string
 */
const objNavSelectionTracker = ( input ) => {
    if( typeof input === 'string' ) {
        return input;
    }
    return input.alternateID ? input.alternateID : input.uid;
};

export const getParentUid = () => {
    var d_uids = AwStateService.instance.params.d_uids ? AwStateService.instance.params.d_uids.split( '^' ) : [];
    return d_uids[ 0 ] ? d_uids[ d_uids.length - 1 ] : AwStateService.instance.params.uid;
};

export const getSubPanelContextData = ( provider, baseSelection, selectionModel, objNavStateAtomicDataRef, objNavStateUpdater ) => {
    // Build up filter map and array
    let searchContext = searchFilterService.buildSearchFilters( provider.context );
    let changedParams = AwStateService.instance.params;
    // Put the searchCriteria property on the state into the params
    if( changedParams.hasOwnProperty( 'searchCriteria' ) ) {
        if( !searchContext.criteria ) {
            searchContext.criteria = {};
        }
        searchContext.criteria.searchString = changedParams.searchCriteria ? changedParams.searchCriteria : '';
    }
    return getSearchContext( searchContext, changedParams, baseSelection, selectionModel ).then( function( updatedSearchContext ) {
        provider.searchContext = updatedSearchContext;
        provider.baseSelection = !isTreeMode() ? viewModelObjectService.createViewModelObject( updatedSearchContext.criteria.parentUid ) : baseSelection;
        initBaseSelection( provider.baseSelection, objNavStateAtomicDataRef, objNavStateUpdater );
        return provider;
    } );
};

export const setDefaultContextChangedVal = () => {
    return {
        objNavContextChanged: false
    };
};

export const getUpdatedSearchContextOnStateChange = async( originalParams, localSubPanelContext, baseSelection, selectionModel, objNavStateAtomicDataRef, objNavStateUpdater ) => {
    let oldStateContext = null;
    let newStateContext = null;
    let isResetRequired = false;
    let changeInParams = {};
    let changedParams = AwStateService.instance.params;
    for( var i in changedParams ) {
        if( changedParams[ i ] !== originalParams[ i ] ) {
            changeInParams[ i ] = changedParams[ i ];
        }
    }
    if( !_.isEmpty( changeInParams ) && changeInParams.hasOwnProperty( 'uid' ) ) {
        return;
    }
    if( !_.isEmpty( changeInParams ) && changeInParams.hasOwnProperty( 'd_uids' ) && !isTreeMode() ) {
        isResetRequired = true;
    }
    if( localSubPanelContext.searchContext !== null ) {
        oldStateContext = _.cloneDeep( localSubPanelContext.searchContext );
        return getSearchContext( localSubPanelContext.searchContext, changedParams, baseSelection, selectionModel ).then( function( updatedSearchContext ) {
            newStateContext = _.cloneDeep( updatedSearchContext );
            // return the changed search context for objectNav to re-render
            let hasContextChanged = !_.isEqual( oldStateContext, newStateContext );
            if( hasContextChanged && isResetRequired ) {
                localSubPanelContext.searchContext = newStateContext;
                localSubPanelContext.baseSelection = !isTreeMode() ? viewModelObjectService.createViewModelObject( newStateContext.criteria.parentUid ) : baseSelection;
                let objNavState = objNavStateAtomicDataRef.getAtomicData();
                let newBaseSelection = localSubPanelContext.baseSelection;
                if( !objNavState.baseSelection || objNavState.baseSelection.uid !== newBaseSelection.uid ) {
                    objNavStateUpdater.objNavState( { ...objNavState, baseSelection: newBaseSelection } );
                    selectionService.updateSelection( [ newBaseSelection ], newBaseSelection );
                }
                return {
                    localSubPanelContext: localSubPanelContext,
                    objNavContextChanged: true,
                    changeInParams: changedParams
                };
            }
            return {
                localSubPanelContext: localSubPanelContext,
                objNavContextChanged: false,
                changeInParams: changedParams
            };
        } );
    }
    return {
        localSubPanelContext: localSubPanelContext,
        objNavContextChanged: false,
        changeInParams: changedParams
    };
};

export const resetObjNavDP = ( objNavSelectionModel ) => {
    const dp = objNavSelectionModel.getDpListener();
    if( dp ) {
        dp.resetDataProvider();
    }
};

export const handleCdmRelatedModifiedEvent = ( eventData, baseSelection, dataprovider, selectionModel ) => {
    var matches = eventData.relatedModified.filter( function( mo ) {
        return mo.uid === baseSelection.uid;
    } );
    if( !eventData.refreshLocationFlag && matches.length ) {
        dataprovider.resetDataProvider();
        //Update the list in the navigate context
        updateNavigateContext( baseSelection.uid, eventData.createdObjects, eventData.childObjects );

        //If new objects were created
        if( eventData.createdObjects ) {
            //If the panel isn't pinned update the selection
            if( !eventData.isPinnedFlag ) {
                //Select the newly created objects
                selectionModel.addToSelection( eventData.createdObjects );
            }
        }
    }
};

//Setup the navigate context and clear it when sublocation is removed
export let registerContext = () => {
    appCtxService.registerCtx( _navigateContext, {} );
};

export let deRegisterContext = () => {
    appCtxService.unRegisterCtx( _navigateContext );
};

export const getObjectNavContext = ( vmDef, props ) => {
    return [ new DerivedStateResult( {
        ctxParameters: [],
        additionalParameters: [ props.parentSubPanelContext, props.subPanelContext, props.objNavState ],
        compute: () => {
            return {
                ...props.parentSubPanelContext,
                ...props.subPanelContext,
                objNavState: props.objNavState
            };
        }
    } ) ];
};

export const handleSelectionChange = ( localBaseSelection, localSelectionData, selectionModel, objNavStateAtomicDataRef, objNavStateUpdater ) => {
    if( !_.isEmpty( localSelectionData ) ) {
        if( localSelectionData.source === 'primary' || localSelectionData.source === 'base' ) {
            updatePrimarySelection( localBaseSelection, localSelectionData, selectionModel, objNavStateAtomicDataRef, objNavStateUpdater );
        } else if( localSelectionData.source === 'secondary' ) {
            updateSecondarySelection( localSelectionData );
        }
    }
};

const setBaseSelection = ( objNavStateAtomicDataRef, objNavStateUpdater, baseSelection ) => {
    let objNavState = objNavStateAtomicDataRef.getAtomicData();
    objNavStateUpdater.objNavState( { ...objNavState, baseSelection } );
};

export const initBaseSelection = ( baseSelection, objNavStateAtomicDataRef, objNavStateUpdater ) => {
    if( !AwStateService.instance.params.s_uid || AwStateService.instance.params.s_uid === AwStateService.instance.params.uid ) {
        setBaseSelection( objNavStateAtomicDataRef, objNavStateUpdater, baseSelection );
    } else if( AwStateService.instance.params.d_uids && AwStateService.instance.params.s_uid && AwStateService.instance.params.d_uids === AwStateService.instance.params.s_uid ) {
        setBaseSelection( objNavStateAtomicDataRef, objNavStateUpdater, baseSelection );
    } else {
        let objNavState = objNavStateAtomicDataRef.getAtomicData();
        objNavStateUpdater.objNavState( { ...objNavState, defaultBaseSelection: baseSelection } );
    }
};

export const handleRevisionRuleChange = () => {
    AwStateService.instance.reload();
};

/**
 * Utility to get set selection object based on view mode
 *
 * @param {Object} viewMode - current view mode
 * @return {Boolean} Returns Boolean based on view mode
 */
export let isTreeViewMode = function( viewMode ) {
    return viewMode === 'TreeView' || viewMode === 'TreeSummaryView';
};

export const getAlternateId = ( uid ) => {
    const navigationParam = AwStateService.instance.params;
    let nodeAlternateID = [];

    let d_uidsForNodeSelection = navigationParam.d_uids && navigationParam.d_uids !== navigationParam.s_uid ? navigationParam.d_uids.split( '^' ) : [];
    d_uidsForNodeSelection = _.reverse( d_uidsForNodeSelection ).join();

    //In other modes navigation to some folder sets folder uid to d_uids and s_uid.
    //As we are getting the s_uid in d_uidsForNodeSelection already, this indexOf condition is added.
    if( uid && d_uidsForNodeSelection.indexOf( uid ) !== 0 && uid !== navigationParam.uid ) {
        nodeAlternateID.push( uid );
    }

    if( d_uidsForNodeSelection !== '' ) {
        nodeAlternateID.push( d_uidsForNodeSelection );
    }

    //When view mode is toggled from root node then s_uid and uid both are same.
    //This condition is added to prevent the addition of same uid again.
    if( navigationParam.uid ) {
        nodeAlternateID.push( navigationParam.uid );
    }

    return _.join( nodeAlternateID, ',' );
};

/**
 * Utility to get parent model object of selection
 *
 * @param {Object} viewMode - current view mode
 * @param {Object} baseSelection - base selection node
 * @param {Object} selection - base selection node
 * @return {Object} Returns parent model object.
 */
export let getParentOfSelection = function( viewMode, baseSelection, selection ) {
    if( exports.isTreeViewMode( viewMode ) ) {
        var uidArray;
        var selectedNodeAlternateId = selection[ selection.length - 1 ].alternateID;
        if( selectedNodeAlternateId ) {
            uidArray = selectedNodeAlternateId.split( ',' );
        }
        var uid = uidArray && uidArray.length > 1 ? uidArray[ 1 ] : selection[ 0 ].uid;
        return cdm.getObject( uid );
    }
    return baseSelection;
};

export let getFocusObjUid = function( createdObjUid ) {
    let focusObjUid;
    if( createdObjUid ) {
        focusObjUid = createdObjUid;
    } else {
        // LCS-824725 - Focus to selected object in case it is not in the first page
        const s_uid = appCtxService.getCtx( 'state.params.s_uid' );
        if( s_uid ) {
            focusObjUid = s_uid;
        }
    }

    return focusObjUid;
};

exports = {
    isTreeViewMode,
    getAlternateId,
    getParentOfSelection,
    sortResults,
    loadData,
    getParentUid,
    setDefaultContextChangedVal,
    getUpdatedSearchContextOnStateChange,
    resetObjNavDP,
    isTreeMode,
    getDefaultPageSize,
    sortCriteriaUpdated,
    getValidColumnConfig,
    getSubPanelContextData,
    handleCdmRelatedModifiedEvent,
    registerContext,
    deRegisterContext,
    processOutput,
    getObjectNavContext,
    updateNavigateContext,
    handleSelectionChange,
    initBaseSelection,
    handleRevisionRuleChange,
    getFocusObjUid
};
export default exports;
