// Copyright (c) 2022 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/openInVisualizationProductContextInfoProvider
 */
import appCtxService from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import selectionSvc from 'js/selection.service';
import _ from 'lodash';
import cdm from 'soa/kernel/clientDataModel';

var productContextInfoProviderFn = undefined;
var exports = {};

/**
 * Set function on current service that would return the intended product context for VIS.
 *
 * @param { Function } registerFuntion JS function that returns an object containing "productContextInfo"
 */
export let registerProductContextToLaunchVis = function( registerFuntion ) {
    if( registerFuntion && typeof registerFuntion === 'function' ) {
        productContextInfoProviderFn = registerFuntion;
    }
};

/**
 * Reset current service function attribute to 'null'
 */
export let resetProductContextInfo = function() {
    if( productContextInfoProviderFn ) {
        productContextInfoProviderFn = undefined;
    }
};

/**
 * Get product context info. if alternate Product context info available, returns alternate configuration
 * @returns {Object} product context info
 */
let getProductContextInfo = function() {
    let occmgmtActiveContext = appCtxService.getCtx( 'aceActiveContext' );
    let occmgmtContextKey = occmgmtActiveContext && occmgmtActiveContext.key ? occmgmtActiveContext.key : 'occmgmtContext';
    let occmgmtContext =  appCtxService.getCtx( occmgmtContextKey );
    let pciModelObj = occmgmtContext.productContextInfo;
    if( pciModelObj && pciModelObj.props.awb0AlternateConfiguration ) {
        let alternatePCIUid = pciModelObj.props.awb0AlternateConfiguration.dbValues[ 0 ];
        if( !_.isNull( alternatePCIUid ) && !_.isUndefined( alternatePCIUid ) && !_.isEmpty( alternatePCIUid ) ) {
            return cdm.getObject( alternatePCIUid );
        }
    }
    return pciModelObj;
};

/**
 * Gets product launch info
 *  @return {Promise} Resolves to ProductLaunchInfo.
 */
export let getProductLaunchInfo = function() {
    var deferred = AwPromiseService.instance.defer();

    if( productContextInfoProviderFn !== undefined ) {
        productContextInfoProviderFn().then( function( productLaunchInfo ) {
            deferred.resolve( productLaunchInfo );
        } );
    } else {
        // User did not open assembly in Viewer.
        let selectedObjects = selectionSvc.getSelection().selected;
        let productLaunchInfo = [ {
            productContextInfo:getProductContextInfo(),
            selections: selectedObjects
        } ];
        deferred.resolve( productLaunchInfo );
    }
    return deferred.promise;
};

export default exports = {
    registerProductContextToLaunchVis,
    resetProductContextInfo,
    getProductLaunchInfo
};
