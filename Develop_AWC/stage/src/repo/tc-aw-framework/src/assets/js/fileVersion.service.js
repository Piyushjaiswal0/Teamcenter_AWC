// Copyright (c) 2020 Siemens

/**
 * @module js/fileVersion.service
 */

import AwPromiseService from 'js/awPromiseService';
import NotyModule from 'js/NotyModule';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import editHandlerService from 'js/editHandlerService';
import localeService from 'js/localeService';
import soa from 'soa/kernel/soaService';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import { orderBy } from 'lodash';
import _ from 'lodash';


/**
 * Table in panel does not support column config, so columns are hardcoded
 */
const defaultColumnsToShow = [ 'revision_number', 'last_mod_user', 'last_mod_date' ];

/**
 * Get the columns to show in the file versions panel
 *
 * @param {Object} dataProvider File versions dataprovider
 * @returns {Object} Columns to show
 */
export const getColumns = function( {
    dataProvider,
    columnsToShow = defaultColumnsToShow
} ) {
    const datasetTypeDef = cmm.getType( 'Dataset' );
    const columns = columnsToShow.map( propName => {
        return {
            name: propName,
            typeName: 'UGMASTER',
            displayName: datasetTypeDef.propertyDescriptorsMap[ propName ].displayName,
            maxWidth: 400,
            minWidth: 40,
            width: 120,
            enableColumnMenu: true,
            enableColumnMoving: false,
            enableColumnResizing: true,
            enableColumnHiding: false,
            enableFiltering: false,
            enablePinning: false,
            enableSorting: true,
            headerTooltip: true
        };
    } );

    dataProvider.columnConfig = {
        columns
    };

    return AwPromiseService.instance.resolve( {
        columnInfos: columns
    } );
};

/**
 * Get the file versions for the given Dataset
 *
 * @param {Object} param0 input
 * @returns {Object} Dataprovider output
 */
export const getFileVersions = function( {
    vmo,
    sortCriteria = [],
    columnsToShow = defaultColumnsToShow
} ) {
    return soa.postUnchecked( 'Core-2006-03-DataManagement', 'getProperties', {
        objects: [ vmo ],
        attributes: [
            'revisions_prop'
        ]
    }, {
        types: [ {
            name: 'Dataset',
            properties: [ {
                name: 'revisions_prop',
                modifiers: [ {
                    name: 'withProperties',
                    Value: 'true'
                } ]
            }, ...columnsToShow.map( name => {
                return {
                    name
                };
            } ) ]
        } ]
    } ).then( () => {
        //sort newest revision to top by default
        if( sortCriteria.length === 0 ) {
            sortCriteria.push( {
                fieldName: 'revision_number',
                sortDirection: 'DESC'
            } );
        }
        var updatedVmo = cdm.getObject( vmo.uid );
        const searchResults = orderBy( updatedVmo.props.revisions_prop.dbValues.map( uid => tcViewModelObjectService.createViewModelObjectById( uid ) ),
            sortCriteria.map( x => `props.${x.fieldName}.dbValue` ),
            sortCriteria.map( x => x.sortDirection.toLowerCase() ) );
        return {
            searchResults,
            totalFound: searchResults.length
        };
    } );
};

/**
 * Give user a choice to cancel edits or cancel restore version
 *
 * @param {Object} target The object that is being restored
 * @returns {Promise} A promise resolved on confirm and rejected on restore
 */
const handleActiveEdits = ( target ) => {
    return AwPromiseService.instance.all( [ 'UnsavedEditWarning', 'ConfirmButtonLabel', 'CancelButtonLabel' ].map( k => localeService.getLocalizedText( 'FileVersionsMessages', k ) ) )
        .then( ( [ UnsavedEditWarning, ConfirmButtonLabel, CancelButtonLabel ] ) => {
            const { editInProgress } = editHandlerService.editInProgress();
            return editInProgress ? AwPromiseService.instance( function( resolve, reject ) {
                NotyModule.showWarning( UnsavedEditWarning.format( target.props.object_name.uiValue ), [ {
                    addClass: 'btn btn-notify',
                    text: CancelButtonLabel,
                    onClick: ( $noty ) => {
                        $noty.close();
                        reject();
                    }
                }, {
                    addClass: 'btn btn-notify',
                    text: ConfirmButtonLabel,
                    onClick: ( $noty ) => {
                        $noty.close();
                        editHandlerService.cancelEdits();
                        resolve();
                    }
                } ] );
            } ) : AwPromiseService.instance.resolve();
        } );
};

/**
 * Get the file versions for the given Dataset
 *
 * @param {Object} param0 input
 * @returns {Void} Promise resolved when restore is complete
 */
export const restoreFileVersion = function( {
    target,
    parent,
    version
} ) {
    return handleActiveEdits( target )
        .then( () => {
            return soa.post( 'Internal-AWS2-2017-12-DataManagement', 'loadViewModelForEditing2', {
                inputs: [ {
                    objs: [ version ],
                    propertyNames: [ 'object_name' ]
                } ]
            } ).then( response => {
                const viewModelObjects = JSON.parse( response.viewModelObjectsJsonStrings[0] ).objects;
                const versionServerVMO = viewModelObjects[0];
                const versionVMO = cdm.getObject( version.uid );
                //Saving the previous version automatically creates a new Dataset with same properties
                return soa.post( 'Internal-AWS2-2018-05-DataManagement', 'saveViewModelEditAndSubmitWorkflow2', {
                    inputs: [ {
                        obj: versionServerVMO,
                        viewModelProperties: [ {
                            propertyName: versionServerVMO.props.object_name.propertyName,
                            dbValues: versionVMO.props.object_name.dbValues,
                            uiValues: versionVMO.props.object_name.uiValues,
                            intermediateObjectUids: [],
                            srcObjLsd: versionServerVMO.props.object_name.srcObjLsd,
                            isModifiable: versionServerVMO.props.object_name.isModifiable
                        } ],
                        isPessimisticLock: false,
                        workflowData: {}
                    } ]
                } ).then( () => {
                    //Only the previous object comes back from save, so the primary object needs to be explicitly reloaded
                    return soa.postUnchecked( 'Core-2006-03-DataManagement', 'getProperties', {
                        objects: [ target, ... parent ? [ parent ] : []  ],
                        attributes: []
                    } );
                } );
            } );
        } )
        //user cancelled restore
        .catch( () => AwPromiseService.instance.resolve() );
};

export const updateSelectedSubPanelContext = ( ctxSelected, eventData ) => {
    ctxSelected = _.cloneDeep( ctxSelected );
    eventData = _.cloneDeep( eventData );

    if( eventData ) {
        return eventData.selectedObjects[0];
    }
    return { ...ctxSelected };
};

export default {
    restoreFileVersion,
    getColumns,
    getFileVersions,
    updateSelectedSubPanelContext
};
