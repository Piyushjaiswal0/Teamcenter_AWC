// Copyright (c) 2022 Siemens

/**
 * This service is used to interact with viewer secondary model.
 * 
 * @module js/viewerSecondaryModelInteractionServiceProvider
 */
import viewerSecondaryModelInteractionServiceGWT from 'js/viewerSecondaryModelInteractionServiceGWT';
import viewerSecondaryModelInteractionService from 'js/viewerSecondaryModelInteractionService';

var exports = {};

/**
 * Provides an instance of viewer interaction service
 * 
 * @param {String} viewerType Type of viewer
 * @return {viewerSecondaryModelInteractionServiceProvider} Returns viewer interaction service provider
 */
export let getViewerSecondaryModelInteractionServiceProvider = function( viewerType ) {
    return new viewerSecondaryModelInteractionServiceProvider( viewerType );
};

/**
 * Class used to act as service provider for viewer interaction
 * 
 * @constructor viewerSecondaryModelInteractionServiceProvider
 * @param {String} viewerType Type of viewer
 */
var viewerSecondaryModelInteractionServiceProvider = function( viewerType ) {
    var self = this;

    self.viewerType = viewerType;

    /**
     * Get viewer interaction service
     * 
     * @return {Object} A service instance that interacts with viewer.
     */
    self.getViewerSecondaryModelInteractionService = function() {
        if( self.viewerType === 'GwtViewer' ) {
            return viewerSecondaryModelInteractionServiceGWT;
        } else if( self.viewerType === 'JsViewer' ) {
            return viewerSecondaryModelInteractionService;
        }
    };
};

export default exports = {
    getViewerSecondaryModelInteractionServiceProvider
};
