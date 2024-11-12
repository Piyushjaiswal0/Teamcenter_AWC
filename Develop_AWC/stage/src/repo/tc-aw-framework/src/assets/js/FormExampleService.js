import AwButton from 'viewmodel/AwButtonViewModel';
import AwWidget from 'viewmodel/AwWidgetViewModel';
import AwPanel from 'viewmodel/AwPanelViewModel';
import AwPanelHeader from 'viewmodel/AwPanelHeaderViewModel';
import AwPanelFooter from 'viewmodel/AwPanelFooterViewModel';
import AwPanelBody from 'viewmodel/AwPanelBodyViewModel';
import AwPanelSection from 'viewmodel/AwPanelSectionViewModel';
import AwDate from 'viewmodel/AwDateViewModel';
import AwTextbox from 'viewmodel/AwTextboxViewModel';

const logToString = objects => JSON.stringify( { objects }, null, 2 );
export const formExampleRenderFunction = ( { subPanelContext, viewModel, fields, formProp } ) => {
    const { actions, data } = viewModel;
    return (
        <div className='sw-column w-12'>
            <h2>Form</h2>
            <div className='sw-row mx-normal'>
                <AwPanel
                    className='w-6'
                    caption='This is Panel Caption'
                    {...formProp}
                    submitAction={actions.submitAction}>
                    <AwPanelHeader>
                        <div>{data.subHeader}</div>
                    </AwPanelHeader>
                    <AwPanelBody>
                        <AwPanelSection caption='Form Fields'>
                            <AwTextbox {...fields.email}/>
                            <AwTextbox {...fields.firstName}/>
                            <AwTextbox {...fields.lastName}/>
                            <AwWidget {...fields.age}/>
                            <AwWidget {...fields.height}/>
                            <AwTextbox {...fields.department}/>
                            <AwWidget {...fields.feedback}/>
                            <AwDate {...fields.hireDate}/>
                        </AwPanelSection>
                    </AwPanelBody>
                    <AwPanelFooter className='align-right'>
                        <AwButton type='button' isDisabled={!formProp.attributes.dirty} action={formProp.onReset}>Reset </AwButton>
                        <AwButton type='submit' isDisabled={!formProp.attributes.valid}>Submit</AwButton>
                    </AwPanelFooter>
                </AwPanel>
                <pre className='sw-column w-6'>{logToString( fields )}</pre>
            </div>
        </div>
    );
};
