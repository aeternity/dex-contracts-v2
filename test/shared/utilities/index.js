const bn = require( 'bignumber.js' )
const { expect, assert } = require( 'chai' )
const { exec : execP } = require( "child_process" )
import { emits } from './events'

// BigNumber.from( 2 ).pow( 128 ).sub( 1 )
const MaxUint128 = 340282366920938463463374607431768211456n - 1n

//BigNumber.from( 2 ).pow( 256 ).sub( 1 )
const MaxUint256 = 115792089237316195423570985008687907853269984665640564039457584007913129639936n - 1n

const MINIMUM_LIQUIDITY = 1000n

function expandTo18Dec( n ) {
    return BigInt( n ) * 1000000000000000000n // BigInt( n ) * ( 10n ** 18n )
}

bn.config( { EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 } )

function encodePrice( reserve0, reserve1 ) {
    const _2_pow_112 = 5192296858534827628530496329220096n
    return [
        ( BigInt( reserve1 ) * _2_pow_112 ) / BigInt( reserve0 ), // reserve1.mul( BigNumber.from( 2 ).pow( 112 ) ).div( reserve0 ),
        ( BigInt( reserve0 ) * _2_pow_112 ) / BigInt( reserve1 ), // reserve0.mul( BigNumber.from( 2 ).pow( 112 ) ).div( reserve1 )
    ]
}

const expectToRevert = async ( f, msg ) => {
    try {
        await f()
        assert.fail( 'didn\'t fail' )
    } catch ( err ) {
        expect( err.message ).to.includes( msg )
    }
}

const exec = ( cmd ) => {
    return new Promise( ( resolve, reject ) => {
        execP( cmd, ( error, stdout, stderr ) => {
            if ( error ) {
                reject( error )
                return
            }
            if ( stderr ) {
                console.log( `stderr: ${stderr}` )
                reject( stderr )
                return
            }
            resolve( stdout )
        } )
    } )
}

const events = ( tests ) => {
    return {
        events: ( xs ) => tests.events( {
            tail : xs,
            head : null,
        } )
    }
}
module.exports = {
    exec,
    expectToRevert,
    expandTo18Dec,
    MaxUint128,
    MaxUint256,
    encodePrice,
    emits,
    events,
    MINIMUM_LIQUIDITY,
}

