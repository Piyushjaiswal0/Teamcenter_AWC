import AwModelThumbnail from 'viewmodel/AwModelThumbnailViewModel';
import AwInclude from 'viewmodel/AwIncludeViewModel';

export const awWalkerImageRenderFunction = ( { imgdata, vmo, subPanelContext } ) => {
    let context = {
        ...vmo,
        ...subPanelContext
    };
    if( imgdata && vmo ) {
        if( imgdata.source !== 'preview' ) {
            return <AwModelThumbnail vmo={vmo} imageTicket={imgdata.ticket}></AwModelThumbnail>;
        }

        // using AwInclude, so that in the thumbnail case it doesn't load the ThreeDViewer component
        return <AwInclude name='Awv0ThreeDViewerPage' subPanelContext={context} ></AwInclude>;
    }
};
