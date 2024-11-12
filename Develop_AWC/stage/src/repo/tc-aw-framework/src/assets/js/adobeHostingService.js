// Copyright (c) 2022 Siemens

/**
 * @module js/adobeHostingService
 */
import fileTicket from 'js/hosting/sol/services/hostFileTicket_2014_10';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Register the hosting module
 */
export let registerHostingModule = function() {
    eventBus.subscribe( 'dataset.openFileFromTicket', function( eventData ) {
        if( !eventData.scope.ctx.aw_hosting_enabled || eventData.scope.ctx.aw_host_type !== 'ADOBE' ) {
            return;
        }

        var msg = {
            OperationType: 'BROWSER_DOWNLOAD',
            Filename: eventData.scope.data.downloadedFile.tickets[ 0 ][ 0 ].props.original_file_name.dbValues[ 0 ],
            Ticket: eventData.scope.data.downloadedFile.tickets[ 1 ][ 0 ]
        };

        var ticketProxy = fileTicket.createGetTicketResponseProxy();
        var ticketMsg = fileTicket.createGetTicketMsg( JSON.stringify( msg ) );
        ticketProxy.fireHostEvent( ticketMsg );
    }, 'adobeHostingService' );
};

export default exports = {
    registerHostingModule
};
