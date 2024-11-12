import AwXrt2 from 'viewmodel/AwXrt2ViewModel';

export const awSwaXrtRenderFunction = ( { xrtData,
    subPanelContext, fields, objectsetInfo, selectionData, callback, vmo, enableResizeCallback,
    objectType, xrtContext, editContextKey }  ) => {
    if( vmo ) {
        return <AwXrt2 type='SUMMARY' xrtData={xrtData}
            callback={callback} selectionData={selectionData}
            xrtState={fields.xrtState} objectsetInfo={objectsetInfo}
            vmo={vmo} subPanelContext={subPanelContext}
            enableResizeCallback={enableResizeCallback}
            objectType={objectType} xrtContext={xrtContext}
            editContextKey={editContextKey}></AwXrt2>;
    }

    return null;
};
