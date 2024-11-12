// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

import AwHTTPService from 'js/awHttpService';
import AwViewerHeader from 'viewmodel/AwViewerHeaderViewModel';
import localeSvc from 'js/localeService';
import universalViewerUtils from 'js/universalViewerUtils';

const setFrameContent = async function( viewModel ) {
    const response = await AwHTTPService.instance.get( viewModel.data.fileUrl );
    if( response && response.data ) {
        let iframe = viewModel.data.element.querySelector( 'iframe' );
        let iframeDoc;
        if( iframe ) {
            if( iframe.contentDocument ) {
                iframeDoc = iframe.contentDocument;
            } else if( iframe.contentWindow ) {
                iframeDoc = iframe.contentWindow.document;
            }
        }

        if( iframeDoc ) {
            // Put the content in the iframe
            iframeDoc.open();
            const iframeDocContent = response.data;
            iframeDoc.writeln( iframeDocContent );
            iframeDoc.close();
        }
    }
};

export const awp0HTMLViewerOnMount = function( viewerData, viewModel ) {
    const frameTitle = localeSvc.getLoadedText( 'Awp0HTMLViewerMessages' ).htmlViewerFrameTitle;
    // local manipulation as it will be handled/properly synced in initViewer
    viewModel.data.viewerData = viewerData;
    viewModel.data.frameTitle = frameTitle;

    // Get the elem
    let elem = viewerData.viewerRef.current.querySelector( '.aw-html-viewer' );

    // initialize the viewer and populate the iframe with HTML content
    return universalViewerUtils.initViewer( elem, viewModel );
};

export const awp0HTMLViewerOnUnMount = function( viewModel ) {
    universalViewerUtils.cleanup( viewModel );
};

/**
 * HTML Viewer Render Function
 * @param {Object} props the props
 */
export const awp0HTMLViewerRenderFn = function( { viewModel, subPanelContext } ) {
    let headerPropList = [];
    let headerVisible;
    let viewerHeaderElem;
    let loadingDiv;
    let frame;
    let viewerData = viewModel.data.viewerData;
    if( viewerData ) {
        headerPropList = viewerData.headerPropertyNames;
        headerVisible = headerPropList && headerPropList.length > 0;
        viewerHeaderElem =
            <div className='aw-viewerjs-header'>
                <AwViewerHeader data={viewerData} context={{ ...viewModel.viewerContext, fullScreenState:subPanelContext.fullScreenState }}></AwViewerHeader>
            </div>;
        loadingDiv = <div className='aw-jswidgets-text'>{viewModel.data.loadingMsg}</div>;
        let classes = `aw-viewerjs-scroll aw-viewerjs-border aw-jswidgets-text aw-viewerjs-dimensions ${headerVisible ? 'aw-viewerjs-innerContent' : 'aw-viewerjs-innerContentNoHeader'}`;
        frame = <iframe title={viewModel.data.frameTitle} className={classes} scrolling='auto'></iframe>;
    }
    const style = {
        height: viewModel.data.viewerHeight,
        width: viewModel.data.viewerWidth
    };
    return (
        <div id='aw-html-viewer' className='aw-html-viewer' style={style}>
            { headerVisible ? viewerHeaderElem : '' }
            { viewModel.data.loading ? loadingDiv : '' }
            { viewModel.data.loading === false ? frame : ''}
        </div>
    );
};

export default {
    setFrameContent,
    awp0HTMLViewerRenderFn,
    awp0HTMLViewerOnMount,
    awp0HTMLViewerOnUnMount
};
