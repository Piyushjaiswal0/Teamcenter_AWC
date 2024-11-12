// Copyright (c) 2022 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/createLaunchFileRequest
 */
import frameAdapterService from 'js/frameAdapter.service';
import appCtxService from 'js/appCtxService';
import fmsUtils from 'js/fmsUtils';
import logger from 'js/logger';

var exports = {};

/**
 * Launch the selected model objects
 *
 * @param {Array} selectedObjects - Array of selected objects.
 */
export let launchObject = function( selectedObjects ) {
    try {
        var productLaunchInfo = appCtxService.getCtx( 'occmgmtContext' ).productContextInfo;
        var archTypeProps = [];
        selectedObjects.forEach( function( selection ) {
            var archTypeProp = selection.props.awb0UnderlyingObject;
            archTypeProps.push( archTypeProp );
        } );
        createLaunchFile( productLaunchInfo, archTypeProps );
    } catch ( error ) {
        logger.error( error );
    }
};

var createLaunchFile = function( productLaunchInfo, idInfos ) {
    frameAdapterService.createLaunchFile( productLaunchInfo, idInfos ).then( function( response ) {
        if( response && response.ticket ) {
            var fileName = fmsUtils.getFilenameFromTicket( response.ticket );
            fmsUtils.openFile( response.ticket, fileName );
        }
    } );
};

export default exports = {
    launchObject
};
