// Copyright (c) 2022 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * This service updates the DSM integration status in local storage using DSM
 * "com.siemens.splm.clientfx.ui.DataShareManagerIntegrationStatus" as key below are the DSM status are in local storage
 *
 * 0 : Data Share Manager not installed on this device. 1 : Data Share Manager is installed on this device. 2 : Use Data
 * Share Manager on this device
 *
 * @module js/Awp0DSMIntegrationService
 */
import dsmUtils from 'js/dsmUtils';

var exports = {};

/**
 * DSM Panel section to be shown on on Windows, Mac and Linux operating systems, Sets showDSMSection to true on data
 * for Windows, Mac and Linux operating systems; false for other operating systems.
 */
export let showDSMSection = function( data ) {
    data.showDSMSection = false;
    if( window.navigator.userAgent.indexOf( 'Win' ) ) {
        data.showDSMSection = true;
    } else if( window.navigator.userAgent.indexOf( 'Mac' ) ) {
        data.showDSMSection = true;
    } else if( window.navigator.userAgent.indexOf( 'Linux' ) ) {
        data.showDSMSection = true;
    }
};

/**
 * If user check/uncheck "Use Data Share Manager on this device" check box, updates the local storage with
 * appropriate value.
 *
 * If Use Data Share Manager on this device check box is selected, this function will set DSM integration status
 * local storage to 2, else will set 1 if only "Data Share Manager is installed on this device" check box is
 * selected, 0 for both check boxes are not selected..
 *
 */
export let useDSMClick = function( data ) {
    let useDSM = data.useDSM;
    let dsmInstalled = data.dsmInstalled;

    var useDSMValue = data.useDSM.dbValue;
    var dsmInstalledValue = dsmInstalled.dbValue;

    if( useDSMValue && dsmInstalledValue ) {
        dsmUtils.updateDSMIntegrationStatus( 2 );
    } else if( useDSMValue && !dsmInstalledValue ) {
        dsmInstalledValue = true;
        dsmUtils.updateDSMIntegrationStatus( 2 );
    } else if( !useDSMValue && dsmInstalledValue ) {
        dsmUtils.updateDSMIntegrationStatus( 1 );
    } else {
        dsmUtils.updateDSMIntegrationStatus( 0 );
    }
    useDSM = { ...useDSM, dbValue: useDSMValue };
    dsmInstalled = { ...dsmInstalled, dbValue: dsmInstalledValue };
    return { useDSM, dsmInstalled };
};

/**
 * On reveal, Reads value from local storage and updates the DSM check boxes on the DSM panel section.
 */
export let onDSMReveal = function( data ) {
    exports.showDSMSection( data );
    let useDSM = data.useDSM;
    let dsmInstalled = data.dsmInstalled;

    var useDSMValue = data.useDSM.dbValue;
    var dsmInstalledValue = data.dsmInstalled.dbValue;

    if( data.showDSMSection ) {
        var val = dsmUtils.getDSMIntegrationStatus();
        if( val === '2' ) {
            useDSMValue = true;
            dsmInstalledValue = true;
        } else if( val === '1' ) {
            dsmInstalledValue = true;
            useDSMValue = false;
        }
    }
    useDSM = { ...useDSM, dbValue: useDSMValue };
    dsmInstalled = { ...dsmInstalled, dbValue: dsmInstalledValue };

    return { useDSM, dsmInstalled };
};

/**
 * If user check/uncheck "Data Share Manager is installed on this device" check box, updates the local storage with
 * appropriate value.
 *
 * If "Data Share Manager is installed on this device" check box is not selected, this function will set DSM
 * integration status local storage to 0, else will set 2 if "Use Data Share Manager on this device" check box also
 * selected, 0 for both check boxes are not selected.
 */
export let dsmInstalledClick = function( data ) {
    let useDSM = data.useDSM;
    let dsmInstalled = data.dsmInstalled;

    let useDSMValue = useDSM.dbValue;
    let dsmInstalledValue = dsmInstalled.dbValue;

    if( dsmInstalledValue && useDSMValue ) {
        dsmUtils.updateDSMIntegrationStatus( 2 );
    } else if( dsmInstalledValue && !useDSMValue ) {
        dsmUtils.updateDSMIntegrationStatus( 1 );
    } else if( !dsmInstalledValue && useDSMValue ) {
        useDSMValue = false;
        dsmUtils.updateDSMIntegrationStatus( 0 );
    } else {
        dsmUtils.updateDSMIntegrationStatus( 0 );
    }

    useDSM = { ...useDSM, dbValue: useDSMValue };
    dsmInstalled = { ...dsmInstalled, dbValue: dsmInstalledValue };

    return { useDSM, dsmInstalled };
};

export default exports = {
    showDSMSection,
    useDSMClick,
    onDSMReveal,
    dsmInstalledClick
};
