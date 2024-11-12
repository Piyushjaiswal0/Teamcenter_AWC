import AwIcon from 'viewmodel/AwIconViewModel';
import wcagSvc from 'js/wcagService';
/**
 * render function for awGlobalSearchIcon
 * @param {*} props context for render function interpolation
 * @returns {JSX.Element} react component
 */
export const awGlobalSearchIconServiceRenderFunction = ( props ) => {
    const { show, expand, narrowModeAction, i18n } = props;
    const toggleSearchBox = ( event ) => {
        event.preventDefault();
        if ( narrowModeAction ) {
            narrowModeAction();
        }else{
            let evt = {
                target: {
                    value: 'true'
                }
            };
            expand.onChange( evt );
        }
    };

    const toggleSearchBoxPress = ( event ) => {
        if( wcagSvc.isValidKeyPress( event ) ) {
            toggleSearchBox( event );
        }
    };

    if ( expand && expand.value === 'true' || show && show.value ) {
        return '';
    }
    return (
        <div role='button' tabIndex ='0' aria-label={i18n.searchBtn} onClick={( event )=>toggleSearchBox( event )} onKeyDown={( event )=>toggleSearchBoxPress( event )}
            className='aw-search-searchContainer sw-aria-border aw-search-searchIconViewContainer'>
            <AwIcon className='aw-uiwidgets-searchBoxIcon aw-search-searchToggleButton aw-aria-border' iconId='cmdSearch' ></AwIcon>
        </div>
    );
};
