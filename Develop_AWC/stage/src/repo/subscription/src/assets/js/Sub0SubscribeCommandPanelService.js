// Copyright (c) 2022 Siemens

/**
 * @module js/Sub0SubscribeCommandPanelService
 */
import AwPromiseService from 'js/awPromiseService';
import listBoxService from 'js/listBoxService';
import cdm from 'soa/kernel/clientDataModel';
import viewModelSvc from 'js/viewModelService';
import localeSvc from 'js/localeService';
import soaSvc from 'soa/kernel/soaService';
import cmm from 'soa/kernel/clientMetaModel';
import ViewModelObjectService from 'js/viewModelObjectService';
import appCtx from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import AwStateService from 'js/awStateService';
import awSearchService from 'js/awSearchService';
import adapterService from 'js/adapterService';
import uwPropertySvc from 'js/uwPropertyService';
import modelPropertySvc from 'js/modelPropertyService';

var ATTACH_EVENT = '__Attach';
var ASSIGN_STATUS_EVENT = '__Attained_Release_Status';
var NEW_IR_EVENT = '__Item_Rev_Create';
var MAX_LENGTH = 128;

/*
 * Function to process response of performSearch for Sub0SubscribleTypesProvider
 */
export let getSearchResults = function( response ) {
    var searchResults = response.searchResults;
    searchResults = searchResults ? searchResults.map( function( vmo ) {
        return cdm.getObject( vmo.uid );
    } ) : [];

    return searchResults;
};

/**
 * get selected objects type and uid info from context object
 * @return [{Object}] List of selected objects
 */
export let getObjectOrTypes = function() {
    var input = [];
    const ctxMselected = appCtx.getCtx( 'mselected' );
    var selectedObjs = adapterService.getAdaptedObjectsSync( ctxMselected );
    var isSingleObjectSubscribe = ctxMselected.length === 1;

    if( selectedObjs ) {
        for( var i = 0; i < selectedObjs.length; i++ ) {
            var selected;
            if( selectedObjs[ i ].modelType.typeHierarchyArray.indexOf( 'RuntimeBusinessObject' ) < 0 ) {
                selected = selectedObjs[ i ];
            }
            var obj = {
                uid: selectedObjs[ i ].uid,
                type: selectedObjs[ i ].type
            };
            if( selected ) {
                //valid selection or configured assembly
                obj = {
                    uid: selected.uid,
                    type: selected.type
                };
                input.push( obj );
            } else {
                //un configured assembly (invalid target)
                //in case of single object subscription we pass only valid target to findSubscriptions SOA
                //in case of multi object subscription server is parsing the invalid target "validateSubscribableTypes"
                if( !isSingleObjectSubscribe ) {
                    input.push( obj );
                }
            }
        }
    }
    return _.uniqWith( input, _.isEqual );
};

/**
 * Load subscription criteria context object
 * @return [{Object}] List of selected objects
 */
export let loadSubscriptionCtx = function( response, data ) {
    var subscriptionCtx = {
        subscribableObjects: {
            uids: [],
            objects: []
        },
        nonSubscribableObjects: [],
        error: '',
        eventTypeList: [],
        isMultiEvent: false
    };
    var resource = 'SubscriptionMessages';
    var localTextBundle = localeSvc.getLoadedText( resource );
    if( response.subscribableObjects ) {
        for( var i = 0; i < response.subscribableObjects.length; i++ ) {
            var obj = {
                type: response.subscribableObjects[ i ].type,
                uid: response.subscribableObjects[ i ].uid
            };
            subscriptionCtx.subscribableObjects.uids.push( obj );
            subscriptionCtx.subscribableObjects.objects.push( response.subscribableObjects[ i ] );
        }
    } else {
        var selectedObjects = [];
        if( data.selectedFollowType ) {
            selectedObjects = [ data.selectedFollowType ];
        } else{
            selectedObjects = appCtx.getCtx( 'mselected' );
            if( selectedObjects &&  selectedObjects.length > 0 && selectedObjects[0].modelType && selectedObjects[0].modelType.typeHierarchyArray.indexOf(  'RuntimeBusinessObject' )  > -1 )  {
                var propAttrHolder = {
                    type: 'STRING',
                    dbValue: selectedObjects[0].props.object_string ? selectedObjects[0].props.object_string.uiValues[0] : '',
                    displayName: 'object_name',
                    dispValue:selectedObjects[0].props.object_string ? selectedObjects[0].props.object_string.uiValues[0] : ''
                };
                var property = modelPropertySvc.createViewModelProperty( propAttrHolder );
                selectedObjects = adapterService.getAdaptedObjectsSync( selectedObjects );
                selectedObjects[0].props.object_name = property;
            }
        }
        for( var j = 0; j < selectedObjects.length; j++ ) {
            var subscribableObject = selectedObjects[ j ];
            var subscribableObjectUid = {
                type: selectedObjects[ j ].type,
                uid: selectedObjects[ j ].uid
            };

            subscriptionCtx.subscribableObjects.uids.push( subscribableObjectUid );
            subscriptionCtx.subscribableObjects.objects.push( subscribableObject );
        }
    }

    if( response.nonSubscribableObjects ) {
        for( var k = 0; k < response.nonSubscribableObjects.length; k++ ) {
            var object = response.nonSubscribableObjects[ k ];
            var objInfo = {
                type: object.type,
                uid: object.uid
            };
            var name = '';
            subscriptionCtx.nonSubscribableObjects.push( objInfo );
            if( object.modelType.typeHierarchyArray.indexOf( 'RuntimeBusinessObject' ) > -1 ) {
                name = object.props.object_string.dbValues[ 0 ];
                subscriptionCtx.error += '<BR/>' + localTextBundle.nonSubscribableAssemblyObjectMessage.replace( '{0}', name );
            } else {
                name = object.props.object_name.dbValues[ 0 ];
                subscriptionCtx.error += '<BR/>' + localTextBundle.nonSubscribableObjectMessage.replace( '{0}', name );
            }
        }
    }
    return subscriptionCtx;
};

export let getFollowersId = function( data ) {
    var followersList = [];
    for( var i = 0; i < data.dataProviders.followers_provider.viewModelCollection.loadedVMObjects.length; i++ ) {
        var userId = data.dataProviders.followers_provider.viewModelCollection.loadedVMObjects[ i ].props.user_id.uiValues[ 0 ];
        followersList.push( userId );
    }
    return followersList;
};

export let getRevisionPrefix = function( data, object, eventType ) {
    var isItemType = false;
    var prefix = '';
    var modelType = cmm.isTypeUid( object.uid ) ? cmm.getType( object.uid ) : cmm.getType( object.type );
    isItemType = cmm.isInstanceOf( 'Item', modelType );

    if( isItemType && ( eventType === ATTACH_EVENT || eventType === ASSIGN_STATUS_EVENT || eventType === NEW_IR_EVENT ) ) {
        if( data.isItemRevisions.dbValue && data.isBaselineRevisions.dbValue ) {
            prefix = 'ItemRevision.';
        } else if( data.isItemRevisions.dbValue && data.isBaselineRevisions.dbValue === false ) {
            prefix = 'BaseRevision.';
        } else if( data.isItemRevisions.dbValue === false && data.isBaselineRevisions.dbValue ) {
            prefix = 'LineRevision.';
        }
    }
    return prefix;
};

export let getSystemCriteria = function( data, eventType, isMultiEvent, selectedObject ) {
    var criteria = [ {
        attributeComparison: {
            mathOperator: data.operator ? data.operator.dbValue : 'EqualTo',
            attributeName: '',
            attributeValue: ''
        },
        logicOperator: 'LogicalAnd'
    } ];
    if( eventType === ATTACH_EVENT ) {
        if( !isMultiEvent ) {
            criteria[ 0 ].attributeComparison.attributeName = data.relationType.dbValue;
            if( data.relationType.dbValue === 'ALL' ) {
                criteria[ 0 ].attributeComparison.attributeName = '';
            }
            criteria[ 0 ].attributeComparison.attributeValue = data.attachmentType.dbValue;
        } else {
            criteria[ 0 ].attributeComparison.attributeValue = 'ALL';
            //criteria[ 0 ].attributeComparison.attributeName is by default set to ""
        }
    } else if( eventType === ASSIGN_STATUS_EVENT ) {
        criteria[ 0 ].attributeComparison.attributeName = 'ReleaseStatus';
        if( !isMultiEvent ) {
            criteria[ 0 ].attributeComparison.attributeValue = data.releaseStatus.dbValue;
            if( data.releaseStatus.dbValue === 'ALL' ) {
                criteria[ 0 ].attributeComparison.attributeValue = '';
            }
        } else {
            criteria[ 0 ].attributeComparison.attributeValue = '';
        }
    } else if( eventType === NEW_IR_EVENT ) {
        criteria[ 0 ].attributeComparison.attributeName = 'ItemRevision';
        //criteria[ 0 ].attributeComparison.attributeValue is by default set to ""
    }
    var prefix = getRevisionPrefix( data, selectedObject, eventType );
    if( prefix !== '' ) {
        criteria[ 0 ].attributeComparison.attributeValue = prefix + criteria[ 0 ].attributeComparison.attributeValue;
    }
    return criteria;
};

/**
         * Creates input strcuture for create subscriptions soa.
         *
         * @param {Object} data
         * @param {Object} application context object
         * @return [{Object}] create subscription input strcuture
         */
export let createSubscriptionInputs = function( data, sharedData ) {
    var createInputs = {
        inputs: [],
        subscription: ''
    };
    var subscriptionCtx = sharedData.subscriptionCtx;
    var userSession = appCtx.getCtx( 'userSession' );
    var user = appCtx.getCtx( 'user' );

    var selectedObjs = subscriptionCtx.subscribableObjects.objects;
    var followers = getFollowersId( data );
    if( !followers.includes( userSession.props.user_id.dbValues[ 0 ] ) ) {
        followers.push( userSession.props.user_id.dbValues[ 0 ] );
    }
    var resource = 'SubscriptionMessages';
    var localTextBundle = localeSvc.getLoadedText( resource );

    for( var i = 0; i < selectedObjs.length; i++ ) {
        for( var j = 0; j < data.applicableEventList.length; j++ ) {
            var subscriptionName = '';
            if( data.name.dbValue !== '' ) {
                subscriptionName = data.name.dbValue;
                if( subscriptionCtx.isMultiEvent ) { //in case of multiple events also append the eventype name
                    subscriptionName += ' ' + data.applicableEventList[ j ].props.object_string.dbValues[ 0 ];
                }
            } else if( selectedObjs.length > 1 ) {
                subscriptionName = selectedObjs[ i ].props.object_name.dbValues[ 0 ] + ' ' + data.applicableEventList[ j ].props.object_string.dbValues[ 0 ];
            }
            if( subscriptionName.length > MAX_LENGTH ) {
                subscriptionName = subscriptionName.substring( 0, MAX_LENGTH );
            }
            var eventType = data.applicableEventList[ j ].props.eventtype_id.dbValues[ 0 ];
            var revisionOption = 'NoRevisions2';
            var criteria = getSystemCriteria( data, eventType, subscriptionCtx.isMultiEvent, selectedObjs[ i ] );

            var input = {
                condition: '',
                criteria: criteria,
                eventType: {
                    type: data.applicableEventList[ j ].type,
                    uid: data.applicableEventList[ j ].uid
                },
                executionPeriod: {
                    executionDay: '',
                    executionTime: '',
                    frequency: data.frequency.dbValue
                },
                expirationDate: '',
                handlers: [ {
                    handler: {
                        uid: data.actionHandler.dbValue,
                        type: data.actionHandler.type
                    },
                    parameters: followers
                } ],
                isActive: true,
                notification: {
                    subject: localTextBundle.notificationSubject,
                    message: localTextBundle.notificationMessage,
                    propertyNames: []
                },
                target: {
                    type: selectedObjs[ i ].type,
                    uid: selectedObjs[ i ].uid
                },
                name: subscriptionName,
                notificationPriority: data.priority.dbValue,
                subscriber: {
                    type: user.type,
                    uid: user.uid
                },
                revisionOption: revisionOption
            };
            createInputs.inputs.push( input );
        }
    }

    if( selectedObjs.length === 1 && !subscriptionCtx.isMultiEvent ) {
        var subscriptions = getExistingSubscription( createInputs.inputs[ 0 ], data.applicableEventList[ 0 ].props.eventtype_id.dbValues[ 0 ], sharedData );
        createInputs.subscription = subscriptions.subscription;
    }
    return createInputs;
};

export let loadTypes = function( data, vmoList ) {
    var subscribedObjectType = [];
    var deferred = AwPromiseService.instance.defer();
    var isCreateAction = data.isCreateAction;

    if( data && data.subscribedObjectType && data.subscribedObjectType.dbValue !== '' ) {
        subscribedObjectType.push( data.subscribedObjectType.dbValue );
        isCreateAction.dbValue = true;
        isCreateAction.valueUpdated = true;
    }
    if( vmoList ) {
        _.forEach( vmoList, function( vmo ) {
            var uid = vmo.props.target ? vmo.props.target.dbValues[ 0 ] : '';
            if( uid && cmm.isTypeUid( uid ) ) {
                subscribedObjectType.push( cmm.extractTypeNameFromUID( uid ) );
            }
        } );
    }
    if( subscribedObjectType.length > 0 ) {
        return soaSvc.ensureModelTypesLoaded( subscribedObjectType ).then( function() {
            deferred.resolve( data );
        } );
    }
    deferred.resolve( isCreateAction );
    return deferred.promise;
};
export let processOutput = ( data, dataCtxNode, searchData ) => {
    awSearchService.processOutput( data, dataCtxNode, searchData );
};

/**
         * Get list of subscription
         *
         * @return performSearchResponse
         */
export let performSearch = function( columnConfigInput, searchInput, inflateProperties ) {
    var finalResponse;
    var inputData = {
        searchInput: searchInput,
        columnConfigInput: columnConfigInput,
        inflateProperties: inflateProperties
    };
    return soaSvc.postUnchecked( 'Internal-AWS2-2023-06-Finder', 'performSearchViewModel5', inputData )
        .then( function( response ) {
            finalResponse = response;
            return finalResponse;
        } )
        .then( function() {
            return loadTypes( finalResponse, finalResponse.ServiceData.modelObjects );
        } )
        .then( function() {
            if( finalResponse.searchResultsJSON ) {
                finalResponse.searchResults = JSON.parse( finalResponse.searchResultsJSON );
                delete finalResponse.searchResultsJSON;
            }

            // Create view model objects
            finalResponse.searchResults = finalResponse.searchResults &&
                        finalResponse.searchResults.objects ? finalResponse.searchResults.objects
                    .map( function( vmo ) {
                        return ViewModelObjectService
                            .createViewModelObject( vmo.uid, 'EDIT', null, vmo );
                    } ) : [];

            // Collect all the prop Descriptors
            var propDescriptors = [];
            _.forEach( finalResponse.searchResults, function( vmo ) {
                _.forOwn( vmo.propertyDescriptors, function( value ) {
                    propDescriptors.push( value );
                } );
            } );

            // Weed out the duplicate ones from prop descriptors
            finalResponse.propDescriptors = _.uniq( propDescriptors, false,
                function( propDesc ) {
                    return propDesc.name;
                } );

            return finalResponse;
        } );
};

/**
         * Populate selected object in response.
         *
         * @param {provider} selected object in provider
         */
export let loadData = function( provider ) {
    return {
        selection: provider
    };
};

/**
         * Its generic function to add object to the given dataProvider
         *
         * @param data : the view model data
         * @param newObjects: the newObjects to be added
         * @param dataProviders : the data provider
         */
export let addObject = function( data, newObjects, dataProviders ) {
    if( newObjects ) {
        let ids = dataProviders.viewModelCollection.loadedVMObjects.map( object => object.uid );
        dataProviders.viewModelCollection.loadedVMObjects = dataProviders.viewModelCollection.loadedVMObjects.concat( newObjects.filter( ( { uid } ) => !ids.includes( uid ) ) );

        dataProviders.update( dataProviders.viewModelCollection.loadedVMObjects, dataProviders.viewModelCollection.loadedVMObjects.length );
    }
};

/**
         * * Its generic function to remove object from the given dataProvider
         *
         * @param data : the view model data
         * @param removedObjects: the newObjects to be added
         * @param dataProviders : the data provider
         */
export let removeObject = function( removedObjects, dataProviders ) {
    if( removedObjects ) {
        // copy all loaded objects into tempObject [] variable.
        var tempObject = [];
        for( var i = 0; i < dataProviders.viewModelCollection.loadedVMObjects.length; i++ ) {
            tempObject[ i ] = dataProviders.viewModelCollection.loadedVMObjects[ i ];
        }

        // Remove selected object from  tempObject.
        for( var j = 0; j < tempObject.length; j++ ) {
            for( var k = 0; k < removedObjects.length; k++ ) {
                if( tempObject[ j ].uid === removedObjects[ k ].uid ) {
                    tempObject.splice( j, 1 );
                }
            }
        }
        //Clear view model and update it.
        dataProviders.update( tempObject, tempObject.length );
    }
};
var clearDataProviderContent = function( dataProvider ) {
    if( dataProvider ) {
        dataProvider.viewModelCollection.clear();
    }
};
export let loadAssociatedViewModelAndView = function( viewModelJson, childScope ) {
    var layoutViewName;
    var jsonData = JSON.parse( viewModelJson.viewModel );
    var declViewModelTarget = viewModelSvc.getViewModel( childScope, true );
    jsonData._viewModelId = 'Sub0CreateSubscriptionSub';
    viewModelSvc.populateViewModelPropertiesFromJson( jsonData, declViewModelTarget ).then(
        function( declViewModel ) { //Successful View Model Load
            viewModelSvc.setupLifeCycle( childScope, declViewModel );
            layoutViewName = viewModelJson.view;
        } );

    return layoutViewName;
};

/**
         * Process eventTypes response to list event types
         *
         * @param {Object} SOA reponse
         * @return [{Object}] List of event types
         */
export let processEventTypes = function( response, eventType ) {
    var eventTypes = [];

    if( response && response.ServiceData.modelObjects ) {
        eventTypes = cdm.getObjects( response.ServiceData.plain );
    }
    var eventTypeList = listBoxService.createListModelObjects( eventTypes, 'props.object_string', false );
    if( eventTypeList.length > 0 && eventType ) {
        let lovEntry = {
            propDisplayValue: eventTypeList[ 0 ].propDisplayValue,
            propInternalValue: eventTypeList[ 0 ].propInternalValue
        };

        eventType.setLovVal( { lovEntry }, null );
    }
    return listBoxService.createListModelObjects( eventTypes, 'props.object_string', false );
};

export let updateSubscriptionList = function( response, sharedData ) {
    var subscriptionList = [];
    if( response && response.ServiceData.plain ) {
        subscriptionList = cdm.getObjects( response.ServiceData.plain );
    }
    let updatedSubList = [ ...sharedData.subscriptions ];
    for( let index = 0; index < subscriptionList.length; index++ ) {
        updatedSubList.push( subscriptionList[ index ] );
    }
    let newData = { ...sharedData.getValue() };
    newData.subscriptions = updatedSubList;
    if( sharedData.update ) {
        sharedData.update( newData );
    }
    return { updatedSubList };
};

/**
         * This function is to process and construct the error message with reason for failure while subscribing to single event for  Multi object Or Single object.
         * @param {data} data with target information
         * @return {Error} Partial errors returned by createSubscriptions SOA response
         */
export let constructErrorMessageForSingleEvent = function( data, Error ) {
    var message = '';
    var resource = 'SubscriptionMessages';
    var localTextBundle = localeSvc.getLoadedText( resource );
    //Message to be returned : '<object_name/type_name>' cannot be followed because <errVal.message>"
    _.forEach( Error.cause.partialErrors, function( partErr ) {
        if( partErr.errorValues && partErr.uid ) {
            var object = cdm.getObject( partErr.uid );
            var name = object.props.object_name ? object.props.object_name.dbValues[ 0 ] : object.props.type_name.uiValues[ 0 ];
            for( var idx = 0; idx < partErr.errorValues.length; idx++ ) {
                var errVal = partErr.errorValues[ idx ];
                var errMessage = localTextBundle.createMultiSubscriptionFailure.replace( '{0}', name );
                errMessage = errMessage.replace( '{1}', errVal.message );
                message += '\n' + errMessage;
            }
        }
    } );
    return message;
};

/**
         * This function is to process and construct the error message with reason for failure while subscribing to Multiple event for Object or Type.
         * @param {data} data with target information
         * * @param {response} createSubscriptions SOA response
         * @return {Error} Partial errors returned by createSubscriptions SOA response
         */
export let constructErrorMessageForMultiEvent = function( data, response, Error, sharedData ) {
    var eventErrList = [];
    var existingSubNameList = [];
    var message = '';
    var resource = 'SubscriptionMessages';
    var localTextBundle = localeSvc.getLoadedText( resource );

    /*
            Message to be returned :
                In case of duplicate subscription error -'<event name>' event is already being followed.Edit the existing subscription '<Existing subscription name>'.
                Other reason for failure - '<event name>' cannot be followed because <errVal.message - message returned by SOA response>.
            */

    //Iterate to each createSubscriptions SOA input and find out the event list for which the error is returned.
    //And get the existing subscription information for the event which is failed to subscribe
    //The event and subscription list will be used to replace in error string.
    _.forEach( data.createSubscriptionsInput, function( createInput ) {
        if( response.ServiceData.modelObjects && !response.ServiceData.modelObjects[ createInput.eventType.uid ] ) {
            var eventObject = cdm.getObject( createInput.eventType.uid );
            eventErrList.push( eventObject.props.object_string.uiValues[ 0 ] );
            var subscriptionObj = getExistingSubscription( createInput, eventObject.props.eventtype_id.dbValues[ 0 ], sharedData );
            var subscriptionName = subscriptionObj.subscription ? subscriptionObj.subscription.props.object_string.uiValues[ 0 ] : '';
            existingSubNameList.push( subscriptionName );
        }
    } );

    //replace the event name and existing subscription name in the message structure
    _.forEach( Error.cause.partialErrors, function( partErr, index ) {
        if( partErr.errorValues && partErr.uid ) {
            for( var idx = 0; idx < partErr.errorValues.length; idx++ ) {
                var errVal = partErr.errorValues[ idx ];
                var errMessage = '';
                if( errVal.code === 78002 ) {
                    errMessage = localTextBundle.createMultiEventForTypeSubscriptionFailure.replace( '{0}', eventErrList[ index ] );
                    errMessage = errMessage.replace( '{1}', existingSubNameList[ index ] );
                } else {
                    errMessage = localTextBundle.createMultiSubscriptionFailure.replace( '{0}', eventErrList[ index ] );
                    errMessage = errMessage.replace( '{1}', errVal.message );
                }
                message += '\n' + errMessage;
            }
        }
    } );
    return message;
};

/**
         * Process partial errors to display proper message on create subscription failure
         *
         * @param {Object} SOA reponse
         * @return {message} to be displayed
         */
export let processCreateSubscriptionPartialErrors = function( response, data, sharedData ) {
    var message = '';
    var err = null;
    // Check if input response is not null and contains partial errors then only
    // create the error object
    if( response && ( response.ServiceData.partialErrors || response.ServiceData.PartialErrors ) ) {
        err = soaSvc.createError( response.ServiceData );
    }

    // Check if error object is not null and has partial errors then iterate for each error code
    // and filter out the errors which we don't want to display to user
    if( err && err.cause && err.cause.partialErrors ) {
        var isMultiEvent = sharedData.subscriptionCtx.isMultiEvent;
        if( isMultiEvent === false ) {
            message = constructErrorMessageForSingleEvent( data, err );
        } else if( isMultiEvent === true ) {
            message = constructErrorMessageForMultiEvent( data, response, err, sharedData );
        }
    }

    return message;
};

export let openObject = function( vmo ) {
    if( vmo && vmo.uid ) {
        var showObject = 'com_siemens_splm_clientfx_tcui_xrt_showObject';
        var toParams = {};
        var options = {};
        toParams.uid = vmo.uid;
        options.inherit = false;
        AwStateService.instance.go( showObject, toParams, options );
    }
};

/**
         * In case of class/type based subscription - multiple subscriptions can be created for given object and event with different criteria
         * This function is used to identify the existing subscription for the given subscription input to SOA and event.
         *
         * This is used to display the existing subscription information while displaying the error message
         *
         * @param {subscriptionCreateInput} subscriptionCreateInput - createSubscriptions SOA Input
         * @param {eventType} eventType - eventType name to find the existing subscription for the given event
         */
export let getExistingSubscription = function( subscriptionCreateInput, eventType, sharedData ) {
    var obj = {
        subscription: ''
    };
    //ctx.subscriptions contains the list of subscription for the selected type
    var existing_subscriptions = sharedData.subscriptions;

    var mathOperator = '';
    /*
             In case of Special event -
                create input will have 'Equal' or 'NotEqual' - convert it to '='/'!=' to match with ctx.subscriptions returned by findSubscriptions SOA
             In case of Non- special event -
                create input will have 'Equal' - convert it to empty string to match with ctx.subscriptions
             */
    // In case of special event mathOperator will not be empty. It could be = or !=
    if( eventType === ATTACH_EVENT || eventType === ASSIGN_STATUS_EVENT || eventType === NEW_IR_EVENT ) {
        if( subscriptionCreateInput.criteria[ 0 ].attributeComparison.mathOperator === 'EqualTo' ) {
            mathOperator = '=';
        } else if( subscriptionCreateInput.criteria[ 0 ].attributeComparison.mathOperator === 'NotEqualTo' ) {
            mathOperator = '!=';
        }
    }
    //find the existing subscription from ctx.subscriptions list by matching the event and attribute criteria
    if( existing_subscriptions ) {
        for( var i = 0; i < existing_subscriptions.length; i++ ) {
            //subscriptionCreateInput will have data in the logged in locale which is entered in Follow Panel
            //so it needs to be matched with the uiValues.
            if( existing_subscriptions[ i ].props.event_type.dbValues[ 0 ] === subscriptionCreateInput.eventType.uid &&
                        existing_subscriptions[ i ].props.attribute_names.uiValues[ 0 ] === subscriptionCreateInput.criteria[ 0 ].attributeComparison.attributeName &&
                        existing_subscriptions[ i ].props.attribute_values.uiValues[ 0 ] === subscriptionCreateInput.criteria[ 0 ].attributeComparison.attributeValue &&
                        existing_subscriptions[ i ].props.math_operators.uiValues[ 0 ] === mathOperator ) {
                obj.subscription = existing_subscriptions[ i ];
                return obj;
            }
        }
    }
    return obj;
};
/**
         * Function to create comma seperated value of eventtypes
         */
export let updateEventTypeToFollowMultiEvent = function( applicableEventList ) {
    var obj = {
        applicableEventsValue: ''
    };
    for( var i = 0; i < applicableEventList.length; i++ ) {
        obj.applicableEventsValue += applicableEventList[ i ].props.object_string.dbValues[ 0 ];
        if( i !== applicableEventList.length - 1 ) {
            obj.applicableEventsValue += ',';
        }
    }
    var isMultiEvent = false;
    if( applicableEventList.length > 1 ) {
        isMultiEvent = true;
    }
    var isEnabled = false;
    return { obj, isEnabled, isMultiEvent };
};

/**
         * Function to update the eventype listbox
         */
export let updateEventTypeToFollowSingleEvent = function( data, sharedData ) {
    var eventType = data.eventType;
    eventType.isEnabled = true;
    var subscriptionCtx = sharedData.subscriptionCtx;
    if( subscriptionCtx.eventTypeList.length > 0 ) {
        eventType.uiValue = subscriptionCtx.eventTypeList[ 0 ].propDisplayValue;
        eventType.dbValue = subscriptionCtx.eventTypeList[ 0 ].propInternalValue;
    }
    var isMultiEvent = false;
    //update the ctx only in case user manually uncheck the checkbox otherwise not
    if( data.autoResetMyEventCheckbox !== true ) {
        appCtx.updateCtx( 'myEventCheckboxDefaultSelection', false );
    }
    var autoResetMyEventCheckbox = data.autoResetMyEventCheckbox;
    autoResetMyEventCheckbox = false;
    return { eventType, autoResetMyEventCheckbox, isMultiEvent };
};

export let resetMultiEventCheckBox = function( multiEventCheckbox ) {
    multiEventCheckbox.update( false, {}, { markModified: true } );
    return true;
    //if the checkbox is auto unchecked in case when user click Ok on "None of the configured events are applicable for the selected object"
    // dialog box set autoResetMyEventCheckbox to true so that ctx.myEventCheckboxDefaultSelection will not be updated (in updateEventTypeToFollowSingleEvent function)
    // and ctx.myEventCheckboxDefaultSelection will persist the user's choice for My Events checkbox
};

/**
         * Function to add selected event to applicable event list for rendering view
         */
export let addEventTypeToList = function( data ) {
    var applicableEventList = [];
    applicableEventList.push( data.eventType.dbValue );
    return applicableEventList;
};

/**
         * Function to process response for Plain Objects
         */
export let processResponsePlainObjects = function( response ) {
    var modelObjects = [];

    if( response && response.modelObjects ) {
        modelObjects = cdm.getObjects( response.plain );
    }
    return modelObjects;
};

export let myEventDefaultSelection = function( multiEventCheckbox ) {
    var myEventCheckboxDefaultSelection = appCtx.getCtx( 'myEventCheckboxDefaultSelection' );
    if( myEventCheckboxDefaultSelection === true ) {
        multiEventCheckbox.update( true, {}, { markModified: true } );
    }
};

/**
         * Function to set view model properties for aw-title-link
         * @param {Object} subscribedObject or subscribedObjectType
         * @param {Object} subPanelContext for subscriptionCtx or selectedFollowType
         * @return [{Object}] View model property
         */
export let updateTitleLink = function( titleLink, selectedTitleLink ) {
    return uwPropertySvc.createViewModelProperty( titleLink.propertyName, selectedTitleLink.uiValue, 'STRING', selectedTitleLink.dbValue, selectedTitleLink.displayValues );
};

export let updatemyEventCheckboxDefaultSelectiontrue = function( multiEventCheckbox ) {
    appCtx.registerCtx( 'myEventCheckboxDefaultSelection', true );
    multiEventCheckbox.update( true, {}, { markModified: true } );
};

export let updatemyEventCheckboxDefaultSelectionfalse = function() {
    appCtx.updateCtx( 'myEventCheckboxDefaultSelection', false );
    eventBus.publish( 'getEventTypeEvent' );
};

/**
         * The function is invoked to process response of getSubscriptionViewAndViewModel SOA when the Event Type is changed in the Follow/Follow Type panel.
         *
         * It updates the panel property values based on SOA response. like:  priority,frequency,name etc..
         * @return {Object} viewModelJSON data received from server
         */
export let processGetSubscriptionViewAndViewModelResponse = function( data ) {
    var updatedData = _.clone( data.viewModelJSON );
    var resource = 'SubscriptionMessages';
    var localTextBundle = localeSvc.getLoadedText( resource );
    if( data.applicableEventList.length === 1 ) {
        //parse {{i18n.allLabel}} from server to correct i18n values for relaseStatus,Attachment type & Relation Type dropdown.
        if( data.applicableEventList[ 0 ].props.eventtype_id.dbValues[ 0 ] === '__Attained_Release_Status' ) {
            updatedData.data.releaseStatus.uiValue = localTextBundle.allLabel;
            updatedData.data.releaseStatuses[ 0 ].propDisplayValue = localTextBundle.allLabel;
        } else if( data.applicableEventList[ 0 ].props.eventtype_id.dbValues[ 0 ] === '__Attach' ) {
            updatedData.data.attachmentType.uiValue = localTextBundle.allLabel;
            updatedData.data.relationType.uiValue = localTextBundle.allLabel;
            updatedData.data.attachmentTypes[ 0 ].propDisplayValue = localTextBundle.allLabel;
            updatedData.data.relationTypes[ 0 ].propDisplayValue = localTextBundle.allLabel;
        }
    }
    return updatedData;
};


/**
 * Funtion to paginate the attachment type values when the Attachment Type LOV is invoked
 * It loads 50 attachment type values at a time
 */
export let getAttachmentTypesPaginated = function( attachmentTypes, startIndex, filter ) {
    var attachmentTypesPaginated = [];
    var moreValuesExist = true;
    var index = 0;
    // return 50 at a time
    while( attachmentTypesPaginated.length < 50 ) {
        var count = startIndex + index;
        if( count >= attachmentTypes.length ) {
            moreValuesExist = false;
            break;
        }
        if( filter ) {
            if( attachmentTypes[count].propDisplayValue.toLowerCase().includes( filter.toLowerCase() ) ) {
                attachmentTypesPaginated.push( attachmentTypes[count] );
            }
        } else {
            attachmentTypesPaginated.push( attachmentTypes[count] );
        }
        index++;
    }
    return {
        attachmentTypes: attachmentTypesPaginated,
        moreValuesExist: moreValuesExist

    };
};

const exports = {
    getSearchResults,
    getObjectOrTypes,
    loadSubscriptionCtx,
    createSubscriptionInputs,
    performSearch,
    loadData,
    addObject,
    removeObject,
    clearDataProviderContent,
    loadAssociatedViewModelAndView,
    processEventTypes,
    updateSubscriptionList,
    constructErrorMessageForSingleEvent,
    constructErrorMessageForMultiEvent,
    processCreateSubscriptionPartialErrors,
    getFollowersId,
    loadTypes,
    getSystemCriteria,
    getRevisionPrefix,
    openObject,
    getExistingSubscription,
    updateEventTypeToFollowMultiEvent,
    updateEventTypeToFollowSingleEvent,
    resetMultiEventCheckBox,
    addEventTypeToList,
    processResponsePlainObjects,
    myEventDefaultSelection,
    updateTitleLink,
    updatemyEventCheckboxDefaultSelectiontrue,
    updatemyEventCheckboxDefaultSelectionfalse,
    processGetSubscriptionViewAndViewModelResponse,
    getAttachmentTypesPaginated,
    processOutput
};
export default exports;
