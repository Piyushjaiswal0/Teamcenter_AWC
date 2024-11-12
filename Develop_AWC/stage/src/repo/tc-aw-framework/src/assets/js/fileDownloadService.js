// Copyright (c) 2022 Siemens

/**
 * @module js/fileDownloadService
 */

import cdm from 'soa/kernel/clientDataModel';
import soaSvc from 'soa/kernel/soaService';
import { forEach } from 'lodash';
var exports = {};

/**
 * Prepare download file message
 * @param {OBJECT} data - declarative ViewModel Information
 * @param {String} textMsgParamForImanFileObj  - file name derived from ImanFile object
 * @param {String} textMsgParamForDatasetObj  - file name derived from Dataset object
 * @return {String } finalMessage - Final message to be displayed in the sublocation view
 */
export let prepareMessageBeforeDownload = function( data, textMsgParamForImanFileObj, textMsgParamForDatasetObj ) {
    let finalMessage = null;
    if( textMsgParamForImanFileObj !== undefined ) {
        finalMessage = data.i18n.fileDownloadRetryMessage.replace( '{0}', textMsgParamForImanFileObj );
    }
    if( textMsgParamForDatasetObj !== undefined ) {
        finalMessage = data.i18n.fileDownloadRetryMessage.replace( '{0}', textMsgParamForDatasetObj );
    }
    return finalMessage;
};

/**
 * Get file ticket info
 * @param {Object} selectionModel  - Command Context selectionModel Object
 * @returns {Promise} This promise will be 'resolved' or 'rejected'  */
export let downloadImanFile = function( selectionModel ) {
    let imanFileUIDs = selectionModel?.getSelection();
    if( imanFileUIDs ) {
        let imanFiles = [];
        forEach( imanFileUIDs, function( fileUid ) {
            let modelObject = cdm.getObject( fileUid );
            if( modelObject.type === 'ImanFile' ) {
                imanFiles.push( modelObject );
            }
        } );

        return soaSvc.post( 'Core-2006-03-FileManagement', 'getFileReadTickets', {
            files: imanFiles
        } );
    }
};

export default exports = {
    prepareMessageBeforeDownload,
    downloadImanFile
};
