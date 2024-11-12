// Copyright (c) 2022 Siemens

/**
 * service for toggling the labels
 *
 * @module js/commandLabelToggleService
 */
import appCtxSvc from 'js/appCtxService';
import _soaSvc from 'soa/kernel/soaService';
import eventBus from 'js/eventBus';
import _ from 'lodash';

var exports = {};

var SHOW_COMMAND_LABEL_PREF = 'AW_show_command_labels';
var toggleLabelCtx = 'toggleLabel';
var toggleLabelClass = 'aw-commands-showIconLabel';


/**
 * Execute the command.
 */
export let toggle = function( newState, updatePref ) {
    var newStates = [];
    newStates.push( newState.toString() );

    if( newState ) {
        appCtxSvc.registerCtx( toggleLabelCtx, newState );
        document.body.classList.add( toggleLabelClass );
    } else {
        appCtxSvc.updateCtx( toggleLabelCtx, newState );
        document.body.classList.remove( toggleLabelClass );
    }

    if( updatePref ) {
        setLabelPreferenceAtLocation( newStates );
    }
};

/**
 * Sets up subscription. Priority is User preference/workspace override/ Site preference
 */
export const initializeShowLabelContext = async function() {
    // Apply workspace override if it exists
    handleWorkspaceLabelsSetting();
};

/**
 * API to handler workspace updates in ctx. When workspace is updated this api
 * will check for a workspace level label override.
 * 1. If the workspace override exists and there is no user level preference for AW_show_command_labels, workspace override value  will be applied.
 * 2. If workspace override exists and there is already an user level preference for AW_show_command_labels, preference value will be applied.
 * 3. If there is no workspace level override, it will be based on preference value (User level if it exists else site level)
 * Priority order in which label setting is applied :
 * - User Level preference
 * - Workspace setting
 * - Site level preference
 */
const handleWorkspaceLabelsSetting = function() {
    // Overwrite overwrite and hide label toggle if workspace override exists
    eventBus.subscribe( 'appCtx.update', function( event ) {
        if( event.name === 'workspace' ) {
            let labelToggleWorkspaceValue = _.get( event.value, 'settings.showCommandLabel' );
            if( labelToggleWorkspaceValue !== undefined ) {
                _soaSvc.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'getPreferences', {
                    preferenceNames: [ 'AW_show_command_labels' ],
                    includePreferenceDescriptions: true
                }, {} ).then(
                    function( result ) {
                        var toggleState = false;
                        if ( result.response[ 0 ].values.valueOrigination === 'User' ) {
                            var toggleValue = result.response[ 0 ].values.values;
                            toggleState =  toggleValue[0] === 'true';
                        } else {
                            toggleState = labelToggleWorkspaceValue;
                        }
                        toggle( toggleState, false );
                    } );
            }
        }
    } );
};


/**
 * Set label preference at user location.
 *
 * @param {setPreferencesAtLocations} inputs - Object of setPreferencesAtLocations type
 */
export let setLabelPreferenceAtLocation = function( values ) {
    var setLabelPreferenceIn = {
        setPreferenceIn: [ {
            location: {
                location: 'User'
            },
            preferenceInputs: {
                preferenceName: SHOW_COMMAND_LABEL_PREF,
                values: values
            }
        } ]

    };
    _soaSvc.post( 'Administration-2012-09-PreferenceManagement', 'setPreferencesAtLocations', setLabelPreferenceIn );
};

/**
 * Execute the command.
 */
export let execute = function() {
    if( appCtxSvc.getCtx( toggleLabelCtx ) ) {
        exports.toggle( false, true );
    } else {
        exports.toggle( true, true );
    }
};

export default exports = {
    toggle,
    execute,
    initializeShowLabelContext
};
