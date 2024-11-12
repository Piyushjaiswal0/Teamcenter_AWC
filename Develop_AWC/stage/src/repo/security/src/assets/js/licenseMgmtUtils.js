// Copyright (c) 2022 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/licenseMgmtUtils
 */
import appCtxSvc from 'js/appCtxService';
import tcSesnD from 'js/TcSessionData';
import _ from 'lodash';
import localeSvc from 'js/localeService';

var exports = {};
var _sublocationContext;
var _licenseTypes = [];

var resource = 'SecurityMessages';
var localTextBundle = localeSvc.getLoadedText( resource );

export let getAvailableLicenseTypeList = function( response, data ) {
    var filters = _licenseTypes;
    if( _licenseTypes.length === 0 ) {
        // Create the list model object that will be displayed
        for( var i = 0; i < response.licensesOutput.availableLicenseTypes.length; i++ ) {
            var internalValue = response.licensesOutput.availableLicenseTypes[ i ].internalValue;
            filters.push( {
                propDisplayValue: response.licensesOutput.availableLicenseTypes[ i ].displayValue,
                dispValue: response.licensesOutput.availableLicenseTypes[ i ].displayValue,
                propInternalValue: internalValue
            } );
        }
        _licenseTypes = filters;
    }
    data.availableLicenseTypes = _licenseTypes;
    return data.availableLicenseTypes;
};

export let getFilterLicenseType = function( data ) {
    if( data.licenseType.uiValue === localTextBundle.AllLicenses ) {
        return '';
    }
    return data.licenseType.uiValue;
};

/**
 * Populate revision type values
 *
 *
 * @returns {ObjectArray} The array of child node objects to be displayed.
 */
export let getTypeOption = function( data ) {
    var option;
    var revision;
    if( data.applyToRawList && data.applyToRawList.length > 0 ) {
        if( data.applyToAttach ) {
            revision = data.applyToAttach.dbValue ? data.applyToRawList[ 0 ].internalValue :
                data.applyToRawList[ 1 ].internalValue;
        } else if( data.applyToDetach ) {
            revision = data.applyToDetach.dbValue ? data.applyToRawList[ 0 ].internalValue :
                data.applyToRawList[ 1 ].internalValue;
        }
        option = parseInt( revision );
    }
    return option;
};

/**
 * set/update the context object
 *
 * @param {Array} memberProjects - the project list already assigned to the selected objects
 * @param {Array} selObjects - the selected objects
 */
export let getContext = function() {
    _sublocationContext = appCtxSvc.getCtx( 'locationContext' );
};

/**
 * Check the context of the selected object
 *
 * @return {Boolean} True in case of ACE
 *
 */

export let isACEContext = function() {
    exports.getContext();
    if( _sublocationContext[ 'ActiveWorkspace:SubLocation' ] === 'com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation' ) {
        return true;
    }
    return false;
};
/**
 * Check the context of the selected object
 *
 * @return {Boolean} True in case of ACE
 *
 */

export let getDepth = function( data ) {
    var value = -1;
    if( !data.structure.dbValue ) {
        value = data.level.dbValue;
    }
    return value;
};

/**
 * Prepares the SOA input for the objects to assign
 *
 * @param {viewModelObject} data - json object
 *
 * @return {Array} Array of owning object from which the projects needs to be assigned
 *
 *
 */
export let objectsToAssign = function( data ) {
    var objectsToAssign = [];
    objectsToAssign = data.subPanelContext.license.adaptedObjects;
    return objectsToAssign;
};

/**
 * Prepares the SOA input for the objects to assign
 *
 * @param {viewModelObject} data - json object
 *
 * @return {Array} Array of owning object from which the projects needs to be assigned
 *
 *
 */
export let licensesToAssign = function() {
    var licensesToAssign = [];
    licensesToAssign = _.clone( appCtxSvc.getCtx( 'mselected' ) );
    return licensesToAssign;
};
/**
 * Returns the variant rule attached to top level object
 *
 * @return {Object} variant rule
 *
 */
export let getVariantRule = function() {
    var occMgmnt = appCtxSvc.getCtx( 'occmgmtContext' );
    var variantRule = occMgmnt.productContextInfo.props.awb0CurrentVariantRule.dbValues[ 0 ];

    return {
        uid: variantRule,
        type: 'UnknownType'
    };
};

/**
 * Returns the revision rule attached to top level object
 *
 * @return {Object} revision rule
 *
 */
export let getRevisionRule = function() {
    var occMgmnt = appCtxSvc.getCtx( 'occmgmtContext' );
    var revRule = occMgmnt.productContextInfo.props.awb0CurrentRevRule.dbValues[ 0 ];

    return {
        uid: revRule,
        type: 'UnknownType'
    };
};
/**
 * Returns the Root Level Object
 *
 * @return {Object} Root Object
 *
 */
export let getRootObject = function() {
    var occMgmnt = appCtxSvc.getCtx( 'occmgmtContext' );
    var rootObjUID = occMgmnt.productContextInfo.props.awb0Product.dbValues[ 0 ];

    return {
        uid: rootObjUID,
        type: 'UnknownType'
    };
};

/**
 * Create input for the SOA structure in ACE context
 *
 * @return {object} structure for root object when no object is selected in ACE context
 *
 */
var rootObjectACEInput = function( selectedObject, data, attachFlag ) {
    var licenseObject = {
        selectedLicenses: data.licenseName,
        objects: selectedObject,
        eadParagraph: data.authPara
    };
    var eachACEObject = {
        contextInfo: {
            selectedTopLevelObject: exports.getRootObject(),
            variantRule: exports.getVariantRule(),
            revisionRule: exports.getRevisionRule(),
            typeOption: exports.getTypeOption( data ),
            depth: exports.getDepth( data )
        }
    };
    if( attachFlag ) {
        eachACEObject.attachLicenseDetails = licenseObject;
    } else {
        eachACEObject.detachLicenseDetails = licenseObject;
    }
    return eachACEObject;
};

/**
 * Checks the TC version and returns the boolean <br>
 * Used before calling SOA to ensure if context should contain selectedTopLevelObject
 *
 * @return true if supported TC version
 */
export let isSupportedTCVersion = function() {
    var tcMajor = tcSesnD.getTCMajorVersion();
    var tcMinor = tcSesnD.getTCMinorVersion();

    if( tcMajor === 11 && tcMinor >= 4 || tcMajor >= 12 ) {
        return true;
    }
    return false;
};

/**
 * Create input for the SOA structure in ACE context
 *
 * @return {object} structure for each selected object in non ACE context
 *
 */
var eachObjectInMultiSelectInput = function( selectedObject, data, isACE, attachFlag ) {
    var contextInfoObject = data.typeOption !== undefined ? selectedObject : '';

    var object = exports.isSupportedTCVersion() ? selectedObject : contextInfoObject;

    var contextInfo = {
        selectedTopLevelObject: object,
        variantRule: isACE ? exports.getVariantRule() : '',
        revisionRule: isACE ? exports.getRevisionRule() : '',
        typeOption: data.typeOption,
        depth: isACE ? exports.getDepth( data ) : ''
    };
    var licenseObject = {
        selectedLicenses: data.licenseName,
        objects: [ selectedObject ],
        eadParagraph: data.authPara
    };
    var eachObject = {
        contextInfo: contextInfo
    };
    if( attachFlag ) {
        eachObject.attachLicenseDetails = licenseObject;
    } else {
        eachObject.detachLicenseDetails = licenseObject;
    }

    return eachObject;
};

/**
 * Create contextinput for the SOA
 *
 * @return {Array} Array of Objects
 *
 */
export let attachDetachInput = function( data, attachFlag ) {
    exports.getContext();
    var selectedObjects = exports.objectsToAssign( data );
    var isACE = exports.isACEContext();
    data.typeOption = exports.getTypeOption( data );

    var attachOrDetachInput = [];
    var licenseObject = {};
    var size = selectedObjects.length;
    if( size > 0 ) {
        _.forEach( selectedObjects, function( object ) {
            licenseObject = eachObjectInMultiSelectInput( object, data, isACE, attachFlag );
            attachOrDetachInput.push( licenseObject );
        } );
    } else {
        if( isACE ) {
            licenseObject = rootObjectACEInput( selectedObjects, data, attachFlag );
            attachOrDetachInput.push( licenseObject );
        }
    }
    return attachOrDetachInput;
};
/**
 * Create contextinput for the SOA
 *
 * @return {Array} Array of Objects
 *
 */
export let attachInput = function( data ) {
    return exports.attachDetachInput( data, true );
};

/**
 * Create contextinput for the SOA
 *
 * @return {Array} Array of Objects
 *
 */
export let detachInput = function( data ) {
    var licenses = data.subPanelContext.sharedData.licenses;
    data.applyToRawList = licenses.applyToRawList;
    data.entireBOM = licenses.entireBOM;
    return exports.attachDetachInput( data, false );
};

/**
 * This API is added to form the message string from the Partial error being thrown from the SOA
 */
var getMessageString = function( messages, msgObj ) {
    _.forEach( messages, function( object ) {
        if( msgObj.msg.length > 0 ) {
            msgObj.msg += '<BR/>';
        }
        msgObj.msg += object.message;
        msgObj.level = _.max( [ msgObj.level, object.level ] );
    } );
};

export let processPartialErrors = function( serviceData ) {
    var msgObj = {
        msg: '',
        level: 0
    };
    if( serviceData.partialErrors ) {
        getMessageString( serviceData.partialErrors[ 0 ].errorValues, msgObj );
    }

    return msgObj.msg;
};

exports = {
    getAvailableLicenseTypeList,
    getFilterLicenseType,
    getTypeOption,
    getContext,
    isACEContext,
    getDepth,
    objectsToAssign,
    licensesToAssign,
    getVariantRule,
    getRevisionRule,
    getRootObject,
    isSupportedTCVersion,
    attachDetachInput,
    attachInput,
    detachInput,
    processPartialErrors
};
export default exports;
