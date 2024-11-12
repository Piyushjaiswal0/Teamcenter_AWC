// Copyright (c) 2022 Siemens

/**
 * This module defines the basic classes used by the {hostObjectRefService} and various extentions to create and process
 * {InteropObjectRef} Objects.
 *
 * @module js/hosting/hostBaseRefService
 * @namespace hostBaseRefService
 */
import hostConfigSvc from 'js/hosting/hostConfigService';
import _ from 'lodash';
import hostConfigKeys from 'js/hosting/hostConst_ConfigKeys';
import hostUtils from 'js/hosting/hostUtils';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// IInteropObjectRefEncoder
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Interface for encoders that create {IInteropEncodedObject} objects.
 * <P>
 * Encoded interop object that corresponds to the _2014_02 InteropObjRef type.
 *
 * @constructor
 * @memberof hostBaseRefService
 */
var IInteropObjectRefEncoder = function() {
    Object.call( this );
};

IInteropObjectRefEncoder.prototype = Object.create( Object.prototype );

/**
 * Create an empty {IInteropEncodedObject} (with no properties set).
 *
 * @function createEmptyEncodedObject
 * @memberof hostBaseRefService.IInteropObjectRefEncoder
 *
 * @return {IInteropEncodedObject} Newly created object.
 */
IInteropObjectRefEncoder.prototype.createEmptyEncodedObject = function() {
    return {};
};

/**
 * Check if this {IInteropObjectRefEncoder} supports the given object.
 *
 * @function isObjectSupported
 * @memberof hostBaseRefService.IInteropObjectRefEncoder
 *
 * @param {Object} object - Object to check (e.g. An {IModelObject}).
 *
 * @return {Boolran} true if supported.
 */
IInteropObjectRefEncoder.prototype.isObjectSupported = function( object ) { // eslint-disable-line no-unused-vars
    return false;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// IInteropObjectRefEncoder -> IInteropEncodedObject
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Interface representing an encoded {InteropObjectRef}. Encoders can set properties on it and convert it
 * back into an {InteropObjectRef}.
 *
 * @constructor
 * @memberof hostBaseRefService
 */
var IInteropEncodedObject = function() {
    Object.call( this );
};

IInteropEncodedObject.prototype = Object.create( Object.prototype );

/**
 * Set property value.
 *
 * @function setProperty
 * @memberof hostBaseRefService.IInteropEncodedObject
 *
 * @param {String} propName - ...
 * @param {Object} value - ...
 */
IInteropEncodedObject.prototype.setProperty = function( propName, value ) { // eslint-disable-line no-unused-vars
};

/**
 * Convert this encoded object to an interop object.
 *
 * @function toInteropObject
 * @memberof hostBaseRefService.IInteropEncodedObject
 *
 * @return {InteropObjectRef} interop object
 */
IInteropEncodedObject.prototype.toInteropObject = function() {
    return {};
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// IInteropObjectTypeFactory
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Interface representing a factory object to produce an {IInteropEncodedObject}. Encoders can set
 * properties on it and convert it into an interop obect.
 *
 * @constructor
 * @memberof hostBaseRefService
 */
var IInteropObjectTypeFactory = function() {
    Object.call( this );
};

IInteropObjectTypeFactory.prototype = Object.create( Object.prototype );

/**
 * Given an {IModelObject} and an {IInteropObjectRefEncoder} generates an array of {InteropObjectRef} from
 * the model object.
 *
 * @function createInteropObjectRef
 * @memberof hostBaseRefService.IInteropObjectTypeFactory
 *
 * @param {IModelObject} modelObject - Model object to create interop object reference from
 * @param {IInteropObjectRefEncoder} objEncoder - The object ref encoder to use.
 *
 * @return {InteropObjectRefArray} Array of interop object refs.
 */
IInteropObjectTypeFactory.prototype.createInteropObjectRef = function( modelObject, objEncoder ) { //eslint-disable-line no-unused-vars
    return [];
};

/**
 * Does this factory support the given type of object.
 *
 * @function isObjectSupported
 * @memberof hostBaseRefService.IInteropObjectTypeFactory
 *
 * @param {Object} object - Object to check.
 *
 * @return {Boolean} TRUE if supported.
 */
IInteropObjectTypeFactory.prototype.isObjectSupported = function( object ) { //eslint-disable-line no-unused-vars
    return false;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// InteropObjectRef_2014_02
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Represents an object reference that we can marshal across the hosting interop boundary
 * <P>
 * Note: Changes to this definition MUST BE coordinated with the master service contract definition.
 *
 * @constructor
 * @memberof hostBaseRefService
 *
 * @param {String} dbId - database Id.
 * @param {String} objId - unique object Id.
 * @param {String} objType - object type.
 */
var InteropObjectRef_2014_02 = function( dbId, objId, objType ) {
    this.DBId = dbId || '';
    this.ObjId = objId || '';
    this.ObjType = objType || '';

    /**
     * Get property value.
     *
     * @return {String} DBId property value.
     */
    this.getDBId = function() {
        return _.get( this, 'DBId', null );
    };

    /**
     * Get property value.
     *
     * @return {String} ObjId property value.
     */
    this.getObjId = function() {
        return _.get( this, 'ObjId', null );
    };

    /**
     * Get property value.
     *
     * @return {String} ObjType property value.
     */
    this.getObjType = function() {
        return _.get( this, 'ObjType', null );
    };

    /**
     * Set property value.
     *
     * @param {String} id - DBId property value.
     */
    this.setDBId = function( id ) {
        this.DBId = id;
    };

    /**
     * Set property value.
     *
     * @param {String} id - ObjId property value.
     */
    this.setObjId = function( id ) {
        this.ObjId = id;
    };

    /**
     * Set property value.
     *
     * @param {String} type - ObjType property value.
     */
    this.setObjType = function( type ) {
        this.ObjType = type;
    };
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// InteropObjectRef_2014_10
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Represents an object reference that we can marshal across the hosting interop boundary
 * <P>
 * Note: Changes to this definition MUST BE coordinated with the master service contract definition.
 *
 * @constructor
 * @memberof hostBaseRefService
 *
 * @param {String} data - The data about the object.
 * @param {String} type - The type of data in the object
 */
var InteropObjectRef_2014_10 = function( data, type ) {
    this.Data = data;
    this.Type = type;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// BaseInteropObjectRefEncoder
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Base implementation of the IInteropObjectRefEncoder interface
 *
 * @constructor
 * @memberof hostBaseRefService
 * @extends hostBaseRefService.IInteropObjectRefEncoder
 */
var BaseInteropObjectRefEncoder = function() {
    IInteropObjectRefEncoder.call( this );
};

BaseInteropObjectRefEncoder.prototype = Object.create( IInteropObjectRefEncoder.prototype );

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// BaseInteropObjectRefEncoder -> BaseInteropEncodedObject
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Base implementation of the {IInteropEncodedObject} interface.
 *
 * @constructor
 * @memberof hostBaseRefService
 */
var BaseInteropEncodedObject = function() {
    IInteropEncodedObject.call( this );
};

BaseInteropEncodedObject.prototype = Object.create( IInteropEncodedObject.prototype );

/**
 * Convert this encoded object to an interop object.
 *
 * @function toInteropObject
 * @memberof hostBaseRefService.BaseInteropEncodedObject
 *
 * @return {InteropObjectRef} interop object
 */
BaseInteropEncodedObject.prototype.toInteropObject = function() {
    var use_2014_02_Encoding = hostConfigSvc.getOption( hostConfigKeys.USE_2014_07_SOA );

    return new InteropObjectRef_2014_10(
        hostUtils.encodeEmbeddedJson( this.getData(), use_2014_02_Encoding ), this.getType() );
};

/**
 * Get property value.
 *
 * @function getData
 * @memberof hostBaseRefService.BaseInteropEncodedObject
 *
 * @returns {String} JSON representation of the dataObject.
 */
BaseInteropEncodedObject.prototype.getData = function() {
    return null;
};

/**
 * Get property value.
 *
 * @function getDataObject
 * @memberof hostBaseRefService.BaseInteropEncodedObject
 *
 * @returns {InteropObjectRef} New instance of the {InteropObjectRef} represented by this encoded ref.
 */
BaseInteropEncodedObject.prototype.getDataObject = function() {
    return null;
};

/**
 * Get property value.
 *
 * @function getType
 * @memberof hostBaseRefService.BaseInteropEncodedObject
 *
 * @returns {String} The type of encoded ref.
 */
BaseInteropEncodedObject.prototype.getType = function() {
    return null;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * {String} A 'default' type selection.
 *
 * @memberof hostBaseRefService
 * */
export let DEFAULT_TYPE = 'DEFAULT';

/**
 * {String} UID object type selection.
 *
 * @memberof hostBaseRefService
 * */
export let UID_TYPE = 'UID';

/**
 * Filename type selection.
 *
 * @memberof hostBaseRefService
 */
export let FILENAME_TYPE = 'Filename';

/**
 * Occurrence Object Type _2014_10 version selection.
 *
 * @memberof hostBaseRefService
 */
export let OCCURRENCE_TYPE = 'Occurrence';

/**
 * Occurrence Object Type _2015_10 version selection.
 *
 * @memberof hostBaseRefService
 */
export let OCCURRENCE2_TYPE = 'Occurrence2';

/**
 * Architecture Object Type _2015_10 version selection.
 *
 * @memberof hostBaseRefService
 */
export let ARCHITECTURE_TYPE = 'Architecture';

/**
 * Object w/Context _2014_10 version selection.
 *
 * @memberof hostBaseRefService
 */
export let CONTEXT_OBJECT_TYPE = 'ContextObject';

/**
 * Create new {IInteropEncodedObject}.
 *
 * @memberof hostBaseRefService
 *
 * @return {IInteropEncodedObject} New instance.
 */
export let createEmptyEncodedObject = function() {
    return new IInteropEncodedObject();
};

/**
 * Create new {InteropObjectRef} (2014_02 version).
 *
 * @memberof hostBaseRefService
 *
 * @param {String} dbId - Database Id.
 * @param {String} objId - Unique object Id.
 * @param {String} objType - Object type.
 *
 * @return {IInteropEncodedObject} New instance initialized with given info.
 */
export let createBasicObjectRef = function( dbId, objId, objType ) {
    return new InteropObjectRef_2014_02( dbId, objId, objType );
};

/**
 * Create new {InteropObjectRef} (2014_10 version).
 *
 * @memberof hostBaseRefService
 *
 * @param {String} data - The data about the object.
 * @param {String} type - The type of data in the object
 *
 * @return {IInteropEncodedObject} New instance initialized with given info.
 */
export let createAdvancedObjectRef = function( data, type ) {
    return new InteropObjectRef_2014_10( data, type );
};

/**
 * Return new prototype based on {BaseInteropObjectRefEncoder}.
 *
 * @memberof hostBaseRefService
 *
 * @return {Prototype} A new prototype based on the {BaseInteropObjectRefEncoder} class.
 */
export let extendBaseEncodedObject = function() {
    return Object.create( BaseInteropEncodedObject.prototype );
};

/**
 * Return {BaseInteropObjectRefEncoder} class constructor function.
 *
 * @memberof hostBaseRefService
 *
 * @return {ClassObject} The the constructor function for the {BaseInteropObjectRefEncoder} class.
 */
export let getBaseEncodedObject = function() {
    return BaseInteropEncodedObject;
};

/**
 * Return new prototype based on {BaseInteropObjectRefEncoder}.
 *
 * @memberof hostBaseRefService
 *
 * @return {Prototype} A new prototype based on the {BaseInteropObjectRefEncoder} class.
 */
export let extendBaseObjectRefEncoder = function() {
    return Object.create( BaseInteropObjectRefEncoder.prototype );
};

/**
 * Return {BaseInteropObjectRefEncoder} class constructor function.
 *
 * @memberof hostBaseRefService
 *
 * @return {ClassObject} The the constructor function for the {BaseInteropObjectRefEncoder} class.
 */
export let getBaseObjectRefEncoder = function() {
    return BaseInteropObjectRefEncoder;
};

/**
 * Return new prototype based on {IInteropObjectTypeFactory}.
 *
 * @memberof hostBaseRefService
 *
 * @return {Prototype} A new prototype based on the {IInteropObjectTypeFactory} class.
 */
export let extendBaseObjectTypeFactory = function() {
    return Object.create( IInteropObjectTypeFactory.prototype );
};

/**
 * Return {IInteropObjectTypeFactory} class constructor function.
 *
 * @memberof hostBaseRefService
 *
 * @return {ClassObject} The the constructor function for the {IInteropObjectTypeFactory} class.
 */
export let getBaseObjectTypeFactory = function() {
    return IInteropObjectTypeFactory;
};

export default exports = {
    DEFAULT_TYPE,
    UID_TYPE,
    FILENAME_TYPE,
    OCCURRENCE_TYPE,
    OCCURRENCE2_TYPE,
    ARCHITECTURE_TYPE,
    CONTEXT_OBJECT_TYPE,
    createEmptyEncodedObject,
    createBasicObjectRef,
    createAdvancedObjectRef,
    extendBaseEncodedObject,
    getBaseEncodedObject,
    extendBaseObjectRefEncoder,
    getBaseObjectRefEncoder,
    extendBaseObjectTypeFactory,
    getBaseObjectTypeFactory
};
