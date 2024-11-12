/* eslint-disable max-lines */
// Copyright (c) 2022 Siemens

/**
 * This module provides access to service APIs that help to convert the model object to view model object
 * <P>
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/tcViewModelObjectService
 */
import AwPromiseService from 'js/awPromiseService';
import uwPropertySvc from 'js/uwPropertyService';
import cdm from 'soa/kernel/clientDataModel';
import lovService from 'js/lovService';
import soaSvc from 'soa/kernel/soaService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import $ from 'jquery';
import _ from 'lodash';
import logger from 'js/logger';
import parsingUtils from 'js/parsingUtils';

/**
 * Create and return the viewModelPropert from logical property and descriptor.
 *
 * @param {ViewModelObject} viewModelObject - view model object
 * @param {ObjectArray} logicalProperties - logical properties
 * @param {ObjectArray} logicalPropertyDescriptors - logical property descriptors
 * @param {String} operationName - operation name
 *
 * @returns {ViewModelProperty} viewModelProperty build from logical property
 */
var createViewModelPropertiesWithDescriptors = function( viewModelObject, logicalProperties,
    logicalPropertyDescriptors, operationName ) {
    var propertiesWithDescriptors = [];
    var missingPropertyDescriptors = [];
    var logicalPropertyDescriptorsMap = {};

    if( logicalPropertyDescriptors ) {
        $.each( logicalPropertyDescriptors, function( index, propertyDescription ) {
            logicalPropertyDescriptorsMap[ propertyDescription.propertyName ] = propertyDescription;
        } );
    }

    if( $.isArray( logicalProperties ) ) {
        $.each( logicalProperties, function( pIndex, property ) {
            var viewModelProperty = null;

            if( logicalPropertyDescriptorsMap[ property.propertyName ] ) {
                viewModelProperty = createViewModelPropertyFromLogicalProperty( viewModelObject, property, // eslint-disable-line no-use-before-define
                    logicalPropertyDescriptorsMap[ property.propertyName ], operationName );
            } else {
                viewModelProperty = createViewModelPropertyFromLogicalProperty( viewModelObject, property, // eslint-disable-line no-use-before-define
                    null, operationName );
                missingPropertyDescriptors.push( property.propertyName );
            }

            if( viewModelProperty ) {
                propertiesWithDescriptors.push( viewModelProperty );
            }
        } );
    }

    if( missingPropertyDescriptors.length > 0 ) {
        logger.info( 'viewModelObject.createViewModelPropertiesWithDescriptors: ' +
            'property descriptor missing for: ' + missingPropertyDescriptors );
    }
    return propertiesWithDescriptors;
};

/**
 * Create and return the viewModelProperty from logical property and descriptor.
 *
 * @param {ViewModelObject} viewModelObject - view model object
 * @param {Object} logicalProperty - logical property
 * @param {Object} logicalPropertyDescriptor - logical property descriptor
 * @param {String} operationName - operation name
 *
 * @returns {ViewModelProperty} viewModelProperty build from logical property
 */
var createViewModelPropertyFromLogicalProperty = function( viewModelObject, logicalProperty, // eslint-disable-line complexity
    logicalPropertyDescriptor, operationName ) {
    var currentPropertyDescriptor = null;

    var isAutoAssignable = false;
    var isEnabled = true;
    var isLocalizable = false;
    var isNull = false;
    var isRichText = false;
    var displayValues = [];
    var error = '';
    var renderingHint = '';
    var numberOfCharacters = -1;
    var numberOfLines = -1;
    var maxArraySize = -1;
    var propType = 'UNKNOWN';
    var displayName = logicalProperty.propertyName;
    var hasLov = false;
    var isArray = false;
    var isModifable = logicalProperty.isModifiable === true;
    var isEditable = false;
    var isRequired = false;
    var maxLength = 0;
    var uw_dbValue = null;
    var isDisplayable = true;
    var isDCP = false;
    var referenceTypeName = '';

    var srcObj = null;
    var propertyName = logicalProperty.propertyName;

    if( viewModelObject.props && viewModelObject.props[ logicalProperty.propertyName ] ) {
        currentPropertyDescriptor = viewModelObject.props[ logicalProperty.propertyName ].propertyDescriptor;
    }

    if( logicalPropertyDescriptor ) {
        isDCP = logicalPropertyDescriptor.propConstants !== null &&
            logicalPropertyDescriptor.propConstants.isDCP === 'true';
    }

    // Only use the new logical property descriptor if DCP property There is a problem with the SOA request only
    // sending back property descriptors for a column, not cell Cell property descriptors are needed for properties
    // that have different valueTypes in the same column
    if( isDCP ) {
        currentPropertyDescriptor = logicalPropertyDescriptor;
        viewModelObject.propertyDescriptors[ currentPropertyDescriptor.propertyName ] = currentPropertyDescriptor;

        isArray = logicalPropertyDescriptor.isArray || isArray;
        propType = viewModelObjectSvc.getClientPropertyType( logicalPropertyDescriptor.valueType, isArray ) || propType;
        displayName = logicalPropertyDescriptor.displayName || displayName;
        hasLov = logicalPropertyDescriptor.lov !== null && logicalPropertyDescriptor.lov.objectID !== '';
        maxLength = logicalPropertyDescriptor.maxLength || maxLength;

        if( logicalPropertyDescriptor.propConstants !== null ) {
            isDisplayable = logicalPropertyDescriptor.propConstants.displayable === 'true';
            isRequired = logicalPropertyDescriptor.propConstants.required === 'true';
            isRichText = logicalPropertyDescriptor.propConstants.Fnd0RichText === 'true';
            isEnabled = logicalPropertyDescriptor.propConstants.editable === 'true';
            referenceTypeName = logicalPropertyDescriptor.propConstants.ReferencedTypeName;
        }
    } else {
        // For Non DCP properties get the source object from cdm.
        if( !_.isEmpty( logicalProperty.intermediateObjectUids ) ) {
            srcObj = cdm.getObject( logicalProperty.intermediateObjectUids[ 0 ] );
        } else {
            srcObj = cdm.getObject( viewModelObject.uid );
        }
        // In case of relation properties , the logical property name would be something like
        // "Mat1UsesSubstance.mat1composition" . we need to only read the "mat1composition" property from the
        // srcObj.
        if( propertyName.indexOf( '.' ) > 0 ) {
            propertyName = propertyName.split( '.' ).slice( -1 ).pop();
        }
        // if the property descriptor is not available then grab it from the source object.
        if( !currentPropertyDescriptor && srcObj && srcObj.props && srcObj.props.hasOwnProperty( propertyName ) ) {
            currentPropertyDescriptor = srcObj.props[ propertyName ].propertyDescriptor;
        }

        if( currentPropertyDescriptor ) {
            viewModelObject.propertyDescriptors[ currentPropertyDescriptor.name ] = currentPropertyDescriptor;

            // Since we are creating a logical property, we need the descriptor to be like a logical descriptor
            currentPropertyDescriptor.isArray = currentPropertyDescriptor.anArray;
            currentPropertyDescriptor.propertyName = currentPropertyDescriptor.name;
            currentPropertyDescriptor.propConstants = currentPropertyDescriptor.constantsMap;

            isArray = currentPropertyDescriptor.anArray || isArray;
            propType = viewModelObjectSvc.getClientPropertyType( currentPropertyDescriptor.valueType, isArray ) || propType;
            displayName = currentPropertyDescriptor.displayName || displayName;
            hasLov = currentPropertyDescriptor.lovCategory > 0;
            maxLength = currentPropertyDescriptor.maxLength || maxLength;

            var constantsMap = currentPropertyDescriptor.constantsMap;
            if( constantsMap ) {
                isDisplayable = constantsMap.displayable === '1';
                isRequired = constantsMap.required === '1';
                isRichText = constantsMap.Fnd0RichText === '1';
                isEnabled = constantsMap.editable === '1';
                referenceTypeName = constantsMap.ReferencedTypeName;
            }
        }
    }

    // The view model property structure is different for performSearhViewModel and getStyleSheet3. Temporarily
    // adding a fix to support both.
    // <P>
    // The view Model Property structure in getStyleSheet3 response should be made similar to the one in
    // performviewModelSearch .

    var dbValues = null;
    var hasReadAccess = null;
    if( isDCP ) {
        dbValues = logicalProperty.values || logicalProperty.dbValues || [];
        displayValues = logicalProperty.displayValues || logicalProperty.uiValues || [];
        hasLov = logicalPropertyDescriptor.lov !== null && logicalPropertyDescriptor.lov.objectID !== '';
        hasReadAccess = logicalProperty.hasReadAccess;
    } else {
        // For non-DCP property, get the property values from model object
        if( srcObj && srcObj.props.hasOwnProperty( propertyName ) ) {
            var prop = srcObj.props[ propertyName ];
            dbValues = prop.dbValues;
            displayValues = prop.uiValues || [];
            hasLov = prop.propertyDescriptor.lovCategory > 0;
            hasReadAccess = prop.hasReadAccess;
        }
    }

    var date;

    if( dbValues && dbValues.length > 0 ) {
        if( isArray ) {
            uw_dbValue = [];
            for( var i = 0; i < dbValues.length; i++ ) {
                if( propType === 'DATEARRAY' ) {
                    date = new Date( dbValues[ i ] );
                    uw_dbValue[ i ] = date.getTime();
                } else if( currentPropertyDescriptor && currentPropertyDescriptor.valueType === 1 &&
                    displayValues[ i ] ) {
                    // ValueType = 1 indicates  a character property For character property dbValues are in ASCII
                    // code and so use the display values instead .
                    uw_dbValue[ i ] = displayValues[ i ];
                } else if( ( propType === 'DOUBLEARRAY' || propType === 'INTEGERARRAY' ) && dbValues[ i ] ) {
                    uw_dbValue[ i ] = Number( dbValues[ i ] );
                } else {
                    uw_dbValue[ i ] = dbValues[ i ];
                }
            }
        } else {
            if( propType === 'DATE' ) { // eslint-disable-line no-lonely-if
                date = new Date( dbValues[ 0 ] );
                uw_dbValue = date.getTime();
            } else if( ( propType === 'DOUBLE' || propType === 'INTEGER' ) && dbValues[ 0 ] ) {
                uw_dbValue = Number( dbValues[ 0 ] );
            } else if( currentPropertyDescriptor && currentPropertyDescriptor.valueType === 1 &&
                displayValues[ 0 ] ) {
                // ValueType = 1 indicates  a character property For character property dbValues are in ASCII code
                // and so use the display values instead .
                uw_dbValue = displayValues[ 0 ];
            } else {
                uw_dbValue = dbValues[ 0 ];
            }
        }
    }

    // Setting max length to 1 for character and character array types
    if( propType === 'CHAR' || logicalPropertyDescriptor && logicalPropertyDescriptor.valueType === 1 &&
        propType === 'STRINGARRAY' ) {
        maxLength = 1;
    }

    var viewModelProperty = uwPropertySvc.createViewModelProperty( logicalProperty.propertyName, displayName,
        propType, uw_dbValue, displayValues );

    if( propType === 'STRING' || propType === 'STRINGARRAY' ) {
        viewModelProperty.inputType = 'text';
    }

    uwPropertySvc.setHasLov( viewModelProperty, hasLov );
    uwPropertySvc.setIsArray( viewModelProperty, isArray );
    uwPropertySvc.setIsAutoAssignable( viewModelProperty, isAutoAssignable );
    uwPropertySvc.setIsPropertyModifiable( viewModelProperty, isModifable );
    uwPropertySvc.setIsEditable( viewModelProperty, isEditable );
    uwPropertySvc.setIsRichText( viewModelProperty, isRichText );
    uwPropertySvc.setIsEnabled( viewModelProperty, isEnabled );
    uwPropertySvc.setIsDisplayable( viewModelProperty, isDisplayable );
    uwPropertySvc.setIsLocalizable( viewModelProperty, isLocalizable );
    uwPropertySvc.setIsNull( viewModelProperty, isNull );
    uwPropertySvc.setIsRequired( viewModelProperty, isRequired );
    uwPropertySvc.setLength( viewModelProperty, maxLength );
    uwPropertySvc.setError( viewModelProperty, error );
    uwPropertySvc.setRenderingHint( viewModelProperty, renderingHint );
    uwPropertySvc.setNumberOfCharacters( viewModelProperty, numberOfCharacters );
    uwPropertySvc.setNumberOfLines( viewModelProperty, numberOfLines );
    uwPropertySvc.setArrayLength( viewModelProperty, maxArraySize );
    uwPropertySvc.setReferenceType( viewModelProperty, referenceTypeName );

    viewModelProperty.dbValues = dbValues;
    viewModelProperty.uiValues = displayValues;
    viewModelProperty.isDCP = isDCP;
    viewModelProperty.intermediateObjectUids = logicalProperty.intermediateObjectUids;
    viewModelProperty.sourceObjectLastSavedDate = logicalProperty.srcObjLsd;
    viewModelProperty.uiValue = uwPropertySvc.getUiValue( viewModelProperty.uiValues );
    viewModelProperty.initialize = false;
    viewModelProperty.propertyDescriptor = currentPropertyDescriptor;
    viewModelProperty.parentUid = viewModelObject.uid;
    if( hasReadAccess !== undefined && hasReadAccess !== null ) {
        viewModelProperty.hasReadAccess = hasReadAccess;
    }
    if( !viewModelProperty.lovApi && hasLov ) {
        lovService.initNativeCellLovApi( viewModelProperty, null, operationName, viewModelObject );
    }

    return viewModelProperty;
};

/**
 * Adds the logical properties to the viewModelObject.
 *
 * @param {ViewModelObject} viewModelObject - viewModelObject to attach properties
 * @param {ObjectArray} logicalProperties - logical properties
 */
var addPropertiesToViewModelObject = function( viewModelObject, logicalProperties ) {
    if( !viewModelObject.props ) {
        viewModelObject.props = {};
    }

    if( $.isArray( logicalProperties ) ) {
        $.each( logicalProperties, function( index, value ) {
            if( value.propertyName ) {
                viewModelObject.props[ value.propertyName ] = value;
            }
        } );
    }
};

/**
 * Creates the view model properties from logical object and adds it to the view model object.
 *
 * @param {Object} viewModelObject - view model object to update.
 * @param {Object} logicalObject - logical object
 * @param {ObjectArray} logicalPropertyDescriptors - logical property descriptors
 * @param {String} operationName - operation name
 */
function addPropertiesToViewModelObjectFromLogicalObject( viewModelObject, logicalObject,
    logicalPropertyDescriptors, operationName ) {
    var viewModelPropertiesToAdd = [];
    if( viewModelObject && logicalObject && logicalObject.viewModelProperties ) {
        _.forEach( logicalObject.viewModelProperties,
            function( logicalProperty ) {
                if( viewModelObject.props &&
                    !viewModelObject.props.hasOwnProperty( logicalProperty.propertyName ) ) {
                    viewModelPropertiesToAdd.push( logicalProperty );
                }
            } );

        if( viewModelPropertiesToAdd.length > 0 ) {
            var p_operationName = operationName || 'Edit';
            var viewModelProperties = createViewModelPropertiesWithDescriptors( viewModelObject,
                viewModelPropertiesToAdd, logicalPropertyDescriptors, p_operationName );
            addPropertiesToViewModelObject( viewModelObject, viewModelProperties );
        }
    }
}

/**
 * Extracts the view model properties from response and updates the corresponding viewmodelObject
 *
 * @param {ViewModelObject[]} viewModelObjects - view model object to update.
 * @param {Object} response - response
 */
function processViewModelObjectsFromResponse( viewModelObjects, response ) {
    // update the view model object with the view model properties.
    if( response && response.output && response.output.objects ) {
        var logicalObjectsInResponse = response.output.objects;
        var propertyDescriptors = response.output.propDescriptors;
        _.forEach( viewModelObjects, function( viewModelObject ) {
            var objectUpdated = false;
            if( viewModelObject ) {
                _.forEach( logicalObjectsInResponse, function( logicalObject ) {
                    if( !objectUpdated && logicalObject.modelObject &&
                        logicalObject.modelObject.uid === viewModelObject.uid ) {
                        addPropertiesToViewModelObjectFromLogicalObject( viewModelObject, logicalObject,
                            propertyDescriptors );
                        objectUpdated = true;
                    }
                } );
            }
        } );
    }
}

/**
 * Extracts the view model properties from response and updates the corresponding viewmodelObject
 *
 * @param {ViewModelObject[]} viewModelObjects - view model object to update.
 * @param {Object} response - response
 */
function processViewModelObjectsFromJsonResponse( viewModelObjects, response ) {
    // update the view model object with the view model properties.
    if( response.viewModelJSON && !response.viewModelPropertiesJsonString ) {
        // remove after SOA is updated
        response.viewModelPropertiesJsonString = response.viewModelJSON;
    }

    if( response && response.viewModelPropertiesJsonString ) {
        var responseObject = parsingUtils.parseJsonString( response.viewModelPropertiesJsonString );
        var objectsInResponse = responseObject.objects;

        viewModelObjects.forEach( ( viewModelObject )=>{
            var objectUpdated = false;
            if( viewModelObject ) {
                objectsInResponse.forEach( ( currentObject )=> {
                    if( !objectUpdated && currentObject && currentObject.uid === viewModelObject.uid ) {
                        exports.mergeObjects( viewModelObject, currentObject );
                        objectUpdated = true;
                    }
                } );
            }
        } );
    }
}

var exports = {};

/**
 * @param {String} uid - UID of the ModelObject to create a ViewModelObject wrapper for.
 * @param {String} p_operationName - ...
 *
 * @return {ViewModelObject} A new {ViewModelObject}.
 */
export let createViewModelObjectById = function( uid, p_operationName ) {
    var modelObject = cdm.getObject( uid );

    if( !modelObject ) {
        if( cdm.isValidObjectUid( uid ) ) {
            logger.info( 'viewModelObject.createViewModelObject: ' +
                'Unable to locate ModelObject in the clientDataModel with UID=' + uid );
        }

        // Creating a dummy model object as Upload dataset operation uses object type as uid to create generic view
        // model object .
        modelObject = {};
        modelObject.uid = uid;
        modelObject.props = [];
    }

    var operationName = p_operationName || 'Edit';

    return viewModelObjectSvc.constructViewModelObjectFromModelObject( modelObject, operationName );
};

/**
 * Merges the properties of a view model object and either another view model object, or a server view model object
 * from the SOA response.
 *
 * @param {ViewModelObject} targetViewModelObject - target object to merge to.
 * @param {ViewModelObject|Object} sourceViewModelObject - source object to merge values (overrides target values)
 */
export let mergeObjects = function( targetViewModelObject, sourceViewModelObject ) {
    var responseViewModelObject = sourceViewModelObject;

    if( !viewModelObjectSvc.isViewModelObject( sourceViewModelObject ) ) {
        responseViewModelObject = viewModelObjectSvc.createViewModelObject( sourceViewModelObject.uid, 'EDIT', null, sourceViewModelObject );
    }

    var visible = targetViewModelObject.visible;
    _.merge( targetViewModelObject, responseViewModelObject );
    targetViewModelObject.visible = visible;
};

/**
 * Creates and returns a new ViewModelObject wrapper initialized with properties from the given inputs.
 *
 * @param {Object} logicalObject - logical object
 * @param {ObjectArray} logicalPropertyDescriptors - logical property descriptors
 * @param {String} operationName - operation name
 *
 * @return {ViewModelObject} created from logical object
 */
export let createViewModelObjectFromLogicalObject = function( logicalObject, logicalPropertyDescriptors,
    operationName ) {
    var modelObject = cdm.getObject( logicalObject.modelObject.uid );

    if( !modelObject ) {
        logger.error( 'viewModelObject.createViewModelObjectFromLogicalObject: ' +
            'Unable to retrieve ModelObject from logical object' );

        return null;
    }
    var p_operationName = operationName || 'Edit';

    var viewModelObject = viewModelObjectSvc.constructViewModelObjectFromModelObject( modelObject, p_operationName );

    var viewModelProperties = createViewModelPropertiesWithDescriptors( viewModelObject,
        logicalObject.viewModelProperties, logicalPropertyDescriptors, p_operationName );

    addPropertiesToViewModelObject( viewModelObject, viewModelProperties );

    return viewModelObject;
};

/**
 * Cache of promises for getProperties to "reuse" if the same request comes in before the first response has
 * completed.
 *
 * @private
 */
var _getPropertiesPromises = [];

/**
 * Ensures that the specified properties are loaded into the cache. If they are not already loaded a server call is
 * made to load them.
 *
 * @param {ObjectArray} viewModelObjects - array of view model object
 * @param {StringArray} propNames - array of property names
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let getViewModelPropertiesDeprecated = function( viewModelObjects, propNames ) {
    var objects = [];
    _.forEach( viewModelObjects, function( viewModelObject ) {
        if( viewModelObject ) {
            var modelObjAdded = false;
            // Cached model object
            _.forEach( propNames, function( propName ) {
                if( !viewModelObject.props || !viewModelObject.props.hasOwnProperty( propName ) ) {
                    if( !modelObjAdded ) {
                        // Valid property for this model type AND property not cached
                        objects.push( viewModelObject );
                        modelObjAdded = true;
                    }
                }
            } );
        }
    } );

    if( objects.length > 0 ) {
        var input = {
            objects: objects,
            attributes: propNames
        };

        var promise = null;
        _.forEach( _getPropertiesPromises, function( promiseLp ) {
            if( !promise &&
                _.isEqual( input.attributes, promiseLp.input.attributes ) &&
                objects.length === promiseLp.input.objects.length ) {
                promise = promiseLp; // assume a match
                for( var ii = 0; ii < objects.length; ii++ ) {
                    if( objects[ ii ].uid !== promiseLp.input.objects[ ii ].uid ) {
                        promise = null; // invalid assumption
                        break;
                    }
                }
            }
        } );

        if( !promise ) {
            promise = soaSvc.post( 'Internal-AWS2-2017-06-DataManagement', 'getViewModelProperties', input )
                .then( function( response ) {
                    _getPropertiesPromises.splice( _getPropertiesPromises.indexOf( promise ), 1 );
                    processViewModelObjectsFromResponse( viewModelObjects, response );
                    return response;
                } );
            _getPropertiesPromises.push( promise );
            promise.input = input;
        }
        return promise;
    }

    return AwPromiseService.instance.resolve();
};

/**
 * This getViewModelProperties2 SOA returns viewModelObjects and viewModelProperties with necessary property information.
 * The viewModelObjects and ViewModelProperties will be returned from server in a JSON string format.
 * This getViewModelProperties2 SOA also adds the input VMO objects to the serviceData, client loads this information to cdm cache.
 *
 * @param {ObjectArray} viewModelObjects - array of view model objects
 * @param {StringArray} propNames - array of property names
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let getViewModelProperties = function( viewModelObjects, propNames ) {
    if( viewModelObjects.length > 0 ) {
        let input = {
            objects: viewModelObjects,
            attributes: propNames,
            configs: {}
        };

        let promise = null;
        promise = soaSvc.post( 'Internal-AWS2-2017-12-DataManagement', 'getViewModelProperties2', input )
            .then( function( response ) {
                if( response && response.viewModelPropertiesJsonString ) {
                    let parsedResponse = JSON.parse( response.viewModelPropertiesJsonString );
                    if(  parsedResponse && parsedResponse.objects ) {
                        viewModelObjects = parsedResponse.objects.map( function( vmo ) {
                            let createdVMO = viewModelObjectSvc.createViewModelObject( vmo.uid, 'EDIT', null, vmo );
                            if( createdVMO !== null ) {
                                return createdVMO;
                            }
                            return vmo;
                        } );
                    }
                }
                return {
                    objects: viewModelObjects,
                    ServiceData: response.ServiceData
                };
            } );
        return promise;
    }

    return AwPromiseService.instance.resolve();
};

/**
 * Ensures that the specified properties are loaded into the cache. New SOA supports DCP.
 *
 * @param {ViewModelTreeNodeArray} vmNodes - Array of {ViewModelTreeNode}.
 * @param {Object} context - ...
 *
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let getTableViewModelProperties = function getTableViewModelProperties( vmNodes, context, overriddenPropertyPolicy ) {
    var missingUids = [];
    var clientScope = context.clientScopeURI ? context.clientScopeURI : '';
    var clientName = context.clientName ? context.clientName : '';
    var typesForArrange = context.typesForArrange ? context.typesForArrange : [];
    var columnsToExclude = context.columnsToExclude ? context.columnsToExclude : [];
    var operationType = context.operationType ? context.operationType : 'Union';

    _.forEach( vmNodes, function( vmNode ) {
        // check cache before fetching?
        missingUids.push( vmNode.uid );
    } );

    var input = {
        input: {
            objectUids: missingUids,
            columnConfigInput: {
                clientName: clientName,
                hostingClientName: '',
                clientScopeURI: clientScope,
                operationType: operationType,
                columnsToExclude: columnsToExclude
            },
            requestPreference: {
                typesToInclude: typesForArrange
            }
        }
    };

    if( missingUids.length > 0 ) {
        return soaSvc.post( 'Internal-AWS2-2023-06-DataManagement', 'getTableViewModelProperties2', input, overriddenPropertyPolicy )
            .then( function( response ) {
                // process DCPs
                processViewModelObjectsFromJsonResponse( vmNodes, response.output );
                return response;
            } );
    }

    // no op
    return AwPromiseService.instance.resolve();
};

export default exports = {
    createViewModelObjectById,
    mergeObjects,
    createViewModelObjectFromLogicalObject,
    getViewModelPropertiesDeprecated,
    getViewModelProperties,
    getTableViewModelProperties
};
