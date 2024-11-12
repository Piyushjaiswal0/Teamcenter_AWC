import AwWidget from 'viewmodel/AwWidgetViewModel';

export const awSearchPreFilterRender = ( props ) => {
    const { fields, viewModel, actions, options } = props;
    const { ctx, conditions } = viewModel;
    let showDefaultFilter = true;
    let dropdownLOV;
    let isCrossDomainSearchInstalled = ctx?.preferences?.XST_cross_domain_sources;

    if( isCrossDomainSearchInstalled && isCrossDomainSearchInstalled.length > 0 ) {
        showDefaultFilter = false;
    }
    if( showDefaultFilter ) {
        dropdownLOV = <div className='aw-search-searchPreFilterPanel2'>
            <AwWidget action={actions.updatePrefilter2} {...fields.selectPrefilter2} dirty={conditions.isPrefilter2Dirty ? '' : 'true'} options={options}></AwWidget>

        </div>;
    } else {
        dropdownLOV = <div className='aw-search-searchPreFilterPanel3'>
            <AwWidget {...fields.selectPrefilter3} dirty={ conditions.isPrefilter3Dirty ? '' : 'true'} options={options}></AwWidget>
        </div>;
    }
    return dropdownLOV;
};
