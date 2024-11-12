// Copyright (c) 2022 Siemens

/**
 * @module js/userMgmtService
 */
import eventBus from 'js/eventBus';
import _ from 'lodash';
import appCtxService from 'js/appCtxService';
import viewModelObjectService from 'js/viewModelObjectService';
import sessionMgrSvc from 'js/sessionManager.service';
import showGDPRSvc from 'js/gdprConsentData.service';
import AwStateService from 'js/awStateService';
import localeService from 'js/localeService';
import cdm from 'soa/kernel/clientDataModel';
import soaService from 'soa/kernel/soaService';
import awSearchService from 'js/awSearchService';
import selectionService from 'js/selection.service';
import dmSvc from 'soa/dataManagementService';
import awTableSvc from 'js/awTableService';
import viewModeService from 'js/viewMode.service';
import awOrganizationTreeUtils from 'js/awOrganizationTreeUtils';

let exports = {};
//Navigate context key
var _navigateContext = 'navigate';
var _isFilterSet = false;
var _loadingMsg;
var _organizationCrumbMsg;

/**
 * Update context with search string
 *
 * @param {Object} searchCriteria - criteria
 */
export let updateCriteria = function( searchCriteria ) {
    _isFilterSet = true;
    var searchContext = appCtxService.getCtx( 'search' );
    searchContext.criteria.searchString = searchCriteria;
    appCtxService.updateCtx( 'search', searchContext );
    eventBus.publish( 'peopleList.loadData' );
};

/**
 * Update data provider with search results
 *
 * @param {Object} data - data
 * @param {Object} dataProvider - data provider
 */
export let updateDataProviders = function( data, dataProvider ) {
    if( _isFilterSet ) {
        _isFilterSet = false;
        dataProvider.update( data.searchResults, data.totalFound );
    }
};

export let sortResults = function( parentUid, searchResults ) {
    //Sort by creation date if the context is set
    var navigationCreateContext = appCtxService.getCtx( _navigateContext + '.' + parentUid );
    if( navigationCreateContext ) {
        //Uids are not references to the actual object
        var getRealUid = function( uid ) {
            var realMo = cdm.getObject( uid );
            if( realMo && realMo.props.awp0Target ) {
                return realMo.props.awp0Target.dbValues[ 0 ];
            }
            return uid;
        };

        //Keep the original ordering for anything that was not created
        var originalOrderingResults = searchResults.filter( function( mo ) {
            var uid = getRealUid( mo.uid );
            return navigationCreateContext.indexOf( uid ) === -1;
        } );

        //For anything that was created order by the creation date (newest first)
        var newOrderingResults = searchResults.filter( function( mo ) {
            var uid = getRealUid( mo.uid );
            return navigationCreateContext.indexOf( uid ) !== -1;
        } ).sort(
            function( a, b ) {
                var uidA = getRealUid( a.uid );
                var uidB = getRealUid( b.uid );
                return navigationCreateContext.indexOf( uidB ) -
                    navigationCreateContext.indexOf( uidA );
            } );

        return newOrderingResults.concat( originalOrderingResults );
    }
    return searchResults;
};

export let loadData = function( searchInput, columnConfigInput, saveColumnConfigData, inflateProp ) {
    return soaService.postUnchecked( 'Internal-AWS2-2023-06-Finder', 'performSearchViewModel5', {
        columnConfigInput: columnConfigInput,
        saveColumnConfigData: saveColumnConfigData,
        searchInput: searchInput,
        inflateProperties: inflateProp,
        noServiceData: false
    } )
        .then(
            function( response ) {
                if( response.searchResultsJSON ) {
                    response.searchResults = JSON.parse( response.searchResultsJSON );
                    delete response.searchResultsJSON;
                }

                // Create view model objects
                response.searchResults = response.searchResults &&
                    response.searchResults.objects ? response.searchResults.objects
                        .map( function( vmo ) {
                            return viewModelObjectService
                                .createViewModelObject( vmo.uid, 'EDIT', null, vmo );
                        } ) : [];

                // Collect all the prop Descriptors
                var propDescriptors = [];
                _.forEach( response.searchResults, function( vmo ) {
                    _.forOwn( vmo.propertyDescriptors, function( value ) {
                        propDescriptors.push( value );
                    } );
                } );

                // Weed out the duplicate ones from prop descriptors
                response.propDescriptors = _.uniq( propDescriptors, false,
                    function( propDesc ) {
                        return propDesc.name;
                    } );

                //Sort by creation date if the context is set
                response.searchResults = exports.sortResults(
                    searchInput.searchCriteria.parentUid, response.searchResults );
                return response;
            } );
};

/**
 * Return display name
 *
 * @function getDisplayName
 * @memberOf NgControllers.OrgSubLocationCtrl
 *
 * @param {Object} crumbName - crumb
 *
 * @returns {Object} display name
 */
export let getDisplayName = function( crumbName ) {
    var i = crumbName.indexOf( '.' );
    return i === -1 ? crumbName : crumbName.substring( 0, i );
};

/**
 * Return object type
 *
 * @function getDisplayName
 * @memberOf NgControllers.OrgSubLocationCtrl
 *
 * @param {Object} uid - uid
 *
 * @returns {Object} display name
 */
export let getCrumbName = function( uid ) {
    var obj = cdm.getObject( uid );
    if( obj && obj.props.object_string ) {
        return obj.type + ': ' + exports.getDisplayName( obj.props.object_string.uiValues[ 0 ] );
    }
};

var _getCrumbs = function( totalFound ) {
    var crumbs = [];

    var crumb = {
        clicked: false,
        displayName: totalFound + ' Objects: ',
        selectedCrumb: false,
        showArrow: false,
        onCrumbClick: ( crumb ) => onSelectCrumb( crumb )
    };
    crumbs.push( crumb );

    if( !AwStateService.instance.params.d_uids && !AwStateService.instance.params.s_uid ) {
        //Organization
        var crumb1 = _.cloneDeep( crumb );
        crumb1.displayName = _organizationCrumbMsg;
        crumbs.push( crumb1 );
    } else {
        //Groups Roles. Breadcrumb is Organization > Group > Role
        //Organization
        var crumb2 = _.cloneDeep( crumb );
        crumb2.displayName = _organizationCrumbMsg;
        crumb2.showArrow = true;
        crumbs.push( crumb2 );

        if( AwStateService.instance.params.d_uids ) {
            var d_uidsArray = AwStateService.instance.params.d_uids.split( '^' );

            d_uidsArray.map( function( uid, idx ) {
                var crumb3 = _.cloneDeep( crumb );
                crumb3.displayName = exports.getCrumbName( uid );

                if( idx + 1 < d_uidsArray.length || AwStateService.instance.params.s_uid ) {
                    crumb3.showArrow = true;
                }
                crumb3.scopedUid = uid;

                crumbs.push( crumb3 );
            } );
        }
    }
    return crumbs;
};

/**
 * Sublocation specific override to build breadcrumb
 *
 * @function buildNavigateBreadcrumb
 * @memberOf NgControllers.NativeSubLocationCtrl
 *
 * @param {String} totalFound - Total number of results in PWA
 * @param {Object[]} selectedObjects - Selected objects
 * @returns {Object} provider
 */
export let buildNavigateBreadcrumb = function( totalFound, selectedObjects ) {
    //If total found is not set show loading message
    if( totalFound === undefined ) {
        var baseCrumb = {
            displayName: _loadingMsg,
            clicked: false,
            selectedCrumb: true,
            showArrow: false
        };

        return {
            crumbs: [ baseCrumb ]
        };
    }

    var provider = {
        crumbs: _getCrumbs( totalFound )
    };

    //Add selected object crumb
    if( provider.crumbs.length > 0 && selectedObjects && selectedObjects.length === 1 ) {
        var vmo = selectedObjects[ 0 ];
        var crumb = {
            clicked: false,
            displayName: exports.getCrumbName( vmo.uid ),
            scopedUid: vmo.uid,
            selectedCrumb: false,
            showArrow: true
        };

        provider.crumbs.push( crumb );

        //When object is selected, last 2nd crumb should have chevron ahead of it
        var lastSecondCrumb = provider.crumbs[ provider.crumbs.length - 2 ];
        lastSecondCrumb.showArrow = true;
    }

    if( provider.crumbs.length > 0 ) {
        var lastCrumb = provider.crumbs[ provider.crumbs.length - 1 ];

        //Don't show last crumb as link
        lastCrumb.selectedCrumb = true;
        lastCrumb.showArrow = false;
    }
    return provider;
};

/**
 * Functionality to trigger logout session, once users revoke their consent
 **/
export let revokeGDPRConsentClick = function() {
    showGDPRSvc.recordUserConsent( false ).then( function() {
        sessionMgrSvc.terminateSession();
    }

    );
};

/**
 * Functionality to trigger logout session, once users revoke their consent
 **/
export let cancelRevoke = function( data ) {
    var revokeGDPRConsent = _.clone( data.revokeGDPRConsent );
    revokeGDPRConsent.dbValue = false;
    return revokeGDPRConsent;
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

        var d_uidsParam = uidIdx !== -1 ? d_uids.slice( 0, uidIdx + 1 ).join( '^' ) : null;
        var s_uidParam = d_uids ? d_uids : AwStateService.instance.params.uid;

        AwStateService.instance.go( '.', {
            d_uids: d_uidsParam,
            s_uid: s_uidParam
        } );
    }
};

var loadConfiguration = function() {
    localeService.getLocalizedText( '/i18n/UIMessages', 'loadingMsg', true ).then(
        function( msg ) {
            _loadingMsg = msg;
        } );
    localeService.getLocalizedText( '/i18n/UsermanagementMessages', 'organizationTitle', true )
        .then( function( msg ) {
            _organizationCrumbMsg = msg;
        } );
};

export const processOutput = ( data, dataCtxNode, searchData ) => {
    awSearchService.processOutput( data, dataCtxNode, searchData );
};

/**
 * Update 'ActiveWorkspace:xrtContext' in the appCtxService
 *
 * @param {Object} group - group
 * @param {Object} role - role .
 */
const createXrtContext = function( group, role ) {
    return {
        resourceProviderContentType: 'GroupSubobjects',
        groupUID: group,
        roleUID: role ? role : ''
    };
};

export const getSearchCriteriaFromURL = async( selected ) => {
    let searchCriteria = {};
    let xrtContext;
    if( AwStateService.instance.params.d_uids ) {
        var d_uids = AwStateService.instance.params.d_uids.split( '^' );
        var modelObjects = cdm.getObjects( d_uids );
        var loadObjects = [];
        for( var i = 0; i < modelObjects.length; i++ ) {
            if( !modelObjects[ i ] ) {
                loadObjects.push( d_uids[ i ] );
            }
        }
        if( loadObjects.length ) {
            await dmSvc.loadObjects( loadObjects );
            modelObjects = cdm.getObjects( d_uids );
        }
        for( var idx = 0; idx < d_uids.length; idx++ ) {
            if( modelObjects[ idx ].type === 'Group' ) {
                searchCriteria.groupUID = d_uids[ idx ];
                searchCriteria.roleUID = '';
            } else if( modelObjects[ idx ].type === 'Role' ) {
                searchCriteria.roleUID = d_uids[ idx ];
            }
        }
        searchCriteria.resourceProviderContentType = 'GroupSubobjects';
        if( AwStateService.instance.params.s_uid || selected ) {
            xrtContext = createXrtContext( searchCriteria.groupUID, searchCriteria.roleUID );
        }
    } else {
        //revert back to Organization
        searchCriteria.resourceProviderContentType = 'Organization';
        searchCriteria.groupUID = '';
        searchCriteria.roleUID = '';
    }
    return { searchCriteria, xrtContext };
};

export const updateSearchCriteriaAndXrtContext = async( searchStateAtomicDataRef, searchStateUpdater, selectionData ) => {
    let searchState = searchStateAtomicDataRef.getAtomicData();
    let newSearchstate = searchState ? { ...searchState } : undefined;
    if( newSearchstate ) {
        if( !_.isEmpty( selectionData ) ) {
            if( selectionData.source === 'primary' ) {
                newSearchstate.pwaSelection = selectionData.selected ? selectionData.selected : [];
            } else if( selectionData.source === 'base' || selectionData.source === undefined ) {
                newSearchstate.pwaSelection = [];
            }
            selectionService.updateSelection( selectionData.selected, selectionData.pselected );
        }
        const { searchCriteria, xrtContext } = await getSearchCriteriaFromURL( selectionData.selected );

        newSearchstate.criteria = newSearchstate.criteria ? newSearchstate.criteria : {};
        newSearchstate.criteria.resourceProviderContentType = searchCriteria.resourceProviderContentType;
        newSearchstate.criteria.groupUID = searchCriteria.groupUID;
        newSearchstate.criteria.roleUID = searchCriteria.roleUID;
        newSearchstate.xrtContext = xrtContext;
        searchStateUpdater.searchState( newSearchstate );
    }
};

/**
 * Function to update d_uids param upon selection
 * @param {*} subPanelContext
 * @param {*} selectionData
 */
export let updateDuidsParamOnSelection = function( subPanelContext ) {
    if( subPanelContext.selectionData && subPanelContext.selectionData.selected && subPanelContext.selectionData.selected.length > 0 ) {
        var selection = subPanelContext.selectionData.selected;
        var selectedNode = selection[ selection.length - 1 ];
        if( selectedNode.type !== 'Site' && selectedNode.alternateID ) {
            var selectedNodeAlternateId = selectedNode.alternateID;
            var uidArray = selectedNodeAlternateId.split( ',' );

            var d_uids = '';
            var newDuid = '';
            if( uidArray[ uidArray.length - 1 ] ) {
                uidArray.splice( uidArray.length - 1, 1 );
            }

            if( uidArray[ 0 ] ) {
                uidArray.splice( 0, 1 );
            }

            if( uidArray.length > 0 ) {
                uidArray = _.reverse( uidArray );

                _.forEach( uidArray, function( d_uid ) {
                    newDuid = newDuid === '' ? newDuid + d_uid : newDuid + '^' + d_uid;
                } );

                d_uids = newDuid;
            }
            AwStateService.instance.go( '.', {
                d_uids: d_uids
            } );
        }
    }
};


/**
 * Usecase - When we change the view mode from tree to any other view, we have to keep the selection
 * This Function is to update the selected node by mapping alternateID to uid.
 * This function clear the tree view selection while unMount to avoid maximum call stack issue.
 * @param {*} selectionModel
 */
export const clearSelection = ( selectionModel ) => {
    if( selectionModel.selectionData ) {
        var mSelectedNodes = [];
        const tmpSelectionData = { ...selectionModel.selectionData.value };

        var alternateIDs = tmpSelectionData.selected.map( node => node.alternateID );
        const selections = tmpSelectionData.selected.length > 0 ? alternateIDs : [ AwStateService.instance.params.s_uid ];
        //This is getting uid of selected node and make selection using uid.
        //Need to set selection and can not using same selection data because list/image/table view do not using alternateID.
        selections.forEach( ( selection = '' ) => {
            mSelectedNodes.push( selection.split( ',' )[ 0 ] );
        } );

        tmpSelectionData.selected = [];
        selectionModel.selectionData.update( tmpSelectionData );

        if( mSelectedNodes && mSelectedNodes.length > 0 ) {
            selectionModel.setSelection( mSelectedNodes );
        }
    }
};

/**
 * Prepare alternateID using d_uids & s_uids
 * @returns alternateID
 */
export const getAlternateIdFromParams = ( uid ) => {
    const navigationParam = AwStateService.instance.params;
    let nodeAlternateID = [];

    let d_uidsForNodeSelection = navigationParam.d_uids && navigationParam.d_uids !== navigationParam.s_uid ? navigationParam.d_uids.split( '^' ) : [];
    d_uidsForNodeSelection = _.reverse( d_uidsForNodeSelection ).join();

    if( uid ) {
        nodeAlternateID.push( uid );
    }

    if( d_uidsForNodeSelection !== '' ) {
        nodeAlternateID.push( d_uidsForNodeSelection );
    }

    nodeAlternateID.push( 'SiteLevel' );

    return nodeAlternateID;
};

/**
 * This function is call upon onMount of the org tree component. This function is used to set seletion in org tree.
 * @param {*} selectionData
 * @param {*} selectionModel
 */
export const setSelectionOnLoad = ( selectionData, selectionModel ) => {
    /*
    Usecase 1- When we change view mode from list to tree, we have to maintain the selection.
    we get current selection in selection model.
    and to set that selection in tree mode we prepare alternateID and basis of that update selectionData.
    Usecase 2 - On tree reload, selection model data is empty. so we make selection using alternateID that creates using s_uid & d_uid.
    */
    if( selectionModel.selectionData ) {
        var mSelectedNodes = [];
        const tmpSelectionData = { ...selectionModel.selectionData.value };
        let tmpContext = { ...selectionData.value };
        let newSelection = [];

        if( tmpSelectionData.selected && tmpSelectionData.selected.length > 0 ) {
            var selections = tmpSelectionData.selected.map( node => node.uid );
        } else {
            var selections = [ AwStateService.instance.params.s_uid ];
        }

        selections.forEach( ( selection = '' ) => {
            mSelectedNodes.push(  _.join( getAlternateIdFromParams( selection.split( ',' )[ 0 ] ), ',' ) );
        } );

        /** For multiple selection need to iterate selections */
        for( var i = 0; i < selections.length; i++ ) {
            var selectedNode = viewModelObjectService.constructViewModelObjectFromModelObject( cdm.getObject( selections[i] ) );
            let treeNode = awTableSvc.createViewModelTreeNode( selectedNode.uid, selectedNode.type, selectedNode.cellHeader1 );
            treeNode.alternateID = mSelectedNodes[i];
            newSelection.push( treeNode );
        }
        tmpContext.selected = newSelection;
        selectionData.update( tmpContext );
    }
};

/**
 * Usecase -  This function is called upon creation of user/role/group. To make selection of newly added node we prepare alternate ID of new node using parentUid
 * @param {*} selectionData
 * @param {*} eventData - contains uid of newly created node.
 * @param {*} selectionModel
 */
export const reloadOrgTree = function( selectionData, eventData ) {
    //new node will add in selected node, so selected node will be the parent node.
    var rootNode = {
        type: 'Site',
        uid: 'SiteLevel',
        levelNdx: 0
    };
    var parentNode = selectionData.selected.length > 0 ? selectionData.selected[0] : rootNode;
    let tmpContext = { ...selectionData.value };
    var treeNode = {};
    /**
     * Usecase - when we add existing user/role/subgroup using search tab, we have select/multiselect added nodes in PWA.
     */
    //eventData.uid is uid of newly created node
    if( eventData.isRemoved ) {
        return tmpContext.selected;
    } else if( eventData.multipleNodeAdded ) {
        var newNodes = eventData.multipleNodeAdded;
        let newSelection = [];

        for( var i = 0; i < newNodes.length; i++ ) {
            var selectedNode = viewModelObjectService.constructViewModelObjectFromModelObject( cdm.getObject( newNodes[i].uid ) );
            treeNode = awOrganizationTreeUtils.createVMNodeUsingObjectInfo( selectedNode, parentNode.levelNdx + 1, 0, false, parentNode );
            newSelection.push( treeNode );
        }
        tmpContext.selected = newSelection;
    } else{
        var selectedNode = viewModelObjectService.constructViewModelObjectFromModelObject( cdm.getObject( eventData.uid ) );
        treeNode = awOrganizationTreeUtils.createVMNodeUsingObjectInfo( selectedNode, parentNode.levelNdx + 1, 0, false, parentNode  );

        tmpContext.selected = [ treeNode ];
    }
    return tmpContext.selected;
};


loadConfiguration();

export default exports = {
    updateCriteria,
    updateDataProviders,
    sortResults,
    loadData,
    getDisplayName,
    getCrumbName,
    buildNavigateBreadcrumb,
    revokeGDPRConsentClick,
    cancelRevoke,
    onSelectCrumb,
    processOutput,
    getSearchCriteriaFromURL,
    updateSearchCriteriaAndXrtContext,
    updateDuidsParamOnSelection,
    clearSelection,
    getAlternateIdFromParams,
    setSelectionOnLoad,
    reloadOrgTree
};
