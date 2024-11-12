// Copyright (c) 2022 Siemens

/**
 * @module js/digitalAssetPanelService
 */
import AwPromiseService from 'js/awPromiseService';
import dmSvc from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import soaSvc from 'soa/kernel/soaService';
import appCtxSvc from 'js/appCtxService';
import fireCommandProxy from 'js/hosting/sol/services/hostFireCommand_2018_07';
import _ from 'lodash';

var exports = {};

/**
 * Create the BOM window to perform our BOM manipulation against
 *
 * @param {String} parentUID - the uid of the parent object which we want a BOM window against
 * @return {Object} the BOMWindow and BOMLine
 */
function createBOMWindow( parentUID ) {
    var input = {
        info: [ {
            clientId: '',
            item: { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' },
            itemRev: { uid: parentUID, type: 'unknownType' },
            bomView: { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' },
            revRuleConfigInfo: {
                clientId: '',
                revRule: { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' },
                props: {
                    unitNo: -1,
                    date: '0001-01-01T00:00:00',
                    today: false,
                    endItem: { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' },
                    endItemRevision: { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' },
                    overrideFolders: [ {
                        ruleEntry: { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' },
                        folder: { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' }
                    } ]
                }
            },
            objectForConfigure: { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' },
            activeAssemblyArrangement: { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' }
        } ]
    };
    return soaSvc.post( 'Cad-2007-01-StructureManagement', 'createBOMWindows', input );
}

/**
 * Expand the BOM window to get it's children
 *
 * @param {String} bomline - the uid of the BOMLine to be expanded
 * @return {Object} All the children of the BOMLine passed in
 */
function expandBOM( bomline ) {
    var input = {
        input: {
            parentBomLines: [ bomline ],
            excludeFilter: 'None'
        },
        pref: {
            expItemRev: false,
            info: [ {
                relationName: '',
                relationTypeNames: []
            } ]
        }
    };
    return soaSvc.post( 'Cad-2007-01-StructureManagement', 'expandPSOneLevel', input );
}

/**
 * Load the objects
 *
 * @param {StringArray} uidsToLoad - the uids to be loaded
 * @param {Object} uidCount - the number of uids
 * @param {Object} declModel - the declarative model information
 * @return {Object} the promise loading the objects
 */
function loadObjects( uidsToLoad, uidCount, declModel ) {
    return dmSvc.loadObjects( uidsToLoad ).then( function() {
        // Load the required properties for display of the history objects.
        return dmSvc.getProperties( uidsToLoad, [ 'object_string', 'item_revision_id', 'revision_list' ] ).then( () => {
            var moToDisplay = [];
            _.forEach( uidsToLoad, function( mo ) {
                // Check for dups
                for( const curMo of moToDisplay ) {
                    if( curMo.uid === mo ) {
                        return;
                    }
                }
                moToDisplay.push( cdm.getObject( mo ) );
            } );

            var vmc = declModel.dataProviders.inUseList.viewModelCollection;
            vmc.updateModelObjects( moToDisplay );
            var loadedVMOs = vmc.getLoadedViewModelObjects();

            _.forEach( loadedVMOs, function( vmo ) {
                if( uidCount[ vmo.uid ].quantity ) {
                    vmo.quantity = uidCount[ vmo.uid ].quantity;
                } else {
                    vmo.quantity = 0;
                }
                if( uidCount[ vmo.uid ].expected ) {
                    vmo.expected = uidCount[ vmo.uid ].expected;
                } else {
                    vmo.expected = 0;
                }
            } );
            declModel.inUse = loadedVMOs;
        } );
    } );
}

/**
 * Get the UID of the secondary object with the Adobe Render relation to the primary object
 *
 * @param {Object} modelObject - parent model object
 * @returns {string} uid of adobe render object
 */
function getAdobeRenderObjectUID( modelObject ) {
    var input = {
        primaryObjects: [ { uid: modelObject.uid, type: modelObject.type } ],
        pref: {
            expItemRev: false,
            returnRelations: true,
            info: [ {
                relationTypeName: 'Ret0AdobeRenderingRelation',
                otherSideObjectTypes: []
            } ]
        }
    };

    return soaSvc.post( 'Core-2007-09-DataManagement', 'expandGRMRelationsForPrimary', input ).then( ( resp ) => {
        if( resp.output && resp.output.length > 0 && resp.output[ 0 ].relationshipData && resp.output[ 0 ].relationshipData[ 0 ].relationshipObjects.length > 0 ) {
            return resp.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ 0 ].otherSideObject.uid;
        }
        return null;
    } );
}

/**
 * Perform the load of the Digital Asset BOM
 *
 * @param {Object} bomHolder - uid of the BO that is associated with the BOM
 * @param {String} uidsToLoad - list of uids attached to the Adobe file that also need to be loaded
 * @param {Object} declModel - the declarative model
 *
 * @returns {Object} promise
 */
function doLoad( bomHolder, uidsToLoad, declModel ) {
    return createBOMWindow( bomHolder ).then( function( response ) {
        return expandBOM( response.output[ 0 ].bomLine ).then( function( response ) {
            var uidCount = {};

            _.forEach( uidsToLoad, function( mo ) {
                if( !uidCount[ mo ] ) {
                    uidCount[ mo ] = {};
                }
                if( uidCount[ mo ].quantity ) {
                    uidCount[ mo ].quantity++;
                } else {
                    uidCount[ mo ].quantity = 1;
                }
            } );

            // Determine the BOM children, and use that for the expected value
            if( response.output && response.output[ 0 ] ) {
                if( ( !uidsToLoad || uidsToLoad.length === 0 ) && ( !response.output[ 0 ].children || response.output[ 0 ].children.length === 0 ) ) {
                    return AwPromiseService.instance.resolve( null );
                }

                var children = response.output[ 0 ].children;
                // Using the results of the BOM structure, update the expected quantities for the file uids
                for( const curChild of children ) {
                    var childUid = curChild.itemRevOfBOMLine.uid;
                    if( !uidCount[ childUid ] ) {
                        uidCount[ childUid ] = {};
                    }

                    if( uidCount[ childUid ].expected ) {
                        uidCount[ childUid ].expected++;
                    } else {
                        uidCount[ childUid ].expected = 1;
                    }

                    // If the child isn't already in the list of uidsToLoad, add it
                    var found = false;
                    for( const curUid of uidsToLoad ) {
                        if( curUid === childUid ) {
                            found = true;
                            break;
                        }
                    }
                    if( !found ) {
                        uidsToLoad.push( childUid );
                    }
                }
            }

            return loadObjects( uidsToLoad, uidCount, declModel );
        } );
    } );
}

/*
 * Load the objects and their properties for the uids from the adobe file
 *
 * @param {Object} declModel - the declarative model
 * @param {Object} selection - the selection
 */
export let createInUseList = function( declModel, selection ) {
    var uidsToLoad = [];

    declModel.dataProviders.inUseList.assetPanelTitle = declModel.i18n.digitalAssetsPanelTitle;
    declModel.inUseSectionTitle = declModel.i18n.digitalAssetsInUseSectionTitle;
    if( !selection || !selection.uid || !selection.modelType ) {
        declModel.inUseSectionTitle = declModel.inUseSectionTitle.replace( '"{0}"', declModel.i18n.adobeFile );
        return AwPromiseService.instance.resolve( null );
    }

    if( appCtxSvc.ctx.DigitalAssetPanel ) {
        uidsToLoad = appCtxSvc.ctx.DigitalAssetPanel.FileDigitalAssets;
    }

    var bomHolder = selection.uid;

    // If this is a retail product, find the 2D Cad object that's on the Adobe Rending relation
    if( cmm.isInstanceOf( 'RetailProductRevision', selection.modelType ) ) {
        return getAdobeRenderObjectUID( selection ).then( ( bomHolderRender ) => {
            if( bomHolderRender ) {
                return doLoad( bomHolderRender, uidsToLoad, declModel );
            }
        } );
    }

    return doLoad( bomHolder, uidsToLoad, declModel );
};

/**
 * Populate updates list
 *
 * @param {Object} declModel - the declarative model
 * @return {ObjectArray} list of object that have updates
 */
export let checkForUpdates = function( declModel ) {
    var inUseList = declModel.inUse;

    if( !inUseList || inUseList.length <= 0 ) {
        return AwPromiseService.instance.resolve( null );
    }

    // Determine which objects have updates
    var allUids = [];
    var uidsToLoad = [];
    _.forEach( inUseList, function( inUseObject ) {
        inUseObject = cdm.getObject( inUseObject.uid );
        if( inUseObject.props.revision_list && inUseObject.props.revision_list.dbValues.length > 1 ) {
            var latestUid = inUseObject.props.revision_list.dbValues[ inUseObject.props.revision_list.dbValues.length - 1 ];
            if( latestUid !== inUseObject.uid ) {
                var latestRevision = cdm.getObject( latestUid );
                if( latestRevision && latestRevision.prop && latestRevision.prop.item_revision_id ) {
                    allUids.push( {
                        uid: latestUid
                    } );
                } else {
                    uidsToLoad.push( latestUid );
                }
            }
        }
    } );

    if( uidsToLoad.length <= 0 && allUids.length <= 0 ) {
        return AwPromiseService.instance.resolve( null );
    }

    if( uidsToLoad.length <= 0 && allUids.length > 0 ) {
        declModel.dataProviders.updatesList.viewModelCollection.updateModelObjects( allUids );
        return AwPromiseService.instance.resolve( null );
    }

    return dmSvc.loadObjects( uidsToLoad ).then( function() {
        // Load the required properties for display of the history objects.
        return dmSvc.getProperties( uidsToLoad, [ 'object_string', 'item_revision_id' ] ).then( function() {
            _.forEach( uidsToLoad, function( mo ) {
                allUids.push( {
                    uid: mo
                } );
            } );
            declModel.dataProviders.updatesList.viewModelCollection.updateModelObjects( allUids );
        } );
    } );
};

/**
 * Calls the host to do the digital asset replacement
 *
 * @param {Object} commandId - the ID of the command just fired
 * @param {Object} selection - the currently selected object
 */
export let fireCommand = function( commandId, selection ) {
    var parameters = [ {
        Key: 'selection',
        Value: selection.uid
    } ];
    fireCommandProxy.createFireCommandProxy().fireCommand( commandId, parameters );
};

export default exports = {
    createInUseList,
    checkForUpdates,
    fireCommand
};
