import editHandlerService from 'js/editHandlerService';

export const destroy = ( type, editHandlerContext ) => {
    removeInfoEditHandler( type, editHandlerContext );
};

export const startEdit = ( editHandler, editHandlerContext ) => {
    if( editHandler ) {
        editHandlerService.setEditHandler( editHandler, editHandlerContext );
        if( !editHandlerService.editInProgress().editInProgress ) {
            editHandlerService.setActiveEditHandlerContext( editHandlerContext );
        }
        editHandler.startEdit();
    }
};

export const saveEdit = ( editHandler, editHandlerContext ) => {
    if( editHandler ) {
        editHandler.saveEdits();
        editHandlerService.removeEditHandler( editHandlerContext );
    }
};

const removeInfoEditHandler = function( type, editHandlerContext ) {
    if( editHandlerContext[ type ] ) {
        var editHandler = editHandlerService.getEditHandler( editHandlerContext[ type ] );
        if( editHandler ) {
            editHandler.leaveConfirmation().then( function() {
                editHandlerService.removeEditHandler( editHandlerContext[ type ] );
            } );
        }
    }
};

export const cancelEdit = ( editHandler, editHandlerContext ) => {
    if( editHandler ) {
        editHandler.cancelEdits();
        editHandlerService.removeEditHandler( editHandlerContext );
    }
};
