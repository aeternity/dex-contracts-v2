/*
 * ISC License (ISC)
 * Copyright (c) 2018 aeternity developers
 *
 *  Permission to use, copy, modify, and/or distribute this software for any
 *  purpose with or without fee is hereby granted, provided that the above
 *  copyright notice and this permission notice appear in all copies.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 *  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
 *  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 *  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 *  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
 *  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 *  PERFORMANCE OF THIS SOFTWARE.
 */
const { assert, expect, use } = require( 'chai' )
import { BigNumber } from 'ethers'
const MINIMUM_LIQUIDITY = BigNumber.from( 10 ).pow( 3 )
import { Decimal } from 'decimal.js'
const { jestSnapshotPlugin } = require( "mocha-chai-jest-snapshot" )

const tokenA      = 'ct_A8WVnCuJ7t1DjAJf4y8hJrAEVpt1T9ypG3nNBdbpKmpthGvUm'
const tokenB      = 'ct_m18VKpSVhsQtjmUC7oZAJPwk36usb39B2viWzBuPjfQEsxHYL'
const fakeFactory = 'ct_27JMp3z1pyXbfjra2VXiFU9e5jtFTyzus57S6eWbGNh3NSfabo'

use( jestSnapshotPlugin() )

const { defaultWallets: WALLETS } = require( '../config/wallets.json' )

import {
    getA,   
    getContract,
    pairFixture,
} from './shared/fixtures.js'

import {
    expandTo18Decimals,
    MaxUint256,
    expectToRevert,

} from './shared/utilities.js'

const TOTAL_SUPPLY = expandTo18Decimals( 10000 )
const TEST_AMOUNT = expandTo18Decimals( 10 )

const wallet = { 
    ...WALLETS[0],
    address: WALLETS[0].publicKey 
}

const other = { 
    ...WALLETS[1],
    address: WALLETS[1].publicKey 
}
var token0, token1, pair, calee

describe( 'Pair Factory', () => {
    beforeEach( 'first compile pool factory', async () => {
        ( { token0, token1, pair, calee } = await pairFixture() )
    } )
    it.skip( 'mint', async () => {
        const token0Amount = expandTo18Decimals( 1 )
        const token1Amount = expandTo18Decimals( 4 )
        const pairAddress = getA( pair ).replace( "ct_", "ak_" )
        console.debug( `token0.exe( x => x.transfer( ${pairAddress}, ${token0Amount.toString()} ) ) ` )
        await token0.exe( x => x.transfer( pairAddress, token0Amount.toString() ) )
        console.debug( `token1.exe( x => x.transfer( ${pairAddress}, ${token1Amount.toString()} ) ) ` )
        await token1.exe( x => x.transfer( pairAddress, token1Amount.toString() ) )

        const expectedLiquidity = expandTo18Decimals( 2 )
        console.debug( `pair.exe( x => x.mint(${  wallet.address }) )` )
        await pair.exe( x => x.mint( wallet.address ) )

        expect(
            await pair.exe( x => x.total_supply() )
        ).to.eq( expectedLiquidity.toString() * 1 )
        expect(
            await pair.exe( x => x.balance( wallet.address ) )
        ).to.eq( expectedLiquidity.sub( MINIMUM_LIQUIDITY ).toString() * 1 )
        expect(
            await token0.exe( x => x.balance_str( pairAddress ) )
        ).to.eq( token0Amount.toString() )
        expect(
            await token1.exe( x => x.balance_str( pairAddress ) )
        ).to.eq( token1Amount.toString() )
        const reserves = await pair.exe( x => x.get_reserves() )
        expect( reserves.reserve0 ).to.eq( token0Amount.toString() * 1 )
        expect( reserves.reserve1 ).to.eq( token1Amount.toString() * 1 )
    } )
    async function addLiquidity( token0Amount, token1Amount ) {
        const pairAddress = getA( pair ).replace( "ct_", "ak_" )
        console.debug( `token0.exe( x => x.transfer( ${pairAddress}, ${token0Amount.toString()} ) )` ) 
        await token0.exe( x => x.transfer( pairAddress, token0Amount.toString() ) ) 
        console.debug( `token1.exe( x => x.transfer( ${pairAddress}, ${token1Amount.toString()} ) )` ) 
        await token1.exe( x => x.transfer( pairAddress, token1Amount.toString() ) )
        console.debug( `pair.exe( x => x.mint( ${wallet.address} ) )` )
        await pair.exe( x => x.mint( wallet.address ) )
    }
    const swapTestCases = [
        [ 1, 5, 10,     '1662497915624478906' ],
        [ 1, 10, 5,      '453305446940074565' ],

        [ 2, 5, 10,     '2851015155847869602' ],
        [ 2, 10, 5,      '831248957812239453' ],

        [ 1, 10, 10,     '906610893880149131' ],
        [ 1, 100, 100,   '987158034397061298' ],
        [ 1, 1000, 1000, '996006981039903216' ]
    ].map( a => a.map( n => (
        typeof n === 'string' ? BigNumber.from( n ) : expandTo18Decimals( n )
    ) ) )
    swapTestCases.forEach( ( swapTestCase, i ) => {
        it( `getInputPrice:${i}`, async () => {
            const pairAddress = getA( pair ).replace( "ct_", "ak_" )
            const [
                swapAmount,
                token0Amount,
                token1Amount,
                expectedOutputAmount,
            ] = swapTestCase
            console.log( {
                token0 : await pair.exe( x => x.token0() ),
                token1 : await pair.exe( x => x.token1() ),
            } )

            const reserve = async () => console.log( "RESERVE: !!!!", await pair.exe( x => x.get_reserves() ) )
            await reserve()
            await addLiquidity( token0Amount, token1Amount )
            await reserve()
            console.debug( `token0.exe( x => x.transfer( ${pairAddress}, ${swapAmount.toString()} ) )` )
            await token0.exe( x => x.transfer( pairAddress, swapAmount.toString() ) )
            const caleeAddress = getA( calee )
            await reserve()

            console.debug( `pair.exe( x => x.swap( 0, ${expectedOutputAmount.add( 1 ).toString()}, ${wallet.address}, ${caleeAddress}) ) ` ) 
            //await expectToRevert(
                //() => pair.exe( 
                    //x => x.swap(
                        //0,
                        //expectedOutputAmount.add( 1 ).toString(),
                        //wallet.address,
                        //caleeAddress,
                    //) ),
                //"AedexV2: K"
            //)
            console.debug( `pair.exe( x => x.swap( 0, ${expectedOutputAmount.toString()}, ${wallet.address}, ${caleeAddress}) ) ` ) 
            await pair.exe( x => x.swap(
                0,
                expectedOutputAmount.toString(),
                wallet.address,
                caleeAddress,
            ) )
        } )
    } )
} )
