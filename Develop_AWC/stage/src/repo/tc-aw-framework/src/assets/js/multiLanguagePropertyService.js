/* eslint-disable sonarjs/no-duplicate-string */
// Copyright (c) 2020 Siemens

/**
 * This module provides a way for declarative framework to do outgoing calls like SOA or REST.
 *
 * @module js/multiLanguagePropertyService
 *
 * @namespace multiLanguagePropertyService
 */
import _ from 'lodash';
import eventBus from 'js/eventBus';
import uwPropertySvc from 'js/uwPropertyService';
import localeSvc from 'js/localeService';
import leavePlaceService from 'js/leavePlace.service';
import AwPromiseService from 'js/awPromiseService';
import viewModelObjectService from 'js/viewModelObjectService';

// eslint-disable-next-line valid-jsdoc

/**
 * Define public API
 */
let exports = {};
let _isUnsavedChangesPopupOpen = false;

/**
 * Setup to map labels to local names.
 */
var localeMap = {};

/**
 * Load configuration needed after instantiating this service
 */
export let loadConfiguration = function() {
    localeSvc.getTextPromise( 'MultiLanguagePropertyMessages', true ).then(
        function( textBundle ) {
            localeMap.status = textBundle.status;
        } );
};

/**
 * Return language display name from specified language code
 *
 * @param {String} locale - language code
 * @returns {String} display name of given language code
 */
var _getLanguageDisplayName = function( locale ) {
    let locationMessages = localeSvc.getLoadedText( 'MultiLanguagePropertyMessages' );
    let languageName = locationMessages[ locale ];
    if( !languageName ) {
        // search by the 2 character locale
        var localeShort = locale.substring( 0, 2 ).toLowerCase();
        languageName = locationMessages[ localeShort ];
    }

    return languageName;
};

/**
 * Return translation status display name from specified internal value
 *
 * @param {String} internalVal - translation status internal value
 * @param {Array} translationStatuses - array of translation status objects
 * @returns {String} display name of given translation status
 */
var _getTranslationStatusDisplayValue = function( internalVal, translationStatuses ) {
    let dispValArr = translationStatuses.filter( function( statusObj ) {
        if( statusObj.status === internalVal ) {
            return statusObj;
        }
    } );

    return dispValArr.length > 0 ? dispValArr[ 0 ].displayName : '';
};

export let setLocaleProps = function( response ) {
    return response;
};

/**
 * Process and create localization properties from response object with new SOA 'getLocalizedProperties'
 *
 * @param {Object} response - response object
 * @param {Object} data - declarative view model
 * @returns {Array} array of viewModel properties
 */
export let processLocaleProps = function( response, data ) {
    if( !response || !response.propertiesInfo[ 0 ] || !response.propertiesInfo[ 0 ].propertyNameValues[ 0 ] ) {
        return;
    }

    data.masterTranslationStatus = response.fullTranslationStatuses[ 0 ];
    data.translationStatuses = response.fullTranslationStatuses.slice( 1 );
    data.languageCodes = [];
    data.languageNames = {};
    data.languages = [];

    var props = [];
    var statusProps = [];
    var propValues = response.propertiesInfo[ 0 ].propertyNameValues[ 0 ].propertyValues;

    let masterValueResponse = propValues.filter( value => value.statuses[ 0 ] === data.masterTranslationStatus.status )[ 0 ];
    let masterDbValue = masterValueResponse.values.length === 1 && masterValueResponse.values[ 0 ] ? masterValueResponse.values[ 0 ] : '';
    let masterDisplayValues = [ masterDbValue ];
    let languageName;

    let isArray = false;
    if( masterValueResponse.values.length > 1 ) {
        masterDbValue = masterValueResponse.values.length > 1 ? masterValueResponse.values[ 0 ] : [];
        isArray = true;
        masterDisplayValues = [ masterDbValue ];
    }

    _.forEach( propValues, function( propVal ) {
        if( propVal.statuses[ 0 ] === data.masterTranslationStatus.status ) {
            languageName = _getLanguageDisplayName( propVal.locale );
            let masterProp = uwPropertySvc.createViewModelProperty( propVal.locale, languageName, 'STRING', masterDbValue,
                masterDisplayValues );
            uwPropertySvc.setIsPropertyModifiable( masterProp, true );
            uwPropertySvc.setEditState( masterProp, true, true );
            uwPropertySvc.setIsEnabled( masterProp, false );
            uwPropertySvc.setRenderingHint( masterProp, 'textbox' );
            masterProp.index = 0;

            if( isArray ) {
                uwPropertySvc.setIsEnabled( masterProp, true );
                uwPropertySvc.setIsSelectOnly( masterProp, true );

                masterProp.dataProvider = 'arrayPropDataProvider';
                masterProp.hasLov = true;
                masterProp.emptyLOVEntry = false;

                masterProp.getViewModel = function() {
                    return data;
                };

                eventBus.subscribe( masterProp.propertyName + '.lovValueChanged', function( evtData ) {
                    eventBus.publish( 'editLocalizationSingle.updateTranslations', evtData );
                } );
            }

            data.masterProp = masterProp;
        } else {
            languageName = _getLanguageDisplayName( propVal.locale );

            if( languageName ) {
                if( isArray && propVal.values.length !== masterValueResponse.values.length ) {
                    propVal.values = _.times( masterValueResponse.values.length, () => '' );
                }

                _.forEach( propVal.values, function( value, indx ) {
                    let dbValue = value ? value : '';
                    let viewModelProp = uwPropertySvc.createViewModelProperty( propVal.locale, languageName, 'STRING', dbValue,
                        [ dbValue ] );
                    uwPropertySvc.setIsPropertyModifiable( viewModelProp, true );
                    uwPropertySvc.setEditState( viewModelProp, true, true );
                    uwPropertySvc.setNumberOfLines( viewModelProp, 1 );
                    uwPropertySvc.setIsRequired( viewModelProp, false );
                    viewModelProp.index = indx;

                    let statusInternalValue = propVal.statuses[ indx ];
                    let statusDisplayValue = _getTranslationStatusDisplayValue( statusInternalValue, data.translationStatuses );
                    let viewModelPropStatus = uwPropertySvc.createViewModelProperty( propVal.locale + '_status_', localeMap.status, 'STRING', statusInternalValue,
                        [ statusDisplayValue ] );
                    uwPropertySvc.setIsPropertyModifiable( viewModelPropStatus, true );
                    uwPropertySvc.setEditState( viewModelPropStatus, true, true );
                    uwPropertySvc.setIsRequired( viewModelPropStatus, false );
                    uwPropertySvc.setRenderingHint( viewModelPropStatus, 'textbox' );
                    viewModelPropStatus.dataProvider = 'statusesDataProvider';
                    viewModelPropStatus.hasLov = true;
                    viewModelPropStatus.getViewModel = function() {
                        return data;
                    };
                    viewModelPropStatus.index = indx;
                    uwPropertySvc.setPropertyLabelDisplay( viewModelProp, 'PROPERTY_LABEL_AT_TOP' );
                    viewModelProp.vertical = true;
                    uwPropertySvc.setPropertyLabelDisplay( viewModelPropStatus, 'PROPERTY_LABEL_AT_TOP' );
                    viewModelPropStatus.vertical = true;

                    props.push( viewModelProp );

                    statusProps.push( viewModelPropStatus );

                    if( data.languageCodes.indexOf( propVal.locale ) === -1 ) {
                        data.languageCodes.push( propVal.locale );
                        data.languageNames[ propVal.locale ] = languageName;
                        data.languages.push( {
                            languageCode: propVal.locale,
                            languageName: languageName
                        } );
                    }
                } );
            }
        }
    } );

    return {
        masterTranslationStatus: data.masterTranslationStatus,
        translationStatuses: data.translationStatuses,
        languageCodes: data.languageCodes,
        languageNames: data.languageNames,
        languages: data.languages,
        masterProp: data.masterProp,
        statusProps: statusProps,
        localizedProps: props
    };
};

/**
 * Prepare SOA input for setting translation property values using new SOA 'setLocalizedProperties'
 *
 * @param {Object} subPanelContext - application context
 * @param {Object} data - declarative view model
 * @returns {Array} array of localization property values needed for SOA input
 */
export let setLocalePropertyValues = function( subPanelContext, data ) {
    let localePropertyValues = [];
    let loadedLocales = [];

    var rootObj = {};

    rootObj.propertyName = subPanelContext.propertyName;
    rootObj.propertyValues = [];

    _.forEach( data.localizedProps, function( localizedProp, i ) {
        let localeProp = localizedProp;
        let isPropAdded = data.languagePropObj[ localeProp.propertyName ].dbValue && localizedProp.isRequired;
        let currStatusProp = data.statusProps[ i ];

        if( loadedLocales.includes( localeProp.propertyName ) ) {
            let existingObj = rootObj.propertyValues.filter( value => value.locale === localeProp.propertyName );
            if( isPropAdded ) {
                let exStatusValue = currStatusProp.dbValue ? currStatusProp.dbValue : '';

                existingObj[ 0 ].values.splice( localeProp.index, 0, localeProp.dbValue );
                existingObj[ 0 ].statuses.splice( localeProp.index, 0, exStatusValue );
            } else {
                existingObj[ 0 ].values.splice( localeProp.index, 0, '' );
                existingObj[ 0 ].statuses.splice( localeProp.index, 0, '' );
            }
        } else {
            var obj = {};

            obj.values =  isPropAdded || localizedProp.isRequired  ? [ localeProp.dbValue ] : [ '' ];
            obj.locale = localeProp.propertyName;

            let statusValue = currStatusProp.dbValue ? currStatusProp.dbValue : '';
            obj.statuses =  isPropAdded || localizedProp.isRequired  ? [ statusValue ] : [ '' ];

            if( isPropAdded && ( obj.values[0] === '' || obj.statuses[0] === '' ) ) {
                throw new Error( 'Can not use empty string' );
            }

            rootObj.propertyValues.push( obj );
            loadedLocales.push( localeProp.propertyName );
        }
    } );

    let masterDbValues = [ data.masterProp.dbValue ];
    let masterStatus = [ data.masterTranslationStatus.status ];
    if( _.isArray( subPanelContext.dbValue ) ) {
        masterDbValues = subPanelContext.dbValue;
        masterStatus = _.times( subPanelContext.dbValue.length, () => data.masterTranslationStatus.status );
    }

    rootObj.propertyValues.push( {
        values: masterDbValues,
        locale: data.masterProp.propertyName,
        statuses: masterStatus
    } );
    loadedLocales.push( data.masterProp.propertyName );

    localePropertyValues.push( rootObj );
    return localePropertyValues;
};

/**
 * Load language properties needed for add/remove localization popup panel
 *
 * @param {Object} data - declarative view model
 * @param {Array} allLanguages - array of language objects with languageCode and languageName
 * @returns {Array} array of ViewModelProperties
 */
export let loadLanguageProperties = function( data, allLanguages ) {
    let languageProps = [];

    _.forEach( allLanguages, function( language ) {
        if( data.masterProp.propertyName !== language.languageCode ) {
            let localizablePropArr = data.localizedProps.filter( localizedProp => localizedProp.propertyName === language.languageCode );

            let dbValue = Boolean( localizablePropArr[ 0 ] && localizablePropArr[ 0 ].dbValue );

            let viewModelProp = uwPropertySvc.createViewModelProperty( language.languageCode, language.languageName, 'BOOLEAN', dbValue, [ language.languageName ] );

            if( localizablePropArr[0].dbValue !== '' ) {
                viewModelProp.setRequiredProps = true;
            }

            uwPropertySvc.setPropertyLabelDisplay( viewModelProp, 'PROPERTY_LABEL_AT_RIGHT' );

            languageProps.push( viewModelProp );
        }
    } );

    let obj = {};
    for( let i = 0; i < languageProps.length; i++ ) {
        obj[ languageProps[ i ].propertyName ] = languageProps[ i ];
        if( data.localizedProps[ i ].dbValue !== '' ) {
            uwPropertySvc.setIsRequired( data.localizedProps[ i ], true );
            uwPropertySvc.setIsRequired( data.statusProps[ i ], true );
        }
    }

    var viewModelObj = viewModelObjectService.createViewModelObject( data.adaptedObject[ 0 ].uid );
    viewModelObj.props = obj;

    return {
        languageProps: viewModelObj,
        languagePropObj: obj
    };
};

/**
 * Load language properties needed for add/remove localization popup panel
 *
 * @param {Object} data - declarative view model
 * @param {Object} subPanelContext - application context
 * @param {Array} allLanguages - array of language objects with languageCode and languageName
 * @returns {Array} array of ViewModelProperties
 */
export let refreshLanguageProperties = function( data, subPanelContext, allLanguages, selectedValue ) {
    let index = selectedValue ? subPanelContext.dbValue.indexOf( selectedValue ) : 0;

    _.forEach( allLanguages, function( language ) {
        if( data.masterProp.propertyName !== language.languageCode ) {
            let localizablePropArr = data.localizedProps.filter( localizedProp => localizedProp.propertyName === language.languageCode );
            let dbValue = Boolean( localizablePropArr[ index ] && localizablePropArr[ index ].dbValue );
            if( data.languageProps.propertyName && data.languageProps.propertyName === language.languageCode ) {
                data.languageProps.dbValue = dbValue;
            }
            data.languagePropObj[ language.languageCode ].dbValue = dbValue;
        }
    } );
    return {
        languagePropObj: data.languagePropObj
    };
};

/**
 * Convert values to LOV entries
 *
 * @param {Array} values - array of values
 * @returns {Array} array of LOV entries
 */
export let convertToLovEntries = function( values ) {
    let propLovVals = [];

    _.forEach( values, function( value ) {
        propLovVals.push( {
            propInternalValue: _.isObject( value ) ? value.statusName ? value.statusName : value.status : value,
            propDisplayValue: _.isObject( value ) ? value.statusName ? value.statusName : value.displayName : value
        } );
    } );

    return propLovVals;
};

/**
 * Discard/Save unsaved changes
 *
 * @param {Objec} data - declarative view model
 */
export let unsavedChangesAction = function( data ) {
    _isUnsavedChangesPopupOpen = false;

    if( data.action === 'discard' || data.action === 'save' ) {
        // Internal event should not be used outside
        eventBus.publish( 'editLocalizationSingle.leavePlaceNavigation', { success: true } );
    }
};

/**
 * Register leave place handler for the panel
 *
 * @param {Objec} data - declarative view model
 * @returns {Object} leave handler
 */
export let registerLeaveHandler = function( data ) {
    var leaveHandler = {};

    leaveHandler.leaveConfirmation = function( callback ) {
        var deferred = AwPromiseService.instance.defer();
        if( data.isPanelDirty || data.isDirty() ) {
            _isUnsavedChangesPopupOpen = true;

            eventBus.publish( 'editLocalizationSingle.confirmLeave', {} );
            var subscriptionId = eventBus.subscribe( 'editLocalizationSingle.leavePlaceNavigation', function( data ) {
                if( _.isFunction( callback ) ) {
                    callback();
                }

                eventBus.unsubscribe( subscriptionId );

                if( data.success ) {
                    // de-register any existing handler.
                    leavePlaceService.registerLeaveHandler( null );
                    return deferred.resolve();
                }

                // de-register any existing handler.
                leavePlaceService.registerLeaveHandler( null );
                return deferred.reject();
            } );
            return deferred.promise;
        }

        // de-register any existing handler.
        leavePlaceService.registerLeaveHandler( null );
        eventBus.publish( 'editLocalizationSingle.closePanel', {} );
        return AwPromiseService.instance.when( true );
    };
    // de-register any existing handler.
    leavePlaceService.registerLeaveHandler( null );
    // register again
    leavePlaceService.registerLeaveHandler( {
        okToLeave: function( targetNavDetails ) {
            return leaveHandler.leaveConfirmation( targetNavDetails );
        }
    } );

    return leaveHandler;
};

/**
 * Un-register leave place handler for the panel
 */
export let unRegisterLeaveHandler = function() {
    // de-register any existing handler
    leavePlaceService.registerLeaveHandler( null );
};

/**
 * Mark panel as dirty
 * @param {Object} data - declarative view model
 *
 */
export let markPanelDirty = function() {
    return true;
};

/**
 * Mark panel as "clean"
 *
 * @param {Object} data - declarative view model
 */
export let markPanelClean = function( data ) {
    data.isPanelDirty = false;
    data.isLocaleNew = true;
};

/**
 * Remove localization property
 *
 * @param {Object} data - declarative view model
 * @param {String} propertyName - property name of the event
 * @param {Object} dispatch - data dispatch
 * @param {Object} editLocalizationPanelState - object which contains new localization panel state
 * @param {Object} localizedProps - properties of the localizations
 * @param {Object} statusProps - status of the proprs
 * @returns {object} new localization properties to be displayed on panel
 */
export let removeLocale = function( data, propertyName, dispatch, editLocalizationPanelState, localizedProps, statusProps ) {
    let localizedProp;
    _.forEach( localizedProps, function( prop ) {
        if( prop.propertyName === propertyName && prop.index === data.masterProp.index ) {
            localizedProp = prop;
        }
    } );
    if( localizedProp && localizedProp.prevDisplayValues[ 0 ] === '' ) {
        exports.markPanelClean( data );
    } else {
        data.isPanelDirty = exports.markPanelDirty();
    }
    if( editLocalizationPanelState && editLocalizationPanelState.localizedProps && editLocalizationPanelState.localizedProps[ propertyName ] ) {
        editLocalizationPanelState.localizedProps[ propertyName ].dbValue = false;
    }
    data.languagePropObj[ propertyName ].dbValue = false;

    _.forEach( localizedProps, ( localizedProp, index ) => {
        if( localizedProp.propertyName === propertyName && localizedProp.index === data.masterProp.index ) {
            uwPropertySvc.setIsRequired( localizedProps[ index ], false );
        }
    } );
    _.forEach( statusProps, ( statusProp, index ) => {
        if( statusProp.propertyName === propertyName + '_status_' && statusProp.index === data.masterProp.index ) {
            uwPropertySvc.setIsRequired( statusProps[ index ], false );
        }
    } );

    dispatch( { path: `data.languagePropObj${[ propertyName ]}.dbValue`, value: false } );
    return {
        languagePropObj: data.languagePropObj,
        isPanelDirty: data.isPanelDirty,
        isLocaleNew: data.isLocaleNew,
        editLocalizationPanelState: editLocalizationPanelState,
        statusProps,
        localizedProps

    };
};

/**
 * Publish remove localization property event with property name
 *
 * @param {String} prop - property name which has been removed
 */
export let fireRemoveLocaleEvent = function( prop ) {
    eventBus.publish( 'editLocalizationSingle.removeLocale', {
        propName: prop.propertyName
    } );
};

/**
 * Update translation values
 *
 * @param {Object} data - declarative view model
 * @param {Object} subPanelContext - application context
 * @param {String} selectedValue - selected lov value
 */
export let updateTranslationValues = function( data, subPanelContext, selectedValue ) {
    let newMasterProp = { ...data.masterProp };
    newMasterProp.index = subPanelContext.dbValue.indexOf( selectedValue );
    return newMasterProp;
};

export let updateLanguagePropObj = function( editLocalizationPanelState, languagePropObj, dispatch, localizedProps, statusProps, masterProp, arrayPropertyValues ) {
    if( editLocalizationPanelState && editLocalizationPanelState.localizedProps ) {
        let newLanguagePropObj = { ...languagePropObj };
        for( const [ key, localizedProp ] of Object.entries( editLocalizationPanelState.localizedProps ) ) {
            newLanguagePropObj[ key ].dbValue = localizedProp.dbValue;
            _.forEach( localizedProps, ( localizedProp2, index ) => {
                if( localizedProp2.propertyName === key && localizedProp2.index === masterProp.index ) {
                    uwPropertySvc.setIsRequired( localizedProps[ index ], localizedProp.dbValue );
                }
            } );
            _.forEach( statusProps, ( statusProp, index ) => {
                if( statusProp.propertyName === key + '_status_'  && statusProp.index === masterProp.index ) {
                    uwPropertySvc.setIsRequired( statusProps[ index ], localizedProp.dbValue );
                }
            } );
        }
        dispatch( { path: 'data.languagePropObj', value: newLanguagePropObj } );
    }

    return {
        localizedProps,
        statusProps,
        isPanelDirty: editLocalizationPanelState.isDirty
    };
};

exports = {
    processLocaleProps,
    setLocalePropertyValues,
    loadLanguageProperties,
    refreshLanguageProperties,
    convertToLovEntries,
    removeLocale,
    fireRemoveLocaleEvent,
    registerLeaveHandler,
    unRegisterLeaveHandler,
    unsavedChangesAction,
    markPanelDirty,
    markPanelClean,
    updateTranslationValues,
    loadConfiguration,
    setLocaleProps,
    updateLanguagePropObj
};
export default exports;

loadConfiguration();
