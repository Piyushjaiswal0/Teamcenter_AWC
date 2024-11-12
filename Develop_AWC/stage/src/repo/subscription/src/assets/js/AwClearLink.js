import AwLink from 'viewmodel/AwLinkViewModel';

var exports = {};
export const AwClearLink = ( props ) => {
    const {
        actions,
        fields
    } = props;

    return (
        <div>
            <div className='aw-layout-flexRow'>
                <AwLink className='clearLink aw-layout-justifyFlexEnd aw-notificationAlert-appHeader' action={actions.clearMessages} {...fields.clearLink}></AwLink>
            </div>
        </div>
    );
};
exports = {
    AwClearLink
};
export default exports;
