// Copyright (c) 2022 Siemens

/**
 * ObjectSet service is used to calculate the height of objectSet based on max row count. This service is only
 * applicable for XRT objectSet.
 * <P>
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/xrtObjectSetService
 */
import _ from 'lodash';
import appCtxService from 'js/appCtxService';
import awConfiguredSvc from 'js/awConfiguredRevService';

let exports = {};
const OBJSET_MIN_HEIGHT = 200;
const OBJECT_SET_VIEWMODE_CONTEXT = 'objectSetViewModeContext';

/**
 * Get row data count
 *
 * @private
 *
 * @param {Object} objSetData - objectSet data
 * @param {String} activeDisplay - the current display mode
 * @param {Object[]} columns - the columns
 * @param {Number} totalLoaded - the total loaded vmos
 * @return {Number} - row data count
 */
const _getRowDataCount = function( objSetData, activeDisplay, columns, totalLoaded ) {
    let count = 0;
    if( activeDisplay && activeDisplay.value === 'compareDisplay' ) {
        count = columns.length + 1;
    } else {
        count = totalLoaded;
    }
    return count;
};

/**
 * Set max rows as 7 and half by default when 'maxRowCount' is not provided as part of XRT
 *
 * @private
 *
 * @return {Number} - max number of rows
 */
const _getMaxRows = function() {
    return 7;
};

/**
 * @private
 *
 * @param {Element} $element - DOM element the controller is attached to.
 * @param {Number} dataCount - the data count
 * @param {Number} maxRowCount - maximum row count visible.
 *
 * @return {Number} - returns calculated array height based of max row count.
 */
const _getCollectionHeight = function( dataCount, maxRowCount ) {
    let arrayHeight = 0;
    let rowsShown = 0;

    // if the actual # of rows exceeds the max, size based on the max
    if( dataCount >= maxRowCount ) {
        rowsShown = maxRowCount;
    } else {
        // size based on the actual data + 1
        rowsShown = dataCount + 1;
    }

    /**
     * Replicating same logic as GWT. Estimating 37px per row. Depends on other styling though. mainly depends on
     * icon being 22 by 22. 22 for header + 8 for padding = 30 + part of next line (12) = 42 <br>
     *
     * Need to figure out a way to do this dynamically.
     */
    arrayHeight = rowsShown * 37 + 42;

    // this is needed for default objectSet height
    if( rowsShown === 1 && arrayHeight === 0 ) {
        arrayHeight = 50;
    }

    return arrayHeight;
};

/**
 * Calculate object set height
 *
 * @param {String} display - display mode
 * @param {Object} objSetData - Object Set Data
 * @param {Object} columns - Object Set columns
 * @param {Number} totalLoaded - Total Loaded.
 * @return {Number} - returns calculated objectSet height based of max row count.
 */
export const calculateObjectsetHeight = function( display, objSetData, columns, totalLoaded ) {
    let objectSetHeight = 0;

    if( objSetData ) {
        // Below is a temporary fix for D-03820
        // if XRT's maxRowCount attribute is NOT given, then calculate number of objectSets present inside a column
        // and then set the height of the table and list accordingly
        if( objSetData.smartObjSet ) {
            //TODO - We need a way to get the element and set the actual remaining height.
            //TODO revisitme - Nihar/Brad - Find better way of getting the correct smart objectset height. Hard coded now to prevent issues
            objectSetHeight = 500;
        } else if( !objSetData.maxRowCount ) {
            let maxRows = _getMaxRows(); // getMaxRows defaults to returning 7
            // Setting height of objectSet table widget
            objectSetHeight = _getCollectionHeight( _getRowDataCount( objSetData, display, columns, totalLoaded ), maxRows );
        } else {
            // if XRT's maxRowCount attribute is given, then set the height of objectSet (common for both table and list).
            // Setting height of objectSet
            objectSetHeight = _getCollectionHeight( _getRowDataCount( objSetData, display, columns, totalLoaded ), objSetData.maxRowCount );
        }
    }

    return objectSetHeight;
};

/**
 * Parse object set source string into map of object type string to an array of relation type strings
 *
 * @param {String} objectSetSource - Comma separated string of relationType.ObjectType combinations
 * @return {Object} Map of Object to relation type list
 */
export const getModelTypeRelationListMap = function( objectSetSource ) {
    let modelTypeRelationListMap = {};
    let objectSetSourceArray = objectSetSource.split( ',' );
    if( objectSetSourceArray.length > 0 ) {
        _.forEach( objectSetSourceArray, function( typeRelCombo ) {
            let typeRelSplit = typeRelCombo.split( '.' );
            if( typeRelSplit.length === 2 ) {
                let relationType = typeRelSplit[ 0 ].trim();
                let objectType = typeRelSplit[ 1 ].trim();
                if( !_.isArray( modelTypeRelationListMap[ objectType ] ) ) {
                    modelTypeRelationListMap[ objectType ] = [];
                }
                modelTypeRelationListMap[ objectType ].push( relationType );
            }
        } );
    }
    return modelTypeRelationListMap;
};

/**
 * Finds the relationType and any associated source objects valid to that type.
 *
 * @param {Object[]} sourceObjects - source objects used to compare relations
 * @param {Object} modelTypeRelations - valid model type relations
 * @param {String} showConfiguredRevision - flag indicating whether configured revision capability is toggled on
 * @return {Object} object containing relationType and valid source objects
 */
export const getModelTypeRelationsWithValidSourceObjects = function( sourceObjects, modelTypeRelations, showConfiguredRevision ) {
    let modelTypeRelationObject = {};
    modelTypeRelationObject.relationTypeToSources = {};
    modelTypeRelationObject.validSourceObjects = [];
    if( showConfiguredRevision && showConfiguredRevision === 'true' ) {
        var evalObjs = awConfiguredSvc.evaluateObjsConfRevRuleObjectsetPaste( sourceObjects, modelTypeRelations, showConfiguredRevision );
        sourceObjects = [];
        sourceObjects = Array.from( evalObjs );
    }
    if( sourceObjects && modelTypeRelations ) {
        _.forEach( sourceObjects, function( sourceObject ) {
            let typeHierarchy = sourceObject.modelType.typeHierarchyArray;

            for( let i = 0; i < typeHierarchy.length; i++ ) {
                let type = typeHierarchy[ i ];
                if( modelTypeRelations[ type ] ) {
                    let relationType = modelTypeRelations[ type ][ 0 ];

                    modelTypeRelationObject.relationTypeToSources[ relationType ] = modelTypeRelationObject.relationTypeToSources[ relationType ] || [];
                    modelTypeRelationObject.relationTypeToSources[ relationType ].push( sourceObject );
                    modelTypeRelationObject.validSourceObjects.push( sourceObject );
                    break;
                }
            }
        } );
    }

    return modelTypeRelationObject;
};

/**
 * Sets the display mode in command context
 *
 * @param {Object} commandContext - Command context
 * @param {String} displayMode - Display mode
 * @return {Object} Map of Object to relation type list
 */
export const updateObjectSetViewMode = function( currentDisplay, displayMode, objectSetSource ) {
    if ( objectSetSource ) {
        const simplifiedSource = objectSetSource.replace( /[^A-Z0-9]/ig, '_' );
        var objectSetViewModeContext = appCtxService.getCtx( OBJECT_SET_VIEWMODE_CONTEXT );
        if( !objectSetViewModeContext ) {
            objectSetViewModeContext = {};
        }
        objectSetViewModeContext[ simplifiedSource ] = displayMode;
        appCtxService.registerCtx( OBJECT_SET_VIEWMODE_CONTEXT, objectSetViewModeContext );
    }
    currentDisplay.update( { activeDisplay: displayMode } );
};

export default exports = {
    calculateObjectsetHeight,
    getModelTypeRelationListMap,
    getModelTypeRelationsWithValidSourceObjects,
    updateObjectSetViewMode
};
