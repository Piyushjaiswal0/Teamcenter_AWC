// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * List of special values used in host configurations
 *
 * @module js/hosting/hostConst_ConfigValues
 * @namespace hostConst_ConfigValues
 */

'use strict';

var exports = {};

/**
 * ID of the RAC host type
 *
 * @memberof hostConst_ConfigValues
 */
export let HOST_TYPE_NX = 'NX';

/**
 * ID of the RAC host type
 *
 * @memberof hostConst_ConfigValues
 */
export let HOST_TYPE_RAC = 'RAC';

/**
 * ID of the TcVis host type
 *
 * @memberof hostConst_ConfigValues
 */
export let HOST_TYPE_VIS = 'Vis';

/**
 * ID of the Office Client host type
 *
 * @memberof hostConst_ConfigValues
 */
export let HOST_TYPE_OFFICE_CLIENT = 'OC';

/**
 * ID of the Adobe Integration host type
 *
 * @memberof hostConst_ConfigValues
 */
export let HOST_TYPE_ADOBE_INTEGRATION = 'ADOBE';

/**
 * ID of the Adobe Integration host type
 *
 * @memberof hostConst_ConfigValues
 */
export let HOST_TYPE_PROCESS_SIMULATE = 'ProcessSimulate';

/**
 * ID of the ALM host type
 *
 * @memberof hostConst_ConfigValues
 */
export let HOST_TYPE_ALM = 'ALM';

/**
 * ID of the Test fixture host type
 *
 * @memberof hostConst_ConfigValues
 */
export let HOST_TYPE_TEST_FIXTURE = 'JS';

/**
 * Special 'marker' preference name used to indicate that the default, host specific, object types should be used.
 * <P>
 * Note: There is no actual preference with this name. This value is used as a 'marker' to indicate special
 * host-specific processing should be used when necessary.
 *
 * @memberof hostConst_ConfigValues
 */
export let PREF_NAME_HOST_CONFIG_2014_02_OPEN_SUPPORTED_TYPES = 'HostConfig_2014_02_OpenSupportedTypes';

/**
 * Default preference name to use to query which object types are valid for opening in a NX host if that host does
 * not provide an alternate one as part of the '2014_07' version of
 *
 * @memberof hostConst_ConfigValues
 */
export let PREF_NAME_OPEN_SUPPORTED_TYPES_NX = 'AWC_NX_OpenSupportedTypes';

/**
 * Default preference name to use to query which object types are valid for opening in a RAC host if that host does
 * not provide an alternate one as part of the '2014_07' version of
 *
 * @memberof hostConst_ConfigValues
 */
export let PREF_NAME_OPEN_SUPPORTED_TYPES_RAC = 'AWC_RAC_OpenSupportedTypes';

/**
 * Default preference name to use to query which object types are valid for opening in a TcVis host if that host
 * does not provide an alternate one as part of the '2014_07' version of
 *
 * @memberof hostConst_ConfigValues
 */
export let PREF_NAME_OPEN_SUPPORTED_TYPES_VIS = 'AWC_VIS_OpenSupportedTypes';

export default exports = {
    HOST_TYPE_ALM,
    HOST_TYPE_NX,
    HOST_TYPE_RAC,
    HOST_TYPE_VIS,
    HOST_TYPE_OFFICE_CLIENT,
    HOST_TYPE_ADOBE_INTEGRATION,
    HOST_TYPE_PROCESS_SIMULATE,
    HOST_TYPE_TEST_FIXTURE,
    PREF_NAME_HOST_CONFIG_2014_02_OPEN_SUPPORTED_TYPES,
    PREF_NAME_OPEN_SUPPORTED_TYPES_NX,
    PREF_NAME_OPEN_SUPPORTED_TYPES_RAC,
    PREF_NAME_OPEN_SUPPORTED_TYPES_VIS
};
