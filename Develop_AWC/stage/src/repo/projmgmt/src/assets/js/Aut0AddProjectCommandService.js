// Copyright (c) 2022 Siemens

/**
 * A service that has util methods which can be use in other js files
 *
 * @module js/Aut0AddProjectCommandService
 */
import cdm from 'soa/kernel/clientDataModel';
import appCtx from 'js/appCtxService';
import uwPropertySvc from 'js/uwPropertyService';

var exports = {};
/**
  * This method is used to get the LOV values of Project Categories for the add project panel.
  * @param {Object} response the response of the getLov soa
  * @returns {Object} value the LOV value
  */
export let getProjectCategoryList = function( response ) {
    return response.lovValues.map( function( obj ) {
        return {
            propDisplayValue: obj.propDisplayValues.lov_values[ 0 ],
            propDisplayDescription: obj.propDisplayValues.lov_value_descriptions ? obj.propDisplayValues.lov_value_descriptions[ 0 ] : obj.propDisplayValues.lov_values[ 0 ],
            propInternalValue: obj.propInternalValues.lov_values[ 0 ]
        };
    } );
};

/**
  * This method is used to get the LOV values of Project Categories for the add project panel.
  * @param {Object} response the response of the getConstantValues soa
  * @returns {Object} value of the InitialValues & isRequired  value
  */

export let setConstantValues = function( response, prop ) {
    var dbValue = response.constantValues[0].value;
    var isRequired = response.constantValues[1].value;
    if( dbValue !== null ) {
        uwPropertySvc.setValue( prop, dbValue );
        uwPropertySvc.setDisplayValue( prop, [ dbValue ] );
    }
    if( isRequired === 'true' ) {
        uwPropertySvc.setIsRequired( prop, isRequired );
    }
    return null;
};


/**
  * This function will add the newly created project in project list.
  * And add it on top in primary work area and selects.
  * @param {Object} eventData event data which contains the newly created project & flag if the panel is unpinned
  * @param {Object} dataProvider dataProvider which needs to be updated
  */
export let addProjectToProvider = function( eventData, dataProvider ) {
    if( eventData.project  ) {
        dataProvider.viewModelCollection.loadedVMObjects.unshift(  eventData.project  );
        dataProvider.update( dataProvider.viewModelCollection.loadedVMObjects, dataProvider.viewModelCollection.loadedVMObjects.length );
        if( !eventData.isPinned ) {
            dataProvider.selectionModel.setSelection( eventData.project );
        }
    }
};

/**
  * Return true if the Program is selected else false.
  */
export let isProgram = function( projectSelected ) {
    if( projectSelected ) {
        return false;
    }
    return true;
};

/**
  * Return the newly created project from the SOA response.
  */
export let getCreatedProject = function( response ) {
    var createdProject;
    if( response.created && response.created[0] ) {
        createdProject = cdm.getObject( response.created[0] );
    }
    return createdProject;
};

export let setSelectedProjectAndProperty = function( data, dataProvider ) {
    var selectedProject;
    var pSelected = appCtx.getCtx( 'pselected' );
    if( pSelected ) {
        selectedProject = pSelected;
    } else {
        selectedProject = appCtx.getCtx( 'selected' );
    }
    data.ProjectId.update( selectedProject.props.project_id.dbValue );
    data.ProjectName.update( selectedProject.props.project_name.dbValue );
    data.ProjectDesc.update( selectedProject.props.project_desc.dbValue );
    //Here the data.useProgramSecurity is having propertyRadioTrueText = Project & propertyRadioFalseText=Program
    data.useProgramSecurity.update( !selectedProject.props.use_program_security.dbValue );
    let lovEntry = {
        propDisplayValue: selectedProject.props.fnd0ProjectCategory.uiValue,
        propInternalValue:selectedProject.props.fnd0ProjectCategory.dbValue
    };
    data.ProjectCategory.setLovVal( { lovEntry, dataProvider } );
    return selectedProject;
};

export default exports = {
    getProjectCategoryList,
    setConstantValues,
    addProjectToProvider,
    isProgram,
    getCreatedProject,
    setSelectedProjectAndProperty
};

