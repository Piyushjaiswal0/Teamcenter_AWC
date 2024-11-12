import searchSnippetsService from 'js/searchSnippetsService';
import AwIcon from 'viewmodel/AwIconViewModel';


/**
 * render function for AwSnippet
 * @param {*} props props
 * @returns {JSX.Element} react component
 */
export const awSearchSnippetServiceRenderFunction = ( props ) => {
    const {  snippets, vmo, i18n } = props;
    if ( vmo && snippets && snippets[vmo.uid] ) {
        const fileContentSnippet = snippets[vmo.uid].fileContentSnippet;
        const fileNameSnippet = snippets[vmo.uid].fileNameSnippet;
        const attachmentNameSnippet = snippets[vmo.uid].attachmentNameSnippet;
        const searchTermsToHighlight = snippets.searchTermsToHighlight;
        let highlightMatchString = searchTermsToHighlight.join( '#HIGHLIGHT#' );
        let itemWithHighlightsContent = searchSnippetsService.highlightSearchResults( fileContentSnippet, highlightMatchString, { cssClass:'aw-widgets-showCellHighlighter' } );
        let itemWithHighlightsName = searchSnippetsService.highlightSearchResults( fileNameSnippet, highlightMatchString, { cssClass:'aw-widgets-showCellHighlighter' } );
        let itemWithHighlightsAttachment = searchSnippetsService.highlightSearchResults( attachmentNameSnippet, highlightMatchString, { cssClass:'aw-widgets-showCellHighlighter' } );
        return (
            <div className='aw-search-cell'>
                <div className='sw-column aw-widgets-cellListCellProperties'>
                    {
                        attachmentNameSnippet && <div><label className='sw-property-name'>{i18n.attachmentNameSnippetMessage}</label>
                            <label className='aw-widgets-propertyValue aw-base-small' title={attachmentNameSnippet}>{itemWithHighlightsAttachment}</label></div>
                    }
                    {
                        fileContentSnippet && <div><label className='aw-widgets-propertyValue aw-base-small' title={fileContentSnippet}>{itemWithHighlightsContent}</label></div>
                    }
                    {

                        fileNameSnippet && <div title={i18n.fileNameSnippetMessage} className='aw-search-padding'><AwIcon className='aw-search-fileNameSnippetIcon' iconId='indicatorAttachment'></AwIcon>
                            <label className='aw-widgets-propertyValue aw-base-small' title={fileNameSnippet}>{itemWithHighlightsName}</label></div>
                    }
                </div>
            </div>
        );
    }
    return '';
};
