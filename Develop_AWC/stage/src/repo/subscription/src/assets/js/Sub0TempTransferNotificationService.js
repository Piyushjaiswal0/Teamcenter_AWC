// Copyright (c) 2022 Siemens

/**
 * @module js/Sub0TempTransferNotificationService
 */
import appCtxSvc from 'js/appCtxService';

/**
 * * Its generic function to replace object from the given dataProvider
 *
 * @param data : the view model data
 * @param removedObjects: the newObjects to be replaced
 * @param dataProviders : the data provider
 */
export let relaceObject = function( newObjects, dataProviders ) {
    if( newObjects ) {
        var ctxSelected = appCtxSvc.getCtx( 'selected' );
        if( newObjects[ 0 ].uid !== ctxSelected.props.subscriber.dbValue ) {
            dataProviders.update( newObjects, newObjects.length );
        }
    }
};

/**
 * * Its function to validate input dates
 *
 * @param data : the view model data
 * @return isValidInputDates : flag to indicate date is start and end date is valid or not
 */
export let validateInputDates = function( data ) {
    var isValidInputDates = false;
    var currentDate = new Date();
    currentDate.setHours( 0, 0, 0, 0 );

    var startDate = new Date( data.sub0startDate.dbValue );
    startDate.setHours( 0, 0, 0, 0 );

    var endDate = new Date( data.sub0endDate.dbValue );
    endDate.setHours( 0, 0, 0, 0 );

    if( startDate >= currentDate && endDate >= currentDate ) {
        if( endDate >= startDate ) {
            isValidInputDates = true;
        }
    }

    return isValidInputDates;
};

/**
 * Gets the start Date
 *
 * @param {data} - The declarative data view model object.
 * @return {startDate} for SOA input
 */
export let getStartDate = function( data ) {
    var dstartDate = new Date( data.sub0startDate.dbValue );

    var dCurrentDate = new Date();
    var hrs = dCurrentDate.getHours();
    var mins = dCurrentDate.getMinutes();
    dCurrentDate.setHours( 0, 0, 0, 0 );

    if( dCurrentDate >= dstartDate ) {
        dstartDate.setHours( hrs, mins, 0, 0 );
    }

    return dstartDate.toISOString();
};

/**
 * Gets the end date
 *
 * @param {data} - The declarative data view model object.
 * @return {endDate} for SOA input
 */
export let getEndDate = function( data ) {
    var endDate = new Date( data.sub0endDate.dbValue );
    endDate.setHours( 23, 59, 0, 0 );

    return endDate.toISOString();
};
const exports = {
    relaceObject,
    validateInputDates,
    getStartDate,
    getEndDate
};
export default exports;
