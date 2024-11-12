// Copyright (c) 2022 Siemens

/**
 * Manager service to help deal with multiple implementing versions.
 *
 * @module js/hosting/hostCheckinCheckoutService
 * @namespace hostCheckinCheckoutService
 */
import hostInteropSvc from 'js/hosting/hostInteropService';
import hostObjectRefSvc from 'js/hosting/hostObjectRefService';
import hostCheckinCheckoutSvc from 'js/hosting/sol/services/hostCheckinCheckout_2016_03';
import _ from 'lodash';
import hostServices from 'js/hosting/hostConst_Services';

var exports = {};

/**
 * @param {IModelObjectArray} modelObjs - Collecton of IModelObjects to convert into interOpObjectRefs.
 *
 * @return {InterOpObjectRefArray} Resulting collection.
 */
function _createObjectRefArray( modelObjs ) {
    if( _.isArray( modelObjs ) ) {
        var objRefsRet = [];

        _.forEach( modelObjs, function( modelObj ) {
            var objRefs = hostObjectRefSvc.createObjectRefsByModelObject( modelObj );

            _.forEach( objRefs, function( objRef ) {
                objRefsRet.push( objRef );
            } );
        } );

        return objRefsRet;
    } else if( _.isObject( modelObjs ) && !_.isEmpty( modelObjs ) ) {
        return hostObjectRefSvc.createObjectRefsByModelObject( modelObjs );
    }

    return [];
}

/**
 * Open given object in a new view in the 'host'.
 *
 * @param {IModelObjectArray} modelObjs - IModelObjects to open.
 * @param {Number} operation - Operation. Valid Values are 0,1,2 - Checkout, Checkin and Cancel Checkout
 * respectively.
 */
export let hostCheckinCheckout = function( modelObjs, operation ) {
    if( !_.isEmpty( modelObjs ) &&
        hostInteropSvc.isHostServiceAvailable(
            hostServices.HS_HOST_CHECKIN_CHECKOUT,
            hostServices.VERSION_2016_03 ) ) {
        var objRefs = _createObjectRefArray( modelObjs );

        //Create CheckinCheckout Message.
        var checkinCheckoutMessage = hostCheckinCheckoutSvc.createHostCheckinCheckoutRequestMsg();

        checkinCheckoutMessage.setOperation( operation );
        checkinCheckoutMessage.setTargets( objRefs );

        //Fire Checkin Checkout Event.
        var checkinCheckoutProxy = hostCheckinCheckoutSvc.createHostCheckinCheckoutProxy();

        checkinCheckoutProxy.fireHostEvent( checkinCheckoutMessage );
    }
};

export default exports = {
    hostCheckinCheckout
};
