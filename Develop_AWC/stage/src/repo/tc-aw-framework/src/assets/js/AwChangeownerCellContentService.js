import cdm from 'soa/kernel/clientDataModel';

export const getUserDetailsFromClientDataModel = ( props ) => {
    const {
        vmo
    } = props;

    if ( vmo && vmo.props && vmo.props.user && vmo.props.user.dbValues[0] ) {
        const userModelObject = cdm.getObject( vmo.props.user.dbValues[0] );

        if ( userModelObject ) {
            const userDetailsModelObject = cdm.getObject( userModelObject.props.person.dbValues[0] );

            if ( userDetailsModelObject ) {
                return {
                    username : userDetailsModelObject.props.user_name.uiValues[ 0 ],
                    emailaddress : userDetailsModelObject.props.PA9.uiValues[ 0 ],
                    phonenumber : userDetailsModelObject.props.PA10.uiValues[ 0 ]
                };
            }
        }
    }
};

const exports = {
    getUserDetailsFromClientDataModel
};
export default exports;
