// Copyright (c) 2022 Siemens

/**
 * This module provides services for saving users data on indexedDb
 *
 * @module js/viewerIndexedDbService
 */

import AwPromiseService from 'js/awPromiseService';
import logger from 'js/logger';
import _ from 'lodash';
import _cdmSvc from 'soa/kernel/clientDataModel';
import iDbConsts from 'js/viewerIndexedDbConsts';

let exports = {};
const ERROR_SET_UPDATE_OPERATION = 'Error while set/update operation on user model data into database';
const ERROR_GET_OPERATION = 'Error while getting render location data from database';
const INDEXEDDB_NOT_SUPPORTED = 'IndexedDb is not supported in the browser';
const ERROR_OPENING_DB = 'Error while request to open database';
const READ_WRITE_OPERATION = 'readwrite';

let _getIndexedDb = () => {
    return window.indexedDB;
};

let _getUserId = () => {
    const userInfo = _cdmSvc.getUser();
    let userId = 'default';
    if( userInfo ) {
        userId = userInfo.props.userid.dbValues[ 0 ];
    }
    return userId;
};

/**
 * Gets Users last render location used for model from database
 * @param {String} modelUid model uid
 * @returns {Promise} Promise resolve with models last render location  used by user from database
 */
export let getModelRenderLocationFromDb = ( modelUid ) => {
    return getUserModelDataFromDb( modelUid ).then( ( data )=>{
        if( data && data.renderLocation ) {
            return data.renderLocation;
        }
        return null;
    } );
};

/**
 * Gets Users last csr Loading Strategy used for model from database
 * @param {String} modelUid model uid
 * @returns {Promise} Promise resolve with models csr Loading Strategy used by user from database
 */
export let getModelCSRLoadingStrategyFromDb = ( modelUid ) => {
    return getUserModelDataFromDb( modelUid ).then( ( data )=>{
        if( data && data.csrLoadingStrategy ) {
            return data.csrLoadingStrategy;
        }
        return null;
    } );
};

let getUserModelDataFromDb = ( modelUid )=>{
    let retPromise = AwPromiseService.instance.defer();
    if( !_getIndexedDb() ) {
        logger.error( INDEXEDDB_NOT_SUPPORTED );
        return retPromise.resolve( null );
    }
    const requestData = _getIndexedDb().open( iDbConsts.AW_VIS_DB_NAME, 1 );
    requestData.onupgradeneeded = () => {
        let database = requestData.result;
        if( !database.objectStoreNames.contains( iDbConsts.VIS_MODEL_DATA_CACHE ) ) {
            const store = database.createObjectStore( iDbConsts.VIS_MODEL_DATA_CACHE, { keyPath: [ iDbConsts.USER_ID, iDbConsts.MODEL_UID ] } );
            store.createIndex( iDbConsts.VIS_USERNAME_MODEL_UID_INDEX, [ iDbConsts.USER_ID, iDbConsts.MODEL_UID ], { unique: true } );
        }
    };
    requestData.onerror = ( error ) => {
        logger.error( ERROR_OPENING_DB + error );
        retPromise.resolve( null );
    };
    requestData.onsuccess = () => {
        if( !modelUid && !requestData ) {
            retPromise.resolve( null );
        }
        let database = requestData.result;
        if( !database ) {
            retPromise.resolve( null );
        }
        try {
            const transaction = database.transaction( iDbConsts.VIS_MODEL_DATA_CACHE, READ_WRITE_OPERATION );
            transaction.oncomplete = () => {
                database.close();
            };
            let store = transaction.objectStore( iDbConsts.VIS_MODEL_DATA_CACHE );
            let userModelIndex = store.index( iDbConsts.VIS_USERNAME_MODEL_UID_INDEX );
            const userDataQuery = userModelIndex.get( [ _getUserId(), modelUid ] );
            userDataQuery.onsuccess = () => {
                retPromise.resolve( userDataQuery.result );
            };
            userDataQuery.onerror = ( error ) => {
                database.close();
                logger.error( ERROR_GET_OPERATION + error );
                retPromise.resolve( undefined );
            };
        } catch ( error ) {
            database.close();
            logger.error( ERROR_GET_OPERATION + error );
            retPromise.resolve( undefined );
        }
    };
    return retPromise.promise;
};

/**
 * Updates render location used by user for model uid passed
 * @param {String} modelUid model uid
 * @param {String} renderLocation render location value
 */
export let updateModelRenderLocationIntoDb = ( modelUid, renderLocation ) => {
    storeUserModelDataIntoDb( modelUid, 'renderLocation', renderLocation );
};

/**
 * Updates csr Loading Strategy used by user for model uid passed
 * @param {String} modelUid model uid
 * @param {String} csrLoadingStrategy csr loading strategy
 */
export let updatetModelCSRLoadingStrategyIntoDb = ( modelUid, csrLoadingStrategy ) => {
    storeUserModelDataIntoDb( modelUid, 'csrLoadingStrategy', csrLoadingStrategy );
};

/**
 * Store model data for model uid passed
 * @param {String} modelUid model Uid
 * @param {String} key data key
 * @param {Object} value data value
 */
let storeUserModelDataIntoDb = ( modelUid, key, value ) => {
    if( !key && !value ) {
        logger.error( 'Model data submmitted in wrong format' );
        return;
    }
    if( !_getIndexedDb() ) {
        logger.error( INDEXEDDB_NOT_SUPPORTED );
        return;
    }
    const requestData = _getIndexedDb().open( iDbConsts.AW_VIS_DB_NAME, 1 );
    requestData.onsuccess = () => {
        let database = requestData.result;
        if( !database ) {
            return;
        }
        try {
            const transaction = database.transaction( iDbConsts.VIS_MODEL_DATA_CACHE, READ_WRITE_OPERATION );
            transaction.oncomplete = () => {
                database.close();
            };
            let store = transaction.objectStore( iDbConsts.VIS_MODEL_DATA_CACHE );
            let userModelIndex = store.index( iDbConsts.VIS_USERNAME_MODEL_UID_INDEX );
            const userDataQuery = userModelIndex.get( [ _getUserId(), modelUid ] );
            userDataQuery.onsuccess = () => {
                try {
                    let modelData = userDataQuery.result;
                    if( !modelData ) {
                        modelData = {};
                        modelData.userId = _getUserId();
                        modelData.modelUid = modelUid;
                    }
                    modelData[key] = value;
                    store.put( modelData );
                } catch ( error ) {
                    logger.error( ERROR_SET_UPDATE_OPERATION + error );
                }
            };
            userDataQuery.onerror = ( error ) => {
                database.close();
                logger.error( ERROR_SET_UPDATE_OPERATION + error );
            };
        } catch ( error ) {
            database.close();
            logger.error( ERROR_SET_UPDATE_OPERATION + error );
        }
    };
    requestData.onerror = ( error ) => {
        logger.error( ERROR_OPENING_DB + error );
    };
};

export default exports = {
    getModelRenderLocationFromDb,
    updateModelRenderLocationIntoDb,
    getModelCSRLoadingStrategyFromDb,
    updatetModelCSRLoadingStrategyIntoDb
};
