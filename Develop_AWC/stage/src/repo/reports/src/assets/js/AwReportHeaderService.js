import AwCommandBar from 'viewmodel/AwCommandBarViewModel';
import AwLink from 'viewmodel/AwLinkViewModel';
import reportsCommSrvc from 'js/reportsCommonService';
import { VisibleWhen, ExistWhen } from 'js/hocCollection';

const DivExistWhen = ExistWhen( 'div' );
const AwLinkExistWhen = ExistWhen( AwLink );

export const awReportHeaderServiceRenderFunction = ( props ) => {
    let { viewModel, actions, ...prop } = props;
    let { data, conditions } = viewModel;
    return (
        <div className='sw-row h-12'>
            <div className='sw-column w-4'>
                <DivExistWhen className='aw-reports-totalFoundLabel' existWhen={data.dataIsReady}>{data.totalFoundString.uiValue}</DivExistWhen>
                <DivExistWhen className='aw-reports-requestTimeLabel' existWhen={data.dataIsReady}>{data.timeOfRequest.uiValue}</DivExistWhen>
                <DivExistWhen className='aw-reports-requestTimeLabel' existWhen={conditions.showRevRule}>{data.appliedRevRule.uiValue}</DivExistWhen>
                <AwLinkExistWhen className='aw-reports-reportSourceName' {...data.reportSource} fielddata={data.reportSource} action={actions.goToSource} existWhen={conditions.showSourceLink}></AwLinkExistWhen>
            </div>
            <div className='sw-column w-4'>
                <DivExistWhen className='aw-reports-titleLabel' id='titleReport' existWhen={data.dataIsReady}>{data.title.uiValue}</DivExistWhen>
            </div>
            <DivExistWhen className='sw-column w-4 aw-reports-viewerCommands' existWhen={conditions.isEditPage}>
                <AwCommandBar anchor='reportViewerCommands' alignment='HORIZONTAL' context={props.reportsState}></AwCommandBar>
            </DivExistWhen>
        </div>
    );
};


/**
  * updateTimeOfRequest
  *
  * @function updateTimeOfRequest
  */
let updateTimeOfRequest = function( data ) {
    return data.i18n.dashboardLastRefresh + reportsCommSrvc.getReportUpdateTime( data );
};

export let prepareReportHeader = ( data, reportParameters, repTitle, repTotalObj, repTime )=> {
    let nwrepTitle = { ... repTitle };
    let nwrepTotalObj = { ...repTotalObj };
    let nwrepTime = { ...repTime };

    var requTime = updateTimeOfRequest( data );
    nwrepTime.dbValue = requTime;
    nwrepTime.uiValue = requTime;

    var totFnd = reportParameters.totalFound;
    nwrepTotalObj.dbValue  = data.i18n.totalObjsFound + totFnd;
    nwrepTotalObj.uiValue  = data.i18n.totalObjsFound + totFnd;
    if( reportParameters.ReportDefProps.ReportTitle !== undefined ) {
        nwrepTitle.dbValue = reportParameters.ReportDefProps.ReportTitle.TitleText;
        nwrepTitle.uiValue = reportParameters.ReportDefProps.ReportTitle.TitleText;
    }
    return {
        repTitle: nwrepTitle,
        repTotalObj: nwrepTotalObj,
        repTime: nwrepTime
    };
};
const AwReportHeaderService = {
    awReportHeaderServiceRenderFunction,
    prepareReportHeader
};
export default AwReportHeaderService;
