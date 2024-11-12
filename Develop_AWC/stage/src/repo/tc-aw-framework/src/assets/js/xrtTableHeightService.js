// Copyright (c) 2022 Siemens

/**
 * xrtTableHeightService is used to calculate the height of tableProperty/nameValueProperty based on max row count. This service is only
 * applicable for XRT tableProperty and nameValueProperty.
 * <P>
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/xrtTableHeightService
 */
var exports = {};

/**
 * Set max rows as 7 and half by default when 'maxRowCount' is not provided as part of XRT
 *
 * @private
 *
 * @return {Number} - max number of rows
 */
var _getMaxRows = function() {
    return 7;
};

/**
 * @private
 *
 * @param {Number} maxRowCount - maximum row count visible.
 * 
 * @return {Number} - returns calculated array height based of max row count.
 */
var _getCollectionHeight = function( maxRowCount ) {
    var arrayHeight = 0;

    /**
     * Replicating same logic as GWT. Estimating 37px per row. Depends on other styling though. mainly depends on
     * icon being 22 by 22. 22 for header + 8 for padding = 30 + part of next line (12) = 42 <br>
     *
     * Need to figure out a way to do this dynamically.
     */
    arrayHeight = maxRowCount * 37 + 42;

    // this is needed for default table property height
    if( arrayHeight === 0 ) {
        arrayHeight = 50;
    }

    return arrayHeight;
};

/**
 * Calculate table height based of max row count.
 *
 * @param {Object} tableData - Table Data for tablePrperty/nameValueProperty
 *
 * @return {Number} - returns calculated table height based of max row count.
 */
export let calculateTableHeight = function( tableData ) {
    let tableHeight = 0;

    if( tableData ) {
        // if XRT's maxRowCount attribute is NOT given, then calculate table height
        // using default maxRowCount value
        if( !tableData.maxRowCount ) {
            var maxRows = _getMaxRows(); // getMaxRows defaults to returning 7
            // Setting height of table property table widget
            tableHeight = _getCollectionHeight( maxRows );
        } else {
            //calculate the table height based on maxRowCount defined in the XRT
            tableHeight = _getCollectionHeight( tableData.maxRowCount );
        }
    }

    return tableHeight;
};

export default exports = {
    calculateTableHeight
};
