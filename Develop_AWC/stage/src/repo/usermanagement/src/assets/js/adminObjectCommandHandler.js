// Copyright (c) 2022 Siemens

/**
 * This is the command handler for navigate admin object command which is contributed to cell list. This handler
 * provides command visibility and execution logic.
 *
 * @module js/adminObjectCommandHandler
 */
import eventBus from 'js/eventBus';
import AwStateService from 'js/awStateService';

var exports = {};

export let getState = function() {
    return AwStateService.instance;
};

/**
 * Set command context for navigate object command which evaluates isVisible and isEnabled flags
 *
 * @param {ViewModelObject} context - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 */
export let execute = function( context ) {
    //Route the request and let appropriate listeners react to it
    var stateSvc = this.getState();
    if( context && context.uid ) {
        var selectedObjUid = context.uid;
        var toParams = {};

        if( stateSvc && stateSvc.params ) {
            var newD_uid = '';
            var d_uid = stateSvc.params.d_uids;

            if( d_uid ) {
                // This command can be executed from cellist in Navigate sublocation or bread crumb widget
                // Check if the parent uid is part of d_uid and take appropriate action as per algo below:
                //  Case 1 :
                //    parent   uid = C
                //    modelObj uid = D
                //      d_uid      = A^B^C
                //      new d_uid  = A^B^C^D
                //  Case 2 :
                //    parent   uid = B
                //    modelObj uid = X
                //      d_uid      = A^B^C^D^E
                //      new d_uid  = A^B^X
                //
                //  Case 3 : User clicks on the navigate command multiple times in quick succession
                //    parent   uid = D
                //    modelObj uid = E
                //      d_uid      = A^B^C^D^E
                //      new d_uid  = A^B^C^D^E
                //build regex from the delimiter and split the d_uids

                var d_uidsArray = d_uid.split( '^' );

                for( var counter = 0; counter < d_uidsArray.length; counter++ ) {
                    if( counter > 0 ) {
                        newD_uid += '^';
                    }

                    newD_uid += d_uidsArray[ counter ];
                }
                //selected obj uid can be already in d_uid if user has clicked the command in quick succession
                if( newD_uid.lastIndexOf( selectedObjUid ) < 0 ) {
                    newD_uid += '^';
                    newD_uid += selectedObjUid;
                }
            } else {
                newD_uid = selectedObjUid;
            }

            toParams.d_uids = newD_uid;

            stateSvc.go( stateSvc.current.name, toParams );

            eventBus.publish( 'breadcrumb.update', {} );
        }
    }
};

export default exports = {
    getState,
    execute
};
