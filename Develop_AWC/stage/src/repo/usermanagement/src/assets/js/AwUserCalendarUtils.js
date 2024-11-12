// Copyright (c) 2022 Siemens

/**
 * @module js/AwUserCalendarUtils
 */

import selectionService from 'js/selection.service';
import cdm from 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';

var exports = {};

/**
    * This method is used to get User calendars from Response.
    * @param {Object} response - the response of grm relation soa
    * @param {object} user - current user
    * @returns {Object} User Calendar
    */
export let processResponseForUserCalendar = function( response, user ) {
    let calendar;
    let userCalendar = 'userCalendar';
    if( response.output[0].relationshipData[0].relationshipObjects.length > 0 ) {
        calendar = response.output[0].relationshipData[0].relationshipObjects[0].otherSideObject;
        let calendarObject = {
            user: user.uid,
            calendarType: calendar.type,
            calendarUID: calendar.uid
        };
        if( appCtxService.getCtx( userCalendar ) ) {
            appCtxService.updateCtx( userCalendar, calendarObject );
        }else{
            appCtxService.registerCtx( userCalendar, calendarObject );
        }
    }
    return calendar;
};

/**
   * This method is used to get the Input of selected calendars.
   * @returns {Object} UID of selected calendar
   */
export let getSelectedObjects = function() {
    let selectedCalendarsUID = [];
    let selectedObjects = selectionService.getSelection().selected;
    if( selectedObjects && selectedObjects.length > 0 ) {
        selectedObjects.forEach( object => {
            var selectedCalendar = cdm.getObject( object.uid );

            if( selectedCalendar.type === 'TCCalendar' ) {
                selectedCalendarsUID.push( selectedCalendar );
            }
        } );
    }
    if( selectedCalendarsUID.length === 0 ) {
        let userCalendar = appCtxService.getCtx( 'userCalendar' );
        if( userCalendar.calendarType === 'TCCalendar' ) {
            selectedCalendarsUID.push( cdm.getObject( userCalendar.calendarUID ) );
        }
    }
    return selectedCalendarsUID;
};

exports = {
    processResponseForUserCalendar,
    getSelectedObjects
};

export default exports;


