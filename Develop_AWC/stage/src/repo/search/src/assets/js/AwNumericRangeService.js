import AwNumeric from 'viewmodel/AwNumericViewModel';
import AwFlexRow from 'viewmodel/AwFlexRowViewModel';
import AwFlexColumn from 'viewmodel/AwFlexColumnViewModel';
import AwButton from 'viewmodel/AwButtonViewModel';
import AwFilterPanelUtils from 'js/AwFilterPanelUtils';
import _ from 'lodash';

export const awNumericRangeRenderFunction = ( props ) => {
    let { viewModel, fields, ...prop } = props;
    let {
        numericRangeAction,
        numericRangeFacetAction,
        iconId,
        separatorClass,
        iconClass
    } = prop;
    let { data, dispatch } = viewModel;
    let { startValue, endValue } = data;

    let isRangeValid = AwFilterPanelUtils.isNumericRangeValid( startValue, endValue );

    const onChange = ( event, isStartVal ) => {
        let value = event.target.value;
        let startVal = startValue && startValue.dbValue !== '' && parseFloat( startValue.dbValue ) !== 0 ? parseFloat( startValue.dbValue ) : 0.0;
        let endVal = endValue && endValue.dbValue !== '' && parseFloat( endValue.dbValue ) !== 0 ? parseFloat( endValue.dbValue ) : 0.0;
        if( isStartVal ) {
            startVal = value && value !== '' && parseFloat( value ) !== 0 ? parseFloat( value ) : 0;
            let updateStartVal = _.cloneDeep( startValue );
            updateStartVal.dbValue = value;
            updateStartVal.uiValue = value;
            dispatch( { path: 'data.startValue', value: updateStartVal } );
        } else {
            endVal = value && value !== '' && parseFloat( value ) !== 0 ? parseFloat( value ) : 0;
            let updatedEndVal = _.cloneDeep( endValue );
            updatedEndVal.dbValue = value;
            updatedEndVal.uiValue = value;
            dispatch( { path: 'data.endValue', value: updatedEndVal } );
        }
        if( numericRangeFacetAction ) {
            numericRangeFacetAction( startVal, endVal );
        }
    };

    const constructCallBack = () => {
        let startVal = parseFloat( startValue.dbValue );
        let endVal = parseFloat( endValue.dbValue );
        if( numericRangeAction ) {
            numericRangeAction( startVal, endVal );
        }
    };

    return (
        <>
            <AwFlexRow>
                <AwFlexColumn>
                    <AwNumeric {...Object.assign( {}, fields.startValue, { autocomplete:'off' } )} onChange={( e ) => onChange( e, true )}></AwNumeric>
                </AwFlexColumn>
                <AwFlexColumn>
                    <AwNumeric {...Object.assign( {}, fields.endValue, { autocomplete:'off' } )} onChange={( e ) => onChange( e, false )}></AwNumeric>
                </AwFlexColumn>
                {
                    isRangeValid &&
                    <AwFlexColumn>
                        <AwButton className={iconClass} iconId={iconId} action={constructCallBack}></AwButton>
                    </AwFlexColumn>
                }
            </AwFlexRow>
        </>
    );
};
