// Copyright (c) 2021 Siemens

/**
 * Component for header contribution.
 *
 * @module js/AwHeaderContributionService
 */

export const awHeaderContributionRenderFunction = ( props ) => {
    const { children } = props;
    return (
        <div className='sw-row aw-layout-headerProperty align-center'>
            { children }
        </div>
    );
};
