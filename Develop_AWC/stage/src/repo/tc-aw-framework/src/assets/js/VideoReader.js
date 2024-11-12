// Copyright 2022 Siemens Product Lifecycle Management Software Inc.

/**
 * @module js/VideoReader
 */
//==================================================
// export functions
//==================================================
/**
 * Create a new instance of this module
 *
 * @param {Element} viewerContainer - The viewer container
 * @return {Object} the export functions
 */
export function newInstance( viewerContainer ) {
    var container = null;
    var videoElement = null;
    var videoDiv = null;
    var onLoad = null;
    var onProgress = null;

    /**
     * Initialize this instance
     *
     * @param {Element} viewerContainer - the viewer container
     */
    function init( viewerContainer ) {
        var doc = viewerContainer.ownerDocument;
        container = viewerContainer;

        if( container.children.videoElement && container.children.videoDiv ) {
            videoElement = container.children.videoElement;
            videoDiv = container.children.videoDiv;
        } else {
            videoElement = doc.createElement( 'video' );
            videoDiv = doc.createElement( 'div' );

            container.appendChild( videoDiv );
            videoDiv.appendChild( videoElement );
            videoDiv.setAttribute( 'style', 'display:none;' );

            videoElement.setAttribute( 'controls', 'true' );
            videoElement.addEventListener( 'progress', videoProgress, false );
            videoElement.addEventListener( 'canplaythrough', videoLoaded, false );
        }
    }

    // Private functions
    /**
     * The video progress event handler
     *
     * @param {Event} e - the event
     */
    function videoProgress( e ) {
        if( onProgress ) {
            if( videoElement.buffered.length > 0 && videoElement.duration > 0 ) {
                onProgress( videoElement.buffered.end( 0 ) / videoElement.duration );
            } else if( e.timeStamp ) {
                onProgress( e.timeStamp % 1000000 / 1000000 );
            }
        }
    }

    /**
     * Video loaded
     */
    function videoLoaded() {
        videoElement.image = videoElement;
        if( onLoad ) {
            onLoad( videoElement );
        }
    }

    init( viewerContainer );
    return {
        init,
        load: ( url ) => { videoElement.setAttribute( 'src', url ); },
        setOnProgress: ( callback ) => { onProgress = callback; },
        setOnLoad: ( callback ) => { onLoad = callback; }
    };
}

let exports;
export default exports = {
    newInstance
};
