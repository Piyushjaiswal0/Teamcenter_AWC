// Copyright (c) 2022 Siemens

/**
 * Defines {@link NgServices.viewerSecondaryModelInteractionServiceGWT} which provides utility functions for viewer
 * 
 * @module js/viewerSecondaryModelInteractionServiceGWT
 */
let exports = {};

/**
 * Object that provides access to viewer api's
 */
var viewerSecondaryApi = {};

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
export let getSecondaryApi = function() {
    return viewerSecondaryApi;
};

export default exports = {
    setViewerContextService,
    getSecondaryApi
};
