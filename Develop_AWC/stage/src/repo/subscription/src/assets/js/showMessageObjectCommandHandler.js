// Copyright (c) 2022 Siemens

/**
 * This is the command handler for show object command which is contributed to cell list for message object.
 *
 * @module js/showMessageObjectCommandHandler
 */
import awMessageService from 'js/awMessageService';
import AwStateService from 'js/awStateService';

/**
 * Set command context for show object cell command which evaluates isVisible and isEnabled flags.
 *
 * @param {ViewModelObject} context - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} $scope - scope object in which isVisible and isEnabled flags needs to be set.
 */
export let setCommandContext = function( context, $scope ) {
    $scope.cellCommandVisiblilty = true;
};

/**
 * Execute the command.
 * <P>
 * The command context should be setup before calling isVisible, isEnabled and execute. Mark the object as read
 * before executing the command.
 *
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} dataCtxNode - scope object in which isVisible and isEnabled flags needs to be set.
 * @param {Boolean} openInEditMode - Flag to indicate whether to open in edit mode.
 */
export let execute = function( vmo, dataCtxNode, openInEditMode ) {
    if( vmo && vmo.uid ) {
        //Mark the task as read
        awMessageService.setViewedByMeIfNeeded( vmo );

        var showObject = 'com_siemens_splm_clientfx_tcui_xrt_showObject';
        var toParams = {};
        var options = {};

        toParams.uid = vmo.uid;
        options.inherit = false;

        AwStateService.instance.go( showObject, toParams, options );
    }
};

/**
 * Show object command handler service which sets the visibility of the command in cell list.
 *
 * @member showMessageObjectCommandHandler
 */
const exports = {
    setCommandContext,
    execute
};
export default exports;
