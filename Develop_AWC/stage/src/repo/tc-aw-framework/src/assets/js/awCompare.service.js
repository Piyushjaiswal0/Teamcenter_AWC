// Copyright (c) 2022 Siemens

/**
 * Defines provider for commands from the View model definition
 *
 * @module js/awCompare.service
 */
import _ from 'lodash';
import viewModelObjectService from 'js/viewModelObjectService';
import soaService from 'soa/kernel/soaService';
import functional from 'js/functionalUtility.service';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import declUtils from 'js/declUtils';
import actionSvc from 'js/actionService';
import eventBus from 'js/eventBus';

let exports = {};

/**
 * Load properties for compare
 *
 * @param {*} modelObjects - objects to convert
 * @param {*} columns - columns
 * @returns {Promise} resolved when properties are loaded
 */
export let getViewModelObjects = function( modelObjects, columns ) {
    if( !columns ) {
        return new Promise( ( resolve ) => {
            resolve( {
                searchResults: [],
                totalFound: 0
            } );
        } );
    }

    var propNames = columns.map( function( col ) {
        return col.propertyName || col.propDescriptor.propertyName;
    } );

    var viewModelObjects = modelObjects.map( function( modelObject ) {
        let vmo = viewModelObjectService.constructViewModelObjectFromModelObject( modelObject );
        vmo.displayName = vmo.props.object_string ? vmo.props.object_string.uiValues[ 0 ] : vmo.props.object_name ? vmo.props.object_name.uiValues[ 0 ] : '';
        return vmo;
    } );
    /**
     * Due to the classification speficic code PLM565540 being added only to getViewModelProperties SOA but not to getViewModelProperties2 SOA,
     * cannot replace this case to use the new getViewModelProperties2 SOA.
     */
    return tcViewModelObjectService.getViewModelPropertiesDeprecated( viewModelObjects, propNames ).then( function( result ) {
        if( result && result.output && result.output.objects ) {
            putClsData( viewModelObjects, result.output.objects );
        }
        return {
            searchResults: viewModelObjects,
            totalFound: viewModelObjects.length
        };
    } );
};

/**
 * Get the types that are currently displayed and decide if SOA call is necessary
 *
 * @param {String} serviceName - base soa input (without type info)
 * @param {String} operationName - base soa input (without type info)
 * @param {Object} soaInput - base soa input (without type info)
 * @param {ModelObject[]} modelObjects - objects to get type info from
 * @param {Object} columnProvider - column provider, used to decide if SOA call is necessary
 * @returns {Promise} SOA promise
 */
export let getTypesAndCallSoa = function( serviceName, operationName, soaInput, modelObjects, columnProvider ) {
    var types = Object.keys( modelObjects.map( functional.getProp( 'type' ) ).reduce( functional.toBooleanMap, {} ) );
    columnProvider.types = types;
    var colConfigInput = soaInput.getOrResetUiConfigsIn[ 0 ];
    colConfigInput.businessObjects = modelObjects;
    colConfigInput.columnConfigQueryInfos[ 0 ].typeNames = types;
    return soaService.postUnchecked( serviceName, operationName, soaInput ).then( function( result ) {
        result.types = types;
        return result;
    } );
};

export let putClsData = function( viewModelObjects, objects ) {
    var vmoProps = {};
    for( var obj in objects ) {
        var clsProp = {};
        for( var allProps in objects[ obj ].viewModelProperties ) {
            if( objects[ obj ].viewModelProperties[ allProps ].propertyName.startsWith( 'CLS_ATTR:' ) ) {
                if( objects[ obj ] && objects[ obj ].viewModelProperties[ allProps ] && objects[ obj ].viewModelProperties[ allProps ].uiValues &&
                    objects[ obj ].viewModelProperties[ allProps ].dbValues ) {
                    var value = {};
                    value.uiValues = objects[ obj ].viewModelProperties[ allProps ].uiValues;
                    value.dbValues = objects[ obj ].viewModelProperties[ allProps ].dbValues;
                    clsProp[ objects[ obj ].viewModelProperties[ allProps ].propertyName ] = value;
                }
            }
        }
        vmoProps[ objects[ obj ].modelObject.uid ] = clsProp;
    }
    for( var vmo in viewModelObjects ) {
        var clsPropList = vmoProps[ viewModelObjects[ vmo ].uid ];
        for( var prop in clsPropList ) {
            viewModelObjects[ vmo ].props[ prop ].dbValues = clsPropList[ prop ].dbValues;
            viewModelObjects[ vmo ].props[ prop ].uiValues = clsPropList[ prop ].uiValues;
            if( clsPropList[ prop ].uiValues.length === 1 ) {
                viewModelObjects[ vmo ].props[ prop ].uiValue = viewModelObjects[ vmo ].props[ prop ].uiValues[ 0 ];
            }
            if( clsPropList[ prop ].dbValues.length === 1 ) {
                viewModelObjects[ vmo ].props[ prop ].dbValue = viewModelObjects[ vmo ].props[ prop ].dbValues[ 0 ];
            }
        }
    }
};

let getSaveUIColumns = function( arrangeColumns ) {
    let returnColumns;
    if( _.isArray( arrangeColumns ) ) {
        returnColumns = arrangeColumns.map( function( column ) {
            return {
                columnOrder: column.columnOrder,
                hiddenFlag: column.hiddenFlag,
                pixelWidth: column.pixelWidth,
                propertyName: column.propertyName,
                sortDirection: column.sortDirection,
                sortPriority: column.sortPriority,
                associatedTypeName: column.associatedTypeName || column.typeName,
                isTextWrapped: column.isTextWrapped
            };
        } );
    }
    return returnColumns || [];
};

let getNewUIColumns = function( arrangeColumns ) {
    let returnColumns;
    if( _.isArray( arrangeColumns ) ) {
        returnColumns = arrangeColumns.map( function( column ) {
            return {
                field: column.propertyName,
                propertyName: column.propertyName,
                name: column.propertyName,
                columnOrder: column.columnOrder,
                hiddenFlag: column.hiddenFlag,
                pixelWidth: column.pixelWidth,
                sortDirection: column.sortDirection,
                sortPriority: column.sortPriority,
                associatedTypeName: column.associatedTypeName || column.typeName,
                displayName: column.displayName,
                sortBy: column.sortByFlag,
                isTextWrapped: column.isTextWrapped
            };
        } );
    }
    return returnColumns || [];
};

export const arrangeColumns = function( dataProvider, gridId, eventData ) {
    var output = {};
    // If gridId doesn't match the one in eventData, then return nothing.
    if( gridId !== eventData.name ) {
        return new Promise( ( resolve ) => resolve() );
    }
    if( eventData.arrangeType !== 'reset' ) {
        dataProvider.newColumns = getSaveUIColumns( eventData.columns );
        dataProvider.columnConfig.columns = getNewUIColumns( eventData.columns );
    }
    output.newColumns = dataProvider.newColumns;
    output.columnConfig = {};
    output.columnConfig.columns = dataProvider.columnConfig.columns;
    return output;
};

export const saveColumns = function( columnProvider, gridId, declViewModel, ctx, eventData, subPanelContext ) {
    // If gridId doesn't match the one in eventData, then return nothing.
    if( gridId !== eventData.name ) {
        return new Promise( ( resolve ) => resolve() );
    }
    let action = declViewModel.getAction( columnProvider.resetColumnAction );
    if( eventData.arrangeType !== 'reset' ) {
        action = declViewModel.getAction( columnProvider.saveColumnAndLoadAction );
    }

    let promise;
    if ( action.deps === undefined ) {
        let evaluationCtx = {
            data: declViewModel,
            ctx: ctx,
            subPanelContext: subPanelContext
        };
        promise = actionSvc.executeAction( declViewModel, action, evaluationCtx, undefined );
    }else{
        promise = declUtils.loadDependentModule( action.deps ).then(
            function( debModuleObj ) {
                let evaluationCtx = {
                    data: declViewModel,
                    ctx: ctx,
                    subPanelContext: subPanelContext
                };
                return actionSvc.executeAction( declViewModel, action, evaluationCtx,
                    debModuleObj );
            } );
    }

    promise.then( function() {
        eventBus.publish( gridId + '.plTable.clientRefresh' );
    } );

    return promise;
};

export default exports = {
    getViewModelObjects,
    getTypesAndCallSoa,
    arrangeColumns,
    saveColumns,
    putClsData
};
