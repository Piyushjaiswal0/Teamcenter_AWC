// Copyright (c) 2022 Siemens

/**
 * @module js/aw.UserSettings.Service
 */

import uwPropertySvc from 'js/uwPropertyService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import _ from 'lodash';
import assert from 'assert';

var _currentGroup;

var _selectedDefaultGroup;


var exports = {};

/**
  * The function will get all the role object from the group members. This logic is same as the getGroupMembers
  *
  * @param {Object} response - Response object from the Administration-2012-09-UserManagement::getUserGroupMembers SOA API
  * @param {string} selectedGroupName - name of selected group in group role table
  * @return {object} Array of the unique roles under particular group
  */
export let getRolesForSelectedGroup = function( response, selectedGroupName ) {
    assert( selectedGroupName, 'selectedGroupName should have some value.' );
    let groupArray = _.filter( response.ServiceData.modelObjects, mo => mo && mo.props && mo.type === 'GroupMember' );

    let listRoles = [];
    _.forEach( groupArray, function( groupObject ) {
        let groupStatus = groupObject.props.status;
        let group = groupObject.props.group;
        let role = groupObject.props.role;
        let isFalseStatus = groupStatus.dbValues[ 0 ] !== '0';
        // process only active grp members
        if( group && role && groupStatus && !isFalseStatus ) {
            // prepare the role list
            if( group.uiValues[ 0 ] === selectedGroupName ) {
                if( role.uiValues[ 0 ] ) {
                    let roleObject = {
                        propDisplayValue: role.uiValues[ 0 ],
                        propInternalValue: role.dbValues[ 0 ]
                    };
                    listRoles.push( roleObject );
                }
            }
        }
    } );

    return listRoles;
};


/**
   * Get ViewModelRows of required Object
   *
   * @param {Object} response of the getGroupRoleViewModelRows SOA
   * @param {Object} data data of viewmodel
   * @return {Object} Array of created viewModel properties to show in the table
   */
export let getGroupRoleViewModelRows = function( response, data ) {
    var displayedRows = [];

    _.forEach( response.viewModelRows, function( groupMemberRow ) {
        var groupMemberVMO = viewModelObjectSvc
            .constructViewModelObjectFromModelObject( groupMemberRow.modelObject, 'Edit' );

        _.forEach( groupMemberRow.viewModelProperties, function( groupMemberRowProp, index ) {
            if( groupMemberRowProp.propInternalName === 'default_role' ) {
                groupMemberRowProp.propInternalName = 'defaultRole';
                groupMemberRowProp.propDisplayName = 'defaultRole';
            }
            var groupMemberVMProperty = uwPropertySvc.createViewModelProperty(
                groupMemberRowProp.propInternalName, groupMemberRowProp.propDisplayName,
                groupMemberRowProp.propDataType, groupMemberRowProp.propBO.uid, [ groupMemberRowProp.propUIValue ] );

            uwPropertySvc.setIsPropertyModifiable( groupMemberVMProperty, groupMemberRowProp.isModifiable );

            if( groupMemberRowProp.propInternalName === 'defaultRole' ) {
                groupMemberVMProperty.dataProvider = 'rolesProvider';
            }

            groupMemberVMProperty.parentUid = index;
            groupMemberVMProperty.ModelObject = groupMemberRow.modelObject;

            uwPropertySvc.setIsEditable( groupMemberVMProperty, groupMemberRowProp.isEditable );
            uwPropertySvc.setHasLov( groupMemberVMProperty, groupMemberRowProp.hasLOV );

            groupMemberVMProperty.dbValues = [ groupMemberRowProp.propDBValue ];
            if( groupMemberRowProp.propInternalName === 'group' ) {
                var groupDisplayName = groupMemberRow.modelObject.props.object_string.uiValues[ 0 ].split( '/' );
                groupMemberVMProperty.uiValues = [ groupDisplayName[ 0 ] ];
                groupMemberVMProperty.uiValue = groupDisplayName[ 0 ];
            }

            groupMemberVMProperty.getViewModel = function() {
                return data;
            };

            groupMemberVMO.props[ groupMemberRowProp.propDisplayName ] = groupMemberVMProperty;
        } );
        displayedRows.push( groupMemberVMO );
    } );

    return displayedRows;
};

/**
   * Update edit state for attribute table and update the commands on the table
   *
   * @param {object} dataprovider - the data provider Object
 
   */

export let findModifiedGroupMemberObjects = function( dataProvider ) {
    var forDefaultGroupToOneArray = [];

    _.forEach( dataProvider.viewModelCollection.loadedVMObjects, function( virtualGroupMemberObject ) {
        if(  virtualGroupMemberObject.props.defaultRole.dirty === true ) {
            forDefaultGroupToOneArray.push( virtualGroupMemberObject.props.defaultRole );
        }
    } );

    var inputObjects = [];


    _.forEach( forDefaultGroupToOneArray, function( forDefaultGroupToOneObject ) {
        let forDefGrpToOneObj = {
            groupMember: forDefaultGroupToOneObject.ModelObject,
            groupMemberPropValuesMap: {
                default_role: forDefaultGroupToOneObject.dbValues
            }

        };
        inputObjects.push( forDefGrpToOneObj );
    } );

    return {
        inputObjects: inputObjects
    };
};

/**
   * The function will get all the group object from the group members.
   *
   * @param {Object} response - Response object from the getGroup SOA
   * @return {object} Array of the unique groups
   */
export let getGroups = function( response ) {
    var groupArray = response.groupMembers;
    var defaultGroups = [];
    var uniqueGroups = [];
    var listGroups = [];


    _.forEach( groupArray, function( groupObject ) {
        if( groupObject && groupObject.props && groupObject.type === 'GroupMember' ) {
            var group_status = groupObject.props.status;
            var group = groupObject.props.group;
            var role = groupObject.props.role;
            var isFalseStaus = group_status.dbValues[ 0 ] !== '0';
            // process only active group members
            if( group_status && !isFalseStaus ) {
                if( group && role ) {
                    var default_role = groupObject.props.default_role;
                    var grp_value = group.uiValues[ 0 ];
                    var isFalseRole = default_role.dbValues[ 0 ] !== '0';
                    if( default_role && isFalseRole ) {
                        defaultGroups[ grp_value ] = groupObject;
                        listGroups[ grp_value ] = groupObject;
                    } else {
                        var gobj = _.get( defaultGroups, group );
                        if( gobj ) {
                            listGroups[ grp_value ] = gobj;
                        } else {
                            listGroups[ grp_value ] = groupObject;
                        }
                    }
                }
            }
        }
    } );

    for( var group in listGroups ) {
        uniqueGroups.push( listGroups[ group ] );
    }

    var groups = [];


    for( var i = 0; i < uniqueGroups.length; i++ ) {
        let obj = {
            propDisplayValue: uniqueGroups[ i ].props.group.uiValues[ 0 ],
            propInternalValue: uniqueGroups[ i ].props.group.uiValues[ 0 ]
        };
        groups.push( obj );
    }


    return groups;
};

/**
   * Fetch Selected Default Group from data to Commit it to Database
   *
   * @param {object} data - Data of Object
   * @return {string} - name of selected default group
   */
export let setSelectedDefaultGroup = function( data ) {
    _selectedDefaultGroup = data.currentGroup.uiValue;
    return _selectedDefaultGroup;
};

/**
   * Update edit state for attribute Default Group Widget
   *
   * @param {object} currentGroup - Current group
   * @param {object} currentUser - Current user
   * @return {object} - Object to send in output
   */
export let updateDefaultGroup = function( currentGroup, currentUser ) {
    currentGroup.isEditable = false;
    var defaultGroupData = [];
    var user_id =  currentUser.properties.user_id.dbValue;
    defaultGroupData = [ {
        userId: user_id,
        person: '',
        password: '',
        defaultGroup: _selectedDefaultGroup,
        newOwner: '',
        newOwningGroup: '',
        userPropertyMap: {
            Allow_Login_User_To_Update: [ 'true' ]
        },
        userAddlPropertyMap: {
        }
    } ];
    return { currentGroup, defaultGroupData };
};


/**
   * Update edit state for attribute Default Group Widget
   *
   * @param {object} data - Data of Object
   * @param {object} eventData - the eventdata object of editHandlerStateChange
   * @return {object} - the viewmodel data object
   */

export let modifyUserDefaultGroup = function( data, eventData ) {
    let newData = _.cloneDeep( data );
    if( eventData.state === 'starting' ) {
        _currentGroup = _.cloneDeep( data.currentGroup );
        newData.currentGroup.isEnabled = true;
        newData.currentGroup.isEditable = true;
    } else if( eventData.state === 'canceling' ) {
        _currentGroup.isEditable = false;
        newData.currentGroup = _currentGroup;
    }
    return newData;
};

/**
   * The function will get the default Group for the logged in user
   *
   * @param {Object} response - Response object from the getProperties SOA
   * @return {object} Default group value for the User currently set in the DB
   */
export let getCurrentDefaultGroup = function( response ) {
    var currentdefaultGroupVal;
    var userObjectArray = response.modelObjects;

    _.forEach( userObjectArray, function( userObject ) {
        if( userObject.modelType.name === 'Group' ) {
            currentdefaultGroupVal = userObject.props.object_string.uiValues[ 0 ];
        }
    } );

    return currentdefaultGroupVal;
};

export default exports = {
    getRolesForSelectedGroup,
    getGroupRoleViewModelRows,
    findModifiedGroupMemberObjects,
    getGroups,
    setSelectedDefaultGroup,
    updateDefaultGroup,
    modifyUserDefaultGroup,
    getCurrentDefaultGroup
};

