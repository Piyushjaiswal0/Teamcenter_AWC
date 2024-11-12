// Copyright 2022 Siemens Product Lifecycle Management Software Inc.

/**
 * @module js/Awp0PrintService
 */
import cdm from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import uwPropSvc from 'js/uwPropertyService';
import messagingService from 'js/messagingService';
import _ from 'lodash';
import adapterService from 'js/adapterService';
import commandsMapService from 'js/commandsMapService';

var exports = {};

/**
 * Update the data object from Application Context
 *
 * @return {ObjectArray} data the data object in scope
 */
export let getDatafromAppCtx = function() {
    var selection = appCtxSvc.ctx.mselected;
    var entries = [];

    _.forEach( selection, function( entry ) {
        var selObjects = {
            uid: '',
            type: ''
        };

        var selObj = null;

        selObj = getUnderlyingObject( entry );
        selObjects.uid = selObj.uid;
        selObjects.type = selObj.type;
        entries[ entries.length ] = selObjects;
    } );
    return entries;
};

/**
 * Check if object is runtime object.
 *
 * @param {object} obj - Teamcenter Business object
 * @returns {Boolean} true/false; return true if obj is run time business object.
 */
var isRunTimeObject = function( obj ) {
    if( commandsMapService.isInstanceOf( 'RuntimeBusinessObject', obj.modelType ) ) {
        return true;
    }
    return false;
};

/**
 * Gets the underlying object for the selection. For selection of an occurrence in a BOM, the underlying object is
 * typically an Item Revision object. If there is no underlying object, the selected object is returned.
 *
 * @param {object} ctx - Application Context
 *
 */
var getUnderlyingObject = function( selected ) {
    var underlyingObj = selected;
    if ( selected ) {
        var underlyingObjProp = selected.props.awb0UnderlyingObject;
        if ( !_.isUndefined( underlyingObjProp ) ) {
            underlyingObj = cdm.getObject( underlyingObjProp.dbValues[0] );
        } else if ( isRunTimeObject( selected ) ) {
            var srcObjs = adapterService.getAdaptedObjectsSync( [ selected ] );
            if ( srcObjs !== null && srcObjs.length > 0 ) {
                underlyingObj = srcObjs[0];
            }
        }
    }
    return underlyingObj;
};

export let processAsyncPrint = function( data ) {
    //if it is async report, check and show message
    //further processing not required...
    if( data.isAsync ) {
        messagingService.reportNotyMessage( data, data._internal.messages, 'showAsyncPrintMessage' );
        return;
    }
};

/**
 * Get the print templates from the SOA
 *
 * @return {ObjectArray} data the data object in scope
 */
export let getPrintTemplates = function( response ) {
    var entries = [];
    var outputArray = response.reportdefinitions;
    _.forEach( outputArray, function( entry ) {
        entries.push( entry.reportdefinition );
    } );
    return entries;
};

/**
 * Set the model properties of the view to edit true
 *
 * @return {vmData} view modelProperties data the data object in scope
 */
export let setEditProperties = function( vmData ) {
    _.forEach( vmData.modelInProperty.props, function( vmProperty ) {
        uwPropSvc.setIsEditable( vmProperty, true, true );
    } );
    return { segments: vmData.modelInProperty };
};

/**
 * Get the supportStamp value for the print configuration object
 *
 * @param {vmData} data the data object in scope
 */
export let showStampVis = function( vmData ) {
    if( vmData.supportStampValue && vmData.supportStampValue.modelObjects ) {
        var supportmodel = vmData.supportStampValue.modelObjects;
        var uid = vmData.modelProperty.dma1PrintConfigName.selectedLovEntries[ 0 ].lovRowValue.uid;
        var dobj = _.get( supportmodel, uid );
        var supportStampValue = dobj.props.support_stamp.dbValues[ 0 ];
        vmData.isStamp = supportStampValue === '1';
    }
};

/**
 * Parse string to the integer value
 *
 * @param {object} value - the input object
 */
export let parseString = function( value ) {
    return value && value.toString();
};

/**
 * Method to validate range widget in print panel
 *
 * @param {object} valuetoValidate - the data object
 */
export let validatePrintInputs = function( valuetoValidate ) {
    if( !valuetoValidate.dbValue ) {
        return;
    }
    var pattern = /^(\s*\d+\s*\-\s*\d+\s*,?|\s*\d+\s*,?)+$/g;
    var regRange = new RegExp( pattern );
    if( regRange.test( valuetoValidate.dbValue ) ) {
        return;
    }
    throw new Error( 'validation failed' );
};

/**
 * Create the SOA Input for the getReports. Defect is filed on the docmgmt team to fix the SOA . If it get fix ,
 * this code will get removed.
 */
export let createSOAInput = function() {
    var entries = [];

    var outputArray = exports.getDatafromAppCtx();
    _.forEach( outputArray, function( entry ) {
        var SOAInFormat = {
            clientID: '',
            isBatchPrint: false,
            inputObject: '',
            printInfos: []
        };

        SOAInFormat.inputObject = entry;
        entries.push( SOAInFormat );
    } );
    return entries;
};

export default exports = {
    getDatafromAppCtx,
    processAsyncPrint,
    getPrintTemplates,
    setEditProperties,
    showStampVis,
    parseString,
    validatePrintInputs,
    createSOAInput
};
