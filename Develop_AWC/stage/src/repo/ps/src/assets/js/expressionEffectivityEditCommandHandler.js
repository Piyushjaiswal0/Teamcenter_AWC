// Copyright (c) 2022 Siemens

/**
 * This is the command handler for "Edit Expression Effectivity" cell command
 *
 * @module js/expressionEffectivityEditCommandHandler
 */
import eventBus from 'js/eventBus';
import appCtxService from 'js/appCtxService';

let exports = {};

/**
 * Execute the command.
 * @param {Object} vmo - effectivity vmo
 * @param {Object} data - data object
 */
export let execute = function( vmo ) {
    eventBus.publish( 'navigateToPs0EditEffPanel', vmo );
};

/**
 * Sets underlyingPropLoaded flag on ctx to indicate underlying properties are available.
 * @param {Object} ctx appCtx
 */
export let setUnderlyingObjectPropsLoadedFlag = function( ctx ) {
    if ( ctx.expressionEffectivity === undefined || ctx.expressionEffectivity.underlyingPropLoaded === undefined || ctx.expressionEffectivity.underlyingPropLoaded === false ) {
        appCtxService.registerPartialCtx( 'expressionEffectivity.underlyingPropLoaded', true );
    }
};

/**
 * Resets underlyingPropLoaded flag on ctx.
 * @param {Object} ctx appCtx
 */
export let resetUnderlyingObjectPropsLoadedFlag = function( ctx ) {
    if( ctx.expressionEffectivity.underlyingPropLoaded === true ) {
        ctx.expressionEffectivity.underlyingPropLoaded = false;
    }
};

/**
 * Unregister underlyingPropLoaded flag on ctx.
 */
export let unregisterUnderlyingObjectPropsLoadedFlag = function() {
    appCtxService.updatePartialCtx( 'expressionEffectivity.underlyingPropLoaded', undefined );
};


/**
 * "Edit Expression Effectivity" cell command handler factory
 *
 * @member expressionEffectivityEditCommandHandler
 */
export default exports = {
    execute,
    setUnderlyingObjectPropsLoadedFlag,
    resetUnderlyingObjectPropsLoadedFlag,
    unregisterUnderlyingObjectPropsLoadedFlag
};
