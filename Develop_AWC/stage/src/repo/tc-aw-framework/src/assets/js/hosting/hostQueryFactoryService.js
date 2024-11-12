// Copyright (c) 2022 Siemens

/**
 * Service to assist in creating and sending {HostQueryMessage} objects.
 *
 * @module js/hosting/hostQueryFactoryService
 * @namespace hostQueryFactoryService
 */
import _ from 'lodash';
import logger from 'js/logger';

/**
 * Generate a unique id to identify the message
 *
 * @return {String} generated message id.
 */
function _generateMessageId() {
    // Use timestamp string as message id
    return 'MsgId_' + Date.now();
}

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostQueryData
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Represents a single READ-ONLY data object in a host query.  The data objects consist of multiple
 * key/value data fields.
 *
 * @constructor
 * @memberof hostQueryFactoryService
 *
 * @param {StringToObjectMap} fields - (Optional) The initial fieldKey-to-field map.
 */
var HostQueryData = function( fields ) {
    /**
     * {StringToObjectMap} Map of all data fields.
     */
    this.dataFields = fields ? fields : {};
};

/**
 * Get the data for a given field.
 *
 * @function getField
 * @memberof hostQueryFactoryService.HostQueryData
 *
 * @param {String} fieldKey - Key to get data for.
 *
 * @return {Object} Data associated with the field.
 */
HostQueryData.prototype.getField = function( fieldKey ) {
    return _.get( this.dataFields, fieldKey, null );
};

/**
 * Check if the data object contains a field with the given key
 *
 * @function hasField
 * @memberof hostQueryFactoryService.HostQueryData
 *
 * @param {String} fieldKey - Key to check for.
 *
 * @return {Boolean} TRUE if field with the key exists, FALSE otherwise.
 */
HostQueryData.prototype.hasField = function( fieldKey ) {
    return this.dataFields.hasOwnProperty( fieldKey );
};

/**
 * Returns a reference to the current 'dataFields' map.
 *
 * @function getDataFields
 * @memberof hostQueryFactoryService.HostQueryData
 *
 * @returns {StringToObjectMap} A map of all data fields.
 */
HostQueryData.prototype.getDataFields = function() {
    return this.dataFields;
};

/**
 * Set the data for a given field.
 *
 * @function _addField
 * @memberof hostQueryFactoryService.HostQueryData
 *
 * @private
 *
 * @param {String} fieldKey - Key to set data for.
 * @param {Object} value - Data associated with the field.
 */
HostQueryData.prototype._addField = function( fieldKey, value ) {
    this.dataFields[ fieldKey ] = value;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostQueryEditableData
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Represents a single READ/WRITE data object in a host query. The data objects consist of multiple
 * key/value data fields.
 *
 * @constructor
 * @memberof hostQueryFactoryService
 *
 * @param {StringToObjectMap} fields - (Optional) The initial fieldKey-to-field map.
 */
var HostQueryEditableData = function( fields ) {
    HostQueryData.call( this, fields );
};

HostQueryEditableData.prototype = Object.create( HostQueryData.prototype );

/**
 * Set the data for a given field.
 *
 * @function setData
 * @memberof hostQueryFactoryService.HostQueryEditableData
 *
 * @param {String} fieldKey - Key to set data for.
 * @param {Object} value - Data associated with the field.
 */
HostQueryEditableData.prototype.setData = function( fieldKey, value ) {
    this._addField( fieldKey, value );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostQueryMessage
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Represents a single READ-ONLY data object in a host query. The data objects consist of multiple key/value
 * data fields.
 *
 * @constructor
 * @memberof hostQueryFactoryService
 *
 * @param {String} queryId - Identifier for the query.
 * @param {String} messageId - Message ID.
 * @param {Boolean} isResponseMessage - TRUE if this a response message.
 * @param {HostQueryDataArray} hostQueryDataArray - (Optional) Array of {HostQueryData} to set into the
 * returned Object.
 */
var HostQueryMessage = function( queryId, messageId, isResponseMessage, hostQueryDataArray ) {
    this.queryId = queryId;
    this.messageId = messageId;
    this.isResponseMessage = isResponseMessage;

    this.queryData = hostQueryDataArray ? hostQueryDataArray : [];
};

/**
 * Get the ID of the query.
 *
 * @function getQueryId
 * @memberof hostQueryFactoryService.HostQueryMessage
 *
 * @return {String} ID of the query.
 */
HostQueryMessage.prototype.getQueryId = function() {
    return _.get( this, 'queryId', null );
};

/**
 * Get the unique ID for this message.
 *
 * @function getMessageId
 * @memberof hostQueryFactoryService.HostQueryMessage
 *
 * @return {String} The unique ID for this message.
 */
HostQueryMessage.prototype.getMessageId = function() {
    return _.get( this, 'messageId', null );
};

/**
 * Get all the {HostQueryData} associated with this message.
 *
 * @function getData
 * @memberof hostQueryFactoryService.HostQueryMessage
 *
 * @return {HostQueryDataArray} Array of {HostQueryData} associated with this message.
 */
HostQueryMessage.prototype.getData = function() {
    return _.get( this, 'queryData', null );
};

/**
 * Get all the {HostQueryData} associated with this message.
 *
 * @function getData
 * @memberof hostQueryFactoryService.HostQueryMessage
 *
 * @return {Boolean} TRUE if this a response message.
 */
HostQueryMessage.prototype.isResponseMessage = function() {
    return _.get( this, 'isResponseMessage', false );
};

/**
 * Add a data object to the query message
 *
 * @function _addField
 * @memberof hostQueryFactoryService.HostQueryData
 *
 * @private
 *
 * @param {HostQueryData} hostQueryData - The {HostQueryData} to add.
 */
HostQueryMessage.prototype._addData = function( hostQueryData ) {
    this.queryData.push( hostQueryData );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostQueryEditableMessage
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Represents a single READ/WRITE data object in a host query. The data objects consist of multiple
 * key/value data fields.
 *
 * @constructor
 * @memberof hostQueryFactoryService
 *
 * @param {StringToObjectMap} fields - (Optional) The initial fieldKey-to-field map.
 */
var HostQueryEditableMessage = function( fields ) {
    HostQueryMessage.call( this, fields );
};

HostQueryEditableMessage.prototype = Object.create( HostQueryMessage.prototype );

/**
 * Add a data object to the query message.
 *
 * @function addData
 * @memberof hostQueryFactoryService.HostQueryEditableMessage
 *
 * @param {HostQueryData} hostQueryData - The {HostQueryData} to add.
 */
HostQueryEditableMessage.prototype.addData = function( hostQueryData ) {
    this._addData( hostQueryData );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostQueryModelObject
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Represents a single READ-ONLY data object in a host query.  The data objects consist of multiple
 * key/value data fields.
 *
 * @constructor
 * @memberof hostQueryFactoryService
 *
 * @param {String} uid - UID of the IModelObject.
 * @param {String} type - The type of the IModelObject.
 */
var HostQueryModelObject = function( uid, type ) {
    /**
     * {StringToObjectMap} Map of all data fields.
     */
    this.objectUid = uid;
    this.objectType = type;

    /**
     * Get current value.
     *
     * @returns {String} UID of the IModelObject.
     */
    this.getObjectUid = function() {
        return this.objectUid;
    };

    /**
     * Get current value.
     *
     * @returns {String} The type of the IModelObject.
     */
    this.getObjectType = function() {
        return this.objectType;
    };
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// HostQueryHandler
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Interface for handling an incomming query from the 'host'.
 *
 * @constructor
 * @memberof hostQueryFactoryService
 */
var HostQueryHandler = function() {
    //
};

/**
 * Handle an incomming query from the 'host'.
 *
 * @param {HostQueryMessage} inputMessage - The input message from the 'host'.
 *
 * @return {HostQueryMessage} The {HostQueryMessage} to send back to 'host' containing any details resulting
 * from handling the query.
 */
HostQueryHandler.prototype.handleQuery = function( inputMessage ) {
    logger.warn( 'HostQueryHandler.handleQuery: (Default) inputMessage: ' + inputMessage.getQueryId() );

    return null;
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Return a new instance of this class.
 *
 * @memberof hostQueryFactoryService
 *
 * @param {StringToObjectMap} fields - (Optional) The initial fieldKey-to-field map.
 *
 * @returns {HostQueryData} New initialized instance of this class.
 */
export let createData = function( fields ) {
    return new HostQueryData( fields );
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostQueryFactoryService
 *
 * @param {StringToObjectMap} fields - (Optional) The initial fieldKey-to-field map.
 *
 * @returns {HostQueryEditableData} New initialized instance of this class.
 */
export let createEditableData = function( fields ) {
    return new HostQueryEditableData( fields );
};

/**
 * Return a new instance of this class.
 *
 * @constructor
 * @memberof hostQueryFactoryService
 *
 * @param {String} queryId - Identifier for the query.
 * @param {String} messageId - Message ID.
 * @param {Boolean} isResponseMessage - TRUE if this a response message.
 * @param {HostQueryDataArray} hostQueryDataArray - (Optional) Array of {HostQueryData} to set into the
 * returned Object.
 *
 * @returns {HostQueryMessage} New initialized instance of this class.
 */
export let createMessage = function( queryId, messageId, isResponseMessage, hostQueryDataArray ) {
    return new HostQueryMessage( queryId, messageId, isResponseMessage, hostQueryDataArray );
};

/**
 * Convert the given JSON encoded string into a new {HostQueryMessage} Object.
 *
 * @param {String} jsonData - Data in JSON encoded format.
 *
 * @returns {HostQueryMessage} New object.
 */
export let createMessageFromJSON = function( jsonData ) {
    var msg = exports.createMessage();

    if( jsonData ) {
        var parsedObj = JSON.parse( jsonData );

        _.assign( msg, parsedObj );
    }

    return msg;
};

/**
 * Return a new instance of this class.
 * <P>
 * Note: The 'messageId' property will be set with a generated unique ID.
 *
 * @constructor
 * @memberof hostQueryFactoryService
 *
 * @param {String} queryId - Identifier for the query.
 * @param {HostQueryDataArray} hostQueryDataArray - (Optional) Array of {HostQueryData} to set into the
 * returned Object.
 *
 * @returns {HostQueryMessage} New initialized instance of this class.
 */
export let createMessageWithID = function( queryId, hostQueryDataArray ) {
    return exports.createMessage( queryId, _generateMessageId(), false, hostQueryDataArray );
};

/**
 * Create a query response from the given {HostQueryMessage}.
 *
 * @constructor
 * @memberof hostQueryFactoryService
 *
 * @param {HostQueryMessage} hostQueryMessage - The {HostQueryMessage} to use as the basis of Identifiers
 * for the return {HostQueryMessage}.
 *
 * @param {HostQueryDataArray} hostQueryDataArray - Array of {HostQueryData} to set into the returned
 * Object.
 *
 * @returns {HostQueryMessage} New initialized instance of this class.
 */
export let createResponseMessage = function( hostQueryMessage, hostQueryDataArray ) {
    if( !_.isEmpty( hostQueryMessage ) ) {
        return new HostQueryMessage( hostQueryMessage.queryId, hostQueryMessage.messageId, true,
            hostQueryDataArray );
    }

    return null;
};

/**
 * Return a new instance of this class.
 *
 * @constructor
 * @memberof hostQueryFactoryService
 *
 * @param {String} queryId - Identifier for the query.
 * @param {String} messageId - Message ID.
 * @param {Boolean} isResponseMessage - TRUE if this a response message.
 * @param {HostQueryDataArray} hostQueryDataArray - (Optional) Array of {HostQueryData} to set into the
 * returned Object.
 *
 * @returns {HostQueryEditableMessage} New initialized instance of this class.
 */
export let createEditableMessage = function( queryId, messageId, isResponseMessage, hostQueryDataArray ) {
    return new HostQueryEditableMessage( queryId, messageId, isResponseMessage, hostQueryDataArray );
};

/**
 * Return a new instance of this class.
 *
 * @constructor
 * @memberof hostQueryFactoryService
 *
 * @param {String} uid - UID of the IModelObject.
 * @param {String} type - The type of the IModelObject.
 *
 * @returns {HostQueryModelObject} New initialized instance of this class.
 */
export let createModelObject = function( uid, type ) {
    return new HostQueryModelObject( uid, type );
};

/**
 * Return new prototype based on {HostQueryHandler}.
 *
 * @memberof hostQueryFactoryService
 *
 * @return {Prototype} A new prototype based on the {HostQueryHandler} class.
 */
export let extendHandler = function() {
    return Object.create( HostQueryHandler.prototype );
};

/**
 * Return {HostQueryHandler} class constructor function.
 *
 * @memberof hostQueryFactoryService
 *
 * @return {HostQueryHandler} The {HostQueryHandler} class constructor function.
 */
export let getHandler = function() {
    return HostQueryHandler;
};

export default exports = {
    createData,
    createEditableData,
    createMessage,
    createMessageFromJSON,
    createMessageWithID,
    createResponseMessage,
    createEditableMessage,
    createModelObject,
    extendHandler,
    getHandler
};
