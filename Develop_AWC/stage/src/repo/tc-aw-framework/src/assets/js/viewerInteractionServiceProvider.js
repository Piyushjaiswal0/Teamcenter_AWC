// Copyright (c) 2022 Siemens

/**
 * This service is used to interact with viewer.
 * 
 * @module js/viewerInteractionServiceProvider
 */
import viewerInteractionServiceGWT from 'js/viewerInteractionServiceGWT';
import viewerInteractionService from 'js/viewerInteractionService';

var exports = {};

/**
 * Provides an instance of viewer interaction service
 * 
 * @param {String} viewerType Type of viewer
 * @return {ViewerInteractionServiceProvider} Returns viewer interaction service provider
 */
export let getViewerInteractionServiceProvider = function( viewerType ) {
    return new ViewerInteractionServiceProvider( viewerType );
};

/**
 * Class used to act as service provider for viewer interaction
 * 
 * @constructor ViewerInteractionServiceProvider
 * @param {String} viewerType Type of viewer
 */
var ViewerInteractionServiceProvider = function( viewerType ) {
    var self = this;

    self.viewerType = viewerType;

    /**
     * Get viewer interaction service
     * 
     * @return {Object} A service instance that interacts with viewer.
     */
    self.getViewerInteractionService = function() {
        if( self.viewerType === 'GwtViewer' ) {
            return viewerInteractionServiceGWT;
        } else if( self.viewerType === 'JsViewer' ) {
            return viewerInteractionService;
        }
    };
};

export default exports = {
    getViewerInteractionServiceProvider
};
