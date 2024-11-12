/**
 * Simple Alert service for sample command Handlers
 *
 * @module js/DevelopCommandService
 */

/**
 * Dummy alert.
 * @param {String} text - text to display
 */
export let FetchUID = function( text ) {
    const message = `UID is ${text}`;
    alert( message );
};

export let alertInfo = function( propName, propValue ) {
    const message = `Property name is ${propName}\nProperty Value is ${propValue}`;  // Template literals and added space after "is"
    alert( message );
};

export default {
    Fetch: FetchUID,
    alert: alertInfo
};
