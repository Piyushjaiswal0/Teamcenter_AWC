// Copyright (c) 2022 Siemens

/**
 * @module js/cutUtils
 */
import appCtxService from 'js/appCtxService';
import adapterSvc from 'js/adapterService';
import soaSvc from 'soa/kernel/soaService';
import _ from 'lodash';
import cdm from 'soa/kernel/clientDataModel';

var exports = {};

/**
 * populate cut relation input data
 *
 * @return {input} input data of cut relation
 */
export let cutInputs = function( isConfRevContext ) {
    var input = [];
    var relationInfo;
    var inputData = {};
    if( !isConfRevContext ) {
        for( var i = 0; i < appCtxService.ctx.relationContext.relationInfo.length; i++ ) {
            relationInfo = appCtxService.ctx.relationContext.relationInfo[ i ];
            inputData = {
                parentObj: relationInfo.primaryObject,
                childrenObj: [ relationInfo.secondaryObject ],
                propertyName: relationInfo.relationType
            };
            input.push( inputData );
        }
    } else {
        for( var j = 0; j < appCtxService.ctx.relationContext.relationInfo.length; j++ ) {
            relationInfo = appCtxService.ctx.relationContext.relationInfo[ j ];
            if( isObjectAConfiguredRev( relationInfo.secondaryObject ) ) {
                inputData = {
                    parentObj: relationInfo.primaryObject,
                    childrenObj: [ relationInfo.secondaryObject ],
                    propertyName: relationInfo.relationType
                };
                input.push( inputData );
            }
        }
    }
    return input;
};

/**
 * Invokes unlinkAndDeleteObjects operation
 * @param {OBJECTARRAY } selectedObjects - user selected objects
 * @param {Boolean } isConfRevContextApplied - is Configured Revision context applied
 * @return promise of soaSvc.postUnchecked function
 */
export let executePerformUnlinkDelete = function( selectedObjects, isConfRevContextApplied ) {
    var soaInputs = [];
    soaInputs.push( {
        deleteInput: exports.unlinkAndDeleteInputs( selectedObjects, isConfRevContextApplied )
    } );
    return soaSvc.postUnchecked( 'Core-2019-06-DataManagement', 'unlinkAndDeleteObjects',
        soaInputs[ 0 ] ).then(
        function( response ) {
            return response;
        },
        function( error ) {
            var errMsg = error.message;
            if( error && error.cause && error.cause.status === 500 ) {
                errMsg = 'ServiceUnavailable';
            }
            return errMsg;
        }
    );
};

/**
 * Private function to check if the object is a configured revision
 * @param {OBJECT } sourceObj - object to be deleted
 * @return {Boolean} bool - boolean value
 */
let isObjectAConfiguredRev = function( sourceObj ) {
    let bool = false;
    if( sourceObj && sourceObj.props && sourceObj.props.awp0ConfiguredRevision && sourceObj.props.awp0ConfiguredRevision.dbValues[ 0 ] === '' ) {
        bool = true;
    }
    return bool;
};

/**
 * Private function to check if the object is a configured revision
 * @param {OBJECT } response - object to be deleted
 * @return {Number} number of deleted objects
 */

export let getDeleteObjectsPartialErrors = function( response ) {
    let errorDetails = {
        totalSelected: appCtxService.getCtx( 'mselected' ).length,
        totalRemainToDelete: appCtxService.getCtx( 'mselected' ).length
    };
    if ( response.partialErrors ) {
        errorDetails.message = '';
        _.forEach( response.partialErrors, function( partialError ) {
            _.forEach( partialError.errorValues, function( object ) {
                errorDetails.message += '<BR/>';
                errorDetails.message += object.message;
            } );
        } );
    }
    if ( response && response.deleted ) {
        let relnCtx = appCtxService.ctx.relationContext;
        let mSel = appCtxService.ctx.mselected;
        let notdeleted = mSel && mSel.filter( x => !response.deleted.includes( x.uid ) );
        let relationInfo = relnCtx && relnCtx.relationInfo && relnCtx.relationInfo.filter( x => !response.deleted.includes( x.secondaryObject.uid ) );
        //We have to attempt cut on remaining objects hence update mselected
        appCtxService.updateCtx( 'mselected', notdeleted );
        appCtxService.updateCtx( 'relationContext', { relationInfo } );
        errorDetails.totalRemainToDelete =  notdeleted.length;
    }

    return errorDetails;
};

/**
 * Private function to prepare SOA input for objects other than configured revisions
 * @param {OBJECT } relationInfoObj - relation info object from context
 * @return {OBJECT} deleteInput - input structure
 */
let inputStructForRegularObjs = function( relationInfoObj ) {
    var deleteInput = {};
    if( relationInfoObj ) {
        var selectedObjects = [];
        let containerInput = relationInfoObj.primaryObject ? relationInfoObj.primaryObject : '';
        let propertyInput = relationInfoObj.relationType ? relationInfoObj.relationType : '';
        selectedObjects.push( relationInfoObj.secondaryObject ? relationInfoObj.secondaryObject : '' );
        let unlinkAlwaysInput = false;
        deleteInput = {
            container: containerInput,
            objectsToDelete: selectedObjects,
            property: propertyInput,
            unlinkAlways: unlinkAlwaysInput
        };
    }
    return deleteInput;
};

/**
 * Private function to prepare SOA input for objects which are configured revisions
 * @param {OBJECT } relationInfoObj - relation info object from context
 * @return {OBJECT} deleteInput - input structure
 */
let inputStructForConfRevs = function( relationInfoObj ) {
    var deleteInput = {};
    if( relationInfoObj ) {
        var selectedObjects = [];
        let containerInput = '';
        let propertyInput = '';
        selectedObjects.push( relationInfoObj.secondaryObject ? relationInfoObj.secondaryObject : '' );
        let unlinkAlwaysInput = false;
        deleteInput = {
            container: containerInput,
            objectsToDelete: selectedObjects,
            property: propertyInput,
            unlinkAlways: unlinkAlwaysInput
        };
    }
    return deleteInput;
};

/**
 * populate unlinkAndDelete input data
 * @param {OBJECTARRAY } selectedObjects - user selected objects
 * @param {Boolean} isConfRevContextApplied - is Configured Revision context applied
 * @return {input} input data of unlink and delete object
 */
export let unlinkAndDeleteInputs = function( selectedObjects, isConfRevContextApplied ) {
    var input = [];
    var containerInput = '';
    var propertyInput = '';
    var deleteInput = {};
    var unlinkAlwaysInput = false;
    var tempInput = [];
    if( appCtxService.ctx && appCtxService.ctx.relationContext && appCtxService.ctx.relationContext.relationInfo &&
        appCtxService.ctx.relationContext.relationInfo.length > 0 ) {
        for( var i = 0; i < appCtxService.ctx.relationContext.relationInfo.length; i++ ) {
            var relationInfo = appCtxService.ctx.relationContext.relationInfo[ i ];
            if( isConfRevContextApplied && isObjectAConfiguredRev( relationInfo.secondaryObject ) ) {
                deleteInput = inputStructForConfRevs( relationInfo );
                tempInput.push( deleteInput );
            } else {
                deleteInput = inputStructForRegularObjs( relationInfo );
                tempInput.push( deleteInput );
            }
        }
    } else {
        deleteInput = {
            container: containerInput,
            objectsToDelete: selectedObjects,
            property: propertyInput,
            unlinkAlways: unlinkAlwaysInput
        };
        tempInput.push( deleteInput );
    }

    input = Array.from( tempInput );
    return input;
};

/**
 * get underlying BO for relatedModified
 *
 * @return {input} adapted object
 */
export let adaptedRelatedModifiedInput = function() {
    return adapterSvc.getAdaptedObjectsSync( [ appCtxService.ctx.pselected ] );
};

export let getRemoveFileInputs = function( selectionData, datasetTypesWithDefaultRelInfo ) {
    let input = {};
    if( selectionData.selected ) {
        let selectedObject = selectionData.selected[ 0 ];
        let selectedObj = adapterSvc.getAdaptedObjectsSync( [ selectedObject ] );

        let datasetUid = appCtxService.ctx.selected.uid;
        let dataset = cdm.getObject( datasetUid );
        input.dataset = { uid: dataset.uid, type: dataset.type };

        let outputArray = datasetTypesWithDefaultRelInfo;
        let referenceObj;
        if( outputArray ) {
            _.forEach( outputArray, function( entry ) {
                let datasetTypeObj = cdm.getObject( entry.datasetType.uid );
                let dobj = _.get( datasetTypeObj, 'props.object_string' );
                //when input value into LOV directly, datasetType.dbValue.props will be undefined
                let dtObjStrVals = _.get( dataset.type, 'dbValue.props.object_string.dbValues' );
                let dtObjStrVal = '';
                if( dtObjStrVals && _.isArray( dtObjStrVals ) ) {
                    dtObjStrVal = dtObjStrVals[ 0 ];
                } else {
                    dtObjStrVal = dataset.type;
                }
                if( dobj.dbValues[ 0 ] === dtObjStrVal ) {
                    referenceObj = entry.refInfos;
                }
            } );
        }

        let fileUids = [];
        fileUids.push( { targetObject: { uid: selectedObj[ 0 ].uid, type: selectedObj[ 0 ].type }, type: referenceObj[ 0 ].referenceName, deleteTarget: true } );
        input.nrInfo = fileUids;
        input.createNewDatasetVersion = true;
    }
    return [ input ];
};
export default exports = {
    cutInputs,
    getDeleteObjectsPartialErrors,
    executePerformUnlinkDelete,
    unlinkAndDeleteInputs,
    adaptedRelatedModifiedInput,
    getRemoveFileInputs
};
