// Copyright (c) 2021 Siemens
import AwInclude from 'viewmodel/AwIncludeViewModel';
import AwFrame from 'viewmodel/AwFrameViewModel';
import xrtHtmlPanelSvc from 'js/xrtHtmlPanelService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import cdm from 'soa/kernel/clientDataModel';
import dataSourceService from 'js/dataSourceService';
import { isEmpty, get } from 'lodash';
import { initDataProviderRef } from 'js/xrtUtilities';


const REGEX_DATABINDING = /({{)([a-zA-Z0-9$._\s:\[\]\']+)(}})/;
const GLOBAL_REGEX_DATABINDING = /({{)([a-zA-Z0-9$._\s:\[\]\']+)(}})/g;

const addContainerResizeCSS = function( enableResizeCallback, enableresize ) {
    if( enableresize && enableResizeCallback ) {
        enableResizeCallback( true );
    }
};

const cleanUpResizeCSS = function( enableResizeCallback, enableresize ) {
    if( enableresize && enableResizeCallback ) {
        enableResizeCallback( false );
    }
};

/**
 * @param {ViewModelObject} parentVMO - VMO to access
 * @param {String} propName - Name of the property to on parent to access for results.
 *
 * @return {HtmlPanelModelObject} New object representing the CDM modelObject at the given property (or {}
 *         if no object found at that property)..
 */
const createHtmlPanelModelObject = function( parentVMO, propName ) {
    let propHtmlPanelObj;

    if( parentVMO && parentVMO.props[ propName ] && parentVMO.props[ propName ].hasReadAccess !== false && !isEmpty( parentVMO.props[ propName ].dbValue ) ) {
        let propModelObj = cdm.getObject( parentVMO.props[ propName ].dbValue );

        if( propModelObj ) {
            let vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( propModelObj );

            propHtmlPanelObj = xrtHtmlPanelSvc.createHtmlPanelModelObjectOverlay( vmo );
        } else {
            propHtmlPanelObj = {};
        }
    } else {
        propHtmlPanelObj = {};
    }

    return propHtmlPanelObj;
};


export const initialize = ( enableResizeCallback, htmlpaneldata ) => {
    if( !htmlpaneldata ) {
        return;
    }
    const { enableresize } = htmlpaneldata;
    addContainerResizeCSS( enableResizeCallback, enableresize );
};

export const onUnmount = ( props, getViewModelCollection ) => {
    const { enableResizeCallback, htmlpaneldata, subPanelContext } = props;
    if( !htmlpaneldata ) {
        return;
    }
    const { enableresize, declarativeKey } = htmlpaneldata;
    cleanUpResizeCSS( enableResizeCallback, enableresize );

    if( getViewModelCollection && props.dpRef && props.dpRef.current && props.dpRef.current.dataProviders && props.dpRef.current.dataProviders.includes( getViewModelCollection ) ) {
        let index = props.dpRef.current.dataProviders.indexOf( getViewModelCollection );
        if( index > -1 ) {
            props.dpRef.current.dataProviders.splice( getViewModelCollection, 1 );
        }
    }

    if( subPanelContext && subPanelContext.editHandler ) {
        let dataSource = subPanelContext.editHandler.getDataSource();
        if ( dataSource ) {
            let newViewModel = { ...dataSource.getDeclViewModel() };

            if( newViewModel.customPanelInfo && declarativeKey && newViewModel.customPanelInfo[ declarativeKey ] ) {
                delete newViewModel.customPanelInfo[ declarativeKey ];
                let newDataSource = dataSourceService.createNewDataSource( { declViewModel: newViewModel } );
                subPanelContext.editHandler.setDataSource( newDataSource );
            }
        }
    }
};

export const awWalkerHtmlPanelRenderFunction = ( props ) => {
    const { ctx, htmlpaneldata, subPanelContext, xrtState, elementRefList,
        type, selectionData, dpRef, viewModel, vmo, caption, focusComponent } = props;

    if( !htmlpaneldata ) {
        return;
    }

    const { enableresize, src, declarativeKey } = htmlpaneldata;
    const { userSession } = ctx;
    const userSessionHPMO = xrtHtmlPanelSvc.createHtmlPanelModelObjectOverlay( userSession );
    const userHPMO = createHtmlPanelModelObject( userSession, 'user' );
    const groupHPMO = createHtmlPanelModelObject( userSession, 'group' );
    const roleHPMO = createHtmlPanelModelObject( userSession, 'role' );
    const projectHPMO = createHtmlPanelModelObject( userSession, 'project' );
    const panelRef = elementRefList.get( 'panelRef' );
    const selectedVMO = vmo;

    const updateVMCollectionCallback = function( response ) {
        if( response && response.dataProvider && dpRef ) {
            initDataProviderRef( dpRef );

            let index = dpRef.current.dataProviders.indexOf( response.dataProvider.viewModelCollection.getLoadedViewModelObjects );
            if( index === -1 ) {
                dpRef.current.dataProviders.push( response.dataProvider.viewModelCollection.getLoadedViewModelObjects );
                viewModel.dispatch( { path: 'data.getViewModelCollection', value: response.dataProvider.viewModelCollection.getLoadedViewModelObjects } );
            }
        }
    };

    let vmProps = {};
    if( xrtState.xrtVMO && xrtState.xrtVMO.props ) {
        vmProps = xrtState.xrtVMO.props;
    }

    // Session info needs to be fields not viewModelProperties and support this format: session.current_group.properties.object_string
    const htmlPanelDataCtx = {
        session: {
            current_user_session: userSessionHPMO,
            current_user: userHPMO,
            current_group: groupHPMO,
            current_role: roleHPMO,
            current_project: projectHPMO
        },
        selected: selectedVMO,
        fields: {
            subPanelContext: {
                ...vmProps
            },
            selected: {
                properties: vmProps
            }
        },
        ...subPanelContext,
        selectionData: selectionData,
        callback: {
            updateVMCollectionCallback
        },
        parentRef: panelRef,
        xrtType: type,
        xrtState,
        caption:caption,
        focusComponent
    };

    // to support backward compatibility usage of 'selected.properties'
    if( selectedVMO && selectedVMO.props ) {
        htmlPanelDataCtx.selected.properties = selectedVMO.props;
    }

    let htmlPanelClassName = 'aw-xrtjs-htmlPanelContainer';

    if( enableresize ) {
        htmlPanelClassName += ' h-12';
    }

    if( src ) {
        let interPolatedSrc = src;
        // Evaluate src url interpolations
        const interPolatedVals = src.match( GLOBAL_REGEX_DATABINDING );
        if( interPolatedVals ) {
            interPolatedVals.forEach( val => {
                const result = val.match( REGEX_DATABINDING );
                if( result && result.length === 4 ) {
                    let parsedVal = get( htmlPanelDataCtx, result[ 2 ] );
                    interPolatedSrc = interPolatedSrc.replace( result[0], parsedVal );
                }
            } );
        }

        return <div className={htmlPanelClassName}>
            <div className='aw-jswidgets-htmlPanel'>
                <div className='aw-jswidgets-htmlPanelFrame aw-xrt-columnContentPanel'><AwFrame url={interPolatedSrc}></AwFrame></div>
            </div>
        </div>;
    } else if( declarativeKey ) {
        if( xrtState && xrtState.xrtVMO && xrtState.xrtVMO.uid ) {
            return <div className={htmlPanelClassName} ref={ panelRef }>
                <div className='aw-jswidgets-htmlPanel'>
                    <AwInclude key={xrtState.xrtVMO.uid} className='aw-jswidgets-declarativeKeyCont' subPanelContext={htmlPanelDataCtx} name={declarativeKey}></AwInclude>
                </div>
            </div>;
        }
        return <div className={htmlPanelClassName} ref={ panelRef }>
            <div className='aw-jswidgets-htmlPanel'>
                <AwInclude className='aw-jswidgets-declarativeKeyCont' subPanelContext={htmlPanelDataCtx} name={declarativeKey}></AwInclude>
            </div>
        </div>;
    }
};
