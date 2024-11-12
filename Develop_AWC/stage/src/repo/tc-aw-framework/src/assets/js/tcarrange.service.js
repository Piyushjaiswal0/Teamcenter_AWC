// Copyright (c) 2022 Siemens

/**
 * @module js/tcarrange.service
 */
import soaSvc from 'soa/kernel/soaService';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import arrangeSvc from 'js/arrange.service';

let exports = {};

/**
 *
 * @param {Object} result - result object that contains the new ColumnConfig object
 * @param {Object} oldColumnConfig - old Column Config that contains 'typesForArrange'
 * @returns {Object} - new Column Config object with typesForArrange patched
 */
export let postResetFunction = function( result, oldColumnConfig ) {
    let colConfig = result && result.columnConfigurations[ 0 ].columnConfigurations[ 0 ];
    colConfig.typesForArrange = oldColumnConfig ? oldColumnConfig.typesForArrange : undefined;
    return colConfig;
};

/**
 * Return the type names from search filter map
 *
 * @param {Object} response - response structure
 * @param {Object} searchFilterMap - Search Filter Map
 *
 * @return {StringArray} The type names array
 */
export const getTypeNames = function( response, searchFilterMap ) {
    const tempSearchFilterMap = searchFilterMap ? searchFilterMap : response;
    let typeNames = [];
    let filters = _.get( tempSearchFilterMap, 'WorkspaceObject.object_type' );
    if( !filters ) {
        filters = _.get( tempSearchFilterMap, 'SAVED_QUERY_RESULT_TYPES' );
    }
    let hasSelectedFilters = false;
    if( _.isArray( filters ) ) {
        for( const searchFilter of filters ) {
            if( searchFilter.selected ) {
                hasSelectedFilters = true;
            }
        }

        for( const searchFilter of filters ) {
            let addType = true;
            if( hasSelectedFilters && !searchFilter.selected ) {
                addType = false;
            }

            if( addType ) {
                const typeName = _.get( searchFilter, 'stringValue' );
                if( typeNames.indexOf( typeName ) < 0 ) {
                    typeNames.push( typeName );
                }
            }
        }
    }

    if( typeNames.length === 0 ) {
        typeNames.push( 'WorkspaceObject' );
    }
    const indexOfNone = typeNames.indexOf( '$NONE' );
    if( indexOfNone > 0 ) {
        typeNames.splice( indexOfNone, 1 );
    }

    return typeNames;
};

/**
 * Toggle operation type
 *
 * @param {viewModelJson} arrangeData - The arrange data
 */
export const showAll = function( arrangeData ) {
    arrangeData.originalOperationType = arrangeData.originalOperationType || arrangeData.operationType;
    if( arrangeData.operationType === 'intersection' ) {
        arrangeData.operationType = 'union';
    } else {
        arrangeData.operationType = 'intersection';
    }

    let typeNames = [];
    const searchResponseInfo = appCtxSvc.getCtx( 'searchResponseInfo' );
    if( searchResponseInfo && searchResponseInfo.columnConfig && searchResponseInfo.columnConfig.typesForArrange &&
        searchResponseInfo.columnConfig.typesForArrange.length > 0 ) {
        for( const typeForArrange of searchResponseInfo.columnConfig.typesForArrange ) {
            typeNames.push( typeForArrange );
        }
    } else if( searchResponseInfo && searchResponseInfo.searchFilterMap ) {
        typeNames = exports.getTypeNames( searchResponseInfo.searchFilterMap );
    }

    const clientScopeURI = arrangeData.objectSetUri || appCtxSvc.getCtx( 'sublocation.clientScopeURI' );
    const inputData = {
        getOrResetUiConfigsIn: [ {
            clientName: 'AWClient',
            businessObjects: appCtxSvc.ctx.mselected ? appCtxSvc.ctx.mselected : [],
            columnConfigQueryInfos: [ {
                clientScopeURI: clientScopeURI,
                columnsToExclude: [],
                operationType: arrangeData.operationType,
                typeNames: typeNames
            } ],
            hostingClientName: '',
            resetColumnConfig: false,
            scope: 'LoginUser',
            scopeName: ''
        } ]
    };
    soaSvc.postUnchecked( 'Internal-AWS2-2023-06-UiConfig', 'getOrResetUIColumnConfigs4', inputData ).then( function( response ) {
        if( response.columnConfigurations && response.columnConfigurations.length > 0 &&
            response.columnConfigurations[ 0 ].columnConfigurations &&
            response.columnConfigurations[ 0 ].columnConfigurations.length > 0 &&
            response.columnConfigurations[ 0 ].columnConfigurations[ 0 ].columns &&
            response.columnConfigurations[ 0 ].columnConfigurations[ 0 ].columns.length > 0 ) {
            arrangeData.columnDefs = [];
            arrangeData.filteredColumnDefs = [];
            arrangeData.availableColumnDefs = [];
            arrangeData.filteredAvailableColumnDefs = [];

            for( let i = 0; i < response.columnConfigurations[ 0 ].columnConfigurations[ 0 ].columns.length; ++i ) {
                if( arrangeData.useStaticFirstCol && i === 0 ) {
                    continue;
                }

                const column = response.columnConfigurations[ 0 ].columnConfigurations[ 0 ].columns[ i ];
                const columnDef = arrangeSvc.initializeColumnDef( column, column.columnOrder, column.propertyName, column.associatedTypeName + '.' + column.propertyName );

                if( columnDef.visible ) {
                    arrangeData.columnDefs.push( columnDef );
                    arrangeData.filteredColumnDefs.push( columnDef );
                } else {
                    arrangeData.availableColumnDefs.push( columnDef );
                    arrangeData.filteredAvailableColumnDefs.push( columnDef );

                    arrangeData.availableColumnDefs = _.sortBy( arrangeData.availableColumnDefs, function( availableColumn ) {
                        return availableColumn.displayName;
                    } );

                    arrangeData.filteredAvailableColumnDefs = _.sortBy( arrangeData.filteredAvailableColumnDefs, function( filteredAvailableColumn ) {
                        return filteredAvailableColumn.displayName;
                    } );
                }
            }
            eventBus.publish( 'operationTypeChanged' );
            eventBus.publish( 'columnChanged', {
                arrangeData: arrangeData
            } );
        }
    } );
};

export default exports = {
    postResetFunction,
    getTypeNames,
    showAll
};
