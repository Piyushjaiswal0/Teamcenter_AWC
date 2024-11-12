// Copyright (c) 2021 Siemens

/**
 * This 3D Markup service provider
 *
 * @module js/viewer3dMarkupManagerProvider
 */
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import assert from 'assert';
import viewerContextService from 'js/viewerContext.service';
import _ from 'lodash';


/**
 * Provides an instance of viewer 3D Markup manager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {Viewer3DMarkupManager} Returns viewer 3D Markup manager
 */
export let getViewer3DMarkupManager = function(  viewerView, viewerContextData ) {
    return new Viewer3DMarkupManager(  viewerView, viewerContextData );
};

/**
 * Class to hold the viewer 3D Markup data
 *
 * @constructor Viewer3DMarkupManager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */
class Viewer3DMarkupManager { 

    constructor( viewerView, viewerContextData ) {
        assert( viewerView, 'Viewer view can not be null' );
        assert( viewerContextData, 'Viewer context data can not be null' );
        this.viewerView = viewerView;
        this.viewerContextData = viewerContextData;

        this.shutDown3DToolbarListeners = [];

        this.setupAtomicDataTopics();
    }

    /**
     * setupAtomicDataTopics ViewerMeasurementManager
     */
    setupAtomicDataTopics() {

        this.viewerContextData.getViewerAtomicDataSubject().subscribe( this.viewerContextData.SUB_COMMANDS_TOOLBAR_ACTIVE_STATUS, this );
        this.viewerContextData.getViewerAtomicDataSubject().subscribe( this.viewerContextData.CLEANUP_3D_VIEWER, this );
        this.viewerContextData.getViewerAtomicDataSubject().subscribe( viewerContextService.VIEWER_COMMAND_PANEL_LAUNCHED, this );
        this.viewerContextData.getViewerAtomicDataSubject().subscribe( viewerContextService.VIEWER_AREA_SELECT, this );
    }

    /**
     * Add 3d markup toolbar close listener
     *
     * @param {Object} observerFunction function to be registered
     */
    add3dMarkupToolbarCloseListener( observerFunction ) {
        if( typeof observerFunction === 'function' ) {
            this.shutDown3DToolbarListeners.push( observerFunction );
        }
    }

    /**
     * remove 3d markup toolbar close listener
     *
     * @param {Object} observerFunction function to be removed
     */
    remove3dMarkupToolbarCloseListener( observerFunction ) {
        if( typeof observerFunction === 'function' ) {
            var indexToBeRemoved = this.shutDown3DToolbarListeners.indexOf( observerFunction );
            if( indexToBeRemoved > -1 ) {
                this.shutDown3DToolbarListeners.splice( indexToBeRemoved, 1 );
            }
        }
    }

    /**
     * Notify viewer to close 3d markup toolbar 
     *
     */
    notify3dMarkupToolbarCloseEvent(viewerContextData, shutDown) {
        if( this.shutDown3DToolbarListeners.length > 0 ) {
            _.forEach( this.shutDown3DToolbarListeners, function( observer ) {
                let neededButNotUsed = null;
                observer.call( neededButNotUsed, viewerContextData, shutDown );
            } );
        }

    }

    /**
     * disable3dMarkup shut down 3d markup toolbar
     */
    disable3dMarkup() {

        appCtxSvc.unRegisterCtx( 'viewerContext' ); 
        
        this.notify3dMarkupToolbarCloseEvent(this.viewerContextData);  
             
        this.viewerContextData.updateViewerAtomicData( 'onScreen3dMarkupContext.tool', null );
        this.viewerContextData.updateViewerAtomicData( 'onScreen3dMarkupContext.subTool', undefined );
        this.viewerContextData.updateViewerAtomicData( 'onScreen3dMarkupContext.display3dMarkupToolbar', false );
    }  

    /**
     * Handle viewer atomic data update
     * @param {String} topic topic
     * @param {Object} data updated data
     */
    update( topic, data ) {
        if( topic === this.viewerContextData.SUB_COMMANDS_TOOLBAR_ACTIVE_STATUS ) {
            
            if( data && !data.isActivated ) {
                this.disable3dMarkup();
            } else {
                if( data && data.isActivated && !( data.commandId === '3dOnScreenStartMarkup' ) ) {
                    this.disable3dMarkup();
                }
            }
            
        } else if( topic ===  this.viewerContextData.CLEANUP_3D_VIEWER ) {
            this.disable3dMarkup();
        } else if( topic ===  viewerContextService.VIEWER_COMMAND_PANEL_LAUNCHED ) {
            this.disable3dMarkup();
        } else if( topic ===  viewerContextService.VIEWER_AREA_SELECT ) {
            this.disable3dMarkup();
        }
    }
    /**
     * Remove all markups EMM
     */
    removeAllAnnotationLayer () {
        var deferred = AwPromiseService.instance.defer();

        this.viewerView.viewMarkupMgr.removeAllMarkups(  )
             .then( function(  ) {
                 deferred.resolve(  );
             } )
             .catch( function( err ) {
                 deferred.reject( err );
            } );
        return deferred.promise;
    }

    /**
     * Add annotations EMM
     */
    addAnnotationLayer ( jsonData, vpHeight, vpWidth ) {
        var deferred = AwPromiseService.instance.defer();
        this.viewerView.viewMarkupMgr.addMarkup( jsonData, vpHeight, vpWidth )
            .then( function( flatBuffer ) {
                deferred.resolve( flatBuffer );
            } )
            .catch( function( err ) {
                deferred.reject( err );
            } );
        return deferred.promise;
    }

   
    /**
     * clear viewer visibility
     */
    cleanUp () {
        this.disable3dMarkup();
    }
}

export default {
    getViewer3DMarkupManager
};
