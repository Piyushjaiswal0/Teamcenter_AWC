import AwBaseSublocation from 'viewmodel/AwBaseSublocationViewModel';
import UIView from 'viewmodel/UiViewViewModel';
import AwStateService from 'js/awStateService';
import AwSplitter from 'viewmodel/AwSplitterViewModel';

export const uicompRenderFunction = ( { viewModel } ) => {
    const { data } = viewModel;
    const states = AwStateService.instance.get();
    const viewRoutes = states.filter( value => value.parent && value.parent === 'showUIComp' );

    const Link = ( { to, label } ) => {
        const navigate = e => {
            e.preventDefault();
            AwStateService.instance.go( label );
        };
        return <a href={to} onClick={e => navigate( e )}>{label}</a>;
    };

    const renderLinkListItem = ( route, key ) => {
        return (
            <li className='pg-pwa-list' key={key}>
                <Link to={route.name} label={route.name}></Link>
            </li>
        );
    };

    return (
        <>
            <AwBaseSublocation provider={data._sublocation}>
                <div className='sw-column sw-primary-workarea align-self-stretch' >
                    <div className='sw-section'>
                        <h2 className='bold sw-font-xLarge'>Component View Examples</h2>
                        <ul>
                            {viewRoutes.map( ( route, index ) => renderLinkListItem( route, index ) )}
                        </ul>
                    </div>
                </div>

                <AwSplitter></AwSplitter>

                <div className='sw-row sw-secondary-workarea flex-auto align-self-stretch'>
                    <UIView />
                </div>
            </AwBaseSublocation>
        </>
    );
};

export const initializePage = () => {};

export const cleanupPage = () => {};
