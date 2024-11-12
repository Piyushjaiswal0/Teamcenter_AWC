// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/bootstrap/services/hostObjectRef_2014_10
 * @namespace hostObjectRef_2014_10
 */
import AwStateService from 'js/awStateService';
import appCtxSvc from 'js/appCtxService';
import hostBaseRefSvc from 'js/hosting/hostBaseRefService';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import _ from 'lodash';

/**
 * @returns {IModelObject} The IModelObject to use as the 'context' or 'undefined'
 */
function _getValidContextObject( inputObject ) {
    if( !_.isEmpty( inputObject ) && ( cmm.isInstanceOf( 'Fnd0TempAppSession', inputObject.modelType ) || cmm.isInstanceOf( 'Fnd0AppSession', inputObject.modelType ) ) ) {
        if( appCtxSvc.ctx.occmgmtContext ) {
            var productContextInfo = appCtxSvc.ctx.occmgmtContext.productContextInfo;
            if( productContextInfo ) {
                return productContextInfo;
            }
        }
    } else {
        var obj;

        if( !_.isEmpty( appCtxSvc.ctx.pselected ) ) {
            obj = appCtxSvc.ctx.pselected;
            if( cmm.isInstanceOf( 'Awb0Element', obj.modelType ) &&
                obj.props.awb0UnderlyingObject ) {
                var revObjectUid = obj.props.awb0UnderlyingObject.dbValues[ 0 ];
                if( revObjectUid ) {
                    var revObject = cdm.getObject( revObjectUid );
                    obj = revObject;
                }
            }
        } else if( AwStateService.instance.params.uid ) {
            obj = cdm.getObject( AwStateService.instance.params.uid );
        }

        if( obj ) {
            if( cmm.isInstanceOf( 'ItemRevision', obj.modelType ) ) {
                return obj;
            }
        }
    }
}

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// ContextInteropObjectEncoder
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Create new instance of an {IInteropObjectRefEncoder} used to encode simple IModelObjects into
 * {InteropObjectRef} (2014_10).
 *
 * @constructor
 * @memberof hostObjectRef_2014_10
 * @extends  hostBaseRefService.BaseInteropObjectRefEncoder
 */
var ContextInteropObjectEncoder = function() {
    hostBaseRefSvc.getBaseObjectRefEncoder().call( this );
};

ContextInteropObjectEncoder.prototype = hostBaseRefSvc.extendBaseObjectRefEncoder();

/**
 * Create an empty IInteropEncodedObject (with no properties set).
 *
 * @function createEmptyEncodedObject
 * @memberof hostObjectRef_2014_10.ContextInteropObjectEncoder
 *
 * @return {IInteropEncodedObject} Newly created object.
 */
ContextInteropObjectEncoder.prototype.createEmptyEncodedObject = function() {
    return new ContextInteropEncodedObject();
};

/**
 * Check if this IInteropObjectRefEncoder supports the given object.
 *
 * @function isObjectSupported
 * @memberof hostObjectRef_2014_10.ContextInteropObjectEncoder
 *
 * @param {Object} object - Object to check (e.g. An IModelObject).
 *
 * @return {Boolran} true if supported.
 */
ContextInteropObjectEncoder.prototype.isObjectSupported = function( object ) {
    var isObjectTypeSupported = cmm.isInstanceOf( 'Dataset', object.modelType ) || cmm.isInstanceOf( 'Fnd0TempAppSession', object.modelType ) || cmm.isInstanceOf( 'Fnd0AppSession', object.modelType );
    return isObjectTypeSupported && _getValidContextObject( object );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// ContextInteropObjectEncoder -> ContextInteropEncodedObject
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Interface representing an encoded interop object. Encoders can set properties on it and convert it into an
 * interop obect.
 *
 * @constructor
 * @memberof hostObjectRef_2014_10
 * @extends  hostBaseRefService.BaseInteropEncodedObject
 */
var ContextInteropEncodedObject = function() {
    hostBaseRefSvc.getBaseEncodedObject().call( this );

    this.params = {};
};

ContextInteropEncodedObject.prototype = hostBaseRefSvc.extendBaseEncodedObject();

/**
 * Set property value.
 *
 * @function setProperty
 * @memberof hostObjectRef_2014_10.ContextInteropEncodedObject
 *
 * @param {String} propName - ...
 * @param {Object} value - ...
 */
ContextInteropEncodedObject.prototype.setProperty = function( propName, value ) {
    this.params[ propName ] = value;
};

/**
 * Get property value.
 *
 * @function getData
 * @memberof hostObjectRef_2014_10.ContextInteropEncodedObject
 *
 * @returns {String} JSON representation of the dataObject.
 */
ContextInteropEncodedObject.prototype.getData = function() {
    return JSON.stringify( this.getDataObject() );
};

/**
 * Get property value.
 *
 * @function getDataObject
 * @memberof hostObjectRef_2014_10.ContextInteropEncodedObject
 *
 * @returns {InteropObjectRef} New instance of the {InteropObjectRef} (version 2014_02) represented by this
 * encoded ref.
 */
ContextInteropEncodedObject.prototype.getDataObject = function() {
    return {
        targetObj: hostBaseRefSvc.createBasicObjectRef( '', this.params.targetUid, this.params.targetType ),
        context: hostBaseRefSvc.createBasicObjectRef( '', this.params.contextUid, this.params.contextType )
    };
};

/**
 * Get property value.
 *
 * @function getType
 * @memberof hostObjectRef_2014_10.ContextInteropEncodedObject
 *
 * @returns {String} The type of encoded ref.
 */
ContextInteropEncodedObject.prototype.getType = function() {
    return hostBaseRefSvc.CONTEXT_OBJECT_TYPE;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// ContextInteropObjectTypeFactory
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Create new instance of an {IInteropObjectTypeFactory} used to encode simple IModelObjects into
 * {InteropObjectRef} (2014_10).
 *
 * @constructor
 * @memberof hostObjectRef_2014_10
 * @extends  hostBaseRefService.IInteropObjectTypeFactory
 */
var ContextInteropObjectTypeFactory = function() {
    hostBaseRefSvc.getBaseObjectTypeFactory().call( this );
};

ContextInteropObjectTypeFactory.prototype = hostBaseRefSvc.extendBaseObjectTypeFactory();

/**
 * Given a model object and an encoder generates a list of InteropObjectRef from the model object.
 *
 * @function createInteropObjectRef
 * @memberof hostObjectRef_2014_10.ContextInteropObjectTypeFactory
 *
 * @param {IModelObject} modelObject - Model object to create interop object reference from
 * @param {IInteropObjectRefEncoder} objEncoder - The object ref encoder to use.
 *
 * @return {InteropObjectRefArray} Array of interop object refs.
 */
ContextInteropObjectTypeFactory.prototype.createInteropObjectRef = function( modelObject, objEncoder ) {
    var encodedObject = objEncoder.createEmptyEncodedObject();

    encodedObject.setProperty( 'targetUid', modelObject.uid );
    encodedObject.setProperty( 'targetType', modelObject.type );

    var obj = _getValidContextObject( modelObject );

    if( obj ) {
        encodedObject.setProperty( 'contextUid', obj.uid );
        encodedObject.setProperty( 'contextType', obj.type );
    }

    return [ encodedObject.toInteropObject() ];
};

/**
 * Does this factory support the given type of object.
 *
 * @function isObjectSupported
 * @memberof hostObjectRef_2014_10.ContextInteropObjectTypeFactory
 *
 * @param {Object} object - Object to check.
 *
 * @return {Boolean} TRUE if supported.
 */
ContextInteropObjectTypeFactory.prototype.isObjectSupported = function( object ) {
    var isObjectTypeSupported = cmm.isInstanceOf( 'Dataset', object.modelType ) || cmm.isInstanceOf( 'Fnd0TempAppSession', object.modelType ) || cmm.isInstanceOf( 'Fnd0AppSession', object.modelType );
    return isObjectTypeSupported && _getValidContextObject( object );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// DefaultInteropObjectEncoder
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Create new instance of an {IInteropObjectRefEncoder} used to encode simple IModelObjects into
 * {InteropObjectRef} (2014_10).
 *
 * @constructor
 * @memberof hostObjectRef_2014_10
 * @extends  hostBaseRefService.BaseInteropObjectRefEncoder
 */
var DefaultInteropObjectEncoder = function() {
    hostBaseRefSvc.getBaseObjectRefEncoder().call( this );
};

DefaultInteropObjectEncoder.prototype = hostBaseRefSvc.extendBaseObjectRefEncoder();

/**
 * Create an empty IInteropEncodedObject (with no properties set).
 *
 * @function createEmptyEncodedObject
 * @memberof hostObjectRef_2014_10.DefaultInteropObjectEncoder
 *
 * @return {IInteropEncodedObject} Newly created object.
 */
DefaultInteropObjectEncoder.prototype.createEmptyEncodedObject = function() {
    return new DefaultInteropEncodedObject();
};

/**
 * Check if this IInteropObjectRefEncoder supports the given object.
 *
 * @function isObjectSupported
 * @memberof hostObjectRef_2014_10.DefaultInteropObjectEncoder
 *
 * @param {Object} object - Object to check (e.g. An IModelObject).
 *
 * @return {Boolran} true if supported.
 */
DefaultInteropObjectEncoder.prototype.isObjectSupported = function( object ) {
    return object.uid && object.type;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// DefaultInteropObjectEncoder -> DefaultInteropEncodedObject
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Interface representing an encoded interop object. Encoders can set properties on it and convert it into an
 * interop obect.
 *
 * @constructor
 * @memberof hostObjectRef_2014_10
 * @extends  hostBaseRefService.BaseInteropEncodedObject
 */
var DefaultInteropEncodedObject = function() {
    hostBaseRefSvc.getBaseEncodedObject().call( this );

    /**
     * Object uid
     *
     * @private
     */
    this._objectId = '';

    /**
     * Object type
     *
     * @private
     */
    this._objectType = '';

    /**
     * Database id
     *
     * @private
     */
    this._databaseId = '';
};

DefaultInteropEncodedObject.prototype = hostBaseRefSvc.extendBaseEncodedObject();

/**
 * Set property value.
 *
 * @function setProperty
 * @memberof hostObjectRef_2014_10.DefaultInteropEncodedObject
 *
 * @param {String} propName - ...
 * @param {Object} value - ...
 */
DefaultInteropEncodedObject.prototype.setProperty = function( propName, value ) {
    if( propName === 'objectId' && value ) {
        this._objectId = value;
    } else if( propName === 'databaseId' && value ) {
        this._databaseId = value;
    } else if( propName === 'objectType' && value ) {
        this._objectType = value;
    }
};

/**
 * Get property value.
 *
 * @function getData
 * @memberof hostObjectRef_2014_10.DefaultInteropEncodedObject
 *
 * @returns {String} JSON representation of the dataObject.
 */
DefaultInteropEncodedObject.prototype.getData = function() {
    return JSON.stringify( this.getDataObject() );
};

/**
 * Get property value.
 *
 * @function getDataObject
 * @memberof hostObjectRef_2014_10.DefaultInteropEncodedObject
 *
 * @returns {InteropObjectRef} New instance of the {InteropObjectRef} (version 2014_02) represented by this
 * encoded ref.
 */
DefaultInteropEncodedObject.prototype.getDataObject = function() {
    return hostBaseRefSvc.createBasicObjectRef( this._databaseId, this._objectId, this._objectType );
};

/**
 * Get property value.
 *
 * @function getType
 * @memberof hostObjectRef_2014_10.DefaultInteropEncodedObject
 *
 * @returns {String} The type of encoded ref.
 */
DefaultInteropEncodedObject.prototype.getType = function() {
    return hostBaseRefSvc.UID_TYPE;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// DefaultInteropObjectTypeFactory
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Create new instance of an {IInteropObjectTypeFactory} used to encode simple IModelObjects into
 * {InteropObjectRef} (2014_10).
 *
 * @constructor
 * @memberof hostObjectRef_2014_10
 * @extends  hostBaseRefService.IInteropObjectTypeFactory
 */
var DefaultInteropObjectTypeFactory = function() {
    hostBaseRefSvc.getBaseObjectTypeFactory().call( this );
};

DefaultInteropObjectTypeFactory.prototype = hostBaseRefSvc.extendBaseObjectTypeFactory();

/**
 * Given a model object and an encoder generates a list of InteropObjectRef from the model object.
 *
 * @function createInteropObjectRef
 * @memberof hostObjectRef_2014_10.DefaultInteropObjectTypeFactory
 *
 * @param {IModelObject} modelObject - Model object to create interop object reference from
 * @param {IInteropObjectRefEncoder} objEncoder - The object ref encoder to use.
 *
 * @return {InteropObjectRefArray} Array of interop object refs.
 */
DefaultInteropObjectTypeFactory.prototype.createInteropObjectRef = function( modelObject, objEncoder ) {
    var encodedObject = objEncoder.createEmptyEncodedObject();

    encodedObject.setProperty( 'objectId', modelObject.uid );
    encodedObject.setProperty( 'objectType', modelObject.type );

    return [ encodedObject.toInteropObject() ];
};

/**
 * Does this factory support the given type of object.
 *
 * @function isObjectSupported
 * @memberof hostObjectRef_2014_10.DefaultInteropObjectTypeFactory
 *
 * @param {Object} object - Object to check.
 *
 * @return {Boolean} TRUE if supported.
 */
DefaultInteropObjectTypeFactory.prototype.isObjectSupported = function( object ) {
    return object.uid && object.type;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Create new IInteropObjectRefEncoder.
 *
 * @memberof hostObjectRef_2014_10
 *
 * @return {IInteropObjectRefEncoder} New instance.
 */
export let createContextObjectEncoder = function() {
    return new ContextInteropObjectEncoder();
};

/**
 * Create new IInteropObjectTypeFactory.
 *
 * @memberof hostObjectRef_2014_10
 *
 * @return {IInteropObjectTypeFactory} New instance.
 */
export let createContextObjectTypeFactory = function() {
    return new ContextInteropObjectTypeFactory();
};

/**
 * Create new IInteropObjectRefEncoder.
 *
 * @memberof hostObjectRef_2014_10
 *
 * @return {IInteropObjectRefEncoder} New instance.
 */
export let createDefaultObjectEncoder = function() {
    return new DefaultInteropObjectEncoder();
};

/**
 * Create new IInteropObjectTypeFactory.
 *
 * @memberof hostObjectRef_2014_10
 *
 * @return {IInteropObjectTypeFactory} New instance.
 */
export let createDefaultObjectTypeFactory = function() {
    return new DefaultInteropObjectTypeFactory();
};

/**
 * Create new {InteropObjectRef_2014_10} instance.
 *
 * @memberof hostObjectRef_2014_10
 *
 * @param {String} data - The data about the object.
 * @param {String} type - The type of data in the object
 *
 * @returns {InteropObjectRef_2014_10} New instance.
 */
export let createObjectRef = function( data, type ) {
    return hostBaseRefSvc.createAdvancedObjectRef( data, type );
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostObjectRef_2014_10
 */
export let registerHostingModule = function() {
    var hostingState = appCtxSvc.ctx.aw_hosting_state;

    hostingState.map_ref_type_to_factory[ hostBaseRefSvc.DEFAULT_TYPE ] = exports.createDefaultObjectTypeFactory();
    hostingState.map_ref_type_to_encoder[ hostBaseRefSvc.DEFAULT_TYPE ] = exports.createDefaultObjectEncoder();

    hostingState.map_ref_type_to_factory[ hostBaseRefSvc.CONTEXT_OBJECT_TYPE ] = exports.createContextObjectTypeFactory();
    hostingState.map_ref_type_to_encoder[ hostBaseRefSvc.CONTEXT_OBJECT_TYPE ] = exports.createContextObjectEncoder();
};

export default exports = {
    createContextObjectEncoder,
    createContextObjectTypeFactory,
    createDefaultObjectEncoder,
    createDefaultObjectTypeFactory,
    createObjectRef,
    registerHostingModule
};
