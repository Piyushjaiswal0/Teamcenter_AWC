// Copyright (c) 2022 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Dma1NotificationService
 */
import AwStateService from 'js/awStateService';
import cdm from 'soa/kernel/clientDataModel';
import soaService from 'soa/kernel/soaService';
import floatingPdfWindowHandler from 'js/FloatingPdfWindowHandler';
import dmSvc from 'soa/dataManagementService';
import _ from 'lodash';

var exports = {};

/**
 * event constants
 */
var FND0_DOCMGT_RENDER_COMPLETE = 'Fnd0DocMgt_Render_Complete'; //$NON-NLS-1$

var FND0_DOCMGT_PDF_SIGN_FAILURE = 'Fnd0DocMgt_PDFSignFailure'; //$NON-NLS-1$

var FND0_DOCMGT_PDF_SIGN_SUCCESS = 'Fnd0DocMgt_PDFSignSuccess'; //$NON-NLS-1$

export let openPdfFloatWindow = function( data ) {
    var message = data.object;

    if( message !== null && message.props !== null && message.props.fnd0RelatedObjects !== null &&
        message.props.fnd0RelatedObjects.dbValues !== null && message.props.fnd0RelatedObjects.dbValues.length > 0 ) {
        dmSvc.getProperties( [ message.uid ], [ 'fnd0MessageBody' ] ).then( function( response ) {
            message = cdm.getObject( message.uid );
            if( message.props.fnd0MessageBody !== null && message.props.fnd0MessageBody.dbValues !== null &&
                message.props.fnd0MessageBody.dbValues.length > 0 ) {
                var messageBody = message.props.fnd0MessageBody.dbValues[ 0 ];
                if( messageBody.startsWith( 'ItemRevDerDsRelName:' ) ) {
                    var pdfDataset = cdm.getObject( message.props.fnd0RelatedObjects.dbValues[ 0 ] );
                    var targetObject = cdm.getObject( message.props.fnd0TargetObject.dbValues[ 0 ] );

                    // Get source dataset
                    var infos = [];
                    var relInfo = {
                        relationTypeName: 'TC_Derived'
                    };

                    infos.push( relInfo );

                    var secondaryObjs = [];
                    secondaryObjs.push( pdfDataset );

                    var preferenceInfo = {
                        expItemRev: false,
                        returnRelations: true,
                        info: infos
                    };

                    var inputData = {
                        secondaryObjects: secondaryObjs,
                        pref: preferenceInfo
                    };

                    soaService.post( 'Core-2007-09-DataManagement', 'expandGRMRelationsForSecondary', inputData ).then( function( response ) {
                        if( response !== null && response.output !== null && response.output.length > 0 &&
                            response.output[ 0 ].relationshipData !== null && response.output[ 0 ].relationshipData.length > 0 &&
                            response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ 0 ].otherSideObject !== null ) {
                            var sourceDataset = response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ 0 ].otherSideObject;

                            // Open the floating popup
                            floatingPdfWindowHandler.openPopup( targetObject, sourceDataset, pdfDataset, messageBody );
                        }
                    } );
                } else {
                    exports.openLineItem2( data );
                }
            }
        } );
    }
};

/**
 * Open notification message based on different event types
 * @param { data } data - contains event object
 */
export let openLineItem = function( data ) {
    if( data.eventObj.props.eventtype_id && data.object && data.object.uid ) {
        exports.openPdfFloatWindow( data );
    }
};

export let openLineItem2 = function( data ) {
    var eventTypeId = data.eventObj.props.eventtype_id.dbValues[ 0 ];
    if( eventTypeId === FND0_DOCMGT_RENDER_COMPLETE ||
        eventTypeId === FND0_DOCMGT_PDF_SIGN_SUCCESS ||
        eventTypeId === FND0_DOCMGT_PDF_SIGN_FAILURE ) {
        exports.openRelatedObjects( data.object );
    } else {
        var toParams = {};
        toParams.uid = data.object.uid;
        exports.redirectToShowObject( toParams );
    }
};

/**
 * Opens the relatedObject associated with notification object directly
 */
export let openRelatedObjects = function( notificationObj ) {
    var isError = false;
    if( notificationObj.props.fnd0Subject && notificationObj.props.fnd0Subject.dbValues.length > 0 ) {
        var subject = notificationObj.props.fnd0Subject.dbValues[ 0 ];
        isError =  _.startsWith( subject, 'Baseline creation failed' ) || _.startsWith( subject,
            'Import specification failed' );
    }

    var objectUid = notificationObj.uid;
    if( !isError ) {
        if( notificationObj.props.fnd0RelatedObjects &&
            notificationObj.props.fnd0RelatedObjects.dbValues.length > 0 ) {
            objectUid = notificationObj.props.fnd0RelatedObjects.dbValues[ 0 ];
        }
    }
    exports.redirectToShowObject( objectUid );
};

/**
 * Opens the notification object on notification message click in xrt show object sublocation
 */
export let redirectToShowObject = function( uid, params ) {
    if( uid ) {
        var showObject = 'com_siemens_splm_clientfx_tcui_xrt_showObject';
        var options = {};

        var toParams = {};
        if( params ) {
            toParams = params;
        } else {
            toParams.uid = uid;
            toParams.page = 'Overview';
        }
        options.inherit = false;

        AwStateService.instance.go( showObject, toParams, options );
    }
};
/**
 * Service to define actions on alert notification click for document management application
 *
 * @member Dma1NotificationService
 */

export default exports = {
    openPdfFloatWindow,
    openLineItem,
    openLineItem2,
    openRelatedObjects,
    redirectToShowObject
};
