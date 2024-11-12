import AwColumn from 'viewmodel/AwColumnViewModel';
import AwPanelSection from 'viewmodel/AwPanelSectionViewModel';
import AwWalkerElement from 'viewmodel/AwWalkerElementViewModel';
import xrtObjectSetHelperService from 'js/xrtObjectSetHelperService';

export const awWalkerRenderFunction = ( { data, selectionData, xrtState, activeState, enableResizeCallback,
    vmo, type, objectType, dpRef, subPanelContext, xrtContext, objectSetInfo, focusComponent, editContextKey } ) => {
    if( data ) {
        const pageRenderingData = data.data._pageRendering;
        xrtObjectSetHelperService.parseRenderingsForSmartObjectSet( pageRenderingData );
        return (
            pageRenderingData.map( ( elemdata, index ) => {
                const key = `${elemdata.elementType}-${index}`;
                if( elemdata.elementType === 'column' && elemdata.children && elemdata.children.length > 0 ) {
                    return <AwColumn className='aw-xrt-columnContentPanel' width={elemdata.width ? elemdata.width : 'fill'} key={key}>
                        <AwWalkerElement className='aw-xrt-element' key={key} elemdata={elemdata} xrtData={data} xrtState={xrtState}
                            enableResizeCallback={enableResizeCallback} vmo={vmo} type={type} objectType={objectType}
                            selectionData={selectionData} dpRef={dpRef} subPanelContext={subPanelContext}
                            activeState={activeState} xrtContext={xrtContext} objectSetInfo={objectSetInfo}
                            focusComponent={focusComponent} editContextKey={editContextKey}></AwWalkerElement>
                    </AwColumn>;
                }
                if( elemdata.elementType === 'section' && elemdata.children && elemdata.children.length > 0 ) {
                    return <AwPanelSection caption={elemdata.displayTitle} titlekey={elemdata.titleKey} collapsed={elemdata.collapsed} key={key}>
                        <AwWalkerElement className='aw-xrt-element' key={key} elemdata={elemdata} xrtData={data} xrtState={xrtState}
                            enableResizeCallback={enableResizeCallback} vmo={vmo} type={type} objectType={objectType}
                            selectionData={selectionData} dpRef={dpRef} subPanelContext={subPanelContext}
                            activeState={activeState} xrtContext={xrtContext} objectSetInfo={objectSetInfo}
                            focusComponent={focusComponent} editContextKey={editContextKey}></AwWalkerElement>
                    </AwPanelSection>;
                }
                if( elemdata.elementType !== 'column' && elemdata.elementType !== 'section' && elemdata.elementType !== 'command' ) {
                    return <div width='fill' className={elemdata.enableresize ? 'aw-xrt-nonColumnAndSection sw-column w-12 h-12' : 'aw-xrt-nonColumnAndSection sw-column w-12'}>
                        <AwWalkerElement className='aw-xrt-element' key={key} elemdata={elemdata} xrtData={data} xrtState={xrtState}
                            enableResizeCallback={enableResizeCallback} vmo={vmo} type={type} objectType={objectType}
                            selectionData={selectionData} dpRef={dpRef} subPanelContext={subPanelContext}
                            activeState={activeState} xrtContext={xrtContext} objectSetInfo={objectSetInfo}
                            focusComponent={focusComponent} editContextKey={editContextKey}></AwWalkerElement>
                    </div>;
                }
            } )
        );
    }
};
