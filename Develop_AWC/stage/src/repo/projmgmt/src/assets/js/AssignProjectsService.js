// Copyright (c) 2022 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/AssignProjectsService
 */
import appCtxSvc from 'js/appCtxService';
import projectMgmntUtils from 'js/projectMgmntUtils';
import _ from 'lodash';
import $ from 'jquery';

var exports = {};

/**
  * Update the data providers Remove Project cell command initiate the call for this function. Function removes the
  * selected project from the member project list and assign the project back to the available list. It also apply
  * the filter if required
  *
  * @param {viewModelObject} data - json object
  *
  * @param {ViewModelObject} vmo- selected project
  *
  *
  */

export let addToAvailableProjects = function( data, vmo ) {
    var result = removeFromMemberOfProjects( data, vmo );
    var viewModelObjectsAvailList = data.dataProviders.availableProjects.viewModelCollection.loadedVMObjects;
    var updateAvailableList = _.clone( viewModelObjectsAvailList );
    updateAvailableList.push( vmo );
    data.dataProviders.availableProjects.update( updateAvailableList );

    if( data.filterBox.dbValue !== '' ) {
        projectMgmntUtils.setFilterText( data.filterBox.dbValue );
        var arrByID = updateAvailableList.filter( projectMgmntUtils.filterByName );
        updateAvailableList = arrByID;
    }
    data.dataProviders.availableProjects.update( updateAvailableList );

    return result.isOwningProjectUpdated;
};

/**
  * Removes the project from the member of project list
  *
  * @param {viewModelObject} data - json object
  *
  * @param {ViewModelObject} vmo- selected project
  *
  *
  */

function removeFromMemberOfProjects( data, vmo ) {
    var indexOfProject = data.assignedProjectsUid.indexOf( vmo.uid );
    if( indexOfProject > -1 ) {
        data.assignedProjectsUid.splice( indexOfProject, 1 );
    } else {
        data.removeProjectSoaInput.push( vmo.uid );
    }

    data.removeProjectsUid.push( vmo.uid );
    var viewModelObjects = data.dataProviders.memberOfProjectList.viewModelCollection.loadedVMObjects;
    var memberModelObjects = _.clone( viewModelObjects );

    var modelObjects = $.grep( memberModelObjects, function( eachObject ) {
        return $.inArray( eachObject.uid, data.removeProjectsUid ) === -1;
    } );

    data.dataProviders.memberOfProjectList.update( modelObjects );

    //remove from owning_project
    if( appCtxSvc.getCtx( 'owningProject' ) && vmo.uid === appCtxSvc.getCtx( 'owningProject' ).uid ) {
        appCtxSvc.updateCtx( 'owningProject', '' );
        return {
            modelObjects : modelObjects,
            isOwningProjectUpdated : true
        };
    }

    return {
        modelObjects : modelObjects,
        isOwningProjectUpdated : data.isOwningProjectUpdated
    };
}

/**
  * Update the data providers Assign Project cell command initiate the call for this function. Function removes the
  * selected project from the available project list and assign the project back to the member project list.
  *
  * @param {viewModelObject} data - json object
  *
  * @param {ViewModelObject} vmo - selected project
  *
  *
  */

export let addToMemberOfProjects = function( data, vmo ) {
    removeFromAvailableProjects( data, vmo );
    var viewModelObjectsMemberist = data.dataProviders.memberOfProjectList.viewModelCollection.loadedVMObjects;
    var updateMemberList = _.clone( viewModelObjectsMemberist );
    //Dont push if it is already added to member of list
    var result = _.some( updateMemberList, function( object, i ) {
        if( object.uid === vmo.uid ) {
            return true;
        }
    } );

    if( !result ) {
        vmo.selected = false;
        updateMemberList.push( vmo );
        data.dataProviders.memberOfProjectList.update( updateMemberList );
    }
};

/**
  * Prepares the SOA input for the projects to assign
  *
  * @param {viewModelObject} data - json object
  *
  * @param {ViewModelObject} vmo- selected project
  *
  *
  */
function removeFromAvailableProjects( data, vmo ) {
    var indexOfProject = data.removeProjectsUid.indexOf( vmo.uid );
    if( indexOfProject > -1 ) {
        data.removeProjectsUid.splice( indexOfProject, 1 );
    }
    var indexOfClickedObject = data.removeProjectSoaInput.indexOf( vmo.uid );
    if( indexOfClickedObject > -1 ) {
        data.removeProjectSoaInput.splice( indexOfClickedObject, 1 );
    }

    data.assignedProjectsUid.push( vmo.uid );
    var viewModelObjects = data.dataProviders.availableProjects.viewModelCollection.loadedVMObjects;
    var availModelObjects = _.clone( viewModelObjects );

    var modelObjects = $.grep( availModelObjects, function( eachObject ) {
        return $.inArray( eachObject.uid, data.assignedProjectsUid ) === -1;
    } );

    data.dataProviders.availableProjects.update( modelObjects );
}

/**
  * Replace the Owning Project with the new Owning project selected from the available list
  * Update the dataProvider and replace the existing owning project
  * @param {viewModelObject} data - json object
  *
  * @param {ViewModelObject} vmo- new owning project
  */
export let replaceOwningProject = function( data, vmo ) {
    //When you click on replace

    //add existing owning proj to available data provider list
    if( appCtxSvc.getCtx( 'owningProject' ) && appCtxSvc.getCtx( 'owningProject' ) !== '' ) {
        var viewModelObjects = data.dataProviders.availableOwningProgram.viewModelCollection.loadedVMObjects;
        var availModelObjects = _.clone( viewModelObjects );
        availModelObjects.push( appCtxSvc.getCtx( 'owningProject' ) );
        data.dataProviders.availableOwningProgram.update( availModelObjects );
    }

    //remove new project from data provider
    var uids = [ vmo.uid ];
    var viewModelObjects = data.dataProviders.availableOwningProgram.viewModelCollection.loadedVMObjects;
    var availModelObjects = _.clone( viewModelObjects );
    var modelObjects = $.grep( availModelObjects, function( eachObject ) {
        return $.inArray( eachObject.uid, uids ) === -1;
    } );
    data.dataProviders.availableOwningProgram.update( modelObjects );

    //set new project to data.owningProj
    appCtxSvc.updateCtx( 'owningProject', vmo );

    exports.addToMemberOfProjects( data, vmo );
    return true;
};

export default exports = {
    addToAvailableProjects,
    addToMemberOfProjects,
    replaceOwningProject
};
