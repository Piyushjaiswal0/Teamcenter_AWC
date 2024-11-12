
import AwLink from 'viewmodel/AwLinkViewModel';
import AwBreak from 'viewmodel/AwBreakViewModel';
import AWClearLink from 'viewmodel/AwClearLinkViewModel';
import { executeCommand } from 'js/command.service';

var exports = {};
export const alertPopupRenderFunction = ( props ) => {
    const {
        i18n,
        actions,
        fields,
        subPanelContext,
        selectedprop,
        runActionWithViewModel
    } = props;

    const handleClick = ( event, linkObject ) => {
        if ( event.key && ( event.key !== 'Enter' && event.key !== ' ' ) ) {
            return;
        }
        executeCommand( 'Awp0OpenLineItem', [], '', linkObject, runActionWithViewModel );
    };
    return (
        <div>
            <div className='aw-notificationAlert-popupbody'>
                {props.ctx.unreadMessageCount === 0 ?
                    < div className='aw-notificationAlert-noNotificationMessageLabel'>{i18n.noNotificationMsg}</div>
                    :
                    <div>{
                        subPanelContext.msgObject.messageObjects && subPanelContext.msgObject.messageObjects.map( ( app, i ) => {
                            return (
                                <div className='wrap' id={i} key={i}>
                                    <div className='aw-layout-flexRow'>
                                        <AwLink className='newsfeedLink aw-layout-flex aw-notificationAlert-appHeader' action={actions.redirectToNewsFeed} {...app.appType}></AwLink>
                                        <AWClearLink prop={app.lineItems}></AWClearLink>
                                    </div>
                                    <ul>
                                        {app && app.lineItems.map( ( linkObject, j ) => {
                                            return (
                                                <li className='aw-notification-cellListItem' key={j}>
                                                    <div className='aw-widgets-cellListCellTitleBlock'>
                                                        <h3 title={linkObject.header} className='aw-notificationAlert-cellHeaderLabel' id='CellTitle'>{linkObject.header}</h3>
                                                    </div>
                                                    <div id='cellProperties'>
                                                        <div className='aw-widgets-cellListCellProperties'>
                                                            <div onClick={( event ) => { handleClick( event, linkObject ); }}
                                                                onKeyDown={( event ) => { handleClick( event, linkObject ); }}
                                                                role='link' title={linkObject.subject} tabIndex='0' className='aw-notificationAlert-subjectLink'>
                                                                {linkObject.subject}
                                                            </div>
                                                        </div>
                                                        <div className='aw-widgets-cellListCellProperties'>
                                                            <label className='aw-notificationAlert-propertyCellLabel'>{linkObject.sentDateHeader}: </label>
                                                            <label className='aw-notificationAlert-propertyCellValue' title={linkObject.sentDateValue}>{linkObject.sentDateValue}</label>
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        } )
                                        }
                                    </ul>
                                    <AwBreak> </AwBreak>
                                </div>
                            );
                        } )
                    }
                    </div>
                }
            </div>
        </div>
    );
};
exports = {
    alertPopupRenderFunction
};
export default exports;
