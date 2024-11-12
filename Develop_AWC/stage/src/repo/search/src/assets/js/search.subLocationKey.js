// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * This is the Search sublocation key contribution.
 *
 * @module js/search.subLocationKey
 */
'use strict';

var contribution = {
    canBeSelectedByDefault: false,
    clientScopeURI: 'Awp0SearchResults',
    id: 'tc_xrt_Enterprise_Discovery',
    label: {
        source: '/i18n/SearchMessages',
        key: 'searchSubTitle'
    },
    nameToken: 'com.siemens.splm.client.search:SearchResultsSubLocation',
    pageNameToken: 'search',
    presenter: 'SearchResultsSubLocationPresenter',
    priority: 100,
    propertyPolicy: {
        types: [ {
            name: 'Awp0FullTextSavedSearch',
            properties: [ {
                name: 'awp0search_string'
            }, {
                name: 'creation_date'
            }, {
                name: 'awp0string_filters'
            } ]
        } ]
    },
    visibleWhen: function( modelObject ) {
        return modelObject.modelType.typeHierarchyArray.indexOf( 'Awp0FullTextSavedSearch' ) !== -1;
    }
};

export default function( key, deferred ) {
    if( key === 'showObjectSubLocation' ) {
        deferred.resolve( contribution );
    } else {
        deferred.resolve();
    }
}
