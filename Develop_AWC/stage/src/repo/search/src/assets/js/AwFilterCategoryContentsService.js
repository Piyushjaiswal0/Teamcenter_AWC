// Copyright (c) 2021 Siemens
/*eslint-disable react/jsx-no-undef*/
import AwFlexRow from 'viewmodel/AwFlexRowViewModel';
import AwCheckbox from 'viewmodel/AwCheckboxViewModel';
import AwFilterPanelUtils from 'js/AwFilterPanelUtils';
import AwIcon from 'viewmodel/AwIconViewModel';

export const awFilterCategoryContentsRenderFunction = ( props ) => {
    const { actions, ...prop } = props;
    let { filter } = prop;
    let colorBlockClassName = filter && filter.showColor ? 'aw-search-colorBar ' + filter.color : '';
    let dateDrillDownColorClass = AwFilterPanelUtils.getDateDrillDownClass( filter );
    filter = AwFilterPanelUtils.setFocusForFilter( filter );

    const getFilterLabelColorBlock = () => {
        if( filter && filter.showColor ) {
            return (
                <span className={colorBlockClassName}>&nbsp;</span>
            );
        }
    };

    const getFilterSuffixIcon = () => {
        if( filter.showSuffixIcon && filter.suffixIconId ) {
            return (
                <div
                    className='aw-search-filterCategoryShowSuffixIconContainer'
                    role='button'
                    tabIndex ='0'
                    onClick={actions.selectFilterCallBackAction}
                    onKeyDown={actions.selectFilterCallBackAction}>
                    <AwIcon className='aw-search-filterCategoryShowSuffixIcon' iconId={filter.suffixIconId}>
                    </AwIcon>
                </div>
            );
        }
    };

    const showCheckBox = () => {
        if( filter && filter.showDrilldown ) {
            return (
                <AwFlexRow className={dateDrillDownColorClass}>
                    {
                        getFilterLabelColorBlock()
                    }
                    <AwCheckbox {...filter.selected} action={actions.selectFilterCallBackAction} isNegated={props.excludeCategory}></AwCheckbox>
                </AwFlexRow>
            );
        }
        return (
            <>
                {
                    getFilterLabelColorBlock()
                }
                <AwCheckbox {...filter.selected} action={actions.selectFilterCallBackAction} isNegated={props.excludeCategory}></AwCheckbox>
                {
                    getFilterSuffixIcon()
                }
            </>
        );
    };

    const showFilter = () => {
        if( filter ) {
            return (
                <AwFlexRow>
                    {
                        showCheckBox()
                    }
                </AwFlexRow>
            );
        }
    };

    return (
        <>
            {
                showFilter()
            }
        </>
    );
};
