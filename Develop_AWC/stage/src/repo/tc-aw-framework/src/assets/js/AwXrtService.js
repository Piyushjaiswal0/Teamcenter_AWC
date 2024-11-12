// Copyright (c) 2021 Siemens
import AwTabContainer from 'viewmodel/AwTabContainerViewModel';
import AwTab from 'viewmodel/AwTabViewModel';
import AwXrt2 from 'viewmodel/AwXrt2ViewModel';
import AwSwaXrt from 'viewmodel/AwSwaXrtViewModel';
import AwCopyOptions from 'viewmodel/AwCopyOptionsViewModel';
import xrtParserService from 'js/xrtParser.service';
import AwPromiseService from 'js/awPromiseService';
import editHandlerService from 'js/editHandlerService';
import tcColumnUtils from 'js/tcColumnUtils';
import { registerDynImportEntry } from 'js/moduleLoader';
import logger from 'js/logger';
import _ from 'lodash';
import xrtUtils from 'js/xrtUtilities';
import appCtxService from 'js/appCtxService';


// revisitme: This change is just a workaround. Since there is no deps for xrtUtilities in client View model JSON
// and getDeclarativeStylesheet returns it as deps, the dynamic load fails
registerDynImportEntry( 'js/xrtUtilities', () => import( 'js/xrtUtilities' ) );

export const m_editHandlerContextConstant = {
    INFO: 'INFO_PANEL_CONTEXT',
    SUMMARY: 'NONE',
    CREATE: 'CREATE_PANEL_CONTEXT',
    REVISE: 'REVISE_PANEL_CONTEXT',
    SAVEAS: 'SAVEAS_PANEL_CONTEXT'
};

const HTMLPANEL_ENABLE_RESIZE = 'aw-xrt-htmlPanelEnableResize';

const switchTabSelection = ( id, tabTitle, xrtPages, dispatch, data, type, vmo, objectType, context, reviseSaveAsInfo ) => {
    if( type === 'CREATE' ) {
        return;
    }

    let tabToSelect = xrtPages.filter( function( tab ) {
        return tab.pageId === id || tab.name === tabTitle;
    } )[ 0 ];
    const selectedTabTitle = tabToSelect && tabToSelect.tabKey ? tabToSelect.tabKey : tabToSelect.name;
    if( !tabToSelect ) {
        //User clicked a tab that isn't there - something is broken
        logger.error( 'Tab with title ' + tabTitle + ' or id ' + id + ' not found.' );
    }
    if( selectedTabTitle !== data.lastActivePageTitle ) {
        let objectTypeIn = objectType ? '_' + objectType : '';
        const editHandler = editHandlerService.getEditHandler( m_editHandlerContextConstant[ type ] + objectTypeIn );
        if( editHandler && !editHandler.editInProgress().editInProgress ) {
            populateVisibleXrtTabsAndData( vmo, selectedTabTitle, type, null, context, reviseSaveAsInfo, editHandler ).then(
                ( { childTabs, activeTabContent, extraInfo } ) => {
                    dispatch( { path: 'data', value: { xrtPages: childTabs, xrtData: activeTabContent, vmo, extraInfo } } );
                }
            );
        } else {
            //Make sure any edits are finished
            editHandlerService.leaveConfirmation().then( () => {
                populateVisibleXrtTabsAndData( vmo, selectedTabTitle, type, null, context, reviseSaveAsInfo ).then(
                    ( { childTabs, activeTabContent, extraInfo } ) => {
                        dispatch( { path: 'data', value: { xrtPages: childTabs, xrtData: activeTabContent, vmo, extraInfo } } );
                    }
                );
            } );
        }
    }
};

export const awXrtRenderFunction = ( { subPanelContext, viewModel, type, objectType, vmo, xrtState, reviseSaveAsInfo,
    activeState, editContextKey } ) => {
    let typeIn = type ? type : 'SUMMARY';
    const reloadCurrentXRT = ( ) => {
        return subPanelContext.api( subPanelContext.activeTab.pageId, subPanelContext.activeTab.tabKey, true );
    };

    const { dispatch, data } = viewModel;

    const enableResizeCallback = ( stateValue ) => {
        dispatch( { path: 'data.isEnableResize', value: { stateValue } } );
    };

    let scrollClassName = 'aw-base-scrollPanel';
    if ( data.isEnableResize.stateValue ) {
        scrollClassName += ' ' + HTMLPANEL_ENABLE_RESIZE;
    }

    if( subPanelContext && typeIn === 'SUMMARY' ) {
        let xrtContext = subPanelContext.context && subPanelContext.context.searchState && subPanelContext.context.searchState.xrtContext ?
            subPanelContext.context.searchState.xrtContext : null;

        let editContextKeyIn = editContextKey ? editContextKey : 'NONE';
        if( subPanelContext.context && subPanelContext.context.customEditContext ) {
            editContextKeyIn = subPanelContext.context.customEditContext;
        }

        return subPanelContext.activeTab && subPanelContext.activeTab.tabContent ?
            <div className={scrollClassName}>
                <div className='sw-column aw-layout-wrap flex-shrink'>
                    <AwSwaXrt type='SUMMARY' callback={reloadCurrentXRT} xrtData={subPanelContext.activeTab.tabContent}
                        selectionData={subPanelContext.selectionData} subPanelContext={subPanelContext}
                        enableResizeCallback={enableResizeCallback}
                        objectType={objectType} vmo={subPanelContext.selection[0]}
                        xrtContext={xrtContext} objectsetInfo={subPanelContext.activeTab.extraInfo}
                        editContextKey={editContextKeyIn}></AwSwaXrt>
                </div>
            </div> : null;
    }

    if( data.xrtPages ) {
        const context = subPanelContext && subPanelContext.context ? subPanelContext.context : null;
        const api = ( id, tabTitle ) => {
            switchTabSelection( id, tabTitle, data.xrtPages, dispatch, data, typeIn, vmo, objectType, context, reviseSaveAsInfo );
        };
        let showTabContainer =  !( typeIn === 'SAVEAS' || typeIn === 'REVISE' || typeIn === 'CREATE' );
        if( showTabContainer ) {
            return <div className='aw-xrt-summaryContainer'>
                <div className='aw-xrt-tabsContainer aw-layout-flexColumn'>
                    <AwTabContainer tabsModel={data.xrtPages} callback={api} tabSetId='secondary'>
                        <AwTab tabModel='tab' aw-repeat='tab: data.xrtPages'></AwTab>
                    </AwTabContainer>
                </div>
                <div className={scrollClassName}>
                    <div className='sw-column aw-layout-wrap'>
                        <AwXrt2 type={typeIn} callback={reloadCurrentXRT} xrtData={data.xrtData}
                            subPanelContext={subPanelContext} xrtState={xrtState}
                            objectType={objectType} enableResizeCallback={enableResizeCallback} vmo={vmo}
                            activeState={activeState} objectsetInfo={data.extraInfo}></AwXrt2>
                    </div>
                </div>
            </div>;
        }
        if( typeIn === 'SAVEAS' && xrtState.copyOptions ) {
            return <div className='aw-xrt-summaryContainer'>
                <div className={scrollClassName}>
                    <div className='sw-column aw-layout-wrap'>
                        <AwXrt2 type={typeIn} callback={reloadCurrentXRT} xrtData={data.xrtData}
                            subPanelContext={subPanelContext} xrtState={xrtState}
                            objectType={objectType} enableResizeCallback={enableResizeCallback}
                            activeState={activeState}></AwXrt2>
                        <AwCopyOptions copyOptions={xrtState.copyOptions} xrtState={xrtState}></AwCopyOptions>
                    </div>
                </div>
            </div>;
        }
        return <div className='aw-xrt-summaryContainer'>
            <div className={scrollClassName}>
                <div className='sw-column aw-layout-wrap'>
                    <AwXrt2 type={typeIn} callback={reloadCurrentXRT} xrtData={data.xrtData}
                        subPanelContext={subPanelContext} xrtState={xrtState}
                        objectType={objectType} enableResizeCallback={enableResizeCallback}
                        activeState={activeState}></AwXrt2>
                </div>
            </div>
        </div>;
    }
};

/**
 * XRT wrapper used to load SWA tabs for XRT
 *
 * @param {Object} selectedObject Selected object
 * @param {Object} activeTab Currently active tab
 * @param {Object} context subPanelContext
 * @param {String} isContributedTab is contributed tab
 * @returns {Promise<Object>} loaded tabs
 */
export const loadXrtDataForTab = async( selectedObject, activeTab, context = {}, isContributedTab ) => {
    return loadXrtData( selectedObject, activeTab, undefined, undefined, context, undefined, isContributedTab );
};

export const loadXrtData = async( selectedObject, activeTab, type, objectType, context = {}, reviseSaveAsInfo, isContributedTab ) => {
    let xrtContext = context && context.searchState && context.searchState.xrtContext || context && context.xrtContext || {};
    let typeIn = type;
    let activePageTitle = activeTab;
    if( !typeIn ) {
        typeIn = 'SUMMARY';
    }
    if( typeof activeTab === 'object' ) {
        if( activeTab.page ) {
            activePageTitle = activeTab.page.titleKey ? activeTab.page.titleKey : activeTab.page.displayTitle;
        } else {
            activePageTitle = '';
        }
    }
    const locationCtx = appCtxService.getCtx( 'locationContext' );
    if ( locationCtx && locationCtx['ActiveWorkspace:Location'] === 'com.siemens.splm.clientfx.tcui.xrt.showObjectLocation'
        && locationCtx[ 'ActiveWorkspace:SubLocation' ] === 'com.siemens.splm.clientfx.tcui.xrt.objectNavigationSubLocation' ) {
        xrtUtils.updateRedLineMode();
    }

    const response = await xrtParserService.getDeclStyleSheet( typeIn, activePageTitle, selectedObject, objectType, undefined, xrtContext, reviseSaveAsInfo, isContributedTab );
    let xrtData = JSON.parse( response.declarativeUIDefs[ 0 ].viewModel );

    // since data is shared between table/list/compare for objectSet setting, manually set attributesToInflate
    _.forEach( xrtData.dataProviders, function( dataProvider ) {
        if( dataProvider && dataProvider.action &&
            xrtData.actions[ dataProvider.action ] &&
            xrtData.actions[ dataProvider.action ].inputData &&
            xrtData.actions[ dataProvider.action ].inputData.searchInput ) {
            let searchInput = xrtData.actions[ dataProvider.action ].inputData.searchInput;

            let colProviders = Object.keys( xrtData.columnProviders ).map( function( i ) {
                return xrtData.columnProviders[ i ];
            } );
            let columnAttrsMap = colProviders
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

            let columnAttrs = Object.keys( columnAttrsMap );
            if( searchInput.attributesToInflate ) {
                searchInput.attributesToInflate = _.union( searchInput.attributesToInflate,
                    columnAttrs );
            } else {
                searchInput.attributesToInflate = columnAttrs;
            }
        }
    } );
    Object.values( xrtData.dataProviders ).forEach( ( dp ) => {
        dp.inputData = {
            selectionData: '{{subPanelContext.selectionData}}'
        };
    } );

    Object.values( xrtData.functions ).forEach( ( fn ) => {
        if( fn.functionName === 'getActiveWorkspaceXrtContext' ) {
            fn.parameters = [ '{{props.xrtContext}}', '{{xrtState.value.customContext}}' ];
        }
    } );

    xrtData.data.operationName = 'Edit';
    xrtData.data.xrtType = typeIn;
    xrtData.data._selectedObject = selectedObject; //revisitMe

    if( ( typeIn === 'SAVEAS' || typeIn === 'REVISE' ) && selectedObject ) {
        xrtData.data.owningObjUid = selectedObject.uid;
        if( typeIn === 'SAVEAS' ) {
            xrtData.data.operationName = 'SaveAs';
        }
        if( typeIn === 'REVISE' ) {
            xrtData.data.operationName = 'Revise';
        }
    }

    let activePages = xrtData.data._pages.filter( page => {
        return page.selected === true;
    } );
    xrtData.data._activePageTitle = _.get( activePages[ 0 ], 'titleKey' ) ? _.get( activePages[ 0 ], 'titleKey' ) : _.get( activePages[ 0 ], 'title' ); //revisitMe
    let visibleXrtTabs = constructVisibleTabs( xrtData );
    let headerProps =  _.get( xrtData, 'data._headers' ) || [];
    // Add compare grid to the grids info from server. Compare is always a client side implementation which uses table grid info and compare grid options like transpose.
    _.forEach( xrtData.grids, function( grid ) {
        if ( grid.dataProvider ) {
            xrtData.grids[ grid.dataProvider + '_compare'] = _.cloneDeep( grid );
        }
    } );

    let extraInfo = {};
    if( selectedObject ) {
        extraInfo.firstPage = xrtUtils.buildVMOsForObjectSet( selectedObject.uid, xrtData.data.objects );
    }

    return { childTabs: visibleXrtTabs, activeTabContent: xrtData, extraInfo, headerProps : headerProps };
};

export const populateVisibleXrtTabsAndData = ( selectedObject, activePageTitle, type, objectType, context, reviseSaveAsInfo, editHandler ) => {
    if( !selectedObject && !objectType ) {
        return AwPromiseService.instance.reject( 'No MO provided' );
    }

    if( editHandler && ( type === 'INFO' || type === 'SUMMARY' ) ) {
        return editHandler.leaveConfirmation().then( () => {
            return loadXrtData( selectedObject, activePageTitle, type, objectType, context, reviseSaveAsInfo );
        } );
    }

    return loadXrtData( selectedObject, activePageTitle, type, objectType, context, reviseSaveAsInfo );
};

const constructVisibleTabs = function( xrtData ) {
    return xrtParserService.getDeclVisiblePages( xrtData.data ).map(
        function( page ) {
            return {
                //Tab requirements
                displayTab: true,
                name: page.displayTitle,
                pageId: page.titleKey,
                selectedTab: page.selected,
                tabKey: page.titleKey,
                //XRT specific data
                page: page,
                api: loadXrtData,
                view: 'AwXrt'
            };
        } );
};

export const removeEditHandler = ( type ) => {
    editHandlerService.removeEditHandler( m_editHandlerContextConstant[ type ] );
};
