// Copyright (c) 2021 Siemens
import _ from 'lodash';
import AwObjectSetList from 'viewmodel/AwObjectSetListViewModel';
import AwObjectSetTable from 'viewmodel/AwObjectSetTableViewModel';
import AwReusableObjectSetTable from 'viewmodel/AwWalkerObjectSetReusableTableViewModel';
import { AwServerVisibilityToolbar } from 'js/AwServerVisibilityCommandBarService';
import xrtObjectSetSvc from 'js/xrtObjectSetService';
import eventBus from 'js/eventBus';
import browserUtils from 'js/browserUtils';
import { addPlacements } from 'js/commandConfigurationService';
import xrtUtilities from 'js/xrtUtilities';
import adapterService from 'js/adapterService';
import viewModelObjectService from 'js/viewModelObjectService';
import { isViewModelTreeNode } from 'js/awTableService';
import Debug from 'debug';

const trace = new Debug( 'selection' );
const _displayModesMap = {
    List: 'listDisplay',
    Table: 'tableDisplay',
    Compare: 'compareDisplay',
    Images: 'thumbnailDisplay'
};
let xrtCommandAliasMap = {
    'com.teamcenter.rac.common.AddNew': 'Awp0ShowAddObject',
    'com.teamcenter.rac.common.AddReference': 'Awp0ShowAddObject',
    'com.teamcenter.rac.viewer.pastewithContext': 'Awp0Paste'
};

const _getCurrentDisplayMode = ( objsetdata, activeDisplay ) => {
    let objectSetViewMode = xrtUtilities.getCurrentObjectSetViewMode( objsetdata );
    let activeDisplayValue = _populateActiveDisplay( objsetdata, objectSetViewMode );

    if( activeDisplay ) {
        activeDisplayValue = activeDisplay.value;
    }

    return activeDisplayValue;
};

// eslint-disable-next-line complexity
export const awObjectSetRenderFunction = ( {
    titlekey,
    displaytitle,
    viewModel,
    subPanelContext,
    firstPageUids,
    vmo,
    objsetdata,
    columns,
    objSetUri,
    fields,
    dpRef,
    operationType,
    xrtContext,
    objectSetInfo,
    editContextKey,
    isRefreshAllObjectSets,
    reload,
    selectionModel,
    totalFound,
    gridInfo,
    enablePropEdit,
    parentUid
} ) => {
    if( !objsetdata  ) {
        return;
    }

    const { data } = viewModel;
    const currentDisplayVal = _getCurrentDisplayMode( objsetdata );

    let objectSetHeightAndWidthVal = {};
    let totalLoaded = firstPageUids ? firstPageUids.length : 0;
    if ( fields.objectSetState.totalLoaded !== null && fields.objectSetState.totalLoaded !== undefined ) {
        totalLoaded = fields.objectSetState.totalLoaded;
    }
    const isObjectSetSourceDCP = xrtUtilities.isObjectSetSourceDCP( objsetdata.source );
    const editContextKeyIn = editContextKey ? editContextKey : 'NONE';
    const selectionModelIn = selectionModel ? selectionModel : viewModel.selectionModels.objectSetSelectionModel;

    _setObjectSetHeightAndWidthInternal( { value: currentDisplayVal }, objsetdata, columns, totalLoaded, objectSetHeightAndWidthVal );

    if( data && data.context ) {
        // while changing display mode, reload the data from server
        if( data.context.currentDisplay !== fields.displayModeState.getValue().activeDisplay ) {
            data.reload = true;
        }

        if( data.context.currentDisplay !== fields.displayModeState.getValue().activeDisplay ||
            data.context.vmo.uid !== vmo.uid ||
            data.context.objectSetState !== fields.objectSetState || data.context.objectSetSource !== objsetdata.source ||
            data.context.selectionModel !== selectionModelIn ) {
            data.context = xrtUtilities.buildCommandContext( objsetdata, fields.displayModeState, fields.objectSetState, currentDisplayVal,
                selectionModelIn, { titlekey, displaytitle, columns, vmo, subPanelContext, operationType,
                    dpRef, objSetUri, xrtContext, parentUid } );
        }
    }

    let enableReusableTable = false;
    if( gridInfo && gridInfo.enableReusableTable ) {
        enableReusableTable = true;
    }


    const reloadIn = data.reload ? data.reload : reload;

    // eslint-disable-next-line consistent-return
    return <div className='aw-walker-objectset'>
        { data.placementTracker ? <div className='aw-xrt-objectSetToolbar'>
            {/* To fully support server visibility in object sets this should pass local object set selection info */}
            <AwServerVisibilityToolbar key={JSON.stringify( data.placementTracker.placements )} firstAnchor='aw_objectSet' secondAnchor={objsetdata.id + ',aw_objectSet_right'}
                reverseSecond orientation='HORIZONTAL' context={data.context}></AwServerVisibilityToolbar>
        </div> : null }
        <div className='aw-xrt-objectSetContent aw-layout-flexColumn aw-base-scrollPanel' style={objectSetHeightAndWidthVal}>
            {currentDisplayVal === 'listDisplay' ? <AwObjectSetList
                selectionModel={selectionModelIn}
                firstPageUids={firstPageUids}
                selectionData={fields.selectionData}
                vmo={vmo}
                objectSetData={objsetdata}
                operationType={operationType}
                showCheckbox={fields.objectSetState.value.showCheckBox}
                selectAll={fields.objectSetState.value.selectAll}
                isObjectSetSourceDCP={isObjectSetSourceDCP}
                objectSetInfo={objectSetInfo}
                xrtContext={xrtContext}
                reload={reloadIn}
                isRefreshAllObjectSets={isRefreshAllObjectSets}
                objectSetState={fields.objectSetState}
                totalFound={totalFound}
                parentUid={parentUid}/> : ''}
            {currentDisplayVal === 'thumbnailDisplay' ? <AwObjectSetList
                selectionModel={selectionModelIn}
                firstPageUids={firstPageUids}
                selectionData={fields.selectionData}
                vmo={vmo}
                objectSetData={objsetdata}
                operationType={operationType}
                showCheckbox={fields.objectSetState.value.showCheckBox}
                selectAll={fields.objectSetState.value.selectAll}
                isObjectSetSourceDCP={isObjectSetSourceDCP}
                objectSetInfo={objectSetInfo}
                isImage={true}
                xrtContext={xrtContext}
                reload={reloadIn}
                isRefreshAllObjectSets={isRefreshAllObjectSets}
                objectSetState={fields.objectSetState}
                totalFound={totalFound}
                parentUid={parentUid}/> : ''}
            {currentDisplayVal === 'tableDisplay' && enableReusableTable ? <AwReusableObjectSetTable
                selectionModel={selectionModelIn}
                firstPageUids={firstPageUids}
                selectionData={fields.selectionData}
                vmo={vmo}
                objectSetData={objsetdata}
                operationType={operationType}
                showCheckBox={fields.objectSetState.value.showCheckBox}
                selectAll={fields.objectSetState.value.selectAll}
                objectSetUri={objSetUri}
                columns={columns}
                objectSetInfo={objectSetInfo}
                dpRef={dpRef}
                xrtContext={xrtContext}
                reload={reloadIn}
                editContextKey={editContextKeyIn}
                isRefreshAllObjectSets={isRefreshAllObjectSets}
                objectSetState={fields.objectSetState}
                totalFound={totalFound}
                gridInfo={gridInfo}
                enablePropEdit={enablePropEdit}
                parentUid={parentUid}/> : ''}
            {currentDisplayVal === 'tableDisplay' && !enableReusableTable ? <AwObjectSetTable
                selectionModel={selectionModelIn}
                firstPageUids={firstPageUids}
                selectionData={fields.selectionData}
                vmo={vmo}
                objectSetData={objsetdata}
                operationType={operationType}
                showCheckBox={fields.objectSetState.value.showCheckBox}
                selectAll={fields.objectSetState.value.selectAll}
                objectSetUri={objSetUri}
                columns={columns}
                objectSetInfo={objectSetInfo}
                dpRef={dpRef}
                xrtContext={xrtContext}
                reload={reloadIn}
                editContextKey={editContextKeyIn}
                isRefreshAllObjectSets={isRefreshAllObjectSets}
                objectSetState={fields.objectSetState}
                totalFound={totalFound}
                gridInfo={gridInfo}
                enablePropEdit={enablePropEdit}
                parentUid={parentUid}/> : ''}
            { currentDisplayVal === 'compareDisplay' && enableReusableTable ? <AwReusableObjectSetTable
                selectionModel={selectionModelIn}
                firstPageUids={firstPageUids}
                selectionData={fields.selectionData}
                vmo={vmo}
                objectSetData={objsetdata}
                operationType={operationType}
                showCheckBox={fields.objectSetState.value.showCheckBox}
                objectSetUri={objSetUri}
                columns={columns}
                objectSetInfo={objectSetInfo}
                dpRef={dpRef}
                isCompareTable={true}
                xrtContext={xrtContext}
                reload={reloadIn}
                editContextKey={editContextKeyIn}
                isRefreshAllObjectSets={isRefreshAllObjectSets}
                objectSetState={fields.objectSetState}
                totalFound={totalFound}
                gridInfo={gridInfo}
                enablePropEdit={enablePropEdit}
                parentUid={parentUid}/> : '' }
            { currentDisplayVal === 'compareDisplay' && !enableReusableTable ? <AwObjectSetTable
                selectionModel={selectionModelIn}
                firstPageUids={firstPageUids}
                selectionData={fields.selectionData}
                vmo={vmo}
                objectSetData={objsetdata}
                operationType={operationType}
                showCheckBox={fields.objectSetState.value.showCheckBox}
                objectSetUri={objSetUri}
                columns={columns}
                objectSetInfo={objectSetInfo}
                dpRef={dpRef}
                isCompareTable={true}
                xrtContext={xrtContext}
                reload={reloadIn}
                editContextKey={editContextKeyIn}
                isRefreshAllObjectSets={isRefreshAllObjectSets}
                objectSetState={fields.objectSetState}
                totalFound={totalFound}
                gridInfo={gridInfo}
                enablePropEdit={enablePropEdit}
                parentUid={parentUid}/> : '' }
        </div>
    </div>;
};

export const initialize = ( objsetdata, displayModeState, objectSetState, selectionModel, placementTrackerIn,
    { titlekey, displaytitle, columns, vmo, subPanelContext, operationType, dpRef, objSetUri, xrtContext, parentUid }  ) => {
    let showDropArea = true;
    let currentDisplay = null;
    let newDisplayModeState = { ...displayModeState.getValue() };
    if( objsetdata ) {
        /**
         * Add compare display mode to displayModes because compare is a client side option and
         * not coming from XRT.
         */
        objsetdata.displayModes[ _displayModesMap.Compare ] = objsetdata.displayModes[ _displayModesMap.Table ];
        showDropArea = !( objsetdata.showDropArea && objsetdata.showDropArea === 'false' );

        currentDisplay = _getCurrentDisplayMode( objsetdata );

        newDisplayModeState.activeDisplay = currentDisplay;
    }
    // Generate placements specific to the current object set.
    const dynamicPlacements = objsetdata.commands.map( function( command, idx ) {
        return {
            id: xrtCommandAliasMap[ command.commandId ] || command.commandId,
            priority: idx * 10,
            uiAnchor: objsetdata.id
        };
    } );

    if( placementTrackerIn ) {
        placementTrackerIn.remove();
    }
    const placementTracker = addPlacements( dynamicPlacements );

    const context = xrtUtilities.buildCommandContext(  objsetdata, displayModeState, objectSetState, currentDisplay, selectionModel, { titlekey, displaytitle, columns,
        vmo, subPanelContext, operationType, dpRef, objSetUri, xrtContext, parentUid } );

    return {
        displayModeState: newDisplayModeState,
        showDropArea,
        placementTracker,
        context
    };
};

export const cleanup = ( placementTracker ) => {
    if( placementTracker ) {
        placementTracker.remove();
    }
};

const _populateActiveDisplay = ( objsetdata, objectSetViewMode ) => {
    let activeDisplay = _displayModesMap.List;
    if( objectSetViewMode && objsetdata.displayModes[ objectSetViewMode ] ) {
        activeDisplay = objectSetViewMode;
    } else if( objsetdata.defaultDisplay ) {
        activeDisplay = objsetdata.defaultDisplay;
    }
    return activeDisplay;
};

/**
 * Set Objectset height and width
 */
const _setObjectSetHeightAndWidthInternal = ( activeDisplay, objsetdata, columns, totalLoaded, objectSetHeightAndWidthVal ) => {
    // LCS-138303 - Performance tuning for 14 Objectset Table case - implementation
    // - Move height calcluation logic to separate function without timeout.
    // - Add logic for stop event publish when height is not changed.
    // - We can tune it later by deprecate _setObjectSetHeightAndWidth - don't see any
    //   reason we need a $timout here from all callers in this file
    var newHeight = xrtObjectSetSvc.calculateObjectsetHeight( activeDisplay, objsetdata, columns, totalLoaded );
    var gridid = objsetdata.id + '_Provider';
    if( activeDisplay.value === 'compareDisplay' ) {
        gridid += '_compare';
    }

    // For the initial rendering of the table, the publish is happening before the event is subscribed itself. so we need a time out here.
    setTimeout( () => {
        eventBus.publish( gridid + '.plTable.containerHeightUpdated', newHeight - 5 );
    }, 300 );
    objectSetHeightAndWidthVal.maxHeight = newHeight + 'px';
    objectSetHeightAndWidthVal.width = browserUtils.isIE ? 'calc(100% - 10px)' : '100%';
};

export const handleFocusChange = ( localSelectionData, focusComponent, selectionModel ) => {
    if( focusComponent && localSelectionData._modelId
        && localSelectionData._modelId !== focusComponent && selectionModel
        && selectionModel.getSelection().length > 0 ) {
        selectionModel.selectNone();
    }

    if( focusComponent === 'clear' && selectionModel.getSelection().length > 0 ) {
        selectionModel.selectNone();
    }
};

export const handleSelectionChange = ( localSelectionData, parentSelectionData, selectionModel ) => {
    if( !_.isEmpty( localSelectionData ) ) {
        let baseSelection;
        let relationContext;
        relationContext = xrtUtilities.getRelationInfo( localSelectionData, baseSelection );
        var adaptedObjsPromise = adapterService.getAdaptedObjects( localSelectionData.selected );
        adaptedObjsPromise.then( function( adaptedObjs ) {
            var selectedObjects = [];
            _.forEach( adaptedObjs, function( adaptedObject ) {
                if( adaptedObject ) {
                    if( viewModelObjectService.isViewModelObject( adaptedObject ) ) {
                        selectedObjects.push( adaptedObject );
                    } else if( isViewModelTreeNode( adaptedObject ) ) {
                        selectedObjects.push( adaptedObject );
                    } else {
                        selectedObjects.push( viewModelObjectService
                            .constructViewModelObjectFromModelObject( adaptedObject, 'EDIT' ) );
                    }
                }
            } );

            parentSelectionData && parentSelectionData.update( {
                selected: selectedObjects,
                relationInfo: relationContext,
                _modelId: localSelectionData._modelId,
                id: localSelectionData.id
            } );

            trace( 'AwXRT2 selectionData: ', localSelectionData );
        } );
    }
};

export const handleActiveComponentChange = ( localSelectionData,  isSublocationActive, parentSelectionModel, localPWASelectionModel ) => {
    if( !_.isEmpty( localSelectionData ) ) {
        const inUseSelectionModel = parentSelectionModel ? parentSelectionModel : localPWASelectionModel;
        if ( !isSublocationActive ) {
            if ( localSelectionData.selected.length > 0  && inUseSelectionModel.isSelectionModelActivated() ) {
                inUseSelectionModel.setSelectionModelActivated( false );
            }
        } else{
            if ( localSelectionData.selected.length > 0 && !inUseSelectionModel.isSelectionModelActivated() ) {
                inUseSelectionModel.setSelectionModelActivated( true );
            }
        }
    }
};

export default {
    awObjectSetRenderFunction,
    initialize,
    cleanup,
    handleFocusChange,
    handleSelectionChange,
    handleActiveComponentChange
};
