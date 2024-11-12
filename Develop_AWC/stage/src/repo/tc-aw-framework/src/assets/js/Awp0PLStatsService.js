// Copyright (c) 2022 Siemens

/**
 * @module js/Awp0PLStatsService
*/
import splmStatsService from 'js/splmStatsService';
import appCtxService from 'js/appCtxService';
import eventBus from 'js/eventBus';
import uwPropertyService from 'js/uwPropertyService';
import AwHTTPService from 'js/awHttpService';
import browserUtils from 'js/browserUtils';
var exports = {};
var performance = null;

export let enablePLStats = function( ) {
    if ( performance === null ) {
        performance = splmStatsService.initProfiler( true );
    } else {
        performance.enable();
    }
    appCtxService.updateCtx( 'plStatsEnabled', true );
    splmStatsService.enablePLStats();
    eventBus.publish( 'plStats.reset' );
    let elementList = document.getElementById( 'globalNavigationSideNav' ).getElementsByClassName( 'unpinned' );
    if( elementList.length !== 0 ) {
        eventBus.publish( 'awsidenav.pinUnpin' );
    }
};

export let disablePLStats = function() {
    performance.disable();
    splmStatsService.disablePLStats();
    appCtxService.updateCtx( 'plStatsEnabled', false );
};


export let startSpeedTest = function( latencydisplayValue, uploadDisplayValue, downloadDisplayValue, processingGauge ) {
    let latency = uwPropertyService.createViewModelProperty( 'latency', latencydisplayValue, 'STRING', processingGauge, [ processingGauge ] );
    let upTime = uwPropertyService.createViewModelProperty( 'upload', uploadDisplayValue, 'STRING', processingGauge, [ processingGauge ] );
    let downTime = uwPropertyService.createViewModelProperty( 'download', downloadDisplayValue, 'STRING', processingGauge, [ processingGauge ] );
    let plSpeedTestData = {
        props : {
            latency,
            upTime,
            downTime
        }
    };

    for ( const [ _, value ] of Object.entries( plSpeedTestData.props ) ) {
        uwPropertyService.setPropertyLabelDisplay( value, 'PROPERTY_LABEL_AT_TOP' );
    }
    return plSpeedTestData;
};

export let runningSpeedTest = async function( latencydisplayValue, uploadDisplayValue, downloadDisplayValue, goodConnection, poorConnection, connectionStatus ) {
    try {
        let latencyTime = await latencyTest();
        let uploadSpeed =  uploadTest();
        let downloadSpeed =  downloadTest();
        const result = await Promise.race( [
            Promise.all( [    uploadSpeed, downloadSpeed ] ),
            new Promise( ( resolve, reject ) => {
                setTimeout( () => reject( new Error( 'Timeout' ) ), 60000 ); // 45 seconds
            } )
        ] );
        if( parseInt( latencyTime ) < 0 || uploadSpeed < 0 || downloadSpeed < 0 ) {
            throw new Error( 'Negative Results' );
        }
        let connectionStatusValue = uwPropertyService.createViewModelProperty( connectionStatus, connectionStatus, 'STRING', goodConnection, [ goodConnection ] );
        let latency = uwPropertyService.createViewModelProperty( 'latency', latencydisplayValue, 'STRING', latencyTime, [ latencyTime ] );
        let upTime = uwPropertyService.createViewModelProperty( 'upTime', uploadDisplayValue, 'STRING', result[ 0 ], [ result[ 0 ] ] );
        let downTime = uwPropertyService.createViewModelProperty( 'downTime', downloadDisplayValue, 'STRING', result[ 1 ], [ result[ 1 ] ] );

        let plSpeedTestData = {
            props : {
                latency,
                upTime,
                downTime,
                connectionStatusValue
            }
        };

        for ( const [ _, value ] of Object.entries( plSpeedTestData.props ) ) {
            uwPropertyService.setPropertyLabelDisplay( value, 'PROPERTY_LABEL_AT_TOP' );
        }
        return plSpeedTestData;
    } catch ( error ) {
        if( error.message === 'Negative Results' ) {
            poorConnection = 'Speed Test encountered an Error. Please try again';
        }
        let connectionStatusValue =  uwPropertyService.createViewModelProperty( connectionStatus, connectionStatus, 'STRING', poorConnection, [ poorConnection ] );
        let plSpeedTestData = {
            props : {
                connectionStatusValue
            }
        };
        for ( const [ _, value ] of Object.entries( plSpeedTestData.props ) ) {
            uwPropertyService.setPropertyLabelDisplay( value, 'PROPERTY_LABEL_AT_TOP' );
        }
        return plSpeedTestData;
    }
};
/**
 *
 * @param {*} latencydisp - This for the latenct display Value
 * @returns Latency from the gateway
 */
export let latencyTest = async function( latencydisp ) {
    const response = [];
    const packet = new Uint8Array( [ 0x12, 0x34, 0x56, 0x78 ] );

    //Calculating the latency by pinging the server. We are recording the time stamp before the request and the response carries the time stamp at which the gaetway was reached.
    //We are making seven different calls as such and fetching the min value out of all.
    //Instead of running a loop we are sequentially pinging the server beacuse in a loop there is ioverhead where we have to wait for the promises to be resolved for all to actually calcualte.
    try{
        let requestedTimeStampOne = Date.now();
        let responseOne = await AwHTTPService.instance.post( browserUtils.getBaseURL() + 'performance/', packet );
        let receievedTimeStampOne = Date.now();
        //let ping = receievedTimeStampOne - requestedTimeStampOne;
        // let responseOne = await AwHTTPService.instance.get(  browserUtils.getBaseURL() + 'performance', { headers: { 'performance-header': 'latency' } } );
        response.push( parseFloat( receievedTimeStampOne - requestedTimeStampOne ) );

        let requestedTimeStampTwo = Date.now();
        let responseTwo = await AwHTTPService.instance.post(  browserUtils.getBaseURL() + 'performance/',  {} );
        let receievedTimeStampTwo = Date.now();
        response.push( parseFloat( receievedTimeStampTwo - requestedTimeStampTwo ) );

        let requestedTimeStampThree = Date.now();
        let responseThree = await AwHTTPService.instance.post(  browserUtils.getBaseURL() + 'performance/',  packet );
        let receievedTimeStampThree = Date.now();
        response.push( parseFloat( receievedTimeStampThree - requestedTimeStampThree ) );

        let requestedTimeStampFour = Date.now();
        let responseFour = await AwHTTPService.instance.post(  browserUtils.getBaseURL() + 'performance/',  packet );
        let receievedTimeStampFour = Date.now();
        response.push( parseFloat( receievedTimeStampFour - requestedTimeStampFour ) );

        let requestedTimeStampFive = Date.now();
        let responseFive = await AwHTTPService.instance.post(  browserUtils.getBaseURL() + 'performance/',  packet );
        let receievedTimeStampFive = Date.now();
        response.push( parseFloat( receievedTimeStampFive - requestedTimeStampFive ) );

        let requestTimeStampSix = Date.now();
        let responseSix = await AwHTTPService.instance.post(  browserUtils.getBaseURL() + 'performance/',  packet );
        let receievedTimeStampSix = Date.now();
        response.push( parseFloat( receievedTimeStampSix - requestTimeStampSix ) );

        let requestTimeStampSeven = Date.now();
        let responseSeven = await AwHTTPService.instance.post(  browserUtils.getBaseURL() + 'performance/', packet );
        let receievedTimeStampSeven = Date.now();

        response.push( parseFloat( receievedTimeStampSeven - requestTimeStampSeven ) );

        return String( Math.abs( Math.min( ...response ) ) );
    }catch( error ) {
        throw new Error( error );
    }
};


export let updatePerformanceDisplayData = function( browserTypeDisp, ttiDisp, totalNetworkTimeDisp, totalSoaRequestsDisp, totalHttpRequestsDisp,
    domNodeCountDisp, domTreeDepthDisp, uniqueComponentsDisp, componentRendersDisp ) {
    let newPLStatsData = splmStatsService.getPLStatsData();
    let browserType = uwPropertyService.createViewModelProperty( 'browserType', browserTypeDisp, 'STRING', newPLStatsData.browserType, [ newPLStatsData.browserType ] );
    let tti = uwPropertyService.createViewModelProperty( 'tti', ttiDisp, 'STRING', newPLStatsData.tti, [ newPLStatsData.tti ] );
    let totalNetworkTime = uwPropertyService.createViewModelProperty( 'totalNetworkTime', totalNetworkTimeDisp, 'STRING', newPLStatsData.totalNetworkTime, [ newPLStatsData.totalNetworkTime ] );
    let totalSoaRequests = uwPropertyService.createViewModelProperty( 'totalSoaRequests', totalSoaRequestsDisp, 'STRING', newPLStatsData.soaCount, [ newPLStatsData.soaCount ] );
    let totalHttpRequests = uwPropertyService.createViewModelProperty( 'totalHttpRequests', totalHttpRequestsDisp, 'STRING', newPLStatsData.totalHttpRequests, [ newPLStatsData.totalHttpRequests ] );
    let domNodeCount = uwPropertyService.createViewModelProperty( 'domNodeCount', domNodeCountDisp, 'STRING', newPLStatsData.domNodeCount, [ newPLStatsData.domNodeCount ] );
    let domTreeDepth = uwPropertyService.createViewModelProperty( 'domTreeDepth', domTreeDepthDisp, 'STRING', newPLStatsData.domTreeDepth, [ newPLStatsData.domTreeDepth ] );
    let uniqueComponents = uwPropertyService.createViewModelProperty( 'uniqueComponents', uniqueComponentsDisp, 'STRING', newPLStatsData.uniqueComponents, [ newPLStatsData.uniqueComponents ] );
    let componentRenders = uwPropertyService.createViewModelProperty( 'componentRenders', componentRendersDisp, 'STRING', newPLStatsData.componentRenders, [ newPLStatsData.componentRenders ] );
    let plStatsData = {
        props: {
            browserType,
            tti,
            totalNetworkTime,
            totalSoaRequests,
            totalHttpRequests,
            domNodeCount,
            domTreeDepth,
            uniqueComponents,
            componentRenders
        }
    };
    for ( const [ _, value ] of Object.entries( plStatsData.props ) ) {
        uwPropertyService.setPropertyLabelDisplay( value, 'PROPERTY_LABEL_AT_TOP' );
    }
    return plStatsData;
};

export let resetPerformanceDisplayData = function( browserTypeDisp, ttiDisp, totalNetworkTimeDisp, totalSoaRequestsDisp, totalHttpRequestsDisp,
    domNodeCountDisp, domTreeDepthDisp, uniqueComponentsDisp, componentRendersDisp ) {
    let newPLStatsData = splmStatsService.getPLStatsData();
    let browserType = uwPropertyService.createViewModelProperty( 'browserType', browserTypeDisp, 'STRING', newPLStatsData.browserType, [ newPLStatsData.browserType ] );
    let tti = uwPropertyService.createViewModelProperty( 'tti', ttiDisp, 'STRING', '0.00 s', [ '0.00 s' ] );
    let totalNetworkTime = uwPropertyService.createViewModelProperty( 'totalNetworkTime', totalNetworkTimeDisp, 'STRING', '0.00 s', [ '0.00 s' ] );
    let totalSoaRequests = uwPropertyService.createViewModelProperty( 'totalSoaRequests', totalSoaRequestsDisp, 'STRING', '0', [ '0' ] );
    let totalHttpRequests = uwPropertyService.createViewModelProperty( 'totalHttpRequests', totalHttpRequestsDisp, 'STRING', '0', [ '0' ] );
    let domNodeCount = uwPropertyService.createViewModelProperty( 'domNodeCount', domNodeCountDisp, 'STRING', '0', [ '0' ] );
    let domTreeDepth = uwPropertyService.createViewModelProperty( 'domTreeDepth', domTreeDepthDisp, 'STRING', '0', [ '0' ] );
    let uniqueComponents = uwPropertyService.createViewModelProperty( 'uniqueComponents', uniqueComponentsDisp, 'STRING', '0', [ '0' ] );
    let componentRenders = uwPropertyService.createViewModelProperty( 'componentRenders', componentRendersDisp, 'STRING', '0', [ '0' ] );
    let plStatsData = {
        props: {
            browserType,
            tti,
            totalNetworkTime,
            totalSoaRequests,
            totalHttpRequests,
            domNodeCount,
            domTreeDepth,
            uniqueComponents,
            componentRenders
        }
    };
    for ( const [ _, value ] of Object.entries( plStatsData.props ) ) {
        uwPropertyService.setPropertyLabelDisplay( value, 'PROPERTY_LABEL_AT_TOP' );
    }
    return plStatsData;
};

export let uploadTest = async function( upTimeDisp, mockUploadData ) {
    //In upload speed test we are uploading chunks of data to the gateway. In the response, we get the time to upload a certain size of the data. Hence, calculating the speed.
    // The data to upload is just dummy data created on the fly.
    try {
        const mockData = [
            { id: 1 },
            { name: 'Dave', location: 'Atlanta' },
            { name: 'Santa Claus', location: 'North Pole' },
            { name: 'Man in the Moon', location: 'The Moon' },
            {
                Integer: {
                    firstValue: '55555',
                    secondValue: '99999999999'
                }
            },
            {
                DoubleValue: {
                    firstValue: '22.3',
                    secondValue: '99999.0'
                }
            },
            { plainValue: '100000000000000000000' }
        ];

        let result1 = [];

        for( let i = 0; i < 15000; i++ ) {
            result1.push( JSON.stringify( mockData ) );
        }

        let result2 = [];

        for( let i = 0; i < 30000; i++ ) {
            result2.push( JSON.stringify( mockData ) );
        }

        let result3 = [];

        for( let i = 0; i < 45000; i++ ) {
            result3.push( JSON.stringify( mockData ) );
        }

        let result4 = [];

        for( let i = 0; i < 60000; i++ ) {
            result4.push( JSON.stringify( mockData ) );
        }


        let size1 = new TextEncoder().encode( JSON.stringify( result1 ) ).length / 1024 / 1024;
        let size2 = new TextEncoder().encode( JSON.stringify( result2 ) ).length / 1024 / 1024;
        let size3 = new TextEncoder().encode( JSON.stringify( result3 ) ).length / 1024 / 1024;
        let size4 = new TextEncoder().encode( JSON.stringify( result4 ) ).length / 1024 / 1024;
        let timeStampWhenRequestSent1 = Date.now();
        const response1 = await AwHTTPService.instance.post( browserUtils.getBaseURL() + 'performance/upload/', result1, {
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            headers: { 'Content-Type': 'application/json' } } );
        let timeStampAtResponse1 = Date.now();
        let time1 = ( timeStampAtResponse1 - timeStampWhenRequestSent1 ) * 0.001;


        let timeStampWhenRequestSent2 = Date.now();
        const response2 = await AwHTTPService.instance.post( browserUtils.getBaseURL() + 'performance/upload/', result2, {
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            headers: { 'Content-Type': 'application/json' } } );
        let timeStampAtResponse2 = Date.now();
        let time2 = ( timeStampAtResponse2 - timeStampWhenRequestSent2 ) * 0.001;


        let timeStampWhenRequestSent3 = Date.now();
        const response3 = await AwHTTPService.instance.post( browserUtils.getBaseURL() + 'performance/upload/', result3, {
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            headers: { 'Content-Type': 'application/json' } } );
        let timeStampAtResponse3 = Date.now();
        let time3 = ( timeStampAtResponse3 - timeStampWhenRequestSent3 ) * 0.001;


        let timeStampWhenRequestSent4 = Date.now();
        const response4 = await AwHTTPService.instance.post( browserUtils.getBaseURL() + 'performance/upload/', result4, {
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            headers: { 'Content-Type': 'application/json' } } );
        let timeStampAtResponse4 = Date.now();
        let time4 = ( timeStampAtResponse4 - timeStampWhenRequestSent4 ) * 0.001;

        let results = [ Math.ceil(  size1 * 8  / time1 ), Math.ceil( size2 * 8 / time2 ), Math.ceil( size3 * 8 / time3 ), Math.ceil( size4 * 8 / time4 ) ];
        return Math.max( ...results );
    } catch ( error ) {
        throw new Error( error );
    }
};

export let downloadTest = async function( downTimeDisp ) {
    // In the donwload test we are trying to calculate the download speed by downloading data from the gateway.
    //Once the response is resolved , we calcuate the size of the data, time it took to download and hence calcualte the download speed.
    try{
        let timeDownloadStarted =  Date.now();
        const downloadResponseOne = await AwHTTPService.instance.get(  browserUtils.getBaseURL() + 'performance/download', { headers: { 'performance-header': 'downloadSpeedTest' } } );
        let timeStampatDatareceived = Date.now();
        const size =   new TextEncoder().encode( JSON.stringify( downloadResponseOne.data ) ).length  / 1024 / 1024;
        const sizeInBits = size * 8;
        const OverHeadTimeFromGateway = ( parseFloat( downloadResponseOne.headers.responseobjstopped ) - parseFloat( downloadResponseOne.headers.responseobjstarted ) ) / 1000;
        let time =  ( timeStampatDatareceived - timeDownloadStarted ) * 0.001;
        time -= OverHeadTimeFromGateway;
        return parseInt( sizeInBits / time );
    }catch( error ) {
        throw new Error( error );
    }
};

export default exports = {
    enablePLStats,
    disablePLStats,
    updatePerformanceDisplayData,
    startSpeedTest,
    runningSpeedTest,
    latencyTest,
    resetPerformanceDisplayData,
    uploadTest,
    downloadTest
};
