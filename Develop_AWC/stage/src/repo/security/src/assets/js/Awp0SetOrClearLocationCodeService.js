// Copyright (c) 2022 Siemens

/**
 * @module js/Awp0SetOrClearLocationCodeService
 */
import constantsService from 'soa/constantsService';
import commandPanelService from 'js/commandPanel.service';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';

var exports = {};

var _haveCheckedAllowSuggestiveLocationCode = false;

var _constantAllowSuggestiveLocationCode = false;

/*
 * @member Awp0SetOrClearLocationCodeService return: filter text with wild cards
 */

export let getFindListInput = function( filterText ) {
    var modifiedFilterText = '';
    if( !filterText || _.isNull( filterText ) || _.isEqual( filterText, '' ) ) {
        modifiedFilterText = '*';
    } else {
        modifiedFilterText = '*' + filterText + '*';
    }

    return modifiedFilterText;
};


/**
 * Update the application context with location code.
 *
 * @param {string} commandId - command id for which location code need to update
 *
 * @param {string} location - location value which we need to update
 *
 *
 */

export let setLocationCode = function( commandId, location ) {
    // no need to call the server every time we refresh the list.  Once per session should be adequate.
    // capture the first reply and use that for subsequent requests.
    if( _haveCheckedAllowSuggestiveLocationCode ) {
        var locationCode = {
            suggestiveLocationCodeConstValue: _constantAllowSuggestiveLocationCode
        };
        appCtxSvc.registerCtx( 'locationCode', locationCode );
    } else {
        var globalConstants = [ 'Fnd0AllowSuggestiveLocationCode' ];
        constantsService.getGlobalConstantValues2( globalConstants ).then( function( response ) {
            var constantVal = response.constantValues[ 0 ].value[ 0 ];
            var displayStatus = false;
            if( constantVal !== null ) {
                displayStatus = constantVal;
            }
            _haveCheckedAllowSuggestiveLocationCode = true;
            _constantAllowSuggestiveLocationCode = displayStatus;

            var locationCode = {
                suggestiveLocationCodeConstValue: _constantAllowSuggestiveLocationCode
            };
            appCtxSvc.registerCtx( 'locationCode', locationCode );
        } );
    }
    commandPanelService.activateCommandPanel( commandId, location );
};

exports = {
    getFindListInput,
    setLocationCode
};
export default exports;
/**
 * getSearchCriteria
 * @function getSearchCriteria
 * @param {Number}startIndex - startIndex
 * @param {Object}criteria - criteria
 * @return {Object} search criteria
 */
exports.getSearchCriteria = function( data, startIndex ) {
    var criteria = {};
    if(  startIndex > 0 ) {
        //it's a scrolling case
        criteria.totalObjectsFoundReportedToClient = data.totalFound.toString();
        criteria.lastEndIndex = data.lastEndIndex.toString();
    } else {
        criteria.totalObjectsFoundReportedToClient = 0;
        criteria.lastEndIndex = 0;
    }
    criteria.queryName = 'Company Location';
    criteria.searchID = 'COMPANY_LOCATION';
    criteria.typeOfSearch = 'ADVANCED_SEARCH';
    criteria.utcOffset = '0';
    criteria.fnd0LocationCode_0 = '\'\'';
    criteria.fnd0LocationCode_1 = '\'\'';
    criteria.fnd0LocationCode = exports.getFindListInput( data.filterBox.dbValue );
    criteria.object_name = exports.getFindListInput( data.filterBox.dbValue );

    return criteria;
};
