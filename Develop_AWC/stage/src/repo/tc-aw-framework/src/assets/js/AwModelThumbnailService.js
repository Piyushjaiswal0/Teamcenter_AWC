import AwPic from 'viewmodel/AwPicViewModel';
import browserUtils from 'js/browserUtils';
import fmsUtils from 'js/fmsUtils';
import awIconSvc from 'js/awIconService';

export const awModelThumbnailRenderFunction = ( { vmo, imageTicket } ) => {
    let ticket = imageTicket;
    let hasThumbnail = false;
    let imageUrl = '';

    if( !ticket && vmo && vmo.props && vmo.props.awp0ThumbnailImageTicket ) {
        ticket = vmo.props.awp0ThumbnailImageTicket.dbValues[ 0 ];
    }

    if( ticket && ticket.length > 28 ) {
        hasThumbnail = true;
        imageUrl = browserUtils.getBaseURL() + 'fms/fmsdownload/' +
            fmsUtils.getFilenameFromTicket( ticket ) + '?ticket=' + ticket;
    }

    //show type icon instead if thumbnail doesn't exist
    if( !hasThumbnail ) {
        imageUrl = awIconSvc.getTypeIconFileUrl( vmo );
    }

    return hasThumbnail ? <AwPic source={imageUrl}></AwPic> : <AwPic iconId={imageUrl} className='sw-image-icon'></AwPic>;
};
