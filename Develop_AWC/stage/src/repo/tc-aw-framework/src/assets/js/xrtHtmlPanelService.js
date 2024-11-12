// Copyright (c) 2022 Siemens

/**
 * XRT HtmlPanel service
 *
 * @module js/xrtHtmlPanelService
 */
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';

/**
 * ---------------------------------------------------------------------------<BR>
 * Define the public API for the 'xrtHtmlPanelService' Service<BR>
 * ---------------------------------------------------------------------------<BR>
 */

let exports = {};

/**
 * Populate thumbnail html by creating an img HTML element with thumbnailURL as src and imageAltText as alternate text
 * @param {String} thumbnailURL - view model object
 * @param {String} imageAltText - view model object
 * @return {String} outer HTML of img element if thumbnailURL is defined otherwise null
 */
var _populateThumbnailHTML = function( thumbnailURL, imageAltText ) {
    if( thumbnailURL ) {
        var imgElement = document.createElement( 'img' );
        imgElement.src = thumbnailURL;
        imgElement.setAttribute( 'class', 'aw-base-icon' );
        imgElement.alt = imageAltText;
        return imgElement.outerHTML;
    }

    return null;
};

/**
 * Create Htmlpanel model object overlay based off input viewModelObject
 *
 * @param {Object} viewModelObject - view model object
 *
 * @return {Object} HTMLPanel modelObject which contains information for uid, thumbnailHtml, thumbnailUrl and
 *         properties
 */
export let createHtmlPanelModelObjectOverlay = function( viewModelObject ) {
    if( !viewModelObject ) {
        return null;
    }

    var thumbnailURL = viewModelObject.thumbnailURL;
    if( !thumbnailURL ) {
        thumbnailURL = viewModelObject.typeIconURL;
    }

    var imageAltText = '';
    if( viewModelObject.hasThumbnail ) {
        imageAltText = viewModelObject.cellHeader1;
    } else if( viewModelObject.props && viewModelObject.props.object_type && viewModelObject.props.object_type.uiValue ) {
        imageAltText = viewModelObject.props.object_type.uiValue;
    } else {
        imageAltText = viewModelObject.modelType && viewModelObject.modelType.displayName ? viewModelObject.modelType.displayName : '';
    }

    var thumbnailHtml = _populateThumbnailHTML( thumbnailURL, imageAltText );
    var hpModelObject = null;

    if( !thumbnailURL ) {
        hpModelObject = {
            uid: viewModelObject.uid,
            thumbnailHtml: '',
            thumbnailUrl: '',
            properties: {}
        };
    } else {
        hpModelObject = {
            uid: viewModelObject.uid,
            thumbnailHtml: thumbnailHtml,
            thumbnailUrl: thumbnailURL,
            properties: {}
        };
    }

    var modelObject = cdm.getObject( viewModelObject.uid );
    if( modelObject && modelObject.props ) {
        _.forEach( modelObject.props, function( propObj, propName ) {
            if( propName && viewModelObject.props && viewModelObject.props[ propName ] ) {
                hpModelObject.properties[ propName ] = viewModelObject.props[ propName ];
            }
        } );
    }

    return hpModelObject;
};

export default exports = {
    createHtmlPanelModelObjectOverlay
};
