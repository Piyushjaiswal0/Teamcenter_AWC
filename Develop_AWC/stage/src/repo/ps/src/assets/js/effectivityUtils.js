// Copyright (c) 2022 Siemens

/**
 * effectivity authoring util
 *
 * @module js/effectivityUtils
 */
import eventBus from 'js/eventBus';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import dataManagementSvc from 'soa/dataManagementService';
import _ from 'lodash';
import localeService from 'js/localeService';

let exports = {};
let UPDATE_END_ITEM_EVENT = 'ps0Effectivity.updateEndItemValue';
let END_ITEM_PROP_LOADED_EVENT = 'ps0Effectivity.endItemPropLoaded';
let UP_UNIT_VAL = '2147483647';
/**
 * Get the type names.
 * @param {Object} response findDisplayableSubBusinessObjectsWithDisplayNames response
 * @return {Object} type names
 */
export let processSoaResponseForBOTypes = function( response ) {
    let typeNames = [];
    if( response.output ) {
        for( let ii = 0; ii < response.output.length; ii++ ) {
            let displayableBOTypeNames = response.output[ ii ].displayableBOTypeNames;
            for( let jj = 0; jj < displayableBOTypeNames.length; jj++ ) {
                let searchFilter = {
                    searchFilterType: 'StringFilter',
                    stringValue: ''
                };
                searchFilter.stringValue = displayableBOTypeNames[ jj ].boName;
                typeNames.push( searchFilter );
            }
        }
    }
    return typeNames;
};

/**
 * Get the selected element from palette.
 * @return {Object} selectedObject returns selected object
 */
export let getElementFromPallete = function( eventData ) {
    var selectedObject = null;
    if( eventData.selectedObjects.length !== 0 ) {
        selectedObject = eventData.selectedObjects[0];
    }
    return selectedObject;
};

/**
 * Get the subobject BO types.
 * @param {Object} data declarative view model object.
 */
export let fetchSubBOTypesAndDoSearch = function( data ) {
    if( !data.subBusinessObjects || data.subBusinessObjects.length === 0 ) {
        eventBus.publish( 'searchEndItems.fetchSubBOTypes' );
    } else {
        eventBus.publish( 'searchEndItems.doSearch' );
    }
};

/**
 * Set End Item and publish provided event
 * @param {Object} itemOrRevision  Effectivity end item
 * @param {String} effectivityType evectivityType context variable
 * @param {String} eventName Event Name to publish
 */
export let setEndItemAndPublishProvidedEvent = function( itemOrRevision, data, subPanelContext, eventName ) {
    itemOrRevision = itemOrRevision ? itemOrRevision : {};
    if( itemOrRevision.modelType && itemOrRevision.modelType.typeHierarchyArray && itemOrRevision.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
        itemOrRevision = cdm.getObject( itemOrRevision.props.awb0UnderlyingObject.dbValues[ 0 ] );
    }
    let item = itemOrRevision.props && itemOrRevision.props.items_tag ? cdm.getObject( itemOrRevision.props.items_tag.dbValues[ 0 ] ) : itemOrRevision;

    let expEffPanelState = subPanelContext.expEffPanelState;
    let expEffPanelStateValue = { ...expEffPanelState.getValue() };
    expEffPanelStateValue.endItemVal.endItem = {
        type: item.type || '',
        uid : item.uid || ''
    };
    expEffPanelState.update( { ...expEffPanelStateValue } );

    var endItemVal = {};
    if( !_.isUndefined( item.uid ) ) {
        return dataManagementSvc.getProperties( [ item.uid ], [ 'object_string' ] ).then( function() {
            let uiValue = item.props.object_string.uiValues[ 0 ];
            expEffPanelStateValue.endItemVal.endItem.uiValue = uiValue;
            expEffPanelStateValue.endItemVal.dbValue = uiValue;
            expEffPanelStateValue.endItemVal.uiValue = uiValue;
            expEffPanelState.update( { ...expEffPanelStateValue } );
            endItemVal = updateEndItemValue( data, expEffPanelState );
            eventBus.publish( eventName );
            return endItemVal;
        } );
    }
};

/**
 * Loads EndItem with the top level context as default
 */
export let loadTopLevelAsEndItem = function( data, subPanelContext ) {
    var endItemVal = {};
    var contextVal = subPanelContext.occContext;
    if( contextVal ) {
        let topItemRevision = cdm.getObject( contextVal.productContextInfo.props.awb0Product.dbValues[ 0 ] );
        let topEndItem = cdm.getObject( topItemRevision.props.items_tag.dbValues[ 0 ] );
        endItemVal = setEndItemAndPublishProvidedEvent( topEndItem, data, subPanelContext, END_ITEM_PROP_LOADED_EVENT );
        return endItemVal;
    }
};

/**
 * Update end item value on declarative view model
 * @param {String} data  declarative view model
 * @param {String} effectivityType evectivityType context variable
 */
export let updateEndItemValue = function(  data, subPanelContext ) {
    let expEffPanelState = { ...subPanelContext.getValue() };
    var isOnlyUnitEffectivityApplicable = appCtxSvc.getCtx( 'expressionEffectivity.isOnlyUnitEffectivityApplicable' );
    if( expEffPanelState.dateOrUnitEffectivityTypeRadioButton.dbValue && !isOnlyUnitEffectivityApplicable ) {
        expEffPanelState.endItemVal = {
            dbValue: '',
            uiValue: '',
            endItem: {
                uid: '',
                type: ''
            }
        };
        subPanelContext.update( { ...expEffPanelState } );
    }
    if( data && data.endItemVal ) {
        var endItemVal = {};
        endItemVal.dbValue = expEffPanelState.endItemVal.dbValue;
        endItemVal.uiValue = expEffPanelState.endItemVal.uiValue;
        return endItemVal;
    }
};

/**
 * This function is to validate unit text field
 * @param {DeclViewModel} data - The declViewModel  object.
 */
export let validateUnitCriteria = function( data, expEffPanelState ) {
    if( data.unitRangeText.dbValue ) {
        let expEffPanelStateValue = { ...expEffPanelState.value };
        var isUnitRangeValid = true;
        var isBadSyntax = false;
        var isPositiveNumber = true;
        var isTooLarge = false;
        var modifiedUnitRangeText;
        var finalFirstNum;

        var unitValue = data.unitRangeText.dbValue;
        var clean = unitValue;

        if( clean ) {
            clean = clean.replace( '/\s+/g', '' ); //remove all spaces from the given string

            if( clean !== null && clean !== '' ) {
                var lastValue = -1;
                var i = 0;
                var units = clean.split( '-' );

                // if range is given even after UP or SO, lastValue will be NaN
                // pattern like 10-15-20 is invalid
                if( isNaN( lastValue ) ) {
                    isUnitRangeValid = false;
                } else if( units.length > 2 ) {
                    isBadSyntax = true;
                }

                // CHeck if first number starts with zero.
                var firstNumber = units[ 0 ];

                //var num = Array.from(firstNumber);
                if( units[ 0 ] ) {
                    finalFirstNum = units[ 0 ].trim().replace( /^0+/, '' );
                    if( finalFirstNum === '' ) {
                        finalFirstNum = 0;
                    }
                }

                var isFirstNumberInteger = Number.isInteger( Number( firstNumber ) );

                // check 1st part is number or if it is a negative number
                if( isNaN( units[ 0 ] ) || units[ 0 ] === '' || !isFirstNumberInteger || _.endsWith( units[0], '.' ) ) {
                    isPositiveNumber = false;
                } else if( Number( units[ 0 ] ) <= lastValue ) {
                    isUnitRangeValid = false;
                } else if( parseInt( units[ 0 ] ) > 2147483647 ) {
                    isTooLarge = true;
                }

                lastValue = Number( units[ 0 ] ); // update last value


                // if there is second part
                if( units.length > 1 ) {
                    // check 2nd part is float
                    var secondNumber = units[ 1 ];
                    var isSecondNumberInteger = Number.isInteger( Number( secondNumber ) );

                    // check 1st part is number
                    if( isNaN( units[ 1 ] ) ) {
                        if( units[ 1 ] !== 'UP' && units[ 1 ] !== 'SO' ) {
                            isPositiveNumber = false;
                        }
                    } else if( !isSecondNumberInteger || _.endsWith( units[1], '.' )  ) {
                        isPositiveNumber = false;
                    } else if( Number( units[ 1 ] ) <= lastValue ) {
                        isUnitRangeValid = false;
                    } else if( parseInt( units[ 1 ] ) > 2147483647 ) {
                        isTooLarge = true;
                    }

                    lastValue = Number( units[ 1 ] );
                }
            }
        }

        if( !_.includes( unitValue, '-' ) && finalFirstNum === 0 || _.includes( unitValue, ',' ) ) {
            isPositiveNumber = false;
        }

        modifiedUnitRangeText = unitValue.replace( /\b0+/g, '' );

        // From above step all preceeding 0's are removed. So if only 0-20 is added as input then -20 will remain, in this case we need to add removed 0.
        if( _.includes( unitValue, '-' ) && modifiedUnitRangeText.charAt( 0 ) === '-' ) {
            modifiedUnitRangeText = 0 + modifiedUnitRangeText;
        }

        expEffPanelStateValue.unitRangeText.dbValue = modifiedUnitRangeText;
        expEffPanelState.update( { ...expEffPanelStateValue } );

        return {
            isUnitRangeValid : isUnitRangeValid,
            isBadSyntax : isBadSyntax,
            isPositiveNumber : isPositiveNumber,
            isTooLarge : isTooLarge,
            modifiedUnitRangeText : modifiedUnitRangeText
        };
    }
};

export default exports = {
    processSoaResponseForBOTypes,
    fetchSubBOTypesAndDoSearch,
    getElementFromPallete,
    setEndItemAndPublishProvidedEvent,
    loadTopLevelAsEndItem,
    updateEndItemValue,
    validateUnitCriteria
};
