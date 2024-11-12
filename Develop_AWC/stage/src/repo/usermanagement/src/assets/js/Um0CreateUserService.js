// Copyright (c) 2022 Siemens

/**
 * @module js/Um0CreateUserService
 */
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import localeService from 'js/localeService';
import messagingService from 'js/messagingService';
import eventBus from 'js/eventBus';

var exports = {};

eventBus.subscribe( 'updateUserProperties', function( eventData ) {
    if( eventData.scope.data.modelPropUser.props.fnd0license_bundles ) {
        eventData.modelPropUser.props.fnd0license_bundles.uiValue = eventData.scope.data.modelPropUser.props.fnd0license_bundles.uiValue;
    }

    if( eventData.scope.data.modelPropUser.props.fnd0LicenseServer ) {
        eventData.modelPropUser.props.fnd0LicenseServer.dbValue = eventData.scope.data.modelPropUser.props.fnd0LicenseServer.dbValue;
    }
} );

export let modifyResponse = function( data ) {
    var name = data.serviceData.plain[ 0 ];
    data.serviceData.modelObjects[ name ].props.fnd0license_bundles.propertyDescriptor.anArray = false;
    return data;
};

/**
 * validateAndCreateObject Method
 *
 * @param {bool} GroupRoleSelectionValue - GroupRoleSelectionValue
 */
export let validateAndCreateObject = function( modeldata ) {
    if( modeldata.modelPropUser.props.volume.dbValue !== null &&
        modeldata.modelPropUser.props.local_volume.dbValue !== null ) {
        if( modeldata.modelPropUser.props.volume.dbValue === modeldata.modelPropUser.props.local_volume.dbValue ) {
            var resource = 'UsermanagementCommandPanelMessages';
            var localTextBundle = localeService.getLoadedText( resource );
            if( localTextBundle ) {
                var _localeMsg = localTextBundle.WarnMsgForVolumeProp.replace( '{0}', modeldata.name.uiValue );
                messagingService.showWarning( _localeMsg );
            }
        }
    } else {
        eventBus.publish( 'ics.createPersonObject' );
    }
};

eventBus.subscribe( 'registerCreatedObject', function( data ) {
    if( data !== null ) {
        appCtxSvc.registerCtx( 'newlyCreatedObj', cdm.getObject( data.scope.data.createdObjectUid ) );
    }
} );

/**
 * @param {*} data
 * @param {*} subPanelContext
 * @returns
 */
export let setDefaultGroupProp = function( data, subPanelContext ) {
    var newParent = { ...data.modelPropUser.props.default_group };
    var groupObject = cdm.getObject( subPanelContext.searchState.criteria.groupUID );
    newParent.uiValue =  groupObject.props.name.dbValues[0];
    return newParent;
};

exports = {
    validateAndCreateObject,
    modifyResponse,
    setDefaultGroupProp
};
export default exports;
