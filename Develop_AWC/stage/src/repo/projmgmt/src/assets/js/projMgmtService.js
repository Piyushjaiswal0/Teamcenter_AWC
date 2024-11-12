// Copyright (c) 2022 Siemens

/**
 * @module js/projMgmtService
 */
import uwPropSvc from 'js/uwPropertyService';
import localStrg from 'js/localStorage';
import localeService from 'js/localeService';
import appCtxService from 'js/appCtxService';
import cmm from 'soa/kernel/clientMetaModel';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import searchFilterService from 'js/aw.searchFilter.service';
import AwStateService from 'js/awStateService';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import awSearchService from 'js/awSearchService';
import tableSvc from 'js/published/splmTablePublishedService';

var exports = {};

var _columnDefns = [];
var localTextBundle;
const PROJECT_SESSION_OUT_LISTENER = 'projectSessionOutListener';
/**
 * Load the column configuration
 *
 * @param {Object} dataprovider - the data provider
 *
 */
function initColumns() {
    var projMgmtTextBundle = _getLocalTextBundle();
    _columnDefns = [ {
        name: 'icon',
        displayName: '',
        maxWidth: 30,
        minWidth: 30,
        width: 30,
        enableColumnMenu: false,
        pinnedLeft: true
    }, {
        propertyName: 'object_string',
        typeName: 'TC_Project',
        isTableCommand: true,
        modifiable: false
    }, {
        propertyName: 'object_name',
        typeName: 'TC_Project'
    }, {
        propertyName: 'project_id',
        typeName: 'TC_Project'
    }, {
        propertyName: 'fnd0ProjectCategory',
        typeName: 'TC_Project'
    }, {
        propertyName: 'is_active',
        typeName: 'TC_Project'
    }, {
        propertyName: 'use_program_security',
        displayName : projMgmtTextBundle.useProgramSecurity,
        typeName: 'TC_Project',
        renderingHint: 'triState',
        cellRenderers:[ securityCellRenderer() ]
    }, {
        propertyName: 'owning_user',
        typeName: 'WorkspaceObject'
    }
    ];
}

/**
 * Show use_program_security boolean property as listbox.
 */
let securityCellRenderer = () => {
    return {
        action: function( column, vmo, tableElem, rowElem ) {
            // Create root element
            var newProp = updateSecurityProp( vmo.props[column.field] );
            vmo.props[column.field] = newProp;
            const cellContent = tableSvc.createElement( column, vmo, tableElem, rowElem );
            // Apply onClick listener to handle editing
            cellContent.onclick = function() {
                var updatedProp = updateSecurityProp( vmo.props[column.field] );
                vmo.props[column.field] = updatedProp;
            };
            return cellContent;
        },
        condition: function( column, vmo, tableElem, rowElem ) {
            return true;
        }
    };
};
/**
 * Load the column configuration
*/
export let loadColumns = function(  ) {
    if( _.isEmpty( _columnDefns ) ) {
        initColumns();
        var type = cmm.getType( 'TC_Project' );
        _.forEach( _columnDefns, function( columnDef ) {
            if( type && type.propertyDescriptorsMap[ columnDef.name ] && !columnDef.displayName ) {
                columnDef.displayName = type.propertyDescriptorsMap[ columnDef.name ].displayName;
            }
        } );
    }
    return {
        columnConfig : {
            columns: _columnDefns
        }
    };
};

export let getSortCriteria = function( sortCriteria ) {
    var criteria = _.clone( sortCriteria );
    if( !_.isEmpty( criteria ) &&  criteria[ 0 ].fieldName.indexOf( '.' ) === -1  ) {
        criteria[ 0 ].fieldName = 'ItemRevision.' + criteria[ 0 ].fieldName;
    }

    return criteria;
};

/**
 * registerSignOutListener - to clear the table expansion state
 */
export let registerSignOutListener = function(  ) {
    //registerSignOutListener - to clear the table expansion state of project team members
    if( !appCtxService.getCtx( PROJECT_SESSION_OUT_LISTENER ) ) {
        appCtxService.registerCtx( PROJECT_SESSION_OUT_LISTENER, eventBus.subscribe( 'session.signOut', function() {
            let allLocalStates = localStrg.get( 'awTreeTableState' );
            let allLocalStatesJson = JSON.parse( allLocalStates );
            var projectTeamTableTree = 'Aut0ProjectTeamTableTree';

            if( allLocalStatesJson[projectTeamTableTree] ) {
                delete allLocalStatesJson[ projectTeamTableTree ];
            }
            let stringToPersist = JSON.stringify( allLocalStatesJson );

            localStrg.publish( 'awTreeTableState', stringToPersist );
            let _sessionOutListener = appCtxService.getCtx( PROJECT_SESSION_OUT_LISTENER );
            if( _sessionOutListener ) {
                eventBus.unsubscribe( _sessionOutListener );
                appCtxService.unRegisterCtx( PROJECT_SESSION_OUT_LISTENER );
            }
        }
        ) );
    }
};

export const getSearchContext = ( searchContext )=>{
    if( !searchContext.criteria || AwStateService.instance.params.uid ) {
        searchContext.criteria = {};
    }
    var criteria = '';
    if( AwStateService.instance.params.uid ) {
        var mo = cdm.getObject( AwStateService.instance.params.uid );
        if( mo ) {
            var wsoType = cmm.getType( 'WorkspaceObject' );
            var projList = wsoType.propertyDescriptorsMap.project_list;
            var projId = mo.props.awp0CellProperties.uiValues[ 0 ];
            var index = projId.indexOf( ':' );
            projId =  index === -1 ? projId : projId.substring( index + 1, projId.length );

            criteria = '"' + projList.displayName + '":"' + projId + '"';
            AwStateService.instance.params.searchCriteria = criteria;
            var locationCtx = appCtxService.getCtx( 'location.titles' );
            if( locationCtx ) {
                locationCtx.headerTitle = projId;
                appCtxService.updateCtx( 'location.titles', locationCtx );
            }
        }
        searchContext.criteria.searchString = criteria;
    }
    return AwPromiseService.instance.when( searchContext );
};

export const getSubPanelContextData = ( provider ) => {
    let searchContext = searchFilterService.buildSearchFilters( provider.context );
    return getSearchContext( searchContext ).then( function( updatedSearchContext ) {
        provider.context.search.criteria = updatedSearchContext.criteria;
        return provider;
    } );
};


/**
 * gets local text bundle
 * @returns {Object} text bundle
 */
var _getLocalTextBundle = function() {
    if( !localTextBundle ) {
        var resource = 'ProjmgmtConstants';
        localTextBundle = localeService.getLoadedText( resource );
    }
    return localTextBundle;
};

/**
 * This method is to render the "Use Program Security" as radio button
 * Security :  O Project    O Program
 *
 * Once saved display as , Security : Project
 *
 * @param {prop} securityProp property from selected object
 */
export let changeUseProgramSecurityDisplay = function( xrtState ) {
    let newXrtState = { ...xrtState.getValue() };
    let newSecurityProp = { ...newXrtState.xrtVMO.props.useProgramSecurity };
    newSecurityProp = updateSecurityProp( newSecurityProp );
    newXrtState.xrtVMO.props.useProgramSecurity = newSecurityProp;
    xrtState.update( newXrtState );
};

/**
 * This method will make the Visible property as uneditable if the "active" is true.
 * "Active & Invisible" is not correct option.Restrict the user to save this combination.
 * @param {data} data appCtxContext object
 */
export let changeActiveVisible = function( xrtState ) {
    let newXrtState = { ...xrtState.getValue() };
    let newIsVisibleProp = { ...newXrtState.xrtVMO.props.isVisible };

    if( newXrtState.xrtVMO.props.isActive.dbValue ) {
        uwPropSvc.setValue( newIsVisibleProp, true );
    }

    newXrtState.xrtVMO.props.isVisible = newIsVisibleProp;
    xrtState.update( newXrtState );
};

export let processOutput = function( data, dataCtxNode, searchData ) {
    awSearchService.processOutput( data, dataCtxNode, searchData );
};

/**
 * This method will make the Visible property as uneditable if the "active" is true.
 * "Active & Invisible" is not correct option.Restrict the user to save this combination.
 * @param {data} data appCtxContext object
 */
export let bindProperties = function( subPanelContext ) {
    let newXrtState = { ...subPanelContext.xrtState.getValue() };
    var newSecurityProp = { ...subPanelContext.selected.props.use_program_security };
    newSecurityProp = updateSecurityProp( newSecurityProp );
    newXrtState.xrtVMO.props.useProgramSecurity = newSecurityProp;
    newXrtState.xrtVMO.props.isActive = subPanelContext.selected.props.is_active;
    newXrtState.xrtVMO.props.isActive.propertyLabelDisplay = 'PROPERTY_LABEL_AT_SIDE';
    newXrtState.xrtVMO.props.isVisible = subPanelContext.selected.props.is_visible;
    newXrtState.xrtVMO.props.isVisible.propertyLabelDisplay = 'PROPERTY_LABEL_AT_SIDE';
    subPanelContext.xrtState.update( newXrtState );
};


export let updateSecurityProp = function( prop ) {
    var localeTextBundle = _getLocalTextBundle();
    var newSecurityProp = { ...prop };
    newSecurityProp.propertyRadioFalseText = localeTextBundle.projectRadioLabel;
    newSecurityProp.propertyRadioTrueText = localeTextBundle.programRadioLabel;
    uwPropSvc.setPropertyDisplayName( newSecurityProp, localeTextBundle.useProgramSecurity );
    var viewMode = appCtxService.getCtx( 'ViewModeContext' );
    if ( viewMode.ViewModeContext === 'TableView' || viewMode.ViewModeContext === 'TableSummaryView' ) {
        uwPropSvc.setPropertyDisplayName( newSecurityProp, '' );
    }
    if( newSecurityProp.dbValue ) {
        newSecurityProp.uiValues = [ localeTextBundle.programRadioLabel ];
    } else if( newSecurityProp.dbValue === false ) {
        newSecurityProp.uiValues = [ localeTextBundle.projectRadioLabel ];
    }
    newSecurityProp.uiValue = newSecurityProp.uiValues[0];
    newSecurityProp.isEditable = true;
    return newSecurityProp;
};

/**
 * This method will update the search state with given variable.
 * @param {eventData} searchState  subpanelContext searchState, projectsPrivileged value
 *
 */
export let updateSearchState = function( eventData ) {
    if( eventData.searchState ) {
        let newSearchState = { ...eventData.searchState.value };

        if( eventData.value ) {
            for( const key of Object.keys( eventData.value ) ) {
                newSearchState[ key ] = eventData.value[ key ];
            }
        }

        if( eventData.searchState.update ) {
            eventData.searchState.update( newSearchState );
        }
    }
};

/**
 * This method will check command visibility condition to support add team members to the multiple projects
 * return true if any of the project is privileged.
 * @param {response} response  from getPrivilegeInProjects soa
 * @param {subPanelContext} subPanelContext  for selection data
 *
 */
export let isProjectPrivilege = function( response, selectionData ) {
    if( selectionData.length > 1 ) {
        for ( var i = 0; i < response.projectPrivilege.length; i++ ) {
            if( response.projectPrivilege[i].privilege === 3 || response.projectPrivilege[i].privilege === 2 ) {
                return true;
            }
        }
    }
    return false;
};


export default exports = {
    loadColumns,
    getSortCriteria,
    registerSignOutListener,
    getSubPanelContextData,
    changeActiveVisible,
    changeUseProgramSecurityDisplay,
    bindProperties,
    processOutput,
    updateSecurityProp,
    isProjectPrivilege,
    updateSearchState
};
