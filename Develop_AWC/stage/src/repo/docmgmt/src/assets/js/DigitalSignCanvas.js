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
 * DigitalSignCanvas provides an interface for drawing on a PDF "canvas" in the web viewer. It is used by
 * DigitalSignPdf, which manages the higher-level viewer functions.
 *
 * Currently the canvas is used to allow the user to draw a rectangle by clicking, dragging, and releasing the mouse.
 * As the mouse moves, previously drawn rectangles are erased to make it appear as if the rectangle is growing or
 * shrinking.
 *
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/DigitalSignCanvas
 */

'use strict';

/** The resources */
var resources = {};

/** The list of cached canvas */
var canvasList = [];
/** The current canvas */
var currentCanvas = null;
/** The current context */
var currentCtx = null;
/** The current container index */
var currentIndex = 0;
/** The canvas rectangle */
var canvasRect = {
    left: 0,
    top: 0,
    width: 100,
    height: 100
};
/** The viewer container */
var viewerContainer = null;

/** The pen is on */
var penOn = false;
/** The overlay is on */
var overlayOn = false;
/** The user selection */
var userInput = null;
/** The selection change callback */
var selectionEndCallback = null;
/** The drawn rectangle */
var currentRect = {
    left: 0,
    top: 0,
    width: 0,
    height: 0
};

/** The image button Done */
var imgDone = null;
/** The image button Redo */
var imgRedo = null;
/** The image button Delete */
var imgDelete = null;

/**
 * Initialize this module
 */
export function init() {
    imgDone = null;
    imgRedo = null;
    imgDelete = null;
    currentCtx = null;
    currentCanvas = null;
    canvasList = [];
    clearUserInput();
}

/**
 * Get the canvas from the given container
 *
 * @param {Element} container The container to be tested
 *
 * @return {Canvas} the existing canvas or null
 */
export function getCanvas( container ) {
    var list = container.getElementsByTagName( 'canvas' );
    for( var i = 0; i < list.length; i++ ) {
        if( list[ i ].id.indexOf( 'digitalSign' ) === 0 ) {
            return list[ i ];
        }
    }

    return null;
}

/**
 * Set the current canvas, create if not already exist
 *
 * @param {Element} container The current container
 * @param {number} index The current index, default 0
 *
 * @return {boolean} true if a new canvas is created
 */
export function setCanvas( container, index ) {
    if( overlayOn ) {
        hideOverlay();
    }

    index = index || 0;
    currentCanvas = getCanvas( container );
    currentIndex = index;

    if( currentCanvas ) {
        currentCtx = currentCanvas.getContext( '2d' );
        canvasList[ index ] = currentCanvas;
        setCanvasRect( container, currentCanvas );
        return false;
    }

    currentCanvas = container.ownerDocument.createElement( 'canvas' );
    currentCanvas.id = 'digitalSign' + ( index + 1 );
    currentCanvas.style.touchAction = 'none';
    currentCanvas.style.pointerEvents = 'none';
    currentCanvas.style.zIndex = '100';

    currentCtx = currentCanvas.getContext( '2d' );
    canvasList[ index ] = currentCanvas;

    container.appendChild( currentCanvas );
    setCanvasRect( container, currentCanvas );

    if( window.navigator.pointerEnabled ) {
        currentCanvas.addEventListener( 'pointerdown', penPointerStart );
        currentCanvas.addEventListener( 'pointermove', penPointerMove );
        currentCanvas.addEventListener( 'pointerup', penPointerStop );
        currentCanvas.addEventListener( 'pointerout', penPointerStop );
    } else {
        currentCanvas.addEventListener( 'mousedown', penMouseStart );
        currentCanvas.addEventListener( 'mousemove', penMouseMove );
        currentCanvas.addEventListener( 'mouseup', penStop );
        currentCanvas.addEventListener( 'mouseout', penStop );
    }

    currentCanvas.addEventListener( 'touchstart', penTouchStart );
    currentCanvas.addEventListener( 'touchmove', penTouchMove );
    currentCanvas.addEventListener( 'touchend', penTouchEnd );
    currentCanvas.addEventListener( 'touchcancel', penTouchEnd );

    return true;
}

/**
 * Set the canvas rectangle
 *
 * @param {Element} container The container to set its canvas
 * @param {Canvas} canvas The canvas to be set, default the canvas in the container
 */
export function setCanvasRect( container, canvas ) {
    canvas = canvas || getCanvas( container );
    if( container && canvas ) {
        var docRect = container.ownerDocument.documentElement.getBoundingClientRect();
        var containerRect = container.getBoundingClientRect();

        canvasRect.width = containerRect.right - containerRect.left;
        canvasRect.height = containerRect.bottom - containerRect.top;
        canvasRect.left = containerRect.left - docRect.left;
        canvasRect.top = containerRect.top - docRect.top;

        canvas.width = canvasRect.width;
        canvas.height = canvasRect.height;
        canvas.style.left = '0px';
        canvas.style.top = '0px';
        canvas.style.position = 'absolute';
    }
}

/**
 * Show overlay for user drawing
 */
export function showOverlay() {
    if( currentCanvas && currentCtx ) {
        currentCanvas.style.pointerEvents = 'auto';
        currentCanvas.style.cursor = 'crosshair';
        overlayOn = true;
        drawOverlay();
    }
}

/**
 * Hide overlay for user drawing
 */
export function hideOverlay() {
    if( currentCanvas ) {
        overlayOn = false;
        currentCanvas.style.pointerEvents = 'none';
        currentCanvas.style.cursor = 'pointer';
        showCurrentPage();
    }

    clearUserInput();
}

/**
 * Show the current page
 */
export function showCurrentPage() {
    clearCanvas( currentIndex );
}

/**
 * The common logic for pen start
 *
 * @param {number} x The x coord
 * @param {number} y The y coord
 */
function penStart( x, y ) {
    clearUserInput();
    penOn = true;
    currentCtx.strokeStyle = 'rgb(0, 0, 255)';
    currentCtx.lineWidth = 2;
    currentRect.left = x;
    currentRect.top = y;
}

/**
 * The common logic for pen move
 *
 * @param {number} x The x coord
 * @param {number} y The y coord
 */
function penMove( x, y ) {
    if( penOn && penStroke( x, y ) ) {
        currentRect.width = x - currentRect.left;
        currentRect.height = y - currentRect.top;

        drawSigningRectangle();
    }
}

/**
 * The common logic for pen stop
 *
 */
function penStop() {
    if( penOn ) {
        penOn = false;
        if( currentRect.width !== 0 && currentRect.height !== 0 ) {
            showButtons();
        }
    }
}

/**
 * The common logic to decide if a pen stroke is acceptible
 *
 * @param {number} x The x coord
 * @param {number} y The y coord
 *
 * @return {boolean} true if it is acceptible
 */
function penStroke( x, y ) {
    var dx = x - currentRect.left;
    var dy = y - currentRect.top;
    return dx * dx + dy * dy >= 9;
}

/**
 * Pen mouse start event handler
 *
 * @param {Event} e The event
 */
function penMouseStart( e ) {
    e = e || window.event;
    var x = e.offsetX || e.layerX;
    var y = e.offsetY || e.layerY;
    penStart( x, y );
}

/**
 * Pen mouse move event handler
 *
 * @param {Event} e The event
 */
function penMouseMove( e ) {
    e = e || window.event;
    var x = e.offsetX || e.layerX;
    var y = e.offsetY || e.layerY;
    penMove( x, y );
}

/**
 * Pen touch start event handler
 *
 * @param {Event} e The event
 */
function penTouchStart( e ) {
    e = e || window.event;
    e.preventDefault();

    var x = e.touches[ 0 ].pageX - canvasRect.left;
    var y = e.touches[ 0 ].pageY - canvasRect.top;
    penStart( x, y );
}

/**
 * Pen touch move event handler
 *
 * @param {Event} e The event
 */
function penTouchMove( e ) {
    e = e || window.event;
    e.preventDefault();

    var x = e.touches[ 0 ].pageX - canvasRect.left;
    var y = e.touches[ 0 ].pageY - canvasRect.top;
    penMove( x, y );
}

/**
 * Pen touch end event handler
 *
 * @param {Event} e The event
 */
function penTouchEnd( e ) {
    e = e || window.event;
    e.preventDefault();
    penStop();
}

/**
 * Pen pointer start event handler
 *
 * @param {Event} e The event
 */
function penPointerStart( e ) {
    e = e || window.event;
    if( e.pointerType === 'touch' ) {
        e.preventDefault();
    }
    penMouseStart( e );
}

/**
 * Pen pointer move event handler
 *
 * @param {Event} e The event
 */
function penPointerMove( e ) {
    e = e || window.event;
    if( e.pointerType === 'touch' ) {
        e.preventDefault();
    }
    penMouseMove( e );
}

/**
 * Pen pointer stop event handler
 *
 * @param {Event} e The event
 */
function penPointerStop( e ) {
    e = e || window.event;
    if( e.pointerType === 'touch' ) {
        e.preventDefault();
    }
    penStop();
}

/**
 * Clear the user selection
 */
function clearUserInput() {
    currentRect.top = 0;
    currentRect.left = 0;
    currentRect.width = 0;
    currentRect.height = 0;
    hideButtons();
}

/**
 * Clear the current canvas
 *
 * @param {Number} index The canvas index
 */
function clearCanvas( index ) {
    var canvas = currentCanvas;
    var ctx = currentCtx;

    if( index !== currentIndex ) {
        canvas = canvasList[ index ];
        ctx = canvas ? canvas.getContext( '2d' ) : null;
    }

    if( ctx && canvas ) {
        ctx.clearRect( 0, 0, canvas.width, canvas.height );
    }
}

/**
 * Show the Done, Undo, Redo, Delete buttons
 */
function showButtons() {
    var ownerDoc = viewerContainer.ownerDocument;
    imgDone = ownerDoc.getElementById( 'digitalSignImgDone' );
    imgRedo = ownerDoc.getElementById( 'digitalSignImgRedo' );
    imgDelete = ownerDoc.getElementById( 'digitalSignImgDelete' );

    if( !imgDone || !imgRedo || !imgDelete ) {
        var isSvg = /^<svg/.test( resources.imgDone );
        imgDone = ownerDoc.createElement( isSvg ? 'div' : 'img' );
        imgDone.style.width = '32px';
        imgDone.style.height = '32px';
        imgDone.style.visible = 'none';
        imgDone.style.position = 'absolute';
        imgDone.style.zIndex = '1000';

        imgRedo = imgDone.cloneNode();
        imgDelete = imgDone.cloneNode();

        imgDone.id = 'digitalSignImgDone';
        imgDone.addEventListener( 'click', onButtonClick );
        ownerDoc.body.appendChild( imgDone );

        imgRedo.id = 'digitalSignImgRedo';
        imgRedo.addEventListener( 'click', onButtonClick );
        ownerDoc.body.appendChild( imgRedo );

        imgDelete.id = 'digitalSignImgDelete';
        imgDelete.addEventListener( 'click', onButtonClick );
        ownerDoc.body.appendChild( imgDelete );

        if( isSvg ) {
            imgDone.innerHTML = replaceUseLink( resources.imgDone );
            imgRedo.innerHTML = replaceUseLink( resources.imgRedo );
            imgDelete.innerHTML = replaceUseLink( resources.imgDelete );
        } else {
            imgDone.src = resources.imgDone;
            imgRedo.src = resources.imgRedo;
            imgDelete.src = resources.imgDelete;
        }
    }

    var containerRect = viewerContainer.getBoundingClientRect();
    var left = containerRect.left + ( viewerContainer.clientWidth - 160 ) / 2;
    var top = containerRect.top + 32;

    imgDone.style.left = left + 128 + 'px';
    imgDone.style.top = top + 'px';
    imgRedo.style.left = left + 64 + 'px';
    imgRedo.style.top = top + 'px';
    imgDelete.style.left = left + 'px';
    imgDelete.style.top = top + 'px';

    var hideButtons = currentRect.width === 0 || currentRect.height === 0;
    imgDone.style.display = hideButtons ? 'none' : 'block';
    imgRedo.style.display = hideButtons ? 'none' : 'block';
    imgDelete.style.display = hideButtons ? 'none' : 'block';
}

/**
 * Hide the buttons
 */
function hideButtons() {
    if( imgDone && imgRedo && imgDelete ) {
        imgDone.style.display = 'none';
        imgRedo.style.display = 'none';
        imgDelete.style.display = 'none';
    }
}

/**
 * Button click listener
 *
 * @param {Event} event The event
 */
function onButtonClick( event ) {
    var target = event.currentTarget;
    userInput = {
        canceled: false,
        signRectangle: null,
        pageNum: -1,
        pageArea: null
    };

    if( target === imgDone ) {
        // make a copy as the currentRect values will be zeroed out
        userInput.signRectangle = {
            top: currentRect.top,
            left: currentRect.left,
            width: currentRect.width,
            height: currentRect.height
        };
        userInput.pageNum = currentIndex;

        hideOverlay();

        if( selectionEndCallback ) {
            selectionEndCallback( userInput );
        }
    } else if( target === imgDelete ) {
        userInput.canceled = true;

        hideOverlay();

        if( selectionEndCallback ) {
            selectionEndCallback( userInput );
        }
    } else if( target === imgRedo ) {
        currentRect.height = 0;
        currentRect.width = 0;

        showOverlay();
    }
}

/**
 * Refresh the signing rectangle on the screen
 */
function drawSigningRectangle() {
    showCurrentPage();
    currentCtx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    currentCtx.fillRect( 0, 0, currentCanvas.width, currentCanvas.height );

    if( currentRect.width !== 0 && currentRect.height !== 0 ) {
        currentCtx.strokeRect( currentRect.left, currentRect.top, currentRect.width, currentRect.height );
    }
}

/**
 * Draw the shaded overlay on the current page
 */
function drawOverlay() {
    showCurrentPage();
    currentCtx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    currentCtx.fillRect( 0, 0, currentCanvas.width, currentCanvas.height );
    showButtons();
}

/**
 * Replace the use link with svg symbol definition
 *
 * @param {String} value The value to be replaced
 *
 * @return {String} The use link in the value is replaced with svg, if any
 */
function replaceUseLink( value ) {
    if( /<use/.test( value ) ) {
        var res = value.match( /#(\w+)/ );
        if( res && res.length > 1 ) {
            var symbol = document.getElementById( res[ 1 ] );
            if( symbol ) {
                return symbol.outerHTML.replace( /symbol/g, 'svg' );
            }
        }
    }

    return value;
}

let exports;
export let setViewerContainer = function( container ) {
    viewerContainer = container;
};
export let getUserInput = function() {
    return userInput;
};
export let setSelectionEndCallback = function( callback ) {
    selectionEndCallback = callback;
};
export let addResource = function( name, value ) {
    resources[ name ] = value;
};

export default exports = {
    init,
    getCanvas,
    setCanvas,
    setCanvasRect,
    setViewerContainer,
    showOverlay,
    hideOverlay,
    showCurrentPage,
    getUserInput,
    setSelectionEndCallback,
    addResource
};
