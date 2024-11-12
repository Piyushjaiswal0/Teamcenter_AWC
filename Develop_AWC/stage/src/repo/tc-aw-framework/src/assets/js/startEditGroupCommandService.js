// Copyright (c) 2022 Siemens

/**
 * @module js/startEditGroupCommandService
 */
import editHandlerService from 'js/editHandlerService';

let exports = {};

/**
 * execute the start edit command handler
 * 
 * @param {String} handler context
 */
export let execute = function( handler, viewModeContext ) {
    // this is required to let save edit know which handler is active.
    if( !handler ) {
        handler = viewModeContext === 'TableView' || viewModeContext === 'TreeView' ? 'TABLE_CONTEXT' :
            'NONE';
    }
    editHandlerService.setActiveEditHandlerContext( handler );

    if( !editHandlerService.isEditEnabled() ) {
        var editHandler = editHandlerService.getEditHandler( handler );
        if( editHandler.canStartEdit() && !editHandler.editInProgress() ) {
            editHandler.startEdit();
        }
    }
};

export default exports = {
    execute
};
