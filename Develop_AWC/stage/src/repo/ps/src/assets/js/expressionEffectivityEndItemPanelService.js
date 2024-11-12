// Copyright (c) 2022 Siemens

/**
 * @module js/expressionEffectivityEndItemPanelService
 */
import eventBus from 'js/eventBus';
import effectivityUtils from 'js/effectivityUtils';

let exports = {};
let UPDATE_END_ITEM_EVENT = 'ps0Effectivity.updateEndItemValue';
let END_ITEM_PROP_LOADED_EVENT = 'ps0Effectivity.endItemPropLoaded';

/**
 *Update the end item and navigate to main panel.
 *@param {String} destPanelId  Destination panel id
 */
export let updateEndItemAndNavigateToMainPanel = function( eventData, subPanelContext, data ) {
    let endItemRev = effectivityUtils.getElementFromPallete( eventData );
    let endItemLoaded = eventBus.subscribe( END_ITEM_PROP_LOADED_EVENT, function() {
        eventBus.publish( UPDATE_END_ITEM_EVENT );
        eventBus.publish( 'navigatePs0AddEffectivityPanel' );
        eventBus.unsubscribe( endItemLoaded );
    } );

    effectivityUtils.setEndItemAndPublishProvidedEvent( endItemRev,  data, subPanelContext, END_ITEM_PROP_LOADED_EVENT );
};

/**
 * Update end item value from search panel
 * @param {String} data  declarative view model
 */
export let setEndItemAndNavigateToMainPanel = function( data, subPanelContext ) {
    let endItem = data.dataProviders.searchEndItems.selectedObjects[ 0 ];
    if( endItem ) {
        let endItemLoaded = eventBus.subscribe( END_ITEM_PROP_LOADED_EVENT, function() {
            eventBus.publish( UPDATE_END_ITEM_EVENT );
            eventBus.publish( 'navigatePs0AddEffectivityPanel' );
            eventBus.unsubscribe( endItemLoaded );
        } );

        effectivityUtils.setEndItemAndPublishProvidedEvent( endItem, data, subPanelContext, END_ITEM_PROP_LOADED_EVENT );
    }
};

export default exports = {
    setEndItemAndNavigateToMainPanel,
    updateEndItemAndNavigateToMainPanel
};
