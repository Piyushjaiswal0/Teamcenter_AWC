/*global
 CKEDITOR
 */
'use strict';

(function(){
    // define the MathML plugin
    CKEDITOR.plugins.add('mathml',{
        requires: 'widget,mathjax',
        init: function(editor){
            //alert("Hello MathML");
            // add the MathML widget
            var cls = 'math-ml';
            editor.widgets.add('mathml',{
                inline: true,
                mask:true,
                allowedContent : true,
                draggable: false,
                template: '<span contenteditable="false" class="' + cls + '" style="display:inline-block" data-cke-survive=1></span>',
                parts:{
                    span:'span'
                },
                init: function(){
                    var iframe = this.parts.span.getChild( 0 );
                    //alert("hello mathml widget init!!");
                    // Check if span contains iframe and create it otherwise.
                    if ( !iframe || iframe.type !== CKEDITOR.NODE_ELEMENT || !iframe.is( 'iframe' ) ) {
                        iframe = new CKEDITOR.dom.element( 'iframe' );
                        iframe.setAttributes( {
                            style: 'border:0;width:0;height:0',
                            scrolling: 'no',
                            frameborder: 0,
                            allowTransparency: true,
                            src: CKEDITOR.plugins.mathjax.fixSrc
                        } );
                        this.parts.span.append( iframe );
                    }

                    // Wait for ready because on some browsers iFrame will not
                    // have document element until it is put into document.
                    // This is a problem when you crate widget using dialog.
                    this.once( 'ready', function() {
                        // Src attribute must be recreated to fix custom domain error after undo
                        // (see iFrame.removeAttribute( 'src' ) in frameWrapper.load).
                        if ( CKEDITOR.env.ie ){
                            iframe.setAttribute( 'src', CKEDITOR.plugins.mathjax.fixSrc );
                        }

                        this.frameWrapper = new CKEDITOR.plugins.mathml.frameWrapper( iframe, editor );
                        this.frameWrapper.setValue( this.data.math );
                    } );
                },

                data: function() {
                    if ( this.frameWrapper ){
                        this.frameWrapper.setValue( this.data.math );
                    }
                },
                upcast: function( el, data ) {
                    if ( !( el.name === 'span' && el.hasClass( cls ) ) ){
                        return;
                    }

                    console.log("mathML is :", el.getHtml());
                    data.math =el.getHtml() ;

                    // Add style display:inline-block to have proper height of widget wrapper and mask.
                    var attrs = el.attributes;

                    if ( attrs.style ){
                        attrs.style += ';display:inline-block';
                    }
                    else{
                        attrs.style = 'display:inline-block';
                    }

                    // Add attribute to prevent deleting empty span in data processing.
                    attrs[ 'data-cke-survive' ] = 1;

                    el.children[ 0 ].remove();

                    return el;
                },

                downcast: function( el ) {
                    el.children[ 0 ].replaceWith( new CKEDITOR.htmlParser.text(  this.data.math ) );

                    // Remove style display:inline-block.
                    var attrs = el.attributes;
                    attrs.style = attrs.style.replace( /display:\s?inline-block;?\s?/, '' );
                    if ( attrs.style === '' ){
                        delete attrs.style;
                    }

                    return el;
                }

            });
        }
    });

    // plug-in definition ends here

        /**
     * @private
     * @singleton
     * @class CKEDITOR.plugins.mathml
     */
    CKEDITOR.plugins.mathml = {};

    /**
     * FrameWrapper is responsible for communication between the MathJax library
     * and the `iframe` element that is used for rendering mathematical formulas
     * inside the editor.
     * It lets you create visual mathematics by using the
     * {@link CKEDITOR.plugins.mathjax.frameWrapper#setValue setValue} method.
     *
     * @private
     * @class CKEDITOR.plugins.mathjax.frameWrapper
     * @constructor Creates a class instance.
     * @param {CKEDITOR.dom.element} iFrame The `iframe` element to be wrapped.
     * @param {CKEDITOR.editor} editor The editor instance.
     */
    if ( !( CKEDITOR.env.ie && CKEDITOR.env.version === 8 ) ) {
        CKEDITOR.plugins.mathml.frameWrapper = function( iFrame, editor ) {
            var buffer, preview, value, newValue,
                doc = iFrame.getFrameDocument(),

                // Is MathJax loaded and ready to work.
                isInit = false,

                // Is MathJax parsing Tex.
                isRunning = false,

                // Function called when MathJax is loaded.
                loadedHandler = CKEDITOR.tools.addFunction( function() {
                    preview = doc.getById( 'preview' );
                    buffer = doc.getById( 'buffer' );
                    isInit = true;

                    if ( newValue ){
                        update();
                    }

                    // Private! For test usage only.
                    CKEDITOR.fire( 'mathJaxLoaded', iFrame );
                } ),

                // Function called when MathJax finish his job.
                updateDoneHandler = CKEDITOR.tools.addFunction( function() {
                    CKEDITOR.plugins.mathjax.copyStyles( iFrame, preview );

                    preview.setHtml( buffer.getHtml() );

                    editor.fire( 'lockSnapshot' );

                    iFrame.setStyles( {
                        height: 0,
                        width: 0
                    } );

                    // Set iFrame dimensions.
                    var height = Math.max( doc.$.body.offsetHeight, doc.$.documentElement.offsetHeight ),
                        width = Math.max( preview.$.offsetWidth, doc.$.body.scrollWidth );

                    iFrame.setStyles( {
                        height: height + 'px',
                        width: width + 'px'
                    } );

                    editor.fire( 'unlockSnapshot' );

                    // Private! For test usage only.
                    CKEDITOR.fire( 'mathJaxUpdateDone', iFrame );

                    // If value changed in the meantime update it again.
                    if ( value !== newValue ){
                        update();
                    }
                    else{
                        isRunning = false;
                    }
                } );

            iFrame.on( 'load', load );

            load();

            function load() {
                doc = iFrame.getFrameDocument();

                if ( doc.getById( 'preview' ) ){
                    return;
                }

                // Because of IE9 bug in a src attribute can not be javascript
                // when you undo (#10930). If you have iFrame with javascript in src
                // and call insertBefore on such element then IE9 will see crash.
                if ( CKEDITOR.env.ie ){
                    iFrame.removeAttribute( 'src' );
                }

                doc.write( '<!DOCTYPE html>' +
                            '<html>' +
                            '<head>' +
                                '<meta charset="utf-8">' +
                                '<script type="text/x-mathjax-config">' +

                                    // MathJax configuration, disable messages.
                                    'MathJax.Hub.Config( {' +
                                        'showMathMenu: false,' +
                                        'messageStyle: "none"' +
                                    '} );' +

                                    // Get main CKEDITOR form parent.
                                    'function getCKE() {' +
                                        'if ( typeof window.parent.CKEDITOR == \'object\' ) {' +
                                            'return window.parent.CKEDITOR;' +
                                        '} else {' +
                                            'return window.parent.parent.CKEDITOR;' +
                                        '}' +
                                    '}' +

                                    // Run MathJax.Hub with its actual parser and call callback function after that.
                                    // Because MathJax.Hub is asynchronous create MathJax.Hub.Queue to wait with callback.
                                    'function update() {' +
                                        'MathJax.Hub.Queue(' +
                                            '[ \'Typeset\', MathJax.Hub, this.buffer ],' +
                                            'function() {' +
                                                'getCKE().tools.callFunction( ' + updateDoneHandler + ' );' +
                                            '}' +
                                        ');' +
                                    '}' +

                                    // Run MathJax for the first time, when the script is loaded.
                                    // Callback function will be called then it's done.
                                    'MathJax.Hub.Queue( function() {' +
                                        'getCKE().tools.callFunction(' + loadedHandler + ');' +
                                    '} );' +
                                '</script>' +

                                // Load MathJax lib.
                                '<script src="' + ( editor.config.mathJaxLib ) + '"></script>' +
                            '</head>' +
                            '<body style="padding:0;margin:0;background:transparent;overflow:hidden">' +
                                '<span id="preview"></span>' +

                                // Render everything here and after that copy it to the preview.
                                '<span id="buffer" style="display:none"></span>' +
                            '</body>' +
                            '</html>' );
            }

            // Run MathJax parsing Tex.
            function update() {
                isRunning = true;

                value = newValue;

                editor.fire( 'lockSnapshot' );

                buffer.setHtml( value );

                // Set loading indicator.
                preview.setHtml( '<img src=' + CKEDITOR.plugins.mathjax.loadingIcon + ' alt=' + editor.lang.mathjax.loading + '>' );

                iFrame.setStyles( {
                    height: '16px',
                    width: '16px',
                    display: 'inline',
                    'vertical-align': 'middle'
                } );

                editor.fire( 'unlockSnapshot' );

                // Run MathJax.
                doc.getWindow().$.update( value );
            }

            return {
                /**
                 * Sets the TeX value to be displayed in the `iframe` element inside
                 * the editor. This function will activate the MathJax
                 * library which interprets TeX expressions and converts them into
                 * their representation that is displayed in the editor.
                 *
                 * @param {String} value TeX string.
                 */
                setValue: function( value ) {
                    // newValue = CKEDITOR.tools.htmlEncode( value );
                    newValue = value;
                    if ( isInit && !isRunning ){
                        update();
                    }
                }
            };

        };// end of framewrapper
    }
    else{
        //
    }
})();
