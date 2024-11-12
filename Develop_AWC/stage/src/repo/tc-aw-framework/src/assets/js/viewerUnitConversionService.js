// Copyright (c) 2022 Siemens

/**
 * Defines {@link NgServices.viewerUnitConversionService} which provides utility functions for viewer
 *
 * @module js/viewerUnitConversionService
 * @namespace viewerUnitConversionService
 */
import _ from 'lodash';

/**
 * self object pointing to this instance
 */
let exports = {};
/**
 * constant "sq" String
 */
var _SQ_STR = 'sq'; //$NON-NLS-1$

/**
 * constant "cu" String
 */
var _CU_STR = 'cu'; //$NON-NLS-1$

/**
 * Enums that represent units
 */
var _UnitMnemonics = {
    mm: 1.0, //millimeters
    cm: 10.0, // Centimeters
    m: 1.0e+3, // Meters
    in: 25.4, // Inches
    ft: 304.8, // Feet
    yd: 914.4, // Yards
    um: 1.0e-3, // Micrometers
    dm: 100.0, // Decimeters
    km: 1.0e+6, // Kilometers
    mils: 2.54e-2 // Mils
};

/**
 * unit map
 */
export const unitMap = {
    mm: 1, //millimeters
    cm: 2, // Centimeters
    m: 3, // Meters
    in: 4, // Inches
    ft: 5, // Feet
    yd: 6, // Yards
    um: 7, // Micrometers
    dm: 8, // Decimeters
    km: 9, // Kilometers
    mils: 10 // Mils
};

/**
 * Gets conversion factor to convert from meter to given unit
 *
 * @param {String} inputUnitStr source unit string
 * @return {Number} conversion factor
 */
var _getMeterConversionFactor = function( inputUnitStr ) {
    try {
        var unitStr = inputUnitStr.trim();
        var factor = 1;
        var power = 1;
        var stringToEvaluateForUnits = inputUnitStr;

        if( unitStr.indexOf( _SQ_STR ) >= 0 ) {
            power = 2;
            stringToEvaluateForUnits = unitStr.replace( _SQ_STR, '' ); //$NON-NLS-1$
        }

        if( unitStr.indexOf( _CU_STR ) >= 0 ) {
            power = 3;
            stringToEvaluateForUnits = unitStr.replace( _CU_STR, '' ); //$NON-NLS-1$
        }

        factor = _UnitMnemonics[ stringToEvaluateForUnits ];
        if( factor ) {
            return Math.pow( 1.0e+3 / factor, power );
        }
        return 1.0;
    } catch ( e ) {
        return 1.0;
    }
};

/**
 * Gets converted number from meter to given unit
 *
 * @param {Number} input input
 * @param {String/Number} inputUnit input unit
 * @return {Number} converted number
 */
export let convertToAnotherUnitsFromMeter = function( input, inputUnit ) {
    var output = undefined;
    var factor;
    var inputUnitString = '';
    if( _.isString( inputUnit ) ) {
        inputUnitString = inputUnit;
    } else if( _.isNumber( inputUnit ) ) {
        for( var key in unitMap ) {
            if( unitMap[ key ] === inputUnit ) {
                inputUnitString = key;
                break;
            }
        }
    }
    factor = _getMeterConversionFactor( inputUnitString );

    if( _.isArray( input ) ) {
        output = [];

        _.forEach( input, function( inputNumber ) {
            output.push( inputNumber * factor );
        } );
    } else {
        output = input * factor;
    }
    return output;
};

/**
 * Gets converted number from  given unit to meter
 *
 * @param {Number} input input
 * @param {String} inputUnit input unit
 * @return {Number} converted number
 */
export let convertToMeterFromAnotherUnits = function( input, inputUnit ) {
    var output = undefined;
    var factor;
    var inputUnitString = '';
    if( _.isString( inputUnit ) ) {
        inputUnitString = inputUnit;
    }
    if( _.isNumber( inputUnit ) ) {
        for( var key in unitMap ) {
            if( unitMap[ key ] === inputUnit ) {
                inputUnitString = key;
                break;
            }
        }
    }

    factor = _getMeterConversionFactor( inputUnitString );

    if( _.isArray( input ) ) {
        output = [];

        _.forEach( input, function( inputNumber ) {
            output.push( inputNumber / factor );
        } );
    } else {
        output = input / factor;
    }
    return output;
};

export default exports = {
    convertToAnotherUnitsFromMeter,
    convertToMeterFromAnotherUnits,
    unitMap
};
