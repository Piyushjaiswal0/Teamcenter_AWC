// Copyright (c) 2021 Siemens

/**
 * @module js/objectNavigationTreeService
 */
import eventBus from 'js/eventBus';
import AwPromiseService from 'js/awPromiseService';
import awTableSvc from 'js/awTableService';
import soaSvc from 'soa/kernel/soaService';
import appCtxSvc from 'js/appCtxService';
import viewModelObjectService from 'js/viewModelObjectService';
import treeTableDataService from 'js/treeTableDataService';
import cdm from 'soa/kernel/clientDataModel';
import awColumnSvc from 'js/awColumnService';
import awIconService from 'js/awIconService';
import objectNavigationService from 'js/objectNavigationService';
import AwStateService from 'js/awStateService';
import assert from 'assert';
import _ from 'lodash';
import { drop } from 'js/awDragAndDropService';
import awTableTreeSvc from 'js/published/splmTablePublishedTreeService';

import 'js/tcViewModelObjectService';

let exports = {};
var _firstColumnPropertyName = null;
var rootFolderTotalFound = null;
var autoExpandNodeUid = null;

var policyIOverride = {
    types: [ {
        name: 'WorkspaceObject',
        properties: [ {
            name: 'object_name'
        } ]
    }, {
        name: 'Folder',
        properties: [ {
            name: 'awp0HasChildren'
        } ]
    } ]
};

/**
 * @param {Object} uwDataProvider - An Object (usually a UwDataProvider) on the DeclViewModel on the $scope this
 *            action function is invoked from.
 * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
 *
 * <pre>
 * {
 *     columnInfos : {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 * }
 * </pre>
 */
export let loadTreeTableColumns = function( uwDataProvider ) {
    var deferred = AwPromiseService.instance.defer();

    var awColumnInfos = [ {
        name: 'object_name',
        displayName: '...',
        typeName: 'WorkspaceObject',
        width: 400,
        isTreeNavigation: true,
        enableColumnMoving: false,
        enableColumnResizing: false
    } ];

    awColumnSvc.createColumnInfo( awColumnInfos );

    deferred.resolve( {
        columnConfig: {
            columns: awColumnInfos
        }
    } );

    return deferred.promise;
};

/**
 * Create Callback function.
 *
 * @return {Object} A Object consisting of callback function.
 */
function getDataForUpdateColumnPropsAndNodeIconURLs() {
    var updateColumnPropsCallback = {};

    updateColumnPropsCallback.callUpdateColumnPropsAndNodeIconURLsFunction = function( propColumns, allChildNodes, contextKey, response ) {
        updateColumnPropsAndNodeIconURLs( propColumns, allChildNodes );
        return response.output.columnConfig;
    };

    return updateColumnPropsCallback;
}

/**
 * Function to update tree table columns
 * @param {Object} data Contains data
 * @param {Object} dataProvider Contains data provider for the tree table
 */
export let updateObjNavTreeTableColumns = function( data, dataProvider ) {
    let output = {};
    if( dataProvider && data.newColumnConfig ) {
        var propColumns = data.newColumnConfig.columns;
        updateColumnPropsAndNodeIconURLs( propColumns, dataProvider.getViewModelCollection().getLoadedViewModelObjects() );
        data.newColumnConfig.columns = propColumns;
        dataProvider.columnConfig = data.newColumnConfig;
    }
    output.newColumnConfig = data.newColumnConfig;
    output.columnConfig = dataProvider.columnConfig;
    return output;
};

/**
 * Function to update tree table columns props and icon urls
 * @param {Object} propColumns Contains prop columns
 * @param {Object} childNodes Contains tree nodes
 */
function updateColumnPropsAndNodeIconURLs( propColumns, childNodes ) {
    _.forEach( propColumns, function( col ) {
        if( !col.typeName && col.associatedTypeName ) {
            col.typeName = col.associatedTypeName;
        }
    } );
    propColumns[ 0 ].enableColumnMoving = false;
    _firstColumnPropertyName = propColumns[ 0 ].propertyName;

    _.forEach( childNodes, function( childNode ) {
        childNode.iconURL = awIconService.getTypeIconFileUrl( childNode );
        treeTableDataService.updateVMODisplayName( childNode, _firstColumnPropertyName );
    } );
}

/**
 * Makes sure the displayName on the ViewModelTreeNode is the same as the Column 0 ViewModelProperty
 * @param {Object} eventData Contains viewModelObjects and modifiedObjects
 */
export let updateDisplayNames = function( eventData ) {
    //update the display name for all ViewModelObjects which should be viewModelTreeNodes
    if( eventData && eventData.viewModelObjects ) {
        _.forEach( eventData.viewModelObjects, function( updatedVMO ) {
            treeTableDataService.updateVMODisplayName( updatedVMO, _firstColumnPropertyName );
        } );
    }

    if( eventData && eventData.modifiedObjects && eventData.vmc ) {
        var loadedVMObjects = eventData.vmc.loadedVMObjects;
        _.forEach( eventData.modifiedObjects, function( modifiedObject ) {
            var modifiedVMOs = loadedVMObjects.filter( function( vmo ) { return vmo.id === modifiedObject.uid; } );
            _.forEach( modifiedVMOs, function( modifiedVMO ) {
                treeTableDataService.updateVMODisplayName( modifiedVMO, _firstColumnPropertyName );
            } );
        } );
    }
};

/**
 * Process tree table properties for initial load.
 *
 * @param {Object} vmNodes loadedVMObjects for processing properties on initial load.
 * @param {Object} declViewModel data object.
 * @param {Object} uwDataProvider data provider object.
 * @param {Object} context context object required for SOA call.
 * @param {String} contextKey contextKey string for context retrieval.
 * @return {Promise} promise A Promise containing the PropertyLoadResult.
 */
export let loadTreeTablePropertiesOnInitialLoad = function( vmNodes, declViewModel, uwDataProvider, context, contextKey ) {
    var updateColumnPropsCallback = getDataForUpdateColumnPropsAndNodeIconURLs();
    return AwPromiseService.instance.resolve( treeTableDataService.loadTreeTablePropertiesOnInitialLoad( vmNodes, declViewModel, uwDataProvider, context, contextKey, updateColumnPropsCallback ) );
};

/**
 * Get a page of row column data for a tree-table.
 *
 * Note: This method assumes there is a single argument object being passed to it and that this object has the
 * following property(ies) defined in it.
 * <P>
 * {PropertyLoadInput} propertyLoadInput - (found within the 'arguments' property passed to this function) The
 * PropertyLoadInput contains an array of PropertyLoadRequest objects this action function is invoked to
 * resolve.
 *
 * @return {Promise} A Promise resolved with a 'PropertyLoadResult' object containing the details of the result.
 */
export let loadTreeTableProperties = function() {
    arguments[ 0 ].updateColumnPropsCallback = getDataForUpdateColumnPropsAndNodeIconURLs();
    return AwPromiseService.instance.resolve( treeTableDataService.loadTreeTableProperties( arguments[ 0 ] ) );
};

export let loadTreeTableData = function( searchInput, columnConfigInput, saveColumnConfigData, treeLoadInput ) {
    assert( searchInput, 'Missing search input' );
    assert( treeLoadInput, 'Missing tree load input' );

    treeLoadInput.displayMode = 'Tree';

    return AwPromiseService.instance.resolve( _buildTreeTableStructure( searchInput, columnConfigInput, saveColumnConfigData, treeLoadInput ) );
};

/**
 * @param {SearchInput} searchInput - search input for SOA
 * @param {ColumnConfigInput} columnConfigInput - column config for SOA
 * @param {SaveColumnConfigData} saveColumnConfigData - save column config for SOA
 * @param {TreeLoadInput} treeLoadInput - tree load input
 * @return {Promise} A Promise resolved with a 'TreeLoadResult' object containing the details of the result.
 */
function _buildTreeTableStructure( searchInput, columnConfigInput, saveColumnConfigData, treeLoadInput ) {
    var target = {};
    var soaSearchInput = searchInput;
    var parentNode = treeLoadInput.parentNode;
    var treeLoadOutput = {};

    if( !parentNode.isExpanded ) {
        target.uid = AwStateService.instance.params.uid;
    } else {
        target.uid = parentNode.uid;
        target.type = parentNode.type;
    }

    treeLoadInput.parentElement = target.levelNdx === -1 ? 'AAAAAAAAAAAAAA' : target.uid;
    treeLoadInput.displayMode = 'Tree';
    soaSearchInput.searchCriteria.parentUid = treeLoadInput.parentElement;

    return getTableSummary( soaSearchInput, columnConfigInput, saveColumnConfigData ).then( function( response ) {
        var vmNodes = [];
        if( !parentNode.isExpanded ) {
            var emptyFolderOpened = _.isEmpty( response.searchResults ) && response.totalFound === 0;

            var rootPathNodes = _buildRootPath( cdm.getObject( target.uid ), !emptyFolderOpened, response );

            if( rootPathNodes.length > 0 ) {
                treeLoadOutput.rootPathNodes = rootPathNodes;
                treeLoadOutput.newTopNode = _.first( treeLoadOutput.rootPathNodes );
            }
        }

        if( !emptyFolderOpened ) {
            if( response.searchResultsJSON ) {
                var searchResults = JSON.parse( response.searchResultsJSON );
                if( searchResults ) {
                    for( var x = 0; x < searchResults.objects.length; ++x ) {
                        var uid = searchResults.objects[ x ].uid;
                        var obj = cdm.getObject( uid );
                        if( obj ) {
                            vmNodes.push( obj );
                        }
                    }
                }
            }
        } else {
            vmNodes.push( _.first( rootPathNodes ) );
        }

        var treeLoadResult = exports.createTreeLoadResult( response, treeLoadInput, vmNodes );

        _.forEach( treeLoadOutput, function( value, name ) {
            if( !_.isUndefined( value ) ) {
                treeLoadResult[ name ] = value;
            }
        } );

        return AwPromiseService.instance.resolve( {
            treeLoadResult: treeLoadResult
        } );
    } );
}

/**
 * Function
 *
 * @param {*} parentModelObj parentOccurrence of getOccurrences response
 * @param {*} addExtraTopNodeInRootPathHierarchy true if showTopNode is true
 * @param {*} response SOA response
 * @returns{*} rootPath Hierarchy for given parentModelObj
 */
function _buildRootPath( parentModelObj, addExtraTopNodeInRootPathHierarchy, response ) {
    /**
     * Determine the path to the 'root' occurrence IModelObject starting at the immediate 'parent' (t_uid)
     * object.
     */
    var rootPathNodes = [];
    var rootPathObjects = [];
    var pathModelObject = parentModelObj;

    if( pathModelObject ) {
        rootPathObjects.push( pathModelObject );

        if( addExtraTopNodeInRootPathHierarchy ) {
            rootPathObjects.push( pathModelObject );
        }
    }

    /**
     * Determine new 'top' node by walking back from bottom-to-top of the rootPathObjects and creating nodes to
     * wrap them.
     */
    var nextLevelNdx = -1;

    for( var ndx = rootPathObjects.length - 1; ndx >= 0; ndx-- ) {
        var currNode = createVMNodeUsingObjectInfo( rootPathObjects[ ndx ], 0, nextLevelNdx++ );
        var rootPathNodesLength = rootPathObjects.length - 1;
        /**
         * Note: We mark all necessary 'parent' path nodes as 'placeholders' so that we can find them later and
         * fill them out as needed (when they come into view)
         */
        var isPlaceholder = !( ndx === rootPathNodesLength || addExtraTopNodeInRootPathHierarchy && ndx === rootPathNodesLength - 1 );
        currNode.alternateID = getUniqueIdForEachNode( currNode );
        currNode.isExpanded = true;
        currNode.isPlaceholder = isPlaceholder;
        currNode.totalFound = response.totalFound;
        if( response.totalFound > 0 ) {
            currNode.isLeaf = false;
        }
        if( ndx === 0 && response.cursor ) {
            currNode.cursorObject = response.cursor;
        }
        if( currNode.alternateID === AwStateService.instance.params.s_uid ) {
            appCtxSvc.updatePartialCtx( 'search.totalFound', currNode.totalFound );
        }
        rootPathNodes.push( currNode );
    }

    /**
     * Breadcrumb reflects the count which is fetched from ctx entry 'search.totalFound'. For reflecting this count, we are storing the
     * totalFound of each expanded parent node in its child nodes. When we select and unselect a tree node, we are not getting any selected
     * node in $scope.updatePrimarySelection code block. As when no node is selected then the selection is shown as root folder.
     * We have to update the selection to root folder and totalFound count along with it. For showing the same we are adding this variable.
     */
    rootFolderTotalFound = _.last( rootPathNodes ).totalFound;

    return rootPathNodes;
}

/**
 * @param {SearchInput} searchInput - search input for SOA
 * @param {ColumnConfigInput} columnConfigInput - column config for SOA
 * @param {SaveColumnConfigData} saveColumnConfigData - save column config for SOA
 * @param {TreeLoadInput} treeLoadInput - tree load input
 * @return {Response} response A response object containing the details of the result.
 */
function getTableSummary( searchInput, columnConfigInput, saveColumnConfigData ) {
    return soaSvc.postUnchecked( 'Internal-AWS2-2023-06-Finder', 'performSearchViewModel5', {
        columnConfigInput: columnConfigInput,
        saveColumnConfigData: saveColumnConfigData,
        searchInput: searchInput,
        inflateProperties: false,
        noServiceData: false
    }, policyIOverride )
        .then(
            function( response ) {
                if( response.searchResultsJSON ) {
                    response.searchResults = JSON.parse( response.searchResultsJSON );
                }

                // Create view model objects
                response.searchResults = response.searchResults &&
                    response.searchResults.objects ? response.searchResults.objects
                        .map( function( vmo ) {
                            return viewModelObjectService
                                .createViewModelObject( vmo.uid, 'EDIT', null, vmo );
                        } ) : [];

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

                //Sort by creation date if the context is set
                response.searchResults = objectNavigationService.sortResults(
                    searchInput.searchCriteria.parentUid, response.searchResults );
                return response;
            } );
}

/**
 * Get created object. Return ItemRev if the creation type is Item.
 *
 * @param {Object} response the response of createRelateAndSubmitObjects SOA call
 * @param {Object} treeLoadInput the response of createRelateAndSubmitObjects SOA call
 * @param {Object} vmNodes objects to process ViewModelTreeNode
 * @return {TreeLoadResult} treeLoadResult A treeLoadResult object containing the details of the result.
 */
export let createTreeLoadResult = function( response, treeLoadInput, vmNodes ) {
    var endReachedVar = response.totalLoaded + treeLoadInput.startChildNdx === response.totalFound;

    var tempCursorObject = {
        endReached: endReachedVar,
        startReached: true
    };
    if( response.cursor ) {
        tempCursorObject = response.cursor;
    }
    treeLoadInput.parentNode.totalFound = response.totalFound;
    var treeLoadResult = processProviderResponse( treeLoadInput, vmNodes, true, tempCursorObject.endReached );

    treeLoadResult.parentNode.cursorObject = tempCursorObject;
    treeLoadResult.searchResults = response.searchResults;
    treeLoadResult.totalLoaded = response.totalLoaded;
    treeLoadResult.searchFilterCategories = response.searchFilterCategories;
    treeLoadResult.objectsGroupedByProperty = response.objectsGroupedByProperty;
    treeLoadResult.searchFilterMap = response.searchFilterMap;

    return treeLoadResult;
};

/**
 * @param {TreeLoadInput} treeLoadInput - treeLoadInput Parameters for the operation.
 * @param {Object} searchResults - searchResults object processed from SOA call.
 * @param {Boolean} startReached - parameter for the operation.
 * @param {Boolean} endReached - parameter for the operation.
 * @return {TreeLoadResult} treeLoadResult A treeLoadResult object containing the details of the result.
 */
function processProviderResponse( treeLoadInput, searchResults, startReached, endReached ) {
    // This is the "root" node of the tree or the node that was selected for expansion
    var parentNode = treeLoadInput.parentNode;

    var levelNdx = parentNode.levelNdx + 1;

    var vmNodes = [];
    var vmNode;
    for( var childNdx = 0; childNdx < searchResults.length; childNdx++ ) {
        var object = searchResults[ childNdx ];

        if( !awTableSvc.isViewModelTreeNode( object ) ) {
            vmNode = createVMNodeUsingObjectInfo( object, childNdx, levelNdx );

            if( vmNode ) {
                vmNode.alternateID = getUniqueIdForEachNode( vmNode, parentNode );
                vmNode.parentTotalFound = parentNode.totalFound;
                if( vmNode.alternateID === AwStateService.instance.params.s_uid ) {
                    appCtxSvc.updatePartialCtx( 'search.totalFound', vmNode.parentTotalFound );
                }

                /* autoExpandNodeUid field is populated in variable and during node creation it is utilized for expansion of relatedModified node.
                This case will be invoked when item or BO is added to empty of non-expanded folder */
                if( autoExpandNodeUid && vmNode.alternateID === autoExpandNodeUid ) {
                    vmNode.isExpanded = true;
                    eventBus.publish( 'objNavTree.plTable.toggleTreeNode', vmNode );
                    // Destroying the variable upon expansion of relatedModified node
                    autoExpandNodeUid = null;
                }
            }
        } else {
            vmNode = object;
        }
        vmNodes.push( vmNode );
    }

    // Third Paramter is for a simple vs ??? tree
    return awTableTreeSvc.buildTreeLoadResult( treeLoadInput, vmNodes, true, startReached,
        endReached, treeLoadInput.parentNode );
}

/**
 * @param {Object} obj - object for creating view model tree node.
 * @param {int} childNdx - int value for child index.
 * @param {int} levelNdx - int value for level index.
 * @return {Object} vmNode A view model node object containing the details of the node.
 */
function createVMNodeUsingObjectInfo( obj, childNdx, levelNdx ) {
    var displayName;
    var objUid = obj.uid;
    var objType = obj.type;
    var hasChildren = containChildren( obj.props );

    if( obj.props ) {
        if( obj.props.object_name ) {
            displayName = obj.props.object_name.uiValues[ 0 ];
        }
    }

    // get Icon for node
    var iconURL = awIconService.getTypeIconFileUrl( obj );

    var vmNode = awTableTreeSvc
        .createViewModelTreeNode( objUid, objType, displayName, levelNdx, childNdx, iconURL );

    vmNode.isLeaf = !hasChildren;
    //commands evaluation might depend on modelType of VMO.
    vmNode.modelType = obj.modelType ? obj.modelType : undefined;

    return vmNode;
}

/**
 * Tree/Table widget require the rendered objects to be unique. Currently expansion state is maintained in local storage and is based
 * on "id" property of the nodes which is nothing but "uid" property of an element. When duplicate folder nodes exist in tree table,
 * the uid of these nodes happen to get repeated in viewModelCollection. This causes infinite loop when a folder
 * within the same folder node is expanded and causes a browser hung state. Also, the expansion state is lost. It
 * is important from user perspective that we maintain expansion state. Also, it is required that if a 'n'th instance of a
 * duplicate occuring node appears in the tree and is expanded , the child nodes get associated to the 'nth' occurence of the node itself
 * and not the first instance of the node in the tree.  In order to achieve this ,
 * the SWF alternateID attribute which sits on 'ViewModelTreeNode' and 'ViewModelObject' object is leveraged. The 'alternateID' is
 * generated by evaluating the parent node alternateID of a particular node. The comma separated uid string
 * is stored on alternateID on vmNode and is always unique whatever be the expansion state of the tree . The comma separated uid path
 * being stored in alternateID also ensures that when an object is selected and in all but tree mode and when the mode is changed to tree ,
 * with the suid, duid, uid combination in the state params the exact node in the tree is selected .
 *
 * @param {ViewModelTreeNode} vmNode - the tree node object for which unique id needs to be evaluated
 * @param {ViewModelTreeNode} parentNode - the parent node of vmNode for evaluating unique id
 * @return {String} uidString - returns comma separated uid for every node . uids are made of hierarchy for each node
 */
var getUniqueIdForEachNode = function( vmNode, parentNode ) {
    if( parentNode ) {
        return parentNode.alternateID ? vmNode.uid + ',' + parentNode.alternateID : vmNode.uid + ',' + parentNode.uid;
    }
    return vmNode.uid;
};

/**
 * @param {Object} props - object for getting contain children value.
 * @return {Boolean} Returns boolean.
 */
function containChildren( props ) {
    if( props && props.awp0HasChildren && props.awp0HasChildren.dbValues[ 0 ] === '1' ) {
        return true;
    }
    return false;
}

/**
 * Get the default page size used for max to load/return.
 *
 * @param {Array|Object} defaultPageSizePreference - default page size from server preferences
 * @returns {Number} The amount of objects to return from a server SOA response.
 */
export let getDefaultPageSize = function( defaultPageSizePreference ) {
    return objectNavigationService.getDefaultPageSize( defaultPageSizePreference );
};

/**
 * Function to update d_uids param upon selection
 *
 * @param {Object} viewMode - current view mode
 * @param {Object} selection - base selection node
 * @paramm {Object} existingParamObj - existing param object to be updated
 */
export let updateDUidParamForTreeSelection = function( viewMode, selection, existingParamObj = {} ) {
    if( objectNavigationService.isTreeViewMode( viewMode ) ) {
        var newDuid = '';
        var navigationParam = {};

        var selectedNode = selection[ selection.length - 1 ];
        var selectedNodeAlternateId = selectedNode.alternateID;
        var uidArray = selectedNodeAlternateId.split( ',' );
        var topNodeUid = uidArray[ uidArray.length - 1 ];

        if( uidArray[ uidArray.length - 1 ] ) {
            uidArray.splice( uidArray.length - 1, 1 );
        }

        if( uidArray[ 0 ] ) {
            uidArray.splice( 0, 1 );
        }

        if( uidArray.length > 0 ) {
            uidArray = _.reverse( uidArray );

            _.forEach( uidArray, function( d_uid ) {
                newDuid = newDuid === '' ? newDuid + d_uid : newDuid + '^' + d_uid;
            } );

            navigationParam.d_uids = newDuid;
        } else {
            navigationParam.d_uids = '';
        }
        Object.assign( existingParamObj, {
            d_uids: navigationParam.d_uids
        } );

        appCtxSvc.updatePartialCtx( 'search.criteria.parentUid', topNodeUid );
        appCtxSvc.updatePartialCtx( 'search.totalFound', selectedNode.parentTotalFound ? selectedNode.parentTotalFound : selectedNode.totalFound );
        // AwStateService.instance.go( '.', navigationParam, { location: 'replace' } );
    }
    return existingParamObj;
};

/**
 * Updates the parent hierarchy based on params.
 *
 * @param {Object} viewMode - current view mode
 * @param {Object} selectedNode - base selection node
 */
export let updateParentHierarchyInURL = function( viewMode, selectedNode, existingParamObj = {} ) {
    if( objectNavigationService.isTreeViewMode( viewMode ) ) {
        var navigationParam = AwStateService.instance.params;
        appCtxSvc.updatePartialCtx( 'search.criteria.parentUid', selectedNode.uid );
        var d_uids = navigationParam.d_uids ? navigationParam.d_uids.split( '^' ) : [];
        var d_uid = d_uids[ 0 ] ? d_uids[ d_uids.length - 1 ] : navigationParam.uid;
        // If uid parameter was set to base selection then clear selection and set selection to root node
        if( navigationParam.s_uid && d_uid && navigationParam.s_uid === d_uid ) {
            navigationParam.d_uids = '';
            navigationParam.s_uid = selectedNode.uid;
            Object.assign( existingParamObj, {
                d_uids: navigationParam.d_uids,
                s_uid: navigationParam.s_uid
            } );
            appCtxSvc.updatePartialCtx( 'search.totalFound', rootFolderTotalFound );
            //   AwStateService.instance.go( '.', navigationParam, { location: 'replace' } );
        }
    }
    return existingParamObj;
};

/**
 *  Function to update the selected node by mapping uid to alternateID and alternateID to uid based on view mode.

 *  @param {Object} viewMode - current view mode
 *  @return {Object} Returns object of selected uid  alternateID depending on view mode
 */
export let getSelectedObjectsOnViewModeChange = function( isTreeMode, currentSelections = [] ) {
    var mSelectedNodes = [];
    //When we navigate inside a folder d_uid and s_uid are same, no selection is set in the selection model
    //Consider the s_uid as the current selection
    const selections = currentSelections.length ? currentSelections : [ AwStateService.instance.params.s_uid ];
    if( isTreeMode ) {
        selections.forEach( ( selection = '' ) => {
            mSelectedNodes.push( objectNavigationService.getAlternateId( selection.split( ',' )[ 0 ] ) );
        } );
    } else {
        selections.forEach( ( selection = '' ) => {
            mSelectedNodes.push( selection.split( ',' )[ 0 ] );
        } );
    }
    return {
        mSelectedNodes
    };
};

/**
 * Function to update alternateID attribute on related modified objects.
 *
 * @param {Object} data - related modified event data
 * @return {Object} Returns Object with added alternateID attribute
 */
export let updateAlternateIDForRelatedModifiedObjects = function( data ) {
    if( data.childObjects ) {
        var alternateID = data.childObjects[ data.childObjects.length - 1 ].alternateID ? data.childObjects[ data.childObjects.length - 1 ].alternateID.split( ',' ) : [];
        if( alternateID.length > 1 ) {
            data.relatedModified[ 0 ].alternateID = alternateID.slice( 1, alternateID.length ).join();
        }
    } else {
        if( data.relatedModified && data.relatedModified[ data.relatedModified.length - 1 ] && data.createdObjects ) {
            _.forEach( data.createdObjects, function( createdObject ) {
                createdObject.alternateID = getUniqueIdForEachNode( createdObject, data.relatedModified[ data.relatedModified.length - 1 ] );
            } );

            /* Adding item to empty folder or non-expanded folder, adds the newly added item to selection but as the folder is not in expanded
            state, selection is not visible. This causes the breadcrumb to break. For fixing this issue, autoExpandNodeUid variable is populated
            and during node creation it is utilized for expansion of relatedModified node. */
            if( !data.relatedModified[ data.relatedModified.length - 1 ].isExpanded ) {
                if( data.relatedModified[ data.relatedModified.length - 1 ].alternateID ) {
                    autoExpandNodeUid = data.relatedModified[ data.relatedModified.length - 1 ].alternateID;
                } else {
                    autoExpandNodeUid = data.relatedModified[ data.relatedModified.length - 1 ].uid;
                }
            }
        }
    }

    return data;
};

/**
 * Function to remove alternateID attribute from related modified, created and child objects.
 *
 * @param {Object} data - related modified event data
 */
export let removeAlternateIdFromRelatedModified = function( data ) {
    _.forEach( data.relatedModified, function( relatedModified ) {
        if( !awTableSvc.isViewModelTreeNode( relatedModified ) ) {
            delete relatedModified.alternateID;
        }
    } );

    _.forEach( data.createdObjects, function( createdObject ) {
        if( !awTableSvc.isViewModelTreeNode( createdObject ) ) {
            delete createdObject.alternateID;
        }
    } );

    _.forEach( data.childObjects, function( childObject ) {
        if( !awTableSvc.isViewModelTreeNode( childObject ) ) {
            delete childObject.alternateID;
        }
    } );
};

export const processDropOnTree = ( dragAndDropParams ) => {
    const { dispatch } = dragAndDropParams.declViewModel || {};
    if( dispatch ) {
        dispatch( { path: 'data.dropOnTreeNode', value: true } );
    }
    drop( dragAndDropParams );
};

export const handleSelectionForObjNavTree = ( objNavSelectionModel, isTreeMode ) => {
    let onViewModeChangeInfo = getSelectedObjectsOnViewModeChange( isTreeMode, objNavSelectionModel.getSelection() );
    if( objNavSelectionModel && onViewModeChangeInfo.mSelectedNodes && onViewModeChangeInfo.mSelectedNodes.length > 0 ) {
        if( isTreeMode ) {
            setSelectionForModifiedObjects( objNavSelectionModel, onViewModeChangeInfo.mSelectedNodes );
        } else {
            objNavSelectionModel.setSelection( onViewModeChangeInfo.mSelectedNodes );
        }
    }
};

export const updateTreeSelectionInfo = ( { selectionModel, selected, rootNode } = {}, objNavState, baseSelection = {} ) => {
    if( selectionModel && selected && objNavState ) {
        const selection = selectionModel.getSelection();
        //In case of trees the selection is notififed on initialize as well - which is blank as data is yet to be populated
        //Do not update the blank state as it causes the selection to be reset
        if( selection.length === selected.length ) {
            let newState = { ...objNavState };
            // Deselect the only selected node in tree ; selection should switch to root node
            if( selected.length === 0 ) {
                newState.totalFound = rootNode && rootNode.totalFound;
            } else {
                //If selection is same as base selection - do not update
                const isBaseObjSelected = selection.length === 1 && selected[ 0 ].uid === baseSelection.uid;
                newState.totalFound = isBaseObjSelected ? selected[ 0 ].totalFound : selected[ 0 ].parentTotalFound;
            }
            if( objNavState.totalFound !== newState.totalFound ) {
                objNavState.update( newState );
            }
        }
    }
};

const setSelectionForModifiedObjects = ( selModel, selected ) => {
    selModel.setSelection( selected );
    //Revisit me: This extra setSelection call is to prevent the focus action call
    //In AW5.2 - There was an oversight which updated the selction model with the same info twice
    // This redundant selection set call prevented the focus action call thus everthing worked fine
    //--------------------------------------------------------------------------------
    //If we dont add extra redundant call - the tree node expansion is messed up
    //There are few more issues as well with objNav tree - it needs to looked into it holistically
    selModel.setSelection( selected );
};

export const handleCdmEventForTree = ( eventData, dataprovider, selectionModel, { dropOnTreeNode, dispatch } = {} ) => {
    var relatedModified = eventData.relatedModified[ eventData.relatedModified.length - 1 ];
    if( relatedModified.modelType && relatedModified.modelType.typeHierarchyArray && relatedModified.modelType.typeHierarchyArray.indexOf( 'Folder' ) > -1 ) {
        // On Add, paste operation 'cdm.relatedModified' event is published with 'eventData.createdObjects' consisting of newly created model
        // objects. On cut operation 'eventData.childObjects' consists of ViewModelTreeNodes on which cut operation is performed.
        // Creation of alternateID for these created / cut object retains selection.
        updateAlternateIDForRelatedModifiedObjects( eventData );

        objectNavigationService.updateNavigateContext( relatedModified.alternateID, eventData.createdObjects, eventData.childObjects );

        //On drop operation, select the node on which drop was performed
        if( dropOnTreeNode && eventData.relatedModified ) {
            setSelectionForModifiedObjects( selectionModel, eventData.relatedModified );
        } else if( eventData.createdObjects && !eventData.isPinnedFlag ) {
            //If new objects were created and If the panel isn't pinned update the selection
            // Select the newly created objects
            setSelectionForModifiedObjects( selectionModel, eventData.createdObjects );
        } else if( eventData.childObjects ) {
            setSelectionForModifiedObjects( selectionModel, eventData.relatedModified );
        }

        // After BO or Item addition in tree view, alternateId attribute is created on relatedModified or createdObjects which is used for selection.
        // Removing alternateId attribute after selection from objects as selection model is updated with created node alternateId.
        removeAlternateIdFromRelatedModified( eventData );
        dataprovider.resetDataProvider();
        //Reset dropOnTreeNode
        return false;
    }
};

exports = {
    loadTreeTableColumns,
    updateObjNavTreeTableColumns,
    updateDisplayNames,
    loadTreeTablePropertiesOnInitialLoad,
    loadTreeTableProperties,
    loadTreeTableData,
    createTreeLoadResult,
    getDefaultPageSize,
    updateDUidParamForTreeSelection,
    updateParentHierarchyInURL,
    getSelectedObjectsOnViewModeChange,
    updateAlternateIDForRelatedModifiedObjects,
    removeAlternateIdFromRelatedModified,
    processDropOnTree,
    handleSelectionForObjNavTree,
    updateTreeSelectionInfo,
    handleCdmEventForTree
};
export default exports;
