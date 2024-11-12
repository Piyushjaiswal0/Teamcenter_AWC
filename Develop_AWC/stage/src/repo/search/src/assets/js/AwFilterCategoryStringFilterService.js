// Copyright (c) 2021 Siemens
import AwFilterCategoryContents from 'viewmodel/AwFilterCategoryContentsViewModel';
import AwFilterPanelUtils from 'js/AwFilterPanelUtils';
import AwSearchBox from 'viewmodel/AwSearchBoxViewModel';
import AwFlexRow from 'viewmodel/AwFlexRowViewModel';
import AwTextBox from 'viewmodel/AwTextboxViewModel';
import AwLabel from 'viewmodel/AwLabelViewModel';
import AwButton from 'viewmodel/AwButtonViewModel';
import AwFlexColumn from 'viewmodel/AwFlexColumnViewModel';
import AwLink from 'viewmodel/AwLinkViewModel';
import _ from 'lodash';

export const awFilterCategoryStringFilterRenderFunction = ( props ) => {
    let { viewModel, fields, actions, ctx, ...prop } = props;
    let {
        category,
        facetAction,
        noResultsFoundLabel,
        moreLinkProp,
        lessLinkProp,
        isBulkMode,
        hideBulkModeActionCommand,
        bulkModeStringAction,
        selectFilterAction,
        customFacetSearchDelay
    } = prop;
    let { data, dispatch } = viewModel;
    let { facetSearchString, numberOfFiltersToShow, delayedFacetSearchString } = data;
    let spaceBetweenEachFilter = 'aw-search-filterInBetweenSpace';
    let classForFilterCategoryLink = 'aw-search-filterNameLabelMore aw-base-normal';
    let disableTypeAheadSearch = ctx.preferences && ctx.preferences.AW_DisableTypeAheadFacetSearch[ 0 ].toLowerCase() === 'true';
    let defaultFacetSearchDelay = ctx.preferences && ctx.preferences.AW_TypeAheadFacetSearch_Delay && ctx.preferences.AW_TypeAheadFacetSearch_Delay[ 0 ]
        ? parseInt( ctx.preferences.AW_TypeAheadFacetSearch_Delay[ 0 ] ) : 500;
    let facetSearchDelay = customFacetSearchDelay && customFacetSearchDelay > 0 ? customFacetSearchDelay : defaultFacetSearchDelay;

    let filterContentInfoAfterFilteringByFacetSearchString = !category.isServerSearch ? AwFilterPanelUtils.getFilteredResults( category.filterValues, facetSearchString.dbValue ) : category.filterValues;
    const filterValsLength = filterContentInfoAfterFilteringByFacetSearchString.length;
    let filterContentInfo = AwFilterPanelUtils.restrictFilterValuesToNumberOfFiltersToShow( category, filterContentInfoAfterFilteringByFacetSearchString, numberOfFiltersToShow.dbValue );

    const performFacetSearch = ( facetSearchString ) => {
        let categoryForFacetSearchInput = {};
        categoryForFacetSearchInput.name = category.internalName;
        categoryForFacetSearchInput.facetSearchString = facetSearchString;
        categoryForFacetSearchInput.startIndex = 0;
        categoryForFacetSearchInput.isServerSearch = category.isServerSearch;
        categoryForFacetSearchInput.hasMoreFacetValues = category.hasMoreFacetValues;
        facetAction( categoryForFacetSearchInput, category );
        category.updateNumberOfFiltersShown = false;
    };

    const delayedPerformFacetSearch = _.debounce( ( newValue ) => {
        performFacetSearch( newValue );
    }, facetSearchDelay );

    const loadMoreFacets = () => {
        let categoryForFacetSearchInput = {};
        categoryForFacetSearchInput.name = category.internalName;
        categoryForFacetSearchInput.facetSearchString = facetSearchString.dbValue;
        categoryForFacetSearchInput.startIndex = numberOfFiltersToShow.dbValue;
        categoryForFacetSearchInput.hasMoreFacetValues = category.hasMoreFacetValues;
        facetAction( categoryForFacetSearchInput, category );
        category.updateNumberOfFiltersShown = false;
    };

    const loadMoreFacetsReset = () => {
        let categoryForFacetSearchInput = {};
        categoryForFacetSearchInput.name = category.internalName;
        categoryForFacetSearchInput.facetSearchString = facetSearchString.dbValue;
        categoryForFacetSearchInput.startIndex = 50;
        categoryForFacetSearchInput.hasMoreFacetValues = category.hasMoreFacetValues;
        facetAction( categoryForFacetSearchInput, category );
        category.updateNumberOfFiltersShown = false;
    };

    const updateFacetSearchString = () => {
        dispatch( { path: 'data.facetSearchString', value: delayedFacetSearchString } );
        performFacetSearch( delayedFacetSearchString.dbValue );
    };

    const selectFilterCallBackAction = ( filter ) => {
        selectFilterAction( filter, category );
    };

    const getFilterCategoryContents = ( eachFilter, index ) => {
        return (
            <div className={spaceBetweenEachFilter} key={index}
                title={filterContentInfo[ index ] && filterContentInfo[ index ].name ? filterContentInfo[ index ].name : ''}>
                <AwFilterCategoryContents filter={eachFilter} selectFilterCallBackAction={selectFilterCallBackAction}
                    excludeCategory={category.excludeCategory}>
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
                <AwLink className={classForFilterCategoryLink} {...moreLinkProp} action={loadMoreFacets}>
                </AwLink>
            );
        } else if( filterValsLength < numberOfFiltersToShow.dbValue && category.hasMoreFacetValues ) {
            return (
                <AwLink className={classForFilterCategoryLink} {...moreLinkProp} action={loadMoreFacetsReset}>
                </AwLink>
            );
        }
    };

    const renderCategoryLessLink = () => {
        if( numberOfFiltersToShow.dbValue > category.defaultFilterValueDisplayCount && filterValsLength > category.defaultFilterValueDisplayCount ) {
            return (
                <AwLink className={classForFilterCategoryLink} {...lessLinkProp} action={actions.updateNumberOfFiltersToShowForLessLink}>
                </AwLink>
            );
        }
    };

    const bulkModeStringCallBackAction = () => {
        if( facetSearchString.dbValue.length > 0 && !disableTypeAheadSearch ) {
            bulkModeStringAction( category, facetSearchString.dbValue );
        } else if( delayedFacetSearchString.dbValue.length > 0 && disableTypeAheadSearch ) {
            bulkModeStringAction( category, delayedFacetSearchString.dbValue );
        }
    };

    const getFilterSearchBoxComponent = () => {
        if( category.showFilterText && !disableTypeAheadSearch ) {
            return (
                <AwFlexRow>
                    <AwFlexColumn className='aw-search-filterCategoryTextBox'>
                        <AwTextBox {...Object.assign( {}, fields.facetSearchString, { autoComplete:'off' } )} onSwChange={delayedPerformFacetSearch}></AwTextBox>
                    </AwFlexColumn>
                    <AwFlexColumn>
                        {
                            isBulkMode && facetSearchString.dbValue && facetSearchString.dbValue.length > 0 && !hideBulkModeActionCommand &&
                            <AwButton className='aw-search-bulkStringFilterIcon' iconId='cmdAdd' action={bulkModeStringCallBackAction}></AwButton>
                        }
                    </AwFlexColumn>
                </AwFlexRow>
            );
        } else if( category.showFilterText && disableTypeAheadSearch ) {
            return (
                <AwFlexRow>
                    <AwFlexColumn className='aw-search-filterCategoryTextBox'>
                        <AwSearchBox {...Object.assign( { autoComplete:'off' } )} prop={fields.delayedFacetSearchString} action={updateFacetSearchString}></AwSearchBox>
                    </AwFlexColumn>
                    <AwFlexColumn className='aw-search-nonTypeAheadStringFacetSearch'>
                        {
                            isBulkMode && delayedFacetSearchString && delayedFacetSearchString.dbValue.length > 0 && !hideBulkModeActionCommand &&
                            <AwButton className='aw-search-bulkStringFilterIcon' iconId='cmdAdd' action={bulkModeStringCallBackAction}></AwButton>
                        }
                    </AwFlexColumn>
                </AwFlexRow>
            );
        }
    };

    const renderNoResultsFound = () => {
        if( filterValsLength === 0 ) {
            return (
                <div className={spaceBetweenEachFilter}>
                    <AwLabel {...noResultsFoundLabel}></AwLabel>
                </div>
            );
        }
    };

    return (
        <div>
            {
                getFilterSearchBoxComponent()
            }
            {
                renderNoResultsFound()
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
