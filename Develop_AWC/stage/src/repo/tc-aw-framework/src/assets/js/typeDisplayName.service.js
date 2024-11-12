// Copyright (c) 2022 Siemens

/**
 * @module js/typeDisplayName.service
 */
import cmm from 'soa/kernel/clientMetaModel';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import _ from 'lodash';
import cfgSvc from 'js/configurationService';
import AwBaseService from 'js/awBaseService';
import 'config/typeProperties';

export default class TypeDisplayNameService extends AwBaseService {
    constructor() {
        super();
        //  FIXME this should be loaded async but before the sync API below that uses it is called
        this._typeProperties = cfgSvc.getCfgCached( 'typeProperties' );
        this.DEFAULT_DISPLAY_PROPERTY = 'object_string';
        this.IS_MODIFIABLE = 'is_modifiable';

        // Initialize

        /**
         * initialize the property policy from the required aw.properties which is generated as part of the build
         * from the typeProperties.json files.
         */
        var objectPropertyPolicy = {
            types: []
        };

        _.forEach( this._typeProperties, ( typeProperty, typeName )=> {
            if( typeProperty ) {
                if( typeProperty.additionalProperties ) {
                    objectPropertyPolicy.types.push( {
                        name: typeName,
                        properties: typeProperty.additionalProperties
                    } );
                }
                var displayPropertyName = this.getDisplayPropertyName( typeName );
                var objectPolicyType = TypeDisplayNameService.locateOrCreatePolicyType( objectPropertyPolicy, typeName );
                TypeDisplayNameService.locateOrCreatePolicyProperty( objectPolicyType, displayPropertyName );
            }
        } );

        // WARNING: Please do not remove IPropertyName.IS_MODIFIABLE, this property is used in a lot of places.
        // If you remove this property, then you need to visit all the places to make sure there is no regression.
        // Reference CP PLM391889 for more information.
        var isModifiableTypes = [ 'Awb0Element', 'Awp0XRTObjectSetRow', 'Fnd0TableRow', 'ImanRelation', 'Signoff',
            'WorkspaceObject'
        ];

        _.forEach( isModifiableTypes, ( typeName )=> {
            var objectPolicyType = TypeDisplayNameService.locateOrCreatePolicyType( objectPropertyPolicy, typeName );
            TypeDisplayNameService.locateOrCreatePolicyProperty( objectPolicyType, this.IS_MODIFIABLE );
        } );

        if( !_.isEmpty( objectPropertyPolicy.types ) ) {
            propertyPolicySvc.register( objectPropertyPolicy );

            //Register once for the entire life of application Global Property policy no unregister needed
            //that is why unregister is commented out but needed to pass static code analysis
            //propertyPolicySvc.unregister( xxx );
        }
    }
    /**
     * find or create an Property Policy object for a type
     *
     * @param {Object} objectPropertyPolicy
     * @param {String} typeName type name
     * @return {Object} property policy object for a given type
     */
    static locateOrCreatePolicyType( objectPropertyPolicy, typeName ) {
        var type = _.find( objectPropertyPolicy.types, function( o ) {
            return o.name === typeName;
        } );
        if( !type ) {
            type = {
                name: typeName
            };
            objectPropertyPolicy.types.push( type );
        }
        return type;
    }

    /**
     * find or create an Property Policy object for a property
     *
     * @param {Object} objectPolicyType Object policy type
     * @param {String} propertyName property name
     * @return {Object} Property Policy Object
     *
     */
    static locateOrCreatePolicyProperty( objectPolicyType, propertyName ) {
        if( !objectPolicyType.properties ) {
            objectPolicyType.properties = [];
        }
        var policyProperty = _.find( objectPolicyType.properties, ( p )=> {
            return p.name === propertyName;
        } );
        if( !policyProperty ) {
            policyProperty = {
                name: propertyName
            };
            objectPolicyType.properties.push( policyProperty );
        }
        return policyProperty;
    }

    /**
     * @param {String} typeName type name
     * @return {Object} type display property data
     */
    getTypeInfo( typeName ) {
        var typeDisplayPropertyData = this._typeProperties[ typeName ];

        if( typeDisplayPropertyData ) {
            return typeDisplayPropertyData;
        }

        var type = cmm.getType( typeName );

        if( type ) {
            for( var i = 1; i < type.typeHierarchyArray.length; i++ ) {
                typeDisplayPropertyData = this._typeProperties[ type.typeHierarchyArray[ i ] ];

                if( typeDisplayPropertyData ) {
                    return typeDisplayPropertyData;
                }
            }
        }
    }

    /**
     * This method will return the display property name for the given type Name
     *
     * @param {String} typeName
     * @return {String} display property name
     */
    getDisplayPropertyName( typeName ) {
        var typeDisplayPropertyData = this.getTypeInfo( typeName );
        if( typeDisplayPropertyData && typeDisplayPropertyData.displayProperty ) {
            return typeDisplayPropertyData.displayProperty;
        }
        return this.DEFAULT_DISPLAY_PROPERTY;
    }

    /**
     * This method will return the display name for the passed in ModelObject
     *
     * @param {Object} modelObject
     * @return {String} displayName
     */
    getDisplayName( modelObject ) {
        if( modelObject ) {
            var displayProperty = this.getDisplayPropertyName( modelObject.type );

            if( displayProperty && modelObject.props && modelObject.props[ displayProperty ] &&
                modelObject.props[ displayProperty ].uiValues &&
                modelObject.props[ displayProperty ].uiValues.length > 0 ) {
                return modelObject.props[ displayProperty ].uiValues[ 0 ];
            }

            var type = modelObject.modelType;
            if( !type ) {
                type = cmm.getType( modelObject.uid );
            }

            if( type ) {
                // Since the passed in "modelObject" was actually a ModelType, return the display value.
                return type.displayName;
            }

            // Default to showing the modelObject UID.
            return modelObject.uid;
        }
    }
}
