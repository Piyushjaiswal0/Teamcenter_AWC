// Copyright (c) 2022 Siemens

/**
 * Service to query recent model types and available model types form server
 *
 * @module js/subscriptionRecentTypesService
 */
import AwPromiseService from 'js/awPromiseService';
import prefSvc from 'soa/preferenceService';
import _cmm from 'soa/kernel/clientMetaModel';
import _dmSrv from 'soa/dataManagementService';
import _ from 'lodash';
import logger from 'js/logger';

var _prefMap = null;

var MRU_MODEL_TYPES_PREFERENCE = 'Create_Subscription_mru_list';

var MAX_NUMBER_OF_MRU_MODEL_TYPES_PREFERENCE = 'Create_Subscription_mru_max';

var DEFAULT_MRU_MAX = 5;


/**
 * Get the most recent Uids.
 *
 * @return {Object} promise object
 */
export let getRecentModelTypes = function( maxRecentCountIn ) {
    var deferred = AwPromiseService.instance.defer();
    prefSvc.getMultiStringValues( [ MRU_MODEL_TYPES_PREFERENCE, MAX_NUMBER_OF_MRU_MODEL_TYPES_PREFERENCE ] ).then(
        function( prefs ) {
            _prefMap = prefs;

            var maxRecent = maxRecentCountIn;
            if( !maxRecent || !_.isNumber( maxRecent ) ) {
                maxRecent = DEFAULT_MRU_MAX;

                var maxRecentTypeCount = prefs[ MAX_NUMBER_OF_MRU_MODEL_TYPES_PREFERENCE ];
                if( maxRecentTypeCount && maxRecentTypeCount.length > 0 ) {
                    try {
                        maxRecent = parseInt( maxRecentTypeCount[ 0 ] );
                    } catch ( exception ) {
                        logger.error( 'Invalid Create_Subscription_mru_max preference value.' );
                    }
                }
            }
            var recentUsedTypeNames = prefs[ MRU_MODEL_TYPES_PREFERENCE ];
            var recentTypesToLoad = _.uniq( recentUsedTypeNames ).slice( 0, maxRecent );
            deferred.resolve( recentTypesToLoad );
        } );
    return deferred.promise;
};


/**
 * Get the most recent used types
 *
 * @param {Object} data the view model data object
 * @return {Object} a promise with no data, once the data is loaded at client side.
 */
export let getRecentUsedTypes = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    getRecentModelTypes()
        .then(
            function( recentTypeNames ) {
                var uids = [];
                var recentUsedTypes = [];
                for( var i = 0; i < recentTypeNames.length; i++ ) {
                    var type = _cmm.getType( recentTypeNames[ i ] );
                    if( type ) {
                        uids.push( type.uid );
                        recentUsedTypes.push( type );
                    }
                }

                if( data.maxRecentTypeCount ) {
                    uids = _.slice( uids, 0, data.maxRecentTypeCount );
                    recentUsedTypes = _.slice( recentUsedTypes, 0, data.maxRecentTypeCount );
                }

                _dmSrv.loadObjects( uids ).then( function() {
                    data.recentUsedTypes = recentUsedTypes;
                    data.recentUsedTypes.length = recentUsedTypes.length;
                    deferred.resolve( null );
                } );
            } );

    return deferred.promise;
};

/**
 * Update the recent MruUids
 *
 * @return {Object} the promise object
 */
export let updateRecentModelTypes = function( recentAttributeUid ) {
    if( !recentAttributeUid ) {
        return null;
    }

    var existingMruUids = null;
    if( _prefMap ) {
        existingMruUids = _prefMap[ MRU_MODEL_TYPES_PREFERENCE ];
    }

    var mruUids = [];
    mruUids.push( recentAttributeUid );
    if( existingMruUids ) {
        mruUids = _.union( mruUids, existingMruUids );
    }

    mruUids = _.uniq( mruUids );
    return prefSvc.setStringValue( MRU_MODEL_TYPES_PREFERENCE, mruUids );
};

const exports = {
    getRecentUsedTypes,
    getRecentModelTypes,
    updateRecentModelTypes
};
export default exports;
