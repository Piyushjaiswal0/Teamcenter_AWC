import _workspaceValSvc from 'js/workspaceValidationService';
import AwGlobalSearchBox from 'viewmodel/AwGlobalSearchBoxViewModel';
import AwGlobalSearchIcon from 'viewmodel/AwGlobalSearchIconViewModel';
import awSearchCoreService from 'js/awSearchCoreService';
import eventBus from 'js/eventBus';
// Narrow mode - In the event of window resize call the function openSearchPanelAsNeeded
eventBus.subscribe( 'aw.windowResize', function() {
    awSearchCoreService.openSearchPanelAsNeeded();
} );
/**
 * render function for awGlobalSearch
 * @param {*} props context for render function interpolation
 * @returns {JSX.Element} react component
 */
export const awGlobalSearchServiceRenderFunction = ( props ) => {
    const { fields, actions } = props;
    if ( _workspaceValSvc.isValidPage( 'teamcenter_search_search' ) ) {
        return (
            <div className='aw-search-globalSearchWidgetContainer'>
                <div className='aw-search-globalSearchBoxContainer aw-layout-flexRowContainer' role='search' >
                    <AwGlobalSearchBox expand={fields.expandSearchBox} show={props.showsearchbox}></AwGlobalSearchBox>
                    <AwGlobalSearchIcon expand={fields.expandSearchBox} className='aw-search-fullModeSearchIconViewContainer' show={props.showsearchbox}></AwGlobalSearchIcon>
                </div>
                <AwGlobalSearchIcon className='aw-search-searchPanelToggleIconContainer' narrowModeAction={actions.narrowModeAction}></AwGlobalSearchIcon>
            </div>
        );
    }
    return '';
};
