// Copyright (c) 2021 Siemens
import AwWalker from 'viewmodel/AwWalkerViewModel';
import editHandlerService from 'js/editHandlerService';
import AwStateService from 'js/awStateService';
import viewModelObjectService from 'js/viewModelObjectService';
import _ from 'lodash';
import Debug from 'debug';
import appCtxSvc from 'js/appCtxService';
import xrtUtilities from 'js/xrtUtilities';
import { getAdaptedObjectsSync } from 'js/adapterService';

const trace = new Debug( 'selection' );
const xrtSummaryContext = 'xrtSummaryContextObject';

export const awXrt2RenderFunction = ( { xrtData, xrtState, objectType,
    enableResizeCallback, type, subPanelContext, fields, elementRefList, activeState,
    xrtContext, objectsetInfo, vmo, viewModel, editContextKey } ) => {
    let dpRef = elementRefList.get( 'dpRef' );

    if( !xrtState ) {
        return null;
    }

    let prevSelectedTab = xrtState.selectedTab;
    let isValidToRender = xrtUtilities.isValidToRenderWalker( xrtData, type, prevSelectedTab );

    if( xrtState && xrtState.customContext ) {
        let xrtContextIn = xrtContext ? xrtContext : {};
        // Merge the xrtContext with custom context info present on xrtState.
        _.merge( xrtContextIn, xrtState.customContext );

        if( isValidToRender ) {
            if( viewModel.data._focusComponentId ) {
                return <AwWalker data={xrtData} xrtState={xrtState}
                    selectionData={fields.selectionData}
                    activeState={activeState} vmo={vmo}
                    type={type} objectType={objectType} dpRef={dpRef}
                    xrtContext={xrtContextIn} objectSetInfo={objectsetInfo}
                    subPanelContext={subPanelContext}
                    enableResizeCallback={enableResizeCallback}
                    focusComponent={viewModel.data._focusComponentId}
                    editContextKey={editContextKey}></AwWalker>;
            }
            return <AwWalker data={xrtData} xrtState={xrtState}
                selectionData={fields.selectionData}
                activeState={activeState} vmo={vmo}
                type={type} objectType={objectType} dpRef={dpRef}
                xrtContext={xrtContextIn} objectSetInfo={objectsetInfo}
                subPanelContext={subPanelContext}
                enableResizeCallback={enableResizeCallback}
                editContextKey={editContextKey}></AwWalker>;
        }
    }

    if( isValidToRender ) {
        if( viewModel.data._focusComponentId ) {
            return <AwWalker data={xrtData} xrtState={xrtState}
                selectionData={fields.selectionData}
                activeState={activeState} vmo={vmo}
                type={type} objectType={objectType} dpRef={dpRef}
                xrtContext={xrtContext} objectSetInfo={objectsetInfo}
                subPanelContext={subPanelContext}
                enableResizeCallback={enableResizeCallback}
                focusComponent={viewModel.data._focusComponentId}
                editContextKey={editContextKey}></AwWalker>;
        }
        return <AwWalker data={xrtData} xrtState={xrtState}
            selectionData={fields.selectionData}
            activeState={activeState} vmo={vmo}
            type={type} objectType={objectType} dpRef={dpRef}
            xrtContext={xrtContext} objectSetInfo={objectsetInfo}
            subPanelContext={subPanelContext}
            enableResizeCallback={enableResizeCallback}
            editContextKey={editContextKey}></AwWalker>;
    }

    return null;
};

export const handleTabSelectionChange = ( localSelectionData, previousSelectionData, ctxPselected, currentActivePageTitle, lastActivePageTitle, locationContext ) => {
    resetLocalSelectionData( localSelectionData );

    if( previousSelectionData.value.selected.length > 0 ) {
        if( previousSelectionData.value.selected.length > 0 && locationContext[ 'ActiveWorkspace:SubLocation' ] === 'showObject' && previousSelectionData.value.selected[ 0 ].uid !== ctxPselected
            .uid ) {
            // Handles the case for tab change in showObject location to update the selection back to the parent object
            previousSelectionData.update( {
                selectionModel: localSelectionData.selectionModel,
                selected: [ ctxPselected ],
                relationInfo: []
            } );
        } else {
            // Handles the case for when the SWA is switching tabs to update the SWA selection to none
            previousSelectionData.update( {
                selectionModel: localSelectionData.selectionModel,
                selected: [],
                relationInfo: []
            } );
        }
    }
    return { lastActivePageTitle: currentActivePageTitle };
};

export const handleSelectionChange = async( pageType, localSelectionData, parentSelectionData,
    currentActivePageTitle, dispatch, focusComponent ) => {
    if( pageType === 'SUMMARY' && !_.isEmpty( localSelectionData ) ) {
        let selectedObjects = localSelectionData.selected;

        // If underlying object set table is getting destroyed, localSelectionData._modelId will be undefined. In that case
        // selection will be cleared. It is a valid case and we should consider it as deselect
        const isDeselectionInActiveObjectSet = selectedObjects.length === 0 && ( focusComponent === localSelectionData._modelId || localSelectionData._modelId === undefined );
        if( selectedObjects.length > 0 || isDeselectionInActiveObjectSet ) {
            parentSelectionData && parentSelectionData.update( {
                selected: selectedObjects,
                relationInfo: localSelectionData.relationInfo
            } );

            dispatch( { path: 'data._focusComponentId', value: localSelectionData._modelId } );
        }

        trace( 'AwXRT2 selectionData: ', localSelectionData );
    }

    return { lastActivePageTitle: currentActivePageTitle };
};

export const handleFocusChange = async( pageType, parentFocusComponent, dispatch ) => {
    if( parentFocusComponent !== 'secondary' && pageType === 'SUMMARY' ) {
        dispatch( { path: 'data._focusComponentId', value: 'clear' } );
    }
};

export const checkEdit = ( pageType ) => {
    // Check if the page should enter edit mode
    const stateParams = AwStateService.instance.params;
    if( pageType === 'SUMMARY' && stateParams.edit ) {
        let eh = editHandlerService.getActiveEditHandler();
        if( eh && eh.canStartEdit() ) {
            eh.startEdit();
        }
    }
};

const _getDeepCopyDatas = function( xrtData ) {
    let deepCopyDatas = {};
    if( xrtData && xrtData.data && xrtData.data.deepCopyDatas ) {
        deepCopyDatas = _.get( xrtData, 'data.deepCopyDatas.dbValue' );
    }
    return deepCopyDatas;
};

const _updateRedLineMode = function( xrtData ) {
    let isRedLineMode = 'isRedLineMode';
    if( xrtData.data._ctx && xrtData.data._ctx.isRedLineMode ) {
        appCtxSvc.registerCtx( isRedLineMode, xrtData.data._ctx.isRedLineMode );
    } else {
        appCtxSvc.unRegisterCtx( isRedLineMode );
    }
};

const _getOperationNameAndOwningObjectUid = function( type, xrtData ) {
    let operationName = 'Edit';
    let owningObjUid;
    if( type.toUpperCase() === 'EDIT' ) {
        operationName = 'Edit';
    } else if( type.toUpperCase() === 'CREATE' ) {
        operationName = 'Create';
    } else if( type.toUpperCase() === 'REVISE' ) {
        owningObjUid = xrtData.data.owningObjUid;
        operationName = 'Revise';
    } else if( type.toUpperCase() === 'SAVEAS' ) {
        owningObjUid = xrtData.data.owningObjUid;
        operationName = 'SaveAs';
    }

    return {
        operationName,
        owningObjUid
    };
};

const _getPageContext = ( subPanelContext ) => {
    let pageContext = {
        primaryActiveTabId: null,
        secondaryActiveTabId: null
    };

    if( subPanelContext ) {
        let primaryActiveTabId = subPanelContext.pageContext ? subPanelContext.pageContext.primaryActiveTabId : null;
        let secondaryActiveTabId = subPanelContext.pageContext ? subPanelContext.pageContext.secondaryActiveTabId : null;

        if( !primaryActiveTabId && !secondaryActiveTabId ) {
            primaryActiveTabId = subPanelContext.context && subPanelContext.context.pageContext ? subPanelContext.context.pageContext.primaryActiveTabId : null;
            secondaryActiveTabId = subPanelContext.context && subPanelContext.context.pageContext ? subPanelContext.context.pageContext.secondaryActiveTabId : null;
        }
        pageContext.primaryActiveTabId = primaryActiveTabId;
        pageContext.secondaryActiveTabId = secondaryActiveTabId;
    }

    return pageContext;
};

export const initialize = ( elementRefList, xrtState, xrtData, vmo, type, objectType, subPanelContext ) => {
    if( xrtState ) {
        let vmoIn;
        let dpRef;
        let deepCopyDatas;
        let owningObjUid;
        let copyOptions;

        if( xrtData ) {
            let operationName = 'Edit';
            deepCopyDatas = _getDeepCopyDatas( xrtData );
            let uid = vmo ? vmo.uid : Object.keys( xrtData.data.objects )[ 0 ];

            if ( type ) {
                let response = _getOperationNameAndOwningObjectUid( type, xrtData );
                operationName = response.operationName;
                owningObjUid = response.owningObjUid;
            }

            if( xrtData.data.objects[ uid ] ) {
                vmoIn = {};
                vmoIn.operationName = operationName;
                vmoIn = viewModelObjectService.createViewModelObject( uid, operationName, owningObjUid, xrtData.data.objects[ uid ][ 0 ] );
            }

            if( !vmoIn ) {
                let adaptedVmo = {};
                let adaptedObjArr = getAdaptedObjectsSync( [ vmo ] );
                if( adaptedObjArr && adaptedObjArr.length > 0 ) {
                    adaptedVmo = adaptedObjArr[0];
                    if( adaptedVmo && adaptedVmo.uid && xrtData.data.objects[ adaptedVmo.uid ] ) {
                        vmoIn = {};
                        vmoIn.operationName = operationName;
                        vmoIn = viewModelObjectService.createViewModelObject( adaptedVmo.uid, operationName, null, xrtData.data.objects[ adaptedVmo.uid ][ 0 ] );
                    }
                }
            }

            if( type === 'SAVEAS' && xrtData.data && xrtData.data.copyOptions ) {
                copyOptions = xrtData.data.copyOptions;
            }
            _updateRedLineMode( xrtData );
        }

        if( elementRefList ) {
            dpRef = elementRefList.get( 'dpRef' );
        }

        if( vmoIn && type === 'SUMMARY' ) {
            appCtxSvc.registerCtx( xrtSummaryContext, vmoIn );
        }

        let newXrtState = { ...xrtState.getValue() };
        if( vmoIn ) {
            newXrtState.xrtVMO = vmoIn;
        }

        if( copyOptions && copyOptions.length > 0 ) {
            newXrtState.copyOptions = copyOptions;
        }

        let selectedTab = xrtUtilities.getSelectedTabFromPages( xrtData );

        newXrtState.xrtTypeLoaded = { type: objectType };
        newXrtState.deepCopyDatas = deepCopyDatas;
        newXrtState.dpRef = dpRef;
        newXrtState.selectedTab = selectedTab;
        newXrtState.pageContext = _getPageContext( subPanelContext );

        xrtState.update( newXrtState );
    }
};

export const cleanUp = ( localSelectionData, type ) => {
    resetLocalSelectionData( localSelectionData );
    if( type === 'SUMMARY' ) {
        appCtxSvc.unRegisterCtx( xrtSummaryContext );
    }
};

export const resetLocalSelectionData = ( localSelectionData ) => {
    if( localSelectionData && localSelectionData.selected && localSelectionData.selected.length > 0 ) {
        localSelectionData.selected = [];
        localSelectionData.source = null;
    }
    return localSelectionData;
};

export const refreshData = ( xrtState, response, vmo ) => {
    if( vmo && xrtState && xrtState.getValue() && xrtState.getValue().xrtVMO ) {
        let objs = response.updatedObjects;
        if( !objs ) {
            objs = response.modifiedObjects;
        }
        let existingVMO = xrtState.getValue().xrtVMO;
        let operationName = existingVMO.operationName;
        let newVmo;
        let origVMO = {};

        _.forEach( objs, function( object ) {
            if( object && object.uid === existingVMO.uid ) {
                origVMO[ existingVMO.uid ] = existingVMO;
                newVmo = viewModelObjectService.createViewModelObject( object.uid, operationName );
                viewModelObjectService.updateSourceObjectPropertiesByViewModelObject( newVmo, origVMO );
            }
        } );

        if( origVMO[ existingVMO.uid ] ) {
            let newXrtState = { ...xrtState.getValue() };
            newXrtState.xrtVMO = origVMO[ existingVMO.uid ];
            xrtState.update( newXrtState );
        }
    }
};
