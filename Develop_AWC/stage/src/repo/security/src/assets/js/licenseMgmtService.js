// Copyright (c) 2021 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/licenseMgmtService
 */

import dmSvc from 'soa/dataManagementService';
import licenseMgmtUtils from 'js/licenseMgmtUtils';
import _ from 'lodash';
import $ from 'jquery';
import adapterService from 'js/adapterService';

var exports = {};
var ITAR_LICENSE = 'ITAR_License';

/**
  * sets apply to option from context
  */
function setTypeOption( licenses ) {
    //load data from context
    var revision = licenses.applyToRawList.filter( function( v ) {
        return v.isDefaultValue === true;
    } );
    return _.isEmpty( revision ) ? false : Boolean( _.isEqual( revision[ 0 ].internalValue, '1' ) );
}

/**
  * Initializes value change event for list box and gets available licenses
  *
  * @param {object} data - data
  *
  */
export let initialize = function( data, fields, licenses ) {
    var newData = _.clone( data );
    newData.itarEditMode = false;
    newData.enableEdit = false;
    var dbValue = setTypeOption( licenses );
    fields.applyToAttach.update( dbValue, {}, { markModified : true } );
    return newData;
};

/**
  * Populate license types in detach license view
  *
  *
  * @returns {ObjectArray} The array of child node objects to be displayed.
  */
export let populateDetachList = function( data, fields, licenses ) {
    if( !licenses.searchResults ) {
        licenses.searchResults = [];
    }
    data.dataProviders.getDetachableLicense.update( licenses.searchResults, licenses.searchResults.length );
    var dbValue = setTypeOption( licenses );
    fields.applyToDetach.update( dbValue, {}, { markModified : true } );
    return data;
};

/**
  * Prepares the input for the attachLicense SOA. Create the array of licenses and auth-para separately maintaining
  * the order
  *
  * @param {object} - the JSON object
  *
  *
  */
export let getSelectedLicenseNameAndAuthPara = function( data, selectedLicenses ) {
    var newData = _.clone( data );
    var licenseName = [];
    var auth_para = [];
    newData.containsItarLicense = false;
    _.forEach( selectedLicenses, function( object ) {
        if( object.props.object_string.dbValue !== '' ) {
            licenseName.push( object.props.object_string.dbValue );
            if( object.props.ead_paragraph ) {
                newData.containsItarLicense = true;
                var tmpValue = '';
                if( !_.isEmpty( object.props.ead_paragraph.dbValue ) ) {
                    tmpValue = object.props.ead_paragraph.dbValue;
                }
                auth_para.push( tmpValue );
            } else {
                auth_para.push( '' );
            }
        }
    } );
    newData.authPara = auth_para;
    newData.licenseName = licenseName;
    return newData;
};

/**
  * Prepares the input for the attachLicenses SOA. Create the array of licenses and auth-para separately maintaining
  * the order
  *
  * @param {object} - the JSON object
  *
  *
  */
export let getSelectedLicensesforAttach = function( data ) {
    var selectedLicenses;

    selectedLicenses = data.dataProviders.selectedLicenses.viewModelCollection.loadedVMObjects;

    var newData = exports.getSelectedLicenseNameAndAuthPara( data, selectedLicenses );
    newData.confirmAttach = newData.containsItarLicense && licenseMgmtUtils.objectsToAssign( data ).length > 1;

    return newData;
};

/**
  * Prepares the input for the detachLicenses SOA. Create the array of licenses and auth-para separately maintaining
  * the order
  *
  * @param {object} - the JSON object
  *
  *
  */

export let getSelectedLicensesforDetach = function( data ) {
    var selectedLicenses;

    selectedLicenses = data.dataProviders.getDetachableLicense.selectedObjects;

    return exports.getSelectedLicenseNameAndAuthPara( data, selectedLicenses );
};

/**
  * Prepares the input for the attachLicenses SOA. Create the array of licenses and auth-para separately maintaining
  * the order
  *
  * @param {object} - the JSON object
  *
  *
  */
export let getSelectedLicensesforEdit = function( data ) {
    var newData = _.clone( data );
    newData.itarEditMode = true;
    newData.selectedLicenses = data.dataProviders.availableLicenses.selectedObjects;
    return newData;
};

/**
  * Prepares the input for the attachLicenses SOA. Create the array of licenses and auth-para separately maintaining
  * the order
  *
  * @param {object} - the JSON object
  *
  *
  */
export let checkSelected = function( data ) {
    var eventData = data.eventData;
    data.enableEdit = false;
    _.forEach( eventData.selectedObjects, function( o ) {
        if( o.modelType.typeHierarchyArray.indexOf( ITAR_LICENSE ) !== -1 ) {
            data.enableEdit = true;
        }
    } );
};


/**
  * this function is called to get the updated index of selected license
  *
  * @param {viewModelObject} licenselist - license list
 * @param {ViewModelObject} vmo- selected license
  * @param {ViewModelObject} index- index of selected license
  *
  */
function getLicenseIndexToBeUpdated( licenselist, vmo, index ) {
    var idx = index;
    if( licenselist && licenselist.uiValues && licenselist.uiValues.length > 0 ) {
        idx = licenselist.uiValues.indexOf( vmo.props.object_name.dbValue );
        if( idx === -1 ) {
            idx = index;
        }
    }
    return idx;
}

/**
  * Sets cell properties on license objects from selected objects properties
  *
  * @param {data} - data
  *
  *
  */
export let updateLicenses = function( data, adaptedObjects, detachFlag ) {
    var eventData = data.eventData;
    var selectedObjects = adaptedObjects;
    _.forEach( selectedObjects, function( selected ) {
        var eadPara = selected.props.ead_paragraph;
        var updFlag = false;
        if( eadPara ) {
            var vmos = [];
            var prop = {};
            var idx = 0;
            prop.key = eadPara.propertyDescriptor.displayName;
            _.forEach( eventData.viewModelObjects, function( vmo, index ) {
                if( vmo.modelType.typeHierarchyArray.indexOf( ITAR_LICENSE ) !== -1 &&
                     !vmo.cellProperties[ prop.key ] ) {
                    updFlag = true;
                    var licenselist = selected.props.license_list;
                    idx = getLicenseIndexToBeUpdated( licenselist, vmo, index );
                    if( !_.isEmpty( eadPara.dbValues ) ) {
                        prop.value = eadPara.dbValues[ idx ];
                    } else {
                        prop.value = '';
                    }
                    vmo.cellProperties[ prop.key ] = prop;
                }
                vmos.push( _.cloneDeep( vmo ) );
            } );
            if( updFlag ) {
                if( detachFlag ) {
                    data.dataProviders.getDetachableLicense.update( vmos, vmos.length );
                } else {
                    data.dataProviders.getAttachedLicense.update( vmos, vmos.length );
                }
            }
        }
    } );
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
function removeFromSelectedLicenses( data, vmo ) {
    data.selectedLicensesUid.splice( vmo.uid, 1 );
    var viewModelObjects = data.dataProviders.selectedLicenses.viewModelCollection.loadedVMObjects;
    var selectedObjects = _.clone( viewModelObjects );

    var modelObjects = $.grep( selectedObjects, function( object ) {
        return object.uid !== vmo.uid;
    } );

    data.dataProviders.selectedLicenses.update( modelObjects );
    return modelObjects;
}

/**
  * Prepares the SOA input for the projects to assign
  *
  * @param {viewModelObject} data - json object
  * @param {ViewModelObject} vmo- selected project
  */
function removeFromAvailableLicenses( data, vmo ) {
    if( !data.selectedLicensesUid ) {
        data.selectedLicensesUid = [];
    }
    data.selectedLicensesUid.push( vmo.uid );
    var viewModelObjects = data.dataProviders.availableLicenses.viewModelCollection.loadedVMObjects;
    var availModelObjects = _.clone( viewModelObjects );

    var modelObjects = $.grep( availModelObjects, function( object ) {
        return object.uid !== vmo.uid;
    } );

    data.dataProviders.availableLicenses.update( modelObjects );
}

/**
  * Update the data providers Remove License cell command initiate the call for this function. Function removes the
  * selected license from the selected project list and assign the license back to the available list. It also apply
  * the filter if required
  *
  * @param {viewModelObject} data - json object
  * @param {ViewModelObject} vmo- selected project
  *
  */
export let addToAvailableLicenses = function( data, vmo ) {
    removeFromSelectedLicenses( data, vmo );
    var viewModelObjectsAvailList = data.dataProviders.availableLicenses.viewModelCollection.loadedVMObjects;
    var updateAvailableList = _.clone( viewModelObjectsAvailList );
    updateAvailableList.push( vmo );
    data.dataProviders.availableLicenses.update( updateAvailableList, updateAvailableList.length );
};

/**
  * Update the data providers Assign Project cell command initiate the call for this function. Function removes the
  * selected project from the available project list and assign the project back to the member project list.
  *
  * @param {viewModelObject} data - json object
  * @param {ViewModelObject} vmo - selected project
  */
export let addToSelectedLicenses = function( data, vmo ) {
    removeFromAvailableLicenses( data, vmo );
    var viewModelObjectsMemberList = data.dataProviders.selectedLicenses.viewModelCollection.loadedVMObjects;
    var updateMemberList = _.clone( viewModelObjectsMemberList );
    var itarMode = data.itarEditMode;
    updateMemberList.push( vmo );
    data.dataProviders.selectedLicenses.update( updateMemberList, updateMemberList.length );
    if( vmo.modelType.typeHierarchyArray.indexOf( ITAR_LICENSE ) !== -1 ) {
        vmo.activeView = 'Awp0AttachLicense';
        itarMode = true;
    }
    return {
        selected: false,
        itarEditMode: itarMode
    };
};

/**
  * Load auth para on selected objects
  *
  * @param {object} attributes to load
  * @param {object} objects to update
  *
  */
export let loadAuthPara = function( attributes, objects ) {
    var uids = [];
    _.forEach( objects, function( o ) {
        uids.push( o.uid );
    } );
    return dmSvc.getProperties( uids, attributes );
};

const updateSharedDataState = function( state, newValue ) {
    let stateValue = { ...state.value };
    stateValue = Object.assign( stateValue, newValue );
    state.update( stateValue );
};

export let getAdaptedObjects = function( sourceObjects ) {
    var adaptedObjects = [];
    adaptedObjects = adapterService.getAdaptedObjectsSync( sourceObjects );
    return adaptedObjects;
};

exports = {
    initialize,
    populateDetachList,
    getSelectedLicenseNameAndAuthPara,
    getSelectedLicensesforAttach,
    getSelectedLicensesforDetach,
    getSelectedLicensesforEdit,
    checkSelected,
    updateLicenses,
    addToAvailableLicenses,
    addToSelectedLicenses,
    loadAuthPara,
    updateSharedDataState,
    getAdaptedObjects
};
export default exports;
