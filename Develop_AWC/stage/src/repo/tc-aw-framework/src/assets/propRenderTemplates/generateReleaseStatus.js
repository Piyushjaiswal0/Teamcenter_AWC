// Copyright (c) 2022 Siemens

/**
 * native construct to hold the server version information related to the AW server release.
 *
 * @module propRenderTemplates/generateReleaseStatus
 */
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';

var exports = {};

/**
 * Generates Release Status DOM Element
 * @param { Object } vmo - ViewModelObject for which release status is being rendered
 * @param { Object } containerElem - The container DOM Element inside which release status will be rendered
 */
export let releaseStatusRendererFn = function( vmo, containerElem ) {
    var release_status_uids = vmo.props.release_status_list.dbValues;
    _.forEach( release_status_uids, function( release_status_uid ) {
        var releaseStatusBO = cdm.getObject( release_status_uid );
        var releaseStatusName = releaseStatusBO.props.object_name.dbValues[ 0 ];
        var cellImg = document.createElement( 'img' );
        cellImg.className = 'aw-visual-indicator';
        cellImg.title = releaseStatusName;
        var imgSrc = null;
        if( releaseStatusName === 'Approved' ) {
            imgSrc = 'assets/image/indicatorReleasedApproved16.svg';
        } else if( releaseStatusName === 'TCM Released' ) {
            imgSrc = 'assets/image/indicatorReleasedTCMReleased16.svg';
        }
        cellImg.src = imgSrc;
        cellImg.alt = releaseStatusName;
        containerElem.appendChild( cellImg );
    } );
};

export default exports = {
    releaseStatusRendererFn
};
