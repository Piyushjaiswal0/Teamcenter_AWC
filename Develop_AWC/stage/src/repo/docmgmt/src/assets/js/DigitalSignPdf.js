// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * DigitalSignPdf provides an interface for managing the PDF web viewer. It depends on DigitalSignCanvas, which
 * handles the lower-level drawing functions.
 *
 * Currently the only supported operation is to allow the user to draw a rectangle (to place a digital signature
 * in) on top of the displayed PDF.
 *
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/DigitalSignPdf
 */
import digitalSignCanvas from 'js/DigitalSignCanvas';

'use strict';

/** The frame window */
var frameWindow = null;
/** The PDFView object */
var pdfView = null;
/** The current tool */
var tool = null;

/** The current view param */
var vp = { scale: 1, x: 0, y: 0 };
/** The current page index */
var currentIndex = 0;
/** The markup panel is currently revealed */
var revealed = false;
/** The viewer container */
var viewerContainer = null;

/**
 * Initialize this module
 *
 * @return {boolean} true if PDV viewer is found
 */
export function init() {
    if( !frameWindow ) {
        frameWindow = getFrameWindow();
    }

    if( !frameWindow ) {
        return false;
    }

    viewerContainer = null;
    digitalSignCanvas.init();
    setViewParamChangeCallback( showCurrentPage );
    setPageChangeCallback( showCurrentPage );

    return true;
}

/**
 * Set the current tool
 *
 * @param {string} inTool the tool
 */
export function setTool( inTool ) {
    if( inTool ) {
        showOverlay();
    } else {
        hideOverlay();
    }

    tool = inTool;
}

/**
 * Get the user input
 *
 * @return {UserSelection} the user selection
 */
export function getUserInput() {
    return !isPdfViewReady() ? null :
        tool ? digitalSignCanvas.getUserInput() : null;
}

/**
 * Show the current page
 */
export function showCurrentPage() {
    var wait = false;
    if( isPdfViewReady() ) {
        setViewerContainer();

        var textContainer = getPageContainer( 'text' );
        if( !textContainer ) {
            wait = true;
        }

        if( tool ) {
            var canvasContainer = getPageContainer( '2d' );
            if( canvasContainer ) {
                digitalSignCanvas.setCanvas( canvasContainer, currentIndex );
                digitalSignCanvas.showCurrentPage();
                digitalSignCanvas.showOverlay();
            } else {
                wait = true;
            }
        }
    } else {
        wait = true;
    }

    if( wait && frameWindow ) {
        frameWindow.setTimeout( showCurrentPage, 200 );
    }
}

/**
 * Set view param change callback
 *
 * @param {function} callback The callback
 */
export function setViewParamChangeCallback( callback ) {
    if( frameWindow ) {
        frameWindow.addEventListener( 'scalechange', function( event ) {
            if( revealed && Math.abs( vp.scale - event.scale ) > 0.000001 ) {
                vp.scale = event.scale;
                callback( vp );
            }
        } );
    }
}

/**
 * Set page change callback
 *
 * @param {function} callback The callback
 */
export function setPageChangeCallback( callback ) {
    if( frameWindow ) {
        frameWindow.addEventListener( 'pagechange', function( event ) {
            currentIndex = event.pageNumber - 1;
            if( revealed ) {
                callback( currentIndex );
            }
        } );
    }
}

/**
 * Set selection end callback
 *
 * @param {function} callback The callback
 */
export function setSelectionEndCallback( callback ) {
    // eslint-disable-next-line require-jsdoc
    function mySelectionEndCallback( signingData ) {
        if( revealed && signingData ) {
            var pageInfo = getPageInfo( signingData.pageNum );
            signingData.pageArea = {
                height: pageInfo.height,
                width: pageInfo.width
            };
            callback( signingData );
        }
    }

    digitalSignCanvas.setSelectionEndCallback( mySelectionEndCallback );
}

/**
 * Get page count
 *
 * @return {int} the page count
 */
export function getPageCount() {
    return isPdfViewReady() && pdfView._pages ? pdfView.pagesCount : 0;
}

/**
 * Get the page info
 *
 * @param {int} pageIndex The page index
 *
 * @return {PageInfo} the page info
 */
export function getPageInfo( pageIndex ) {
    var info = { width: 0.0, height: 0.0, scale: 1.0 };

    if( isPdfViewReady() && pdfView._pages && pageIndex >= 0 && pageIndex < pdfView.pagesCount ) {
        info.width = pdfView._pages[ pageIndex ].width;
        info.height = pdfView._pages[ pageIndex ].height;
        info.scale = getCurrentScale();
    }

    return info;
}

/**
 * Get the page element
 *
 * @param {int} pageIndex The page index
 *
 * @return {Element} the page element
 */
export function getPageElement( pageIndex ) {
    if( isPdfViewReady() && pdfView._pages ) {
        if( pageIndex >= 0 && pageIndex < pdfView.pagesCount && pdfView._pages[ pageIndex ] ) {
            return pdfView._pages[ pageIndex ].div;
        }
    }

    return null;
}

/**
 * Set revealed
 *
 * @param {boolean} reveal - true to reveal or false to hide
 */
export function setRevealed( reveal ) {
    revealed = reveal;
    setTool( null );
}

/**
 * Get the frame window
 *
 * @return {iFrame} the frame window
 */
function getFrameWindow() {
    var frames = window.frames;
    for( var i = 0; i < frames.length; i++ ) {
        if( frames[ i ].pdfjsLib ) {
            return frames[ i ];
        }
    }

    return null;
}

/**
 * Is the PDFView ready?
 *
 * @return {boolean} true if it is ready
 */
function isPdfViewReady() {
    if( frameWindow && frameWindow.pdfjsLib ) {
        pdfView = null;
        if( frameWindow.PDFViewerApplication ) {
            pdfView = frameWindow.PDFViewerApplication.pdfViewer;
        } else {
            pdfView = frameWindow.pdfjsLib.pdfViewer;
        }
        if( pdfView && getCurrentPageNumber() > 0 && getCurrentScale() > 0 ) {
            currentIndex = getCurrentPageNumber() - 1;
            vp.scale = getCurrentScale();
            return true;
        }
    }

    return false;
}

/**
 * Get the page container of the given type
 *
 * @param {string} type The container type "text", "2d", or "all"
 * @param {int} index The page index, default the current page index
 *
 * @return {div} the page container of the type, null if not ready
 */
function getPageContainer( type, index ) {
    index = index || currentIndex;
    var container = null;

    if( index < pdfView.pagesCount ) {
        container = pdfView._pages[ index ];
        if( container ) {
            container = container.div;
        }

        if( container && ( type === 'text' || type === '2d' && container.canvas ) ) {
            var className = type === 'text' ? 'textLayer' : 'canvasWrapper';
            var elements = null;
            if( type === 'text' ) {
                elements = container.getElementsByClassName( className );
            } else if( type === '2d' && container.canvas ) {
                elements = container.canvas.getElementsByClassName( className );
            }
            container = elements && elements.length > 0 ? elements[ 0 ] : null;
        }
    }

    return container;
}

/**
 * Set the viewer container to show tooltip
 */
function setViewerContainer() {
    if( !viewerContainer ) {
        var doc = frameWindow.document || frameWindow.contentDocument;
        viewerContainer = doc.getElementById( 'viewerContainer' );
        if( viewerContainer ) {
            digitalSignCanvas.setViewerContainer( viewerContainer );
        }
    }
}

/**
 * Show the overlay canvas
 */
function showOverlay() {
    if( isPdfViewReady() ) {
        var canvasContainer = getPageContainer( '2d' );
        if( canvasContainer ) {
            digitalSignCanvas.setCanvas( canvasContainer, currentIndex );
            digitalSignCanvas.showOverlay();
        }
    }
}

/**
 * Hide the overlay canvas
 */
function hideOverlay() {
    digitalSignCanvas.hideOverlay();
}

/**
 * Get the current page number
 *
 * @return {int} the current page number
 */
function getCurrentPageNumber() {
    if( pdfView && pdfView._currentPageNumber ) {
        return pdfView._currentPageNumber;
    } else if( pdfView && pdfView.currentPageNumber ) {
        return pdfView.currentPageNumber;
    }
    return 0;
}

/**
 * Get the current scale
 *
 * @return {number} the current scale
 */
function getCurrentScale() {
    if( pdfView && pdfView._currentScale ) {
        return pdfView._currentScale;
    } else if( pdfView && pdfView.currentScale ) {
        return pdfView.currentScale;
    }
    return 0;
}

let exports;
export let setPdfFrame = function( frame ) {
    frameWindow = frame;
};
export let clearUserSelection = function() {};
export let getViewParam = function() {
    return vp;
};
export let setUnloadCallback = function( callback ) {
    frameWindow.addEventListener( 'unload', callback );
};
export let addResource = function( name, value ) {
    digitalSignCanvas.addResource( name, value );
};

export default exports = {
    init,
    setPdfFrame,
    setTool,
    showCurrentPage,
    getUserInput,
    clearUserSelection,
    getViewParam,
    getPageCount,
    getPageInfo,
    getPageElement,
    setViewParamChangeCallback,
    setPageChangeCallback,
    setSelectionEndCallback,
    setUnloadCallback,
    addResource,
    setRevealed
};
