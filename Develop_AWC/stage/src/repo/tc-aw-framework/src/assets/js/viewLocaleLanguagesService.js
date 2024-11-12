import AwCheckbox from 'viewmodel/AwCheckboxViewModel';
import AwPanel from 'viewmodel/AwPanelViewModel';
import viewModelObjectService from 'js/viewModelObjectService';
import uwPropertySvc from 'js/uwPropertyService';
import _ from 'lodash';

/**
 * render function for viewLocaleLanguagesRenderFunction
 * @param {*} props context for render function interpolation
 * @returns {JSX.Element} react component
 */
export const viewLocaleLanguagesRenderFunction = ( props ) => {
    const {
        fields,
        subPanelContext
    } = props;

    if( !subPanelContext.localizedProps ) {
        return;
    }

    const handleLocaleClick = ( event  ) => {
        let propName = event.currentTarget.name;

        let newEditLocalizationPanelState = { ...subPanelContext.editLocalizationPanelState.getValue() };
        newEditLocalizationPanelState.localizedProps = newEditLocalizationPanelState.localizedProps ? newEditLocalizationPanelState.localizedProps : {};
        newEditLocalizationPanelState.localizedProps[ propName ] = { dbValue: event.target.checked, Date };

        if( !event.target.checked ) {
            newEditLocalizationPanelState.isDirty = true;
        }
        subPanelContext.editLocalizationPanelState.update( newEditLocalizationPanelState );
    };

    if( fields.languageProps ) {
        return (
            <AwPanel>
                {Object.entries( fields.languageProps ).map( ( [ key, langProp ] ) =>{
                    langProp.disabled = false;
                    return <AwCheckbox {...langProp} action={handleLocaleClick} key={key}></AwCheckbox>;
                } )
                }
            </AwPanel>

        );
    }
};

export const initLocalizedProps = ( localizedProps, allLanguages, adaptedObject ) => {
    let languageProps = [];
    let localeProps = [];
    _.forEach( localizedProps, function( localizedProp, indx ) {
        if( localizedProp ) {
            let viewProp = uwPropertySvc.createViewModelProperty( localizedProp.propertyName, localizedProp.propertyDisplayName,
                localizedProp.type, localizedProp.dbValue, localizedProp.dbValue );
            uwPropertySvc.setPropertyLabelDisplay( viewProp, 'PROPERTY_LABEL_AT_RIGHT' );
            languageProps.push( viewProp );

            let dbValue = localizedProp.dbValue ? localizedProp.dbValue : '';
            let viewModelProp = uwPropertySvc.createViewModelProperty( localizedProp.propertyName, localizedProp.propertyDisplayName, 'STRING', dbValue,
                [ dbValue ] );
            uwPropertySvc.setIsPropertyModifiable( viewModelProp, true );
            uwPropertySvc.setEditState( viewModelProp, true, true );
            uwPropertySvc.setNumberOfLines( viewModelProp, 1 );
            viewModelProp.index = indx;

            localeProps.push( viewModelProp );
        }
    } );

    _.forEach( allLanguages, function( language ) {
        let dbValue = Boolean( localizedProps[ language.languageCode ] && localizedProps[ language.languageCode ].dbValue );

        let viewModelProp = uwPropertySvc.createViewModelProperty( language.languageCode, language.languageName, 'BOOLEAN', dbValue, [ language.languageName ] );

        localeProps.push( viewModelProp );
    } );

    let obj = {};

    for( let i = 0; i < localeProps.length; i++ ) {
        obj[ localeProps[ i ].propertyName ] = localeProps[ i ];
    }

    let viewModelObj = viewModelObjectService.createViewModelObject( adaptedObject[ 0 ].uid );
    viewModelObj.props = obj;

    return {
        languageProps: languageProps,
        localeProps: viewModelObj
    };
};
