// Copyright (c) 2022 Siemens

/**
 * This is Navigate-color filtering service provider
 *
 * @module js/viewerCriteriaColoringManagerProvider
 */
var exports = {};

/**
 * Provides an instance of criteria coloring manager
 *
 * @param {String} viewerCtxNamespace - Viewer context name space
 * @param {Object} viewerView - Viewer view
 * @param {Object} viewerContextData - Viewer Context data
 *
 * @return {Object} CriteriaColoringManager- Returns Criteria coloring manager
 */
export let getCriteriaColoringManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    return new CriteriaColoringManager( viewerCtxNamespace, viewerView, viewerContextData );
};

/**
 * Class to hold the criteria coloring manager attributes
 *
 * @constructor criteriaColoringManager
 *
 * @param {String} viewerCtxNamespace - Viewer context name space
 * @param {Object} viewerView - Viewer view
 * @param {Object} viewerContextData - Viewer Context data
 */
var CriteriaColoringManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    var self = this;
    var _viewerView = viewerView;

    /**
     * Enable (turn ON) occurrence criteria coloring or change to the specified criteria if criteria coloring already ON
     *
     * @param {String} internalPropertyNameToMatchOn - The internal name of the occurrence property.
     * @param {Array} propertyMatchValues - Array of propertyMatchValues(created using addpropertyMatchValue)
     */
    self.enableCriteriaColoring = function( internalPropertyNameToMatchOn, propertyMatchValues ) {
        _viewerView.criteriaColoringMgr.enableCriteriaColoring( internalPropertyNameToMatchOn, getpropertyMatchValues( propertyMatchValues ) );
    };

    /**
     * Disable (turn OFF) occurrence criteria coloring
     */
    self.disableCriteriaColoring = function() {
        _viewerView.criteriaColoringMgr.disableCriteriaColoring();
    };

    /**
     * Creates structure containing start and end property values along with the associated color for any
     * occurrence whose property value matches this start/end criteria. The end value is used for range comparisons if populated
     *
     * @param {Array} matchValuesToProcess Array of propertyMatchValues
     */
    var getpropertyMatchValues = function( matchValuesToProcess ) {
        var propertyMatchValues = [];
        if( matchValuesToProcess && matchValuesToProcess.length > 0 ) {
            matchValuesToProcess.forEach( function( element ) {
                propertyMatchValues.push( _viewerView.criteriaColoringMgr.addpropertyMatchValue( element.startValue, element.endValue, element.propertyGroupID, element.colorValue ) );
            } );
        }
        return propertyMatchValues;
    };
};

export default exports = {
    getCriteriaColoringManager
};
