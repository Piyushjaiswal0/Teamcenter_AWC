/* eslint-env jest */

/**
 * @module test/awOrganizationTreeUtilsTest
 */
import awOrganizationTreeUtils from 'js/awOrganizationTreeUtils';
import awTableService from 'js/awTableService';
import soa_kernel_clientDataModel from 'soa/kernel/clientDataModel';
import soa_kernel_soaService from 'soa/kernel/soaService';
import appCtxService from 'js/appCtxService';
import awTableTreeSvc from 'js/published/splmTablePublishedTreeService';
import viewModelObjectService from 'js/viewModelObjectService';
import awIconService from 'js/awIconService';
import awTableStateService from 'js/awTableStateService';
import eventBus from 'js/eventBus';
import filterPanelService from 'js/filterPanelService';

var _awOrganizationTreeUtils;
var _filterPanelService;
var _awTableSvc;
var _cdm;
var _soaService;
var _appCtxSvc = null;

describe( 'Testing awOrganizationTreeUtilsTest', function() {
    beforeEach( function() {
        _awOrganizationTreeUtils = awOrganizationTreeUtils;
        _filterPanelService = filterPanelService;
        _awTableSvc = awTableService;
        _cdm = soa_kernel_clientDataModel;
        _soaService = soa_kernel_soaService;
        _appCtxSvc = appCtxService;
    } );

    it( 'Check for awOrganizationTreeUtilsTest initialization', function() {
        expect( _awOrganizationTreeUtils ).toBeTruthy();
        expect( _awOrganizationTreeUtils.loadPropertiesJS ).toBeDefined();
        expect( _awOrganizationTreeUtils.loadTableProperties ).toBeDefined();
        expect( _awOrganizationTreeUtils.treeNodeSelected ).toBeDefined();
        expect( _awOrganizationTreeUtils._nodeIndex ).toBeDefined();
        expect( _awOrganizationTreeUtils.handleSOAResponseError ).toBeDefined();
    } );

    it( 'Testing : treeNodeSelected', function() {
        var data = {
            dataProviders: {
                orgTreeTableDataProvider: {
                    viewModelCollection: {
                        loadedVMObjects: [ {
                            id: 'SiteLevel',
                            type: 'Site'
                        },
                        {
                            id: 'dba',
                            type: 'group'
                        }
                        ]
                    }
                }
            }
        };
        var currentNode = {
            parentID: 'SiteLevel',
            levelNdx: 1
        };
        var ctx = {
            parents: [ {
                id: 'SiteLevel',
                type: 'Site'
            },
            {
                id: 'dba',
                type: 'group'
            }
            ]
        };

        jest.spyOn( _appCtxSvc, 'getCtx' ).mockReturnValue( false );

        _awOrganizationTreeUtils.treeNodeSelected( data, ctx, currentNode );

        expect( ctx.parents.length ).toEqual( 2 );
        expect( ctx.parents[ 0 ].id ).toEqual( 'SiteLevel' );

        data = {
            dataProviders: {
                orgTreeTableDataProvider: {
                    viewModelCollection: {
                        loadedVMObjects: [ {
                            id: 'SiteLevel',
                            type: 'Site'
                        },
                        {
                            id: 'dba',
                            type: 'group'
                        }
                        ]
                    },
                    selectionModel: {
                        setSelection: function() {
                            return true;
                        }
                    }
                }
            },
            orgTreeInput: {
                treeLoadResult: {
                    parentNode: {
                        id: 12
                    }
                }
            }
        };
        currentNode = {
            parent_Id: 'SiteLevel',
            levelNdx: 1

        };

        ctx = {
            parents: [ {
                id: 'SiteLevel',
                type: 'Site'
            },
            {
                id: 'dba',
                type: 'group'
            }
            ],
            selectedTreeNode: {
                id: 12
            }
        };
        currentNode = null;

        _awOrganizationTreeUtils.treeNodeSelected( data, ctx, currentNode );

        expect( ctx.parents.length ).toEqual( 2 );
        expect( ctx.parents[ 1 ].id ).toEqual( 'dba' );
        expect( ctx.parents[ 1 ].type ).toEqual( 'group' );

        data = {
            dataProviders: {
                orgTreeTableDataProvider: {
                    viewModelCollection: {
                        loadedVMObjects: [ {
                            id: 'SiteLevel',
                            type: 'Site'
                        },
                        {
                            id: 'dba',
                            typr: 'group'
                        }
                        ]
                    },
                    selectionModel: {
                        setSelection: function() {
                            return true;
                        }
                    }
                }
            },
            orgTreeInput: {
                treeLoadResult: {
                    parentNode: {
                        id: 12
                    },
                    childNodes: [ {} ]
                }
            }
        };
        currentNode = null;

        ctx = {
            parents: [ {
                id: 'SiteLevel',
                type: 'Site'
            }, {
                id: 'dba',
                type: 'group'
            } ],
            selectedTreeNode: {
                id: 14,
                childNdx: 0
            }
        };

        _awOrganizationTreeUtils.treeNodeSelected( data, ctx, currentNode );

        expect( ctx.parents[ 1 ].id ).toEqual( 'dba' );
        expect( ctx.selectedTreeNode.id ).toEqual( 14 );
        expect( ctx.selectedTreeNode.childNdx ).toEqual( 0 );
    } );

    it( 'Testing : loadPropertiesJS is loading properties', function() {
        var viewModelCollection = {
            getLoadedViewModelObjects: function() {
                return true;
            }
        };
        var data = {
            dataProviders: {
                orgTreeTableDataProvider: {}
            }
        };
        data.dataProviders.orgTreeTableDataProvider.getViewModelCollection = function() {
            return viewModelCollection;
        };
        jest.spyOn( _awTableSvc, 'findPropertyLoadInput' ).mockReturnValue( {} );
        jest.spyOn( _awOrganizationTreeUtils, 'loadTableProperties' ).mockReturnValue( {} );

        _awOrganizationTreeUtils.loadPropertiesJS( data );
    } );

    it( 'Testing : loadTableProperties', function() {
        jest.spyOn( awTableTreeSvc, 'createPropertyLoadResult' ).mockReturnValue( {
            updatedNodes: []
        } );

        var propertyLoadInput = {
            propertyLoadRequests: [ {
                childNodes: [ {
                    id: 'Site'
                } ]
            } ]
        };

        _awOrganizationTreeUtils.loadTableProperties( propertyLoadInput );
        expect( propertyLoadInput.propertyLoadRequests[ 0 ].childNodes[ 0 ].id ).toEqual( 'Site' );
    } );

    it( 'Testing handleSOAResponseError', function() {
        var soaRes = {
            response: {
                modelObjects: {},
                plain: []
            }
        };
        var err = _awOrganizationTreeUtils.handleSOAResponseError( soaRes );
        expect( err ).toBeUndefined();
    } );

    const getLoadTreeTableDataMockInput = function() {
        return {
            soaInput: [ {
                searchInput: {
                    attributesToInflate: [],
                    maxToLoad: 50,
                    maxToReturn: 50,
                    providerName: 'Awp0OrgTreeProvider',
                    searchCriteria: {
                        resourceProviderContentType: 'Organization',
                        showInactiveMembers: 'true'
                    },
                    searchFilterFieldSortType: 'Alphabetical',
                    searchFilterMap6: {},
                    searchSortCriteria: [],
                    startIndex: 0
                },
                columnConfigInput: { clientName: 'AWClient', clientScopeURI: 'Um0ShowOrganization', operationType: undefined },
                saveColumnConfigData: null,
                inflateProperties: false,
                noServiceData: false,
                treeLoadInput: {
                    parentNode: {
                        uid: 'kBU1Z2fjpU93lD',
                        id: 'kBU1Z2fjpU93lD',
                        type: 'SiteLevel',
                        displayName: 'organization',
                        levelNdx: -1,
                        childNdx: 0,
                        iconURL: null,
                        visible: true,
                        $$treeLevel:
                                -1
                    },
                    rootNode: {
                        uid: 'kBU1Z2fjpU93lD',
                        id: 'kBU1Z2fjpU93lD',
                        type: 'SiteLevel',
                        displayName: 'organization',
                        levelNdx: -1,
                        childNdx: 0,
                        iconURL: null,
                        visible: true,
                        $$treeLevel: -1
                    },
                    startChildNdx: 0,
                    startChildId: null,
                    cursorNodeId: null,
                    pageSize: 50,
                    addAfter: true
                }
            },
            {
                searchInput: {
                    attributesToInflate: [],
                    maxToLoad: 50,
                    maxToReturn: 50,
                    providerName: 'Awp0OrgTreeProvider',
                    searchCriteria: {
                        resourceProviderContentType: 'Organization',
                        showInactiveMembers: 'true'
                    },
                    searchFilterFieldSortType: 'Alphabetical',
                    searchFilterMap6: {},
                    searchSortCriteria: [],
                    startIndex: 0
                },
                columnConfigInput: { clientName: 'AWClient', clientScopeURI: 'Um0ShowOrganization', operationType: 'Union' },
                saveColumnConfigData: null,
                treeLoadInput: {
                    parentNode: {
                        uid: 'ikmN75bPJec_7D',
                        id: 'ikmN75bPJec_7D',
                        type: 'Group',
                        displayName: '4G Tester',
                        levelNdx: 0,
                        childNdx: 0,
                        iconURL: 'assets/image/typeProjectTeam48.svg',
                        visible: true,
                        $$treeLevel: 0,
                        isLeaf: false,
                        isPlaceholder: false,
                        isExpanded: true,
                        totalFound: 2,
                        selected: false,
                        _twistieTitle: 'Show Children',
                        props: { object_name: { dbValues: [ '4G Tester' ], uiValues: [ '4G Tester' ] } }
                    },
                    startChildNdx: 0,
                    startChildId: null,
                    cursorNodeId: null,
                    pageSize: 50,
                    addAfter: true,
                    isExpanded: true
                }
            }
            ],
            soaResponse: [ {
                searchResultsJSON: '"{\"objects\":[{\n\"type\": \"Group\",\n\"uid\": \"ikmN75bPJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"rssN79htJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"__kN79ljJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"N6uN79htJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"ubqN79ljJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"NrtN79htJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"OYsN79htJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"wwlN7ihpJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"fwqN79lBJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"vkuN79lBJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"$wmN79lBJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"PlgN79lBJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"f1qN79lBJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"vBjN79lBJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"tNmN79WKJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"NyhN79WKJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"fJrN79WKJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"pTnN79lBJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"w9V92XlcJNDwUA\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"OPvN75dOJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"$coN75dOJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"gTqN75tfJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"RTvN75tfJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"VBgN79R3Jec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"egmN75bPJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"uUgN75bPJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"0ovN79lBJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"w8pN75BIJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"TwvN793oJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"QhlN7tPgJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"lQqN79lBJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"ApgN7iR9Jec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"ABjN7iR9Jec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"gNrNLLjPJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"AihNLLjPJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"0CoN75eJJec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"VgsN79i5Jec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"mQmN79i5Jec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"meqN79i5Jec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"1rrN75s3Jec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"IVmN75s3Jec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"YkrN79R3Jec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"3UjN75s3Jec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"wRuN79i5Jec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"gQmN79i5Jec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"wEgN79i5Jec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"w0qN79i5Jec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"AlmN79i5Jec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"QRjN79i5Jec_7D\"\n,\n\"props\": {\n}\n}\n,\n{\n\"type\": \"Group\",\n\"uid\": \"gBtN79i5Jec_7D\"\n,\n\"props\": {\n}\n}\n\n]}"',
                totalFound: 5,
                totalLoaded: 5,
                defaultFilterFieldDisplayCount: 0,
                endIndex: 0,
                searchFilterMap6: {
                    'Group.group_name': [ {
                        colorValue: '',
                        count: 1,
                        endDateValue: '0001-01-01T00:00:00+00:00',
                        endNumericValue: 0,
                        searchFilterType: 'StringFilter',
                        selected: false,
                        startDateValue: '0001-01-01T00:00:00+00:00',
                        startEndRange: '',
                        startNumericValue: 0,
                        stringDisplayValue: '00AWTest_Group_70990917.ACE_Engineering',
                        stringValue: 'AXe1MQYtrEo59A'
                    } ]
                },
                searchFilterCategories: [],
                objectsGroupedByProperty: { internalPropertyName: '' },
                columnConfig: { columnConfigId: 'searchResultsColConfig', operationType: 'Intersection' },
                ServiceData: {
                    plain: [ 'h8X5wZu8pU93lD', 'kBW1Z2fjpU93lD', 'kBS1Z2fjpU93lD', 'wLV5g$$EpU93lD', 'gjQ5wX3BpU93lD' ],
                    modelObjects: {
                        h8X5wZu8pU93lD: {
                            objectID: '0CoN75eJJec_7D',
                            uid: '0CoN75eJJec_7D',
                            className: 'Group',
                            type: 'Group',
                            props: { object_string: { dbValues: [ 'CFx_CancelEdit_Group' ], uiValues: [ 'CFx_CancelEdit_Group' ] } }
                        },
                        '0ovN79lBJec_7D': {
                            objectID: '0ovN79lBJec_7D',
                            uid: '0ovN79lBJec_7D',
                            className: 'Group',
                            type: 'Group',
                            props: {
                                object_string: { dbValues: [ 'AllEffectivity_Group' ], uiValues: [ 'AllEffectivity_Group' ] }
                            }
                        }
                    }
                },
                additionalSearchInfoMap: { searchTermsToHighlight: [] },
                cursor: { startIndex: 0, endIndex: 4, startReached: true, endReached: true },
                searchFilterCategoriesUnpopulated: []
            },
            {
                searchResultsJSON: '{\"objects\":[{\n\"type\": \"Role\",\n\"uid\": \"OPoN79ljJec_7D\"\n,\n\"props\": {\n}\n}\n\n]}',
                totalFound: 1,
                totalLoaded: 1,
                defaultFilterFieldDisplayCount: 0,
                endIndex: 0,
                searchFilterMap6: {

                },
                searchFilterCategories: [],
                objectsGroupedByProperty: { internalPropertyName: '' },
                columnConfig: { columnConfigId: 'searchResultsColConfig', operationType: 'Intersection' },
                ServiceData: {
                    plain: [ 'OPoN79ljJec_7D' ],
                    modelObjects: {
                        OPoN79ljJec_7D: {
                            uid: 'OPoN79ljJec_7D',
                            className: 'Role',
                            type: 'Role',
                            props: {
                                object_name: { dbValues: [ 'ACE_COTS_Role' ], uiValues: [ 'ACE_COTS_Role' ] }
                            }
                        }
                    }
                },
                additionalSearchInfoMap: { searchTermsToHighlight: [] },
                cursor: { startIndex: 0, endIndex: 0, startReached: true, endReached: true },
                searchFilterCategoriesUnpopulated: []
            }
            ],
            propertyDescriptorsVmo: {
                propertyDescriptors: [ {
                    name: 'test'
                }, {
                    name: 'test'
                }, {
                    name: 'test_unique'
                } ]
            },
            modelObjects: {

            },
            icons: {
                kBU1Z2fjpU93lD: {
                    iconUrl: 'assets/image/typeFolder48.svg'
                },
                kBW5w$WJp0UAMA: {
                    iconUrl: 'assets/image/typeFolder48.svg'
                }
            },
            viewModelTreeNodes: {
                kBU1Z2fjpU93lD: {
                    '-1': {
                        uid: 'kBU1Z2fjpU93lD',
                        id: 'kBU1Z2fjpU93lD',
                        type: 'Organization',
                        displayName: 'Home',
                        levelNdx: -1,
                        childNdx: 0,
                        iconURL: 'assets/image/typeFolder48.svg',
                        visible: true,
                        $$treeLevel: -1
                    },
                    0: {
                        uid: 'kBU1Z2fjpU93lD',
                        id: 'kBU1Z2fjpU93lD',
                        type: 'Group',
                        displayName: '4G Tester',
                        levelNdx: 0,
                        childNdx: 0,
                        iconURL: 'assets/image/typeFolder48.svg',
                        visible: true,
                        $$treeLevel: 0
                    },
                    1: {
                        uid: 'kBW5w$WJp0UAMA',
                        id: 'kBW5w$WJp0UAMA',
                        type: 'Group',
                        displayName: '4G Tester',
                        levelNdx: 1,
                        childNdx: 0,
                        iconURL: 'assets/image/typeFolder48.svg',
                        visible: true,
                        $$treeLevel: 1
                    }
                }
            }
        };
    };

    it( 'Testing - loadTreeTableData function for child nodes', function() {
        var state = {};
        state.params = { uid: 'kBU1Z2fjpU93lD', d_uids: 'h8X5wZu8pU93lD', s_uid: 'h8X5wZu8pU93lD' };
        var inputData = getLoadTreeTableDataMockInput();

        jest.spyOn( _soaService, 'postUnchecked' ).mockReturnValue( Promise.resolve( inputData.soaResponse[ 1 ] ) );
        jest.spyOn( viewModelObjectService, 'createViewModelObject' ).mockImplementation( function() { return inputData.propertyDescriptorsVmo; } );
        jest.spyOn( _cdm, 'getObject' ).mockImplementation( function( uid ) { return inputData.modelObjects[ uid ]; } );
        jest.spyOn( awIconService, 'getTypeIconFileUrl' ).mockImplementation( function( obj ) { return inputData.icons[ obj.uid ].iconUrl; } );
        jest.spyOn( awTableTreeSvc, 'createViewModelTreeNode' ).mockImplementation( function( objUid, objType, displayName, levelNdx, childNdx, iconURL ) {
            return inputData.viewModelTreeNodes[
                objUid ][ levelNdx ];
        } );

        _awOrganizationTreeUtils.loadTreeTableData( inputData.soaInput[ 1 ].searchInput, inputData.soaInput[ 1 ].columnConfigInput,
            inputData.soaInput[ 1 ].saveColumnConfigData, inputData.soaInput[ 1 ].treeLoadInput );
        expect( _soaService.postUnchecked ).toHaveBeenCalled();
    } );

    it( 'Testing createVMNodeUsingObjectInfo - Group Node', function() {
        var object = {
            type: 'Group',
            uid: 'ikmN8pvOJisFAA',
            props: {
                object_string: {
                    dbValues: [ '4G Tester' ],
                    uiValues: [ '4G Tester' ]
                }
            }
        };

        var parentNode = {
            uid: 'SiteLevel',
            id: 'SiteLevel',
            type: 'Site',
            displayName: 'Organization'
        };

        var vmNode = _awOrganizationTreeUtils.createVMNodeUsingObjectInfo( object, 0, 0, false, parentNode );
        expect( vmNode.dbValue ).toEqual( '4G Tester' );
        expect( vmNode.type ).toEqual( 'Group' );
        expect( vmNode.uid ).toEqual( 'ikmN8pvOJisFAA' );
        expect( vmNode.alternateID ).toEqual( 'ikmN8pvOJisFAA,SiteLevel' );
        expect( vmNode.parentID ).toEqual( 'SiteLevel' );
    } );

    it( 'Testing createVMNodeUsingObjectInfo - Role Node', function() {
        var object = {
            type: 'Role',
            uid: 'w7pN8txYJisFAA',
            props: {
                object_string: {
                    dbValues: [ '4G Designer' ],
                    uiValues: [ '4G Designer' ]
                }
            }
        };

        var parentNode = {
            type: 'Group',
            uid: 'ikmN8pvOJisFAA',
            id: 'ikmN8pvOJisFAA',
            alternateID: 'ikmN8pvOJisFAA,SiteLevel'
        };

        var vmNode = _awOrganizationTreeUtils.createVMNodeUsingObjectInfo( object, 0, 0, false, parentNode );
        expect( vmNode.dbValue ).toEqual( '4G Designer' );
        expect( vmNode.type ).toEqual( 'Role' );
        expect( vmNode.uid ).toEqual( 'w7pN8txYJisFAA' );
        expect( vmNode.alternateID ).toEqual( 'w7pN8txYJisFAA,ikmN8pvOJisFAA,SiteLevel' );
        expect( vmNode.parentID ).toEqual( 'ikmN8pvOJisFAA' );
    } );

    it( 'Testing createVMNodeUsingObjectInfo - User Node', function() {
        var object = {
            type: 'GroupMember',
            uid: 'ZAtN8tZyJisFAA',
            props: {
                user: {
                    dbValues: [ '5sgN8tZAJisFAA' ],
                    uiValues: [ '4GBOM_Configure_User1,4GBOM_Configure_User1 (4gbom_configure_user1)' ]
                }
            }
        };

        var parentNode = {
            type: 'Role',
            uid: 'w7pN8txYJisFAA',
            id: 'w7pN8txYJisFAA',
            alternateID: 'w7pN8txYJisFAA,ikmN8pvOJisFAA,SiteLevel'
        };

        var vmNode = _awOrganizationTreeUtils.createVMNodeUsingObjectInfo( object, 0, 0, false, parentNode );
        expect( vmNode.dbValue ).toEqual( '4GBOM_Configure_User1,4GBOM_Configure_User1 (4gbom_configure_user1)' );
        expect( vmNode.type ).toEqual( 'User' );
        expect( vmNode.uid ).toEqual( '5sgN8tZAJisFAA' );
        expect( vmNode.alternateID ).toEqual( '5sgN8tZAJisFAA,w7pN8txYJisFAA,ikmN8pvOJisFAA,SiteLevel' );
        expect( vmNode.object.uid ).toEqual( 'ZAtN8tZyJisFAA' );
        expect( vmNode.object.type ).toEqual( 'GroupMember' );
    } );

    it( 'Testing setSelection - Root Node', function() {
        var dataProvider = {
            viewModelCollection: {
                loadedVMObjects: [ {
                    id: 'SiteLevel',
                    type: 'Site'
                },
                {
                    id: 'dba',
                    type: 'group'
                }
                ]
            },
            selectedObjects: [],
            selectionModel: {
                setSelection: function() {
                    return true;
                }
            }
        };
        var value = {};
        var selection = {};
        let selectionData = {
            getValue: jest.fn( () => { return value; } ),
            update: jest.fn( ( value ) => {
                selection = value;
            } ),
            value: {}
        };

        _awOrganizationTreeUtils.setSelection( dataProvider, selectionData, '' );
        expect( selection.selected[ 0 ].id ).toEqual( 'SiteLevel' );
    } );

    it( 'Testing setSelection ', function() {
        var selectedId = [];
        var dataProvider = {
            viewModelCollection: {
                loadedVMObjects: [ {
                    id: 'SiteLevel',
                    type: 'Site'
                },
                {
                    type: 'Group',
                    uid: 'ikmN8pvOJisFAA',
                    alternateID: 'ikmN8pvOJisFAA,SiteLevel',
                    dbValue: '4G Tester'
                }
                ]
            },
            selectedObjects: [],
            selectionModel: {
                setSelection: function( id ) {
                    selectedId = id;
                }
            }
        };
        var value = {};
        var selection = {};
        let selectionData = {
            selected: [ {
                type: 'Group',
                uid: 'ikmN8pvOJisFAA',
                alternateID: 'ikmN8pvOJisFAA,SiteLevel',
                dbValue: '4G Tester'
            } ],
            getValue: jest.fn( () => { return value; } ),
            update: jest.fn( ( value ) => {
                selection = value;
            } ),
            value: {}
        };

        _awOrganizationTreeUtils.setSelection( dataProvider, selectionData, '' );
        expect( selectedId[ 0 ] ).toEqual( 'ikmN8pvOJisFAA,SiteLevel' );
    } );

    it( 'Testing nodeExpansion ', function() {
        var data = {
            treeLoadResult: {
                childNodes: [ {
                    id: 'SiteLevel',
                    uid: 'SiteLevel',
                    type: 'Site'
                },
                {
                    type: 'Group',
                    uid: 'ikmN8pvOJisFAA',
                    alternateID: 'ikmN8pvOJisFAA,SiteLevel',
                    dbValue: '4G Tester'
                }
                ]
            },
            grids: {
                orgTreeTable12: {
                    gridid: 'orgTreeTable12'
                }
            }
        };

        var value = {};
        var selection = {};
        let selectionData = {
            selected: [ {
                type: 'Group',
                uid: 'ikmN8pvOJisFAA',
                alternateID: 'ikmN8pvOJisFAA,SiteLevel',
                dbValue: '4G Tester'
            } ],
            getValue: jest.fn( () => { return value; } ),
            update: jest.fn( ( value ) => {
                selection = value;
            } ),
            value: {}
        };

        var publishSpy = jest.spyOn( eventBus, 'publish' );
        _awOrganizationTreeUtils.nodeExpansion( data, selectionData );
        expect( publishSpy.mock.calls[ 0 ][ 0 ] ).toEqual( 'orgTreeTable12.plTable.toggleTreeNode' );
        expect( publishSpy.mock.calls[ 1 ][ 0 ] ).toEqual( 'plTable.scrollToRow' );
    } );

    it( 'Testing loadFilteredTreeTableData - search with filterString', function() {
        var vmNodes = [];
        var dataProvider = {
            viewModelCollection: {
                loadedVMObjects: [ {
                    id: 'SiteLevel',
                    type: 'Site'
                },
                {
                    id: 'dba',
                    type: 'group'
                }
                ]
            },
            selectionModel: {
                setSelection: function() {
                    return true;
                }
            },
            update: jest.fn( ( value ) => {
                vmNodes = value;
            } )
        };

        var data = {
            grids: {
                orgTreeTable12: {
                    gridid: 'orgTreeTable12'
                }
            },
            subPanelContext: {
                searchState: {
                    activeFilterMap: {
                        'Group.group_name': [ {
                            searchFilterType: 'StringFilter',
                            stringDisplayValue: 'yloNkGyfJCOHiA',
                            stringValue: 'yloNkGyfJCOHiA'
                        } ]
                    }
                }
            }
        };

        var filterString = 'dba';
        var searchResult = {
            orgTree: {
                orgTreeNodes: [ {
                    displayName: 'ACE_dba',
                    isLeaf: false,
                    orgObject: {
                        type: 'Group',
                        uid: 'NrtN8tGIJisFAA',
                        props: {
                            object_string: {
                                dbValues: [ 'ACE_dba' ],
                                uiValues: [ 'ACE_dba' ]
                            }
                        }
                    },
                    children: {
                        orgTreeNodes: [ {
                            displayName: 'ACE_DBA',
                            isLeaf: false,
                            orgObject: {
                                type: 'Role',
                                uid: 'NfiN8tGIJisFAA',
                                props: {
                                    object_string: {
                                        dbValues: [ 'ACE_DBA' ],
                                        uiValues: [ 'ACE_DBA' ]
                                    }
                                }
                            },
                            children: {
                                orgTreeNodes: [ {
                                    displayName: 'ACE_Dba (ace_dba)',
                                    isLeaf: true,
                                    orgObject: {
                                        type: 'User',
                                        uid: 'xcpN8tQkJisFAA',
                                        props: {
                                            object_string: {
                                                dbValues: [ 'ACE_Dba (ace_dba)' ],
                                                uiValues: [ 'ACE_Dba (ace_dba)' ]
                                            }
                                        }
                                    },
                                    groupMember: {
                                        type: 'GroupMember',
                                        uid: 'dDiN8tGIJisFAA'
                                    },
                                    children: {
                                        orgTreeNodes: [

                                        ]
                                    }
                                } ]
                            }
                        } ]
                    }

                } ]
            }
        };
        let fields = {
            searchState: {
                cursorInfo: {
                    startIndex: 0,
                    startReached: true,
                    endIndex: 49,
                    endReached: false
                },
                value: {
                    criteria: {
                        searchString: ''
                    }
                },
                update: function() {
                    return;
                }
            }
        };
        jest.spyOn( _soaService, 'postUnchecked' ).mockReturnValue( Promise.resolve( searchResult ) );
        jest.spyOn( awTableStateService, 'clearAllStates' ).mockImplementation( () => {} );
        _awOrganizationTreeUtils.loadFilteredTreeTableData( filterString, data, fields, dataProvider ).then( function( result ) {
            expect( _soaService.postUnchecked ).toHaveBeenCalled();
            expect( vmNodes.length ).toEqual( 4 );
        } );
    } );

    it( 'test processOutput', function() {
        let data = {
            totalFound: 1,
            totalLoaded: 'limited',
            endIndex: 2,
            searchFilterCategories: {},
            saveSearchFilterMap: {},
            additionalSearchInfoMap: {
                categoryHasMoreFacetValuesList: undefined,
                searchGroupedCategories: []
            },
            cursor: {
                startIndex: 0
            },
            searchFilterCategoriesUnpopulated: {},
            additionalInfoMessages: '',
            thresholdExceeded: '',
            objectsGroupedByProperty: true,
            columnConfig: '',
            propDescriptors: '',
            defaultFilterFieldDisplayCount: ''
        };
        let searchState = {
            value: {
                criteria: {
                    searchString: ''
                }
            },
            update: function() {
                return;
            }
        };

        let expectedData = {
            criteria: {
                searchString: ''
            }
        };
        jest.spyOn( _filterPanelService, 'getCategories3' ).mockReturnValue( searchState, true );
        jest.spyOn( searchState, 'update' ).mockImplementation( () => {} );
        _awOrganizationTreeUtils.processOutput( data, searchState );
        expect( _filterPanelService.getCategories3 ).toHaveBeenCalled();
    } );

    it( 'test constructAppliedFiltersAndCategoriesWhenEmptyCategoriesAndZeroResults when categories length is 0 and categoryInternalToDisplayNameMap exists', function() {
        let searchState = {
            categories: [],
            categoryInternalToDisplayNameMap: {
                'Group.group_name': 'Type'
            },
            searchFilterMap: {
                'Group.group_name': [ {
                    stringValue: 'yloNkGyfJCOHiA',
                    stringDisplayValue: '4G Tester',
                    searchFilterType: 'StringFilter',
                    selected: true
                } ]
            },
            defaultFilterFieldDisplayCount: 10,
            provider: 'Awp0OrgTreeProvider'
        };
        let currentActiveFilters = [];
        let [ activeFilters, categories ] = _awOrganizationTreeUtils.constructAppliedFiltersAndCategoriesWhenEmptyCategoriesAndZeroResults( searchState, currentActiveFilters );
        expect( activeFilters.length ).toBe( 1 );
        expect( activeFilters[ 0 ].name ).toBe( 'Group.group_name' );
        expect( activeFilters[ 0 ].values.length ).toBe( 1 );
        expect( activeFilters[ 0 ].values[ 0 ] ).toBe( 'yloNkGyfJCOHiA' );
        expect( categories.length ).toBe( 1 );
    } );

    it( 'test constructAppliedFiltersAndCategoriesWhenEmptyCategoriesAndZeroResults when categories length is not zero', function() {
        let searchState = {
            categories: [ {
                internalName: 'Group.group_name',
                displayName: 'Group'
            } ],
            categoryInternalToDisplayNameMap: {}
        };
        let currentActiveFilters = [];
        let [ activeFilters, categories ] = _awOrganizationTreeUtils.constructAppliedFiltersAndCategoriesWhenEmptyCategoriesAndZeroResults( searchState, currentActiveFilters );
        expect( activeFilters.length ).toBe( 0 );
        expect( categories ).toBe( undefined );
    } );
} );
