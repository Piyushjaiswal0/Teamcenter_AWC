// Copyright (c) 2021 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/updateProjectMembersDetails
 */
import _ from 'lodash';
import AwPromiseService from 'js/awPromiseService';

/**
 */
var exports = {};

/**
 * Remove the selected group and group members to selected Project
 * @param {object} uwDataProvider data provider
 * @param {Object} context context
 */
export let removeSelectedMembers = function( uwDataProvider, subPanelContext, data ) {
    var inputs = [];
    var gms = [];
    var groups = [];
    var groupCount = 0;
    var gmCount = 0;
    var roleCount = 0;
    var groupRoles = [];
    var i;

    for( i = 0; i < uwDataProvider.selectedObjects.length; i++ ) {
        if( uwDataProvider.selectedObjects[ i ].type === 'Group' ) {
            groups[ groupCount ] = uwDataProvider.selectedObjects[ i ].tcGroup;
            groupCount++;
        }
        else if( uwDataProvider.selectedObjects[ i ].type === 'Role' ) {
            groupRoles[ roleCount ] = {
                tcGroup: uwDataProvider.selectedObjects[ i ].tcGroup,
                tcRole: uwDataProvider.selectedObjects[ i ].tcRole,
                isRemovable: uwDataProvider.selectedObjects[ i ].isRemovable
            };
            roleCount++;
        } else if( uwDataProvider.selectedObjects[ i ].type === "User" ) {
            var currGroupMember = {
                type: uwDataProvider.selectedObjects[ i ].type,
                uid: uwDataProvider.selectedObjects[ i ].uid
            };
            gms[ gmCount ] = currGroupMember;
            gmCount++;
        }
    }

    inputs[ 0 ] = {
        project: subPanelContext.selected,
        gms: gms,
        groups: groups,
        groupRoles: groupRoles,
        addOrRemove: false
    };
    data.nodes = _.cloneDeep( inputs );

    return inputs;
};

/**
 * set non privilege for the selected group and group members for projects
 * @param {object} uwDataProvider data provider
 * @param {Object} context context
 */
export let setNonPrivilegeStatus = function( uwDataProvider, subPanelContext ) {
    var inputs;
    var privilegeStatus = 0;
    inputs = exports.createInputStructure( uwDataProvider, privilegeStatus, subPanelContext );
    return inputs;
};

export let createInputStructure = function( uwDataProvider, privilegeStatus, subPanelContext ) {
    var inputs = [];
    var users = [];
    var groupNode = [];
    var groupCount = 0;
    var gmCount = 0;
    var roleCount = 0;
    var groupRoleNode = [];
    var i;

    for( i = 0; i < uwDataProvider.selectedObjects.length; i++ ) {
        if( uwDataProvider.selectedObjects[ i ].type === 'Group' ) {
            groupNode[ groupCount ] = {
                tcGroup: uwDataProvider.selectedObjects[ i ].tcGroup,
                isRemovable: true
            };
            groupCount++;
        }
        else if( uwDataProvider.selectedObjects[ i ].type === 'Role' ) {
            groupRoleNode[ roleCount ] = {
                tcGroup: uwDataProvider.selectedObjects[ i ].tcGroup,
                tcRole: uwDataProvider.selectedObjects[ i ].tcRole,
                isRemovable: uwDataProvider.selectedObjects[ i ].isRemovable
            };
            roleCount++;
        }
        else if( uwDataProvider.selectedObjects[ i ].type === "User" ) {
                var currUser = {
                    type: 'user',
                    uid: uwDataProvider.selectedObjects[ i ].user.dbValues[ 0 ]
                };
                users[ gmCount ] = currUser;
                gmCount++;
        }
    }

    inputs[ 0 ] = {
        project: subPanelContext.selected,
        users: users,
        groupNode: groupNode,
        groupRoleNode: groupRoleNode,
        privilegeStatus: privilegeStatus
    };
    return inputs;
};

/**
 * set privilege status for the selected group and group members for projects
 * @param {object} uwDataProvider data provider
 * @param {Object} context context
 */
export let setPrivilegeStatus = function( uwDataProvider, subPanelContext ) {
    var inputs;
    var privilegeStatus = 1;
    inputs = exports.createInputStructure( uwDataProvider, privilegeStatus, subPanelContext );
    return inputs;
};

/**
 * set project team admin status for the selected group and group members for projects
 * @param {object} uwDataProvider data provider
 * @param {Object} context context
 */
export let setProjectTeamAdmin = function( uwDataProvider, subPanelContext ) {
    var inputs;
    var privilegeStatus = 2;
    inputs = exports.createInputStructure( uwDataProvider, privilegeStatus, subPanelContext );
    return inputs;
};

/**
 * This function to prepare the input users node for the setDefaultProjectForProjectMembers SOA.
 * @param {object} uwDataProvider data provider
 */
 export let loadDefaultProject = function( uwDataProvider ) {

    var users = [];
    var gmCount = 0;
    var i;
    var isOnlyUsersSelected = false;
    var deferred = AwPromiseService.instance.defer();

    for( i = 0; i < uwDataProvider.selectedObjects.length; i++ ) {
        if( uwDataProvider.selectedObjects[ i ].type === "User" ) {
            var currUser = {
                type: "user",
                uid: uwDataProvider.selectedObjects[ i ].user.dbValues[ 0 ]
            };
            users[ gmCount ] = currUser;
            gmCount++;
        }
    }

    if(users.length > 0){
        if(users.length === uwDataProvider.selectedObjects.length){
            isOnlyUsersSelected = true;
        }
        deferred.resolve({
            "users" : users,
            "isOnlyUsersSelected" : isOnlyUsersSelected
        });
    }
    else{
        // It need to return something to invoke the failure event 
        deferred.reject(true);        
    }
    return deferred.promise;    
};

export default exports = {
    removeSelectedMembers,
    setNonPrivilegeStatus,
    createInputStructure,
    setPrivilegeStatus,
    setProjectTeamAdmin,
    loadDefaultProject
};
