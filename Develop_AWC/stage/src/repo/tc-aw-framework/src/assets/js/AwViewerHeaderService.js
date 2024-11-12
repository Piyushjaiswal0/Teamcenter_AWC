import AwLinkWithPopup from 'viewmodel/AwLinkWithPopupViewModel';
import AwPopupCommandBar from 'viewmodel/AwPopupCommandBarViewModel';
import AwPropertyNonEditVal from 'viewmodel/AwPropertyNonEditValViewModel';
import AwToolbar from 'viewmodel/AwToolbarViewModel';
import popupService from 'js/popupService';

/**
 * Render function
 */
export const awViewerHeaderRenderFn = ( { data, context } ) => {
    let elements = [];
    if( data && data.headerPropertyNames ) {
        for( let i = 0; i < data.headerPropertyNames.length; i++ ) {
            let propName = data.headerPropertyNames[ i ];
            let prop;
            if( data.datasetVM ) {
                prop = data.datasetVM[ propName ];
            }
            if( !prop && data.fileVM ) {
                prop = data.fileVM[ propName ];
            }
            let innerElem = '';

            if( prop && prop.name === 'object_name' ) {
                prop.fielddata.propertyDisplayName = prop.fielddata.uiValue;
                innerElem =
                    <AwLinkWithPopup {...prop} linkPopupId='aw-viewer-fileName'>
                        <AwPopupCommandBar anchor='aw_universalViewerLink' context={context} childCommandClickCallback={() => popupService.hide()}></AwPopupCommandBar>
                    </AwLinkWithPopup>;
            } else {
                innerElem =
                    <div className='aw-layout-flexColumn'>
                        <AwPropertyNonEditVal {...prop}></AwPropertyNonEditVal>
                    </div>;
            }
            elements.push(
                <div className='aw-layout-flexRowContainer'>
                    {innerElem}
                </div>
            );
        }
    }

    return (
        <div className='aw-viewerjs-header aw-layout-flexColumn'>
            <div className='aw-layout-headerProperties aw-viewerjs-elementPosition'>
                {elements}
            </div>
            <div className='aw-viewerjs-commandBarLayout'>
                <div className='aw-commands-commandBar'>
                    <div className='aw-commandBar-container'>
                        <AwToolbar firstAnchor='aw_universalViewer' secondAnchor='aw_viewerRightSide,aw_fullScreen' context={context} orientation='HORIZONTAL'></AwToolbar>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default {
    awViewerHeaderRenderFn
};
