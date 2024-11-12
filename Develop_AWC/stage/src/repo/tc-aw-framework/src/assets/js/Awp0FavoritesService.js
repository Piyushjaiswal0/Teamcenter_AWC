// @<COPYRIGHT>@
// ==================================================
// Copyright 2015.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global */

/**
 *
 * @module js/Awp0FavoritesService
 */

'use strict';

export const processOutput = ( data, dataCtxNode, searchData ) => {
    const newSearchData = { ...searchData.value };
    newSearchData.totalFound = data.data.favorites.totalFound;
    newSearchData.totalLoaded = data.data.favorites.totalLoaded;
    searchData.update( newSearchData );
};

const exports = {
    processOutput
};

export default exports;
