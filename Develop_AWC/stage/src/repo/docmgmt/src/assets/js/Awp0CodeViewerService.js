// Copyright (c) 2022 Siemens
/*
 * utils to show native Code viewer
 */
import AwViewerHeader from 'viewmodel/AwViewerHeaderViewModel';
import localeSvc from 'js/localeService';
import AwRow from 'viewmodel/AwRowViewModel';
import appCtxSvc from 'js/appCtxService';
import AwSourceEditor from 'viewmodel/AwSourceEditorViewModel';
import codeViewerUtils from 'js/codeViewerUtils';

/**
 * Initialize Code Viewer
 */
export const initCodeViewer = function( viewModel ) {
    var viewerCtx = appCtxSvc.getCtx( 'viewerContext' );
    if( viewerCtx ) {
        viewerCtx.showWordWrap = true; /// set to true
        viewerCtx.wordWrapped = false;
        viewerCtx.isCodeViewer = true;
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
        appCtxSvc.updateCtx( 'viewerContext', viewerCtx );
    }
    codeViewerUtils.load( viewModel );
};

/**
 * initialize the viewer using initViewer for
 *      1. size the viewer based on available height
 *      2. Get localized message to display till file is loaded
 * then populate content using initCodeViewer
 */
export const awCodeViewerOnMount = function( viewerData, viewModel ) {
    var dataset = viewerData.datasetData;
    var filename = viewerData.fileData.fileUrl;
    var ext = filename.split( '.' ).pop();
    var lang = ext === 'txt' ? 'plaintext' : ext === 'js' ? 'javascript' :
        ext === 'xml' || ext === 'html' || ext === 'json' ? ext : 'plaintext';
    var tab = lang === 'plaintext' ? 8 : 4;

    // viewerData will be properly stored/handled in initViewer
    viewModel.data.viewerData = viewerData;
    viewModel.data.editor = {
        dataset: dataset,
        content: '',
        config: {
            language: lang,
            theme: 'vs',
            options: {
                readOnly: true,
                wordWrap: 'off',
                lineNumbers: 'on',
                automaticLayout: true,
                minimap: {},
                formatOnType: true,
                fontFamily: 'monospace',
                tabSize: tab
            }
        },
        update: function( newContent ) {
            viewModel.data.editor.content = newContent;
            codeViewerUtils.setChange( viewModel );
        }
    };

    // Get the element
    let elem = viewerData.viewerRef.current.querySelector( '.aw-code-viewer' );

    // initialize the viewer
    return codeViewerUtils.initViewer( elem, viewModel );
};

/**
 * Cleanup all watchers and instance members when this scope is destroyed.
 */
export const awCodeViewerOnUnMount = function( viewModel ) {
    codeViewerUtils.cleanup( viewModel );
};

/**
 * Code Viewer Render Function
 * @param {Object} props the props
 */
export const awCodeViewerRenderFn = function( { viewModel, subPanelContext } ) {
    let headerPropList = [];
    let viewerHeaderElem;
    let sourceEditor;
    let editor = {};

    const style = {
        height: viewModel.data.viewerHeight,
        width: viewModel.data.viewerWidth
    };

    if( viewModel.data.viewerData && viewModel.data.editor ) {
        editor = viewModel.data.editor;
        headerPropList = viewModel.data.viewerData.headerPropertyNames;
        viewerHeaderElem =
            <div className='aw-viewerjs-header'>
                <AwViewerHeader data={viewModel.data.viewerData} context={{ ...viewModel.viewerContext, fullScreenState:subPanelContext.fullScreenState }}></AwViewerHeader>
            </div>
        ;

        sourceEditor =
            <div style={style}>
                <AwSourceEditor name='awCodeEditor' value={editor.content}
                    config={editor.config} update={editor.update}></AwSourceEditor>
            </div>
        ;
    }

    return (
        <div id='aw-code-viewer' className='aw-viewerjs-scroll aw-code-viewer' style={style}>
            { headerPropList && headerPropList.length > 0 ? viewerHeaderElem : '' }
            { editor.content || editor.content === '' ? sourceEditor : '' }
        </div>
    );
};

export default {
    initCodeViewer,
    awCodeViewerRenderFn,
    awCodeViewerOnMount,
    awCodeViewerOnUnMount
};
