// Copyright (c) 2022 Siemens

import { getBaseUrlPath } from 'app';
import AwViewerHeader from 'viewmodel/AwViewerHeaderViewModel';
import pdfViewerUtils from 'js/pdfViewerUtils';
import universalViewerUtils from 'js/universalViewerUtils';
import localeSvc from 'js/localeService';
import browserUtils from 'js/browserUtils';

export const awPdfViewerOnMountFn = function( viewerData, viewModel ) {
    // viewerdata will be properly handled/stored in initViewer
    viewModel.data.viewerData = viewerData;

    // initialize the viewer and populate pdf content
    let elem = viewerData.viewerRef.current.querySelector( '.aw-pdf-viewer' );
    return universalViewerUtils.initViewer( elem, viewModel );
};

export const awPdfViewerOnUnmountFn = function( viewModel ) {
    universalViewerUtils.cleanup( viewModel );
};

const createPdfViewerElement = function( viewModel, headerVisible ) {
    const style = {
        height: viewModel.data.viewerHeight !== undefined && headerVisible ? `${parseInt( viewModel.data.viewerHeight ) - 75}px` : '100%'
    };
    var baseUrl = getBaseUrlPath();
    const viewUrl = baseUrl + '/pdfjs/viewer.html';
    const frameTitle = localeSvc.getLoadedText( 'Awp0PDFViewerMessages' ).pdfViewerFrameTitle;
    const onLoadFn = function() {
        var frame = viewModel.data.element.querySelector( 'iframe#pdfViewerIFrame' );
        if( frame ) {
            var frameContentWindow = frame.contentWindow;
            var frameContentDoc = frame.contentDocument;

            if( frameContentWindow && frameContentWindow.pdfjsLib && frameContentDoc ) {
                pdfViewerUtils.initFrame( frameContentWindow, frameContentDoc, localeSvc.getLocale() );
                pdfViewerUtils.hookOutline( frameContentWindow, frameContentDoc );
                var fileUrl = viewModel.data.fileUrl;
                if( fileUrl && !fileUrl.startsWith( 'http' ) ) {
                    fileUrl = browserUtils.getBaseURL() + fileUrl;
                }
                pdfViewerUtils.loadContent( frameContentWindow, fileUrl );

                // set the min-width of iframe view to 220px.
                var mainContainer = frameContentDoc.querySelector( 'div#mainContainer' );
                mainContainer.style[ 'min-width' ] = '220px';
            }
        }
    };

    return <div className='aw-viewerjs-innerContent' style={style}>
        <iframe id='pdfViewerIFrame' title={frameTitle} className='aw-pdfjs-pdfViewerIFrame' src={viewUrl} onLoad={onLoadFn} allowFullScreen='1'>
        </iframe>
    </div>;
};

/**
 * Pdf Viewer Render Function
 * @param {Object} props the props
 * @returns {Object} the HTML
 */
export const awPdfViewerOnRenderFn = function( { viewModel, data } ) {
    let headerPropList = [];
    let viewerHeaderElem;
    let headerVisible;
    let loadingDiv;
    let pdfViewElement;
    let style = {};

    if( viewModel.data.viewerData ) {
        if( viewModel.data.viewerData.viewerHeight ) {
            style.height = viewModel.data.viewerData.viewerHeight;
        }
        headerPropList = viewModel.data.viewerData.headerPropertyNames;
        headerVisible = headerPropList && headerPropList.length > 0;
        viewerHeaderElem =
            <div className='aw-viewerjs-header'>
                <AwViewerHeader data={viewModel.data.viewerData} context={{ ...viewModel.viewerContext, fullScreenState:data.fullScreenState }}></AwViewerHeader>
            </div>;

        loadingDiv = <div className='aw-jswidgets-text'>{viewModel.data.loadingMsg}</div>;
        pdfViewElement = createPdfViewerElement( viewModel, headerVisible );
    }

    return (
        <div id='aw-pdf-viewer' className='aw-pdf-viewer' style={style}>
            { headerVisible ? viewerHeaderElem : '' }
            { viewModel.data.loading ? loadingDiv : '' }
            { viewModel.data.loading === false ? pdfViewElement : ''}
        </div>
    );
};

export default {
    awPdfViewerOnRenderFn,
    awPdfViewerOnMountFn,
    awPdfViewerOnUnmountFn
};
