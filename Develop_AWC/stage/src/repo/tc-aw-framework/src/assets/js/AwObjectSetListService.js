// Copyright (c) 2021 Siemens
import AwList from 'viewmodel/AwListViewModel';
import AwDefaultCell from 'viewmodel/AwDefaultCellViewModel';
import AwImageCell from 'viewmodel/AwImageCellViewModel';

export const awObjectSetListRenderFunction = ( { viewModel, objectSetData, isImage, showCheckbox, parentUid } ) => {
    const { dataProviders, dndHandler } = viewModel;
    let commandContext = { dataProvider: dataProviders.ObjectSet_Provider };

    if( !isImage ) {
        return <AwList dataprovider={dataProviders.ObjectSet_Provider}
            dndHandler={dndHandler}
            showDropArea={objectSetData.showDropArea}
            showContextMenu='true'
            showCheckbox={showCheckbox}
            commandContext={commandContext}
            parentUid={parentUid}>
            <AwDefaultCell></AwDefaultCell>
        </AwList>;
    }

    return <AwList dataprovider={dataProviders.ObjectSet_Provider}
        dndHandler={dndHandler}
        showDropArea={objectSetData.showDropArea}
        showContextMenu='true'
        showCheckbox={showCheckbox}
        commandContext={commandContext}
        parentUid={parentUid}>
        <AwImageCell></AwImageCell>
    </AwList>;
};
