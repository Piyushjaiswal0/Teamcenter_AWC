import _ from 'lodash';
import AwTextbox from 'viewmodel/AwTextboxViewModel';
import AwList from 'viewmodel/AwListViewModel';
import AwDefaultCell from 'viewmodel/AwDefaultCellViewModel';

export const awProjectSelectorRenderFunction = ( props ) => {
    const {
        viewModel
    } = props;

    const {
        data,
        dataProviders,
        dispatch,
        dndHandler
    } = viewModel;

    // Set timer delay of 1.5 seconds before initiating dataprovider.
    const onChange = ( newValue, oldValue, immediate = false ) => {
        if( !_.isNull( data._timerId ) ) {
            clearTimeout( data._timerId );
        }

        // trigger a immediate filter for enter case
        if( immediate ) {
            dataProviders.getUserProjectsProvider.resetDataProvider();
            return;
        }

        // else trigger a delay filter
        if( !_.isUndefined( newValue ) && !_.isNull( newValue ) && newValue !== oldValue ) {
            let timerId = setTimeout( () => {
                dataProviders.getUserProjectsProvider.resetDataProvider();
            }, 1500 );

            // update previous timerid
            dispatch( { path: 'data._timerId', value: timerId } );
        }
    };

    return <div>
        <AwTextbox {...props} onSwChange={onChange}></AwTextbox>
        <AwList dataprovider = { dataProviders.getUserProjectsProvider } dndHandler={ dndHandler } >
            <AwDefaultCell vmo='item'></AwDefaultCell>
        </AwList>
    </div>;
};
