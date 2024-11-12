// Copyright (c) 2022 Siemens

/**
 * Defines {@link layoutService} which manages layouts.
 *
 * @module js/layout.service
 */
import appCtxService from 'js/appCtxService';
import commandLabelToggleService from 'js/commandLabelToggleService';
import localStorage from 'js/localStorage';
import eventBus from 'js/eventBus';

let exports = {};

/**
 * Layout context
 */
var layoutContext = 'layout';

/**
 * Initialize the layout service
 */
export let init = function() {
    localStorage.subscribe( layoutContext, function( event ) {
        exports.setLayout( event.newValue );
    } );
    exports.setInitialLayout();

    eventBus.subscribe( 'bulkPreferencesLoaded', function() {
        if( appCtxService && appCtxService.ctx && appCtxService.ctx.preferences && appCtxService.ctx.preferences.AW_show_command_labels ) {
            var prefLabelState = appCtxService.ctx.preferences.AW_show_command_labels;
            commandLabelToggleService.initializeShowLabelContext();
            if( prefLabelState && prefLabelState.length > 0 && prefLabelState[ 0 ].toUpperCase() === 'TRUE' ) {
                commandLabelToggleService.toggle( true, false );
            } else {
                commandLabelToggleService.toggle( false, false );
            }
        }
    } );
};

/**
 * Set the layout to the layout in local storage or the default layout
 */
export let setInitialLayout = function() {
    var localLayout = exports.getLocalStorageLayout();
    if( localLayout ) {
        exports.setLayout( localLayout );
    } else {
        exports.setLayout( exports.getDefaultLayout() );
    }
};

/**
 * Get the current layout from local storage
 *
 * @return {String} The layout in local storage
 */
export let getLocalStorageLayout = function() {
    return localStorage.get( layoutContext );
};

/**
 * Get the default layout defined by the workspace
 *
 * @return {String} The default workspace layout
 */
export let getDefaultLayout = function() {
    return 'comfy';
};

/**
 * Set the current layout
 *
 * @example layoutService.setLayout( 'comfy' )
 *
 * @param newLayout {String} - The new layout
 */
export let setLayout = function( newLayout ) {
    if( exports.getLayout() !== newLayout ) {
        document.body.classList.remove( exports.getLayout() );
        document.body.classList.add( newLayout );
        appCtxService.registerCtx( layoutContext, newLayout );
        localStorage.publish( layoutContext, newLayout );
        var rowHeight = newLayout === 'compact' ? 24 : 32;
        eventBus.publish( 'LayoutChangeEvent', {
            layout: newLayout,
            rowHeight: rowHeight
        } );
    }
};

/**
 * Get the current layout
 *
 * @return {String} The current layout
 */
export let getLayout = function() {
    return appCtxService.getCtx( layoutContext );
};

export default exports = {
    init,
    setInitialLayout,
    getLocalStorageLayout,
    getDefaultLayout,
    setLayout,
    getLayout
};
