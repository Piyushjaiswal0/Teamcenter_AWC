// Copyright (c) 2022 Siemens

/**
 * JS Service defined to handle Item Report Configuration related method execution only.
 *
 *
 * @module js/configureItemReportService
 */
import appCtxService from 'js/appCtxService';
import dmSvc from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import repCommonSrvc from 'js/reportsCommonService';
import showRepSrvc from 'js/showReportService';
import uwPropSrv from 'js/uwPropertyService';
import messagingService from 'js/messagingService';
import AwPromiseService from 'js/awPromiseService';
import popUpSvc from 'js/popupService';
import localeService from 'js/localeService';

var exports = {};

var processRemoveClassSampleAction = function( data, reportParams ) {
    data.rootClassSample = [];
    data.dataProviders.rootClassSampleProvider.update( data.rootClassSample );
    if( reportParams.rootSampleObjectSelected ) {
        delete reportParams.rootSampleObjectSelected;
    }

    data.reportsContext.segmentTree = [];
    data.reportsContext.segments = [];
    if( reportParams.ReportDefProps && reportParams.ReportDefProps.ReportSegmentParams ) {
        delete reportParams.ReportDefProps.ReportSegmentParams;
    }

    if( reportParams.ReportDefProps && reportParams.ReportDefProps.ReportClassParameters ) {
        delete reportParams.ReportDefProps.ReportClassParameters;
    }

    if( reportParams.segments ) {
        delete reportParams.segments;
    }
    if( reportParams.ReportDefProps.ReportChart1 ) {
        delete reportParams.ReportDefProps.ReportChart1;
    }
    if( reportParams.ReportDefProps.ReportChart2 ) {
        delete reportParams.ReportDefProps.ReportChart2;
    }
    if( reportParams.ReportDefProps.ReportChart3 ) {
        delete reportParams.ReportDefProps.ReportChart3;
    }
    if( reportParams.ReportDefProps.ReportTable1 ) {
        delete reportParams.ReportDefProps.ReportTable1;
    }
    data.recreateSegementsPanel = true;
    appCtxService.updatePartialCtx( 'ReportsContext.reportParameters.bomInSegmentAdded', false );
    appCtxService.updatePartialCtx( 'ReportsContext.reportParameters', reportParams );
};

export let continueClassRemoveAction = function( ctx, repCtx ) {
    ctx = { ...ctx, reportsContext:repCtx };
    var reportParams = appCtxService.getCtx( 'ReportsContext.reportParameters' );

    let nwrepCtx = { ...repCtx.value };
    nwrepCtx.rootClassObject = [];
    nwrepCtx.rootClassSampleObject = [];
    nwrepCtx.segments = [];
    nwrepCtx.segmentTree = [];
    repCtx.update( nwrepCtx );

    processRemoveClassSampleAction( ctx, reportParams );
};

export let continueSampleObjectRemoveAction = function( ctx, repCtx ) {
    ctx = { ...ctx, reportsContext:repCtx };
    var reportParams = appCtxService.getCtx( 'ReportsContext.reportParameters' );

    let nwrepCtx = { ...repCtx.value };
    nwrepCtx.rootClassSampleObject = [];
    nwrepCtx.segments = [];
    nwrepCtx.segmentTree = [];
    repCtx.update( nwrepCtx );

    processRemoveClassSampleAction( ctx, reportParams );
};

/**
 * Get the last segment
 *
 * @param {Data} data - the data of the ViewModel
 * @returns {Segment} the last segment
 */
function getLastSegment( segments ) {
    if( segments && segments.length > 0 ) {
        return segments[ segments.length - 1 ];
    }
    return null;
}

/**
 * Setup's parameters for existing segments
 * @param {*} data   -
 */
function setSegmentParameters( segment, nwrepCtx ) {
    // var segmentParams = appCtxService.getCtx( 'ReportsContext.reportParameters.ReportDefProps.ReportSegmentParams' );
    var segmentParams = nwrepCtx.reportParameters.ReportDefProps?.ReportSegmentParams;
    var needToCreateMoreSegment = false;
    if( segmentParams && nwrepCtx.segments.length < segmentParams.length ) {
        var index = nwrepCtx.segments.length;
        setDbAndUiValue( segment.props.fnd0RelationOrReference, segmentParams[ index ].RelOrRef );
        segment.props.fnd0RelationOrReference.valueUpdated = true;

        setDbAndUiValue( segment.props.fnd0Direction, segmentParams[ index ].Direction );
        segment.props.fnd0Direction.valueUpdated = true;

        setDbAndUiValue( segment.props.fnd0DestinationType, segmentParams[ index ].Destination );
        segment.props.fnd0DestinationType.selectedLovEntries = [ {
            propDisplayDescription: segmentParams[ index ].TreeVal.split( '(' )[0]
        } ];
        segment.props.fnd0DestinationType.valueUpdated = true;
        if( segmentParams[ index ].RelRefType === 'BOM' ) {
            segment.props.bomExpansionCheckbox.dbValue = true;
        }

        segment.existing = true;

        if( nwrepCtx.segments.length + 1 !== segmentParams.length ) {
            needToCreateMoreSegment = true;
        }
    }
    return needToCreateMoreSegment;
}

/**
 * Process segment creation and add
 *
 * @param {*} data
 */
export let processAndAddNewSegment = function( data, repContext ) {
    let nwrepCtx = repContext.getValue();
    let segment = data.segment;

    var lastSeg = getLastSegment( nwrepCtx.segments );
    //var selectedRoot = appCtxService.getCtx( 'ReportsContext.reportParameters.rootSampleObjectSelected' );
    var rootType = nwrepCtx.rootClassSampleObject.length > 0  ? nwrepCtx.rootClassSampleObject[0].type : '';

    segment.props.fnd0SourceType.dbValue = lastSeg ? lastSeg.props.fnd0DestinationType.dbValue :
        rootType;
    var nwBomExpansionCheckbox = { ...data.bomExpansionCheckbox };
    if( nwBomExpansionCheckbox.dbValue === true && nwrepCtx.segments.length > 0 ) {
        nwBomExpansionCheckbox.dbValue = false;
    }
    segment.props.bomExpansionCheckbox = nwBomExpansionCheckbox;

    if ( lastSeg && lastSeg.props.bomExpansionCheckbox.dbValue ) {
        segment.props.fnd0SourceType.dbValue = lastSeg.props.fnd0SourceType.dbValue;
        segment.props.fnd0SourceType.valueUpdated = true;
    } else {
        segment.props.fnd0SourceType.dbValue = lastSeg ? lastSeg.props.fnd0DestinationType.dbValue :
            rootType;
    }

    if( segment.props.fnd0SourceType && ( segment.props.fnd0SourceType.valueUpdated === false ||
            segment.props.fnd0SourceType.valueUpdated === undefined ) ) {
        segment.props.fnd0SourceType.valueUpdated = true;
    }
    segment.index = nwrepCtx.segments.length + 1;
    segment.caption = data.i18n.segment.format( nwrepCtx.segments.length + 1 );
    segment.props.fnd0Direction.isEditable = true;
    segment.props.fnd0SourceType.isEditable = true;
    segment.props.fnd0RelationOrReference.isEditable = true;
    segment.props.fnd0DestinationType.isEditable = true;
    if( segment.props.fnd0Direction && ( segment.props.fnd0Direction.valueUpdated === false ||
            segment.props.fnd0Direction.valueUpdated === undefined ) ) {
        segment.props.fnd0Direction.valueUpdated = true;
    }

    //data.segment.props.fnd0Direction.dbValue = 'true';
    segment.props.fnd0Direction.dbValue = true;
    segment.props.fnd0Direction.propertyLabelDisplay = 'PROPERTY_LABEL_AT_RIGHT';
    segment.props.fnd0Direction.propertyRadioTrueText = data.i18n.forward;
    segment.props.fnd0Direction.propertyRadioFalseText = data.i18n.backward;

    if( segment.props.fnd0IncludedLO && ( segment.props.fnd0IncludedLO.valueUpdated === false ||
            segment.props.fnd0IncludedLO.valueUpdated === undefined ) ) {
        segment.props.fnd0IncludedLO.valueUpdated = true;
    }
    segment.props.fnd0IncludedLO.dbValue = 'true';

    //In case of Edit or re-openinging the panel
    //we need to set segment parameters.
    var needMoreSegment = setSegmentParameters( segment, nwrepCtx );
    nwrepCtx.segments.push( segment );
    repContext.update( nwrepCtx );

    //appCtxService.updatePartialCtx( 'ReportsContext.reportParameters.segments', data.segments );
    // data.totalFound = 0;

    exports.setCtxPayloadRevRule( '', repContext );

    needMoreSegment || data.segment.existing ? eventBus.publish( 'rb0segmentselector.addNewSegment' ) : '';
    //totalFound 0 will disable 'Add' button
    return { segments: nwrepCtx.segments, bomExpansionCheckbox: nwBomExpansionCheckbox, totalFound: 0 };
};

/**
 * Set a segment's property with dbValue and uiValue
 *
 * @param {Object} prop - the property
 * @param {String} value - the value
 */
function setDbAndUiValue( prop, value ) {
    prop.dbValue = value;
    prop.uiValue = value;
    // prop.checked = value;
    return { ...prop };
}

/**
 * Clear the current segment
 *
 * @param {Data} data - the data of the ViewModel
 */
export let clearRelationSegment = function( segment, repContext ) {
    let repCtx = { ...repContext.getValue() };
    let vmo = repCtx.segments[segment.index - 1];
    if( vmo && vmo.existing ) {
        vmo.existing = false;
    } else {
        vmo.props.fnd0RelationOrReference = setDbAndUiValue( vmo.props.fnd0RelationOrReference, '' );
        vmo.props.fnd0DestinationType = setDbAndUiValue( vmo.props.fnd0DestinationType, '' );
    }
    repCtx.segments[segment.index - 1] = vmo;
    repContext.update( repCtx );
};

/**
 * @param reportContext - This might be response in case if it will called as output function
 * @param reportContext2 - This needs only for caller of output function
 */
export let getTraversalPath = function( repContext, repContext2  ) {
    //TODO: Need rework on this
    if( repContext2 ) {
        repContext = repContext2;
    }
    var traversePath = { relationsPath: [] };
    // var ctxParams = appCtxService.getCtx( 'ReportsContext.reportParameters' );
    var ctxParams = repContext.reportParameters;
    // var ctxParams = { ...repContext.value }
    if( !ctxParams?.ReportDefProps?.ReportSegmentParams ) {
        ctxParams = repContext.value ? repContext.value : repContext;
    }
    if( repContext.segments ) {
        repContext.segments.value.forEach( segment => {
            var segPayload;
            if( segment.props.bomExpansionCheckbox && segment.props.bomExpansionCheckbox.dbValue ) {
                segPayload = constructBomSegPayload( segment, ctxParams, undefined, repContext );
            } else if( segment.props.fnd0RelationOrReference.dbValue?.length > 0 && segment.props.fnd0DestinationType.dbValue?.length > 0 ) {
                segPayload = constructNonBomSegPayload( segment, ctxParams );
            }
            segPayload && traversePath.relationsPath.push( segPayload );
        } );
    } else if( ctxParams.ReportDefProps && ctxParams.ReportDefProps.ReportSegmentParams ) {
        ctxParams.ReportDefProps.ReportSegmentParams.forEach( segmentParam => {
            var segPayload = {};
            if( segmentParam.RelRefType === 'BOM' ) {
                segPayload = constructBomSegPayload( undefined, undefined, segmentParam, repContext );
            } else {
                segPayload = constructNonBomSegPayload( undefined, undefined, segmentParam );
            }
            traversePath.relationsPath.push( segPayload );
        } );
    }

    if( repContext.hasOwnProperty( 'getValue' ) ) {
        var nwReportsState = repContext.getValue();
        if( !nwReportsState.reportParameters.ReportDefProps ) {
            nwReportsState.reportParameters = { ...nwReportsState.reportParameters, ReportDefProps: { ReportSearchInfo: {} } };
        } else if( !nwReportsState.reportParameters.ReportDefProps.ReportSearchInfo ) {
            nwReportsState.reportParameters.ReportDefProps = { ...nwReportsState.reportParameters.ReportDefProps, ReportSearchInfo: {} };
        }
        nwReportsState.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria = JSON.stringify( traversePath );
        repContext.update( nwReportsState );
    }
    return JSON.stringify( traversePath );
};

export let callGetCategoriesForReports = function( response ) {
    return showRepSrvc.callRepGetCategories( response );
};

/**
 * Prepare and send segment tree.
 * TODO: Refactor to handle Segment tree creation from Context. Remove duplicate loop.
 *
 * @param {*} data -
 */
export let updateSegmentTree = function( nwReportsState ) {
    var localTextBundle = localeService.getLoadedText( 'ReportChartMessages' );
    var rootType;
    if( nwReportsState ) {
        rootType = nwReportsState.rootClassSampleObject.length > 0 ? nwReportsState.rootClassSampleObject[0].modelType.displayName : '';
    } else {
        rootType = nwReportsState.reportParameters.rootObjectSelected.props.object_string.dbValues[0];
    }
    var tree = {
        label: rootType + ' (' + localTextBundle.parentSource + ')',
        value: rootType + ' (' + localTextBundle.parentSource + ')',
        expanded: true,
        children: []
    };

    var nextNode = null;
    var segments = null;
    if( nwReportsState ) {
        segments = nwReportsState.segments && nwReportsState.segments.length > 0 ? nwReportsState.segments : '';
    }

    if( nwReportsState.reportParameters.ReportDefProps && nwReportsState.reportParameters.ReportDefProps.ReportSegmentParams ) {
        _.forEach( nwReportsState.reportParameters.ReportDefProps.ReportSegmentParams, function( segment ) {
            var node = {};
            node.label = segment.TreeVal;
            node.value = segment.TreeVal;
            node.expanded = true;
            node.children = [];
            if( nextNode === null ) {
                tree.children.push( node );
                nextNode = {
                    children: node.children
                };
            } else {
                nextNode.children.push( node );
                nextNode = node;
            }
        } );
    } else if( segments && segments.length > 0 ) {
        _.forEach( segments, function( segment ) {
            var node = {};
            node.expanded = true;
            node.children = [];
            if( !segment.props.bomExpansionCheckbox || segment.props.bomExpansionCheckbox && !segment.props.bomExpansionCheckbox.dbValue ) {
                var objType = segment.props.fnd0DestinationType.selectedLovEntries[ 0 ].propDisplayDescription;
                var relRefValue = segment.props.fnd0RelationOrReference.dbValue;
                node.label = objType + ' (' + relRefValue + ')';
            }
            if( segment.props.bomExpansionCheckbox && segment.props.bomExpansionCheckbox.dbValue ) {
                node.label = localTextBundle.structure;
            }
            node.value = node.label;
            if( nextNode === null ) {
                tree.children.push( node );
                nextNode = {
                    children: node.children
                };
            } else {
                nextNode.children.push( node );
                nextNode = node;
            }
        } );
    }
    if( nwReportsState ) {
        nwReportsState.segmentTree = [ tree ];
    }
    return [ tree ];
};

/**
 * Updates Tree Class, Sample and Tree when Saved Report is opened
 * for editing.
 * @param {*} data
 * @param {*} classTypeObject
 * @param {*} classSampleObject
 */
function setItemReportClassAndSampleACtion( data, subPanelCtx, classTypeObject, classSampleObject, i18nData ) {
    data.rootClass = [];
    var repContext = { ...subPanelCtx.reportsContext.getValue() };
    data.rootClass.push( classTypeObject );
    if( repContext.rootClassObject.length === 0 && data.dataProviders.rootClassProvider ) {
        data.dataProviders.rootClassProvider.update( data.rootClass );
        data.dataProviders.rootClassProvider.selectNone();
    } else if( repContext.rootClassObject.length > 0 && data.dataProviders.rootClassProvider ) {
        data.dataProviders.rootClassProvider.update( repContext.rootClassObject );
        data.dataProviders.rootClassProvider.selectNone();
    }

    var panelId;
    var panelTitle;
    if( classSampleObject !== null ) {
        data.rootClassSample = [];
        data.rootClassSample.push( classSampleObject );
        if( repContext.rootClassSampleObject.length === 0 && data.dataProviders.rootClassSampleProvider ) {
            data.dataProviders.rootClassSampleProvider.update( data.rootClassSample );
            data.dataProviders.rootClassSampleProvider.selectNone();
        } else if( repContext.rootClassSampleObject.length > 0 && data.dataProviders.rootClassSampleProvider ) {
            data.dataProviders.rootClassSampleProvider.update( repContext.rootClassSampleObject );
            data.dataProviders.rootClassSampleProvider.selectNone();
        }
        panelId = 'SetLayoutTabPage';
        panelTitle = data.i18n.layout;
    } else if( classSampleObject === null ) {
        panelId = 'Rb0RootSampleSelectorSub';
        panelTitle = data.i18n.selectSample;
    }

    if( !repContext.rootClassObject.length ) {
        repContext.rootClassObject.push( classTypeObject );
    }
    if( !repContext.rootClassSampleObject.length ) {
        repContext.rootClassSampleObject.push( classSampleObject );
    }
    repContext.segmentTree = updateSegmentTree( data, i18nData );
    subPanelCtx.reportsContext.update( repContext );
    callActiveViewChanges( subPanelCtx );
}

/**
 * Updates activeView
 * for editing.
 * @param {*} ctx
 * @param {*} subPnlCtx
 */
function callActiveViewChanges( subPnlCtx ) {
    var ctx = appCtxService.getCtx( '' );
    var editAndNotPreviewed = ctx.state.params.referenceId === 'edit' && ctx.ReportsContext.showPreview === false;
    var newAddAndPreviewed = ctx.state.params.referenceId === 'new' && ctx.ReportsContext.showPreview === true;
    if( !ctx.setLayoutTabPageReached && ( editAndNotPreviewed || newAddAndPreviewed ) && subPnlCtx.reportsContext.rootClassSampleObject[0] !== null ) {
        var nwrepCtx = subPnlCtx.reportsContext.getValue();
        if( subPnlCtx.reportsContext.segments.length === 0 ) {
            nwrepCtx.activeView = 'Rb0SegmentsSelectorSub';
        } else if( subPnlCtx.reportsContext.segments.length > 0 ) {
            nwrepCtx.activeView = 'SetLayoutTabPage';
            appCtxService.updatePartialCtx( 'setLayoutTabPageReached', true );
        }
        subPnlCtx.reportsContext.update( nwrepCtx );
    }
}

/**
 *
 * Setups the Configure Template panel.
 * @param {*} data-
 * @param {*} ctx-
 */
export let setupConfigureItemRepPanel = function( data, ctx, subPnlCtx, i18nData ) {
    var repParams = ctx.ReportsContext.reportParameters;
    if( repParams && repParams.rootObjectSelected && repParams.rootSampleObjectSelected ) {
        setItemReportClassAndSampleACtion( data, subPnlCtx, repParams.rootObjectSelected, repParams.rootSampleObjectSelected, i18nData );
    } else if( repParams && repParams.ReportDefProps && repParams.ReportDefProps.ReportClassParameters.rootClassUid && repParams.ReportDefProps.ReportClassParameters.rootSampleUid ) {
        dmSvc.loadObjects( [ repParams.ReportDefProps.ReportClassParameters.rootClassUid, repParams.ReportDefProps.ReportClassParameters.rootSampleUid ] ).then( function() {
            repParams.rootObjectSelected = cdm.getObject( repParams.ReportDefProps.ReportClassParameters.rootClassUid );
            repParams.rootSampleObjectSelected = cdm.getObject( repParams.ReportDefProps.ReportClassParameters.rootSampleUid );
            setItemReportClassAndSampleACtion( data, subPnlCtx, repParams.rootObjectSelected, repParams.rootSampleObjectSelected, i18nData );
            appCtxService.updatePartialCtx( 'ReportsContext.reportParameters', repParams );
        },
        function( ) {
            repParams.rootObjectSelected = cdm.getObject( repParams.ReportDefProps.ReportClassParameters.rootClassUid );
            repParams.rootSampleObjectSelected = cdm.getObject( repParams.ReportDefProps.ReportClassParameters.rootSampleUid );
            setItemReportClassAndSampleACtion( data, subPnlCtx, repParams.rootObjectSelected, repParams.rootSampleObjectSelected, i18nData );
            appCtxService.updatePartialCtx( 'ReportsContext.reportParameters', repParams );
            if( repParams.rootSampleObjectSelected === null ) {
                messagingService.reportNotyMessage( data, data._internal.messages, 'showSampleObjectMissingMessage' );
            }
        } );
    }
};

/**
 *
 * @param {*} data
 */
export let buildSegmentTreeAndNavigate = function( i18nData, nwReportsState ) {
    // if( !data.segments ) {
    //     data.segments = nwReportsState.segments;
    // }
    if( !nwReportsState.reportParameters.ReportDefProps.ReportSegmentParams ) {
        nwReportsState.reportParameters.ReportDefProps.ReportSegmentParams = [];
    }
    if( nwReportsState.reportParameters.ReportDefProps.ReportSegmentParams?.length < nwReportsState.segments.length ) {
        for( var i = nwReportsState.reportParameters.ReportDefProps.ReportSegmentParams.length; i < nwReportsState.segments.length; i++ ) {
            var segment = nwReportsState.segments[ i ];
            var label = null;
            if( segment.props.bomExpansionCheckbox && segment.props.bomExpansionCheckbox.dbValue ) {
                label = i18nData.structure;
            } else if( segment.props.fnd0RelationOrReference.dbValue?.length > 0 && segment.props.fnd0DestinationType.dbValue?.length > 0 ) {
                var objType = segment.props.fnd0DestinationType.selectedLovEntries[ 0 ].propDisplayDescription;
                var relRefValue = segment.props.fnd0RelationOrReference.dbValue;
                label = objType + '(' + relRefValue + ')';
            }
            if( label !== null ) {
                nwReportsState.reportParameters.ReportDefProps.ReportSegmentParams.push( {
                    TreeVal: label,
                    Direction: segment.props.fnd0Direction.dbValue,
                    Destination: segment.props.fnd0DestinationType.dbValue,
                    RelOrRef: segment.props.fnd0RelationOrReference.dbValue,
                    Source: segment.props.fnd0SourceType.dbValue,
                    RelRefType: repCommonSrvc.getRelationTraversalType( segment )
                } );
            }
        }
    }
    return updateSegmentTree( nwReportsState );
};

export let initiateVerifyTraversal = function( repContext ) {
    let segments = repContext.segments.getValue();
    var shouldInitTraversal = false;
    // Can check last segment directly
    _.forEach( segments, function( segment ) {
        if( segment.props.fnd0RelationOrReference.dbValue?.length > 0 && segment.props.fnd0DestinationType.dbValue?.length > 0  || segment.props.bomExpansionCheckbox.dbValue ) {
            shouldInitTraversal = true;
        } else if( shouldInitTraversal ) {
            shouldInitTraversal = false;
        }
    } );

    if( shouldInitTraversal ) {
        eventBus.publish( 'rb0SegmentSelector.verifyTraversal' );
    }
    return 0;
};

let findInTree = ( tree, nodeValue, index ) =>{
    let flag = tree.value === nodeValue;
    if( flag ) {
        return index;
    } else if( tree.children ) {
        index++;
        // FUTURE: This is for multiple childs, for tracing child number will need one more parameter like index
        for( let i = 0; i < tree.children.length; i++ ) {
            return findInTree( tree.children[ i ], nodeValue, index );
        }
    }
    return null;
};

export let removeTraverseSegment = function( reportsState, i18nData ) {
    var nwReportsState = reportsState.getValue();
    var selectedNodeValue = nwReportsState.selectedNode.value;
    let removeIndex = -1;
    removeIndex = findInTree( reportsState.segmentTree[0], selectedNodeValue, removeIndex );
    if( removeIndex >= 0 ) {
        nwReportsState.segments = nwReportsState.segments.slice( 0, removeIndex );
        nwReportsState.reportParameters.ReportDefProps.ReportSegmentParams = nwReportsState.reportParameters.ReportDefProps.ReportSegmentParams.slice( 0, removeIndex );
        updateSegmentTree( nwReportsState );
        delete nwReportsState.showWarnMsg;
        delete nwReportsState.selectedNode;
        delete nwReportsState.reportParameters.ReportDefProps.ReportSearchInfo;
        delete nwReportsState.reportParameters.ReportDefProps.ReportTable1;
        nwReportsState.reportParameters.ReportDefProps.allChartsList = [ {
            ChartTitle: '',
            ChartType: 'column',
            ChartPropName: '',
            ChartPropInternalName: '',
            ChartTypeName: i18nData.barChart,
            visible: true
        } ];
        nwReportsState.searchInfo = {};
        nwReportsState.searchIncontextInfo = {};
        if( nwReportsState.segments.length === 0 ) {
            nwReportsState.relationsPath = undefined;
        } else {
            nwReportsState.relationsPath = getTraversalPath( reportsState );
            nwReportsState.tableRefresh = true;
        }
        reportsState.update( nwReportsState );
        nwReportsState.segments.length === 0 ? eventBus.publish( 'rb0SegmentSelector.processSegment' ) : eventBus.publish( 'rb0SegmentSelector.verifyTraversal' );
    }
};

export let updateConfigItemProps = function( data, ctx ) {
    if( ctx.ReportsContext.reportParameters && ctx.ReportsContext.reportParameters.ReportDefProps ) {
        if( ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart1 &&
            ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart1.ChartPropName !== data.chart1LabelTxt.dbValue ) {
            uwPropSrv.updateDisplayValues( data.chart1LabelTxt, [ ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart1.ChartPropName ] );
            uwPropSrv.setValue( data.chart1LabelTxt, [ ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart1.ChartPropName ] );
        }
        if( ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart2 &&
            ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart2.ChartPropName !== data.chart2LabelTxt.dbValue  ) {
            uwPropSrv.updateDisplayValues( data.chart2LabelTxt, [ ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart2.ChartPropName ] );
            uwPropSrv.setValue( data.chart2LabelTxt, [ ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart2.ChartPropName ] );
        }
        if( ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart3 &&
            ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart3.ChartPropName !== data.chart3LabelTxt.dbValue  ) {
            uwPropSrv.updateDisplayValues( data.chart3LabelTxt, [ ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart3.ChartPropName ] );
            uwPropSrv.setValue( data.chart3LabelTxt, [ ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart3.ChartPropName ] );
        }
    }
};

export let getselectedClassObject = function( reportsContext ) {
    let rootClass = [];
    if( reportsContext && reportsContext.rootClassObject.length > 0 ) {
        rootClass.push( reportsContext.value.rootClassObject[ 0 ] );
    }
    return { results: rootClass, totalFound: rootClass.length };
};

export let getselectedSampleObject = function( reportsContext, i18nData ) {
    let classSample = [];
    let segmentTree = [];
    if( reportsContext && reportsContext.rootClassSampleObject.length > 0 ) {
        classSample.push( reportsContext.value.rootClassSampleObject[ 0 ] );
        // Need to improve
        let data = { i18n:i18nData, subPanelContext:{ reportsContext:reportsContext } };
        segmentTree = updateSegmentTree( data, i18nData );
    }
    return { results: classSample, totalFound: classSample.length, tree: segmentTree };
};

export let setConfigurePanel = function( reportsContext, destPanel ) {
    let nwrepCtx = { ...reportsContext };
    nwrepCtx.activeView = destPanel;
    return nwrepCtx;
};

export let  processOutput = function( response, datactxNode, reportsState ) {
    var nwReportsState = reportsState.getValue();
    // if( !nwReportsState.searchIncontextInfo ) {
    //     nwReportsState.searchIncontextInfo = {};
    // }
    // nwReportsState.searchIncontextInfo.searchFilterCategories = callGetCategoriesForReports( response );
    // nwReportsState.searchIncontextInfo.searchFilterMap = response.searchFilterMap6;
    // nwReportsState.searchIncontextInfo.objectsGroupedByProperty = response.objectsGroupedByProperty;
    if( response.totalFound > 0 ) {
        reportsState.segments.length > 1 || reportsState.selectedReport ? nwReportsState.tableRefresh = true : '';
        nwReportsState.segmentTree = buildSegmentTreeAndNavigate( datactxNode.i18n, nwReportsState );
        nwReportsState.selectedNode ? delete nwReportsState.selectedNode : '';
        nwReportsState.relationsPath = getTraversalPath( reportsState );
        nwReportsState.segmentTree !== reportsState.segmentTree ? nwReportsState.reportParameters.ReportDefProps = { ...nwReportsState.reportParameters.ReportDefProps, ReportTable1:undefined } : '';
        nwReportsState.showWarnMsg = false;
    } else {
        //noty message report data not found.
        nwReportsState.showWarnMsg = true;
    }
    reportsState.update( nwReportsState );
};

export let updateSelectedLovEntries = function( eventData, repContext ) {
    let repCtx = { ...repContext.getValue() };
    var selectedObjects = eventData.selectedObjects;
    var vmo = eventData.vmo;
    var viewModelProp = eventData.viewModelProp;
    let updateProp = viewModelProp.propertyName;
    let updateSeg = repCtx.segments[vmo.index - 1].props[updateProp];
    updateSeg.selectedLovEntries = selectedObjects;
    repCtx.segments[vmo.index - 1].props[updateProp] = updateSeg;
    repContext.update( repCtx );
};

export let populateSegmentDataWithBomInfo = function( reportsState, checked ) {
    if( checked ) {
        eventBus.publish( 'rb0SegmentSelector.verifyTraversal' );
    } else if( reportsState.segmentTree.length > 0 ) {
        // remove structure from segment tree i.e. currently we only support 1st segment for expansion. So, removing that from segment tree
        let nwReportsState = reportsState.getValue();
        nwReportsState.relationsPath = undefined;
        nwReportsState.segmentTree[0].children = [];
        delete nwReportsState.showWarnMsg;
        delete nwReportsState.selectedNode;
        delete nwReportsState.reportParameters.ReportDefProps.ReportSearchInfo;
        reportsState.update( nwReportsState );
    }
};

let constructBomSegPayload = ( segment, ctxParams, dashboardSegmentParams, repContext ) => {
    if( !dashboardSegmentParams ) {
        return {
            searchMethod: repCommonSrvc.getRelationTraversalType( segment, ctxParams ),
            objectType: segment.props.fnd0SourceType.dbValue,
            revisionRule: exports.getCtxPayloadRevRule( repContext )
        };
    }
    return {
        searchMethod: dashboardSegmentParams.RelRefType,
        objectType: dashboardSegmentParams.Source,
        revisionRule: exports.getCtxPayloadRevRule( repContext )
    };
};

let constructNonBomSegPayload = ( segment, ctxParams, dashboardSegmentParams ) => {
    if( !dashboardSegmentParams ) {
        return {
            searchMethod: repCommonSrvc.getRelationTraversalType( segment, ctxParams ),
            relationName: segment.props.fnd0RelationOrReference.dbValue,
            objectType: segment.props.fnd0DestinationType.dbValue
        };
    }
    return {
        objectType: dashboardSegmentParams.Destination,
        relationName: dashboardSegmentParams.RelOrRef,
        searchMethod: dashboardSegmentParams.RelRefType
    };
};

export let showEditReportCriteria = ( popupData, commandData, reportsState ) => {
    var deferred = AwPromiseService.instance.defer();
    popupData.subPanelContext = {};
    popupData.subPanelContext.revRuleLovList = commandData.revRuleLovList;
    popupData.subPanelContext.reportsState = reportsState;
    var reportSearchCriteriaStr = reportsState.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria;
    var reportSearchCriteria = JSON.parse( reportSearchCriteriaStr );
    if( reportSearchCriteria.relationsPath && reportSearchCriteria.relationsPath.length > 0 && reportSearchCriteria.relationsPath[0].searchMethod === 'BOM' ) {
        var appliedRevRule = reportSearchCriteria.relationsPath[0].revisionRule === '' ? appCtxService.getCtx( 'userSession' ).props.awp0RevRule.displayValues[0] : reportSearchCriteria.relationsPath[0].revisionRule;
        popupData.subPanelContext.appliedRevRuleObj = _.find( commandData.revRuleLovList, ( revRuleObj ) => {
            return revRuleObj.propDisplayValue === appliedRevRule;
        } );
    }
    popUpSvc.show( popupData ).then( ( id ) => {
        let nwReportsState = reportsState.getValue();
        nwReportsState.criteriaPopupId = id;
        reportsState.update( nwReportsState );
        deferred.resolve( {} );
    } );
    return deferred.promise;
};

export let saveEditReportCriteria = ( revRuleProp, reportsState )  => {
    var newRevRule = revRuleProp.displayValues[0];
    exports.setCtxPayloadRevRule( newRevRule, reportsState );
};

export let getRevRuleLovListFromLovValues = ( responseData ) => {
    var revRuleLovList = [];
    if( responseData && responseData.lovValues && responseData.lovValues.length > 0 ) {
        responseData.lovValues.map( ( revRuleObj ) => {
            if( revRuleObj.propDisplayValues && revRuleObj.propDisplayValues.object_name ) {
                var revRuleVMObj = {
                    propDisplayValue: revRuleObj.propDisplayValues.object_name[ 0 ],
                    propInternalValue: revRuleObj.uid,
                    dispValue: revRuleObj.propDisplayValues.object_name[ 0 ]
                };
                revRuleLovList.push( revRuleVMObj );
            }
        } );
    }
    return revRuleLovList;
};

export let updateRevisionRuleLabel = ( appliedRevRule, i18n, reportsState ) => {
    var newAppliedRevRule = _.clone( appliedRevRule );
    var searchCriteriaStr  = reportsState.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria;
    if( searchCriteriaStr && searchCriteriaStr.includes( 'searchMethod\":\"BOM' ) ) {
        var searchCriteriaJSON = JSON.parse( searchCriteriaStr );
        var relationsPath = _.find( searchCriteriaJSON.relationsPath, ( relationsPath ) => {
            return relationsPath.searchMethod === 'BOM';
        } );
        var revRule = relationsPath.revisionRule ? relationsPath.revisionRule : appCtxService.getCtx( 'userSession' ).props.awp0RevRule.displayValues[0];
        // if applied rev-rule will be different than current rev-rule, refresh table
        if( appCtxService.getCtx( 'userSession' ).props.awp0RevRule.displayValues[0] !== revRule ) {
            let nwReportsState = reportsState.getValue();
            nwReportsState.tableRefresh = true;
            reportsState.update( nwReportsState );
        }
        newAppliedRevRule.uiValue = i18n.appliedRevRule + ': ' + revRule;
        newAppliedRevRule.dbValue = i18n.appliedRevRule + ': ' + revRule;
    }
    return newAppliedRevRule;
};

export let setCtxPayloadRevRule = ( newRevRule, reportsState ) => {
    var nwReportsState = reportsState.getValue();
    if ( nwReportsState.reportParameters.ReportDefProps?.ReportSearchInfo ) {
        let existingSearchCriteiraString = nwReportsState.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria;
        let existingSearchCriteriaJSON = {};
        try {
            existingSearchCriteriaJSON = JSON.parse( existingSearchCriteiraString );
        } catch( e ) {
            //Incorrect data, don't set revRule
            return;
        }
        let bomSegIndex =  _.findIndex( existingSearchCriteriaJSON.relationsPath, ( relationsPath ) => {
            return relationsPath.searchMethod === 'BOM';
        } );
        if( bomSegIndex >= 0 && appCtxService.ctx.sublocation.historyNameToken !== 'createReportTemplate' ) {
            existingSearchCriteriaJSON.relationsPath[bomSegIndex].revisionRule = newRevRule;
        } else {
            existingSearchCriteriaJSON.relationsPath[bomSegIndex].revisionRule = '';
        }
        nwReportsState.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria = JSON.stringify( existingSearchCriteriaJSON );
    }
    reportsState.update( nwReportsState );
};

export let getCtxPayloadRevRule = ( reportsCtx ) => {
    if ( reportsCtx && reportsCtx.reportParameters && reportsCtx.reportParameters.ReportDefProps && reportsCtx.reportParameters.ReportDefProps.ReportSearchInfo ) {
        let existingSearchCriteiraString = reportsCtx.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria;
        let existingSearchCriteriaJSON = {};
        try {
            existingSearchCriteriaJSON  = JSON.parse( existingSearchCriteiraString );
        } catch( e ) {
            //incorrect data, return default value
            return '';
        }
        let bomSegIndex =  _.findIndex( existingSearchCriteriaJSON.relationsPath, ( relationsPath ) => {
            return relationsPath.searchMethod === 'BOM';
        } );
        if( bomSegIndex >= 0 && appCtxService.ctx.sublocation.historyNameToken !== 'createReportTemplate' ) {
            return existingSearchCriteriaJSON.relationsPath[bomSegIndex].revisionRule;
        }
        return '';
    }
    return appCtxService.ctx.sublocation.historyNameToken !== 'createReportTemplate' ? appCtxService.getCtx( 'userSession' ).props.awp0RevRule.displayValues[0] : '';
};

export let setSaveActionCompleteInContext = () => {
    appCtxService.updatePartialCtx( 'ReportsContext.saveReportConfigActionComplete', true );
};

export let updateDataProviderOnError = ( data, i18n ) => {
    data.noResults = true;
    data.noResultsFound = i18n;
};

export let ValidateSegments = ( reportsState, totalFound )=>{
    var nwReportsState = reportsState.getValue();
    if( totalFound === 0 ) {
        nwReportsState.segments.pop();
    }
    var validSegments = [];
    _.forEach( nwReportsState.segments, ( segment )=>{
        segment.props.fnd0RelationOrReference.dbValues[0] && segment.props.fnd0DestinationType.dbValues[0] || segment.props.bomExpansionCheckbox.dbValue ? validSegments.push( segment ) : '';
    } );
    nwReportsState.segments = validSegments;
    nwReportsState.reportParameters.ReportDefProps.ReportSegmentParams = nwReportsState.reportParameters.ReportDefProps.ReportSegmentParams.slice( 0, validSegments.length );
    delete nwReportsState.showWarnMsg;
    delete nwReportsState.selectedNode;
    reportsState.update( nwReportsState );
};

export let callUpdateSegmentTree = ( reportsState ) => {
    let nwReportsState = reportsState.getValue();
    updateSegmentTree( nwReportsState );
    reportsState.update( nwReportsState );
};

/**
 * Service variable initialization
/**
 * @param {any} appCtxService - the
 * @param  {any} listBoxService - the
 *
 * @returns {any} exports - the Exports.
 */
export default exports = {
    continueClassRemoveAction,
    continueSampleObjectRemoveAction,
    processAndAddNewSegment,
    clearRelationSegment,
    getTraversalPath,
    callGetCategoriesForReports,
    updateSegmentTree,
    setupConfigureItemRepPanel,
    buildSegmentTreeAndNavigate,
    initiateVerifyTraversal,
    removeTraverseSegment,
    updateConfigItemProps,
    getselectedClassObject,
    getselectedSampleObject,
    setConfigurePanel,
    processOutput,
    updateSelectedLovEntries,
    populateSegmentDataWithBomInfo,
    showEditReportCriteria,
    saveEditReportCriteria,
    getRevRuleLovListFromLovValues,
    getCtxPayloadRevRule,
    updateRevisionRuleLabel,
    setCtxPayloadRevRule,
    setSaveActionCompleteInContext,
    updateDataProviderOnError,
    ValidateSegments,
    callUpdateSegmentTree
};
