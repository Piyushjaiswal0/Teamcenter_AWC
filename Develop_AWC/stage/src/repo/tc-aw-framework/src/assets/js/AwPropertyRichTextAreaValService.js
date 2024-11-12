/* global CKEDITOR */
import awCkeService from 'js/awRichTextEditorService';
import localeService from 'js/localeService';
import declUtils from 'js/declUtils';
import { DOMAPIs as dom } from 'js/domUtils';
import _ from 'lodash';
//////////////////////////////////////////////////////////////////////////
// revisitme: function below and its component needs more refactor
// before move to compiler
//////////////////////////////////////////////////////////////////////////
const prepareConfigForEditor = () => {
    let config = {
        toolbar: [
            'Undo', 'Redo', '|',
            'Bold', 'Italic', 'Underline', 'Strikethrough', 'Subscript', 'Superscript', '|',
            'RemoveFormat', '|',
            '/',
            'NumberedList', 'BulletedList', 'Outdent', 'Indent', '|',
            'FontColor', 'FontBackgroundColor', '|',
            '/',
            'Heading', 'FontFamily', 'FontSize'
        ],
        startupFocus: false // N/A CKEDITOR5
    };
    config.language = localeService.getLanguageCode();
    config.title = false; // N/A CKEDITOR5
    config.pasteFromWordRemoveFontStyles = false; // N/A CKEDITOR5
    config.disableNativeSpellChecker = false; // N/A CKEDITOR5
    // contextmenu plugin is required by tabletools plugin and tabletools ir required by tableselection plugin
    // So, to remove contextmenu and tabletools we need to remove tableselection plugin
    config.removePlugins = [ 'liststyle', 'tableselection' ];
    config.extraAllowedContent = 'img[src,width,height,alt,title]'; // N/A CKEDITOR5
    if( 'CKEDITOR' in window ) {
        CKEDITOR.disableAutoInline = true; // N/A CKEDITOR5
    }
    return config;
};
// --------------------------------
// widgets
// --------------------------------

/**
 * render function for AwPropertyRichTextAreaVal
 * @param {*} param0 context for render function interpolation
 * @returns {JSX.Element} react component
 */
export const awPropertyRichTextAreaValRenderFunction = ( props ) => {
    const { elementRefList, viewModel, ...prop } = props;
    let editor;

    const config = prepareConfigForEditor();

    const getRichTextValClass = () => {
        let classNames = [];
        classNames.push( 'aw-widgets-propertyRichTextEditValue' );
        classNames.push( 'aw-widgets-richText' );
        return classNames.join( ' ' );
    };


    const updateCreateLine = ( richTextElem ) => {
        elementRefList.get( 'richTextAreaVal' ).current = richTextElem;
        if( richTextElem && richTextElem.innerHTML === '' && config ) {
            awCkeService.createInline( richTextElem, config ).then( cke => {
                editor = cke;
                viewModel.dispatch( { path: 'data.ckEditorInstance', value: cke } );
                if( !prop.fielddata.isArray ) {
                    editor.setData( prop.value );
                    editor.on( 'change', ( ) => {
                        prop.update( editor.getData() );
                    } );
                }
            } );
        }
    };

    return (
        <div id={_.uniqueId()}
            ref={ ( richTextElem ) => updateCreateLine( richTextElem ) }
            className={ getRichTextValClass()}
            disabled={false}
            contentEditable='true'>
        </div>

    );
};

export const unmountEditor = ( editor ) => {
    editor.destroy();
};
