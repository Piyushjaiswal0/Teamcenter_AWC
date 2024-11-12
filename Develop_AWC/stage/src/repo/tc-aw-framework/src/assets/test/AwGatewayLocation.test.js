/* eslint-env jest */

import appCtxService from 'js/appCtxService';
import AwGatewayLocation from 'viewmodel/AwGatewayLocationViewModel';
import cfgSvc from 'js/configurationService';
import localeService from 'js/localeService';
import { renderWithCtx } from '@swf/core/test/testUtils';
import { cleanup, act, waitFor, screen } from '@testing-library/react';
import AwDefaultLocation from 'viewmodel/AwDefaultLocationViewModel';

jest.mock( 'viewmodel/AwDefaultLocationViewModel', () => ( {
    __esModule: true,
    default: jest.fn( () => 'AwDefaultLocation' )
} ) );

describe( 'Test AwGatewayLocation', () => {
    let gatewayElement = null;
    let getCgfSpy = null;
    let localeSpy = null;

    beforeEach( async() => {
        getCgfSpy = jest.spyOn( cfgSvc, 'getCfg' ).mockImplementation( async() => { return { browserTitle: 'Title' }; } );
        jest.spyOn( appCtxService, 'registerCtx' ).mockImplementation( () => {} );
        jest.spyOn( localeService, 'getTextPromise' ).mockImplementation( async() => { return {}; } );
        localeSpy = jest.spyOn( localeService, 'getLocalizedText' ).mockImplementation( async() => {} );
    } );

    afterEach( () => {
        jest.clearAllMocks();
        cleanup();
    } );

    it( 'Should render default location on mount', async() => {
        await act( async() => {
            gatewayElement = renderWithCtx( <AwGatewayLocation></AwGatewayLocation> );
        } );
        await waitFor( () => expect( gatewayElement.getByText( /AwDefaultLocation/ ) ).toBeTruthy() );
        expect( gatewayElement.getByText( /AwDefaultLocation/ ) ).toBeTruthy();

        expect( AwDefaultLocation ).toHaveBeenCalledWith( expect.objectContaining( { subPanelContext: {
            locationPanelStyle: 'aw-gateway-locationPanel',
            overriddenHeaderTitle: expect.anything(),
            showsearchbox: expect.anything() } } ), expect.anything() );
    } );

    it( 'Should read the headerTitle defined in solutionDef', async() => {
        getCgfSpy.mockImplementation( () => Promise.resolve( { browserTitle: 'Gateway' } ) );

        await act( async() => {
            gatewayElement = renderWithCtx( <AwGatewayLocation></AwGatewayLocation> );
        } );
        await waitFor( () => expect( gatewayElement.getByText( /AwDefaultLocation/ ) ).toBeTruthy() );

        expect( AwDefaultLocation ).toHaveBeenCalled();
        const args = AwDefaultLocation.mock.calls[ 0 ][ 0 ];
        expect( args.subPanelContext.overriddenHeaderTitle ).toBe( 'Gateway' );
    } );

    it( 'Should construct and pass the default headerTitle - if an override is not provided in solutionDef ', async() => {
        getCgfSpy.mockImplementation( () => Promise.resolve( null ) );
        localeSpy.mockImplementation( () => Promise.resolve( 'Default title' ) );

        await act( async() => {
            gatewayElement = renderWithCtx( <AwGatewayLocation></AwGatewayLocation> );
        } );
        await waitFor( () => expect( gatewayElement.getByText( /AwDefaultLocation/ ) ).toBeTruthy() );

        expect( AwDefaultLocation ).toHaveBeenCalled();
        const args = AwDefaultLocation.mock.calls[ 0 ][ 0 ];
        expect( args.subPanelContext.overriddenHeaderTitle ).toBe( 'Default title' );
    } );

    it( 'Should disable full screen on mount', async() => {
        await act( async() => {
            gatewayElement = renderWithCtx( <AwGatewayLocation></AwGatewayLocation> );
        } );
        await waitFor( () => expect( appCtxService.registerCtx ).toHaveBeenCalled() );
        expect( appCtxService.registerCtx ).toHaveBeenCalledWith( 'fullscreenDisabled', true );
    } );

    it( 'Should enable full screen mode on unmount', async() => {
        const { unmount } = renderWithCtx( <AwGatewayLocation></AwGatewayLocation> );
        await act( async() => {
            unmount();
        } );
        await waitFor( () => expect( appCtxService.registerCtx ).toHaveBeenCalled() );
        expect( appCtxService.registerCtx ).toHaveBeenCalledWith( 'fullscreenDisabled', false );
    } );
} );
