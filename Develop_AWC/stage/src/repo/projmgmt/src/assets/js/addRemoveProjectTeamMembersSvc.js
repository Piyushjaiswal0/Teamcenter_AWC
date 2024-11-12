// Copyright (c) 2022 Siemens

/**
 * A service that has util methods which can be use in other js files of Project modules.
 *
 * @module js/addRemoveProjectTeamMembersSvc
 */
import _ from 'lodash';

var exports = {};

/**
 * Adds the selected group and group members to selected Project
 * @param {object} uwDataProvider data provider
 * @param {Object} context context
 */
export let addSelectedMembers = function(  subPanelContext, data ) {
    var inputs = [];
    var gms = [];
    var groups = [];
    var groupCount = 0;
    var gmCount = 0;
    var roleCount = 0;
    var groupRoles = [];
    var group;
    var role;
    var i;
    var gmNodeToSelect = [];
    var selectedObjects = data.atomicData.selectionData.selected;
    for( i = 0; i < selectedObjects.length; i++ ) {
        if( selectedObjects[ i ].type === 'Group' ) {
            var currGroup = {
                type: selectedObjects[ i ].object.type,
                uid: selectedObjects[ i ].object.uid
            };
            groups[ groupCount ] = currGroup;
            groupCount++;
        }
        if( selectedObjects[ i ].type === 'User' ) {
            var currGroupMember = {
                type: selectedObjects[ i ].object.type,
                uid: selectedObjects[ i ].object.uid
            };

            gms[ gmCount ] = currGroupMember;
            gmCount++;
            var userToSelect = selectedObjects[ i ].parent.parent.object.uid + '_' + selectedObjects[ i ].parent.object.uid;
            gmNodeToSelect.push( userToSelect );
        }

        if( selectedObjects[ i ].type === 'Role' ) {
            group = {
                type: selectedObjects[ i ].parent.object.objecttype,
                uid: selectedObjects[ i ].parent.object.uid
            };

            role = {
                type: selectedObjects[ i ].object.type,
                uid: selectedObjects[ i ].object.uid
            };
            groupRoles[ roleCount ] = {
                tcGroup: group,
                tcRole: role,
                isRemovable: true
            };
            roleCount++;
        }
    }
    var selectedProjects = subPanelContext.searchState ? subPanelContext.searchState.pwaSelection : [ subPanelContext.openedObject ];

    for( var j = 0; j < selectedProjects.length; j++ ) {
        var project = {
            project: selectedProjects[j],
            gms: gms,
            groups: groups,
            groupRoles: groupRoles,
            addOrRemove: true
        };
        inputs.push( project );
    }
    data.nodes = _.cloneDeep( inputs );
    data.nodes[0].userParentToSelect = gmNodeToSelect;
    return inputs;
};

/**
  * Process partial errors to display proper message on add or remove team members to projects
  *
  * @param {Object} SOA reponse
  * @return {message} to be displayed
  */
export let processPartialErrors = function( response ) {
    var message = '';
    var partialErrors = '';
    var failureCount = 0;

    // Check if input response is not null and contains partial errors then only
    if( response && response.partialErrors ) {
        partialErrors = response.partialErrors;
    } else if( response && response.ServiceData && response.ServiceData.partialErrors ) {
        partialErrors = response.ServiceData.partialErrors;
    }
    // create the error message
    if ( partialErrors  ) {
        _.forEach( partialErrors, function( partialError ) {
            var errorMsgIngored = true;
            _.forEach( partialError.errorValues, function( object ) {
                // prepare error message for all the errors other than the member is already in the Project Team, so excluded that error code
                if( object.code !== 101056 ) {
                    message += '\n' + object.message;
                    errorMsgIngored = false;
                }
            } );
            if( !errorMsgIngored ) {
                failureCount++;
            }
        } );
    }
    return { message, failureCount };
};

exports = {
    addSelectedMembers,
    processPartialErrors
};
export default exports;
