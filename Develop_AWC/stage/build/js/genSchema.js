/* eslint-env es6 */
/* eslint-disable require-atomic-updates */
/* eslint-disable no-await-in-loop */
/* eslint-disable complexity */
/* eslint-disable require-jsdoc */

const { basename, join } = require( 'path' );
const { readJson } = require( 'fs-extra' );
const glob = require( 'glob' );

const logger = require( '@swf/tooling/js/logger' );
const { getRequiredSoa } = require( '@swf/tooling/rewired/utils' );

/**
 * Generate the schema json configuration
 *
 * @return {Function} Stringified processed schema.json
 */
const createSchema = async() => {
    let requiredSoa = getRequiredSoa();
    const MSG_PREFIX = '  genSchema: ';
    const stopwatch = new logger.Stopwatch();

    const schemaInfo = {
        primitives: {},
        releases: {},
        genericTypes: {},
        operationTemplates: {}
    };

    const templates = {};
    const requiredPaths = {};

    // Remove duplicate & more specific filters for required SOAs
    requiredSoa.sort();
    for( let ii = 1; ii < requiredSoa.length; ii++ ) {
        if( requiredSoa[ ii ].includes( requiredSoa[ ii - 1 ] ) ) {
            requiredSoa.splice( ii, 1 ); // remove
            ii--;
        }
    }
    for( const i in requiredSoa ) {
        const soaPath = requiredSoa[ i ].split( '.' );
        // An entire template is required
        if( soaPath.length > 0 ) {
            if( !requiredPaths[ soaPath[ 0 ] ] ) {
                requiredPaths[ soaPath[ 0 ] ] = {};
            } else {
                // A previous kit required the entire template already
                if( Object.keys( requiredPaths[ soaPath[ 0 ] ] ).length === 0 ) {
                    continue;
                }
            }
        }
        if( soaPath.length > 1 ) {
            if( !requiredPaths[ soaPath[ 0 ] ][ soaPath[ 1 ] ] ) {
                requiredPaths[ soaPath[ 0 ] ][ soaPath[ 1 ] ] = {};
            } else {
                // A previous kit required the entire template/type already
                if( Object.keys( requiredPaths[ soaPath[ 0 ] ][ soaPath[ 1 ] ] ).length === 0 ) {
                    continue;
                }
            }
        }
        if( soaPath.length > 2 ) {
            if( !requiredPaths[ soaPath[ 0 ] ][ soaPath[ 1 ] ][ soaPath[ 2 ] ] ) {
                requiredPaths[ soaPath[ 0 ] ][ soaPath[ 1 ] ][ soaPath[ 2 ] ] = {};
            } else {
                // A previous kit required the entire template/type/lib already
                if( Object.keys( requiredPaths[ soaPath[ 0 ] ][ soaPath[ 1 ] ][ soaPath[ 2 ] ] ).length === 0 ) {
                    continue;
                }
            }
        }
        if( soaPath.length > 3 ) {
            if( !requiredPaths[ soaPath[ 0 ] ][ soaPath[ 1 ] ][ soaPath[ 2 ] ][ soaPath[ 3 ] ] ) {
                requiredPaths[ soaPath[ 0 ] ][ soaPath[ 1 ] ][ soaPath[ 2 ] ][ soaPath[ 3 ] ] = {};
            } else {
                // A previous kit required the entire template/type/lib/year already
                if( Object.keys( requiredPaths[ soaPath[ 0 ] ][ soaPath[ 1 ] ][ soaPath[ 2 ] ][ soaPath[ 3 ] ] ).length === 0 ) {
                    continue;
                }
            }
        }
        if( soaPath.length > 4 ) {
            if( !requiredPaths[ soaPath[ 0 ] ][ soaPath[ 1 ] ][ soaPath[ 2 ] ][ soaPath[ 3 ] ][ soaPath[ 4 ] ] ) {
                requiredPaths[ soaPath[ 0 ] ][ soaPath[ 1 ] ][ soaPath[ 2 ] ][ soaPath[ 3 ] ][ soaPath[ 4 ] ] = {};
            } else {
                // A previous kit required the entire template/type/lib/year/service already
                if( Object.keys( requiredPaths[ soaPath[ 0 ] ][ soaPath[ 1 ] ][ soaPath[ 2 ] ][ soaPath[ 3 ] ][ soaPath[ 4 ] ] ).length === 0 ) {
                    continue;
                }
            }
        }
        if( soaPath.length > 5 ) {
            if( !requiredPaths[ soaPath[ 0 ] ][ soaPath[ 1 ] ][ soaPath[ 2 ] ][ soaPath[ 3 ] ][ soaPath[ 4 ] ][ soaPath[ 5 ] ] ) {
                requiredPaths[ soaPath[ 0 ] ][ soaPath[ 1 ] ][ soaPath[ 2 ] ][ soaPath[ 3 ] ][ soaPath[ 4 ] ][ soaPath[ 5 ] ] = {};
            } else {
                // operation already required - as specific as possible
            }
        }
    }

    function isRequired( template, type, lib, year, service, operation ) {
        if( requiredPaths[ template ] ) {
            if( Object.keys( requiredPaths[ template ] ).length === 0 ) {
                return true; // entire template required
            }
            if( requiredPaths[ template ][ type ] ) {
                if( Object.keys( requiredPaths[ template ][ type ] ).length === 0 ) {
                    return true; // entire template/type required
                }
                if( requiredPaths[ template ][ type ][ lib ] ) {
                    if( Object.keys( requiredPaths[ template ][ type ][ lib ] ).length === 0 ) {
                        return true; // entire template/type/lib required
                    }
                    if( requiredPaths[ template ][ type ][ lib ][ year ] ) {
                        if( Object.keys( requiredPaths[ template ][ type ][ lib ][ year ] ).length === 0 ) {
                            return true; // entire template/type/lib/year required
                        }
                        if( requiredPaths[ template ][ type ][ lib ][ year ][ service ] ) {
                            if( Object.keys( requiredPaths[ template ][ type ][ lib ][ year ][ service ] ).length === 0 ) {
                                return true; // entire template/type/lib/year/service required
                            }
                            if( requiredPaths[ template ][ type ][ lib ][ year ][ service ][ operation ] ) {
                                return true; // specific operation is required
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    function initNamespace( structuredJson, namespace ) {
        if( namespace !== '' ) {
            const inits = namespace.split( '::' );

            let temp = structuredJson;
            while( inits.length > 0 ) {
                const index = inits.shift();
                if( !temp[ index ] ) {
                    temp[ index ] = {};
                }
                temp = temp[ index ];
            }
        }
    }

    function setNamespaceProp( structuredJson, namespace, key, value ) {
        if( namespace !== '' ) {
            const inits = namespace.split( '::' );

            let temp = structuredJson;
            while( inits.length > 0 ) {
                const index = inits.shift();
                temp = temp[ index ];
            }

            temp[ key ] = value;
        } else {
            structuredJson[ key ] = value;
        }
    }

    function getNamespaceProp( structuredJson, namespace ) {
        const inits = namespace.split( '::' );

        // Need to make a deep copy of structuredJson so modifications don't affect the search (schema and structured need to be separate)
        let temp = structuredJson;
        while( inits.length > 0 ) {
            if( !temp ) {
                return null;
            }
            const index = inits.shift();
            temp = temp[ index ];
        }
        return temp ? JSON.parse( JSON.stringify( temp ) ) : null;
    }

    function retType( schemaPath, type ) {
        if( /\[\]$/.test( schemaPath ) ) {
            return `${type}[]`;
        }
        return type;
    }

    function addTypeToSchema( structuredJson, schema, url, schemaPath ) {
        // logger.info(schemaPath);
        if( /;/.test( schemaPath ) ) {
            const t1 = schemaPath.split( ';' )[ 0 ];
            const t2 = schemaPath.split( ';' )[ 1 ];
            return {
                key: addTypeToSchema( structuredJson, schema, url, t1 ),
                value: addTypeToSchema( structuredJson, schema, url, t2 )
            };
        }

        const type = schemaPath.replace( /\[\]$/, '' );
        if( !schemaInfo.primitives[ type ] ) {
            if( schema[ url ][ type ] ) {
                // type already found
                return retType( schemaPath, type );
            }
            schema[ url ][ type ] = getNamespaceProp( structuredJson, schemaPath.replace( '[]', '' ) );
            // enums
            if( Array.isArray( schema[ url ][ type ] ) ) {
                return retType( schemaPath, type );
            } else if( typeof schema[ url ][ type ] === 'object' ) {
                // structs
                for( const i in schema[ url ][ type ] ) {
                    schema[ url ][ type ][ i ] = addTypeToSchema( structuredJson, schema, url, schema[ url ][ type ][ i ] );
                }
                return retType( schemaPath, type );
            } else if( schema[ url ][ type ] ) {
                // maps and ModelObject
                if( /;/.test( schema[ url ][ type ] ) ) {
                    const t1 = schema[ url ][ type ].split( ';' )[ 0 ];
                    const t2 = schema[ url ][ type ].split( ';' )[ 1 ];
                    schema[ url ][ type ] = {
                        key: addTypeToSchema( structuredJson, schema, url, t1 ),
                        value: addTypeToSchema( structuredJson, schema, url, t2 )
                    };
                    return retType( schemaPath, type );
                }

                const t = schema[ url ][ type ];
                delete schema[ url ][ type ];
                return retType( schemaPath, t );
            }

            logger.severe( `${schemaPath} not found` );
            delete schema[ url ][ type ];
            return retType( schemaPath, 'IModelObject' );
        }

        return retType( schemaPath, schemaInfo.primitives[ type ] );
    }

    /**
     * Centralize logic for determining data type.
     *
     * @param {Object} dataTypeRefParam - data type reference parameter
     * @return {String} data type
     */
    function evaluateDataType( dataTypeRefParam ) {
        const dataType = dataTypeRefParam.dataType;
        if( dataType.search( /^std::vector</ ) > -1 ) {
            const extractDataType = dataType.substring( 12, dataType.length - 1 );
            return `${extractDataType}[]`;
        } else if( dataType === 'std::vector' ) {
            return `${evaluateDataType( dataTypeRefParam.DataTypeRefParam[ 0 ] )}[]`;
        }
        return dataType;
    }

    function loadStructs( structuredJson, structs ) {
        if( structs ) {
            for( const structLp of structs ) {
                // year is already included in namespace so no need to check createRelease
                initNamespace( structuredJson, structLp.namespace );

                const newStruct = {};
                for( const j in structLp.StructElement ) {
                    newStruct[ structLp.StructElement[ j ].name ] = evaluateDataType( structLp.StructElement[ j ].DataTypeRefParam[ 0 ] );
                }

                structLp.name = toUpperCaseString( structLp.name );

                setNamespaceProp( structuredJson, structLp.namespace, structLp.name, newStruct );
            }
        }
    }

    function loadEnums( structuredJson, enums ) {
        if( enums ) {
            for( const enumLp of enums ) {
                // year is already included in namespace so no need to check createRelease
                initNamespace( structuredJson, enumLp.namespace );

                const enumArr = [];
                for( const j in enumLp.MetaEnumLiteral ) {
                    enumArr.push( enumLp.MetaEnumLiteral[ j ].name );
                }

                setNamespaceProp( structuredJson, enumLp.namespace, enumLp.name, enumArr );
            }
        }
    }

    function loadMaps( structuredJson, maps ) {
        if( maps ) {
            for( const mapLp of maps ) {
                // year is already included in namespace so no need to check createRelease
                initNamespace( structuredJson, mapLp.namespace );

                const keyType = mapLp.DataTypeRefParam[ 0 ].DataTypeRefParam[ 0 ].dataType;
                const valueType = evaluateDataType( mapLp.DataTypeRefParam[ 0 ].DataTypeRefParam[ 1 ] );

                mapLp.name = toUpperCaseString( mapLp.name );

                setNamespaceProp( structuredJson, mapLp.namespace, mapLp.name, `${keyType};${valueType}` );
            }
        }
    }

    function loadOperations( structuredJson, ops ) {
        if( ops ) {
            for( const opsLp of ops ) {
                if( !schemaInfo.releases.hasOwnProperty( opsLp.createRelease ) ) {
                    logger.warn( `Unknown release "${opsLp.createRelease}" for operation ${opsLp.name}`, MSG_PREFIX );
                    continue;
                }
                const serviceYear = schemaInfo.releases[ opsLp.createRelease ].year;
                if( opsLp.isPublished === 'true' ) { // string not a boolean (so ops[i].isPublished is always true)
                    const opsPath = opsLp.interface.split( '::' );
                    const t1 = opsPath.pop();
                    opsPath.push( serviceYear );
                    opsPath.push( t1 );
                    opsLp.namespace = opsPath.join( '::' );
                } else {
                    const opsPath = opsLp.interface.split( '::' );
                    const t1 = opsPath.pop();
                    const t2 = opsPath.pop();
                    opsPath.push( 'Internal' );
                    opsPath.push( t2 );
                    opsPath.push( serviceYear );
                    opsPath.push( t1 );
                    opsLp.namespace = opsPath.join( '::' );
                }
                initNamespace( structuredJson, opsLp.namespace );

                const newOp = {};

                const template = schemaInfo.operationTemplates[ opsLp.opTemplate ];
                for( const j in template.OperationParameter ) {
                    newOp[ template.OperationParameter[ j ].name ] = evaluateDataType( template.OperationParameter[ j ].OperationParameterDataTypeRef[ 0 ] );
                }

                opsLp.name = toLowerCaseString( opsLp.name );

                setNamespaceProp( structuredJson, opsLp.namespace, opsLp.name, newOp );
            }
        }
    }

    function setDefaults( structuredJson ) {
        setNamespaceProp( structuredJson, 'std', 'string', 'String' );
        setNamespaceProp( structuredJson, 'Teamcenter', 'DateTime', 'Date' );
        setNamespaceProp( structuredJson, 'Teamcenter::Soa', 'ModelSchema', 'IModelSchema' );
        setNamespaceProp( structuredJson, 'Teamcenter::Soa', 'PartialErrors', 'IPartialErrors' );
        setNamespaceProp( structuredJson, 'Teamcenter::Soa', 'Preferences', 'IPreferences' );
        setNamespaceProp( structuredJson, 'Teamcenter::Soa', 'ServiceData', 'IServiceData' );
        setNamespaceProp( structuredJson, 'Teamcenter::Soa', 'ServiceException', 'IServiceException' );
        setNamespaceProp( structuredJson, 'Teamcenter::Soa::Common', 'ObjectPropertyPolicy', 'IObjectPropertyPolicy' );
        setNamespaceProp( structuredJson, 'Teamcenter::Soa::Common', 'PolicyType', 'IPolicyType' );
        setNamespaceProp( structuredJson, 'Teamcenter::Soa::Server', 'CreateInput', 'ICreateInput' );

        schemaInfo.primitives.bool = 'boolean';
        schemaInfo.primitives.char = 'char';
        schemaInfo.primitives.double = 'double';
        schemaInfo.primitives.float = 'float';
        schemaInfo.primitives.int = 'int';
        schemaInfo.primitives.String = 'String';
        schemaInfo.primitives.boolean = 'boolean';
        schemaInfo.primitives.Date = 'Date';
        schemaInfo.primitives.IModelObject = 'IModelObject';
    }

    function generateStructure() {
        const structuredJson = {};
        // Initializes all of the base information (base types, release dates, etc )
        for( const template of Object.values( templates ) ) {
            // Not necessary, handled by setDefaults function
            // for(const i in template.PrimitiveDataType){
            //     schemaInfo.primitives[template.PrimitiveDataType[i].name] = '';
            // }
            if( template.BusinessObjectInterface ) {
                for( const boi of template.BusinessObjectInterface ) {
                    initNamespace( structuredJson, boi.namespace );
                    setNamespaceProp( structuredJson, boi.namespace, boi.name, 'IModelObject' );
                }
            }
            if( template.ExternalDataType ) {
                for( const edt of template.ExternalDataType ) {
                    initNamespace( structuredJson, edt.namespace );
                    setNamespaceProp( structuredJson, edt.namespace, edt.name, '' );
                }
            }
            if( template.TemplateDataType ) {
                for( const tdt of template.TemplateDataType ) {
                    schemaInfo.genericTypes[ `${tdt.namespace}::${tdt.name}` ] = {
                        argsLength: tdt.numberOfArguments
                    };
                }
            }
            if( template.Release ) {
                for( const r of template.Release ) {
                    schemaInfo.releases[ r.name ] = {
                        year: r.serviceVersion,
                        name: r.description
                    };
                }
            }
            if( template.OperationTemplate ) {
                for( const ot of template.OperationTemplate ) {
                    schemaInfo.operationTemplates[ ot.id ] = ot;
                }
            }
        }
        setDefaults( structuredJson );
        for( const template of Object.values( templates ) ) {
            if( template !== '' ) {
                loadStructs( structuredJson, template.Struct );
                loadEnums( structuredJson, template.MetaEnum );
                loadMaps( structuredJson, template.Typedef );
                loadOperations( structuredJson, template.Operation );
            }
        }
        return structuredJson;
    }

    function generateSchema( structuredJson ) {
        // generate schema
        const schema = {};
        for( const [ templateName, templateLp ] of Object.entries( structuredJson ) ) {
            if( !templateLp.Soa ) {
                // template only contains structures - like std
                continue;
            }
            for( const [ libName, libLp ] of Object.entries( templateLp.Soa ) ) {
                // Internal is another layer not a library
                if( libName === 'Internal' ) {
                    continue; // skip
                }
                for( const year in libLp ) {
                    for( const service in libLp[ year ] ) {
                        for( const op in libLp[ year ][ service ] ) {
                            if( isRequired( templateName, 'Soa', libName, year, service, op ) ) {
                                if( typeof libLp[ year ][ service ][ op ] !== 'object' ) {
                                    continue;
                                }
                                const url = libName + year.replace( /_/g, '-' ) + '-' + service;
                                if( !schema[ url ] ) {
                                    schema[ url ] = {};
                                }
                                // first letter of operations is always lowercase (ensured while building structure)
                                // for each operation check which structs are required and load them into schema
                                if( op.charAt( 0 ) === op.charAt( 0 ).toLowerCase() ) {
                                    // logger.info('Adding ' + url + '/' + op);
                                    schema[ url ][ op ] = JSON.parse( JSON.stringify( libLp[ year ][ service ][ op ] ) );
                                    if( !Array.isArray( schema[ url ][ op ] ) && typeof schema[ url ][ op ] === 'object' ) {
                                        for( const i in schema[ url ][ op ] ) {
                                            schema[ url ][ op ][ i ] = addTypeToSchema( structuredJson, schema, url, schema[ url ][ op ][ i ] );
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if( templateLp.Soa.Internal ) {
                for( const [ libName, libLp ] of Object.entries( templateLp.Soa.Internal ) ) {
                    for( const year in libLp ) {
                        for( const service in libLp[ year ] ) {
                            for( const op in libLp[ year ][ service ] ) {
                                if( isRequired( templateName, 'Soa', libName, year, service, op ) ) {
                                    if( typeof libLp[ year ][ service ][ op ] !== 'object' ) {
                                        continue;
                                    }
                                    const url = 'Internal-' + libName + year.replace( /_/g, '-' ) + '-' + service;
                                    if( !schema[ url ] ) {
                                        schema[ url ] = {};
                                    }
                                    if( op.charAt( 0 ) === op.charAt( 0 ).toLowerCase() ) {
                                        // logger.info('Adding ' + url + '/' + op);
                                        schema[ url ][ op ] = JSON.parse( JSON.stringify( libLp[ year ][ service ][ op ] ) );
                                        if( !Array.isArray( schema[ url ][ op ] ) && typeof schema[ url ][ op ] === 'object' ) {
                                            for( const i in schema[ url ][ op ] ) {
                                                schema[ url ][ op ][ i ] = addTypeToSchema( structuredJson, schema, url, schema[ url ][ op ][ i ] );
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // filter known maps from schema
        for( const url in schema ) {
            for( const type in schema[ url ] ) {
                if( /::(String|Int|Bool|Double|Float|Date|Tag)(|Vector)Map/.test( type ) ) {
                    delete schema[ url ][ type ];
                }
            }
        }
        return schema;
    }

    function compressSchema( schema ) {
        for( const opSchema of Object.values( schema ) ) {
            const types = Object.keys( opSchema );
            const toConvert = {};
            for( const schemaPath of types ) {
                if( /::/.test( schemaPath ) ) {
                    const schemaPathArray = schemaPath.split( '::' );
                    const typeName = schemaPathArray[ schemaPathArray.length - 1 ];

                    let found = false;
                    for( const schemaPath2 of types ) {
                        if( schemaPath !== schemaPath2 && schemaPath2.endsWith( `::${typeName}` ) ) {
                            found = true;
                        }
                    }

                    if( !found ) {
                        toConvert[ schemaPath ] = typeName;
                    }
                }
            }

            // Rename the immediate children
            for( const [ oldName, newName ] of Object.entries( toConvert ) ) {
                opSchema[ newName ] = opSchema[ oldName ];
                delete opSchema[ oldName ];
            }

            // Update the references
            for( const defn of Object.values( opSchema ) ) {
                if( defn ) {
                    for( const [ fieldName, typeName ] of Object.entries( defn ) ) {
                        const oldName = typeName.replace( /\[\]$/, '' );
                        const newName = toConvert[ oldName ];
                        if( newName ) {
                            defn[ fieldName ] = typeName.replace( oldName, newName );
                        } else if( /::(String|Int|Bool|Double|Float|Date|Tag)(|Vector)Map/.test( typeName ) ) {
                            // Special case since we don't need entries for Maps
                            const schemaPathArray = typeName.split( '::' );
                            const shortName = schemaPathArray[ schemaPathArray.length - 1 ];
                            defn[ fieldName ] = typeName.replace( oldName, shortName );
                        }
                    }
                }
            }
        }
    }

    async function processFiles( relPath ) {
        const files = glob.sync( join( process.cwd(), relPath ) );
        for( const file of files ) {
            const filename = basename( file, '_template.json' );
            if( !templates[ filename ] ) {
                templates[ filename ] = await readJson( file );
            }
        }
    }

    await processFiles( 'out/soa/json/*_template.json' );
    await processFiles( 'src/soa/json/*_template.json' );
    await processFiles( 'node_modules/.cache/schema/json/*_template.json' );

    const structuredJson = generateStructure();
    const schema = generateSchema( structuredJson );
    compressSchema( schema );
    const output = JSON.stringify( schema, null, 2 ).replace( /IModelObject/g, 'ModelObj' );
    logger.debug( ` ... generated genSchema output${stopwatch.end()}`, MSG_PREFIX );
    return output;
};

function toUpperCaseString( str ) {
    if( str.charAt( 0 ) === str.charAt( 0 ).toUpperCase() ) {
        return str;
    }
    return str.charAt( 0 ).toUpperCase() + str.slice( 1 );
}

function toLowerCaseString( str ) {
    if( str.charAt( 0 ) === str.charAt( 0 ).toLowerCase() ) {
        return str;
    }
    return str.charAt( 0 ).toLowerCase() + str.slice( 1 );
}

module.exports = {
    createSchema
};
