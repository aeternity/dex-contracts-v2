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
    beforeEachWithSnapshot,

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
    const pairAddress = () => getA( pair ).replace( "ct_", "ak_" )

    it.skip( 'mint', async () => {
        const token0Amount = expandTo18Decimals( 1 )
        const token1Amount = expandTo18Decimals( 4 )
        console.debug( `token0.exe( x => x.transfer( ${pairAddress()}, ${token0Amount.toString()} ) ) ` )
        await token0.exe( x => x.transfer( pairAddress(), token0Amount.toString() ) )
        console.debug( `token1.exe( x => x.transfer( ${pairAddress()}, ${token1Amount.toString()} ) ) ` )
        await token1.exe( x => x.transfer( pairAddress(), token1Amount.toString() ) )

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
            await token0.exe( x => x.balance_str( pairAddress() ) )
        ).to.eq( token0Amount.toString() )
        expect(
            await token1.exe( x => x.balance_str( pairAddress() ) )
        ).to.eq( token1Amount.toString() )
        const reserves = await pair.exe( x => x.get_reserves() )
        expect( reserves.reserve0 ).to.eq( token0Amount.toString() * 1 )
        expect( reserves.reserve1 ).to.eq( token1Amount.toString() * 1 )
    } )

    const totalSupplyStr = ( isToken0 ) => {
        const token = isToken0 ? token0 : token1
        console.debug( `token${isToken0 ? 0 : 1}.total_supply_str()` )

        return token.exe( x => x.total_supply_str( ) )
    }
    
    const token0TotalSupplyStr = ( address ) => totalSupplyStr( true, address )
    const token1TotalSupplyStr = ( address ) => totalSupplyStr( false, address )

    const balanceStr = ( isToken0, address ) => {
        const token = isToken0 ? token0 : token1
        console.debug( `token${isToken0 ? 0 : 1}.balance_str( ${address})` )
        return token.exe( x => x.balance_str( address ) )
    }
    
    const token0BalanceStr = ( address ) => balanceStr( true, address )
    const token1BalanceStr = ( address ) => balanceStr( false, address )

    const balance = ( isToken0, address ) => {
        const token = isToken0 ? token0 : token1
        console.debug( `token${isToken0 ? 0 : 1}.balance( ${address})` )
        return token.exe( x => x.balance( address ) )
    }
    
    const token0Balance = ( address ) => balance( true, address )
    const token1Balance = ( address ) => balance( false, address )

    const transfer = async ( isToken0, amount ) => {
        const token = isToken0 ? token0 : token1
        console.debug( `token${isToken0 ? 0 : 1}.transfer( ${pairAddress()}, ${amount.toString()})` )
        await token.exe( x => x.transfer( pairAddress(), amount.toString() ) )
    }
    const token0Transfer = ( amount ) => transfer( true, amount )
    const token1Transfer = ( amount ) => transfer( false, amount )

    const pairTransfer = async ( amount ) => {
        console.debug( `pair.transfer( ${pairAddress()}, ${amount.toString()})` )
        await pair.exe( x => x.transfer( pairAddress(), amount.toString() ) )
    }
    const pairBurn = async ( address ) => {
        console.debug( `pair.burn( ${address})` )
        await pair.exe( x => x.burn( address ) )
    }

    const mint = async ( address ) => {
        console.debug( `pair.mint( ${address} )` )
        await pair.exe( x => x.mint( address ) )
    }
    const swap = async ( amount0, amount1, address ) => {
        const caleeAddress = getA( calee )
        console.debug( `pair.swap( ${amount0.toString()}, ${amount1.toString()}, ${address}, ${caleeAddress} )` )
        await pair.exe( x => x.swap(
            amount0.toString(),
            amount1.toString(),
            address,
            caleeAddress
        ) )
    }
    const pairBalance = ( address ) => {
        console.debug( `pair.balance( ${address})` )
        return pair.exe( x => x.balance( address ) )
    }
    const getReserves = async () => {
        console.debug( `pair.get_reserves()` )
        return await pair.exe( x => x.get_reserves() )
    }
    const pairTotalSupply = ( ) => {
        console.debug( `pair.total_supply()` )
        return pair.exe( x => x.total_supply( ) )
    }
    async function addLiquidity( token0Amount, token1Amount ) {
        await token0Transfer( token0Amount.toString() )
        await token1Transfer( token1Amount.toString() )
        await mint( wallet.address )
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
        it.skip( `getInputPrice:${i}`, async () => {
            const [
                swapAmount,
                token0Amount,
                token1Amount,
                expectedOutputAmount,
            ] = swapTestCase

            await addLiquidity( token0Amount, token1Amount )
            console.debug( `token0.exe( x => x.transfer( ${pairAddress()}, ${swapAmount.toString()} ) )` )
            await token0.exe( x => x.transfer( pairAddress(), swapAmount.toString() ) )
            const caleeAddress = getA( calee )

            console.debug( `pair.exe( x => x.swap( 0, ${expectedOutputAmount.add( 1 ).toString()}, ${wallet.address}, ${caleeAddress}) ) ` ) 
            await expectToRevert(
                () => pair.exe( 
                    x => x.swap(
                        0,
                        expectedOutputAmount.add( 1 ).toString(),
                        wallet.address,
                        caleeAddress,
                    ) ),
                "AedexV2: K"
            )
            console.debug( `pair.exe( x => x.swap( 0, ${expectedOutputAmount.toString()}, ${wallet.address}, ${caleeAddress}) ) ` ) 
            await pair.exe( x => x.swap(
                0,
                expectedOutputAmount.toString(),
                wallet.address,
                caleeAddress,
            ) )
        } )
    } )

    const optimisticTestCases = [
        [ '997000000000000000', 5, 10, 1 ], // given amountIn, amountOut = floor(amountIn * .997)
        [ '997000000000000000', 10, 5, 1 ],
        [ '997000000000000000', 5, 5, 1 ],
        [ 1, 5, 5, '1003009027081243732' ] // given amountOut, amountIn = ceiling(amountOut / .997)
    ].map( a => a.map( n => 
        ( typeof n === 'string' 
            ? BigNumber.from( n ) 
            : expandTo18Decimals( n )
        ) ) )
    optimisticTestCases.forEach( ( optimisticTestCase, i ) => {
        it.skip( `optimistic:${i}`, async () => {
            const caleeAddress = getA( calee )
            const [
                outputAmount,
                token0Amount,
                token1Amount,
                inputAmount
            ] = optimisticTestCase
            await addLiquidity( token0Amount, token1Amount )
            console.debug( `token0.exe( x => x.transfer( ${pairAddress()}, ${inputAmount.toString()} ) ) ` )
            await token0.exe( x => x.transfer( pairAddress(), inputAmount.toString() ) )
            console.debug( `swap( ${outputAmount.add( 1 ).toString()}, 0, ${wallet.address}, ${caleeAddress},) ` )
            await expectToRevert(
                () => pair.exe( 
                    x => x.swap(
                        outputAmount.add( 1 ).toString(),
                        0,
                        wallet.address,
                        caleeAddress,
                    ) ),
                "AedexV2: K"
            )
            console.log( `swap( ${outputAmount.toString()}, 0, ${wallet.address}, ${caleeAddress})` )
            await pair.exe( x => x.swap(
                outputAmount.toString(),
                0,
                wallet.address,
                caleeAddress,
            ) )
        } )
    } )

    it.skip( 'swap:token0', async () => {
        const token0Amount = expandTo18Decimals( 5 )
        const token1Amount = expandTo18Decimals( 10 )
        await addLiquidity( token0Amount, token1Amount )

        const swapAmount = expandTo18Decimals( 1 )
        const expectedOutputAmount = BigNumber.from( '1662497915624478906' )
        await token0Transfer( swapAmount )
        await swap( 0, expectedOutputAmount, wallet.address ) 

        const reserves = await getReserves()
        expect( reserves.reserve0 ).to.eq( token0Amount.add( swapAmount ).toString() * 1 )
        expect( reserves.reserve1 ).to.eq( token1Amount.sub( expectedOutputAmount ).toString() * 1 )

        expect( await token0Balance( pairAddress() ) )
            .to.eq( token0Amount.add( swapAmount ).toString() * 1 )
        expect( await token1Balance( pairAddress() ) )
            .to.eq( token1Amount.sub( expectedOutputAmount ).toString() * 1 )

        const totalSupplyToken0 = await token0TotalSupplyStr()
        const totalSupplyToken1 = await token1TotalSupplyStr()

        expect( await token0BalanceStr( wallet.address ) )
            .to.eq(
                BigNumber.from( totalSupplyToken0 )
                    .sub( token0Amount )
                    .sub( swapAmount )
                    .toString()
            )
        expect( await token1BalanceStr( wallet.address ) )
            .to.eq( BigNumber.from( totalSupplyToken1 )
                .sub( token1Amount )
                .add( expectedOutputAmount )
                .toString()
            )
    } )

    it.skip( 'swap:token1', async () => {
        const token0Amount = expandTo18Decimals( 5 )
        const token1Amount = expandTo18Decimals( 10 )
        await addLiquidity( token0Amount, token1Amount )

        const swapAmount = expandTo18Decimals( 1 )
        const expectedOutputAmount = BigNumber.from( '453305446940074565' )
        await token1Transfer(  swapAmount )
        await swap( expectedOutputAmount, 0, wallet.address ) 

        const reserves = await getReserves()
        expect( reserves.reserve0 ).to.eq(
            token0Amount.sub( expectedOutputAmount ).toString() * 1
        )
        expect( reserves.reserve1 ).to.eq(
            token1Amount.add( swapAmount ).toString() * 1
        )

        expect( await token0BalanceStr( pairAddress() ) )
            .to.eq( token0Amount.sub( expectedOutputAmount ).toString() )
        expect( await token1BalanceStr( pairAddress() ) )
            .to.eq( token1Amount.add( swapAmount ).toString() )

        const totalSupplyToken0 = await token0TotalSupplyStr()
        const totalSupplyToken1 = await token1TotalSupplyStr()
        expect( await token0BalanceStr( wallet.address ) )
            .to.eq(
                BigNumber.from( totalSupplyToken0 )
                    .sub( token0Amount )
                    .add( expectedOutputAmount )
                    .toString()
            )
        expect( await token1BalanceStr( wallet.address ) )
            .to.eq(
                BigNumber.from( totalSupplyToken1 )
                    .sub( token1Amount )
                    .sub( swapAmount )
                    .toString()
            )
    } )
    it( 'burn', async () => {
        const token0Amount = expandTo18Decimals( 3 )
        const token1Amount = expandTo18Decimals( 3 )
        await addLiquidity( token0Amount, token1Amount )

        const expectedLiquidity = expandTo18Decimals( 3 )

        await pairTransfer( expectedLiquidity.sub( MINIMUM_LIQUIDITY ) )

        await pairBurn( wallet.address ) 

        expect( await pairBalance( wallet.address ) ).to.eq( 0 )
        expect( await pairTotalSupply() ).to.eq( MINIMUM_LIQUIDITY.toString() * 1 )
        expect( await token0BalanceStr( pairAddress() ) ).to.eq( '1000' )
        expect( await token1BalanceStr( pairAddress() ) ).to.eq( '1000' )
        const totalSupplyToken0 = await token0TotalSupplyStr()
        const totalSupplyToken1 = await token1TotalSupplyStr()
        expect( 
            await token0BalanceStr( wallet.address )
        ).to.eq( BigNumber.from( totalSupplyToken0 ).sub( 1000 ).toString() )
        expect( 
            await token1BalanceStr( wallet.address )
        ).to.eq( BigNumber.from( totalSupplyToken1 ).sub( 1000 ).toString() )
    } )
} )