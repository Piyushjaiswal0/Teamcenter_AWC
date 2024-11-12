import AwDate from 'viewmodel/AwDateViewModel';
import AwFlexRow from 'viewmodel/AwFlexRowViewModel';
import AwFlexColumn from 'viewmodel/AwFlexColumnViewModel';
import AwButton from 'viewmodel/AwButtonViewModel';
import AwFilterPanelUtils from 'js/AwFilterPanelUtils';

export const awDateRangeRenderFunction = ( props ) => {
    let { viewModel, fields, ...prop } = props;
    let {
        dateRangeAction,
        iconId,
        dateBoxClass,
        iconClass
    } = prop;
    let { data } = viewModel;
    let { startValue, endValue } = data;

    let isRangeValid = AwFilterPanelUtils.isDateRangeValid( startValue, endValue );

    const constructCallBack = () => {
        let startVal = startValue ? startValue : 0;
        let endVal = endValue ? endValue : 0;
        if( dateRangeAction ) {
            dateRangeAction( startVal, endVal );
        }
    };

    return (
        <>
            <AwFlexRow>
                <AwFlexColumn>
                    <div className={dateBoxClass}>
                        <AwDate {...Object.assign( {}, fields.startValue, { autocomplete:'off' } )}></AwDate>
                    </div>
                </AwFlexColumn>
                <AwFlexColumn>
                    <div className={dateBoxClass}>
                        <AwDate {...Object.assign( {}, fields.endValue, { autocomplete:'off' } )}></AwDate>
                    </div>
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
