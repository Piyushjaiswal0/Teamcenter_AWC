// Copyright (c) 2022 Siemens

/**
 * This service is used to manage the creation of a document and attached files when user drags and drops filed from the
 * desktop to the AW.
 *
 * @module js/Dma1CreateDocOnDropService
 */
import AwPromiseService from 'js/awPromiseService';
import AwInjectorService from 'js/awInjectorService';
import soaSvc from 'soa/kernel/soaService';
import messagingSvc from 'js/messagingService';
import pasteSvc from 'js/pasteService';
import preferenceService from 'soa/preferenceService';
import localeService from 'js/localeService';
import cmm from 'soa/kernel/clientMetaModel';
import cfgSvc from 'js/configurationService';
import commandService from 'js/command.service';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import browserUtils from 'js/browserUtils';
import declUtils from 'js/declUtils';
import logger from 'js/logger';

/**
 * Cached reference to 'pasteFileHandler'.
 */
var _pasteFileHandler;

/**
 * Global var passed back to DropEvenHandler for end user browser message.
 */
var isCreateDoc;

/**
 * Global var passed back to DropEvenHandler for end user browser message.
 */
var createdObjName = '';

/**
 * Global var used to store preference value used to indicated type of object to create.
 */
var objectTypeToCreate = '';

/**
 * Global var used to store name of document of object to create.
 */
var documentName = '';

/**
 * Global var passed passing parms to renderSubmitRequest SOA.
 */
var renderInfo = [];

/**
 * Global var used to complete promise return of pasteFileHandler.
 */
var _myPromise;

/**
 * Cached URL to FMS service
 */
var _fmsUploadUrl = browserUtils.getBaseURL() + 'fms/fmsupload/';

/**
 * ############################################################<BR>
 * Define the public functions exposed by this module.<BR>
 * ############################################################<BR>
 */
var exports = {};

/**
 * Checks to see if the create new Document object preference is set to true. If true calls the function to create a
 * document. If false calls the default pasteFiles function.
 *
 * @param {Object} targetObject - The 'target' Object for the paste.
 * @param {Array} sourceObjects - Array of 'source' Objects to paste onto the 'target' Object.
 * @param {String} relationType - Relation type name
 *
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available. The resolved data is the result object from the final call to
 *          'Core-2016-09-DataManagement/createAttachAndSubmitObjects'.
 */
export let createDocAttachFiles = function( targetObject, sourceObjects, relationType ) {
    var pasteFilesInput = [ {
        targetObject,
        sourceObjects,
        relationType
    } ];
    /**
     * Get the preference value for create document on drag and drop
     */
    return preferenceService.getStringValue( 'Dma1CreateDocOnDrop' ).then( function( prefSvcResult ) {
        if( prefSvcResult !== null && prefSvcResult.length > 0 && prefSvcResult.toUpperCase() !== 'FALSE' ) {
            isCreateDoc = true;
            objectTypeToCreate = prefSvcResult;
        } else {
            isCreateDoc = false;
        }
        if( !isCreateDoc ) {
            /**
             * This code was added to account for the validation of the return of load of the pasteFileHandler
             * Without this check the system would throw an undefined error when trying to call pasteFiles because
             * the call to set the _pasteFileHandler var had not completed the promise. NOTE: Due to the nature of
             * promise handling there are what logically seems like too many returns. ESLint is even posting a
             * warning but all returns are needed to assure the fulfillment of all promises.
             */
            if( !_pasteFileHandler ) {
                return loadDefaultPasteHandler().then( () => {
                    if( _pasteFileHandler ) {
                        return _pasteFileHandler.pasteFiles( pasteFilesInput );
                    }
                    return _myPromise.then( function( pasteFileHandler ) {
                        return pasteFileHandler.pasteFiles( pasteFilesInput );
                    } );
                } );
            }
            return _pasteFileHandler.pasteFiles( pasteFilesInput );
        }

        var deferred = AwPromiseService.instance.defer();

        if( objectTypeToCreate.indexOf( 'ShowCreatePanel' ) === 0 ) {
            // Launch Command Awp0ShowCreateObject

            var objectType = 'Document';
            var backupCmdArg = appCtxService.ctx.state.params.cmdArg;

            // Parse pref for object type
            var typeCheck = objectTypeToCreate.indexOf( ':' );
            if( typeCheck !== -1 ) {
                objectType = objectTypeToCreate.substring( typeCheck + 1 );
            }

            appCtxService.ctx.createDocument = { pasteFilesInput: pasteFilesInput };
            appCtxService.ctx.state.params.cmdArg = objectType;

            var filename = pasteFilesInput[ 0 ].sourceObjects[ 0 ].name;
            filename = filename.replace( /\.[^/.]+$/, '' );

            if( filename.length > 0 ) {
                var eventDef = eventBus.subscribe( 'awXRT.contentLoaded', function( eventData ) {
                    if( eventData.data.object_name && eventData.data.object_name.dbValue === null ) {
                        eventData.data.object_name.dbValue = filename;
                        eventData.data.object_name.dbValues = [ filename ];
                        eventData.data.object_name.displayValues = [ filename ];
                        eventData.data.object_name.newDisplayValues = [ filename ];
                        eventData.data.object_name.newValue = filename;
                        eventData.data.object_name.uiValue = filename;
                        eventData.data.object_name.valueUpdated = true;

                        eventData.data.targetObject = pasteFilesInput[ 0 ].targetObject;

                        eventBus.unsubscribe( eventDef );
                    }
                }, 'Dma1CreateDocOnDropService' );
            }

            var promise = commandService.executeCommand( 'Awp0ShowCreateObject' );

            if( promise ) {
                promise.then( function() {
                    // Cleanup
                    appCtxService.ctx.state.params.cmdArg = backupCmdArg;
                } );
            }
        } else {
            // otherwise create object silently
            var promise = _doCreateDoc( pasteFilesInput );

            if( promise ) {
                promise.then( function( messageParms ) {
                    _callRender( renderInfo ).then( function() {
                        deferred.resolve( messageParms );
                    } );
                } );
            }
        }

        return deferred.promise;
    } );
};

/**
 * Render PDF datasets for datasets that were attached new Document Object and configured for render via IRDC
 * configuration and relate them to the new Document
 *
 * @param {ObjectArray} renderInfo - Array of render info and created object on this local client machine to be used
 *            to render PDF datasets for configured datasets attached to created object.
 *
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
function _callRender( renderInfo ) {
    return soaSvc.post( 'DocumentManagement-2013-12-PrintOrRender', 'renderSubmitRequest', {
        input: renderInfo
    } );
}

/**
 * Create a new Document Object and take the array of fileNames, create "datasets" and relate them to the new
 * Document
 *
 * @param {StringArray} fileNames - Array of file names of the files on this local client machine to be used to
 *            create datasets.
 *
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
function _doCreateDoc( pasteFilesInput ) {
    /**
     * Create the commit object used to manage all info for the duration of this set of files.
     */
    var commitManager = new CommitManager();

    /**
     * _createDocAndAttach function requires an array of file names to be attached to the created Document
     */
    _.forEach( pasteFilesInput, function( curr ) {
        /**
         * Folder object files were dropped on
         */
        var targetObject = curr.targetObject;

        /**
         * Array of dropped files
         */
        var sourceFiles = curr.sourceObjects;

        /**
         * Array of filenames of dropped files
         */
        var fileNames = [];

        /**
         * Array for created document
         */
        var createdObj = [];

        for( var j = 0; j < sourceFiles.length; j++ ) {
            fileNames.push( sourceFiles[ j ].name );
        }

        /**
         * Call function to create the document and datasets and attache datasets to document, Paste the new
         * document to the dropped on folder, Announce/Update client side objects for display purposes, Get created
         * dataset info from SOA response and pass to commit manager for loading
         */
        _createDocAndAttach( fileNames ).then( function( createDocAndAttachResponse ) {
            _.forEach( createDocAndAttachResponse.output[ '0' ].objects, function( object ) {
                /**
                 * Getting the revision object and name from the SOA response. Object to be used to paste it to the
                 * dropped on folder and name to post success message to the user. NOTE: No else statement here
                 * because if the object creation failed the process would have failed and this point in the code
                 * would not be reached.
                 */
                if( cmm.isInstanceOf( 'ItemRevision', object.modelType ) ) {
                    createdObj.push( object );
                    createdObjName = object.props.object_string.dbValues[ 0 ];

                    renderInfo = [];

                    renderInfo.push( {
                        clientId: '',
                        renderObjs: [ object ],
                        preserve: false,
                        extraInfo: {}

                    } );
                }
            } );

            //if not all dropped files are created and attached, inform user
            if( sourceFiles.length > createDocAndAttachResponse.output[ 0 ].datasets.length ) {
                var droppedFiles = [];
                var datasetsCreated = [];

                _.forEach( sourceFiles, function( object ) {
                    droppedFiles.push( object.name );
                } );

                _.forEach( createDocAndAttachResponse.output[ 0 ].datasets, function( object ) {
                    datasetsCreated.push( object.dataset.props.object_name.dbValues[ '0' ] );
                } );

                var diff = _.difference( droppedFiles, datasetsCreated );

                var resource = 'DocMgmtMessages';
                var localTextBundle = localeService.getLoadedText( resource );
                var filessNotAttachedMsg = localTextBundle.filessNotAttached;

                _.forEach( diff, function( object ) {
                    filessNotAttachedMsg = filessNotAttachedMsg.replace( '{0}', object );
                    messagingSvc.showError( filessNotAttachedMsg );
                    filessNotAttachedMsg = localTextBundle.filessNotAttached;
                } );

                logger.error( 'Failed to attach file(s) dropped. Some file extension(s)' +
                    ' are not eligible based on IRDC for ' + '"' + objectTypeToCreate + '"' + ' Object type.' );
            }

            /**
             * Call paste service to paste the new document to the target folder
             */
            return pasteSvc.execute( targetObject, createdObj, '' )
                .then( function() {
                    /**
                     * Now that the 'Document' is created and related to the 'target' and the 'datasets' are created
                     * and related to the 'Document', announce to the rest of AW that the targets related data has
                     * changed.
                     */

                    var updatedObjects = [ targetObject ];

                    eventBus.publish( 'cdm.relatedModified', {
                        relatedModified: updatedObjects
                    } );

                    /**
                     * Set the total # of file(s) we are going to handle
                     */
                    commitManager.pendingUploadCount += createDocAndAttachResponse.output[ 0 ].datasets.length;
                    commitManager.totalUploadCount += commitManager.pendingUploadCount;

                    /**
                     * Loop through the createAttachAndSubmitObjects SOA call response to get needed data for commit
                     * and load into array for call to commitDatasetFiles SOA
                     */
                    _.forEach( createDocAndAttachResponse.output[ 0 ].datasets, function( dataset ) {
                        var fileName = dataset.commitInfo[ '0' ].datasetFileTicketInfos[ '0' ].datasetFileInfo.fileName;
                        var fileInfo = [];
                        var ticket = '';
                        var clientId = 'CreateDocument';

                        fileInfo.datasetFileName = fileName;
                        fileInfo.datasetType = dataset.commitInfo[ '0' ].dataset.type;
                        fileInfo.isText = dataset.commitInfo[ '0' ].datasetFileTicketInfos[ '0' ].datasetFileInfo.isText;
                        fileInfo.namedReferenceName = dataset.commitInfo[ '0' ].datasetFileTicketInfos[ '0' ].datasetFileInfo.namedReferenceName;
                        fileInfo.dataset = dataset.dataset;

                        for( var k = 0; k < sourceFiles.length; k++ ) {
                            if( sourceFiles[ k ].name === fileName ) {
                                fileInfo.jsFile = sourceFiles[ k ];
                                break;
                            }
                        }

                        ticket = dataset.commitInfo[ '0' ].datasetFileTicketInfos[ '0' ].ticket;

                        var ticketInfo = {
                            clientID: clientId,
                            ticket: ticket
                        };

                        /**
                         * Create an 'XMLHttpRequest' and setup a callback for when the upload is 'DONE" and we
                         * commit the file to the 'dataset'.
                         */
                        var httpRequest = new XMLHttpRequest();

                        httpRequest.onload = commitManager.onLoad;

                        /**
                         * Build up the information we will need later to commit the file to the 'dataset' when the
                         * upload is complete.
                         */
                        httpRequest.commitManager = commitManager;
                        httpRequest.targetObject = targetObject;
                        httpRequest.fileInfo = fileInfo;
                        httpRequest.ticketInfo = ticketInfo;

                        /**
                         * Start to 'in progress' UI and perform the 'post' to upload the JS file.
                         */
                        httpRequest.open( 'POST', _fmsUploadUrl, true );
                        // add the XSRF-TOKEN to the header
                        httpRequest.setRequestHeader( 'X-XSRF-TOKEN', _getXSRFToken() );

                        var formData = new FormData();

                        formData.append( 'fmsFile', fileInfo.jsFile,
                            fileInfo.jsFile.name );
                        formData.append( 'fmsTicket', ticket );

                        eventBus.publish( 'progress.start', {
                            endPoint: _fmsUploadUrl
                        } );

                        httpRequest.send( formData );
                    } );

                    /**
                     * Catch for errors from the paste service
                     */
                } ).catch( function( error ) {
                    messagingSvc.showError( error.message );
                } );

            /**
             * Trap and post errors from call to function that calls create and attach SOA
             */
        }, function( error ) {
            if( error.message ) {
                var errorCode = error.cause.partialErrors[ '0' ].errorValues[ '0' ].code;
                var resource = 'DocMgmtMessages';
                var localTextBundle = localeService.getLoadedText( resource );
                var invalidValueInPrefMsg = localTextBundle.invalidValueInPref;
                invalidValueInPrefMsg = invalidValueInPrefMsg.replace( '{0}', documentName );
                messagingSvc.showError( invalidValueInPrefMsg );
                logger.error( 'Call to createRelateAndSubmt SOA retruned error code ' + '"' + errorCode + '"' +
                    '. ' + objectTypeToCreate + '"' + ' Object type was not created due to invalid value for Dma1CreateDocOnDrop prefrence.' );
            } else {
                if( error ) {
                    messagingSvc.showError( JSON.stringify( error ) );
                }
            }
            commitManager.deferred.reject( error );
        } );
    } );

    /**
     * Return the primary deferred promise
     */
    return commitManager.deferred.promise;
}

/**
 * Create a new Document Object and take the array of fileNames, create "datasets" and relate them to the new
 * Document
 *
 * @param {String[]} fileNames - Array of file names of the files on this local client machine to be used to create
 *            datasets.
 *
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
function _createDocAndAttach( fileNames ) {
    var request = [];
    var dataToBeRelated;
    /**
     * Sort file names and use first one in array for the name of the new document
     */
    fileNames.sort();

    /**
     * Extract the characters to be used for the document name from the first file in the sorted array.
     */
    var extensionIndex = fileNames[ 0 ].lastIndexOf( '.' );

    var seperatorIndex = fileNames[ 0 ].lastIndexOf( '\\' );

    if( seperatorIndex === -1 ) {
        seperatorIndex = fileNames[ 0 ].lastIndexOf( '/' );
    }

    if( extensionIndex > seperatorIndex ) {
        documentName = fileNames[ 0 ].substring( seperatorIndex + 1, extensionIndex );
    } else {
        documentName = fileNames[ 0 ].substring( seperatorIndex + 1 );
    }

    dataToBeRelated = {
        attachFiles: fileNames
    };
    request.push( {
        clientId: 'CreateDocument',
        createData: {
            boName: objectTypeToCreate,
            propertyNameValues: {
                object_name: [ documentName ]
            }
        },
        dataToBeRelated: dataToBeRelated
    } );

    return soaSvc.post( 'Core-2016-09-DataManagement', 'createAttachAndSubmitObjects', {
        inputs: request
    } );
}

/**
 * Gets the XSRF-TOKEN from the document cookie
 *
 * @returns {string} the XSRF token
 */
function _getXSRFToken() {
    var token = '';
    if( document !== null && document !== undefined && document.cookie.search( 'XSRF-TOKEN' ) > -1 ) {
        var split = document.cookie.split( 'XSRF-TOKEN=' );
        if( split.length === 2 ) {
            token = split[1].split( ';' )[0];
        }
    }
    return token;
}

/**
 * This class allows multiple file uploads to complete
 */
var CommitManager = function() {
    var self = this;

    /**
     * Array of objects containing the 'fileInfo' and 'ticketInfo' for all currently pending commit's of a JS File
     * to a 'dataset'.
     */
    var _pendingCommits = [];

    /**
     * TRUE if a 'commit' SOA operation is currently taking place.
     * <P>
     * Note: This is needed since posting multiple 'commit' operations just 'stacks them up' in the queue.
     */
    var _commitInProgress = false;

    /**
     * The number of currently pending file uploads.
     */
    self.pendingUploadCount = 0;

    /**
     * The total number of file uploaded being managed by this CommitManager.
     */
    self.totalUploadCount = 0;

    /**
     * The 'deferred promise' object used to announce the life cycle of this CommitManager.
     */
    self.deferred = AwPromiseService.instance.defer();

    /**
     * Array of 'dataset' IModelObjects created during the processing of this CommitManager.
     */
    self.sourceObjects = [];

    /**
     * Array of FMS servlet messages generated during the processing of this CommitManager for any files who's
     * upload was unsuccessful.
     */
    self.failureMessages = [];

    /**
     * Array of 'dataset' IModelObjects that had their associated file upload fail and should be deleted before we
     * are done.
     */
    self.pendingDatasetRemovals = [];

    /**
     * This function cleans up any pending 'dataset' deletes and resolves the primary deferred promise with a result
     * data object and finishes this file paste operation.
     */
    self.resolveFinalState = function() {
        /**
         * Check if we have some 'datasets' to delete
         */
        if( self.pendingDatasetRemovals.length > 0 ) {
            /**
             * Remove the children 'datasets' from the 'parent 'target(s)'.
             */
            soaSvc.post( 'Core-2014-10-DataManagement', 'removeChildren', {
                inputData: self.pendingDatasetRemovals
            } ).then( function() {
                /**
                 * Now that the 'datasets' are removed and detached from the 'target', announce to the rest of AW
                 * that it's related data has changed.
                 */
                var updatedObjects = [ self.pendingDatasetRemovals[ 0 ].parentObj ];

                eventBus.publish( 'cdm.relatedModified', {
                    relatedModified: updatedObjects
                } );

                self.resolvePrimaryPromise();
            } );
        } else {
            self.resolvePrimaryPromise();
        }
    };

    /**
     * Resolve the primary deferred promise with a data object containing the results of the file paste operation.
     */
    self.resolvePrimaryPromise = function() {
        self.todoCommits.cancel();

        var commitResult = {
            totalCount: self.totalUploadCount,
            sourceObjects: self.sourceObjects,
            failureMessages: self.failureMessages,
            docCreated: isCreateDoc,
            docName: createdObjName
        };

        self.deferred.resolve( commitResult );
    };

    /**
     * This function is called one or more times during a file upload. When the upload is complete and successful,
     * this function will queue up a 'commit' of that file to its 'dataset' and 'ping' the LoDash 'debounce' used to
     * batchup the 'commit' operations to the SOA server.
     *
     * @param {Event} evt - Event from XMLHttpRequest called or more time during a file upload.
     */
    self.onLoad = function( evt ) {
        if( evt.currentTarget.readyState === 4 ) {
            eventBus.publish( 'progress.end', {
                endPoint: _fmsUploadUrl
            } );

            /**
             * Decrement the number of files from the original set we are down to.
             */
            self.pendingUploadCount--;

            /**
             * Check if the upload was successful.
             */
            var fileInfoDone = evt.currentTarget.fileInfo;

            if( evt.currentTarget.status === 200 ) {
                /**
                 * Build the 'commit' request for the uploaded File to the 'dataset'.
                 */
                var commitRequest = {
                    dataset: fileInfoDone.dataset,
                    createNewVersion: true,
                    datasetFileTicketInfos: [ {
                        datasetFileInfo: {
                            fileName: fileInfoDone.datasetFileName,
                            namedReferencedName: fileInfoDone.namedReferenceName,
                            isText: fileInfoDone.isText
                        },
                        ticket: evt.currentTarget.ticketInfo.ticket
                    } ]
                };

                _pendingCommits.push( commitRequest );

                /**
                 * Remember this 'dataset' as one of the successful ones.
                 */
                self.sourceObjects.push( fileInfoDone.dataset );

                /**
                 * 'ping' the LoDash 'debounce' assistant to reset the timer.
                 */
                evt.currentTarget.commitManager.todoCommits();
            } else {
                /**
                 * Build a failure message and add it to the collection of such messages.
                 */
                var failureMessage = '(' + evt.currentTarget.status + ') ' + evt.currentTarget.statusText +
                    ' : ' + evt.currentTarget.fileInfo.datasetFileName;

                self.failureMessages.push( failureMessage );

                /**
                 * Queue up the 'dataset' to be removed. Append to the array of an existing entry if from the same
                 * 'target' IModelObject.
                 */
                var foundPending = false;

                _.forEach( self.pendingDatasetRemovals, function( pendingDelete ) {
                    if( pendingDelete.parentObj === evt.currentTarget.targetObject ) {
                        foundPending = pendingDelete;
                    }
                } );

                if( foundPending ) {
                    foundPending.childrenObj.push( fileInfoDone.dataset );
                } else {
                    var removeInput = {
                        parentObj: evt.currentTarget.targetObject,
                        childrenObj: [ fileInfoDone.dataset ]
                    };

                    self.pendingDatasetRemovals.push( removeInput );
                }

                /**
                 * Check if we have no upload or commits pending by this CommitManager.<BR>
                 * If so: Resolve the 'deferred' for this CommitManager to inform any listener that we are all done.
                 */
                if( self.pendingUploadCount === 0 && _pendingCommits.length === 0 ) {
                    self.resolveFinalState();
                }
            }
        }
    };

    /**
     * Calls the SOA 'commitDatasetFiles' API passing it however many 'dataset' files are currently pending. The
     * array of pending will be reset.
     */
    self.processPendingCommits = function() {
        if( _pendingCommits.length ) {
            if( _commitInProgress ) {
                return;
            }

            var commitInput = {
                commitInput: _pendingCommits
            };

            _pendingCommits = [];

            _commitInProgress = true;

            soaSvc.post( 'Core-2006-03-FileManagement', 'commitDatasetFiles', commitInput ).then(
                function() {
                    _commitInProgress = false;

                    self.processPendingCommits();
                } );
        } else {
            /**
             * We have no commits pending so check if we have uploaded the last file in the set being managed by
             * this CommitManager.<BR>
             * If so: Resolve the 'deferred' for this CommitManager to inform any listener that we are all done.
             */
            if( self.pendingUploadCount === 0 ) {
                self.resolveFinalState();
            }
        }
    };

    /**
     * Create a 'debounce' function to help balance the server load during upload.
     */
    self.todoCommits = _.debounce( self.processPendingCommits, 1000, {
        leading: false,
        trailing: true,
        maxWait: 10000
    } );

    return self;
};

/**
 * Load default Paste File handler.
 */
const loadDefaultPasteHandler = function() {
    return new Promise( resolve => {
        cfgSvc.getCfg( 'paste' ).then( function( pasteProvider ) {
            if( pasteProvider.defaultPasteFileHandler ) {
                /**
                 * _myPromise var was added to allow for validation of promise and branching back to the
                 * pasteFileHandler.pasteFiles See createDocAttachFiles function for details.
                 */
                _myPromise = declUtils.loadDependentModule( pasteProvider.defaultPasteFileHandler.dep );
                _myPromise.then( function( module ) {
                    _pasteFileHandler = module;
                    return resolve();
                } );
            }
            resolve();
        } );
    } );
};

export default exports = {
    createDocAttachFiles
};
