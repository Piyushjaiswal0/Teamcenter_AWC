// Copyright (c) 2022 Siemens

/**
 * @module js/awSubscriptionCriteriaTableService
 */
import uwPropertySvc from 'js/uwPropertyService';
import tcViewModelObjectSvc from 'js/tcViewModelObjectService';
import dateTimeSvc from 'js/dateTimeService';
import cmm from 'soa/kernel/clientMetaModel';
import soaSvc from 'soa/kernel/soaService';
import _ from 'lodash';
import appCtx from 'js/appCtxService';

var _criteriaId = 1;

// There are lot of limitations for dataProvider...for client only interaction, we have to follow
// the practice in aw-abstract-tableproperty.controller.js to save a dataProvider refernce here
var _dataProvider = null;
var _selectPropertyStr = null;
var targetType = null;
var vmoID = 1;

/**
 * Set value to output. For some side cases in declarative
 * @param {Object} input - input of the function.
 * @return {Object} Object that contains input.
 *
 */
export let setValue = function( input ) {
    return { data: input };
};

/**
 * Execute on edit command of subscription criteria
 * Set fields while editing the criteria.
 * @param {Object} data - fields of the function.
 *
 */
export let setValueForPanel = function( fields, provider ) {
    var selectedProject = appCtx.getCtx( 'selected' );

    let lovEntry = {
        propDisplayValue: selectedProject.props.logic_operators.uiValue,
        propInternalValue: selectedProject.props.logic_operators.dbValue
    };
    fields.propLogicalOperator.setLovVal( { lovEntry } );

    let mathOpLovEntry = {
        propDisplayValue: selectedProject.props.math_operators.uiValue,
        propInternalValue: selectedProject.props.math_operators.dbValue
    };
    fields.propMathOperator.setLovVal( { mathOpLovEntry } );

    let attrNameLovEntry = {
        propDisplayValue: selectedProject.props.attribute_names.uiValue,
        propInternalValue: selectedProject.props.attribute_names.dbValue
    };
    fields.propAttributeName.setLovVal( { attrNameLovEntry, provider } );
    return attrNameLovEntry;
};

/**
 * Return Array of property names
 * Input to getViewModelProperties function
 */
export let getColumnsNameArray = function( columnDefs ) {
    return _.map( columnDefs, function( o ) {
        return o.name;
    } );
};

/**
 * Criteria attributes in DB needs several context, which we load here in one shot
 */
export let loadCriteriaContext = function( provider, valueTypeDefs, columnDefs, subscriptionObject, selectPropertyStr ) {
    _criteriaId = 1;
    _dataProvider = provider;
    _selectPropertyStr = _.clone( selectPropertyStr );

    return soaSvc.ensureModelTypesLoaded( [ cmm.extractTypeNameFromUID( subscriptionObject.props.target.dbValue ) ] )
        .then( function() {
            targetType = cmm.getType( subscriptionObject.props.target.dbValue );
            var criteriaObj = {
                valueTypeDefs: valueTypeDefs,
                columnDefs: columnDefs,
                targetTypeDescriptor: targetType.propertyDescriptorsMap,
                targetType: targetType
            };
            appCtx.updateCtx( 'sub0Criteria', criteriaObj );
        } );
};

/**
 * Process response for SOA getSubscribableProperties.
 * @param {Object}  reponse - SOA Response
 * @return {Object} Object for current Imansubscription describable properties.
 */
export let processGetSubscribablePropertiesResponse = function( response ) {
    var criteriaProps = response ? response.criteriaProperties[ 0 ] : { propInternalNames: [] };
    var subscribableCtx = _.reduce( criteriaProps.propInternalNames, function( sum, dbVal, i ) {
        sum.subscribableProperties.push( { propDisplayValue: criteriaProps.propDisplayNames[ i ], propInternalValue: dbVal } );
        sum.attrToDispValMap[ dbVal ] = criteriaProps.propDisplayNames[ i ];
        return sum;
    }, {
        subscribableProperties: [ { propDisplayValue: _selectPropertyStr, propInternalValue: '' } ],
        attrToDispValMap: {}
    } );
    appCtx.updateCtx( 'sub0Criteria.subscribableCtx', subscribableCtx );
    return subscribableCtx;
};

/**
 * Create or Update Criteria VMO object
 * @param {Object} columnDefs - Property definitions.
 * @param {Object} props - Input properties.
 * @param {Object} vmObject - Criteria view model object.
 */
function _createOrUpdateCriteriaObject( columnDefs, props, vmObject ) {
    if( !vmObject ) {
        vmObject = tcViewModelObjectSvc.createViewModelObjectById( 'SubsCriteriaTable' + vmoID );
        vmoID++;
        vmObject.type = 'Sub0Criteria';
        vmObject.criteriaId = _criteriaId;
        _criteriaId++;
    }

    return _.reduce( columnDefs, function( vmObject, columnInfo ) {
        var displayValues = props[ columnInfo.name ].displayValues;
        vmObject.props[ columnInfo.name ] = props[ columnInfo.name ];
        vmObject.props[ columnInfo.name ].uiValues = displayValues;
        vmObject.props[ columnInfo.name ].propertyDescriptor = {
            displayName: columnInfo.displayName
        };
        return vmObject;
    }, vmObject );
}

/**
 * Load attributes on subscription to create criteria objects
 * @return {Array} An array of criteria VMOs.
 */
export let loadCriteriaObjects = function( criteriaCtx, subscriptionObject ) {
    var _criteriaObjectList = [];
    _.forEach( subscriptionObject.props.logic_operators.dbValue, function( val, rowNdx ) {
        if( val !== undefined && val !== null && val !== '' ) {
            _criteriaObjectList.push( _createOrUpdateCriteriaObject( criteriaCtx.columnDefs, _.reduce( criteriaCtx.columnDefs, function( props, columnInfo ) {
                var dbVal = subscriptionObject.props[ columnInfo.name ].dbValue[ rowNdx ];
                var dispVal = [ dbVal ];
                if( columnInfo.name === 'attribute_values' && dbVal ) {
                    dispVal = [ dbVal.replace( /([^\\])\|/g, '$1 OR ' ).replace( /\\\|/g, '|' ) ];
                } else if( columnInfo.name === 'attribute_names' ) {
                    if( criteriaCtx.subscribableCtx.attrToDispValMap[ dbVal ] ) {
                        dispVal = [ criteriaCtx.subscribableCtx.attrToDispValMap[ dbVal ] ];
                    } else if( criteriaCtx.targetTypeDescriptor[ dbVal ] ) {
                        dispVal = [ criteriaCtx.targetTypeDescriptor[ dbVal ].displayName ];
                    }
                }
                var vmProp = uwPropertySvc.createViewModelProperty( dbVal, dispVal, '', dbVal, dispVal );
                props[ columnInfo.name ] = vmProp;

                return props;
            }, {} ) ) );
        }
    } );

    appCtx.updateCtx( 'sub0Criteria.criteriaObjects', _criteriaObjectList );
    return _criteriaObjectList;
};


/**
 * LOVEntry object
 *
 * @class LOVEntry
 *
 * @param {Array} lovRowValue - LOV Values.
 * @param {String} lovType - The type of the LOV. e.g. String, Integer etc. This has to be same as the property
 *            type.
 * @param {String} lovValueProp - LOV Value Property.
 * @param {String} lovDescProp - LOV Description Property.
 */
var LOVEntry = function( lovRowValue, lovType, lovValueProp, lovDescProp ) {
    var self = this;

    self.lovRowValue = lovRowValue;
    self.lovType = lovType;
    self.lovDescProp = lovDescProp;
    self.lovValueProp = lovValueProp;
    self.propHasValidValues = true;
    if( lovRowValue.propInternalValues ) {
        self.propInternalValue = lovRowValue.propInternalValues[ lovValueProp ][ 0 ];
    } else {
        self.propInternalValue = {};
    }

    /** property display description */

    /**
     * set flag 'propHasValidValues'
     *
     * @param {propHasValidValues} propHasValidValues - flag
     */
    self.setPropHasValidValues = function( propHasValidValues ) {
        self.propHasValidValues = propHasValidValues;
    };

    /**
     * Concatenate property values array and returns property string
     *
     * @param {propValues} propValues - property values array
     * @return {propVal} concatenated property value string
     */
    self.getPropertyString = function( propValues ) {
        var propVal = '';
        if( propValues !== null && propValues.length > 0 ) {
            propVal = propValues[ 0 ];
            for( var i = 1; i < propValues.length; i++ ) {
                if( propValues[ i ] !== null ) {
                    propVal += propVal + '\\;' + propValues[ i ];
                }
            }
        }

        return propVal;
    };

    /**
     * Concatenate property display values
     *
     * @return {propDisplayValue} concatenated property display values
     */
    self.getPropDisplayValues = function() {
        var propDisplayValue = null;

        if( self.lovRowValue && self.lovRowValue.propDisplayValues &&
            self.lovRowValue.propDisplayValues[ self.lovValueProp ] ) {
            propDisplayValue = self.getPropertyString( self.lovRowValue.propDisplayValues[ self.lovValueProp ] );
        }

        return propDisplayValue;
    };

    /**
     * Concatenate property display description values
     *
     * @return {propDisplayDescription} concatenated property display description values
     */
    self.getPropDisplayDescriptions = function() {
        var propDisplayDescription = null;

        if( self.lovRowValue && self.lovRowValue.propDisplayValues &&
            self.lovRowValue.propDisplayValues[ lovDescProp ] ) {
            propDisplayDescription = self.getPropertyString( self.lovRowValue.propDisplayValues[ lovDescProp ] );
        }

        return propDisplayDescription;
    };

    /** property display value and description */
    if( self.lovRowValue.propDisplayValues ) {
        self.propDisplayValue = self.getPropDisplayValues();
        self.propDisplayDescription = self.getPropDisplayDescriptions();
    } else {
        self.propDisplayValue = {};
        self.propDisplayDescription = {};
    }
    /**
     * Returns true/false whether the lovRowValue has children.
     *
     * @return {hasChildren} true/false
     */
    self.checkHasChildren = function() {
        return self.lovRowValue.childRows && self.lovRowValue.childRows.length > 0;
    };

    /** checks whether lov has children */
    self.hasChildren = self.checkHasChildren();

    /**
     * Get children lov, used for hierarical lovs
     *
     * @return {list} list array which contains child rows
     */
    self.getChildren = function() {
        var lovEntries = [];
        if( self.checkHasChildren() ) {
            for( var lovValue in self.lovRowValue.childRows ) {
                if( self.lovRowValue.childRows.hasOwnProperty( lovValue ) ) {
                    lovEntries.push( new LOVEntry( self.lovRowValue.childRows[ lovValue ], self.lovType,
                        self.lovValueProp, self.lovDescProp ) );
                }
            }
        }

        return lovEntries;
    };
}; // LOVEntry

/**
 * This is a reusable function to create LOV entries from SOA response
 *
 * @param {responseData} responseData - SOA response structure from LOV
 * @param {propertyType} propertyType - Type of Property
 * @return {lovEntries} Array of LOV entry objects
 */
export let createLOVEntries = function( responseData, propertyType ) {
    var lovEntries = [];
    var lovValueProp = responseData.behaviorData.columnNames.lovValueProp;
    var lovDescProp = responseData.behaviorData.columnNames.lovDescrProp;
    for( var lovValue in responseData.lovValues ) {
        if( responseData.lovValues.hasOwnProperty( lovValue ) ) {
            var lovEntry = new LOVEntry( responseData.lovValues[ lovValue ], propertyType, lovValueProp,
                lovDescProp );
            lovEntries.push( lovEntry );
        }
    }
    // push the moreValuesExist to the lovEntries. if it is true, then call getNextValues ; else not call getNextValues
    if( responseData.moreValuesExist ) {
        lovEntries.moreValuesExist = responseData.moreValuesExist;
    }
    return lovEntries;
};


/**
 * Reset attribute_value in criteria panel.
 * @return {Object} Obj for Edit Panel.
 */
export let resetAttributeValue = function( criteriaCtx, data, attrName, operator ) {
    var type = attrName ? criteriaCtx.valueTypeDefs[ criteriaCtx.targetTypeDescriptor[ attrName ].valueType ] : null;
    var hasLov = attrName ? Boolean( criteriaCtx.targetTypeDescriptor[ attrName ].lovCategory ) : false;
    operator = [ operator ? operator : '=' ];
    var propAttributeValueVmProp = uwPropertySvc.createViewModelProperty( data.i18n.subscptCondFollowValue, data.i18n.subscptCondFollowValue, type, '', '' );
    propAttributeValueVmProp.isEditable = true;
    uwPropertySvc.setIsArray( propAttributeValueVmProp, true );


    var propMathOperatorVmProp = uwPropertySvc.createViewModelProperty( data.i18n.subscptCondFollowOperator, data.i18n.subscptCondFollowOperator, 'STRING', operator, operator );
    propMathOperatorVmProp.isEditable = true;
    propMathOperatorVmProp.hasLov = true;

    /*if( attrName === 'owning_user' ) {
        hasLov = false;
        uwPropertySvc.setHasLov( propAttributeValueVmProp, false );
    }*/
    if( hasLov ) {
        uwPropertySvc.setHasLov( propAttributeValueVmProp, true );
        propAttributeValueVmProp.dataProvider = 'dataProviderPropAttributeValue';
    }

    return {
        propAttributeValue: propAttributeValueVmProp,
        propMathOperator: propMathOperatorVmProp,
        attr: attrName
    };
};


/**
 * Load math_operators and attribute_values Edit Panel.
 * @return {Object} Obj for Edit Panel.
 */
export let loadCriteriaEditAttributeValue = function( prop, value, fields ) {
    // For avoid any side effect, keep legacy GWT logic
    var vals = value ? value.replace( /\\\|/g, '\\*' ).split( '|' ).map( function( v ) {
        return v.replace( /\\\*/g, '|' );
    } ) : [];
    var dbValue = prop.type === 'DATEARRAY' ? _.map( vals, function( v ) {
        return new Date( v ).valueOf();
    } ) : _.clone( vals );
    var displayValues = prop.type === 'DATEARRAY' ? _.map( vals, function( v ) {
        return dateTimeSvc.formatSessionDateTime( new Date( v ) );
    } ) : _.clone( vals );
    _.map( displayValues, function( v ) {
        if( prop.hasLov ) {
            let lovEntry = {
                propDisplayValue: v,
                propInternalValue: v
            };
            fields.propAttributeValue.setLovVal( { lovEntry } );
        }
    } );

    if( !prop.hasLov ) {
        fields.propAttributeValue.update( dbValue );
    }
};

/**
 * Apply Add/Edit panel values back to Criteria Table.
 */
export let applyCriteriaChange = function( criteriaObjects, panelContext, selectedObject, columnDefs, props ) {
    var vmoProp = _.reduce( props, function( sum, prop, key ) {
        var dbValue = prop.dbValue;
        var uiValues = [ prop.uiValue ];
        if( key === 'attribute_values' ) {
            // In case of attribute value for all type of property dbValue and dispVal should be same
            //dbValue = value1|value2|value3
            //displayValue = value1 OR value2 OR value3
            if( prop.uiValues ) {
                uiValues = prop.uiValues.map( function( v ) {
                    return v.toString().replace( /\|/g, '\\|' );
                } );
                var uiValue = uiValues.join( '|' );
                uiValues = [ uiValue.replace( /([^\\])\|/g, '$1 OR ' ).replace( /\\\|/g, '|' ) ];
                dbValue = uiValue;
            }
        }
        var vmProp = uwPropertySvc.createViewModelProperty( prop.propertyDisplayName, prop.propertyDisplayName, '', dbValue, uiValues );
        sum[ key ] = vmProp;
        return sum;
    }, {} );

    if( panelContext && panelContext.type === 'Sub0Criteria' ) {
        _createOrUpdateCriteriaObject( columnDefs, vmoProp, _.filter( criteriaObjects, { criteriaId: selectedObject.criteriaId } )[ 0 ] );
    } else {
        criteriaObjects.push( _createOrUpdateCriteriaObject( columnDefs, vmoProp ) );
    }
    _dataProvider.update( criteriaObjects, criteriaObjects.length );
};

/**
 * Remove selected object from criteria object list.
 */
export let removeCriteria = function( criteriaObjects, selectedObj ) {
    _.remove( criteriaObjects, { criteriaId: selectedObj.criteriaId } );
    _dataProvider.update( criteriaObjects, criteriaObjects.length );
};

/**
 * Move criteria object up or down in VMO list.
 */
export let moveCriteria = function( criteriaObjects, selectedObj, eventType, isMoveUp ) {
    if( selectedObj && selectedObj.criteriaId ) {
        var currIdx = _.findIndex( criteriaObjects, { criteriaId: selectedObj.criteriaId } );
        var replaceIdx = isMoveUp ? currIdx - 1 : currIdx + 1;
        replaceIdx = replaceIdx < 0 || replaceIdx === criteriaObjects.length ? currIdx : replaceIdx;
        if( eventType !== '__Attach' && eventType !== '__Attained_Release_Status' && eventType !== '__Item_Rev_Create' || currIdx > 0 && replaceIdx > 0 ) {
            var tmp = criteriaObjects[ replaceIdx ];
            criteriaObjects[ replaceIdx ] = criteriaObjects[ currIdx ];
            criteriaObjects[ currIdx ] = tmp;
        }
    }
    _dataProvider.update( criteriaObjects, criteriaObjects.length );
};

/**
 * Update VMO infomation back to ImanSubscription Object.
 */
export let updateSubscriptionObject = function( subscriptionObject, columnDefs, criteriaObjects, xrtState ) {
    let newXrtState = { ...xrtState.getValue() };

    _.forEach( columnDefs, function( columnInfo ) {
        var prop = subscriptionObject.props[ columnInfo.name ];
        uwPropertySvc.setValue( prop, _.reduce( criteriaObjects, function( sum, o ) {
            return sum.concat( [ o.props[ columnInfo.name ].dbValue ? o.props[ columnInfo.name ].dbValue : '' ] );
        }, [] ) );
        prop.dbValues = prop.dbValue;
        if( newXrtState && newXrtState.xrtVMO ) {
            newXrtState.xrtVMO.props[ prop.propertyName ] = prop;
        }
    } );

    xrtState.update( newXrtState );
};

/**
 * Processes the editHandlerStateChange event
 * When the state is cancelling Load the original view model objects
 * back into the table thereby discarding any uncommited vmo's not in the ImanSubscription handler_parameters.
 * update the dataProvider
 *
 * @param {Object} criteriaCtx criteriaObjects
 * @param {Object} subscriptionObject source object
 */
export let resetCriteriaTable = function( criteriaCtx, subscriptionObject ) {
    // Remove selection
    _dataProvider.selectNone();
    _criteriaId = 1; // Start Creating new vmo for the criteria table rows
    var criteriaObjects = [];
    _dataProvider.viewModelCollection.clear();
    criteriaObjects = loadCriteriaObjects( criteriaCtx, subscriptionObject );
    _dataProvider.update( criteriaObjects, criteriaObjects.length );
    appCtx.updateCtx( 'sub0Criteria.criteriaObjects', criteriaObjects );
    return criteriaObjects;
};


const exports = {
    setValue,
    loadCriteriaContext,
    processGetSubscribablePropertiesResponse,
    loadCriteriaObjects,
    resetAttributeValue,
    loadCriteriaEditAttributeValue,
    applyCriteriaChange,
    removeCriteria,
    moveCriteria,
    updateSubscriptionObject,
    resetCriteriaTable,
    createLOVEntries,
    setValueForPanel,
    getColumnsNameArray
};
export default exports;
