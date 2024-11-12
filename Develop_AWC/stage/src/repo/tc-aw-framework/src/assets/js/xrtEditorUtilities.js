// Copyright (c) 2022 Siemens

/**
 * @module js/xrtEditorUtilities
 */

import soaService from 'soa/kernel/soaService';
import AwPromiseService from 'js/awPromiseService';

let exports = {};
export const loadXRTFromContext = ( context ) => {
    let deferred = AwPromiseService.instance.defer();
    soaService.postUnchecked( 'Internal-AWS2-2016-03-DataManagement', 'getStyleSheet2', {
        processEntireXRT: false,
        input: [ {
            businessObject: context.modelObject,
            businessObjectType: context.objectType,
            styleSheetType: context.styleSheetType || 'SUMMARY',
            clientContext: context.clientContext
        } ]
    } ).then( function( response ) {
        deferred.resolve( response.output[ 0 ].context );
    }, function() {
        deferred.resolve();
    } );
    return deferred.promise;
};

export const loadXRT = ( type, stylesheetType, preferenceLocation, client, location, sublocation ) => {
    let deferred = AwPromiseService.instance.defer();
    if( type.includes( '::' ) ) {
        type = type.split( '::' )[1];
    }
    let request = {
        type: type,
        stylesheetType: stylesheetType,
        preferenceLocation: preferenceLocation,
        client: client,
        location: location,
        sublocation: sublocation
    };

    soaService.postUnchecked( 'Internal-AWS2-2016-03-DataManagement', 'getUnprocessedXRT', request ).then(
        function( response ) {
            deferred.resolve( response.dsInfo );
        },
        function() {
            deferred.resolve();
        } );

    return deferred.promise;
};

export default exports = {
    loadXRTFromContext,
    loadXRT
};
