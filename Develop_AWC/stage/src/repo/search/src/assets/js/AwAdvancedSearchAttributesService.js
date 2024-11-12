// Copyright (c) 2021 Siemens 
/* eslint-disable jsx-quotes */
import AwLink from 'viewmodel/AwLinkViewModel';
import AwWidget from 'viewmodel/AwWidgetViewModel';
import { VisibleWhen } from 'js/hocCollection';
import { getField } from 'js/utils';
import AwParseService from 'js/awParseService';
const AwLinkVisibleWhen = VisibleWhen( AwLink );


export const AwAdvancedSearchAttributesRenderFunction = ( props ) => {
    let subPanelContext = props.subPanelContext;
    let { fields } = props;
    if( subPanelContext && subPanelContext.fields ) {
        fields = { ...fields, ...subPanelContext.fields };
    }

    const showAttributes = () => {
        if ( props.attributes && hasAttributes() ) {
            let attributes = getAttributeList();
            return (
                <>
                    <span className="aw-search-advancedSearchClearAll">
                        <AwLink {...getField( 'data.advancedSearchClearAll', fields )} action={props.callBackAction} ></AwLink>
                    </span>
                    {attributes.map( ( attribute )=>getAttributeValues( attribute ) )}
                </>
            );
        }
        return null;
    };

    const hasAttributes = () => {
        for( const [ key, value ] of Object.entries( props.attributes ) ) {
            if( value && value.name ) {
                return true;
            }
        }
        return false;
    };

    const getAttributeList = () => {
        let attributes = [];
        for( const [ key, value ] of Object.entries( props.attributes ) ) {
            attributes.push( value );
        }
        return attributes;
    };

    const getAttributeValues = ( attribute ) => {
        let renderHint = '';
        if( attribute.typex === 'STRINGARRAY' ) {
            renderHint = 'checkboxoptionlov';
        } else if ( attribute.typex === 'BOOLEAN' ) {
            renderHint = 'triState';
        }
        return (
            <AwWidget {...attribute} hint={renderHint}></AwWidget>
        );
    };


    return (
        <>
            { showAttributes() }
        </>
    );
};