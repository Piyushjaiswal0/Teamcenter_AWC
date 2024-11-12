//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/searchColorDecoratorService
 */
import appCtxSvc from 'js/appCtxService';
import soa_kernel_soaService from 'soa/kernel/soaService';
import _ from 'lodash';
import filterPanelUtils from 'js/filterPanelUtils';
import awChartDataProviderService from 'js/awChartDataProviderService';
import awSearchService from 'js/awSearchService';
import Awp0SearchHighlightingService from 'js/Awp0SearchHighlightingService';
/**
 * @param {ViewModelObjectArray} vmos - ViewModelObject(s) to set style on.
 * @param {Boolean} clearStyles - true to clear the decorator styles.
 * @param {Array} groupedObjectsMap - groupedObjectsMap with index 0 is the objects array and index 1 is the color array.
 */
export let setDecoratorStyles = function( vmos, clearStyles, groupedObjectsMap ) {
    if( clearStyles ) {
        for( var key in vmos ) {
            vmos[ key ].cellDecoratorStyle = '';
            vmos[ key ].gridDecoratorStyle = '';
        }
    }
    if ( !groupedObjectsMap || groupedObjectsMap.length < 1 ) {
        return;
    }
    _.forEach( vmos, function( vmo ) {
        awSearchService.setColoringOnVMO( groupedObjectsMap, vmo );
    } );
};

/**
 * @param {searchState} searchState - searchState.
 * @param {dataProvider} dataProvider - dataProvider to set style on.
 * @param {toggleColors} toggleColors - true if it's triggered by colorToggle.
 */
export let groupObjectsByProperties = function( searchState, dataProvider, toggleColors ) {
    let vmos = dataProvider && dataProvider.viewModelCollection && dataProvider.viewModelCollection.loadedVMObjects ? dataProvider.viewModelCollection.loadedVMObjects : [];
    if ( !searchState.objectsGroupedByProperty || vmos.length < 1 || !searchState.regroupColors && !toggleColors ) {
        return;
    }
    if ( !searchState.isChartVisible ) {
        Awp0SearchHighlightingService.toggleColorFiltering( true );
    }
    let preferences = appCtxSvc.getCtx( 'preferences' );
    let decoratorToggle = searchState.colorToggle;
    if( decoratorToggle && searchState.objectsGroupedByProperty.groupedObjectsMap && searchState.objectsGroupedByProperty.groupedObjectsMap.length > 0 ) {
        searchColorDecoratorService.setDecoratorStyles( vmos, searchState.endIndex.toString() === preferences.AWC_DefaultPageSize[0], searchState.objectsGroupedByProperty.groupedObjectsMap );
        dataProvider.update( vmos, searchState.totalFound );
    } else {
        let searchFilterTargetCategory = awChartDataProviderService.getTargetSearchFilterCategory( searchState, searchState.objectsGroupedByProperty.internalPropertyName );
        let keys = Object.keys( searchFilterTargetCategory );
        if( searchFilterTargetCategory && keys && keys.length > 0 ) {
            let propGroupingValues = filterPanelUtils.getPropGroupValues( searchFilterTargetCategory );
            propGroupingValues = searchColorDecoratorService.removeEmptyPropertyGroupingValues( propGroupingValues );
            let typePropName = searchState.objectsGroupedByProperty.internalPropertyName;
            if( decoratorToggle && typePropName && propGroupingValues ) {
                let propNameIndex = typePropName.indexOf( '.' );
                let propName = typePropName.substring( propNameIndex + 1 );
                let input = {
                    objectPropertyGroupInputList: [ {
                        internalPropertyName: propName,
                        objectList: vmos,
                        propertyValues: propGroupingValues
                    } ]
                };
                soa_kernel_soaService.postUnchecked( 'Query-2014-11-Finder', 'groupObjectsByProperties', input ).then(
                    function( response ) {
                        if( response && response.groupedObjectsList && response.groupedObjectsList.length > 0 ) {
                            const newSearchData = { ...searchState.value };
                            //the internalPropertyName is already current, only groupedObjectsMap needs to be updated. But since
                            //SOA output only gives the property name without the "type.", we'll need to keep and reassign it back.
                            let internalPropertyName_FullName = newSearchData.objectsGroupedByProperty.internalPropertyName;
                            newSearchData.objectsGroupedByProperty = response.groupedObjectsList[0];
                            newSearchData.objectsGroupedByProperty.internalPropertyName = internalPropertyName_FullName;
                            searchState.update( newSearchData );
                            searchColorDecoratorService.setDecoratorStyles( vmos, true, response.groupedObjectsList[0].groupedObjectsMap );
                            dataProvider.update( vmos, newSearchData.totalFound );
                        }
                    } );
            }
        }
    }
};

/**
 * this function is to ensure that no empty propertyValue is sent to the groupObjectsByProperties call
 * @param {Array} propGroupingValues - the property values from context
 * @returns {Array} updatedPropGroupingValues - the property values which have empty propertyGroupID have been discarded
 */
export let removeEmptyPropertyGroupingValues = function( propGroupingValues ) {
    if( propGroupingValues ) {
        let updatedPropGroupingValues = [];
        for( let index = 0; index < propGroupingValues.length; index++ ) {
            let eachPropGroupingValue = propGroupingValues[ index ];
            delete eachPropGroupingValue.colorValue;
            delete eachPropGroupingValue.colorIndex;
            if( eachPropGroupingValue && eachPropGroupingValue.propertyGroupID && eachPropGroupingValue.propertyGroupID !== '' ) {
                updatedPropGroupingValues.push( eachPropGroupingValue );
            }
        }
        return updatedPropGroupingValues;
    }
    return propGroupingValues;
};

const searchColorDecoratorService =  {
    setDecoratorStyles,
    groupObjectsByProperties,
    removeEmptyPropertyGroupingValues
};

export default searchColorDecoratorService;
