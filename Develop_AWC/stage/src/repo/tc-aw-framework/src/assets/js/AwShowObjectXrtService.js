import AwXrt2 from 'viewmodel/AwXrt2ViewModel';
import { updateRedlineProps } from 'js/xrtUtilities';

export const awShowObjectXrtRenderFunction = ( {
    xrtData,
    subPanelContext,
    fields,
    objectsetInfo,
    selectionData,
    callback,
    vmo
} ) => {
    return <AwXrt2 type='SUMMARY' xrtData={xrtData}
        callback={callback} selectionData={selectionData}
        xrtState={fields.xrtState} objectsetInfo={objectsetInfo}
        vmo={vmo} subPanelContext={subPanelContext}></AwXrt2>;
};

export const registerEditHandler = ( activeEditHandler ) => {
    let preSaveActionID;
    if( activeEditHandler ) {
        let updateRedlineHandler = function() {
            updateRedlineProps( activeEditHandler );
        };
        preSaveActionID = activeEditHandler.registerPreSaveAction( updateRedlineHandler );
    }
    return { preSaveActionID: preSaveActionID };
};

export const cleanUp = ( activeEditHandler, preSaveActionID ) => {
    if( activeEditHandler ) {
        activeEditHandler.unregisterPreSaveAction( preSaveActionID );
    }
};
