// Copyright (c) 2022 Siemens

/**
 * @module js/treeTableDataService
 */
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import tcVmoService from 'js/tcViewModelObjectService';
import cdmSvc from 'soa/kernel/clientDataModel';
import awTableTreeSvc from 'js/published/splmTablePublishedTreeService';
import assert from 'assert';
import _ from 'lodash';

var _propertyLoadResult = null;

/**
 * ***********************************************************<BR>
 * Define external API<BR>
 * ***********************************************************<BR>
 */
var exports = {};

/**
 * Process tree table properties for initial load.
 *
 * @param {Object} vmNodes loadedVMObjects for processing properties on initial load.
 * @param {Object} declViewModel data object.
 * @param {Object} uwDataProvider data provider object.
 * @param {Object} context context object required for SOA call.
 * @param {String} contextKey contextKey string for context retrieval.
 * @param {Object} updateColumnPropsCallback callback function for processing column props.
 * @return {Promise} promise A Promise containing the PropertyLoadResult.
 */
export let loadTreeTablePropertiesOnInitialLoad = function( vmNodes, declViewModel, uwDataProvider, context, contextKey, updateColumnPropsCallback, overriddenPropertyPolicy ) {
    var propertyLoadContextLcl = context ? context : {};
    _propertyLoadResult = awTableTreeSvc.createPropertyLoadResult( vmNodes );

    var allChildNodes = [];

    if( uwDataProvider && !uwDataProvider.columnConfig.columnConfigId ) {
        uwDataProvider.columnConfigLoadingInProgress = true;
        propertyLoadContextLcl.columnsToExclude = appCtxSvc.ctx[ contextKey ].columnsToExclude;
        var loadVMOPropsThreshold = 0;

        _.forEach( vmNodes, function( childNode ) {
            if( !childNode.props ) {
                childNode.props = {};

                if( cdmSvc.isValidObjectUid( childNode.uid ) && loadVMOPropsThreshold <= 50 ) {
                    allChildNodes.push( childNode );
                    loadVMOPropsThreshold++;
                }
            }
        } );

        if( uwDataProvider && !uwDataProvider.topTreeNode.props ) {
            allChildNodes.push( uwDataProvider.topTreeNode );
        }

        return tcVmoService.getTableViewModelProperties( allChildNodes, propertyLoadContextLcl, overriddenPropertyPolicy ).then( function( response ) {
            if( response && !declViewModel.isDestroyed() ) {
                var propColumns = response.output.columnConfig.columns;
                var columnConfigResult = updateColumnPropsCallback.callUpdateColumnPropsAndNodeIconURLsFunction( propColumns, allChildNodes, contextKey, response, uwDataProvider );
                delete uwDataProvider.columnConfigLoadingInProgress;
                _propertyLoadResult.columnConfig = columnConfigResult;
                return AwPromiseService.instance.resolve( {
                    propertyLoadResult: _propertyLoadResult
                } );
            }
        } );
    }
    _propertyLoadResult.columnConfig = uwDataProvider.columnConfig;

    return AwPromiseService.instance.resolve( {
        propertyLoadResult: _propertyLoadResult
    } );
};

/**
 * Get a page of row column data for a tree-table.
 *
 * Note: This method assumes there is a single argument object being passed to it and that this object has the
 * following property(ies) defined in it.
 * <P>
 * {PropertyLoadInput} propertyLoadInput - (found within the 'arguments' property passed to this function) The
 * PropertyLoadInput contains an array of PropertyLoadRequest objects this action function is invoked to
 * resolve.
 *
 * @return {Promise} A Promise resolved with a 'PropertyLoadResult' object containing the details of the result.
 */
export let loadTreeTableProperties = function() {
    /**
     * Extract action parameters from the argument to this function.
     */
    assert( arguments.length === 1, 'Invalid argument count' );
    assert( arguments[ 0 ].propertyLoadInput, 'Missing argument property' );
    assert( arguments[ 0 ].contextKey, 'Missing argument property : contextKey' );

    var uwDataProvider = arguments[ 0 ].uwDataProvider;
    var declViewModel = arguments[ 0 ].declViewModel;
    var propertyLoadInput = arguments[ 0 ].propertyLoadInput;
    var contextKey = arguments[ 0 ].contextKey;
    var propLoadCtxt = arguments[ 0 ].propertyLoadContext;
    var updateColumnPropsCallback = arguments[ 0 ].updateColumnPropsCallback;
    var overriddenPropertyPolicy = arguments[ 0 ].overriddenPropertyPolicy;


    if( uwDataProvider && !_.isUndefined( uwDataProvider.columnConfigLoadingInProgress ) ) {
        return AwPromiseService.instance.resolve( {
            propertyLoadResult: _propertyLoadResult
        } );
    }

    return _loadProperties( propertyLoadInput, propLoadCtxt, contextKey, declViewModel, uwDataProvider, updateColumnPropsCallback, overriddenPropertyPolicy );
};

/**
 * Process tree table properties on tree node expansion.
 *
 * @param {Object} propertyLoadInput propertyLoadInput for processing properties.
 * @param {Object} propertyLoadContext propertyLoadContext object.
 * @param {String} contextKey contextKey for context retrieval.
 * @param {String} declViewModel data object.
 * @param {Object} uwDataProvider data provider object.
 * @param {Object} updateColumnPropsCallback callback function for processing column props.
 * @return {PropertyLoadResult} propertyLoadResult returns propertyLoadResult object.
 */
function _loadProperties( propertyLoadInput, propertyLoadContext, contextKey, declViewModel, uwDataProvider, updateColumnPropsCallback, overriddenPropertyPolicy ) {
    var propertyLoadContextLcl = propertyLoadContext ? propertyLoadContext : {};
    var allChildNodes = [];

    propertyLoadContextLcl.columnsToExclude = appCtxSvc.ctx[ contextKey ].columnsToExclude ? appCtxSvc.ctx[ contextKey ].columnsToExclude : [];

    _.forEach( propertyLoadInput.propertyLoadRequests, function( propertyLoadRequest ) {
        _.forEach( propertyLoadRequest.childNodes, function( childNode ) {
            if( !childNode.props || !_.size( childNode.props ) ) {
                childNode.props = {};

                if( cdmSvc.isValidObjectUid( childNode.uid ) ) {
                    allChildNodes.push( childNode );
                }
            }
        } );
    } );

    var propertyLoadResult = awTableTreeSvc.createPropertyLoadResult( allChildNodes );

    if( uwDataProvider && !uwDataProvider.topTreeNode.props ) {
        allChildNodes.push( uwDataProvider.topTreeNode );
    }

    if( _.isEmpty( allChildNodes ) ) {
        if( !_.isUndefined( uwDataProvider.columnConfig ) ) {
            propertyLoadResult.columnConfig = uwDataProvider.columnConfig;
        }

        return AwPromiseService.instance.resolve( {
            propertyLoadResult: propertyLoadResult
        } );
    }

    return tcVmoService.getTableViewModelProperties( allChildNodes, propertyLoadContextLcl, overriddenPropertyPolicy ).then(
        function( response ) {
            if( response && !declViewModel.isDestroyed() ) {
                var propColumns = response.output.columnConfig.columns;
                var columnConfigResult = updateColumnPropsCallback.callUpdateColumnPropsAndNodeIconURLsFunction( propColumns, allChildNodes, contextKey, response, uwDataProvider );
                propertyLoadResult.columnConfig = columnConfigResult;
            }

            return {
                propertyLoadResult: propertyLoadResult
            };
        } );
}

export let updateVMODisplayName = function( VMO, _firstColumnPropertyName ) {
    if( _firstColumnPropertyName && VMO.props && VMO.props && VMO.props[ _firstColumnPropertyName ] ) {
        var displayValue = VMO.props[ _firstColumnPropertyName ].displayValues[ 0 ];

        if( !_.isUndefined( VMO.props[ _firstColumnPropertyName ].oldValues ) ) {
            displayValue = VMO.props[ _firstColumnPropertyName ].oldValues[ 0 ];
        }

        VMO.displayName = displayValue;
    }
};

export default exports = {
    loadTreeTablePropertiesOnInitialLoad,
    loadTreeTableProperties,
    updateVMODisplayName
};
