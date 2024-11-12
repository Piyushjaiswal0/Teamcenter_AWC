// Copyright (c) 2022 Siemens

/**
 * @module js/subscriptionService
 */
import cdm from 'soa/kernel/clientDataModel';
import dateTimeSvc from 'js/dateTimeService';
import soaSvc from 'soa/kernel/soaService';
import messagingService from 'js/messagingService';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';

var saveHandler = {};

/**
 * Get Subscription Object and corresponding modified properties
 *
 * @return {propMap} properties information
 */
var getMapData = function( modifiedViewModelProperties ) {
    var propMap = {};
    var attributes = [];

    for( var mP = 0; mP < modifiedViewModelProperties.length; mP++ ) {
        var currObjUid = modifiedViewModelProperties[ mP ].parentUid;
        if( propMap[ currObjUid ] === undefined ) {
            attributes.push( modifiedViewModelProperties[ mP ] );
            propMap[ currObjUid ] = attributes;
        } else {
            propMap[ currObjUid ].push( modifiedViewModelProperties[ mP ] );
        }
        attributes = [];
    }

    return propMap;
};

var convertLogicalOperators = function( logicOps ) {
    var convertedlogicOps = [];
    for( var i = 0; i < logicOps.length; i++ ) {
        convertedlogicOps[ i ] = 'LogicalAnd';
        if( logicOps[ i ] === 'OR' ) {
            convertedlogicOps[ i ] = 'LogicalOr';
        }
    }
    return convertedlogicOps;
};
var convertMathsOperators = function( mathOps ) {
    var convertedMathOps = [];
    for( var i = 0; i < mathOps.length; i++ ) {
        convertedMathOps[ i ] = 'EqualTo';
        if( mathOps[ i ] === '!=' ) {
            convertedMathOps[ i ] = 'NotEqualTo';
        } else if( mathOps[ i ] === '>' ) {
            convertedMathOps[ i ] = 'GreaterThan';
        } else if( mathOps[ i ] === '<' ) {
            convertedMathOps[ i ] = 'LessThan';
        } else if( mathOps[ i ] === '>=' ) {
            convertedMathOps[ i ] = 'GreaterThanEqualTo';
        } else if( mathOps[ i ] === '<=' ) {
            convertedMathOps[ i ] = 'LessThanEqualTo';
        }
    }
    return convertedMathOps;
};


var addActionHandlerForModifySubscription = function( input, handler, handlerParam ) {
    for( var iH = 0; iH < input.length; iH++ ) {
        if( !input[ iH ].inputs[ 0 ].newSubscriptionValues.handlers ) {
            input[ iH ].inputs[ 0 ].newSubscriptionValues.handlers = [];

            input[ iH ].inputs[ 0 ].newSubscriptionValues.handlers.push( {
                handler: handler,
                parameters: handlerParam
            } );
        }
    }
};

var createActionHandlersInput = function( input, notifiers, eventHandlersObject ) {
    var nonEmptyNotifierList = [];
    for( var j = 0; j < notifiers.length; j++ ) {
        if( notifiers[ j ] !== '__fnd0Empty__' ) {
            nonEmptyNotifierList.push( notifiers[ j ] );
        }
    }

    // Add handler data to ImanSubscription object
    for( var eH = 0; eH < eventHandlersObject.length; eH++ ) {
        var eventHandler = eventHandlersObject[ eH ];

        var handlerParams = [];

        for( var k = 0; k < nonEmptyNotifierList.length; k++ ) {
            var handlerId = eventHandler.props.handler_id.dbValues[ 0 ];

            if( handlerId === 'IMAN_Smtp_Mail_Notify' ) {
                handlerParams[ k ] = nonEmptyNotifierList[ k ];
            } else {
                handlerParams[ k ] = '__fnd0Empty__';
            }
        }
        addActionHandlerForModifySubscription( input, eventHandler, handlerParams );
    }
};

var addAttributeCriteriaforModifySubscriptions = function( input, logicOperator, mathOperator, attributeName,
    attributeValue ) {
    for( var iK = 0; iK < input.length; iK++ ) {
        if( !input[ iK ].inputs[ 0 ].newSubscriptionValues.criteria ) {
            input[ iK ].inputs[ 0 ].newSubscriptionValues.criteria = [];
        }

        input[ iK ].inputs[ 0 ].newSubscriptionValues.criteria.push( {
            logicOperator: logicOperator,
            attributeComparison: {
                mathOperator: mathOperator,
                attributeName: attributeName,
                attributeValue: attributeValue
            }
        } );
    }
};

var addCriteria = function( input, attrNames, attrValues, logicOps, mathOps ) {
    var logicOperator = [];
    logicOperator = convertLogicalOperators( logicOps );

    var mathOperator = [];
    mathOperator = convertMathsOperators( mathOps );

    if( attrNames.length ) {
        for( var i = 0; i < attrNames.length; i++ ) {
            addAttributeCriteriaforModifySubscriptions( input, logicOperator[ i ], mathOperator[ i ], attrNames[ i ],
                attrValues[ i ] );
        }
    } else {
        addAttributeCriteriaforModifySubscriptions( input, logicOperator[ 0 ], mathOperator[ 0 ], attrNames[ 0 ],
            attrValues[ 0 ] );
    }
};

var performSaveEdit = function( inputs, modifiedProps, m_openedObj ) {
    var modifiedViewModelProperties = modifiedProps;

    var input = [];
    var attrNames = [];
    var attrValues = [];
    var logicOps = [];
    var mathOps = [];
    var notifiers = [];
    var eventHandlersUIDs = [];
    var eventHandlersObject = [];

    //get existing properties from ImanSubscription object
    var subscriptionObject = m_openedObj;
    var targetUID = subscriptionObject.props.target.dbValues[ 0 ];
    var targetObj = cdm.getObject( targetUID );
    var subscriberUID = subscriptionObject.props.subscriber.dbValues[ 0 ];
    var subscriberObj = cdm.getObject( subscriberUID );

    var notificationUID = subscriptionObject.props.notification.dbValues[ 0 ];
    var notification = cdm.getObject( notificationUID );
    var subject;
    var message;
    var properties;

    if( notification !== null ) {
        subject = notification.props.subject.dbValues[ 0 ];
        message = notification.props.message.dbValues[ 0 ];
        properties = notification.props.properties.dbValues;
    }
    var eventTypeUID = subscriptionObject.props.event_type.dbValues[ 0 ];
    var eventType = cdm.getObject( eventTypeUID );
    var conditionUID = subscriptionObject.props.fnd0Condition.dbValues[ 0 ];
    var condition = cdm.getObject( conditionUID );
    var revisionOption = 'NoRevisions2';
    var priority = subscriptionObject.props.fnd0Priority.dbValues[ 0 ];
    var isActive = subscriptionObject.props.fnd0IsActive.dbValues[ 0 ];
    var subName = subscriptionObject.props.fnd0Name.dbValues[ 0 ];
    var frequency = subscriptionObject.props.fnd0Frequency.dbValues[ 0 ];
    var expDate = subscriptionObject.props.expiration_date.dbValues[ 0 ];

    attrNames = subscriptionObject.props.attribute_names.dbValues;
    attrValues = subscriptionObject.props.attribute_values.dbValues;
    logicOps = subscriptionObject.props.logic_operators.dbValues;
    mathOps = subscriptionObject.props.math_operators.dbValues;
    notifiers = subscriptionObject.props.handler_parameters.dbValues;
    eventHandlersUIDs = subscriptionObject.props.fnd0EventHandlers.dbValues;

    for( var tH = 0; tH < eventHandlersUIDs.length; tH++ ) {
        var handlerObj = cdm.getObject( eventHandlersUIDs[ tH ] );
        eventHandlersObject.push( handlerObj );
    }

    //check for modified properties values
    for( var mP = 0; mP < modifiedViewModelProperties.length; mP++ ) {
        if( modifiedViewModelProperties[ mP ].propertyName === 'fnd0Priority' ) {
            priority = modifiedViewModelProperties[ mP ].dbValue;
        } else if( modifiedViewModelProperties[ mP ].propertyName === 'fnd0IsActive' ) {
            isActive = modifiedViewModelProperties[ mP ].dbValue;
        } else if( modifiedViewModelProperties[ mP ].propertyName === 'fnd0Name' ) {
            subName = modifiedViewModelProperties[ mP ].dbValue;
        } else if( modifiedViewModelProperties[ mP ].propertyName === 'fnd0Frequency' ) {
            frequency = modifiedViewModelProperties[ mP ].dbValue;
        } else if( modifiedViewModelProperties[ mP ].propertyName === 'expiration_date' ) {
            expDate = modifiedViewModelProperties[ mP ].dbValue;
        } else if( modifiedViewModelProperties[ mP ].propertyName === 'attribute_names' ) {
            attrNames = modifiedViewModelProperties[ mP ].dbValue;
        } else if( modifiedViewModelProperties[ mP ].propertyName === 'attribute_values' ) {
            attrValues = modifiedViewModelProperties[ mP ].dbValue;
        } else if( modifiedViewModelProperties[ mP ].propertyName === 'logic_operators' ) {
            logicOps = modifiedViewModelProperties[ mP ].dbValue;
        } else if( modifiedViewModelProperties[ mP ].propertyName === 'math_operators' ) {
            mathOps = modifiedViewModelProperties[ mP ].dbValue;
        } else if( modifiedViewModelProperties[ mP ].propertyName === 'handler_parameters' ) {
            notifiers = modifiedViewModelProperties[ mP ].dbValue;
        } else if( modifiedViewModelProperties[ mP ].propertyName === 'event_type' ) {
            eventTypeUID = modifiedViewModelProperties[ mP ].dbValue;
            eventType = cdm.getObject( eventTypeUID );
        }
    }
    var expiryDate = dateTimeSvc.formatUTC( expDate );
    //Allow the current date as expiration date.
    if( expiryDate ) {
        var expiryDateType = new Date( expiryDate );
        expiryDateType.setHours( 23 );
        expiryDateType.setMinutes( 59 );
        expiryDate = dateTimeSvc.formatUTC( expiryDateType );
    }

    if( isActive === '1' ) {
        isActive = true;
    } else if( isActive === '0' ) {
        isActive = false;
    }

    //input for SOA
    input.push( {
        inputs: [ {
            subscriptionObject: subscriptionObject,
            newSubscriptionValues: {
                target: targetObj,
                subscriber: subscriberObj,
                notification: {
                    subject: subject,
                    message: message,
                    propertyNames: properties
                },
                notificationPriority: priority,
                isActive: isActive,
                name: subName,
                eventType: eventType,
                condition: condition,
                revisionOption: revisionOption,
                executionPeriod: {
                    executionDay: '',
                    executionTime: '',
                    frequency: frequency
                },
                expirationDate: expiryDate
            }
        } ]
    } );

    //Add criteria to ImanSubscription object
    addCriteria( input, attrNames, attrValues, logicOps, mathOps );
    createActionHandlersInput( input, notifiers, eventHandlersObject );

    for( var iN = 0; iN < input.length; iN++ ) {
        inputs.push( input[ iN ].inputs[ 0 ] );
    }

    return inputs;
};

/**
 * Gets the SOA input
 *
 */
var getInputContext = function( dataSource ) {
    var deferred = AwPromiseService.instance.defer();

    //get all modified properties
    var modifiedViewModelProperties = dataSource.getAllModifiedProperties();

    var inputs = [];
    var SOAInputs = [];
    var subscriptionMap = {};

    //get subscription objects and corresponding modified properties
    if( modifiedViewModelProperties.length > 0 ) {
        subscriptionMap = getMapData( modifiedViewModelProperties );

        //perform Save edit for every subscription object
        for( var currentObjUid in subscriptionMap ) {
            var m_openedObj = cdm.getObject( currentObjUid );
            var modifiedProps = subscriptionMap[ currentObjUid ];

            //get SOA input for modifySubscription SOA call
            inputs = performSaveEdit( inputs, modifiedProps, m_openedObj );
        }

        SOAInputs.push( {
            inputs: inputs
        } );

        soaSvc.postUnchecked( 'Internal-Notification-2015-03-SubscriptionManagement', 'modifySubscriptions',
            SOAInputs[ 0 ] ).then( function( response ) {
            var subscriptionObjects = response.subscriptions;
            var errMessage = '';
            // Check if input response is not null and contains partial errors then only
            // create the error object
            if( response && response.ServiceData.partialErrors ) {
                _.forEach( response.ServiceData.partialErrors, function( partErr ) {
                    if( partErr.errorValues ) {
                        // TO avoid display of duplicate messages returned in server response
                        var messages = _.uniqBy( partErr.errorValues, 'code' );
                        _.forEach( messages, function( errVal ) {
                            if( errMessage.length === 0 ) {
                                errMessage += '</br>' + errVal.message;
                            } else {
                                errMessage += errVal.message + '</br>';
                            }
                        } );
                        messagingService.showError( errMessage.substring( 5 ) );
                        deferred.reject( null );
                    }
                } );
            }
            deferred.resolve( subscriptionObjects );
        }, function( error ) {
            if( error ) {
                messagingService.showError( error.message );
            }
            error = null;
            deferred.reject( error );
        } );
    }
    return deferred.promise;
};

/**
 * Get save handler.
 *
 * @return Save Handler
 */
export let getSaveHandler = function() {
    return saveHandler;
};

/**
 * Save edits for Subscription
 */
saveHandler.saveEdits = function( dataSource ) {
    return getInputContext( dataSource );
};

/**
 * When there is changes are unsaved then it return true
 */
saveHandler.isDirty = function( dataSource ) {
    var modifiedPropCount = dataSource.getAllModifiedProperties().length;
    if( modifiedPropCount === 0 ) {
        return false;
    }
    return true;
};

const exports = {
    getSaveHandler
};
export default exports;
