// Copyright (c) 2022 Siemens

/**
 * This service is to cater to various usecases of configured Revision
 *
 * @module js/awConfiguredRevService
 */
import cdm from 'soa/kernel/clientDataModel';
import _cmm from 'soa/kernel/clientMetaModel';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';

var exports = {};

/**
 * Return showConfiguredRev flag.
 *
 * @return {String} showConfigredRev flag.
 */
export let getShowConfiguredRev = function( addObjectContext ) {
    let showConfiguredRev = 'false';
    let addObject;
    if( addObjectContext ) {
        addObject = addObjectContext;
    } else {
        addObject = appCtxService.ctx.addObject;
    }
    let selected = appCtxService.getCtx( 'selected' );
    if( addObject && addObject.targetObject && selected &&
        addObject.targetObject.uid === selected.uid && addObject.showConfiguredRevision ) {
        showConfiguredRev = addObject.showConfiguredRevision;
    }
    return showConfiguredRev;
};

/**
 * @param {ObjectArray} filteredClipboardObjects - the object clipboard directive has filtered based on the filterTypes
 * @return {ObjectArray} object Array result that has no Items or its subtypes except the one listed in [AWC_use_item_not_configured_rev] preference
 */
export let filterClipboardObjectsForConfRev = function( filteredClipboardObjects ) {
    var showItemsList = [];
    var showItemsNotConfRevTypes = [];
    if( appCtxService.ctx.preferences.AWC_use_item_not_configured_rev ) {
        showItemsNotConfRevTypes = appCtxService.ctx.preferences.AWC_use_item_not_configured_rev;
    }
    showItemsList = _.filter( filteredClipboardObjects, function( showItem ) {
        return _.intersection( showItemsNotConfRevTypes, showItem.modelType.typeHierarchyArray ).length > 0;
    } );
    filteredClipboardObjects = _.filter( filteredClipboardObjects, function( sourceObject ) {
        return _.difference( [ 'Item' ], sourceObject.modelType.typeHierarchyArray ).length > 0;
    } );
    return _.union( showItemsList, filteredClipboardObjects );
};

/**
 * evaluate the actual object to be related
 * @param {ObjectArray} objectsToEvaluateForExactRelation - the object for which exact relate object needs to be evaluated for
 * @param {Object} addObjectContext - the context object used for add use cases
 * @return {ObjectArray} evaluatedObjsToRelate - array of object to be related based on configured revision
 */
export let evaluateObjsBasedOnConfiguredRevRule = function( objectsToEvaluateForExactRelation, addObjectContext ) {
    let evaluatedObjsToRelate = [];
    addObjectContext = addObjectContext ? addObjectContext : appCtxService && appCtxService.ctx && appCtxService.ctx.addObject;

    if( addObjectContext ) {
        let evalResult = checkForConditions( addObjectContext.typeFilterNames, addObjectContext.showConfiguredRevision );
        evaluatedObjsToRelate = Array.from( getEvaluatedObjs( evalResult, objectsToEvaluateForExactRelation ) );
    } else {
        evaluatedObjsToRelate = objectsToEvaluateForExactRelation;
    }
    return evaluatedObjsToRelate;
};

/**
 * evaluate the actual object to be related during an objectset paste
 * @param {ObjectArray} sourceObjects - objects for which exact relate object needs to be evaluated for
 * @param {Map} modelTypeRelations - map of secondary object and relation
 * @param {String} showConfiguredRevision - whether configured revision is enabled on objectset
 * @return {ObjectArray} evaluatedObjsToRelate - array of object to be related based on configured revision
 */
export let evaluateObjsConfRevRuleObjectsetPaste = function( sourceObjects, modelTypeRelations, showConfiguredRevision ) {
    let evaluatedObjsToRelate = [];
    if( sourceObjects && modelTypeRelations && showConfiguredRevision ) {
        var typeFilterNames = Object.keys( modelTypeRelations ).join( ',' );
        let evalResult = checkForConditions( typeFilterNames, showConfiguredRevision );
        evaluatedObjsToRelate = Array.from( getEvaluatedObjs( evalResult, sourceObjects ) );
    }
    return evaluatedObjsToRelate;
};

/**
 * private function to prepare the output structure
 * @param {Object} evalResult - Object structure
 * @param {ObjectArray} sourceObjects - objects for which exact relate object needs to be evaluated for
 * @return {ObjectArray} finalObjs - array of objects to be related based on configured revision
 */
let getEvaluatedObjs = function( evalResult, sourceObjects ) {
    var finalObjs = [];
    _.forEach( sourceObjects, function( eachSourceObj ) {
        if( eachSourceObj.modelType.typeHierarchyArray.includes( 'ItemRevision' ) ) {
            if( evalResult.shouldRetrieveItem ) {
                finalObjs.push( getItemObjectFromItemRev( eachSourceObj ) );
            } else if( evalResult.shouldFolderRulesBeApplied ) {
                finalObjs.push( getObjectBasedOnFolderRules( eachSourceObj ) );
            } else {
                finalObjs.push( eachSourceObj );
            }
        } else {
            finalObjs.push( eachSourceObj );
        }
    } );
    return finalObjs;
};

/**
 * Evaluate if objectset (relate Item) rule or Folder rules is to be applied based on typeFilterNames and showConfiguredRev Flag
 * priority is given to source as 'Item' and then an instance of 'WorkspaceObject' (excluding ItemRevision types );
 * For all other source types including 'ItemRevision, relate whatever is being created
 *
 * @param {String} typeFilterNames - typeFilterNames from objectset source / default source
 * @param {String } showConfiguredRevisionFlag - if configured revision is to be shown
 * @return {Object} evalCond - JS Object containing the 2 information
 */
let checkForConditions = function( typeFilterNames, showConfiguredRevisionFlag ) {
    let shouldRetrieveItem = false;
    let shouldFolderRulesBeApplied = false;
    let evalCond = {
        shouldRetrieveItem: false,
        shouldFolderRulesBeApplied: false
    };
    if( showConfiguredRevisionFlag && showConfiguredRevisionFlag === 'true' && typeFilterNames ) {
        let typeFilterNamesArr = typeFilterNames.split( ',' );
        let itemCount = 0;
        _.forEach( typeFilterNamesArr, function( typeFilterName ) {
            var modelType = _cmm.getType( typeFilterName );
            if( modelType && _cmm.isInstanceOf( 'Item', modelType ) ) {
                itemCount++;
                shouldRetrieveItem = true;
                return;
            }
        } );
        // If an 'Item' or subtype doesn't exist in the typeFilterNames, look for WSO, exclude 'ItemRevision' types and ignore all typeFilterNames
        if( itemCount === 0 ) {
            _.forEach( typeFilterNamesArr, function( typeFilterName ) {
                var modelType = _cmm.getType( typeFilterName );
                //check if there are non-ItemRevision types and WSO instance in typeFilterNames, if there exists one, Folder rules to be applied
                if( modelType && _cmm.isInstanceOf( 'WorkspaceObject', modelType ) && !_cmm.isInstanceOf( 'ItemRevision', modelType ) ) {
                    shouldFolderRulesBeApplied = true;
                    return;
                }
            } );
        }
        evalCond = {
            shouldRetrieveItem: shouldRetrieveItem,
            shouldFolderRulesBeApplied: shouldFolderRulesBeApplied
        };
    }
    return evalCond;
};

/**
 * evaluate the actual object to be related during a Paste operation from Add panel , paste command or DnD to a Folder
 * @param {Object} primaryObject - the primary object
 * @param {Object} secondaryObject - the secondary object
 * @param {String} relationInfo - relation with which paste is taking place after an Add, Paste or DnD action
 * @return {ObjectArray} evaluatedObjsToRelate
 */
export let evaluateObjsBasedOnConfiguredRevRuleForPaste = function( primaryObject, secondaryObject, relationInfo ) {
    let evaluatedObjsToRelate = [];
    if( primaryObject && primaryObject.modelType && secondaryObject ) {
        if( primaryObject.modelType.typeHierarchyArray.includes( 'Folder' ) && relationInfo === '' ) { // Paste triggered through drag and drop to a Folder ; evaluation not done through addObjectContext  , hence evaluation required
            if( appCtxService && appCtxService.ctx && appCtxService.ctx.preferences && appCtxService.ctx.preferences.AWC_display_configured_revs_for_pwa && appCtxService.ctx.preferences
                .AWC_display_configured_revs_for_pwa[ 0 ].toLowerCase() !== 'false' ) {
                evaluatedObjsToRelate.push( getObjectBasedOnFolderRules( secondaryObject ) );
            } else {
                evaluatedObjsToRelate.push( secondaryObject );
            }
        } else {
            evaluatedObjsToRelate.push( secondaryObject );
        }
    } else {
        evaluatedObjsToRelate.push( secondaryObject );
    }
    return evaluatedObjsToRelate;
};

/**
 * evaluate the actual object based on whether the relation is done on a target 'Folder'
 * @param {Object} sourceObj - source object against which evaluation is to be done
 * @return {Object} evaluatedObj - evaluated Object to relate
 */
let getObjectBasedOnFolderRules = function( sourceObj ) {
    var evaluatedObj = sourceObj;
    if( sourceObj.modelType.typeHierarchyArray.includes( 'ItemRevision' ) ) {
        //check if configured revision is being related
        if( isObjectAConfiguredRev( sourceObj ) ) {
            evaluatedObj = getItemObjectFromItemRev( sourceObj );
        } else {
            evaluatedObj = sourceObj;
        }
    }
    return evaluatedObj;
};

/**
 * evaluate if the object is a configured revision
 * @param {Object} sourceObj - source object against which evaluation is to be done
 * @return {bool} bool - true or false
 */
let isObjectAConfiguredRev = function( sourceObj ) {
    let bool = false;
    if( sourceObj && sourceObj.props && sourceObj.props.awp0ConfiguredRevision ) {
        if( sourceObj.props.awp0ConfiguredRevision.dbValues[ 0 ] === '' ) {
            bool = true;
        }
    }
    return bool;
};
/**
 * Get the Item/subtype object from ItemRevision/subtype
 * @param {Object} sourceObj - source object against which evaluation is to be done
 * @return {Object} itemObj - Item object for the ItemRevision type
 */
let getItemObjectFromItemRev = function( sourceObj ) {
    let itemObj = sourceObj;
    if( sourceObj && sourceObj.props && sourceObj.props.items_tag && sourceObj.props.items_tag.dbValues[ 0 ] ) {
        itemObj = cdm.getObject( sourceObj.props.items_tag.dbValues[ 0 ] );
    }
    return itemObj;
};
/**
 * evaluate the objects to be selected after a successful Add/Paste operation
 * @param {ObjectArray} inputObjects - array of input objects supplied for selection evaluation
 * @param {ObjectArray} loadedVMOs - response
 * @return {ObjectArray} final object/(s) to be selected
 */
export let getEvaluatedObjsForSelection = ( inputObjects, loadedVMOs ) => {
    let inputObjs = getWSOSubtypesForCreatedObjs( inputObjects );
    let evaluatedObjs = [];
    _.forEach( inputObjs, obj => {
        if( !_.isUndefined( obj.alternateID ) ) {
            _.forEach( loadedVMOs, vmo => {
                if( obj.alternateID === vmo.alternateID ) {
                    evaluatedObjs.push( obj );
                    return false;
                }
            } );
        } else {
            _.forEach( loadedVMOs, vmo => {
                if( obj.uid === vmo.uid ) {
                    evaluatedObjs.push( vmo );
                    return false;
                }
            } );
        }
    } );
    if( evaluatedObjs.length > 0 ) {
        return {
            evaluatedObjs: evaluatedObjs,
            objsFound: true
        };
    }
    return {
        evaluatedObjs: inputObjects,
        objsFound: false
    };
};
/**
 * evaluate all the WSO Subtypes for the createdObjects ; push both Item and ItemRev type for the createdObjects(if input is of either type)
 * and non-Item/non-ItemRev type (eg Dataset, Folder etc) so that
 * the right object can be later evaluated against the loadedVMOs and then passes to selectionModel for selection
 * @param {ObjectArray} inputObjects - array of input objects to evaluate all WSO subtypes
 * @return {ObjectArray} finalObjs - final evaluated objects for the input objects
 */
export let getWSOSubtypesForCreatedObjs = ( inputObjects ) => {
    let finalObjs = [];
    _.forEach( inputObjects, obj => {
        let tempObj = obj;
        if( !_.isUndefined( obj.alternateID ) ) {
            tempObj = getEvaluatedObjUpdatedWithAltId( obj );
        } else {
            if( obj.props && obj.props.revision_list && obj.props.revision_list.dbValues ) {
                tempObj = getAllRevObjsForItemType( obj );
            } else {
                tempObj = getItemObjectFromItemRev( obj );
            }
        }
        if( _.isArray( tempObj ) ) {
            _.forEach( tempObj, x => {
                finalObjs.push( x );
            } );
        } else {
            finalObjs.push( tempObj );
        }
        finalObjs.push( obj );
    } );

    return _.uniq( finalObjs );
};

/**
 * evaluate the actual object based on whether the relation is done on a target 'Folder'
 * @param {Object} obj - source object for which alternateID needs to be tweaked
 * @return {Object} val - updated alternateID
 */
let getEvaluatedObjUpdatedWithAltId = obj => {
    let val = obj;
    let altId = obj.alternateID;
    let x = altId.substring( altId.indexOf( ',' ), altId.length );
    if( obj && obj.props && obj.props.items_tag && obj.props.items_tag.dbValues[ 0 ] ) {
        let itemObj = cdm.getObject( obj.props.items_tag.dbValues[ 0 ] );
        itemObj.alternateID = itemObj.uid.concat( x );
        val = itemObj;
    } else if( obj.props && obj.props.revision_list && obj.props.revision_list.dbValues ) {
        let itemRevObjs = getAllRevObjsForItemType( obj );
        itemRevObjs.map( revObj => {
            revObj.alternateID = revObj.uid.concat( x );
        } );
        val = itemRevObjs;
    }
    return val;
};

/**
 * Get all the ItemRev/subtype objects from given Item/subtype
 * @param {Object} sourceObj - source object against which evaluation is to be done
 * @return {ObjectArray} allRevs - ItemRevision type objects
 */
let getAllRevObjsForItemType = sourceObj => {
    let allRevs = [];
    if( sourceObj && sourceObj.props && sourceObj.props.revision_list && sourceObj.props.revision_list.dbValues ) {
        let revUids = sourceObj.props.revision_list.dbValues;
        _.forEach( revUids, revUid => {
            allRevs.push( cdm.getObject( revUid ) );
        } );
    }
    return allRevs;
};

export default exports = {
    getShowConfiguredRev,
    filterClipboardObjectsForConfRev,
    evaluateObjsBasedOnConfiguredRevRule,
    evaluateObjsConfRevRuleObjectsetPaste,
    evaluateObjsBasedOnConfiguredRevRuleForPaste,
    getWSOSubtypesForCreatedObjs,
    getEvaluatedObjsForSelection
};
