// Copyright (c) 2021 Siemens

/**
 * This ThreeDView service provider
 *
 * @module js/viewerThreeDViewManagerProvider
 */
import AwPromiseService from 'js/awPromiseService';
import assert from 'assert';
import 'js/appCtxService';
import '@swf/ClientViewer';

/**
 * Provides an instance of viewer ThreeDView manager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {viewerThreeDViewManagerProvider} Returns viewer ThreeDView manager
 */
export let getThreeDViewManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    return new ViewerThreeDViewManager( viewerCtxNamespace, viewerView, viewerContextData );
};

/**
 * Class to hold the viewer ThreeDView data
 *
 * @constructor ViewerThreeDViewManager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */
var ViewerThreeDViewManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    assert( viewerContextData, 'Viewer context data can not be null' );

    var self = this;
    var _viewerContextNamespace = viewerCtxNamespace;
    var _viewerView = viewerView;
    var _viewerContextData = viewerContextData;

    /**
     * Returns the active basic display mode
     *
     * @return {Consts.BasicDisplayMode} Basic camera mode in use
     */
    self.getBasicDisplayMode = function() {
        return _viewerView.threeDViewMgr.getBasicDisplayMode();
    };

    /**
     * Returns the current context Display Style
     *
     * @return {Consts.ContextDisplayStyle} Active context display style
     */
    self.getContextDisplayStyle = function() {
        return _viewerView.threeDViewMgr.getContextDisplayStyle();
    };

    /**
     * Returns the current Selection Display Style Percentage Done
     *
     * @return {Consts.SelectionDisplayStyle} Active Selection display style
     */
    self.getSelectionDisplayStyle = function() {
        return _viewerView.threeDViewMgr.getSelectionDisplayStyle();
    };

    /**
     * Sets the Basic display Mode value locally and on the server
     *
     * @param {JSCom.Consts.BasicDisplayMode} displayMode The Basic Display Mode
     *
     */
    self.setBasicDisplayMode = function( displayMode ) {
        return _viewerView.threeDViewMgr.setBasicDisplayMode( displayMode );
    };

    /**
     * Updates the current context Display Style to given one
     *
     * @param {Array.<Object>} occs An array of JSCom.EMM.Occurrence objects to set context
     *
     */
    self.setContext = function( occs ) {
        _viewerView.threeDViewMgr.setContext( occs );
    };

    /**
     * Updates the current context Display Style to given part/assembly
     *
     * @param {JSCom.Consts.ContextDisplayStyle} displayStyle context display style
     *
     */
    self.setContextDisplayStyle = function( displayStyle ) {
        _viewerView.threeDViewMgr.setContextDisplayStyle( displayStyle );
    };

    /**
     * Updates the current Selection Display Style to given one
     *
     * @param {JSCom.Consts.SelectionDisplayStyle} displayStyle Selection display style
     *
     */
    self.setSelectionDisplayStyle = function( displayStyle ) {
        _viewerView.threeDViewMgr.setSelectionDisplayStyle( displayStyle );
    };

    /**
     *Displays JSCom.EMM.Occurrence objects passed in only and does a fitall on them.
     *
     * @param {Array.<Object>} occList JSCom.EMM.Occurrence An array of occurrences
     *
     * @return {Promise}
     */
    self.viewOnly = function( occList ) {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.threeDViewMgr.viewOnly( occList )
            .then( function( result ) {
                deferred.resolve( result );
            }, function( reason ) {
                deferred.reject( reason );
            } );
        return deferred.promise;
    };

    /**
     * returns model unit
     */
    self.getModelUnit = function() {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.threeDViewMgr.getModelUnit()
            .then( function( result ) {
                deferred.resolve( result );
            }, function( reason ) {
                deferred.reject( reason );
            } );
        return deferred.promise;
    };

    /**
     * sets display unit
     */
    self.setDisplayUnit = function( displayUnit ) {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.threeDViewMgr.setDisplayUnit( displayUnit )
            .then( function( result ) {
                deferred.resolve( result );
            }, function( reason ) {
                deferred.reject( reason );
            } );
        return deferred.promise;
    };

    /**
     * get display unit
     */
    self.getDisplayUnit = function() {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.threeDViewMgr.getDisplayUnit()
            .then( function( result ) {
                deferred.resolve( result );
            }, function( reason ) {
                deferred.reject( reason );
            } );
        return deferred.promise;
    };

    /**
     * get background color theme
     */
    self.getBackgroundColorTheme = function() {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.threeDViewMgr.getBackgroundColorTheme()
            .then( function( result ) {
                deferred.resolve( result );
            }, function( reason ) {
                deferred.reject( reason );
            } );
        return deferred.promise;
    };

    /**
     * set background color theme
     */
    self.setBackgroundColorTheme = function( colorTheme ) {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.threeDViewMgr.setBackgroundColorTheme( colorTheme )
            .then( function( result ) {
                deferred.resolve( result );
            }, function( reason ) {
                deferred.reject( reason );
            } );
        return deferred.promise;
    };

    /**
     * get background color themes
     */
    self.getBackgroundColorThemes = function() {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.threeDViewMgr.getBackgroundColorThemes()
            .then( function( result ) {
                deferred.resolve( result );
            }, function( reason ) {
                deferred.reject( reason );
            } );
        return deferred.promise;
    };
};


export default {
    getThreeDViewManager
};
