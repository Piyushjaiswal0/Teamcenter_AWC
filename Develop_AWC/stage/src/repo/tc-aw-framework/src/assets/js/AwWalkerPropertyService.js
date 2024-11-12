import AwWidget from 'viewmodel/AwWidgetViewModel';

export const awWalkerPropertyRenderFunction = ( { prop, propdata, activeState } ) => {
    if( !propdata || !prop ) {
        return;
    }

    return <AwWidget {...prop}
        renderingHint={propdata.renderingHint}
        modifiable={propdata.modifiable}
        labeldisplay={propdata.renderingStyle}
        parameterMap={propdata.parameters}
        activeState={activeState}/>;
};

