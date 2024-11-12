import viewModeService from 'js/viewMode.service';
import { getEvaluatedId } from 'js/uwUtilService';
import { getParentUid } from 'js/objectNavigationService';
import { syncURLWithNewParams } from 'js/selectionSyncUtils';
import { updateDUidParamForTreeSelection, updateParentHierarchyInURL } from 'js/objectNavigationTreeService';

export const getSelectionParamsToSyncInObjectNav = ( selectedObjects, selectionQueryParamKey = 's_uid', baseSelection, objNavState ) => {
    let newParams = {};
    let selectedUids = selectedObjects.map( selectionObj => getEvaluatedId( selectionObj ) );
    let currentViewMode = viewModeService.getViewMode();
        // If a single object is selected update s_uid
        if( selectedUids.length === 1 ) {
            newParams[ selectionQueryParamKey ] = selectedUids[ 0 ];
            newParams = updateDUidParamForTreeSelection( currentViewMode, selectedObjects, newParams );
        } else if( selectedUids.length === 0 ) {
            // If nothing is selected use base selection
            if( baseSelection && baseSelection.uid ) {
                newParams[ selectionQueryParamKey ] = getParentUid( baseSelection );
            } else {
                newParams[ selectionQueryParamKey ] = getParentUid();
            }
            newParams = updateParentHierarchyInURL( currentViewMode, baseSelection, newParams );
        } else {
            // Otherwise clear parameter
            newParams[ selectionQueryParamKey ] = null;
            newParams = updateParentHierarchyInURL( currentViewMode, baseSelection, newParams );
        }
    syncURLWithNewParams( newParams );
};
