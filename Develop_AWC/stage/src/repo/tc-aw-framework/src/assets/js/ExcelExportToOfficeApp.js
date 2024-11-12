//@<COPYRIGHT>@
//==================================================
//Copyright 2022.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 */

/**
 * Module for the Export to Office panel
 *
 * @module js/ExcelExportToOfficeApp
 */

import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import openInVisProductContextInfoProvider from 'js/openInVisualizationProductContextInfoProvider';
import eventBus from 'js/eventBus';
import uwPropertySvc from 'js/uwPropertyService';
import listBoxService from 'js/listBoxService';

var allColumns = {};
var selectedColumns = {};


/**
  * Get the selected Spec template name
  * @param {Object} data - The panel's view model object
  * @return {String} The Spec template name
  */
export let getTemplateNameForExport = function( data ) {
    var template = '';
    if ( data.exportExcelOptions.dbValue ) {
        template = data.excelTemplates.dbValue;
    }
    return template;
};

export let getInputObjects = function() {
    var inputObjects = _.get( appCtxService, 'ctx.panelContext', undefined );
    if ( !inputObjects || !_.isArray( inputObjects ) ) {
        inputObjects = _.get( appCtxService, 'ctx.mselected', undefined );
    }

    return inputObjects;
};

/**
  * Get objects to Export
  *
  * @param {Object} data - The panel's view model object
  * @param {Object} ctx - context object
  * @return {Any} Array of objects to export
  */
export let getObjectsToExportForExcel = function( data, ctx ) {
    return ctx.mselected;
};

/**
  * Get target objects to Export
  * @return {Any} Array of target objects to export
  */
export let getTargetObjectsToExportForExcel = function() {
    var aceProductContext = [];
    var aceActiveContext = appCtxService.getCtx( 'aceActiveContext' );
    if ( aceActiveContext ) {
        aceProductContext.push( aceActiveContext.context.productContextInfo );
    }
    return aceProductContext;
};
/**
  * Get the export options
  *
  * @param {Object} data - The panel's view model object
  * @return {Any} Array of export options
  */
export let getExportOptionValueForExcel = function( data ) {
    var exportOptions = [];
    if ( data.runInBackgroundExcelExport.dbValue ) {
        exportOptions.push( {
            option: 'RunInBackground',
            optionvalue: 'RunInBackground'
        } );
    }
    exportOptions.push( {
        option: 'docStructure',
        optionvalue: data.docStructure.dbValue.toString()
    },
    {
        option: 'idHyperlink',
        optionvalue: data.idHyperlink.dbValue.toString()
    },
    {
        option: 'outlineNumbers',
        optionvalue: data.outlineNumbers.dbValue.toString()
    }
    );

    //check for extra custom export options added by consumers.
    var extraExportOptions = appCtxService.getCtx( 'extraExportOptions' );
    if( extraExportOptions && extraExportOptions.length > 0 ) {
        for( var i = 0; i < extraExportOptions.length; i++ ) {
            exportOptions.push( {
                option: extraExportOptions[ i ].option,
                optionvalue: extraExportOptions[ i ].optionvalue
            } );
        }
        appCtxService.unRegisterCtx( 'extraExportOptions' );
    }

    return exportOptions;
};
/* return selected properties
  * @param {Object} data - The view model data
  */
export let getSelectedProperties = function( data ) {
    var properties = [];
    if ( !data.exportExcelOptions.dbValue ) {
        _.forEach( selectedColumns, function( column ) {
            properties.push( column.propertyName );
        } );
    }
    return properties;
};
/**
  * Remove given column from coulmn list.
  * @param {Object} data - The panel's view model object
  * @param {Object} columnToRemove - column to remove
  */
export let removeColumn = function( data, sharedData, columnToRemove ) {
    const sharedDataValue = { ...sharedData.value };

    if ( columnToRemove ) {
        for ( var i = sharedDataValue.exportColumns.dbValue.length - 1; i >= 0; i-- ) {
            if ( sharedDataValue.exportColumns.dbValue[i] === columnToRemove ) {
                sharedDataValue.exportColumns.dbValue.splice( i, 1 );
            }
        }
        if ( sharedDataValue.exportColumns.dbValue.length === 0 ) {
            data.isExportColumnEmpty.dbValue = true;
        }
    }

    sharedData.update( sharedDataValue );

    return {
        isExportColumnEmpty: data.isExportColumnEmpty
    };
};
/**
  * Update coulmn list.
  *
  * @param {Object} data - The view model data
  */
export let updateColumnList = function( data, sharedData ) {
    const sharedDataValue = { ...sharedData.value };
    sharedDataValue.exportColumns.dbValue = selectedColumns;
    if ( sharedDataValue.exportColumns.dbValue.length ) {
        data.isExportColumnEmpty.dbValue = false;
    }
    sharedData.update( sharedDataValue );
    eventBus.publish( 'exportExcel.refreshColumnList' );

    return {
        isExportColumnEmpty: data.isExportColumnEmpty
    };
};
/**
  * Move one down or up from list
  *
  * @param {Object} dataProvider - dataprovider
  * @param {Object} moveTo - Direction to move to
  */
export let moveUpDown = function( dataProvider, moveTo ) {
    var sortColumns = dataProvider.exportColumnList;
    var selectedCount = sortColumns.getSelectedIndexes()[0];
    if ( moveTo === 'Down' ) {
        selectedColumns = move( selectedColumns, selectedCount, selectedCount + 1 );
    }
    if ( moveTo === 'Up' ) {
        selectedColumns = move( selectedColumns, selectedCount, selectedCount - 1 );
    }
    eventBus.publish( 'exportExcel.updatedColumnList' );
};
var move = function( arr, old_index, new_index ) {
    while ( old_index < 0 ) {
        old_index += arr.length;
    }
    while ( new_index < 0 ) {
        new_index += arr.length;
    }
    if ( new_index >= arr.length ) {
        var k = new_index - arr.length;
        while ( k-- + 1 ) {
            arr.push( undefined );
        }
    }
    arr.splice( new_index, 0, arr.splice( old_index, 1 )[0] );
    return arr;
};
/**
  * Change move up/down command state on selection change
  *
  * @param {Object} data - The view model data
  */
export let columnSelectionChanged = function( data ) {
    var excelCntx = appCtxService.getCtx( 'excelListCommands' );
    var columnListLength = data.exportColumnList.getLength();
    var selectedColumn = data.exportColumnList.selectedObjects[0];
    if ( data.exportColumnList.getItemAtIndex( 0 ) === selectedColumn ) {
        excelCntx.enableMoveUp = false;
    } else {
        excelCntx.enableMoveUp = true;
    }
    if ( data.exportColumnList.getItemAtIndex( columnListLength - 1 ) === selectedColumn ) {
        excelCntx.enableMoveDown = false;
    } else {
        excelCntx.enableMoveDown = true;
    }
    appCtxService.updateCtx( 'excelListCommands', excelCntx );
};
/**
  * Prepare column list
  *
  * @param {Object} data - The panel's view model object
  */
export let prepareColumnList = function( data, sharedData, searchState ) {
    const sharedDataValue = { ...sharedData.value };
    var searchResInfo;
    if( appCtxService.ctx.reqSummaryTable ) {
        searchResInfo = appCtxService.ctx.reqSummaryTable;
    } else if( !appCtxService.ctx.reqSummaryTable && searchState.searchResponseInfo && searchState.searchResponseInfo.columnConfig.columns &&
     searchState.searchResponseInfo.columnConfig.columns.length > 0 ) {
        searchResInfo = searchState.searchResponseInfo;
    }

    if( searchResInfo === undefined ) {
        searchResInfo =  appCtxService.ctx.reqSummaryTable ? appCtxService.ctx.reqSummaryTable : appCtxService.ctx.searchResponseInfo;
    }
    if ( searchResInfo ) {
        var columns;
        if( searchResInfo.columns ) {
            columns = searchResInfo.columns;
        }else if( searchResInfo.columnConfig && searchResInfo.columnConfig.columns ) {
            columns = searchResInfo.columnConfig.columns;
        }

        if ( columns.length ) {
            data.isExportColumnEmpty.dbValue = false;
        }
        if ( appCtxService.ctx.reqSummaryTable && columns ) {
            var finalColumns = [];
            for( var i = 0; i < columns.length; i++ ) {
                var propName = columns[i].propertyName;
                var typeName = columns[i].typeName;
                if( ( columns[i].typeName === 'Arm0SummaryTableProxy' || columns[i].associatedTypeName === 'Arm0SummaryTableProxy' ) && propName && propName.indexOf( 'REF' ) !== -1 ) {
                    var type = propName.substring( propName.indexOf( ',' ) + 1, propName.indexOf( ')' ) );
                    var property = propName.substring( propName.indexOf( '.' ) + 1 );
                    columns[i].typeName = type;
                    columns[i].propertyName = property;
                    if( type.indexOf( 'Awb0Element' ) !== -1 || type.indexOf( 'Awb0ConditionalElement' ) !== -1 ) {
                        finalColumns.push( columns[i] );
                    }
                } else if( typeName && typeName !== undefined && ( typeName.indexOf( 'Awb0Element' ) !== -1 || typeName.indexOf( 'Awb0ConditionalElement' ) !== -1 ) ) {
                    finalColumns.push( columns[i] );
                }
            }
            columns = finalColumns;
        }
        if ( columns ) {
            columns = columns.filter( column => !column.clientColumn );
            const uniqueColumns = Array.from( new Set( columns.map( a => a.propertyName ) ) )
                .map( propertyName => {
                    return columns.find( a => a.propertyName === propertyName );
                } );
            _.forEach( uniqueColumns, function( column ) {
                if( !_checkIfDCPProperty( column.propertyName ) ) {  // DCP not supported to export
                    var displayedLogicalProp = _createViewModelObjectForProperty( column );
                    sharedDataValue.exportColumns.dbValue.push( displayedLogicalProp );
                }
            } );
            eventBus.publish( 'exportExcel.refreshColumnList' );
            allColumns = _.clone( sharedDataValue.exportColumns.dbValue, true );
            selectedColumns = sharedDataValue.exportColumns.dbValue;
        }
    }
    sharedData.update( sharedDataValue );

    return {
        isExportColumnEmpty: data.isExportColumnEmpty
    };
};
/**
  * Create view model property for the property info
  *
  * @param {Object} propInfo - Property info
  * @returns {Object} viewModelObject - view model object for the given property info
  */
var _createViewModelObjectForProperty = function( propInfo ) {
    var dispPropName = propInfo.displayName;
    var propName = propInfo.propertyName + ':' + propInfo.typeName;
    var viewProp = uwPropertySvc.createViewModelProperty( propName, dispPropName, 'BOOLEAN', [],
        [] );
    uwPropertySvc.setIsRequired( viewProp, true );
    uwPropertySvc.setIsArray( viewProp, false );
    uwPropertySvc.setIsEditable( viewProp, true );
    uwPropertySvc.setIsNull( viewProp, false );
    uwPropertySvc.setPropertyLabelDisplay( viewProp, 'PROPERTY_LABEL_AT_RIGHT' );
    uwPropertySvc.setValue( viewProp, true );
    return viewProp;
};
/**
 * checks if the property name is of type DCP ( Dynamic Compound Property )
 * @function checkIfDCPProperty
 * @param {String} propertyName - name of the property
 * @returns {Boolean} - returns whether the property is a dynamic compound property or not.
 */
var _checkIfDCPProperty = function( propertyName ) {
    if( propertyName && propertyName.indexOf( '.' ) !== -1 &&
         propertyName.indexOf( '(' ) !== -1 &&
         ( propertyName.indexOf( 'GRM' ) !== -1 ||
             propertyName.indexOf( 'GRMS2P' ) !== -1 ||
             propertyName.indexOf( 'REF' ) !== -1 ||
             propertyName.indexOf( 'REFBY' ) !== -1 ||
             propertyName.indexOf( 'GRMREL' ) !== -1 ||
             propertyName.indexOf( 'GRMS2PREL' ) !== -1 )
    ) {
        return true;
    }
    return false;
};
/* unregister context to update command state
  */
export let unRegisterCmdContext = function() {
    appCtxService.unRegisterCtx( 'excelListCommands' );
};
/* Register context to update command state
  */
export let registerCmdContext = function() {
    var jso = {
        enableMoveUp: true,
        enableMoveDown: true
    };
    appCtxService.registerCtx( 'excelListCommands', jso );
};
/**
  * Update specTemplates, excelTemplates, activity list
  *
  * @param {Object} response SOA response
  * @param {Object} data The panel's view model object
  * @param {Object} ctx AppCtx
  * @param {Object} sharedData shared data state
  * @returns {Object} return data
  */
const processExportTemplatesResponse = function( response, data, ctx, sharedData ) {
    const specTemplatesListIn = _.get( response, 'outTmplNames.SpecTemplate' );
    const excelTemplatesListIn = _.get( response, 'outTmplNames.ExcelTemplate' );
    const objectTemplateListIn = _.get( response, 'outTmplNames.ObjectTemplate' );
    const specEleRevSubTypesListIn = _.get( response, 'outTmplNames.SpecElementRevisionSubTypes' );

    let specTemplatesList = [];
    let excelTemplatesList = [];
    if ( specTemplatesListIn && specTemplatesListIn.length > 0 ) {
        specTemplatesList = listBoxService.createListModelObjectsFromStrings( specTemplatesListIn );
        data.specTemplates.dbValue = specTemplatesList[0].propInternalValue;
    }
    if( ctx && ctx.excelTemplateForExport ) {
        let defaultTemplate = ctx.excelTemplateForExport.parameterTemplate;
        let allExcelTemplatesList = listBoxService.createListModelObjectsFromStrings( excelTemplatesListIn );
        let exportToExcelTemplate;
        for ( const template in allExcelTemplatesList ) {
            if ( allExcelTemplatesList[template].propInternalValue === defaultTemplate ) {
                exportToExcelTemplate = allExcelTemplatesList[template];
                allExcelTemplatesList.splice( template, 1 );
            }
        }
        if( exportToExcelTemplate ) {
            allExcelTemplatesList.unshift( exportToExcelTemplate );
        }
        excelTemplatesList = allExcelTemplatesList;
    } else if ( excelTemplatesListIn && excelTemplatesListIn.length > 0 ) {
        if ( ctx.preferences && ctx.preferences.AWC_REQ_default_excel_template_for_export ) {
            let defaultTemplate = ctx.preferences.AWC_REQ_default_excel_template_for_export[0];

            let allExcelTemplatesList = listBoxService.createListModelObjectsFromStrings( excelTemplatesListIn );
            let exportToExcelTemplate;
            for ( const template in allExcelTemplatesList ) {
                if ( allExcelTemplatesList[template].propInternalValue === defaultTemplate ) {
                    exportToExcelTemplate = allExcelTemplatesList[template];
                    allExcelTemplatesList.splice( template, 1 );
                }
            }
            if( exportToExcelTemplate ) {
                allExcelTemplatesList.unshift( exportToExcelTemplate );
            }
            excelTemplatesList = allExcelTemplatesList;
        } else {
            excelTemplatesList = listBoxService.createListModelObjectsFromStrings( excelTemplatesListIn );
        }
    }

    const objectTemplateList = listBoxService.createListModelObjectsFromStrings( objectTemplateListIn );
    const specEleRevSubTypesList = createListModelObjectsFromStrings( specEleRevSubTypesListIn );

    if( sharedData ) {
        const sharedDataValue = { ...sharedData.value };
        sharedDataValue.objectTemplateList = objectTemplateList;
        sharedDataValue.specEleRevSubTypesList = specEleRevSubTypesList;
        sharedData.update( sharedDataValue );
    }

    return  {
        specTemplatesList: specTemplatesList,
        excelTemplatesList : excelTemplatesList
    };
};

/**
  * Given an array of Strings to be represented in listbox, this function returns an array of ListModel objects for
  * consumption by the listbox widget.
  *
  * @param {ObjectArray} strings - The Strings array
  * @return {ObjectArray} - Array of ListModel objects.
  */
export let createListModelObjectsFromStrings = function( strings ) {
    var listModels = [];
    for ( var i in strings ) {
        if ( i ) {
            var listModel = _getEmptyListModel();
            var splits = strings[i].split( ',' );

            listModel.propDisplayValue = splits[0];
            listModel.propInternalValue = splits[1];
            listModels.push( listModel );
        }
    }
    return listModels;
};
/**
  * Return an empty ListModel object.
  *
  * @return {Object} - Empty ListModel object.
  */
var _getEmptyListModel = function() {
    return {
        propDisplayValue: '',
        propInternalValue: '',
        propDisplayDescription: '',
        hasChildren: false,
        children: {},
        sel: false
    };
};

const updateSharedDataState = function( state, newValue ) {
    let stateValue = { ...state.value };
    stateValue = Object.assign( stateValue, newValue );
    state.update( stateValue );
};
/* clear the exportColumns in sharedData on unMount
  * @param {Object} data - The view model shareddata
  */
export let clearSharedData = function( sharedData ) {
    const sharedDataValue = { ...sharedData.value };
    sharedDataValue.exportColumns.dbValue = [];
    sharedData.update( sharedDataValue );
};

/**
   * Set coulmn list.
   *
   * @param {Object} data - The view model data
   * @returns {Object} - properties to update
   */
export let setColumns = function( data ) {
    let selectColumns = _.difference( allColumns, selectedColumns );
    _.forEach( selectColumns, function( column ) {
        uwPropertySvc.setValue( column, false );
    } );
    _.forEach( selectedColumns, function( column ) {
        uwPropertySvc.setValue( column, true );
    } );
    data.allProperties = allColumns;
    for ( var i = 0; i < data.allProperties.length; i++ ) {
        if ( data.allProperties[i].dbValue === true ) {
            data.areAllPropertiesDeselected = false;
            break;
        } else {
            data.areAllPropertiesDeselected = true;
        }
    }

    return  {
        allProperties: allColumns,
        areAllPropertiesDeselected: data.areAllPropertiesDeselected
    };
};

export let setSelectionVariable = function( data ) {
    if ( data.isExportColumnEmpty.dbValue ) {
        data.areAllPropertiesDeselected = true;
    }
};

/**
 * Add columns in coulmn list.
 *
 * @param {Object} data - The view model data
 */
export let addColumns = function( data ) {
    selectedColumns = [];
    if( data.allProperties ) {
        for( var i = 0; i < data.allProperties.length; i++ ) {
            if( data.allProperties[ i ].dbValue === true ) {
                selectedColumns.push( data.allProperties[ i ] );
            }
        }
        var destPanelId = 'Arm0Export';
        var eventData = {
            destPanelId: destPanelId,
            supportGoBack: true
        };
        eventBus.publish( 'awPanel.navigate', eventData );
        eventBus.publish( 'exportExcel.updatedColumnList' );
    }
};

/**
 *
 * @param {Object} data - view model object data
 * @returns  {Object} - response object
 */
export let changeColumnSelectionForProperties = function( data ) {
    for ( var i = 0; i < data.allProperties.length; i++ ) {
        if ( data.allProperties[i].dbValue === true ) {
            data.areAllPropertiesDeselected = false;
            break;
        } else {
            data.areAllPropertiesDeselected = true;
        }
    }
    return {
        areAllPropertiesDeselected: data.areAllPropertiesDeselected
    };
};


const exports = {
    getTemplateNameForExport,
    getInputObjects,
    getObjectsToExportForExcel,
    getTargetObjectsToExportForExcel,
    getExportOptionValueForExcel,
    getSelectedProperties,
    removeColumn,
    updateColumnList,
    moveUpDown,
    columnSelectionChanged,
    prepareColumnList,
    unRegisterCmdContext,
    registerCmdContext,
    processExportTemplatesResponse,
    createListModelObjectsFromStrings,
    updateSharedDataState,
    clearSharedData,
    setColumns,
    setSelectionVariable,
    addColumns,
    changeColumnSelectionForProperties
};
export default exports;
