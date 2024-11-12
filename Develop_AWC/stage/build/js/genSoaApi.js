const { src, dest } = require( '@swf/tooling/js/orchestrator' );
const logger = require( '@swf/tooling/js/logger' );
const util = require( '@swf/tooling/js/util' );
const { forEach } = require( 'lodash' );

const trace = logger.createTrace( __filename );

/**
 * Generate SOA API viewer from the SOA template JSON files in src\out & out\soa\json.
 *
 * @param {Function} cb - call function to invoke when generation is complete
 */
module.exports.generate = async function() {
    module.exports._localVars = {
        MSG_PREFIX: 'genSoaApi: ',
        srcDir: 'src/soa',
        outSrcDir: 'out/soa/json',
        outDir: 'out/soa/api',
        schemaInfo: {
            primitives: {},
            releases: {},
            operationTemplates: {}
        },
        templates: {},
        structuredJson: {}
    };

    // Copy the HTML files.
    await src( [
        `${module.exports._localVars.srcDir}/viewer/index.html`,
        `${module.exports._localVars.srcDir}/viewer/api.js`
    ] ).then( result =>{
        return dest( result, module.exports._localVars.outDir, { mode:0o777 } );
    } );

    // create structure
    await src( [ module.exports._localVars.srcDir + '/json/*_template.json',
        module.exports._localVars.outSrcDir + '/*_template.json'
    ] ).then( result =>{
        forEach( result, file =>{
            logger.debug( 'Loading ' + util.shortenPath( file.path ), module.exports._localVars.MSG_PREFIX );
            module.exports._localVars.templates[ file.relative.split( '_' )[ 0 ] ] = JSON.parse( file.contents.toString() );
        } );
    } );

    await generateStructure();
};

/**
 * Initialize namespace.
 *
 * @param {String} namespace - name space
 */
function initNamespace( namespace ) {
    if( namespace !== '' ) {
        const inits = namespace.split( '::' );

        let temp = module.exports._localVars.structuredJson;
        while( inits.length > 0 ) {
            const index = inits.shift();
            if( !temp[ index ] ) {
                temp[ index ] = {};
            }
            temp = temp[ index ];
        }
    }
}

/**
 * @param {String} namespace - namespace
 * @param {String} key - key
 * @param {String} value - value
 */
function setNamespaceProp( namespace, key, value ) {
    if( namespace ) {
        const inits = namespace.split( '::' );

        let temp = module.exports._localVars.structuredJson;
        while( inits.length > 0 ) {
            const index = inits.shift();
            if( temp.hasOwnProperty( index ) ) {
                temp = temp[ index ];
            }
        }

        temp[ key ] = value;
    } else {
        module.exports._localVars.structuredJson[ key ] = value;
    }
}

/**
 * @param {String} path - path
 * @return {Object} namespace property
 */
function getNamespaceProp( path ) {
    const inits = path.split( '::' );

    // Need to make a deep copy of structuredJson so modifications don't affect the search (schema and structured need to be separate)
    let temp = module.exports._localVars.structuredJson;
    while( inits.length > 0 ) {
        if( !temp ) {
            return null;
        }
        const index = inits.shift();
        temp = temp[ index ];
    }
    try {
        return JSON.parse( JSON.stringify( temp ) );
    } catch ( err ) {
        logger.severe( 'Error processing path = ' + path + '\n' + err );
    }
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
        return extractDataType + '[]';
    } else if( dataType === 'std::vector' ) {
        return evaluateDataType( dataTypeRefParam.DataTypeRefParam[ 0 ] ) + '[]';
    }
    return dataType;
}

/**
 * Load structs
 *
 * @param {Array} structs - structs
 */
function loadStructs( structs ) {
    for( const i in structs ) {
        // year is already included in namespace so no need to check createRelease
        initNamespace( structs[ i ].namespace );

        const newStruct = {};
        for( const j in structs[ i ].StructElement ) {
            newStruct[ structs[ i ].StructElement[ j ].name ] = {
                type: evaluateDataType( structs[ i ].StructElement[ j ].DataTypeRefParam[ 0 ] ),
                description: structs[ i ].StructElement[ j ].description
            };
        }

        structs[ i ].name = toUpperCaseString( structs[ i ].name );

        setNamespaceProp( structs[ i ].namespace, structs[ i ].name, newStruct );
    }
}

/**
 * Load enumerations.
 *
 * @param {Array} enums - enums
 */
function loadEnums( enums ) {
    for( const i in enums ) {
        // year is already included in namespace so no need to check createRelease
        initNamespace( enums[ i ].namespace );

        const enumArr = [];
        for( const j in enums[ i ].MetaEnumLiteral ) {
            enumArr.push( enums[ i ].MetaEnumLiteral[ j ].name );
        }

        enums[ i ].name = toUpperCaseString( enums[ i ].name );

        setNamespaceProp( enums[ i ].namespace, enums[ i ].name, enumArr );
    }
}

/**
 * Load maps.
 *
 * @param {Array} maps - maps
 */
function loadMaps( maps ) {
    for( const i in maps ) {
        // year is already included in namespace so no need to check createRelease
        initNamespace( maps[ i ].namespace );

        const keyType = maps[ i ].DataTypeRefParam[ 0 ].DataTypeRefParam[ 0 ].dataType;
        const valueType = evaluateDataType( maps[ i ].DataTypeRefParam[ 0 ].DataTypeRefParam[ 1 ] );

        maps[ i ].name = toUpperCaseString( maps[ i ].name );

        setNamespaceProp( maps[ i ].namespace, maps[ i ].name, keyType + ';' + valueType );
    }
}

/**
 * Load operations.
 *
 * @param {Array} ops - operations
 */
function loadOperations( ops ) {
    const schemaInfo = module.exports._localVars.schemaInfo;
    for( const i in ops ) {
        if( !schemaInfo.releases.hasOwnProperty( ops[ i ].createRelease ) ) {
            logger.severe( 'Unknown release "' + ops[ i ].createRelease + '" for operation ' + ops[ i ].name, module.exports._localVars.MSG_PREFIX );
            trace( 'loadOperations skip', ops[ i ] );
            continue;
        }
        const serviceYear = schemaInfo.releases[ ops[ i ].createRelease ].year;
        if( ops[ i ].isPublished === 'true' ) { // string not a boolean (so ops[i].isPublished is always true)
            const path = ops[ i ].interface.split( '::' );
            const t1 = path.pop();
            path.push( serviceYear );
            path.push( t1 );
            ops[ i ].namespace = path.join( '::' );
        } else if( process.env.SOAGENAPI_INCLUDE_UNPUBLISHED === 'true' ) {
            const path = ops[ i ].interface.split( '::' );
            const t1 = path.pop();
            const t2 = path.pop();
            path.push( 'Internal' );
            path.push( t2 );
            path.push( serviceYear );
            path.push( t1 );
            ops[ i ].namespace = path.join( '::' );
        } else {
            // skip internal APIs by default
            // https://mypolarion.industrysoftware.automation.siemens.com/polarion/#/project/Teamcenter/workitem?id=LCS-151890
            trace( 'loadOperations skip', ops[ i ] );
            continue;
        }
        initNamespace( ops[ i ].namespace );

        const newOp = {
            input: {},
            output: '',
            description: ''
        };

        const template = schemaInfo.operationTemplates[ ops[ i ].opTemplate ];
        for( const j in template.OperationParameter ) {
            newOp.input[ template.OperationParameter[ j ].name ] = {
                type: evaluateDataType( template.OperationParameter[ j ].OperationParameterDataTypeRef[ 0 ] ),
                description: template.OperationParameter[ j ].description
            };
        }
        newOp.output = template.OperationReturnDataTypeRef[ 0 ].dataType;
        if( !schemaInfo.primitives[ newOp.output.replace( '[]', '' ) ] ) {
            newOp.output = getNamespaceProp( newOp.output );
        }
        newOp.description = ops[ i ].description + '<br>';
        if( ops[ i ].useCase !== '' ) {
            newOp.description += '<br><b>Use Cases: </b><br>' + ops[ i ].useCase + '<br>';
        }
        newOp.description += '<br><b>Returns:</b><br>' + ops[ i ].returnDescription + '<br>';

        ops[ i ].name = toLowerCaseString( ops[ i ].name );

        setNamespaceProp( ops[ i ].namespace, ops[ i ].name, newOp );
    }
}

/**
 * Set defaults.
 */
function setDefaults() {
    setNamespaceProp( 'std', 'string', 'String' );
    setNamespaceProp( 'Teamcenter', 'DateTime', 'Date' );
    setNamespaceProp( 'Teamcenter::Soa', 'ModelSchema', 'IModelSchema' );
    setNamespaceProp( 'Teamcenter::Soa::Server', 'ModelSchema', 'IModelSchema' );
    setNamespaceProp( 'Teamcenter::Soa', 'PartialErrors', 'IPartialErrors' );
    setNamespaceProp( 'Teamcenter::Soa::Server', 'PartialErrors', 'IPartialErrors' );
    setNamespaceProp( 'Teamcenter::Soa', 'Preferences', 'IPreferences' );
    setNamespaceProp( 'Teamcenter::Soa::Server', 'Preferences', 'IPreferences' );
    setNamespaceProp( 'Teamcenter::Soa', 'ServiceData', 'IServiceData' );
    setNamespaceProp( 'Teamcenter::Soa::Server', 'ServiceData', 'IServiceData' );
    setNamespaceProp( 'Teamcenter::Soa', 'ServiceException', 'IServiceException' );
    setNamespaceProp( 'Teamcenter::Soa::Server', 'ServiceException', 'IServiceException' );
    setNamespaceProp( 'Teamcenter::Soa::Common', 'ObjectPropertyPolicy', 'IObjectPropertyPolicy' );
    setNamespaceProp( 'Teamcenter::Soa::Common', 'PolicyType', 'IPolicyType' );
    setNamespaceProp( 'Teamcenter::Soa::Server', 'CreateInput', 'ICreateInput' );

    const schemaInfo = module.exports._localVars.schemaInfo;
    schemaInfo.primitives.bool = 'boolean';
    schemaInfo.primitives.char = 'char';
    schemaInfo.primitives.double = 'double';
    schemaInfo.primitives.float = 'float';
    schemaInfo.primitives.int = 'int';
    schemaInfo.primitives.void = 'null';
    schemaInfo.primitives.String = 'String';
    schemaInfo.primitives.boolean = 'boolean';
    schemaInfo.primitives.Date = 'Date';
    schemaInfo.primitives.IModelObject = 'IModelObject';
    schemaInfo.primitives.tag_t = 'tag_t';
}

/**
 * Generate structure.
 */
async function generateStructure() {
    // Initializes all of the base information (base types, release dates, etc )
    const schemaInfo = module.exports._localVars.schemaInfo;
    for( const template in module.exports._localVars.templates ) {
        const add = module.exports._localVars.templates[ template ]; // ignore the removes and modifies
        for( const i in add.BusinessObjectInterface ) {
            initNamespace( add.BusinessObjectInterface[ i ].namespace );
            setNamespaceProp( add.BusinessObjectInterface[ i ].namespace, add.BusinessObjectInterface[ i ].name, 'IModelObject' );
        }
        for( const i in add.ExternalDataType ) {
            initNamespace( add.ExternalDataType[ i ].namespace );
            setNamespaceProp( add.ExternalDataType[ i ].namespace, add.ExternalDataType[ i ].name, '' );
        }
        for( const i in add.Release ) {
            schemaInfo.releases[ add.Release[ i ].name ] = {
                year: add.Release[ i ].serviceVersion,
                name: add.Release[ i ].description
            };
        }
        for( const i in add.OperationTemplate ) {
            schemaInfo.operationTemplates[ add.OperationTemplate[ i ].id ] = add.OperationTemplate[ i ];
        }
    }
    setDefaults();
    for( const template in module.exports._localVars.templates ) {
        const add = module.exports._localVars.templates[ template ];
        if( add !== '' ) {
            loadStructs( add.Struct );
            loadEnums( add.MetaEnum );
            loadMaps( add.Typedef );
            loadOperations( add.Operation );
        }
    }
    logger.success( 'Api documentation created in ' + util.shortenPath( module.exports._localVars.outDir + '/index.html' ), module.exports._localVars.MSG_PREFIX );
    await util.writeFile( module.exports._localVars.outDir + '/structure.js', 'const data = \n' + JSON.stringify( module.exports._localVars.structuredJson ) );
}

/**
 * @param {String} str - input string
 * @return {String} string converted to uppercase
 */
function toUpperCaseString( str ) {
    if( str.charAt( 0 ) === str.charAt( 0 ).toUpperCase() ) {
        return str;
    }
    return str.charAt( 0 ).toUpperCase() + str.slice( 1 );
}

/**
 * @param {String} str - input string
 * @return {String} string converted to lowercase
 */
function toLowerCaseString( str ) {
    if( str.charAt( 0 ) === str.charAt( 0 ).toLowerCase() ) {
        return str;
    }
    return str.charAt( 0 ).toLowerCase() + str.slice( 1 );
}
