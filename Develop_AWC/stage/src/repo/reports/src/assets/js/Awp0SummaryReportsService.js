// Copyright (c) 2022 Siemens

/**
 * @module js/Awp0SummaryReportsService
 */
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import reportsPanel from 'js/Awp0InContextReportsService';
import lovService from 'js/lovService';
import viewModelObjectService from 'js/viewModelObjectService';
import tcVmoService from 'js/tcViewModelObjectService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
const SAVED_QRY_PREFIX = 'AW_SD_QRY_PRE__';
var exports = {};

export let conditionalPanelReveal = function( selectedReportDefinitionObject, data, runReportAsync ) {
    if( selectedReportDefinitionObject && selectedReportDefinitionObject.props === undefined ) { return; }

    if( selectedReportDefinitionObject && data._internal.panelId === 'Awp0ReportsSummaryExecution' ) {
        if( Object.keys( selectedReportDefinitionObject.props ).length <= 5 ) {
            cdm.getObject( selectedReportDefinitionObject );
        }

        var customRepConfig = {
            customRepProps:[],
            propConfigs: false
        };
        reportsPanel.displayStylesheet( selectedReportDefinitionObject, data );
        reportsPanel.getLanguageList( selectedReportDefinitionObject, data );
        let nwrunReportAsync = { ...runReportAsync };
        nwrunReportAsync.dbValue = selectedReportDefinitionObject.props.fnd0IsAsync.dbValues[0] === '1';

        if( selectedReportDefinitionObject.props.rd_type.dbValues[ 0 ] === '0' &&
            selectedReportDefinitionObject.props.rd_source.dbValues[ 0 ] !== 'TcRA' ) {
            eventBus.publish( 'initiateCalltoLoadQuerySource', {
                selectedReport: selectedReportDefinitionObject
            } );
        } else if( selectedReportDefinitionObject.props.rd_type.dbValues[ 0 ] === '2' &&
            selectedReportDefinitionObject.props.rd_source.dbValues[ 0 ] !== 'TcRA' ) {
            customRepConfig = reportsPanel.createwidgetsforCustom( selectedReportDefinitionObject, data );
        }
        data.dispatch( { path: 'data.selectedReportDef', value: selectedReportDefinitionObject } );
        return {
            customRepProps: customRepConfig.customRepProps,
            runReportAsync: nwrunReportAsync
        };
    }
};

export let getImanQueryObject = function( selectedReportDefinitionObject ) {
    var deferred = AwPromiseService.instance.defer();

    var query_src_object = {
        uid: '',
        type: 'ImanQuery'
    };
    //selectedReportDefinitionObject = data.selectedReportDef;
    if( selectedReportDefinitionObject !== null ) {
        var referenceBO = cdm.getObject( selectedReportDefinitionObject.props.rd_query_source.dbValues[ 0 ] );

        var propNames = [ 'qry_src_tc_qry' ];
        var objs = [ referenceBO ];
        tcVmoService.getViewModelProperties( objs, propNames ).then( function() {
            query_src_object.uid = objs[ 0 ].props.qry_src_tc_qry.dbValues[ 0 ];
            //data.query_src_Object = query_src_object;
            deferred.resolve( query_src_object );
        } );
    }

    return deferred.promise;
};

export let getRealProperties = function( modelObject ) {
    var propsInterested = {};
    var propsInterestedOrdered = {};
    var maxAttributeIndex = 0;
    _.forEach( modelObject.props, function( prop ) {
        var displayName = prop.propertyDescriptor.displayName;
        if( displayName && displayName.trim() ) {
            var attributeNameOriginal = prop.propertyDescriptor.name;
            var indexOf_ = attributeNameOriginal.indexOf( '_' );
            //if indexOf_<0, it is not an attribute interested in, e.g., an attribute inherited from the parent which is not a query clause
            if( indexOf_ >= 0 ) {
                var attributeIndexStr = attributeNameOriginal.substring( 0, indexOf_ );
                try {
                    var attributeIndex = parseInt( attributeIndexStr, 10 );
                    if( !isNaN( attributeIndex ) ) {
                        if( attributeIndex > parseInt( maxAttributeIndex, 10 ) ) {
                            maxAttributeIndex = attributeIndex;
                        }
                        var attributeName = attributeNameOriginal.substring( indexOf_ + 1 );
                        prop.propName = attributeName;
                        //check if LOV
                        if( prop.propertyDescriptor.lovCategory === 1 ) {
                            prop.propertyDescriptor.anArray = true;
                            prop.propertyDescriptor.fieldType = 1;
                            prop.propertyDescriptor.maxArraySize = -1;
                            if( prop.uiValues.length === 1 && prop.uiValues[ 0 ] === '' ) {
                                prop.uiValues = [];
                                prop.dbValues = [];
                            }
                            getRealLovValues( prop );
                        }
                        propsInterested[ attributeIndex ] = prop;
                    }
                } catch ( e ) {
                    //not an attribute interested in, e.g., an attribute inherited from the parent which is not a query clause
                }
            }
        }
    } );
    //Date query critiera attribute should always show time, it doesn't honor Fnd0EnableTimeForDateProperty property constant
    //Since there is no information about timeEnabled from query criteria property descript constant map, add timeEnable=1 to
    //always show time widget in advanced search page.
    _.forEach( propsInterested, function( property ) {
        if( property ) {
            var propDesc = property.propertyDescriptor;
            var constantsMap;
            if( propDesc && propDesc.valueType === 2 ) {
                constantsMap = propDesc.constantsMap;
            }
            if ( constantsMap ) {
                if ( _.isUndefined( constantsMap.timeEnabled ) ) {
                    constantsMap.timeEnabled = '1';
                }
            }
        }
    } );
    //return the props in ordered list
    for( var i = 0; i <= maxAttributeIndex; i++ ) {
        var prop = propsInterested[ i ];
        if( prop ) {
            propsInterestedOrdered[ prop.propName ] = prop;
        }
    }
    return propsInterestedOrdered;
};

export let getRealLovValues = function( prop ) {
    if( prop.uiValues.length > 0 && prop.dbValues.length > 0  ) {
        let uiValue = prop.uiValues[0];
        let dbValue = prop.dbValues[0];
        if ( uiValue.startsWith( SAVED_QRY_PREFIX ) ) {
            //extract the substring after SAVED_QRY_PREFIX
            uiValue = uiValue.substring( 15 );
        }
        if ( dbValue.startsWith( SAVED_QRY_PREFIX ) ) {
            dbValue = dbValue.substring( 15 );
        }
        prop.uiValues[0] = uiValue;
        prop.dbValues[0] = dbValue;
    }
};

export let getSelectedQueryModelObject = function( response ) {
    return cdm.getObject( response.advancedQueryCriteria.uid );
};

export let createSummaryReportWidgets = function( data ) {
    //var modelObject = cdm.getObject( data.queryCriteriaUid );

    var modelObjectForDisplay = {
        uid: data.selectedRDQuery.uid,
        props: exports.getRealProperties( data.reportQueryAttrModelObject ),
        type: 'ImanQuery',
        modelType: data.reportQueryAttrModelObject.modelType
    };

    var savedQueryViewModelObj = viewModelObjectService.constructViewModelObjectFromModelObject(
        modelObjectForDisplay, 'Search' );

    _.forEach( savedQueryViewModelObj.props, function( prop ) {
        if( prop.lovApi ) {
            lovService.initNativeCellLovApi( prop, null, 'Search', savedQueryViewModelObj );
        }
    } );

    //data.clausesfiltersList = savedQueryViewModelObj.props;
    //appCtxService.updatePartialCtx( 'awp0SummaryReports.clausesfiltersList', data.clausesfiltersList );
    return savedQueryViewModelObj;
};

export default exports = {
    conditionalPanelReveal,
    getImanQueryObject,
    getRealProperties,
    createSummaryReportWidgets,
    getSelectedQueryModelObject,
    getRealLovValues
};
