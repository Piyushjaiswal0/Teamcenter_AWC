// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * This module holds viewer 3D data
 *
 * @module js/threeDViewerData
 */
import _ from 'lodash';
import eventBus from 'js/eventBus';
import imgViewerExport from 'js/ImgViewer';
import logger from 'js/logger';
import awPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import aw3dViewerService from 'js/aw3dViewerService';
import soaService from 'soa/kernel/soaService';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import AwWindowService from 'js/awWindowService';
import AwTimeoutService from 'js/awTimeoutService';
import viewerPreferenceService from 'js/viewerPreference.service';
import viewerCtxSvc from 'js/viewerContext.service';

const viewer3DParentContainerClass = 'aw-threeDViewer-viewer3DParentContainer';

export default class ThreeDViewerData {
    /**
     * ThreeDViewerData constructor
     * @param {Object} viewerContainerElement - The DOM element to contain the viewer canvas
     */
    constructor( viewerContainerElement ) {
        if( _.isNull( viewerContainerElement ) || _.isUndefined( viewerContainerElement ) ) {
            logger.error( 'Viewer container element can not be null' );
            throw 'Viewer container element can not be null';
        }
        this.viewerContainerElement = viewerContainerElement;
        this.viewerImageCaptureContainer = null;
        this.viewerCtxData = null;
        this.viewerContext = null;
        this.subPanelContext = null;
        this.ROOT_ID = '';

        //Events subscriptions
        this.resizeTimeoutPromise = null;
        this.cleanup3DViewEvent = null;
        this.mvProxySelectionChangedEventListener = null;
        this.viewerPanelsToClose = [ 'Awv0CaptureGallery', 'Awv0GeometricAnalysisProximity',
            'Awv0GeometricAnalysisVolume'
        ];
    }

    /**
     * Initialize native viewer
     * @param {Object} subPanelContext Sub panel context
     * @returns {Object} Selected object to be opened
     */
    static getSelectedModelObject( subPanelContext ) {
        var selectedMO = appCtxSvc.getCtx( 'mselected' );
        var returnMO = null;
        if( Array.isArray( selectedMO ) && selectedMO.length > 0 ) {
            returnMO = selectedMO[ 0 ];
            var selectedMOType = returnMO.modelType;
            let subLocationContext = appCtxSvc.getCtx( 'sublocation' );
            if( subLocationContext && subLocationContext.label === 'Disclosure' ) {
                let inputData = {
                    primaryObjects: [ cdm.getObject( returnMO.uid ) ],
                    pref: {
                        expItemRev: false,
                        returnRelations: true,
                        info: [ {
                            relationTypeName: 'Fnd0DisclosingObject'
                        } ]
                    }
                };
                return soaService.post( 'Core-2007-09-DataManagement', 'expandGRMRelationsForPrimary', inputData ).then( ( response ) => {
                    if( Array.isArray( response.output ) && response.output[ 0 ] &&
                        Array.isArray( response.output[ 0 ].relationshipData ) && response.output[ 0 ].relationshipData[ 0 ] &&
                        Array.isArray( response.output[ 0 ].relationshipData[ 0 ].relationshipObjects ) && response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ 0 ]
                    ) {
                        return cdm.getObject( response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ 0 ].otherSideObject.uid );
                    }
                    return returnMO;
                } ).catch( ( error ) => {
                    logger.error( 'failed to load relation : ' + error );
                    throw 'Could not find collector structure';
                } );
            } else if( subPanelContext.fileData && selectedMOType &&
                selectedMOType.typeHierarchyArray.indexOf( 'CAEAnalysisRevision' ) > -1 ||
                selectedMOType.typeHierarchyArray.indexOf( 'CAEResultRevision' ) > -1 ) {
                var viewerData = subPanelContext;
                if( viewerData ) {
                    var contextObjectUid = null;
                    if( viewerData.datasetData && viewerData.datasetData.uid ) {
                        contextObjectUid = viewerData.datasetData.uid;
                    } else if( viewerData.uid ) {
                        contextObjectUid = viewerData.uid;
                    }
                    returnMO = cdm.getObject( contextObjectUid );
                    return awPromiseService.instance.resolve( returnMO );
                }
            } else {
                return dmSvc.getProperties( [ returnMO.uid ], [ 'IMAN_Rendering' ] ).then( function() {
                    var renderedObj = cdm.getObject( returnMO.uid );
                    if( Array.isArray( renderedObj.props.IMAN_Rendering.dbValues ) && renderedObj.props.IMAN_Rendering.dbValues.length > 0 ) {
                        return returnMO;
                    }
                    var viewerData = subPanelContext;
                    if( viewerData ) {
                        var contextObjectUid = null;
                        if( viewerData.datasetData && viewerData.datasetData.uid ) {
                            contextObjectUid = viewerData.datasetData.uid;
                        } else if( Array.isArray( viewerData.selection ) && viewerData.selection.length > 0 ) {
                            contextObjectUid = viewerData.selection[ 0 ].uid;
                        } else if( viewerData.modelObject && viewerData.modelObject.uid ) {
                            contextObjectUid = viewerData.modelObject.uid;
                        } else if( viewerData.uid ) {
                            contextObjectUid = viewerData.uid;
                        }
                        return cdm.getObject( contextObjectUid );
                    }
                } );
            }
        }
    }

    /**
     * Initialize 3D viewer.
     *
     * @param {Object} subPanelContext Sub panel context
     * @param {Object} viewerAtomicData Viewer atomic data
     * @param {Boolean} force3DViewerReload boolean indicating if 3D should be reloaded forcefully
     *
     * @returns {Promise} A promise thats resolved after loading
     */
    initialize3DViewer( subPanelContext, viewerAtomicData, force3DViewerReload ) {
        let returnPromise = awPromiseService.instance.defer();
        let selectedObj = null;
        this.viewerAtomicData = viewerAtomicData;
        this.subPanelContext = subPanelContext;
        this.setViewerLoadingStatus( true );
        ThreeDViewerData.getSelectedModelObject( subPanelContext ).then( ( returnMO ) => {
            this.updateViewerAtomicData( 'showToolbar', true );
            selectedObj = returnMO;
            if( force3DViewerReload || !aw3dViewerService.isSameProductOpenedAsPrevious( selectedObj ) ) {
                aw3dViewerService.cleanUpPreviousView();
                aw3dViewerService.getViewerLoadInputParameterPromise( selectedObj, this.compute3DViewerWidth(), this.compute3DViewerHeight(), null, returnMO ).then( viewerLoadInputParams => {
                    viewerLoadInputParams.setViewerAtomicData( viewerAtomicData );
                    viewerLoadInputParams.initializeViewerContext();
                    this.viewerCtxData = viewerLoadInputParams.getViewerContext();
                    this.registerForConnectionProblems();
                    aw3dViewerService.getViewerView( viewerLoadInputParams ).then( viewerData => {
                        this.setupViewerAfterLoad( viewerData, selectedObj );
                        returnPromise.resolve( this );
                    }, errorMsg => {
                        logger.error( 'Failed to load viewer : ' + errorMsg );
                        returnPromise.reject( errorMsg );
                    } );
                } ).catch( error => {
                    logger.error( 'Failed to load input param : ' + error );
                    this.setViewerLoadingStatus( false );
                } );
            } else {
                aw3dViewerService.restorePreviousView( viewerAtomicData ).then( viewerData => {
                    this.updateViewerAtomicData( 'showViewerEmmProgress', false );
                    aw3dViewerService.updateStructureViewerVisibility( viewerData[ 0 ], true );
                    this.setupViewerAfterLoad( viewerData, selectedObj );
                    this.registerForConnectionProblems();
                    returnPromise.resolve( this );
                } ).catch( ( errorMsg ) => {
                    logger.error( 'Failed to load viewer : ' + errorMsg );
                    this.setViewerLoadingStatus( false );
                    returnPromise.reject( errorMsg );
                } );
            }
        } );
        return returnPromise.promise;
    }

    /**
     * Register for viewer atomic data topics
     */
    setupAtomicDataTopics() {
        this.viewerCtxData.getViewerAtomicDataSubject().subscribe( viewerCtxSvc.VIEWER_UPDATE_VIEW_WITH_CAPTURED_IMAGE, this );
        this.viewerCtxData.getViewerAtomicDataSubject().subscribe( viewerCtxSvc.VIEWER_DEACTIVATE_IMAGE_CAPTURE_DISPLAY, this );
    }

    /**
     * deregister for atomic data topics
     */
    unregisterAtomicDataTopics() {
        this.viewerCtxData.getViewerAtomicDataSubject().unsubscribe( viewerCtxSvc.VIEWER_UPDATE_VIEW_WITH_CAPTURED_IMAGE, this );
        this.viewerCtxData.getViewerAtomicDataSubject().unsubscribe( viewerCtxSvc.VIEWER_DEACTIVATE_IMAGE_CAPTURE_DISPLAY, this );
    }

    /**
     * Handle viewer atomic data update
     * @param {String} topic topic
     * @param {Object} data updated data
     */
    update( topic, data ) {
        if( topic === viewerCtxSvc.VIEWER_UPDATE_VIEW_WITH_CAPTURED_IMAGE ) {
            this.displayImageCapture( data.fileUrl );
        } else if ( topic === viewerCtxSvc.VIEWER_DEACTIVATE_IMAGE_CAPTURE_DISPLAY ) {
            this.deactivateImageCaptureDisplayInView();
            this.viewerImageCaptureContainer = null;
        }
    }

    /**
     * Registers Product Context launch api
     * @param {Object} viewerData viewer Data
     * @param {Object} viewerContextObj viewer context data object
     */
    setupViewerAfterLoad( viewerData, viewerContextObj ) {
        this.viewerContainerElement.append( viewerData[ 1 ] );
        this.viewerCtxData = viewerData[ 0 ];
        this.registerForOtherViewerEvents();
        this.setupViewerImageCaptureContainer();
        if( !this.viewerCtxData.isMMVRendering() ) {
            this.viewerCtxData.getThreeDViewManager().setBasicDisplayMode( viewerPreferenceService.getShadedWithEdgesPreference( this.viewerCtxData ) ? 1 : 0 );
        }
        this.viewerCtxData.updateCurrentViewerProductContext( viewerContextObj );
        this.setViewerLoadingStatus( false );
        AwTimeoutService.instance( () => {
            this.set3DViewerSize();
        } );
        this.setupAtomicDataTopics();
        this.registerForResizeEvents();
    }

    /**
     * Set 3d viewer loading status
     * @param {Boolean} isLoading is viewer loading
     */
    setViewerLoadingStatus( isLoading ) {
        this.isLoading = isLoading;
        this.updateViewerAtomicData( 'loadingViewer', isLoading );
    }

    /**
     * Register for viewer visibility events
     */
    registerForConnectionProblems() {
        this.viewerCtxData.addViewerConnectionProblemListener( this.handle3DViewerConnectionProblem, this );
    }

    /**
     * Handler for 3D viewer connection issues
     * @param {Object} viewerCtxDataRef - reference to viewer context data
     */
    handle3DViewerConnectionProblem() {
        this.notify3DViewerReload();
    }

    /**
     * Notify reset parameters  for 3D viewer reload
     */
    notifyResetParametersFor3DReload() {
        eventBus.publish( 'threeDViewer.resetParametersFor3DReload', { viewerContext: this.viewerCtxData.getViewerCtxNamespace() } );
    }

    /**
     * Notify 3D viewer reload event
     */
    notify3DViewerReload() {
        eventBus.publish( 'threeDViewer.reload3DViewer', { viewerContext: this.viewerCtxData.getViewerCtxNamespace() } );
    }

    /**
     * Notify display image capture
     * @param {Boolean} isShow - boolean indicating if image capture should be shown
     */
    notifyDisplayImageCapture( isShow ) {
        this.updateViewerAtomicData( 'displayImageCapture', isShow );
    }

    /**
     * Reload 3D viewer.
     *
     * @param {Object} subPanelContext Sub panel context
     * @returns {Promise} A promise thats resolved after successful reload
     */
    reload3DViewer( subPanelContext, viewerAtomicData ) {
        if( this.isLoading ) {
            return awPromiseService.instance.reject( 'Already loading!' );
        }
        if( !subPanelContext ) {
            subPanelContext = this.subPanelContext;
        }
        this.notifyResetParametersFor3DReload();
        this.ctrlCleanup( true );
        return this.initialize3DViewer( subPanelContext, viewerAtomicData, true ).catch( ( error ) => {
            logger.error( 'Failed to load viewer : ' + error );
            return awPromiseService.instance.reject( error );
        } );
    }

    /**
     * Set 3d Viewer size
     */
    set3DViewerSize() {
        if( this.resizeTimeoutPromise ) {
            AwTimeoutService.instance.cancel( this.resizeTimeoutPromise );
        }
        this.resizeTimeoutPromise = AwTimeoutService.instance( () => {
            this.resizeTimeoutPromise = null;
            this.viewerCtxData.setSize( this.compute3DViewerWidth(), this.compute3DViewerHeight() );
        }, 250 );
    }

    /**
     * Compute 3D viewer height
     *
     * @returns {Number} computed client height
     */
    compute3DViewerHeight() {
        let currElement = this.viewerContainerElement;
        while( currElement && !_.includes( currElement.className, viewer3DParentContainerClass ) ) {
            currElement = currElement.parentElement;
        }
        let heightElement = this.viewerContainerElement;
        while( heightElement && ( !_.includes( heightElement.className, 'aw-base-scrollPanel' ) ? true : heightElement && heightElement.tagName !== 'DIV' ) &&
            !_.includes( heightElement.className, 'aw-viewerjs-elementPosition' ) && !_.includes( heightElement.className, 'sw-full-screen-on' ) ) {
            heightElement = heightElement.parentElement;
        }
        if( !_.isNull( heightElement ) && !_.isUndefined( heightElement ) ) {
            let parentElement = currElement.parentElement;
            if( _.includes( heightElement.className, 'sw-full-screen-on' ) ) {
                //We need to subtract 48 which is the height of the toolbar
                currElement.style.height = heightElement.clientHeight - 42 - 48 + 'px';
                return heightElement.clientHeight - 42 - 48;
            }
            let locationCtx = appCtxSvc.getCtx( 'locationContext' );
            if( locationCtx['ActiveWorkspace:Location'] === 'com.siemens.splm.clientfx.tcui.xrt.showObjectLocation' ) {
                //Need to adjust the padding on show object location
                parentElement.style.height = heightElement.clientHeight - 32 + 'px';
                //We need to subtract 48 which is the height of the toolbar
                currElement.style.height = heightElement.clientHeight - 32 - 48 + 'px';
                return heightElement.clientHeight - 32 - 48;
            }
            parentElement.style.height = heightElement.clientHeight + 'px';
            //We need to subtract 48 which is the height of the toolbar
            currElement.style.height = heightElement.clientHeight - 48 + 'px';
            return heightElement.clientHeight - 48;
        }
        return currElement.clientHeight;
    }

    /**
     * Compute 3D viewer width
     *
     * @returns {Number} computed client width
     */
    compute3DViewerWidth() {
        let currElement = this.viewerContainerElement;
        while( currElement && !_.includes( currElement.className, viewer3DParentContainerClass ) ) {
            currElement = currElement.parentElement;
        }
        return currElement.clientWidth;
    }

    /**
     * Setup viewer image capture container
     */
    setupViewerImageCaptureContainer() {
        let currElement = this.viewerContainerElement;
        while( currElement && !_.includes( currElement.className, viewer3DParentContainerClass ) ) {
            currElement = currElement.parentElement;
        }
        _.forEach( currElement.children, ( child ) => {
            if( child.id === 'imageCaptureContainer' ) {
                this.viewerImageCaptureContainer = child;
                return false;
            }
        } );
    }

    /**
     * Display image capture upon trigger of image capture event.
     *
     * @param {String} fileUrl - Image capture url.
     */
    displayImageCapture( fileUrl ) {
        if( fileUrl ) {
            this.notifyDisplayImageCapture( true );
            if( !this.viewerImageCaptureContainer ) {
                this.setupViewerImageCaptureContainer();
            }
            this.viewerImageCaptureContainer.innerHTML = '';
            let displayImgCaptureDiv = document.createElement( 'div' );
            displayImgCaptureDiv.id = 'awDisplayImageCapture';
            this.viewerImageCaptureContainer.appendChild( displayImgCaptureDiv );
            const imgViewer = imgViewerExport.newInstance( this.viewerImageCaptureContainer );
            this.viewerImageCaptureContainer.imgViewer = imgViewer;
            this.viewerCtxData.getViewerAtomicDataSubject().notify( this.viewerCtxData.IMAGE_CAPTURE_CONTAINER, this.viewerImageCaptureContainer );
            imgViewer.setImage( fileUrl );
        } else {
            logger.error( 'Failed to display image capture due to missing image url.' );
        }
    }

    /**
     * Deactivates the display if image capture in viewer upon deactivate image capture event.
     */
    deactivateImageCaptureDisplayInView() {
        this.viewerCtxData.getViewerAtomicDataSubject().notify( this.viewerCtxData.IMAGE_CAPTURE_CONTAINER, null );
        this.notifyDisplayImageCapture( false );
    }

    /**
     * Register for viewer events
     */
    registerForOtherViewerEvents() {
        if( this.mvProxySelectionChangedEventListener === null ) {
            this.mvProxySelectionChangedEventListener = eventBus.subscribe(
                'ObjectSet_2_Provider.selectionChangeEvent',
                function( eventData ) {
                    this.viewerCtxData.getModelViewManager().invokeModelViewProxy( eventData.selectedObjects[ 0 ].props.fnd0DisclosedModelView.dbValues[ 0 ] );
                }.bind( this ), 'threeDViewerData' );
        }
    }

    /**
     * Register for viewer resize events
     */
    registerForResizeEvents() {
        // Handle Window resize event
        AwWindowService.instance.onresize = () => {
            this.set3DViewerSize();
        };
    }

    /**
     * update viewer atomic data
     *
     * @param {Object} propertyPath path of property on atomic data value
     * @param {Object} propertyValue vlaue to be set on that path
     */
    updateViewerAtomicData( propertyPath, propertyValue ) {
        const newViewerAtomicData = { ...this.viewerAtomicData.getValue() };
        _.set( newViewerAtomicData, propertyPath, propertyValue );
        this.viewerAtomicData.update( newViewerAtomicData );
    }

    /**
     * Clean up the current
     * @param {Boolean} isReloadViewer - boolean indicating if viewer is reloading while clean up.
     */
    ctrlCleanup( isReloadViewer ) {
        if( this.viewerCtxData ) {
            this.viewerCtxData.removeViewerConnectionProblemListener( this.handle3DViewerConnectionProblem );
            appCtxSvc.unRegisterCtx( this.viewerCtxData.getViewerCtxNamespace() );
            if( isReloadViewer ) {
                const atomicData = this.viewerCtxData.getViewerAtomicData();
                let updatedViewerAtomicDataValue = { ...atomicData.getValue() };
                updatedViewerAtomicDataValue.isViewerRevealed = false;
                updatedViewerAtomicDataValue.viewerViewMode = 'NOVIEWER';
                updatedViewerAtomicDataValue.loadingViewer = true;
                updatedViewerAtomicDataValue.showToolbar = false;
                updatedViewerAtomicDataValue.subCommandToolbarState = {};
                updatedViewerAtomicDataValue.viewerMeasurement = {};
                updatedViewerAtomicDataValue.geoAnalysisVolumeSearch = {};
                updatedViewerAtomicDataValue.hasPMIData = false;
                updatedViewerAtomicDataValue.allowSectionCreation = false;
                updatedViewerAtomicDataValue.enableSectionCommandPanel = false;
                updatedViewerAtomicDataValue.showViewerEmmProgress = true;
                updatedViewerAtomicDataValue.showViewerProgress = false;
                updatedViewerAtomicDataValue.displayImageCapture = false;
                updatedViewerAtomicDataValue.activeCaptureGalleryTab = 'InputImageCapture';
                updatedViewerAtomicDataValue.onScreen2dMarkupContext = {};
                updatedViewerAtomicDataValue.viewerCtxNamespace =  this.viewerCtxData.getViewerCtxNamespace();
                updatedViewerAtomicDataValue.isSubCommandsToolbarVisible = false;
                atomicData.update( updatedViewerAtomicDataValue );
            }
        }

        if( this.mvProxySelectionChangedEventListener ) {
            eventBus.unsubscribe( this.mvProxySelectionChangedEventListener );
            this.mvProxySelectionChangedEventListener = null;
        }

        if( this.cleanup3DViewEvent ) {
            eventBus.unsubscribe( this.cleanup3DViewEvent );
            this.cleanup3DViewEvent = null;
        }

        if( isReloadViewer ) {
            this.viewerContainerElement.innerHTML = '';
        }

        //Close any 3D panel when moving away from 3D view
        let viewId = this.viewerCtxData.getValueOnViewerAtomicData( viewerCtxSvc.VIEWER_ACTIVE_DIALOG_ENABLED );
        if( viewId && !_.isEmpty( viewId ) ) {
            this.viewerCtxData.closeActiveDialog();
        } else {
        //always close if any panel open during clean up
        //firing the complete event should be removed once all sidenavs are converted to dialogs
            var activeToolAndInfoCmd = appCtxSvc.getCtx( 'activeToolsAndInfoCommand' );
            if( activeToolAndInfoCmd && activeToolAndInfoCmd.commandId ) {
                if( this.viewerPanelsToClose.includes( activeToolAndInfoCmd.commandId ) ) {
                    let eventData = {
                        source: 'toolAndInfoPanel'
                    };
                    eventBus.publish( 'complete', eventData );
                }
            }
        }
        this.unregisterAtomicDataTopics();
    }
}
