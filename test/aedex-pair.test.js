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
const { expect } = require( 'chai' )

const { defaultWallets: WALLETS } = require( '../config/wallets.json' )
import {
    getA,
    pairFixture,
    beforeEachWithSnapshot,
    getAK,
    swapPayload,
} from './shared/fixtures'

import {
    expandTo18Dec,
    expectToRevert,
    encodePrice,
    MINIMUM_LIQUIDITY,
    emits,
} from './shared/utilities'

const wallet = {
    ...WALLETS[0],
    address: WALLETS[0].publicKey
}

const other = {
    ...WALLETS[1],
    address: WALLETS[1].publicKey
}
var token0, token1, pair, callee, factory

describe( 'Pair Factory', () => {
    beforeEachWithSnapshot( 'first compile pool factory', async () => {
        ( { token0, token1, pair, callee, factory } = await pairFixture() )
    } )
    const pairAddress = () => getA( pair ).replace( "ct_", "ak_" )

    //------------------------------------------------------------------------------
    // entrypoint wrappers
    //------------------------------------------------------------------------------

    const totalSupply = ( isToken0 ) => {
        const token = isToken0 ? token0 : token1
        console.debug( `token${isToken0 ? 0 : 1}.total_supply()` )

        return token.total_supply( )
    }

    const token0TotalSupply = ( address ) => totalSupply( true, address )
    const token1TotalSupply = ( address ) => totalSupply( false, address )

    const balance = ( isToken0, address ) => {
        const token = isToken0 ? token0 : token1
        console.debug( `token${isToken0 ? 0 : 1}.balance( ${address})` )
        return token.balance( address ) || 0n
    }

    const token0Balance = ( address ) => balance( true, address )
    const token1Balance = ( address ) => balance( false, address )

    const transfer = async ( isToken0, amount ) => {
        const token = isToken0 ? token0 : token1
        console.debug( `token${isToken0 ? 0 : 1}.transfer( ${pairAddress()}, ${amount.toString()})` )
        await token.transfer( pairAddress(), BigInt( amount ) )
    }
    const token0Transfer = ( amount ) => transfer( true, amount.toString() )
    const token1Transfer = ( amount ) => transfer( false, amount.toString() )

    const pairTransfer = async ( amount ) => {
        console.debug( `pair.transfer( ${pairAddress()}, ${amount.toString()})` )
        await pair.transfer( pairAddress(), amount.toString() )
    }
    const pairBurn = async ( address ) => {
        console.debug( `pair.burn( ${address})` )
        return pair.contract.methods.burn( address,  { gas: 100000 }  )
    }

    const mint = ( address ) => {
        console.debug( `pair.mint( ${address} )` )
        return pair.contract.methods.mint( address,  { gas: 100000 } )
    }
    const swap = ( amount0, amount1, address ) => {
        const calleeAddress = getA( callee )
        console.debug( `pair.swap( ${amount0.toString()}, ${amount1.toString()}, ${address}, ${calleeAddress} )` )
        return pair.contract.methods.swap(
            BigInt( amount0 ),
            BigInt( amount1 ),
            address,
            calleeAddress,
            { gas: 100000 }
        )
    }
    const pairBalance = ( address ) => {
        console.debug( `pair.balance( ${address})` )
        return pair.balance( address ) || 0n
    }
    const getReserves = async () => {
        console.debug( `pair.get_reserves()` )
        return await pair.get_reserves()
    }
    const pairTotalSupply = ( ) => {
        console.debug( `pair.total_supply()` )
        return pair.total_supply( )
    }
    const  setDebugTime = ( offset ) => {
        console.debug( `pair.set_debug_time(${offset})` )
        return pair.set_debug_time( offset )
    }
    const  sync = ( ) => {
        console.debug( `pair.sync()` )
        return pair.sync( { gas: 100000 } )
    }
    const  price0CumulativeLast = ( ) => {
        console.debug( `pair.price0_cumulative_last()` )
        return pair.price0_cumulative_last( )
    }
    const  price1CumulativeLast = ( ) => {
        console.debug( `pair.price1_cumulative_last()` )
        return pair.price1_cumulative_last( )
    }
    const setFeeTo = async ( address ) => {
        console.debug( `factory.set_fee_to( ${address})` )
        await factory.set_fee_to( address )
    }
    const pairCreateAllowance = async ( address, amount ) => {
        const amountBI = BigInt( amount )
        console.log( `pair.create_allowance( ${address}, ${amountBI} )` )
        return pair.create_allowance( address, amountBI )
    }
    const pairChangeAllowance = async ( address, amount ) => {
        const amountBI = BigInt( amount )
        console.log( `pair.change_allowance( ${address}, ${amountBI} )` )
        return pair.change_allowance( address, amountBI )
    }
    const pairResetAllowance = async ( address ) => {
        console.log( `pair.reset_allowance( ${address} )` )
        return pair.reset_allowance( address )
    }
    const pairAllowance = async ( fromAcc, toAcc ) => {
        console.log( `pair.allowance( ${fromAcc}, ${toAcc} )` )
        return pair.allowance( {
            from_account: fromAcc, for_account: toAcc
        } )
    }

    //------------------------------------------------------------------------------
    // entrypoint wrappers
    //------------------------------------------------------------------------------

    it( 'mint', async () => {
        const token0Amount = expandTo18Dec( 1 )
        const token1Amount = expandTo18Dec( 4 )
        await token0Transfer( token0Amount )
        await token1Transfer( token1Amount )

        const expectedLiquidity = expandTo18Dec( 2 )
        const ret = await mint( wallet.address )

        pair.expectEvents( ret,
            emits( 'Mint' ).withArgs(
                getAK( pair ),
                MINIMUM_LIQUIDITY
            ).emits( 'LockLiquidity' ).withArgs(
                MINIMUM_LIQUIDITY
            ).emits( 'Mint' ).withArgs(
                wallet.address, expectedLiquidity - MINIMUM_LIQUIDITY
            ).emits( 'Sync' ).withArgs(
                token0Amount, token1Amount
            ).emits( 'PairMint' ).withArgs(
                wallet.address, token0Amount, token1Amount,
            )

        )

        expect(
            await pairTotalSupply()
        ).to.eq( expectedLiquidity )
        expect(
            await pairBalance( wallet.address )
        ).to.eq( expectedLiquidity - MINIMUM_LIQUIDITY )

        expect(
            await token0Balance( pairAddress() )
        ).to.eq( token0Amount )
        expect(
            await token1Balance( pairAddress() )
        ).to.eq( token1Amount )

        const reserves = await getReserves()
        expect( reserves.reserve0 ).to.eq( token0Amount )
        expect( reserves.reserve1 ).to.eq( token1Amount )
    } )

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
        typeof n === 'string' ? BigInt( n ) : expandTo18Dec( n )
    ) ) )
    swapTestCases.forEach( ( swapTestCase, i ) => {
        it( `getInputPrice:${i}`, async () => {
            const [
                swapAmount,
                token0Amount,
                token1Amount,
                expectedOutputAmount,
            ] = swapTestCase

            await addLiquidity( token0Amount, token1Amount )
            await token0Transfer( swapAmount )

            await expectToRevert(
                () => swap(
                    0,
                    expectedOutputAmount + 1n, //.add( 1 ),
                    wallet.address,
                ),
                'INSUFFICIENT_BALANCE'
            )
            await swap(
                0,
                expectedOutputAmount,
                wallet.address,
            )
        } )
    } )

    const optimisticTestCases = [
        [ '997000000000000000', 5, 10, 1 ], // given amountIn, amountOut = floor(amountIn * .997)
        [ '997000000000000000', 10, 5, 1 ],
        [ '997000000000000000', 5, 5, 1 ],
        [ 1, 5, 5, '1003009027081243732' ] // given amountOut, amountIn = ceiling(amountOut / .997)
    ].map( a => a.map( n =>
        ( typeof n === 'string'
            ? BigInt( n )
            : expandTo18Dec( n )
        ) ) )
    optimisticTestCases.forEach( ( optimisticTestCase, i ) => {
        it( `optimistic:${i}`, async () => {
            const calleeAddress = getA( callee )
            const [
                outputAmount,
                token0Amount,
                token1Amount,
                inputAmount
            ] = optimisticTestCase
            await addLiquidity( token0Amount, token1Amount )
            await token0Transfer( inputAmount )
            console.debug( `swap( ${outputAmount + 1n}, 0, ${wallet.address}, ${calleeAddress},) ` )
            await expectToRevert(
                () => swap(
                    outputAmount + 1n,
                    0,
                    wallet.address,
                ),
                'INSUFFICIENT_BALANCE'
            )
            await swap(
                outputAmount,
                0,
                wallet.address,
            )
        } )
    } )
    it( 'changes allowance into a smaller allowance', async () => {
        const token0Amount = expandTo18Dec( 5 )
        const token1Amount = expandTo18Dec( 10 )
        await addLiquidity( token0Amount, token1Amount )
        const expectedBalance = 7071067811865474244n
        expect( await pairBalance( wallet.address ) ).to.eq( expectedBalance )

        await pairCreateAllowance( getAK( pair ), expectedBalance )

        const getAllowance = () => pairAllowance(
            wallet.address,
            getAK( pair ),
        )

        expect( await getAllowance() ).to.eq( expectedBalance )

        const changeAllowanceAmount = - 1000000000000000000n

        await pairChangeAllowance( getAK( pair ), changeAllowanceAmount   )

        expect( await getAllowance() ).to.eq(
            expectedBalance + changeAllowanceAmount
        )

    } )
    it( 'fails to change allowance before creating it', async () => {
        const token0Amount = expandTo18Dec( 5 )
        const token1Amount = expandTo18Dec( 10 )
        await addLiquidity( token0Amount, token1Amount )
        const expectedBalance = 7071067811865474244n
        expect( await pairBalance( wallet.address ) ).to.eq( expectedBalance )

        const getAllowance = () => pairAllowance(
            wallet.address,
            getAK( pair ),
        )

        expect( await getAllowance() ).to.eq( undefined )

        await expectToRevert(
            () => pairChangeAllowance(
                getAK( pair ),  - ( expectedBalance + 1n )
            ),
            'ALLOWANCE_NOT_EXISTENT'
        )

    } )
    it( 'fails to change allowance because of negative number', async () => {
        const token0Amount = expandTo18Dec( 5 )
        const token1Amount = expandTo18Dec( 10 )
        await addLiquidity( token0Amount, token1Amount )
        const expectedBalance = 7071067811865474244n
        expect( await pairBalance( wallet.address ) ).to.eq( expectedBalance )

        await pairCreateAllowance( getAK( pair ), expectedBalance )

        const getAllowance = () => pairAllowance(
            wallet.address,
            getAK( pair ),
        )

        expect( await getAllowance() ).to.eq( expectedBalance )

        await expectToRevert(
            () => pairChangeAllowance(
                getAK( pair ),  - ( expectedBalance + 1n )
            ),
            'INSUFFICIENT_ALLOWANCE'
        )

    } )
    it( 'changes allowance to a bigger allowance', async () => {
        const token0Amount = expandTo18Dec( 5 )
        const token1Amount = expandTo18Dec( 10 )
        await addLiquidity( token0Amount, token1Amount )
        const expectedBalance = 7071067811865474244n
        expect( await pairBalance( wallet.address ) ).to.eq( expectedBalance )

        await pairCreateAllowance( getAK( pair ), expectedBalance )

        const getAllowance = () => pairAllowance(
            wallet.address,
            getAK( pair ),
        )

        expect( await getAllowance() ).to.eq( expectedBalance )

        const changeAllowanceAmount = 1000000000000000000n

        await pairChangeAllowance( getAK( pair ), changeAllowanceAmount   )

        expect( await getAllowance() ).to.eq(
            expectedBalance + changeAllowanceAmount
        )

    } )
    it( 'changes allowance to zero', async () => {
        const token0Amount = expandTo18Dec( 5 )
        const token1Amount = expandTo18Dec( 10 )
        await addLiquidity( token0Amount, token1Amount )
        const expectedBalance = 7071067811865474244n
        expect( await pairBalance( wallet.address ) ).to.eq( expectedBalance )

        await pairCreateAllowance( getAK( pair ), expectedBalance )

        const getAllowance = () => pairAllowance(
            wallet.address,
            getAK( pair ),
        )

        expect( await getAllowance() ).to.eq( expectedBalance )

        await pairChangeAllowance( getAK( pair ), - expectedBalance   )

        expect( await getAllowance() ).to.eq( 0n )
    } )
    it( 'resets allowance', async () => {
        const token0Amount = expandTo18Dec( 5 )
        const token1Amount = expandTo18Dec( 10 )
        await addLiquidity( token0Amount, token1Amount )
        const expectedBalance = 7071067811865474244n
        expect( await pairBalance( wallet.address ) ).to.eq( expectedBalance )

        await pairCreateAllowance( getAK( pair ), expectedBalance )

        const getAllowance = () => pairAllowance(
            wallet.address,
            getAK( pair ),
        )

        expect( await getAllowance() ).to.eq( expectedBalance )

        await pairResetAllowance( getAK( pair ) )

        expect( await getAllowance() ).to.eq( 0n )
    } )

    it( 'swap:token0', async () => {
        const token0Amount = expandTo18Dec( 5 )
        const token1Amount = expandTo18Dec( 10 )
        await addLiquidity( token0Amount, token1Amount )

        const swapAmount = expandTo18Dec( 1 )
        const expectedOutputAmount = 1662497915624478906n
        await token0Transfer( swapAmount )
        const ret = await swap( 0, expectedOutputAmount, wallet.address )
        token1.expectEvents( ret,
            emits( 'Transfer' ).withArgs( getAK( pair ), wallet.address, expectedOutputAmount )
        )
        pair.expectEvents( ret,
            emits( 'Sync' ).withArgs(
                token0Amount + swapAmount, token1Amount - expectedOutputAmount
            ).emits( 'SwapTokens' ).withArgs(
                wallet.address,
                wallet.address,
                swapPayload( swapAmount, 0, 0, expectedOutputAmount )
            )
        )

        const reserves = await getReserves()
        expect( reserves.reserve0 ).to.eq( token0Amount + swapAmount )
        expect( reserves.reserve1 ).to.eq( token1Amount - expectedOutputAmount )

        expect( await token0Balance( pairAddress() ) )
            .to.eq( token0Amount + swapAmount )
        expect( await token1Balance( pairAddress() ) )
            .to.eq( token1Amount - expectedOutputAmount )

        const totalSupplyToken0 = await token0TotalSupply()
        const totalSupplyToken1 = await token1TotalSupply()

        expect( await token0Balance( wallet.address ) )
            .to.eq( totalSupplyToken0  - token0Amount - swapAmount )
        expect( await token1Balance( wallet.address ) )
            .to.eq( totalSupplyToken1 - token1Amount + expectedOutputAmount )
    } )

    it( 'swap:token1', async () => {
        const token0Amount = expandTo18Dec( 5 )
        const token1Amount = expandTo18Dec( 10 )
        await addLiquidity( token0Amount, token1Amount )

        const swapAmount = expandTo18Dec( 1 )
        const expectedOutputAmount = 453305446940074565n
        await token1Transfer(  swapAmount )
        const ret = await swap( expectedOutputAmount, 0, wallet.address )
        token0.expectEvents( ret,
            emits( 'Transfer' ).withArgs( getAK( pair ), wallet.address, expectedOutputAmount )
        )
        pair.expectEvents( ret,
            emits( 'Sync' ).withArgs(
                token0Amount - expectedOutputAmount,
                token1Amount + swapAmount,
            ).emits( 'SwapTokens' ).withArgs(
                wallet.address,
                wallet.address,
                swapPayload( 0, swapAmount,  expectedOutputAmount, 0 )
            )
        )

        const reserves = await getReserves()
        expect( reserves.reserve0 ).to.eq(
            token0Amount - expectedOutputAmount
        )
        expect( reserves.reserve1 ).to.eq(
            token1Amount + swapAmount
        )

        expect( await token0Balance( pairAddress() ) )
            .to.eq( token0Amount - expectedOutputAmount )
        expect( await token1Balance( pairAddress() ) )
            .to.eq( token1Amount + swapAmount )

        const totalSupplyToken0 = await token0TotalSupply()
        const totalSupplyToken1 = await token1TotalSupply()
        expect( await token0Balance( wallet.address ) )
            .to.eq( totalSupplyToken0 - token0Amount + expectedOutputAmount )
        expect( await token1Balance( wallet.address ) )
            .to.eq( totalSupplyToken1 - token1Amount - swapAmount )
    } )
    it( 'burn', async () => {
        const token0Amount = expandTo18Dec( 3 )
        const token1Amount = expandTo18Dec( 3 )
        await addLiquidity( token0Amount, token1Amount )

        const expectedLiquidity = expandTo18Dec( 3 )

        await pairTransfer( expectedLiquidity - MINIMUM_LIQUIDITY )

        const ret = await pairBurn( wallet.address )

        pair.expectEvents( ret,
            emits( 'Burn' ).withArgs(
                getAK( pair ), expectedLiquidity - MINIMUM_LIQUIDITY
            ).emits( 'Sync' ).withArgs(
                1000, 1000
            ).emits( 'PairBurn' ).withArgs(
                wallet.address,
                wallet.address,
                ( token0Amount - 1000n )
                + '|' +
                ( token1Amount - 1000n ),
            )
        )
        token0.expectEvents( ret,
            emits( 'Transfer' ).withArgs(
                getAK( pair ), wallet.address, token0Amount - 1000n
            )
        )
        token1.expectEvents( ret,
            emits( 'Transfer' ).withArgs(
                getAK( pair ), wallet.address, token1Amount - 1000n
            )
        )

        expect( await pairBalance( wallet.address ) ).to.eq( 0n )
        expect( await pairTotalSupply() ).to.eq( MINIMUM_LIQUIDITY )
        expect( await token0Balance( pairAddress() ) ).to.eq( 1000n )
        expect( await token1Balance( pairAddress() ) ).to.eq( 1000n )
        const totalSupplyToken0 = await token0TotalSupply()
        const totalSupplyToken1 = await token1TotalSupply()
        expect(
            await token0Balance( wallet.address )
        ).to.eq( totalSupplyToken0 - 1000n )
        expect(
            await token1Balance( wallet.address )
        ).to.eq( totalSupplyToken1 - 1000n )
    } )
    it( 'price{0,1}CumulativeLast', async () => {
        const token0Amount = expandTo18Dec( 3 )
        const token1Amount = expandTo18Dec( 3 )
        const initialPrice = encodePrice( token0Amount, token1Amount )

        await addLiquidity( token0Amount, token1Amount )

        const { block_timestamp_last: blockTimestamp } = await getReserves()
        await setDebugTime( blockTimestamp + 1n )
        await sync( )

        expect( await price0CumulativeLast() )
            .to.eq( initialPrice[0] )
        expect( await price1CumulativeLast() )
            .to.eq( initialPrice[1] )
        expect( ( await getReserves() ).block_timestamp_last )
            .to.eq( blockTimestamp + 1n )

        const swapAmount = expandTo18Dec( 3 )
        await token0Transfer( swapAmount )
        await setDebugTime( blockTimestamp + 10n )

        // swap to a new price eagerly instead of syncing
        await swap( 0, expandTo18Dec( 1 ), wallet.address )

        expect( await price0CumulativeLast() )
            .to.eq( initialPrice[0] * 10n )
        expect( await price1CumulativeLast() )
            .to.eq( initialPrice[1] * 10n )
        expect( ( await getReserves() ).block_timestamp_last )
            .to.eq( blockTimestamp + 10n )

        await setDebugTime( blockTimestamp + 20n )
        await sync( )

        const newPrice = encodePrice(
            expandTo18Dec( 6 ),
            expandTo18Dec( 2 )
        )
        expect( await price0CumulativeLast() )
            .to.eq( initialPrice[0] * 10n + newPrice[0] * 10n )
        expect( await price1CumulativeLast() )
            .to.eq( initialPrice[1] * 10n + newPrice[1] * 10n )
        expect( ( await getReserves() ).block_timestamp_last )
            .to.eq( blockTimestamp + 20n )
    } )
    it( 'feeTo:off', async () => {
        const token0Amount = expandTo18Dec( 1000 )
        const token1Amount = expandTo18Dec( 1000 )
        await addLiquidity( token0Amount, token1Amount )

        const swapAmount = expandTo18Dec( 1 )
        const expectedOutputAmount = 996006981039903216n
        await token1Transfer( swapAmount )
        await swap( expectedOutputAmount, 0, wallet.address )

        const expectedLiquidity = expandTo18Dec( 1000 )
        await pairTransfer( expectedLiquidity - MINIMUM_LIQUIDITY )
        await pairBurn( wallet.address )
        expect( await pairTotalSupply() )
            .to.eq( MINIMUM_LIQUIDITY )
    } )
    it( 'feeTo:on', async () => {
        await setFeeTo( other.address )

        const token0Amount = expandTo18Dec( 1000 )
        const token1Amount = expandTo18Dec( 1000 )
        await addLiquidity( token0Amount, token1Amount )

        const swapAmount = expandTo18Dec( 1 )
        const expectedOutputAmount = 996006981039903216n
        await token1Transfer( swapAmount )
        await swap( expectedOutputAmount, 0, wallet.address )

        const expectedLiquidity = expandTo18Dec( 1000 )
        await pairTransfer( expectedLiquidity - MINIMUM_LIQUIDITY )
        await pairBurn( wallet.address )
        expect( await pairTotalSupply() )
            .to.eq( MINIMUM_LIQUIDITY + 249750499251388n )
        expect( await pairBalance( other.address ) )
            .to.eq( 249750499251388n )

        // using 1000 here instead of the symbolic MINIMUM_LIQUIDITY because the amounts only happen to be equal...
        // ...because the initial liquidity amounts were equal
        expect( await token0Balance( pairAddress() ) )
            .to.eq( 1000n +   249501683697445n )
        expect( await token1Balance( pairAddress() ) )
            .to.eq( 1000n + 250000187312969n )
    } )
} )
