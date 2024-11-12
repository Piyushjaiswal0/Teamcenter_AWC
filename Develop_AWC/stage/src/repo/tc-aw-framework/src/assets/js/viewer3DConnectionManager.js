// Copyright (c) 2022 Siemens

/**
 * Defines {@link NgServices.viewer3DConnectionManager} manages the lifecycle of viewer connections
 *
 * @module js/viewer3DConnectionManager
 */
import viewerContextService from 'js/viewerContext.service';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import $ from 'jquery';
import appCtxSvc from 'js/appCtxService';

let exports = {};
let doExportDocumentEvent = null;
let beforeUnloadEventHandlerRegistered = false;
let downloadFileCommandEvent = null;
const SKIP_BEFOREUNLOAD_EXECUTION = 'viewer.skipBeforeUnloadExecution';

/**
  * Register browser unload listener
  */
export let registerBrowserUnloadListener = () => {
    if( !beforeUnloadEventHandlerRegistered ) {
        beforeUnloadEventHandlerRegistered = true;
        registerListenerToListenWindowOpenCommands();
        let viewerCtx = appCtxSvc.getCtx( 'viewer' );
        if( !viewerCtx ) {
            appCtxSvc.registerCtx( 'viewer', {
                skipBeforeUnloadExecution: false
            } );
        } else {
            appCtxSvc.updatePartialCtx( SKIP_BEFOREUNLOAD_EXECUTION, false );
        }
        $( window ).on( 'beforeunload', () => {
            let skipBeforeUnloadExecution = appCtxSvc.getCtx( SKIP_BEFOREUNLOAD_EXECUTION );
            if( skipBeforeUnloadExecution ) {
                appCtxSvc.updatePartialCtx( SKIP_BEFOREUNLOAD_EXECUTION, false );
            } else {
                viewerContextService.handleBrowserUnload( true );
            }
        } );
    }
};

const registerListenerToListenWindowOpenCommands = () => {
    if( doExportDocumentEvent === null ) {
        doExportDocumentEvent = eventBus.subscribe( 'exportToOfficeUtil.doExportDocumentEvent', () => {
            appCtxSvc.updatePartialCtx( SKIP_BEFOREUNLOAD_EXECUTION, true );
        }, 'viewer3DConnectionManager' );
    }
    if( downloadFileCommandEvent === null ) {
        downloadFileCommandEvent = eventBus.subscribe( 'dataset.checkIsDSMUsable', ()=>{
            appCtxSvc.updatePartialCtx( SKIP_BEFOREUNLOAD_EXECUTION, true );
        }, 'viewer3DConnectionManager' );
    }
};


export default exports = {
    registerBrowserUnloadListener
};
