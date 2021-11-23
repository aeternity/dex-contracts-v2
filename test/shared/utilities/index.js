const bn = require( 'bignumber.js' )
const { BigNumber } =  require( 'ethers' )
import { Decimal } from 'decimal.js'
const { expect, assert } = require( 'chai' )
const { exec : execP } = require( "child_process" )
import { emits } from './events'

function formatTokenAmount( num )/*: string*/ {
    return new Decimal( num.toString() ).dividedBy( new Decimal( 10 ).pow( 18 ) ).toPrecision( 5 )
}

function formatPrice( price )/*: string*/ {
    return new Decimal( price.toString() ).dividedBy( new Decimal( 2 ).pow( 96 ) ).pow( 2 ).toPrecision( 5 )
}
const MaxUint128 = BigNumber.from( 2 ).pow( 128 ).sub( 1 )
const MaxUint256 = BigNumber.from( 2 ).pow( 256 ).sub( 1 )
const getMinTick = ( tickSpacing ) => Math.ceil( -887272 / tickSpacing ) * tickSpacing
const getMaxTick = ( tickSpacing ) => Math.floor( 887272 / tickSpacing ) * tickSpacing
const getMaxLiquidityPerTick = ( tickSpacing ) =>
    BigNumber.from( 2 )
        .pow( 128 )
        .sub( 1 )
        .div( ( getMaxTick( tickSpacing ) - getMinTick( tickSpacing ) ) / tickSpacing + 1 )

const MIN_SQRT_RATIO = BigNumber.from( '4295128739' )
const MAX_SQRT_RATIO = BigNumber.from( '1461446703485210103287273052203988822378723970342' )

const FeeAmount = {
    LOW    : 500,
    MEDIUM : 3000,
    HIGH   : 10000,
}

const TICK_SPACINGS  = {
    [FeeAmount.LOW]    : 10,
    [FeeAmount.MEDIUM] : 60,
    [FeeAmount.HIGH]   : 200,
}

function expandTo18Decimals( n ) {
    return BigNumber.from( n ).mul( BigNumber.from( 10 ).pow( 18 ) )
}

bn.config( { EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 } )

// returns the sqrt price as a 64x96
function encodePriceSqrt( reserve1, reserve0 ) {
    return BigNumber.from(
        new bn( reserve1.toString() )
            .div( reserve0.toString() )
            .sqrt()
            .multipliedBy( new bn( 2 ).pow( 96 ) )
            .integerValue( 3 )
            .toString()
    )
}

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
    encodePriceSqrt,
    expandTo18Decimals,
    TICK_SPACINGS,
    MAX_SQRT_RATIO,
    MIN_SQRT_RATIO,
    getMinTick,
    getMaxTick,
    getMaxLiquidityPerTick,
    MaxUint128,
    MaxUint256,
    FeeAmount,
    formatTokenAmount,
    formatPrice,
    encodePrice,
    emits,
    events,
}

