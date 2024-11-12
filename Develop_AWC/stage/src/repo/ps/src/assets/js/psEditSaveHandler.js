// Copyright (c) 2022 Siemens

/**
 * This is the command handler for save edit in mass update module
 *
 * @module js/psEditSaveHandler
 */
import AwPromiseService from 'js/awPromiseService';
import editHandlerSvc from 'js/editHandlerService';
import soaSvc from 'soa/kernel/soaService';
import messagingSvc from 'js/messagingService';
import appCtxSvc from 'js/appCtxService';
import dms from 'soa/dataManagementService';
import propPolicySvc from 'soa/kernel/propertyPolicyService';
import eventBus from 'js/eventBus';
import cdmSvc from 'soa/kernel/clientDataModel';
import typeDisplayNameService from 'js/typeDisplayName.service';
import cfgSvc from 'js/configurationService';
import adapterParser from 'js/adapterParserService';
import _ from 'lodash';

var exports = {};

var saveHandler = {};

/**
   * Returns the defined save Handler
   * @returns {Object} saveHandler
   */
export let getSaveHandler = function() {
    return saveHandler;
};

let callSaveEditSoa = function( inputs ) {
    return dms.saveViewModelEditAndSubmitWorkflow( inputs );
};

export let callSplitSoa = function( inputs ) {
    let currentContext = appCtxSvc.ctx[appCtxSvc.ctx.aceActiveContext.key];
    let effSplitInputs = [];
    inputs.forEach( input=>{
        effSplitInputs.push( {
            sourceElement: input.obj,
            propertyNames: input.viewModelProperties ? input.viewModelProperties.map( p=>p.propertyName ) : []
        } );
    } );
    let sortCriteria = currentContext.sortCriteria && currentContext.sortCriteria.length > 0 ? {
        propertyName: currentContext.sortCriteria[0].fieldName,
        sortingOrder: currentContext.sortCriteria[0].sortDirection
    } : {};
    let ip = {
        effSplitInputs: effSplitInputs,
        inputCtxt: { productContext: currentContext.productContextInfo },
        sortCriteria: sortCriteria
    };


    var selectedPropertyPolicy = propPolicySvc.getEffectivePolicy( null, true );
    return soaSvc.postUnchecked( 'Internal-ActiveWorkspaceBom-2021-12-OccurrenceManagement', 'splitEffectivities',
        { effectivitySplitData: ip }, selectedPropertyPolicy ).then( response=>{
        let errMsg = returnAndShowPartialError( response );
        return  errMsg ?  AwPromiseService.instance.reject( errMsg )
            : AwPromiseService.instance.resolve( response );
    }, err=>{ AwPromiseService.instance.reject( err ); } );
};

let dateTo_GMTString = function( date ) {
    date = typeof date === 'number' || typeof date === 'string' ? new Date( date ) : date;
    var MM = date.getMonth() + 1;
    MM = MM < 10 ? '0' + MM : MM;
    var dd = date.getDate();
    dd = dd < 10 ? '0' + dd : dd;
    let hh = date.getHours();
    hh = hh < 10 ? '0' + hh : hh;
    var mm = date.getMinutes();
    mm = mm < 10 ? '0' + mm : mm;
    var ss = date.getSeconds();
    ss = ss < 10 ? '0' + ss : ss;
    return date.getFullYear() + '-' + MM + '-' + dd + 'T' + hh + ':' + mm + ':' + ss + date.toString().slice( 28, 33 );
};

let updateEditInputLinesToNewSplitLines = function( response, inputs ) {
    if( response.effSplitOutputs.length > 0 ) {
        response.effSplitOutputs.forEach( ele=>{
            let input = inputs.filter( i=>i.obj.uid === ele.sourceElement.uid )[0];
            if( input ) {
                let splitUid = ele.newSplitElement.uid;
                if( splitUid !== 'AAAAAAAAAAAAAA' ) {
                    input.obj = ele.newSplitElement;
                    input.viewModelProperties.forEach( prop=>{
                        prop.srcObjLsd = dateTo_GMTString( new Date() );
                    } );
                }
            }
        } );
    }
};

let updateDisplayNameOfSplitElements = function( response ) {
    let isSplitDoneAndSplitElementConfigured = response.effSplitOutputs.length > 0 && response.selectedNewElementInfo.length > 0;
    // after edit, split display value is updated
    if( isSplitDoneAndSplitElementConfigured ) {
        let splitElementUidArray = response.effSplitOutputs.map( eso=>eso.newSplitElement.uid );
        let splitElementDisplayValuesArray = response.effSplitOutputs.map( eso=> {
            let updatedSplitObj = cdmSvc.getObject( eso.newSplitElement.uid ) || eso.newSplitElement;
            return typeDisplayNameService.instance.getDisplayName( updatedSplitObj );
        } );

        response.selectedNewElementInfo.forEach( snei=>{
            snei.pagedOccurrencesInfo.childOccurrences.forEach( childOcc=>{
                let index = splitElementUidArray.indexOf( childOcc.occurrenceId );
                if( index > -1 ) {
                    childOcc.displayName = splitElementDisplayValuesArray[index];
                }
            } );
        } );
    }
};

let addSplitElementsToTree = function( response ) {
    response.selectedNewElementInfo.forEach( snei=>{
        let newResp = { ...response };
        newResp.selectedNewElementInfo = snei;
        eventBus.publish( 'addElement.elementsAdded', {
            addElementResponse: newResp,
            updatedParentElement:  snei.pagedOccurrencesInfo.cursor.parentOccurrences[0],
            viewToReact: appCtxSvc.ctx.aceActiveContext.key
        } );
    } );
};

let updateSrcEleWhenSplitEleUnconfigured = function( response ) {
    let isSrcEleUpdatedAndSplitEleUnconfig = response.ServiceData.updated && response.ServiceData.updated.includes( appCtxSvc.ctx.selected.uid ) && response.selectedNewElementInfo.length === 0;
    if( isSrcEleUpdatedAndSplitEleUnconfig ) {
        eventBus.publish( 'ace.replaceRowsInTree', {
            srcUids: response.ServiceData.updated
        } );
    }
};

let deselectUnconfiguredElementsFromTree = function( response ) {
    let isSrcEleUnconfigured = response.ServiceData.deleted && response.ServiceData.deleted.includes( appCtxSvc.ctx.selected.uid ) && response.selectedNewElementInfo.length > 0;
    if( isSrcEleUnconfigured ) {
        eventBus.publish( 'aceElementsDeSelectedEvent', {
            elementsToDeselect: response.ServiceData.deleted,
            viewToReact: appCtxSvc.ctx.aceActiveContext.key
        } );
    }
};

export let afterSplitEleUpdatedProcessSplitResponse = function( response ) {
    if( !response ) {
        return response;
    }
    deselectUnconfiguredElementsFromTree( response );
    updateDisplayNameOfSplitElements( response );
    addSplitElementsToTree( response );
    updateSrcEleWhenSplitEleUnconfigured( response );
};

export let returnAndShowPartialError = function( response ) {
    let error = null;
    if( response && response.partialErrors || response.PartialErrors ) {
        error = soaSvc.createError( response );
    } else if( response && response.ServiceData && response.ServiceData.partialErrors ) {
        error = soaSvc.createError( response.ServiceData );
    }

    if( error ) {
        let errMessage = messagingSvc.getSOAErrorMessage( error );
        messagingSvc.showError( errMessage );
        editHandlerSvc.saveEditsPostActions( false );
    }
    return error;
};

let getNextSavedHandler = async function( sourceObjects ) {
    let adapterConfigObject = await cfgSvc.getCfg( 'saveHandlers' );
    adapterConfigObject = adapterConfigObject.filter( i=>i.target.deps !== 'js/psEditSaveHandler' );
    sourceObjects.push( appCtxSvc.ctx );
    return adapterParser.getAdaptedObjects( sourceObjects, adapterConfigObject ).then( ( adaptedObjects )=>{
        _.forEach( sourceObjects, function( n ) {
            adaptedObjects = _.without( adaptedObjects, n );
        } );
        return adaptedObjects && adaptedObjects[0] && adaptedObjects[0].saveEdits && adaptedObjects[0].isDirty ? adaptedObjects[0] : null;
    } );
};

/**
   * Call the SOA saveImpactedAssemblies for modified Object in data Source
   *
   * @param {datasource} datasource viewModel of view
   * @param {inputs} inputs which nodes to edit
   * @returns {promise} promise when all modified Impacted Assemblies get saved
   */
saveHandler.saveEdits = function( datasource, inputs ) {
    let deferred = AwPromiseService.instance.defer();

    inputs = inputs.filter( input=>
        input.viewModelProperties.some( vmp=>{
            let inputObj = cdmSvc.getObject( input.obj.uid );
            let isPropertyAvailableInCdm  = inputObj.props[vmp.propertyName];
            return !isPropertyAvailableInCdm  || inputObj.props[vmp.propertyName].dbValues[0] !== vmp.dbValues[0];
        } )
    );

    if( inputs.length < 1 ) {
        deferred.resolve();
        return deferred.promise;
    }

    datasource.registerPropPolicy();
    let prom = null;
    let splitSoaResponse;
    if( appCtxSvc.ctx.userSession.props.cm0GlobalChangeContext.dbValue && !appCtxSvc.ctx.aceActiveContext.context.isMarkupEnabled ) {
        prom = callSplitSoa( inputs )
            .then( ( response )=>{
                splitSoaResponse = response;
                getNextSavedHandler( [ datasource.getContextVMO() ] );
            } )
            .then( saveHandler=>{
                updateEditInputLinesToNewSplitLines( splitSoaResponse, inputs );
                if( saveHandler ) {
                    return AwPromiseService.instance.resolve()
                        .then( ()=>saveHandler.isDirty( datasource ) )
                        .then( ( isDirty )=>isDirty ? saveHandler.saveEdits( datasource, inputs ) : AwPromiseService.instance.resolve() );
                }
                return callSaveEditSoa( inputs );
            } );

        prom.then( ()=>afterSplitEleUpdatedProcessSplitResponse( splitSoaResponse ) );
    }else{
        prom = callSaveEditSoa( inputs );
    }


    prom.then( ( editResponse )=>{
        datasource.unregisterPropPolicy();
        let error = returnAndShowPartialError( editResponse );
        error ? deferred.reject() : deferred.resolve();
    }, ()=>{
        datasource.unregisterPropPolicy();
        deferred.reject();
    } );

    return deferred.promise;
};

/**
   * Returns dirty bit.
   * @returns {Boolean} isDirty bit
   */
saveHandler.isDirty = function() {
    return true;
};

/**
   * App Factory for Mass Update SaveHandler
   */

export default exports = {
    getSaveHandler,
    afterSplitEleUpdatedProcessSplitResponse,
    callSplitSoa,
    returnAndShowPartialError
};
