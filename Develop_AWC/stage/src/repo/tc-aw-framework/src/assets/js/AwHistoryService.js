import AwPanelSection from 'viewmodel/AwPanelSectionViewModel';
import AwList from 'viewmodel/AwListViewModel';
import AwDefaultCell from 'viewmodel/AwDefaultCellViewModel';
import historySvc from 'js/historyService';
import tcFilterService from 'js/tcFilterService';
import AwPromiseService from 'js/awPromiseService';

export const awHistoryRenderFunction = ( { i18n, viewModel } ) => {
    const { dataProviders, dndHandler } = viewModel;

    return (
        <AwPanelSection caption={i18n.recentSectionTitle} collapsed='false'>
            <AwList dataprovider={dataProviders.getRecentObjsProvider} dndHandler={dndHandler}>
                <AwDefaultCell></AwDefaultCell>
            </AwList>
        </AwPanelSection>
    );
};

export const getHistory = async( filterTypes, isIncludeSubTypes, addObjectContext ) => {
    let historyObjects = await historySvc.getHistory( addObjectContext );
    let histResultLength = historyObjects.length;
    let histResults = historyObjects;
    let filterTypesList = [];
    if( filterTypes ) {
        filterTypesList = filterTypes.split( ',' );
    }
    let isIncludeSubTypesLocal = !( isIncludeSubTypes && isIncludeSubTypes === 'false' );
    // filter the favorite items by filter types
    if( filterTypesList.length > 0 ) {
        let filteredFavoriteObjects = await tcFilterService.getFilteredObjects( histResults, filterTypesList, isIncludeSubTypesLocal );
        histResultLength = filteredFavoriteObjects.length;
        histResults = filteredFavoriteObjects;
    }
    return { histResultLength, histResults };
};
