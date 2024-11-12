// Copyright (c) 2022 Siemens

/**
 * @module js/awSubscriptionFollowerTableService
 */
import uwPropertySvc from 'js/uwPropertyService';
import tcViewModelObjectSvc from 'js/tcViewModelObjectService';
import _ from 'lodash';
import appCtx from 'js/appCtxService';

var _followerId = 1;
var vmoID = 1;

// There are lot of limitations for dataProvider...for client only interaction, we have to follow
// the practice in aw-abstract-tableproperty.controller.js to save a dataProvider refernce here
var _dataProvider = null;

/**
 * Follower attributes in DB needs several context, which we load here in one shot
 */
export let loadFollowerContext = function( provider, columnDefs, subscriptionObject ) {
    _followerId = 1;
    _dataProvider = provider;
    var subscriber = subscriptionObject.props.subscriber.uiValue;
    subscriber = subscriber.substring( subscriber.indexOf( '(' ) + 1, subscriber.indexOf( ')' ) );
    var followersObj = {
        columnDefs: columnDefs,
        subscriber: subscriber
    };
    appCtx.updateCtx( 'sub0Follower', followersObj );
};

/**
 * Create or Update Follower VMO object
 * @param {Object} columnDefs - Property definitions.
 * @param {Object} props - Input properties.
 * @param {Object} vmObject - Follower view model object.
 */
function _createOrUpdateFollowerObject( columnDefs, props, vmObject ) {
    if( !vmObject ) {
        vmObject = tcViewModelObjectSvc.createViewModelObjectById( 'SubsFollowerTable' + vmoID );
        vmoID++;
        vmObject.type = 'Sub0Follower';
        vmObject.followerId = _followerId;
        _followerId++;
    }

    return _.reduce( columnDefs, function( vmObject, columnInfo ) {
        var dbValues = props[ columnInfo.name ].dbValues;
        var displayValues = props[ columnInfo.name ].displayValues;
        vmObject.props[ columnInfo.name ] = uwPropertySvc.createViewModelProperty( columnInfo.name, columnInfo.displayName,
            columnInfo.typeName, dbValues, displayValues );
        vmObject.props[ columnInfo.name ].uiValues = displayValues;
        vmObject.props[ columnInfo.name ].propertyDescriptor = {
            displayName: columnInfo.displayName
        };
        return vmObject;
    }, vmObject );
}

/**
 * Load attributes on subscription to create follower objects
 * @return {Array} An array of follower VMOs.
 */
export let loadFollowerObjects = function( followerCtx, subscriptionObject ) {
    var _followerObjectList = [];
    _.forEach( subscriptionObject.props.handler_parameters.dbValue, function( val, rowNdx ) {
        if( val !== undefined && val !== null && val !== '' ) {
            _followerObjectList.push( _createOrUpdateFollowerObject( followerCtx.columnDefs, _.reduce( followerCtx.columnDefs, function( props, columnInfo ) {
                var dbVal = subscriptionObject.props[ columnInfo.name ].dbValue[ rowNdx ];
                var dispVal = [ dbVal ];
                props[ columnInfo.name ] = {
                    dbValues: dbVal,
                    displayValues: dispVal
                };
                return props;
            }, {} ) ) );
        }
    } );
    appCtx.updateCtx( 'sub0Follower.followerObjects', _followerObjectList );
    return _followerObjectList;
};

/**
 * Apply Add panel values back to Follower Table.
 */
export let applyFollowerChange = function( followerObjects, columnDefs, selectedFollowers ) {
    _.forEach( selectedFollowers.handler_parameters, function( val ) {
        var displayName = '';
        if( val && val.props && val.props.user_id ) {
            displayName = val.props.user_id.uiValues[0];
        }
        val.handler_parameters = {
            dbValues: displayName,
            displayValues: [ displayName ]
        };
        var found = _.some( _dataProvider.viewModelCollection.loadedVMObjects, function( object ) {
            if( object.props.handler_parameters.displayValues[ 0 ] === val.handler_parameters.displayValues[ 0 ] ) {
                return true;
            }
            return false;
        } );
        if( !found ) {
            followerObjects.push( _createOrUpdateFollowerObject( columnDefs, val ) );
        }
    } );
    _dataProvider.update( followerObjects, followerObjects.length );
};

/**
 * Remove selected object from follower object list.
 */
export let removeFollower = function( followerObjects, selectedObj ) {
    _.remove( followerObjects, { followerId: selectedObj.followerId } );
    _dataProvider.update( followerObjects, followerObjects.length );
};

/**
 * Update VMO infomation back to ImanSubscription Object.
 */
export let updateSubscriptionObject = function( subscriptionObject, columnDefs, followerObjects, xrtState ) {
    let newXrtState = { ...xrtState.getValue() };

    _.forEach( columnDefs, function( columnInfo ) {
        var prop = subscriptionObject.props[ columnInfo.name ];
        uwPropertySvc.setValue( prop, _.reduce( followerObjects, function( sum, o ) {
            return sum.concat( [ o.props[ columnInfo.name ].dbValue ? o.props[ columnInfo.name ].dbValue : '' ] );
        }, [] ) );
        prop.dbValues = prop.dbValue;
        if( newXrtState && newXrtState.xrtVMO ) {
            newXrtState.xrtVMO.props[ prop.propertyName ] = prop;
        }
    } );

    xrtState.update( newXrtState );
};

/**
 * Processes the editHandlerStateChange event
 * When the state is cancelling Load the original Follower view model objects
 * back into the table thereby discarding any uncommited vmo's not in the ImanSubscription handler_parameters.
 * update the dataProvider
 *
 * @param {Object} followerCtx followerObjects
 * @param {Object} subscriptionObject source object
 * @return {Array} An array of Follower VMOs.
 */
export let resetFollowerTable = function( followerCtx, subscriptionObject ) {
    // Remove selection
    _dataProvider.selectNone();
    _followerId = 1;
    var followerObjects = [];
    _dataProvider.viewModelCollection.clear();
    followerObjects = loadFollowerObjects( followerCtx, subscriptionObject );
    _dataProvider.update( followerObjects, followerObjects.length );
    appCtx.updateCtx( 'sub0Follower.followerObjects', followerObjects );
    return followerObjects;
};

export let getColumnsNameArray = function( columnDefs ) {
    return _.map( columnDefs, function( o ) {
        return o.name;
    } );
};

const exports = {
    loadFollowerContext,
    loadFollowerObjects,
    applyFollowerChange,
    removeFollower,
    updateSubscriptionObject,
    resetFollowerTable,
    getColumnsNameArray
};
export default exports;
