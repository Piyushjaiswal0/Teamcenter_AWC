// Copyright (c) 2022 Siemens

/**
 * This Partition service provider
 *
 * @module js/viewerPartitionManagerProvider
 */
import viewerContextService from 'js/viewerContext.service';
import assert from 'assert';

var exports = {};

/**
 * Provides an instance of viewer Partition manager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {viewerPartitionManagerProvider} Returns viewer Partition manager
 */
export let getPartitionManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    return new ViewerPartitionManager( viewerCtxNamespace, viewerView, viewerContextData );
};

/**
 * Class to hold the viewer Partition data
 *
 * @constructor ViewerPartitionManager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */
var ViewerPartitionManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    assert( viewerContextData, 'Viewer context data can not be null' );

    var self = this;
    var _viewerContextNamespace = viewerCtxNamespace;
    var _viewerView = viewerView;
    var _viewerContextData = viewerContextData;

    /**
     * Set active partition scheme
     *
     * @param {String} referenceLineCsid CSID of referenec BOM line
     * @param {String} partitionSchemeCsid uid of partition scheme
     *
     * @return {Promise} A promise that is either resolved when an active partition scheme is set or
     *  rejected with an Error.
     */
    self.setActivePartitionScheme = function( referenceLineCsid, partitionSchemeCsid ) {
        let refLineOcc = viewerContextService.createViewerOccurance( referenceLineCsid, _viewerContextData );
        let partitionSchemeOcc = viewerContextService.createViewerPartitionSchemeOccurance( partitionSchemeCsid );
        if( !_viewerView.partitionMgr ) {
            return; //return when there is no viewer alive
        }
        return _viewerView.partitionMgr.setActivePartitionScheme( refLineOcc, partitionSchemeOcc );
    };

    /**
     * Set active partition scheme
     *
     * @param {String} referenceLineCsid CSID of referenec BOM line
     *
     * @return {Promise} A promise that is either resolved with an active partition scheme UID or
     *  rejected with an Error.
     */
    self.getActivePartitionScheme = function( referenceLineCsid ) {
        let refLineOcc = viewerContextService.createViewerOccurance( referenceLineCsid, _viewerContextData );
        if( !_viewerView.partitionMgr ) {
            return; //return when there is no viewer alive
        }
        return _viewerView.partitionMgr.getActivePartitionScheme( refLineOcc );
    };
};

export default exports = {
    getPartitionManager
};
