// Copyright (c) 2021 Siemens
import AwFilterCategoryContents from 'viewmodel/AwFilterCategoryContentsViewModel';
import AwLink from 'viewmodel/AwLinkViewModel';
import AwFilterPanelUtils from 'js/AwFilterPanelUtils';
import AwLabel from 'viewmodel/AwLabelViewModel';
import AwDateRange from 'viewmodel/AwDateRangeViewModel';

export const awFilterCategoryDateFilterRenderFunction = ( props ) => {
    let { viewModel, actions, ...prop } = props;
    let {
        category,
        dateRangeAction,
        dateRangeFacetAction,
        selectFilterAction,
        noResultsFoundLabel,
        moreLinkProp,
        lessLinkProp,
        isBulkMode
    } = prop;
    let { data } = viewModel;
    let { numberOfFiltersToShow } = data;
    let classForFilterCategoryLink = 'aw-search-filterNameLabelMore aw-base-normal';
    let spaceBetweenEachFilter = 'aw-search-filterInBetweenSpace';
    const filterValsLength = category.filterValues ? category.filterValues.length : 0;
    let noResultsFound = filterValsLength === 0;
    let filterContentInfo = AwFilterPanelUtils.restrictFilterValuesToNumberOfFiltersToShow( category, category.filterValues, numberOfFiltersToShow.dbValue );

    const selectFilterCallBackAction = ( filter ) => {
        selectFilterAction( filter, category );
    };

    const getFilterCategoryContents = ( eachFilter, index ) => {
        return (
            <div className={spaceBetweenEachFilter} key={index}
                title={filterContentInfo[ index ] && filterContentInfo[ index ].name ? filterContentInfo[ index ].name : ''}>
                <AwFilterCategoryContents filter={eachFilter} selectFilterCallBackAction={selectFilterCallBackAction} excludeCategory={category.excludeCategory}>
                </AwFilterCategoryContents>
            </div>
        );
    };

    const renderCategoryMoreLink = () => {
        if( filterValsLength > numberOfFiltersToShow.dbValue ) {
            return (
                <AwLink className={classForFilterCategoryLink} {...moreLinkProp} action={actions.updateNumberOfFiltersToShowForMoreLink}>
                </AwLink>
            );
        }
    };

    const renderCategoryLessLink = () => {
        if( numberOfFiltersToShow.dbValue > category.defaultFilterValueDisplayCount ) {
            return (
                <AwLink className={classForFilterCategoryLink} {...lessLinkProp} action={actions.updateNumberOfFiltersToShowForLessLink}>
                </AwLink>
            );
        }
    };

    const getDefaultStartValue = () => {
        if( category.daterange && category.daterange.startDate && category.daterange.startDate !== 0 ) {
            return category.daterange.startDate;
        }
        return '';
    };

    const getDefaultEndValue = () => {
        if( category.daterange && category.daterange.endDate && category.daterange.endDate !== 0 ) {
            return category.daterange.endDate;
        }
        return '';
    };

    const dateRangeCallBackAction = ( startValue, endValue ) => {
        dateRangeAction( category, startValue, endValue );
    };

    const dateRangeFacetCallBackAction = ( startValue, endValue ) => {
        let newCategory = { ...category };
        newCategory.isServerSearch = true;
        dateRangeFacetAction( newCategory, startValue, endValue );
    };

    return (
        <div>
            {
                category.showDateRangeFilter && <AwDateRange
                    iconClass='aw-search-dateRangeSearchIcon'
                    separatorClass='aw-search-rangeSeparator'
                    iconId={isBulkMode ? 'cmdAdd' : 'cmdSearch'}
                    dateBoxClass='aw-search-dateRangeBox'
                    dateRangeAction={dateRangeCallBackAction}
                    dateRangeFacetAction={dateRangeFacetCallBackAction}
                    defaultStartValue={getDefaultStartValue()}
                    defaultEndValue={getDefaultEndValue()}>
                </AwDateRange>
            }
            {
                noResultsFound &&
                <div className={spaceBetweenEachFilter}>
                    <AwLabel {...noResultsFoundLabel}></AwLabel>
                </div>
            }
            {
                filterContentInfo.map( ( eachFilter, index ) => getFilterCategoryContents( eachFilter, index ) )
            }
            {
                renderCategoryLessLink()
            }
            {
                renderCategoryMoreLink()
            }
        </div>
    );
};
