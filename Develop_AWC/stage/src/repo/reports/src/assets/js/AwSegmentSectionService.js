import AwRadioButton from 'viewmodel/AwRadiobuttonViewModel';
import AwWidget from 'viewmodel/AwWidgetViewModel';
import AwCheckbox from 'viewmodel/AwCheckboxViewModel';
import appCtxService from 'js/appCtxService';
import { EnableWhen } from 'js/hocCollection';

const CheckboxEnableWhen = EnableWhen( AwCheckbox );
const RelRefWidgetEnableWhen = EnableWhen( AwWidget );
const DestTypeEnableWhen = EnableWhen( AwWidget );

export const awSegmentSectionRenderFunction = ( props ) => {
    let { viewModel, actions, ...prop } = props;
    let {
        traverseSegment
    } = prop;
    let { actionClearRelationSegment, populateSegmentDataWithBomInfo } = actions;
    traverseSegment.props.fnd0Direction.name = 'fnd0Direction' + traverseSegment.index;
    traverseSegment.props.fnd0Direction.fielddata.propertyDisplayName = '';
    let bomExpansionStatus = traverseSegment.props.bomExpansionCheckbox ? traverseSegment.props.bomExpansionCheckbox.value : false;
    let checkboxStatus = true;
    let majVersionCheck = appCtxService.getCtx( 'tcSessionData.tcMajorVersion' );
    let minVersionCheck = appCtxService.getCtx( 'tcSessionData.tcMinorVersion' );
    let checkboxVisible = traverseSegment.index === 1 && ( majVersionCheck > 14 ||  majVersionCheck === 14 && minVersionCheck >= 1  );
    return (
        <div>
            <AwRadioButton {...traverseSegment.props.fnd0Direction} action={actionClearRelationSegment}></AwRadioButton>
            { checkboxVisible && <CheckboxEnableWhen { ...traverseSegment.props.bomExpansionCheckbox } action={populateSegmentDataWithBomInfo} enableWhen={checkboxStatus}></CheckboxEnableWhen> }
            {
                traverseSegment.props.fnd0Direction.value && <RelRefWidgetEnableWhen {...traverseSegment.props.fnd0RelationOrReference} enableWhen={!bomExpansionStatus}></RelRefWidgetEnableWhen>
            }
            <DestTypeEnableWhen {...traverseSegment.props.fnd0DestinationType} enableWhen={!bomExpansionStatus}></DestTypeEnableWhen>
            {
                !traverseSegment.props.fnd0Direction.value && <RelRefWidgetEnableWhen {...traverseSegment.props.fnd0RelationOrReference} enableWhen={!bomExpansionStatus}></RelRefWidgetEnableWhen>
            }
        </div>
    );
};
