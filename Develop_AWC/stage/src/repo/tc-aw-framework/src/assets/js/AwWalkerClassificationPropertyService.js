import uwPropertySvc from 'js/uwPropertyService';
import AwWidget from 'viewmodel/AwWidgetViewModel';
import AwPropertyNonEditVal from 'viewmodel/AwPropertyNonEditValViewModel';

export const awWalkerClassificationPropertyOnMountFunction = ( classification ) => {
    const classificationTrace = uwPropertySvc.createViewModelProperty( null, null, 'STRING',
    classification.classificationTrace, [ classification.classificationTrace ] );
    let classificationProperties = [];
    classification.classificationProperties.map( function( classificationProp) {
        let attrType = 'STRING';
        let isArray = Array.isArray( classificationProp.value );
        if( isArray ) {
            attrType = 'STRINGARRAY';
        }

        let prop = uwPropertySvc.createViewModelProperty( classificationProp.name,
            classificationProp.name, attrType, classificationProp.value,
            classificationProp.value );

        if( isArray ) {
            uwPropertySvc.setIsArray( prop, isArray );
        }
        classificationProperties.push( prop );
    } );

    return { 
        classificationTrace: classificationTrace,
        classificationProperties: classificationProperties
     };
};

export const awWalkerClassificationPropertyRenderFunction = ( {fields} ) => {
    if( fields.classificationTrace  ) {
        return <div>
            <AwPropertyNonEditVal { ...fields.classificationTrace }></AwPropertyNonEditVal>
            { fields.classificationProperties && Array.isArray( fields.classificationProperties) && 
                fields.classificationProperties.map( function( classificationProperty, index ) {
                    return <AwWidget { ...classificationProperty } key={index} class='aw-walker-classificationproperties'></AwWidget>;
                }) 
            }
        </div>;
    }
};
