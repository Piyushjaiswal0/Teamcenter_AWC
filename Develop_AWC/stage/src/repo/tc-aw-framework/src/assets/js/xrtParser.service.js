// Copyright (c) 2022 Siemens

/**
 * @module js/xrtParser.service
 */
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import appCtxSvc from 'js/appCtxService';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import viewModelSvc from 'js/viewModelService';
import localeSvc from 'js/localeService';
import xrtViewModelFactory from 'js/xrtViewModelFactory';
import tcCommandVisibilityService from 'js/tcCommandVisibilityService';
import lovService from 'js/lovService';
import $ from 'jquery';
import _ from 'lodash';
import logger from 'js/logger';
import localStorage from 'js/localStorage';

var _xrtObjectPropertyPolicy = {
    types: [ {
        name: 'BusinessObject',
        properties: [ {
            name: 'awp0CellProperties'
        } ]
    }, {
        name: 'BOMLine',
        properties: [ {
            name: 'bl_revision'
        } ]
    }, {
        name: 'Awp0XRTObjectSetRow',
        properties: [ {
            name: 'awp0Target'
        }, {
            name: 'awp0IsCutAllowed'
        }, {
            name: 'awp0Primary'
        }, {
            name: 'awp0Relation'
        }, {
            name: 'awp0Secondary'
        }, {
            name: 'awp0RelationTypeName'
        }, {
            name: 'awp0RelationTypeDisplayName'
        }, {
            name: 'awp0RefPropertyName'
        } ]
    }, {
        name: 'TC_Project',
        properties: [ {
            name: 'project_id'
        },

        {
            name: 'project_name'
        }
        ]
    }, {
        name: 'CreateInput',
        modifiers: [ {
            name: 'includeIsModifiable',
            Value: 'true'
        } ]
    } ]
};

var _saveAsObjectPropertyPolicy = {
    types: [ {
        name: 'WorkspaceObject',
        properties: [ {
            name: 'object_desc'
        },

        {
            name: 'object_name'
        }
        ]
    },

    {
        name: 'ItemRevisionSvAI',
        modifiers: [ {
            name: 'includeIsModifiable',
            Value: 'true'
        } ]
    },

    {
        name: 'ItemSvAI',
        modifiers: [ {
            name: 'includeIsModifiable',
            Value: 'true'
        } ]
    }
    ]
};

var _reviseObjectPropertyPolicy = {
    types: [ {
        name: 'WorkspaceObject',
        properties: [ {
            name: 'object_desc'
        },

        {
            name: 'object_name'
        }
        ]
    },

    {
        name: 'ItemRevision',
        properties: [ {
            name: 'items_tag',
            modifiers: [ {
                name: 'withProperties',
                Value: 'true'
            } ]
        },

        {
            name: 'item_revision_id'
        }
        ]
    },

    {
        name: 'ItemRevisionRevI',
        modifiers: [ {
            name: 'includeIsModifiable',
            Value: 'true'
        } ]
    }
    ]
};

var exports = {};

/**
 *  Toggle redline mode
 */
export let toggleRedLineMode = function() {
    var isRedLineMode = appCtxSvc.getCtx( 'isRedLineMode' );
    if( isRedLineMode === 'true' ) {
        appCtxSvc.registerCtx( 'isRedLineMode', 'false' );
    } else {
        appCtxSvc.registerCtx( 'isRedLineMode', 'true' );
    }
};

/**
 * getVisiblePages
 */
export let getVisiblePages = function( xrtResponseData ) {
    var xrtString = xrtResponseData.output[ 0 ].datasetInfo.datasetContent;
    var localeMap = xrtResponseData.output[ 0 ].localeMap;
    // uses jQuery to parse the XRT String returned from the server
    var xmlDoc = $.parseXML( xrtString );
    var $xml = $( xmlDoc );
    var tempPages = [];

    $xml.find( 'page' ).each( function() {
        var pageNode = $( this );
        var page = {};

        page.pageNameToken = pageNode.attr( 'pageNameToken' );
        page.title = pageNode.attr( 'title' );
        page.titleKey = pageNode.attr( 'titleKey' );

        if( !page.title && page.titleKey ) {
            page.title = localeMap ? localeMap[ page.titleKey ] : null;
        }
        page.visibleWhen = pageNode.attr( 'visibleWhen' );

        var pageIndex = tempPages.length;
        page.visible = xrtResponseData.output[ 0 ].visiblePages[ pageIndex ];
        page.name = page.title;
        page.pageId = pageIndex;
        page.pageIndex = pageIndex;

        tempPages.push( page );
    } );

    return _.filter( tempPages, function( pg ) {
        return pg.visible;
    } );
};

/**
 * getHeaderProperties
 */
export let getHeaderProperties = function( xrtResponseData ) {
    var xrtString = xrtResponseData.output[ 0 ].datasetInfo.datasetContent;
    // uses jQuery to parse the XRT String returned from the server
    var xmlDoc = $.parseXML( xrtString );
    var $xml = $( xmlDoc );

    var xrtRet = [];

    /**
     * Drill down first through pages, then columns, then sections, then properties using visitor pattern.
     */

    $xml.find( 'header' ).each( function() {
        var headerElem = $( this );

        headerElem.find( 'property' ).each( function() {
            var propElem = $( this );
            var xrtProperty = {};
            xrtProperty.name = propElem.attr( 'name' );
            xrtProperty.renderingHint = propElem.attr( 'renderingHint' );
            xrtRet.push( xrtProperty );
        } );
    } );

    return xrtRet;
};

/**
 * Prepare SOA input for xrt (getDeclarativeStyleSheets) call
 *
 * @param{String} type xrt type.
 * @param{String} targetPage.
 * @param{ModelObject} vmo.
 * @param{String} objectType object type.
 * @return input structure if parameters are valid else returns undefined object
 */
var _prepareSOAInput = function( type, targetPage, vmo, objectType, locationInfo, xrtContext = {}, reviseSaveAsInfo, isStickyTab ) {
    var clientContexts = {};

    let stickyPageIn = isStickyTab ? isStickyTab : false;
    if( !locationInfo && appCtxSvc.getCtx( 'locationContext' ) ) {
        clientContexts = {
            'ActiveWorkspace:Location': appCtxSvc.getCtx( 'locationContext.ActiveWorkspace:Location' ),
            'ActiveWorkspace:SubLocation': appCtxSvc.getCtx( 'locationContext.ActiveWorkspace:SubLocation' ),
            isRedLineMode: appCtxSvc.getCtx( 'isRedLineMode' ),
            stickyPage: stickyPageIn.toString()
        };
    } else if( locationInfo && locationInfo.provider ) {
        clientContexts = {
            'ActiveWorkspace:Location': locationInfo.provider.nameToken,
            'ActiveWorkspace:SubLocation': locationInfo.provider.name,
            isRedLineMode: appCtxSvc.getCtx( 'isRedLineMode' ),
            stickyPage: stickyPageIn.toString()
        };
    }

    // Add the XRT context
    var xrtContextString = 'ActiveWorkspace:xrtContext';
    const xrtCtxt = { ...xrtContext };
    //SOA crashes if passing empty object
    if( Object.keys( xrtCtxt ).length ) {
        clientContexts[ xrtContextString ] = JSON.stringify( xrtCtxt );
    }

    // Append operation specific contexts
    if( type === 'SAVEAS' || type === 'REVISE' ) {
        if( reviseSaveAsInfo ) {
            Object.keys( reviseSaveAsInfo ).forEach( function( key ) {
                var val = reviseSaveAsInfo[ key ];
                if( _.isString( val ) ) {
                    var xrtContextKey = xrtContextString + ':' + key;
                    clientContexts[ xrtContextKey ] = val;
                }
            } );
        }
    }

    clientContexts.useWalker = 'true';

    var inputData = {
        processEntireXRT: false,
        input: [ {
            targetPage: targetPage,
            businessObject: vmo,
            clientContext: clientContexts,
            businessObjectType: '',
            styleSheetLastModDate: '',
            styleSheetType: type
        } ]
    };

    if( vmo && vmo.modelType ) {
        inputData.input[ 0 ].businessObjectType = vmo.modelType.name;
    } else if( vmo && vmo.type ) {
        inputData.input[ 0 ].businessObjectType = vmo.type;
    } else if( objectType ) {
        inputData.input[ 0 ].businessObjectType = objectType;
    } else {
        logger.error( 'Failed to prepare SOA input for getDeclarativeStyleSheets' );
        return;
    }
    return inputData;
};

/**
 * Handle the object change response
 */
export let handleGetDeclStyleSheetResponse = function( response, pageKey, vmo, type, dataCtxNode, ignoreTabModel ) {
    var deferred = AwPromiseService.instance.defer();

    if( response && response.declarativeUIDefs.length > 0 ) {
        var jsonData = JSON.parse( response.declarativeUIDefs[ 0 ].viewModel );

        // This would be required when we switch tabs.
        // While switching tab we do not need to regenerate tab models.
        if( ignoreTabModel && jsonData.data.tabModels ) {
            delete jsonData.data.tabModels;
        }

        //The operation name is required for view model processing
        var operationName = type;

        if( type === 'INFO' || type === 'SUMMARY' ) {
            operationName = 'Edit';
        }

        operationName = lovService.formatOperationName( operationName );

        if( pageKey ) {
            jsonData._viewModelId = pageKey;
        } else {
            jsonData._viewModelId = type + ':' + operationName;
        }

        jsonData.skipClone = true;

        // Get the 'declViewModel' of the command panel (if any)
        var declViewModelTarget = viewModelSvc.getViewModel( dataCtxNode, true );

        if( declViewModelTarget ) {
            declViewModelTarget.vmo = null;
            declViewModelTarget.xrtData = null;
        }

        jsonData.data.operationName = operationName;
        jsonData.data.xrtType = type;

        /**
         * For 'SAVEAS' or 'REVISE' type, owningObjUid needs to be set for LOVs
         */
        if( ( type === 'SAVEAS' || type === 'REVISE' ) && vmo ) {
            jsonData.data.owningObjUid = vmo.uid;
        }

        //Refresh/Register the Policy returned from getDeclarativeStyleSheets
        if( jsonData.data._policy ) {
            if( dataCtxNode.policyId ) {
                propertyPolicySvc.unregister( dataCtxNode.policyId );
            }
            dataCtxNode.policyId = propertyPolicySvc.register( jsonData.data._policy, null, true );

            //Unsubscribe the policy when scope is destroyed
            dataCtxNode.$on( '$destroy', function() {
                if( dataCtxNode.policyId ) {
                    propertyPolicySvc.unregister( dataCtxNode.policyId );
                }
            } );
        }

        viewModelSvc.populateViewModelPropertiesFromJson( jsonData, declViewModelTarget, pageKey ).then(
            function( declViewModel ) {
                viewModelSvc.setupLifeCycle( dataCtxNode, declViewModel );

                if( type === 'SUMMARY' ) {
                    declViewModel.xrtData = {
                        xrtViewModel: xrtViewModelFactory._createXRTViewModel( declViewModel, type ),
                        xrtElement: xrtViewModelFactory._createXRTElementData( declViewModel )
                    };
                }

                declViewModel.gwtPresenters = [];

                if( declViewModel.vmo ) {
                    declViewModel.vmo.xrtType = type;
                }

                deferred.resolve( declViewModel );
            },
            function( error ) {
                deferred.reject( error );
                logger.error( 'Failed to resolve declarative view model converted from XRT, type: ' + type + '\n' +
                    error );
            } );
    } else {
        deferred.resolve( null );
        logger.error( 'No declarative definition retrieved from XRT, type: ' + type );
    }

    return deferred.promise;
};

/**
 * Calls Internal-AWS2-2016-12-DataManagement.getDeclarativeStyleSheets with provided input.
 *
 * @param {String} type - The XRT type e.g. 'SAVEAS', 'REVISE'
 * @param {String} tabKey - The tab key
 * @return the promise.
 */
export let getDeclStyleSheet = function( type, targetPage, vmo, objectType, locationInfo, xrtContext, reviseSaveAsInfo, isStickyTab ) {
    var inputData = _prepareSOAInput( type, targetPage, vmo, objectType, locationInfo, xrtContext, reviseSaveAsInfo, isStickyTab );
    if( !inputData ) {
        var deferred = AwPromiseService.instance.defer();
        return deferred.promise;
    }

    // Register XRT policy based on type
    var policy = _xrtObjectPropertyPolicy;

    if( type === 'SAVEAS' ) {
        policy = _saveAsObjectPropertyPolicy;
    } else if( type === 'REVISE' ) {
        policy = _reviseObjectPropertyPolicy;
    }

    var actionPolicyId = propertyPolicySvc.register( policy, 'aw_xrt_Policy' );

    // Call 'getDeclarativeStyleSheet' to get DUI definition
    // The SOA response may return partial error, but will still contain
    // view and viewModels which must be rendered.
    // So use 'postUnchecked' (instead of 'post') and report the error in console.
    var promise = soaSvc.postUnchecked( 'Internal-AWS2-2016-12-DataManagement', 'getDeclarativeStyleSheets',
        inputData );

    //Lock CVS until SOA call finishes or fails
    var unlock = tcCommandVisibilityService.addLock();
    promise.then( unlock );
    promise.catch( unlock );

    return promise.then( function( response ) {
        if( actionPolicyId ) {
            propertyPolicySvc.unregister( actionPolicyId );
        }

        // Report any partial errors to console
        if( response.ServiceData && response.ServiceData.partialErrors ) {
            var err = soaSvc.createError( response.ServiceData );
            logger.error( err.stack );
        }

        // Publish to local storage
        var data = {
            styleSheetType: type,
            modelObject: vmo ? {
                uid: vmo.uid,
                type: vmo.type
            } : null,
            clientContext: inputData.input[ 0 ].clientContext,
            objectType: objectType
        };
        localStorage.publish( 'getDeclStyleSheet', JSON.stringify( data ) );

        return response;
    } );
};

/**
 * getVisiblePages
 */
export let getDeclVisiblePages = function( declViewModel ) {
    if( declViewModel ) {
        var pages = declViewModel._pages;
        var filterPages = null;
        if( pages ) {
            filterPages = pages.map( function( page ) {
                if( !page.titleKey ) {
                    page.titleKey = page.title;
                }
                return page;
            } );
        }
        return filterPages;
    }

    return null;
};

/**
 * getHeaderProperties
 */
export let getDeclHeaderProperties = function( declViewModel ) {
    if( declViewModel ) {
        var headerProps = [];

        if( declViewModel.vmo ) {
            _.forEach( declViewModel._headers, function( headerProp ) {
                if( declViewModel.vmo && headerProp.propertyName ) {
                    headerProps.push( {
                        prop: declViewModel.vmo.props[ headerProp.propertyName ],
                        renderingHint: headerProp.renderingHint,
                        renderingStyle: headerProp.renderingStyle
                    } );
                }
            } );
        }

        return headerProps;
    }

    return null;
};

/**
 * Build the tabs to use in the sublocation
 *
 * @method buildTabs
 */
export let buildTabs = function( visibleContributedSubLocations, visiblePages ) {
    var loadPromises = [];
    var contributedTabs = null;
    var xrtTabs = null;

    if( visibleContributedSubLocations ) {
        //Make a tab for the contributed sublocations
        contributedTabs = visibleContributedSubLocations.map( function( subLoc, index ) {
            var newTab = {
                canBeDefault: subLoc.canBeSelectedByDefault,
                classValue: 'aw-base-tabTitle',
                displayTab: true,
                id: subLoc.id,
                nameToken: subLoc.nameToken,
                pageId: index,
                //Priority is pre defined
                priority: subLoc.priority,
                selectedTab: false,
                view: subLoc.pageNameToken,
                visible: true
            };

            //Setting the label is async - may be object containing localization info
            var label = subLoc.label;
            if( typeof label === 'string' ) {
                newTab.name = label;
            } else {
                loadPromises.push( localeSvc.getLocalizedText( label.source, label.key ).then( function( result ) {
                    newTab.name = result;
                } ) );
            }

            return newTab;
        } );

        //Only the contributed sublocations need to be sorted
        contributedTabs.sort( function( t1, t2 ) {
            return t1.priority - t2.priority;
        } );
    }

    if( visiblePages ) {
        //Make a tab for xrt pages
        xrtTabs = visiblePages.map( function( page, index ) {
            var title = page.titleKey;
            if( !title ) {
                title = page.title;
            }

            var newTab = {
                classValue: 'aw-base-tabTitle',
                displayTab: true,
                id: title ? title : page.tabKey,
                name: page.displayTitle ? page.displayTitle : page.name,
                pageId: index,
                selectedTab: page.selected,
                visible: true,
                view: page.pageNameToken,
                tabKey: title ? title : page.tabKey
            };
            if( page.pageNameToken ) {
                var matchingContributions = visibleContributedSubLocations.filter( function( p ) {
                    return p.pageNameToken === page.pageNameToken;
                } );
                if( matchingContributions.length === 0 ) {
                    return newTab;
                }
                //Don't return anything if a matching contributed tab already exists
            } else {
                return newTab;
            }
        } )
            //Remove XRT pages that didn't need a tab
            .filter( function( t ) {
                return t;
            } );
    }

    var tabs = xrtTabs;

    if( contributedTabs ) {
        tabs = contributedTabs.concat( xrtTabs );
    }

    if( tabs ) {
        //Tab order sort order will be correct so set priority to index
        tabs = tabs.map( function( tab, idx ) {
            tab.priority = idx;
            return tab;
        } );
    }

    //Ensure the localized titles are loaded for contributed tabs
    return AwPromiseService.instance.all( loadPromises ).then( function() {
        return tabs;
    } );
};

/**
 * Calls Internal-AWS2-2016-12-DataManagement.getDeclarativeStyleSheets with provided input.
 *
 * @param {String} type - The XRT type e.g. 'SUMMARY', 'REVISE'
 * @param {String} targetPage - The target page id or title
 * @param {Object} vmo - The model object
 * @param {StringArray} commandIds - TODO
 *
 * @return {Promise} A promise resolved with a new xrtViewModel object.
 */
export let getXrtViewModel = function( type, targetPage, vmo, commandIds ) {
    return exports.getDeclStyleSheet( type, targetPage, vmo ).then(
        function( response ) {
            return xrtViewModelFactory.buildXrtViewModel( type, vmo, targetPage, response, commandIds ? commandIds : [] );
        } );
};

export default exports = {
    toggleRedLineMode,
    getVisiblePages,
    getHeaderProperties,
    handleGetDeclStyleSheetResponse,
    getDeclStyleSheet,
    getDeclVisiblePages,
    getDeclHeaderProperties,
    buildTabs,
    getXrtViewModel
};
