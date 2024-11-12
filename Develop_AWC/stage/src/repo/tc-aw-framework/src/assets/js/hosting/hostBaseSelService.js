// Copyright (c) 2022 Siemens

/**
 * This module defines the classes, services
 *
 * @module js/hosting/hostBaseSelService
 * @namespace hostBaseSelService
 */
import _ from 'lodash';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// ISelectionTypeHandler
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Interface to process selection objects of a particular type.
 *
 * @constructor
 * @memberof hostBaseSelService
 */
var ISelectionTypeHandler = function() {
    Object.call( this );
};

ISelectionTypeHandler.prototype = Object.create( Object.prototype );

/**
 * Process list of selection objects which are passed in as strings. Implementer is responsible for parsing the
 * string as the correct object type and announcing the selection to the application.
 *
 * @function processObjects
 * @memberof hostBaseSelService.ISelectionTypeHandler
 *
 * @param {StringArray} objects - list of JSON encoded selection objects
 *
 * @param {ISelectionObjectParser} parser - Parser that knows how to parse the string objects.
 *
 * @param {Number} selectionTime - Time the selection arrived from the host.
 */
ISelectionTypeHandler.prototype.processObjects = function( objects, parser, selectionTime ) { // eslint-disable-line no-unused-vars
    //
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// ISelectionObjectParser
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Interface to parse selection objects of a particular type.
 *
 * @constructor
 * @memberof hostBaseSelService
 */
var ISelectionObjectParser = function() {
    Object.call( this );

    this._props = {};
};

ISelectionObjectParser.prototype = Object.create( Object.prototype );

/**
 * Process list of selection objects which are passed in as strings. Implementer is responsible for parsing the
 * string as the correct object type and announcing the selection to the application.
 *
 * @function parse
 * @memberof hostBaseSelService.ISelectionObjectParser
 *
 * @param {String} object - object to parse
 *
 * @return {ParsedSelectionObject} parsed object
 */
ISelectionObjectParser.prototype.parse = function( object ) { // eslint-disable-line no-unused-vars
    return {};
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// ParsedSelectionObject
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Create a new instance of this class.
 *
 * @constructor
 *
 * @param {String} jsonData - (Optional) JSON encoded ref to an Object.
 */
var ParsedSelectionObject = function( jsonData ) {
    Object.call( this );

    this._props = {};

    if( jsonData ) {
        _.assign( this._props, JSON.parse( jsonData ) );
    }
};

ParsedSelectionObject.prototype = Object.create( Object.prototype );

/**
 * Get current property value
 *
 * @function getValue
 * @memberof hostBaseSelService.ParsedSelectionObject
 *
 * @param {String} key - key to lookup
 *
 * @return {Object} value of property associated with key
 */
ParsedSelectionObject.prototype.getValue = function( key ) {
    return this._props[ key ];
};

/**
 * Get current property value
 *
 * @function getValue
 * @memberof hostBaseSelService.ParsedSelectionObject
 *
 * @param {String} key - Key to set.
 * @param {Object} value - Value to set.
 */
ParsedSelectionObject.prototype.setValue = function( key, value ) {
    this._props[ key ] = value;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Collection of constants to make things easier to change and understand
 */

/**
 * {String} Database ID
 *
 * @memberof hostBaseSelService
 */
export let DATABASE_ID = 'databaseId';

/**
 * {String} Object Type
 *
 * @memberof hostBaseSelService
 */
export let OBJECT_TYPE = 'objectType';

/**
 * Filename
 *
 * @memberof hostBaseSelService
 */
export let FILENAME = 'filename';

/**
 * Object ID
 *
 * @memberof hostBaseSelService
 */
export let OBJECT_ID = 'objectId';

/**
 * Object ID (as in InteropObjectRef)
 *
 * @memberof hostBaseSelService
 */
export let OBJ_ID = 'ObjId';

/**
 * Return new prototype based on {ISelectionTypeHandler}.
 *
 * @memberof hostBaseSelService
 *
 * @return {Prototype} A new prototype based on the {ISelectionTypeHandler} class.
 */
export let extendBaseSelectionTypeHandler = function() {
    return Object.create( ISelectionTypeHandler.prototype );
};

/**
 * Return {ISelectionTypeHandler} class constructor function.
 *
 * @memberof hostBaseSelService
 *
 * @return {ClassObject} The the constructor function for the {ISelectionTypeHandler} class.
 */
export let getBaseSelectionTypeHandler = function() {
    return ISelectionTypeHandler;
};

/**
 * Return new prototype based on {ISelectionObjectParser}.
 *
 * @memberof hostBaseSelService
 *
 * @return {Prototype} A new prototype based on the {ISelectionObjectParser} class.
 */
export let extendBaseSelectionObjectParser = function() {
    return Object.create( ISelectionObjectParser.prototype );
};

/**
 * Return {ISelectionObjectParser} class constructor function.
 *
 * @memberof hostBaseSelService
 *
 * @return {ClassObject} The the constructor function for the {ISelectionObjectParser} class.
 */
export let getBaseSelectionObjectParser = function() {
    return ISelectionObjectParser;
};

/**
 * Return new prototype based on {ParsedSelectionObject}.
 *
 * @memberof hostBaseSelService
 *
 * @return {Prototype} A new prototype based on the {ISelectionObjectParser} class.
 */
export let extendParsedSelectionObject = function() {
    return Object.create( ParsedSelectionObject.prototype );
};

/**
 * Return {ParsedSelectionObject} class constructor function.
 *
 * @memberof hostBaseSelService
 *
 * @return {ClassObject} The the constructor function for the {ParsedSelectionObject} class.
 */
export let getParsedSelectionObject = function() {
    return ParsedSelectionObject;
};

/**
 * Create and populated new instance.
 *
 * @memberof hostBaseSelService
 *
 * @param {String} object - JSON encoded object reference.
 *
 * @returns {ParsedSelectionObject} New instance populated based on the given input.
 */
export let createParsedSelectionObject = function( object ) {
    return new ParsedSelectionObject( object );
};

export default exports = {
    DATABASE_ID,
    OBJECT_TYPE,
    FILENAME,
    OBJECT_ID,
    OBJ_ID,
    extendBaseSelectionTypeHandler,
    getBaseSelectionTypeHandler,
    extendBaseSelectionObjectParser,
    getBaseSelectionObjectParser,
    extendParsedSelectionObject,
    getParsedSelectionObject,
    createParsedSelectionObject
};
