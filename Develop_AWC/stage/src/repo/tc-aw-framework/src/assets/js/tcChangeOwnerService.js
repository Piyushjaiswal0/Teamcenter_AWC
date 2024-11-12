// Copyright (c) 2022 Siemens

/**
 * @module js/tcChangeOwnerService
 */
import adapterSvc from 'js/adapterService';
import _ from 'lodash';

var exports = {};

/**
 * Do the changeOwnership call to transfer the owner
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {selectedObjects} selectedObjects - selected objects
 * @param {Object} dataProvider - The data provider that will be used to get the correct content
 *
 */
export let getChangeOwnerInput = function( data, selectedObjects, selectedUserObject ) {
    // Check if selectedUserObject is null or undefined then no need to process further
    // and return from here
    if( !selectedUserObject ) {
        return;
    }

    var soaInput = [];
    var groupCriteria = {};
    var objectCriteria = {};
    var ownerCriteria = {};
    var inputCriteria = {};


    if( selectedUserObject && selectedUserObject.props && selectedUserObject.props.user ) {
        ownerCriteria = {
            uid: selectedUserObject.props.user.dbValues[ 0 ],
            type: 'User'
        };
    }

    if( selectedUserObject && selectedUserObject.props && selectedUserObject.props.group ) {
        groupCriteria = {
            uid: selectedUserObject.props.group.dbValues[ 0 ],
            type: 'Group'
        };
    }

    var adaptedObjects = [];
    adaptedObjects = adapterSvc.getAdaptedObjectsSync( selectedObjects );

    if( adaptedObjects && adaptedObjects.length > 0 ) {
        _.forEach( adaptedObjects, function( adaptedObject ) {
            if( adaptedObject && adaptedObject.uid && adaptedObject.type ) {
                objectCriteria = {
                    uid: adaptedObject.uid,
                    type: adaptedObject.type
                };
            }

            inputCriteria = {
                group: groupCriteria,
                object: objectCriteria,
                owner: ownerCriteria
            };

            soaInput.push( inputCriteria );
        } );
    }
    return soaInput;
};

export default exports = {
    getChangeOwnerInput
};
