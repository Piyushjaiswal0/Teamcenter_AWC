// Copyright (c) 2023 Siemens
import AwPanelSection from 'viewmodel/AwPanelSectionViewModel';
import AwFilterCategory from 'viewmodel/AwFilterCategoryViewModel';
import AwLink from 'viewmodel/AwLinkViewModel';

export const awGroupedFilterPanelRenderFunction = ( props ) => {
    let { ...prop } = props;
    let {
        groupedCategories,
        categories,
        groupExpandAction,
        facetAction,
        numericRangeAction,
        dateRangeAction,
        numericRangeFacetAction,
        dateRangeFacetAction,
        radioAction,
        bulkModeStringAction,
        selectFilterAction,
        moreLinkProp,
        lessLinkProp,
        noResultsFoundLabel,
        hideBulkModeActionCommand,
        isBulkMode,
        context,
        excludeCategoryCallBackAction,
        customFacetSearchDelay,
        categoriesToShowInEachGroup,
        groupsToShow,
        showAllCategoriesInsideEachGroup,
        showAllCategoriesInsideEachGroupProp,
        showAllGroupsVisibleProp,
        showAllGroupsCallBackAction,
        showAllGroupsProp
    } = prop;

    const fetchEachFilterCategory = ( eachGroupCategoryIndex, categoryIndex, showAllCategories ) => {
        // if there is a valid value for number of categories to show in each group and if the current category index is less than that, then render the category.
        // if there is no valid value for number of categories to show in each group, or if the value is 0, then render the category
        // if the showAllCategories inside the given group is set to true, then also render the filter category
        // else we don't render the category
        if( categoriesToShowInEachGroup && categoriesToShowInEachGroup > 0 && categoryIndex < categoriesToShowInEachGroup ||
            !categoriesToShowInEachGroup || categoriesToShowInEachGroup === 0 || showAllCategories ) {
            return (
                <AwFilterCategory
                    key={categoryIndex}
                    category={categories[ eachGroupCategoryIndex ]}
                    facetAction={facetAction}
                    numericRangeAction={numericRangeAction}
                    dateRangeAction={dateRangeAction}
                    numericRangeFacetAction={numericRangeFacetAction}
                    dateRangeFacetAction={dateRangeFacetAction}
                    radioAction={radioAction}
                    bulkModeStringAction={bulkModeStringAction}
                    selectFilterAction={selectFilterAction}
                    noResultsFoundLabel={noResultsFoundLabel}
                    moreLinkProp={moreLinkProp}
                    lessLinkProp={lessLinkProp}
                    hideBulkModeActionCommand={hideBulkModeActionCommand}
                    isBulkMode={isBulkMode}
                    context={context}
                    excludeCategoryCallBackAction={excludeCategoryCallBackAction}
                    customFacetSearchDelay={customFacetSearchDelay}>
                </AwFilterCategory>
            );
        }
        return <></>;
    };

    const fetchEachGroupedCategory = ( eachGroupedCategoryInternalName, eachGroupedCategoryInfo ) => {
        // if the group internal name , display name exists, then we render the group as panel section.
        return (
            eachGroupedCategoryInternalName && eachGroupedCategoryInfo && eachGroupedCategoryInfo.groupDisplayName &&
            <AwPanelSection name={eachGroupedCategoryInfo.groupDisplayName} className='aw-search-filterCategoryGroup'
                caption={eachGroupedCategoryInfo.groupDisplayName} collapsed={!eachGroupedCategoryInfo.expand}
                toggleAction={ () => groupExpandAction( eachGroupedCategoryInternalName, eachGroupedCategoryInfo.expand )}>
                {
                    // if we have the expand flag for group as true, then we decide which category needs to be rendered.
                    eachGroupedCategoryInfo.expand &&
                    eachGroupedCategoryInfo.categoryIndexes.map( ( eachGroupCategoryIndex, categoryIndex ) =>
                        fetchEachFilterCategory( eachGroupCategoryIndex, categoryIndex, eachGroupedCategoryInfo.showAllCategories ) )
                }
                {
                    // if the expand flag for group is true,
                    // and if there are more categories than the number of categories defined in categoriesToShowInEachGroup
                    // then we show a link to be able to show all the rest of the hidden categories inside the group
                    eachGroupedCategoryInfo.expand && categoriesToShowInEachGroup > 0
                    && eachGroupedCategoryInfo.categoryIndexes.length > categoriesToShowInEachGroup && !eachGroupedCategoryInfo.showAllCategories &&
                    <AwLink className='aw-search-showAllfilterCategories' {...showAllCategoriesInsideEachGroupProp} action={ () => showAllCategoriesInsideEachGroup( eachGroupedCategoryInternalName )}></AwLink>
                }
            </AwPanelSection>
        );
    };

    const fetchLimitedGroupsToShowWithShowAllGroupsLink = ( eachGroupedCategoryInternalName, eachGroupedCategoryInfo, groupIndex ) => {
        // if the current group's index is less than the number of groups to show, we render the group
        if( groupIndex < groupsToShow ) {
            return fetchEachGroupedCategory( eachGroupedCategoryInternalName, eachGroupedCategoryInfo );
        }
        return <></>;
    };

    return (
        <>
            {
                // if the user wants to see all the groups
                groupedCategories && Object.keys( groupedCategories ).length > 0 && ( groupsToShow === 0 || Object.keys( groupedCategories ).length <= groupsToShow || !showAllGroupsVisibleProp ) &&
                Object.entries( groupedCategories ).map(
                    ( [ eachGroupedCategoryInternalName, eachGroupedCategoryInfo ] ) => fetchEachGroupedCategory( eachGroupedCategoryInternalName, eachGroupedCategoryInfo ) )
            }
            {
                // this is the default behavior, when there are more than groupsToShow number of groups available
                // in this case, we render the groups which have group index less than the number groupToShow
                groupedCategories && Object.keys( groupedCategories ).length > 0 && Object.keys( groupedCategories ).length > groupsToShow && showAllGroupsVisibleProp &&
                Object.entries( groupedCategories ).map( ( [ eachGroupedCategoryInternalName, eachGroupedCategoryInfo ], groupIndex ) =>
                    fetchLimitedGroupsToShowWithShowAllGroupsLink( eachGroupedCategoryInternalName, eachGroupedCategoryInfo, groupIndex ) )
            }
            {
                // to hide the rest of the groups, this piece of code renders a link.
                groupedCategories && Object.keys( groupedCategories ).length > 0 && Object.keys( groupedCategories ).length > groupsToShow && showAllGroupsVisibleProp && groupsToShow !== 0 &&
                <AwLink className='aw-search-showAllGroups aw-search-showAllfilterCategories' {...showAllGroupsProp} action={showAllGroupsCallBackAction}></AwLink>
            }
        </>
    );
};
