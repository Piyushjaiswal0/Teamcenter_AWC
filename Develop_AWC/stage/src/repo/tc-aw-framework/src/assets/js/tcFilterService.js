// Copyright (c) 2022 Siemens

/**
 * This service is used to manage the configuration of the filter operation.
 * 
 * @module js/tcFilterService
 */
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import adapterSvc from 'js/adapterService';
import _ from 'lodash';

/**
 * ############################################################<BR>
 * Define the public functions exposed by this module.<BR>
 * ############################################################<BR>
 */
var exports = {};

/**
 * Return an array of filtered Objects.
 * 
 * @param {Array} sourceObjects - Array of 'source' IModelObjects to paste onto the 'target' IModelObject.
 * @param {Array} filterTypes - Array of 'types' to filter.
 * @param {Boolean} isIncludeSubTypes - If true, it will check the sourceObject's typeHierarchy with given
 *            filterTypes.
 * 
 * @return {Object[]} Array of filtered Objects.
 */
export let getFilteredObjects = function( sourceObjects, filterTypes, isIncludeSubTypes ) {
    var deferred = AwPromiseService.instance.defer();

    if( sourceObjects && sourceObjects.length > 0 ) {
        var filterObjects = _.filter( sourceObjects, function( sourceObject ) {
            if( isIncludeSubTypes ) {
                return _.intersection( filterTypes, sourceObject.modelType.typeHierarchyArray ).length > 0;
            }
            return filterTypes.indexOf( sourceObject.modelType.name ) > -1;
        } );

        var nonFilterObjs = _
            .filter(
                sourceObjects,
                function( sourceObject ) {
                    if( isIncludeSubTypes ) {
                        return _.difference( filterTypes, sourceObject.modelType.typeHierarchyArray ).length === filterTypes.length;
                    }
                    return filterTypes.indexOf( sourceObject.modelType.name ) === -1;
                } );

        var loadedObjsPromise = _loadObjects( nonFilterObjs );
        loadedObjsPromise.then( function( loadedObjects ) {
            var filterAdaptedObjs = _.filter( loadedObjects, function( sourceObject ) {
                if( isIncludeSubTypes ) {
                    return _.intersection( filterTypes, sourceObject.modelType.typeHierarchyArray ).length > 0;
                }
                return filterTypes.indexOf( sourceObject.modelType.name ) > -1;
            } );
            var filteredObjs = _.union( filterObjects, filterAdaptedObjs );
            deferred.resolve( filteredObjs );
        } );
    } else {
        deferred.resolve( sourceObjects );
    }

    return deferred.promise;
};

/**
 * Adapt and load objects
 * 
 * @param {Array} nonFilterObjs - array of non-filtered objects
 */
function _loadObjects( nonFilterObjs ) {
    var deferred = AwPromiseService.instance.defer();
    var adaptedObjsPromise = adapterSvc.getAdaptedObjects( nonFilterObjs );
    adaptedObjsPromise.then( function( adaptedObjs ) {
        var uidsToLoad = [];
        var loadedObjects = [];

        _.forEach( adaptedObjs, function( obj ) {
            if( obj && _.isEmpty( obj.props ) ) {
                uidsToLoad.push( obj.uid );
            } else if( obj ) {
                loadedObjects.push( obj );
            }
        } );

        if( !_.isEmpty( uidsToLoad ) ) {
            dmSvc.loadObjects( uidsToLoad ).then( function( serviceData ) {
                _.forEach( uidsToLoad, function( uid ) {
                    var loadedObject = cdm.getObject( uid );
                    loadedObjects.push( loadedObject );
                } );
                deferred.resolve( loadedObjects );
            } );
        } else {
            deferred.resolve( adaptedObjs );
        }
    } );
    return deferred.promise;
}

export default exports = {
    getFilteredObjects
};
