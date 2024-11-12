import AwSearchBox from 'viewmodel/AwSearchBoxViewModel';
import AwLink from 'viewmodel/AwLinkViewModel';
import AwWidget from 'viewmodel/AwWidgetViewModel';
import AwPopup from 'viewmodel/AwPopupViewModel';
import AwRevisionRule from 'viewmodel/AwRevisionRuleViewModel';
import AwSearchSuggestions from 'viewmodel/AwSearchSuggestionsViewModel';
import eventBus from 'js/eventBus';
import awSearchControllerService from 'js/awSearchControllerService';
import awSearchCoreService from 'js/awSearchCoreService';
import AwGlobalSearchBoxUtils from 'js/AwGlobalSearchBoxUtils';
import globalSearchService from 'js/globalSearchService';
import $ from 'jquery';

/**
 * render function for awGlobalSearchBox
 * @param {*} props context for render function interpolation
 * @returns {JSX.Element} react component
 */
export const awGlobalSearchBoxServiceRenderFunction = ( props ) => {
    const {  fields, viewModel, actions, show, expand } = props;
    let { hintPopup } = actions;
    const { ctx, conditions } = viewModel;

    const closePopup = () => {
        hintPopup.hide();
    };
    const onKeyPress = async( event ) => {
        if( event.key === 'Enter' ) {
            if ( $( '.aw-search-globalSearchSavedLink' ).hasClass( 'aw-search-suggestionSelected' ) ) {
                actions.savedSearchLink();
                closePopup();
            } else if ( $( '.aw-search-globalSearchLinksPanel1' ).hasClass( 'aw-search-suggestionSelected' ) ) {
                actions.advancedSearchLink();
                closePopup();
            } else {
                event.preventDefault();
                actions.doGlobalSearch();
                closePopup();
            }
        } else if ( event.key === 'ArrowDown' ) {
            onClickMe();
            dropdownToDisplay();
            AwGlobalSearchBoxUtils.selectNextIndexOnArrowDown( fields );
        } else if ( event.key === 'ArrowUp' ) {
            AwGlobalSearchBoxUtils.selectNextIndexOnArrowUp( fields );
        } else {
            eventBus.publish( 'search.recentsChanged' );
            awSearchCoreService.publishEventsInHalfSeconds( 'search.suggestionsChanged' );
            if( !hintPopup.open ) {
                hintPopup.show( {
                    width: hintPopup.reference.current.offsetWidth
                } );
            }
        }
    };

    const onClickMe = () => {
        let recents = awSearchControllerService.retrieveRecentSearchObjectsFiltered( ctx.user.uid, fields.searchBox.value );
        let hasRecents = recents && recents.length > 0;
        if( !hintPopup.open ) {
            hintPopup.show( {
                width: hintPopup.reference.current.offsetWidth
            } );
        }
    };
    if ( expand.value !== 'true' && !( show && show.value ) ) {
        return '';
    }
    const dropdownToDisplay = ( value ) => {
        let dropdownLOV;
        if( value ) {
            dropdownLOV = <div className='aw-search-searchPreFilterPanel2'>
                <AwWidget action={actions.updatePrefilter2} {...fields.selectPrefilter2} dirty={conditions.isPrefilter2Dirty ? '' : 'true'}></AwWidget>
            </div>;
        } else {
            dropdownLOV =  <div className='aw-search-searchPreFilterPanel3'>
                <AwWidget {...fields.selectPrefilter3} dirty={conditions.isPrefilter3Dirty ? '' : 'true'}></AwWidget>
            </div>;
        }
        return dropdownLOV;
    };

    let showDefaultFilter = true;

    let isCrossDomainSearchInstalled = ctx.preferences.XST_cross_domain_sources;
    if( isCrossDomainSearchInstalled && isCrossDomainSearchInstalled.length > 0 ) {
        showDefaultFilter = false;
    }
    const activeFilter = dropdownToDisplay( showDefaultFilter );

    return (
        <div className='aw-search-searchContainer aw-search-globalSearchContainer'>
            <div className='aw-search-globalSearchElementsContainer'>
                <div className='aw-search-globalSearchPreFilterWrapper'>
                    <div className='aw-search-searchPreFilterPanel1'>
                        <AwWidget action={actions.updatePrefilter1} {...fields.selectPrefilter1} dirty={conditions.isPrefilter1Dirty ? '' : 'true'}></AwWidget>
                    </div>
                    {activeFilter}
                </div>
                <div className='aw-search-globalSearchWrapper'>
                    <AwSearchBox
                        domRef={hintPopup.reference}
                        closeAction={closePopup}
                        action={actions.doGlobalSearch}
                        onKeyDown={( event )=> onKeyPress( event )}
                        onClick={()=> onClickMe()}
                        onFocus={()=> onClickMe()}
                        prop = {fields.searchBox}>
                    </AwSearchBox>
                    <AwPopup {...hintPopup.options}>
                        <AwSearchSuggestions searchstring={fields.searchBox} closeAction={closePopup} action={actions.doGlobalSearch} {...fields}></AwSearchSuggestions>
                        <div className='aw-search-globalSearchLinksContainer'>
                            <div className='aw-search-globalSearchLinksContainer2'>
                                {
                                    conditions.showSavedSearchLink &&
                                    <div className='aw-search-globalSearchSavedLink'>
                                        <AwLink {...fields.savedSearch} action={actions.savedSearchLink}></AwLink>
                                    </div>
                                }
                                {
                                    conditions.showAdvancedSearchLink &&
                                    <div className='aw-search-globalSearchLinksPanel1'>
                                        <AwLink {...fields.advancedSearch} action={actions.advancedSearchLink}></AwLink>
                                    </div>
                                }
                            </div>
                        </div>
                    </AwPopup>
                </div>
            </div>
        </div>
    );
};
