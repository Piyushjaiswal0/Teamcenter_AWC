// Copyright (c) 2022 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/showReportBuilderReportsService
 */
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import reportCommnSrvc from 'js/reportsCommonService';
import cmdPanelSrvc from 'js/commandPanel.service';
import modelPropertySvc from 'js/modelPropertyService';

var exports = {};

export let getReportDefSearchCriteria = function() {
    var traversePath = {
        relationsPath: [ {
            searchMethod: 'REPORT_DEF',
            inputCriteria: [ {
                category: '',
                source: 'Teamcenter',
                contextObjects: []
            },
            {
                category: '',
                source: 'Office Template',
                contextObjects: []
            },
            {
                category: '',
                source: 'Active Workspace',
                contextObjects: []
            }
            ],
            objectType: 'ReportDefinition'
        } ]
    };

    return {
        sourceObject: '',
        relationsPath: JSON.stringify( traversePath ),
        isFilterMapRequired: 'False'
    };
};

export let getReportDefinitionVal = function( response, searchData, preferenceName, i18n ) {
    if( appCtxService.ctx.chartProvider ) {
        delete appCtxService.ctx.chartProvider;
    }
    var reportDefinitions = response.reportdefinitions.map( function( rDef ) {
        return response.ServiceData.modelObjects[ rDef.reportdefinition.uid ];
    } ).filter( function( rd ) {
        return rd.props.rd_class.dbValues[ 0 ] === '' || rd.props.rd_class.dbValues[ 0 ] !== '' && rd.props.rd_type.dbValues[ 0 ] === '1' && rd.props.rd_source.dbValues[ 0 ] ===
            'Active Workspace';
    } );
    i18n && _.forEach( reportDefinitions, ( value, index ) => {
        if( value.props.Fnd0Applicable_Assignment ) {
            var propAttrHolder = {
                displayName: i18n.sharedWith,
                type: 'STRING'
            };
            var property = modelPropertySvc.createViewModelProperty( propAttrHolder );
            let uiValue = '';
            for( var idx = 0; idx < Math.min( 5, parseInt( value.props.Fnd0Applicable_Assignment.uiValues.length ) ); idx++ ) {
                if( uiValue === '' ) {
                    uiValue = ' ' + value.props.Fnd0Applicable_Assignment.uiValues[ idx ];
                } else {
                    uiValue = uiValue + ', ' + value.props.Fnd0Applicable_Assignment.uiValues[ idx ];
                }
            }
            property.uiValue = value.props.Fnd0Applicable_Assignment.uiValues.length > 5 ? String( uiValue ) + ' ...' : String( uiValue );
            property.uiValues = [ property.uiValue ];
            reportDefinitions[ index ].props.Fnd0reports_SharedWith = property;
        }
    } );

    const userObj = appCtxService.getCtx( 'user' );
    const userName = userObj.uid;

    var owningUserList = reportDefinitions.filter( function( rdList ) {
        return rdList.props.owning_user.dbValues[ 0 ] === userName;
    } );

    owningUserList = _.sortBy( owningUserList, function( rDef ) {
        return rDef.props.creation_date.dbValues[ 0 ];
    } ).reverse();

    var otherUserList = reportDefinitions.filter( function( rdList ) {
        return rdList.props.owning_user.dbValues[ 0 ] !== userName;
    } );

    otherUserList = _.sortBy( otherUserList, function( rDef ) {
        return rDef.props.rd_name.dbValues[ 0 ];
    } );
    var finalList = owningUserList.concat( otherUserList );
    reportDefinitions = finalList;

    reportCommnSrvc.setupReportPersistCtx( preferenceName );

    if( searchData ) {
        let newSearchData = searchData.getValue();
        newSearchData.totalFound = reportDefinitions.length;
        searchData.update( newSearchData );
    }
    return {
        reportdefinitions: reportDefinitions
    };
};
/**
 * SOA PSVM response is processed and returned reportDefinitions
 *
 * @param {String} reponse
 * @param {String} searchData
 * @param {String} preferenceName
 * @param {String} i18n
 *
 * @returns {Array} processed reportDefinitions
 */
export let getReportDefinitionValList = function( response, searchData, preferenceName, i18n ) {
    if( appCtxService.ctx.chartProvider ) {
        delete appCtxService.ctx.chartProvider;
    }
    var reportDefinitions = JSON.parse( response.searchResultsJSON ).objects.map( function( rDef ) {
        return response.ServiceData.modelObjects[ rDef.uid ];
    } );
    i18n && _.forEach( reportDefinitions, ( value, index ) => {
        if( value.props.Fnd0Applicable_Assignment ) {
            value.props.Fnd0Applicable_Assignment.uiValues.sort( ( data1, data2 ) => { return data1.localeCompare( data2 ); } );
            var propAttrHolder = {
                displayName: i18n.sharedWith,
                type: 'STRING'
            };
            var property = modelPropertySvc.createViewModelProperty( propAttrHolder );
            let uiValue = '';
            for( var idx = 0; idx < Math.min( 5, parseInt( value.props.Fnd0Applicable_Assignment.uiValues.length ) ); idx++ ) {
                if( uiValue === '' ) {
                    uiValue = ' ' + value.props.Fnd0Applicable_Assignment.uiValues[ idx ];
                } else {
                    uiValue = uiValue + ', ' + value.props.Fnd0Applicable_Assignment.uiValues[ idx ];
                }
            }
            if( value.props.Fnd0Applicable_Assignment.dbValues.length === 1 && value.props.Fnd0Applicable_Assignment.dbValues[0] === appCtxService.ctx.userSession.props.fnd0groupmember.dbValue ) {
                property.uiValue = '';
                property.uiValues = [];
            } else {
                property.uiValue = value.props.Fnd0Applicable_Assignment.uiValues.length > 5 ? String( uiValue ) + ' ...' : String( uiValue );
                property.uiValues = [ property.uiValue ];
            }
            reportDefinitions[ index ].props.Fnd0reports_SharedWith = property;
        }
    } );

    const userObj = appCtxService.getCtx( 'user' );
    const userName = userObj.uid;

    var owningUserList = reportDefinitions.filter( function( rdList ) {
        return rdList.props.owning_user.dbValues[ 0 ] === userName;
    } );

    owningUserList = _.sortBy( owningUserList, function( rDef ) {
        return rDef.props.creation_date.dbValues[ 0 ];
    } ).reverse();

    var otherUserList = reportDefinitions.filter( function( rdList ) {
        return rdList.props.owning_user.dbValues[ 0 ] !== userName;
    } );

    otherUserList = _.sortBy( otherUserList, function( rDef ) {
        return rDef.props.rd_name.dbValues[ 0 ];
    } );
    var finalList = owningUserList.concat( otherUserList );
    reportDefinitions = finalList;

    reportCommnSrvc.setupReportPersistCtx( preferenceName );

    if( searchData ) {
        let newSearchData = searchData.getValue();
        newSearchData.totalFound = reportDefinitions.length;
        let previousSelectedReport = window.sessionStorage.getItem( 'previousSelectedReport' );
        if( previousSelectedReport !== null ) {
            newSearchData.previousSelectedReport = previousSelectedReport;
            updateSessionStorage( 'null' );
        }
        searchData.update( newSearchData );
    }
    return reportDefinitions;
};

export let setSharedWithList = ( propertyProp, property, i18n ) => {
    let nwpropertyProp = { ...propertyProp };
    const uiValues = property.uiValues;
    uiValues.sort( ( data1, data2 ) => { return data1.localeCompare( data2 ); } );
    let uiValue = uiValues.join( ', ' );
    // Check for private or public
    if( property.uiValues.length === 0 ) {
        uiValue = i18n.public;
    } else if( property.dbValues.length === 1 && property.dbValues[0] === appCtxService.ctx.userSession.props.fnd0groupmember.dbValue ) {
        uiValue = i18n.private;
    }
    nwpropertyProp.uiValue = uiValue;
    nwpropertyProp.dbValue = uiValue;
    return { propertyProp: nwpropertyProp };
};

let displaySummaryCustomReportPanel = function( ctx, selectedReport ) {
    if( ctx.activeToolsAndInfoCommand === undefined ) {
        cmdPanelSrvc.activateCommandPanel( 'Awp0ReportsSummary', 'aw_toolsAndInfo', selectedReport );
    }
};

export let performSelectionAndRunReport = ( selectionModel, selectedReport, ctx ) => {
    selectionModel.setSelection( selectedReport.uid );
    appCtxService.updatePartialCtx( 'selected', selectedReport );
    displaySummaryCustomReportPanel( ctx, selectedReport );
};

/**
 * Load the column configuration
 *
 * @param {Object} dataprovider - the data provider
 */
export let loadColumns = function( dataprovider ) {
    dataprovider.columnConfig = {
        columns: [ {
            name: 'rd_name',
            displayName: 'Name',
            typeName: 'ReportDefinition',
            width: 300,
            enableColumnMoving: false,
            enableColumnResizing: false,
            enableFiltering: false,
            pinnedLeft: true
        }, {
            name: 'rd_id',
            displayName: 'Id',
            typeName: 'ReportDefinition',
            width: 300
        }, {
            name: 'rd_description',
            displayName: 'Description',
            typeName: 'ReportDefinition',
            width: 300
        } ]
    };
};

/**
 * Update dataProvider when search filter is updated
 *
 * @param {Object} searchData - for searchString and count of total templates found
 * @param {Object} searchResults - list of report templates
 * @param {Object} dataProvider - the data provider
 */

export let updateDataProvider = function( searchData, searchResults, dataProvider ) {
    if( searchResults && searchData.criteria.searchString !== undefined && searchData.criteria.searchString !== null && searchData.criteria.searchString !== '*' && searchData.criteria.searchString !==
        '' ) {
        var filterResults = [];
        var cnt = 0;

        for( var i = 0; i < searchResults.length; i++ ) {
            if( searchResults[ i ].props.rd_name.uiValues[ 0 ].toLowerCase().replace( /\s/g, '' ).indexOf( searchData.criteria.searchString.toLowerCase().replace( /\s/g, '' ) ) >= 0 ) {
                filterResults[ cnt ] = searchResults[ i ];
                cnt++;
            }
        }
        dataProvider.viewModelCollection.update( filterResults, cnt );
    } else if( searchResults ) {
        dataProvider.viewModelCollection.update( searchResults, searchResults.length );
    }
    if( searchResults && searchData ) {
        const newSearchData = searchData.getValue();
        newSearchData.totalFound = dataProvider.viewModelCollection.loadedVMObjects.length;
        searchData.update( newSearchData );
    }
};

export let updateSessionStorage = function( uid ) {
    if( uid === 'null' ) {
        window.sessionStorage.removeItem( 'previousSelectedReport' );
    }else{
        window.sessionStorage.setItem( 'previousSelectedReport', uid );
    }
};
export default exports = {
    getReportDefinitionVal,
    getReportDefinitionValList,
    loadColumns,
    displaySummaryCustomReportPanel,
    updateDataProvider,
    performSelectionAndRunReport,
    getReportDefSearchCriteria,
    setSharedWithList,
    updateSessionStorage
};
