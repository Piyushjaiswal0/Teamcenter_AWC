// Copyright (c) 2022 Siemens

/**
 * This handler is used to manage tc specific paste requirements
 *
 * @module js/pasteFileHandler
 */
import AwPromiseService from 'js/awPromiseService';
import appCtxService from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import soaSvc from 'soa/kernel/soaService';
import messagingSvc from 'js/messagingService';
import adapterSvc from 'js/adapterService';
import tcDefaultPasteHandler from 'js/tcDefaultPasteHandler';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import browserUtils from 'js/browserUtils';
import localeService from 'js/localeService';
import tcSession from 'js/TcSessionData';
import replaceFileService from 'js/Awp0ReplaceDatasetService';

var ERROR_CODE_CONSTRAINED_RELATION = 89015;

/**
 * Cached reference to 'soa_kernel_clientDataModel'.
 */

/**
 * Cached reference to 'soa_kernel_soaService'.
 */

/**
 * Cached reference to messaging service
 */

/**
 * Cached reference to adapter service
 */

/**
 * Cached reference to '$q' service.
 */

/**
 * Cached URL to FMS service
 */
var _fmsUploadUrl = '';

/**
 * The default paste service.
 *
 */

/**
 * Get file extension from a file path.
 *
 * @param {String} fileName - file path
 *
 * @returns {String} Extension from the given file name.
 */
function _getFileExtension( fileName ) {
    var extensionIndex = fileName.lastIndexOf( '.' );

    if( extensionIndex >= 0 ) {
        return fileName.substring( extensionIndex + 1 );
    }

    return ''; //$NON-NLS-1$
}

/**
 * Take the array of fileNames and create 'datasets' and related them to the 'target' IModelObject and then upload
 * the JS Files and then commit the files to the new 'datasets'.
 *
 * @param {IModelObject} targetObject - The IModelObject the files are to be pasted onto.
 *
 * @param {Object} getDatasetTypesResponse - Response object from the previous SOA operation (or NULL if the given
 *            'datasetInfos' parameter should be used).
 *
 * @param {Object} datasetInfos - The 'datasetInfos' property from the 'sourceTypes' object in the 'pasteConfig'
 *            JSON.
 *
 * @param {FileArray} sourceFiles - Array of 'source' JS Files being dragged.
 *
 * @param {StringArray} fileNames - Array of file paths to files on this local client machine to create Datasets
 *            for.
 *
 * @param {String} relationType - The 'relationType' to use when attaching the new 'datasets' to the 'target'
 *            IModelObject.
 *
 * @param {Object} fileInfos - An object populated with various bits of information about the files, types & related
 *            information.
 *
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
function _createDatasetsAndRelate( targetObject, getDatasetTypesResponse, datasetInfos, sourceFiles, fileNames,
    relationType, fileInfos ) {
    //use adapter service to find backing object in case targetobject is RBO
    var targetObjs = [];
    targetObjs.push( targetObject );
    return adapterSvc.getAdaptedObjects( targetObjs ).then(
        function( adaptedObjs ) {
            if( adaptedObjs && adaptedObjs.length > 0 ) {
                var requestIndex = 0;
                var request = [];
                var targetObj = adaptedObjs[ 0 ];

                _.forEach( fileNames, function( fileName ) {
                    /**
                     * Extract the file 'extension', file 'name' and dataSet 'name' from the file's name.
                     * <P>
                     * Note: The following code needs to match the same steps in
                     * 'CreateObjectPresenterW.onDatasetFileSelected'
                     */
                    var extension = null;
                    var extensionIndex = fileName.lastIndexOf( '.' );
                    if( extensionIndex >= 0 ) {
                        extension = fileName.substring( extensionIndex + 1 );
                    } else {
                        extension = ''; //$NON-NLS-1$
                    }

                    var datasetName = null;
                    var seperatorIndex = fileName.lastIndexOf( '\\' );
                    if( seperatorIndex === -1 ) {
                        seperatorIndex = fileName.lastIndexOf( '/' );
                    }

                    var datasetFileName = fileName.substring( seperatorIndex + 1 );
                    if( extensionIndex > seperatorIndex ) {
                        datasetName = fileName.substring( seperatorIndex + 1, extensionIndex );
                    } else {
                        datasetName = fileName.substring( seperatorIndex + 1 );
                    }

                    let useItemIdAsDefaultDatasetName = appCtxService.getCtx( 'preferences.AWC_UseItemIdAsDefaultDatasetName' );


                    if( useItemIdAsDefaultDatasetName && useItemIdAsDefaultDatasetName.length === 1 && useItemIdAsDefaultDatasetName[0] === 'true' && targetObj && ( targetObj.modelType.typeHierarchyArray.indexOf( 'Item' ) > -1 || targetObj.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 ) ) {
                        datasetName = _.get( targetObj, 'props.item_id.dbValues[0]' ) ? _.get( targetObj, 'props.item_id.dbValues[0]' ) : datasetName;
                    }

                    /**
                     * Determine 'Dataset' type, format and 'reference' from the 'datasetInfos' from 'pasteConfig'
                     * (if possible). If not in the 'pasteConfig' then use the information from the previous server
                     * call.
                     */
                    var namedReferenceName = '';
                    var datasetType = '';
                    var isText = false;
                    var found = false;
                    if( datasetInfos ) {
                        for( var i = 0; i < datasetInfos.length; i++ ) {
                            var datesetInfo = datasetInfos[ i ];
                            var exts = datesetInfo.extensions;
                            if( _.includes( exts, extension ) ) {
                                datasetType = datesetInfo.datasetType;
                                isText = datasetInfos.fileFormat === 'TEXT';
                                namedReferenceName = datesetInfo.referenceName;
                                found = true;
                            }
                        }
                    }

                    if( !found && getDatasetTypesResponse ) {
                        /**
                         * Loop through the possible FileTypes & relations valid for the Dataset.
                         */
                        var extentionTypeInfo = getDatasetTypesResponse.output;
                        for( var ii = 0; ii < extentionTypeInfo.length && !datasetType; ii++ ) {
                            var currExtTypeInfo = extentionTypeInfo[ ii ];

                            if( currExtTypeInfo.fileExtension === extension ) {
                                /**
                                 * Loop through the relation information until you find the 1st one that
                                 */
                                for( var jj = 0; jj < currExtTypeInfo.datasetTypesWithDefaultRelInfo.length &&
                                    !datasetType; jj++ ) {
                                    /**
                                     * We assume in the following that the 1st one with the matching file extension
                                     * is good.
                                     * <P>
                                     * This algorithm may need to be extended in the future to handle a 'best fit'
                                     * approach instead.
                                     */
                                    var dataSetTypeInfo = currExtTypeInfo.datasetTypesWithDefaultRelInfo[ jj ];
                                    var refInfo = dataSetTypeInfo.refInfos[ 0 ];
                                    namedReferenceName = refInfo.referenceName;
                                    isText = refInfo.fileFormat === 'TEXT';

                                    var dsType = cdm.getObject( dataSetTypeInfo.datasetType.uid );
                                    if( dsType ) {
                                        datasetType = dsType.props.object_string.dbValues[ 0 ];
                                    }
                                }
                            }
                        }
                    }

                    if( datasetType ) {
                        fileInfos.push( {
                            jsFile: sourceFiles[ requestIndex ],
                            datasetType: datasetType,
                            datasetName: datasetName,
                            datasetFileName: datasetFileName,
                            namedReferenceName: namedReferenceName,
                            isText: isText
                        } );

                        request.push( {
                            clientId: requestIndex.toString(),
                            createData: {
                                boName: datasetType,
                                propertyNameValues: {
                                    object_name: [ datasetName ]
                                }
                            },
                            targetObject: targetObj,
                            pasteProp: relationType
                        } );

                        requestIndex++;
                    }
                } );

                return soaSvc.postUnchecked( 'Internal-Core-2012-10-DataManagement', 'createRelateAndSubmitObjects', {
                    inputs: request
                } );
            }
        } );
}

/**
 * Invoke the 'getDatasetTypesWithDefaultRelation' SOA operation to determine which 'Dataset' type and 'relation'
 * type to create when dropping onto the given 'taregt' IModelObject.
 *
 * @param {Object} targetObject - The IModelObject the files are to be pasted onto.
 *
 * @param {StringArray} fileNames - Array of file paths to files on this local client machine to create Datasets
 *            for.
 *
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
function _getDatasetTypes( targetObject, fileNames ) {
    // Call to get Dataset types
    var request = {
        parent: targetObject,
        fileExtensions: []
    };

    /**
     * Determine an array of unique file extensions.
     */
    _.forEach( fileNames, function( fileName ) {
        var fileExt = _getFileExtension( fileName );

        if( fileExt && request.fileExtensions.indexOf( fileExt ) === -1 ) {
            request.fileExtensions.push( fileExt );
        }
    } );

    return soaSvc.post( 'Internal-AWS2-2015-10-DataManagement', 'getDatasetTypesWithDefaultRelation', request );
}

/**
 * @param {Object} createDatasetsAndRelateResponse - Result from SOA 'createRelateAndSubmitObjects'.
 *
 * @param {ObjectArray} fileInfos - Array objects who's properties relate a 'dataset' and a file to be committed to
 *            it.
 *
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
function _getWriteTickets( createDatasetsAndRelateResponse, fileInfos ) {
    var requests = [];

    for( var i = 0; i < fileInfos.length; i++ ) {
        var fileInfo = fileInfos[ i ];

        fileInfo.dataset = createDatasetsAndRelateResponse.output[ i ].objects[ 0 ];

        var request = {};

        var clientId = i.toString();

        request.clientId = clientId;
        request.datasetTypeName = fileInfo.datasetType;
        request.version = 1;
        request.fileInfos = [ {
            clientFileId: clientId,
            refName: fileInfo.namedReferenceName,
            isText: fileInfo.isText,
            fileName: fileInfo.datasetFileName
        } ];

        requests.push( request );
    }

    return soaSvc.post( 'Internal-Core-2008-06-FileManagement', 'getWriteTickets', {
        inputs: requests
    } );
}

/**
 * Parse the response output for valid file infos.
 *
 * @param {Array} responseOutput - response output
 * @param {Array} fileInfos - input file infos
 * @returns {Array} valid file infos
 */
function _parseValidFiles( responseOutput, fileInfos ) {
    var returnFileInfos = [];
    var currentOutputFound = false;

    for( var i = 0; i < responseOutput.length; i++ ) {
        currentOutputFound = false;
        var objects = responseOutput[ i ].objects;
        for( var j = 0; j < objects.length && !currentOutputFound; j++ ) {
            if( objects[ j ].props && objects[ j ].props.object_name && objects[ j ].props.object_name.dbValues ) {
                var currentObjectType = objects[ j ].type;
                var currentObjectName = objects[ j ].props.object_name.dbValues[ 0 ];

                if( currentObjectType && currentObjectName ) {
                    for( var k = 0; k < fileInfos.length; k++ ) {
                        if( fileInfos[ k ].datasetType === currentObjectType &&
                            fileInfos[ k ].datasetName === currentObjectName ) {
                            returnFileInfos.push( fileInfos[ k ] );
                            currentOutputFound = true;
                            break;
                        }
                    }
                }
            }
        }
    }

    return returnFileInfos;
}

/**
 * Retrieve the error values of the soa response.
 *
 * @param {Array} partialErrors - partial errors from server response
 * @returns {Array} error values
 */
function _getErrorValues( partialErrors ) {
    var returnErrors = [];

    if( partialErrors && partialErrors.length ) {
        for( var i = 0; i < partialErrors.length; i++ ) {
            var errorValues = partialErrors[ i ].errorValues;

            if( errorValues && errorValues.length ) {
                for( var j = 0; j < errorValues.length; j++ ) {
                    if( errorValues[ j ] ) {
                        returnErrors.push( errorValues[ j ] );
                    }
                }
            }
        }
    }

    return returnErrors;
}

// eslint-disable-next-line valid-jsdoc
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
            } ).then( function( response ) {
                /**
                 * Now that the 'datasets' are removed and detached from the 'target', announce to the rest of AW
                 * that it's related data has changed.
                 */
                var updatedObjects = [ self.pendingDatasetRemovals[ 0 ].parentObj ];

                eventBus.publish( 'cdm.relatedModified', {
                    relatedModified: updatedObjects
                } );

                self.resolvePrimaryPromise();

                return response;
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

        var result = {
            totalCount: self.totalUploadCount,
            sourceObjects: self.sourceObjects,
            failureMessages: self.failureMessages
        };

        self.deferred.resolve( result );
    };

    /**
     * This function is call one or more times during a file upload. When the upload is complete and successful,
     * this function will queue up a 'commit' of that file to its 'dataset' and 'ping' the LoDash 'debounce' used to
     * batchup the 'commit' operations to the SOA server.
     *
     * @param {Event} evt - Event from XMLHttpRequest called or more time during a file upload.
     */
    self.onreadystatechange = function( evt ) {
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
                    createNewVersion: false,
                    datasetFileTicketInfos: [ {
                        datasetFileInfo: {
                            fileName: fileInfoDone.datasetFileName,
                            namedReferencedName: fileInfoDone.namedReferenceName,
                            isText: fileInfoDone.isText,
                            allowReplace: fileInfoDone.allowReplace
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
                var failureMessage = '(' + evt.currentTarget.status + ') ' + evt.currentTarget.statusText + ' : ' +
                    evt.currentTarget.fileInfo.datasetFileName;

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
                 * Check if we have no upload or commits pending by this CommitManager.
                 * <P>
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
                function( response ) {
                    _commitInProgress = false;
                    self.processPendingCommits();
                    return response;
                } );
        } else {
            /**
             * We have no commits pending so check if we have uploaded the last file in the set being managed by
             * this CommitManager.
             * <P>
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
 * Checks the TC version and returns the boolean <br>
 * Used before calling SOA which is available in 13.3 and later version
 *
 * @returns {Boolean} true if supported TC version is 13.3 or above, false otherwise
 */
function _isTCVersion133orAbove() {
    var tcMajor = tcSession.getTCMajorVersion();
    var tcMinor = tcSession.getTCMinorVersion();
    if ( tcMajor > 13 || tcMajor === 13 && tcMinor >= 3 ) {
        return true;
    }
    return false;
}

/**
 * Find the existing datasets for given file names
 * @param {Object} queryForFileExistenceResponse Soa response for queryForFileExistence
 * @param {Object} targetObject Target Object
 * @param {StringArray} fileNames File Names to search
 * @param {Map} fileNameToSourceFileMap File Name to Source File Map
 * @returns {ObjectArray} fileNamesToCreate File Names which needs to be created
 */
function _duplicateFilesExist( queryForFileExistenceResponse, targetObject, fileNames, fileNameToSourceFileMap ) {
    var deferred = AwPromiseService.instance.defer();

    if ( queryForFileExistenceResponse !== undefined ) {
        var datasetsForFile = queryForFileExistenceResponse[targetObject.uid];
        var fileNamesToReplace = [];
        var fileNamesToCreate = [];
        var fileNameToDataset = new Map();
        for ( var i = 0; i < datasetsForFile.length; i++ ) {
            var dataset = datasetsForFile[i].dataset;
            var fileName = datasetsForFile[i].fileName;
            fileNameToDataset[fileName] = dataset;
            fileNamesToReplace.push( fileName );
        }
        if ( fileNamesToReplace.length > 0 ) {
            fileNamesToCreate = _.difference( fileNames, fileNamesToReplace );
            var localTextBundle = localeService.getLoadedText( 'ZeroCompileCommandMessages' );
            var replaceLabel = localTextBundle.replaceFileMsg.replace( '{0}', fileNamesToReplace );
            var buttonNotification = 'btn btn-notify';
            var buttons = [ {
                addClass: buttonNotification,
                text: localTextBundle.cancel,
                onClick: function( dialog ) {
                    dialog.close();
                    deferred.resolve( fileNamesToCreate );
                }
            },
            {
                addClass: buttonNotification,
                text: localTextBundle.create,
                onClick: function( dialog ) {
                    dialog.close();
                    _.forEach( fileNamesToReplace, function( fileName ) {
                        fileNamesToCreate.push( fileName );
                    } );
                    deferred.resolve( fileNamesToCreate );
                }
            },
            {
                addClass: buttonNotification,
                text: localTextBundle.replace,
                onClick: function( dialog ) {
                    dialog.close();
                    deferred.resolve( fileNamesToCreate );
                    var promiseReplace = replaceFileService.replaceDataset( targetObject, fileNameToDataset );
                    if ( promiseReplace ) {
                        promiseReplace.then( function( commitInfo ) {
                            _fmsUploadFilesForDataset( fileNameToSourceFileMap, fileNameToDataset, targetObject, commitInfo );
                        } );
                    }
                }
            } ];
            messagingSvc.showWarning( replaceLabel, buttons );
        } else {
            //return all files to create
            fileNamesToCreate = fileNames;
            deferred.resolve( fileNamesToCreate );
        }
    } else {
        //return all files to create
        fileNamesToCreate = fileNames;
        deferred.resolve( fileNamesToCreate );
    }
    return deferred.promise;
}

/**
 * Call fms upload for the given dataset with the new files
 * @param {Map} fileNameToSourceFileMap File Name to Source File Map
 * @param {Map} fileNameToDataset File Name to dataset map
 * @param {Object} targetObject Target Object
 * @param {Object} commitInfo Commit Info
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
function _fmsUploadFilesForDataset( fileNameToSourceFileMap, fileNameToDataset, targetObject, commitInfo ) {
    var datasets = [];
    var commitManager = new CommitManager();
    for ( let value of Object.values( fileNameToDataset ) ) {
        datasets.push( value );
    }
    commitManager.pendingUploadCount += datasets.length;
    commitManager.totalUploadCount += commitManager.pendingUploadCount;
    for ( var i = 0; i < commitInfo.length; i++ ) {
        var fileInfo = {};
        var clientId = 'CreateDocument';

        var datasetFileInfo = commitInfo[i].datasetFileTicketInfos[0].datasetFileInfo;
        fileInfo.datasetFileName = datasetFileInfo.fileName;
        fileInfo.datasetType = commitInfo[i].dataset.type;
        fileInfo.isText = datasetFileInfo.isText;
        fileInfo.namedReferenceName = datasetFileInfo.namedReferencedName;
        fileInfo.dataset = commitInfo[i].dataset;
        fileInfo.jsFile = fileNameToSourceFileMap[datasetFileInfo.fileName];
        fileInfo.allowReplace = datasetFileInfo.allowReplace;

        var ticket = commitInfo[i].datasetFileTicketInfos['0'].ticket;

        var ticketInfo = {
            clientID: clientId,
            ticket: ticket
        };
        _sendHttpRequest( commitManager, targetObject, fileInfo, ticketInfo );
    }
    return commitManager.deferred.promise;
}

/**
  * Gets the XSRF-TOKEN from the document cookie
  *
  * @returns {string} the XSRF token
  */
function _getXSRFToken() {
    let token = '';
    if ( document !== null && document !== undefined && document.cookie.search( 'XSRF-TOKEN' ) > -1 ) {
        const splitAtr = document.cookie.split( 'XSRF-TOKEN=' );
        if ( splitAtr.length === 2 ) {
            // returns the first element
            token = splitAtr[1].split( ';' )[0];
        }
    }
    return token;
}

/**
 * Prepare Input For SOA for checking existing file
 * @param {ObjectArray} pasteFilesInput Paste Files Input
 * @returns {inputForSOA} Input For SOA
 */
function _prepareInputForFileExistenceSOA( pasteFilesInput ) {
    var inputForSOA = [];
    for ( var i = 0; i < pasteFilesInput.length; i++ ) {
        var curr = pasteFilesInput[i];
        var targetObject = curr.targetObject;
        var sourceFiles = curr.sourceObjects;

        var fileNames = [];
        for ( var j = 0; j < sourceFiles.length; j++ ) {
            fileNames.push( sourceFiles[j].name );
        }
        /*var inputObject = {
            uid: targetObject.uid,
            type: targetObject.type
        };*/
        var input = {
            clientID: targetObject.uid,
            fileNames: fileNames,
            parentObject: targetObject
        };
        inputForSOA.push( input );
    }

    return {
        input: inputForSOA
    };
}

/**
 * Send FMS post http request
 * @param {*} commitManager The class which allows multiple file uploads to complete
 * @param {*} targetObject Target Object
 * @param {*} fileInfo File Information
 * @param {*} ticketInfo Ticket Information
 */
function _sendHttpRequest( commitManager, targetObject, fileInfo, ticketInfo ) {
    /**
     * Create an 'XMLHttpRequest' and setup a callback for when the upload is 'DONE" and we commit
     * the file to the 'dataset'.
    */
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange  = commitManager.onreadystatechange;

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
    httpRequest.setRequestHeader( 'X-XSRF-TOKEN', _getXSRFToken() );
    var formData = new FormData();

    formData.append( 'fmsFile', fileInfo.jsFile, fileInfo.jsFile.name );
    formData.append( 'fmsTicket', ticketInfo.ticket );

    eventBus.publish( 'progress.start', {
        endPoint: _fmsUploadUrl
    } );

    httpRequest.send( formData );
}

// ############################################################
// Define the public functions exposed by this module.
// ############################################################

var exports = {};

/**
 * Checks to see if there is an alternate paste service defined in _pasteConfig and if so calls it accordingly
 *
 * @param {ObjectArray} pasteFilesInput - An array of objects that maps a unique 'relationType' to the array of
 *            'sourceObjects' (JS Files) that should be pasted onto the 'targetObject' with that 'relationType'.
 *
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available. The resolved data is the result object from the final call to
 *          'Core-2006-03-DataManagement/createRelations'.
 */
export let pasteFilesWithHandler = function( pasteFilesInput ) {
    var targetTypeConfig = tcDefaultPasteHandler.bestTargetFit( pasteFilesInput[ 0 ].targetObject );

    if( targetTypeConfig ) {
        var sourceTypes = targetTypeConfig.sourceTypes;
        if( sourceTypes && sourceTypes.osFileHandles ) {
            var deferred = AwPromiseService.instance.defer();
            _.forEach( pasteFilesInput, function( input ) {
                const { sourceObjects } = input;
                _.forEach( sourceObjects, function( srcObj ) {
                    srcObj.modelType = {
                        typeHierarchyArray: [ 'osFileHandles' ]
                    };
                } );
            } );
            deferred.resolve( { pasteFilesInput, isOsFiles: true } );
            return deferred.promise;
        }
    }
    return exports.pasteFiles( pasteFilesInput );
};

/**
 * Creates new 'source' 'Dataset' type objects, uploads the given JS Files to FMS and attaches them to the 'sources'
 * and then pastes the 'sources' onto the given 'target' IModelObject.
 *
 * @param {ObjectArray} pasteFilesInput - An array of objects that maps a unique 'relationType' to the array of
 *            'sourceObjects' (JS Files) that should be pasted onto the 'targetObject' with that 'relationType'.
 *
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available. The resolved data is the result object from the final call to
 *          'Core-2006-03-DataManagement/createRelations'.
 */
export let pasteFiles = function( pasteFilesInput ) {
    /**
     * Create the object used to manage all info for the duration of this set of files.
     */
    var commitManager = new CommitManager();

    /**
     * 1. Check to see if there is an existing dataset that has a matching file for each input file.
     */
    var queryForFileExistenceResponse = new Map();
    var inputForSoa = _prepareInputForFileExistenceSOA( pasteFilesInput );
    var namespace;
    if ( _isTCVersion133orAbove() ) {
        namespace = 'Internal-Core-2021-12-DataManagement';
    } else {
        namespace = 'Internal-AWS2-2021-12-DataManagement';
    }

    soaSvc.postUnchecked( namespace, 'queryForFileExistence', inputForSoa ).then( function( response ) {
        var datasetsForFileOutput = response.output;
        _.forEach( datasetsForFileOutput, function( dp ) {
            queryForFileExistenceResponse[dp.clientID] = dp.datasetsForFile;
        } );

        _.forEach( pasteFilesInput, function( curr ) {
            var targetObject = curr.targetObject;
            var relationType = curr.relationType;
            var sourceFiles = curr.sourceObjects;

            var filenames = [];
            var fileNameToSourceFileMap = new Map();

            for( var j = 0; j < sourceFiles.length; j++ ) {
                filenames.push( sourceFiles[ j ].name );
                fileNameToSourceFileMap[sourceFiles[j].name] = sourceFiles[j];
            }

            var targetTypeConfig = tcDefaultPasteHandler.bestTargetFit( targetObject );

            var datasetInfos = null;

            if( targetTypeConfig && targetTypeConfig.sourceTypes.Dataset ) {
                datasetInfos = targetTypeConfig.sourceTypes.Dataset.datasetInfos;
            }

            /**
             * 2. If the file exists, give the user a choice to replace the file in the existing dataset.
             */
            var promiseReplace = _duplicateFilesExist( queryForFileExistenceResponse, targetObject, filenames, fileNameToSourceFileMap );
            if ( promiseReplace ) {
                promiseReplace.then( function( fileNamesToCreate ) {
                    if ( fileNamesToCreate.length > 0 ) {
                        // These are the list of new files/datasets to create. Files the user has chosen to replace
                        //  will go to replaceFileService.replaceDataset().
                        var fileInfos = [];

                        /**
                         * 3. Get the types of datasets to create.
                         */
                        return _getDatasetTypes( targetObject, fileNamesToCreate ).then( function( getDatasetTypesResponse ) {
                            var sourceFilesToCreate = [];
                            _.forEach( fileNamesToCreate, function( fileName ) {
                                sourceFilesToCreate.push( fileNameToSourceFileMap[fileName] );
                            } );

                            /**
                             * 4. Create the datasets and the relation to the target.
                             */
                            return _createDatasetsAndRelate( targetObject, getDatasetTypesResponse, datasetInfos, sourceFilesToCreate,
                                fileNamesToCreate, relationType, fileInfos );
                        } ).then( function( createDatasetsAndRelateResponse ) {
                            var errors = [];
                            var validFileInfos = fileInfos;

                            if( createDatasetsAndRelateResponse.ServiceData ) {
                                errors = _getErrorValues( createDatasetsAndRelateResponse.ServiceData.partialErrors );
                            }

                            if( errors.length > 0 ) {
                                // Check for constrained relationship error when pasting, if the only error
                                if( errors.length === 1 && errors[ 0 ].code === ERROR_CODE_CONSTRAINED_RELATION ) {
                                    messagingSvc.showError( errors[ 0 ].message );

                                    validFileInfos = _parseValidFiles( createDatasetsAndRelateResponse.output, fileInfos );
                                } else {
                                    throw soaSvc.createError( createDatasetsAndRelateResponse.ServiceData );
                                }
                            }

                            /**
                             * 5. Now that the 'datasets' are created and related to the 'target', announce to the rest of AW that it's
                             * related data has changed.
                             */
                            var updatedObjects = [ targetObject ];

                            eventBus.publish( 'cdm.relatedModified', {
                                relatedModified: updatedObjects
                            } );

                            /**
                             * 6. Get the FMS tickets we need to commit the files we are about to upload.
                             */
                            return _getWriteTickets( createDatasetsAndRelateResponse, validFileInfos );
                        }, function( error ) {
                            if( error.message ) {
                                messagingSvc.showError( error.message );
                            } else if( error ) {
                                messagingSvc.showError( JSON.stringify( error ) );
                            }
                        } ).then( function( getWriteTicketsResponse ) {
                            /**
                             * Set the total # of file we are going to handle
                             * <P>
                             * Create the LoDash 'debounce' we will use to control how often we use the 'commit' SOA operation.
                             * <P>
                             * Note: 'maxWait' is only relevant if 'lots' of files are uploading quickly yet we still want to
                             * 'commit' regularly (i.e. after 'maxWait' time).
                             */
                            commitManager.pendingUploadCount += Object.keys( getWriteTicketsResponse.tickets ).length;
                            commitManager.totalUploadCount += commitManager.pendingUploadCount;

                            _.forEach( getWriteTicketsResponse.tickets, function( ticketInfos ) {
                                _.forEach( ticketInfos, function( ticketInfo ) {
                                    /**
                                     * Save the 'source' 'dataset' this File is associated with.
                                     */
                                    var fileInfo = fileInfos[ ticketInfo.clientFileId ];

                                    /**
                                     * 6. Upload each input file.
                                     */
                                    _sendHttpRequest( commitManager, targetObject, fileInfo, ticketInfo );
                                } );
                            } );
                        }, function( error ) {
                            // The write ticket could not be received. Most likely the FSC service or cache FSC service is down. We
                            // need to remove the relation and delete the dataset. Ideally this should all be done as part of single
                            // SOA. It needs to be redesigned to reduce chattiness
                            var removeInput = {
                                parentObj: targetObject,
                                childrenObj: [ fileInfos[ 0 ].dataset ]
                            };
                            soaSvc.post( 'Core-2014-10-DataManagement', 'removeChildren', {
                                inputData: [ removeInput ]
                            } ).then( function() {
                                soaSvc.post( 'Core-2006-03-DataManagement', 'deleteObjects', { objects: [ fileInfos[ 0 ].dataset ] } );
                            } );

                            if( error.message ) {
                                messagingSvc.showError( error.message );
                            }

                            /**
                             * Now that the 'datasets' are removed and detached from the 'target', announce to the rest of AW that
                             * it's related data has changed.
                             */
                            eventBus.publish( 'cdm.relatedModified', {
                                relatedModified: [ targetObject ]
                            } );

                            commitManager.deferred.reject( error );
                        } );
                    }
                } );
            }
        } );
    } );

    /**
     * Return the primary deferred promise
     */
    return commitManager.deferred.promise;
};

_fmsUploadUrl = browserUtils.getBaseURL() + 'fms/fmsupload/';

export default exports = {
    pasteFilesWithHandler,
    pasteFiles
};
