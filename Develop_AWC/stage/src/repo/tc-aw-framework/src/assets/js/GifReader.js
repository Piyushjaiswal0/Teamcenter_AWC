/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-bitwise */
// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/**
 * @module js/GifReader
 */
//==================================================
// export functions
//==================================================
/**
 * Create a new instance of this module
 * @returns {Object} the new instance
 */
export function newInstance() {
    var timerID;                          // timer handle for set time out usage
    var st;                               // holds the stream object when loading.
    var interlaceOffsets  = [ 0, 4, 2, 1 ]; // used in de-interlacing.
    var interlaceSteps    = [ 8, 8, 4, 2 ];
    var interlacedBufSize;  // this holds a buffer to de interlace. Created on the first frame and when size changed
    var deinterlaceBuf;
    var pixelBufSize;    // this holds a buffer for pixels. Created on the first frame and when size changed
    var pixelBuf;
    const GIF_FILE = { // gif file data headers
        GCExt   : 0xF9,
        COMMENT : 0xFE,
        APPExt  : 0xFF,
        UNKNOWN : 0x01, // not sure what this is but need to skip it in parser
        IMAGE   : 0x2C,
        EOF     : 59,   // This is entered as decimal
        EXT     : 0x21
    };
    // simple buffered stream used to read from the file
    var Stream = function( data ) {
        this.data = new Uint8ClampedArray( data );
        this.pos  = 0;
        var len   = this.data.length;
        this.getString = function( count ) { // returns a string from current pos of len count
            var s = '';
            while ( count-- ) {
                s += String.fromCharCode( this.data[this.pos++] );
            }
            return s;
        };
        this.readSubBlocks = function() { // reads a set of blocks as a string
            var size;
            var count;
            var data  = '';
            do {
                size = this.data[this.pos++];
                count = size;
                while ( count-- ) {
                    data += String.fromCharCode( this.data[this.pos++] );
                }
            } while ( size !== 0 && this.pos < len );
            return data;
        };
        this.readSubBlocksB = function() { // reads a set of blocks as binary
            var size;
            var count;
            var data = [];
            do {
                size = this.data[this.pos++];
                count = size;
                while ( count-- ) {
                    data.push( this.data[this.pos++] );
                }
            } while ( size !== 0 && this.pos < len );
            return data;
        };
    };

    /**
     * LZW decoder uncompressed each frames pixels, this needs to be optimised.
     * @param {Number} minSize is the min dictionary as powers of two
     * @param {Object} data is the compressed pixels
     */
    function lzwDecode( minSize, data ) {
        var i;
        var pixelPos;
        var pos;
        var clear;
        var eod;
        var size;
        var done;
        var dic;
        var code;
        var last;
        var d;
        var len;
        pos = 0;
        pixelPos = 0;
        dic      = [];
        clear    = 1 << minSize;
        eod      = clear + 1;
        size     = minSize + 1;
        while ( pixelPos < pixelBufSize ) { // check pixelPos in case of missing eod
            last = code;
            code = 0;
            for ( i = 0; i < size; i++ ) {
                if ( data[pos >> 3] & 1 << ( pos & 7 ) ) { code |= 1 << i; }
                pos++;
            }
            if ( code === clear ) { // clear and reset the dictionary
                dic = [];
                size = minSize + 1;
                for ( i = 0; i < clear; i++ ) { dic[i] = [ i ]; }
                dic[clear] = [];
                dic[eod] = null;
            } else {
                if ( code === eod ) {
                    return;
                }
                if ( code >= dic.length ) {
                    dic.push( dic[last].concat( dic[last][0] ) );
                } else if ( last !== clear ) {
                    dic.push( dic[last].concat( dic[code][0] ) );
                }
                d = dic[code];
                len = d.length;
                for ( i = 0; i < len; i++ ) { pixelBuf[pixelPos++] = d[i]; }
                if ( dic.length === 1 << size && size < 12 ) { size++; }
            }
        }
    }
    /**
     * get a colour table of length count  Each entry is 3 bytes, for RGB.
     * @param {Number} count - the count of colors
     * @returns {Color[]} the colors
     */
    function parseColourTable( count ) {
        var colours = [];
        for ( var i = 0; i < count; i++ ) {
            colours.push( [ st.data[st.pos++], st.data[st.pos++], st.data[st.pos++] ] );
        }
        return colours;
    }
    /**
     * read the header. This is the starting point of the decode and async calls parseBlock
     */
    function parse() {
        var bitField;
        st.pos                += 6;
        gif.width             = st.data[st.pos++] + ( st.data[st.pos++] << 8 );
        gif.height            = st.data[st.pos++] + ( st.data[st.pos++] << 8 );
        bitField              = st.data[st.pos++];
        gif.colorRes          = ( bitField & 0b1110000 ) >> 4;
        gif.globalColourCount = 1 << ( bitField & 0b111 ) + 1;
        gif.bgColourIndex     = st.data[st.pos++];
        st.pos++;                    // ignoring pixel aspect ratio. if not 0, aspectRatio = (pixelAspectRatio + 15) / 64
        if ( bitField & 0b10000000 ) {
            gif.globalColourTable = parseColourTable( gif.globalColourCount ); // global colour flag
        }
        setTimeout( parseBlock, 0 );
    }
    /**
     * get application specific data. Netscape added iterations and terminator. Ignoring that
     */
    function parseAppExt() {
        st.pos += 1;
        if( 'NETSCAPE' === st.getString( 8 ) ) {
            st.pos += 8;            // ignoring this data. iterations (word) and terminator (byte)
        } else {
            st.pos += 3;            // 3 bytes of string usually "2.0" when identifier is NETSCAPE
            st.readSubBlocks();     // unknown app extension
        }
    }
    /**
     * get GC data
     */
    function parseGCExt() {
        var bitField;
        st.pos++;
        bitField              = st.data[st.pos++];
        gif.disposalMethod    = ( bitField & 0b11100 ) >> 2;
        gif.transparencyGiven = Boolean( bitField & 0b1 ); // ignoring bit two that is marked as  userInput???
        gif.delayTime         = st.data[st.pos++] + ( st.data[st.pos++] << 8 );
        gif.transparencyIndex = st.data[st.pos++];
        st.pos++;
    }
    /**
     * decodes image data to create the indexed pixel image
     */
    function parseImg() {
        var deinterlace;
        var frame;
        var bitField;
        deinterlace = function( width ) {                   // de interlace pixel data if needed
            var lines;
            var fromLine;
            var pass;
            var toline;
            lines = pixelBufSize / width;
            fromLine = 0;
            if ( interlacedBufSize !== pixelBufSize ) {      // create the buffer if size changed or undefined.
                deinterlaceBuf = new Uint8Array( pixelBufSize );
                interlacedBufSize = pixelBufSize;
            }
            for ( pass = 0; pass < 4; pass++ ) {
                for ( var toLine = interlaceOffsets[pass]; toLine < lines; toLine += interlaceSteps[pass] ) {
                    deinterlaceBuf.set( pixelBuf.subArray( fromLine, fromLine + width ), toLine * width );
                    fromLine += width;
                }
            }
        };
        frame                = {};
        gif.frames.push( frame );
        frame.disposalMethod = gif.disposalMethod;
        frame.time           = gif.length;
        frame.delay          = ( gif.delayTime > 0 ? gif.delayTime : 10 ) * 10;
        gif.length          += frame.delay;
        gif.duration        += frame.delay / 1000;
        if ( gif.transparencyGiven ) {
            frame.transparencyIndex = gif.transparencyIndex;
        } else {
            frame.transparencyIndex = undefined;
        }
        frame.leftPos = st.data[st.pos++] + ( st.data[st.pos++] << 8 );
        frame.topPos  = st.data[st.pos++] + ( st.data[st.pos++] << 8 );
        frame.width   = st.data[st.pos++] + ( st.data[st.pos++] << 8 );
        frame.height  = st.data[st.pos++] + ( st.data[st.pos++] << 8 );
        bitField      = st.data[st.pos++];
        frame.localColourTableFlag = Boolean( bitField & 0b10000000 );
        if ( frame.localColourTableFlag ) { frame.localColourTable = parseColourTable( 1 << ( bitField & 0b111 ) + 1 ); }
        if ( pixelBufSize !== frame.width * frame.height ) { // create a pixel buffer if not yet created or if current frame size is different from previous
            pixelBuf     = new Uint8Array( frame.width * frame.height );
            pixelBufSize = frame.width * frame.height;
        }
        lzwDecode( st.data[st.pos++], st.readSubBlocksB() ); // decode the pixels
        if ( bitField & 0b1000000 ) {                        // de interlace if needed
            frame.interlaced = true;
            deinterlace( frame.width );
        } else { frame.interlaced = false; }
        processFrame( frame );                               // convert to canvas image
    }
    /**
     * creates a RGBA canvas image from the indexed pixel data.
     * @param {Frame} frame - the frame
     */
    function processFrame( frame ) {
        var ct;
        var cData;
        var dat;
        var pixCount;
        var ind;
        var useT;
        var i;
        var pixel;
        var pDat;
        var col;
        var ti;
        frame.image        = document.createElement( 'canvas' );
        frame.image.width  = gif.width;
        frame.image.height = gif.height;
        frame.image.ctx    = frame.image.getContext( '2d' );
        ct = frame.localColourTableFlag ? frame.localColourTable : gif.globalColourTable;
        if ( gif.lastFrame === null ) {
            gif.lastFrame = frame;
        }
        useT = Boolean( gif.lastFrame.disposalMethod === 2 || gif.lastFrame.disposalMethod === 3 );
        if ( !useT ) { frame.image.ctx.drawImage( gif.lastFrame.image, 0, 0, gif.width, gif.height ); }
        cData = frame.image.ctx.getImageData( frame.leftPos, frame.topPos, frame.width, frame.height );
        ti  = frame.transparencyIndex;
        dat = cData.data;
        if ( frame.interlaced ) {
            pDat = deinterlaceBuf;
        } else {
            pDat = pixelBuf;
        }
        pixCount = pDat.length;
        ind = 0;
        for ( i = 0; i < pixCount; i++ ) {
            pixel = pDat[i];
            col   = ct[pixel];
            if ( ti !== pixel ) {
                dat[ind++] = col[0];
                dat[ind++] = col[1];
                dat[ind++] = col[2];
                dat[ind++] = 255;      // Opaque.
            } else
            if ( useT ) {
                dat[ind + 3] = 0; // Transparent.
                ind += 4;
            } else { ind += 4; }
        }
        frame.image.ctx.putImageData( cData, frame.leftPos, frame.topPos );
        gif.lastFrame = frame;
        if ( !gif.waitTillDone && typeof gif.onload === 'function' ) { doOnloadEvent(); }// if !waitTillDone the call onload now after first frame is loaded
    }
    /**
     * called when the load has completed
     */
    function finnished() {
        gif.loading           = false;
        gif.frameCount        = gif.frames.length;
        gif.lastFrame         = null;
        st                    = undefined;
        gif.complete          = true;
        gif.disposalMethod    = undefined;
        gif.transparencyGiven = undefined;
        gif.delayTime         = undefined;
        gif.transparencyIndex = undefined;
        gif.waitTillDone      = undefined;
        pixelBuf              = undefined; // dereference pixel buffer
        deinterlaceBuf        = undefined; // dereference interlace buff (may or may not be used);
        pixelBufSize          = undefined;
        deinterlaceBuf        = undefined;
        gif.currentFrame      = 0;
        gif.currentTime       = 0;
        if ( gif.frames.length > 0 ) { gif.image = gif.frames[0].image; }
        doOnloadEvent();
        if ( typeof gif.onloadall === 'function' ) {
            gif.onloadall.bind( gif )( {   type : 'loadall', path : [ gif ] } );
        }
        if ( gif.playOnLoad ) { gif.play(); }
    }
    /**
     * called if the load has been cancelled
     */
    function canceled() {
        finnished();
        if ( typeof gif.cancelCallback === 'function' ) {
            gif.cancelCallback.bind( gif )( { type : 'canceled', path : [ gif ] } );
        }
    }
    /**
     * parse extended blocks
     */
    function parseExt() {
        const blockID = st.data[st.pos++];
        if( blockID === GIF_FILE.GCExt ) {
            parseGCExt();
        } else if( blockID === GIF_FILE.COMMENT ) {
            gif.comment += st.readSubBlocks();
        } else if( blockID === GIF_FILE.APPExt ) {
            parseAppExt();
        } else {
            if( blockID === GIF_FILE.UNKNOWN ) {
                st.pos += 13; // skip unknown block
            }
            st.readSubBlocks();
        }
    }
    /**
     * parsing the blocks
     */
    function parseBlock() {
        if ( gif.cancel !== undefined && gif.cancel === true ) {
            canceled();
            return;
        }
        const blockId = st.data[st.pos++];
        if( blockId === GIF_FILE.IMAGE ) { // image block
            parseImg();
            if ( gif.firstFrameOnly ) {
                finnished();
                return;
            }
        }else if( blockId === GIF_FILE.EOF ) {
            finnished();
            return;
        } else { parseExt(); }
        if ( typeof gif.onprogress === 'function' ) {
            gif.onprogress( { bytesRead  : st.pos, totalBytes : st.data.length, frame : gif.frames.length } );
        }
        setTimeout( parseBlock, 0 ); // parsing frame async so processes can get some time in.
    }
    /**
     * cancels the loading. This will cancel the load before the next frame is decoded
     * @param {Function} callback - the callback
     * @returns {Boolean} true if canceled
     */
    function cancelLoad( callback ) {
        if ( gif.complete ) { return false; }
        gif.cancelCallback = callback;
        gif.cancel         = true;
        return true;
    }
    /**
     * report error
     * @param {String} type - the error type
     */
    function error( type ) {
        if ( typeof gif.onerror === 'function' ) {
            gif.onerror.bind( this )( { type : type, path : [ this ] } );
        }
        gif.onload  = gif.onerror = undefined;
        gif.loading = false;
    }
    /**
     * fire onload event if set
     */
    function doOnloadEvent() {
        gif.currentFrame = 0;
        gif.currentTime = 0;
        gif.lastFrameAt  = new Date().valueOf(); // just sets the time now
        gif.nextFrameAt  = gif.lastFrameAt;
        if ( typeof gif.onload === 'function' ) {
            gif.onload.bind( gif )( { type : 'load', path : [ gif ] } );
        }
        gif.onload  = undefined;
        gif.onerror = undefined;
    }
    /**
     * Data loaded create stream and parse
     * @param {Object} data - the data
     */
    function dataLoaded( data ) {
        st = new Stream( data );
        parse();
    }
    /**
     * Load GIF file
     * @param {String} filename - the file name
     */
    function loadGif( filename ) { // starts the load
        var ajax = new XMLHttpRequest();
        ajax.responseType = 'arraybuffer';
        ajax.onload = function( e ) {
            if ( e.target.status === 404 ) {
                error( 'File not found' );
            } else if( e.target.status >= 200 && e.target.status < 300 ) {
                dataLoaded( ajax.response );
            } else {
                error( 'Loading error : ' + e.target.status );
            }
        };
        ajax.open( 'GET', filename, true );
        ajax.send();
        ajax.onerror = function( e ) { error( 'File error' ); };
        this.src = filename;
        this.loading = true;
    }
    /**
     * starts play if paused
     */
    function play() {
        if ( !gif.playing ) {
            gif.paused  = false;
            gif.playing = true;
            playing();
        }
    }
    /**
     * stops play
     */
    function pause() {
        gif.paused  = true;
        gif.playing = false;
        clearTimeout( timerID );
    }
    /**
     * toggle the play
     */
    function togglePlay() {
        if( gif.paused || !gif.playing ) {
            gif.play();
        } else {
            gif.pause();
        }
    }
    /**
     * seeks to frame number.
     * @param {Frame} frame - the frame
     */
    function seekFrame( frame ) {
        clearTimeout( timerID );
        gif.currentFrame = frame % gif.frames.length;
        gif.currentTime = gif.frames[gif.currentFrame].time / 1000;
        if ( gif.playing ) {
            playing();
        } else {
            gif.image = gif.frames[gif.currentFrame].image;
        }
    }
    /**
     * seek to frame that would be displayed at time
     * @param {Number} time - time in Seconds
     */
    function seek( time ) {
        clearTimeout( timerID );
        if ( time < 0 ) { time = 0; }
        time *= 1000; // in ms
        time %= gif.length;
        var frame = 0;
        while ( time > gif.frames[frame].time + gif.frames[frame].delay && frame < gif.frames.length ) {
            frame += 1;
        }
        gif.currentFrame = frame;
        gif.currentTime = gif.frames[gif.currentFrame].time / 1000;
        if ( gif.playing ) {
            playing();
        } else {
            gif.image = gif.frames[gif.currentFrame].image;
        }
    }
    /**
     * Playing the gif
     */
    function playing() {
        var delay;
        var frame;
        if ( gif.playSpeed === 0 || !gif.frames || gif.frames.length === 0 ) {
            gif.pause();
            return;
        }
        if ( gif.playSpeed < 0 ) {
            gif.currentFrame -= 1;
            if ( gif.currentFrame < 0 ) { gif.currentFrame = gif.frames.length - 1; }
            frame = gif.currentFrame;
            frame -= 1;
            if ( frame < 0 ) {  frame = gif.frames.length - 1; }
            delay = Number( -gif.frames[frame].delay ) / gif.playSpeed;
        } else {
            gif.currentFrame += 1;
            gif.currentFrame %= gif.frames.length;
            delay = Number( gif.frames[gif.currentFrame].delay ) / gif.playSpeed;
        }
        gif.image = gif.frames[gif.currentFrame].image;
        gif.currentTime = gif.frames[gif.currentFrame].time / 1000;
        timerID = setTimeout( playing, delay );
    }
    /**
     * set on load
     * @param {Function} callback - the callback
     */
    function setOnLoad( callback ) {
        gif.onload = function() {
            gif.image = gif.frames[0].image;
            callback( gif );
        };
        gif.onloadall = function() {
            callback( gif );
        };
    }
    var gif = {                      // the gif image object
        onload         : null,       // fire on load. Use waitTillDone = true to have load fire at end or false to fire on first frame
        onerror        : null,       // fires on error
        onprogress     : null,       // fires a load progress event
        onloadall      : null,       // event fires when all frames have loaded and gif is ready
        paused         : false,      // true if paused
        playing        : false,      // true if playing
        waitTillDone   : false,       // If true onload will fire when all frames loaded, if false, onload will fire when first frame has loaded
        loading        : false,      // true if still loading
        firstFrameOnly : false,      // if true only load the first frame
        width          : null,       // width in pixels
        height         : null,       // height in pixels
        frames         : [],         // array of frames
        comment        : '',         // comments if found in file. Note I remember that some gifs have comments per frame if so this will be all comment concatenated
        length         : 0,          // gif length in ms (1/1000 second)
        duration       : 0,          // duration in second
        currentFrame   : 0,          // current frame.
        currentTime    : 0,          // current time in second
        frameCount     : 0,          // number of frames
        playSpeed      : 1,          // play speed 1 normal, 2 twice 0.5 half, -1 reverse etc...
        lastFrame      : null,       // temp hold last frame loaded so you can display the gif as it loads
        image          : null,       // the current image at the currentFrame
        playOnLoad     : true,       // if true starts playback when loaded
        // functions
        load           : loadGif,    // call this to load a file
        cancel         : cancelLoad, // call to stop loading
        play           : play,       // call to start play
        pause          : pause,      // call to pause
        seek           : seek,       // call to seek to time
        seekFrame      : seekFrame,  // call to seek to frame
        togglePlay     : togglePlay, // call to toggle play and pause state
        setOnLoad      : setOnLoad,  // call when onload
        setOnProgress  : ( callback ) => { gif.onprogress = callback; }
    };
    return gif;
}

let exports;
export default exports = {
    newInstance
};
