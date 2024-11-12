// Copyright 2022 Siemens Product Lifecycle Management Software Inc.

import AwWindowService from 'js/awWindowService';
import appCtx from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import fmsSvc from 'soa/fileManagementService';
import localeSvc from 'js/localeService';
import viewModelObjectService from 'js/viewModelObjectService';

const noFileToRenderKey = 'NO_FILE_TO_RENDER_TEXT';

/**
 * Gets/sets the context object based on the uid from viewerdata on the viewmodel data
 * @param {Object} data The data object with viewerData
 */
export const setContextObject = function( data ) {
    let contextObjectUid = null;
    let viewerData = data.viewerData;
    if( viewerData.datasetData && viewerData.datasetData.uid ) {
        contextObjectUid = viewerData.datasetData.uid;
    } else if( viewerData.uid ) {
        contextObjectUid = viewerData.uid;
    }

    data.contextObject = cdm.getObject( contextObjectUid );
};

/**
 * Sets the context for viewer command bar
 * @param {Object} data - the view model data
 */
export const setViewerCtx = function( data ) {
    const refElem = data.element;
    const type = refElem.id || 'unknown';

    const ctx = {
        vmo: data.contextObject,
        type: type,
        element: refElem
    };

    data.viewerContext = ctx;

    // Viewers should move away from using viewerContext in the ctx,
    // as it prevents multiple viewer instances from being used at once - viewer componentization
    if( !appCtx.getCtx( 'viewerContext' ) ) {
        appCtx.registerCtx( 'viewerContext', ctx );
    }
};

/**
 * Update the viewer context
 * @param {Object} viewModel the view model
 * @param {Object} newCtx the new ctx object
 */
const updateViewerCtx = function( viewModel, newCtx ) {
    viewModel.dispatch( { path: 'data.viewerContext', value: newCtx } );
};

/**
 * Get the default data set
 *
 * @param {Object} inData - declarative data
 * @returns {Object} the outputdata
 */
export const showViewer = function( inData ) {
    let datasetVM = null;
    let fileVM = null;

    let outputViewerData = null;
    let propNames = [];

    //viewModelObjectService logs console error in case nulltag i.e. AAAAAAAAAAAAAA uid is sent to it
    //prevent such errors by creating view model object for non-null uid's only. Null tags are represented
    //by uid holding value "AAAAAAAAAAAAAA"
    if( inData && inData.viewerData && !inData.viewerData.headerProperties ) {
        if( inData.viewerData.dataset && inData.viewerData.dataset.uid !== cdm.NULL_UID ) {
            datasetVM = viewModelObjectService.createViewModelObject( inData.viewerData.dataset.uid, '' );
        }

        if( inData.viewerData.views && inData.viewerData.views.length > 0 &&
            inData.viewerData.views[ 0 ].file.uid !== cdm.NULL_UID ) {
            fileVM = viewModelObjectService.createViewModelObject( inData.viewerData.views[ 0 ].file.uid, '' );
        }

        if( datasetVM !== null && fileVM !== null ) {
            outputViewerData = {
                datasetData: datasetVM,
                fileData: inData.viewerData.views[ 0 ],
                hasMoreDatasets: inData.viewerData.hasMoreDatasets,
                hasMoreNamedReferences: inData.viewerData.hasMoreNamedReferences
            };

            outputViewerData.fileData.file = fileVM;
            outputViewerData.fileData.fileUrl = getFileUrl( outputViewerData.fileData.fmsTicket );

            if( inData.headerProperties1 ) {
                _.forEach( inData.headerProperties1.dbValue, function( value ) {
                    propNames.push( value );
                } );
            }
            if( inData.headerProperties2 ) {
                _.forEach( inData.headerProperties2.dbValue, function( value ) {
                    propNames.push( value );
                } );
            }
        } else {
            // LCS-168799
            // Check if fileData is already on viewerData - happen when showViewer is called twice
            if( inData.viewerData && !inData.viewerData.fileData ) {
                outputViewerData = {
                    fileData: {
                        file: {},
                        fmsTicket: '',
                        viewer: inData.viewerData.views[ 0 ].viewer
                    },
                    hasMoreDatasets: inData.viewerData.hasMoreDatasets,
                    hasMoreNamedReferences: inData.viewerData.hasMoreNamedReferences
                };
            }
        }
    }
    return {
        viewerData: outputViewerData,
        datasetVM: datasetVM,
        fileVM: fileVM,
        headerPropertyNames: propNames
    };
};

/**
 * Sets up the event bus subscriptions for uvCommand.executed, and fullscreen
 * @param {Object} viewModel The view model
 * @param {Object} dataObj the vmData object to use
 */
export const setupEventSubscription = function( viewModel, dataObj ) {
    const uvSubDef = eventBus.subscribe( 'uvCommand.executed', function( eventData ) {
        if( viewModel.data[ eventData.callback ] && typeof viewModel.data[ eventData.callback ] === 'function' ) {
            const funcToEnvoke = viewModel.data[ eventData.callback ];
            funcToEnvoke( eventData.vmo ).then( function() {
                eventBus.publish( eventData.callback + '.success', { vmo: eventData.vmo } );
            }, function() {
                eventBus.publish( eventData.callback + '.failure', { vmo: eventData.vmo } );
            } );
        } else {
            eventBus.publish( eventData.callback + '.success', { vmo: eventData.vmo } );
        }
    } );
    const fullScreenSubDef = eventBus.subscribe( 'fullscreenToggle', function() {
        resizeWithDelay( viewModel );
    } );

    const cdmSubDef = eventBus.subscribe( 'cdm.modified', function( eventData ) {
        _.forEach( eventData.modifiedObjects, function( value ) {
            const contextObjUid = viewModel.data.contextObject && viewModel.data.contextObject.uid;
            if( value.uid === contextObjUid ) {
                // Update viewer ctx with latest vmo from cdm
                let newCtx = { ...viewModel.data.viewerContext, vmo: cdm.getObject( viewModel.data.contextObject.uid ) };
                updateViewerCtx( viewModel, newCtx );
            }
        } );
    } );

    if( viewModel.uvEventSub ) {
        eventBus.unsubscribe( viewModel.uvEventSub );
    }
    if( viewModel.fullScreenSubDef ) {
        eventBus.unsubscribe( viewModel.fullScreenSubDef );
    }

    if( viewModel.cdmSubDef ) {
        eventBus.unsubscribe( viewModel.cdmSubDef );
    }

    dataObj.uvEventSub = uvSubDef;
    dataObj.fullScreenSubDef = fullScreenSubDef;
    dataObj.cdmSubDef = cdmSubDef;
};

/**
 * Sets the resize callback to be used
 * @param {Object} viewModel The view model
 * @param {Function} callback The resize callback
 */
export const setResizeCallback = function( viewModel, callback ) {
    viewModel.data.resizeCallback = callback;
    viewModel.dispatch( { path: 'data.resizeCallback', value: callback } );
};

/**
 * Sets the loading message based on the provided key
 * @param {Object} data The view model data
 * @param {String} key The text bundle key
 * @returns {Promise} resolves when the loadingMsg has been loaded/set
 */
export const setLoadingMsg = function( data, key ) {
    return localeSvc.getTextPromise().then( function( localTextBundle ) {
        data.loadingMsg = localTextBundle[ key ];
    } );
};

/**
 * Default set viewer dimension functions
 * @param {Object} data The view model data
 */
export const setViewerDimensions = function( data ) {
    let ref;
    const useParentDimensions = data.viewerData && data.viewerData.useParentDimensions;
    if( useParentDimensions ) {
        ref = data.element;
        data.viewerHeight = ref.parentNode.clientHeight + 'px';
        data.viewerWidth = ref.parentNode.clientWidth + 'px';
    } else {
        ref = data.viewerData.viewerRef.current;
        let boundingRect = ref.getBoundingClientRect();
        data.viewerHeight = Math.max( window.innerHeight - boundingRect.top - 35, 300 ) + 'px';
        data.viewerWidth = ref.parentNode ? ref.parentNode.clientWidth + 'px' : '100%';
    }
    if( data.viewerData.viewerSizeStateRef ) {
        // Update information for universal viewer to use
        data.viewerData.viewerSizeStateRef.setAtomicData( {
            viewerHeight: data.viewerHeight,
            viewerWidth: data.viewerWidth
        } );
    }
};

/**
 * Sets the resize viewer function to be used in the event of window resize
 * @param {Object} viewModel The view model
 * @param {Function} resizeFunc The new resize function
 */
export const setViewerResizeFunction = function( viewModel, resizeFunc ) {
    viewModel.dispatch( { path: 'data.resizeFunction', value: resizeFunc } );
};

/**
 * Resize Viewer function. Calls custom resize function if set, or default
 * Executes callback function if set after resize
 * @param {Object} viewModel The view model
 * @returns {Promise} Promise that resolves when resize & optional callback are done
 */
export const resizeViewer = function( viewModel ) {
    return new Promise( function( resolve ) {
        if( viewModel.data.resizeFunction ) {
            viewModel.data.resizeFunction( viewModel );
        } else {
            // No custom resize function, use default
            setViewerDimensions( viewModel.data );
        }
        // Call callback
        if( viewModel.data.resizeCallback ) {
            _.defer( function() {
                viewModel.data.resizeCallback( viewModel );
            } );
        }

        viewModel.dispatch( { path: 'data', value: { ...viewModel.data } } );
        resolve();
    } );
};

/**
 * Resizes the viewer after a specified amount of delay
 * @param {Object} viewModel the view model
 * @param {Number} delay Number of ms to delay the resize
 */
export const resizeWithDelay = function( viewModel, delay ) {
    const timeout = delay || 500;
    setTimeout( function() {
        resizeViewer( viewModel );
    }, timeout );
};

/**
 * Gets the partial url string for downloading the item based on provided ticket
 * @param {String} ticket The ticket for the file download
 * @returns {String} the fms download url part
 */
export const getFileUrl = function( ticket ) {
    return 'fms/fmsdownload/?ticket=' + ticket;
};

/**
 * Sets the file url and loading status
 * @param {Object} data The view model data
 */
export const setFileUrl = async function( data ) {
    let viewerData = data.viewerData;

    if( viewerData.fileData && viewerData.fileData.fileUrl ) {
        data.fileUrl = viewerData.fileData.fileUrl;
        data.loading = false;
    } else if( viewerData.uid ) {
        let objectToView = cdm.getObject( viewerData.uid );
        let imanFiles = objectToView && objectToView.props && objectToView.props.ref_list;
        if( imanFiles && imanFiles.dbValues.length > 0 ) {
            const imanFileUid = imanFiles.dbValues[ 0 ]; //process only first file uid
            const imanFileModelObject = cdm.getObject( imanFileUid );
            const files = [ imanFileModelObject ];
            const readFileTicketsResponse = await fmsSvc.getFileReadTickets( files );
            if( readFileTicketsResponse && readFileTicketsResponse.tickets && readFileTicketsResponse.tickets.length > 1 ) {
                const ticketsArray = readFileTicketsResponse.tickets[ 1 ]; //1st element is array of iman file while 2nd element is array of tickets
                if( ticketsArray && ticketsArray.length > 0 ) {
                    data.fileUrl = getFileUrl( ticketsArray[ 0 ] );
                    data.loading = false;
                } else {
                    await setLoadingMsg( data, noFileToRenderKey );
                }
            } else {
                await setLoadingMsg( data, noFileToRenderKey );
            }
        } else {
            await setLoadingMsg( data, noFileToRenderKey );
        }
    } else {
        await setLoadingMsg( data, noFileToRenderKey );
    }
};

/**
 * Initialized the viewer and optionally sets/fetches file ticket data
 * @param {HTMLElement} element The reference element
 * @param {Object} viewModel - The view model/data
 * @param {Boolean} skipFmsTicketLoad Skip fms ticket load or not
 * @returns {Object} the new vmData to be updated
 */
export const initViewer = async function( element, viewModel, skipFmsTicketLoad ) {
    let vmData = _.cloneDeep( viewModel.data );
    vmData.element = element;
    vmData.panelBody = element.closest( '.aw-layout-panelBody' );
    vmData.panelSection = element.closest( '.aw-layout-panelSection' );

    setContextObject( vmData );
    setViewerDimensions( vmData );
    setViewerCtx( vmData );

    await setLoadingMsg( vmData, 'LOADING_TEXT' );

    setupEventSubscription( viewModel, vmData );

    // Resize Viewer Listeners/logic
    const windowResizeFunc = _.debounce( function() {
        resizeViewer( viewModel );
    }, 250, {
        leading: false,
        trailing: true,
        maxWait: 1000
    } );
    AwWindowService.instance.addEventListener( 'resize', windowResizeFunc );
    vmData.windowResizeFunc = windowResizeFunc;

    // parent resize observer
    const callback = function() {
        windowResizeFunc();
    };

    if( vmData.parentResizeObserver ) {
        vmData.parentResizeObserver.disconnect();
    }

    const ContentResizeObserver = window.ResizeObserver;
    const parentRef = vmData.viewerData.parentRef && vmData.viewerData.parentRef.current;
    if( ContentResizeObserver && parentRef ) {
        const observer = new ContentResizeObserver( callback );
        observer.observe( parentRef );
        vmData.parentResizeObserver = observer;
    }

    // Skip fms ticket load?
    if( !skipFmsTicketLoad ) {
        await setFileUrl( vmData );
    } else {
        vmData.loading = false;
    }

    return vmData;
};

/**
 * Cleans up the viewer and unsubscribes to events
 * @param {Object} viewModel The view model of the viewer

 */
export const cleanup = function( viewModel ) {
    // Unregister viewer context
    appCtx.unRegisterCtx( 'viewerContext' );
    viewModel.data.windowResizeFunc && viewModel.data.windowResizeFunc.cancel();
    AwWindowService.instance.removeEventListener( 'resize', viewModel.data.windowResizeFunc );
    delete viewModel.data.windowResizeFunc;

    // get rid of resize promise if any
    delete viewModel.data.resizePromise;

    // Get rid of custom resizeFunction if any
    delete viewModel.data.resizeFunction;

    // Remove ref element
    if( viewModel.data.element ) {
        viewModel.data.element.remove();
    }

    // Unsubscribe event bus subscriptions
    if( viewModel.data.uvEventSub ) {
        eventBus.unsubscribe( viewModel.data.uvEventSub );
        delete viewModel.data.uvEventSub;
    }
    if( viewModel.data.fullScreenSubDef ) {
        eventBus.unsubscribe( viewModel.data.fullScreenSubDef );
        delete viewModel.data.fullScreenSubDef;
    }

    if( viewModel.data.cdmSubDef ) {
        eventBus.unsubscribe( viewModel.data.cdmSubDef );
        delete viewModel.data.cdmSubDef;
    }
    if( viewModel.data.parentResizeObserver ) {
        viewModel.data.parentResizeObserver.disconnect();
        delete viewModel.data.parentResizeObserver;
    }
};

export default {
    setContextObject,
    setViewerCtx,
    showViewer,
    setupEventSubscription,
    setResizeCallback,
    setLoadingMsg,
    setViewerDimensions,
    setViewerResizeFunction,
    resizeViewer,
    resizeWithDelay,
    getFileUrl,
    setFileUrl,
    initViewer,
    cleanup
};
