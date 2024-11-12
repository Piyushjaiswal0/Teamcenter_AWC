/* eslint-disable max-lines */
// @<COPYRIGHT>@
// ==================================================
// Copyright 2022.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Module for the Import Excel
 *
 * @module js/ExcelImport
 */
import app from 'app';
import browserUtils from 'js/browserUtils';
import msgSvc from 'js/messagingService';
import appCtxService from 'js/appCtxService';
import AwHttpService from 'js/awHttpService';
import AwPromiseService from 'js/awPromiseService';


var exports = {};

export let importOptions = function( conflict ) {
    var importOptions = [];
    importOptions.push( 'RoundTripImport' );
    if ( conflict.dbValue ) {
        importOptions.push( 'overWrite' );
    }
    return importOptions;
};

export let getOccurrenceId = function( updatedRevIds ) {
    if( updatedRevIds ) {
        var div = [];
        var objects = [];
        for( var i = 0; i < updatedRevIds.length; i++ ) {
            div[i] = document.querySelector( 'div[revisionId="' + updatedRevIds[i]  + '"]' );
            if( div[i] !== null ) {
                objects.push( {
                    uid:div[i].id } );
            }
        }
        return objects;
    }
};

export let getFmsTicket = function( subPanelContext ) {
    var fileSelData = subPanelContext.uploadFileSelectionData;
    if( fileSelData ) {
        var selectedFile = fileSelData.selectedFile;
        if( selectedFile ) {
            var conflict = selectedFile.projectId;
        }
    }
};

export let getUploadFileMicroServiceURL = function() {
    return browserUtils.getBaseURL() + 'sd/xccshare/uploadFileToFMS';
};

/**
 *
 * @param {Object} fileSelData - VMO
 * @returns {Object} - Import REST API Body
 */
export let getCreateRequestJSONForImport = function( fileSelData ) {
    var selectedFile = fileSelData.selectedFile;
    var projectId = selectedFile.projectId;
    var projectName = selectedFile.projectName;

    var urn = selectedFile.urn;
    var fileName = selectedFile.Title; //user selected file from Xcc


    var userSession = appCtxService.getCtx( 'userSession' );
    var userId = userSession.props.user_id.dbValue;
    var groupId = userSession.props.group_name.dbValue;

    /* beautify preserve:start */

    return '{' +
        '"zeusFileInfo": {' +
        '"project": "' + projectId + '",' +
        '"projectName": "' + projectName + '",' +
        '"name": "' + fileName + '",' +
        '"urn": "' + urn + '",' +
        '"length": -1' +
        '},' +
        '"fileName": "' + fileName + '",' +
        '"userId":"' + userId + '",' +
        '"groupId": "' + groupId + '"' +
        '}';
    /* beautify preserve:end */
};

export let xcUploadFileToFMS = function( addReqInp ) {
    var $http = AwHttpService.instance;
    var deferred = AwPromiseService.instance.defer();

    var postPromise = $http.post( getUploadFileMicroServiceURL(), addReqInp, {
        headers: {
            'Content-Type': 'application/json'
        }
    } );

    if( postPromise ) {
        postPromise.then( function( response ) {
            handleSuccessResponse( response );
            var respData = response.data;
            var ticket = respData.ticket;
            appCtxService.registerCtx( 'importFmsTicket', ticket );
            deferred.resolve( {
                fmsTicket: ticket
            } );
        }, function( err ) {
            handleFailedResponse( err );
            deferred.reject( 'Internal error occurred during operation. Contact your administrator' );
        } );
    }
    return deferred.promise;
};

/**
 * handle the failed error message thrown by micro services
 * @param {Object} err -VMO
 */
export let handleFailedResponse = function( err ) {
    var errResponse = err.response;

    if ( errResponse && errResponse.data ) {
        if ( errResponse.data.message ) {
            msgSvc.showError( errResponse.data.message );
        } else if ( errResponse.data.partialErrors && errResponse.data.partialErrors.length > 0
            && errResponse.data.partialErrors[0].errorValues && errResponse.data.partialErrors[0].errorValues.length > 0 ) {
            msgSvc.showError( errResponse.data.partialErrors[0].errorValues[0].message );
        } else if ( errResponse.data instanceof String ) {
            msgSvc.showError( errResponse.data );
        } else {
            msgSvc.showError( 'Internal error occurred during operation. Contact your administrator' );
        }
    } else {
        msgSvc.showError( 'Internal error occurred during operation. Contact your administrator' );
    }
};

/**
 * handle the sucess/failed message thrown by micro services
 * @param {Object} response -VMO
 */
export let handleSuccessResponse = function( response ) {
    var respData = response.data;
    if ( respData.message && respData.message.isError ) {
        var msg = respData.message.reason;
        if ( respData.message.isError === 'true' ) {
            msgSvc.showError( msg );
        } else {
            msgSvc.showInfo( msg );
        }
    }
};


export default exports = {
    importOptions,
    getOccurrenceId,
    getFmsTicket,
    handleFailedResponse,
    handleSuccessResponse,
    getCreateRequestJSONForImport,
    xcUploadFileToFMS
};
/**
 * Arm0ImportFromExcel panel service utility
 *
 * @memberof NgServices
 * @member Arm0ImportFromExcel
 */
app.factory( 'Arm0ImportFromExcel', () => exports );
