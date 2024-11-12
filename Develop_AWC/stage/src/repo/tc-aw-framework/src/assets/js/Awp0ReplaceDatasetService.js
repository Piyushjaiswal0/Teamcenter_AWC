// Copyright (c) 2022 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awp0ReplaceDatasetService
 */
import cdm from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import awFileNameUtils from 'js/awFileNameUtils';
import eventBus from 'js/eventBus';
import soaSvc from 'soa/kernel/soaService';

var exports = {};

/**
 * Determine whether the given file name matches the reference type of dataset
 *
 * @param {String} fileName the new file name
 * @param {Object} refInfo the dataset reference object
 * @param {Boolean} matchOnWildCard the flag to control using wild card match or not
 * @return {Boolean} true if matched, false otherwise
 */
function isFileOfReferenceType( fileName, refInfo, matchOnWildCard ) {
    if( fileName !== null && refInfo !== null ) {
        var fileExt = awFileNameUtils.getFileExtension( fileName );
        if( fileExt !== '' ) {
            fileExt = _.replace( fileExt, '.', '' );
        }
        var refExt = awFileNameUtils.getFileExtension( refInfo.fileExtension );
        if( refExt !== '' ) {
            refExt = _.replace( refExt, '.', '' );
        }

        if( matchOnWildCard ) {
            //Wild card could either be "*" or "*.*", if its the first then '' will come back
            //If refExt is '' that means it is wild card and any file matches
            if( refExt === '' ) {
                return true;
            }

            //if * that means it is wild card any file matches
            if( refExt === '*' ) {
                return true;
            }
        }

        if( refExt !== '' ) {
            return fileExt.toLowerCase() === refExt.toLowerCase();
        }
    }

    return false;
}


/**
 * Get the selected dataset file info
 *
 * @param {String} fileName the new file name
 * @param {String} datasetFileName the dataset file name
 * @param {Object} refInfos the dataset reference objects
 * @param {Boolean} upload if this is for an upload
 * @param {String} refName pre-determined ref file name
 * @return {Boolean} the dataset file info object used as "getDatasetWriteTickets" SOA call input
 */
function _getDatasetFileInfos( fileName, datasetFileName, refInfos, upload, refName ) {
    var fileFormat = null;
    var referenceName = null;

    if( refInfos ) {
        var ii;
        var refInfo;
        //First loop through looking for exact matches on file ext (no wild card)
        for( ii = 0; ii < refInfos.length; ii++ ) {
            refInfo = refInfos[ ii ];
            if( isFileOfReferenceType( fileName, refInfo, false ) ) {
                fileFormat = refInfo.fileFormat;
                referenceName = refInfo.referenceName;
                break;
            }
        }

        //If no exact matches found loop through second time this time accepting wild cards
        if( fileFormat === null || referenceName === null ) {
            for( ii = 0; ii < refInfos.length; ii++ ) {
                refInfo = refInfos[ ii ];
                if( isFileOfReferenceType( fileName, refInfo, true ) ) {
                    fileFormat = refInfo.fileFormat;
                    referenceName = refInfo.referenceName;
                    break;
                }
            }
        }

        // override referenceName if refName param is present
        if( refName ) {
            referenceName = refName;
        }

        if( fileFormat === null || referenceName === null ) {
            throw 'replaceFileError';
        }

        var ticketFileName = datasetFileName;
        if( !ticketFileName || ticketFileName === '' || upload ) {
            ticketFileName = fileName;
        }

        let allowReplaceFile = true;
        if( upload ) {
            allowReplaceFile = false;
        }

        return [ {
            allowReplace: allowReplaceFile,
            fileName: ticketFileName,
            isText: fileFormat.toUpperCase() === 'TEXT',
            namedReferencedName: referenceName
        } ];
    }

    return null;
}

/**
 * Get the selected dataset file info
 *
 * @param {Object} dataset the dataset object (unused?)
 * @param {Object} subPageData the sub page data object
 * @param {Object} data the data object in scope (unused?)
 * @param {Object} uploadFileSelectionData The upload file selection data (unused?)
 * @param {Boolean} upload if this is for an upload
 * @return {ObjectArray} the dataset file info object used as "getDatasetWriteTickets" SOA call input
 */
export let getDatasetFileInfos = function( dataset, subPageData, data, uploadFileSelectionData, upload ) {
    var hostedFileNameContext = appCtxSvc.getCtx( 'HostedFileNameContext' );
    if( !subPageData.fileName && hostedFileNameContext ) {
        subPageData.fileName = hostedFileNameContext.filename;
        subPageData.fileNameNoExt = awFileNameUtils.getFileNameWithoutExtension( subPageData.fileName );
    }
    var datasetFileName = '';
    if ( subPageData.datasetFileName && subPageData.datasetFileName.dbValue ) {
        datasetFileName = subPageData.datasetFileName.dbValue;
    }

    let referenceName = null;
    if( data.refInfos ) {
        let refList = dataset.props.ref_list.displayValues;
        let ref_names = dataset.props.ref_names.displayValues;
        for( let i = 0; i < refList.length; ++i ) {
            if( refList[ i ] === subPageData.datasetFileName.dbValues ) {
                var refInfoToCheck;
                for( let ii = 0; ii < data.refInfos.length; ii++ ) {
                    if( data.refInfos[ii].referenceName === ref_names[ i ] ) {
                        refInfoToCheck = data.refInfos[ii];
                        break;
                    }
                }
                if( isFileOfReferenceType( subPageData.fileName, refInfoToCheck, false ) || isFileOfReferenceType( subPageData.fileName, refInfoToCheck, true ) ) {
                    referenceName = ref_names[ i ];
                }
            }
        }
    }

    return _getDatasetFileInfos( subPageData.fileName, datasetFileName, data.refInfos, upload, referenceName );
};

/**
 * Updates fileNameExt on selectedDataset
 *
 * @param {Object} datasetFileName the File Name
 * @return {Object} extension of currently selected file
 */
export let onFileSelectionChange = function( datasetFileName ) {
    let selectedFileName = datasetFileName.dbValue;
    let extension = selectedFileName.substring( selectedFileName.lastIndexOf( '.' )  );

    return {
        extension
    };
};

/**
 * Get reference object of given dataset
 *
 * @param {Object} selectedDataset the selected dataset object
 * @return {Object} the dataset reference object
 */
export let getDatasetRefObj = function( selectedDataset ) {
    var refObjUid = selectedDataset.props.ref_list.dbValues[ 0 ];
    return cdm.getObject( refObjUid );
};

/**
 * Get updated objects after replacing dataset file
 *
 * @param {Object} selectedDataset the selected dataset object
 * @param {Object} parentSelectedObj the parent selected object
 * @return {ObjectArray} updated objects
 */
export let getUpdatedObjects = function( selectedDataset, parentSelectedObj ) {
    var objs = [];
    if( selectedDataset ) {
        objs.push( cdm.getObject( selectedDataset.uid ) );
    }

    if( parentSelectedObj ) {
        objs.push( cdm.getObject( parentSelectedObj.uid ) );
    }

    return objs;
};

/**
 * populate original file name from each ImanFile and saves in context object
 *
 * @param {data} data object
 */
export let populateFileNames = function( objects, originalFileName ) {
    var fileNames = [];
    var imanFileObjects = objects;
    let originalFileNameIn = originalFileName;
    for( var i = 0; i < imanFileObjects.length; i++ ) {
        if( imanFileObjects[ i ].type !== 'ImanFile' ) {
            continue;
        }
        var objTemp = cdm.getObject( imanFileObjects[ i ].uid );
        if( objTemp ) {
            var actFileName = objTemp.props.original_file_name.dbValues[ 0 ];
            if( !originalFileNameIn ) {
                originalFileNameIn = objTemp.props.original_file_name;
            }
            fileNames.push( actFileName );
        }
    }
    var ctx = appCtxSvc.getCtx( 'selectedDataset' );
    if( ctx ) {
        ctx.fileNames = fileNames;
        appCtxSvc.updateCtx( 'selectedDataset', ctx );
    }

    return originalFileNameIn;
};

/**
 * Create getPlmdFIleTicket soa's input for single/multiple imanFile object attached
 *
 * @param {object} selected selected dataset object
 * @param {data} data object
 * @return {info} object
 */
export let createInputForDSM = function( selected, data ) {
    var datasetObj = cdm.getObject( selected.uid );
    var imanFileList = cdm.getObjects( datasetObj.props.ref_list.dbValues );
    var imanFile = null;
    var imanFileReference = '';
    if( imanFileList.length === 1 ) {
        imanFile = imanFileList[ 0 ];
        imanFileReference = datasetObj.props.ref_names.dbValues[ 0 ];
    } else {
        for( var i = 0; i < imanFileList.length; i++ ) {
            var tempVar = imanFileList[ i ];
            var fileName = tempVar.props.original_file_name.dbValues[ 0 ];
            if( data.datasetFileName !== undefined && fileName === data.datasetFileName.uiValue ) {
                imanFile = imanFileList[ i ];
                imanFileReference = datasetObj.props.ref_names.dbValues[ i ];
                break;
            }
        }
    }

    return [ {
        dataset: datasetObj,
        imanFile: imanFile,
        namedReferenceName: imanFileReference
    } ];
};

/**
 * If platform is not supported, Asyncronous replace operation should go to synchronous replace
 *
 * @param {response} response soa response
 * @returns {Boolean} - If platform is supported
 */
export let isPlatformSupported = function( response ) {
    var isPlatformSupported = false;
    if( response.ServiceData.partialErrors ) {
        var errorCode = response.ServiceData.partialErrors[ 0 ].errorValues[ 0 ].code;
        if( errorCode === 141170 ) {
            isPlatformSupported = true;
        }
    }

    var ctx = appCtxSvc.getCtx( 'selectedDataset' );
    if( ctx ) {
        ctx.isPlatformSupported = isPlatformSupported;
        appCtxSvc.updateCtx( 'selectedDataset', ctx );
    }
    return isPlatformSupported;
};

/**
 * Replace the existing dataset with the new file
 * @param {Object} targetObject Target Object
 * @param {Map} fileNameToDataset File Name to Dataset Map
 * @param {Object} data the data object
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let replaceDataset = function( targetObject, fileNameToDataset, data ) {
    return new Promise( ( resolve ) => {
        var baseTypeNameList = [];
        var datasets = [];
        var fileNames = [];
        for ( let value of Object.values( fileNameToDataset ) ) {
            baseTypeNameList.push( value.type );
            datasets.push( value );
        }

        for ( let value of Object.keys( fileNameToDataset ) ) {
            fileNames.push( value );
        }

        if ( targetObject ) {
            var updatedObjects = [ targetObject ];
            eventBus.publish( 'cdm.relatedModified', {
                relatedModified: updatedObjects
            } );
        }
        soaSvc.postUnchecked( 'Core-2007-06-DataManagement', 'getDatasetTypeInfo', {
            datasetTypeNames: baseTypeNameList
        } ).then( function( result ) {
            var inputs = [];
            if ( !_.isEmpty( result.infos ) ) {
                for ( var i = 0; i < datasets.length; i++ ) {
                    var refInfos = result.infos[i].refInfos;
                    var datasetFileInfo;
                    //Pass dataset File Info for replace File command
                    if ( data !== undefined && data.datasetFileName ) {
                        var hostedFileNameContext = appCtxSvc.getCtx( 'HostedFileNameContext' );
                        if( !data.fileName && hostedFileNameContext ) {
                            data.fileName = hostedFileNameContext.filename;
                            data.fileNameNoExt = awFileNameUtils.getFileNameWithoutExtension( fileNames[i] );
                        }
                        datasetFileInfo = _getDatasetFileInfos( fileNames[i], data.datasetFileName.dbValue, refInfos, false, null );
                    } else {
                        //Pass dataset File Info for drag and drop replace
                        datasetFileInfo = _getDatasetFileInfos( fileNames[i], fileNames[i], refInfos, false, null );
                    }
                    var input = {
                        createNewVersion: true,
                        dataset: datasets[i],
                        datasetFileInfos: datasetFileInfo
                    };
                    inputs.push( input );
                }
                var soaInput = {
                    inputs: inputs
                };

                soaSvc.postUnchecked( 'Core-2006-03-FileManagement', 'getDatasetWriteTickets', soaInput ).then( function( result ) {
                    if ( data ) {
                        data.fmsTicket = result.commitInfo[0].datasetFileTicketInfos[0].ticket;
                        data.commitInfos = result.commitInfo[0];
                    }
                    resolve( result.commitInfo );
                } );
            }
        } );
    } );
};

/**
 * Create a Map File name to Dataset
 * @param {Object} selected Selected Dataset
 * @param {Object} data Data
 * @returns {Map} fileNameToDataset
 */
export let getFileNameToDataset = function( selected, data ) {
    var datasetObj = cdm.getObject( selected.uid );
    var hostedFileNameContext = appCtxSvc.getCtx( 'HostedFileNameContext' );
    if( !data.fileName && hostedFileNameContext ) {
        data.fileName = hostedFileNameContext.filename;
    }

    var fileName = data.fileName;
    var fileNameToDataset = new Map();
    fileNameToDataset[fileName] = datasetObj;
    return fileNameToDataset;
};

export default exports = {
    getDatasetFileInfos,
    onFileSelectionChange,
    getDatasetRefObj,
    getUpdatedObjects,
    populateFileNames,
    createInputForDSM,
    isPlatformSupported,
    replaceDataset,
    getFileNameToDataset
};
