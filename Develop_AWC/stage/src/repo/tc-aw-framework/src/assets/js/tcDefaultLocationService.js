// Copyright (c) 2022 Siemens

/**
 * @module js/tcDefaultLocationService
 */
import appCtxService from 'js/appCtxService';
import soa_kernel_propertyPolicyService from 'soa/kernel/propertyPolicyService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

export let resolvePropertyPolicy = function( propertyPolicy ) {
    if( propertyPolicy ) {
        var propPolicyId;
        var tcLocContLoadedSub = eventBus.subscribe( 'tcLocation.contentUnloaded', function() {
            soa_kernel_propertyPolicyService.unregister( propPolicyId );
            eventBus.unsubscribe( tcLocContLoadedSub );
        } );
        return soa_kernel_propertyPolicyService.registerPolicyAsync( propertyPolicy ).then( function( propertyPolicyId ) {
            propPolicyId = propertyPolicyId;
        } );
    }
};

export let refreshSearchProviders = _.debounce( function() {
    //Debounce as this will be called multiple times as context changes.
    var searchFilterMap = appCtxService.getCtx( 'search.filterMap' );
    var searchFilterCategories = appCtxService.getCtx( 'search.filterCategories' );

    eventBus.publish( 'updateFilterPanel', {} );
    eventBus.publish( 'refreshBreadCrumb', {
        searchFilterCategories: searchFilterCategories,
        searchFilterMap: searchFilterMap
    } );
}, 100 );

export default exports = {
    resolvePropertyPolicy,
    refreshSearchProviders
};
