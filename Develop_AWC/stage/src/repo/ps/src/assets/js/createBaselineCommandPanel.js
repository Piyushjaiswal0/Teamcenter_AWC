// Copyright (c) 2023 Siemens

/**
 * @module js/createBaselineCommandPanel
 */
import _ from 'lodash';
import cmm from 'soa/kernel/clientMetaModel';
import appCtxSvc from 'js/appCtxService';
import AwStateService from 'js/awStateService';

let exports = {};

export let getBaselineTemplateList = function( templateList ) {
    let listModels = [];

    _.forEach( templateList, function( template ) {
        let listModel = {
            propDisplayValue: '',
            propDisplayDescription: '',
            dispValue: '',
            propInternalValue: ''
        };

        if( cmm.containsType( template ) ) {
            let type = cmm.getType( template );

            listModel.propDisplayValue = type.displayName;
            listModel.propInternalValue = type.name;
            listModel.dispValue = type.displayName;
        } else {
            listModel.propDisplayValue = template;
            listModel.propInternalValue = template;
            listModel.dispValue = template;
        }

        listModels.push( listModel );
    } );

    return listModels;
};

export let updateHeaderDataForBaselinePanel = function( occContext ) {
    return appCtxSvc.ctx.sublocation.clientScopeURI === 'Awb0OccurrenceManagement' ? occContext.rootElement.props.object_string.uiValues[ 0 ] : appCtxSvc.ctx.selected.props.object_string.uiValues[ 0 ];
};

export let updatePreciseBaselineFields = function( preciseBaseline ) {
    let copyPreciseBaseline = { ...preciseBaseline };
    let isPrecise = Number( appCtxSvc.ctx.preferences.Baseline_precise_bvr[ 0 ] ) === 2;
    copyPreciseBaseline.dbValue = isPrecise;
    copyPreciseBaseline.isEditable = !isPrecise;
    return copyPreciseBaseline;
};

export let updateRunInBackgroundField = function( runInBackground ) {
    let copyRunInBackground = { ...runInBackground };
    let prefVal = appCtxSvc.ctx.preferences.Create_baseline_in_sync_mode[ 0 ];
    copyRunInBackground.dbValue = ( prefVal.toLowerCase() === 'false' );
    return copyRunInBackground;
};

export let openRevisionBaselineItem = function( data ) {
    if( data.eventObj.props.eventtype_id && data.object && data.object.uid ) {
        var eventTypeId = data.eventObj.props.eventtype_id.dbValues[ 0 ];
        if( eventTypeId === 'Awp0Create_Baseline_Complete' ) {
            openBaselineObject( data.object );
        } else {
            redirectToShowObject( data.object.uid );
        }
    }
};

var openBaselineObject = function( notificationObj ) {
    var isError = false;
    if( notificationObj.props.fnd0Subject &&
        notificationObj.props.fnd0Subject.dbValues.length > 0 ) {
        var subject = notificationObj.props.fnd0Subject.dbValues[ 0 ];
        isError = _.startsWith( subject, 'Baseline creation failed' );
    }

    var objectUid = notificationObj.uid;
    if( !isError ) {
        if( notificationObj.props.fnd0RelatedObjects &&
            notificationObj.props.fnd0RelatedObjects.dbValues.length > 0 ) {
            objectUid = notificationObj.props.fnd0RelatedObjects.dbValues[ 0 ];
        }
    }
    redirectToShowObject( objectUid );
};

var redirectToShowObject = function( uid ) {
    if( uid ) {
        var showObject = 'com_siemens_splm_clientfx_tcui_xrt_showObject';
        var toParams = {};
        toParams.uid = uid;
        toParams.page = 'Overview';

        var options = {};
        options.inherit = false;
        options.reload = true;

        AwStateService.instance.go( showObject, toParams, options );
    }
};

export default exports = {
    getBaselineTemplateList,
    updateHeaderDataForBaselinePanel,
    updatePreciseBaselineFields,
    updateRunInBackgroundField,
    openRevisionBaselineItem
};
