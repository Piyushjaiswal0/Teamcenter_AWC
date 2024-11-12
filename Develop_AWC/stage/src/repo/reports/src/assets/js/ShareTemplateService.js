import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import dmSvc from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';

var removeButtonName = 'remove';
var addButtonName = 'add';

export let updateSharedWith = function( rb0ShareState ) {
    var nwRb0ShareState = rb0ShareState.getValue();
    var Fnd0Applicable_Assignment = nwRb0ShareState.selectedReport.props.Fnd0Applicable_Assignment;
    if( Fnd0Applicable_Assignment.dbValues.length > 0 ) {
        if( Fnd0Applicable_Assignment.dbValues.length === 1 && appCtxService.ctx.userSession.props.fnd0groupmember.dbValue === Fnd0Applicable_Assignment.dbValues[0] ) {
            return 'private';
        }
        return 'custom';
    }
    return 'public';
};

export let onChangeOfSharedWith = function( sharedWith, reportsState, shareReportState, dataProvider ) {
    var nwReportsState = reportsState.getValue();
    var nwSharedWithList = [];
    if( sharedWith === 'public' ) {
        // sharedWith === everyone (organization)
        nwSharedWithList = [];
    } else if( sharedWith === 'private' ) {
        // sharedWith === no user (current User)
        nwSharedWithList.push( { uid:appCtxService.ctx.userSession.props.fnd0groupmember.dbValue } );
    } else if( sharedWith === 'custom' ) {
        // sharedWith === selected user (custom)
        _.forEach( nwReportsState.selectedReport.props.Fnd0Applicable_Assignment.dbValues, ( value )=> {
            value !== appCtxService.ctx.user.uid && nwSharedWithList.push( { uid:value } );
        } );
        //Pushing current 
        nwSharedWithList.length === 0 ? nwSharedWithList.push( { uid:appCtxService.ctx.userSession.props.fnd0groupmember.dbValue } ) : '';
    }
    nwReportsState.sharedWithList = nwSharedWithList;
    reportsState.update( nwReportsState );
    var nwShareReportState = shareReportState.getValue();
    //TODO: Clearing selections on state but UI shows selected
    nwShareReportState.selectedAccessors = [];
    shareReportState.update( nwShareReportState );
    getSharedWithList( shareReportState, '', reportsState, dataProvider, sharedWith === 'private' || sharedWith === 'public' );
};
export let searchWithinSharedTable = function( modelObjects, searchString ) {
    var results = [];
    if( searchString && searchString.length > 0 ) {
        searchString = searchString.toLowerCase();
    }
    _.forEach( modelObjects, function( accessor ) {
        if( accessor && accessor.props && accessor.props.object_string && accessor.props.object_string.uiValues && accessor.props.object_string.uiValues.length > 0 ) {
            var obj_string = accessor.props.object_string.uiValues[ 0 ];
            obj_string = obj_string.toLowerCase();
            if( obj_string.indexOf( searchString ) !== -1 ) {
                results.push( accessor );
            }
        } else {
            results.push( accessor );
        }
    } );
    return results;
};
export let getSharedWithList = async function( shareReportState, searchString, reportsState, dataProvider, isPrivate ) {
    var nwShareReportState = shareReportState.getValue();
    var selectedAccessor;
    var nwReportsState = reportsState.getValue();
    var modelObjects = [];
    nwShareReportState.selectedAccessors ? _.forEach( nwShareReportState.selectedAccessors, ( accessor )=>{
        if( accessor?.object ) {
            selectedAccessor = accessor.object;
        } else {
            selectedAccessor = accessor;
        }
        var uid = selectedAccessor?.uid;
        var removeItemIndex = -1;
        uid && _.forEach( nwReportsState.sharedWithList, ( object, index )=> {
            if( object.uid === uid ) {
                removeItemIndex = index;
            }
        } );
        if( !isPrivate && nwShareReportState.add === false && removeItemIndex > -1 ) {
        // Removing organization/project from sharedWithList
            nwReportsState.sharedWithList.splice( removeItemIndex, 1 );
        } else if( !isPrivate && nwShareReportState.add === true && removeItemIndex === -1 ) {
        // Adding organization/project to sharedWithList
            selectedAccessor && nwReportsState.sharedWithList.push( selectedAccessor );
        }
    } ) : '';
    _.forEach( nwReportsState.sharedWithList, ( object )=> {
        modelObjects.push( object );
    } );
    var arrayUids = [];
    modelObjects.forEach( ( object )=> arrayUids.push( object.uid ) );
    var propList = [ 'awp0CellProperties', 'group', 'object_string', 'role', 'user' ];
    await dmSvc.getProperties( arrayUids, propList ).then( function() {
        // Create view model objects
        modelObjects = modelObjects.map( function( vmo ) {
            vmo = cdm.getObject( vmo.uid ) ? cdm.getObject( vmo.uid ) : vmo;
            return vmo;
        } );
    } );
    modelObjects = searchWithinSharedTable( modelObjects, searchString );
    modelObjects.sort( ( data1, data2 ) => { return data1.props.object_string.uiValues[0].localeCompare( data2.props.object_string.uiValues[0] ); } );
    if( arrayUids.length === nwReportsState.selectedReport?.props?.Fnd0Applicable_Assignment?.dbValues.length &&
        arrayUids.every( ( uid, i ) => uid === nwReportsState.selectedReport.props.Fnd0Applicable_Assignment.dbValues[i] ) ) {
        nwShareReportState.changedSharedWith = false;
    }else{
        nwShareReportState.changedSharedWith = true;
    }
    shareReportState.update( nwShareReportState );
    reportsState.update( nwReportsState );
    dataProvider.update( modelObjects, modelObjects.length );
    return modelObjects;
};

const removeSelectedAccessorsFromAccessorsString = ( selectedAccessorsToRemove, currentAccessorsString ) => {
    let currentAccessorsUids = currentAccessorsString.split( ',' );
    let updatedAccessorsUids = new Set();
    for( let index = 0; index < currentAccessorsUids.length; index++ ) {
        let eachCurrentAccessorUid = currentAccessorsUids[ index ];
        for( let selectedAccessorsIndex = 0; selectedAccessorsIndex < selectedAccessorsToRemove.length; selectedAccessorsIndex++ ) {
            let eachSelectedAccessorUid = selectedAccessorsToRemove[ selectedAccessorsIndex ].uid;
            if( eachCurrentAccessorUid !== eachSelectedAccessorUid ) {
                updatedAccessorsUids.add( eachCurrentAccessorUid );
            }
        }
    }
    let updatedAccessorsUidsAsArray = Array.from( updatedAccessorsUids );
    return getSharedWithListString( updatedAccessorsUidsAsArray );
};

const getSharedWithListString = ( currentSharedWithList ) => {
    let currentSharedWithListAsString = '';
    for( let index = 0; index < currentSharedWithList.length; index++ ) {
        let accessor = currentSharedWithList[ index ];
        let eachSelectedObject;
        if( accessor?.object?.uid ) {
            eachSelectedObject = accessor.object;
        } else {
            eachSelectedObject = accessor;
        }
        if( index === 0 ) {
            currentSharedWithListAsString += eachSelectedObject.uid;
        } else {
            currentSharedWithListAsString += ',' + eachSelectedObject.uid;
        }
    }
    return currentSharedWithListAsString;
};

export let addShareReport = function( shareReportState ) {
    const newShareReportState = { ...shareReportState.value };
    newShareReportState.disableAddButton = true;
    newShareReportState.disableRemoveButton = true;
    if( newShareReportState.selectedAccessors && newShareReportState.selectedAccessors.length > 0 ) {
        let accessorsString = getSharedWithListString( newShareReportState.selectedAccessors );
        if( accessorsString.length > 0 ) {
            newShareReportState.accessorsString = accessorsString;
        }
    }
    newShareReportState.add = true;
    shareReportState.update( newShareReportState );
};
export let removeShareReport = function( shareReportState ) {
    const newShareReportState = { ...shareReportState.value };
    newShareReportState.disableAddButton = true;
    newShareReportState.disableRemoveButton = true;
    if( newShareReportState.selectedAccessors && newShareReportState.selectedAccessors.length > 0 ) {
        newShareReportState.accessorsString = removeSelectedAccessorsFromAccessorsString( newShareReportState.selectedAccessors, newShareReportState.currentAccessorsString );
    }
    newShareReportState.add = false;
    shareReportState.update( newShareReportState );
};
export let prepareInputForDeleteRelations = function( primaryObject, sharedWithList, access ) {
    var inputData = [];
    var secondaryObjects = [];
    if( access === 'public' || access === 'private' ) {
        // iterate all primaryObject.props.Fnd0_assignments(secondaryObjects) and prepare input
        _.forEach( primaryObject.props.Fnd0Applicable_Assignment.dbValues, ( value )=> {
            secondaryObjects.push( { uid:value } );
        } );
    } else {
        // remove primaryObject.props.Fnd0_assignments and sharedwithList commons
        // sharedWithList contains removed accessors then prepare that list and make input
        // make array of common between sharedList nd Fnd0_assi..
        // make array of removed -> fnd0_ass.. contains but sharedList does not containing
        // both array(secondaryObjects) needs to prepare return into inputData
        _.forEach( sharedWithList, ( value )=> {
            if( primaryObject.props.Fnd0Applicable_Assignment.dbValues.indexOf( value.uid ) !== -1 ) {
                secondaryObjects.push( value );
            }
        } );
        _.forEach( primaryObject.props.Fnd0Applicable_Assignment.dbValues, ( value )=> {
            var flag = false;
            _.forEach( sharedWithList, ( sharedWithValues )=> {
                if( value === sharedWithValues.uid ) {
                    flag = true;
                }
            } );
            if( !flag ) {
                secondaryObjects.push( { uid:value } );
            }
        } );
    }
    _.forEach( secondaryObjects, ( secondaryObject ) => {
        inputData.push( {
            primaryObject: {
                type: primaryObject.type,
                uid: primaryObject.uid
            },
            secondaryObject: {
                type: secondaryObject.type,
                uid: secondaryObject.uid
            },
            relationType: 'Fnd0Applicable_Assignment',
            clientId: '',
            userData: {
                uid: 'AAAAAAAAAAAAAA',
                type: 'unknownType'
            }
        } );
    } );
    return inputData;
};
export let prepareInputForCreateRelations = ( primaryObject, secondaryObjects ) => {
    // primaryObject => selectedReport (reportsState.selectedReport)
    // secondaryObjects => sharedWithList (reportsState.sharedWithList)
    var inputData = [];
    _.forEach( secondaryObjects, ( secondaryObject ) => {
        inputData.push( {
            primaryObject: {
                type: primaryObject.type,
                uid: primaryObject.uid
            },
            secondaryObject: {
                type: secondaryObject.type,
                uid: secondaryObject.uid
            },
            relationType: 'Fnd0Applicable_Assignment',
            clientId: '',
            userData: {
                uid: 'AAAAAAAAAAAAAA',
                type: 'unknownType'
            }
        } );
    } );
    return inputData;
};
export let processReportTemplate = ( response, reportsState )=> {
    var nwReportsState = reportsState.getValue();
    var reportId = response.ServiceData.updated[0];
    var reportDefn = response.ServiceData.modelObjects[reportId];
    nwReportsState.selectedReport = reportDefn;
    reportsState.update( nwReportsState );
};

export let updateSelectedReportForPublic = ( response, reportsState )=>{
    var nwReportsState = reportsState.getValue();
    var reportDefn = response.modelObjects[nwReportsState.selectedReport.uid];
    nwReportsState.selectedReport = reportDefn;
    reportsState.update( nwReportsState );
};

export let disableButtonForSharedWith = function( buttonName, dataProvider, currentSearchFolderAccessors, shareReportsState, reportsState ) {
    let selectedAccessors = dataProvider.selectedObjects;
    const newShareReportsState = { ...shareReportsState.value };
    if( selectedAccessors && selectedAccessors.length > 0 ) {
        newShareReportsState.selectedAccessors = selectedAccessors;
        let containsOwnerInSelectedAccessor = false;
        _.forEach( selectedAccessors, selectedAccessor=>{
            if( selectedAccessor.props?.group?.dbValues[0] === reportsState.selectedReport.props.owning_group.dbValues[0] &&
            selectedAccessor.props?.user?.dbValues[0] === reportsState.selectedReport.props.owning_user.dbValues[0] ) {
                containsOwnerInSelectedAccessor = true;
            }
        } );
        if( containsOwnerInSelectedAccessor ) {
            newShareReportsState.availableTableSelection = false;
            newShareReportsState.sharedWithTableSelection = false;
            newShareReportsState.disableRemoveButton = true;
            newShareReportsState.disableAddButton = true;
        } else if( buttonName === removeButtonName ) {
            newShareReportsState.availableTableSelection = true;
            newShareReportsState.sharedWithTableSelection = false;
            newShareReportsState.disableRemoveButton = true;
            newShareReportsState.disableAddButton = false;
        } else if( buttonName === addButtonName ) {
            newShareReportsState.sharedWithTableSelection = true;
            newShareReportsState.availableTableSelection = false;
            newShareReportsState.disableAddButton = true;
            newShareReportsState.disableRemoveButton = false;
            newShareReportsState.currentAccessorsString = getSharedWithListString( currentSearchFolderAccessors );
        }
    } else if( selectedAccessors && selectedAccessors.length === 0
        && newShareReportsState.currentAccessorsString && newShareReportsState.currentAccessorsString.length === 0 ) {
        delete newShareReportsState.selectedAccessors;
        newShareReportsState.availableTableSelection = false;
        newShareReportsState.sharedWithTableSelection = false;
        newShareReportsState.disableRemoveButton = true;
        newShareReportsState.disableAddButton = true;
    }
    shareReportsState.update( newShareReportsState );
};

const ShareTemplateService = {
    updateSharedWith,
    onChangeOfSharedWith,
    getSharedWithListString,
    getSharedWithList,
    removeSelectedAccessorsFromAccessorsString,
    addShareReport,
    removeShareReport,
    searchWithinSharedTable,
    prepareInputForDeleteRelations,
    prepareInputForCreateRelations,
    processReportTemplate,
    updateSelectedReportForPublic,
    disableButtonForSharedWith
};
export default ShareTemplateService;

