// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/sol/services/hostFileTicket_2014_10
 * @namespace hostFileTicket_2014_10
 */
import hostFactorySvc from 'js/hosting/hostFactoryService';
import hostBaseRefSvc from 'js/hosting/hostBaseRefService';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import soaSvc from 'soa/kernel/soaService';
import dms from 'soa/dataManagementService';
import fms from 'soa/fileManagementService';
import messagingSvc from 'js/messagingService';
import _ from 'lodash';
import logger from 'js/logger';
import eventBus from 'js/eventBus';
import fmsUtils from 'js/fmsUtils';
import hostServices from 'js/hosting/hostConst_Services';

/** Operation code to indicate downloading a file on behalf of the host to a specific location */
var DOWNLOAD = 'Download';

/** Operation code to indicate uploading a file on behalf of the host */
var UPLOAD = 'Upload';

/** Operation code to indicate finishing (committing) the attachment of an uploaded file on behalf of the host */
var COMMIT = 'Commit';

/**
 * Send a commit message to the host
 *
 * @param {InteropObjectRef} responseObj - Information on the dataset created by the commit
 * @param {String} ticket - associated fileticket
 * @param {String} filename - associated filename
 */
function _sentCommitMessage( responseObj, ticket, filename ) {
    var msg = exports.createGetTicketMsg();

    msg.setOperationType( COMMIT );
    msg.setRefObject( responseObj );
    msg.setTicket( ticket );
    msg.setFilename( filename );

    exports.createGetTicketResponseProxy().fireHostEvent( msg );
}

/**
 *
 * @param {IModelObject} dataset - Dataset to attach the file to.
 * @param {String} fileName  - Name of the file to attach.
 * @param {Boolean} isText - TRUE if the file is a 'text' (i.e. NOT binary)
 * @param {String} namedReferencedName -
 *
 * @returns {Promise} Resolved with the result of the 'getDatasetWriteTickets' SOA call.
 */
function _getDatasetWriteTickets( dataset, fileName, isText, namedReferencedName ) {
    var soaInput = {
        inputs: [ {
            createNewVersion: true,
            dataset: dataset,
            datasetFileInfos: [ {
                allowReplace: true,
                fileName: fileName,
                isText: isText,
                namedReferencedName: namedReferencedName
            } ]
        } ]
    };

    return soaSvc.postUnchecked( 'Core-2006-03-FileManagement', 'getDatasetWriteTickets', soaInput );
}

/**
 * Create the JS structure for the SOA call.
 *
 * @param {IModelObject} dataset - dataset
 * @param {String} ticket - ticket
 * @param {Boolean} allowReplace - allow replace?
 * @param {String} fileName - file name
 * @param {Boolean} isText - is text?
 * @param {String} namedReferencedName - named referenced name
 *
 * @return {Object} CommitDatasetFileInfos
 */
function _constructCommitDatasetFileInfos( dataset, ticket, allowReplace,
    fileName, isText, namedReferencedName ) {
    return {
        commitInput: [ {
            dataset: dataset,
            createNewVersion: true,
            datasetFileTicketInfos: [ {
                ticket: ticket,
                datasetFileInfo: {
                    allowReplace: allowReplace,
                    fileName: fileName,
                    isText: isText,
                    namedReferencedName: namedReferencedName
                }
            } ]
        } ]
    };
}

/**
 * Gets the write ticket for the dataset we're updating
 *
 * @param {IModelObject} dataset - dataset to be updated
 * @param {DatasetTypeInfo} dsInfo - information about that dataset type
 * @param {String} filename - associated filename
 */
function _getWriteTicket( dataset, dsInfo, filename ) {
    var refInfo = dsInfo.refInfos[ 0 ];

    var namedReferencedName = refInfo.referenceName;

    var isText = refInfo.fileFormat === 'TEXT' || refInfo.fileFormat.toUpperCase() === 'TEXT';

    _getDatasetWriteTickets( dataset, filename, isText, namedReferencedName ).then( function( result ) {
        var ticket = result.commitInfo[ 0 ].datasetFileTicketInfos[ 0 ].ticket;

        var objRef = hostBaseRefSvc.createBasicObjectRef( '', dataset.uid, dataset.type );

        var msg = exports.createGetTicketMsg();

        msg.setOperationType( UPLOAD );
        msg.setRefObject( objRef );
        msg.setURL( fmsUtils.getFMSFullUploadUrl() );
        msg.setTicket( ticket );
        msg.setFilename( filename );

        exports.createGetTicketResponseProxy().fireHostEvent( msg );
    }, function( err ) {
        logger.error( 'File Upload Failed: ' + err );
        messagingSvc.showError( err );
    } );
}

/**
 * Get the read ticket from the FMS service
 *
 * @param {IModelObject} datasetObj - The IModelObject dataset that references the file.
 * @param {String} fileObj - The file IModelObject to get a ticket for,
 */
function _getReadTicket( datasetObj, fileObj ) {
    fms.getFileReadTickets( [ fileObj ] ).then( function( result ) {
        var ticket = result[ 'tickets.' + fileObj.uid ];

        if( !ticket && _.isArray( result.tickets ) ) {
            ticket = result.tickets[ 1 ];
        }

        if( !ticket ) {
            ticket = '';
        }

        //get the original filename from the ImanfileObject
        var filename;

        var origfilenameProp = fileObj.props.original_file_name;

        if( origfilenameProp && !_.isEmpty( origfilenameProp.dbValues ) ) {
            filename = origfilenameProp.dbValues[ 0 ];
        }

        //build the uri
        var uri = fmsUtils.getFileUri( ticket, filename );

        var objRef = hostBaseRefSvc.createBasicObjectRef( '', datasetObj.uid, datasetObj.type );

        var msg = exports.createGetTicketMsg();

        msg.setOperationType( DOWNLOAD );
        msg.setRefObject( objRef );
        msg.setURL( uri );
        msg.setTicket( ticket );
        msg.setFilename( filename );

        exports.createGetTicketResponseProxy().fireHostEvent( msg );
    }, function( err ) {
        logger.error( 'File download failed: ' + err );
        messagingSvc.showError( err );
    } );
}

/**
 * Handles a commit request
 *
 * @param {IModelObject} dataset - Object to be commit'ed
 * @param {String} ticket - The associated FMS ticket
 * @param {String} filename - associated filename
 */
function _handleCommitRequest( dataset, ticket, filename ) {
    soaSvc.postUnchecked( 'Core-2007-06-DataManagement', 'getDatasetTypeInfo', {
        datasetTypeNames: [ dataset.type ]
    } ).then( function( result ) {
        if( !_.isEmpty( result.infos ) ) {
            var refInfo = result.infos[ 0 ].refInfos[ 0 ];

            var isText = refInfo.fileFormat === 'TEXT' || refInfo.fileFormat.toUpperCase() === 'TEXT';

            var commitInput = _constructCommitDatasetFileInfos( dataset, ticket, true, filename, isText, refInfo.referenceName );

            soaSvc.post( 'Core-2006-03-FileManagement', 'commitDatasetFiles', commitInput ).then( function( result ) {
                var dsUid = dataset.uid;

                if( !_.isEmpty( result.updated ) ) {
                    dsUid = result.updated[ 0 ];
                } else if( !_.isEmpty( result.created ) ) {
                    dsUid = result.created[ 0 ];
                }

                var responseObj = hostBaseRefSvc.createBasicObjectRef( '', dsUid, dataset.type );

                _sentCommitMessage( responseObj, ticket, filename );

                eventBus.publish( 'gwt.ModelObjectRelatedDataModifiedEvent', [ dataset ] );
            }, function( err ) {
                logger.error( 'GetTicketSvc: ' + 'Could not commit file: ' + err );
                messagingSvc.showError( err );
            } );
        }
    }, function( err ) {
        logger.error( 'GetTicketSvc: ' + 'Could Not Get Dataset Type Info: ' + err );
        messagingSvc.showError( err );
    } );
}

/**
 * Handles an upload ticket request
 *
 * @param {IModelObject} dataset - associated dataset to be uploaded
 * @param {String} filename - associate filename
 */
function _handleUploadTicketRequest( dataset, filename ) {
    soaSvc.postUnchecked( 'Core-2007-06-DataManagement', 'getDatasetTypeInfo', {
        datasetTypeNames: [ dataset.type ]
    } ).then( function( result ) {
        if( !_.isEmpty( result.infos ) ) {
            _getWriteTicket( dataset, result.infos[ 0 ], filename );
        }
    }, function( err ) {
        logger.error( 'GetTicketSvc: ' + 'Could Not Get Dataset Type Info: ' + err );
        messagingSvc.showError( err );
    } );
}

/**
 * Handles a download ticket request
 *
 * @param {IModelObject} dataset - Associated object (dataset) to be downloaded
 */
function _handleDownloadTicketRequest( dataset ) {
    dms.getProperties( [ dataset ], [ 'ref_list' ] ).then( function() {
        var refListProp = dataset.props.ref_list;

        if( refListProp && !_.isEmpty( refListProp.dbValues ) ) {
            var fileUid = refListProp.dbValues[ 0 ];

            dms.loadObjects( [ fileUid ] ).then( function() {
                var fileObj = cdm.getObject( fileUid );

                if( fileObj ) {
                    _getReadTicket( dataset, fileObj );
                } else {
                    logger.error( 'GetTicketSvc: ' + 'Unable to locate file object: ' + 'uid=' + fileUid );
                }
            }, function( err ) {
                logger.error( 'GetTicketSvc: ' + 'Unable to locate file object: ' + 'uid=' + fileUid + ' ' + 'error: ' + err );
            } );
        }
    }, function( err ) {
        logger.error( 'GetTicketSvc: ' + 'Unable to locate dataset object: ' + 'uid=' + dataset.uid + ' ' + 'error: ' + err );
        messagingSvc.showError( err );
    } );
}

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// GetTicketSvc
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 *  Hosting service to ...
 *
 *  @constructor
 *  @memberof hostFileTicket_2014_10
 *  @extends hostFactoryService.BaseCallableService
 */
var GetTicketSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_GET_FILE_TICKET,
        hostServices.VERSION_2014_10 );
};

GetTicketSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * This is an incoming call to this service. Trigger the related event handlers.
 *
 * @function handleIncomingEvent
 * @memberof hostFileTicket_2014_10.GetTicketSvc
 *
 * @param {String} jsonData - JSON encoded payload from the host.
 */
GetTicketSvc.prototype.handleIncomingEvent = function( jsonData ) {
    try {
        var msg = exports.createGetTicketMsg( jsonData );

        if( msg ) {
            var objRef = msg.getRefObject();

            if( !objRef || !objRef.ObjId ) {
                return;
            }

            var uid = objRef.ObjId;

            dms.loadObjects( [ uid ] ).then( function() {
                var obj = cdm.getObject( uid );

                if( obj ) {
                    if( cmm.isInstanceOf( 'Dataset', obj.modelType ) ) {
                        switch ( msg.getOperationType() ) {
                            case DOWNLOAD:
                                _handleDownloadTicketRequest( obj );
                                break;
                            case UPLOAD:
                                _handleUploadTicketRequest( obj, msg.getFilename() );
                                break;
                            case COMMIT:
                                _handleCommitRequest( obj, msg.getTicket(), msg.getFilename() );
                                break;
                        }
                    } else {
                        logger.error( 'GetTicketSvc: ' + 'IModelObject not a Dataset: ' + 'uid=' + uid +
                            ' ' + 'modelType=' + obj.modelType );
                    }
                } else {
                    logger.error( 'GetTicketSvc: ' + 'IModelObject not found: ' + 'uid=' + uid );
                }
            }, function( err ) {
                logger.error( 'GetTicketSvc: ' + 'IModelObject not found: ' + 'uid=' + uid + ' ' + 'error: ' + err );
                messagingSvc.showError( err );
            } );
        }
    } catch ( ex ) {
        logger.error( ex );
    }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// GetTicketResponseProxy
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This class is used by the 'client' to invoke with the service implementation on the 'host'.
 *
 * @constructor
 * @memberof hostFileTicket_2014_10
 * @extends hostFactoryService.BaseCallableService
 */
var GetTicketResponseProxy = function() {
    hostFactorySvc.getProxy().call( this,
        hostServices.HS_GET_TICKET_RESPONSE,
        hostServices.VERSION_2014_10 );
};

GetTicketResponseProxy.prototype = hostFactorySvc.extendProxy();

/**
 * Process outgoing 'event' type call to the host.
 *
 * @function fireHostEvent
 * @memberof hostFileTicket_2014_10.GetTicketResponseProxy
 *
 * @param {GetTicketMsg} inputData - Data object who's properties define data {in whatever form the
 * implementation is expecting) to process into a call to the host-side service.
 */
GetTicketResponseProxy.prototype.fireHostEvent = function( inputData ) {
    var payload = JSON.stringify( inputData );

    this._invokeHostEvent( payload );
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// GetTicketMsg
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * The service contract which sends the open request info to the host via {@link DragAndDropProxy}.
 * <P>
 * The message has a list of targets to be opened. Representation is similar to the selection service
 * contract.
 *
 * @constructor
 * @memberof hostFileTicket_2014_10
 * @extends hostFactorySvc.BaseDataContractImpl
 *
 * @param {String} jsonData - (Optional) String from the 'host' to use when initializing the message object.
 */
var GetTicketMsg = function( jsonData ) {
    hostFactorySvc.getDataContract().call( this, hostServices.VERSION_2014_10 );

    if( jsonData ) {
        _.assign( this, JSON.parse( jsonData ) );
    }
};

GetTicketMsg.prototype = hostFactorySvc.extendDataContract();

/**
 *  Get the generated URL for the file ticket operation.
 *
 *  @memberof hostFileTicket_2014_10.GetTicketMsg
 *
 *  @return {String} Property value.
 */
GetTicketMsg.prototype.getURL = function() {
    return _.get( this, 'URL', null );
};

/**
 * Set the generated URL for the file ticket operation.
 *
 * @memberof hostFileTicket_2014_10.GetTicketMsg
 *
 * @param {String} value - Property value.
 */
GetTicketMsg.prototype.setURL = function( value ) {
    this.URL = value;
};

/**
 *  Get the generated URL for the file ticket operation.
 *
 *  @memberof hostFileTicket_2014_10.GetTicketMsg
 *
 *  @return {InteropObjectRef} Property value.
 */
GetTicketMsg.prototype.getRefObject = function() {
    return _.get( this, 'RefObject', null );
};

/**
 * Set the generated URL for the file ticket operation.
 *
 * @memberof hostFileTicket_2014_10.GetTicketMsg
 *
 * @param {InteropObjectRef} value - Property value.
 */
GetTicketMsg.prototype.setRefObject = function( value ) {
    this.RefObject = value;
};

/**
 * What type of file ticket operation (upload/download/commit)?
 *
 * @memberof hostFileTicket_2014_10.GetTicketMsg
 *
 * @return {String} Property value.
 */
GetTicketMsg.prototype.getOperationType = function() {
    return _.get( this, 'OperationType', null );
};

/**
 * What type of file ticket operation (upload/download/commit)?
 *
 * @memberof hostFileTicket_2014_10.GetTicketMsg
 *
 * @param {String} value - Property value.
 */
GetTicketMsg.prototype.setOperationType = function( value ) {
    this.OperationType = value;
};

/**
 * Get the filename.
 *
 * @memberof hostFileTicket_2014_10.GetTicketMsg
 *
 * @return {String} Property value.
 */
GetTicketMsg.prototype.getFilename = function() {
    return _.get( this, 'Filename', null );
};

/**
 * Set the filename.
 *
 * @memberof hostFileTicket_2014_10.GetTicketMsg
 *
 * @param {String} value - Property value.
 */
GetTicketMsg.prototype.setFilename = function( value ) {
    this.Filename = value;
};

/**
 * Get the filename.
 *
 * @memberof hostFileTicket_2014_10.GetTicketMsg
 *
 * @return {String} Property value.
 */
GetTicketMsg.prototype.getTicket = function() {
    return _.get( this, 'Ticket', null );
};

/**
 * Set the filename.
 *
 * @memberof hostFileTicket_2014_10.GetTicketMsg
 *
 * @param {String} value - Property value.
 */
GetTicketMsg.prototype.setTicket = function( value ) {
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
 * @memberof hostFileTicket_2014_10
 *
 * @returns {GetTicketSvc} New instance of the service message API object.
 */
export let createGetTicketSvc = function() {
    return new GetTicketSvc();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostFileTicket_2014_10
 *
 * @returns {GetTicketResponseProxy} New instance of the service message API object.
 */
export let createGetTicketResponseProxy = function() {
    return new GetTicketResponseProxy();
};

/**
 * Return a new instance of this class.
 *
 * @memberof hostFileTicket_2014_10
 *
 * @param {String} payload - (Optional) String from the 'host' to use when initializing the message object.
 *
 * @returns {GetTicketMsg} New instance of the service message object.
 */
export let createGetTicketMsg = function( payload ) {
    return new GetTicketMsg( payload );
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostTheme_2014_02
 */
export let registerHostingModule = function() {
    exports.createGetTicketSvc().register();

    eventBus.subscribe( 'addObject.datasetCommitted.hosting', function( eventData ) {
        var responseObj = { ObjId: eventData.createdObject.uid };
        _sentCommitMessage( responseObj, eventData.ticket, eventData.filename );
    } );
};

export default exports = {
    createGetTicketSvc,
    createGetTicketResponseProxy,
    createGetTicketMsg,
    registerHostingModule
};
