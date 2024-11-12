/*global
 CKEDITOR
 */
CKEDITOR.plugins.add( 'clientImage',
{
    init: function( editor )
    {
        // Only add this button if browser supports File API
        if ( window.File && window.FileList && window.FileReader )
        {
            editor.addCommand( 'clientImageDialog',new CKEDITOR.dialogCommand( 'clientImageDialog' ) );

            editor.ui.addButton( 'ImageUpload',
            {
                label: 'Insert Image',
                command: 'clientImageDialog',
                icon: this.path + 'images/icon.png',
                toolbar: 'insert,10'
            } );
        }

        CKEDITOR.dialog.add( 'clientImageDialog', function ( editor )
        {
            return {
                title : 'Image Properties',
                minWidth : 400,
                minHeight : 100,
                contents :
                [
                    {
                        id : 'tab1',
                        label : 'Image Upload',
                        elements :
                        [
                            {
                                type : 'html',
                                html : '<input type="file" class="cke-upload" accept="image/*" />'
                            }
                        ]
                    }
                ],

                onOk : function()
                {
                    //get the dialog object
                    var dialog = this;

                    // get the CKEDitor document from the dialog
                    var ckDoc = dialog.getElement().getDocument();

                    // get the native DOM from the CKEditor doc
                    var doc = ckDoc.$;

                    // get the last uploaded file element - fix LCS-130164
                    var uploads = doc.getElementsByClassName( "cke-upload" );
                    var file = uploads.length > 0 ? uploads[ uploads.length - 1 ].files[ 0 ] : null;

                    if ( file ) {

                        // create a reader instance
                        var reader = new FileReader();

                        reader.onload = function(event) {

                            // get the base64 image url String
                            var base64ImageUri = event.target.result;

                            // insert image in editor
                            var imgHtml = CKEDITOR.dom.element.createFromHtml('<img src=' + base64ImageUri + ' alt="Image not found!" />');

                            // To specify image max size, set editor.config.imageMaxSize = { height: maxH, width: maxW }
                            if( editor.config.imageMaxSize ) {
                                imgHtml.$.onload = function(e) {
                                    var h = e.target.naturalHeight;
                                    var w = e.target.naturalWidth;
                                    var maxH = editor.config.imageMaxSize.height;
                                    var maxW = editor.config.imageMaxSize.width;
                                    var f = Math.min( maxH ? maxH / h : 1, maxW ? maxW / w : 1, 1 );
                                    imgHtml.$.setAttribute( "height", h * f );
                                    imgHtml.$.setAttribute( "width", w * f );
                                };
                            }
                            editor.insertElement( imgHtml );
                        };

                        // read the data from image as url
                        reader.readAsDataURL( file );
                    }
                }
            };
        } );
    }
} );
