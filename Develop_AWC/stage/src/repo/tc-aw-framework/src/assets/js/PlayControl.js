// Copyright 2022 Siemens Product Lifecycle Management Software Inc.
/**
 * @module js/PlayControl
 */
//==================================================
// public functions
//==================================================
/**
 * create a new instance of this module
 *
 * @param {Element} viewerContainer - The viewer container
 * @returns {Object} the export functions
 */
export function newInstance( viewerContainer ) {
    /** The container */
    var container = viewerContainer;

    /** The play control */
    var playControl = null;
    var playButton = null;
    var pauseButton = null;
    var timeLabel = null;
    var durationLabel = null;
    var timeLine = null;

    /** The states */
    var playable = null;
    var playing = false;
    var seeking = false;
    var currentTime = 0;
    var endTime = 0;
    var duration = 1;
    var timeTol = 0.25;
    var lastEventTime = 0;
    var ticks = null;
    var currentTick = null;
    var tFit = { scale: 148, x: 0 };
    var tParam = { scale: 148, x: 0 };
    var playIntervalCallback = null;
    var playChangeCallback = null;

    /**
     * Initialize this instance
     *
     * @param {Element} viewerContainer - the viewer container
     */
    function init( viewerContainer ) {
        var doc = viewerContainer.ownerDocument;
        if( container.children.playControl ) {
            playControl = container.children.playControl;
            playButton = playControl.children.playButton;
            pauseButton = playControl.children.pauseButton;
            timeLabel = playControl.children.timeLabel;
            durationLabel = playControl.children.durationLabel;
            timeLine = playControl.children.timeLine;
        } else {
            playControl = doc.createElement( 'span' );
            playControl.id = 'playControl';
            playControl.style.position = 'absolute';
            playControl.style.left = '0px';
            playControl.style.top = '0px';
            playControl.style.width = '100%';
            playControl.style.height = '40px';
            playControl.style.borderRadius = '20px';
            playControl.style.background = 'rgba(0, 0, 0, 0.5)';
            playControl.style.display =  playable ? 'block' : 'none';
            container.appendChild( playControl );

            var svg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" stroke="white" stroke-width="1" fill="none" />' +
            '<path d="xyz" stroke="white" stroke-width="1" fill="none" /></svg>';

            playButton = doc.createElement( 'span' );
            playButton.id = 'playButton';
            playButton.style.position = 'absolute';
            playButton.style.left = '2px';
            playButton.style.top = '2px';
            playButton.style.width = '36px';
            playButton.style.height = '36px';
            playButton.style.display =  playing ? 'none' : 'block';
            playButton.style.zIndex = '1000';
            playButton.innerHTML = svg.replace( /xyz/, 'M9,7V17L17,12z' );
            playButton.addEventListener( 'click', clickButton );
            playControl.appendChild( playButton );

            pauseButton = playButton.cloneNode();
            pauseButton.id = 'pauseButton';
            pauseButton.style.display =  playing ? 'block' : 'none';
            pauseButton.innerHTML = svg.replace( /xyz/, 'M8,8V16H11V8H7.5M13,8V16H16V8H12.5' );
            pauseButton.addEventListener( 'click', clickButton );
            playControl.appendChild( pauseButton );

            timeLabel = doc.createElement( 'span' );
            timeLabel.id = 'timeLabel';
            timeLabel.style.position = 'absolute';
            timeLabel.style.textAlign = 'center';
            timeLabel.style.left = '40px';
            timeLabel.style.top = '12px';
            timeLabel.style.width = '40px';
            timeLabel.style.height = '20px';
            timeLabel.style.color = 'white';
            timeLabel.innerHTML = '0:00';
            playControl.appendChild( timeLabel );

            durationLabel = timeLabel.cloneNode();
            durationLabel.id = 'durationLabel';
            durationLabel.style.left = '240px';
            durationLabel.innerHTML = '1:00';
            playControl.appendChild( durationLabel );

            timeLine = doc.createElement( 'span' );
            timeLine.id = 'timeLine';
            timeLine.style.position = 'absolute';
            timeLine.style.left = '80px';
            timeLine.style.top = '0px';
            timeLine.style.width = '160px';
            timeLine.style.height = '40px';
            timeLine.style.zIndex = '1000';
            timeLine.innerHTML = '<svg viewBox="0 0 160 40"><path d="M6,20H148" stroke="white" stroke-width="2" /></svg>';
            playControl.appendChild( timeLine );

            container.addEventListener( 'mousemove', showPlayControl );
            container.addEventListener( 'touchstart', showPlayControl );

            timeLine.addEventListener( 'mousedown', seekStart );
            timeLine.addEventListener( 'mousemove', seekMove );
            timeLine.addEventListener( 'mouseup', seekEnd );
            timeLine.addEventListener( 'mousewheel', zoomTimeLine );
            timeLine.addEventListener( 'DOMMouseScroll', zoomTimeLine );
            timeLine.addEventListener( 'dblclick', spliceTicks );

            timeLine.addEventListener( 'touchstart', seekStart );
            timeLine.addEventListener( 'touchmove', seekMove );
            timeLine.addEventListener( 'touchend', seekEnd );
        }
    }

    /**
     * Resize handler
     */
    function resize() {
        if( container && playControl ) {
            var containerRect = container.getBoundingClientRect();
            playControl.style.top =  containerRect.height - 40  + 'px';
            playControl.style.width = containerRect.width + 'px';
            durationLabel.style.left =  containerRect.width - 40  + 'px';
            timeLine.style.width =  containerRect.width - 120  + 'px';
            setTimeParam();
            updateTimeLine();
        }
    }

    /**
     * Set playable
     *
     * @param {Playable} v - the playable interface, can be gif or video
     */
    function setPlayable( v ) {
        playable = v;
        playControl.style.display =  playable ? 'block' : 'none';
        if( playable ) {
            setDuration( playable.duration );
        } else {
            endTime = 0;
        }
    }

    /**
     * Set playing
     *
     * @param {Boolean} v - true for playing, false for paused
     */
    function setPlaying( v ) {
        if( playing !== v && !seeking ) {
            playing = v;
            playControl.style.display = 'block';
            playButton.style.display =  playing ? 'none' : 'block';
            pauseButton.style.display =  playing ? 'block' : 'none';

            if( playable ) {
                if( playing ) {
                    playable.play();
                    animation();
                } else {
                    playable.pause();
                }
            }

            if( playChangeCallback ) {
                playChangeCallback( playing );
            }
        }
    }

    /**
     * Set the current time of playing
     *
     * @param {Number} t - the current time
     * @param {Boolean} seek - true to seek
     */
    function setCurrentTime( t, seek ) {
        currentTime = t;
        timeLabel.innerHTML = timeToText( currentTime );
        updateTimeLine();

        if( seek ) {
            if( playable.seek ) {
                playable.seek( currentTime );
            } else if( playable.seekable ) {
                for( var i = 0; i < playable.seekable.length; i++ ) {
                    var start = playable.seekable.start( i );
                    var end = playable.seekable.end( i );
                    if( start <= currentTime && currentTime <= end ) {
                        playable.currentTime = currentTime;
                    }
                }
            }

            playable.draw();
        }
    }

    /**
     * Set the duration
     *
     * @param {Number} d - the duration
     */
    function setDuration( d ) {
        duration = Math.max( d, 1 );
        durationLabel.innerHTML = timeToText( duration );
        setTimeParam();
        updateTimeLine();
    }

    /**
     * Set the ticks on the time line
     *
     * @param {Tick[]} array - array of ticks
     */
    function setTicks( array ) {
        ticks = array;
        currentTick = null;
        if( !ticks ) {
            tParam.scale = tFit.scale;
            tParam.x = tFit.x;
        }
        updateTimeLine();
    }

    /**
     * Get the ticks
     *
     * @returns {Object} the ticks
     */
    function getTicks() {
        return ticks;
    }

    /**
     * Play on the give interval of time
     *
     * @param {Number} start - the start of the interval
     * @param {Number} end - the end of the interval
     * @param {Function} callback - callback function after played to the end
     */
    function playInterval( start, end, callback ) {
        if( playable && start >= 0 && end > start ) {
            playIntervalCallback = callback;
            setPlaying( false );
            setCurrentTime( start, true );
            endTime = end;
            setPlaying( true );
        }
    }

    /**
     * Set callback function for play change
     *
     * @param {Function} callback - the function called when playing changed
     */
    function setPlayChangeCallback( callback ) {
        playChangeCallback = callback;
    }

    //==================================================
    // private functions
    //==================================================
    /**
     * Event handler for clicking button
     */
    function clickButton() {
        if( !playing && ticks ) {
            var nextTick = getNextTick();
            if( nextTick ) {
                endTime = nextTick.t;
            } else {
                endTime = ticks[0].t;
                setCurrentTime( Math.max( endTime - 0.5, 0 ), true );
            }
        }

        setPlaying( !playing );
        playable.muted = false;
    }

    /**
     * Get the next tick on the time line
     *
     * @returns {Object} the next tick
     */
    function getNextTick() {
        for( var i = 0; i < ticks.length; i++ ) {
            if( playable.currentTime < ticks[i].t ) {
                return ticks[i];
            }
        }

        return null;
    }

    /**
     * Format time to text
     *
     * @param {Number} t - time in seconds
     * @returns {String} the string in the format "mm:ss"
     */
    function timeToText( t ) {
        var sec = Math.round( t % 60 );
        var min = Math.floor( t / 60 );
        return min + ':' + ( sec >= 10 ? '' : '0' ) + sec;
    }

    /**
     * Find the tick at a given time
     *
     * @param {Number} t - the time
     * @returns {Number} the index of the found tick, -1 if not found
     */
    function findTick( t ) {
        if( ticks ) {
            var tTol = 0.1;
            for( var i = 0; i < ticks.length; i++ ) {
                if( Math.abs( t - ticks[i].t ) < tTol ) {
                    return i;
                }
            }
        }

        return -1;
    }

    /**
     * Animation of the playing
     */
    function animation() {
        if( playable && playing ) {
            playable.draw();
            setCurrentTime( playable.currentTime );
            playControl.style.display = Date.now() - lastEventTime < 2000 || ticks ? 'block' : 'none';

            var stopTime = endTime > 0 ? endTime : playable.duration;
            if( playable.loop && endTime === 0 || playable.currentTime < stopTime ) {
                window.requestAnimationFrame( animation );
            } else {
                setPlaying( false );
                if( endTime > 0 ) {
                    endTime = 0;
                    if( playIntervalCallback ) {
                        playIntervalCallback();
                    }
                }
            }
        }
    }

    /**
     * Show play control, auto hide after 2 seconds of user action
     */
    function showPlayControl() {
        lastEventTime = Date.now();
    }

    /**
     * Event handler for seek start
     *
     * @param {Event} e - the event
     */
    function seekStart( e ) {
        var t = xToT( e.offsetX - 6 );
        seeking = !playing && Math.abs( t - currentTime ) < 0.1;

        if( seeking ) {
            e.preventDefault();

            var index = findTick( t );
            if( index >= 0 ) {
                currentTick = ticks[ index ];
                currentTick.seek = true;
            }
        }
    }

    /**
     * Event handler for seek move
     *
     * @param {Event} e - the event
     */
    function seekMove( e ) {
        if( seeking ) {
            e.preventDefault();
            var t = Math.max( Math.min( xToT( e.offsetX - 6 ), duration ), 0 );

            if( ticks && currentTick && currentTick.seek ) {
                for( var i = 0; i < ticks.length; i++ ) {
                    if( !ticks[i].seek && Math.abs( t - ticks[i].t ) < timeTol ) {
                        return;
                    }
                }

                currentTick.t = t;
            }

            setCurrentTime( t, true );
        }
    }

    /**
     * Event handler for seek end
     *
     * @param {Event} e - the event
     */
    function seekEnd() {
        seeking = false;
        if( currentTick ) {
            currentTick.seek = undefined;
            currentTick = null;
        }
    }

    /**
     * Update the time line, showing seek handle and ticks
     */
    function updateTimeLine() {
        var width = Number( timeLine.style.width.replace( /px/, '' ) );
        var svg = '<svg viewBox="0 0 ' + width + ' 40">';
        var x = tToX( currentTime ) + 6;
        var color = playable && playable.buffered ? 'darkgray' : 'white';

        svg += '<path d="M6,20H' + ( width - 6 ) + '" stroke="' + color + '" stroke-width="2" />';
        svg += '<circle cx="' + x + '" cy="20" r="6" fill="white" />';

        if( playable && playable.buffered ) {
            for( var i = 0; i < playable.buffered.length; i++ ) {
                var x0 = tToX( playable.buffered.start( i ) ) + 6;
                var x1 = tToX( playable.buffered.end( i ) ) + 6;
                svg += '<path d="M' + x0 + ',20H' + x1 + '" stroke="white" stroke-width="2" />';
            }
        }

        if( ticks ) {
            for( var i = 0; i < ticks.length; i++ ) {
                x = tToX( ticks[i].t ) + 6;
                svg += '<path d="M' + x + ',10V30" stroke="white" stroke-width="2" />';
            }
        }
        svg += '</svg>';
        timeLine.innerHTML = svg;
    }

    /**
     * Event handler for double click on the time line, add or remove tick
     *
     * @param {Event} e - the event
     */
    function spliceTicks( e ) {
        var changed = false;
        if( ticks ) {
            var t = xToT( e.offsetX - 6 );
            var index = findTick( t );
            if( index < 0 ) {
                for( var i = 0; i < ticks.length - 1; i++ ) {
                    if( t > ticks[i].t + timeTol && t < ticks[i + 1].t - timeTol ) {
                        ticks.splice( i + 1, 0, { t } );
                        changed = true;
                    }
                }
            } else if( index !== 0 && index !== ticks.length - 1 ) {
                ticks.splice( index, 1 );
                changed = true;
            }
        }

        if( changed && playable ) {
            updateTimeLine();
            playable.draw();
        }
    }

    /**
     * Set the time parameter, which is used for mapping t to x
     */
    function setTimeParam() {
        var width = Number( timeLine.style.width.replace( /px/, '' ) ) - 12;
        tFit = { scale: width / duration, x: 0 };
        tParam = { scale: width / duration, x: 0 };
    }

    /**
     * Map x to t
     * @param {Number} x - the x coord on time line
     * @returns {Number} the mapped time
     */
    function xToT( x ) {
        return ( x - tParam.x ) / tParam.scale;
    }
    /**
     * Map t to x
     * @param {Number} t - the time
     * @returns {Number} the x coord on time line
     */
    function tToX( t ) {
        return Math.round( t * tParam.scale + tParam.x );
    }

    /**
     * Event handler for wheel zoom on the time line
     *
     * @param {Event} e - the event for wheel zoom
     */
    function zoomTimeLine( e ) {
        if( ticks && ticks.length > 1 ) {
            var delta =  e.wheelDelta ? e.wheelDelta / 120 : e.detail ? -e.detail / 3 : 0;

            e.preventDefault();
            var s = Math.pow( 1.1, delta ) * tParam.scale;
            var sfit = tFit.scale;
            var smax = sfit * duration / ( ticks[ ticks.length - 1 ].t - ticks[0].t );
            if( s > sfit && s < smax ) {
                var x = -ticks[0].t * smax * ( s - sfit ) / ( smax - sfit );
                tParam.scale = s;
                tParam.x = x;
                updateTimeLine();
            }
        }
    }

    init( viewerContainer );
    return {
        init,
        resize,
        setPlayable,
        setPlaying,
        setCurrentTime,
        setDuration,
        setTicks,
        getTicks,
        playInterval,
        setPlayChangeCallback
    };
}

//==================================================
// exported functions
//==================================================
let exports;
export default exports = {
    newInstance
};
