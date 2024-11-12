const generatorUtils = require( '@swf/tooling/js/generator' );
const logger = require( '@swf/tooling/js/logger' );

const messages = {
    description: `Generates a subLocation.
sublocation is a page which can be accessed in Active Workspace. The standard view consists of a primary and secondary workarea.
Examples are "My Tasks" within "Inbox" location and "Results" within "Search" location`,
    nameInputMsg: logger.infoColor( '\nGive the sub-location a name. This is used as the URL and initial title of your sublocation.\n' ) + 'Sublocation name: ',
    locationInputMsg: logger.infoColor( '\nSelect a location to add this sub-location to. Available locations are: \n' ),
    locationInputRequestMsg: '\n\nLocation name: '
};

module.exports.name = 'subLocation';
module.exports.description = messages.description;

var getLocations = function( moduleJson ) {
    if( moduleJson.states ) {
        return Object.keys( moduleJson.states ).filter( function( stateName ) {
            return moduleJson.states[ stateName ].view === 'AwSearchLocation';
        } );
    }
    return [];
};

var concat = function( a, b ) {
    return a.concat( b );
};

var filesToCreate = {
    '__sublocation-name__PageView.html': {
        dir: 'src/html/'
    },
    '__sublocation-name__ImageView.html': {
        dir: 'src/html/'
    },
    '__sublocation-name__ListView.html': {
        dir: 'src/html/'
    },
    '__sublocation-name__TableView.html': {
        dir: 'src/html/'
    },
    '__sublocation-name__PageViewModel.json': {
        dir: 'src/viewmodel/'
    },
    '__sublocation-name__ImageViewModel.json': {
        dir: 'src/viewmodel/'
    },
    '__sublocation-name__ListViewModel.json': {
        dir: 'src/viewmodel/'
    },
    '__sublocation-name__TableViewModel.json': {
        dir: 'src/viewmodel/'
    }
};

module.exports.execute = async function() {
    const targetModuleJson = await generatorUtils.getModule();
    // Initialize the states
    if( !targetModuleJson.states ) {
        targetModuleJson.states = {};
    }

    var getName = function( x ) {
        return x.name;
    };

    const allModulesMap = await generatorUtils.loadAllJson( [ 'components/activeworkspace/repo/kit/**/module.json', 'repo/kit/**/module.json', 'src/**/module.json' ], getName );
    var locationList = Object.values( allModulesMap ).map( getLocations ).reduce( concat ).sort();

    var msg = messages.locationInputMsg + locationList.map( function( locationName ) {
        return logger.nameColor( locationName );
    } ).join( '\n' ) + messages.locationInputRequestMsg;

    var isValidLocation = function( input ) {
        return locationList.indexOf( input ) !== -1;
    };

    const location = await generatorUtils.getUserInput( '-loc', msg, isValidLocation );
    var isValidSubLocationName = function( input ) {
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
    const sublocation = await generatorUtils.getUserInput( '-n', messages.nameInputMsg, isValidSubLocationName );
    // Add the new sublocation state
    targetModuleJson.states[ sublocation ] = {
        data: {
            priority: 0,
            label: {
                source: '/i18n/' + targetModuleJson.name + 'Messages',
                key: sublocation + 'Title'
            }
        },
        params: {
            filter: null
        },
        parent: location,
        view: sublocation + 'Page',
        url: '/' + sublocation
    };

    var messageUpdate = {};
    [ 'Title', 'ChartTitle' ].forEach( function( key ) {
        messageUpdate[ sublocation + key ] = sublocation;
    } );

    var placeholder2Value = {
        '__sublocation-name__': sublocation,
        '__targetModule-name__': targetModuleJson.name
    };

    // Update the message json file
    await Promise.all( [
        generatorUtils.updateModuleMessages( targetModuleJson, messageUpdate, {} ),
        generatorUtils.writeBuildJson( targetModuleJson ),
        generatorUtils.createFiles( targetModuleJson, filesToCreate, placeholder2Value )
    ] );

    logger.info( `Added new sub-location ${logger.nameColor( sublocation )} to location ${logger.nameColor( location )} in ${logger.nameColor( targetModuleJson.name )}` );
    logger.info( `You can access your new sublocation at ${logger.nameColor( 'http://localhost:3000/#/' + sublocation )} after rebuilding` );
};
