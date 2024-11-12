// Copyright (c) 2022 Siemens

/**
 * @module js/tcDefaultPasteHandler
 */
import AwPromiseService from 'js/awPromiseService';
import adapterSvc from 'js/adapterService';
import pasteService from 'js/pasteService';
import _ from 'lodash';
import awConfiguredSvc from 'js/awConfiguredRevService';
import declUtils from 'js/declUtils';
import dmSvc from 'soa/dataManagementService';

var exports = {};

/**
 * Cached reference to adapter service
 */

/**
 * @param {String[]} sourceTypes - Object from the 'pasteConfig' specific to some 'targetObject'.
 * @param {Object} sourceObject - The 'source' IModelObject to test.
 * @return {Object} The sourceTypes object which contains the handler name and the dependent js file.
 */
export let bestSourceFit = function( sourceTypes, sourceObject ) {
    var typeHier = declUtils.getTypeHierarchy( sourceObject );

    for( var ii = 0; ii < typeHier.length; ii++ ) {
        var typeName = typeHier[ ii ];
        if( sourceTypes[ typeName ] ) {
            return sourceTypes[ typeName ];
        }
    }
    return null;
};

/**
 * Using the 'pasteConfig' provided by various AW modules, select the 'best fit' for the given 'target' IModelObject
 * based on its actual type (or the type of its nearest ancestor in the type hierarchy).
 *

 * @param {Object} targetObject - The 'target' IModelObject to test.
 *
 * @return {Object} The 'best fit' 'sourceTypes' object in the 'pasteConfig' for the given 'target' object (or NULL
 *         if no match was possible).
 */
export let bestTargetFit = function( targetObject ) {
    var targetTypes = pasteService.getTargetTypes();
    var typeHier = declUtils.getTypeHierarchy( targetObject );

    for( var ii = 0; ii < typeHier.length; ii++ ) {
        var typeName = typeHier[ ii ];
        if( targetTypes.has( typeName ) ) {
            return targetTypes.get( typeName );
        }
    }

    return null;
};

/**
 * @param {Object} targetObject - The 'target' IModelObject to use when determining which 'source' types are
 *            potentially valid to be dropped upon it.
 * @return {Object|null} The 'sourceTypes' property from the 'pasteConfig' for the given 'target' object type or its
 *         ancestor types up the hierarchy (or NULL if no match was found).
 */
export let getObjectValidSourceTypes = function( targetObject ) {
    if( targetObject.modelType || targetObject.typeHierarchy ) {
        var typeHier = declUtils.getTypeHierarchy( targetObject );

        /**
         * Starting at the 'target' object's actual type, try to find a matching 'targetType' property in the
         * 'pasteConfig'. If an exact match is not found, try the super type of the 'target' up its hierarchy tree. Stop
         * looking when the 1st one (i.e. the 'closest' one) is found.
         */
        var targetTypes = pasteService.getTargetTypes();

        for( var ii = 0; ii < typeHier.length; ii++ ) {
            var typeName = typeHier[ ii ];

            if( targetTypes.has( typeName ) ) {
                return targetTypes.get( typeName ).sourceTypes;
            }
        }
    }
    return null;
};

/**
 * Perform the 'default' configured paste behavior for the given IModelObjects onto the given 'target' IModelObject
 * creating the given relationship type between them.
 *
 * @param {Object} targetObject - The 'target' IModelObject for the paste.
 * @param {Array} sourceObjects - Array of 'source' IModelObjects to paste onto the 'target' IModelObject
 * @param {String} relationType - relation type name (object set property name)
 *
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let tcDefaultPasteHandler = function( targetObject, sourceObjects, relationType ) {
    var relations = [];
    var relationTypeToUse = relationType;

    var isRelationS2P = false;

    if( relationType ) {
        // In case objectset contains reverse relation i.e. secondary to primary ex: S2P:Cm0BeforeDependency
        // then the primary and secondary objects need to be swapped and relation needs to be converted to forward relation by removing S2P: string from start
        var tokens = relationType.split( ':' );
        if( tokens && tokens.length === 2 ) {
            isRelationS2P = true;
            relationTypeToUse = tokens[ 1 ];
        }
    }

    //use adapter service to find backing object in case targetobject is RBO
    var objectsToBeAdapted = [];
    objectsToBeAdapted.push( targetObject );
    objectsToBeAdapted = objectsToBeAdapted.concat( sourceObjects );
    return adapterSvc.getAdaptedObjects( objectsToBeAdapted ).then( function( adaptedObjs ) {
        if( adaptedObjs && adaptedObjs.length > 1 ) {
            var targetObj = adaptedObjs[ 0 ];
            var sourceObjs = adaptedObjs.slice( 1 );
            _.forEach( sourceObjs, function( sourceObject ) {
                if( sourceObject !== null ) {
                    if( isRelationS2P ) {
                        targetObj = awConfiguredSvc.evaluateObjsBasedOnConfiguredRevRuleForPaste( sourceObject, targetObj, relationTypeToUse )[ 0 ];
                        relations.push( {
                            primaryObject: sourceObject,
                            secondaryObject: targetObj,
                            relationType: relationTypeToUse
                        } );
                    } else {
                        sourceObject = awConfiguredSvc.evaluateObjsBasedOnConfiguredRevRuleForPaste( targetObj, sourceObject, relationTypeToUse )[ 0 ];
                        relations.push( {
                            primaryObject: targetObj,
                            secondaryObject: sourceObject,
                            relationType: relationTypeToUse
                        } );
                    }
                }
            } );

            return dmSvc.createRelations( relations );
        }
        return AwPromiseService.instance.reject( 'Invalid response received' );
    } );
};

export default exports = {
    bestSourceFit,
    bestTargetFit,
    getObjectValidSourceTypes,
    tcDefaultPasteHandler
};
