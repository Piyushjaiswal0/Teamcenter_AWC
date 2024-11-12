import AwWidget from 'viewmodel/AwWidgetViewModel';
import uwPropertySvc from 'js/uwPropertyService';

export const awWalkerLabelRenderFunction = ( { labeldata, fields, viewModel } ) => {
    if( !labeldata ) {
        return;
    }
    const { data } = viewModel;
    if( data.property ) {
        return <AwWidget {...fields.property} />;
    }
};

export const createPropertyFromLabelData = ( labeldata, property ) => {
    let vmp;
    if( !property || property.uiValue !== labeldata.displayText  ) {
        vmp = uwPropertySvc.createViewModelProperty( null, null, 'STRING', labeldata.displayText, [ labeldata.displayText ] );
        uwPropertySvc.setPropertyLabelDisplay( vmp, 'NO_PROPERTY_LABEL' );
    }
    return vmp;
};
