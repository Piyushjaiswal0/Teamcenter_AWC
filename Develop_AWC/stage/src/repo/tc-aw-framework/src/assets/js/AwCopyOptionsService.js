import AwCheckbox from 'viewmodel/AwCheckboxViewModel';
import AwPanelSection from 'viewmodel/AwPanelSectionViewModel';
import uwPropertySvc from 'js/uwPropertyService';
import _ from 'lodash';

export const awCopyOptionsRenderFunction = ( { copyOptions, fields, xrtState, i18n } ) => {
    if( !copyOptions ) {
        return;
    }

    const handleCopyOptionClick = ( event ) => {
        let propName = event.currentTarget.name;

        let newXrtState = { ...xrtState.getValue() };
        newXrtState.copyOptionProps = newXrtState.copyOptionProps ? newXrtState.copyOptionProps : {};
        newXrtState.copyOptionProps[ propName ] = { dbValue: event.target.checked };

        xrtState.update( newXrtState );
    };

    if( fields.copyOptionProps ) {
        return(
            <AwPanelSection caption={i18n.copyOptions}>
                {
                    Object.entries( fields.copyOptionProps ).map( ( [ key, copyOptionProp ] ) => {
                        copyOptionProp.disabled = false;
                        return <AwCheckbox {...copyOptionProp} action={handleCopyOptionClick} key={key}></AwCheckbox>;
                    } )
                }
            </AwPanelSection>
        );
    }
};

export const initCopyOptions = ( copyOptions ) => {
    let copyOptionProps = [];
    _.forEach( copyOptions, function( copyOption ) {
        if( copyOption ) {
            let propName = Object.keys( copyOption )[0];
            let viewProp = uwPropertySvc.createViewModelProperty( propName, copyOption[propName].displayName,
                copyOption[propName].type, copyOption[propName].dbValue, copyOption[propName].dbValue );
            uwPropertySvc.setPropertyLabelDisplay( viewProp, copyOption[propName].labelPosition, true );
            copyOptionProps.push( viewProp );
        }
    } );

    return {
        copyOptionProps
    };
};
