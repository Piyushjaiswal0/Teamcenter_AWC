// Copyright (c) 2022 Siemens

/**
 * This module provides services for getting and setting occlusion culling mode
 *
 * @module js/viewerOcclusionCullingService
 */

import logger from 'js/logger';
import preferenceService from 'soa/preferenceService';
import viewerIndexedDbService from 'js/viewerIndexedDbService';

let exports = {};

/**
 * Preference to determine CSR Loading strategy
 */
let VIS_CSR_LOADING_STRATEGY = 'AWV0CSRLoadingStrategy';

/**
 * viewer csr strategies
 */
export const CSRLoadingStrategy = {
    Standard: 0,
    Fast:3,
    Faster:6,
    Fastest:4
};
Object.freeze( CSRLoadingStrategy );

/**
 * get occlusion culling setting
 * @param {Object} modelObject model object
 * @returns {Number} occlusion culling mode
 */
export let getOccCulling = function( modelObject ) {
    let modelUid = _getModelUid( modelObject );
    return viewerIndexedDbService.getModelCSRLoadingStrategyFromDb( modelUid )
        .then( function( csrLoadingStrategy ) {
            if ( !csrLoadingStrategy ) {
                return preferenceService.getStringValue( VIS_CSR_LOADING_STRATEGY ).then( ( csrLoadingStrategy )=>{
                    let cullingValue = getOccCullingValue( csrLoadingStrategy );
                    //update correct value in IndexedDb evenif garbage value paased in preference
                    const key = Object.keys( CSRLoadingStrategy ).find( key => CSRLoadingStrategy[key] === cullingValue );
                    viewerIndexedDbService.updatetModelCSRLoadingStrategyIntoDb( modelUid, key );
                    return cullingValue;
                } );
            }
            return getOccCullingValue( csrLoadingStrategy );
        } ).catch( function( error ) {
            logger.error( 'Error while getting preference : ' + VIS_CSR_LOADING_STRATEGY +
            '. Default value will be used for preference.' );
            logger.error( error );
            return CSRLoadingStrategy.Fast;
        } );
};

/**
 * Get occlusion culling value for csr loading strategy passed
 * @param {String} csrLoadingStrategy occlusion culling strategy
 * @returns {Number} occlusion culling value
 */
export let getOccCullingValue = function( csrLoadingStrategy ) {
    if( csrLoadingStrategy.toUpperCase() === 'USESMARTLOADING' ) { //usesmart loading will be takenout once removed from preference
        return CSRLoadingStrategy.Fast; // in case someone still has useSmartLoading, switch to new default of low
    } else if( csrLoadingStrategy.toUpperCase() === 'FAST' ) {
        return CSRLoadingStrategy.Fast;
    } else if( csrLoadingStrategy.toUpperCase() === 'FASTER' ) {
        return CSRLoadingStrategy.Faster;
    } else if( csrLoadingStrategy.toUpperCase() === 'FASTEST' ) {
        return CSRLoadingStrategy.Fastest;
    } else if( csrLoadingStrategy.toUpperCase() === 'STANDARD' ) {
        return CSRLoadingStrategy.Standard;
    }
    return CSRLoadingStrategy.Fast;
};

/**
 * set occlusion culling setting
 * @param {String} occCullingMode occlusion culling mode
 * @param {Object} modelObject model object opened in AW
 */
export let setOccCulling = function( occCullingMode, modelObject ) {
    viewerIndexedDbService.updatetModelCSRLoadingStrategyIntoDb( _getModelUid( modelObject ), occCullingMode );
};

/**
 * Gets model uid of model object passed
 * @param {Object} modelObject model object
 * @returns {String} uid of modelObject
 */
let _getModelUid = function( modelObject ) {
    let modelUid = null;
    if( modelObject && modelObject.props && modelObject.props.awb0Archetype && modelObject.props.awb0Archetype.dbValues[ 0 ] !== '' ) {
        modelUid = modelObject.props.awb0Archetype.dbValues[ 0 ];
    } else if( modelObject && modelObject.uid ) {
        modelUid = modelObject.uid;
    }
    return modelUid;
};

export default exports = {
    getOccCulling,
    setOccCulling,
    getOccCullingValue,
    CSRLoadingStrategy
};
