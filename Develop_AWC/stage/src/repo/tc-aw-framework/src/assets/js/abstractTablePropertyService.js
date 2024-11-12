import _ from 'lodash';
import appCtxService from 'js/appCtxService';
import browserUtils from 'js/browserUtils';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import eventBus from 'js/eventBus';
import viewModelObjectService from 'js/viewModelObjectService';
import soaSvc from 'soa/kernel/soaService';
import xrtTableSvc from 'js/xrtTableHeightService';
import editHandlerService from 'js/editHandlerService';
import { isObjectSetSourceDCP, initDataProviderRef } from 'js/xrtUtilities';

let exports = {};

/*
 * Generates a unique Dynamic view model for Table Property or Name Value Pair element
 * @param {String} uniqueName Unique Name to use for tableprop/nameValue
 * @param {String} objectSetSource The Object Set Source/Source of the TableProp/NameValue
 * @param {String} parentUid The parent UID
 * @param {Object[]} columns The Columns for the table
 * @param {String[]} firstPageUids The first page UIDs
 * @param {Object[]} objects The objects passed from server
 * @returns {Object} Table Property or Name Value View Model
 */
export const createDynamicTablePropertyViewModel = function( uniqueName, objectSetSource, parentUid, columns, firstPageUids, objects, editContextKey, selectionData, operationName, sortCriteria ) {
    const dpName = `${uniqueName}_Provider`;
    const cpName = `${uniqueName}_ColumnProvider`;

    const searchResultsName = `${dpName}_searchResults`;
    const totalFoundName = `${dpName}_totalFound`;

    const editContextKeyIn = editContextKey ? editContextKey : 'NONE';

    const viewModel = {
        schemaVersion: '1.0.0',
        actions: {
            updateCtxFromObject: {
                actionType: 'JSFunction',
                method: 'updateCtxFromObject',
                inputData: {
                    ctxObj: '{{data._ctx}}'
                },
                deps: 'js/appCtxService'
            }
        },
        columnProviders: {},
        data: {
            objects: objects,
            operationName
        },
        dataProviders: {},
        functions: {
            getActiveWorkspaceXrtContext: {
                functionName: 'getActiveWorkspaceXrtContext',
                parameters: [ '{{ctx.ActiveWorkspace:xrtContext}}' ]
            }
        },
        grids: {},
        i18n: {},
        messages: {},
        onEvent: [ {
            eventId: 'awXRT2.contentLoaded',
            action: 'updateCtxFromObject'
        } ]
    };

    /* Start actions */

    // get filter facet values
    viewModel.actions[ `${dpName}_getFilterFacetValues` ] = {
        actionType: 'TcSoaService',
        serviceName: 'Internal-AWS2-2019-12-Finder',
        method: 'getFilterValues',
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
                    objectSet: `${objectSetSource}.Fnd0TableRow`, // TODO: Verify this
                    parentUid: parentUid
                },
                startIndex: '{{filterFacetInput.startIndex}}'
            }
        },
        outputData: {
            filterFacetResults: '{{json:facetValues}}'
        },
        deps: 'js/xrtUtilities'
    };

    // load data action
    const loadDataAction = {
        actionType: 'TcSoaService',
        serviceName: 'Internal-AWS2-2023-06-Finder',
        method: 'performSearchViewModel5',
        inputData: {
            inflateProperties: true,
            searchInput: {
                columnFilters: `{{data.columnProviders.${cpName}.columnFilters}}`,
                maxToLoad: 50,
                maxToReturn: 50,
                providerName: 'Awp0TablePropertyProvider',
                searchCriteria: {
                    objectSet: objectSetSource,
                    parentUid: parentUid
                },
                searchSortCriteria: `{{data.columnProviders.${cpName}.sortCriteria}}`,
                startIndex: `{{data.dataProviders.${dpName}.startIndex}}`
            }
        },
        outputData: {},
        deps: 'js/xrtUtilities'
    };
    loadDataAction.outputData[ searchResultsName ] = '{{json:searchResultsJSON}}';
    loadDataAction.outputData[ totalFoundName ] = 'totalFound';
    viewModel.actions[ `${dpName}_loadData` ] = loadDataAction;

    /* End Actions */
    // DataProvider
    viewModel.dataProviders[ dpName ] = {
        action: `${dpName}_loadData`,
        commandsAnchor: 'com.siemens.splm.clientfx.ui.modelObjectDataGridActionCommands',
        filterFacetAction: `${dpName}_getFilterFacetValues`,
        filterFacetResults: '{{data.filterFacetResults}}',
        editContext: editContextKeyIn,
        firstPage: firstPageUids,
        isObjectSetSourceDCP: isObjectSetSourceDCP( objectSetSource ),
        response: `{{data.${searchResultsName}}}`,
        selectionModelMode: 'multiple',
        totalFound: `{{data.${totalFoundName}}}`,
        inputData: {
            selectionData: selectionData
        }
    };

    // Column Provider
    viewModel.columnProviders[ cpName ] = {
        columns: columns,
        sortCriteria: [ sortCriteria ]
    };

    // Grid
    viewModel.grids[ dpName ] = {
        addIconColumn: false,
        columnProvider: cpName,
        dataProvider: dpName,
        gridOptions: {
            enableGridMenu: true,
            enableSorting: true,
            isFilteringEnabled: true
        }
    };

    return viewModel;
};

/**
 * Sets the property data and type on the view model for later use
 *
 * @param {Object} viewModel - the view model
 * @param {Object} propertyData The property data
 * @param {String} propertyType string. Example NameValue or TableProperty
 */
export const setPropertyData = function( viewModel, propertyData, propertyType ) {
    viewModel.data._propertyData = propertyData;
    viewModel.data._propertyData.initialRowDataInput = propertyData.id + '_InitialRowDataInput';
    viewModel.data._propertyType = propertyType;
};

/**
 * Returns the property data
 *
 * @param {Object} viewModel - the view model
 * @return {Object} property data
 */
export const getPropertyData = function( viewModel ) {
    return viewModel.data._propertyData;
};

/**
 * Returns the property type
 *
 * @param {Object} viewModel - The view model
 * @returns {Object} property type
 */
export const getPropertyType = function( viewModel ) {
    return viewModel.data._propertyType;
};

export const processInitialDataProvider = ( viewModel, dpRef ) => {
    const { dataProviders } = viewModel;
    let dataProvider = dataProviders[ viewModel.data.providerName ];
    if( viewModel.data._propertyData && viewModel.data._propertyData.id ) {
        viewModel.data.gridId = viewModel.data._propertyData.id + '_Provider';
    }

    if( dataProvider && dataProvider.json && dataProvider.json.firstPage && !_.isEmpty( dataProvider.json.firstPage ) ) {
        let firstPageObjs = [];
        _.forEach( dataProvider.json.firstPage, function( uid ) {
            const vmo = viewModel.objects[ uid ];
            if( vmo ) {
                firstPageObjs.push( vmo );
            }
        } );

        if( firstPageObjs.length > 0 ) {
            dataProvider.vmCollectionDispatcher( {
                type: 'COLLECTION_UPDATE',
                viewModelObjects: firstPageObjs,
                totalFound: firstPageObjs.length,
                cursorObject: dataProvider.cursorObject,
                pageObject: {}
            } );
        }
    }

    // register dataprovider/objectsetsource with xrt
    let tablePropertyNameValueSource = viewModel.data._propertyData && viewModel.data._propertyData.propertyName;
    if( dataProvider && tablePropertyNameValueSource ) {
        dataProvider.setValidSourceTypes( tablePropertyNameValueSource );
    }

    initDataProviderRef( dpRef );
    dpRef.current.dataProviders.push( dataProvider.viewModelCollection.getLoadedViewModelObjects );
};

/**
 * Initializes ctx needed for table prop/name value to work
 *
 * @param {Object} viewModel the view model
 * @param {Function} specificContextInit Context initialization function specific for table prop or name value
 */
export const initContext = function( viewModel, specificContextInit ) {
    const propData = exports.getPropertyData( viewModel );
    let owningObjectUid = propData.parentUid;
    let tablePropertyName = propData.propertyName;
    appCtxService.registerCtx( propData.initialRowDataInput, {
        owningObject: {
            uid: owningObjectUid
        },
        tablePropertyName: tablePropertyName
    } );

    if( specificContextInit ) {
        specificContextInit( viewModel );
    }

    let additionalProps = {
        tablePropertyName: tablePropertyName,
        owningObject: owningObjectUid
    };

    let existingAdditionalProps = appCtxService.getCtx( 'InitialSaveDataAdditionalProps' );
    existingAdditionalProps = existingAdditionalProps ? existingAdditionalProps : {};
    existingAdditionalProps[ tablePropertyName ] = additionalProps;
    appCtxService.registerCtx( 'InitialSaveDataAdditionalProps', existingAdditionalProps );

    let parentVmo = cdm.getObject( propData.parentUid );
    if( parentVmo ) {
        let parentVmoType = cmm.getType( parentVmo.type );
        if( parentVmoType && parentVmoType.propertyDescriptorsMap ) {
            let prop = parentVmoType.propertyDescriptorsMap[ propData.propertyName ];

            propData.displayName = prop.displayName;
            propData.propertyRefType = prop.constantsMap.ReferencedTypeName;
            propData.isPropertyModifiable = prop.constantsMap.modifiable && parseInt( parentVmo.props.is_modifiable.dbValues[ 0 ] );

            // PropertyConstantsMap from platform always sends editable as 1 when enabled property constant is true. when it is false, it will not send that flag at all.
            // We need to disable add, remove and duplicate when enabled constant is false.
            // Duplicate command also checks for createCommandEnabled too, so it will also be disabled when enabled constant is false.
            propData.createCommandEnabled = propData.isPropertyModifiable && Boolean( prop.constantsMap.editable );
            propData.removeCommandEnabled = Boolean( prop.constantsMap.editable );
            viewModel.data._propertyData = propData;
        }
    }
    viewModel.dispatch( { path: 'data', value: { ...viewModel.data } } );
    _setTableHeightAndWidthInternal( viewModel, true );
};

/**
 * Set tableProperty height and width
 * @param {Object} viewModel - the view model
 * @param {Boolean} skipDispatch -skip dispatch update
 */
function _setTableHeightAndWidthInternal( viewModel, skipDispatch ) {
    let newHeight;
    const propData = exports.getPropertyData( viewModel );
    newHeight = xrtTableSvc.calculateTableHeight( propData );

    viewModel.data.tableWidth = browserUtils.isIE ? 'calc(100% - 10px)' : '100%';
    if( viewModel.data.tableHeight !== newHeight ) {
        viewModel.data.tableHeight = newHeight;
        eventBus.publish( viewModel.data.providerName + '.plTable.containerHeightUpdated', viewModel.data.tableHeight );
        if( !skipDispatch ) {
            viewModel.dispatch( { path: 'data', value: { ...viewModel.data } } );
        }
    }
}

/**
 * Processes grid selection event by updating the selection on the application context
 * qualifying it using the property type
 *
 * @param {Object} eventData holding selected objects from the grid
 * @param {Object} viewModel - the view model
 */
export const processGridSelectionEvent = function( eventData, viewModel ) {
    const { selectedObjects, dataProvider, dataProviderName } = eventData;
    const propData = exports.getPropertyData( viewModel );
    const propType = exports.getPropertyType( viewModel );
    propData.removeCommandEnabled = false;
    if( dataProvider && selectedObjects && selectedObjects.length > 0 ) {
        const viewModelCollection = dataProvider.viewModelCollection;
        if( viewModelCollection && viewModelCollection.getLoadedViewModelObjects().indexOf( selectedObjects[ 0 ] ) > -1 ) {
            // When Enabled property constant is false for the table prop or name value pair, create will be disabled.
            // When there is an existing data already in table, if the enabled is made false, then remove should also be disabled.
            propData.removeCommandEnabled = propData.isPropertyModifiable && propData.createCommandEnabled;
            exports.setPropertyData( viewModel, propData, propType );
            viewModel.dispatch( { path: 'data._propertyData', value: propData } );
        }
    }
    let selectionData = appCtxService.getCtx( `${propType}Selection` ) || {};
    selectionData[ dataProviderName ] = {
        selectedObjects: selectedObjects
    };
    appCtxService.registerCtx( propType + 'Selection', selectionData );
    // Set active tableproperty/namevalue
    appCtxService.registerCtx( 'ActiveTablePropertyId', dataProviderName );
};

/**
 * Processes the cdm updated event to map initial dummy row of table property and name value to
 * actual persistent object returned by the server or refresh the grid on successful deletion of
 * a persistent table row
 *
 * @param {Object} data holding updated or modified objects array
 * @param {Object} viewModel - the view model
 */
export const processCdmUpdatedEvent = function( data, viewModel ) {
    if( viewModel.data._syncFromCdmModified ) {
        var activeEditHandler = editHandlerService.getActiveEditHandler();
        if( activeEditHandler ) {
            activeEditHandler.unregisterPreSaveAction( viewModel.data.preSaveActionID );
        }
        const propData = exports.getPropertyData( viewModel );
        let updatedObjects = data.updatedObjects || data.modifiedObjects || [];
        let owningTable = _.filter( updatedObjects, { uid: propData.parentUid } )[ 0 ];
        if( owningTable ) {
            const ownedUids = owningTable.props[ propData.propertyName ].dbValues;

            updatedObjects = updatedObjects.filter( function( obj ) {
                if( ownedUids.indexOf( obj.uid ) > -1 ) {
                    return true;
                }
                return false;
            } );
        }
        let updatedVMOs = {
            viewModelObjects: []
        };

        updatedObjects.forEach( function( currentUpdatedObject ) {
            let updatedVmo = viewModelObjectService.createViewModelObject( currentUpdatedObject, 'EDIT' );

            if( updatedVmo &&
                cmm.isInstanceOf( propData.propertyRefType, updatedVmo.modelType ) ) {
                exports.addContextObjectAndProperty( propData, updatedVmo, false );
                updatedVMOs.viewModelObjects.push( updatedVmo );
            }
        } );

        const dataProvider = viewModel.dataProviders[ viewModel.data.providerName ];
        let viewModelCollection = dataProvider.viewModelCollection;
        let loadedVMObjs = viewModelCollection.getLoadedViewModelObjects();

        // Remove dummy vmo information if there is any in the viewModelCollection.
        // This dummy vmo will be created when you delete all rows or last row which will be sent for save SOA.
        if( loadedVMObjs.length === 1 ) {
            let dummyUidName = cdm.NULL_UID + viewModel.data.providerName;
            if( loadedVMObjs[ 0 ].uid === dummyUidName ) {
                loadedVMObjs.splice( 0, loadedVMObjs.length ); // clean up loadedVMObjs array.
            }
        }

        // if persistentVMOs are empty and updated VMOs are not empty, just assign them directly to _persistentVMOs.
        if( updatedVMOs.viewModelObjects.length > 0 ) {
            if( viewModel.data._persistentVMOs === null || viewModel.data._persistentVMOs === undefined ) {
                viewModel.data._persistentVMOs = updatedVMOs.viewModelObjects;
            } else {
                // Compare persistentVMOs with updated VMOs and insert the new ones that are not in persistentVMOs.
                _.forEach( updatedVMOs.viewModelObjects, function( updatedVmo ) {
                    if( viewModel.data._persistentVMOs ) {
                        const newVMOForPersistentVMOs = viewModel.data._persistentVMOs.find( ( { uid } ) => uid === updatedVmo.uid );
                        if( newVMOForPersistentVMOs === undefined ) {
                            viewModel.data._persistentVMOs.push( updatedVmo );
                        }
                    }
                } );

                // Merge the persistentVMOs with updated objects if there are any.
                if( viewModel.data._persistentVMOs && viewModel.data._persistentVMOs.length > 0 && updatedVMOs.viewModelObjects.length > 0 ) {
                    viewModel.data._persistentVMOs = viewModel.data._persistentVMOs.map( x => updatedVMOs.viewModelObjects.find( ( { uid } ) => uid === x.uid ) || x );
                }
            }
        }
        if( viewModel.data._persistentVMOs && viewModel.data._persistentVMOs.length > 0 ) {
            const updatedAndRemainingVMOs = _.filter( viewModel.data._persistentVMOs, function( vmo ) {
                return !_.includes( viewModel.data._removedVMOUids, vmo.uid );
            } );
            dataProvider.update( updatedAndRemainingVMOs, updatedAndRemainingVMOs.length );

            // Do not include dummy vmo information in the objectsToBeRestored.
            // This objectsToBeRestored will be used for cancel edit operation.
            let objectsToBeRestored = []; // clean up ObjectsToBeRestored array.
            _.forEach( viewModel.data._persistentVMOs, function( vmo ) {
                let dummyUidName = cdm.NULL_UID + viewModel.data.providerName;
                if( vmo.uid !== dummyUidName ) {
                    objectsToBeRestored.push( vmo );
                }
            } );
            viewModel.data.objectsToBeRestored = objectsToBeRestored;
        }

        viewModel.data._syncFromCdmModified = false;
        viewModel.data.requestDummyRowCreation = false;
        viewModel.dispatch( { path: 'data', value: { ...viewModel.data } } );
        eventBus.publish( `${viewModel.data.providerName}.plTable.clientRefresh` );
    }
};

/**
 * Adds given property to props array. This is helper method used for setting additional context
 * object and property name on table property objects
 *
 * @param {String} propertyName - property name
 * @param {String} propertyValue - value of the property
 * @param {String} parentUid - uid of the parent i.e. owning object
 * @param {ObjectArray} props - array of properties to which new properties need to be added
 */
export const addProperty = function( propertyName, propertyValue, parentUid, props ) {
    props[ propertyName ] = {
        dbValue: propertyValue,
        uiValue: propertyValue,
        dbValues: [ propertyValue ],
        uiValues: [ propertyValue ],
        newDisplayValues: [ propertyValue ],
        displayValues: [ propertyValue ],
        modifiable: true,
        editable: true,
        isEditable: true,
        propertyName: propertyName,
        propertyDescriptor: [],
        displayValueUpdated: true,
        parentUid: parentUid
    };
};

export const addContextObjectAndProperty = function( data, vmo, isDummyRow ) {
    if( vmo && vmo.modelType ) {
        if( !cmm.isInstanceOf( 'Fnd0NameValue', vmo.modelType ) &&
            !cmm.isInstanceOf( 'Fnd0TableRow', vmo.modelType ) ) {
            return;
        }

        if( vmo.props ) {
            exports.addProperty( 'owningObject', data.parentUid, vmo.uid, vmo.props );
            exports.addProperty( 'tablePropertyName', data.propertyName, vmo.uid, vmo.props );

            if( isDummyRow ) {
                exports.addProperty( 'newRowTypeName', vmo.type, vmo.uid, vmo.props );

                // in case of name value, the data is set on panel and then transferred to the grid as initial row
                // in case of table prop, the data is directly set on the newly added dummy row in the grid
                // thus, display values updated need to be set only for name value i.e. cases where the data is getting
                // set from a panel and then transferred to the grid.
                if( data.setDisplayValuesUpdated ) {
                    _.forEach( vmo.props, function( prop ) {
                        prop.displayValueUpdated = true;
                    } );
                }
            }
        }
    }
};

export const updateVmoData = function( viewModel ) {
    if( viewModel && viewModel.data.objects ) {
        let newViewModelObjs = {};
        // viewModel.objects is a map of uid versus ViewModelObject
        _.forEach( viewModel.data.objects, function( object, uid ) {
            if( object.modelType && !cmm.isInstanceOf( 'Fnd0TableRow', object.modelType ) ) {
                newViewModelObjs[ uid ] = object;
            }
        } );
        viewModel.data.objects = newViewModelObjs;
        viewModel.dispatch( { path: 'data.objects', value: newViewModelObjs } );
    }

    if( viewModel.data.vmo && viewModel.data.vmo.modelType ) {
        let vmo = viewModel.data.vmo;
        const propData = exports.getPropertyData( viewModel );
        if( cmm.isInstanceOf( 'Fnd0TableRow', vmo.modelType ) ) {
            exports.addContextObjectAndProperty( propData, vmo, false );
            viewModel.dispatch( { path: 'data.vmo', value: vmo } );
        }
    }
};

/**
 * Updates the grid with dummy row data as provided by the server
 *
 * @param {Object} viewModel - the view model
 * @param {ObjectArray} initialTableRowData array holding name and value of property
 * @param {ObjectArray} initialVMOs array of objects currently in the grid
 * @param {Object} modelType holding property descriptions map as available from cmm
 * @param {Object} modelObject - parent model object
 * @param {String} dummyUid string for initial table row before it is persisted to database
 * @param {Boolean} setValueUpdated if the prop should be set as if the value has been updated - useful for duplicating rows
 */
export const updateGridWithInitialRow = function( viewModel, initialTableRowData, initialVMOs, modelType,
    modelObject, dummyUid, setValueUpdated ) {
    const propData = exports.getPropertyData( viewModel );
    let updatedVMOs = {
        viewModelObjects: initialVMOs
    };

    // Loop through and set the default values
    // Only set uiValue and dbValue if provided (cases such as duplicate)
    for( let i = 0; i < initialTableRowData.length; i++ ) {
        const propName = initialTableRowData[ i ].name;
        const dbValue = initialTableRowData[ i ].dbValue;
        const dbValues = initialTableRowData[ i ].dbValues;
        const uiValue = initialTableRowData[ i ].uiValue;
        const uiValues = initialTableRowData[ i ].uiValues;
        let prop = {};
        prop.propertyDescriptor = modelType.propertyDescriptorsMap[ propName ];
        prop.dbValues = dbValues;
        prop.uiValues = uiValues;
        if( dbValue ) {
            prop.dbValue = dbValue;
        }
        if( uiValue ) {
            prop.uiValue = uiValue;
        }
        prop.displayValues = uiValues;
        prop.newDisplayValues = uiValues;
        prop.modifiable = true;
        prop.editable = true;
        prop.isEditable = true;
        prop.isPropertyModifiable = true;
        prop.parentUid = dummyUid;
        prop.srcObjLsd = '2017-09-01T14:34:12+05:30';
        modelObject.props[ propName ] = prop;
    }

    let initialRowVM = viewModelObjectService.constructViewModelObjectFromModelObject( modelObject, 'CREATE' );
    initialRowVM.uid = dummyUid;

    // If duplicating row, set all props with values to have valueUpdated true so they get saved.
    // must be done after VMO is created
    if( setValueUpdated ) {
        _.forEach( initialRowVM.props, function( prop ) {
            if( !_.isNil( prop.dbValue ) && prop.dbValue !== '' ) {
                // check uiValue if DATE
                if( prop.type !== 'DATE' || prop.uiValue !== '' ) {
                    prop.valueUpdated = true;
                    prop.newValue = prop.dbValue;
                }
            }
        } );
    }

    exports.addContextObjectAndProperty( propData, initialRowVM, true );

    updatedVMOs.viewModelObjects.push( initialRowVM );

    exports.updateVmoData( viewModel );

    const dataProvider = viewModel.dataProviders[ viewModel.data.providerName ];
    dataProvider.update( updatedVMOs.viewModelObjects, updatedVMOs.viewModelObjects.length );
    if( dataProvider && dataProvider.json && dataProvider.json.firstPage ) {
        delete dataProvider.json.firstPage;
    }

    eventBus.publish( viewModel.data.providerName + '.plTable.clientRefresh' );
    viewModel.data._syncFromCdmModified = true;
    viewModel.dispatch( { path: 'data._syncFromCdmModified', value: true } );

    // Scroll to new row
    let scrollEventData = {
        gridId: viewModel.data.providerName,
        rowUids: [ initialRowVM.uid ]
    };

    eventBus.publish( 'plTable.scrollToRow', scrollEventData );
};

/**
 * Processes the initial row data event and prepares the dummy row to be added to the grid
 *
 * @param {Object} eventData holding tableRowData as returned by the server
 * @param {Object} viewModel the view model
 */
export const processInitialRowDataEvent = function( eventData, viewModel ) {
    const { tableRowData } = eventData;
    const propData = exports.getPropertyData( viewModel );
    // process the event only if this instance is meant to
    if( tableRowData && propData.id === appCtxService.getCtx( 'ActiveTablePropertyId' ) ) {
        let viewModelCollection = viewModel.dataProviders[ viewModel.data.providerName ].viewModelCollection;
        let loadedVMObjs = viewModelCollection.getLoadedViewModelObjects();
        let totalFound = loadedVMObjs && loadedVMObjs.length ? loadedVMObjs.length : 0;
        let initialRowType = tableRowData[ 0 ].tableRowTypeName;
        let initialTableRowData = tableRowData[ 0 ].tableRowData;

        let setPropValueUpdated = tableRowData[ 0 ].setPropValueUpdated;

        if( !viewModel.data._persistentVMOs ) {
            viewModel.data._persistentVMOs = loadedVMObjs;
        }

        let existingAdditionalProps = appCtxService.getCtx( 'InitialSaveDataAdditionalProps' );
        existingAdditionalProps = existingAdditionalProps ? existingAdditionalProps : {};
        let additionalProps = existingAdditionalProps[ propData.propertyName ];
        additionalProps = additionalProps ? additionalProps : {};
        additionalProps.newRowTypeName = initialRowType;
        existingAdditionalProps[ propData.propertyName ] = additionalProps;
        appCtxService.updateCtx( 'InitialSaveDataAdditionalProps', existingAdditionalProps );

        // Ensure all loaded VM's of type Fnd0NameValue have the context
        // object and property set
        let initialVMOs = [];
        _.forEach( loadedVMObjs, function( loadedVmo ) {
            let vmo = null;
            if( loadedVmo && loadedVmo.props && loadedVmo.props.owningObject ) {
                vmo = loadedVmo;
            } else {
                vmo = viewModelObjectService.createViewModelObject( loadedVmo, 'EDIT' );
            }
            // Copy existing props form loadedVmo because they may have been updated and cached vmo won't have them
            // preserve the previous display value as setting editable states corrupts it.
            if( vmo ) {
                let prevDisplayValues = {};
                _.forEach( loadedVmo.props, function( prop ) {
                    vmo.props[ prop.propertyName ] = prop;
                    prevDisplayValues[ prop.propertyName ] = prop.prevDisplayValues;
                } );
                exports.addContextObjectAndProperty( propData, vmo, false );
                viewModelObjectService.setEditableStates( vmo, true, true, true );
                _.forEach( vmo.props, function( prop ) {
                    prop.prevDisplayValues = prevDisplayValues[ prop.propertyName ];
                } );
                initialVMOs.push( vmo );
            }
        } );

        // Creating a dummy model object for table row
        let dummyUid = 'prop_' + propData.propertyName + '_' + totalFound;
        let modelObject = {};
        modelObject.uid = dummyUid;

        modelObject.type = initialRowType;

        modelObject.props = {};
        let modelType = cmm.getType( initialRowType );
        if( !modelType ) {
            let missingTypes = [];
            missingTypes.push( initialRowType );
            // need to load from server
            soaSvc.ensureModelTypesLoaded( missingTypes ).then(
                function() {
                    modelType = cmm.getType( initialRowType );
                    exports.updateGridWithInitialRow( viewModel, initialTableRowData, initialVMOs,
                        modelType, modelObject, dummyUid, setPropValueUpdated );
                } );
        } else {
            exports.updateGridWithInitialRow( viewModel, initialTableRowData, initialVMOs, modelType,
                modelObject, dummyUid, setPropValueUpdated );
        }
    }
};

/**
 * Processes remove row data event and updates non-deleted grid rows with context object and
 * property to enable successful deletion of selected grid rows(s)
 *
 * @param {Object} eventData holding selected objects that need to be deleted
 * @param {Object} viewModel - the view model
 */
export const processRemoveRowDataEvent = function( eventData, viewModel ) {
    const propData = exports.getPropertyData( viewModel );
    // process the event only if this instance is meant to
    if( propData.id === appCtxService.getCtx( 'ActiveTablePropertyId' ) ) {
        propData.removeCommandEnabled = false;

        // Remove and Duplicate command should be in sync. when we remove a row, we should also disable duplicate command for that row.
        // Duplicate command is controlled with tablePropertyEditData, so we need to unregister it.
        appCtxService.unRegisterCtx( 'tablePropertyEditData' );

        const dataProvider = viewModel.dataProviders[ viewModel.data.providerName ];

        let uidsToDelete = [];
        if( eventData && eventData.selectionData && eventData.selectionData[ viewModel.data.providerName ] ) {
            _.forEach( eventData.selectionData[ viewModel.data.providerName ].selectedObjects, function( data ) {
                uidsToDelete.push( data.uid );
            } );
        }

        let viewModelCollection = dataProvider.viewModelCollection;
        let loadedVMObjs = viewModelCollection.getLoadedViewModelObjects();

        // Do not include dummy vmo information in the objectsToBeRestored.
        // This objectsToBeRestored will be used for cancel edit operation.
        if( !viewModel.data.objectsToBeRestored || viewModel.data.objectsToBeRestored.length === 0 ) {
            let objectsToBeRestored = [];
            _.forEach( loadedVMObjs, function( loadedVmo ) {
                let dummyUidName = cdm.NULL_UID + viewModel.data.providerName;
                if( loadedVmo.uid !== dummyUidName ) {
                    objectsToBeRestored.push( loadedVmo );
                }
            } );
            viewModel.data.objectsToBeRestored = objectsToBeRestored;
        }

        if( uidsToDelete.length === loadedVMObjs.length ) {
            // This means all rows or last row of TP/NV is being deleted
            let modelType;
            if( loadedVMObjs.length > 0 ) {
                modelType = loadedVMObjs[ 0 ].modelType; // This modelType will be used for dummy row creation.
            }
            dataProvider.update( [] );
            viewModel.data._persistentVMOs = null;
            viewModel.data.requestDummyRowCreation = true;
            var activeEditHandler = editHandlerService.getActiveEditHandler();
            if( activeEditHandler ) {
                var addDummyRowFunc = function() {
                    exports.addDummyRow( viewModel, modelType );
                };
                viewModel.data.preSaveActionID = activeEditHandler.registerPreSaveAction( addDummyRowFunc );
            }
        } else {
            let loadedVMOsToBeKept = {
                viewModelObjects: []
            };
            viewModel.data.requestDummyRowCreation = false;
            _.forEach( loadedVMObjs, function( loadedVmo ) {
                if( !_.includes( uidsToDelete, loadedVmo.uid ) ) {
                    exports.addContextObjectAndProperty( propData, loadedVmo, false );
                    loadedVMOsToBeKept.viewModelObjects.push( loadedVmo );
                }
            } );
            if( loadedVMOsToBeKept.viewModelObjects.length > 0 ) {
                viewModel.data._removedVMOUids = _.union( viewModel.data._removedVMOUids, uidsToDelete );
                dataProvider.update( loadedVMOsToBeKept.viewModelObjects, loadedVMOsToBeKept.viewModelObjects.length );
            }
        }

        viewModel.data._syncFromCdmModified = true;
        viewModel.dispatch( { path: 'data', value: { ...viewModel.data } } );
    }
};

export const updateVMOContext = function( eventData ) {
    appCtxService.registerCtx( 'tablePropertyEditData', { vmo: eventData.vmo, gridId: eventData.gridId } );
    appCtxService.registerCtx( 'ActiveTablePropertyId', eventData.gridId );
};

/**
 * Removes the application Context for tablePropertyEdit
 * @param {Object} eventData -
 */
export const removeVMOContext = function( eventData ) {
    if( eventData.state !== 'starting' ) {
        appCtxService.unRegisterCtx( 'tablePropertyEditData' );
    }
};

/**
 * Processes the editHandlerStateChange event
 * When the state is cancelling Load the original view model objects
 * back into the table thereby discarding any vmo's added via
 * getInitialTableRowData call. If canceling or saving remove the
 * context vmo object added from editing
 *
 * @param {Object} eventData - the event data
 * @param {Object} viewModel - the view model
 */
export const processCancelEditsEvent = function( eventData, viewModel ) {
    viewModel.data.requestDummyRowCreation = false;
    if( eventData ) {
        if( eventData.state === 'canceling' && viewModel.data.objectsToBeRestored && viewModel.data.objectsToBeRestored.length > 0 ) {
            viewModel.data._persistentVMOs = viewModel.data.objectsToBeRestored;
        }
        const propData = exports.getPropertyData( viewModel );
        let dataProvider = viewModel.dataProviders[ viewModel.data.providerName ];
        if( viewModel.data._persistentVMOs && eventData.state === 'canceling' ) {
            var activeEditHandler = editHandlerService.getActiveEditHandler();
            if( activeEditHandler ) {
                activeEditHandler.unregisterPreSaveAction( viewModel.data.preSaveActionID );
            }
            let updatedVMOs = {
                viewModelObjects: []
            };

            let persistentVmoUids = [];
            _.forEach( viewModel.data._persistentVMOs, function( persistentVmo ) {
                persistentVmoUids.push( persistentVmo.uid );
            } );

            // The below condition says there are few rows deleted. We need to restore them to original position after cancel edit.
            if( viewModel.data.objectsToBeRestored && viewModel.data.objectsToBeRestored.length > 0 ) {
                _.forEach( viewModel.data.objectsToBeRestored, function( loadedVmo ) {
                    updatedVMOs.viewModelObjects.push( loadedVmo );
                } );
            } else {
                let viewModelCollection = dataProvider.viewModelCollection;
                let loadedVMObjs = viewModelCollection.getLoadedViewModelObjects();
                _.forEach( loadedVMObjs, function( loadedVmo ) {
                    if( _.includes( persistentVmoUids, loadedVmo.uid ) ) {
                        updatedVMOs.viewModelObjects.push( loadedVmo );
                    }
                } );
            }

            dataProvider.update( updatedVMOs.viewModelObjects, updatedVMOs.viewModelObjects.length );
            viewModel.data._persistentVMOs = null;
            viewModel.data.objectsToBeRestored = [];
        } else if( eventData.state === 'partialSave' ) {
            let vmCollection = dataProvider.viewModelCollection;
            let loadedVMOs = vmCollection.getLoadedViewModelObjects();
            for( let i = 0; i < loadedVMOs.length; i++ ) {
                let vmo = loadedVMOs[ i ];

                // Set all vmos to have owning object and tablePropertyName to save properly
                if( !vmo.props.owningObject ) {
                    exports.addContextObjectAndProperty( propData, vmo, false );
                }
                _.forEach( vmo.props, function( prop ) {
                    if( prop.newValue || prop.newDisplayValues ) {
                        prop.valueUpdated = true;
                    }
                } );
                // put all vmos back into edit
                viewModelObjectService.setEditableStates( vmo, true, true, true );
            }
        }
    }

    viewModel.data._removedVMOUids = null;
    // Remove Edit VMO context if necessary
    exports.removeVMOContext( eventData );
    viewModel.dispatch( { path: 'data', value: { ...viewModel.data } } );
};

export const initSubscriptions = function( viewModel, selectionData ) {
    let subDefs = viewModel.data.subDefs || [];
    const propType = exports.getPropertyType( viewModel );
    subDefs.push( eventBus.subscribe( `${viewModel.data.providerName}.selectionChangeEvent`, function( eventData ) {
        exports.processGridSelectionEvent( eventData, viewModel );
    } ) );
    subDefs.push( eventBus.subscribe( 'cdm.updated', function( eventData ) {
        // When we create a brand new row, click on a cell to add some property value, that row is selected.
        // For this new row case, the selection should be cleared after create row operation is completed.
        if( selectionData && selectionData.getValue() && selectionData.getValue().selected && selectionData.getValue().selected.length === 1 ) {
            let selectedObjects = selectionData.getValue().selected;
            // A uid will have prop_ prefix only for the brand new row that is yet to be created.
            if( selectedObjects && selectedObjects[ 0 ].uid.includes( 'prop_' ) && selectionData ) {
                selectionData.update( { selected: [] } );
            }
        }
        exports.processCdmUpdatedEvent( eventData, viewModel );
    } ) );
    subDefs.push( eventBus.subscribe( `${propType}RowData.remove`, function( eventData ) {
        exports.processRemoveRowDataEvent( eventData, viewModel );
    } ) );
    subDefs.push( eventBus.subscribe( `${propType}InitialRowData.createSuccessful`, function( eventData ) {
        exports.processInitialRowDataEvent( eventData, viewModel );
    } ) );
    subDefs.push( eventBus.subscribe( 'editHandlerStateChange', function( eventData ) {
        exports.processCancelEditsEvent( eventData, viewModel );

        // When there is a row already selected and if we do start edit, duplicate command should be enabled.
        // Duplicate takes only one VMO and it should be the last selected VMO.
        if( eventData.state === 'starting' ) {
            const { dataProviders } = viewModel;
            let dataProvider = null;
            dataProvider = dataProviders[ viewModel.data.providerName ];
            if( dataProvider ) {
                let selectedObjects = dataProvider.getSelectedObjects();
                if( selectedObjects && selectedObjects.length > 0 ) {
                    let lastSelectedObject = selectedObjects[ selectedObjects.length - 1 ];
                    appCtxService.registerCtx( 'tablePropertyEditData', { vmo: lastSelectedObject, gridId: viewModel.data.providerName } );
                }
            }
        } else if( eventData.state === 'saved' ) {
            // clear objects to be restored on save
            viewModel.dispatch( { path: 'data.objectsToBeRestored', value: [] } );
        }
    } ) );
    subDefs.push( eventBus.subscribe( `${viewModel.data.providerName}.cellStartEdit`, function( eventData ) {
        exports.updateVMOContext( eventData );
    } ) );
    viewModel.data.subDefs = subDefs;
};

export const setTablePropertyInitialRowDataInput = function( viewModel ) {
    const propertyData = exports.getPropertyData( viewModel );
    const owningObjectUid = propertyData.parentUid;
    const tablePropertyName = propertyData.propertyName;
    appCtxService.registerCtx( 'TablePropertyInitialRowDataInput', {
        owningObject: {
            uid: owningObjectUid
        },
        tablePropertyName: tablePropertyName
    } );
};

export const preProcessAction = function( viewModel ) {
    const propData = exports.getPropertyData( viewModel );
    const propType = exports.getPropertyType( viewModel );

    if( propType === 'TableProperty' ) {
        exports.setTablePropertyInitialRowDataInput( viewModel );
    }

    appCtxService.registerCtx( 'ActiveTablePropertyId', propData.id );
};

/**
 * Initializes what is needed for name value or table property tables after property data is set
 *
 * @param {Object} viewModel the view model
 * @param {Object} selectionData selection data
 * @param {Function} specificContextInit Context initialization function specific for table prop or name value
 */
// only nameValue pair code sends specificContextInit but not table properties code.
export const init = function( viewModel, selectionData, specificContextInit ) {
    // Set provider name
    viewModel.data.providerName = `${viewModel.data._propertyData.id}_Provider`;
    exports.initContext( viewModel, specificContextInit );
    exports.initSubscriptions( viewModel, selectionData );
};

/**
 * Adds Dummy row when we delete all rows or last row for save.
 *
 * @param {Object} viewModel the view model
 * @param {Object} modelType the model type
 */
export const addDummyRow = function( viewModel, modelType ) {
    if( viewModel.data.requestDummyRowCreation ) {
        const dataProvider = viewModel.dataProviders[ viewModel.data.providerName ];
        const propData = exports.getPropertyData( viewModel );

        let viewModelCollection = dataProvider.viewModelCollection;
        if( viewModelCollection ) {
            let loadedVMObjs = viewModelCollection.getLoadedViewModelObjects();
            if( loadedVMObjs.length === 0 ) {
                let loadedVmo = {};
                loadedVmo.props = {};
                loadedVmo.uid = cdm.NULL_UID + viewModel.data.providerName;
                let dummyVMO = viewModelObjectService.constructViewModelObject( loadedVmo );
                if( modelType ) {
                    dummyVMO.modelType = modelType;
                }
                exports.addContextObjectAndProperty( propData, dummyVMO, false );
                dummyVMO.type = 'unknownType';

                let dummyVMOArr = {
                    viewModelObjects: []
                };

                dummyVMOArr.viewModelObjects.push( dummyVMO );

                dataProvider.update( dummyVMOArr.viewModelObjects, dummyVMOArr.viewModelObjects.length );
            }
        }
    }
};

/**
 * Get sortCriteria information from the server.
 *
 * @param {Object} TablePropOrNameValueData TableProperty Or NameValueProperty Data
 * @param {Object} sortCriteria sort criteria
 */
export const getSortCriteriaForTablePropOrNameValue = function( TablePropOrNameValueData, sortCriteria ) {
    if( TablePropOrNameValueData && TablePropOrNameValueData.sortBy ) {
        sortCriteria.fieldName = TablePropOrNameValueData.sortBy;
        let sortDirection = TablePropOrNameValueData.sortDirection;
        switch ( sortDirection ) {
            case 'descending':
                sortDirection = 'DESC';
                break;
            case 'ascending':
            default:
                sortDirection = 'ASC';
        }
        sortCriteria.sortDirection = sortDirection;
    }
};

export const cleanup = function( viewModel, dpRef ) {
    var activeEditHandler = editHandlerService.getActiveEditHandler();
    if( activeEditHandler ) {
        activeEditHandler.unregisterPreSaveAction( viewModel.data.preSaveActionID );
    }
    viewModel.data._persistentVMOs = null;
    viewModel.data._removedVMOUids = null;
    viewModel.data.objectsToBeRestored = [];
    const propData = exports.getPropertyData( viewModel ) || {};
    const propType = exports.getPropertyType( viewModel ) || '';

    appCtxService.unRegisterCtx( 'ActiveTablePropertyId' );
    appCtxService.unRegisterCtx( 'TablePropertyInitialRowDataInput' );
    appCtxService.unRegisterCtx( propData.initialRowDataInput );
    appCtxService.unRegisterCtx( 'tablePropertyEditData' );
    appCtxService.unRegisterCtx( `${propType}Selection` );

    if( propType === 'NameValue' ) {
        appCtxService.unRegisterCtx( 'InitialLovDataAdditionalProps' );
    }
    _.forEach( viewModel.data.subDefs, function( sub ) {
        eventBus.unsubscribe( sub );
    } );

    const dpName = viewModel.data.providerName;
    const dp = viewModel.dataProviders[ dpName ];
    if( dp && dpRef.current && dpRef.current.dataProviders.includes( dp.viewModelCollection.getLoadedViewModelObjects ) ) {
        let index = dpRef.current.dataProviders.indexOf( dp.viewModelCollection.getLoadedViewModelObjects );
        if( index > -1 ) {
            dpRef.current.dataProviders.splice( dp.viewModelCollection.getLoadedViewModelObjects, 1 );
        }
    }
};

exports = {
    createDynamicTablePropertyViewModel,
    getPropertyData,
    setPropertyData,
    getPropertyType,
    processInitialDataProvider,
    initContext,
    processGridSelectionEvent,
    updateGridWithInitialRow,
    processInitialRowDataEvent,
    processRemoveRowDataEvent,
    updateVMOContext,
    removeVMOContext,
    processCancelEditsEvent,
    initSubscriptions,
    processCdmUpdatedEvent,
    addProperty,
    addContextObjectAndProperty,
    updateVmoData,
    setTablePropertyInitialRowDataInput,
    preProcessAction,
    init,
    addDummyRow,
    getSortCriteriaForTablePropOrNameValue,
    cleanup
};

export default exports;
