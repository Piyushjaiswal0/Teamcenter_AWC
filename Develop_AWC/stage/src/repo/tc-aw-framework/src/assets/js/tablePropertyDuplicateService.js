/* @<COPYRIGHT>@
 * ==================================================
 * Copyright 2021.
 * Siemens Product Lifecycle Management Software Inc.
 * All Rights Reserved.
 * ==================================================
 * @<COPYRIGHT>@
 */

/**
 * Table Property Service is used to duplicate rows for table property items. This service is only applicable for table property items
 *
 */
import _ from 'lodash';
import eventBus from 'js/eventBus';

/**
 * Sets up the eventData to pass to the table to create a new row with duplicated data
 * @param {Object} tablePropertyEditData - Object containing VMO and gridId of table property in edit
 */
export const duplicateRowOnTable = function( tablePropertyEditData ) {
    if( tablePropertyEditData && tablePropertyEditData.vmo && tablePropertyEditData.gridId ) {
        var selectedRowVMO = tablePropertyEditData.vmo;
        var gridId = tablePropertyEditData.gridId;

        if( selectedRowVMO.props ) {
            var data = [];
            _.forEach( selectedRowVMO.props, function( prop ) {
                let dbValues = !_.isNull( prop.dbValues[ 0 ] ) && prop.dbValues || [ null ];
                if ( prop.newValue ) {
                    dbValues = _.isArray( prop.newValue ) ? prop.newValue : [ prop.newValue ];
                }
                var duplicateProp = {
                    name: prop.propertyName,
                    dbValue: prop.dbValue,
                    dbValues: dbValues,
                    uiValue: prop.uiValue,
                    uiValues: prop.newDisplayValues || prop.uiValues
                };
                data.push( duplicateProp );
            } );

            var eventData = {
                gridId: gridId,
                tableRowData: [ {
                    tableRowTypeName: selectedRowVMO.type,
                    setPropValueUpdated: true,
                    tableRowData: data
                } ]
            };

            eventBus.publish( 'TablePropertyInitialRowData.createSuccessful', eventData );
        }
    }
};

export default {
    duplicateRowOnTable
};
