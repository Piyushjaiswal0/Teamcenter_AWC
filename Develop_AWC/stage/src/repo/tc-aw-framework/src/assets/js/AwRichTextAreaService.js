import { getValClass } from 'js/componentUtils';
import AwPropertyLabel from 'viewmodel/AwPropertyLabelViewModel';
import AwPropertyRichTextAreaVal from 'viewmodel/AwPropertyRichTextAreaValViewModel';

/**
 * render function for AwRichTextArea
 * @param {*} param0 context for render function interpolation
 * @returns {JSX.Element} react component
 */
export const awRichTextAreaRenderFunction = ( props ) => {
    const {
        viewModel,
        ctxMin,
        actions,
        i18n,
        fields,
        grids,
        formProp,
        messages,
        ...prop
    } = props;

    return (
        <AwPropertyLabel {...prop}>
            <AwPropertyRichTextAreaVal className={ getValClass( prop ) } {...prop} />
        </AwPropertyLabel>
    );
};
