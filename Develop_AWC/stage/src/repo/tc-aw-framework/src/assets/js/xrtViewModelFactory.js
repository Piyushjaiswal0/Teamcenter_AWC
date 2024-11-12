// Copyright (c) 2022 Siemens

/**
 * @module js/xrtViewModelFactory
 */
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import viewModelService from 'js/viewModelService';
import editHandlerFactory from 'js/editHandlerFactory';
import editHandlerService from 'js/editHandlerService';
import dataSourceService from 'js/dataSourceService';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import logger from 'js/logger';
import awDragAndDropUtils from 'js/awDragAndDropUtils';

/**
 * Xrt view model counter used for ID generation
 */
var xrtViewModelCount = 0;

/**
 * Type to edit handler context map
 */
var editHandlerContextConstant = {
    INFO: 'INFO_PANEL_CONTEXT',
    SUMMARY: 'NONE'
};

/**
 * Static policy to use for XRT.
 *
 * Embedded in file as it needs to be registered within the activate / deactivate of the xrt view model which cannot
 * have any sort of async behavior
 */
var staticPolicy = {
    types: [ {
        name: 'BusinessObject',
        properties: [ {
            name: 'awp0CellProperties'
        } ]
    },

    {
        name: 'BOMLine',
        properties: [ {
            name: 'bl_revision'
        } ]
    },

    {
        name: 'Awp0XRTObjectSetRow',
        properties: [ {
            name: 'awp0Target'
        },

        {
            name: 'awp0IsCutAllowed'
        },

        {
            name: 'awp0Primary'
        },

        {
            name: 'awp0Relation'
        },

        {
            name: 'awp0Secondary'
        },

        {
            name: 'awp0RelationTypeName'
        },

        {
            name: 'awp0RelationTypeDisplayName'
        },

        {
            name: 'awp0RefPropertyName'
        }
        ]
    },

    {
        name: 'CreateInput',
        modifiers: [ {
            name: 'includeIsModifiable',
            Value: 'true'
        } ]
    },

    {
        name: 'TC_Project',
        properties: [ {
            name: 'project_id'
        },

        {
            name: 'project_name'
        }
        ]
    },

    {
        name: 'ADA_License',
        properties: [ {
            name: 'object_name'
        } ]
    }
    ]
};

let exports = {};

/**
 * Native xrt view model container. Contains the view and view model for a single XRT page along with
 * standard setup methods.
 */
var XrtViewModelContainer = function( declViewModel, view, jsonData, type, commandIds ) {
    var self = this;

    /**
     * View model id. Should only be used for debugging purposes
     */
    self._id = ++xrtViewModelCount;

    /**
     * The page currently rendered in this view model
     */
    self.renderedPage = declViewModel._pages ? declViewModel._pages.filter( function( page ) {
        return page.selected;
    } )[ 0 ] : null;

    /**
     * The declarative view model
     */
    self.viewModel = declViewModel;

    /**
     * The declarative view
     */
    self.view = view;

    /**
     * Dynamic commands this view model has manually inserted into command service
     */
    var dynamicCommands = [];

    /**
     * Id of the property policy that is registered (comes from XRT)
     */
    var policyId = null;

    /**
     * Id of the property policy that is registered (static policy on client)
     */
    var staticPolicyId = null;

    /**
     *
     */
    var xrtSummaryContext = 'xrtSummaryContextObject';

    /**
     * Create an edit handler for the view model
     */
    var addEditHandler = function() {
        if( editHandlerContextConstant[ type ] ) {
            declViewModel._internal.editContext = editHandlerContextConstant[ type ];
            var editHandler = editHandlerFactory.createEditHandler( dataSourceService
                .createNewDataSource( {
                    declViewModel: declViewModel
                } ) );
            if( editHandler ) {
                editHandlerService.setEditHandler( editHandler, editHandlerContextConstant[ type ] );
                // Only set as active if the current edit handler is not in edit mode
                if( !editHandlerService.editInProgress().editInProgress ) {
                    editHandlerService.setActiveEditHandlerContext( editHandlerContextConstant[ type ] );
                }
            }
        }
    };

    /**
     * Remove the existing edit handler
     */
    var removeEditHandler = function() {
        if( editHandlerContextConstant[ type ] ) {
            var editHandler = editHandlerService.getEditHandler( editHandlerContextConstant[ type ] );
            if( editHandler ) {
                editHandler.leaveConfirmation().then( function() {
                    editHandlerService.removeEditHandler( editHandlerContextConstant[ type ] );
                } );
            }
        }
    };

    var registerViewModel = function( register ) {
        if( declViewModel.vmo && register ) {
            appCtxService.registerCtx( xrtSummaryContext, declViewModel.vmo );
        } else if( !register ) {
            appCtxService.unRegisterCtx( xrtSummaryContext );
        }
    };

    /**
     * Activate the view model - setup edit handlers, insert dynamic commands, etc
     */
    self.activate = function() {
        //Setup edit handler
        addEditHandler();

        // register the ViewModel in app context
        registerViewModel( true );
    };

    /**
     * Deactivate the view model - remove edit handlers, dynamic commands, etc
     */
    self.deactivate = function() {
        removeEditHandler();

        // unregister the ViewModel in app context
        registerViewModel( false );
    };

    /**
     * Destroy this xrt view model - cleans up the internal decl view model
     */
    self.destroy = function() {
        declViewModel._internal.destroy( true );
    };
};

/**
 * Create xrt view model from decl view model
 */
var XrtViewModel = function( declViewModel, type ) {
    var self = this;

    var dataSource = dataSourceService.createNewDataSource( {
        declViewModel: declViewModel
    } );

    self.getProperty = function( propName ) {
        var vmo = self.getObject();
        if( vmo ) {
            return vmo.props[ propName ];
        }
        return null;
    };

    self.getDataBindValue = function( propName ) {
        var vmp = self.getProperty( propName );
        return vmp.propertyName;
    };

    self.getDataBoundPropVal = function( propName ) {
        if( declViewModel ) {
            return declViewModel[ propName ];
        }
    };

    self.getAllModifiedProperties = function() {
        return dataSource.getAllModifiedProperties();
    };

    self.getAllModifiedOrAutoAssignableProperties = function() {
        var modProps = dataSource.getAllModifiedProperties();
        var assignableProps = dataSource.getAllAutoAssignableProperties();

        return _.union( modProps, assignableProps );
    };

    self.getAllEditableProperties = function() {
        return dataSource.getAllEditableProperties();
    };

    self.getObjectToRender = function() {
        var mo = null;
        if( declViewModel.vmo && declViewModel.vmo.uid ) {
            mo = cdm.getObject( declViewModel.vmo.uid );
        }

        return mo;
    };

    self.getViewModelObject = function() {
        return declViewModel.vmo;
    };

    self.getXRTType = function() {
        return type;
    };

    self.getVisiblePages = function() {
        return declViewModel._pages;
    };

    self.getObject = function() {
        var mo = null;
        if( declViewModel.vmo && declViewModel.vmo.uid ) {
            mo = cdm.getObject( declViewModel.vmo.uid );
        }

        return mo;
    };

    self.resetUpdates = function() {
        dataSource.resetUpdates();
    };

    self.replaceValuesWithNewValues = function() {
        dataSource.replaceValuesWithNewValues();
    };

    self.replaceValuesWithNewValues = function( propArr ) {
        dataSource.replaceValuesWithNewValues( propArr );
    };

    self.getAllCollections = function() {
        return dataSource.getAllCollectionsAndPropertyNames();
    };

    self.getCollection = function( dataBindValue ) {
        return dataSource.getCollectionAndPropertyNames( dataBindValue );
    };

    self.getCollectionKeys = function() {
        return dataSource.getCollectionKeys();
    };
};

/**
 * Create XRT element data
 *
 * @param {Object} declViewModel - declarative view model
 * @return xrt element data retrieving it from declarative view model
 */
export let _createXRTElementData = function( declViewModel ) {
    //TODO: What is this?
    return {};
};

/**
 * Create XRT view model similar to APIs matching IXRTViewModel
 *
 * @param {Object} declViewModel - declarative view model
 * @param {String} type - xrt type
 * @return xrt view model retrieving it from declarative view model
 */
export let _createXRTViewModel = function( declViewModel, type ) {
    return new XrtViewModel( declViewModel, type );
};

/**
 * Process stylesheet response and create xrt view model
 */
export let buildXrtViewModel = function( type, vmo, targetPage, data, commandIds ) {
    //Ensure some XRT data was returned
    if( _.isEmpty( data.declarativeUIDefs ) ) {
        logger.error( 'No declarative definition retrieved from XRT', type, vmo, data );
        return AwPromiseService.instance.when();
    }

    //Try to parse into JSON
    var jsonData = {};

    try {
        jsonData = JSON.parse( data.declarativeUIDefs[ 0 ].viewModel );
    } catch ( e ) {
        logger.error( 'Unable to parse retrieved XRT: ' + data.declarativeUIDefs[ 0 ].viewModel );
        return AwPromiseService.instance.when();
    }

    /** Manual JSON processing * */
    //TODO: Target page may not have been in XRT - should extract from _pages instead
    //The operation name is required for view model processing
    //TODO: why?
    var operationName = type;

    if( type === 'INFO' || type === 'SUMMARY' ) {
        operationName = 'Edit';
    }

    if( type === 'SAVEAS' ) {
        operationName = 'SaveAs';
    }

    jsonData.data.operationName = operationName;
    jsonData.data.xrtType = type;

    // For 'SAVEAS' type, owningObjUid needs to be set for LOVs
    if( type === 'SAVEAS' && vmo ) {
        jsonData.data.owningObjUid = vmo.uid;
    }

    if( targetPage ) {
        jsonData._viewModelId = targetPage;
    } else {
        jsonData._viewModelId = type;
    }

    jsonData._viewModelId += ':';
    jsonData._viewModelId += operationName;

    jsonData.skipClone = true;

    /** Manual JSON processing * */

    //TODO: It may be better for aw-xrt-2 to populate the view model when it is given a view model json
    //This would mean the XRTViewModelContainer returned by this does not have to be destroyed which lowers the chance of memory leaks
    //Also makes this method sync instead of async
    return viewModelService.populateViewModelPropertiesFromJson( jsonData, null, targetPage ).then(
        function( declViewModel ) {
            /** Manual view model processing * */
            declViewModel.xrtData = {
                xrtViewModel: exports._createXRTViewModel( declViewModel, type ),
                xrtElement: exports._createXRTElementData( declViewModel )
            };

            declViewModel.gwtPresenters = [];
            declViewModel.baseselection = vmo;

            //TODO: should vmo be modified? xrt type not really part of VMO
            if( declViewModel.vmo ) {
                declViewModel.vmo.xrtType = type;
            }
            /*
            * Drag and drop handlers processing
            */
            awDragAndDropUtils.attachDragAndDropHandlers( declViewModel );
            /** Manual view model processing * */

            return new XrtViewModelContainer( declViewModel, data.declarativeUIDefs[ 0 ].view, jsonData,
                type, commandIds );
        },
        function( error ) {
            logger.error( 'Failed to resolve declarative view model converted from XRT, type: ', type,
                error );
            return AwPromiseService.instance.when();
        } );
};

export default exports = {
    _createXRTElementData,
    _createXRTViewModel,
    buildXrtViewModel
};
