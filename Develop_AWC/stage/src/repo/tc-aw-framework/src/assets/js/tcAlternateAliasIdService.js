// Copyright (c) 2022 Siemens

/**
 * @module js/tcAlternateAliasIdService
 */
var exports = {};

export let processContexts = function( response ) {
    var contexts = [];
    if( response && response.idContextOuts.length > 0 && response.idContextOuts[ 0 ].idContexts ) {
        for( var i = 0; i < response.idContextOuts[ 0 ].idContexts.length; i++ ) {
            contexts.push( _getViewModelObject( response.idContextOuts[ 0 ].idContexts[ i ].props.object_string.uiValues[ 0 ],
                response.idContextOuts[ 0 ].idContexts[ i ].uid ) );
        }
    }
    return contexts;
};

export let processIdentifierTypes = function( response ) {
    var identifierTypes = [];
    if( response && response.identifiersOutput.length > 0 && response.identifiersOutput[ 0 ].identifierTypes ) {
        for( var i = 0; i < response.identifiersOutput[ 0 ].identifierTypes.length; i++ ) {
            var identifierType = response.identifiersOutput[ 0 ].identifierTypes[ i ];
            identifierTypes.push( _getViewModelObject( identifierType.props.object_string.uiValues[ 0 ], identifierType.uid ) );
        }
    }
    return identifierTypes;
};

export let processRevisionList = function( response ) {
    var revisions = [];
    if( response && response.identifiersOutput.length > 0 && response.identifiersOutput[ 0 ].revisions ) {
        for( var i = 0; i < response.identifiersOutput[ 0 ].revisions.length; i++ ) {
            revisions.push( _getViewModelObject( response.identifiersOutput[ 0 ].revisions[ i ].props.object_string.uiValues[ 0 ],
                response.identifiersOutput[ 0 ].revisions[ i ].uid ) );
        }
    }
    return revisions;
};

export let findSelectedRev = function( data ) {
    if( data.revision.dbValue && data.revision.dbValues.length > 0 ) {
        return { uid: data.revision.dbValue };
    }
    return data.itemRevIdentifiableObj;
};

export let createContextObjs = function( data ) {
    var contexts = [];
    if( data.contexts && data.contexts.dbValue ) {
        for( var i = 0; i < data.contexts.dbValue.length; i++ ) {
            contexts.push( { uid: data.contexts.dbValue[ i ] } );
        }
    }
    return contexts;
};
/**
 * Creates Empty list model Object .
 *
 * @return [{Object}] listModel
 */
var _getViewModelObject = function( displayName, internalValue ) {
    return {
        propDisplayValue: displayName,
        propInternalValue: internalValue,
        propDisplayDescription: '',
        hasChildren: false,
        children: {},
        sel: true
    };
};
/**
 * fetches bo name from selected identifier type.
 * @param {String} selectedIdentifier selected identifier internal value
 * @return {String} boName identifier bo name.
 */
 export let findSelectedBO = function( selectedIdentifier ) {
    var boName;
    if( selectedIdentifier && selectedIdentifier.indexOf( '::' ) > 0 ) {
        boName = selectedIdentifier.split( '::' )[ 1 ];
    }
    return boName;
};

export default exports = {
    processContexts,
    processIdentifierTypes,
    processRevisionList,
    findSelectedRev,
    findSelectedBO,
    createContextObjs
};
