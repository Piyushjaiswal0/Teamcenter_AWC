import AwList from 'viewmodel/AwListViewModel';
import AwDefaultCell from 'viewmodel/AwDefaultCellViewModel';

export const awDefaultBreadCrumbListRenderFn = ( props ) => {
    let { viewModel, chevronPopup }  = props;
    return (
        <AwList dataprovider={viewModel.dataProviders.objectNavBreadcrumbChevronDataProvider} commandContext={{ chevronPopup: chevronPopup }} hasFloatingCellCommands={false}>
            <AwDefaultCell vmo='item' ></AwDefaultCell>
        </AwList>
    );
};
