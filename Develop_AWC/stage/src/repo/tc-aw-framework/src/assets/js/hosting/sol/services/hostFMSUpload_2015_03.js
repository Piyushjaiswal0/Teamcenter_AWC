// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostFMSUpload_2015_03
 * @namespace hostFMSUpload_2015_03
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import hostServices from 'js/hosting/hostConst_Services';
import fmsUtils from 'js/fmsUtils';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// FMSUploadProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostFMSUpload_2015_03
 * @extends hostFactoryService.BaseCallableService
 */
var FMSUploadProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_FMS_UPLOAD,
        hostServices.VERSION_2015_03 );
};

FMSUploadProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Process outgoing 'event' type call to the host.
 *
 * @function fireHostEvent
 * @memberof hostFMSUpload_2015_03.FMSUploadProxy
 *
 * @param {FMSUploadMsg} inputData - Data object who's properties define data {in whatever
 * form the implementation is expecting) to process into a call to the host-side service.
 */
FMSUploadProxy.prototype.fireHostEvent = function( inputData ) {
    var payload = JSON.stringify( inputData );

    this._invokeHostEvent( payload );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// FMSUploadMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends the open request info to the host via {@link FMSUploadProxy}.
 * <P>
 * The message has a list of targets to be opened. Representation is similar to the selection service
 * contract.
 *
 * @constructor
 * @memberof hostFMSUpload_2015_03
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} payload - (Optional) String from the 'host' to use when initializing the message object.
 */
var FMSUploadMsg = function( payload ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2015_03 );

    if( payload ) {
        _.assign( this, JSON.parse( payload ) );
    }
};

FMSUploadMsg.prototype = hostFactorySvc.extendDataContract();

/**
 * Get current value.
 *
 * @memberof hostFMSUpload_2015_03.FMSUploadMsg
 *
 * @return {String} Operation property value.
 */
FMSUploadMsg.prototype.getUid = function() {
    return _.get( this, 'Uid', null );
};

/**
 * Set currrent value.
 *
 * @memberof hostFMSUpload_2015_03.FMSUploadMsg
 *
 * @param {String} value - Operation property value.
 */
FMSUploadMsg.prototype.setUid = function( value ) {
    this.Uid = value;
};

/**
 * Get the generated URL for the file ticket operation.
 *
 * @memberof hostFMSUpload_2015_03.FMSUploadMsg
 *
 * @return {String} Targets property value.
 */
FMSUploadMsg.prototype.getURL = function() {
    return _.get( this, 'URL', null );
};

/**
 * Set the generated URL for the file ticket operation
 *
 * @memberof hostFMSUpload_2015_03.FMSUploadMsg
 *
 * @param {String} value - Targets property value.
 */
FMSUploadMsg.prototype.setURL = function( value ) {
    this.URL = value;
};

/**
 * Get the filename for the operation.
 *
 * @memberof hostFMSUpload_2015_03.FMSUploadMsg
 *
 * @return {String} Targets property value.
 */
FMSUploadMsg.prototype.getFilename = function() {
    return _.get( this, 'Filename', null );
};

/**
 * Set the filename for the operation.
 *
 * @memberof hostFMSUpload_2015_03.FMSUploadMsg
 *
 * @param {String} value - Property value.
 */
FMSUploadMsg.prototype.setFilename = function( value ) {
    this.Filename = value;
};

/**
 * Get the FMS ticket.
 *
 * @memberof hostFMSUpload_2015_03.FMSUploadMsg
 *
 * @return {String} Property value.
 */
FMSUploadMsg.prototype.getTicket = function() {
    return _.get( this, 'Ticket', null );
};

/**
 * Set the FMS ticket.
 *
 * @memberof hostFMSUpload_2015_03.FMSUploadMsg
 *
 * @param {String} value - Targets property value.
 */
FMSUploadMsg.prototype.setTicket = function( value ) {
    this.Ticket = value;
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
 * @memberof hostFMSUpload_2015_03
 *
 * @returns {FMSUploadProxy} New instance of the service message API object.
 */
export let createFMSUploadProxy = function() {
    return new FMSUploadProxy();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostFMSUpload_2015_03
 *
 * @param {String} payload - (Optional) JSON encoded String to use when initializing the message object.
 *
 * @returns {FMSUploadMsg} New instance of the service message object.
 */
export let createFMSUploadMsg = function( payload ) {
    return new FMSUploadMsg( payload );
};

// ---------------------------------------------------------------------------------

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostFMSUpload_2015_03
 */
export let registerHostingModule = function() {
    eventBus.subscribe( 'hosting.fmsupload', function( eventData ) {
        var msg = exports.createFMSUploadMsg();

        msg.setUid( eventData.uid );
        msg.setTicket( eventData.ticket );
        msg.setFilename( eventData.filename );
        msg.setURL( fmsUtils.getFMSFullUploadUrl() );

        exports.createFMSUploadProxy().fireHostEvent( msg );
    } );
};

export default exports = {
    createFMSUploadProxy,
    createFMSUploadMsg,
    registerHostingModule
};
