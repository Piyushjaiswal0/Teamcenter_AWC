// Copyright (c) 2022 Siemens

/**
 * Module for the Export to Office panel
 *
 * @module js/exportToFile
 */
import uwPropertySvc from 'js/uwPropertyService';
import appCtxService from 'js/appCtxService';
import dateTimeService from 'js/dateTimeService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

let exports = {};

let allColumns = {};
let selectedColumns = {};

let _MAX_FILENAME_CHARACTERS = 49;
let initialized = false;
let exportToExcelFileNameVal = '';

/**
 * Move one down or up from list
 *
 * @param {Object} dataProvider - dataprovider
 * @param {Object} moveTo - Direction to move to
 */
export let moveUpDown = function( dataProvider, moveTo ) {
    let sortColumns = dataProvider.exportColumnList;
    let selectedCount = sortColumns.getSelectedIndexes()[ 0 ];
    if( moveTo === 'Down' ) {
        selectedColumns = move( selectedColumns, selectedCount, selectedCount + 1 );
    }
    if( moveTo === 'Up' ) {
        selectedColumns = move( selectedColumns, selectedCount, selectedCount - 1 );
    }
    // Reapply move up/down command variables
    let excelCntx = appCtxService.getCtx( 'excelListCommands' );
    if ( selectedColumns[ selectedColumns.length - 1 ].selected === true ) {
        excelCntx.enableMoveDown = false;
    } else {
        excelCntx.enableMoveDown = true;
    }
    if ( selectedColumns[ 0 ].selected === true ) {
        excelCntx.enableMoveUp = false;
    } else {
        excelCntx.enableMoveUp = true;
    }

    let jso = {
        enableMoveUp: excelCntx.enableMoveUp,
        enableMoveDown: excelCntx.enableMoveDown
    };
    appCtxService.updateCtx( 'excelListCommands', jso );

    // The below line will update the columns order in the view and will retain the selection.
    dataProvider.exportColumnList.update( selectedColumns );
};

let move = function( arr, old_index, new_index ) {
    while( old_index < 0 ) {
        old_index += arr.length;
    }
    while( new_index < 0 ) {
        new_index += arr.length;
    }
    if( new_index >= arr.length ) {
        var k = new_index - arr.length;
        while( k-- + 1 ) {
            arr.push( undefined );
        }
    }
    arr.splice( new_index, 0, arr.splice( old_index, 1 )[ 0 ] );
    return arr;
};
/**
 * Prepares the filename for use by fmsTicket returned.
 * @param {Object} data - viewModel data
 */
let prepareFileName = function( data ) {
    if( !data.exportToExcelFileName ) {
        let fileName = '';
        let subPanelContext = data.subPanelContext;
        if( subPanelContext ) {
            if( subPanelContext.vmo && subPanelContext.vmo.props ) {
                let objectName = '';
                if( subPanelContext.vmo.props.object_name ) {
                    objectName = subPanelContext.vmo.props.object_name.uiValue;
                }
                if( !objectName && subPanelContext.vmo.props.object_string ) {
                    objectName = subPanelContext.vmo.props.object_string.uiValue;
                }

                if( objectName ) {
                    // Add object name, max of 50 characters
                    fileName += objectName.slice( 0, _MAX_FILENAME_CHARACTERS ) + '_';
                }
            }

            if( subPanelContext.displayTitle ) {
                // Add display title, max of 50 characters
                fileName += subPanelContext.displayTitle.slice( 0, _MAX_FILENAME_CHARACTERS ) + '_';
            }
        }

        fileName += dateTimeService.formatNonStandardDate( new Date(), 'yyyy-MM-dd_HH-mm-ss' );
        fileName += '.xlsm';
        data.exportToExcelFileName = fileName;
    }
};

/**
 * Refresh export panel Ctx
 */
export let refreshExportCtx = function( props ) {
    // Back button wipes panelContext when navigating from Add subpanel back to main export panel
    // Need to store panelContext before it gets wiped, then retrieve on export
    let panelContext = appCtxService.getCtx( 'panelContext' );

    // Register exportContext
    if( !appCtxService.getCtx( 'exportContext' ) ) {
        appCtxService.registerCtx( 'exportContext', panelContext  );
    } else if( panelContext.columnProvider ) {
        appCtxService.updateCtx( 'exportContext', panelContext );
    }

    let exportContext = appCtxService.getCtx( 'exportContext' );

    if( !panelContext.columnProvider ) {
        appCtxService.updateCtx( 'panelContext', exportContext );
    }
};

/**
 * Prepare column list
 *
 * @param {Object} data - The panel's view model object
 */
export let prepareColumnList = function( data, ctx, props ) {
    let columns = props.columns || props.dataProvider.columnConfig.columns
       || props.columnProvider.columnConfig.columns ||
       props.columnProvider.columns;
    // With the new XRT design, initial rendering of objectSet table does not update commandContext with proper columnProvider info
    // dataProvider info is no longer passed at all. For initial case, panelContext.columns will be from the getdeclarativeStylesheet.
    // For later on like arrange operations of hide or show where we get response from a different SOA, we need to refer to columnProvider.
    let colProvider = props.columnProvider;
    let latestColumns;
    if( colProvider && colProvider.getColumns ) {
        latestColumns = colProvider.getColumns();
        if( latestColumns && latestColumns.length > 0 ) {
            // remove the icon column if it exists.
            columns = _.filter( latestColumns, function( col ) { return col.name !== 'icon'; } );
        }
    }
    let output = {};
    output.exportColumns = {};
    output.exportColumns = data.exportColumns;
    if( columns && !initialized ) {
        allColumns = [];
        initialized = true;
        const uniqueColumns = Array.from( new Set( columns.map( a => a.propertyName ) ) )
            .map( propertyName => {
                return columns.find( a => a.propertyName === propertyName );
            } );
        _.forEach( uniqueColumns, function( column ) {
            let displayedLogicalProp = _createViewModelObjectForProperty( column );
            if( !column.hiddenFlag ) {
                output.exportColumns.dbValue.push( displayedLogicalProp );
            }
            allColumns.push( _.clone( displayedLogicalProp, true ) );
        } );
        prepareFileName( data );
        output.exportToExcelFileName = data.exportToExcelFileName;
        exportToExcelFileNameVal = data.exportToExcelFileName;
        selectedColumns = output.exportColumns.dbValue;
        return output;
    }
    if( columns && columns.length > 0 ) {
        output.exportToExcelFileName = exportToExcelFileNameVal;
        output.exportColumns.dbValue = selectedColumns;
        return output;
    }
};
/**
 * Create view model property for the property info
 *
 * @param {Object} propInfo - Property info
 * @returns {Object} viewModelObject - view model object for the given property info
 */
let _createViewModelObjectForProperty = function( propInfo ) {
    let dispPropName = propInfo.displayName;
    let viewProp = uwPropertySvc.createViewModelProperty( propInfo.propertyName, dispPropName, 'BOOLEAN', [],
        [] );
    uwPropertySvc.setIsRequired( viewProp, false );
    uwPropertySvc.setIsArray( viewProp, false );
    uwPropertySvc.setIsEditable( viewProp, true );
    uwPropertySvc.setIsNull( viewProp, false );
    uwPropertySvc.setPropertyLabelDisplay( viewProp, 'PROPERTY_LABEL_AT_RIGHT' );
    uwPropertySvc.setValue( viewProp, true );
    viewProp.id = propInfo.propertyName;
    return viewProp;
};

/**
 * Remove given column from coulmn list.
 * @param {Object} exportColumns - export columns
 * @param {Object} eventData - eventData with the column to remove
 */
export let removeColumn = function( exportColumns, eventData ) {
    if( eventData && eventData.column ) {
        let output = {};
        let removeIsSucccessful = false;
        for( let i = exportColumns.dbValue.length - 1; i >= 0; i-- ) {
            if( exportColumns.dbValue[ i ].propertyName === eventData.column.propertyName ) {
                exportColumns.dbValue.splice( i, 1 );
                removeIsSucccessful = true;
            }
        }
        output.exportColumns = exportColumns;
        if ( removeIsSucccessful ) {
            // updated the selectedColumns after removing the columns from the panel.
            selectedColumns = exportColumns.dbValue;
            output.exportColumns = exportColumns;
            return output;
        }
    }
};

/*
 * Add columns in coulmn list.
 */
export let addColumns = function() {
    selectedColumns = [];
    if( allColumns ) {
        for ( let value of allColumns ) {
            if( value.dbValue === true ) {
                selectedColumns.push( value );
            }
        }
        initialized = true;
        eventBus.publish( 'exportExcel.updatedColumnList' );
    }
};
/* Update coulmn list.
 *
 * @param {Object} data - The view model data
 */
export let updateColumnList = function() {
    let panelContext = appCtxService.getCtx( 'panelContext' );
    let destPanelId = 'Awp0ExportToExcelSub';
    let eventData = {
        destPanelId: destPanelId,
        supportGoBack: true,
        backNavigation: true,
        providerName: panelContext.providerName,
        columns: panelContext.columns,
        objectSetUri: panelContext.objectSetUri,
        columnProvider: panelContext.columnProvider,
        searchCriteria: panelContext.searchCriteria
    };
    eventBus.publish( 'awPanel.navigate', eventData );
};
/* Set coulmn list.
 *
 * @param {Object} data - The view model data
 */
export let setColumns = function() {
    let output = {};
    // Reset selectedColumns if back was used instead of set columns button
    _.forEach( allColumns, function( column ) {
        uwPropertySvc.setValue( column, true );
    } );
    let selectColumns = _.differenceBy( allColumns, selectedColumns, 'propertyName' );
    _.forEach( selectColumns, function( column ) {
        uwPropertySvc.setValue( column, false );
    } );
    output.allColumns = allColumns;
    return output;
};
/* Change move up/down command state on selection change
 *
 * @param {Object} data - The view model data
 */
export let columnSelectionChanged = function( data ) {
    let excelCntx = appCtxService.getCtx( 'excelListCommands' );
    let columnListLength = data.exportColumnList.getLength();
    let selectedColumn = data.exportColumnList.selectedObjects[ 0 ];
    if( data.exportColumnList.getItemAtIndex( 0 ) && selectedColumn &&
        data.exportColumnList.getItemAtIndex( 0 ).propertyName === selectedColumn.propertyName ) {
        excelCntx.enableMoveUp = false;
    } else {
        excelCntx.enableMoveUp = true;
    }
    if( data.exportColumnList.getItemAtIndex( columnListLength - 1 ) && selectedColumn &&
        data.exportColumnList.getItemAtIndex( columnListLength - 1 ).propertyName === selectedColumn.propertyName ) {
        excelCntx.enableMoveDown = false;
    } else {
        excelCntx.enableMoveDown = true;
    }

    // Update selected property value in the global selected columns array.
    _.forEach( selectedColumns, function( column ) {
        if ( selectedColumn && column && column.propertyName === selectedColumn.propertyName ) {
            column.selected = selectedColumn.selected;
        }else{
            column.selected = false;
        }
    } );

    let jso = {
        enableMoveUp: excelCntx.enableMoveUp,
        enableMoveDown: excelCntx.enableMoveDown
    };
    appCtxService.updateCtx( 'excelListCommands', jso );
};
/* Register context to update command state
 */
export let registerCmdContext = function() {
    let jso = {
        enableMoveUp: true,
        enableMoveDown: true
    };
    initialized = false;
    appCtxService.registerCtx( 'excelListCommands', jso );
};
/* unregister context to update command state
 */
export let unRegisterCmdContext = function() {
    cleanup();
    appCtxService.unRegisterCtx( 'excelListCommands' );
};
/* return selected properties
 * @param {Object} data - The view model data
 */
export let getSelectedProperties = function() {
    let properties = [];
    _.forEach( selectedColumns, function( column ) {
        let newProperty = {};
        newProperty.internalName = column.propertyName;
        newProperty.displayName = column.propertyDisplayName;
        properties.push( newProperty );
    } );
    return properties;
};

export let getClientScopeURI = function( objectSetUri ) {
    let clientScopeUri = null;
    if( objectSetUri ) {
        clientScopeUri = objectSetUri;
    }

    if( !clientScopeUri ) {
        clientScopeUri = appCtxService.ctx.sublocation.clientScopeURI;
    }

    return clientScopeUri;
};

export const updateAllColumns = ( data ) => {
    let output = {};
    allColumns = {};
    allColumns = data.allColumns;
    output.allColumns = data.allColumns;
    return output;
};

export const getColumnFilters = ( columnProvider ) => {
    if( columnProvider ) {
        return columnProvider.getColumnFilters();
    }
};

export const getSortCriteria = ( columnProvider ) => {
    if( columnProvider ) {
        return columnProvider.getSortCriteria();
    }
};

export const cleanup = () => {
    allColumns = {};
    selectedColumns = {};
    initialized = false;
};

exports = {
    moveUpDown,
    prepareColumnList,
    removeColumn,
    addColumns,
    updateColumnList,
    setColumns,
    columnSelectionChanged,
    registerCmdContext,
    unRegisterCmdContext,
    getSelectedProperties,
    getClientScopeURI,
    refreshExportCtx,
    updateAllColumns,
    getColumnFilters,
    getSortCriteria,
    cleanup
};
export default exports;
