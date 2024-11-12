// Copyright (c) 2022 Siemens

/**
 * Service for managing unit and date effectivity authoring.
 *
 * @module js/expressionEffectivityService
 */
import AwFilterService from 'js/awFilterService';
import dateTimeService from 'js/dateTimeService';
import localeService from 'js/localeService';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import dataManagementSvc from 'soa/dataManagementService';
import effectivityUtils from 'js/effectivityUtils';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import occmgmtUtils from 'js/occmgmtUtils';

let exports = {};

/**
 * "SO" (Stock Out) value for date effectivity with time format in GMT.
 */
let _SO_DATE_WITH_TIME_IN_GMT = '9999-12-26T00:00:00+00:00';

/**
 * "UP" value for date effectivity with time format in GMT.
 */
let _UP_DATE_WITH_TIME_IN_GMT = '9999-12-30T00:00:00+00:00';

/**
 * "SO" (Stock Out) date object for date effectivity in GMT.
 */
let _SO_JS_DATE = dateTimeService.getJSDate( _SO_DATE_WITH_TIME_IN_GMT );

/**
 * "UP" date object for date effectivity in GMT.
 */
let _UP_JS_DATE = dateTimeService.getJSDate( _UP_DATE_WITH_TIME_IN_GMT );

/**
 * Value of SO for unit effectivity. Value is 1 less than the value of UP.
 */
let SO_UNIT_VAL = '2147483646';

/**
 * Value of UP for unit effectivity. Maximum value that a int can hold in 32 bit system.
 */
let UP_UNIT_VAL = '2147483647';

/**
 * UP display string.
 */
let UP = 'UP';

/**
 * SO display string.
 */
let SO = 'SO';

/**
 * Get the localized value from a given key.
 * @param {String} key: The key for which the value needs to be extracted.
 * @return {String} localized string for the input key.
 */
let getLocalizedValueFromKey = function( key ) {
    let resource = 'PSConstants';
    let localTextBundle = localeService.getLoadedText( resource );
    return localTextBundle[ key ];
};

/**
 * Returns the internal value for open ended unit
 * @param {String} unitValue - unit value.
 * @returns {String} unit internal value.
 */
let getOpenEndedUnitInternalValue = function( unitValue ) {
    let unitInternalValue = unitValue;

    if( !isFinite( unitValue ) ) {
        if( UP === unitValue.toUpperCase() ) {
            unitInternalValue = UP_UNIT_VAL;
        } else if( SO === unitValue.toUpperCase() ) {
            unitInternalValue = SO_UNIT_VAL;
        }
    }

    return unitInternalValue;
};

/**
 * Returns the display value for open ended unit
 * @param {String} unitValue - unit value.
 * @param {Boolean} localized - flag to specify if localized value is needed.
 * @returns {String} unit display value.
 */
let getOpenEndedUnitDisplayValue = function( unitValue, localized ) {
    let unitDisplayValue = unitValue;

    if( Number( unitValue ) === Number( UP_UNIT_VAL ) ) {
        unitDisplayValue = localized ? getLocalizedValueFromKey( 'upTextValue' ) : UP;
    } else if( Number( unitValue ) === Number( SO_UNIT_VAL ) ) {
        unitDisplayValue = localized ? getLocalizedValueFromKey( 'soTextValue' ) : SO;
    }

    return unitDisplayValue;
};

/**
 * Returns the display string for unit range
 * @param {String} unitIn - unit in value.
 * @param {String} unitOut - unit out value.
 * @returns {String} unit range display value.
 */
let getUnitRangeDisplayString = function( unitIn, unitOut ) {
    let unitRangeDisplayString = String( unitIn );
    if( unitIn !== unitOut ) {
        unitRangeDisplayString = unitIn + '-' + unitOut;
    }
    return unitRangeDisplayString;
};

/**
 * Process the response and retrieve effectivity list.
 *
 * @param {Object} response - SOA response
 *
 * @return {Object} - List of effectivities
 */
export let getEffectivityDataForDisplay = function( response, expEffPanelState ) {
    let effectivities = [];

    response.effectivityData.forEach( function( effectivityObjectRow ) {
        if( effectivityObjectRow.effectivity ) {
            effectivityObjectRow.effectivity.forEach( function( effectivityObject ) {
                let effectivityInfo = {};
                effectivityInfo.effObj = effectivityObject;
                var unitIn = effectivityObject.unitIn !== -1 && effectivityObject.unitIn || effectivityObject.unitStart !== -1 && effectivityObject.unitStart || '';
                var unitOut = effectivityObject.unitOut !== -1 && effectivityObject.unitOut || effectivityObject.unitEnd !== -1 && effectivityObject.unitEnd || '';
                var dateIn = effectivityObject.dateIn || effectivityObject.dateStart || '';
                var dateOut = effectivityObject.dateOut || effectivityObject.dateEnd || '';

                if( unitIn ) {
                    effectivityInfo.effType = 'Unit';

                    let unitStart = getOpenEndedUnitDisplayValue( unitIn, true );
                    let unitEnd = getOpenEndedUnitDisplayValue( unitOut, true );

                    effectivityInfo.effUnitDisplayString = getUnitRangeDisplayString( unitStart, unitEnd );
                    var endItemUid = effectivityObject.endItem && effectivityObject.endItem.uid || effectivityObject.endItemObject && effectivityObject.endItemObject.uid;
                    var endItemObject = cdm.getObject( endItemUid );

                    if( !_.isUndefined( endItemObject.props.object_string ) ) {
                        effectivityInfo.effEndItem = endItemObject.props.object_string.uiValues[ 0 ];
                    }else{
                        dataManagementSvc.getProperties( [ endItemUid ], [ 'object_string' ] ).then( function() {
                            effectivityInfo.effEndItem = cdm.getObject( endItemUid ).props.object_string.uiValues[ 0 ];
                        } );
                    }
                } else {
                    effectivityInfo.effType = 'Date';
                    let startDate = dateTimeService.formatDate( dateIn );
                    let endDate = dateTimeService.formatDate( dateOut );

                    let endJSDate = dateTimeService.getJSDate( dateOut );

                    if( dateTimeService.compare( _UP_JS_DATE, endJSDate ) === 0 ) {
                        effectivityInfo.effEndDate = getLocalizedValueFromKey( 'upTextValue' );
                    } else if( dateTimeService.compare( _SO_JS_DATE, endJSDate ) === 0 ) {
                        effectivityInfo.effEndDate = getLocalizedValueFromKey( 'soTextValue' );
                    } else {
                        effectivityInfo.effEndDate = endDate;
                    }
                    effectivityInfo.effStartDate = startDate;
                }
                effectivities.push( effectivityInfo );
            } );
        }
    } );
    if( expEffPanelState ) {
        let expEffPanelStateValue = { ...expEffPanelState.getValue() };
        expEffPanelStateValue.effectivities = effectivities;
        expEffPanelState.update( { ...expEffPanelStateValue } );
    }

    return effectivities;
};

/**
 * Returns the date effectivity object for add or update
 *
 * @param {Object} data - declarative view model object
 *
 * @return {Object} - Effectivity object
 */
let getDateEffectivityDataForAddOrUpdate = function( data ) {
    let startDate = data.startDate.dbValue;
    let endDate = data.endDate.dbValue;

    let endDateString = '';

    let startDateString = AwFilterService.instance( 'date' )( startDate, 'yyyy-MM-dd' ) + 'T' +
        AwFilterService.instance( 'date' )( startDate, 'HH:mm:ssZ' );
    if( data.endDateOptions.dbValue === UP ) {
        endDateString = _UP_DATE_WITH_TIME_IN_GMT;
    } else if( data.endDateOptions.dbValue === SO ) {
        endDateString = _SO_DATE_WITH_TIME_IN_GMT;
    } else {
        endDateString = AwFilterService.instance( 'date' )( endDate, 'yyyy-MM-dd' ) + 'T' +
            AwFilterService.instance( 'date' )( endDate, 'HH:mm:ssZ' );
    }

    return {
        dateIn: startDateString,
        dateOut: endDateString,
        unitIn: -1,
        unitOut: -1
    };
};

/**
 * Returns the unit effectivity object for add or update
 *
 * @param {Object} data - declarative view model object
 *
 * @return {Object} - Effectivity object
 */
let getUnitEffectivityDataForAddOrUpdate = function( data, subPanelContext ) {
    let start = '-1';
    let end = '-1';

    if( data.unitRangeText.dbValue ) {
        let tokens = data.unitRangeText.dbValue.split( '-' );
        if( tokens.length >= 1 && tokens[ 0 ].length !== 0 ) {
            start = tokens[ 0 ];
        }
        if( tokens.length === 1 ) {
            // If end unit is not specified, we want to set it as start unit
            end = start;
        } else if( tokens.length === 2 && tokens[ 1 ].length !== 0 ) {
            end = tokens[ 1 ];
        }
    }

    let startUnitValue = Number( getOpenEndedUnitInternalValue( start ) );
    let endUnitValue = Number( getOpenEndedUnitInternalValue( end ) );

    let expEffPanelState = subPanelContext.expEffPanelState;
    let expEffPanelStateValue = { ...expEffPanelState.getValue() };

    return {
        unitIn: startUnitValue,
        unitOut: endUnitValue,
        endItem: {
            uid: expEffPanelStateValue.endItemVal.endItem.uid,
            type: expEffPanelStateValue.endItemVal.endItem.type
        }
    };
};

/**
 * Returns the expression effectivity data for adding new effectivity.
 *
 * @param {Object} data - data object
 * @param {Object} existingEffs - existing effectivities
 *
 * @return {Object} - List of effectivities
 */
export let getEffectivityDataForAddOrUpdate = function( data, subPanelContext ) {
    let existingEffs = subPanelContext.expEffPanelState.effectivities;
    let effectivities = [];
    if( existingEffs.length > 0 ) {
        existingEffs.forEach( function( eff ) {
            //If it is edit mode
            if( subPanelContext.expEffPanelState.editEffectivity.effObj && subPanelContext.expEffPanelState.editEffectivity.effObj !== eff.effObj ) {
                effectivities.push( eff.effObj );
            }
            if( !subPanelContext.expEffPanelState.editEffectivity.effObj ) {
                effectivities.push( eff.effObj );
            }
        } );
    }
    var isOnlyUnitEffectivityApplicable = appCtxSvc.getCtx( 'expressionEffectivity.isOnlyUnitEffectivityApplicable' );
    if( subPanelContext.expEffPanelState.dateOrUnitEffectivityTypeRadioButton.dbValue && !isOnlyUnitEffectivityApplicable ) {
        let effectivity = getDateEffectivityDataForAddOrUpdate( data );
        effectivities.push( effectivity );
    } else {
        let effectivity = getUnitEffectivityDataForAddOrUpdate( data, subPanelContext );
        effectivities.push( effectivity );
    }
    return effectivities;
};

/**
 * Returns the expression effectivity data for removing existing effectivity.
 *
 * @param {Object} existingEffs - existing effectivities
 *
 * @return {Object} - List of effectivities
 */
export let getEffectivityDataForRemove = function( existingEffs ) {
    let effRows = [];

    existingEffs.forEach( function( effRow ) {
        if( !effRow.selected ) {
            effRows.push( effRow.effObj );
        }
    } );

    return effRows;
};


/**
 * Initialize context variables and set default end item
 * @param {Object} data - declarative view model
 */
export let initializeEditPanel = function( effectivity, expEffPanelState ) {
    let expEffPanelStateValue = { ...expEffPanelState.getValue() };

    if( effectivity.effObj.unitIn !== -1 && effectivity.effObj.unitOut !== -1 ) {
        expEffPanelStateValue.dateOrUnitEffectivityTypeRadioButton.dbValue = false;

        let unitIn = getOpenEndedUnitDisplayValue( effectivity.effObj.unitIn, false );
        let unitOut = getOpenEndedUnitDisplayValue( effectivity.effObj.unitOut, false );

        expEffPanelStateValue.unitRangeText.dbValue = getUnitRangeDisplayString( unitIn, unitOut );

        if( effectivity.effObj.endItem ) {
            expEffPanelStateValue.endItemVal.endItem = {
                type: effectivity.effObj.endItem.type || '',
                uid : effectivity.effObj.endItem.uid || ''
            };
            let endItem = cdm.getObject( effectivity.effObj.endItem.uid );
            if( endItem.props.object_string && endItem.props.object_string.uiValues[ 0 ] ) {
                let uiValue = endItem.props.object_string.uiValues[ 0 ];
                expEffPanelStateValue.endItemVal.dbValue = uiValue;
                expEffPanelStateValue.endItemVal.uiValue = uiValue;
            } else {
                dataManagementSvc.getProperties( [ effectivity.effObj.endItem.uid ], [ 'object_string' ] ).then( function() {
                    let uiValue = effectivity.effObj.endItem.props.object_string.uiValues[ 0 ];
                    expEffPanelStateValue.endItemVal.dbValue = uiValue;
                    expEffPanelStateValue.endItemVal.uiValue = uiValue;
                    expEffPanelStateValue.editEffectivity = effectivity;
                    expEffPanelState.update( { ...expEffPanelStateValue } );
                } );
            }
        }
    } else {
        expEffPanelStateValue.dateOrUnitEffectivityTypeRadioButton.dbValue = true;
        expEffPanelStateValue.startDate.dbValue = new Date( effectivity.effObj.dateIn ).getTime();
        expEffPanelStateValue.endDate.dbValue = new Date( effectivity.effObj.dateOut ).getTime();

        let endJSDate = dateTimeService.getJSDate( effectivity.effObj.dateOut );
        if( dateTimeService.compare( _UP_JS_DATE, endJSDate ) === 0 ) {
            expEffPanelStateValue.endDateOptions.dbValue = UP;
        } else if( dateTimeService.compare( _SO_JS_DATE, endJSDate ) === 0 ) {
            expEffPanelStateValue.endDateOptions.dbValue = SO;
        }

        if(  expEffPanelStateValue.endDateOptions.dbValue === 'UP' ) {
            occmgmtUtils.setLocalizedValue( expEffPanelStateValue.endDateOptions, 'uiValue', 'upTextValue' );
        } else if(  expEffPanelStateValue.endDateOptions.dbValue === 'SO' ) {
            occmgmtUtils.setLocalizedValue( expEffPanelStateValue.endDateOptions, 'uiValue', 'soTextValue' );
        } else {
            occmgmtUtils.setLocalizedValue( expEffPanelStateValue.endDateOptions, 'uiValue', 'dateEffectivity' );
        }
    }
    expEffPanelStateValue.editEffectivity = effectivity;
    expEffPanelState.update( { ...expEffPanelStateValue } );
};

/**
 * Initialize Add panel
 * @param {Object} data - declarative view model
 */
export let initializeAddPanel = function( data, subPanelContext ) {
    let nullDate = '0000-00-00T00:00:00';
    var endItemVal = effectivityUtils.loadTopLevelAsEndItem( data, subPanelContext );
    return {
        endDateOptionsDbValue : 'Date',
        endDateOptionsUiValue : 'Date',
        startDateDbValue : '',
        endDateDbValue : '',
        startDateDateApiDateObject : dateTimeService.getJSDate( subPanelContext.expEffPanelState.startDate.dbValue ),
        endDateDateApiDateObject : dateTimeService.getJSDate( subPanelContext.expEffPanelState.endDate.dbValue ),
        unitRangeTextDdbValue : '',
        endItemVal: endItemVal
    };
};

/**
 * This API is added to form the message string from the Partial error being thrown from the SOA
 *
 * @param {Object} messages - messages array
 * @param {Object} msgObj - message object
 */
let getMessageString = function( messages, msgObj ) {
    _.forEach( messages, function( object ) {
        if( msgObj.msg.length > 0 ) {
            msgObj.msg += '<BR/>';
        }
        msgObj.msg += object.message;
        msgObj.level = _.max( [ msgObj.level, object.level ] );
    } );
};

/**
 * This API is added to process the Partial error being thrown from the SOA
 *
 * @param {object} serviceData - the service data Object of SOA
 * @return {object} sreturns message object
 */
export let processPartialErrors = function( serviceData ) {
    var msgObj = {
        msg: '',
        level: 0
    };

    if( serviceData.partialErrors ) {
        _.forEach( serviceData.partialErrors, function( partialError ) {
            getMessageString( partialError.errorValues, msgObj );
        } );
    }

    return msgObj.msg;
};

export let updateRadioDbValueOnState = ( subPanelContext ) => {
    let expEffPanelState = { ...subPanelContext.getValue() };
    var value = expEffPanelState.dateOrUnitEffectivityTypeRadioButton.dbValue;
    if( value ) {
        expEffPanelState.dateOrUnitEffectivityTypeRadioButton.dbValue = false;
    } else {
        expEffPanelState.dateOrUnitEffectivityTypeRadioButton.dbValue = true;
    }
    subPanelContext.update( { ...expEffPanelState } );
    return  expEffPanelState.dateOrUnitEffectivityTypeRadioButton.dbValue;
};

export let updatedbValueOnContextToDefault = ( subPanelContext ) => {
    let expEffPanelState = { ...subPanelContext.getValue() };
    expEffPanelState.dateOrUnitEffectivityTypeRadioButton.dbValue = true;
    expEffPanelState.endItemVal.dbValue = null;
    expEffPanelState.endItemVal.uiValue = null;
    expEffPanelState.endItemVal.endItem.type = '';
    expEffPanelState.endItemVal.endItem.uid = '';
    expEffPanelState.unitRangeText.dbValue = null;
    expEffPanelState.startDate.dbValue = null;
    expEffPanelState.endDate.dbValue = null;
    expEffPanelState.endDateOptions.dbValue = 'Date';
    subPanelContext.update( { ...expEffPanelState } );
};

export let backActionMethod = ( destinationPanelId, data ) => {
    let expEffPanelState = data.expEffPanelState;
    expEffPanelState.activeView = destinationPanelId;
    expEffPanelState.dateOrUnitEffectivityTypeRadioButton.dbValue = true;
    expEffPanelState.unitRangeText.dbValue = null;
    expEffPanelState.startDate.dbValue = null;
    expEffPanelState.endDate.dbValue = null;
    expEffPanelState.endDateOptions.dbValue = 'Date';
    expEffPanelState.endDateOptions.uiValue = 'Date';
    expEffPanelState.endItemVal = {
        dbValue: null,
        uiValue: null,
        endItem: {
            type: '',
            uid: ''
        }
    };

    eventBus.publish( 'navigateToPs0BackEvent' );
    return expEffPanelState;
};

export const backActionData = ( destinationPanelId, data ) => {
    let expEffPanelState = data.expEffPanelState;
    expEffPanelState.activeView = destinationPanelId;
    return expEffPanelState;
};

export default exports = {
    getEffectivityDataForDisplay,
    getEffectivityDataForAddOrUpdate,
    getEffectivityDataForRemove,
    initializeEditPanel,
    initializeAddPanel,
    processPartialErrors,
    updatedbValueOnContextToDefault,
    backActionMethod,
    updateRadioDbValueOnState,
    backActionData
};
