// Copyright (c) 2022 Siemens

/**
 * This module provides services for saving users data on indexedDb
 *
 * @module js/viewerGraphicsSupportService
 */

import preferenceService from 'soa/preferenceService';
import viewerIndexedDbService from 'js/viewerIndexedDbService';
import frameAdapterService from 'js/frameAdapter.service';
import viewerSessionStorageService from 'js/viewerSessionStorageService';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import logger from 'js/logger';

let exports = {};

/**
 * Gets Current rendering mode
 * @param {String} renderLocationFromIndexedDb render location stored in IndexedDb for modelUid
 * @param {String} renderLocationFromTcPref render lpcation stored in Team center preference
 * @returns {String} current render location
 */
let _getCurrentRenderLocation = ( renderLocationFromIndexedDb, renderLocationFromTcPref ) => {
    let viewerRenderLocation = null;
    if( !renderLocationFromIndexedDb ) {
        viewerRenderLocation = renderLocationFromTcPref;
    } else {
        viewerRenderLocation = renderLocationFromIndexedDb;
    }
    if( !viewerRenderLocation ) {
        viewerRenderLocation = 'CSR';
    }
    return viewerRenderLocation;
};

/**
 * Gets supported render location location
 * @param {Object} renderSupportInfo render support information
 * @param {String} renderLocationFromIndexedDb render location information from indexedDb
 * @param {String} renderLocationFromTcPref render location information from tc pref
 * @param {String} modelUid model uid
 * @returns {String} render location
 */
let _getSupportedRenderLocation = ( renderSupportInfo, renderLocationFromIndexedDb, renderLocationFromTcPref ) => {
    if( !renderSupportInfo ) {
        return 'viewerNotConfigured';
    }
    if( !renderSupportInfo.isCSRSupported && !renderSupportInfo.isSSRSupported ) {
        return 'unSupported';
    }
    let renderLocation = _getCurrentRenderLocation( renderLocationFromIndexedDb, renderLocationFromTcPref );
    if( renderLocation === 'CSR' && !renderSupportInfo.isCSRSupported && renderSupportInfo.isSSRSupported ) {
        return 'unSupportedCSR';
    }
    return renderLocation;
};

/**
 * Gets Render support info from vis server
 * @returns {Promise} Promise which on resolve returns renderSupport information whether rendering in SSR/CSR is supported
 */
let _getRenderSupportInfoFromJscom = () => {
    let renderSupportInfo = {
        isSSRSupported: false,
        isCSRSupported: false
    };
    //get client hardware info
    let clientHarwareInfo = window.JSCom.EMM.HardwareUtils.getHardwareInfo();
    if( clientHarwareInfo ) {
        renderSupportInfo.isCSRSupported = true;
    }
    return window.JSCom.Health.HealthUtils.getServerHealthInfo( frameAdapterService.getConnectionUrl() ).then( ( gpuInfo ) => {
        if( Array.isArray( gpuInfo.poolManagers ) && gpuInfo.poolManagers.length > 0 && gpuInfo.poolManagers[ 0 ].graphicsCapable > 0 ) {
            renderSupportInfo.isSSRSupported = true;
        }
        return renderSupportInfo;
    } ).catch( ( reason ) => {
        logger.error( 'Could not fetch server health info from server: ' + reason );
        return null;
    } );
};
/**
 * Gets supported Render location for loading viewer
 * @param {Object} modelObject model object
 * @param {Object} isSameProductOpenedAsPrevious is same product being opened
 * @returns {Promise} promise which resolve with render location
 */
export let getSupportedRenderLocation = async( modelObject, isSameProductOpenedAsPrevious ) => {
    let modelUid = null;
    if( modelObject && modelObject.props && modelObject.props.awb0Archetype && modelObject.props.awb0Archetype.dbValues[ 0 ] !== '' ) {
        modelUid = modelObject.props.awb0Archetype.dbValues[ 0 ];
    } else if( modelObject && modelObject.uid ) {
        modelUid = modelObject.uid;
    }
    let renderOptionPromise = preferenceService.getStringValue( 'AWV0ViewerRenderOption' );
    let indexedDbPromise = viewerIndexedDbService.getModelRenderLocationFromDb( modelUid );
    return AwPromiseService.instance.all( [ indexedDbPromise, renderOptionPromise ] ).then( ( result ) => {
        let renderLocationFromIndexedDb = result[ 0 ];
        if( !isSameProductOpenedAsPrevious ) {
            let renderLocationFromTcPref = result[ 1 ];
            let renderSupportInfo = viewerSessionStorageService.getViewerDataFromSessionStorage( 'renderSupportInfo' );
            if( !renderSupportInfo ) {
                return _getRenderSupportInfoFromJscom().then( ( renderSupportInfo ) => {
                    viewerSessionStorageService.setViewerDataIntoSessionStorage( 'renderSupportInfo', renderSupportInfo );
                    return _getSupportedRenderLocation( renderSupportInfo, renderLocationFromIndexedDb, renderLocationFromTcPref );
                } );
            }
            return _getSupportedRenderLocation( renderSupportInfo, renderLocationFromIndexedDb, renderLocationFromTcPref );
        }
        if( !renderLocationFromIndexedDb ) {
            return 'CSR';
        }
        return renderLocationFromIndexedDb;
    } ).catch( ( reason ) => {
        logger.error( 'Could not fetch render location from IndexedDb: ' + reason );
        return 'CSR';
    } );
};

export default exports = {
    getSupportedRenderLocation
};
