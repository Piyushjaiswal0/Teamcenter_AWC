// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * This service is for aw content filtering.
 *
 * @module js/awContentFilter
 */

var exports = {};

/**
 * Determine if object's uid ( or underlying object ) is the same as uid paramter.
 *
 * @param {ViewModelObject} vmo - test object for underlying object
 * @param {String} uid - uid to test object for
 * @returns {Boolean} true if vmo contains uid
 */
export let isIdOfObject = function( vmo, uid ) {
    if( vmo && uid ) {
        if( vmo.type === "Awp0XRTObjectSetRow" ) {
            if( vmo.props.awp0Target && vmo.props.awp0Target.dbValue ) {
                return vmo.props.awp0Target.dbValue === uid;
            }
        }
        return vmo && vmo.uid && vmo.uid === uid;
    }
    return false;
};

export default exports = {
    isIdOfObject
};
