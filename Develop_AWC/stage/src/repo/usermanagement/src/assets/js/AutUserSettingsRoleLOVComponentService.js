// Copyright (c) 2021 Siemens
import AwLovEdit from 'viewmodel/AwLovEditViewModel';
/**
 * render function for AwLovEdit
 * @param {*} props context for render function interpolation
 * @returns {JSX.Element} react component
 */
var exports = {};
export const aut0UserSettingsRoleLOVComponentRenderFunction = ( props ) => {
    const {  viewModel, ...prop } = props;

    let fielddata = { ...prop.fielddata };
    fielddata.hasLov = true;
    fielddata.dataProvider = viewModel.dataProviders.rolesProvider;

    const passedProps = { ...prop,  fielddata };


    return (
        <AwLovEdit {...passedProps} ></AwLovEdit>
    );
};

exports = {
    aut0UserSettingsRoleLOVComponentRenderFunction
};
export default exports;
