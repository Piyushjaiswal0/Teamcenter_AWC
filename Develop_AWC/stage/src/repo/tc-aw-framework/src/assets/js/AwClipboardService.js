// Copyright (c) 2021 Siemens

import AwPanelSection from 'viewmodel/AwPanelSectionViewModel';
import AwList from 'viewmodel/AwListViewModel';
import AwDefaultCell from 'viewmodel/AwDefaultCellViewModel';
import ClipboardService from 'js/clipboardService';
import tcFilterService from 'js/tcFilterService';
import awConfiguredRevService from 'js/awConfiguredRevService';
import AwPromiseService from 'js/awPromiseService';

export const awClipboardRenderFunction = ( props ) => {
    const { i18n, viewModel } = props;
    const { dataProviders, dndHandler } = viewModel;

    return (
        <AwPanelSection caption={i18n.Clipboard} collapsed='false'>
            <AwList dataprovider={dataProviders.getClipboardProvider} dndHandler={dndHandler}>
                <AwDefaultCell></AwDefaultCell>
            </AwList>
        </AwPanelSection>
    );
};

export const getClipboardContents = ( filterTypes, isIncludeSubTypes, addObjectContext ) => {
    let cachableObjs = ClipboardService.instance.getCachableObjects();
    var clipboardResultLength = cachableObjs.length;
    var clipboardResults = cachableObjs;
    // filter the favorite items by filter types
    let filterTypesList = [];
    if( filterTypes ) {
        filterTypesList = filterTypes.split( ',' );
    }
    let isIncludeSubTypesLocal = !( isIncludeSubTypes && isIncludeSubTypes === 'false' );

    var deferred = AwPromiseService.instance.defer();
    var promise = deferred.promise;
    if( filterTypesList.length > 0 ) {
        tcFilterService
            .getFilteredObjects( clipboardResults,
                filterTypesList, isIncludeSubTypesLocal )
            .then(
                function( filteredClipboardObjects ) {
                    if( awConfiguredRevService.getShowConfiguredRev( addObjectContext ) === 'true' ) {
                        filteredClipboardObjects = awConfiguredRevService.filterClipboardObjectsForConfRev( filteredClipboardObjects );
                    }
                    clipboardResults = filteredClipboardObjects;
                    clipboardResultLength = clipboardResults.length;
                    return deferred.resolve( { clipboardResultLength, clipboardResults } );
                } );
        return promise;
    }
    return { clipboardResultLength, clipboardResults };
};

export const updateClipboardSelection = ( eventData, { getClipboardProvider } = {}, { shouldClipboardObjsBeSelectedOnLoad } = {} ) => {
    if( eventData.viewModelObjects.length > 0 && getClipboardProvider && shouldClipboardObjsBeSelectedOnLoad === true ) {
        var selectionModel = getClipboardProvider.selectionModel;
        if( selectionModel.mode === 'single' ) {
            // Select first object in clipboard by default in single selection mode
            if( getClipboardProvider.getViewModelCollection().getTotalObjectsLoaded() > 0 ) {
                getClipboardProvider.changeObjectsSelection( 0, 0, true );
            }
        } else {
            // Select all objects in clipboard by default in multiselect mode
            if( getClipboardProvider.selectedObjects.length === 0 ) {
                getClipboardProvider.selectAll();
            }
        }
    }
};
