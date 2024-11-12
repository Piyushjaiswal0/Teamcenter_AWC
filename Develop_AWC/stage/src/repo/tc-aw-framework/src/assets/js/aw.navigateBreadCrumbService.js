// Copyright (c) 2020 Siemens

/**
 * Defines {@link NgServices.aw.navigateBreadCrumbService} which provides the data for navigation bread crumb from url.
 *
 * @module js/aw.navigateBreadCrumbService
 */
import cdm from 'soa/kernel/clientDataModel';
import dms from 'soa/dataManagementService';
import AwStateService from 'js/awStateService';
import AwPromiseService from 'js/awPromiseService';
import appCtxService from 'js/appCtxService';
import localeService from 'js/localeService';
import { isTreeMode } from 'js/objectNavigationService';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import logger from 'js/logger';

var exports = {};

var _selectionCountLabel;
var _dataCountLabel;

/**
 * Build Skeleton for bread crumb
 *
 * @param {Object|null} provider - bread crumb provider
 * @return {Object} provider
 */
export let buildBreadcrumbProviderSkeleton = function( provider ) {
    if( !provider ) {
        provider = {
            crumbs: [],
            clear: function() {
                exports.setCrumbs( [] );
            },
            onSelect: function( crumb ) {
                exports.addOrRemoveCrumb( crumb.internalName );
            }
        };
    }

    return provider;
};


export let getBreadCrumbUidList = function( uid, d_uids ) {
    if( !d_uids ) {
        return [ uid ];
    }
    return [ uid ].concat( d_uids.split( '^' ) );
};

export let navigateToFolder = function( selectedObj, currentCrumb, uid, d_uids, { chevronPopup } ) {
    if( currentCrumb && selectedObj ) {
        var breadcrumbList = exports.getBreadCrumbUidList( uid, d_uids );
        var currentFolder = breadcrumbList.slice( -1 )[ 0 ];
        let state = AwStateService.instance;
        // If the opened crumb is for the current folder
        if( currentFolder === currentCrumb.scopedUid ) {
            // Just select the item that was clicked
            state.go( '.', {
                s_uid: selectedObj.uid
            } );
        } else {
            // Ensure that the scoped uid becomes the opened folder
            // And select the item
            var idx = breadcrumbList.indexOf( currentCrumb.scopedUid );
            // If scopeUid is not in list (it should always be in list) revert to just uid / s_uid
            // s_uid logic will remove it if not valid
            if( idx === -1 ) {
                state.go( '.', {
                    s_uid: selectedObj.uid,
                    d_uids: null
                } );
            } else {
                var newBreadcrumbList = breadcrumbList.slice( 0, idx + 1 );
                // Drop uid
                newBreadcrumbList.shift();
                state.go( '.', {
                    s_uid: selectedObj.uid,
                    d_uids: newBreadcrumbList.join( '^' )
                } );
            }
        }
        if( chevronPopup ) {
            chevronPopup.hide();
        }
    }
};


/**
 * read url and build the model object crumb list
 *
 * @param {String} breadcrumbId - bread crumb ID
 * @return {Object} promise
 */
export let readUrlForCrumbs = function( breadcrumbId, readSelection ) {
    var modelObjectList = {};
    var absentModelObjectData = [];

    // filter it out with URL params
    var bcParams = AwStateService.instance.params[ breadcrumbId ];

    var selId;
    if( readSelection ) {
        selId = AwStateService.instance.params.s_uid;
    }

    if( bcParams ) {
        var docId = bcParams.split( '^' );

        if( selId ) {
            docId.push( selId );
        }

        // this is for d_uids
        if( docId && docId.length ) {
            docId.forEach( function( element ) {
                modelObjectList[ element ] = '';
            } );
        }

        $.each( modelObjectList, function( key ) {
            var modelObject = cdm.getObject( key );
            if( modelObject ) {
                modelObjectList[ modelObject.uid ] = modelObject;
            } else {
                absentModelObjectData.push( key );
            }
        } );

        if( absentModelObjectData && absentModelObjectData.length ) {
            return dms.loadObjects( absentModelObjectData ).then( function( serviceData ) {
                for( var i = 0; i < absentModelObjectData.length; i++ ) {
                    var modelObject = serviceData.modelObjects[ absentModelObjectData[ i ] ];
                    modelObjectList[ absentModelObjectData[ i ] ] = modelObject;
                }
                return modelObjectList;
            }, function() {
                logger.error( 'SOA error :: cannot load objects.' );
            } );
        }
    }

    return AwPromiseService.instance.resolve( modelObjectList );
};

export let generateCrumb = function( displayName, showChevron, selected, selectedUid ) {
    return {
        displayName: displayName,
        showArrow: showChevron,
        selectedCrumb: selected,
        scopedUid: selectedUid,
        clicked: false
    };
};

export let buildDefaultCrumbs = function( breadCrumbMap ) {
    var crumbsList = [];
    $.each( breadCrumbMap, function( key, val ) {
        var crumb = exports.generateCrumb( val, true, false, key );
        crumbsList.push( crumb );
    } );

    if( crumbsList.length > 0 ) {
        crumbsList[ crumbsList.length - 1 ].showArrow = false;
        crumbsList[ crumbsList.length - 1 ].selectedCrumb = true;
    }
    return crumbsList;
};

export let buildBreadcrumbUrl = function( bcId, selectedUid, navigate ) {
    var bcParams = AwStateService.instance.params[ bcId ];
    var selParams;
    if( navigate ) {
        if( bcParams ) {
            if( selectedUid !== null ) {
                bcParams = bcParams.split( '|' )[ 0 ];
                if( bcParams.indexOf( selectedUid ) !== -1 ) {
                    bcParams = bcParams.split( selectedUid )[ 0 ] + selectedUid;
                } else {
                    const clickedChevronContext = appCtxService.getCtx( bcId + 'Chevron' );
                    const parentUid = clickedChevronContext.scopedUid;
                    if( bcParams.indexOf( parentUid ) !== -1 ) {
                        bcParams = bcParams.split( parentUid )[ 0 ] + parentUid + '^' + selectedUid;
                    }
                }
            }
        } else {
            var selectedModelObj = appCtxService.getCtx( 'selected' );
            if( selectedModelObj ) {
                bcParams = selectedModelObj.uid;
            }
        }
        AwStateService.instance.params[ bcId ] = bcParams;
    } else {
        const clickedChevronContext = appCtxService.getCtx( bcId + 'Chevron' );
        if( clickedChevronContext ) {
            const parentUid = clickedChevronContext.scopedUid;
            if( bcParams.indexOf( parentUid ) !== -1 ) {
                bcParams = bcParams.split( parentUid )[ 0 ] + parentUid;
            }
            AwStateService.instance.params[ bcId ] = bcParams;
        }
        // if some object is already selected, and we selected some diff. object

        selParams = AwStateService.instance.params.s_uid = selectedUid;
    }

    if( bcParams || selParams ) {
        AwStateService.instance.go( '.', AwStateService.instance.params );
        eventBus.publish( 'navigateBreadcrumb.refresh', bcId );
    }
};

/**
 * Retrive base crumb
 *
 * @param {Number} totalFound - total number of objects found
 * @param {Object[]} selectedObjects - array of selected objects
 * @param {Boolean} pwaMultiSelectEnabled - primary workarea multi selection enabled/disabled
 * @return {Promise} base bread crumb
 */
export let getBaseCrumb = async function( totalFound, selectedObjects, pwaMultiSelectEnabled ) {
    var newBreadcrumb = {
        clicked: false,
        selectedCrumb: true,
        showArrow: false
    };
    _selectionCountLabel = await localeService.getLocalizedTextFromKey( 'XRTMessages.selectionCountLabel' );
    _dataCountLabel = await localeService.getLocalizedTextFromKey( 'XRTMessages.dataCount' );
    if( pwaMultiSelectEnabled ) {
        newBreadcrumb.displayName = _selectionCountLabel.format( selectedObjects.length, _dataCountLabel.format( totalFound ) );
    } else {
        // simple count otherwise
        newBreadcrumb.displayName = _dataCountLabel.format( totalFound );
    }
    return newBreadcrumb;
};

/**
 * Retrive primary crumb
 *
 * @return {Object} primary crumb object
 */
export let getPrimaryCrumb = function( baseSelection ) {
    var obj = cdm.getObject( AwStateService.instance.params.uid );
    let displayName;
    if( obj !== null ) {
        displayName = obj.uid === baseSelection.uid ? baseSelection.props.object_string.uiValues[ 0 ] : obj.props.object_string.uiValues[ 0 ];
        return {
            clicked: false,
            displayName,
            scopedUid: obj.uid,
            selectedCrumb: false,
            showArrow: true,
            primaryCrumb: true,
            onCrumbClick: ( crumb, event ) => onSelectCrumb( crumb, event )
        };
    }
};

/**
 * Ensures object string property loaded
 *
 * @param {String[]} uidsToLoad - array of uids to load
 * @return {Promise} A promise is return which resolves after 'object_string' properties are loaded
 */
export let ensureObjectString = function( uidsToLoad ) {
    return dms.loadObjects( uidsToLoad ).then( function() {
        return dms.getProperties( uidsToLoad, [ 'object_string' ] );
    } );
};

const getDuid = ( selectedObjects ) => {
    //In case of tree node, the latest parent info is available in the id itself
    if( selectedObjects[ 0 ] && selectedObjects[ 0 ].alternateID ) {
        let selectionHierarchy = selectedObjects[ 0 ].alternateID.split( ',' );
        if( selectionHierarchy.length > 2 ) {
            //We only need d_uids - Remove first and last elements as they are the selected obj and baseSlection respectively
            return selectionHierarchy.slice( 1, -1 ).reverse().join( '^' );
        }
    } else if( AwStateService.instance.params.d_uids && !isTreeMode() ) {
        return AwStateService.instance.params.d_uids;
    }
    return null;
};

const getAlternateId = ( selectedObject, index ) => {
    var uids = selectedObject.alternateID.split( ',' ).reverse();
    return uids.slice( 0, index + 2 ).reverse().join( ',' );
};

/**
 * Sublocation specific override to build breadcrumb
 *
 * @function buildNavigateBreadcrumb
 * @memberOf NgControllers.NativeSubLocationCtrl
 *
 * @param {String} totalFound - Total number of results in PWA
 * @param {Object[]} selectedObjects - Selected objects
 * @return {Object} bread crumb provider
 */
export let buildNavigateBreadcrumb = function( totalFound, selectedObjects = [], baseSelection ) {
    let pwaSelectionInfo = {
        multiSelectEnabled: false,
        currentSelectedCount: selectedObjects.length
    };

    selectedObjects = selectedObjects.length > 0 ? selectedObjects : [ baseSelection ];
    totalFound = totalFound ? totalFound : 0;
    // If total found is not set show loading message
    var baseCrumb;
    //if( totalFound === undefined ) {
    if( selectedObjects.length === 0 ) {
        baseCrumb = {
            clicked: false,
            selectedCrumb: true,
            showArrow: false,
            onCrumbClick: ( crumb, event ) => onSelectCrumb( crumb, event )
        };
        return localeService.getLocalizedText( 'BaseMessages', 'LOADING_TEXT' )
            .then( ( msg ) => {
                baseCrumb.displayName = msg;
                return {
                    crumbs: [ baseCrumb ]
                };
            } );
    }
    var provider = {
        crumbs: [ exports.getPrimaryCrumb( baseSelection ) ]
    };
    var missingObjectCrumbs = [];
    let d_uid = getDuid( selectedObjects );
    if( d_uid ) {
        provider.crumbs = provider.crumbs.concat( d_uid.split( '^' ).map(
            function( key, index ) {
                var crumb = {
                    clicked: false,
                    displayName: key,
                    scopedUid: key,
                    scopedAlternateId: selectedObjects.length === 1 && selectedObjects[ 0 ].alternateID ? getAlternateId( selectedObjects[ 0 ], index ) : null,
                    selectedCrumb: false,
                    showArrow: true,
                    onCrumbClick: ( crumb, event ) => onSelectCrumb( crumb, event )
                };

                var obj = cdm.getObject( key );
                if( obj && obj.props.object_string ) {
                    crumb.displayName = obj.props.object_string.uiValues[ 0 ];
                } else {
                    missingObjectCrumbs.push( crumb );
                }
                return crumb;
            } ) );
    }
    if( pwaSelectionInfo.currentSelectedCount === 1 ) {
        var vmo = selectedObjects[ 0 ];
        var crumb = {
            clicked: false,
            displayName: vmo.props && vmo.props.object_string ? vmo.props.object_string.uiValues[ 0 ] : vmo.uid,
            scopedUid: vmo.uid,
            scopedAlternateId: vmo.alternateID ? vmo.alternateID : null,
            selectedCrumb: false,
            showArrow: true,
            onCrumbClick: ( crumb, event ) => onSelectCrumb( crumb, event )
        };
        if( !vmo.props || _.isEmpty( vmo.props ) ) {
            missingObjectCrumbs.push( crumb );
        }
        provider.crumbs.push( crumb );
    }
    let uids = missingObjectCrumbs.map( function( crumb ) {
        return crumb.scopedUid;
    } ).filter( function( uid ) {
        return uid;
    } );
    const lastCrumb = provider.crumbs[ provider.crumbs.length - 1 ];
    // Get the object_string
    return exports.ensureObjectString( uids ) //
        .then( function() {
            // Update with the actual string title instead of uid
            // eslint-disable-next-line array-callback-return
            missingObjectCrumbs.map( function( crumb ) {
                var obj = cdm.getObject( crumb.scopedUid );
                if( obj && obj.props.object_string ) {
                    crumb.displayName = obj.props.object_string.uiValues[ 0 ];
                }
            } );
            var lastObj = cdm.getObject( lastCrumb.scopedUid );
            // Don't show last crumb as link
            lastCrumb.selectedCrumb = true;
            // If the last object is not a folder leave the arrow
            if( !lastObj || lastObj.modelType.typeHierarchyArray.indexOf( 'Folder' ) === -1 ) {
                lastCrumb.showArrow = false;
            }
            return exports.getBaseCrumb( totalFound, selectedObjects, pwaSelectionInfo.multiSelectEnabled );
        } )
        .then( ( resp ) => {
            baseCrumb = resp;
            if( baseCrumb && baseCrumb.displayName ) {
                var d_uids = getDuid( selectedObjects );
                var currentFolderUid = AwStateService.instance.params.uid;

                if( d_uids ) {
                    var d_uidsArray = d_uids.split( '^' );
                    if( d_uidsArray.length > 0 ) {
                        currentFolderUid = _.last( d_uidsArray );
                    }
                }

                if( provider.crumbs.length >= 2 ) {
                    if( lastCrumb.showArrow && lastCrumb.scopedUid === currentFolderUid ) {
                        lastCrumb.objectsCountDisplay = ' (' + baseCrumb.displayName + ')';
                    } else {
                        var secondLastCrumb = provider.crumbs[ provider.crumbs.length - 2 ];
                        if( secondLastCrumb.showArrow && secondLastCrumb.scopedUid === currentFolderUid ) {
                            secondLastCrumb.objectsCountDisplay = ' (' + baseCrumb.displayName + ')';
                        }
                    }
                } else {
                    lastCrumb.objectsCountDisplay = ' (' + baseCrumb.displayName + ')';
                }
            }
            return provider;
        } );
};

/**
 * Functionality to trigger after selecting bread crumb
 *
 * @param {Object} crumb - selected bread crumb object
 */
export let onSelectCrumb = function( crumb ) {
    if( AwStateService.instance.params.d_uids ) {
        var d_uids = AwStateService.instance.params.d_uids.split( '^' );
        var uidIdx = d_uids.indexOf( crumb.scopedUid );

        var d_uidsParam = '';
        var s_uidParam = '';

        if( crumb.scopedAlternateId ) {
            d_uidsParam = crumb.index !== -1 ? d_uids.slice( 0, crumb.index - 1 ).join( '^' ) : null;
            s_uidParam = crumb.scopedAlternateId;
        } else {
            d_uidsParam = uidIdx !== -1 ? d_uids.slice( 0, uidIdx + 1 ).join( '^' ) : null;
            s_uidParam = d_uidsParam ? d_uids.slice( 0, uidIdx + 1 ).slice( -1 )[ 0 ] : AwStateService.instance.params.uid;
        }

        AwStateService.instance.go( '.', {
            d_uids: d_uidsParam,
            s_uid: s_uidParam
        } );
    } else if( AwStateService.instance.params.s_uid ) {
        //Clear selection if in base folder
        AwStateService.instance.go( '.', {
            s_uid: null
        } );
    }
};

exports = {
    buildBreadcrumbProviderSkeleton,
    readUrlForCrumbs,
    generateCrumb,
    buildDefaultCrumbs,
    buildBreadcrumbUrl,
    getBaseCrumb,
    getPrimaryCrumb,
    ensureObjectString,
    buildNavigateBreadcrumb,
    onSelectCrumb,
    getBreadCrumbUidList,
    navigateToFolder
};
export default exports;
