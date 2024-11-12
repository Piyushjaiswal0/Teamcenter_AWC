const fs = require( 'fs' );

const generatorUtils = require( '@swf/tooling/js/generator' );
const logger = require( '@swf/tooling/js/logger' );

const messages = {
    nameInputMsg: logger.infoColor( 'Enter name of the icon to use. This will create a type_icon-name_48.svg in src/image folder if it does not already exist' ) + '\nIcon name: ',
    typeInputMsg: logger.infoColor( 'Enter the types to use. This is a comma separated list of type names' ) + '\nTypes: '
};

const filesToCreate = {
    '__type-name__.svg': {
        dir: '%ROOT%/src/image/'
    }
};

module.exports.name = 'type';
module.exports.description =
    `Generates a type.
This will allow you to define a custom type icon for a type.`;
module.exports.execute = async function() {
    const targetModuleJson = await generatorUtils.getModule();
    // Init aliasRegistry if necessary
    if( !targetModuleJson.aliasRegistry ) {
        targetModuleJson.aliasRegistry = {};
    }
    let iconName = await generatorUtils.getUserInput( '-n', messages.nameInputMsg );
    iconName = `type${iconName}48`;
    if( !targetModuleJson.aliasRegistry[ iconName ] ) {
        targetModuleJson.aliasRegistry[ iconName ] = [];
    }
    const typeInput = await generatorUtils.getUserInput( '-types', messages.typeInputMsg );
    // Add types to list and sort
    let types = typeInput.split( ',' );
    types.forEach( function( type ) {
        if( targetModuleJson.aliasRegistry[ iconName ].indexOf( type ) === -1 ) {
            targetModuleJson.aliasRegistry[ iconName ].push( type );
        }
    } );
    targetModuleJson.aliasRegistry[ iconName ].sort();
    var placeholder2Value = {
        '__type-name__': iconName
    };
    let filePath = `${process.env.ROOT}/src/image/${placeholder2Value['__type-name__']}.svg`;
    if( fs.existsSync( filePath ) ) {
        delete filesToCreate[ '__type-name__.svg' ];
    }
    // Write changes back to OS
    await Promise.all( [
        generatorUtils.writeBuildJson( targetModuleJson ),
        generatorUtils.createFiles( targetModuleJson, filesToCreate, placeholder2Value )
    ] );
};
