// Copyright (c) 2020 Siemens

/**
 * This is a utility service for drag-n-drop operations.
 *
 * @module js/awDragAndDropUtils
 */
import cdm from 'soa/kernel/clientDataModel';
import dms from 'soa/dataManagementService';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import AwStateService from 'js/awStateService';
import localStrg from 'js/localStorage';
import declDragAndDropService from 'js/declDragAndDropService';

var exports = {};
const UI_GRID_ROW_CLASS = '.ui-grid-row';

/**
 * @param {String} dataTransferItem - The 'dataTransfer' Item to extract from.
 * @return {String} The type code of the given
 */
function _getDataTransferType( dataTransferItem ) {
    var extensionIndex = dataTransferItem.lastIndexOf( '/' );

    if( extensionIndex >= 0 ) {
        return dataTransferItem.substring( extensionIndex + 1 );
    }
    return ''; // $NON-NLS-1$
}

/**
 * Add the given map of 'dragData' name/value pairs to the 'dataTransfer' property of the given DragEvent.
 *
 * @param {DragEvent} event - The DragEvent to set the DragData on.
 * @param {Object} dragDataMap - Map of name/value pairs to add.
 * @param {Boolean} _includeDataTransfer - TRUE if the drag event should have it's 'dataTransfer' object set/maintained.
 */
const addDragDataToDragEvent = function( event, dragDataMap, _includeDataTransfer ) {
    if( _includeDataTransfer ) {
        try {
            _.forEach( dragDataMap, function( value, name ) {
                event.dataTransfer.setData( name, value );
                if( name === 'aw_interop_type' ) {
                    event.dataTransfer.setData( 'text/uri-list', value );
                }
            } );
        } catch ( ex ) {
            // Current versions of Internet Explorer can only have types "Text" and "URL"
            _.forEach( dragDataMap, function( value, name ) {
                // Only deal with the interop error from IE, to address DnD issue D-24972
                if( name === 'aw_interop_type' ) {
                    event.dataTransfer.setData( 'text', value );
                }
            } );
        }
    }
};

/**
 * Check the user agent string to see if the browser is the NX embedded browser, the NX QT browser puts "ugraf"
 * in the user agent string.
 *
 * @return {boolean} true if NX browser false otherwise
 */
const _isNxWebBrowser = function() {
    return navigator.userAgent.indexOf( 'ugraf' ) >= 0;
};


/**
 * Get the first child image element of the passed in element.
 *
 * @param {Element} sourceElement - element being dragged
 *
 * @return {Element} drag image element or returns passed in element if no image found.
 */
const _getFirstChildImage = function( sourceElement ) {
    var image = sourceElement.querySelectorAll( 'img' )[ 0 ];
    return image ? image : sourceElement;
};

/**
 * @param {Element} target - DOM element being dragged
 * @param {int} count - number of objects being dragged
 *
 * @return {Element} image element
 */
const _getMultiDragImage = function( target, count ) {
    var targetImage = _getDragElement( target, count );

    var strWidth;
    var strHeight;

    var cloneImage = null;
    if( targetImage ) {
        cloneImage = targetImage.cloneNode( true );

        // If cell, remove command icon/text
        if( targetImage.classList && targetImage.classList.contains( 'aw-widgets-cellListItem' ) ) {
            // Keep the image from being duplicated at the top of the page
            targetImage.style.position = 'relative';

            strWidth = targetImage.offsetWidth - 50 + 'px';
            strHeight = targetImage.offsetHeight - 10 + 'px';

            // Remove commands from image
            cloneImage.children[ 0 ].removeChild( cloneImage.children[ 0 ].children[ 1 ] );

            // Remove text from image
            var cloneImageText = cloneImage.getElementsByClassName( 'aw-widgets-cellListCellTitleBlock' )[ 0 ].parentNode;
            if( cloneImageText ) {
                for( var i = 1; i < cloneImageText.children.length; i++ ) {
                    cloneImageText.removeChild( cloneImageText.children[ i ] );
                }
            }
        } else { // Else it is a row
            strWidth = '150px';
            strHeight = '100%';
        }

        cloneImage.id = 'dragCount';

        cloneImage.style.maxWidth = strWidth;
        cloneImage.style.minWidth = strWidth;
        cloneImage.style.maxHeight = strHeight;
        cloneImage.style.minHeight = strHeight;

        cloneImage.style.position = 'absolute';
        cloneImage.style.left = '0px';
        cloneImage.style.top = '0px';
        cloneImage.style.zIndex = '99';
        cloneImage.classList.add( 'aw-theme-multidragimage' );
        cloneImage.classList.add( 'aw-widgets-multidragimage' );

        // the image that is dragged needs to be visible, so it is added to the existing node
        targetImage.children[ 0 ].appendChild( cloneImage );

        // create a second offset image
        var cloneImage2 = cloneImage.cloneNode( true );

        cloneImage2.style.left = '5px';
        cloneImage2.style.top = '5px';

        // create a third offset image & append if necessary
        var cloneImage3 = cloneImage.cloneNode( true );

        cloneImage.appendChild( cloneImage2 );

        if( count > 2 ) {
            cloneImage3.style.left = '10px';
            cloneImage3.style.top = '10px';

            cloneImage.appendChild( cloneImage3 );
        }
    }

    return cloneImage;
};

/**
 * Returns the correct element to be dragged
 *
 * @param {Element} target - DOM element being dragged
 * @param {int} count - number of objects being dragged
 *
 * @return {Element} The correct drag element
 */
export const _getDragElement = function( target, count ) {
    var element;
    if( target && target.classList ) {
        if( target.classList.contains( 'aw-widgets-cellListItemContainer' ) ) {
            element = event.target.parentElement; // Cell element
        } else if( target.classList.contains( 'ui-grid-cell' ) ) {
            let closest = target.closest( UI_GRID_ROW_CLASS );
            if( closest && closest.length > 0 && count === 1 ) {
                element = target.closest( UI_GRID_ROW_CLASS ).get( 0 ); // Table element
            } else {
                element = event.target;
            }
        }
    }

    return element;
};

/*
* Load the vmo into cdm if not already loaded
*/
export const loadVMOsIfNotAlreadyLoaded = ( uids ) => {
    const fetchObjects = ( uids ) => {
        let missingSourceUIDs = [];
        let objsCorrespondingToUids = [];
        if( uids.length > 0 && cdm ) {
            uids.forEach( ( uid ) => {
                /**
                 * Attempt to locate the 'source' objects in this browser's CDM cache.
                 * <P>
                 * Note: When 'source' objects are being dragged from another browser they may not have been loaded into
                 * the 'target' browser.
                 */
                let object = cdm.getObject( uid );
                if( !object ) {
                    missingSourceUIDs.push( uid );
                } else {
                    objsCorrespondingToUids.push( object );
                }
            } );
        }

        return {
            missingSourceUIDs,
            objsCorrespondingToUids
        };
    };
    const hasTCSessionData = appCtxSvc && appCtxSvc.ctx && !_.isUndefined( appCtxSvc.ctx.tcSessionData );

    let objects = fetchObjects( uids );
    if( objects.missingSourceUIDs.length > 0 && hasTCSessionData ) {
        dms.loadObjects( objects.missingSourceUIDs );
    }
};

/*
* Create and attach default drag and drop handler definitions for XRT based views in AW
*/
export const attachDragAndDropHandlers = ( declViewModel ) => {
    const createDnDProviders = () => {
        return {
            dragProviders: {
                path: '_internal.dragHandlers',
                actions: {
                    dragStart: 'dragStartAction',
                    dragEnd: 'dragEndAction'
                }
            },
            dropProviders: {
                path: '_internal.dropHandlers',
                actions: {
                    dragEnter: 'dragEnterAction',
                    dragLeave: 'dragLeaveAction',
                    dragOver: 'dragOverAction',
                    drop: 'dropAction'
                }
            }
        };
    };

    const dragcreateDragDropActions = () => {
        let dragAndDropActions = {};
        const actions = [ 'dragStart', 'dragEnd', 'dragEnter', 'dragLeave', 'dragOver', 'drop' ];
        actions.forEach( action => {
            dragAndDropActions[ action + 'Action' ] = {
                actionType: 'syncFunction',
                method: action,
                deps: 'js/awDragAndDropService'
            };
        } );
        return dragAndDropActions;
    };

    let dndProviders = createDnDProviders();
    let dndActions = dragcreateDragDropActions();
    _.forEach( dndProviders, provider => {
        declDragAndDropService.setDragAndDropHandlersOnVM( declViewModel, provider.path, provider.actions, dndActions );
    } );
};

/**
 * Update the drag image for the DragEvent based on the number of objects being dragged.
 *
 * @param {Object} dragAndDropParams - Framework generated drag and drop parameters.
 *
 * @param {Number} count - The number of objects being dragged
 *
 * @param {Boolean} _includeDataTransfer - TRUE if the drag event should have it's 'dataTransfer' object set/maintained.
 */
export const updateDragImage = function( dragAndDropParams, count, _includeDataTransfer ) {
    let event = dragAndDropParams.event;
    let target = dragAndDropParams.targetElement;
    /**
     * Internet Explorer doesn't support setDragImage at all (and some 'hosts' do not want 'dataTransfer').
     * <P>
     * See: http://mereskin.github.io/dnd/
     */
    if( !browserUtils.isIE && _includeDataTransfer ) {
        /**
         * The NX web browser (QT?) currently has a problem with child elements containing float elements. This
         * should be resolved after moving the list view to a flex display.
         */
        var dragImage;

        if( _isNxWebBrowser() ) {
            dragImage = _getFirstChildImage( target );
        } else if( count > 1 ) {
            dragImage = _getMultiDragImage( target, count );
        } else {
            dragImage = _getDragElement( target, 1 );
        }

        if( dragImage ) {
            event.dataTransfer.setDragImage( dragImage, 0, 0 );
        }
    }
};

/**
 * Look for support of the 'urls' in the 'dataTransfer' area of the event.
 *
 * @param {DragEvent} event - The event to test.
 *
 * @return {boolean} TRUE if the 'text/html' property is found in the 'dataTransfer' property of the event.
 */
export const dataTransferContainsURLs = function( event ) {
    if( event.dataTransfer ) {
        var types = event.dataTransfer.types;
        if( types ) {
            for( var i = 0; i < types.length; ++i ) {
                if( types[ i ] === 'text/html' ) {
                    return true;
                }
            }
        }
    }
    return false;
};


/**
 * @param {DragEvent} event - The event to extract the files types from the 'dataTransfer' property.
 *
 * @return {StringArray} The set of unique file types.
 */
export const getDataTransferFileTypes = function( event ) {
    var dtTypes = [];

    if( event.dataTransfer.items ) {
        var itemObjs = event.dataTransfer.items;
        if( itemObjs ) {
            _.forEach( itemObjs, ( itemObj ) => {
                var fileExt = _getDataTransferType( itemObj.type );
                if( fileExt && dtTypes.indexOf( fileExt ) === -1 ) {
                    dtTypes.push( fileExt );
                }
            } );
        }
    }

    return dtTypes;
};

/**
 * @param {String} uid - ID of the object to include in the URL.
 *
 * @return {String} The URL 'prefix' used to open an object in the 'show object' location of AW.
 */
var _getShowObjectURL = function( uid ) {
    // Have to decode as ui-router returns encoded URL (which is then decoded again by browser)
    return window.decodeURIComponent( document.location.origin + document.location.pathname +
        AwStateService.instance.href( 'com_siemens_splm_clientfx_tcui_xrt_showObject', {
            uid: uid
        } ) );
};

/**
 * Clear out any 'dragData' that may have been created by the last Drag-n-Drop operation.
 */
export const _clearCachedData = function() {
    localStrg.publish( 'awDragData' );
};

/**
 * Cache the dragged data in local storage
 * @param {Object} draggedData - The dragged data to be cached
 */
export const cacheDraggedData = function( draggedData ) {
    localStrg.publish( 'awDragData', JSON.stringify( draggedData ) );
};

/**
 * @return {StringArray} An array of strings (placed into localStorage' at the start of a drag operation) that
 *         represent the UIDs of 'source' objects being dragged (or NULL if no types were found).
 */
export const getCachedSourceUids = function() {
    var dragDataJSON = getCachedDragData();
    if( dragDataJSON && dragDataJSON.uidList ) {
        return dragDataJSON.uidList;
    }
    return null;
};


/**
 * @return {Object} The Object that represents cached drag data set when the drag operation began.
 */
export const getCachedDragData = function() {
    var dragDataJSON = localStrg.get( 'awDragData' );
    if( dragDataJSON && dragDataJSON !== 'undefined' ) {
        return JSON.parse( dragDataJSON );
    }
    return null;
};

/**
 * Use the given ViewModelObject to return a string description of it.
 *
 * @param {ViewModelObject} vmo - The ViewModelObject to query.
 *
 * @return {String} Description of given ViewModelObject (or it's UID if no other name is possible).
 */
export const getViewModelObjectName = function( vmo ) {
    if( vmo.props.object_string ) {
        return vmo.props.object_string.displayValues[ 0 ];
    } else if( vmo.props.items_tag ) {
        return vmo.props.items_tag.displayValues[ 0 ];
    } else if( vmo.props.object_name ) {
        return vmo.props.object_name.displayValues[ 0 ];
    } else if( vmo.props.object_desc ) {
        return vmo.props.object_desc.displayValues[ 0 ];
    } else if( vmo.props.job_name ) {
        return vmo.props.job_name.displayValues[ 0 ];
    } else if( vmo.props.awp0CellProperties ) {
        return vmo.props.awp0CellProperties.displayValues[ 0 ];
    }

    return vmo.uid;
};

exports = {
    loadVMOsIfNotAlreadyLoaded,
    attachDragAndDropHandlers,
    updateDragImage,
    addDragDataToDragEvent,
    dataTransferContainsURLs,
    getDataTransferFileTypes,
    _getShowObjectURL,
    _clearCachedData,
    cacheDraggedData,
    getCachedDragData,
    getViewModelObjectName,
    getCachedSourceUids
};

export default exports;
