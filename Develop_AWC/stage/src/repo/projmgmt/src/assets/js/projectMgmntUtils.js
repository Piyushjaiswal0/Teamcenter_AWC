// Copyright (c) 2022 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/projectMgmntUtils
 */
import localeSvc from 'js/localeService';
import soaService from 'soa/kernel/soaService';
import addObjectUtils from 'js/addObjectUtils';
import tcViewModelObjectSvc from 'js/tcViewModelObjectService';
import _ from 'lodash';

var exports = {};
var _filterText = '';

/**
 * Return the array of index
 *
 * @param {Array} availModelObjects - array of objects containing all objects
 * @param {Array} modelObjects - array of subset of the availModelObjects list
 *
 * @return {Array} ArrayOf uid
 *
 */

export let getIndexToAddToProjects = function( availModelObjects, modelObjects ) {
    var projectMap = {};
    if( exports.isEmpty( projectMap ) && availModelObjects.length ) {
        for( var i = 0; i < availModelObjects.length; i++ ) {
            projectMap[ availModelObjects[ i ].uid ] = i;
        }
    }
    var addedObjectIndex = [];
    for( var modelObject in modelObjects ) {
        addedObjectIndex.push( projectMap[ modelObjects[ modelObject ].uid ] );
    }
    return addedObjectIndex;
};
/**
 * Checks whether the object id empty or not
 *
 * @param {Object} obj - object
 *
 * @return {Boolean} true if empty ; false if not empty
 */

export let isEmpty = function( obj ) {
    return Object.getOwnPropertyNames( obj ).length === 0;
};

/**
 * Checks whether the object id empty or not
 *
 * @param {Object} filterText - filter text
 *
 */
export let setFilterText = function( filterText ) {
    _filterText = filterText;
};

/**
 * Method to add the no project in popup
 *
 * @param {object} noObjectString - no object string
 */
export let checkForProjectAssig = function( noProjectString ) {
    exports.noProject = noProjectString;
};

/**
 * The function will add the 'no project' string in the popup list.
 *
 * @param {Object} response - Response object from the getUserProjects SOA
 *
 * @return {object} Array of the unique projects
 */
export let getProjects = function( response ) {
    var projectList = response.userProjectInfos[ 0 ].projectsInfo;
    var projectPath = 'project';
    var project_list = [];

    _.forEach( projectList, function( projectObject ) {
        var projObj = _.get( projectObject, projectPath );
        project_list.push( projObj );
    } );

    return project_list;
};

/**
 * The function will add the 'no project' string in the popup list.
 *
 * @param {Object} response - Response object from the getUserProjects SOA
 *
 * @return {object} Array of the unique projects
 */
export let getProjectInfo = function( response ) {
    var project_list = exports.getProjects( response );

    localeSvc.getLocalizedText( 'ProjmgmtConstants', 'noProject' ).then(
        function( noProjectText ) {
            var noProjectObj = {
                uiValue: noProjectText,
                dbValue: 'noProject'
            };
            var props = {
                object_string: noProjectObj
            };
            var noProject = {
                props: props,
                value: 'noProject',
                uid: 'AAAAAAAAAAAAAA'
            };
            var noProjectVmo = tcViewModelObjectSvc.createViewModelObjectById( noProject.uid );
            noProjectVmo.props = noProject.props;
            noProjectVmo.value = noProject.value;
            project_list.push( noProjectVmo );
        } );

    return project_list;
};

/**
 * The function will return list of projects, sorted
 *
 * @param {Object} userProjectsInfoInputs - user projects input
 * @param {Object} sortCriteria - sort criteria
 *
 * @return {Array} Sorted list of projects
 */
export let loadData = function( userProjectsInfoInputs, sortCriteria ) {
    return soaService.postUnchecked( 'Core-2009-10-ProjectLevelSecurity', 'getUserProjects', {
        userProjectsInfoInputs: userProjectsInfoInputs
    } ).then( function( response ) {
        var projects = exports.getProjects( response );
        if( !_.isEmpty( sortCriteria ) ) {
            projects = addObjectUtils.sortProjects( projects, sortCriteria );
        }

        return projects;
    } );
};

/**
 * Filters the results . Checks the obj has the filter content in it. If the filterText is present in the obj
 * returns true
 *
 * @param {Object} object
 *
 * @return {Boolean} true is object is empty
 */
export let filterByName = function( obj ) {
    var projectProps = '';
    if( obj.type === 'TC_Project' ) {
        var proj_id = obj.props.project_id.dbValues[ 0 ];
        var proj_nm = obj.props.project_name.dbValues[ 0 ];
        if( proj_id !== '' && proj_nm !== '' ) {
            projectProps = proj_id + proj_nm;
            if( projectProps.toUpperCase().indexOf( _filterText.toUpperCase() ) !== -1 ) {
                return true;
            }
        }
    }
    return false;
};

export let getprojectValidateConditions = function( response ) {
    var flag = true;
    var prefVal = response.response[ 0 ].values.values[ 0 ];

    if( prefVal === '1' || prefVal === '2' ) {
        flag = false;
    }

    return flag;
};

export default exports = {
    getIndexToAddToProjects,
    isEmpty,
    setFilterText,
    checkForProjectAssig,
    getProjects,
    getProjectInfo,
    loadData,
    filterByName,
    getprojectValidateConditions
};
