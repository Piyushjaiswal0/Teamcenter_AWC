// Copyright (c) 2022 Siemens

/**
 * @module js/arrange.service
 */
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

let exports = {};

/**
 * Set the visibility of the columns
 *
 * @param {Array} columns - columnDefs
 */
let setVisibilityOfColumns = function( columns ) {
    for( let i = 0; i < columns.length; i++ ) {
        columns[ i ].visible = columns[ i ].dbValue;
        columns[ i ].hiddenFlag = !columns[ i ].dbValue;
    }
};

/**
 * Remove sort from columns if saving disabled.
 *
 * @param {Array} columns - table columns
 * @param {object} arrangeData - data sent to arrange panel
 */
let processSortOfColumnsForSaving = function( columns, arrangeData ) {
    if ( arrangeData.enableSaveSortCriteria === false ) {
        for( let currentColumn of columns ) {
            currentColumn.sortPriority = 0;
            currentColumn.sortDirection = '';
        }
    }
};

/**
 * Return the column config that has set 'isCurrent'.
 *
 * @param {Array} columnConfigs - saved/loaded/existing named column configs
 * @returns {Object} the current named column config, or empty object
 */
let getCurrentColumnConfig = function( columnConfigs ) {
    let returnColumnConfig = {};
    if( _.isArray( columnConfigs ) ) {
        _.forEach( columnConfigs, function( columnConfig ) {
            if( columnConfig.isCurrent ) {
                returnColumnConfig = columnConfig;
                return false;
            }
        } );
    }
    return returnColumnConfig;
};

/**
 * Unload the loaded column config from the panel.
 *
 * @param {ViewModel} data - arrange panel viewModel
 * @param {Object} removedColumnConfig - removed/deleted column config
 */
let unloadColumnConfig = function( data, removedColumnConfig ) {
    data.arrangeData.loadedColumnConfigUid = data.arrangeData.originalColumnConfig.columnConfigUid;
    data.newColumnConfigName.dbValue = removedColumnConfig.columnConfigName;
    data.newColumnConfig.dbValue = true;
    data.columnConfigName.uiValue = '';
};

/**
 * Set the arrange status for button visibility.
 *
 * @param {Object} arrangeData - arrange panel data
 */
let setArrangeStatus = function( data ) {
    if( data.newColumnConfig.dbValue ) {
        data.arrangeData.isArrange = false;
        data.arrangeData.isArrangeAndSave = false;
        data.arrangeData.isArrangeAndCreate = true;
    } else if( data.arrangeData.isExistingColumnConfigLoaded || data.arrangeData.originalColumnConfig && data.arrangeData.originalColumnConfig.columnConfigName ) {
        data.arrangeData.isArrange = false;
        data.arrangeData.isArrangeAndSave = true;
        data.arrangeData.isArrangeAndCreate = false;
    } else {
        data.arrangeData.isArrange = true;
        data.arrangeData.isArrangeAndSave = false;
        data.arrangeData.isArrangeAndCreate = false;
    }
};

let createNamedSoaColumn = function( column ) {
    return {
        displayName: column.displayName,
        associatedTypeName: column.typeName ? column.typeName : column.associatedTypeName,
        propertyName: column.propertyName,
        pixelWidth: column.pixelWidth,
        columnOrder: column.columnOrder,
        hiddenFlag: column.hiddenFlag,
        sortPriority: column.sortPriority,
        sortDirection: column.sortDirection,
        filters: column.savedFilters || column.filters,
        isTextWrapped: column.isTextWrapped,
        filterDefinitionKey: column.filterDefinitionKey,
        isFilteringEnabled: column.isFilteringEnabled,
        dataType: column.dataType,
        isFrozen: column.isFrozen
    };
};

let setFilteredColumns = function( filter, columnDefs, filteredColumnDefs ) {
    for( const columnDef of columnDefs ) {
        if( filter !== '' ) {
            let displayName = columnDef.displayName.toLocaleLowerCase().replace( /\\|\s/g,
                '' );
            if( displayName.indexOf( filter.toLocaleLowerCase().replace( /\\|\s/g, '' ) ) !== -1 ) {
                // Filter matches a column name
                filteredColumnDefs.push( columnDef );
            }
        } else {
            // No filter
            filteredColumnDefs.push( columnDef );
        }
    }
};

let getOutputColumns = function( arrangeData ) {
    let arrangeColumns = _.concat( arrangeData.columnDefs, arrangeData.availableColumnDefs );
    setVisibilityOfColumns( arrangeColumns );
    arrangeColumns = _.orderBy( arrangeColumns, [ 'columnOrder' ], [ 'asc' ] );

    let outputColumns = [];
    if( arrangeData.useStaticFirstCol && arrangeData.staticColumn ) {
        outputColumns.push( arrangeData.staticColumn );
    }
    outputColumns.push( ...arrangeColumns );

    return outputColumns;
};

/**
 * Set the disability of the buttons for arrange.
 *
 * @param {boolean} isDisabled - whether to disable/enable arrange buttons
 */
export let setDisabilityOfArrange = function( isDisabled ) {
    let buttonElements = document.getElementsByClassName( 'arrange_submitButton' );
    _.forEach( buttonElements, function( currentButtonElement ) {
        if( isDisabled ) {
            currentButtonElement.classList.add( 'disabled' );
        } else {
            currentButtonElement.classList.remove( 'disabled' );
        }
    } );
};

/**
 * Create the SOA columns for named column config input.
 *
 * @param {Object} arrangeData - contains arrange panel information
 * @param {Array} columns - column defs of the column config from arrange panel
 * @returns {Array} array of columns in simplified format
 */
export let createNamedSoaColumns = function( arrangeData ) {
    // Skip first column if useStaticFirstCol is true
    let soaColumns = [];
    if( arrangeData.useStaticFirstCol && arrangeData.staticColumn ) {
        soaColumns.push( createNamedSoaColumn( arrangeData.staticColumn ) );
    }
    let arrangeColumns = getOutputColumns( arrangeData );
    processSortOfColumnsForSaving( arrangeColumns, arrangeData );
    let soaArrangeColumns = arrangeColumns.map( function( currentColumn ) {
        return createNamedSoaColumn( currentColumn );
    } );

    soaColumns.push( ...soaArrangeColumns );

    return _.uniqBy( soaColumns, function( column ) {
        return column.propertyName;
    } );
};

/**
 * Get the clientScopeUri of the current table/sublocation.
 *
 * @returns {String} clientScopeUri
 */
export let getClientScopeUri = function() {
    return appCtxSvc.ctx.ArrangeClientScopeUI.objectSetUri || appCtxSvc.ctx.sublocation.clientScopeURI;
};

/**
 * Mark arrange data as dirty when column visibility changed.
 *
 * @param {viewModelJson} arrangeData - The arrange data
 */
export let columnVisibilityChanged = function( data ) {
    data = {
        arrangeData: _.cloneDeep( data.arrangeData ),
        newColumnConfig: _.cloneDeep( data.newColumnConfig )
    };

    let allColumnsVisible = true;
    data.arrangeData.isColumnsSelected = false;
    for( let element of data.arrangeData.columnDefs ) {
        // Name column is always visible
        if( element.propertyName === 'object_name' && !element.dbValue ) {
            element.dbValue = true;
        }

        if( element.dbValue === true ) {
            data.arrangeData.isColumnsSelected = true;
        }
    }

    for( let element of data.arrangeData.columnDefs ) {
        if( !element.dbValue ) {
            allColumnsVisible = false;
            break;
        }
    }

    data.arrangeData.allColumnsVisible = allColumnsVisible;
    markDirty( data );
    let output = {};
    output.arrangeData = data.arrangeData;
    output.newColumnConfig = data.newColumnConfig;
    return output;
};

/**
 * Call the columnConfigLoadRedirect for arrange panel.
 *
 * @param {Object} loadedColumnConfig - named column config
 */
export let preLoadColumnConfig = function( loadedColumnConfig ) {
    eventBus.publish( 'arrangePanel.columnConfigLoadRedirect', loadedColumnConfig );
};

/**
 * Load an existing column configuration into the arrange panel.
 *
 * @param {ViewModel} data - View Model of the arrange panel
 * @param {Object} loadedColumnConfig - Column config to load in the arrange panel
 */
export let loadExistingColumnConfig = function( data, loadedColumnConfig ) {
    if( loadedColumnConfig && loadedColumnConfig.columnConfig && loadedColumnConfig.columnConfig.columns ) {
        data.arrangeData.columnDefs.length = 0;
        data.arrangeData.orgColumnDefs.length = 0;
        data.arrangeData.availableColumnDefs.length = 0;
        data.arrangeData.staticColumn = null;

        data.arrangeData.loadedColumnConfig = loadedColumnConfig;
        data.arrangeData.loadedColumnConfigUid = loadedColumnConfig.columnConfigUid;
        data.columnConfigName.uiValue = loadedColumnConfig.columnConfigName || '';
        data.newColumnConfigName.dbValue = loadedColumnConfig.columnConfigName + '_copy';
        data.arrangeData.isExistingColumnConfigLoaded = true;

        let columnOrder = 100;
        for( let i = 0; i < loadedColumnConfig.columnConfig.columns.length; ++i ) {
            let column = loadedColumnConfig.columnConfig.columns[ i ];

            if( column.displayName && column.displayName !== '' ) {
                let columnDef = initializeColumnDef( column, columnOrder, column.propertyName );
                columnOrder += 100;
                // Skip first column if useStaticFirstCol is true
                if( data.arrangeData.useStaticFirstCol && i === 0 ) {
                    data.arrangeData.staticColumn = columnDef;
                    continue;
                }
                if( columnDef.visible ) {
                    data.arrangeData.columnDefs.push( columnDef );
                    let orgColumnDef = _.clone( columnDef );
                    data.arrangeData.orgColumnDefs.push( orgColumnDef );
                } else {
                    data.arrangeData.availableColumnDefs.push( columnDef );
                }
            }
        }
        data.arrangeData.operationType = 'union';

        // Reset panel inputs
        data.newColumnConfig.dbValue = false;
        data.filterBox.dbValue = '';
        data.arrangeData.filter = '';

        data.arrangeData.filteredColumnDefs = [];
        setFilteredColumns( data.arrangeData.filter, data.arrangeData.columnDefs, data.arrangeData.filteredColumnDefs );

        data.arrangeData.filteredAvailableColumnDefs = [];
        setFilteredColumns( data.arrangeData.filterAvailable, data.arrangeData.availableColumnDefs, data.arrangeData.filteredAvailableColumnDefs );

        data.dataProviders.dataProviderColumnConfigs.update( data.arrangeData.filteredColumnDefs, data.arrangeData.filteredColumnDefs.length );
        data.dataProviders.dataProviderAvailableColumnConfigs.update( data.arrangeData.filteredAvailableColumnDefs, data.arrangeData.filteredAvailableColumnDefs.length );
        setDisabilityOfArrange( false );
        let output = {};
        output.arrangeData = data.arrangeData;
        output.newColumnConfig = data.newColumnConfig;
        output.columnConfigName = data.columnConfigName;
        output.newColumnConfigName = data.newColumnConfigName;
        output.filterBox = data.filterBox;
        output.dataProviderColumnConfigs = data.dataProviders.dataProviderColumnConfigs;
        output.dataProviderAvailableColumnConfigs = data.dataProviders.dataProviderAvailableColumnConfigs;
        return output;
    }
};

/**
 * Call the columnConfigRemoveRedirect for arrange panel.
 *
 * @param {Object} namedColumnConfig - named column config to remove
 */
export let preRemoveColumnConfig = function( namedColumnConfig ) {
    eventBus.publish( 'arrangePanel.columnConfigRemoveRedirect', namedColumnConfig );
};

/**
 * Remove the column config from the list of existing/saved.
 *
 * @param {ViewModel} data - View Model of the arrange panel
 * @param {Object} columnConfig - column config to remove
 */
export let removeNamedColumnConfigFromProvider = function( data, columnConfig ) {
    let removedConfigs = _.remove( data.arrangeData.savedColumnConfigs, function( currentConfig ) {
        return currentConfig.columnConfigUid === columnConfig.columnConfigUid;
    } );

    if( removedConfigs[ 0 ] ) {
        if( removedConfigs[ 0 ].isCurrent ) {
            reset( data.arrangeData );
        } else if( removedConfigs[ 0 ].columnConfigUid === data.arrangeData.loadedColumnConfigUid ) {
            unloadColumnConfig( data, removedConfigs[ 0 ] );
        }
    }
    return data.arrangeData.savedColumnConfigs;
};

/**
 * Filter and return list of column configs.
 *
 * @param {viewModelJson} data - The view model data
 */
export let actionFilterList = function( data ) {
    let output = {};
    if( data.arrangeData.columnDefs === null ) {
        let arrangeClientScopeUI = appCtxSvc.getCtx( 'ArrangeClientScopeUI' );
        data.arrangeData.columnConfigId = arrangeClientScopeUI.columnConfigId;
        data.arrangeData.objectSetUri = arrangeClientScopeUI.objectSetUri;
        data.arrangeData.clientScopeUri = arrangeClientScopeUI.objectSetUri || appCtxSvc.ctx.sublocation.clientScopeURI;
        data.arrangeData.operationType = arrangeClientScopeUI.operationType;
        data.arrangeData.name = arrangeClientScopeUI.name;
        data.arrangeData.enableSaveSortCriteria = arrangeClientScopeUI.enableSaveSortCriteria;
        data.arrangeData.useStaticFirstCol = arrangeClientScopeUI.useStaticFirstCol;
        data.arrangeData.columnsData = arrangeClientScopeUI.columnsData;

        data.arrangeData.originalColumnConfig = getCurrentColumnConfig( data.arrangeData.savedColumnConfigs );
        data.arrangeData.loadedColumnConfigUid = data.arrangeData.originalColumnConfig.columnConfigUid;
        data.columnConfigName.uiValue = data.arrangeData.originalColumnConfig.columnConfigName || '';
        let newColumnConfigDefaultName = data.arrangeData.originalColumnConfig.columnConfigName ? data.arrangeData.originalColumnConfig.columnConfigName + '_copy' : data.i18n.defaultNewColumnConfigName;
        data.newColumnConfigName.dbValue = newColumnConfigDefaultName;

        data.arrangeData.columnDefs = [];
        data.arrangeData.availableColumnDefs = [];
        data.arrangeData.orgColumnDefs = [];
        let columnOrder = 100;
        for( let i = 0; i < arrangeClientScopeUI.columns.length; ++i ) {
            let column = arrangeClientScopeUI.columns[ i ];

            if( column.enableColumnHiding === false && ( data.arrangeData.useStaticFirstCol && i !== 0 || !data.arrangeData.useStaticFirstCol ) ) {
                continue;
            }

            if( column.displayName && column.displayName !== '' ) {
                let columnDefPropName = column.field ? column.field : column.name;
                let columnDef = initializeColumnDef( column, columnOrder, columnDefPropName );
                columnOrder += 100;
                // Skip first column if useStaticFirstCol is true
                if( data.arrangeData.useStaticFirstCol && i === 0 ) {
                    data.arrangeData.staticColumn = columnDef;
                    continue;
                }

                if( columnDef.visible ) {
                    data.arrangeData.columnDefs.push( columnDef );
                    let orgColumnDef = _.clone( columnDef );
                    data.arrangeData.orgColumnDefs.push( orgColumnDef );
                } else {
                    data.arrangeData.availableColumnDefs.push( columnDef );
                }
            }
        }

        data.arrangeData.availableColumnDefs = _.sortBy( data.arrangeData.availableColumnDefs, function( column ) {
            return column.displayName;
        } );

        //appCtxSvc.unRegisterCtx( 'ArrangeClientScopeUI' );

        if( !data.arrangeData.operationType && appCtxSvc.ctx.searchResponseInfo && appCtxSvc.ctx.searchResponseInfo.columnConfig &&
            appCtxSvc.ctx.searchResponseInfo.columnConfig.operationType ) {
            data.arrangeData.operationType = appCtxSvc.ctx.searchResponseInfo.columnConfig.operationType
                .toLowerCase();
        }

        let columnConfigNameChangeEvent = function() {
            data.columnConfigName.dirty = true;
            if( !data.arrangeData.loadedColumnConfig || data.arrangeData.loadedColumnConfig !== data.columnConfigName.uiValue ) {
                data.arrangeData.isExistingColumnConfigLoaded = false;
            }
            markDirty( data );
        };

        if( data.arrangeData.columnConfigName ) {
            data.columnConfigName.propApi = data.columnConfigName.propApi || {};
            data.columnConfigName.propApi.fireValueChangeEvent = columnConfigNameChangeEvent;
        }
    }

    if( data.filterBox.dbValue ) {
        data.arrangeData.filter = data.filterBox.dbValue;
    } else {
        data.arrangeData.filter = '';
    }

    if( data.filterAvailableBox.dbValue ) {
        data.arrangeData.filterAvailable = data.filterAvailableBox.dbValue;
    } else {
        data.arrangeData.filterAvailable = '';
    }

    data.arrangeData.filteredColumnDefs = [];
    setFilteredColumns( data.arrangeData.filter, data.arrangeData.columnDefs, data.arrangeData.filteredColumnDefs );

    data.arrangeData.filteredAvailableColumnDefs = [];
    setFilteredColumns( data.arrangeData.filterAvailable, data.arrangeData.availableColumnDefs, data.arrangeData.filteredAvailableColumnDefs );

    output.arrangeData = data.arrangeData;
    output.dataProviderAvailableColumnConfigs = data.dataProviders.dataProviderAvailableColumnConfigs;
    output.dataProviderColumnConfigs = data.dataProviders.dataProviderColumnConfigs;
    output.columnConfigName = data.columnConfigName;
    output.newColumnConfigName = data.newColumnConfigName;
    return output;
};

/**
 * Initialize a column def
 *
 * @param {Object} column - column structure
 * @param {Integer} columnOrder - the column order
 * @param {String} columnDefPropName - the column property name
 * @returns {Object} - the initialized columnDef
 */
export const initializeColumnDef = function( column, columnOrder, columnDefPropName, columnDefName ) {
    return {
        columnOrder: columnOrder,
        dbValue: !column.hiddenFlag,
        displayName: column.displayName,
        hiddenFlag: column.hiddenFlag,
        isEditable: true,
        isEnabled: true,
        isFilteringEnabled: column.isFilteringEnabled,
        isTextWrapped: column.isTextWrapped ? column.isTextWrapped : false,
        name: columnDefName || column.name,
        pixelWidth: column.pixelWidth,
        propApi: {},
        propertyDisplayName: column.displayName,
        propertyLabelDisplay: 'PROPERTY_LABEL_AT_RIGHT',
        propertyName: columnDefPropName,
        savedFilters: column.savedFilters || column.filters || [],
        sortDirection: column.sortDirection ? column.sortDirection : '',
        sortPriority: column.sortPriority,
        type: 'BOOLEAN',
        typeName: column.typeName ? column.typeName : column.associatedTypeName,
        uid: columnDefPropName,
        visible: !column.hiddenFlag
    };
};

/**
 * Initialize the named column configs from list in input.
 *
 * @param {ViewModel} data - arrange panel view model
 * @param {Array} savedColumnConfigs -
 */
export let initializeNamedColumnConfigs = function( data, subPanelContext ) {
    let namedColumnConfigs = [];
    let savedColumnConfigs = [];
    let output = {};
    if( subPanelContext ) {
        savedColumnConfigs = subPanelContext.savedColumnConfigs;
    }
    if( _.isArray( savedColumnConfigs ) ) {
        _.forEach( savedColumnConfigs, function( columnConfig ) {
            let tooltipDisplayName = columnConfig.columnConfigName;
            if( columnConfig.isAdmin ) {
                tooltipDisplayName += ' (' + data.i18n.arrangeAdminTitle + ')';
            }
            let newColumnConfig = {
                propertyName: 'named_column_config',
                propertyDisplayName: columnConfig.columnConfigName,
                tooltipDisplayName: tooltipDisplayName,
                isModifiable: columnConfig.isModifiable,
                columnConfigUid: columnConfig.columnConfigUid,
                getId: function() {
                    return this.columnConfigUid;
                }
            };

            namedColumnConfigs.push( newColumnConfig );
        } );
    }

    data.namedColumnConfigs = namedColumnConfigs;
    output.namedColumnConfigs = namedColumnConfigs;
    return output;
};

/**
 * Select one or more columns.
 *
 * @param {viewModelJson} data - The view model data
 * @param {viewModelJson} eventData - Event data
 */
export let selectColumn = function( data, eventData ) {
    data = {
        dataProviders: _.cloneDeep( data.dataProviders ),
        arrangeData: data.arrangeData
    };

    let selectedColumns = eventData.selectedObjects.length ? eventData.selectedObjects : data.dataProviders.dataProviderColumnConfigs.selectedObjects;
    if( selectedColumns.length > 0 ) {
        // Set selectedColumns array to the order they appear on the arrange panel, not the order in which they were added to the selection
        let updatedSelectedColumns = _.intersectionBy( data.arrangeData.columnDefs, selectedColumns, 'propertyName' );
        if( updatedSelectedColumns.length > 0 ) {
            data.dataProviders.dataProviderColumnConfigs.selectionModel.setSelection( updatedSelectedColumns );
        }
        data.dataProviders.dataProviderAvailableColumnConfigs.selectionModel.setSelection( [] );
    } else {
        if( data.dataProviders.dataProviderColumnConfigs.selectedObjects.length > 0 || eventData.selectedObjects.length > 0 ) {
            data.dataProviders.dataProviderColumnConfigs.selectionModel.setSelection( [] );
        }
    }
    let output = {};
    output.dataProviderAvailableColumnConfigs = data.dataProviders.dataProviderAvailableColumnConfigs;
    output.dataProviderColumnConfigs = data.dataProviders.dataProviderColumnConfigs;
    return output;
};

/**
 * Select one or more columns.
 *
 * @param {viewModelJson} data - The view model data
 * @param {viewModelJson} eventData - Event data
 */
export let selectAvailableColumn = function( data, eventData ) {
    data = {
        dataProviders: _.cloneDeep( data.dataProviders ),
        arrangeData: data.arrangeData
    };

    let selectedColumns = eventData.selectedObjects.length ? eventData.selectedObjects : data.dataProviders.dataProviderAvailableColumnConfigs.getSelectedObjects();
    if( selectedColumns.length > 0 ) {
        // Set selectedColumns array to the order they appear on the arrange panel, not the order in which they were added to the selection
        let updatedSelectedAvailableColumns = _.intersectionBy( data.arrangeData.availableColumnDefs, selectedColumns, 'propertyName' );
        data.dataProviders.dataProviderAvailableColumnConfigs.selectionModel.setSelection( updatedSelectedAvailableColumns );
        data.dataProviders.dataProviderColumnConfigs.selectionModel.setSelection( [] );
    } else {
        data.dataProviders.dataProviderAvailableColumnConfigs.selectionModel.setSelection( [] );
    }

    let output = {};
    output.dataProviderAvailableColumnConfigs = data.dataProviders.dataProviderAvailableColumnConfigs;
    output.dataProviderColumnConfigs = data.dataProviders.dataProviderColumnConfigs;
    return output;
};

/**
 * Sets the columnOrder on each columnDef.
 *
 * @param {viewModelJson} arrangeData - The arrange data
 */
let setColumnOrder = function( arrangeData ) {
    let columnOrder = 100;
    for( let i = 0; i < arrangeData.columnDefs.length; i++ ) {
        arrangeData.columnDefs[ i ].columnOrder = columnOrder;
        columnOrder += 100;
    }
};

/**
 * Move selected column up.
 *
 * @param {viewModelJson} arrangeData - The arrange data
 * @param {viewModelJson} dataProvider - The dataProvider
 */
export let moveUp = function( arrangeData, dataProvider ) {
    setColumnOrder( arrangeData );
    dataProvider = _.cloneDeep( dataProvider );

    let selectedColumns = dataProvider.getSelectedObjects();
    _.forEach( selectedColumns, function( column ) {
        for( let i = 0; i < arrangeData.columnDefs.length; ++i ) {
            if( arrangeData.columnDefs[ i ].propertyName === column.propertyName ) {
                arrangeData.columnDefs[ i ] = arrangeData.columnDefs[ i - 1 ];
                arrangeData.filteredColumnDefs[ i ] = arrangeData.columnDefs[ i - 1 ];
                arrangeData.columnDefs[ i - 1 ] = column;
                arrangeData.filteredColumnDefs[ i - 1 ] = column;
                break;
            }
        }
    } );

    setColumnOrder( arrangeData );

    eventBus.publish( 'columnChanged', {
        arrangeData: arrangeData
    } );

    let output = {};
    output.arrangeData = arrangeData;
    output.dataProviderAvailableColumnConfigs = dataProvider.dataProviderAvailableColumnConfigs;
    output.dataProviderColumnConfigs = dataProvider.dataProviderColumnConfigs;
    return output;
};

/**
 * Move selected column down.
 *
 * @param {viewModelJson} arrangeData - The arrange data
 * @param {dataProvider} dataProvider - The dataProvider
 */
export let moveDown = function( arrangeData, dataProvider ) {
    setColumnOrder( arrangeData );
    dataProvider = _.cloneDeep( dataProvider );

    let selectedColumns = dataProvider.getSelectedObjects();
    // Iterates through the array of selected columns, starting with the last object (the bottom-most selected column)
    _.forEachRight( selectedColumns, function( column ) {
        for( let i = arrangeData.columnDefs.length - 1; i >= 0; --i ) {
            if( arrangeData.columnDefs[ i ].propertyName === column.propertyName ) {
                arrangeData.columnDefs[ i ] = arrangeData.columnDefs[ i + 1 ];
                arrangeData.filteredColumnDefs[ i ] = arrangeData.columnDefs[ i + 1 ];
                arrangeData.columnDefs[ i + 1 ] = column;
                arrangeData.filteredColumnDefs[ i + 1 ] = column;
                break;
            }
        }
    } );

    setColumnOrder( arrangeData );

    eventBus.publish( 'columnChanged', {
        arrangeData: arrangeData
    } );

    let output = {};
    output.arrangeData = arrangeData;
    output.dataProviderAvailableColumnConfigs = dataProvider.dataProviderAvailableColumnConfigs;
    output.dataProviderColumnConfigs = dataProvider.dataProviderColumnConfigs;
    return output;
};

/**
 * Move adds selected columns to Table Columns list.
 *
 * @param {viewModelJson} arrangeData - The arrange data
 * @param {viewModelJson} dataProviders - The dataProviders
 * @param {viewModelJson} eventData - Event data
 */
export let addColumns = function( arrangeData, dataProviders, eventData ) {
    arrangeData = _.cloneDeep( arrangeData );
    dataProviders = _.cloneDeep( dataProviders );

    let selectedAvailableColumns = eventData && eventData.eventTargetObjs ? eventData.eventTargetObjs : dataProviders.dataProviderAvailableColumnConfigs.getSelectedObjects();
    if( selectedAvailableColumns ) {
        let selectedColumns = [];

        _.forEach( selectedAvailableColumns, function( selectedColumn ) {
            _.remove( arrangeData.availableColumnDefs, function( availableColumn ) {
                return availableColumn.propertyName === selectedColumn.propertyName;
            } );
            _.remove( arrangeData.filteredAvailableColumnDefs, function( availableColumn ) {
                return availableColumn.propertyName === selectedColumn.propertyName;
            } );

            selectedColumn.visible = true;
            selectedColumn.hiddenFlag = false;
            selectedColumn.selected = false;
            selectedColumn.dbValue = true;

            let insertIndex = _.findIndex( arrangeData.columnDefs, function( column ) {
                return column.columnOrder > selectedColumn.columnOrder;
            } );
            if( insertIndex < 0 ) {
                arrangeData.columnDefs.push( selectedColumn );
            } else {
                arrangeData.columnDefs.splice( insertIndex, 0, selectedColumn );
            }

            insertIndex = _.findIndex( arrangeData.filteredColumnDefs, function( column ) {
                return column.columnOrder > selectedColumn.columnOrder;
            } );
            if( insertIndex < 0 ) {
                arrangeData.filteredColumnDefs.push( selectedColumn );
            } else {
                arrangeData.filteredColumnDefs.splice( insertIndex, 0, selectedColumn );
            }

            selectedColumns.push( selectedColumn );
        } );

        eventBus.publish( 'columnChanged', {
            arrangeData: arrangeData,
            selectedColumns: selectedColumns
        } );

        let output = {};
        output.arrangeData = arrangeData;
        output.dataProviderAvailableColumnConfigs = dataProviders.dataProviderAvailableColumnConfigs;
        output.dataProviderColumnConfigs = dataProviders.dataProviderColumnConfigs;
        return output;
    }
};

/**
 * Move adds selected columns to Table Columns list.
 *
 * @param {viewModelJson} arrangeData - The arrange data
 * @param {viewModelJson} eventData - Event data
 * @param {viewModelJson} dataProviders - The dataProviders
 */
export let removeColumns = function( arrangeData, eventData, dataProviders ) {
    arrangeData = _.cloneDeep( arrangeData );
    dataProviders = _.cloneDeep( dataProviders );

    let selectedColumns = eventData && eventData.eventTargetObjs ? eventData.eventTargetObjs : dataProviders.dataProviderColumnConfigs.getSelectedObjects();

    if( selectedColumns ) {
        _.forEach( selectedColumns, function( selectedColumn ) {
            if( selectedColumn.propertyName === 'object_name' ) {
                selectedColumn.selected = false;
                return;
            }
            _.remove( arrangeData.columnDefs, function( column ) {
                return column.propertyName === selectedColumn.propertyName;
            } );
            _.remove( arrangeData.filteredColumnDefs, function( column ) {
                return column.propertyName === selectedColumn.propertyName;
            } );
            selectedColumn.visible = false;
            selectedColumn.hiddenFlag = true;
            selectedColumn.selected = false;
            selectedColumn.dbValue = false;

            arrangeData.availableColumnDefs.push( selectedColumn );
            arrangeData.filteredAvailableColumnDefs.push( selectedColumn );
        } );

        arrangeData.availableColumnDefs = _.sortBy( arrangeData.availableColumnDefs, function( column ) {
            return column.displayName;
        } );

        arrangeData.filteredAvailableColumnDefs = _.sortBy( arrangeData.filteredAvailableColumnDefs, function( column ) {
            return column.displayName;
        } );

        dataProviders.dataProviderColumnConfigs.selectionModel.setSelection( [] );

        eventBus.publish( 'columnChanged', {
            arrangeData: arrangeData
        } );

        let output = {};
        output.arrangeData = arrangeData;
        output.dataProviderAvailableColumnConfigs = dataProviders.dataProviderAvailableColumnConfigs;
        output.dataProviderColumnConfigs = dataProviders.dataProviderColumnConfigs;
        return output;
    }
};

/**
 * Clear filter when operation type changes.
 *
 * @param {viewModelJson} data - View model data
 */
export let operationTypeChanged = function( data ) {
    data.filterBox.dbValue = '';
    markDirty( data );
    let output = {};
    output.filterBox = data.filterBox;
    output.arrangeData = data.arrangeData;
    return output;
};

/**
 * Arrange columns.
 *
 * @param {viewModelJson} arrangeData - The arrange data
 * @param {String} arrangeType - The arrange type
 */
export let arrange = function( arrangeData, arrangeType ) {
    let eventColumns = getOutputColumns( arrangeData );
    const eventData = {
        name: arrangeData.name,
        arrangeType: arrangeType,
        columns: eventColumns,
        columnConfigId: arrangeData.columnConfigId,
        operationType: arrangeData.operationType,
        objectSetUri: arrangeData.objectSetUri

    };
    if( arrangeData.loadedColumnConfigUid !== arrangeData.originalColumnConfig.columnConfigUid ) {
        for( const column of eventColumns ) {
            if( column.savedFilters && column.savedFilters.length > 0 ) {
                eventData.columnFilterSavingStatus = true;
                break;
            }
        }
    }

    if ( arrangeData.columnsData && arrangeData.columnsData.update ) {
        arrangeData.columnsData.update( eventData );
    } else {
        eventBus.publish( 'columnArrange', eventData );
    }

    if( arrangeType !== 'saveAsNewColumnAndLoadAction' ) {
        let toolsAndInfoCommand = appCtxSvc.getCtx( 'activeToolsAndInfoCommand' );
        if( toolsAndInfoCommand ) {
            eventBus.publish( 'awsidenav.openClose', {
                id: 'aw_toolsAndInfo',
                commandId: toolsAndInfoCommand.commandId
            } );
        }
        appCtxSvc.unRegisterCtx( 'activeToolsAndInfoCommand' );
    }
};

/**
 * Reset column config.
 *
 * @param {viewModelJson} arrangeData - The arrange data
 */
export let reset = function( arrangeData ) {
    const eventData = {
        name: arrangeData.name,
        arrangeType: 'reset',
        columns: [],
        columnConfigId: arrangeData.columnConfigId,
        operationType: arrangeData.operationType ? arrangeData.operationType : 'union',
        objectSetUri: arrangeData.objectSetUri
    };

    if ( arrangeData.columnsData && arrangeData.columnsData.update ) {
        arrangeData.columnsData.update( eventData );
    } else {
        eventBus.publish( 'columnArrange', eventData );
    }

    let toolsAndInfoCommand = appCtxSvc.getCtx( 'activeToolsAndInfoCommand' );
    if( toolsAndInfoCommand ) {
        eventBus.publish( 'awsidenav.openClose', {
            id: 'aw_toolsAndInfo',
            commandId: toolsAndInfoCommand.commandId
        } );
    }
    appCtxSvc.unRegisterCtx( 'activeToolsAndInfoCommand' );
};

/**
 * Update data provider and mark arrange data as dirty.
 *
 * @param {viewModelJson} data - The arrange data
 * @param {viewModelJson} eventData - Event data
 */
export let updateColumns = function( data, eventData ) {
    data = {
        dataProviders: _.cloneDeep( data.dataProviders ),
        arrangeData: _.cloneDeep( data.arrangeData )
    };

    if( eventData && eventData.arrangeData ) {
        data.dataProviders.dataProviderColumnConfigs.update( eventData.arrangeData.filteredColumnDefs,
            eventData.arrangeData.filteredColumnDefs.length );
        data.dataProviders.dataProviderAvailableColumnConfigs.update( eventData.arrangeData.filteredAvailableColumnDefs,
            eventData.arrangeData.filteredAvailableColumnDefs.length );

        data.arrangeData = eventData.arrangeData;
    } else {
        data.dataProviders.dataProviderColumnConfigs.update( data.arrangeData.filteredColumnDefs,
            data.arrangeData.filteredColumnDefs.length );
        data.dataProviders.dataProviderAvailableColumnConfigs.update( data.arrangeData.filteredAvailableColumnDefs,
            data.arrangeData.filteredAvailableColumnDefs.length );
    }

    if( eventData && eventData.selectedColumns ) {
        data.dataProviders.dataProviderColumnConfigs.selectionModel.setSelection( eventData.selectedColumns );
    }
    let output = {};
    output.arrangeData = data.arrangeData;
    output.dataProviderAvailableColumnConfigs = data.dataProviders.dataProviderAvailableColumnConfigs;
    output.dataProviderColumnConfigs = data.dataProviders.dataProviderColumnConfigs;
    return output;
};

/**
 * Mark arrange data as dirty.
 *
 * @param {viewModelJson} arrangeData - The arrange data
 */
export let markDirty = function( data ) {
    data.arrangeData.dirty = false;
    if( data.arrangeData.orgColumnDefs.length !== data.arrangeData.columnDefs.length ) {
        data.arrangeData.dirty = true;
    } else {
        for( let i = 0; i < data.arrangeData.orgColumnDefs.length; ++i ) {
            if( data.arrangeData.orgColumnDefs[ i ].propertyName !== data.arrangeData.columnDefs[ i ].propertyName ||
                data.arrangeData.orgColumnDefs[ i ].dbValue !== data.arrangeData.columnDefs[ i ].dbValue ) {
                data.arrangeData.dirty = true;
                break;
            }
        }
    }

    // Check if operation type has changed
    if( !data.arrangeData.dirty && !data.arrangeData.isExistingColumnConfigLoaded ) {
        if( !data.arrangeData.originalOperationType && !data.arrangeData.objectSetUri ) {
            let oldOperationType = 'configured';
            if( appCtxSvc.ctx.searchResponseInfo && appCtxSvc.ctx.searchResponseInfo.columnConfig &&
                appCtxSvc.ctx.searchResponseInfo.columnConfig.operationType ) {
                oldOperationType = appCtxSvc.ctx.searchResponseInfo.columnConfig.operationType.toLowerCase();
            }

            if( oldOperationType !== data.arrangeData.operationType ) {
                data.arrangeData.dirty = true;
            }
        } else if( data.arrangeData.originalOperationType && data.arrangeData.originalOperationType !== data.arrangeData.operationType ) {
            data.arrangeData.dirty = true;
        }
    }

    // Set to new column config if user modifies the admin version
    if( data.arrangeData.dirty && !data.newColumnConfig.dbValue &&
        ( data.arrangeData.isExistingColumnConfigLoaded && data.arrangeData.loadedColumnConfig && data.arrangeData.loadedColumnConfig.isAdmin ||
            !data.arrangeData.isExistingColumnConfigLoaded && data.arrangeData.originalColumnConfig && data.arrangeData.originalColumnConfig.isAdmin ) ) {
        data.newColumnConfig.dbValue = true;
    }

    setArrangeStatus( data );
    setVisibilityOfColumns( data.arrangeData.columnDefs );
    let output = {};
    output.arrangeData = { ...data.arrangeData };
    output.newColumnConfig = { ...data.newColumnConfig };
    return output;
};

export default exports = {
    setDisabilityOfArrange,
    columnVisibilityChanged,
    createNamedSoaColumns,
    getClientScopeUri,
    preLoadColumnConfig,
    loadExistingColumnConfig,
    preRemoveColumnConfig,
    removeNamedColumnConfigFromProvider,
    actionFilterList,
    initializeColumnDef,
    initializeNamedColumnConfigs,
    selectColumn,
    selectAvailableColumn,
    moveUp,
    moveDown,
    addColumns,
    removeColumns,
    operationTypeChanged,
    arrange,
    reset,
    updateColumns,
    markDirty
};
