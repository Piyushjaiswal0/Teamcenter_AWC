// Copyright (c) 2021 Siemens

import _ from 'lodash';

import abstractTablePropertyService from 'js/abstractTablePropertyService';

import { createComponent } from 'js/declViewModelService';
import { DerivedStateResult } from 'js/derivedContextService';

import AwSplmTable from 'viewmodel/AwSplmTableViewModel';
import AwServerVisibilityToolbar from 'viewmodel/AwServerVisibilityToolbarViewModel';

export const createTablePropertyComponent = function( vmDef, props ) {
    return [ new DerivedStateResult( {
        ctxParameters: [],
        additionalParameters: [ props.tablePropertyData, props.columns, props.firstPageUids, props.objects, props.editContextKey, props.operationName ],
        compute: ( renderContext, tablePropertyData, columns, firstPageUids, objects, editContextKey, operationName ) => {
            const uniqueName = tablePropertyData.id;
            const objectSetSource = tablePropertyData.propertyName;
            const parentUid = tablePropertyData.parentUid;
            const editContextKeyIn = editContextKey ? editContextKey : 'NONE';

            let sortCriteria = {
                fieldName: '',
                sortDirection: ''
            };
            if( props && props.tablePropertyData ) {
                abstractTablePropertyService.getSortCriteriaForTablePropOrNameValue( props.tablePropertyData, sortCriteria );
            }

            const viewModel = abstractTablePropertyService.createDynamicTablePropertyViewModel( uniqueName, objectSetSource, parentUid, columns, firstPageUids, objects, editContextKeyIn,
                props.selectionData, operationName, sortCriteria );
            // setup initialize, and cleanup actions
            viewModel.actions.initialize = {
                actionType: 'JSFunction',
                method: 'awTablePropertyOnMountFunction',
                inputData: {
                    viewModel: '{{data}}',
                    tablePropertyData: '{{props.tablePropertyData}}',
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
                deps: 'js/AwTablePropertyService'
            };

            viewModel.actions.cleanup = {
                actionType: 'JSFunction',
                method: 'awTablePropertyOnUnmountFunction',
                inputData: {
                    viewModel: '{{data}}',
                    dpRef: '{{props.dpRef}}'
                },
                outputData: {},
                deps: 'js/AwTablePropertyService'
            };

            viewModel.lifecycleHooks = {
                onMount: 'initialize',
                onUnmount: 'cleanup'
            };

            const Component = createComponent( viewModel, ( props ) => {
                const { tablePropertyData, viewModel, gridContextPlaceholder, gridContextDispatcher } = props;
                const isHeadless = tablePropertyData.renderingStyle === 'headless';
                const displayName = _.get( viewModel.data, '_propertyData.displayName', tablePropertyData.name );
                const createCommandEnabled = _.get( viewModel.data, '_propertyData.createCommandEnabled', false );
                const removeCommandEnabled = _.get( viewModel.data, '_propertyData.removeCommandEnabled', false );
                const providerName = tablePropertyData.id + '_Provider';

                const commandContext = {
                    viewModel: viewModel,
                    tablePropertyName: tablePropertyData.propertyName,
                    createCommandEnabled: createCommandEnabled,
                    removeCommandEnabled: removeCommandEnabled,
                    isBulkEditing: gridContextPlaceholder.isBulkEditing
                };

                const style = {
                    width: viewModel.data.tableWidth
                };
                if( viewModel.data.tableHeight ) {
                    style.maxHeight = viewModel.data.tableHeight;
                }

                const header = <div className='aw-widgets-tablePropertyLabel'>{displayName}:</div>;

                return (
                    <div className='sw-component aw-xrt-tablePropContent aw-xrt-tablePropertyContainer'>
                        <div className='aw-layout-flexRow aw-layout-justifyFlexEnd'>
                            {!isHeadless ? header : ''}
                            <div className='aw-xrt-tablePropCommandPanel aw-xrt-objectSetToolbar'>
                                <div className='aw-xrt-objectSetCommandPanel'>
                                    <AwServerVisibilityToolbar firstAnchor='aw_tableProperty' secondAnchor='aw_tablePropertyRight' orientation='HORIZONTAL' context={commandContext} overflow={false}></AwServerVisibilityToolbar>
                                </div>
                            </div>
                        </div>
                        <div className='aw-layout-flexColumn aw-base-scrollPanel' style={style}>
                            <AwSplmTable { ...viewModel.grids[ providerName ] } gridContextPlaceholder={gridContextPlaceholder} gridContextDispatcher={gridContextDispatcher} ></AwSplmTable>
                        </div>
                    </div>
                );
            } );
            Component.displayName = 'AwDynamicTableProperty';
            return Component;
        }
    } ) ];
};

/**
 * On Mount function for table property
 * @param {Object} viewModel The view model
 * @param {Object} tablePropData Table property Specific data
 * @param {Object} dpRef the xrt ref
 * @param {Object} selectionData selection data
 * @returns {Object} returns the view model data to be updated in outputdata
 */
export const awTablePropertyOnMountFunction = function( viewModel, tablePropData, dpRef, selectionData ) {
    abstractTablePropertyService.setPropertyData( viewModel, tablePropData, 'TableProperty' );
    abstractTablePropertyService.setTablePropertyInitialRowDataInput( viewModel );
    abstractTablePropertyService.init( viewModel, selectionData, null );
    abstractTablePropertyService.processInitialDataProvider( viewModel, dpRef );
    return viewModel.data;
};

export const awTablePropertyOnUnmountFunction = function( viewModel, dpRef ) {
    abstractTablePropertyService.cleanup( viewModel, dpRef );
};

/**
 * Table property render function
 * @param {Object} props The props
 * @returns {JSXElement} The table property element
 */
export const awTablePropertyRenderFunction = function( props ) {
    const { tablePropertyData, selectionData, editContextKey, dpRef, ctxMin: { dynamicTable } } = props;
    const AwDynamicTableProperty = dynamicTable[ 0 ];
    return <AwDynamicTableProperty tablePropertyData={tablePropertyData} selectionData={selectionData} editContextKey={editContextKey} dpRef={dpRef}></AwDynamicTableProperty>;
};

export default {
    awTablePropertyOnMountFunction,
    awTablePropertyOnUnmountFunction,
    awTablePropertyRenderFunction,
    createTablePropertyComponent
};
