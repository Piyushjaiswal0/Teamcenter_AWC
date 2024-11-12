// Copyright 2022 Siemens Product Lifecycle Management Software Inc.

import AwViewerHeader from 'viewmodel/AwViewerHeaderViewModel';
import imgViewerExport from 'js/ImgViewer';
import universalViewerUtils from 'js/universalViewerUtils';

export const initImageViewer = function( viewModel ) {
    const container = viewModel.data.element.querySelector( 'div#imageViewer' );
    if( container && container.ownerDocument ) {
        const imgViewer = imgViewerExport.newInstance( container );
        viewModel.data.element.imgViewer = imgViewer;

        imgViewer.setImage( viewModel.data.fileUrl );
        universalViewerUtils.setResizeCallback( viewModel, imgViewer.resize );

        let allimg = viewModel.data.element.querySelectorAll( 'img' );
        for( let i = 0; i < allimg.length; i++ ) {
            allimg[ i ].style.display = 'none';
        }
    }
};

export const awImageViewerOnMount = function( viewerData, viewModel ) {
    // viewerdata will be properly handled updated in init
    viewModel.data.viewerData = viewerData;

    // Get the elem
    let elem = viewerData.viewerRef.current.querySelector( '.aw-image-viewer' );

    // initialize the viewer
    return universalViewerUtils.initViewer( elem, viewModel );
};

export const awImageViewerOnUnMount = function( viewModel ) {
    viewModel.data.element.imgViewer.setImage( null );
    delete viewModel.data.element.imgViewer;
    universalViewerUtils.cleanup( viewModel );
};

/**
 * Image Viewer Render Function
 * @param {Object} props the props
 */
export const awImageViewerRenderFn = function( { viewModel, subPanelContext } ) {
    let headerPropList = [];
    let headerVisible;
    let viewerHeaderElem;
    let loadingDiv;
    let img;

    if( viewModel.data.viewerData ) {
        headerPropList = viewModel.data.viewerData.headerPropertyNames;
        headerVisible = headerPropList && headerPropList.length > 0;
        viewerHeaderElem =
            <div className='aw-viewerjs-header'>
                <AwViewerHeader data={viewModel.data.viewerData} context={{ ...viewModel.viewerContext, fullScreenState:subPanelContext.fullScreenState }}></AwViewerHeader>
            </div>;

        loadingDiv = <div className='aw-jswidgets-text'>{viewModel.data.loadingMsg}</div>;
        let imgClasses = `aw-imageviewer-viewer ${headerVisible ? 'aw-viewerjs-innerContent' : 'aw-viewerjs-innerContentNoHeader'}`;
        img = <div className={imgClasses} id='imageViewer'></div>;
    }
    const style = {
        height: viewModel.data.viewerHeight
    };

    return (
        <div id='aw-image-viewer' className='aw-image-viewer' style={style}>
            { headerVisible ? viewerHeaderElem : '' }
            { viewModel.data.loading ? loadingDiv : '' }
            { viewModel.data.loading === false ? img : ''}
        </div>
    );
};

export const rotateCW = function( context ) {
    const imgViewer = context.element.imgViewer;
    imgViewer.rotateCW();
};

export const rotateCCW = function( context ) {
    const imgViewer = context.element.imgViewer;
    imgViewer.rotateCCW();
};

export default {
    initImageViewer,
    awImageViewerRenderFn,
    awImageViewerOnMount,
    awImageViewerOnUnMount,
    rotateCW,
    rotateCCW
};
