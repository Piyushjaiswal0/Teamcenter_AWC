import AwInclude from 'viewmodel/AwIncludeViewModel';
import AwPanelSection from 'viewmodel/AwPanelSectionViewModel';

export const awFilterCategoryRenderFunction = ( props ) => {
    const { actions, ...prop } = props;
    let { category, context, excludeCategoryCallBackAction } = prop;
    let filterComponentPrefix = 'AwFilterCategory';
    let excludeCategoryAction = ( toggleValue ) => {
        excludeCategoryCallBackAction( category, toggleValue );
    };
    const notToggleComponent = category && category.isExcludeCategorySupported ? 'AwFilterCategoryToggle' : null;
    const renderCategoryHeader = () => {
        if( category && category.displayName ) {
            return (
                <AwPanelSection name={category.internalName ? category.internalName : ''}
                    caption={category.displayName} collapsed={category.expand ? 'false' : 'true'}  toggleAction={actions.expandCategory} includeComponentName={notToggleComponent} context={ { ...context, category, excludeCategoryAction }  }>
                    {
                        renderCategory()
                    }
                </AwPanelSection>
            );
        }
    };

    const renderCategory = () => {
        if( category.expand && category.type && category.filterValues && ( category.isPopulated || category.isServerSearch ) ) {
            return (
                <AwInclude name={filterComponentPrefix + category.type} {...prop}></AwInclude>
            );
        }
    };

    return (
        <>
            {renderCategoryHeader()}
        </>
    );
};
