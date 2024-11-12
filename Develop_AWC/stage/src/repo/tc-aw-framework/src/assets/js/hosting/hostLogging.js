// Copyright (c) 2021 Siemens

/**
 * @module js/hosting/hostLogging
 * @namespace hostLogging
 */
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import io from 'socket.io-client';

/**
 */
export async function addHostingLogging() {
    logger.setEventBus( eventBus );

    const socket = io( '/hosting-logging' );

    await new Promise( resolve => {
        socket.on( 'connect', () => {
            resolve();
        } );
    } );

    eventBus.subscribe( 'log', ( { output } ) => {
        socket.emit( 'send-client-message', {
            message: output
        } );
    } );
}
