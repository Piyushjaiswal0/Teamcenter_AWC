// Copyright (c) 2020 Siemens
/* eslint-disable class-methods-use-this */

/**
 * This module provides the abstraction to use different Rich Text Editors.
 *
 * @module js/awRichTextEditorService
 */

import AwPromiseService from 'js/awPromiseService';
import browserUtils from 'js/browserUtils';
import localeSvc from 'js/localeService';

/*
global
CKEDITOR
*/

let exports;
let isIE;
let CKEDITOR5;

/**
 * Load correct Rich Text Editor on loading this module
 */
let richTextModuleLoadedPromise = _loadRichTextEditor();

/**
 * Function to dynamically load Ckeditor4
 *
 * @returns {Object} - Reference of Ckeditor4
 */
function _loadCkeditor4() {
    return import( '@swf/ckeditor4' );
}

/**
 * Function to dynamically load Ckeditor5
 *
 * @returns {Object} - Reference of Ckeditor5
 */
function _loadCkeditor5() {
    var ckeTranslationFileName = _getTranslationFileName();
    if( ckeTranslationFileName ) {
        // Translation file needs to be loaded saperately
        import( '@swf/ckeditor5/translations/' + ckeTranslationFileName );
    }
    return import( '@swf/ckeditor5' ).then( v => v.default );
}

/**
 * Function to return translation file names from current locale. No file for en_US as it is a default language
 *
 * @returns {String} File name from ckeditor5 translation folder
 */
function _getTranslationFileName() {
    var currentLocale = localeSvc.getLocale();
    var localeName;

    if( currentLocale !== null && currentLocale !== '' && currentLocale !== 'en_US' ) {
        localeName = currentLocale.substring( 0, 2 );
    }

    // Normally first 2 characters, but we have 2 exceptions. And yes there is a dash and not an underscore.
    if( currentLocale === 'pt_BR' || currentLocale === 'zh_CN' ) {
        localeName = currentLocale.replace( /_/g, '-' );
    }
    return localeName;
}

/**
 * Function to load correct RichText Editor based on browser compatability
 * Ckeditor5 supported on all modern browsers except Internet Explorer
 *
 * @returns {Promise} - Promise that will be resolved when editor js is loaded
 */
function _loadRichTextEditor() {
    return new Promise( ( resolve ) => {
        if( browserUtils.isIE ) { // Ckeditor4 if IE browser
            isIE = true;
            _loadCkeditor4().then(
                function() {
                    resolve();
                } );
        } else { // Ckeditor5 on other browsers
            isIE = false;
            _loadCkeditor5().then(
                function( response ) {
                    CKEDITOR5 = response;
                    resolve();
                } );
        }
    } );
}

/**
 * Function to instantiate Classic Rich Text Editor
 *
 * @param {String} elementId - Dom element id to which editor instance needs to be attached
 * @param {Object} config - Configuration to create instance
 * @returns {AwRichTextEditor} - RichText Editor instance
 */
export let create = function( elementId, config ) {
    var deferred = AwPromiseService.instance.defer();
    richTextModuleLoadedPromise.then(
        function() {
            if( isIE ) {
                config = config ? _getCkeditor4Config( config ) : config;
                // Create an instance of the classic Ckeditor4
                var editor = CKEDITOR.replace( elementId, config );
                editor = new AWCkeditor4( editor );
                deferred.resolve( editor );
            } else {
                config = config ? config : {};
                config.extraPlugins = [];
                // Creates an instance of the classic Ckeditor5
                CKEDITOR5.ClassicEditor.create( document.querySelector( '#' + elementId ), config ).then( editor5 => {
                    editor5 = new AWCkeditor5( editor5 );
                    // Check if default height is given in config, if yes set height, as ckedtiro5 does not support default height in config
                    if( config && config.height ) {
                        editor5.resize( undefined, config.height );
                    }
                    // Check if imageMaxSize is given in config, if yes define a schema to set size for image
                    if( config && config.imageMaxSize ) {
                        editor5.setMaxSizeForImage( config.imageMaxSize );
                    }
                    editor5.preventDefaultKeyboardEvents();
                    deferred.resolve( editor5 );
                }, elementId );
            }
        } );
    return deferred.promise;
};

let domElementObj;
/**
 * Function to instantiate inline Rich Text Editor
 *
 * @param {Object} domElement - Dom element to which editor instance needs to be attached
 * @param {Object} config - Configuration to create instance
 * @returns {AwRichTextEditor} - RichText Editor instance
 */
export let createInline = function( domElement, config ) {
    var deferred = AwPromiseService.instance.defer();
    richTextModuleLoadedPromise.then(
        function() {
            if( isIE ) {
                config = config ? _getCkeditor4Config( config ) : config;
                // Creates an instance of the inline Ckeditor4
                var editor = CKEDITOR.inline( domElement, config );
                editor = new AWCkeditor4( editor );
                deferred.resolve( editor );
            } else {
                config = config ? config : {};
                config.extraPlugins = [];
                // Creates an instance of the inline Ckeditor5
                if( domElement !== domElementObj ) {
                    CKEDITOR5.InlineEditor.create( domElement, config ).then( editor5 => {
                        editor5 = new AWCkeditor5( editor5 );
                        editor5.preventDefaultKeyboardEvents();
                        deferred.resolve( editor5 );
                    }, domElement );
                    domElementObj = domElement;
                }
            }
        } );
    return deferred.promise;
};

/**
 * Function to convert the configuration required to instantiate Ckeditor4
 *
 * @param {Object} config - Configuration provided for Ckedior5
 * @returns {Object} Similar configuration required for Ckedigor4
 */
function _getCkeditor4Config( config ) {
    if( config && config.toolbar ) {
        var toolbar_temp = [];
        var group = [];
        toolbar_temp.push( group );
        config.toolbar.forEach( item => {
            // If a button seperator
            if( item === '|' ) {
                group = [];
                toolbar_temp.push( group );
            } else if( item === '/' ) {
                toolbar_temp.push( '/' );
                group = [];
                toolbar_temp.push( group );
            } else {
                var alternateCommand = _getAlternateButtonNameForCkeditor4( item );
                if( Array.isArray( alternateCommand ) ) {
                    group.push( ...alternateCommand );
                } else {
                    group.push( alternateCommand );
                }
            }
        } );
        config.toolbar = toolbar_temp;
        config.removePlugins = !config.removePlugins ? config.removePlugins : config.removePlugins.join( ',' ); // Convert from array to comma seperated string
        config.extraPlugins = !config.extraPlugins ? config.extraPlugins : config.extraPlugins.join( ',' );
    }
    return config;
}

/**
 * Function to return Ckeditor4 specific command name from given Ckeditor5 command
 *
 * @param {String} buttonName - Button name specific to Ckeditor5
 * @returns {String} Alternate button name specific to Ckeditor4
 */
function _getAlternateButtonNameForCkeditor4( buttonName ) {
    switch ( buttonName ) {
        case 'Strikethrough':
            return 'Strike';
        case 'BlockQuote':
            return 'Blocks';
        case 'Alignment':
            return [ 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock' ];
        case 'Heading':
            return 'Format';
        case 'FontFamily':
            return 'Font';
        case 'FontColor':
            return 'TextColor';
        case 'FontBackgroundColor':
            return 'BGColor';
        default:
            return buttonName;
    }
}

/**
 * Interface for Rich Text Editor
 */
class AwRichTextEditor {
    constructor( editor ) {
        // Store native instance of editor
        this._instance = editor;
    }

    /**
     * Api to get RichText content from editor
     */
    getData() {}

    /**
     * Api to get plain content from editor
     */
    getText() {}

    /**
     * Api to set RichText content to editor
     *
     * @param {String} content - RichText contents
     */
    setData( content ) {}

    /**
     * Api to know if editor has modified contents
     */
    checkDirty() {}

    /**
     * Api to resize the editor
     * @param {String} width - width in px
     * @param {String} height - width in px
     */
    resize( width, height ) {}

    /**
     * Api to registers a callback function to be executed when an given event is fired from editor
     *
     * @param {String} eventName - Event name
     * @param {Object} callbackFunction - CallBack function
     */
    on( eventName, callbackFunction ) {}

    /**
     * Api to destroy editor instance
     */
    destroy() {}
}

/**
 * Defines Ckeditor5
 */
class AWCkeditor5 extends AwRichTextEditor {
    constructor( editor ) {
        super( editor );
    }

    getData() {
        return this._instance.getData();
    }

    getText() {
        return this._instance.editing.view.getDomRoot().textContent;
    }

    setData( content ) {
        content = content ? content : '';
        this._instance.setData( content );
    }

    checkDirty() {
        this._instance.checkDirty();
    }

    resize( width, height ) {
        this._instance.editing.view.change( writer => {
            if( height ) {
                writer.setStyle( 'height', height + 'px', this._instance.editing.view.document.getRoot() );
            }
            if( width ) {
                writer.setStyle( 'width', width + 'px', this._instance.editing.view.document.getRoot() );
            }
        } );
    }

    on( eventName, callbackFunction ) {
        switch ( eventName ) {
            case 'instanceReady':
                callbackFunction(); // instance is already ready after creation
                break;
            case 'change':
                this._instance.model.document.on( 'change:data', callbackFunction );
                break;
            case 'focus':
                this._instance.model.document.on( 'focus', callbackFunction );
                break;
            case 'blur':
                this._instance.model.document.on( 'blur', callbackFunction );
                break;
            case 'paste':
                this._instance.model.document.on( 'paste', callbackFunction );
                break;
        }
    }

    destroy() {
        this._instance.destroy();
    }

    /**
     * Prevents launching default keyboard event once event handled inside ckeditor
     */
    preventDefaultKeyboardEvents() {
        [ 'keydown', 'keyup' ].forEach( eventName => {
            this._instance.editing.view.document.on( eventName, ( evt, data ) => {
                var keyId = data.keyCode;
                var ctrl = data.ctrlKey;
                if( ctrl && keyId !== 17 && keyId === 86 ) { // KeyCode: Ctrl - 17, V - 86
                    data.stopPropagation(); // Stop propogation on Ctrl + V
                }
            }, { priority: 'highest' } );
        } );
    }

    /**
     * Function to extend schema for image to support height and to support width & height attributes on img
     * It will set given size to image
     *
     * @param {Object} imgMaxSize - Object with width & height information
     */
    setMaxSizeForImage( imgMaxSize ) {
        if( this._instance.model && this._instance.model.schema && this._instance.conversion ) {
            var self = this;
            const schema = this._instance.model.schema;
            const conversion = this._instance.conversion;
            schema.extend( 'imageBlock', {
                allowAttributes: [ 'width', 'height' ]
            } );
            schema.extend( 'imageInline', {
                allowAttributes: [ 'width', 'height' ]
            } );
            // define attribute converter to set image size for loading already inserted image
            conversion.for( 'downcast' ).add( this._modelToViewAttributeConverter( 'width', 'imageBlock' ) );
            conversion.for( 'downcast' ).add( this._modelToViewAttributeConverter( 'height', 'imageBlock' ) );
            conversion.for( 'downcast' ).add( this._modelToViewAttributeConverter( 'width', 'imageInline' ) );
            conversion.for( 'downcast' ).add( this._modelToViewAttributeConverter( 'height', 'imageInline' ) );
            conversion.for( 'upcast' )
                .elementToElement( {
                    view: {
                        name: 'img',
                        attributes: {
                            src: true,
                            width: true,
                            height: true
                        }
                    },
                    model: ( viewImage, conversionApi ) => {
                        const modelWriter = conversionApi.writer;
                        return modelWriter.createElement( 'image', viewImage.getAttributes() );
                    }
                } )
                .attributeToAttribute( {
                    view: {
                        name: 'img',
                        key: 'width'
                    },
                    model: 'width'
                } )
                .attributeToAttribute( {
                    view: {
                        name: 'img',
                        key: 'height'
                    },
                    model: 'height'
                } );

            this._downcastAttributeConverter( imgMaxSize, 'imageBlock' );
            this._downcastAttributeConverter( imgMaxSize, 'imageInline' );
        }
    }

    /**
     * Add attributes from model to img view element
     *
     * @param {String} attributeKey - attribute name
     * @param {String} modelElementName - Model element name (imageBlock or ImageInline)
     * @returns {Object} - Attribute dispatcher
     */
    _modelToViewAttributeConverter( attributeKey, modelElementName ) {
        return dispatcher => {
            dispatcher.on( 'attribute:' + attributeKey + ':' + modelElementName, ( evt, data, conversionApi ) => {
                const viewWriter = conversionApi.writer;
                const figure = conversionApi.mapper.toViewElement( data.item );
                const img = this._getViewImgFromWidget( figure );

                if( data.attributeNewValue !== null ) {
                    // Set Attribute on img
                    viewWriter.setAttribute( data.attributeKey, data.attributeNewValue, img );

                    // Set attribute as a style on figure view element, on figure it needs value in px
                    var styleAttr = figure.getAttribute( 'style' );
                    var styleAttrValue = '';
                    var isAttributeAddedInStyle = false;
                    var attributeNewValue = data.attributeNewValue.endsWith( 'px' ) ? data.attributeNewValue : data.attributeNewValue + 'px';
                    if( styleAttr ) {
                        var styleAttrArray = styleAttr.split( ';' );
                        styleAttrArray.forEach( function( item ) {
                            if( item && item.indexOf( attributeKey ) >= 0 ) {
                                styleAttrValue = styleAttrValue + data.attributeKey + ':' + attributeNewValue + ';';
                                isAttributeAddedInStyle = true;
                            } else {
                                styleAttrValue = styleAttrValue + item + ';';
                            }
                        } );
                    }
                    if( !isAttributeAddedInStyle ) {
                        styleAttrValue = styleAttrValue + data.attributeKey + ':' + attributeNewValue + ';';
                    }
                    viewWriter.setAttribute( 'style', styleAttrValue, figure );
                }
            } );
        };
    }

    /**
     * Downcast dispatcher to set image size on insert
     *
     * @param {String} imgMaxSize - Image max size
     * @param {String} modelElementName - Model element name (imageBlock or ImageInline)
     * @returns {Object} - Attribute downcast dispatcher
     */
    _downcastAttributeConverter( imgMaxSize, modelElementName ) {
        var self = this;
        this._instance.editing.downcastDispatcher.on( 'attribute:uploadStatus:' + modelElementName, ( evt, insertData, conversionApi ) => {
            if( insertData.attributeNewValue === 'uploading' ) {
                var modelElement = insertData.item;
                var viewElement = conversionApi.mapper.toViewElement( insertData.item );
                const domImg = self._instance.editing.view.domConverter.mapViewToDom( viewElement._children[ 0 ] );
                domImg.onload = function( e ) {
                    // Delete the listener once to avoid unnecessary calls after attr updates
                    delete domImg.onload;
                    domImg.onload = null;
                    // Calculate width & height based on image resolution, calculation copied from clientImage plugin of Ckeditor4
                    var h = e.target.naturalHeight;
                    var w = e.target.naturalWidth;
                    var maxH = imgMaxSize.height;
                    var maxW = imgMaxSize.width;
                    var f = Math.min( maxH ? maxH / h : 1, maxW ? maxW / w : 1, 1 );
                    var heightToSet = h * f;
                    var widthToSet = w * f;

                    // Set Width to modelElement
                    modelElement._setAttribute( 'width', widthToSet + 'px' );
                    modelElement._setAttribute( 'height', heightToSet + 'px' );
                    // Set Width to viewElement
                    viewElement._setAttribute( 'style', 'width:' + widthToSet + 'px;height:' + heightToSet + 'px' );
                    // Set width on img
                    var img = self._getViewImgFromWidget( viewElement );
                    img._setAttribute( 'width', widthToSet );
                    img._setAttribute( 'height', heightToSet );
                };
            }
        } );
    }

    /**
     * Function to return img element from given figure view element
     *
     * @param {Object} figureView - View element for figure
     * @returns {Object} - img view element
     */
    _getViewImgFromWidget( figureView ) {
        if( figureView.is( 'element', 'img' ) ) {
            return figureView;
        }
        return Array.from( figureView.getChildren() ).find( viewChild => viewChild.is( 'element', 'img' ) );
    }
}

/**
 * Defines Ckeditor4
 */
class AWCkeditor4 extends AwRichTextEditor {
    constructor( editor ) {
        super( editor );
    }

    getData() {
        return this._instance.getData();
    }

    getText() {
        return this._instance.document.getBody().getText();
    }

    setData( content ) {
        this._instance.setData( content );
    }

    checkDirty() {
        this._instance.checkDirty();
    }

    resize( width, height ) {
        width = width ? width : this._instance.width;
        height = height ? height : this._instance.height;
        this._instance.resize( width, height );
    }

    on( eventName, callbackFunction ) {
        this._instance.on( eventName, callbackFunction );
    }

    destroy() {
        this._instance.destroy();
    }
}

export default exports = {
    create,
    createInline
};
