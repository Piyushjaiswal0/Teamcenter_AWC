// Copyright (c) 2021 Siemens
/*
 * utils to show native text viewer
 */
import universalViewerUtils from 'js/universalViewerUtils';
import AwViewerHeader from 'viewmodel/AwViewerHeaderViewModel';
import localeSvc from 'js/localeService';
import appCtxService from 'js/appCtxService';
import eventBus from 'js/eventBus';

//function to execute on 'wrap text' command on viewer header
export const toggleWordWrap = function() {
    var ctx = appCtxService.getCtx( 'viewerContext' );
    var width;
    if( ctx && ctx.showWordWrap ) {
        ctx.wordWrapped = !ctx.wordWrapped;
        var textPage = document.getElementById( 'aw-text-page' );
        var textLines = document.getElementById( 'aw-text-lines' );
        if( textPage && textLines ) {
            textLines.classList.toggle( 'aw-viewerjs-wordWrapped' );
            width = ctx.wordWrapped ? 'auto' : textPage.style.maxWidth;
            textPage.style.width = width;
        }
        appCtxService.updateCtx( 'viewerContext', ctx );
    }
};

//function to execute texteditor.encodingChanged event
export const updateEncoding = function( viewModel ) {
    var viewerCtx = appCtxService.getCtx( 'viewerContext' );
    if( viewModel.data.blob ) {
        var value = viewerCtx.textEncoding === viewerCtx.textUnicode ? viewerCtx.textLocale : viewerCtx.textUnicode;
        viewerCtx.textEncoding = value;
        setContent( viewModel );
        appCtxService.updateCtx( 'viewerContext', viewerCtx );
    }
};

/**
 * Convert plain string to safe HTML string that keeps spaces
 *
 * @param {String} string - the original string
 * @return {String} the safe HTML string that keeps spaces
 */
function toSafeHtmlKeepSpace( string ) {
    var cols = string.split( '\t' );
    var safe = '';
    for( var i = 0; i < cols.length; i++ ) {
        safe += cols[ i ];
        if( i < cols.length - 1 ) {
            var len = 8 - cols[ i ].length % 8;
            for( var j = 0; j < len; j++ ) {
                safe += '\u00A0';
            }
        }
    }

    var patt = new RegExp( '[ ][ ]+' );
    var res = patt.exec( safe );
    while( res ) {
        var rep = res[ 0 ].replace( /[ ]/g, '\u00A0' );
        safe = safe.replace( res[ 0 ], rep );
        res = patt.exec( safe );
    }

    return safe;
}

function setContent( viewModel ) {
    var viewerCtx = appCtxService.getCtx( 'viewerContext' );
    var reader = new FileReader();
    reader.onload = function() {
        var data = reader.result;
        var page = viewModel.data.element.querySelector( '#aw-text-page' );
        var lineNumbers = viewModel.data.element.querySelector( '#aw-text-lines' );
        var newChildPage;
        var newChildLine;
        var lineBreak;
        if( data && page && lineNumbers ) {
            var lines = data.split( /\r?\n/ );
            var maxLen = 0;

            //simulates empty() from jquery
            while( page.firstChild ) {
                page.removeChild( page.lastChild );
            }
            while( lineNumbers.firstChild ) {
                lineNumbers.removeChild( lineNumbers.lastChild );
            }

            for( var i = 0; i < lines.length; i++ ) {
                var safeHtml = toSafeHtmlKeepSpace( lines[ i ] );
                if( maxLen < safeHtml.length ) {
                    maxLen = safeHtml.length;
                }

                lineBreak = document.createElement( 'br' );

                newChildPage = document.createElement( 'div' );
                newChildPage.textContent = safeHtml;
                newChildPage.appendChild( lineBreak );

                newChildLine = document.createElement( 'div' );
                newChildLine.textContent =  i + 1;
                newChildLine.appendChild( lineBreak );

                page.appendChild( newChildPage );
                lineNumbers.appendChild( newChildLine );
            }
            page.style.maxWidth = maxLen + 'em';

            //calling dispatch to push the updated element to viewModel.data.element in case viewModel.data.element is used later
            viewModel.dispatch( { path: 'data', value: { ...viewModel.data } } );
        }
    };
    reader.readAsText( viewModel.data.blob, viewerCtx.textEncoding );
}

/**
 * Initialize Text Viewer
 */
export const initTextViewer = function( viewModel ) {
    var xhr = new XMLHttpRequest();
    xhr.open( 'GET', viewModel.data.fileUrl, true );
    xhr.responseType = 'blob';
    xhr.onload = function( e ) {
        if( this.status === 200 ) {
            viewModel.data.blob = this.response;
            setContent( viewModel );
        }
    };
    xhr.send();

    var viewerCtx = appCtxService.getCtx( 'viewerContext' );
    if( viewerCtx ) {
        viewerCtx.showWordWrap = true; /// set to true
        viewerCtx.wordWrapped = true;
        viewerCtx.isTextViewer = true;
        var locale = localeSvc.getLocale();
        var charset = {
            ja_JP: 'Shift-JIS',
            zh_CN: 'GB2312',
            zh_TW: 'Big5',
            ko_KR: 'EUC-KR'
        };

        viewerCtx.textLocale = charset[ locale ];
        viewerCtx.textUnicode = 'UTF-8';
        viewerCtx.textEncoding = viewerCtx.textUnicode;
    }
    appCtxService.updateCtx( 'viewerContext', viewerCtx );
};

/**
 * initialize the viewer using initViewer for
 *      1. size the viewer based on available height
 *      2. Get the ticket
 *      3. Get localized message to display till file is loaded
 * then populate content using initTextViewer
 */
export const awTextViewerOnMount = function( viewerData, viewModel ) {
    // viewer data will be properly handled/stored in initviewer
    viewModel.data.viewerData = viewerData;

    // Get the element ( whole div tag )
    let element = viewerData.viewerRef.current.querySelector( '.aw-text-viewer' );

    return universalViewerUtils.initViewer( element, viewModel );
};

/**
 * Cleanup all watchers and instance members when this scope is destroyed.
 */
export const awTextViewerOnUnMount = function( viewModel ) {
    eventBus.unsubscribe( 'textEditor.encodingChanged' );
    universalViewerUtils.cleanup( viewModel );
};

/**
 * Text Viewer Render Function
 * @param {Object} props the props
 */
export const awTextViewerRenderFn = function( { viewModel, subPanelContext } ) {
    let headerPropList = [];
    let viewerHeaderElem;
    let loadingDiv;
    let text;

    if( viewModel.data.viewerData ) {
        headerPropList = viewModel.data.viewerData.headerPropertyNames;
        viewerHeaderElem =
            <div className='aw-viewerjs-header'>
                <AwViewerHeader data={viewModel.data.viewerData} context={{ ...viewModel.viewerContext, fullScreenState:subPanelContext.fullScreenState }}></AwViewerHeader>
            </div>
        ;
        loadingDiv = <div className='aw-jswidgets-text'>{viewModel.data.loadingMsg}</div>;

        const styleO = { overflow: 'hidden' };
        const styleH = { height: '100%' };
        text =
            <div className='aw-viewerjs-border aw-viewerjs-innerContent' style={styleO}>
                <div id='aw-text-container' className='aw-viewerjs aw-viewerjs-text' style={styleH} >
                    <div id='aw-text-lines' className='aw-viewerjs-textLines aw-viewerjs-wordWrapped aw-theme-childListContent'></div>
                    <div id='aw-text-page' className='aw-viewerjs-content'></div>
                </div>
            </div>
        ;
    }
    const styleTop = {
        height: viewModel.data.viewerHeight
    };
    return (
        <div id='aw-text-viewer' className='aw-text-viewer' style={styleTop}>
            { headerPropList && headerPropList.length > 0 ? viewerHeaderElem : '' }
            { viewModel.data.loading ? loadingDiv : '' }
            { viewModel.data.loading === false ? text : ''}
        </div>
    );
};

export default {
    awTextViewerRenderFn,
    initTextViewer,
    awTextViewerOnMount,
    awTextViewerOnUnMount,
    toggleWordWrap,
    updateEncoding
};
