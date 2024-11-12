// Copyright (c) 2023 Siemens

/**
 * @module js/awPanelHeaderSectionService
 */
import uwPropertyService from 'js/uwPropertyService';

var exports = {};

export function updateDataFromProps( headerLabelToUpdate, headerElementToUpdate, headerHintDisplayNameToUpdate, headerHintValueToUpdate ) {
    let headerHintLabelPosition = headerHintDisplayNameToUpdate ? 'PROPERTY_LABEL_AT_SIDE' : 'NO_PROPERTY_LABEL';

    return { headerLabel: headerLabelToUpdate,
        headerElement: headerElementToUpdate,
        headerHintDispName: headerHintDisplayNameToUpdate,
        headerHintValue: headerHintValueToUpdate,
        headerHintLabelDisplay: headerHintLabelPosition };
}

export function toggleShowMoreFlagForHeaderSectionElements(headerElementArray, showMoreFlag, populatedHeaderSectionElements) {
    let headerSectionElements = populatedHeaderSectionElements;
    if(headerElementArray && showMoreFlag && headerSectionElements === undefined)
    {
        headerSectionElements = [];
        for( let i = 0; i < headerElementArray.length; i++ ) {
            let vmProp = uwPropertyService.createViewModelProperty( headerElementArray[i], '', 'STRING', '', '' );
            vmProp.uiValue = headerElementArray[i].props.object_string.uiValues[0];
            headerSectionElements.push( vmProp );
        }
    }

return {updatedHeaderSectionElements: headerSectionElements, updatedShowMoreFlag: !showMoreFlag};
}

export default exports = {
    updateDataFromProps,
    toggleShowMoreFlagForHeaderSectionElements
};
