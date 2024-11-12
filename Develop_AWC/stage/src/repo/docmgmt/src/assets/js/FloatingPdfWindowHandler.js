// Copyright (c) 2022 Siemens

/**
 * @module js/FloatingPdfWindowHandler
 */
import { getBaseUrlPath } from 'app';
import pdfViewerUtils from 'js/pdfViewerUtils';
import soaService from 'soa/kernel/soaService';
import messageService from 'js/messagingService';
import dmSvc from 'soa/dataManagementService';
import popupSvc from 'js/popupService';
import localeSvc from 'js/localeService';
import eventBus from 'js/eventBus';

var exports = {};

var _relString = '';
var _dataset = null;
var _sourceDataset = null;
var _itemRev = null;

export let openPopup = function( targetObject, sourceDataset, dataset, relString ) {
    // Save the dataset and relationship string for later
    _relString = relString;
    _dataset = dataset;
    _itemRev = targetObject;
    _sourceDataset = sourceDataset;

    const subPanelContext = {
        obj: dataset,
        dataset: dataset,
        datasetName: dataset.props.object_name.uiValues[0],
        targetName: targetObject.props.object_name.uiValues[0]
    };
    const options = {
        view: 'FloatingPdfWindowPopup',
        draggable: true,
        enableResize: true,
        preventExceedBoundary: true,
        handle: '.drag-me',
        height: '500',
        width: '800',
        subPanelContext: subPanelContext,
        clickOutsideToClose: false
    };
    popupSvc.show( options );
};

export let addDataset = function( i18n ) {
    // Parse _relString into relation name and optional property
    var relName = 'TC_Attaches';
    var optVal = '';

    var titleSplit = _relString.split( ':' );
    if( titleSplit.length === 2 ) {
        var relNameAndOptValue = titleSplit[ 1 ].split( ';' );
        if( relNameAndOptValue.length > 0 ) {
            relName = relNameAndOptValue[ 0 ].trim(); // Trim trailing white space for Relation name
        }
        if( relNameAndOptValue.length > 1 ) {
            optVal = relNameAndOptValue[ 1 ].trim(); // Trim trailing white space for Optional fnd0PageType property
        }
    }

    // Create relationship between ItemRev and new dataset
    var inputData = {
        input: [ {
            primaryObject: _itemRev,
            secondaryObject: _dataset,
            relationType: relName
        } ]
    };

    soaService.post( 'Core-2006-03-DataManagement', 'createRelations', inputData )
        .then( function( response ) {
            if( !showPartialError( response, i18n.addPdfError ) ) {
                if( relName === 'Fnd0DocPageTypeRel' && optVal !== '' &&
                    response && response.output && response.output.length === 1 &&
                    response.output[ 0 ].relation ) {
                    // Add property
                    var input = {
                        object: response.output[ 0 ].relation,
                        vecNameVal: [ {
                            name: 'fnd0PageType',
                            values: [ optVal ]
                        } ]
                    };
                    dmSvc.setProperties( [ input ] ); // Set property fnd0PageType = < optVal >
                }

                if( response && response.ServiceData && response.ServiceData.updated &&
                    response.ServiceData.updated.length && response.ServiceData.updated[0] === _itemRev.uid ) {
                    eventBus.publish( 'cdm.relatedModified', {
                        relatedModified: [ _itemRev ]
                    } );
                }
            }
            hidePopup();
        } ).catch( function( err ) {
            showServerError( err, i18n.addPdfError );
        } );
};

export let deleteDataset = function( i18n ) {
    if( _dataset && _sourceDataset ) {
        const delRelInput = {
            input: [ {
                relationType: 'TC_Derived',
                primaryObject: _sourceDataset,
                secondaryObject: _dataset
            } ]
        };

        soaService.post( 'Core-2006-03-DataManagement', 'deleteRelations', delRelInput )
            .then( function( result ) {
                if( showPartialError( result, i18n.deletePdfError ) ) {
                    hidePopup();
                } else {
                    soaService.post( 'Core-2006-03-DataManagement', 'deleteObjects', { objects: [ _dataset ] } )
                        .then( function( response ) {
                            showPartialError( response, i18n.deletePdfError );
                            hidePopup();
                        } ).catch( function( err ) {
                            showServerError( err, i18n.deletePdfError );
                        } );
                }
            } ).catch( function( err ) {
                showServerError( err, i18n.deletePdfError );
            } );
    }
};

let showPartialError = function( resp, msg ) {
    if( resp.ServiceData && resp.ServiceData.partialErrors && resp.ServiceData.partialErrors.length ) {
        const errValue = resp.ServiceData.partialErrors[ 0 ].errorValues[ 0 ];
        const message = msg.replace( '{0}', _dataset.props.object_name.uiValues[0] );
        messageService.showWarning( message + '\n' + errValue.message );
        return true;
    }

    return false;
};

let showServerError = function( err, msg ) {
    const message = msg.replace( '{0}', _dataset.props.object_name.uiValues[0] );
    messageService.showError( message + '\n' + err );
    hidePopup();
};

let hidePopup = function() {
    _relString = null;
    _dataset = null;
    _itemRev = null;
    _sourceDataset = null;
    popupSvc.hide( 'FloatingPdfWindowPopup' );
};

export let processViewerData = function( response ) {
    const fmsTicket = response.output.views[0].fmsTicket;
    const fileUrl = window.location.origin + window.location.pathname + 'fms/fmsdownload/?ticket=' + fmsTicket;
    const frame = document.querySelector( 'iframe.aw-pdfjs-pdfViewerIFrame' );

    if( frame ) {
        frame.onload = function() {
            const frameContentWindow = frame.contentWindow;
            const frameContentDoc = frame.contentDocument;

            if( frameContentWindow && frameContentWindow.pdfjsLib && frameContentDoc ) {
                pdfViewerUtils.initFrame( frameContentWindow, frameContentDoc, localeSvc.getLocale() );
                pdfViewerUtils.hookOutline( frameContentWindow, frameContentDoc );
                pdfViewerUtils.loadContent( frameContentWindow, fileUrl );
            }
        };
        frame.src = getBaseUrlPath() + '/pdfjs/viewer.html';
    }
};

export default exports = {
    openPopup,
    addDataset,
    deleteDataset,
    processViewerData
};
