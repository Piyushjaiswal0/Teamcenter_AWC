// Copyright (c) 2021 Siemens
import AwStateService from 'js/awStateService';
import _ from 'lodash';
import clientDataModel from 'soa/kernel/clientDataModel';
import dataManagementService from 'soa/dataManagementService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import xrtParserService from 'js/xrtParser.service';
import xrtUtils from 'js/xrtUtilities';
import typeDisplayNameSvc from 'js/typeDisplayName.service';
import appCtxService from 'js/appCtxService';
import logger from 'js/logger';
import editHandlerService from 'js/editHandlerService';
import tcColumnUtils from 'js/tcColumnUtils';
import { getLocalizedTextFromKey } from 'js/localeService';
import { loadDynModule } from 'js/moduleLoader';
import { updateEditStateInURL } from 'js/Awp0ShowSaveAsService';
import { registerKeyDownEvent, unRegisterKeyDownEvent } from 'js/keyboardService';
import { changeViewMode } from 'js/viewMode.service';
let _activeParams = [];

const showObjectProvider = {
    provider: {
        clientScopeURI: 'Awp0ShowObject',
        nameToken: 'com.siemens.splm.clientfx.tcui.xrt.showObjectLocation',
        name: 'showObject'
    }
};

let showObjectSubLProvider = {
    clientScopeURI: 'Awp0ShowObject',
    nameToken: 'com.siemens.splm.clientfx.tcui.xrt.showObjectSubLocation',
    name: 'showObject'
};

const switchTabSelection = ( id, tabTitle, subLocationTabs ) => {
    if( !subLocationTabs ) {
        return;
    }
    const tabToSelect = subLocationTabs.filter( tab => {
        return tab.name === tabTitle || tab.tabKey === id;
    } )[ 0 ];

    const stateParams = AwStateService.instance.params;

    let newParams = {
        uid: AwStateService.instance.params.uid
    };

    //If we are selecting the default page clear the page and pageId instead - prevents history loop
    if( subLocationTabs.indexOf( tabToSelect ) === getMatchingTabIndex( stateParams.pageId, stateParams.page, subLocationTabs ) ) {
        newParams.pageId = null;
        newParams.page = null;
    } else {
        newParams.pageId = tabToSelect.id;
        newParams.page = tabToSelect.name;
    }
    AwStateService.instance.go( '.', newParams, {
        inherit: false
    } );
};

export const initialize = ( data ) => {
    appCtxService.registerCtx( 'locationContext', {
        'ActiveWorkspace:Location': 'com.siemens.splm.clientfx.tcui.xrt.showObjectLocation',
        'ActiveWorkspace:SubLocation': 'showObject'
    } );
    changeViewMode( 'None' );
    _activeParams = [];
    registerKeyDownEvent();
    return synchronizeState( null, null, data );
};

export const syncOpenedObject = async( viewModelObject, eventData ) => {
    if( !viewModelObject || AwStateService.instance.params.uid !== viewModelObject.uid ) {
        return;
    }
    let affectedObjected = [];
    if( eventData && eventData.modifiedObjects ) {
        affectedObjected = eventData.modifiedObjects;
    } else if( eventData && eventData.updatedObjects ) {
        affectedObjected = eventData.updatedObjects;
    } else if( eventData && eventData.relatedModified && eventData.refreshLocationFlag ) {
        affectedObjected = eventData.relatedModified;
    }

    let openedObjectIsImpacted = false;

    if( affectedObjected ) {
        for( let i in affectedObjected ) {
            if( affectedObjected[ i ].uid === viewModelObject.uid ) {
                openedObjectIsImpacted = true;
                break;
            }
        }
    }

    if( !openedObjectIsImpacted ) {
        return;
    }

    if( viewModelObject ) {
        var updatedVmo = viewModelObjectSvc.createViewModelObject( viewModelObject, null );
        viewModelObjectSvc.updateSourceObjectPropertiesByViewModelObject( updatedVmo, [ viewModelObject ] );
    }
    const displayName = await getDisplayName( viewModelObject );
    return {
        viewModelObject : { ...viewModelObject },
        displayName
    };
};

export const handleStateChange = ( showObjContext, viewModelObject, data ) => {
    return synchronizeState( showObjContext, viewModelObject, data );
};

export const activateTab = ( tabIdToActivate, subLocationTabs ) => {
    switchTabSelection( tabIdToActivate.primaryActiveTabId, undefined, subLocationTabs );
};

export const handleObjectDeletedEvent = async( viewModelObject, showObjContext, eventData ) => {
    if( !viewModelObject || AwStateService.instance.params.uid !== viewModelObject.uid ) {
        return;
    }
    let isOpenedObjectDeleted = false;
    if( eventData.deletedObjectUids && viewModelObject.uid ) {
        for( let i = 0; i < eventData.deletedObjectUids.length; ++i ) {
            if( eventData.deletedObjectUids[i] === viewModelObject.uid ) {
                isOpenedObjectDeleted = true;
                break;
            }
        }
    }

    if( isOpenedObjectDeleted ) {
        const errorMsg = await getLocalizedTextFromKey( 'XRTMessages.objectNotFound', true );
        const displayName = await getLocalizedTextFromKey( 'XRTMessages.ShowObjectLocationTitle', true );
        return { showObjContext: { errorMsg, displayName }  };
    }
    return { showObjContext };
};

export const unmount = () => {
    unRegisterKeyDownEvent();
};

const synchronizeState = ( showObjContext, viewModelObject, data ) => {
    const stateParams = AwStateService.instance.params;
    let changedParams = {};
    for( let i in stateParams ) {
        if( stateParams[ i ] !== _activeParams[ i ] ) {
            changedParams[ i ] = stateParams[ i ];
        }
    }
    _activeParams = _.cloneDeep( stateParams );
    let param = 'uid';
    if( changedParams.hasOwnProperty( param ) && stateParams[ param ] ) {
        return openNewModelObject( stateParams[ param ], data );
    }
    //Revisit me: Ria, Charu - Need to get rid of hardcoding to get rid of singleton assumptions.
    //Keeping it as is until we encounter a usecase
    //If the page parameter and the wrong page is selected switch to correct tab
    if( changedParams.hasOwnProperty( 'page' ) || changedParams.hasOwnProperty( 'pageId' ) ) {
        return selectTab( showObjContext, viewModelObject, data.xrtState, data );
    }
};

const _processDeclStyleSheetResponse = ( viewModelJsonString, selectedObject ) => {
    let xrtViewModel = JSON.parse( viewModelJsonString );
    xrtViewModel.data._selectedObject = selectedObject; //revisitMe

    // since data is shared between table/list/compare for objectSet setting, manually set attributesToInflate
    _.forEach( xrtViewModel.dataProviders, function( dataProvider ) {
        if( dataProvider && dataProvider.action &&
            xrtViewModel.actions[ dataProvider.action ] &&
            xrtViewModel.actions[ dataProvider.action ].inputData &&
            xrtViewModel.actions[ dataProvider.action ].inputData.searchInput ) {
            var searchInput = xrtViewModel.actions[ dataProvider.action ].inputData.searchInput;

            var colProviders = Object.keys( xrtViewModel.columnProviders ).map( function( i ) {
                return xrtViewModel.columnProviders[ i ];
            } );
            var columnAttrsMap = colProviders
                //Get 2d array of properties required for each column provider
                .map( function( colProvider ) {
                    return tcColumnUtils.retrieveColumnNames( colProvider );
                } )
                //Flatten the array
                .reduce( function( acc, nxt ) {
                    return acc.concat( nxt );
                }, [] )
                //Merge the lists into a set (boolean map)
                .reduce( function( acc, nxt ) {
                    acc[ nxt ] = true;
                    return acc;
                }, {} );

            var columnAttrs = Object.keys( columnAttrsMap );
            if( searchInput.attributesToInflate ) {
                searchInput.attributesToInflate = _.union( searchInput.attributesToInflate,
                    columnAttrs );
            } else {
                searchInput.attributesToInflate = columnAttrs;
            }
        }
    } );

    xrtViewModel.data.operationName = 'Edit';
    xrtViewModel.data.xrtType = 'SUMMARY';
    // Add compare grid to the grids info from server. Compare is always a client side implementation which uses table grid info and compare grid options like transpose.
    _.forEach( xrtViewModel.grids, function( grid ) {
        if( grid.dataProvider ) {
            xrtViewModel.grids[ grid.dataProvider + '_compare' ] = _.cloneDeep( grid );
        }
    } );

    return xrtViewModel;
};

const selectTab = async( showObjContext, viewModelObject, xrtState, data ) => {
    let clonedShowObjCtxt = { ...showObjContext };
    let { activeTab, updatedSubLocationTabs } = getUpdatedSublocTabsAndActiveTab( showObjContext.subLocationTabs );

    /**
     * Trigger getDeclarativeStyleSheets and build viewModel if its XRT tab
     */
    if( activeTab && ( !activeTab.view || activeTab.view === 'AwXrtSublocation' ) ) {
        clonedShowObjCtxt.provider.label = activeTab.name;
        var tabKey = activeTab.tabKey;
        //Get a view model containing data for a single page
        if( editHandlerService.editInProgress().editInProgress ) {
            //when change tab, remove the edit=true from URL
            updateEditStateInURL();
            await editHandlerService.leaveConfirmation();
        }

        return xrtParserService.getDeclStyleSheet( 'SUMMARY', tabKey, viewModelObject, undefined, showObjectProvider ).then(
            async function( response ) {
                try {
                    if( !activeTab.view ) {
                        activeTab.view = 'AwXrtSublocation';
                    }
                    await loadDynModule( `viewmodel/${activeTab.view}ViewModel` );
                    let xrtViewModel = _processDeclStyleSheetResponse( response.declarativeUIDefs[ 0 ].viewModel, viewModelObject );

                    let objectSetInfo = {};
                    if( viewModelObject ) {
                        objectSetInfo.firstPage = xrtUtils.buildVMOsForObjectSet( viewModelObject.uid, xrtViewModel.data.objects );
                    }

                    clonedShowObjCtxt.objectSetInfo = objectSetInfo;
                    clonedShowObjCtxt.xrtViewModel = xrtViewModel;
                    // since there are new updated pages, get the updates going.
                    let updatedTabsInfo = getLatestTabsDetailsFromXRTVM( xrtViewModel );
                    clonedShowObjCtxt.activeTab = updatedTabsInfo.activeTab;
                    clonedShowObjCtxt.subLocationTabs = updatedTabsInfo.updatedSubLocationTabs;
                    let displayName = await getDisplayName( viewModelObject );
                    clonedShowObjCtxt.api = getSelectTabApi( updatedSubLocationTabs, displayName, xrtViewModel, activeTab, viewModelObject, data, showObjectSubLProvider );
                    return { viewModelObject, showObjContext: clonedShowObjCtxt };
                } catch ( e ) {
                    logger.error( 'Unable to parse retrieved XRT: ' + response.declarativeUIDefs[ 0 ].viewModel );
                }
            } );
    }
    //handle non xrt tab
    clonedShowObjCtxt.activeTab = activeTab;
    clonedShowObjCtxt.subLocationTabs = updatedSubLocationTabs;
    await loadDynModule( `viewmodel/${activeTab.view}ViewModel` );
    return Promise.resolve( { viewModelObject, showObjContext: clonedShowObjCtxt, xrtState } );
};

const openNewModelObject = ( uid, data ) => {
    let modelObject = clientDataModel.getObject( uid );

    if( !modelObject ) {
        return dataManagementService.loadObjects( [ uid ] ).then( function() {
            return refreshModelObject( clientDataModel.getObject( uid ), data );
        }, function() {
            return getLocalizedTextFromKey( 'XRTMessages.FailureLoadingSummary', true ).then( ( errorMsg )=>{
                return getLocalizedTextFromKey( 'XRTMessages.ShowObjectLocationTitle', true ).then( ( displayName )=>{
                    return { viewModelObject: {}, showObjContext: { errorMsg, displayName }  };
                } );
            } );
        } );
    }
    return refreshModelObject( modelObject, data );
};

const getDisplayName = async( modelObject ) => {
    let name = typeDisplayNameSvc.instance.getDisplayName( modelObject );
    if( name ) {
        return name;
    }
    return getLocalizedTextFromKey( 'XRTMessages.ShowObjectLocationTitle', true );
};

const refreshModelObject = async( modelObject, data ) => {
    appCtxService.unRegisterCtx( 'locationContext.ActiveWorkspace:SubLocation' );

    const stateParams = AwStateService.instance.params;
    const pageId = stateParams.pageId ? stateParams.pageId : stateParams.page;

    if( editHandlerService.editInProgress().editInProgress ) {
        await editHandlerService.leaveConfirmation();
    }

    //Set showObject in SubLocation at initial Summary page load
    const locationCtx = appCtxService.getCtx( 'locationContext' );
    if( locationCtx[ 'ActiveWorkspace:Location' ] === 'com.siemens.splm.clientfx.tcui.xrt.showObjectLocation' && !locationCtx[ 'ActiveWorkspace:SubLocation' ] ) {
        locationCtx[ 'ActiveWorkspace:SubLocation' ] = 'showObject';
        appCtxService.updateCtx( 'locationContext', locationCtx );
        xrtUtils.updateRedLineMode();
    }

    return xrtParserService.getDeclStyleSheet( 'SUMMARY', pageId, modelObject ).then(
        async function( response ) {
            let viewModelObject = modelObject ? getVMOFromMO( modelObject ) : null;
            let xrtViewModel = _processDeclStyleSheetResponse( response.declarativeUIDefs[ 0 ].viewModel, modelObject );

            let objectSetInfo = {};
            if( viewModelObject ) {
                objectSetInfo.firstPage = xrtUtils.buildVMOsForObjectSet( viewModelObject.uid, xrtViewModel.data.objects );
            }

            let { activeTab, updatedSubLocationTabs } = getLatestTabsDetailsFromXRTVM( xrtViewModel );
            let displayName = await getDisplayName( modelObject );

            let api = getSelectTabApi( updatedSubLocationTabs, displayName, xrtViewModel, activeTab, viewModelObject, data, showObjectSubLProvider );

            return { viewModelObject, showObjContext: { subLocationTabs: updatedSubLocationTabs, displayName, xrtViewModel, objectSetInfo, activeTab, api, provider: showObjectSubLProvider } };
        } );
};

const getSelectTabApi = ( updatedSubLocationTabs, displayName, xrtViewModel, activeTab, viewModelObject, data, provider ) => {
    let api = ( id, tabTitle, tabsModel ) => {
        if( !id && !tabTitle ) {
            selectTab( { subLocationTabs: updatedSubLocationTabs, displayName, xrtViewModel, activeTab, api, provider: provider, data }, viewModelObject, undefined, data ).then( function(
                updatedObject ) {
                data.dispatch( { path: 'data.showObjContext', value: updatedObject.showObjContext } );
            } );
        } else {
            switchTabSelection( id, tabTitle, tabsModel );
        }
    };
    return api;
};

const getVMOFromMO = modelObject => {
    return viewModelObjectSvc.constructViewModelObjectFromModelObject( modelObject, null );
};

const buildSublocationTabs = ( visiblePages ) => {
    var tabs = null;
    if( visiblePages ) {
        tabs = visiblePages.map( ( page, index ) => {
            return {
                classValue: 'aw-base-tabTitle',
                displayTab: true,
                id: page.titleKey,
                name: page.displayTitle,
                pageId: index,
                page: page,
                selectedTab: page.selected || false,
                visible: true,
                view: page.pageNameToken,
                tabKey: page.titleKey
            };
        } );
    }
    if( tabs ) {
        //Tab order sort order will be correct so set priority to index
        tabs = tabs.map( function( tab, idx ) {
            tab.priority = idx;
            return tab;
        } );
    }
    return tabs;
};

const getMatchingTabIndex = function( pageId, page, subLocationTabs ) {
    //If there is a page parameter
    if( pageId || page ) {
        //Try to find that page
        var matchingPages = subLocationTabs.filter( function( tab ) {
            return pageId && tab.id === pageId || page && tab.name === page;
        } );
        if( matchingPages.length > 0 ) {
            return subLocationTabs.indexOf( matchingPages[ 0 ] );
        }

        //If the page was not a valid page clear the state parameter
        AwStateService.instance.go( '.', {
            page: null,
            pageId: null
        }, {
            location: 'replace'
        } );
    }

    //If page not set or not found return the first tab that can be default
    var potentialDefaults = subLocationTabs.filter( function( t ) {
        //canBeDefault default is true
        return t.canBeDefault !== false;
    } );

    //-1 if no valid tab found
    return potentialDefaults.length > 0 ? subLocationTabs.indexOf( potentialDefaults[ 0 ] ) : -1;
};

const getLatestTabsDetailsFromXRTVM = ( xrtViewModel ) => {
    // eslint-disable-next-line array-callback-return
    Object.values( xrtViewModel.dataProviders ).map( ( dp ) => {
        dp.inputData = {
            selectionData: '{{subPanelContext.selectionData}}'
        };
    } );

    if( xrtViewModel.functions ) {
        Object.values( xrtViewModel.functions ).forEach( ( fn ) => {
            if( fn.functionName === 'getActiveWorkspaceXrtContext' ) {
                fn.parameters = [ '{{props.xrtContext}}', '{{xrtState.value.customContext}}' ];
            }
        } );
    }
    // since there are new updated pages, get the updates going.
    let visiblePages = xrtParserService.getDeclVisiblePages( xrtViewModel.data );
    let subLocationTabs = buildSublocationTabs( visiblePages );
    return getUpdatedSublocTabsAndActiveTab( subLocationTabs );
};

const getUpdatedSublocTabsAndActiveTab = subLocationTabs => {
    let localSublocTabs = Array.from( subLocationTabs );
    const stateParams = AwStateService.instance.params;
    let tabId = getMatchingTabIndex( stateParams.pageId, stateParams.page, localSublocTabs );
    //If no tabs are valid force selection of first tab
    tabId = tabId === -1 ? 0 : tabId;
    localSublocTabs = _.map( localSublocTabs, ( tab, idx ) => {
        idx === tabId ? tab.selectedTab = true : tab.selectedTab = false;
        return tab;
    } );
    return {
        activeTab: localSublocTabs[ tabId ],
        updatedSubLocationTabs: localSublocTabs
    };
};
