// Copyright (c) 2022 Siemens

/**
 * This module defines the 'soa_clipboardService' which manages a collection of IModelObjects that have been placed in
 * the browser's 'local storage'.
 * <P>
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/tcClipboardService
 */
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import sessionSvc from 'js/sessionManager.service';
import appCtxSvc from 'js/appCtxService';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import localStrg from 'js/localStorage';
import navigationUtils from 'js/navigationUtils';
import browserUtils from 'js/browserUtils';
import hostSvc from 'js/hosting/hostConfigService';

/** Clipboard event topic */
var CLIPBOARD_EVENT_TOPIC = 'awClipboard';

/**
 * @private
 *
 * @property {Array} Current clipboard contents.
 */
var _contents = [];

/**
 * Parse the given string from localStorage and return.
 *
 * @private
 *
 * @function
 *
 * @param {String} valueFromLS - Value from local storage
 *
 * @return {String[]} array of UIDs from local storage
 */
function _parseFromLS( valueFromLS ) {
    try {
        return JSON.parse( valueFromLS );
    } catch ( e ) {
        return [];
    }
}

/**
 * Ensure the uids on the local storage clipboard are loaded.
 *
 * @param {String} valuesFromLS - value from local storage
 */
function _loadObjectsForUidsOnClipboard( valuesFromLS ) {
    if( valuesFromLS && valuesFromLS.length > 0 ) {
        var fromLS = _parseFromLS( valuesFromLS );
        var uidsToLoad = [];

        _.forEach( fromLS, function( content ) {
            if( _.isString( content ) ) {
                // handle basic UID string
                uidsToLoad.push( content );
            } else if( content && content.hasOwnProperty( 'uids' ) ) {
                // handle clipboard objects
                _.forEach( content.uids, function( uid ) {
                    uidsToLoad.push( uid );
                } );
            }
        } );

        dmSvc.loadObjects( uidsToLoad );
    }
}

var exports = {};

/**
 * Return an array of IModelObjects currently on the clipboard.
 *
 * @return {Array} Current contents of the clipboard.
 */
export let getContents = function() {
    return _contents;
};

/**
 * Sets the current contents of the clipboard.
 *
 * @param {Object[]} contentsToSet - Array of UID Strings (or IModelObjects) to set as the current clipboard
 *            contents.
 */
export let setContents = function( contentsToSet ) {
    copyToAwClipboard( contentsToSet );
};

/**
 * selected objects copied to AW clipboard.
 *
 * @param {StringArray} contentsToSet - Collection of UIDs to place on the clipboard.
 */
function copyToAwClipboard( contentsToSet ) {
    var oldContents = _contents;

    _contents = [];

    var valueForLS = [];

    _.forEach( contentsToSet, function( content ) {
        var resolvedContent = _.isString( content ) && cdm.containsObject( content ) ? cdm.getObject( content ) :
            content;

        if( content && content.hasOwnProperty( 'uids' ) ) {
            resolvedContent = content;
            _.forEach( content.uids, function( uid ) {
                if( !cdm.containsObject( uid ) ) {
                    // Missing model object in CDM, so don't set any clipboard object into _contents
                    resolvedContent = null;
                    return false; // break
                }
            } );
        }

        if( resolvedContent ) {
            _contents.push( resolvedContent );
        }

        if( resolvedContent ) {
            if( resolvedContent.hasOwnProperty( 'uid' ) ) {
                valueForLS.push( resolvedContent.uid );
            } else if( resolvedContent.hasOwnProperty( 'uids' ) ) {
                valueForLS.push( resolvedContent );
            }
        }
    } );

    if( !_.isEqual( oldContents, _contents ) && valueForLS && valueForLS.length > 0 ) {
        oldContents.forEach( function( obj ) {
            if( _.isFunction( obj.removeReference ) ) {
                obj.removeReference();
            }
        } );

        _contents.forEach( function( obj ) {
            if( _.isFunction( obj.addReference ) ) {
                obj.addReference();
            }
        } );

        // fire event
        eventBus.publish( 'clipboard.update', {
            oldValue: oldContents,
            newValue: _contents
        } );

        localStrg.publish( CLIPBOARD_EVENT_TOPIC, JSON.stringify( valueForLS ) );
    }

    appCtxSvc.registerCtx( 'awClipBoardProvider', _contents );

    if( valueForLS.length === 0 && _contents.length === 0 ) {
        localStrg.removeItem( CLIPBOARD_EVENT_TOPIC );
    }
}

/**
 * Return an array of current IModelObjects that should NOT have it's properties removed from the CDM cache
 * during location change.
 *
 * @return {Object[]} Array of current IModelObjects that should NOT have it's properties removed from the CDM
 *         cache.
 */
export let getCachableObjects = function() {
    var modelObjects = [];

    _.forEach( _contents, function( content ) {
        if( _.isString( content ) ) {
            var modelObject = cdm.getObject( content );
            if( modelObject ) {
                modelObjects.push( modelObject );
            }
        } else if( content ) {
            if( content.hasOwnProperty( 'uid' ) && content.hasOwnProperty( 'type' ) ) {
                modelObjects.push( content );
            } else if( content.hasOwnProperty( 'uids' ) ) {
                _.forEach( content.uids, function( uid ) {
                    var modelObject = cdm.getObject( uid );
                    if( modelObject ) {
                        modelObjects.push( modelObject );
                    }
                } );
            }
        }
    } );

    return modelObjects;
};

/**
 * Copies the content to OS clipboard by introducing a dummy textarea on the page
 *
 * @param {Object} selObject - selected object
 * @return {Boolean} verdict whether the content was successfully copied to the clipboard or not
 */
export let copyUrlToClipboard = function( selObject ) {
    var content = navigationUtils.getDisplayURLs( selObject );
    return exports.copyContentToOSClipboard( content );
};

/**
 * Prepare and Copies the download file url to OS clipboard
 *
 * @param {String} fileObjectUid - ImanFile uid
 * @return {Boolean} verdict whether the content was successfully copied to the clipboard or not
 */
export let prepareAndCopyFileDownloadURLToClipboard = function( fileObjectUid ) {
    if( !_.isUndefined( fileObjectUid ) ) {
        var content = [];
        content.push( browserUtils.getBaseURL() + '#/downloadFile?uid=' + fileObjectUid );
        return exports.copyContentToOSClipboard( content );
    }
};

/**
 * Copies the content to OS clipboard by introducing a dummy textarea on the page
 *
 * @param {String} content - content to be copied
 * @return {Boolean} verdict whether the content was successfully copied to the clipboard or not
 */
export let copyContentToOSClipboard = function( content ) {
    var textArea = document.createElement( 'textarea' );
    var textToCopy = '';
    var i;

    // Place in top-left corner of screen regardless of scroll position.
    textArea.style.position = 'fixed';
    textArea.style.top = 0;
    textArea.style.left = 0;

    // Ensure it has a small width and height. Setting to 1px / 1em doesn't work as this gives a negative w/h on
    // some browsers.
    textArea.style.width = '2em';
    textArea.style.height = '2em';

    // We don't need padding, reducing the size if it does flash render.
    textArea.style.padding = 0;

    // Clean up any borders.
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';

    // Avoid flash of white box if rendered for any reason.
    textArea.style.background = 'transparent';

    for( i = 0; i < content.length; i++ ) {
        textToCopy += content[ i ] + '\n';
    }

    textArea.value = textToCopy;

    let refEle = document.activeElement;
    refEle.appendChild( textArea );

    textArea.select();

    var verdict = document.execCommand( 'copy', false, null ); //execute copy command

    refEle.removeChild( textArea );

    return verdict;
};

/**
 * Check to turn off OS copy for hosting mode.
 *
 * @returns {Boolean} TRUE if we are hosted and 'AllowOSCopy' option is set.
 */
function shouldPerformOSCopyInHostingMode() {
    // Turn off OS Copy in hosted mode
    var os_copy = true;
    if( appCtxSvc.getCtx( 'aw_hosting_enabled' ) ) {
        // Undefined and null are true
        os_copy = hostSvc.getOption( 'AllowOSCopy' );
    }

    return os_copy;
}

/**
 * Copies hyperlink to OS clipboard
 *
 * @param {Object[]} content - array of selected object whose hyperlink is created and copied to os clipboard in
 *            non hosted mode
 * @return {Boolean} successful whether the content was successfully copied to the clipboard or not
 */
export let copyHyperlinkToClipboard = function( content ) {
    copyToAwClipboard( content );

    var should = shouldPerformOSCopyInHostingMode();

    var successful = null;

    if( should === undefined || should === true ) {
        var hyperlinkString = navigationUtils.creatingHyperlinkOfSelectedObjects( content );

        var dummyNode = '<div class="copyHyperlinks">' + hyperlinkString + '</div>';

        $( 'body' ).append( dummyNode );

        var selection = window.getSelection();
        var range = document.createRange();
        var link = $( '.copyHyperlinks' )[ 0 ];

        range.selectNode( link );

        selection.removeAllRanges(); // if there is some selection in OS clipboard, remove it
        selection.addRange( range );

        successful = document.execCommand( 'copy' );

        selection.removeAllRanges();

        $( 'div.copyHyperlinks' ).remove();
    }

    return successful;
};

/**
 * Initialize the local storage and start listening if some other browser is firing off clipboard events.
 */
function initClipboard() {
    _loadObjectsForUidsOnClipboard( localStrg.get( CLIPBOARD_EVENT_TOPIC ) );

    // Subscribe for storage events for the clipboard
    localStrg.subscribe( CLIPBOARD_EVENT_TOPIC, function( event ) {
        if( event.newValue ) {
            _loadObjectsForUidsOnClipboard( event.newValue );

            exports.setContents( _parseFromLS( event.newValue ) );
        }
    }, false );
}

let loadConfiguration = function() {
    // If we're authenticated, init the clipboard
    if( sessionSvc.getAuthStatus() ) {
        initClipboard();
    } else {
        // Otherwise wait for the log-in
        eventBus.subscribe( 'session.updated', function() {
            initClipboard();
        }, 'soa_clipboardService' );
    }

    eventBus.subscribe( 'session.signOut', function() {
        // To support Cucumber testing, clearing clipboard upon sign-out
        localStrg.removeItem( CLIPBOARD_EVENT_TOPIC );
        appCtxSvc.unRegisterCtx( 'awClipBoardProvider' );
    }, 'soa_clipboardService' );

    // Listen for when new objects are added to the CDM
    eventBus.subscribe( 'cdm.new', function( data ) {
        var valuesFromLS = localStrg.get( CLIPBOARD_EVENT_TOPIC );
        if( valuesFromLS && data.newObjects && data.newObjects.length > 0 ) {
            var update = false;
            for( var ii = 0; ii < data.newObjects.length; ii++ ) {
                if( valuesFromLS.indexOf( data.newObjects[ ii ].uid ) > -1 ) {
                    update = true;
                    break;
                }
            }

            if( update ) {
                exports.setContents( _parseFromLS( valuesFromLS ) );
            }
        }
    }, 'soa_clipboardService' );

    // Listen for when objects are deleted to the CDM
    eventBus.subscribe( 'cdm.deleted', function( data ) {
        var valuesFromLS = localStrg.get( CLIPBOARD_EVENT_TOPIC );
        if( valuesFromLS && data.deletedObjectUids && data.deletedObjectUids.length > 0 ) {
            var update = false;
            for( var ii = 0; ii < data.deletedObjectUids.length; ii++ ) {
                if( valuesFromLS.indexOf( data.deletedObjectUids[ ii ] ) > -1 ) {
                    update = true;
                    break;
                }
            }

            if( update ) {
                exports.setContents( _parseFromLS( valuesFromLS ) );
            }
        }
    }, 'soa_clipboardService' );
};

export default exports = {
    getContents,
    setContents,
    getCachableObjects,
    copyUrlToClipboard,
    prepareAndCopyFileDownloadURLToClipboard,
    copyHyperlinkToClipboard,
    copyContentToOSClipboard
};

loadConfiguration();
