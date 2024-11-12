// Copyright (c) 2022 Siemens

/**
 * @module js/showProjectTeamTableTree
 */
import { getBaseUrlPath } from 'app';
import awTableTreeSvc from 'js/published/splmTablePublishedTreeService';
import tableStateService from 'js/awTableStateService';
import localeSvc from 'js/localeService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import { svgString as nonPrivUserIconUrl } from 'image/cmdSetNonPrivilegedUser16.svg';
import { svgString as privUserIconUrl } from 'image/cmdSetPrivilegedUser16.svg';
import { svgString as projectTeamIconUrl } from 'image/cmdSetProjectTeamAdmin16.svg';

var exports = {};

var vmoIdList = [];
var nodeToBeSelected = [];

/**
 * This function is to mark the list of updated node as selected in dataProvider.
 * @param {*} dataProvider
 */
export let markNodeSelectedInProvider = function( dataProvider ) {
    if( nodeToBeSelected.length > 0 ) {
        dataProvider.selectionModel.addToSelection( nodeToBeSelected );
        nodeToBeSelected = [];
    }
};

/**
 * When the tree reloads - it has list of uids which are updated and this function will mark that node.selected=true and remove te node from the updatedVmolist
 * @param {} vmNode
 */
export let setNodeToBeSelected = function( vmNode ) {
    if( vmoIdList.includes( vmNode.uid ) ) {
        vmNode.selected = true;
        nodeToBeSelected.push( vmNode );
        _.remove( vmoIdList, function( n ) { return n === vmNode.uid; } );
    }
};

/**
 * This function is to reload the table and get the list of updated node uids to mark them selected.
 * @param {*} eventData
 */
export let reloadAndSelectProjectTeamTreeNode = function( eventData ) {
    vmoIdList = [];
    nodeToBeSelected = [];
    if( eventData.isStatusChange ) {
        let nodeArray = eventData.nodes;
        vmoIdList = nodeArray.map( node =>node.uid );
    } else if( eventData.nodes && eventData.nodes.length > 0 ) {
        var addedObjects = eventData.nodes[0];
        var projectId = addedObjects.project.uid;

        for( var i = 0; i < addedObjects.groups.length; i++ ) {
            vmoIdList.push( projectId + '_' + addedObjects.groups[i].uid );
        }
        for( var i = 0; i < addedObjects.groupRoles.length; i++ ) {
            vmoIdList.push( projectId + '_' + addedObjects.groupRoles[i].tcGroup.uid + '_' + addedObjects.groupRoles[i].tcRole.uid + '_' + addedObjects.groupRoles[i].isRemovable.toString() );
        }
        for( var i = 0; i < addedObjects.gms.length; i++ ) {
            vmoIdList.push( addedObjects.gms[i].uid );
        }
        if( addedObjects.userParentToSelect ) {
            for( var i = 0; i < addedObjects.userParentToSelect.length; i++ ) {
            //Getting the parent node of newly added user node to mark it as selected
            // _true is because the node is removable
                vmoIdList.push( projectId + '_' + addedObjects.userParentToSelect[i] + '_true' );
            }
        }
    }
    eventBus.publish( 'ProjectTeamTreeGrid.plTable.reload' );
};

export let nodeExpandRequested = function( node, data ) {
    return node._expandRequested || data.nodeExpansionRequested && data.nodeExpansionRequested.some( expandedNode => expandedNode.uid === node.uid );
};

/**
 * This function is to get the filterCriteria
 *
 * @param {*} treeLoadInput treeLoadInput
 * @param {*} columnProvider columnProvider
 * @returns filterCriteria
 */
export let getInputFilterCriteria = function( treeLoadInput, columnProvider, data ) {
    var filterCriteria = columnProvider.columnFilters;
    var rootNode = treeLoadInput.parentNode;

    // Do not honor the filter criteria when the expanding the node manually
    var isNodeExpanded = exports.nodeExpandRequested(  rootNode, data );
    if( isNodeExpanded ) {
        filterCriteria = [];
        //clear the filter criteria
    }
    return filterCriteria;
};

/**
 * This function to prepare the input parent Node / expanded node for the getProjectTeam SOA.
 *
 * @param {*} treeLoadInput treeLoadInput
 * @param {*} data data
 * @returns
 */
export let getInputParentNode = function( treeLoadInput, data ) {
    var filterCriteria = data.columnProviders.exampleColumnProvider.columnFilters;
    var isFiltering = filterCriteria && filterCriteria.length !== 0;
    var rootNode = treeLoadInput.parentNode;
    var isRemovable = rootNode.isRemovable;
    if( rootNode.uid === 'top' ) {
        isRemovable = false;
    }
    var group = '';
    var role = '';
    // In case of filtering - parent node is empty
    // node is being expanded irrespective of filtering is applied or not - parent node will be set
    // IsNodeExpanded - when filter is applied name contains "infodba" and you collapse & expand the node.The node return with the large data with no filter criteria honoured(more than 50).
    // When you scroll down to the page it should pass on the parent node information considering the node is expanding even though the node._expandRequested is false.
    var isNodeExpanded = exports.nodeExpandRequested( rootNode, data );
    if( !isFiltering || isFiltering && isNodeExpanded  ) {
        if( rootNode.tcGroup ) {
            group = {
                type: rootNode.tcGroup.type,
                uid: rootNode.tcGroup.uid
            };
        }

        if( rootNode.tcRole ) {
            role = {
                type: rootNode.tcRole.type,
                uid: rootNode.tcRole.uid
            };
        }
    }
    /*if( rootNode.type === 'Role' && rootNode.levelNdx === 0 ) {
        return {
            tcGroup: '',
            role: role
        };
    }*/
    return {
        tcGroup: group,
        tcRole: role,
        isRemovable:isRemovable
    };
};

/**
 * This function is to create a Group node or Role node based on the inputs.It processes the groupOrRole structure.
 * groupsAndRoles[{groupOrRole}]
 *
 * @param {*} groupRoleNode parentNode or expanded node which can be group or role
 * @param {*} type type of node - Group / Role
 * @param {*} isRemovable - is removable
 * @param {*} levelNdx - level index
 * @param {*} childNdx - child index
 * @param {*} isExpanded - is expanded
 * @returns vmNode
 */
export let processGroupOrRoleNode = function( subPanelContext, groupRoleNode, type, levelNdx, childNdx, isExpanded ) {
    var displayName = '';
    var objUid = '';
    var iconURL = '';
    var vmNode = '';
    var vmNodeType = '';
    //groupRoleNode.tcGroup.type will either be 'Group' or 'ProjectTeam' in case the node is group node or role node
    if( groupRoleNode.tcRole.type === 'unknownType' && groupRoleNode.tcGroup.type !== 'unknownType' ) {
        displayName = groupRoleNode.tcGroup.props.object_string.uiValues[ 0 ];
        objUid = subPanelContext.selected.uid + '_' + groupRoleNode.tcGroup.uid;
        iconURL = getBaseUrlPath() + '/image/typeProjectTeam48.svg';
        vmNodeType = 'Group';
    } else if( groupRoleNode.tcRole.type === 'Role' ) {
        displayName = groupRoleNode.tcGroup.props.object_string.uiValues[ 0 ] + '.' + groupRoleNode.tcRole.props.role_name.uiValues[ 0 ];
        //isRemovable to know give unique id to direct role - dba.DBA or the role is under the dba group - 'dba.DBA'
        objUid = subPanelContext.selected.uid + '_' + groupRoleNode.tcGroup.uid + '_' + groupRoleNode.tcRole.uid + '_' + groupRoleNode.isRemovable.toString();
        iconURL = getBaseUrlPath() + '/image/typeRole48.svg';
        vmNodeType = 'Role';
    }
    if( objUid !== '' ) {
        vmNode = awTableTreeSvc.createViewModelTreeNode( objUid, vmNodeType, displayName, levelNdx, childNdx, iconURL );

        vmNode.isLeaf = false;
        vmNode.tcGroup = groupRoleNode.tcGroup;
        vmNode.tcRole = groupRoleNode.tcRole;
        vmNode.isRemovable = groupRoleNode.isRemovable;
        vmNode.props = {};
        vmNode.props.status = {
            value: '',
            uiValue: ''
        };
        vmNode.isExpanded = isExpanded;
        vmNode.props.type = {
            value: type,
            uiValue: type
        };
        vmNode.props.object_name = {};
        setNodeToBeSelected( vmNode );
    }
    return vmNode;
};

/**
 * This function is to process a groupsAndRoles SOA response structure.
 *
 * @param {*} groupsAndRoles groupsAndRoles - single hierarchy structure
 * @param {*} treeLoadInput - treeLoadInput
 * @param {*} serviceData - serviceData
 * @param {*} childNdx - child Index
 * @param {*} levelNdx - level Index
 * @param {*} isFiltering - filtering should be honored or not
 * @param {*} parentNode - parent node
 * @param {*} vmNodes - nodes to be updated
 */
export let processGroupsAndRoles = function( subPanelContext, groupsAndRoles, treeLoadInput, serviceData, childNdx, levelNdx, isFiltering, parentNode, vmNodes ) {
    var node = groupsAndRoles;
    var groupRoleNode = node.groupOrRole;
    var childMembers = node.childMembers ? node.childMembers : [];
    var childGroupsAndRoles = node.childGroupsOrRoles ? node.childGroupsOrRoles : [];
    var newLevelNdx = levelNdx;

    // This should be executed only when parentNode/expandNode != groupRoleNode came from SOA response
    // In other words, do not execute if block if the SOA input parent Node is same as SOA response groupRoleNode.
    if( parentNode.uid === 'top' || !( parentNode.tcGroup.uid === groupRoleNode.tcGroup.uid && parentNode.tcRole.uid === groupRoleNode.tcRole.uid ) ) {   // tHis should be executed when we are loading the first level tree node structure & during filtering
        // and while processing expanding subgroup/role node
        var isExpanded = Boolean( isFiltering && ( childGroupsAndRoles.length > 0 || childMembers.length > 0 ) );
        var firstLevelNode = exports.processGroupOrRoleNode( subPanelContext, groupRoleNode, node.type,  newLevelNdx, childNdx, isExpanded );
        if( firstLevelNode ) {
            vmNodes.push( firstLevelNode );
            if( isFiltering ) {
                // in case of filtering - after processing the parentNode that is groupOrrole node, child nodes should be added to next level
                newLevelNdx += 1;
            }
        }
    }
    //Process childMembers structure
    if( childMembers.length > 0 ) {
        for ( var childMemberNdx = 0; childMemberNdx < childMembers.length; childMemberNdx++ ) {
            var childMember = childMembers[ childMemberNdx ];
            var displayName = childMember.member.props.user.uiValues[ 0 ];
            var objTypeUiValue = childMember.type;
            var objTypeDbValue = 'User';
            var objUid = childMember.member.uid;
            var groupMemberStatus = childMember.member.props.status.uiValues[0];
            var userUid = childMember.member.props.user.dbValues[ 0 ];
            var userStatus = serviceData.modelObjects[ userUid ].props.status.uiValues[ 0 ];
            var iconURL = ''; // if iconUrl is empty then it will set icon from svg string.
            var svgStr = ''; // TypeIcons does not support lazy loading of images
            if( userStatus === '1' ) // User is inactive
            {
                iconURL = getBaseUrlPath() + '/image/indicatorInactiveUser16.svg';
            } else if( groupMemberStatus === 'True' ) // groupMember is inactive
            {
                iconURL = getBaseUrlPath() + '/image/indicatorInactiveUserInGroup16.svg';
            } else {
                if( childMember.status === 0 ) // non-privileged user
                {
                    svgStr = nonPrivUserIconUrl;
                } else if( childMember.status === 1 ) // Privileged User
                {
                    svgStr = privUserIconUrl;
                } else if( childMember.status === 2 ) // Project Team Administrator
                {
                    svgStr = projectTeamIconUrl;
                } else if( childMember.status === 3 ) // Project Administrator
                {
                    svgStr = projectTeamIconUrl;
                }
            }

            var resource = 'ProjmgmtConstants';
            var localTextBundle = localeSvc.getLoadedText( resource );
            var statuses = [ localTextBundle.NonPrivilegedKey, localTextBundle.PrivilegedKey, localTextBundle.TeamAdminKey, localTextBundle.ProjectAdminKey ];
            /* 0 = regular member
                1 = privileged member
                2 = project team administrator
                3 = project administrator*/
            var vmNode = awTableTreeSvc
                .createViewModelTreeNode( objUid, objTypeDbValue, displayName, newLevelNdx, childMemberNdx, iconURL, svgStr );
            vmNode.isLeaf = true;
            vmNode.props = {};
            vmNode.props.status = {
                value: childMember.status,
                uiValue: statuses[ childMember.status ]
            };
            vmNode.props.type = {
                value: objTypeUiValue,
                uiValue: objTypeUiValue
            };
            vmNode.props.object_name = {};
            vmNode.user = childMember.member.props.user;
            vmNode.isRemovable = childMember.isRemovable;
            setNodeToBeSelected( vmNode );
            if( vmNode ) {
                vmNodes.push( vmNode );
            }
        }
    }
    //Process childGroupsAndRoles structure
    if( childGroupsAndRoles.length > 0 ) {
        exports.processSearchResults( subPanelContext, childGroupsAndRoles, treeLoadInput, serviceData, newLevelNdx, isFiltering, parentNode, vmNodes, true );
    }
};

/**
 *
 * @param {*} groupsAndRoles
 * @param {*} treeLoadInput
 * @param {*} serviceData
 * @param {*} levelNdx
 * @param {*} isFiltering
 * @param {*} parentNode
 * @param {*} vmNodes
 * @param {*} isProcessingChild
 */
export let processSearchResults = function( subPanelContext, groupsAndRoles, treeLoadInput, serviceData, levelNdx, isFiltering, parentNode, vmNodes, isProcessingChild ) {
    var newLevelNdx = levelNdx;
    for( var childNdx = 0; childNdx < groupsAndRoles.length; childNdx++ ) {
    /*
    Consider Scenario where -
    team contains -
        1. dba
            dba.DBA
                all 1000 users
        2. dba.DBA
            tcadmin - TA
        3. 4GTester.DBA
            User1 - priv

        expanding Role 'dba.DBA' from point 1 - will send group & role info to server to fetch the child members
        expanding Role 'dba.DBA' as direct membership from point 2 - will send only role info to server to fetch the childMEmbers from the given role
            Server will return
                tcadmin - TA
                User1 - priv
            Client should process only those groupsAndRoles - whose groupRoleNode matches with the input group/role uids.
            So below condition will be used to decide whether the response structure should be processed or not.
    */

        /*Consider scenario where -
    1. ACE_Engineering (Group) & Engineering.Desginer (Role) is team admin
    2. Search by name contains "ACE_"
    3. Response should return
        In first page - [
                            0:{ ACE_Engineering (level=0)
                                ACE_Designer (level=1)
                                    user1 - user 50 (level=2)
                            }
                        ]
        In second page -[
                            0:{        user51 - user65 (level=2)}   // groupOrRole is empty
                            1:{ Engineering.Designer (level=0)      // groupOrRole is role
                                user1-User30 }
                        ]
    In the response of second page - we get two different hierarchy ACE_engineering hierarchy from user-51 to user-65 & Engineering.Designer hierarchy
    We have to reset the levelNdx 2 to 0 to render a new hierarchy.


    if parent hierarchy is processing & filtering is on & groupOrRole is not empty - than we are resetting the parent node to top node.
    */
        if( !isProcessingChild && isFiltering && !( groupsAndRoles[childNdx].groupOrRole.tcGroup.type === 'unknownType' && groupsAndRoles[childNdx].groupOrRole.tcRole.type === 'unknownType' ) ) // group & role type is same , means tcGroup & role is of unknownType
        {
            parentNode = treeLoadInput.rootNode;
            if( !parentNode ) // resetting te parentNode
            {
                parentNode = {
                    uid:'top',
                    levelNdx:-1
                };
            }
            newLevelNdx = parentNode.levelNdx + 1;
        }
        // Process each groupsOrRoles structure  - is a single hierarchy
        exports.processGroupsAndRoles( subPanelContext, groupsAndRoles[childNdx], treeLoadInput, serviceData, childNdx, newLevelNdx, isFiltering, parentNode, vmNodes );
    }
};

/**
 * The function is to process the SOA response getProjectTeam , create nodes and build the tree
 *
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 * @param {searchResults} searchResults new TreeLoadResult object containing result/status information.
 * @param {data} data - viewModel data
 * @return {object} response
 */
export let loadRootNode = function( searchResults, treeLoadInput, data, subPanelContext ) {
    var vmNodes = []; // This will be used to process nodes return by server to build the tree

    // This is the "root" node of the tree or the node that was selected for expansion
    var newTreeLoadInput = _.cloneDeep( treeLoadInput );
    newTreeLoadInput.parentNode.totalFound = searchResults.totalCount;
    var parentNode = newTreeLoadInput.parentNode;

    var levelNdx = parentNode.levelNdx + 1;

    // get the Filter criteria
    var filterCriteria = data.columnProviders.exampleColumnProvider.columnFilters;
    // isFiltering flag is to tell the subsequent calls whether the filtering should be honored or not.
    var isFiltering = filterCriteria && filterCriteria.length !== 0;

    // Do not honor the filter criteria when the node is expanding. so marking isFiltering as false when expand is requested.
    // This is feature requirement in LCS-569592

    var isNodeExpanded = exports.nodeExpandRequested(  parentNode, data );
    if( isNodeExpanded ) {
        //parentNode._expandRequested ) {
        isFiltering = false;
    }
    if( isFiltering ) {
        // Clear the expanded state & expandedNode info before applying new filter
        data.nodeExpansionRequested = [];
        tableStateService.clearAllStates( data, 'ProjectTeamTreeGrid' );
    }
    //This is for pagination to know if there are more pages or not
    var endReachedVar = searchResults.endIndex + 1 === searchResults.totalCount;
    var startReachedVar = true;

    var tempCursorObject = {
        endReached: endReachedVar,
        startReached: true
    };

    //Process getProjectTeam SOA response to build the tree structure

    exports.processSearchResults( subPanelContext, searchResults.groupsAndRoles, newTreeLoadInput, searchResults.ServiceData, levelNdx, isFiltering, parentNode, vmNodes );

    //Build the treeLoadResult based on nodes created
    var treeLoadResult = awTableTreeSvc.buildTreeLoadResult( newTreeLoadInput, vmNodes, true, startReachedVar,
        endReachedVar, newTreeLoadInput.parentNode );
    //set the cursor object index to the last object
    treeLoadResult.parentNode.cursorObject = tempCursorObject;
    treeLoadResult.totalLoaded = searchResults.endIndex + 1;
    return treeLoadResult;
};

/**
 * Function to return the startIndex to send the SOA getProjectTeam
 * @treeLoadInput treeLoadInput
 * @return startIndex to load the page
 */
export let getStartIndex = function( treeLoadInput, data ) {
    if ( treeLoadInput.startChildNdx === 0 ) {
        // if its a loading first time and no pagination
        return treeLoadInput.startChildNdx;
    }
    return data.data.totalLoaded + 1;
};

/**
 *
 * This methods sets the list of nodw which is expanded manually when the filter criteria is applied
 * This is useful when the filter is applied and node is collapsed and expanded again - filter criteria should not be honored.
 * And if expand-collapse-expand is returning more than 1 page results, _expandRequested is undefined as it is scrolling action & not expansion. So it pass on the filter criteria on scroll.
 * And gives incorrect results.
 *
 * So Expand-collapse-expand will store the node for which the node expansion is requested.
 * This will be cleared when another filter is applied.
 *
 * @param {*} eventData node which is expanding
 * @param {*} data
 * @returns node which is requested for expansion during filtering
 */
export let updateExpandRequestedNodes = function( eventData, data ) {
    var expandedNodeList = data.nodeExpansionRequested ? data.nodeExpansionRequested : [];
    var filterCriteria = data.columnProviders.exampleColumnProvider.columnFilters;
    var isNodeExpandRequested = exports.nodeExpandRequested( eventData, data );
    if( filterCriteria && filterCriteria.length > 0 && isNodeExpandRequested ) {
        expandedNodeList.push( eventData );
    }
    return expandedNodeList;
};

export default exports = {
    getInputParentNode,
    processSearchResults,
    processGroupOrRoleNode,
    loadRootNode,
    reloadAndSelectProjectTeamTreeNode,
    markNodeSelectedInProvider,
    setNodeToBeSelected,
    getInputFilterCriteria,
    processGroupsAndRoles,
    getStartIndex,
    updateExpandRequestedNodes,
    nodeExpandRequested
};
