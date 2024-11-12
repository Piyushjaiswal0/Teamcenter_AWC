import _ from 'lodash';
import AwHttpService from 'js/awHttpService';
import AwPromiseService from 'js/awPromiseService';

export const calulateEuro = function( input ) {
    return {
        euroNumber: input.dollerNumber.dbValue * 0.92,
        yenNumber: input.dollerNumber.dbValue * 107.72,
        poundNumber: input.dollerNumber.dbValue * 0.8
    };
};

export const updatePropertyValues = function( input ) {
    return {
        metreNumber: input.kmNumber.dbValue * 1000,
        centiNumber: input.metreNumber.dbValue * 100
    };
};

export const plusOne = prop => ++prop.dbValue;

export const initializeData = () => 2;

export const toggleValue = val => val;

export const selectCurrency = selectedCurrencyProp => selectedCurrencyProp.dbValue === true ? selectedCurrencyProp.propertyRadioTrueText : selectedCurrencyProp.propertyRadioFalseText;

export const calculateInPoundSterling = ( currency ) => currency === 'Euro' ? 50 * 0.92 : 50 * 0.8;

export const calculateInEuro = ( currency ) => currency === 'Euro' ? 50 * 0.92 : 50 * 0.8;

/**
 * @param {DeclViewModel} data - The declViewModel data context object.
 * @param {DeclViewModelProperty} labelDetails viewModelProperty label details
 */
export let updateValues = function( data, labelDetails ) { // eslint-disable-line no-unused-vars
    const newLabelDetails = _.clone( labelDetails );

    if( data.dbValue ) {
        newLabelDetails.uiValue += ' ' + data.propertyDisplayName;
    } else {
        var updatedlabel = labelDetails.uiValue.replace( data.propertyDisplayName, '' );
        newLabelDetails.uiValue = updatedlabel;
    }
    newLabelDetails.uiValue = newLabelDetails.uiValue.trim();
    return newLabelDetails;
};

/**
 * @param {DeclViewModel} data - The declViewModel data context object.
 */
export let onLoadValues = function( data ) { // eslint-disable-line no-unused-vars
    // set the initial value for selectedFood...
    var preSelectedItem = [];
    const newSelectedFood = _.clone( data.selectedFood );

    if( data.foodPanCakes.dbValue ) {
        preSelectedItem.push( data.foodPanCakes.propertyDisplayName );
    }
    if( data.foodWaffles.dbValue ) {
        preSelectedItem.push( data.foodWaffles.propertyDisplayName );
    }
    if( data.foodBrownie.dbValue ) {
        preSelectedItem.push( data.foodBrownie.propertyDisplayName );
    }
    newSelectedFood.uiValue = preSelectedItem.join( ' ' );

    return newSelectedFood;
};

export const getRoverName = function( input ) {
    return 'The Rover has total ' + input.length + ' cameras';
};

/**
 * getMovieListUrl
 *
 * @param {Object} filterString the filterString
 * @param {Object} dataprovider the dataprovider
 * @return {String} the Movie List URL
 */
export const getMovieListUrl = function( filterString, dataprovider ) {
    let startIndex = dataprovider.startIndex ? dataprovider.startIndex : 0;
    // page size is not a correct assumption, luckily omdb site page is also 10
    const pagesize = 10;
    let endIndex = startIndex + pagesize;
    let pageNumber = Math.floor( endIndex / pagesize );
    return 'http://www.omdbapi.com/?s=' + encodeURIComponent( filterString ) + '&apikey=4bca95fd&page=' + pageNumber;
};

export const assignValue = function( assignValue, updatePlace, property ) {
    updatePlace[ property ] = assignValue;
};

export const returnValue = function( assignValue, updatePlace, property ) {
    updatePlace[ property ] = assignValue;
    return updatePlace;
};

/**
 * Get Movie Details
 *
 * @param {Object} movieId the movieId
 * @return {Object} the movie Details
 */
export const getMovieDetails = function( movieId ) {
    var deferred = AwPromiseService.instance.defer();

    if( movieId ) {
        AwHttpService.instance.get( 'api/movieList.json' ).then( function( response ) {
            var result = response.data.movies.find( ( ele, i ) => {
                if( ele.id === movieId ) {
                    return response.data.movies[ i ];
                }
            } );
            deferred.resolve( {
                movieDetails: result
            } );
        } );
    } else {
        deferred.resolve( { invalid: true } );
    }
    return deferred.promise;
};
