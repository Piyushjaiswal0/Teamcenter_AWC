// Copyright (c) 2022 Siemens

/**
 * Defines {@link NgServices.viewerInteractionServiceGWT} which provides utility functions for viewer
 * 
 * @module js/viewerInteractionServiceGWT
 */
let exports = {};

/**
 * Object that provides access to viewer api's
 */
var viewerApi = {};

var _viewerCtxSvc = null;

/**
 * Set the viewer context service
 * 
 * @param {Object} viewerCtxSvc - viewer context service instance
 */
export let setViewerContextService = function( viewerCtxSvc ) {
    _viewerCtxSvc = viewerCtxSvc;
};

/**
 * Get the viewer api object
 * 
 * @return {Object} An object that provides access to viewer api's
 */
export let getViewerApi = function() {
    return viewerApi;
};

export default exports = {
    setViewerContextService,
    getViewerApi
};
