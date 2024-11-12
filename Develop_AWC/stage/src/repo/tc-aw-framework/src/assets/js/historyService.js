// Copyright (c) 2022 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/historyService
 */
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import soaSvc from 'soa/kernel/soaService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import awConfServ from 'js/awConfiguredRevService';

/**
 * Cache of the list array of history objects queried from the server.
 */
var _historyObjects = [];

var exports = {};

/**
 * Current promise to get favorites. To avoid multiple calls.
 */
var _currentPromise = null;

/**
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let getHistory = function( addObjectContext ) {
    if( _currentPromise ) {
        return _currentPromise;
    }

    var soaInput = {
        columnConfigInput: {},
        inflateProperties: false,
        searchInput: {
            maxToLoad: 10000,
            maxToReturn: 10000,
            searchFilterFieldSortType: 'Priority',
            providerName: 'Awp0RecentObjectsProvider',
            searchCriteria: {
                search: '',
                showConfiguredRev: awConfServ.getShowConfiguredRev( addObjectContext )
            },
            startIndex: 0
        }
    };
    _currentPromise = soaSvc.post( 'Internal-AWS2-2023-06-Finder', 'performSearchViewModel5', soaInput ).then( function( response ) {
        _currentPromise = null;

        _historyObjects = [];
        var uidsToLoad = [];

        if( response.searchResultsJSON ) {
            var jsonObj = JSON.parse( response.searchResultsJSON );
            for( var ii = 0; ii < jsonObj.objects.length; ii++ ) {
                _historyObjects.push( cdm.getObject( jsonObj.objects[ ii ].uid ) );
                uidsToLoad.push( jsonObj.objects[ ii ].uid );

                if( _.isFunction( jsonObj.objects[ ii ].addReference ) ) {
                    jsonObj.objects[ ii ].addReference();
                }
            }
            if( uidsToLoad.length > 0 ) {
                return dmSvc.loadObjects( uidsToLoad ).then( function() {
                    // Load the required properties for display of the history objects.
                    return dmSvc.getProperties( uidsToLoad, [ 'object_string' ] );
                } ).then( function() {
                    return _historyObjects;
                } );
            }
        }
        return _historyObjects;
    } );

    return _currentPromise;
};

/**
 * @param {IModelObjectArray} modelObjs - array of model objects
 *
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let updateHistory = function( modelObjs ) {
    if( modelObjs ) {
        var workspaceObjs = [];

        var update = _historyObjects.length === 0;

        _.forEach( modelObjs, function( modelObj ) {
            if( modelObj && modelObj.modelType && modelObj.modelType.typeHierarchyArray &&
                modelObj.modelType.typeHierarchyArray.indexOf( 'WorkspaceObject' ) > -1 ) {
                workspaceObjs.push( modelObj );

                if( !update ) {
                    update = _historyObjects.indexOf( modelObj ) === -1;
                }
            }
        } );

        if( update && workspaceObjs.length > 0 ) {
            return soaSvc.post( 'Internal-AWS2-2012-10-DataManagement', 'updateHistory', {
                historyInput: {
                    objectsToAdd: workspaceObjs,
                    objectsToRemove: workspaceObjs
                }
            } );
        }
    }
};

// Listen for when objects are deleted to the CDM
eventBus.subscribe( 'cdm.deleted', function( data ) {
    // If deleted objects are in the history, remove them now.
    if( _historyObjects.length > 0 && data.deletedObjectUids && data.deletedObjectUids.length > 0 ) {
        var toRemove = [];

        _.forEach( _historyObjects, function( obj ) {
            if( data.deletedObjectUids.indexOf( obj.uid ) > -1 ) {
                toRemove.push( obj );
            }
        } );

        if( toRemove.length > 0 ) {
            soaSvc.post( 'Internal-AWS2-2012-10-DataManagement', 'updateHistory', {
                historyInput: {
                    objectsToAdd: [],
                    objectsToRemove: toRemove
                }
            } );
        }
    }
}, 'soa_historyService' );

export default exports = {
    getHistory,
    updateHistory
};
