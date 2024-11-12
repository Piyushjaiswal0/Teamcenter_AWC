// Copyright (c) 2022 Siemens

/**
 * Special service to execute a hard reload by opening current app in new tab and closing the current tab
 *
 * @module js/hardReload.service
 */
import appCtxService from 'js/appCtxService';
import preferenceSvc from 'soa/preferenceService';
import editHandlerSvc from 'js/editHandlerService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import browserUtils from 'js/browserUtils';

let exports = {};

export let init = function() {
    //check for IE browser, non-hosting mode and existence of TC preference
    if( browserUtils.isNonEdgeIE && !appCtxService.getCtx( 'aw_hosting_enabled' ) ) {
        eventBus.subscribe( 'bulkPreferencesLoaded', function() {
            preferenceSvc.getStringValue( 'AWC_HARD_LOAD_COUNT' ).then( function( prefValue ) {
                if( prefValue && parseInt( prefValue ) > 0 ) {
                    //get reload interval from the preference and subscribe to the event
                    exports.hardReloadInterval = parseInt( prefValue );
                    exports.hardLoadChangeCount = 0;
                    eventBus.subscribe( 'LOCATION_CHANGE_COMPLETE', exports.pingExecuteHardReload );
                }
            } );
        } );
    }
};

export let pingExecuteHardReload = _.debounce( function() {
    exports.hardLoadChangeCount++;
    if( exports.hardLoadChangeCount >= exports.hardReloadInterval ) {
        //Make sure any edits are finished
        editHandlerSvc.leaveConfirmation().then( function() {
            var openLink = window.open( '', '_blank' );
            openLink.location = window.location.href;
            window.open( '', '_self', '' );
            window.close();
        } );
    }
}, 250 );

export default exports = {
    init,
    pingExecuteHardReload
};
