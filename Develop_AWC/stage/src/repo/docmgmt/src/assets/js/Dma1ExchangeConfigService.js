// Copyright (c) 2022 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Dma1ExchangeConfigService
 */
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import msgService from 'js/messagingService';

var exports = {};

/**
 * Confirm delete selected attribute exchange configurations
 *
 * @param {Object} data - the data in ViewModel
 * @returns {Promise} the promise
 */
export let confirmDeleteExchangeConfig = function( data ) {
    var deferred = AwPromiseService.instance.defer();

    setAttrExchangeData( data );

    if( data.exchangeConfigs.length > 0 ) {
        if( data.exchangeConfigs.length === 1 ) {
            data.toDelete = '"' + data.exchangeConfigs[ 0 ].presentedPropertyName + '"';
        } else {
            data.toDelete = data.i18n.selections.replace( '{0}', data.exchangeConfigs.length );
        }

        showDeleteWarning( data, deferred );
    }

    return deferred.promise;
};

/**
 * Show delete warning message
 *
 * @param {Object} data - the data
 * @param {Object} deferred - the deferred
 */
function showDeleteWarning( data, deferred ) {
    var msg = data.i18n.deleteConfirmation.replace( '{0}', data.toDelete );
    data.confirmDelete = '';
    var buttons = [ {
        addClass: 'btn btn-notify',
        text: data.i18n.cancel,
        onClick: function( $noty ) {
            $noty.close();
            deferred.resolve( data.confirmDelete = false );
        }
    }, {
        addClass: 'btn btn-notify',
        text: data.i18n.delete,
        onClick: function( $noty ) {
            $noty.close();
            deferred.resolve( data.confirmDelete = true );
        }
    } ];
    msgService.showWarning( msg, buttons );
}

/**
 * Set multiselected members or presented properties
 *
 * @param {Object} data - the data of the ViewModel
 */
function setAttrExchangeData( data ) {
    var list = [];
    var selected = appCtxSvc.getCtx( 'selected' );
    var mselected = appCtxSvc.getCtx( 'mselected' );
    var rowId = getRowId( selected );

    if( rowId ) {
        list.push( rowId );
    }

    if( mselected ) {
        for( var i = 0; i < mselected.length; i++ ) {
            rowId = getRowId( mselected[ i ] );
            if( rowId && list.indexOf( rowId ) === -1 ) {
                list.push( rowId );
            }
        }
    }

    data.exchangeConfigs = list.map( function( v ) {
        return { presentedPropertyName: v, action: 'delete' };
    } );
}

/**
 * Get row ID fnd0TargetPresentedPropName
 *
 * @param {Object} row - the selected row
 * @returns {Object} the row ID, or null if not exist
 */
function getRowId( row ) {
    return row && row.props && row.props.fnd0TargetPresentedPropName ?
        getDbValue( row.props.fnd0TargetPresentedPropName ) : null;
}

/**
 * Get the property dbValue or dbValues[0] even if one of them not exist
 *
 * @param {Object} prop - the property
 * @return {String} the dbValue or dbValues[0]
 */
function getDbValue( prop ) {
    return prop.dbValues && prop.dbValues.length > 0 ? prop.dbValues[ 0 ] : prop.dbValue;
}

/**
 * Service to define actions on alert notification click for document management application
 *
 * @member Dma1ExchangeConfigService
 */
export default exports = {
    confirmDeleteExchangeConfig
};
