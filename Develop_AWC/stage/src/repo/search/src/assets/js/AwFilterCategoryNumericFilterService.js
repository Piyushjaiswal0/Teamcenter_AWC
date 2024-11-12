// Copyright (c) 2021 Siemens
import AwFilterCategoryContents from 'viewmodel/AwFilterCategoryContentsViewModel';
import AwLink from 'viewmodel/AwLinkViewModel';
import AwFilterPanelUtils from 'js/AwFilterPanelUtils';
import AwLabel from 'viewmodel/AwLabelViewModel';
import AwNumericRange from 'viewmodel/AwNumericRangeViewModel';

export const awFilterCategoryNumericFilterRenderFunction = ( props ) => {
    let { viewModel, actions, ...prop } = props;
    let {
        category,
        facetAction,
        numericRangeAction,
        numericRangeFacetAction,
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

    const performFacetSearchForCurrentCategory = () => {
        let categoryForFacetSearchInput = {};
        categoryForFacetSearchInput.name = category.internalName;
        categoryForFacetSearchInput.startIndex = numberOfFiltersToShow.dbValue;
        categoryForFacetSearchInput.hasMoreFacetValues = category.hasMoreFacetValues;
        facetAction( categoryForFacetSearchInput, category );
        category.updateNumberOfFiltersShown = false;
    };

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
        } else if( filterValsLength === numberOfFiltersToShow.dbValue && category.hasMoreFacetValues ) {
            return (
                <AwLink className={classForFilterCategoryLink} {...moreLinkProp} action={performFacetSearchForCurrentCategory}>
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
        if( category.numericrange && category.numericrange.filter && category.numericrange.filter.startNumericValue !== 0 ) {
            return category.numericrange.filter.startNumericValue;
        }
        return '';
    };

    const getDefaultEndValue = () => {
        if( category.numericrange && category.numericrange.filter && category.numericrange.filter.endNumericValue !== 0 ) {
            return category.numericrange.filter.endNumericValue;
        }
        return '';
    };

    const numericRangeCallBackAction = ( startValue, endValue ) => {
        numericRangeAction( category, startValue, endValue );
    };

    const numericRangeFacetCallBackAction = ( startValue, endValue ) => {
        let newCategory = { ...category };
        newCategory.isServerSearch = true;
        numericRangeFacetAction( newCategory, startValue, endValue );
    };

    return (
        <div>
            {
                category.showNumericRangeFilter &&
                <AwNumericRange
                    iconClass='aw-search-rangeSearchIcon'
                    separatorClass='aw-search-rangeSeparator'
                    iconId={isBulkMode ? 'cmdAdd' : 'cmdSearch'}
                    numericRangeAction={numericRangeCallBackAction}
                    numericRangeFacetAction={numericRangeFacetCallBackAction}
                    defaultStartValue={getDefaultStartValue()}
                    defaultEndValue={getDefaultEndValue()}>
                </AwNumericRange>
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
