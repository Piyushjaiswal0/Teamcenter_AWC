// Copyright (c) 2022 Siemens

/**
 * @module js/alternatesService
 */
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import soaSvc from 'soa/kernel/soaService';
import ClipboardService from 'js/clipboardService';
import appCtxSvc from 'js/appCtxService';
import localeService from 'js/localeService';
import messagingService from 'js/messagingService';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import uwPropertyService from 'js/uwPropertyService';

var exports = {};

/**
 * Creates the ViewModelObject from the input selected object uid
 * @param {DeclViewModel} data - ViewModel data from ps0AddAlternateViewModel
 * @param {string} selectedObjects - uid of the adapted object on which the alternate will be added/removed.
 */
var updatePrimarySelectionFromSelectedObject = function( selectedObjects ) {
    var primarySelection = {};
    var selectedObject = {};
    if( appCtxSvc.ctx.ViewModeContext.ViewModeContext === 'TreeView' ) {
        primarySelection = appCtxSvc.ctx.selected;
    } else {
        var selectedUid = appCtxSvc.ctx.xrtSummaryContextObject.uid;
        var selected = cdm.getObject( selectedUid );
        primarySelection = selected;
    }

    selectedObject = tcViewModelObjectService.createViewModelObjectById( selectedObjects, 'EDIT' );
    return { primarySelection, selectedObject };
};

/**
 * Process the input for SOA addAlternate and publish the "addAlternate" event
 * @param {DeclViewModel} data - ViewModel data from ps0AddAlternateViewModel
 * @param {string} selectedObjects - uid of the adapted object on which the alternate will be added.
 */
export let addSelectionsAsAlternate = function( data, selectedObjects, sourceObjects ) {
    var selectionData = updatePrimarySelectionFromSelectedObject( selectedObjects );

    var alternates = [];
    var alternateObjectsToAdd = [];
    var srcObj = {};
    if( typeof data.createdMainObject === 'undefined' || data.createdMainObject === null ) {
        for( var itr = 0, len = sourceObjects.length; itr < len; ++itr ) {
            srcObj = {};
            srcObj.uid = sourceObjects[ itr ].uid;
            srcObj.type = sourceObjects[ itr ].type;
            alternates.push( srcObj );
            alternateObjectsToAdd.push( sourceObjects[ itr ] );
        }
    } else {
        srcObj = {};
        srcObj.uid = data.createdMainObject.uid;
        srcObj.type = data.createdMainObject.type;
        alternates.push( srcObj );
        alternateObjectsToAdd.push( data.createdMainObject );
    }
    return { alternates, alternateObjectsToAdd, ...selectionData };
};

var getMessageString = function( messages, msgObj ) {
    _.forEach( messages, function( object ) {
        if( msgObj.msg.length > 0 ) {
            msgObj.msg += '<BR/>';
        }
        msgObj.msg += object.message;
        msgObj.level = _.max( [ msgObj.level, object.level ] );
    } );
};

/**
 * it gets the selected object
 * @returns {ModelObject} returns the selected object
 */
export let getSelectedObject = function() {
    let selectedObjectUid = null;
    // If inside the content tab taking the underlying object uid or else in home tab considering selected object uid
    if( appCtxSvc.ctx.selected.props.awb0UnderlyingObject ) {
        selectedObjectUid = appCtxSvc.ctx.selected.props.awb0UnderlyingObject?.dbValues[0];
    }else{
        selectedObjectUid = appCtxSvc.ctx.selected.uid;
    }
    return cdm.getObject( selectedObjectUid );
};

/**
 * Fetch the preferred type of selected object from items_tag property.
 * @param {ModelObject}  selectedObject from which the types need to fetch. if items_tag property is not there calling getProperties SOA.
 * @param {ModelObject} revisionObj the object which have revision type. If Item Object type is opened then we need Item Revision type,so calling getItemCreationRelatedInfo
 * @returns {Object} preferredTpe and filterType of the selected object.
 */
export let getPreferredType = function( selectedObject, revisionObj ) {
    let types = { preferredType:'', filterTypes:'' };
    let items_tag = cdm.getObject( selectedObject.props.items_tag?.dbValues[0] );
    //if we are on Item Revision then items_tag property will come else we are on item then we directly get type of the selected
    if( items_tag ) {
        types.preferredType = items_tag.type;
        types.filterTypes = types.preferredType + ',' + selectedObject.type;
    } else{
        types.preferredType = selectedObject.type;
        types.filterTypes = selectedObject.type + ',' + revisionObj.revTypeName;
    }
    return types;
};

export let processPartialErrors = function( serviceData ) {
    var msgObj = {
        msg: '',
        level: 0
    };
    if( serviceData.partialErrors ) {
        _.forEach( serviceData.partialErrors, function( partialError ) {
            getMessageString( partialError.errorValues, msgObj );
        } );
    }

    return msgObj.msg;
};

/**
 * Process the input and calls removeAlternates SOA
 * @param {ViewModelObject} selectedAlternates - ViewModel data of the Alternate object to be removed.
 * @param {String} selectedObjects - uid of the adapted object from which Alternate object will be removed.
 */
export let removeAlternates = function( selectedAlternates, selectedObjects ) {
    ClipboardService.instance.setContents( selectedAlternates );

    var deferred = AwPromiseService.instance.defer();
    var selectionData = updatePrimarySelectionFromSelectedObject( selectedObjects );

    var alternates = [];
    for( var itr = 0, len = selectedAlternates.length; itr < len; ++itr ) {
        var srcObj = {};
        srcObj.uid = selectedAlternates[ itr ].uid;
        srcObj.type = selectedAlternates[ itr ].type;
        alternates.push( srcObj );
    }

    var soaInput = {};
    soaInput.element = {};
    soaInput.element.uid = selectionData.selectedObject.uid;
    soaInput.element.type = selectionData.selectedObject.type;
    soaInput.alternatesToBeRemoved = alternates;
    soaSvc.postUnchecked( 'Internal-AWS2-2018-05-GlobalAlternate', 'removeAlternates', soaInput ).then(
        function( response ) {
            deferred.resolve();
            if( response.plain ) {
                var eventData = {};
                eventData.relations = '';
                eventData.relatedModified = [];
                eventData.relatedModified[ 0 ] = selectionData.primarySelection;
                eventData.refreshLocationFlag = true;
                eventBus.publish( 'cdm.relatedModified', eventData );
                soaSvc.post( 'Core-2007-01-DataManagement', 'refreshObjects', {
                    objects: [ selectionData.selectedObject, selectionData.primarySelection ]
                } );
            }
            if( response.partialErrors ) {
                var msg = exports.processPartialErrors( response );

                var resource = 'PSMessages';
                var localeTextBundle = localeService.getLoadedText( resource );
                var errorMessage = msg;
                if( selectedAlternates.length !== 1 && response.plain ) {
                    errorMessage = localeTextBundle.removeAlternateMultipleFailureMessage;
                    errorMessage = errorMessage.replace( '{0}', response.plain.length );
                    errorMessage = errorMessage.replace( '{1}', alternates.length );
                    errorMessage = errorMessage.replace( '{2}', msg );
                }
                messagingService.showError( errorMessage );
            }
        } );

    return deferred.promise;
};

export let showListOfGlobalAlternates = function( vmoHovered, data ) {
    if( vmoHovered && vmoHovered.props.awb0HasAlternates ) {
        var alternateData = {
            globalAltObjects : []
        };

        var globalAlternatesList = vmoHovered.props.awb0HasAlternates.displayValues;
        var globalAltArray = [];
        globalAltArray = globalAlternatesList[ 0 ].split( ',#NL#' );
        //Populate tooltip objects
        var objectsToPush = [];
        for( var i = 0; i < ( globalAltArray.length > 4 ? 4 : globalAltArray.length ); i++ ) {
            var alt = uwPropertyService.createViewModelProperty( globalAltArray[i], globalAltArray[i], 'STRING', '', '' );
            alternateData.globalAltObjects.push( alt );
        }

        //  Update tooltip label with number of overridden contexts
        var alternateLabel = data.i18n.globalAlternateLabel;
        alternateLabel = alternateLabel.replace( '{0}', globalAltArray.length );
        alternateData.globalAlternateLabel = {};
        alternateData.globalAlternateLabel = uwPropertyService.createViewModelProperty( alternateLabel, alternateLabel, 'STRING', '', [ '' ] );

        //update tooltip link for more data
        if( globalAltArray.length > 4 ) {
            var tooltipText = data.i18n.tooltipLinkText;
            tooltipText = tooltipText.replace( '{0}', globalAltArray.length - 4 );
            alternateData.moreGlobalAlternates = {};
            alternateData.moreGlobalAlternates = uwPropertyService.createViewModelProperty( tooltipText, tooltipText, 'STRING', tooltipText, [ tooltipText ] );
            alternateData.enableMoreGlobalAlternates = {};
            alternateData.enableMoreGlobalAlternates.dbValue = true;
        }
        return alternateData;
    }
};

export let clearCreatedElementField = function( ) {
    return { createdMainObject: undefined };
};

export let updateDataForAlternatePanel = function( ) {
    return appCtxSvc.ctx.ViewModeContext.ViewModeContext === 'TreeView' ? appCtxSvc.ctx.selected : appCtxSvc.ctx.xrtSummaryContextObject;
};

export default exports = {
    addSelectionsAsAlternate,
    processPartialErrors,
    removeAlternates,
    showListOfGlobalAlternates,
    clearCreatedElementField,
    updateDataForAlternatePanel,
    getPreferredType,
    getSelectedObject
};
