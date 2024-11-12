// Copyright (c) 2021 Siemens

import _ from 'lodash';

import abstractTablePropertyService from 'js/abstractTablePropertyService';
import appCtxSvc from 'js/appCtxService';
import eventBus from 'js/eventBus';

import { createComponent } from 'js/declViewModelService';
import { DerivedStateResult } from 'js/derivedContextService';

import AwSplmTable from 'viewmodel/AwSplmTableViewModel';
import AwServerVisibilityToolbar from 'viewmodel/AwServerVisibilityToolbarViewModel';

export const createNameValuePropertyComponent = function( vmDef, props ) {
    return [ new DerivedStateResult( {
        ctxParameters: [],
        additionalParameters: [ props.nameValuePropertyData, props.columns, props.firstPageUids, props.objects, props.editContextKey, props.operationName ],
        compute: ( renderContext, nameValuePropertyData, columns, firstPageUids, objects, editContextKey, operationName ) => {
            const uniqueName = nameValuePropertyData.id;
            const objectSetSource = nameValuePropertyData.propertyName;
            const parentUid = nameValuePropertyData.parentUid;
            const editContextKeyIn = editContextKey ? editContextKey : 'NONE';

            let sortCriteria = {
                fieldName: '',
                sortDirection: ''
            };
            if( props && props.nameValuePropertyData ) {
                abstractTablePropertyService.getSortCriteriaForTablePropOrNameValue( props.nameValuePropertyData, sortCriteria );
            }

            const viewModel = abstractTablePropertyService.createDynamicTablePropertyViewModel( uniqueName, objectSetSource, parentUid, columns, firstPageUids, objects, editContextKeyIn,
                props.selectionData, operationName, sortCriteria );
            // setup initialize, and cleanup actions
            viewModel.actions.initialize = {
                actionType: 'JSFunction',
                method: 'awNameValuePropertyOnMountFunction',
                inputData: {
                    viewModel: '{{data}}',
                    nameValuePropertyData: '{{props.nameValuePropertyData}}',
                    dpRef: '{{props.dpRef}}',
                    selectionData: '{{props.selectionData}}'
                },
                outputData: {
                    gridId: 'gridId',
                    objects: 'objects',
                    providerName: 'providerName',
                    tableHeight: 'tableHeight',
                    tableWidth: 'tableWidth',
                    _propertyData: '_propertyData',
                    _propertyType: '_propertyType',
                    subDefs: 'subDefs'
                },
                deps: 'js/AwNameValuePropertyService'
            };

            viewModel.actions.cleanup = {
                actionType: 'JSFunction',
                method: 'awNameValuePropertyOnUnmountFunction',
                inputData: {
                    viewModel: '{{data}}',
                    dpRef: '{{props.dpRef}}'
                },
                outputData: {},
                deps: 'js/AwNameValuePropertyService'
            };

            viewModel.lifecycleHooks = {
                onMount: 'initialize',
                onUnmount: 'cleanup'
            };

            const Component = createComponent( viewModel, ( props ) => {
                const { nameValuePropertyData, viewModel, gridContextPlaceholder, gridContextDispatcher } = props;
                const isHeadless = nameValuePropertyData.renderingStyle === 'headless';
                const displayName = _.get( viewModel.data, '_propertyData.displayName', nameValuePropertyData.name );
                const createCommandEnabled = _.get( viewModel.data, '_propertyData.createCommandEnabled', false );
                const removeCommandEnabled = _.get( viewModel.data, '_propertyData.removeCommandEnabled', false );
                const providerName = nameValuePropertyData.id + '_Provider';

                const commandContext = {
                    viewModel: viewModel,
                    nameValuePropertyName: nameValuePropertyData.propertyName,
                    createCommandEnabled: createCommandEnabled,
                    removeCommandEnabled: removeCommandEnabled,
                    isBulkEditing: gridContextPlaceholder.isBulkEditing
                };

                const header = <div className='aw-widgets-nameValueLabel'>{displayName}:</div>;

                const style = {
                    width: viewModel.data.tableWidth
                };
                if( viewModel.data.tableHeight ) {
                    style.maxHeight = viewModel.data.tableHeight;
                }

                return (
                    <div className='sw-component aw-xrt-tablePropContent aw-xrt-tablePropertyContainer'>
                        <div className='aw-layout-flexRow aw-layout-justifyFlexEnd'>
                            {!isHeadless ? header : ''}
                            <div className='aw-xrt-tablePropCommandPanel aw-xrt-objectSetToolbar'>
                                <div className='aw-xrt-objectSetCommandPanel'>
                                    <AwServerVisibilityToolbar firstAnchor='aw_nameValueProperty' secondAnchor='aw_nameValuePropertyRight' orientation='HORIZONTAL' context={commandContext} overflow={false}></AwServerVisibilityToolbar>
                                </div>
                            </div>
                        </div>
                        <div className='aw-layout-flexColumn aw-base-scrollPanel' style={style}>
                            <AwSplmTable { ...viewModel.grids[ providerName ] } gridContextPlaceholder={gridContextPlaceholder} gridContextDispatcher={gridContextDispatcher} ></AwSplmTable>
                        </div>
                    </div>
                );
            } );
            Component.displayName = 'AwDynamicNameValueProperty';
            return Component;
        }
    } ) ];
};

/**
 * Closes the Name Value Create Panel
 * @param {Object} viewModel - the view model
 */
const closePanel = function( viewModel ) {
    var eventData = {
        source: 'toolAndInfoPanel'
    };
    eventBus.publish( 'complete', eventData );
    viewModel._isPanelOpen = false;
};

/**
 * Manage the closing of name value create panel on appropriate conditions
 *
 * @param {Object} eventData published along with the event
 * @param {Object} viewModel - the view model
 */
const managePanel = function( eventData, viewModel ) {
    if( viewModel._isPanelOpen && eventData && eventData.name === 'editInProgress' ) {
        closePanel( viewModel );
    }

    if( eventData && eventData.name === 'activeToolsAndInfoCommand' && eventData.value &&
        eventData.value.commandId === 'Awp0NameValueCreate' ) {
        viewModel._isPanelOpen = true;
    }
};

const initSubscriptions = function( viewModel ) {
    let subDefs = viewModel.data.subDefs || [];
    subDefs.push( eventBus.subscribe( 'saveEdits', closePanel ) );
    subDefs.push( eventBus.subscribe( 'appCtx.register', function( eventData ) {
        managePanel( eventData, viewModel );
    } ) );
    subDefs.push( eventBus.subscribe( 'appCtx.update', function( eventData ) {
        managePanel( eventData, viewModel );
    } ) );
    viewModel.data.subDefs = subDefs;
};

const initContext = function( viewModel ) {
    const propData = abstractTablePropertyService.getPropertyData( viewModel );
    propData.setDisplayValuesUpdated = true;
    const fnd0LOVContextPropName = propData.propertyName;
    const fnd0LOVContextObjectUid = propData.parentUid;
    const additionalProps = {
        fnd0LOVContextPropName: fnd0LOVContextPropName,
        fnd0LOVContextObject: fnd0LOVContextObjectUid
    };
    appCtxSvc.registerCtx( 'InitialLovDataAdditionalProps', additionalProps );

    initSubscriptions( viewModel );
};

/**
 * On Mount function forname value property
 * @param {Object} viewModel The view model
 * @param {Object} nameValuePropertyData NameValue property Specific data
 * @param {Object} dpRef the XRT Ref
 * @param {Object} selectionData selection data
 * @returns {Object} returns the view model data to be updated in outputdata
 */
export const awNameValuePropertyOnMountFunction = function( viewModel, nameValuePropertyData, dpRef, selectionData ) {
    abstractTablePropertyService.setPropertyData( viewModel, nameValuePropertyData, 'NameValue' );
    abstractTablePropertyService.init( viewModel, selectionData, initContext );
    abstractTablePropertyService.processInitialDataProvider( viewModel, dpRef );
    return viewModel.data;
};

export const awNameValuePropertyOnUnmountFunction = function( viewModel, dpRef ) {
    abstractTablePropertyService.cleanup( viewModel, dpRef );
    appCtxSvc.unRegisterCtx( 'InitialLovDataAdditionalProps' );
};

/**
 * Name Value property render function
 * @param {Object} props The props
 * @returns {JSXElement} The name value element
 */
export const awNameValuePropertyRenderFunction = function( props ) {
    const { nameValuePropertyData, selectionData, editContextKey, dpRef, ctxMin: { dynamicTable } } = props;
    const AwDynamicNameValueProperty = dynamicTable[ 0 ];
    return <AwDynamicNameValueProperty nameValuePropertyData={nameValuePropertyData} selectionData={selectionData} editContextKey={editContextKey} dpRef={dpRef}></AwDynamicNameValueProperty>;
};

export default {
    createNameValuePropertyComponent,
    awNameValuePropertyOnMountFunction,
    awNameValuePropertyOnUnmountFunction,
    awNameValuePropertyRenderFunction
};
