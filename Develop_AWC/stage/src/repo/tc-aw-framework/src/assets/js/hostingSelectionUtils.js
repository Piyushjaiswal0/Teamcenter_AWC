// Copyright (c) 2022 Siemens

/**
  * @module js/hostingSelectionUtils
 */

 let exports = {};

 export const handleHostingSelectionChange = ( eventData, selectionModel ) => {
    if( eventData.selected ) {
        if( eventData.operation === 'replace' ) {
            if( eventData.selected.length < 2 ) {
                selectionModel.setMultiSelectionEnabled( false );
            }
            selectionModel.setSelection(eventData.selected);
        } else if( eventData.operation === 'add' ) {
            selectionModel.addToSelection( eventData.selected );
        } else {
            /**
             * Note: This default case is required to keep some non-hosting use of this hosting
             * event. This default case will be removed once those uses are moved over to use
             * another way to handle their selection.
             */
            selectionModel.setSelection( eventData.selected );
        }
    } 
 };

 exports = {
    handleHostingSelectionChange
 };

 export default exports;

