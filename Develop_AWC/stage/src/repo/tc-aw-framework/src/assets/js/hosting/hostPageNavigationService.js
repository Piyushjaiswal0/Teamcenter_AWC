// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/hostPageNavigationService
 * @namespace hostPageNavigationService
 */
import _ from 'lodash';
import logger from 'js/logger';
import browserUtils from 'js/browserUtils';
import hostSupportSvc from 'js/hosting/hostSupportService';
import cfgSvc from 'js/configurationService';
import AwStateService from 'js/awStateService';
import appCtxSvc from 'js/appCtxService';
import 'config/hosting';
import eventBus from 'js/eventBus';


/**
 * {Boolean} TRUE if progress and details of the processing should be logged.
 */
var _debug_logHostComponentActivity = browserUtils.getUrlAttributes().logHostComponentActivity !== undefined;

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Execute/Navigate based on the information in URL parameters.
 *
 * @param {Object} params - Object holding URL parameters from state context
 */
export const navigateToComponentLocation = function ( params ) {
    /**
     * Determine which hostedComponent to try loading (with a fallback of 'objectInfo').
     */
    var componentId; 
    if ( params) {
        componentId = params.componentId;
    }
    
    if( !componentId && appCtxSvc.ctx.aw_hosting_state && appCtxSvc.ctx.aw_hosting_state.currentHostedComponentId ) {
        componentId = appCtxSvc.ctx.aw_hosting_state.currentHostedComponentId;
    }

    if( !componentId ) {
        componentId = 'com.siemens.splm.clientfx.tcui.xrt.published.ObjectInfo';
    }

    /**
     * Check if this component is defined in any 'hosting.json' files.
     */
    cfgSvc.getCfg( 'hosting.hostedComponents' ).then( function( hostedComponents ) {
        var hostingConfigData = hostedComponents[ componentId ];

        if( !_.isEmpty( hostingConfigData ) ) {
            if( hostingConfigData.componentLocation ) {
                var objectUids =  params.uid ? [ params.uid ] : null;
                var location = hostingConfigData.componentLocation.replace( /\./g, '_' );
                
                if( _debug_logHostComponentActivity ) {
                    logger.info( 'HostedPageNavigation: ' + '_gotoLocation: ' + '\n' +
                        'componentId=' + componentId + '\n' +
                        'Opening location=' + location + '\n' +
                        'params=' + JSON.stringify( params, null, 2 ) );
                }
                eventBus.publish( 'aw.hosting.component.context', {
                    componentId: componentId,
                    modelObjects: objectUids,
                    embeddedLocationView: true
                } );
            } else {
                logger.error( 'HostedPageNavigation: ' + '"componentId": ' + componentId + ' ' + 'No componentLocation specified: ' +
                    JSON.stringify( hostingConfigData ) );
            }
        } else {
            logger.error( 'HostedPageNavigation: ' + '"componentId": ' + componentId + ' ' + 'That "componentId" is not configured.' );
        }
    } );
};

export default exports = {
    navigateToComponentLocation
};
