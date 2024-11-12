// Copyright 2022 Siemens Product Lifecycle Management Software Inc.

/**
 * @module js/ImgViewer
 */
import gifReaderExport from 'js/GifReader';
import videoReaderExport from 'js/VideoReader';
import playControlExport from 'js/PlayControl';

/** The development environment, set to true for debugging */
var devEnv = false;

/**
 * Create a new instance of this module
 *
 * @param {Element} viewerContainer - The viewer container
 * @returns {Object} the instance of the ImgViewer
 */
export function newInstance( viewerContainer ) {
    //==================================================
    // private variables
    //==================================================
    /** The view param */
    var vp = { scale: 1, x: 0, y: 0, angle2: 0 };
    /** The view param to fit the image */
    var vpFit = { scale: 1, x: 0, y: 0, angle2: 0 };
    /** The view param at the end of animation */
    var vpEnd = { scale: 1, x: 0, y: 0, angle2: 0 };
    /** The final view param at the end of animation */
    var vpFinal = { scale: 1, x: 0, y: 0, angle2: 0 };

    /** The maximum scale */
    var scaleMax = 4;
    /** The minimum scale */
    var scaleMin = 0.01;
    /** The pan is on */
    var panOn = false;
    /** The pinch zoom is on */
    var pinchOn = false;
    /** The pinch zoom factor */
    var pinchF = 1;
    /** The event x coord */
    var eventX = 0;
    /** The event y scale */
    var eventY = 0;
    /** The x coord of the mid point between two fingers */
    var midX = 0;
    /** The y coord of the mid point between two fingers */
    var midY = 0;
    /** The remaining steps for animation */
    var nStep = 1;
    /** The maximum steps for animation */
    var nMax = 10;
    /** The rotation angle step */
    var angleStep = Math.PI / 20;
    /** The rotation angle tolerance */
    var angleTol = angleStep / 10;

    /** The container for the canvas */
    var container = null;
    /** The image */
    var img = null;
    /** The loading url */
    var loadingUrl = null;
    /** The gif or video playable */
    var playable = null;
    /** The gif or video play control */
    var playControl = null;
    /** The message to be displayed */
    var msg = null;
    /** The canvas to draw the image */
    var canvas = null;
    /** The context to draw the image */
    var ctx = null;

    /** The canvas rectangle */
    var canvasRect = {
        left: 0,
        top: 0,
        width: 100,
        height: 100
    };
    /** The image rectangle */
    var imgRect = {
        left: 0,
        top: 0,
        width: 100,
        height: 100
    };

    /** The view param change callback */
    var viewParamChangeCallback = null;
    /** The mouse/touch/pointer change callback */
    var pointChangeCallback = null;
    /** The resize callback */
    var resizeCallback = null;
    /** The timer for double tap */
    var tapped = null;

    //==================================================
    // public functions
    //==================================================
    /**
     * Initialize this instance
     *
     * @param {Element} viewerContainer - The viewer container
     */
    function init( viewerContainer ) {
        var doc = viewerContainer.ownerDocument;
        container = viewerContainer;

        if( container.children.ImageViewerCanvas ) {
            resize();
        } else {
            canvas = doc.createElement( 'canvas' );
            container.appendChild( canvas );
            ctx = canvas.getContext( '2d' );

            canvas.id = 'ImageViewerCanvas';
            setCanvasRect();
            canvas.style[ 'touch-action' ] = 'none';

            vp.scale = scaleMin;
            vp.x = canvas.width / 2;
            vp.y = canvas.height / 2;
            vp.angle2 = 0;

            if( window.navigator.pointerEnabled ) {
                canvas.addEventListener( 'pointerdown', pointerStart );
                canvas.addEventListener( 'pointermove', pointerMove );
                canvas.addEventListener( 'pointerup', pointerStop );
                canvas.addEventListener( 'pointerout', pointerStop );
            } else {
                canvas.addEventListener( 'mousedown', panStart );
                canvas.addEventListener( 'mousemove', panMove );
                canvas.addEventListener( 'mouseup', panStop );
                canvas.addEventListener( 'mouseout', panStop );
                canvas.addEventListener( 'click', clickOnCanvas );
            }

            canvas.addEventListener( 'dblclick', panZoom );
            canvas.addEventListener( 'mousewheel', wheelZoom );
            canvas.addEventListener( 'DOMMouseScroll', wheelZoom );

            canvas.addEventListener( 'touchstart', touchStart );
            canvas.addEventListener( 'touchmove', touchMove );
            canvas.addEventListener( 'touchend', touchEnd );
            canvas.addEventListener( 'touchcancel', touchEnd );
        }

        // For debugging in the development environment, set devEnv to true and use Chrome browser only.
        if( devEnv && navigator.userAgent.match( /chrome/i ) && !container.children.ImageViewerMessage ) {
            msg = doc.createElement( 'div' );
            msg.id = 'ImageViewerMessage';
            msg.style.position = 'absolute';
            msg.style.left = '10px';
            msg.style.top = '10px';
            container.appendChild( msg );
        }
    }

    /**
     * Resize handler
     */
    function resize() {
        if( container && canvas && img ) {
            setVpFit();
            if( resizeCallback ) {
                resizeCallback();
            }

            if( playable ) {
                copyViewParam( vpFit, vp );
                playControl && playControl.resize();
                draw( playable.image );
            } else {
                copyViewParam( vpFit, vpEnd );
                animate();
            }
        }
    }

    /**
     * Set the image
     *
     * @param {String} url - The image url
     */
    function setImage( url ) {
        if( !url ) {
            viewParamChangeCallback = null;
            pointChangeCallback = null;
            resizeCallback = null;
            playControl && playControl.setPlayable( null );
            return;
        }

        if( url === loadingUrl ) {
            return;
        }

        img = new Image();
        loadingUrl = url;
        playable = null;
        playControl = null;

        if( url.match( /\.svg$/i ) ) {
            loadBlob( url, 'image/svg+xml;charset=utf-8', function( blobUrl ) {
                img.onload = function() {
                    loadingUrl = null;
                    fit( true );
                };
                img.src = blobUrl;
            } );
        } else if( url.match( /\.gif$/i ) ) {
            playControl = playControlExport.newInstance( container );
            const gifReader = gifReaderExport.newInstance( container );
            gifReader.setOnProgress( function( info ) {
                showProgress( info.bytesRead / info.totalBytes );
            } );
            gifReader.setOnLoad( function( p ) {
                loadingUrl = null;
                img = p.image;
                fit( true );
                if( p.frameCount > 1 ) {
                    playable = p;
                    playable.draw = function() { draw( playable.image ); };
                    playControl.setPlayable( playable );
                    playControl.setPlaying( true );
                    playControl.resize();
                }
            } );
            gifReader.load( url );
        } else if( url.match( /\.mp4$/i ) ) {
            playControl = playControlExport.newInstance( container );
            const videoReader = videoReaderExport.newInstance( container );
            videoReader.setOnLoad( function( p ) {
                loadingUrl = null;
                playable = p;
                if( !playable.draw ) {
                    playable.draw = function() { draw( playable.image ); };
                    playable.muted = true;
                    playControl.setPlayable( playable );
                    playControl.setPlaying( true );
                    playControl.resize();
                    fit( true );
                }
            } );
            videoReader.load( url );
        } else {
            img.onload = function() {
                loadingUrl = null;
                fit( true );
            };
            img.src = url;
        }
    }

    /**
     * Set the View Param
     *
     * @param {ViewParam} viewParam - The view param
     */
    function setViewParam( viewParam ) {
        copyViewParam( viewParam, vpEnd );
        if( viewParam.angle2 !== vpFit.angle2 ) {
            setVpFit( viewParam.angle2 );
        }
        animate();
    }

    /**
     * Get the fit view param
     *
     * @param {Number} angle - given angle, if undefined, same angle as the current view param
     */
    function getFitViewParam( angle ) {
        if( angle !== undefined && angle !== vpFit.angle2 ) {
            var to = {};
            setVpFit( angle, to );
            return to;
        }

        return vpFit;
    }

    /**
     * Fit the image on screen
     * @param {Boolean} initial - true if initial
     */
    function fit( initial ) {
        setVpFit();
        if( initial ) {
            copyViewParam( vpFit, vp );
            draw();
        } else {
            copyViewParam( vpFit, vpEnd );
            animate();
        }
    }

    /**
     * Rotate the image Clockwise
     */
    function rotateCW() {
        rotate( Math.PI / 2, true );
    }

    /**
     * Rotate the image Counterclockwise
     */
    function rotateCCW() {
        rotate( -Math.PI / 2, true );
    }

    /**
     * Rotate the image for any angle
     *
     * @param {Number} angle - any angle to rotate
     * @param {boolean} align - true if align the image edge with the screen
     */
    function rotate( angle, align ) {
        if( align ) {
            var n = Math.round( ( vp.angle2 + angle ) * 2 / Math.PI );
            setVpFit( n * Math.PI / 2 );
            copyViewParam( vpFit, vpEnd );
        } else {
            rotateViewParam( angle );
        }
        animate();
    }

    //==================================================
    // private functions
    //==================================================
    /**
     * Set the Canvas Rectangle
     *
     */
    function setCanvasRect() {
        var docRect = container.ownerDocument.documentElement.getBoundingClientRect();
        var containerRect = container.getBoundingClientRect();

        canvasRect.width = containerRect.width;
        canvasRect.height = containerRect.height;
        canvasRect.left = containerRect.left - docRect.left;
        canvasRect.top = containerRect.top - docRect.top;

        canvas.width = canvasRect.width;
        canvas.height = canvasRect.height;
        canvas.style.left = '0px';
        canvas.style.top = '0px';
        canvas.style.position = 'absolute';
    }

    /**
     * Draw the image on canvas
     * @param {Image} image - optional input image for video or animated gif
     */
    function draw( image ) {
        if( image ) {
            img = image;
        }

        if( canvas && ctx && img ) {
            ctx.clearRect( 0, 0, canvas.width, canvas.height );
            var w = img.naturalWidth || img.videoWidth || img.width;
            var h = img.naturalHeight || img.videoHeight || img.height;

            if( w > 0 && h > 0 ) {
                ctx.save();
                ctx.translate( vp.x, vp.y );
                ctx.scale( vp.scale, vp.scale );
                ctx.rotate( vp.angle2 );
                ctx.drawImage( img, 0, 0, w, h, 0, 0, w, h );
                ctx.restore();
                vp.t = playable ? playable.currentTime : undefined;

                if( viewParamChangeCallback ) {
                    viewParamChangeCallback( vp );
                }
            }

            if( msg ) {
                msg.innerHTML = '<small>View Param = { scale: ' + vp.scale.toFixed( 3 ) + ', x: ' +
                    vp.x.toFixed( 3 ) + ', y: ' + vp.y.toFixed( 3 ) + ', angle2: ' + vp.angle2 +
                    ( vp.t >= 0 ? ', t: ' + vp.t : '' ) + ' }</small>';
            }
        }
    }

    /**
     * Fit the image
     *
     * @param {Number} angle - the 2d angle, default vp.angle2
     * @param {ViewParm} to - the destination view param, default vpFit
     */
    function setVpFit( angle, to ) {
        angle = angle !== undefined ? angle : vp.angle2;
        to = to || vpFit;

        setCanvasRect();
        imgRect.width = img.naturalWidth || img.videoWidth || img.width;
        imgRect.height = img.naturalHeight || img.videoHeight || img.height;

        var cos = Math.cos( angle );
        var sin = Math.sin( angle );
        var imgBboxWidth = imgRect.width * Math.abs( cos ) + imgRect.height * Math.abs( sin );
        var imgBboxHeight = imgRect.width * Math.abs( sin ) + imgRect.height * Math.abs( cos );
        var scaleMax = img.videoWidth ? 4 : 1;

        to.scale = Math.max( scaleMin,
            Math.min( scaleMax, canvasRect.width / imgBboxWidth, canvasRect.height / imgBboxHeight ) );
        to.x = canvasRect.width / 2 - to.scale * ( imgRect.width * cos - imgRect.height * sin ) / 2;
        to.y = canvasRect.height / 2 - to.scale * ( imgRect.width * sin + imgRect.height * cos ) / 2;
        to.angle2 = angle;
    }

    /**
     * Scale the view param to vpEnd for animation
     *
     * @param {Number} s - the scale
     * @param {Number} px - the x coordinate of the point P
     * @param {Number} py - the y coordinate of the point P
     * @param {Number} qx - the x coordinate of the point Q
     * @param {Number} qy - the y coordinate of the point Q
     */
    function scaleViewParam( s, px, py, qx, qy ) {
        px = px || canvasRect.width / 2;
        py = py || canvasRect.height / 2;
        qx = qx || px;
        qy = qy || py;

        vpEnd.scale = Math.min( Math.max( s, scaleMin ), scaleMax );
        vpEnd.x = qx -  vpEnd.scale / vp.scale  * ( px - vp.x );
        vpEnd.y = qy -  vpEnd.scale / vp.scale  * ( py - vp.y );
        vpEnd.angle2 = vp.angle2;
    }


    /**
     * Rotate the view param to vpEnd for animation
     *
     * @param {Number} angle - the angle
     * @param {Number} px - the x coordinate of the point P
     * @param {Number} py - the y coordinate of the point P
     * @param {Number} qx - the x coordinate of the point Q
     * @param {Number} qy - the y coordinate of the point Q
     */
    function rotateViewParam( angle, px, py, qx, qy ) {
        px = px || canvasRect.width / 2;
        py = py || canvasRect.height / 2;
        qx = qx || px;
        qy = qy || py;

        var dx = px - vp.x;
        var dy = py - vp.y;
        var sin = Math.sin( angle );
        var cos = Math.cos( angle );

        vpEnd.scale = vp.scale;
        vpEnd.x = qx - cos * dx + sin * dy;
        vpEnd.y = qy - sin * dx - cos * dy;
        vpEnd.angle2 = vp.angle2 + angle;
    }

    /**
     * Limit the view param to prevent the image from out-of-screen
     *
     * @param {ViewParam} from - The source view param
     * @param {ViewParam} to - The destination view param
     * @return {Boolean} The view param is adjusted
     */
    function limitViewParam( from, to ) {
        if( from.scale < vpFit.scale ) {
            copyViewParam( vpFit, to );
            return true;
        }

        var cos = Math.cos( from.angle2 );
        var sin = Math.sin( from.angle2 );
        var bboxXmin = imgRect.width / 2 * ( cos - Math.abs( cos ) ) +
                    imgRect.height / 2 * ( -sin - Math.abs( sin ) );
        var bboxXmax = imgRect.width / 2 * ( cos + Math.abs( cos ) ) +
                    imgRect.height / 2 * ( -sin + Math.abs( sin ) );
        var bboxYmin = imgRect.width / 2 * ( sin - Math.abs( sin ) ) +
                    imgRect.height / 2 * ( cos - Math.abs( cos ) );
        var bboxYmax = imgRect.width / 2 * ( sin + Math.abs( sin ) ) +
                    imgRect.height / 2 * ( cos + Math.abs( cos ) );
        var sDiff = vpFit.scale - from.scale;

        to.x = Math.max( Math.min( from.x, vpFit.x + sDiff * bboxXmin ), vpFit.x + sDiff * bboxXmax );
        to.y = Math.max( Math.min( from.y, vpFit.y + sDiff * bboxYmin ), vpFit.y + sDiff * bboxYmax );
        to.scale = from.scale;
        to.angle2 = from.angle2;
        return  to.x !== from.x || to.y !== from.y;
    }

    /**
     * Copy the view param
     *
     * @param {ViewParam} from - The source view param
     * @param {ViewParam} to - The destination view param
     */
    function copyViewParam( from, to ) {
        to.scale = from.scale;
        to.x = from.x;
        to.y = from.y;
        to.angle2 = from.angle2;
        to.angle2 += to.angle2 > Math.PI ? -2 * Math.PI : to.angle2 < -Math.PI ? 2 * Math.PI : 0;
    }

    /**
     * Test if the two view params are the same
     *
     * @param {ViewParam} first - The first view param
     * @param {ViewParam} second - The second view param
     * @return {Boolean} True means the two view params are the same
     */
    function sameViewParam( first, second ) {
        return first.x === second.x && first.y === second.y &&
            first.scale === second.scale && first.angle2 === second.angle2;
    }

    /**
     * Clear the user selection
     */
    function clearUserSelection() {
        if( window.getSelection() ) {
            window.getSelection().removeAllRanges();
        }
    }

    /**
     * Do the zoom
     *
     * @param {Number} f - the zoom factor
     */
    function zoom( f ) {
        scaleViewParam( f * vp.scale );
        limitViewParam( vpEnd, vpEnd );
        animate();
    }

    /**
     * Do the pan and zoom together
     *
     * @param {Object} e - the event
     */
    function panZoom( e ) {
        e = e || window.event;
        var x = e.offsetX || e.layerX;
        var y = e.offsetY || e.layerY;

        e.stopPropagation();
        e.preventDefault();
        clearUserSelection();

        if( sameViewParam( vp, vpFit ) ) {
            scaleViewParam( 1, x, y, x, y );
            limitViewParam( vpEnd, vpEnd );
            animate();
        } else {
            fit();
        }
    }

    /**
     * Do the wheel zoom
     *
     * @param {Object} e - the event
     */
    function wheelZoom( e ) {
        e = e || window.event;
        var delta =  e.wheelDelta ? e.wheelDelta / 120 : e.detail ? -e.detail / 3 : 0;

        e.preventDefault();
        scaleViewParam( Math.pow( 1.1, delta ) * vp.scale );
        limitViewParam( vpEnd, vp );
        draw();
    }

    /**
     * Animate from vp to vpEnd
     */
    function animate() {
        if( sameViewParam( vpEnd, vp ) ) {
            draw();
        } else {
            var dx = Math.abs( vpEnd.x - vp.x ) * 0.02;
            var dy = Math.abs( vpEnd.y - vp.y ) * 0.02;
            var ds = Math.abs( vpEnd.scale - vp.scale ) * 20;
            nStep = Math.floor( Math.min( nMax, Math.max( dx, dy, ds, 1 ) ) );
            copyViewParam( vpEnd, vpFinal );
            animation();
        }
    }

    /**
     * Do one step of the animation
     */
    function animation() {
        var da = vpFinal.angle2 - vp.angle2;
        da = da > Math.PI ? da - 2 * Math.PI : da < -Math.PI ? da + 2 * Math.PI : da;
        if( Math.abs( da ) > angleTol ) {
            rotateViewParam( da > angleStep ? angleStep : da < -angleStep ? -angleStep : da );
            copyViewParam( vpEnd, vp );
            draw();
            window.requestAnimationFrame( animation );
        } else if( nStep <= 1 ) {
            copyViewParam( vpFinal, vp );
            draw();
        } else {
            vp.scale += ( vpFinal.scale - vp.scale ) / nStep;
            vp.x += ( vpFinal.x - vp.x ) / nStep;
            vp.y += ( vpFinal.y - vp.y ) / nStep;
            vp.angle2 = vpFinal.angle2;
            nStep--;
            draw();
            window.requestAnimationFrame( animation );
        }
    }

    /**
     * Pan start event handler
     *
     * @param {Object} e - the event
     */
    function panStart( e ) {
        e = e || window.event;
        panOn = true;
        eventX = e.offsetX || e.layerX;
        eventY = e.offsetY || e.layerY;
    }

    /**
     * Pan move event handler
     *
     * @param {Object} e - the event
     */
    function panMove( e ) {
        e = e || window.event;
        var x = e.offsetX || e.layerX;
        var y = e.offsetY || e.layerY;

        if( panOn ) {
            vp.x += x - eventX;
            vp.y += y - eventY;
            draw();
            eventX = x;
            eventY = y;
        } else {
            if( pointChangeCallback ) {
                pointChangeCallback( x, y, 'mousemove' );
            }
        }
    }

    /**
     * Pan stop event handler
     */
    function panStop() {
        if( panOn && limitViewParam( vp, vpEnd ) ) {
            animate();
        }
        panOn = false;
    }

    /**
     * Click on canvas event handler
     *
     * @param {Object} e - the event
     */
    function clickOnCanvas( e ) {
        e = e || window.event;
        var x = e.offsetX || e.layerX;
        var y = e.offsetY || e.layerY;
        if( pointChangeCallback ) {
            pointChangeCallback( x, y, 'click' );
        }
    }

    /**
     * Touch start event handler
     *
     * @param {Object} e - the event
     */
    function touchStart( e ) {
        e = e || window.event;
        e.preventDefault();

        if( e.touches.length === 1 ) {
            if( !tapped ) {
                tapped = window.setTimeout( function() {
                    tapped = null;
                }, 300 );
                panOn = true;
                pinchOn = false;
                eventX = e.touches[ 0 ].pageX - canvasRect.left;
                eventY = e.touches[ 0 ].pageY - canvasRect.top;
            } else {
                window.clearTimeout( tapped );
                tapped = null;
                panZoom( e );
            }
        } else if( e.touches.length === 2 ) {
            pinchOn = true;
            panOn = false;
            var x0 = e.touches[ 0 ].pageX - canvasRect.left;
            var y0 = e.touches[ 0 ].pageY - canvasRect.top;
            var x1 = e.touches[ 1 ].pageX - canvasRect.left;
            var y1 = e.touches[ 1 ].pageY - canvasRect.top;

            eventX = x0;
            eventY = y0;
            midX = ( x0 + x1 ) / 2;
            midY = ( y0 + y1 ) / 2;
            pinchF = vp.scale / Math.sqrt( ( x0 - x1 ) * ( x0 - x1 ) + ( y0 - y1 ) * ( y0 - y1 ) );
        }
    }

    /**
     * Touch move event handler
     *
     * @param {Object} e - the event
     */
    function touchMove( e ) {
        e = e || window.event;
        e.preventDefault();

        if( e.touches.length === 1 ) {
            var x = e.touches[ 0 ].pageX - canvasRect.left;
            var y = e.touches[ 0 ].pageY - canvasRect.top;

            if( panOn ) {
                vp.x += x - eventX;
                vp.y += y - eventY;
                draw();
            } else {
                panOn = true;
                pinchOn = false;
            }

            eventX = x;
            eventY = y;
        } else if( e.touches.length === 2 ) {
            var x0 = e.touches[ 0 ].pageX - canvasRect.left;
            var y0 = e.touches[ 0 ].pageY - canvasRect.top;
            var x1 = e.touches[ 1 ].pageX - canvasRect.left;
            var y1 = e.touches[ 1 ].pageY - canvasRect.top;
            var dist = Math.sqrt( ( x0 - x1 ) * ( x0 - x1 ) + ( y0 - y1 ) * ( y0 - y1 ) );

            if( pinchOn ) {
                scaleViewParam( pinchF * dist, midX, midY, midX, midY );
                copyViewParam( vpEnd, vp );
                draw();
            } else {
                pinchOn = true;
                panOn = false;
                midX = ( x0 + x1 ) / 2;
                midY = ( y0 + y1 ) / 2;
                pinchF = vp.scale / dist;
            }

            eventX = x0;
            eventY = y0;
        }
    }

    /**
     * Touch end event handler
     *
     * @param {Object} e - the event
     */
    function touchEnd( e ) {
        e = e || window.event;
        e.preventDefault();

        if( panOn || pinchOn ) {
            if( limitViewParam( vp, vpEnd ) ) {
                animate();
            }

            if( panOn && pointChangeCallback ) {
                pointChangeCallback( eventX, eventY, 'touchend' );
            }
        }

        panOn = false;
        pinchOn = false;
    }

    /**
     * Pointer start event handler
     *
     * @param {Object} e - the event
     */
    function pointerStart( e ) {
        e = e || window.event;
        if( e.pointerType !== 'touch' ) {
            return panStart( e );
        }

        e.preventDefault();
        if( e.isPrimary ) {
            panOn = true;
            pinchOn = false;
            eventX = e.offsetX;
            eventY = e.offsetY;
        } else {
            pinchOn = true;
            panOn = false;
            var x0 = e.offsetX;
            var y0 = e.offsetY;
            var x1 = eventX;
            var y1 = eventY;

            midX = ( x0 + x1 ) / 2;
            midY = ( y0 + y1 ) / 2;
            pinchF = vp.scale / Math.sqrt( ( x0 - x1 ) * ( x0 - x1 ) + ( y0 - y1 ) * ( y0 - y1 ) );
        }
    }

    /**
     * Pointer move event handler
     *
     * @param {Object} e - the event
     */
    function pointerMove( e ) {
        e = e || window.event;
        if( e.pointerType !== 'touch' ) {
            return panMove( e );
        }

        e.preventDefault();
        if( e.isPrimary ) {
            var x = e.offsetX;
            var y = e.offsetY;

            if( panOn ) {
                vp.x += x - eventX;
                vp.y += y - eventY;
                draw();
            }

            eventX = x;
            eventY = y;
        } else if( pinchOn ) {
            var x0 = e.offsetX;
            var y0 = e.offsetY;
            var x1 = eventX;
            var y1 = eventY;
            var dist = Math.sqrt( ( x0 - x1 ) * ( x0 - x1 ) + ( y0 - y1 ) * ( y0 - y1 ) );

            scaleViewParam( pinchF * dist, midX, midY, midX, midY );
            copyViewParam( vpEnd, vp );
            draw();
        }
    }

    /**
     * Pointer end event handler
     *
     * @param {Object} e - the event
     */
    function pointerStop( e ) {
        e = e || window.event;
        e.preventDefault();

        if( panOn || pinchOn ) {
            var x = e.offsetX;
            var y = e.offsetY;
            var type =  e.pointerType === 'touch' ? 'touchend' : 'click';

            if( limitViewParam( vp, vpEnd ) ) {
                animate();
            }

            if( panOn && pointChangeCallback ) {
                pointChangeCallback( x, y, type );
            }
        }

        panOn = false;
        pinchOn = false;
    }

    /**
     * Show Progress
     * @param {Number} p - progress from 0 (start) to 1 (finish)
     */
    function showProgress( p ) {
        if( canvas && ctx ) {
            draw();
            var x = canvas.width / 2;
            var y = canvas.height / 2;
            ctx.beginPath();
            ctx.arc( x, y, 50, -0.5 * Math.PI, ( p * 2 - 0.5 ) * Math.PI );
            ctx.strokeStyle = 'gray';
            ctx.lineWidth = 10;
            ctx.stroke();
        }
    }

    /**
     * Load the Blob from URL
     *
     * @param {String} url - the url
     * @param {String} type - the mime type
     * @param {Function} callback - function called when loaded
     */
    function loadBlob( url, type, callback ) {
        var isSvg = type.match( /svg/ );
        var xhr = new XMLHttpRequest();
        xhr.open( 'GET', url, true );
        xhr.onprogress = function( e ) {
            var total = e.total > 0 ? e.total : 1000000;
            showProgress( e.loaded % total / total );
        };
        if( !isSvg ) {
            xhr.responseType = 'blob';
        }
        xhr.onload = function( e ) {
            if ( this.status === 200 ) {
                var resp = isSvg ? fixSvg( this.responseText ) : this.response;
                var blob = new Blob( [ resp ], { type: type } );
                if( callback ) {
                    callback( URL.createObjectURL( blob ) );
                }
            }
        };
        xhr.send();
    }

    /**
     * Fix SVG if it doesn't specify width and height
     *
     * @param {String} svgDoc - the SVG document in text format
     * @returns {String} the fix SVG document
     */
    function fixSvg( svgDoc ) {
        var svgHead = svgDoc.match( /<svg[^>]*>/ );
        if( svgHead ) {
            var head = svgHead[0];
            var width = head.match( /width="[0-9.]+"/ );
            var height = head.match( /height="[0-9.]+"/ );
            var viewBox = head.match( /viewBox="([0-9. ]+)"/ );
            if( !( width && height ) && viewBox ) {
                var v = viewBox[1].split( ' ' );
                if( v.length === 4 ) {
                    var w = v[2] * 96;
                    var h = v[3] * 96;
                    var newHead = head.replace( />/, ' width="' + w + '" height="' + h + '" >' );
                    return svgDoc.replace( head, newHead );
                }
            }
        }

        return svgDoc;
    }

    // return the instance with export functions
    init( viewerContainer );
    return {
        init,
        fit,
        resize,
        setImage,
        refresh: draw,
        rotate,
        rotateCW,
        rotateCCW,
        getContainer: () => { return container; },
        getCanvas: () => { return canvas; },
        getImage: () => { return img; },
        getViewParam: () => { return vp; },
        getFitViewParam,
        setViewParam,
        setViewParamChangeCallback: ( callback ) => { viewParamChangeCallback = callback; },
        setPointChangeCallback: ( callback ) => { pointChangeCallback = callback; },
        setResizeCallback: ( callback ) => { resizeCallback = callback; },
        setTicks: ( array ) => { playControl && playControl.setTicks( array ); },
        getTicks: () => { return playControl && playControl.getTicks(); },
        getDuration: () => { return playable && playable.duration; },
        playInterval: ( start, end, callback ) => { playControl && playControl.playInterval( start, end, callback ); },
        setPlayChangeCallback: ( callback ) => { playControl && playControl.setPlayChangeCallback( callback ); }
    };
}

//==================================================
// exported functions
//==================================================

export let setDevEnv = ( b ) => {
    devEnv = b;
};

let exports;
export default exports = {
    newInstance,
    setDevEnv
};
