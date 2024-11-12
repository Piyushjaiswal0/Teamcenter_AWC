// Copyright (c) 2022 Siemens
/* eslint-disable max-statements-per-line */

import universalViewerUtils from 'js/universalViewerUtils';
import soaSvc from 'soa/kernel/soaService';
import appCtxSvc from 'js/appCtxService';
import messagingSvc from 'js/messagingService';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

export const initViewer = function( element, data ) {
    return universalViewerUtils.initViewer( element, data );
};

//loads the content on editor and sets initial configurations ( e.g. readonly )
export const load = function( viewModel ) {
    var xhr = new XMLHttpRequest();
    xhr.open( 'GET', viewModel.data.fileUrl, true );
    xhr.responseType = 'blob';
    xhr.onload = function( e ) {
        if( this.status === 200 ) {
            viewModel.data.blob = this.response;
            setReadOnly( viewModel );
            setContent( viewModel );
        }
    };
    xhr.send();

    //register viewer header pre and post processing methods
    registerViewerHeaderFunctions( viewModel );
};

//adds functions to viewmodel which then will be used by commands in viewer header
export const registerViewerHeaderFunctions = function( viewModel ) {
    viewModel.data.preCheckin = function() {
        var deferred = AwPromiseService.instance.defer();
        loadSave( viewModel, 'save', function() {
            setChange( viewModel, 1 );
            deferred.resolve();
        } );
        return deferred.promise;
    };

    viewModel.data.postCheckin = function() {
        var deferred = AwPromiseService.instance.defer();
        setReadOnly( viewModel, true );
        deferred.resolve();
        return deferred.promise;
    };

    viewModel.data.preCheckout = function() {
        var deferred = AwPromiseService.instance.defer();
        deferred.resolve();
        return deferred.promise;
    };

    viewModel.data.postCheckout = function() {
        var deferred = AwPromiseService.instance.defer();
        setReadOnly( viewModel, false );
        deferred.resolve();
        return deferred.promise;
    };

    viewModel.data.preCancelCheckout = function() {
        var deferred = AwPromiseService.instance.defer();
        deferred.resolve();
        return deferred.promise;
    };

    viewModel.data.postCancelCheckout = function() {
        var deferred = AwPromiseService.instance.defer();

        // get the original file url
        var viewerData = viewModel.data.viewerData;
        if( viewerData && viewerData.fileData && viewerData.datasetData ) {
            viewerData.fileData.fileUrl = null;
            viewerData.uid = viewerData.datasetData.uid;
        }

        var waitFileUrl = universalViewerUtils.setFileUrl( viewModel.data );
        waitFileUrl.then( function() {
            var xhr = new XMLHttpRequest();
            xhr.open( 'GET', viewModel.data.fileUrl, true );
            xhr.responseType = 'blob';
            xhr.onload = function( e ) {
                if( this.status === 200 ) {
                    viewModel.data.blob = this.response;
                    setReadOnly( viewModel, true );
                    setContent( viewModel );
                    deferred.resolve();
                }
            };
            xhr.send();
        } );
        return deferred.promise;
    };
};

export const loadSave = function( viewModel, method, callback ) {
    if( viewModel.data.editor.dataset ) {
        var inputData = {
            baseObject: { uid: viewModel.data.editor.dataset.uid },
            action: method,
            content: method === 'save' ? viewModel.data.editor.content : ''
        };

        var promise = soaSvc.postUnchecked( 'Internal-DocMgmtAw-2019-12-DocMgmt', 'processTextDataset', inputData );
        promise.then( function( response ) {
            if( response.ServiceData && response.ServiceData.partialErrors && response.ServiceData.partialErrors.length ) {
                var errValue = response.ServiceData.partialErrors[ 0 ].errorValues[ 0 ];
                if( errValue.level <= 1 ) {
                    messagingSvc.showInfo( errValue.message );
                } else {
                    messagingSvc.showError( errValue.message );
                }
            } else if( callback ) {
                callback( response );
            }
        } );
    }
};

//sets editing mode to specific value - 'readOnly'
export const setReadOnly = function( viewModel, readOnly ) {
    if( readOnly === undefined && viewModel.data.editor.dataset && viewModel.data.editor.dataset.props ) {
        var props = viewModel.data.editor.dataset.props;
        var isCheckedOut = props.checked_out && props.checked_out.dbValues[ 0 ] === 'Y';
        var isModifiable = props.is_modifiable && props.is_modifiable.dbValues[ 0 ] === '1';
        readOnly = !isCheckedOut || !isModifiable;
    }

    var viewerCtx = appCtxSvc.getCtx( 'viewerContext' );
    if( !readOnly ) {
        viewerCtx.textEncoding = viewerCtx.textUnicode;
    }
    appCtxSvc.updateCtx( 'viewerContext', viewerCtx );

    const editorConfig = viewModel.data.editor.config;
    if( editorConfig.options.readOnly !== readOnly ) {
        let newConfig = { ...editorConfig };
        newConfig.options = { ...editorConfig.options };
        newConfig.options.readOnly = readOnly;
        viewModel.data.editor.config = newConfig;
        viewModel.dispatch( { path: 'data', value: { ...viewModel.data } } );
    }
};

//sets content of the editor based on file reader result
//dispatch is called to reflect results on window
export const setContent = function( viewModel ) {
    setChange( viewModel, 0 );

    var viewerCtx = appCtxSvc.getCtx( 'viewerContext' );
    var reader = new FileReader();
    reader.onload = function() {
        viewModel.data.editor.content = reader.result;
        viewModel.dispatch( { path: 'data', value: { ...viewModel.data } } );
    };
    reader.readAsText( viewModel.data.blob, viewerCtx.textEncoding );
};

export const setChange = function( viewModel, value ) {
    viewModel.data.editor.change = value === undefined ? viewModel.data.editor.change + 1 : value;
};

export const cleanup = function( viewModel ) {
    if( viewModel.data.editor.change > 1 ) {
        loadSave( viewModel, 'save' );
    }
    eventBus.unsubscribe( 'preCheckin.failure' );
    eventBus.unsubscribe( 'preCheckout.failure' );
    eventBus.unsubscribe( 'aw-command-logEvent' );
    eventBus.unsubscribe( 'sourceEditor.contentChanged' );
    eventBus.unsubscribe( 'fileReplace.success' );
    eventBus.unsubscribe( 'textEditor.encodingChanged' );
    eventBus.unsubscribe( 'textEditor.wordWrap' );
    universalViewerUtils.cleanup( viewModel );
};

////////////    functions called on various events   /////////////

//should execute when encoding is changed
export const updateEncoding = function( viewModel ) {
    var viewerCtx = appCtxSvc.getCtx( 'viewerContext' );
    if( viewModel.data.blob ) {
        var value = viewerCtx.textEncoding === viewerCtx.textUnicode ? viewerCtx.textLocale : viewerCtx.textUnicode;
        viewerCtx.textEncoding = value;
        appCtxSvc.updateCtx( 'viewerContext', viewerCtx );
        setContent( viewModel );
    }
};

//executes when precheckin or postcheckin methods fail
export const revealViewer = function( viewModel, mode, hideDataLossElements ) {
    var deferred = AwPromiseService.instance.defer();
    deferred.resolve();
    return deferred.promise;
};

//for toggling the word wrapping in editor
export const toggleWordWrap = function( viewModel ) {
    var ctx = appCtxSvc.getCtx( 'viewerContext' );
    if( ctx && ctx.showWordWrap ) {
        ctx.wordWrapped = !ctx.wordWrapped;
        appCtxSvc.updateCtx( 'viewerContext', ctx );
        const isWordWrap = ctx.wordWrapped ? 'on' : 'off';
        const editorConfig = viewModel.data.editor.config;
        if( editorConfig.options.wordWrap !== isWordWrap ) {
            let newConfig = { ...editorConfig };
            newConfig.options = { ...editorConfig.options };
            newConfig.options.wordWrap = isWordWrap;
            viewModel.data.editor.config = newConfig;
            viewModel.dispatch( { path: 'data', value: { ...viewModel.data } } );
        }
    }
};

export default {
    initViewer,
    load,
    loadSave,
    setReadOnly,
    setContent,
    setChange,
    registerViewerHeaderFunctions,
    updateEncoding,
    revealViewer,
    toggleWordWrap,
    cleanup
};
