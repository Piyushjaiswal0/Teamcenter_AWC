import AwSplmTable from 'viewmodel/AwSplmTableViewModel';
import AwCompare2 from 'viewmodel/AwCompare2ViewModel';
import columnArrangeService from 'js/columnArrangeService';
import { initDataProviderRef } from 'js/xrtUtilities';

var exports = {};

export const awWalkerObjectSetReusableTableRenderFunction = ( props ) => {
    const { viewModel, showCheckBox, selectionModel, selectionData, fields, isCompareTable, containerHeight } = props;
    const gridId = 'ObjectSet_1_Provider';
    if( isCompareTable ) {
        return <AwCompare2 {...viewModel.grids[gridId]} reusable='true'></AwCompare2>;
    }
    let gridInfo = props.gridInfo || {};
    return <AwSplmTable {...viewModel.grids[gridId]} reusable='true' showContextMenu={true} showCheckBox={showCheckBox} selectionData={selectionData} selectionModel={selectionModel} commandContext={{ arrangeData: fields.arrangeData }}
        containerHeight={containerHeight} tableContext={{ columnsData: fields.columnsData, showCheckBox: fields.showCheckBox, isBulkEditing: fields.isBulkEditing,
            startEdit: fields.startEdit, cancelEdit: fields.cancelEdit, saveEdit: fields.saveEdit, selectRows: fields.selectRows }} enableArrangeMenu={gridInfo.enableArrangeMenu === true}> </AwSplmTable>;
};

export let loadColumns = function( props ) {
    let columnConfig = {
        columns: []
    };
    let columnInfos = [];
    if( props ) {
        let gridInfo = props.gridInfo || {};
        if ( props.columns ) {
            props.columns.forEach( ( column ) => {
                column.enableColumnHiding = gridInfo.enableArrangeMenu === true;
            } );
        }
        columnConfig = {
            columnConfigId: props.objectSetUri,
            columns: props.columns,
            operationType: props.operationType
        };
        columnInfos.push( columnConfig.columns );
    }
    return {
        columnInfos: columnInfos[0],
        columnConfig: columnConfig
    };
};

export const initialize = ( dataProvider, columnProvider, dpRef, objectSetSource ) => {
    if( dataProvider ) {
        if( objectSetSource ) {
            dataProvider.setValidSourceTypes( objectSetSource );
        }

        initDataProviderRef( dpRef );
        dpRef.current.dataProviders.push( dataProvider.viewModelCollection.getLoadedViewModelObjects );

        dpRef.current.columnProviders[ dataProvider.name ] = {
            getColumnFilters: columnProvider.getColumnFilters,
            getSortCriteria: columnProvider.getSortCriteria
        };
    }
};

export const cleanup = ( dataProvider, dpRef ) => {
    if( dataProvider && dpRef.current && dpRef.current.dataProviders.includes( dataProvider.viewModelCollection.getLoadedViewModelObjects ) ) {
        let dpName = dataProvider.name;

        let index = dpRef.current.dataProviders.indexOf( dataProvider.viewModelCollection.getLoadedViewModelObjects );
        if( index > -1 ) {
            dpRef.current.dataProviders.splice( dataProvider.viewModelCollection.getLoadedViewModelObjects, 1 );
        }

        if( dpRef.current.columnProviders[ dpName ] ) {
            delete dpRef.current.columnProviders[ dpName ];
        }
    }
};

export const arrangeObjectSetColumns = ( eventData, viewModel, props ) => {
    if( eventData.objectSetUri === props.objectSetUri || eventData.columnConfigId === props.objectSetUri ) {
        eventData.props = props;
        columnArrangeService.arrangeColumns( viewModel, eventData );
    }
};

exports = {
    awWalkerObjectSetReusableTableRenderFunction,
    loadColumns,
    initialize,
    cleanup,
    arrangeObjectSetColumns
};

export default exports;
