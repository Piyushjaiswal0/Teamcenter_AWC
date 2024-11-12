// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * This module defines the 'tcColumnUtils' which gives service to AW column configuration and providers.
 *
 * @module js/tcColumnUtils
 */

'use strict';

let exports = {};

/**
 * Retrieve the column names from the column provider.
 * 
 * @param {Object} columnProvider - column provider for the grid
 * @returns {Array} - the column names
 */
export let retrieveColumnNames = function( columnProvider ) {
    let columnConfig = columnProvider.columnConfig;
    if ( columnConfig && columnConfig.columns && columnConfig.columns.length ) {
        return columnConfig.columns.map( function( col ) {
            return col.propertyName;
        } );
    }
    return columnProvider.columns.map( function( col ) {
        return col.name;
    } );
};

/**
 * Retrieve columns from the column provider in the view model.
 *
 * @param {Object} viewModel - view model
 * @param {String} gridName - provider key which refers to grids in viewModel
 * @returns {Array} - the columns from the column provider
 */
export let getColumnsByProviderName = function( viewModel, gridName ) {
    if( gridName && viewModel.grids[ gridName ] ) {
        var columnProviderKey = viewModel.grids[ gridName ].columnProvider;
        if( columnProviderKey && viewModel.columnProviders &&
            viewModel.columnProviders[ columnProviderKey ] ) {
                let columnProvider = viewModel.columnProviders[ columnProviderKey ];
                let columns = columnProvider.columns;
                if ( ( !columns || !columns.length ) && columnProvider.columnConfig ) {
                    columns = columnProvider.columnConfig.columns;
                }
                return columns;
        }
    }

    return null;
};

export default exports = {
    retrieveColumnNames,
    getColumnsByProviderName
};
