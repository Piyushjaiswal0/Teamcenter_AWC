// Copyright (c) 2022 Siemens

/**
 * This is the command handler for edit in table
 *
 * @module js/startEditTableCommandHandler
 */
import editHandlerService from 'js/editHandlerService';

var exports = {};

/**
 * Execute the command.
 * <P>
 * The command context should be setup before calling isVisible, isEnabled and execute.
 *
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 */
export let execute = function( vmo ) {
    console.log( 'start edit table' );
    if( !editHandlerService.isEditEnabled() ) {
        var editHandler = editHandlerService.getEditHandler( 'TABLE_CONTEXT' );
        if( editHandler.canStartEdit() && !editHandler.editInProgress() ) {
            editHandler.startEdit();
        }
    }
};

export default exports = {
    execute
};
