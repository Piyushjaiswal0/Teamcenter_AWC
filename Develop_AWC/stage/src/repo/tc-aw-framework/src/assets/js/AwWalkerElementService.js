// Copyright (c) 2021 Siemens
import AwColumn from 'viewmodel/AwColumnViewModel';
import AwPanelSection from 'viewmodel/AwPanelSectionViewModel';
import AwWalkerElement from 'viewmodel/AwWalkerElementViewModel';
import AwWalkerChild from 'viewmodel/AwWalkerChildViewModel';
import AwWalkerProperty from 'viewmodel/AwWalkerPropertyViewModel';
import AwWalkerImage from 'viewmodel/AwWalkerImageViewModel';
import AwWalkerLabel from 'viewmodel/AwWalkerLabelViewModel';
import AwBreak from 'viewmodel/AwBreakViewModel';
import AwSeparator from 'viewmodel/AwSeparatorViewModel';
import AwWalkerHtmlPanel from 'viewmodel/AwWalkerHtmlPanelViewModel';
import AwGuidanceMessage from 'viewmodel/AwGuidanceMessageViewModel';
import AwWalkerClassificationProperties from 'viewmodel/AwWalkerClassificationPropertiesViewModel';

export const awWalkerElementRenderFunction = ( { elemdata, xrtData, selectionData, xrtState, activeState,
    enableResizeCallback, vmo, type, objectType, dpRef, subPanelContext, xrtContext, objectSetInfo, focusComponent,
    editContextKey } ) => {
    if( elemdata ) {
        let children = elemdata.children ? elemdata.children : [ elemdata ];
        return (
            children.map( ( child, index ) => {
                const key = `${child.elementType}-${index}`;
                if( child.elementType === 'column' ) {
                    return <AwColumn key={key} className='aw-xrt-columnContentPanel' width={child.width ? child.width : 'fill'} >
                        <AwWalkerElement className='aw-xrt-element' key={key} elemdata={child} xrtData={xrtData}
                            xrtState={xrtState} activeState={activeState}
                            vmo={vmo} type={type} objectType={objectType}
                            selectionData={selectionData} dpRef={dpRef} subPanelContext={subPanelContext}
                            xrtContext={xrtContext} objectSetInfo={objectSetInfo}
                            focusComponent={focusComponent} editContextKey={editContextKey}>
                        </AwWalkerElement>
                    </AwColumn>;
                }

                if( child.elementType === 'section' ) {
                    return <AwPanelSection key={key} caption={child.displayTitle} collapsed={child.collapsed}>
                        <AwWalkerElement className='aw-xrt-element' key={key} elemdata={child} xrtData={xrtData}
                            xrtState={xrtState} vmo={vmo} type={type} objectType={objectType}
                            selectionData={selectionData} dpRef={dpRef} subPanelContext={subPanelContext}
                            activeState={activeState} xrtContext={xrtContext} objectSetInfo={objectSetInfo}
                            focusComponent={focusComponent} editContextKey={editContextKey}>
                        </AwWalkerElement>
                    </AwPanelSection>;
                }

                if( child.elementType === 'property' ) {
                    if( xrtState && xrtState.xrtVMO && xrtState.xrtVMO.props ) {
                        return <AwWalkerProperty prop={xrtState.xrtVMO.props[ child.propertyName ]} propdata={child}
                            type={type} objectType={objectType} activeState={activeState} key={key}></AwWalkerProperty>;
                    }
                    return null;
                }

                if( child.elementType === 'image' ) {
                    return <AwWalkerImage imgdata={child} vmo={vmo} key={key} subPanelContext={subPanelContext}></AwWalkerImage>;
                }

                if( child.elementType === 'break' ) {
                    return <AwBreak key={key}></AwBreak>;
                }

                if( child.elementType === 'separator' ) {
                    return <AwSeparator key={key}></AwSeparator>;
                }

                if( child.elementType === 'label' ) {
                    return <AwWalkerLabel labeldata={child} key={key}></AwWalkerLabel>;
                }

                if( child.elementType === 'htmlPanel' ) {
                    return <AwWalkerHtmlPanel htmlpaneldata={child} xrtData={xrtData} selectionData={selectionData} enableResizeCallback={enableResizeCallback}
                        xrtState={xrtState} type={type} vmo={vmo} subPanelContext={subPanelContext}
                        dpRef={dpRef} key={key} focusComponent={focusComponent}> </AwWalkerHtmlPanel>;
                }

                if( child.elementType === 'warningLabel' ) {
                    const warnmessage = {
                        messageDefn: {
                            messageText: child.text,
                            messageType: 'WARNING'
                        },
                        localizedMessage: child.text
                    };
                    return <AwGuidanceMessage message={warnmessage} bannerStyle='true'
                        showIcon='true' showType='false' key={key}></AwGuidanceMessage>;
                }

                if( child.elementType === 'classificationProperties' ) {
                    return <AwWalkerClassificationProperties classificationdata={child} key={key}></AwWalkerClassificationProperties>;
                }

                return <AwWalkerChild childData={child} xrtData={xrtData} elemdata={elemdata}
                    key={key} xrtState={xrtState}
                    vmo={vmo} type={type} selectionData={selectionData} enableResizeCallback={enableResizeCallback}
                    dpRef={dpRef} subPanelContext={subPanelContext} activeState={activeState}
                    xrtContext={xrtContext} objectSetInfo={objectSetInfo} focusComponent={focusComponent}
                    editContextKey={editContextKey}>
                </AwWalkerChild>;
            } )
        );
    }
};
