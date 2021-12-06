const bn = require( 'bignumber.js' )
const { BigNumber } =  require( 'ethers' )
const { expect, assert } = require( 'chai' )
const { exec : execP } = require( "child_process" )
import { emits } from './events'

const MaxUint128 = BigNumber.from( 2 ).pow( 128 ).sub( 1 )
const MaxUint256 = BigNumber.from( 2 ).pow( 256 ).sub( 1 )

const MINIMUM_LIQUIDITY = 1000n

function expandTo18Decimals( n ) {
    return BigNumber.from( n ).mul( BigNumber.from( 10 ).pow( 18 ) )
}

bn.config( { EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 } )

function encodePrice( reserve0, reserve1 ) {
    return [
        reserve1.mul( BigNumber.from( 2 ).pow( 112 ) ).div( reserve0 ),
        reserve0.mul( BigNumber.from( 2 ).pow( 112 ) ).div( reserve1 )
    ]
}
const makeExe = ( contract ) => async ( f, get ) => {
    const tx = await f( contract.methods )

    if ( get && typeof get == 'object' ) {
        // client is an instance of the Universal Stamp
        //tx.decodedEvents && console.log( tx.decodedEvents )
        if ( get.events ) {
            await get.events( tx.decodedEvents )
        }
        if ( get.results ) {
            return await get.results( tx.decodedResult )
        }
        return tx.decodedResult
    }

    return get ? get( tx.decodedResult ) : tx.decodedResult
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
    makeExe,
    expandTo18Decimals,
    MaxUint128,
    MaxUint256,
    encodePrice,
    emits,
    events,
    MINIMUM_LIQUIDITY,
}

