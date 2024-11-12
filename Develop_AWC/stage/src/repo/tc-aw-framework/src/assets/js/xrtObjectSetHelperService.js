// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/**
 * xrtObjectSetHelperService is used to recurse through page renderings and find if any object sets qualify
 * as being 'smart' object sets.
 *
 * @module js/xrtObjectSetHelperService
 */


/**
 * Recurses through the renderings checking for a single objectset to make 'smart'
 * @param {Object} element The current rendering to examine
 * @param {Object} objectSetInfo The objectset info containing data about the objectset if found
 * @param {Object|String} parentColumn If column the element is nested in or 'global' if not in any
 * @returns {Object} The latest objectSetInfo
 */
export let recurseThroughRenderingsForMultipleObjectSets = function( element, objectSetInfo, parentColumn ) {
    let currentColumn = null;
    if( element.elementType === 'objectSet' ) {
        if( objectSetInfo.singleObjSet && objectSetInfo.objectSet ) {
            objectSetInfo.singleObjSet = false;
            objectSetInfo.objectSet = null;
            return objectSetInfo;
        }

        objectSetInfo.singleObjSet = true;
        objectSetInfo.objectSet = element;
        objectSetInfo.parentColumn = parentColumn;

        return objectSetInfo;
    } else if( element.elementType === 'column' ) {
        currentColumn = element;
    } else if( element.elementType !== 'command' ) {
        currentColumn = parentColumn;
        if( objectSetInfo.singleObjSet && objectSetInfo.parentColumn && objectSetInfo.parentColumn === currentColumn ) {
            // The ObjectSet has something after it, and it cannot be a smart ObjectSet
            objectSetInfo.hasFollowingContent = true;
        }
    }

    if( element.children ) {
        for( let i = 0; i < element.children.length; i++ ) {
            let child = element.children[ i ];
            if( objectSetInfo.singleObjSet ) {
                objectSetInfo = recurseThroughRenderingsForMultipleObjectSets( child, objectSetInfo, currentColumn );
            } else {
                break;
            }
        }
    }
    return objectSetInfo;
};

/**
 * Uses the provided page renderings to determine if there is an ObjectSet to make 'smart'
 * @param {Object} pageRenderings The page renderings provided by getDeclarativeStyleSheet
 */
export let parseRenderingsForSmartObjectSet = function( pageRenderings ) {
    let objSetInfo = {
        singleObjSet: true,
        objectSet: null,
        parentColumn: null,
        hasFollowingContent: false
    };
    for( let i = 0; i < pageRenderings.length; i++ ) {
        let currentElem = pageRenderings[ i ];
        if( objSetInfo.singleObjSet ) {
            objSetInfo = recurseThroughRenderingsForMultipleObjectSets( currentElem, objSetInfo, 'global' );
        } else {
            break;
        }
    }
    if( objSetInfo.singleObjSet && objSetInfo.objectSet && !objSetInfo.hasFollowingContent ) {
        objSetInfo.objectSet.smartObjSet = true;
    }
};

export default {
    recurseThroughRenderingsForMultipleObjectSets,
    parseRenderingsForSmartObjectSet
};
