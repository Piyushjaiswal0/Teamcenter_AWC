// Copyright (c) 2022 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awp0SecurityEditableCellService
 */
import uwPropertyService from 'js/uwPropertyService';

var exports = {};

/**
 * Initialize the SecurityEditableCell and adds the click listener to the editable prop.
 */
export let initializeSecurityEditableCellClickListener = function( data, subPanelContext ) {
    uwPropertyService.setAutoFocus( data.authPara, true );
    if( subPanelContext.props.ead_paragraph !== undefined ){
        uwPropertyService.setPropertyDisplayName( data.authPara, subPanelContext.props.ead_paragraph.propertyDisplayName );
    }
};

export let bindProperties = function( data, subPanelContext ) {
    if( subPanelContext.modelType.typeHierarchyArray.indexOf( 'ITAR_License' ) !== -1 ) {
        subPanelContext.props.ead_paragraph = data.authPara;
        uwPropertyService.updateViewModelProperty( subPanelContext.props.ead_paragraph );
    }
};

exports = {
    initializeSecurityEditableCellClickListener,
    bindProperties
};
export default exports;
