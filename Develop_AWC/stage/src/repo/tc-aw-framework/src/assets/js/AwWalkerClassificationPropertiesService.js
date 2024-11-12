import AwWalkerClassificationProperty from 'viewmodel/AwWalkerClassificationPropertyViewModel';

export const awWalkerClassificationPropertiesRenderFunction = ( props ) => {
    const { classificationdata } = props;
    if( classificationdata ) {
        return <div>
        {
            classificationdata.classifications.map( function( classification, index ) {
                return <AwWalkerClassificationProperty classification ={classification} key={index}></AwWalkerClassificationProperty>;
            })
        }
        </div>;
    }
};
