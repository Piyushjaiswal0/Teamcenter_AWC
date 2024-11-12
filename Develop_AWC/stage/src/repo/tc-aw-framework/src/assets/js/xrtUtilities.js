// Copyright (c) 2022 Siemens

/**
 * @module js/xrtUtilities
 */
import awColumnSvc from 'js/awColumnService';
import _ from 'lodash';
import AwStateService from 'js/awStateService';
import appCtxService from 'js/appCtxService';
import editHandlerService from 'js/editHandlerService';
import clientDataModel from 'soa/kernel/clientDataModel';
import viewModelObjectSvc from 'js/viewModelObjectService';
import soaSvc from 'soa/kernel/soaService';
import functional from 'js/functionalUtility.service';
import xrtObjectSetSvc from 'js/xrtObjectSetService';
import { getAdaptedObjectsSync } from 'js/adapterService';
import cmm from 'soa/kernel/clientMetaModel';
import notySvc from 'js/NotyModule';

let exports = {};

const editHandlerContextConstant = {
    INFO: 'INFO_PANEL_CONTEXT',
    SUMMARY: 'NONE',
    CREATE: 'CREATE_PANEL_CONTEXT',
    REVISE: 'REVISE_PANEL_CONTEXT',
    SAVEAS: 'SAVEAS_PANEL_CONTEXT'
};

/**
 * This js function converts JSON to string and returns it
 *
 * @param {Object} xrtContext data for xrtContext
 * @param {Object} xrtContextFromAtomicData data for xrtContext passed from child component through atomic data
 *
 * @return{String} convert input xrtContext JSON to string and return if valid else return undefined
 */
export let getActiveWorkspaceXrtContext = function( xrtContext, xrtContextFromAtomicData ) {
    let xrtContextIn = xrtContext ? xrtContext : xrtContextFromAtomicData;
    if( xrtContextIn ) {
        return JSON.stringify( xrtContextIn );
    }

    return undefined;
};

/**
 * Return the new column config only if it is valid.
 *
 * @param {Object} response return of the SOA
 * @param {Object} oldColumnConfig old column config
 * @param {Object} newColumnConfig new column config
 * @returns {Object} return old column config if new one is not valid
 */
export let getValidColumnConfig = function( response, oldColumnConfig ) {
    var newColumnConfig = response && response.columnConfig ? response.columnConfig : null;
    return newColumnConfig && newColumnConfig.columnConfigId ? newColumnConfig : oldColumnConfig;
};

/**
 * Return the attributesToInflate properties.
 *
 * @param {Object} columnConfig new column config
 * @returns {Array} An array attributesToInflate properties is returned.
 */
export let getAttributesToInflate = function( columnConfig, newColumns ) {
    let attributesToInflate = [];
    let inputColumns = columnConfig && columnConfig.columns && columnConfig.columns.length ? columnConfig.columns : newColumns;
    if( inputColumns ) {
        _.forEach( inputColumns, function( uwColumnInfo ) {
            if( ( uwColumnInfo.field || uwColumnInfo.propertyName ) && uwColumnInfo.hiddenFlag !== true ) {
                attributesToInflate.push( uwColumnInfo.field || uwColumnInfo.propertyName );
            }
        } );
    }
    return attributesToInflate;
};

/**
 * Return the columns for XRT object set table.
 * @param {Object} ColumnConfig  column config
 * @returns {Object} return soa column info
 */
export let getObjSetColumns = function( soaColumns, colProviderColumns ) {
    var soaColumnInfos = [];
    var colProviderCols = {};
    var index = 100;

    _.forEach( colProviderColumns, function( col ) {
        if( col.name === 'icon' ) {
            return;
        }
        var propName = col.propertyName;
        colProviderCols[ propName ] = col;
    } );

    _.forEach( soaColumns, function( col ) {
        if( col.name === 'icon' ) {
            return;
        }
        if( col.titleKey !== undefined ) {
            col.displayName = col.titleKey;
        } else if( colProviderCols[ col.propertyName ] && colProviderCols[ col.propertyName ].titleKey !== undefined ) {
            col.displayName = colProviderCols[ col.propertyName ].titleKey;
        }
        soaColumnInfos.push( col );
        index += 100;
    } );
    return soaColumnInfos;
};

export let handleHtmlPanelVMCollection = function( callback, response ) {
    if( !callback ) {
        return;
    }

    callback( response );
};

export let updateRedLineMode = () => {
    const stateParams = AwStateService.instance.params;

    if ( stateParams.s_uid === undefined && stateParams.uid !== undefined || stateParams.s_uid === stateParams.uid ) {
        appCtxService.unRegisterCtx( 'isRedLineMode' );
    } else {
        appCtxService.registerCtx( 'isRedLineMode', 'false' );
    }
};

export const updateObjectsInDataSource = function( viewModelProperties, type, objectType, editHandlerIn ) {
    let editHandler = editHandlerIn;
    if( !editHandler ) {
        editHandler = editHandlerService.getEditHandler( editHandlerContextConstant[ type ] );
    }
    let dataSource;
    if( editHandler ) {
        dataSource = editHandler.getDataSource();
        let editableProps = dataSource.getAllEditableProperties();
        let updatedProps = [];

        viewModelProperties.map( function( vmProp ) {
            editableProps.map( function( editableProp ) {
                if( editableProp && editableProp.propertyName === vmProp.propertyName ) {
                    let updatedProp = { ...vmProp };
                    updatedProps.push( updatedProp );
                }
            } );
        } );

        dataSource.updateObjects( updatedProps );
    }
};

/**
 * This function updates viewModelProperties on the edit handler for HTMLPanels.
 *
 * @param {Array} Array of View Model Properties
 * @param {String} String type
 */
export let addHtmlPanelPropertiesInDataSource = function( updatedProperties, type ) {
    if( updatedProperties && type ) {
        let editHandlerContext = editHandlerContextConstant[ type ];
        if( !editHandlerContext ) {
            editHandlerContext = type;
        }

        let editHandler = editHandlerService.getEditHandler( editHandlerContext );
        if( editHandler ) {
            let dataSource = editHandler.getDataSource();
            dataSource.updateObjects( updatedProperties );
        }
    }
};

export let buildVMOsForObjectSet = function( selObjUid, serverVMOs ) {
    let objectSetObjects = [];
    _.forEach( serverVMOs, function( objs, uid ) {
        if( uid === selObjUid ) {
            return;
        }

        let operationName = 'Edit';
        let owningObjUid = null;
        // Build the vmo.
        for( const obj of objs ) {
            let vmoIn = viewModelObjectSvc.createViewModelObject( uid, operationName, owningObjUid, obj );
            if( vmoIn && vmoIn.type === 'Awp0XRTObjectSetRow' ) {
                vmoIn.operationName = operationName;
                // Get underlying target object's UID if 'awp0Target' property exists
                if( vmoIn.props && vmoIn.props.awp0Target ) {
                    var targetUID = vmoIn.props.awp0Target.dbValue;
                    var targetMO = clientDataModel.getObject( targetUID );
                    if( targetMO ) {
                        var targetVMO = viewModelObjectSvc.constructViewModelObjectFromModelObject( targetMO, operationName, null, null, true );
                        var props = targetVMO.props;
                        _.forEach( props, function( prop ) {
                            if( prop && !vmoIn.props.hasOwnProperty( prop.propertyName ) ) {
                                if( prop.intermediateObjectUids ) {
                                    prop.intermediateObjectUids.push( targetUID );
                                } else {
                                    prop.intermediateObjectUids = [ targetUID ];
                                }
                                vmoIn.props[ prop.propertyName ] = prop;
                            }
                        } );
                    }
                }

                objectSetObjects.push( vmoIn );
            }
        }
    } );

    return objectSetObjects;
};

export const setSelection = ( eventData, dataProvider ) => {
    if( eventData && dataProvider ) {
        //Select the newly created objects
        if( eventData.createdObjects.length > 1 ||
            dataProvider.selectionModel.getCurrentSelectedCount() > 1 ||
            dataProvider.selectionModel.multiSelectEnabled ) {
            dataProvider.selectionModel.addToSelection( eventData.createdObjects );
        } else {
            dataProvider.selectionModel.setSelection( eventData.createdObjects );
        }
    }
};

const isObjTypeValidForRefresh = ( objToTest, refreshObjSetTypes ) => {
    let updateObjHierarchy;
    updateObjHierarchy = objToTest.modelType.typeHierarchyArray;
    for ( let refreshObjSetType of refreshObjSetTypes ) {
        if ( updateObjHierarchy.includes( refreshObjSetType ) ) {
            return true;
        }
    }
    return false;
};

const getArray = ( collection ) => {
    return  _.isArray( collection ) ? collection :  Object.values( collection );
};

const isObjsetRefreshReqd = ( updatedObjInfo, refreshObjSetTypes, isRefreshAllObjectSets ) => {
    if( isRefreshAllObjectSets ) {
        return true;
    }
    let isObjsetRefreshReqd = false;
    let objsToCheck = null;
    if ( !_.isEmpty( updatedObjInfo.createdObjects ) ) {
        //Add case
        objsToCheck = getArray( updatedObjInfo.createdObjects );
    } else if ( !_.isEmpty( updatedObjInfo.childObjects ) ) {
        //Cut case
        objsToCheck = getArray( updatedObjInfo.childObjects );
    } else {
        //Default refresh objectset
        return true;
    }

    if ( objsToCheck ) {
        for ( const objToCheck of objsToCheck ) {
            if ( isObjTypeValidForRefresh( objToCheck, refreshObjSetTypes ) ) {
                isObjsetRefreshReqd = true;
                break;
            }
        }
    }
    return isObjsetRefreshReqd;
};

export const checkIfObjectModified = ( objectSetSource, selectedVMO, eventData, isRefreshAllObjectSets ) => {
    if( !eventData.relatedModified ) {
        return false;
    }

    const isDCP = ( src ) => {
        return src.search( /\(/ );
    };

    let types = objectSetSource.split( ',' ).reduce( ( prev, curr ) => {
        let [ rel, type ] = curr.split( '.' );
        if ( isDCP( curr ) > 0 ) {
            // if src = GRM(IMAN_specification,Dataset)
            // Usecase: If user attaches DocumentRevision to Objectset#1 and there is Objectset#2 with rule
            // GRM(IMAN_specification,DocumentRevision).GRM(TC_Attaches,Dataset) - It also has to be refreshed
            type = curr.substring( curr.search( /,/ ) + 1, curr.search( /\)/ ) );
        }
        prev.add( type );
        return prev;
    }, new Set() );

    if ( isObjsetRefreshReqd( eventData, types, isRefreshAllObjectSets ) === false ) {
        return false;
    }

    if( !eventData.isPinnedFlag && eventData.scope && eventData.scope.subPanelContext && eventData.scope.subPanelContext.targetObject &&
        eventData.scope.subPanelContext.baseSelection &&
        eventData.scope.subPanelContext.targetObject.uid === eventData.scope.subPanelContext.baseSelection.uid && cmm.isInstanceOf( 'Folder', eventData.scope.subPanelContext.baseSelection.modelType ) ) {
        return;
    }

    var containsS2PRelation = false;
    if( eventData.relations && eventData.relations.dbValue ) {
        var isS2PRelation = _.includes( eventData.relations.dbValue, 'S2P:' );
        if( isS2PRelation ) {
            containsS2PRelation = _.includes( objectSetSource, eventData.relations.dbValue );
        }
    }

    let adaptedVmo = {};
    let adaptedObjArr = getAdaptedObjectsSync( [ selectedVMO ] );
    if( adaptedObjArr && adaptedObjArr.length > 0 ) {
        adaptedVmo = adaptedObjArr[0];
    }

    var matches = eventData.relatedModified.filter( function( mo ) {
        return mo.uid === adaptedVmo.uid || mo.uid === selectedVMO.uid;
    } );

    return matches.length || containsS2PRelation;
};

export const updateRefreshFlag = () => {
    return true;
};

export const resetRefreshFlag = () => {
    return false;
};

export const loadObjectSetDataFromServer = ( objectSetUri, operationType, columnFilters, xrtContext, objectSetData,
    vmo, sortCriteriaIn, startIndex, colsToInflate, objectSetState, parentUid ) => {
    let sortCriteria = sortCriteriaIn;
    if( !sortCriteria ) {
        sortCriteria = [ {} ];
        if( objectSetData.sortBy ) {
            sortCriteria[0].fieldName = objectSetData.sortBy;
            let sortDirection = objectSetData.sortDirection;
            switch ( sortDirection ) {
                case 'descending':
                    sortDirection = 'DESC';
                    break;
                case 'ascending':
                default:
                    sortDirection = 'ASC';
            }
            sortCriteria[0].sortDirection = sortDirection;
        }
    }

    if ( !parentUid || parentUid.length === 0 ) {
        let adaptedVmo = {};
        let adaptedObjArr = getAdaptedObjectsSync( [ vmo ] );
        if( adaptedObjArr && adaptedObjArr.length > 0 ) {
            adaptedVmo = adaptedObjArr[0];
        }
        parentUid = adaptedVmo.uid;
    }

    return soaSvc.postUnchecked( 'Internal-AWS2-2023-06-Finder', 'performSearchViewModel5', {
        columnConfigInput: {
            clientName: 'AWClient',
            clientScopeURI: objectSetUri,
            operationType: operationType
        },
        searchInput:  {
            columnFilters: columnFilters,
            maxToLoad: 50,
            maxToReturn: 50,
            providerName: 'Awp0ObjectSetRowProvider',
            searchCriteria: {
                'ActiveWorkspace:Location': appCtxService.getCtx( 'locationContext.ActiveWorkspace:Location' ),
                'ActiveWorkspace:SubLocation': appCtxService.getCtx( 'locationContext.ActiveWorkspace:SubLocation' ),
                'ActiveWorkspace:xrtContext': getActiveWorkspaceXrtContext( xrtContext ),
                isRedLineMode: appCtxService.getCtx( 'isRedLineMode' ),
                objectSet: objectSetData.source,
                parentUid: parentUid,
                showConfiguredRev: objectSetData.showConfiguredRev
            },
            searchSortCriteria: sortCriteria,
            startIndex: startIndex,
            attributesToInflate: colsToInflate
        },
        inflateProperties: true
    } ).then( function( response ) {
        if( response.ServiceData && response.ServiceData.partialErrors &&
            response.ServiceData.partialErrors.length > 0 ) {
            notySvc.showError( response.ServiceData.partialErrors[0].errorValues[0].message );
        }

        if( response.searchResultsJSON ) {
            response.searchResults = JSON.parse( response.searchResultsJSON );
        }

        if ( response.totalLoaded && objectSetState && objectSetState.getValue ) {
            let newObjectSetState = { ...objectSetState.getValue() };
            if ( response.totalLoaded !== objectSetState.totalLoaded ) {
                newObjectSetState.totalLoaded = response.totalLoaded;
                objectSetState.update( newObjectSetState );
            }
        }

        // Create view model objects
        response.searchResults = response.searchResults &&
        response.searchResults.objects ? response.searchResults.objects.map( function( vmo ) {
                return viewModelObjectSvc.createViewModelObject( vmo.uid, 'EDIT', null, vmo );
            } ) : [];

        return response;
    } );
};

export const loadObjectSetData = ( firstPageUids, objectSetInfo, firstPageResultsInVM,
    objectSetUri, columns, initialOperationType, updatedOperationType, columnFilters, xrtContext, objectSetData,
    vmo, sortCriteria, startIndex, colsToInflate, reload, objectSetState, totalFound, parentUid ) => {
    let firstPageObjs = [];
    if( firstPageUids && firstPageUids.length > 0 && objectSetInfo && objectSetInfo.firstPage ) {
        _.forEach( firstPageUids, function( uid ) {
            if( uid ) {
                let objects = objectSetInfo.firstPage.filter( obj => obj.uid === uid );
                for( const obj of objects ) {
                    if( obj ) {
                        firstPageObjs.push( obj );
                    }
                }
            }
        } );
    }

    // We cannot trust totalFound if object source is DCP, Increment totalFound so it always call server
    if( !totalFound || totalFound < 0 ||  objectSetData && objectSetData.source && objectSetData.source.search( /\(/ ) > 0  ) {
        totalFound = firstPageObjs.length;
        let pageSize = 50;
        if( firstPageObjs.length >= pageSize ) {
            totalFound += 1;
        }
    }

    let columnConfig = {
        columnConfigId: objectSetUri,
        columns: columns,
        operationType: initialOperationType
    };
    let operationType = updatedOperationType ? updatedOperationType : initialOperationType;

    if( firstPageResultsInVM || reload ) {
        return loadObjectSetDataFromServer( objectSetUri, operationType, columnFilters, xrtContext, objectSetData,
            vmo, sortCriteria, startIndex, colsToInflate, objectSetState, parentUid ).then( function( response ) {
            return {
                firstPageObjs: response.searchResults,
                totalFound: response.totalFound,
                columnConfig: response.columnConfig
            };
        } );
    }

    return  {
        firstPageObjs,
        totalFound,
        columnConfig
    };
};

export const getCurrentObjectSetViewMode = ( objectSetData ) => {
    let simplifiedSource;
    if( objectSetData.source ) {
        /**
         * Convert all special characters in objectSet source to underscore '_' so that we
         * can add it as a key in appCtxService to persist the displayMode state
         */
        simplifiedSource = objectSetData.source.replace( /[^A-Z0-9]/ig, '_' );
    }
    return appCtxService.getCtx( 'objectSetViewModeContext' + '.' + simplifiedSource );
};

export const handleObjectSetMultiSelect = ( multiSelect, selectionModel, objectSetState ) => {
    if( selectionModel ) {
        const dp = selectionModel.getDpListener();
        if( dp ) {
            dp.selectionModel.setMultiSelectionEnabled( multiSelect );
            if( !multiSelect ) {
                dp.selectNone();
            }
        }

        if( objectSetState ) {
            let newObjectSetStateValue = { ...objectSetState.getValue() };
            newObjectSetStateValue.showCheckBox = multiSelect;
            objectSetState.update && objectSetState.update( newObjectSetStateValue );
        }
    }
};

export const handleObjectSetSelectAll = ( selectAll, selectionModel, objectSetState ) => {
    if( selectionModel ) {
        const dp = selectionModel.getDpListener();
        if( dp ) {
            if( selectAll ) {
                dp.selectAll();
            } else {
                dp.selectNone();
            }
        }

        if( objectSetState ) {
            let newObjectSetStateValue = { ...objectSetState.getValue() };
            newObjectSetStateValue.selectAll = selectAll;
            objectSetState.update && objectSetState.update( newObjectSetStateValue );
        }
    }
};

export const isObjectSetSourceDCP = function( sourceName ) {
    return sourceName.indexOf( '(' ) !== -1 &&
        ( sourceName.indexOf( 'GRM' ) !== -1 ||
            sourceName.indexOf( 'GRMS2P' ) !== -1 ||
            sourceName.indexOf( 'REF' ) !== -1 ||
            sourceName.indexOf( 'REFBY' ) !== -1 ||
            sourceName.indexOf( 'GRMREL' ) !== -1 ||
            sourceName.indexOf( 'GRMS2PREL' ) !== -1 );
};

export const getSelectedTabFromPages = ( xrtData ) => {
    let selectedTab;
    if( xrtData && xrtData.data && xrtData.data._pages ) {
        let tab = xrtData.data._pages.filter( function( pageObj ) {
            return pageObj.selected;
        } );
        if( tab ) {
            selectedTab = tab[0].titleKey;
        }
    }

    return selectedTab;
};

export const isValidToRenderWalker = ( xrtData, type, prevSelectedTab ) => {
    if( type === 'REVISE' || type === 'SAVEAS' || type === 'CREATE' ) {
        return true;
    }

    let selectedTab = getSelectedTabFromPages( xrtData );
    return selectedTab === prevSelectedTab;
};

export const refreshDataProvider = ( dataProvider, eventData, objectSetSource, vmo, isRefreshAllObjectSets ) => {
    let selObjModified = checkIfObjectModified( objectSetSource, vmo, eventData, isRefreshAllObjectSets );

    if ( !eventData.refreshLocationFlag && selObjModified ) {
        var promise = Promise.resolve( dataProvider.resetDataProvider() );
        // Attach selection model once first page is loaded
        promise.then( function( response ) {
            if( !eventData.isPinnedFlag && eventData.createdObjects ) {
                //Select the newly created objects
                if( eventData.createdObjects.length > 1 || dataProvider.selectionModel.getCurrentSelectedCount() > 1 || dataProvider.selectionModel.multiSelectEnabled ) {
                    dataProvider.selectionModel.addToSelection( eventData.createdObjects );
                } else {
                    dataProvider.selectionModel.setSelection( eventData.createdObjects );
                }
            }
            return response;
        } );
    }
};

export const buildCommandContext = ( objsetdata, displayModeState, objectSetState, currentDisplay, selectionModel, { titlekey, displaytitle, columns,
    vmo, subPanelContext, operationType, dpRef, objSetUri, xrtContext, parentUid } ) => {
    let xrtCommandAliasMap = {
        'com.teamcenter.rac.common.AddNew': 'Awp0ShowAddObject',
        'com.teamcenter.rac.common.AddReference': 'Awp0ShowAddObject',
        'com.teamcenter.rac.viewer.pastewithContext': 'Awp0Paste'
    };
    // Add the context for the commands
    let commandIdMap = objsetdata.commands.map( functional.getProp( 'commandId' ) )
        .reduce( functional.toBooleanMap, {} );

    // add aliases to commandIdMap
    let commandIdKeys = _.keys( commandIdMap );
    _.forEach( commandIdKeys, function( currentCommandId ) {
        let aliasCommandId = xrtCommandAliasMap[ currentCommandId ];
        if( aliasCommandId ) {
            commandIdMap[ aliasCommandId ] = true;
        }
    } );

    let parameterMap = objsetdata.commands.reduce( function( acc, nxt ) {
        let k = xrtCommandAliasMap[ nxt.commandId ] ? xrtCommandAliasMap[ nxt.commandId ] :
            nxt.commandId;
        acc[ k ] = nxt.parameters ? nxt.parameters : {};
        return acc;
    }, {} );

    let modelTypeRelationListMap = xrtObjectSetSvc.getModelTypeRelationListMap( objsetdata.source );
    let modelTypeRelations = Object.keys( modelTypeRelationListMap );

    let adaptedVmo = {};
    let adaptedObjArr = getAdaptedObjectsSync( [ vmo ] );
    if( adaptedObjArr && adaptedObjArr.length > 0 ) {
        adaptedVmo = adaptedObjArr[0];
    }

    return {
        displayModes: objsetdata.displayModes,
        displayModesCount: Object.keys( objsetdata.displayModes ).length,
        currentDisplay: currentDisplay,
        currentDisplayField: displayModeState,
        xrtCommands: commandIdMap,
        objectSetSource: objsetdata.source,
        isObjectSetSourceDCP: isObjectSetSourceDCP( objsetdata.source ),
        objectSetSourceHasDataset: objsetdata.sourceHasDataset,
        objectSetSourceArray: objsetdata.source ? objsetdata.source.split( ',' ) : [],
        modelTypeRelations: modelTypeRelations,
        modelTypeRelationListMap: modelTypeRelationListMap,
        objectSetTitleKey: titlekey,
        displayTitle: displaytitle,
        vmo: adaptedVmo,
        operationType,
        objectSetUri:objSetUri,
        columns,
        columnProvider: dpRef && dpRef.current && dpRef.current.columnProviders ? dpRef.current.columnProviders[ `${objsetdata.id}_Provider` ] : null,
        providerName: 'Awp0ObjectSetRowProvider',
        parameterMap: parameterMap,
        objectSetState: objectSetState,
        selectionModel,
        searchCriteria: {
            'ActiveWorkspace:Location': appCtxService.getCtx( 'locationContext.ActiveWorkspace:Location' ),
            'ActiveWorkspace:SubLocation': appCtxService.getCtx( 'locationContext.ActiveWorkspace:SubLocation' ),
            'ActiveWorkspace:xrtContext': getActiveWorkspaceXrtContext( xrtContext ),
            isRedLineMode: appCtxService.getCtx( 'isRedLineMode' ),
            objectSet: objsetdata.source,
            parentUid: parentUid,
            showConfiguredRev: objsetdata.showConfiguredRev
        },
        ...subPanelContext
    };
};

/**
 * Utility to create relation info object
 *
 * @param {Array} childSelections - array of child selections
 * @param {Object} baseSelection - base selection
 *
 * @return {Object} An object which contains primaryObject, relationObject, relationType and
 *         secondaryObject
 */
export const getRelationInfo = function( childSelections, baseSelection ) {
    if( childSelections ) {
        return childSelections.selected.map( function( mo ) {
            var priObj = baseSelection;
            var secObj = mo;
            var relObj = null;
            var relStr = null;

            if( mo.type === 'Awp0XRTObjectSetRow' && mo.props && mo.props.awp0Target ) {
                if( clientDataModel.isValidObjectUid( mo.props.awp0Primary.dbValue ) ) {
                    priObj = viewModelObjectSvc.createViewModelObject( clientDataModel
                        .getObject( mo.props.awp0Primary.dbValue ) );
                }

                if( clientDataModel.isValidObjectUid( mo.props.awp0Secondary.dbValue ) ) {
                    secObj = viewModelObjectSvc.createViewModelObject( clientDataModel
                        .getObject( mo.props.awp0Secondary.dbValue ) );
                }

                if( clientDataModel.isValidObjectUid( mo.props.awp0Relationship.dbValue ) ) {
                    relObj = viewModelObjectSvc.createViewModelObject( clientDataModel
                        .getObject( mo.props.awp0Relationship.dbValue ) );
                }

                relStr = mo.props.relation.dbValue;
            }
            return {
                primaryObject: priObj,
                relationObject: relObj,
                relationType: relStr,
                secondaryObject: secObj
            };
        } );
    }

    return null;
};

export const refreshObjectSet = ( viewModel, props ) => {
    var eventData = viewModel.data.eventData;
    const { callback } = props;
    let relatedModified = false;
    if( callback && eventData.refreshLocationFlag && eventData.relatedModified ) {
        for( let i = 0; i < eventData.relatedModified.length; ++i ) {
            if( clientDataModel.getObject( eventData.relatedModified[ i ].uid ) ) {
                relatedModified = true;
            }
        }
        if( relatedModified ) {
            callback();
        }
    }
};
export const updateRedlineProps = ( editHandler ) => {
    let isRedLineMode = appCtxService.getCtx( 'isRedLineMode' );
    let activeEditHandler = editHandler || editHandlerService.getActiveEditHandler();
    if( isRedLineMode === 'true' && activeEditHandler ) {
        let dataSource = activeEditHandler.getDataSource();
        let modifiedProps = dataSource ? dataSource.getAllModifiedProperties() : [];
        for( const modifiedProp of modifiedProps ) {
            let {
                isArray,
                oldValue,
                oldValues,
                displayValues,
                prevDisplayValues,
                type
            } = modifiedProp;
            if( isArray ) {
                if( oldValues === undefined ) {
                    modifiedProp.oldValues = prevDisplayValues === null || prevDisplayValues === undefined ? [] : prevDisplayValues;
                } else if( _.isEqual( oldValues, displayValues ) ) {
                    //oldValue and new value become same
                    delete modifiedProp.oldValues;
                }
            } else {
                if( oldValue === undefined && !isEqual( type, prevDisplayValues, displayValues ) ) {
                    modifiedProp.oldValue = _.isArray( prevDisplayValues ) && prevDisplayValues.length > 0 ? prevDisplayValues[ 0 ] : '';
                } else if( oldValue !== undefined && isEqual( type, [ oldValue ], displayValues ) ) {
                    delete modifiedProp.oldValue;
                }
            }
        }
    }
};
const isEqual = ( type, oldValues, newValues ) => {
    let equal = false;
    let oldValue = _.isArray( oldValues ) && oldValues.length > 0 ? oldValues[ 0 ] : '';
    let newValue = _.isArray( newValues ) && newValues.length > 0 ? newValues[ 0 ] : '';
    switch ( type ) {
        case 'DOUBLE':
            //50.0000 = 50
            equal = parseFloat( oldValue ) === parseFloat( newValue );
            break;
        default:
            equal = oldValue.toLowerCase() === newValue.toLowerCase();
            break;
    }
    return equal;
};

export const handleHtmlPanelFocusChange = ( localSelectionData, focusComponent, selectionModel ) => {
    if( focusComponent && localSelectionData._modelId
        && localSelectionData._modelId !== focusComponent && selectionModel
        && selectionModel.getSelection().length > 0 ) {
        selectionModel.selectNone();
    }

    if( focusComponent === 'clear' && selectionModel.getSelection().length > 0 ) {
        selectionModel.selectNone();
    }
};

export const handleHtmlPanelSelectionChange = ( localSelectionData, parentSelectionData ) => {
    if( !_.isEmpty( localSelectionData ) ) {
        parentSelectionData && parentSelectionData.update( { ...localSelectionData } );
    }
};

export const initDataProviderRef = ( dataProviderRef ) => {
    if( dataProviderRef && !dataProviderRef.current ) {
        dataProviderRef.current = {
            dataProviders: [],
            columnProviders: {}
        };
    }
};

export default exports = {
    getActiveWorkspaceXrtContext,
    getValidColumnConfig,
    getAttributesToInflate,
    getObjSetColumns,
    handleHtmlPanelVMCollection,
    updateRedLineMode,
    addHtmlPanelPropertiesInDataSource,
    updateObjectsInDataSource,
    buildVMOsForObjectSet,
    setSelection,
    checkIfObjectModified,
    updateRefreshFlag,
    resetRefreshFlag,
    loadObjectSetData,
    isObjectSetSourceDCP,
    isValidToRenderWalker,
    getSelectedTabFromPages,
    refreshDataProvider,
    getCurrentObjectSetViewMode,
    buildCommandContext,
    getRelationInfo,
    handleObjectSetSelectAll,
    handleObjectSetMultiSelect,
    refreshObjectSet,
    updateRedlineProps,
    handleHtmlPanelFocusChange,
    handleHtmlPanelSelectionChange,
    initDataProviderRef
};
