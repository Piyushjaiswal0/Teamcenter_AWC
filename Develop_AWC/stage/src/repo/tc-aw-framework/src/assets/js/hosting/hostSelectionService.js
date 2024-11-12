// Copyright (c) 2022 Siemens

/**
 * @module js/hosting/hostSelectionService
 * @namespace hostSelectionService
 */
import AwPromiseService from 'js/awPromiseService';
import hostInteropSvc from 'js/hosting/hostInteropService';
import hostObjectRefSvc from 'js/hosting/hostObjectRefService';
import hostSelSvc1 from 'js/hosting/inf/services/hostSelection_2014_02';
import hostSelSvc2 from 'js/hosting/inf/services/hostSelection_2014_07';
import hostSelSvc3 from 'js/hosting/inf/services/hostSelection_2014_10';
import hostSelSvc4 from 'js/hosting/inf/services/hostSelection_2019_05';
import cdm from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import browserUtils from 'js/browserUtils';
import hostServices from 'js/hosting/hostConst_Services';
import hostConfigValues from 'js/hosting/hostConst_ConfigValues';

/**
 * {Boolean} TRUE if details of this services activity should be logged.
 */
var _debug_logHostSelectionActivity = browserUtils.getUrlAttributes().logHostSelectionActivity !== undefined;

/**
 * {Number} Milliseconds to filter (block) sending a given selection set **TO** the 'host' after it was
 * either announced to 'host' or set on the 'client'. This value is used to prevent an 'echo' of a selection
 * from the 'host' from being immediatly sent back to the 'host' when that selection is process (announced)
 * on the 'client'.
 */
var MAX_FILTER_TIME = 1000;

/**
 * Array of 'recent' {ChangeSelectionRecord}s which indicate selections sent from the 'client' to the
 * 'host'.
 */
var _changeSelectionRecords = [];

/**
 * Adds a change selection record
 *
 * @param {StringArray} selectedUIDs - UIDs of Currently selected {ImodelObject} just announced to the
 * 'host'.
 */
function _addChangeSelectionRecord( selectedUIDs ) {
    if( !_.isEmpty( selectedUIDs ) ) {
        _changeSelectionRecords.push( new ChangeSelectionRecord( selectedUIDs ) );
    }
}

/**
 * Checks to see if the input selection should be filtered out because of an existing change selection
 * record.
 * <P>
 * Note: This filter suppresses selection 'echos'.
 *
 * @param {StringArray} selectedUIDsToTest - UIDs of selection to test.
 *
 * @return {Boolean} true, if filtered; else, false
 */
function _isFilteredSelection( selectedUIDsToTest ) {
    // Purge any old change selection records
    _purgeChangeSelectionRecords();

    var isFiltered = false;

    // Check if the input selection was previously recorded as a {ChangeSelectionRecord}.
    // <P>
    // If so: We want to filter these out.
    _.forEach( _changeSelectionRecords, function( changeRec ) {
        var selectedUIDs = changeRec.getSelections();

        // If the selections are the same then filter out the echo, use containsAll both ways instead of
        // equals to ignore order
        if( selectedUIDs.length === selectedUIDsToTest.length &&
            _.intersection( selectedUIDs, selectedUIDsToTest ).length === selectedUIDsToTest.length ) {
            isFiltered = true;
            return false;
        }

        // Do a "fuzzy" filter, which checks to see if a subset of a host selection is being sent out
        if( appCtxSvc.ctx.aw_host_type === hostConfigValues.HOST_TYPE_NX && _.intersection( selectedUIDs, selectedUIDsToTest ).length > 0 ) {
            isFiltered = true;
            return false;
        }
    } );

    if( _debug_logHostSelectionActivity ) {
        logger.info( 'hostSelectionService: ' + '_isFilteredSelection: ' +
            'selectedUIDsToTest=' + JSON.stringify( selectedUIDsToTest ) + ' ' +
            'isFiltered=' + isFiltered );
    }

    return isFiltered;
}

/**
 * Purge out any old change selection records.
 */
function _purgeChangeSelectionRecords() {
    // Old ChangeSelectionRecords used to prevent an 'echo' need to be purged. For now, let's purge them
    // after an elapse of MAX_FILTER_TIME msec.
    var currentTime = Date.now();

    _.remove( _changeSelectionRecords, function( changeRec ) {
        return currentTime - changeRec.getTimeStamp() > MAX_FILTER_TIME;
    } );
}

/**
 * Send selections via the 2019_05 version of selectionProviderProxy
 *
 * @param {IModelObjectArray} selectedModelObjs - Currently selected {ImodelObject} to announce to the host.
 */
function _sendSelections_2019_05( selectedModelObjs ) {
    var selectedObjRefs = [];
    var selectedUIDs = [];

    _.forEach( selectedModelObjs, function( modelObj ) {
        selectedUIDs.push( modelObj.uid );

        var objRefs = hostObjectRefSvc.createObjectRefsByModelObject( modelObj );

        _.forEach( objRefs, function( objRef ) {
            selectedObjRefs.push( objRef );
        } );
    } );

    hostSelSvc4.createSelectionProviderProxy().fireHostEvent( { objRefList: selectedObjRefs } );

    /**
     * Record the last sent selection so that we can avoid repeated messages being sent to the host.
     */
    _addChangeSelectionRecord( selectedUIDs );
}

/**
 * Send selections via the 2014_10 version of selectionProviderProxy
 *
 * @param {IModelObjectArray} selectedModelObjs - Currently selected {ImodelObject} to announce to the host.
 */
function _sendSelections_2014_10( selectedModelObjs ) {
    var selectedObjRefs = [];
    var selectedUIDs = [];

    _.forEach( selectedModelObjs, function( modelObj ) {
        selectedUIDs.push( modelObj.uid );

        var objRefs = hostObjectRefSvc.createObjectRefsByModelObject( modelObj );

        _.forEach( objRefs, function( objRef ) {
            selectedObjRefs.push( objRef );
        } );
    } );

    hostSelSvc3.createSelectionProviderProxy().callHostMethod( { objRefList: selectedObjRefs } );

    /**
     * Record the last sent selection so that we can avoid repeated messages being sent to the host.
     */
    _addChangeSelectionRecord( selectedUIDs );
}

/**
 * Send selections via the 2014_07 version of selectionProviderProxy
 *
 *
 * @param {IModelObjectArray} selectedModelObjs - Currently selected {ImodelObject} to announce to the host.
 */
function _sendSelections_2014_07( selectedModelObjs ) {
    var selectedUIDs = [];
    var selectedObjRefs = [];

    _.forEach( selectedModelObjs, function( modelObj ) {
        selectedUIDs.push( modelObj.uid );

        selectedObjRefs.push( hostObjectRefSvc.createBasicRefByModelObject( modelObj ) );
    } );

    hostSelSvc2.createSelectionProviderProxy().callHostMethod( { objRefList: selectedObjRefs } );

    /**
     * Record the last sent selection so that we can avoid repeated messages being sent to the host.
     */
    _addChangeSelectionRecord( selectedUIDs );
}

/**
 * Send selections via the 2014_02 version of selectionProviderProxy
 *
 * @param {IModelObjectArray} selectedModelObjs - Currently selected {ImodelObject} to announce to the host.
 */
function _sendSelections_2014_02( selectedModelObjs ) {
    var selectedUIDs = [];
    var selectedObjRefs = [];

    _.forEach( selectedModelObjs, function( modelObj ) {
        selectedUIDs.push( modelObj.uid );

        selectedObjRefs.push( hostObjectRefSvc.createBasicRefByModelObject( modelObj ) );
    } );

    hostSelSvc1.createSelectionProviderProxy().callHostMethod( { objRefList: selectedObjRefs } );

    /**
     * Record the last sent selection so that we can avoid repeated messages being sent to the host.
     */
    _addChangeSelectionRecord( selectedUIDs );
}

/**
 * Process the raw selection and delagate to the 'most advanced' version API the 'host' supports.
 *
 * @param {StringArray} selectedUIDs - UIDs of currently selected {ImodelObject} to announce to the host.
 * @param {IModelObjectArray} selectedModelObjs - Currently selected {ImodelObject} to announce to the host.
 */
function _processSelection( selectedUIDs, selectedModelObjs ) {
    /**
     * Only send the selection change notification to the host if these selections are not listed in the
     * 'recent' change selection records.
     */
    if( !_isFilteredSelection( selectedUIDs ) ) {
        /**
         * Check if we have any 'host' services we can to talk to.
         */
        if( hostInteropSvc.isHostServiceAvailable(
            hostServices.HS_SELECTION_PROVIDER_SVC,
            hostServices.VERSION_2019_05 ) ) {
            _sendSelections_2019_05( selectedModelObjs );
        } else if( hostInteropSvc.isHostServiceAvailable(
            hostServices.HS_SELECTION_PROVIDER_SVC,
            hostServices.VERSION_2014_10 ) ) {
            _sendSelections_2014_10( selectedModelObjs );
        } else if( hostInteropSvc.isHostServiceAvailable(
            hostServices.HS_SELECTION_PROVIDER_SVC,
            hostServices.VERSION_2014_07 ) ) {
            _sendSelections_2014_07( selectedModelObjs );
        } else if( hostInteropSvc.isHostServiceAvailable(
            hostServices.HS_SELECTION_PROVIDER_SVC,
            hostServices.VERSION_2014_02 ) ) {
            _sendSelections_2014_02( selectedModelObjs );
        }
    }
}

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// ChangeSelectionRecord
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 * This records a change selection record that can be used to help filter out selection "echos" caused when
 * AW makes the selection sent from the host.
 *
 * @param {StringArray} selectedUIDs - UIDs of Currently selected {ImodelObject} just announced to the
 * 'host'.
 */
var ChangeSelectionRecord = function( selectedUIDs ) {
    /**
     * The selections
     */
    this._selections = _.clone( selectedUIDs );

    /**
     * The time stamp for this record.
     */
    this._timeStamp = Date.now();

    /**
     * Get the selections
     *
     * @returns {StringArray} UIDs of selected {ImodelObject} announced to the 'host' at this record's
     * 'timeStamp'.
     */
    this.getSelections = function() {
        return this._selections;
    };

    /**
     * Get the time stamp
     *
     * @return {Number} Time Stamp
     */
    this.getTimeStamp = function() {
        return this._timeStamp;
    };
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Finish initilization of this service now that hostign has started.
 *
 * @memberof hostSelectionService
 *
 * @returns {Promise} Resolved when this service is fully initialized.
 */
export let initialize = function() {
    eventBus.subscribe( 'appCtx.register', function( eventData ) {
        if( eventData.name === 'mselected' ) {
            /**
             * LCS-174734: Check if we are NOT currently ignoring 'client' selection activity (and thus
             * preventing that activity from being communicated to the 'host').
             * <P>
             * Note: We ignore these selections between the time the 'host' sends a selection and a
             * subsequent selection occurs in the 'primaryWorkArea'.
             */
            var hostingState = appCtxSvc.getCtx( 'aw_hosting_state' );

            if( !hostingState || !hostingState.ignoreSelection ) {
                var selectedObjs = eventData.value;

                if( selectedObjs ) {
                    if( _debug_logHostSelectionActivity ) {
                        logger.info( 'hostSelectionService: ' + 'mselected: ' +
                            'selectedObjs=' + JSON.stringify( selectedObjs ) );
                    }

                    var selectedUIDs = [];
                    var selectedModelObjs = [];

                    _.forEach( selectedObjs, function( selectedObj ) {
                        if( selectedObj.uid ) {
                            var modelObj = cdm.getObject( selectedObj.uid );

                            if( modelObj ) {
                                selectedUIDs.push( modelObj.uid );
                                selectedModelObjs.push( modelObj );
                            }
                        }
                    } );

                    _processSelection( selectedUIDs, selectedModelObjs );
                }
            }
        }
    } );

    /**
     * Listen for selections being sent to the 'client' from the 'host' and that were processed by one of
     * the registered 'selection_type_to_handler' services.
     */
    eventBus.subscribe( 'hosting.changeSelection', function( eventData ) {
        if( _debug_logHostSelectionActivity ) {
            logger.info( 'hostSelectionService: ' + 'hosting.changeSelection' + ': ' +
                'eventData.selected=' + JSON.stringify( eventData.selected ) );
        }

        /**
         * Record the last selection sent from the 'host' so that we can avoid repeated 'echo' messages
         * being sent back to the 'host'.
         */
        _addChangeSelectionRecord( eventData.selected );
    } );

    // Not much else to do right now
    return AwPromiseService.instance.resolve();
};

export default exports = {
    initialize
};
