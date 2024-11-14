/**
 * Simple Alert service for sample command Handlers
 *
 * @module js/generateXMLPopUpService
 */

/**
 * Dummy alert.
 * @param {String} text - text to display
 */
export let alert2 = function( text ) {
    window.alert( text ); // eslint-disable-line
};

export default {
    alert: alert2
};
