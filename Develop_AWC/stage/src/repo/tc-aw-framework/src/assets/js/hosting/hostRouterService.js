// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/hostRouterService
 * @namespace hostRouterService
 */
import hostConfigKeys from 'js/hosting/hostConst_ConfigKeys';
import hostRouterSvc from 'js/hosting/sol/services/hostRouter_2020_01';
import hostConfigSvc from 'js/hosting/hostConfigService';
import { isStateChangeStartEvent } from 'js/leavePlace.service';
import AwStateService from 'js/awStateService';

/**
 * make a shallow copy of the object
 *
 * @member hostRouterService
 * @memberof NgServices
 *
 * @param {Object} object - object to be copied
 *
 * @returns {Object} a copy of the object's first set of properties
 */
function _shallowCopy( object ) {
    var copy = {};
    var key;

    for( key in object ) {
        if( typeof object[ key ] !== 'object' ) {
            copy[ key ] = object[ key ];
        }
    }
    return copy;
}

var exports = {};

/**
 * Finish initilization of this service now that hostign has started.
 *
 * @memberof hostSelectionService
 *
 */
export let initialize = () => {
    AwStateService.instance.transitionHooks.onBefore( {}, ( transition ) => {
        if( isStateChangeStartEvent( transition ) ) {
            var fromStateShallow = _shallowCopy( transition.from() );
            var fromParamsShallow = _shallowCopy( transition.params( 'from' ) );
            var toStateShallow = _shallowCopy( transition.to() );
            var toParamsShallow = _shallowCopy( transition.params( 'to' ) );
            var optionsShallow = _shallowCopy( transition.options );

            hostRouterSvc.createHostRouterProxy().sendURLChange( hostRouterSvc.createHostRouterMsg( fromStateShallow, fromParamsShallow, toStateShallow, toParamsShallow, optionsShallow ) );
            if( !hostConfigSvc.getOption( hostConfigKeys.ALLOW_CHANGE_LOCATION ) && !transition.params( 'from' ).abstract ) {
                return false;
            }
        }
    } );
};
