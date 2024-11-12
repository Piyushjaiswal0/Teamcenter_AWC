const generatorUtils = require( '@swf/tooling/js/generator' );
const logger = require( '@swf/tooling/js/logger' );

const messages = {
    description: `Generates a location.
A location groups sublocations together within Active Workspace.
Examples are "Inbox" and "Search"`,
    nameInputMsg: '\n' + logger.infoColor( `Give the location a name. This is the identifier sublocations will use to be placed within the location.
This will also be used as the initial title of the location.\n\n` ) + 'Location name: '
};

module.exports.name = 'location';
module.exports.description = messages.description;
module.exports.execute = async function() {
    const targetModuleJson = await generatorUtils.getModule();
    // Initialize the states
    if( !targetModuleJson.states ) {
        targetModuleJson.states = {};
    }
    var isValidLocationName = function( input ) {
        if( !input ) {
            return false;
        }
        if( input.indexOf( '.' ) !== -1 ) {
            logger.warn( 'Dots are reserved and cannot be used in location names' );
            return false;
        }
        if( targetModuleJson.states[ input ] ) {
            logger.warn( `${input} is already defined in module ${targetModuleJson.name}` );
            return false;
        }
        return true;
    };
    const location = await generatorUtils.getUserInput( '-n', messages.nameInputMsg, isValidLocationName );
    // Add the new location state
    targetModuleJson.states[ location ] = {
        data: {
            browserTitle: {
                source: '/i18n/' + targetModuleJson.name + 'Messages',
                key: location + 'BrowserTitle'
            },
            browserSubTitle: {
                source: '/i18n/' + targetModuleJson.name + 'Messages',
                key: location + 'BrowserSubTitle'
            },
            headerTitle: {
                source: '/i18n/' + targetModuleJson.name + 'Messages',
                key: location + 'HeaderTitle'
            }
        },
        view: 'AwSearchLocation',
        parent: 'root'
    };

    logger.info( `Added location state ${logger.nameColor( location )} to ${logger.nameColor( targetModuleJson.name )}` );

    var messageUpdate = {};
    [ 'HeaderTitle', 'BrowserTitle', 'BrowserSubTitle' ].forEach( function( key ) {
        messageUpdate[ location + key ] = location;
    } );

    // Update the message json file
    await Promise.all( [
        generatorUtils.writeBuildJson( targetModuleJson ),
        generatorUtils.updateModuleMessages( targetModuleJson, messageUpdate, {} )
    ] );
};
