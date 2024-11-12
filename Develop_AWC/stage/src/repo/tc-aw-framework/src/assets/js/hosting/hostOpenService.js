// Copyright (c) 2022 Siemens

/**
 * Manager service to help deal with multiple implementing versions.
 *
 * @module js/hosting/hostOpenService
 * @namespace hostOpenService
 */
import hostInteropSvc from 'js/hosting/hostInteropService';
import hostBaseRefSvc from 'js/hosting/hostBaseRefService';
import hostObjectRefSvc from 'js/hosting/hostObjectRefService';
import hostOpenSvc1 from 'js/hosting/sol/services/hostOpen_2014_02';
import hostOpenSvc2 from 'js/hosting/sol/services/hostOpen_2015_03';
import hostOpenSvc3 from 'js/hosting/sol/services/hostOpen_2015_10';
import hostOpenNewViewSvc from 'js/hosting/sol/services/hostOpenNewView_2016_04';
import _ from 'lodash';
import hostServices from 'js/hosting/hostConst_Services';

/**
 * Convert the given {IModelObjects} into an array of {InteropObjectRef}.
 *
 * @param {IModelObject|IModelObjectArray} modelObjs - IModelObject(s) to convert.
 *
 * @returns {InteropObjectRefArray} An Array of InteropObjectRef based on the given {IModelObject}.
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
 * Convert the given {IModelObjects} into an array of {InteropObjectRef}.
 *
 * @param {IModelObject|IModelObjectArray} modelObjs - IModelObject(s) to convert.
 *
 * @returns {InteropObjectRefArray} An Array of InteropObjectRef based on the given {IModelObject}.
 */
function _createBasicRefArray( modelObjs ) {
    var objRefsRet = [];

    if( _.isArray( modelObjs ) ) {
        _.forEach( modelObjs, function( modelObj ) {
            var objRef = hostObjectRefSvc.createBasicRefByModelObject( modelObj );

            objRefsRet.push( objRef );
        } );
    } else if( _.isObject( modelObjs ) && !_.isEmpty( modelObjs ) ) {
        var objRef = hostObjectRefSvc.createBasicRefByModelObject( modelObjs );

        objRefsRet.push( objRef );
    }

    return objRefsRet;
}

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Add component in host
 *
 * @memberof hostOpenService
 *
 * @param {IModelObjectArray} modelObjs - IModelObjects to add to the 'host'.
 */
export let addComponentInHost = function( modelObjs ) {
    if( exports.isAddComponentInHostAvailable() ) {
        var objRefs = _createBasicRefArray( modelObjs );

        if( !_.isEmpty( objRefs ) ) {
            var msg1 = hostOpenSvc1.createHostAddComponentRequestMsg();

            msg1.setAddComponentTargets( objRefs );

            hostOpenSvc1.createHostAddComponentProxy().fireHostEvent( msg1 );
        }
    }
};

/**
 * Checks to see if add component in host ability is available.
 *
 * @memberof hostOpenService
 *
 * @returns {Boolean} TRUE if the add component ability is available.
 */
export let isAddComponentInHostAvailable = function() {
    return hostInteropSvc.isHostServiceAvailable(
        hostServices.HS_HOST_ADD_COMPONENT,
        hostServices.VERSION_2014_02 );
};

/**
 * Checks to see if the most recent 'open in host' service is available with the current 'host'.
 *
 * @memberof hostOpenService
 *
 * @returns {Boolean} TRUE if the open in host ability is available.
 */
export let isOpenInHostAvailable = function() {
    return hostInteropSvc.isHostServiceAvailable(
        hostServices.HS_HOST_OPEN,
        hostServices.VERSION_2015_10 ) ||

        hostInteropSvc.isHostServiceAvailable(
            hostServices.HS_HOST_OPEN,
            hostServices.VERSION_2014_02 );
};

/**
 * Checks to see if the open with in host ability is available.
 *
 * @memberof hostOpenService
 *
 * @returns {Boolean} TRUE if the open in host ability is available.
 */
export let isOpenWithInHostAvailable = function() {
    return hostInteropSvc.isHostServiceAvailable(
        hostServices.HS_HOST_OPEN_WITH,
        hostServices.VERSION_2015_03 );
};

/**
 * Checks to see if the open in a new view  in host ability is available.
 *
 * @memberof hostOpenService
 *
 * @returns {Boolean} TRUE if the service is available.
 */
export let isOpenNewViewInHostAvailable = function() {
    return hostInteropSvc.isHostServiceAvailable(
        hostServices.HS_HOST_OPEN_NEW_VIEW_SVC,
        hostServices.VERSION_2016_04 );
};

/**
 * Open given object in the 'host'.
 *
 * @param {IModelObject|IModelObjectArray} modelObjs - IModelObject(s) to open.
 */
export let openInHost = function( modelObjs ) {
    // If modelObjs is not an array, make it one.
    if( !( modelObjs instanceof Array ) ) {
        modelObjs = [ modelObjs ];
    }
    // If a revision is not configured correctly, don't include it.
    modelObjs = modelObjs.filter( function( modelObj ) {
        if ( modelObj && ( !modelObj.props.awb0UnderlyingObject || modelObj.props.awb0UnderlyingObject.dbValues[ 0 ] ) ) {
            return modelObj;
        }
        return null;
    } );
    if( !_.isEmpty( modelObjs ) ) {
        if( hostInteropSvc.isHostServiceAvailable(
            hostServices.HS_HOST_OPEN,
            hostServices.VERSION_2015_10 ) ) {
            var objRefs3 = _createObjectRefArray( modelObjs );

            var msg3 = hostOpenSvc3.createHostOpenRequestMsg();

            msg3.setOpenTargets( objRefs3 );

            hostOpenSvc3.createHostOpenProxy().fireHostEvent( msg3 );
        } else if( hostInteropSvc.isHostServiceAvailable(
            hostServices.HS_HOST_OPEN,
            hostServices.VERSION_2014_02 ) ) {
            var objRefs1 = _createBasicRefArray( modelObjs );

            var msg1 = hostOpenSvc1.createHostOpenRequestMsg();

            msg1.setOpenTargets( objRefs1 );

            hostOpenSvc1.createHostOpenProxy().fireHostEvent( msg1 );
        }
    }
};

/**
 * Open given object with context in the 'host'.
 *
 * @param {String} openContext - The ID of the 'context' to have the 'host' open with.
 * @param {IModelObject|IModelObjectArray} modelObjs - IModelObject(s) to open.
 */
export let openWithInHost = function( openContext, modelObjs ) {
    if( !_.isEmpty( modelObjs ) && exports.isOpenWithInHostAvailable() ) {
        var objRefs = _createObjectRefArray( modelObjs );

        var msg2 = hostOpenSvc2.createHostOpenWithRequestMsg();

        msg2.setContext( openContext );
        msg2.setTargets( objRefs );

        hostOpenSvc2.createHostOpenWithProxy().fireHostEvent( msg2 );
    }
};

/**
 * Open given object(s) in a new view in the 'host'.
 *
 * @param {IModelObject|IModelObjectArray} modelObjs - IModelObject(s) to open.
 * @param {String} url - Location where to open.
 * @param {PairArray} params - Parameters to use in opening.
 */
export let openNewViewInHost = function( modelObjs, url, params ) {
    var objRef = hostObjectRefSvc.createBasicRefByModelObject( modelObjs );

    var msg = hostOpenNewViewSvc.createHostOpenNewViewMessage();

    msg.setObjects( [ objRef ] );
    msg.setURL( url );
    msg.setOptionalParameters( params );

    hostOpenNewViewSvc.createHostOpenNewViewProxy().fireHostEvent( msg );
};

/**
 * Open given object(s) in a new view in the 'host'.
 *
 * @param {IModelObject|IModelObjectArray} modelObjs - IModelObject(s) to open.
 */
export let openNewShowObjectViewInHost = function( modelObjs ) {
    /**
     * Indicate to the 'host' to disable selection.
     */
    var params = [ {
        Key: 'DisableSelection',
        Value: 'True'
    } ];

    var url = window.location.href;

    var anchorIndex = url.indexOf( '#' );

    // Find the sublocation anchor
    var urlPrefix = '';

    if( anchorIndex > 0 ) {
        urlPrefix = url.substring( 0, anchorIndex );
    }

    /**
     * Open up each IModelObject in a separate new view.
     */
    _.forEach( modelObjs, function( modelObj ) {
        var urlParameter = urlPrefix + '#com.siemens.splm.clientfx.tcui.xrt.showObject';

        exports.openNewViewInHost( modelObj, urlParameter, params );
    } );
};

/**
 * Open given object in the 'host'.
 *
 * @param {String} dbId - DB of object to open in the host.
 * @param {String} uid - DB of object to open in the host.
 * @param {String} type - DB of object to open in the host.
 */
export let openInHostViaObjectInfo = function( dbId, uid, type ) {
    var objRefs = [ hostBaseRefSvc.createBasicObjectRef( dbId, uid, type ) ];

    if( hostInteropSvc.isHostServiceAvailable(
        hostServices.HS_HOST_OPEN,
        hostServices.VERSION_2015_10 ) ) {
        var msg3 = hostOpenSvc3.createHostOpenRequestMsg();

        msg3.setOpenTargets( objRefs );

        hostOpenSvc3.createHostOpenProxy().fireHostEvent( msg3 );
    } else if( hostInteropSvc.isHostServiceAvailable(
        hostServices.HS_HOST_OPEN,
        hostServices.VERSION_2014_02 ) ) {
        var msg1 = hostOpenSvc1.createHostOpenRequestMsg();

        msg1.setOpenTargets( objRefs );

        hostOpenSvc1.createHostOpenProxy().fireHostEvent( msg1 );
    }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostTheme_2014_02
 */
export let registerHostingModule = function() {
    // Nothing right now
};

export default exports = {
    addComponentInHost,
    isAddComponentInHostAvailable,
    isOpenInHostAvailable,
    isOpenWithInHostAvailable,
    isOpenNewViewInHostAvailable,
    openInHost,
    openWithInHost,
    openNewViewInHost,
    openNewShowObjectViewInHost,
    openInHostViaObjectInfo,
    registerHostingModule
};
