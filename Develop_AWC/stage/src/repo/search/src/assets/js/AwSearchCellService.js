import AwInclude from 'viewmodel/AwIncludeViewModel';
import AwDefaultCell from 'viewmodel/AwDefaultCellViewModel';
import AwSearchSnippet from 'viewmodel/AwSearchSnippetViewModel';

export const awSearchCellRenderFunction = ( props ) => {
    let { vmo, subPanelContext } = props;
    const { listviewCell } = subPanelContext;
    if ( listviewCell && listviewCell !== 'AwSearchCell' ) {
        let cellContext = { ...subPanelContext };
        cellContext.vmo = vmo;
        return (
            <AwInclude name={listviewCell} subPanelContext={cellContext}></AwInclude>
        );
    }
    return (
        <>
            <AwDefaultCell vmo={vmo}></AwDefaultCell>
            <AwSearchSnippet snippets={subPanelContext.searchState.searchSnippets} vmo={vmo}></AwSearchSnippet>
        </>
    );
};
