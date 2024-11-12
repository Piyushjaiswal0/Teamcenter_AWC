// Copyright (c) 2022 Siemens

/**
 * Note: Many of the the functions defined in this module return a {@linkcode module:angujar~Promise|Promise} object.
 * The caller should provide callback function(s) to the 'then' method of this returned object (e.g. successCallback,
 * [errorCallback, [notifyCallback]]). These methods will be invoked when the associated service result is known.
 *
 * @module js/favoritesService
 */
import cdm from 'soa/kernel/clientDataModel';
import soaSvc from 'soa/kernel/soaService';

var exports = {};

/**
 * Current promise to get favorites. To avoid multiple calls.
 */
var _currentPromise = null;

/**
 * Query the server for the favorites.
 *
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let getFavorites = function() {
    if( _currentPromise ) {
        return _currentPromise;
    }
    var inputData = {
        searchInput: {
            providerName: 'Awp0FavoritesProvider',
            searchCriteria: { search: '' },
            startIndex: 0,
            maxToLoad: 10000,
            maxToReturn: 10000,
            searchFilterMap6: {},
            searchSortCriteria: [],
            searchFilterFieldSortType: 'Priority',
            attributesToInflate: [],
            internalPropertyName: ''
        },
        columnConfigInput: {},
        inflateProperties: false
    };
    _currentPromise = soaSvc.post( 'Internal-AWS2-2023-06-Finder', 'performSearchViewModel5', inputData ).then( function( response ) {
        _currentPromise = null;
        var newFavs = [];
        if( response.searchResultsJSON ) {
            var jsonObj = JSON.parse( response.searchResultsJSON );
            for( var ii = 0; ii < jsonObj.objects.length; ii++ ) {
                newFavs.push( cdm.getObject( jsonObj.objects[ ii ].uid ) );
            }
        }

        return newFavs;
    } );

    return _currentPromise;
};

/**
 * @param {IModelObjectArray} modelObjs - array of model objects to add to favorites
 *
 * @returns {Promise} Resolved when favorites update has occurred.
 */
export let addFavorites = function( modelObjs ) {
    var input = {
        favorites: modelObjs,
        action: 'add'
    };
    return soaSvc.post( 'Internal-AWS2-2019-06-DataManagement', 'modifyFavorites', input );
};

/**
 * @param {IModelObjectArray} modelObjs - array of model objects to remove from favorites.
 *
 * @returns {Promise} Resolved when favorites update has occurred.
 */
export let removeFavorites = function( modelObjs ) {
    var input = {
        favorites: modelObjs,
        action: 'remove'
    };
    return soaSvc.post( 'Internal-AWS2-2019-06-DataManagement', 'modifyFavorites', input );
};

export default exports = {
    getFavorites,
    addFavorites,
    removeFavorites
};
