// Copyright (c) 2022 Siemens

/**
 * @module js/Awp0ShowSaveAsService
 */
import dateTimeSvc from 'js/dateTimeService';
import adapterSvc from 'js/adapterService';
import commandsSvc from 'js/command.service';
import _ from 'lodash';
import AwStateService from 'js/awStateService';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import _uwPropSrv from 'js/uwPropertyService';
import commandPanelService from 'js/commandPanel.service';

var exports = {};

/**
 * Return string value for given property value
 *
 * @param {String|Number|Object} propVal - The property valuecheck box selection.
 * @param {String} propType - The property type
 * @return {String} The stringified property value.
 */
const _convertPropValToString = function( propVal, propType ) {
    if( _.isNull( propVal ) || _.isUndefined( propVal ) ) {
        return '';
    }
    if( propType.indexOf( 'DATE' ) === 0 ) { // 'DATE' or 'DATEARRAY'
        return dateTimeSvc.formatUTC( propVal );
    } else if( propType.indexOf( 'INTEGER' ) === 0 || propType.indexOf( 'DOUBLE' ) === 0 ) { // 'INTEGER', 'DOUBLE' and their 'ARRAY'
        return String( propVal );
    } else if( propType.indexOf( 'BOOLEAN' ) === 0 ) { // 'BOOLEAN' or 'BOOLEANARRAY'
        return propVal ? '1' : '0';
    } else if( propType.indexOf( 'CHAR' ) === 0 || propType.indexOf( 'STRING' ) === 0 ) { // 'STRING', 'CHAR' and their 'ARRAY'
        return propVal;
    } else if( propVal.uid && propVal.type && propVal.modelType && propVal.props ) { // Model Object
        return propVal.uid;
    }

    return '';
};

/**
 * Process the deep copy data for user's choice in check box
 *
 * @param {ObjectArray} deepCopyDataArr - The deep copy data array
 * @param {Object} data - The vm data
 * @param {Boolean} copyOverEnabled - true, if copy over is enabled; false, otherwise
 * @param {Object} xrtState - xrt state atomic data
 */
var _processDeepCopyData = function( deepCopyDataArr, data, copyOverEnabled, xrtState ) {
    _.forEach( deepCopyDataArr, function( deepCopyData ) {
        if( copyOverEnabled && !deepCopyData.isRequired ) {
            var checkBoxPropName = deepCopyData.propertyName + '_checkbox';
            if( xrtState ) {
                let defaultCopyOptionProps = {};
                xrtState.copyOptions.forEach( ( copyOption ) => {
                    if( copyOption ) {
                        let propName = Object.keys( copyOption )[0];
                        defaultCopyOptionProps[ propName ] = copyOption[ propName ];
                    }
                } );

                let copyOptionProp = xrtState.copyOptionProps ? xrtState.copyOptionProps[ checkBoxPropName ] : defaultCopyOptionProps[ checkBoxPropName ];
                if( copyOptionProp && !copyOptionProp.dbValue ) {
                    deepCopyData.copyAction = 'NoCopy';
                }
            }
        }

        if( deepCopyData.attachedObject ) {
            if( !deepCopyData.saveAsInput ) {
                deepCopyData.saveAsInput = {};
            }
            deepCopyData.saveAsInput.boName = deepCopyData.attachedObject.type;
        }

        if( _.isArray( deepCopyData.childDeepCopyData ) ) {
            _processDeepCopyData( deepCopyData.childDeepCopyData, data, copyOverEnabled, xrtState );
        }
    } );
};

var _typeToPlace = {
    CHAR: 'stringProps',
    STRING: 'stringProps',
    STRINGARRAY: 'stringArrayProps',
    BOOLEAN: 'boolProps',
    BOOLEANARRAY: 'boolArrayProps',
    DATE: 'dateProps',
    DATEARRAY: 'dateArrayProps',
    OBJECT: 'tagProps',
    OBJECTARRAY: 'tagArrayProps',
    DOUBLE: 'doubleProps',
    DOUBLEARRAY: 'doubleArrayProps',
    INTEGER: 'intProps',
    INTEGERARRAY: 'intArrayProps'
};

/**
 * Add given property to SaveAsInput structure
 *
 * @param {Object} saveAsInputIn - The SaveAsInput structure
 * @param {String} propName - The property name
 * @param {Object} vmProp - The VM property
 */
var _setProperty = function( saveAsInputIn, propName, vmProp ) {
    var place = _typeToPlace[ vmProp.type ];
    if( _.isUndefined( saveAsInputIn[ place ] ) ) {
        saveAsInputIn[ place ] = {};
    }

    switch ( vmProp.type ) {
        case 'STRING':
        case 'STRINGARRAY':
        case 'BOOLEAN':
        case 'BOOLEANARRAY':
        case 'DOUBLE':
        case 'DOUBLEARRAY':
        case 'INTEGER':
        case 'INTEGERARRAY':
            saveAsInputIn[ place ][ propName ] = vmProp.dbValue;
            break;
        case 'DATE':
            saveAsInputIn[ place ][ propName ] = dateTimeSvc.formatUTC( vmProp.dbValue );
            break;
        case 'DATEARRAY':
            var rhs = [];
            _.forEach( vmProp.dbValue, function( val ) {
                rhs.push( dateTimeSvc.formatUTC( val ) );
            } );
            saveAsInputIn[ place ][ propName ] = rhs;
            break;
        case 'OBJECT':
            var objectValue = vmProp.dbValue;
            if( _.isString( vmProp.dbValue ) ) {
                objectValue = { uid: vmProp.dbValue };
            }
            saveAsInputIn[ place ][ propName ] = objectValue;
            break;
        case 'OBJECTARRAY':
            rhs = [];
            _.forEach( vmProp.dbValue, function( val ) {
                var objectValue = val;
                if( _.isString( val ) ) {
                    objectValue = { uid: val };
                }
                rhs.push( objectValue );
            } );
            saveAsInputIn[ place ][ propName ] = rhs;
            break;
        default:
            saveAsInputIn.stringProps[ propName ] = vmProp.dbValue;
            break;
    }
};

/**
 * Get the deep copy data for the given property name
 *
 * @param {ObjectArray} deepCopyDataArr - The deep copy data array
 * @param {String} targetPropName - The property name
 * @returns {Object} deep copy data
 */
var _getDeepCopyDataForProp = function( deepCopyDataArr, targetPropName ) {
    var dcd = {};
    var colonIdx = targetPropName.indexOf( ':' );
    var propToFind = targetPropName.substring( 0, colonIdx );
    var remainder = targetPropName.substring( colonIdx + 1 );
    for( var id in deepCopyDataArr ) {
        var deepCopyData = deepCopyDataArr[ id ];
        if( deepCopyData.propertyName === propToFind ) {
            if( remainder.indexOf( ':' ) > 0 ) {
                var childDeepCopyData = deepCopyData.childDeepCopyData;
                if( _.isArray( childDeepCopyData ) ) {
                    dcd = _getDeepCopyDataForProp( childDeepCopyData, remainder );
                    break;
                }
            } else {
                dcd = deepCopyData;
                break;
            }
        }
    }

    return dcd;
};

/**
 * Adapt and update context, then activate the command panel
 *
 * @param {Array} selectedObj - array of selected objects
 * @param {String} commandId - ID of the command to open.
 * @param {String} location - Which panel to open the command in
 * @param {Boolean} openNewRevision -
 * @param {Boolean} showOpenNewRevisionCheckbox -
 * @param {Boolean} push - Optional parameter to push workarea content when opening command panel
 * @param {Boolean} closeWhenCommandHidden - Optional parameter to disable the automatic closing of the panel when a command is hidden. Defaults to true.
 * @param {Object} config - Optional parameter to override the configuration attributes of sidenav, which includes width, height and slide.
 */
export let updateSaveAsContextAndActivateCommandPanel = function( input ) {
    var selectedObj = input.selectedObj;
    var commandId = input.commandId;
    var location = input.location;
    var openNewRevision = input.openNewRevision;
    var showOpenNewRevisionCheckbox = input.showOpenNewRevisionCheckbox;
    var push = input.push;
    var closeWhenCommandHidden = input.closeWhenCommandHidden;
    var config = input.config;
    const copyOverEnabled = input.copyOverEnabled;
    var selectedObjs = [];
    selectedObjs.push( selectedObj );
    var adaptedObjsPromise = adapterSvc.getAdaptedObjects( selectedObjs );
    adaptedObjsPromise.then( function( adaptedObjs ) {
        var context = {
            SelectedObjects: [ adaptedObjs[ 0 ] ]
        };
        if( openNewRevision === undefined ) {
            openNewRevision = true;
        }
        if( showOpenNewRevisionCheckbox === undefined ) {
            showOpenNewRevisionCheckbox = true;
        }
        if( copyOverEnabled ) {
            context.CopyOverEnabled = copyOverEnabled;
        }
        context.OpenNewRevision = openNewRevision;
        context.showOpenNewRevisionCheckbox = showOpenNewRevisionCheckbox;

        if( commandId ) { commandPanelService.activateCommandPanel( commandId, location, context, push, closeWhenCommandHidden, config ); }
    } );
};

/**
 * Execute a command with the given arguments
 *
 * @param {String} commandId - Command id
 * @param {String|String[]} commandArgs -
 * @param {Object} commandContext - command context
 * @param {Object} runActionWithViewModel - runActionWithViewModel
 */
export let saveAsComplete = function( commandId, commandArgs, commandContext, runActionWithViewModel ) {
    commandsSvc.executeCommand( commandId, commandArgs, null, commandContext, runActionWithViewModel );
};

/**
 * update edit state in url
 */
export let updateEditStateInURL = function() {
    var navigationParam = AwStateService.instance.params;
    navigationParam.edit = '';
    AwStateService.instance.go( '.', navigationParam, { location: 'replace' } );
};

/**
 * Get the saveAsInput for saveAsObjectAndRelate SOA
 *
 * @param {Object} data - The data
 * @param {Object} xrtContext - The XRT context
 * @param {Object} deepCopyDatas - The deepCopyDatas
 * @param {Object} editHandler - The editHandler
 * @param {Object} xrtState - xrt state atomic data
 * @return {Object} The saveAsInput
 */
export let getSaveAsInput = function( data, xrtContext, deepCopyDatas, editHandler, xrtState ) {
    var ctxObj = xrtContext.SelectedObjects[ 0 ];

    var deepCopyDataArr = _.clone( deepCopyDatas );
    _processDeepCopyData( deepCopyDataArr, data, xrtContext.CopyOverEnabled === 'true', xrtState );

    // Prepare saveAsInput
    var saveAsInputIn = {
        boName: ctxObj.type
    };

    if( editHandler ) {
        let dataSource = editHandler.getDataSource();
        if( dataSource ) {
            let modifiedViewModelProperties = dataSource.getAllEditableProperties();
            _.forEach( modifiedViewModelProperties, function( vmProp ) {
                let propName = vmProp.propertyName;
                // Check if the property is DCP
                var isDCP = false;
                var propertyNameTokens = propName.split( '.' );
                var parentPropertyName = '';
                var leafPropName = '';
                for( var i = 0; i < propertyNameTokens.length; i++ ) {
                    if( propertyNameTokens[ i ].startsWith( 'REF' ) ) {
                        isDCP = true;
                        var index = propertyNameTokens[ i ].indexOf( ',' );
                        parentPropertyName = propertyNameTokens[ i ].substring( 4, index ).trim();
                        //revisit:YULU: No need parentTypeName from DCP in Save As action for Deep Copy Data
                        //like AW2_Prop_SupportSvAI in REF(items_tag,AW2_Prop_SupportSvAI).item_id
                    } else {
                        leafPropName = propertyNameTokens[ i ];
                    }
                }
                if( isDCP && !vmProp ) {
                    vmProp = _getVMPropFromModifiedProperties( leafPropName, modifiedViewModelProperties );
                }

                // If the property is modified, or is auto assignable (it has been already auto-assigned),
                // then it qualifies to be added to saveAsInputs.
                if( vmProp && ( _uwPropSrv.isModified( vmProp ) || vmProp.isAutoAssignable ) ) {
                    if( isDCP ) {
                        var compPropName = parentPropertyName + ':' + leafPropName;
                        var deepCopyData = _getDeepCopyDataForProp( deepCopyDataArr, compPropName );
                        _setProperty( deepCopyData.saveAsInput, leafPropName, vmProp );
                    } else {
                        _setProperty( saveAsInputIn, propName, vmProp );
                    }
                }
            } );

            if( dataSource.getDeclViewModel().customPanelInfo ) {
                _.forEach( dataSource.getDeclViewModel().customPanelInfo, function( customPanelVMData ) {
                    var oriVMData = customPanelVMData._internal.origDeclViewModelJson.data;
                    _.forEach( customPanelVMData, function( propVal, propName ) {
                        if( _.has( oriVMData, propName ) ) {
                            _setProperty( saveAsInputIn, propName, propVal );
                        }
                    } );
                } );
            }
        }
    }

    return [ {
        targetObject: ctxObj,
        saveAsInput: saveAsInputIn,
        deepCopyDatas: deepCopyDataArr
    } ];
};

/**
 * Get the saveAsInput for Add a Copy for saveAsObjectAndRelate SOA
 *
 * @param {Object} data - The data
 * @param {Object} xrtContext - The XRT context
 * @param {Object} deepCopyDatas - The deepCopyDatas
 * @param {Object} editHandler - The editHandler
 * @return {Object} The saveAsInput
 */
export let getSaveAsInputForAddCopy = function( data, xrtContext, deepCopyDatas, editHandler ) {
    var ctxObj = xrtContext.sourceObjects[ 0 ];

    var deepCopyDataArr = _.clone( deepCopyDatas );
    _processDeepCopyData( deepCopyDataArr, data, xrtContext.CopyOverEnabled === 'true' );

    // Prepare saveAsInput
    var saveAsInputIn = {
        boName: ctxObj.type
    };

    if( editHandler ) {
        let dataSource = editHandler.getDataSource();
        if( dataSource ) {
            let modifiedViewModelProperties = dataSource.getAllEditableProperties();
            _.forEach( modifiedViewModelProperties, function( vmProp ) {
                let propName = vmProp.propertyName;
                // Check if the property is DCP
                var isDCP = false;
                var propertyNameTokens = propName.split( '.' );
                var parentPropertyName = '';
                var leafPropName = '';
                for( var i = 0; i < propertyNameTokens.length; i++ ) {
                    if( propertyNameTokens[ i ].startsWith( 'REF' ) ) {
                        isDCP = true;
                        var index = propertyNameTokens[ i ].indexOf( ',' );
                        parentPropertyName = propertyNameTokens[ i ].substring( 4, index ).trim();
                        //revisit:YULU: No need parentTypeName from DCP in Save As action for Deep Copy Data
                        //like AW2_Prop_SupportSvAI in REF(items_tag,AW2_Prop_SupportSvAI).item_id
                    } else {
                        leafPropName = propertyNameTokens[ i ];
                    }
                }
                if( isDCP && !vmProp ) {
                    vmProp = _getVMPropFromModifiedProperties( leafPropName, modifiedViewModelProperties );
                }

                // If the property is modified, or is auto assignable (it has been already auto-assigned),
                // then it qualifies to be added to saveAsInputs.
                if( vmProp && ( _uwPropSrv.isModified( vmProp ) || vmProp.isAutoAssignable ) ) {
                    if( isDCP ) {
                        var compPropName = parentPropertyName + ':' + leafPropName;
                        var deepCopyData = _getDeepCopyDataForProp( deepCopyDataArr, compPropName );
                        _setProperty( deepCopyData.saveAsInput, leafPropName, vmProp );
                    } else {
                        _setProperty( saveAsInputIn, propName, vmProp );
                    }
                }
            } );

            if( dataSource.getDeclViewModel().customPanelInfo ) {
                _.forEach( dataSource.getDeclViewModel().customPanelInfo, function( customPanelVMData ) {
                    var oriVMData = customPanelVMData._internal.origDeclViewModelJson.data;
                    _.forEach( customPanelVMData, function( propVal, propName ) {
                        if( _.has( oriVMData, propName ) ) {
                            _setProperty( saveAsInputIn, propName, propVal );
                        }
                    } );
                } );
            }
        }
    }

    return [ {
        targetObject: ctxObj,
        saveAsInput: saveAsInputIn,
        deepCopyDatas: deepCopyDataArr
    } ];
};

let _getVMPropFromModifiedProperties = function( propName, modifiedProperties ) {
    var vmProp = {};
    if( propName && _.isArray( modifiedProperties ) ) {
        vmProp = modifiedProperties.find( modifiedProp => modifiedProp.propertyName === propName );
    }
    return vmProp;
};

/**
 * Get the newly created Item created by saveAsObjectAndRelate SOA
 *
 * @param {Object} response - The response of saveAsObjectAndRelate SOA
 * @return {Object} The newly created object
 */
export let getNewCreatedObject = function( response ) {
    if( response && response.ServiceData && response.ServiceData.created ) {
        var position = response.ServiceData.created.length - 2;
        return response.output[ 0 ].objects[ position ];
    }
};

/**
 * Get the newly created Item created by saveAsObjectAndRelate SOA
 *
 * @param {Object} response - The response of saveAsObjectAndRelate SOA
 * @return {Object} The newly created object
 */
export let getNewCreatedObjectForAddCopy = function( response ) {
    if( response && response.ServiceData && response.ServiceData.created ) {
        var position = response.ServiceData.created.length - 2;
        return [ response.output[ 0 ].objects[ position ] ];
    }
};

/**
 * Get the newly created Item created by saveAsObjectAndRelate SOA
 *
 * @param {Object} response - The response of saveAsObjectAndRelate SOA
 * @return {Object} The newly created object
 */
export let getRevToSelectForAddCopy = function( response ) {
    var newObjects = [];

    if( response.output ) {
        for( var index in response.output ) {
            if( response.output[ index ].objects ) {
                var newObject = response.output[ index ].objects[ 0 ];
                newObject = cdm.getObject( newObject.uid );
                // If the created Object is a subtype of Item, then take its item revision
                if( newObject.modelType.typeHierarchyArray.indexOf( 'Item' ) > -1 ) {
                    var itemRevPastedOnTarget = true;
                    if( newObject.modelType.constantsMap &&
                        newObject.modelType.constantsMap.Fnd0ItemRevPasteOnTargetUponCreate ) {
                        if( newObject.modelType.constantsMap.Fnd0ItemRevPasteOnTargetUponCreate === 'false' ) {
                            itemRevPastedOnTarget = false;
                        }
                    }
                    if( itemRevPastedOnTarget ) {
                        var createdItemObj = cdm.getObject( newObject.uid );
                        if( createdItemObj && createdItemObj.props && createdItemObj.props.revision_list ) {
                            newObject = cdm.getObject( createdItemObj.props.revision_list.dbValues[ 0 ] );
                        } else if( response.output[ index ].objects.length >= 3 ) {
                            // TODO: remove this when all consumers load revision_list property
                            // Assuming the [2] element is Item Revision !!!
                            newObject = response.output[ index ].objects[ 2 ];
                        }
                    }
                }
                newObjects.push( newObject );
            }
        }
    }
    return newObjects;
};

/**
 * Get the reviseInput for revideObjects SOA
 *
 * @param {Object} editHandler - EditHandler.
 * @return {Object} The reviseInput
 */
export let getReviseInputs = ( editHandler ) => {
    let reviseInputs = {};
    if( editHandler ) {
        let dataSource = editHandler.getDataSource();
        if( dataSource ) {
            let modifiedViewModelProperties = dataSource.getAllEditableProperties();
            _.forEach( modifiedViewModelProperties, function( vmProp ) {
                if( vmProp && ( vmProp.isAutoAssignable || _uwPropSrv.isModified( vmProp ) ) ) {
                    var propVal = vmProp.dbValue;
                    var reviseInputVal = [];
                    if( _.isArray( propVal ) ) {
                        _.forEach( propVal, function( val ) {
                            reviseInputVal.push( _convertPropValToString( val, vmProp.type ) );
                        } );
                    } else {
                        reviseInputVal.push( _convertPropValToString( propVal, vmProp.type ) );
                    }
                    reviseInputs[ vmProp.propertyName ] = reviseInputVal;
                }
            } );
            if( dataSource.getDeclViewModel().customPanelInfo ) {
                _.forEach( dataSource.getDeclViewModel().customPanelInfo, function( customPanelVMData ) {
                    let oriVMData = customPanelVMData._internal.origDeclViewModelJson.data;
                    _.forEach( customPanelVMData, function( propVal, propName ) {
                        if( _.has( oriVMData, propName ) ) {
                            reviseInputs[ propName ] = [];
                            if( _.isArray( propVal.dbValue ) ) {
                                _.forEach( propVal.dbValue, function( val ) {
                                    reviseInputs[ propName ].push( _convertPropValToString( val, propVal.type ) );
                                } );
                            } else {
                                reviseInputs[ propName ].push( _convertPropValToString( propVal.dbValue, propVal.type ) );
                            }
                        }
                    } );
                } );
            }
        }
    }

    return reviseInputs;
};
export let setActiveView = function( data ) {
    return data.selectedTab.panelId;
};

export let loadPanelTabs = function( customVisibleTabs, panelContext, reviseTitle, newTitle ) {
    let visibleTabs = [];
    if( customVisibleTabs ) {
        visibleTabs = customVisibleTabs;
    } else {
        let reviseTab = {
            tabKey: 'SaveAsRevision',
            pageId: 'SaveAsRevision',
            view: 'SaveAsRevision',
            name: reviseTitle,
            recreatePanel: true,
            priority: 0
        };

        let newTab = {
            tabKey: 'SaveAsNew',
            pageId: 'SaveAsNew',
            view: 'SaveAsNew',
            name: newTitle,
            recreatePanel: true,
            priority: 0
        };

        if( panelContext ) {
            if( panelContext.ReviseHidden !== 'true' ) {
                visibleTabs.push( reviseTab );
            }

            if( panelContext.SaveAsHidden !== 'true' ) {
                visibleTabs.push( newTab );
            }
        }
    }

    const tabChangeCallback = ( pageId, tabTitle ) => {
        eventBus.publish( 'saveAsObject.tabChange', {
            pageId: pageId,
            tabTitle: tabTitle
        } );
    };
    return {
        visibleTabs: visibleTabs,
        api: tabChangeCallback
    };
};

export let handleTabChange = function( visibleTabs, pageId, tabTitle ) {
    let selectedTab = visibleTabs.filter( function( tab ) {
        return tab.pageId === pageId || tab.name === tabTitle;
    } )[ 0 ];
    return {
        activeTab: selectedTab
    };
};


/**
 * Populates the display value from the object
 *
 * @param {String} uid - The uid for fetching model object
 * @param {Object} revisionOf object
 * @return {Object} returns object with revisionOf
 */
export const assignPropertyValue = function( uid, revisionOf ) {
    const updatedRevisionOf = { ...revisionOf };
    const mo = cdm.getObject( uid );
    updatedRevisionOf.dbValue = mo.props.object_string.dbValues[ 0 ];
    updatedRevisionOf.uiValue = mo.props.object_string.uiValues[ 0 ];
    return {
        revisionOf: updatedRevisionOf
    };
};

export default exports = {
    updateSaveAsContextAndActivateCommandPanel,
    saveAsComplete,
    getSaveAsInput,
    getSaveAsInputForAddCopy,
    getReviseInputs,
    updateEditStateInURL,
    setActiveView,
    getNewCreatedObject,
    getNewCreatedObjectForAddCopy,
    getRevToSelectForAddCopy,
    loadPanelTabs,
    handleTabChange,
    assignPropertyValue
};
