
const sleep = ( milliseconds ) => {
    return new Promise( resolve => setTimeout( resolve, milliseconds ) );
};

/**
 * asyncAlert function action
 * @param {data} data Alert stringify data
 */
export async function asyncAlert( data ) {
    await sleep( 500 );
    /* eslint-disable no-alert */
    alert( JSON.stringify( data, null, 2 ) );
    /* eslint-enable no-alert */
}

export default { asyncAlert };
