// Copyright (c) 2022 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Dma1DigitalSignService
 */
import appCtxSvc from 'js/appCtxService';
import soaSvc from 'soa/kernel/soaService';
import notySvc from 'js/NotyModule';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import browserUtils from 'js/browserUtils';
import digitalSignPdf from 'js/DigitalSignPdf';
import fmsUtils from 'js/fmsUtils';
import { svgString as AcceptMarkup } from 'image/miscAcceptMarkup24.svg';
import { svgString as RedoMarkup } from 'image/miscRedoMarkup24.svg';
import { svgString as DeleteMarkup } from 'image/miscDeleteMarkup24.svg';

var exports = {};

/**
 * Initialize the digital sign operation
 */
export let initDigitalSign = function() {
    appCtxSvc.unRegisterCtx( 'digitalSign' );

    var viewerCtx = appCtxSvc.getCtx( 'viewerContext' );
    if( !viewerCtx ) {
        return;
    }

    var digitalSignCtx = {
        inProgress: true
    };
    appCtxSvc.registerCtx( 'digitalSign', digitalSignCtx );

    digitalSignPdf.setPdfFrame( viewerCtx.pdfFrame );
    digitalSignCtx.dataset = viewerCtx.vmo;

    digitalSignPdf.init();
    digitalSignPdf.setSelectionEndCallback( selectionEndCallback );
    digitalSignPdf.addResource( 'imgDone', AcceptMarkup );
    digitalSignPdf.addResource( 'imgRedo', RedoMarkup );
    digitalSignPdf.addResource( 'imgDelete', DeleteMarkup );
    digitalSignPdf.setRevealed( true );
    digitalSignPdf.showCurrentPage();
    digitalSignPdf.setTool( 'freehand' );

    digitalSignCtx.subbedEvents = [];
    digitalSignCtx.subbedEvents.push( eventBus.subscribe( 'crossSelectionViewer.dataFetched', cleanupDigitalSign ) );
    digitalSignCtx.subbedEvents.push( eventBus.subscribe( 'gwt.SubLocationContentSelectionChangeEvent', cleanupDigitalSign ) );
    digitalSignCtx.subbedEvents.push( eventBus.subscribe( 'primaryWorkArea.selectionChangeEvent', cleanupDigitalSign ) );
};

/**
 * Cancel the digital signing operation
 */
export let cancelDigitalSign = function() {
    var viewerCtx = appCtxSvc.getCtx( 'viewerContext' );
    if( !viewerCtx ) {
        return;
    }
    // If the dataset is checked out for signing, we need to undo that.
    if( viewerCtx.vmo.props.fnd0IsCheckOutForSign.dbValues[ 0 ] === '1' ) {
        var inputData = {
            inputDatasets: [ viewerCtx.vmo ]
        };
        var promise = soaSvc.postUnchecked( 'Internal-DocumentManagement-2013-05-DigitalSignature', 'cancelSign', inputData );
        promise.then( function( response ) {
            if( response.ServiceData && response.ServiceData.partialErrors && response.ServiceData.partialErrors.length ) {
                var errValue = response.ServiceData.partialErrors[ 0 ].errorValues[ 0 ];
                notySvc.showWarning( errValue.message );
            } else {
                cleanupDigitalSign();
            }
        } );
    } else {
        // If not, just remove the local context
        cleanupDigitalSign();
    }
};

/**
 * get the input for getLaunchDefinition SOA
 */
export let getInputForLaunchDefinition = function( signCtx, sessionCtx, userAgentCtx, positionString ) {
    return {
        operation: 'DigitalSign',
        selectedInputs: [ {
            id: signCtx.dataset,
            requestMode: 'EDIT'
        } ],
        serverInfo: {
            hostPath: sessionCtx.server
        },
        sessionInfo: {
            descriminator: ''
        },
        userAgentData: {
            userApplication: userAgentCtx.userApplication,
            userAppVersion: userAgentCtx.userAppVersion,
            additionalInfo: {
                AWC_PDFSIGN: 'true',
                AWC_PDFSIGN_POSITION: positionString
            }
        }
    };
};

/**
 * get the input with SSO info for getLaunchDefinition SOA
 */
export let getInputwithSsoForLaunchDefinition = function( signCtx, sessionCtx, userAgentCtx, positionString, ssoData ) {
    var inputData = exports.getInputForLaunchDefinition( signCtx, sessionCtx, userAgentCtx, positionString );
    if( ssoData.tcSSOEnabled === 'true' ) {
        var theSsoInfo = {};
        theSsoInfo.appId = ssoData.tcSSOAppID;
        theSsoInfo.loginServiceUrl = ssoData.tcSSOURL;
        inputData.serverInfo.ssoInfo = theSsoInfo;
    }

    return inputData;
};

/**
 * Called when the user has either canceled or completed drawing the signing rectangle.
 *
 * @param {Object} userSelection the user input
 */
function selectionEndCallback( userSelection ) {
    if( !userSelection || userSelection.canceled ) {
        exports.cancelDigitalSign();
        return;
    }

    // position of drawn rectangle is in pixels, can convert to points proportionally
    var topLeft = {
        x: userSelection.signRectangle.left / userSelection.pageArea.width,
        y: userSelection.signRectangle.top / userSelection.pageArea.height
    };
    var dimensions = {
        width: userSelection.signRectangle.width / userSelection.pageArea.width,
        height: userSelection.signRectangle.height / userSelection.pageArea.height
    };
    var positionString = String( userSelection.pageNum ) + ' ' + topLeft.x + ' ' + topLeft.y + ' ' + dimensions.width + ' ' + dimensions.height;

    var signCtx = appCtxSvc.getCtx( 'digitalSign' );
    var sessionCtx = appCtxSvc.getCtx( 'tcSessionData' );
    var userAgentCtx = appCtxSvc.getCtx( 'userAgentInfo' );

    var inputData = {};

    $.get( browserUtils.getBaseURL() + 'getSessionVars' ).done( function( ssoData, status ) {
        if( status === 'success' ) {
            inputData = exports.getInputwithSsoForLaunchDefinition( signCtx, sessionCtx, userAgentCtx, positionString, ssoData );
        } else {
            inputData = exports.getInputForLaunchDefinition( signCtx, sessionCtx, userAgentCtx, positionString );
        }

        var promise = soaSvc.postUnchecked( 'DocumentManagement-2010-04-LaunchDefinition', 'getLaunchDefinition', inputData );
        promise.then( function( response ) {
            if( response.ServiceData && response.ServiceData.partialErrors && response.ServiceData.partialErrors.length ) {
                var errValue = response.ServiceData.partialErrors[ 0 ].errorValues[ 0 ];
                notySvc.showWarning( errValue.message );
            } else {
                cleanupDigitalSign();
                fmsUtils.openFile( response.xmlLaunchDef );
            }
        } );
    } );
}

/**
 * Cleanup the digital sign operation
 */
function cleanupDigitalSign() {
    var signCtx = appCtxSvc.getCtx( 'digitalSign' );
    if( signCtx && signCtx.subbedEvents ) {
        for( var i = 0; i < signCtx.subbedEvents.length; i++ ) {
            eventBus.unsubscribe( signCtx.subbedEvents[ i ] );
        }
    }

    appCtxSvc.unRegisterCtx( 'digitalSign' );
    digitalSignPdf.setRevealed( false );
}

/**
 * get the input for getLaunchDefinition SOA for TcAcrobatLauncher
 */
export let getInputForAcrobat = function( action, sessionCtx, userAgentCtx ) {
    return {
        operation: 'AWPdfOpen',
        selectedInputs: [ {
            id: appCtxSvc.ctx.mselected[0],
            requestMode: action
        } ],
        serverInfo: {
            hostPath: sessionCtx.server
        },
        sessionInfo: {
            descriminator: ''
        },
        userAgentData: {
            userApplication: userAgentCtx.userApplication,
            userAppVersion: userAgentCtx.userAppVersion
        }
    };
};

/**
 * get the input with SSO info for getLaunchDefinition SOA for TcAcrobatLauncher
 */
export let getInputwithSsoForAcrobat = function( action, sessionCtx, userAgentCtx, ssoData ) {
    var inputData = exports.getInputForAcrobat( action, sessionCtx, userAgentCtx );
    if( ssoData.tcSSOEnabled === 'true' ) {
        var theSsoInfo = {};
        theSsoInfo.appId = ssoData.tcSSOAppID;
        theSsoInfo.loginServiceUrl = ssoData.tcSSOURL;
        inputData.serverInfo.ssoInfo = theSsoInfo;
    }

    return inputData;
};

/**
 * open the acrobat for digital signing/markup
 *
 */
function openAcrobat( action ) {
    var sessionCtx = appCtxSvc.getCtx( 'tcSessionData' );
    var userAgentCtx = appCtxSvc.getCtx( 'userAgentInfo' );

    var inputData = {};

    $.get( browserUtils.getBaseURL() + 'getSessionVars' ).done( function( ssoData, status ) {
        if( status === 'success' ) {
            inputData = exports.getInputwithSsoForAcrobat( action, sessionCtx, userAgentCtx, ssoData );
        } else {
            inputData = exports.getInputForAcrobat( action, sessionCtx, userAgentCtx );
        }

        var promise = soaSvc.postUnchecked( 'DocumentManagement-2010-04-LaunchDefinition', 'getLaunchDefinition', inputData );
        promise.then( function( response ) {
            if( response.ServiceData && response.ServiceData.partialErrors && response.ServiceData.partialErrors.length ) {
                var errValue = response.ServiceData.partialErrors[ 0 ].errorValues[ 0 ];
                notySvc.showWarning( errValue.message );
            } else {
                fmsUtils.openFile( response.xmlLaunchDef );
            }
        } );
    } );
}

export default exports = {
    initDigitalSign,
    cancelDigitalSign,
    getInputForLaunchDefinition,
    getInputwithSsoForLaunchDefinition,
    getInputForAcrobat,
    getInputwithSsoForAcrobat,
    openAcrobat
};
