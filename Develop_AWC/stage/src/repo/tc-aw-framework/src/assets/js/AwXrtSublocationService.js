import selectionService from 'js/selection.service';

export const handleSelectionChange = ( localSelectionData, baseSelection ) => {
    if( localSelectionData ) {
        let selectionInfo = {};
        const localSelections = localSelectionData.selected ? localSelectionData.selected : [];
        if( localSelections.length > 0 ) {
            selectionInfo = { ...localSelectionData.getValue() };
            selectionInfo.pselected = baseSelection;
            if( selectionInfo.pselected !== localSelectionData.getValue().pselected ) {
                localSelectionData.update( selectionInfo );
            }

            selectionService.updateSelection( localSelections, baseSelection, localSelectionData.relationInfo );
        } else {
            selectionInfo = {};
            selectionInfo.selected = [ baseSelection ];
            selectionInfo.pselected = baseSelection;
            selectionInfo.source = 'base';
            if( selectionInfo.pselected !== localSelectionData.getValue().pselected ) {
                localSelectionData.update( selectionInfo );
            }

            selectionService.updateSelection( baseSelection );
        }
    }
};

