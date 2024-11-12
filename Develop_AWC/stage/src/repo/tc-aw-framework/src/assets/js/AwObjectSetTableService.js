// Copyright (c) 2021 Siemens
import { createComponent } from 'js/declViewModelService';
import { DerivedStateResult } from 'js/derivedContextService';
import { isObjectSetSourceDCP, initDataProviderRef } from 'js/xrtUtilities';
import { getAdaptedObjectsSync } from 'js/adapterService';
import AwCompare2 from 'viewmodel/AwCompare2ViewModel';
import AwSplmTable from 'viewmodel/AwSplmTableViewModel';
import columnArrangeSvc from 'js/columnArrangeService';
import _ from 'lodash';

export const getDynamicTableComponent = function( vmDef, prop ) {
    return [ new DerivedStateResult( {
        ctxParameters: [],
        additionalParameters: [ prop.columns, prop.objectSetData, prop.objectSetUri, prop.isCompareTable, prop.editContextKey, prop.isRefreshAllObjectSets, prop.enablePropEdit, prop.parentUid ],
        compute: ( renderContext, columns, objectSetData, objectSetUri, isCompareTable, editContextKey, isRefreshAllObjectSets, enablePropEdit, parentUid ) => {
            // dataproviders, columnproviders, actions, functions, messages, i18n, onEvent, grids, editHandlers?
            const uniqueName = objectSetData.id;
            const dpName = `${uniqueName}_Provider`;

            const dp = {
                action: 'loadObjectSetData',
                commandsAnchor: 'com.siemens.splm.clientfx.ui.modelObjectDataGridActionCommands',
                filterFacetAction: `${dpName}_getFilterFacetValues`,
                filterFacetResults: '{{data._filterFacetResults}}',
                isObjectSetSourceDCP: isObjectSetSourceDCP( objectSetData.source ),
                response: `{{data._${dpName}_searchResults}}`,
                selectionModelMode: 'multiple',
                totalFound: `{{data._${dpName}_totalFound}}`,
                editContext: editContextKey,
                enablePropEdit: enablePropEdit,
                inputData: {
                    selectionData: '{{props.selectionData}}',
                    selectionModel: '{{props.selectionModel}}'
                }
            };

            const cpName = `${uniqueName}_ColumnProvider`;

            let gridInfo = prop.gridInfo || {};

            // If there is a columnConfig sortBy, give priority to it.
            let sortCriteria = null;
            let sortCriteriaUpdatedFromColConfig = false;
            _.forEach( columns, ( column ) => {
                column.enableColumnHiding = gridInfo.enableArrangeMenu === true;
                if( column.sortPriority === 1 ) {
                    sortCriteria = {};
                    sortCriteria.fieldName = column.propertyName;
                    sortCriteria.sortDirection = column.sortDirection.toLowerCase().includes( 'desc' ) ? 'DESC' : 'ASC';
                    sortCriteriaUpdatedFromColConfig = true;
                }
            } );

            // When all the columns are returned with sortPriority zero, its a noSort case. Then sort order is based on server side dataprovider.
            if( !sortCriteriaUpdatedFromColConfig && columns && columns.length > 0 ) {
                sortCriteriaUpdatedFromColConfig = true;
            }

            // When there is no columnConfig based sortBy, honor XML( objectSetData ) sortBy.
            if( !sortCriteriaUpdatedFromColConfig && objectSetData.sortBy ) {
                sortCriteria = {};
                sortCriteria.fieldName = objectSetData.sortBy;
                sortCriteria.sortDirection = objectSetData.sortDirection.toLowerCase().includes( 'desc' ) ? 'DESC' : 'ASC';
            }

            const cp = {
                sortCriteria: sortCriteria !== null ? [ sortCriteria ] : [],
                columns: [],
                saveColumnAndLoadAction: `${dpName}_saveColumnConfigLoadData`,
                saveColumnAction: `${dpName}_saveColumnConfig`,
                resetColumnAction: `${dpName}_resetColumnConfig`,
                objectSetUri: objectSetUri,
                columnConfig: {
                    columnConfigId: objectSetUri,
                    operationType: '{{props.operationType}}',
                    columns: columns
                }
            };

            const grid = {
                dataProvider: dpName,
                columnProvider: cpName,
                enableArrangeMenu: gridInfo.enableArrangeMenu === true,
                gridOptions: {
                    enableExpandAndPaginationInEdit: true, // This is always returned true
                    enableGridMenu: gridInfo.gridOptions && gridInfo.gridOptions.enableGridMenu === true,
                    enableSorting: true, // This is always returned true
                    isFilteringEnabled: gridInfo && gridInfo.gridOptions && gridInfo.gridOptions.isFilteringEnabled === true
                }
            };

            // default setup
            const viewModel = {
                dataProviders: {},
                columnProviders: {},
                actions: {
                    startEditForNewVmos: {
                        actionType: 'JSFunction',
                        method: 'startEditForNewVmos',
                        inputData: {
                            editContext: editContextKey
                        },
                        deps: 'js/editEventsService'
                    },
                    invokeSaveEditsCommand: {
                        actionType: 'Command',
                        method: '',
                        inputData: {
                            commandId: 'Awp0SaveEdits'
                        }
                    },
                    initialize: {
                        actionType: 'JSFunction',
                        method: 'initialize',
                        deps: 'js/AwObjectSetTableService',
                        inputData: {
                            dataProvider: `{{data.dataProviders.${dpName}}}`,
                            columnProvider: `{{data.grids.${dpName}${isCompareTable ? '_compare' : ''}.columnProviderInstance}}`,
                            dpRef: '{{props.dpRef}}',
                            objectSetSource: '{{props.objectSetData.source}}'
                        }
                    },
                    cleanup: {
                        actionType: 'JSFunction',
                        method: 'cleanup',
                        deps: 'js/AwObjectSetTableService',
                        inputData: {
                            dataProvider: `{{data.dataProviders.${dpName}}}`,
                            dpRef: '{{props.dpRef}}',
                            selectionData: '{{props.selectionData}}'
                        }
                    },
                    initializeDataProvider: {
                        actionType: 'dataProvider',
                        method: `${dpName}`
                    },
                    doArrangeEvent: {
                        actionType: 'JSFunctionAsync',
                        method: 'arrangeObjectSetColumns',
                        inputData: {
                            eventData: '{{data.eventData}}',
                            dpName: `${dpName}`,
                            viewModel: '{{data}}',
                            objSetUri: objectSetUri,
                            isCompareTable: '{{props.isCompareTable}}',
                            xrtContext: '{{props.xrtContext}}'
                        },
                        outputData: {},
                        deps: 'js/AwObjectSetTableService'
                    },
                    refreshDataProvider: {
                        actionType: 'JSFunction',
                        method: 'refreshDataProvider',
                        inputData: {
                            dataProvider: `{{data.dataProviders.${dpName}}}`,
                            eventData: '{{data.eventData}}',
                            objectSetSource: '{{props.objectSetData.source}}',
                            vmo: '{{props.vmo}}',
                            isRefreshAllObjectSets: `${isRefreshAllObjectSets}`
                        },
                        deps: 'js/xrtUtilities'
                    },
                    refreshObjSetTable: {
                        actionType: 'Event',
                        method: 'Event',
                        inputData: {
                            events: [ {
                                name: `${dpName}.plTable.clientRefresh`
                            } ]
                        }
                    }
                },
                messages: {
                    partialErrors: {
                        messageText: 'error',
                        messageTextParams: [
                            '{{data._partialErrors[0].errorValues[0].message}}'
                        ],
                        messageType: 'ERROR'
                    }
                },
                i18n: {
                    error: [
                        'XRTMessages'
                    ]
                },
                functions: {
                    getActiveWorkspaceXrtContext: {
                        functionName: 'getActiveWorkspaceXrtContext',
                        parameters: [
                            '{{props.xrtContext}}'
                        ]
                    }
                },
                onEvent: [ {
                    eventId: `${dpName}.startEditForNewVmosRequested`,
                    action: 'startEditForNewVmos'
                },
                {
                    eventId: 'saveEditsRequested',
                    action: 'invokeSaveEditsCommand'
                },
                {
                    eventId: 'cdm.relatedModified',
                    action: 'refreshDataProvider',
                    cacheEventData: true
                },
                {
                    eventId: 'columnArrange',
                    cacheEventData: true,
                    action: 'doArrangeEvent'
                }
                ],
                grids: {},
                lifecycleHooks: {
                    onMount: 'initialize',
                    onUnmount: 'cleanup',
                    onUpdate: [ {
                        action: 'refreshObjSetTable',
                        observers: [ 'props.showCheckBox' ]
                    } ]
                }
            };
            // Now setup specific named elements
            // dp, cp, grid
            viewModel.dataProviders[ dpName ] = dp;
            viewModel.columnProviders[ cpName ] = cp;
            viewModel.grids[ `${dpName}${isCompareTable ? '_compare' : ''}` ] = grid;

            // action message that is repeated
            const failureActionMessage = {
                failure: [ {
                    message: 'partialErrors'
                } ]
            };

            const searchResultsName = `_${dpName}_searchResults`;
            const totalFoundName = `_${dpName}_totalFound`;

            let colsToInflate = [];
            _.forEach( columns, function( uwColumnInfo ) {
                if( ( uwColumnInfo.field || uwColumnInfo.propertyName ) && uwColumnInfo.hiddenFlag !== true ) {
                    colsToInflate.push( uwColumnInfo.field || uwColumnInfo.propertyName );
                }
            } );

            let adaptedVmo = {};
            let adaptedObjArr = getAdaptedObjectsSync( [ prop.vmo ] );
            if( adaptedObjArr && adaptedObjArr.length > 0 ) {
                adaptedVmo = adaptedObjArr[0];
            }

            let loadObjectSetData = {
                actionType: 'JSFunction',
                method: 'loadObjectSetData',
                inputData: {
                    firstPageUids: '{{props.firstPageUids}}',
                    objectSetInfo: '{{props.objectSetInfo}}',
                    firstPageResults: '{{data._ObjectSet_Provider_searchResults}}',
                    objectSetUri: '{{props.objectSetUri}}',
                    columns: '{{props.columns}}',
                    initialOperationType: '{{props.operationType}}',
                    updatedOperationType: `{{data.dataProviders.${dpName}.columnConfig.operationType}}`,
                    columnFilters: `{{data.columnProviders.${cpName}.columnFilters}}`,
                    xrtContext: '{{props.xrtContext}}',
                    objectSetData: '{{props.objectSetData}}',
                    vmo: '{{props.vmo}}',
                    sortCriteria: `{{data.columnProviders.${cpName}.sortCriteria}}`,
                    startIndex: `{{data.dataProviders.${dpName}.startIndex}}`,
                    colsToInflate: colsToInflate,
                    reload: '{{props.reload}}',
                    objectSetState: '{{props.objectSetState}}',
                    totalFound: '{{props.totalFound}}',
                    parentUid: parentUid
                },
                outputData: {
                    _ObjectSet_Provider_searchResults: 'firstPageObjs',
                    _ObjectSet_Provider_totalFound: 'totalFound'
                },
                deps: 'js/xrtUtilities'
            };

            const providerConfigName = `dataProviders.${dpName}.columnConfig`;
            loadObjectSetData.outputData[ searchResultsName ] = 'firstPageObjs';
            loadObjectSetData.outputData[ totalFoundName ] = 'totalFound';
            loadObjectSetData.outputData[ providerConfigName ] = `{{function:${dpName}_getValidColumnConfig}}`;

            viewModel.actions.loadObjectSetData = loadObjectSetData;

            viewModel.actions[ `${dpName}_getFilterFacetValues` ] = {
                actionType: 'TcSoaService',
                method: 'getFilterValues',
                serviceName: 'Internal-AWS2-2019-12-Finder',
                deps: 'js/xrtUtilities',
                headerState: {
                    unloadObjects: false
                },
                inputData: {
                    filterFacetInput: {
                        columnFilters: '{{filterFacetInput.columnFilters}}',
                        columnName: '{{filterFacetInput.column.field}}',
                        maxToReturn: 50,
                        providerName: 'Awp0ObjectSetRowProvider',
                        searchCriteria: {
                            'ActiveWorkspace:xrtContext': '{{function:getActiveWorkspaceXrtContext}}',
                            objectSet: objectSetData.source,
                            parentUid: parentUid,
                            showConfiguredRev: objectSetData.showConfiguredRev
                        },
                        startIndex: '{{filterFacetInput.startIndex}}'
                    }
                },
                outputData: {
                    _filterFacetResults: '{{json:facetValues}}',
                    _partialErrors: 'ServiceData.partialErrors'
                },
                actionMessages: failureActionMessage
            };

            // load data action
            let loadDataAction = {
                actionType: 'TcSoaService',
                serviceName: 'Internal-AWS2-2023-06-Finder',
                method: 'performSearchViewModel5',
                deps: 'js/xrtUtilities',
                inputData: {
                    columnConfigInput: {
                        clientName: 'AWClient',
                        clientScopeURI: objectSetUri,
                        operationType: `{{data.dataProviders.${dpName}.columnConfig.operationType}}`
                    },
                    inflateProperties: true,
                    searchInput: {
                        columnFilters: `{{data.columnProviders.${cpName}.columnFilters}}`,
                        maxToLoad: 50,
                        maxToReturn: 50,
                        providerName: 'Awp0ObjectSetRowProvider',
                        searchCriteria: {
                            'ActiveWorkspace:Location': '{{ctx.locationContext.ActiveWorkspace:Location}}',
                            'ActiveWorkspace:SubLocation': '{{ctx.locationContext.ActiveWorkspace:SubLocation}}',
                            'ActiveWorkspace:xrtContext': '{{function:getActiveWorkspaceXrtContext}}',
                            isRedLineMode: '{{ctx.isRedLineMode}}',
                            objectSet: objectSetData.source,
                            parentUid: parentUid,
                            showConfiguredRev: objectSetData.showConfiguredRev
                        },
                        searchSortCriteria: `{{data.columnProviders.${cpName}.sortCriteria}}`,
                        startIndex: `{{data.dataProviders.${dpName}.startIndex}}`,
                        attributesToInflate: colsToInflate
                    }
                },
                outputData: {
                    'ctx.searchResponseInfo.columnConfig': `{{function:${dpName}_getValidColumnConfig}}`,
                    _partialErrors: 'ServiceData.partialErrors'
                },
                actionMessages: failureActionMessage
            };
            loadDataAction.outputData[ searchResultsName ] = '{{json:searchResultsJSON}}';
            loadDataAction.outputData[ totalFoundName ] = 'totalFound';
            loadDataAction.outputData[ providerConfigName ] = `{{function:${dpName}_getValidColumnConfig}}`;

            viewModel.actions[ `${dpName}_loadData` ] = loadDataAction;

            let saveColumnConfigLoadData = {
                actionType: 'TcSoaService',
                method: 'performSearchViewModel5',
                serviceName: 'Internal-AWS2-2023-06-Finder',
                deps: 'js/xrtUtilities',
                inputData: {
                    columnConfigInput: {
                        clientName: 'AWClient',
                        clientScopeURI: objectSetUri,
                        operationType: '{{eventData.operationType}}'
                    },
                    inflateProperties: true,
                    saveColumnConfigData: {
                        clientScopeURI: objectSetUri,
                        columnConfigId: `{{data.dataProviders.${dpName}.columnConfig.columnConfigId}}`,
                        columns: `{{function:${dpName}_getObjSetColumns}}`,
                        scope: 'LoginUser',
                        scopeName: ''
                    },
                    searchInput: {
                        columnFilters: `{{data.columnProviders.${cpName}.columnFilters}}`,
                        maxToLoad: 50,
                        maxToReturn: 50,
                        providerName: 'Awp0ObjectSetRowProvider',
                        searchCriteria: {
                            'ActiveWorkspace:Location': '{{ctx.locationContext.ActiveWorkspace:Location}}',
                            'ActiveWorkspace:SubLocation': '{{ctx.locationContext.ActiveWorkspace:SubLocation}}',
                            'ActiveWorkspace:xrtContext': '{{function:getActiveWorkspaceXrtContext}}',
                            isRedLineMode: '{{ctx.isRedLineMode}}',
                            objectSet: objectSetData.source,
                            parentUid: parentUid,
                            showConfiguredRev: objectSetData.showConfiguredRev
                        },
                        searchSortCriteria: `{{data.columnProviders.${cpName}.sortCriteria}}`,
                        startIndex: `{{data.dataProviders.${dpName}.startIndex}}`
                    }
                },
                outputData: {
                    'ctx.searchResponseInfo.columnConfig': `{{function:${dpName}_getValidColumnConfig}}`,
                    _partialErrors: 'ServiceData.partialErrors'
                },
                actionMessages: failureActionMessage
            };

            saveColumnConfigLoadData.outputData[ searchResultsName ] = '{{json:searchResultsJSON}}';
            saveColumnConfigLoadData.outputData[ totalFoundName ] = 'totalFound';
            saveColumnConfigLoadData.outputData._refreshComp = true;
            saveColumnConfigLoadData.outputData[ providerConfigName ] = `{{function:${dpName}_getValidColumnConfig}}`;

            viewModel.actions[ `${dpName}_saveColumnConfigLoadData` ] = saveColumnConfigLoadData;

            let saveColumnConfig = {
                actionType: 'TcSoaService',
                method: 'performSearchViewModel5',
                serviceName: 'Internal-AWS2-2023-06-Finder',
                deps: 'js/xrtUtilities',
                inputData: {
                    columnConfigInput: {
                        clientName: 'AWClient',
                        clientScopeURI: objectSetUri,
                        operationType: `{{data.dataProviders.${dpName}.columnConfig.operationType}}`
                    },
                    inflateProperties: false,
                    noServiceData: true,
                    saveColumnConfigData: {
                        clientScopeURI: objectSetUri,
                        columnConfigId: `{{data.dataProviders.${dpName}.columnConfig.columnConfigId}}`,
                        columns: `{{function:${dpName}_getObjSetColumns}}`,
                        scope: 'LoginUser',
                        scopeName: ''
                    },
                    searchInput: {
                        columnFilters: `{{data.columnProviders.${cpName}.columnFilters}}`,
                        maxToLoad: 50,
                        maxToReturn: 50,
                        providerName: 'Awp0ObjectSetRowProvider',
                        searchCriteria: {
                            'ActiveWorkspace:Location': '{{ctx.locationContext.ActiveWorkspace:Location}}',
                            'ActiveWorkspace:SubLocation': '{{ctx.locationContext.ActiveWorkspace:SubLocation}}',
                            'ActiveWorkspace:xrtContext': '{{function:getActiveWorkspaceXrtContext}}',
                            isRedLineMode: '{{ctx.isRedLineMode}}',
                            objectSet: objectSetData.source,
                            parentUid: parentUid,
                            showConfiguredRev: objectSetData.showConfiguredRev
                        },
                        searchSortCriteria: `{{data.columnProviders.${cpName}.sortCriteria}}`,
                        startIndex: `{{data.dataProviders.${dpName}.startIndex}}`
                    }
                },
                actionMessages: failureActionMessage
            };

            viewModel.actions[ `${dpName}_saveColumnConfig` ] = saveColumnConfig;

            let resetColumnConfig = {
                actionType: 'TcSoaService',
                method: 'getOrResetUIColumnConfigs4',
                serviceName: 'Internal-AWS2-2023-06-UiConfig',
                inputData: {
                    getOrResetUiConfigsIn: [ {
                        clientName: 'clientName',
                        columnConfigQueryInfos: [ {
                            clientScopeURI: objectSetUri,
                            columnsToExclude: [],
                            operationType: 'configured',
                            typeNames: [
                                'WorkspaceObject'
                            ]
                        } ],
                        resetColumnConfig: true,
                        scope: 'LoginUser',
                        scopeName: ''
                    } ]
                },
                outputData: {},
                actionMessages: failureActionMessage,
                events: {
                    success: []
                }
            };

            if( !objectSetUri.startsWith( 'objSetSrc_' ) ) {
                resetColumnConfig.events.success.push( {
                    name: `${dpName}.plTable.reload`
                } );
            } else {
                resetColumnConfig.events.success.push( {
                    name: 'cdm.relatedModified',
                    eventData: {
                        refreshLocationFlag: true,
                        relatedModified: [
                            '{{ctx.selected}}'
                        ]
                    }
                } );
            }

            resetColumnConfig.outputData[ `dataProviders.${dpName}.columnConfig` ] = 'columnConfigurations[0].columnConfigurations[0]';
            viewModel.actions[ `${dpName}_resetColumnConfig` ] = resetColumnConfig;

            // functions
            viewModel.functions[ `${dpName}_getValidColumnConfig` ] = {
                functionName: 'getValidColumnConfig',
                parameters: [
                    `{{data.dataProviders.${dpName}.columnConfig}}`
                ]
            };
            viewModel.functions[ `${dpName}_getObjSetColumns` ] = {
                functionName: 'getObjSetColumns',
                parameters: [
                    `{{data.dataProviders.${dpName}.newColumns}}`,
                    `{{data.columnProviders.${cpName}.columnConfig.columns}}`
                ]
            };

            const Component = createComponent( viewModel, ( { viewModel, showCheckBox, gridId, isCompareTable } ) => {
                if( isCompareTable ) {
                    return <AwCompare2 {...viewModel.grids[`${gridId}_compare`]}></AwCompare2>;
                }
                return <AwSplmTable {...viewModel.grids[gridId]} showContextMenu={true} showCheckBox={showCheckBox}></AwSplmTable>;
            } );
            Component.displayName = 'AwDynamicTable';
            return Component;
        }
    } ) ];
};

export const initialize = ( dataProvider, columnProvider, dpRef, objectSetSource ) => {
    if( dataProvider ) {
        if( dataProvider && objectSetSource ) {
            dataProvider.setValidSourceTypes( objectSetSource );
        }

        if( !dpRef ) {
            return;
        }

        initDataProviderRef( dpRef );
        dpRef.current.dataProviders.push( dataProvider.viewModelCollection.getLoadedViewModelObjects );

        dpRef.current.columnProviders[ dataProvider.name ] = {
            getColumnFilters: columnProvider.getColumnFilters,
            getSortCriteria: columnProvider.getSortCriteria,
            getColumns: columnProvider.getColumns
        };
    }
};

export const cleanup = ( dataProvider, dpRef, selectionData ) => {
    if( dataProvider && dpRef && dpRef.current && dpRef.current.dataProviders.includes( dataProvider.viewModelCollection.getLoadedViewModelObjects ) ) {
        let dpName = dataProvider.name;
        if( selectionData.selected && selectionData.selected.length ) {
            selectionData.update( { selected: [] } );
        }

        let index = dpRef.current.dataProviders.indexOf( dataProvider.viewModelCollection.getLoadedViewModelObjects );
        if( index > -1 ) {
            dpRef.current.dataProviders.splice( dataProvider.viewModelCollection.getLoadedViewModelObjects, 1 );
        }

        if( dpRef.current.columnProviders[ dpName ] ) {
            delete dpRef.current.columnProviders[ dpName ];
        }
    }
};

export const arrangeObjectSetColumns = ( eventData, dpName, viewModel, objectSetUri, isCompareTable, xrtContext ) => {
    let dpNameIn = eventData.name.includes( '_Provider' ) ? eventData.name : eventData.name + '_Provider';
    if( dpName && dpName === dpNameIn || eventData.objectSetUri === objectSetUri ) {
        // sync up eventData name with dataProvider name, only for table
        if( !isCompareTable && eventData.objectSetUri === objectSetUri ) {
            eventData.name = dpName;
        }
        eventData.props = {
            xrtContext: xrtContext
        };
        columnArrangeSvc.arrangeColumns( viewModel, eventData );
    }
};

export const awObjectSetTableRenderFunction = function( props ) {
    let {
        subPanelContext,
        showCheckBox,
        ctxMin: { dynamicTable },
        firstPageUids,
        selectionData,
        selectionModel,
        dpRef,
        isCompareTable,
        vmo,
        selectAll,
        objectSetData,
        operationType,
        objectSetInfo,
        objectSetUri,
        columns,
        xrtContext,
        activeObjectSetState,
        reload,
        editContextKey,
        isRefreshAllObjectSets,
        objectSetState,
        totalFound,
        gridInfo,
        enablePropEdit,
        parentUid
    } = props;
    let AwDynamicTable = dynamicTable[ 0 ];
    const gridId = `${objectSetData.id}_Provider`;
    return <AwDynamicTable
        gridId={gridId}
        showCheckBox={showCheckBox}
        selectAll={selectAll}
        subPanelContext={subPanelContext}
        firstPageUids={firstPageUids}
        selectionData={selectionData}
        selectionModel={selectionModel}
        dpRef={dpRef}
        vmo={vmo}
        isCompareTable={isCompareTable}
        objectSetData={objectSetData}
        operationType={operationType}
        objectSetInfo={objectSetInfo}
        objectSetUri={objectSetUri}
        columns={columns}
        xrtContext={xrtContext}
        activeObjectSetState={activeObjectSetState}
        reload={reload}
        editContextKey={editContextKey}
        isRefreshAllObjectSets={isRefreshAllObjectSets}
        objectSetState={objectSetState}
        totalFound={totalFound}
        gridInfo={gridInfo}
        enablePropEdit={enablePropEdit}
        parentUid={parentUid}>
    </AwDynamicTable>;
};

export default {
    getDynamicTableComponent,
    initialize,
    awObjectSetTableRenderFunction,
    cleanup,
    arrangeObjectSetColumns
};
