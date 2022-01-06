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
    routerFixture,
    beforeEachWithSnapshot,
    getAK,
    swapPayload,
} from './shared/fixtures'

import {
    expandTo18Dec,
    MaxUint256 as MaxUint256BN,
    MINIMUM_LIQUIDITY,
    emits,
} from './shared/utilities'
const MaxUint256 = BigInt( MaxUint256BN )

const wallet = {
    ...WALLETS[0],
    address: WALLETS[0].publicKey
}

const extraGas = { gas: 150000 }
describe( 'Pair Router', () => {
    let token0
    let token1
    let tokenC
    let wae
    let waePartner
    let factory
    let router
    let pair
    let pair1C
    let waePair
    afterEach( async function() {
        expect( await router.exe( x => x.balance() ) ).to.eq( 0n )
    } )
    beforeEachWithSnapshot( 'first compile pool factory', async () => {
        ( {
            token0,
            token1,
            tokenC,
            wae,
            waePartner,
            factory,
            router,
            pair,
            waePair,
            pair1C,
        } = await routerFixture() )
    } )
    const routerAddr = () =>  getAK( router )

    it( 'factory, WAE', async () => {
        expect( await router.exe( x => x.factory() ) ).to.eq( getA( factory ) )
        expect( await router.exe( x => x.wae() ) ).to.eq( getA( wae ) )
        expect( await router.exe( x => x.wae_aex9() ) ).to.eq( getA( wae ) )
    } )
    it( 'add_liquidity', async () => {
        const token0Amount = expandTo18Dec( 1 )
        const token1Amount = expandTo18Dec( 4 )

        const expectedLiquidity = expandTo18Dec( 2 )
        await token0.create_allowance( routerAddr(), MaxUint256 )
        await token1.create_allowance( routerAddr(), MaxUint256 )

        const ret = await router.contract.methods.add_liquidity(
            getA( token0 ),
            getA( token1 ),
            token0Amount,
            token1Amount,
            0n,
            0n,
            wallet.address,
            MINIMUM_LIQUIDITY,
            MaxUint256,
            extraGas,
        )
        token0.expectEvents( ret,
            emits( 'Transfer' ).withArgs(
                wallet.address, getAK( pair ), token0Amount
            ) )
        token1.expectEvents( ret,
            emits( 'Transfer' ).withArgs(
                wallet.address, getAK( pair ), token1Amount
            ) )
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
                getAK( router ), token0Amount, token1Amount
            )
        )

        expect(
            await pair.balance( wallet.address )
        ).to.eq( BigInt( expectedLiquidity - MINIMUM_LIQUIDITY ) )
    } )

    it( 'add_liquidity_ae', async () => {
        const waePartnerAmount = expandTo18Dec( 1 )
        const aeAmount = expandTo18Dec( 4 )

        const expectedLiquidity = expandTo18Dec( 2 )
        await waePartner.create_allowance( routerAddr(), MaxUint256 )

        const waePairToken0 = await waePair.token0()
        const ret = await router.contract.methods.add_liquidity_ae(
            getA( waePartner ),
            waePartnerAmount,
            waePartnerAmount,
            aeAmount,
            wallet.address,
            MINIMUM_LIQUIDITY,
            MaxUint256,
            {
                ...extraGas,
                amount: aeAmount.toString(),
            }
        )

        waePair.expectEvents( ret,
            emits( 'Mint' ).withArgs(
                getAK( waePair ),
                MINIMUM_LIQUIDITY
            ).emits( 'LockLiquidity' ).withArgs(
                MINIMUM_LIQUIDITY
            ).emits( 'Mint' ).withArgs(
                wallet.address, expectedLiquidity - MINIMUM_LIQUIDITY
            ).emits( 'Sync' ).withArgs(
                waePairToken0 === getA( waePartner ) ? waePartnerAmount : aeAmount,
                waePairToken0 === getA( waePartner ) ? aeAmount : waePartnerAmount,
            ).emits( 'PairMint' ).withArgs(
                getAK( router ),
                waePairToken0 === getA( waePartner ) ? waePartnerAmount : aeAmount,
                waePairToken0 === getA( waePartner ) ? aeAmount : waePartnerAmount,
            )
        )

        expect(
            await waePair.balance( wallet.address )
        ).to.eq( expectedLiquidity - MINIMUM_LIQUIDITY )
    } )

    async function addLiquidity(
        token0Amount,
        token1Amount,
        tokenCAmount,
    ) {
        await token0.transfer( getAK( pair ), BigInt( token0Amount ) )
        await token1.transfer( getAK( pair ), BigInt( token1Amount ) )
        await pair.mint( wallet.address, extraGas )
        //add liquidity for the third pair if it is the case
        if ( tokenCAmount ) {
            await token1.transfer( getAK( pair1C ), BigInt( token1Amount ) )
            await tokenC.transfer( getAK( pair1C ), BigInt( tokenCAmount ) )
            await pair1C.mint( wallet.address, extraGas )
        }
    }
    it( 'remove_liquidity', async () => {
        const token0Amount = expandTo18Dec( 1 )
        const token1Amount = expandTo18Dec( 4 )
        await addLiquidity( token0Amount, token1Amount )

        const expectedLiquidity = expandTo18Dec( 2 )
        await pair.create_allowance( routerAddr(), MaxUint256 )
        const ret = await router.contract.methods.remove_liquidity(
            getA( token0 ),
            getA( token1 ),
            expectedLiquidity - MINIMUM_LIQUIDITY,
            0,
            0,
            wallet.address,
            MaxUint256,
            extraGas,
        )

        pair.expectEvents( ret,
            emits( 'Transfer' ).withArgs(
                wallet.address, getAK( pair ), expectedLiquidity - MINIMUM_LIQUIDITY
            ).emits( 'Burn' ).withArgs(
                getAK( pair ), expectedLiquidity - MINIMUM_LIQUIDITY
            ).emits( 'Sync' ).withArgs(
                500, 2000
            ).emits( 'PairBurn' ).withArgs(
                getAK( router ),
                wallet.address,
                `${token0Amount - 500n}|${token1Amount - 2000n}`
            )
        )
        token0.expectEvents( ret,
            emits( 'Transfer' ).withArgs(
                getAK( pair ),
                wallet.address,
                token0Amount - 500n
            )
        )
        token1.expectEvents( ret,
            emits( 'Transfer' ).withArgs(
                getAK( pair ),
                wallet.address,
                token1Amount - 2000n
            )
        )
        expect( await pair.balance( wallet.address ) ).to.eq( 0n )

        const totalSupplyToken0 = await token0.total_supply()
        const totalSupplyToken1 = await token1.total_supply()

        expect( await token0.balance( wallet.address ) )
            .to.eq(  totalSupplyToken0 - 500n )
        expect( await token1.balance( wallet.address ) )
            .to.eq(  totalSupplyToken1 - 2000n )
    } )

    it( 'remove_liquidity_ae', async () => {
        const waePartnerAmount = expandTo18Dec( 1 )
        const aeAmount = expandTo18Dec( 4 )

        await waePartner.transfer(
            getAK( waePair ),
            waePartnerAmount
        )
        const waePairToken0 = await waePair.token0()
        await wae.deposit( { amount: aeAmount.toString() } )
        await wae.transfer( getAK( waePair ), aeAmount )
        await waePair.mint( wallet.address, extraGas )

        const expectedLiquidity = expandTo18Dec( 2 )
        await waePair.create_allowance( routerAddr(), MaxUint256 )
        const ret = await router.contract.methods.remove_liquidity_ae(
            getA( waePartner ),
            expectedLiquidity - MINIMUM_LIQUIDITY,
            0,
            0,
            wallet.address,
            MaxUint256,
            { ...extraGas },
        )

        waePair.expectEvents( ret,
            emits( 'Transfer' ).withArgs(
                wallet.address,
                getAK( waePair ),
                expectedLiquidity - MINIMUM_LIQUIDITY
            ).emits( 'Burn' ).withArgs(
                getAK( waePair ), expectedLiquidity - MINIMUM_LIQUIDITY
            ).emits( 'Sync' ).withArgs(
                waePairToken0 === getA( waePartner ) ? 500 : 2000,
                waePairToken0 === getA( waePartner ) ? 2000 : 500
            ).emits( 'PairBurn' ).withArgs(
                getAK( router ),
                getAK( router ),
                ( waePairToken0 === getA( waePartner ) ? waePartnerAmount - 500n : aeAmount - 2000n )
                + '|' +
                ( waePairToken0 === getA( waePartner ) ? aeAmount - 2000n : waePartnerAmount - 500n ),
            )
        )
        wae.expectEvents( ret,
            emits( 'Transfer' ).withArgs(
                getAK( waePair ),
                getAK( router ),
                aeAmount - 2000n
            )
        )
        waePartner.expectEvents( ret,
            emits( 'Transfer' ).withArgs(
                getAK( waePair ),
                getAK( router ),
                waePartnerAmount - 500n
            ).emits( 'Transfer' ).withArgs(
                getAK( router ),
                wallet.address,
                waePartnerAmount - 500n
            )
        )

        expect(
            await waePair.balance( wallet.address )
        ).to.eq( 0n )
        const totalSupplywaePartner = await waePartner.total_supply()
        const totalSupplywae = await wae.total_supply()
        expect(
            await waePartner.balance( wallet.address )
        ).to.eq( totalSupplywaePartner - 500n  )
        expect(
            await wae.balance( wallet.address )
        ).to.eq( totalSupplywae - 2000n )
    } )

    describe( 'swap_exact_tokens_for_tokens', () => {
        const token0Amount = expandTo18Dec( 5 )
        const token1Amount = expandTo18Dec( 10 )
        const swapAmount = expandTo18Dec( 1 )
        const expectedOutputAmount = 1662497915624478906n
        beforeEach( async () => {
            await addLiquidity( token0Amount, token1Amount )
            await token0.create_allowance( routerAddr(), MaxUint256 )
        } )
        it( 'happy path', async () => {
            const ret = await router.contract.methods.swap_exact_tokens_for_tokens(
                swapAmount,
                0,
                [ getA( token0 ), getA( token1 ) ],
                wallet.address,
                MaxUint256,
                undefined,
                extraGas,
            )
            const [ swapAmountRet, expectedOutputAmountRet ] = ret.decodedResult

            token0.expectEvents( ret,
                emits( 'Transfer' ).withArgs(
                    wallet.address, getAK( pair ), swapAmount
                )
            )
            token1.expectEvents( ret,
                emits( 'Transfer' ).withArgs(
                    getAK( pair ), wallet.address,  expectedOutputAmount
                )
            )

            pair.expectEvents( ret,
                emits( 'Sync' ).withArgs(
                    token0Amount + swapAmount, token1Amount - expectedOutputAmount
                ).emits( 'SwapTokens' ).withArgs(
                    getAK( router ),
                    wallet.address,
                    swapPayload(
                        swapAmount,
                        0,
                        0,
                        expectedOutputAmount,
                    )
                )
            )

            expect( swapAmountRet ).to.eq( swapAmount )
            expect( expectedOutputAmountRet ).to.eq( expectedOutputAmount )
        } )

    } )

    describe( 'longer_path: swap_exact_tokens_for_tokens', () => {
        const token0Amount = expandTo18Dec( 5 )
        const token1Amount = expandTo18Dec( 10 )
        const tokenCAmount = expandTo18Dec( 20 )
        const swapAmount = expandTo18Dec( 1 )
        const expected1OutputAmount = 1662497915624478906n
        const expectedCOutputAmount = 2843678215834080602n

        beforeEach( async () => {
            await addLiquidity( token0Amount, token1Amount, tokenCAmount )
            await token0.create_allowance( routerAddr(), MaxUint256 )
        } )
        it( 'happy path', async () => {
            const ret = await router.contract.methods.swap_exact_tokens_for_tokens(
                swapAmount,
                0,
                [ getA( token0 ), getA( token1 ), getA( tokenC ) ],
                wallet.address,
                MaxUint256,
                undefined,
                {
                    ...extraGas,
                }
            )

            token0.expectEvents( ret,
                emits( 'Transfer' ).withArgs(
                    wallet.address, getAK( pair ), swapAmount
                )
            )
            token1.expectEvents( ret,
                emits( 'Transfer' ).withArgs(
                    getAK( pair ), getAK( pair1C ), expected1OutputAmount
                )
            )
            tokenC.expectEvents( ret,
                emits( 'Transfer' ).withArgs(
                    getAK( pair1C ), wallet.address, expectedCOutputAmount
                )
            )
            pair.expectEvents( ret,
                emits( 'Sync' ).withArgs(
                    token0Amount + swapAmount, token1Amount - expected1OutputAmount
                ).emits( 'SwapTokens' ).withArgs(
                    getAK( router ),
                    getAK( pair1C ),
                    swapPayload(
                        swapAmount,
                        0,
                        0,
                        expected1OutputAmount,
                    )
                )
            )
            const pair1CToken0 = await pair1C.token0()
            const reverseIfTokenCisFirst = ( xs ) =>
                pair1CToken0 == getA( tokenC ) ? xs.reverse() : xs

            //reverse if tokenC is first token in pair
            const [ fstSyncArg, sndSyncArg ] = reverseIfTokenCisFirst( [
                token1Amount + expected1OutputAmount, tokenCAmount - expectedCOutputAmount
            ] )
            const [ fstSwapInArg, sndSwapInArg ] = reverseIfTokenCisFirst(
                [ expected1OutputAmount, 0 ]
            )
            const [ fstSwapOutArg, sndSwapOutArg ] = reverseIfTokenCisFirst(
                [ 0, expectedCOutputAmount, ]
            )
            pair1C.expectEvents( ret,
                emits( 'Sync' ).withArgs(
                    fstSyncArg, sndSyncArg
                ).emits( 'SwapTokens' ).withArgs(
                    getAK( router ),
                    wallet.address,
                    //reverse if tokenC is first token in pair
                    swapPayload( fstSwapInArg, sndSwapInArg, fstSwapOutArg, sndSwapOutArg )
                )
            )
            const amounts = ret.decodedResult

            expect( amounts[0] ).to.eq( swapAmount )
            expect( amounts[1] ).to.eq( expected1OutputAmount )
            expect( amounts[2] ).to.eq( expectedCOutputAmount )
        } )

    } )

    describe( 'swap_tokens_for_exact_tokens', () => {
        const token0Amount = expandTo18Dec( 5 )
        const token1Amount = expandTo18Dec( 10 )
        const expectedSwapAmount = 557227237267357629n
        const outputAmount = expandTo18Dec( 1 )

        beforeEach( async () => {
            await addLiquidity( token0Amount, token1Amount )
        } )

        it( 'happy path', async () => {
            await token0.create_allowance( getAK( router ), MaxUint256 )
            const ret = await router.contract.methods.swap_tokens_for_exact_tokens(
                outputAmount,
                MaxUint256,
                [ getA( token0 ), getA( token1 ) ],
                wallet.address,
                MaxUint256,
                undefined,
                extraGas,
            )

            token0.expectEvents( ret,
                emits( 'Transfer' ).withArgs(
                    wallet.address, getAK( pair ), expectedSwapAmount
                )
            )
            token1.expectEvents( ret,
                emits( 'Transfer' ).withArgs(
                    getAK( pair ), wallet.address,  outputAmount
                )
            )
            pair.expectEvents( ret,
                emits( 'Sync' ).withArgs(
                    token0Amount + expectedSwapAmount,
                    token1Amount - outputAmount
                ).emits( 'SwapTokens' ).withArgs(
                    getAK( router ),
                    wallet.address,
                    swapPayload(
                        expectedSwapAmount,
                        0,
                        0,
                        outputAmount,
                    )
                )
            )
            const amounts = ret.decodedResult
            expect( amounts[0] ).to.eq( expectedSwapAmount )
            expect( amounts[1] ).to.eq( outputAmount )
        } )

    } )
    describe( 'longer_path: swap_tokens_for_exact_tokens', () => {
        const token0Amount = expandTo18Dec( 5 )
        const token1Amount = expandTo18Dec( 10 )
        const tokenCAmount = expandTo18Dec( 20 )
        const expectedSwapAmount = 279498697843516618n
        const expected1InAmount = 527899487937496701n
        const outputAmount = expandTo18Dec( 1 )

        beforeEach( async () => {
            await addLiquidity( token0Amount, token1Amount, tokenCAmount )
        } )

        it( 'happy path', async () => {
            await token0.create_allowance( getAK( router ), MaxUint256 )
            const ret = await router.contract.methods.swap_tokens_for_exact_tokens(
                outputAmount,
                MaxUint256,
                [ getA( token0 ), getA( token1 ), getA( tokenC ) ],
                wallet.address,
                MaxUint256,
                undefined,
                extraGas,
            )
            const amounts = ret.decodedResult

            token0.expectEvents( ret,
                emits( 'Transfer' ).withArgs(
                    wallet.address, getAK( pair ), expectedSwapAmount
                )
            )
            token1.expectEvents( ret,
                emits( 'Transfer' ).withArgs(
                    getAK( pair ), getAK( pair1C ),  expected1InAmount
                )
            )
            tokenC.expectEvents( ret,
                emits( 'Transfer' ).withArgs(
                    getAK( pair1C ), wallet.address,  outputAmount
                )
            )
            pair.expectEvents( ret,
                emits( 'Sync' ).withArgs(
                    token0Amount + expectedSwapAmount,
                    token1Amount - expected1InAmount
                ).emits( 'SwapTokens' ).withArgs(
                    getAK( router ),
                    getAK( pair1C ),
                    swapPayload(
                        expectedSwapAmount,
                        0,
                        0,
                        expected1InAmount,
                    )
                )
            )
            const pair1CToken0 = await pair1C.token0()
            const reverseIfTokenCisFirst = ( xs ) =>
                pair1CToken0 == getA( tokenC ) ? xs.reverse() : xs

            //reverse if tokenC is first token in pair
            const [ fstSyncArg, sndSyncArg ] = reverseIfTokenCisFirst( [
                token1Amount + expected1InAmount, tokenCAmount - outputAmount
            ] )
            const [ fstSwapInArg, sndSwapInArg ] = reverseIfTokenCisFirst(
                [ expected1InAmount, 0 ]
            )

            const [ fstSwapOutArg, sndSwapOutArg ] = reverseIfTokenCisFirst(
                [ 0, outputAmount, ]
            )
            pair1C.expectEvents( ret,
                emits( 'Sync' ).withArgs(
                    fstSyncArg, sndSyncArg,
                ).emits( 'SwapTokens' ).withArgs(
                    getAK( router ),
                    wallet.address,
                    //reverse if tokenC is first token in pair
                    swapPayload( fstSwapInArg, sndSwapInArg, fstSwapOutArg, sndSwapOutArg )
                )
            )

            expect( amounts[0] ).to.eq( expectedSwapAmount )
            expect( amounts[1] ).to.eq( expected1InAmount )
            expect( amounts[2] ).to.eq( outputAmount )
        } )

    } )
    describe( 'swap_exact_ae_for_tokens', () => {
        const waePartnerAmount = expandTo18Dec( 10 )
        const aeAmount = expandTo18Dec( 5 )
        const swapAmount = expandTo18Dec( 1 )
        const expectedOutputAmount = 1662497915624478906n

        beforeEach( async () => {
            await waePartner.transfer( getAK( waePair ), waePartnerAmount )
            await wae.deposit( { amount: aeAmount.toString() } )
            await wae.transfer( getAK( waePair ), aeAmount )
            await waePair.mint( wallet.address, extraGas )
        } )

        it( 'happy path', async () => {
            const waePairToken0 = await waePair.token0()
            const ret = await router.contract.methods.swap_exact_ae_for_tokens(
                0,
                [ getA( wae ), getA( waePartner ) ]
                , wallet.address
                , MaxUint256
                , undefined
                , {
                    ...extraGas,
                    amount: swapAmount.toString()
                } )
            const amounts = ret.decodedResult

            wae.expectEvents( ret,
                emits( 'Deposit' ).withArgs(
                    getAK( router ), swapAmount
                ).emits( 'Transfer' ).withArgs(
                    getAK( router ), getAK( waePair ), swapAmount
                )
            )
            waePartner.expectEvents( ret,
                emits( 'Transfer' ).withArgs(
                    getAK( waePair ), wallet.address, expectedOutputAmount
                )
            )
            const isWaeToken0 = waePairToken0 === getA( waePartner )
            waePair.expectEvents( ret,
                emits( 'Sync' ).withArgs(
                    isWaeToken0
                        ? waePartnerAmount - expectedOutputAmount
                        : aeAmount + swapAmount,
                    isWaeToken0
                        ? aeAmount + swapAmount
                        : waePartnerAmount - expectedOutputAmount
                ).emits( 'SwapTokens' ).withArgs(
                    getAK( router ),
                    wallet.address,
                    swapPayload(
                        isWaeToken0 ? 0 : swapAmount,
                        isWaeToken0 ? swapAmount : 0,
                        isWaeToken0 ? expectedOutputAmount : 0,
                        isWaeToken0 ? 0 : expectedOutputAmount,
                    )
                )
            )

            expect( amounts[0] ).to.eq( swapAmount )
            expect( amounts[1] ).to.eq( expectedOutputAmount )
        } )

    } )
    describe( 'swap_tokens_for_exact_ae', () => {
        const waePartnerAmount = expandTo18Dec( 5 )
        const aeAmount = expandTo18Dec( 10 )
        const expectedSwapAmount = 557227237267357629n
        const outputAmount = expandTo18Dec( 1 )

        beforeEach( async () => {
            await waePartner.transfer( getAK( waePair ), waePartnerAmount )
            await wae.deposit( { amount: aeAmount.toString() } )
            await wae.transfer( getAK( waePair ), aeAmount )
            await waePair.mint( wallet.address, extraGas )
        } )

        it( 'happy path', async () => {
            const waePairToken0 = await waePair.token0()
            await waePartner.create_allowance( getAK( router ), MaxUint256 )
            const ret = await router.contract.methods.swap_tokens_for_exact_ae(
                outputAmount,
                MaxUint256,
                [ getA( waePartner ), getA( wae ) ],
                wallet.address,
                MaxUint256,
                undefined,
                extraGas
            )
            waePartner.expectEvents( ret,
                emits( 'Transfer' ).withArgs(
                    wallet.address, getAK( waePair ), expectedSwapAmount
                )
            )
            wae.expectEvents( ret,
                emits( 'Transfer' ).withArgs(
                    getAK( waePair ), getAK( router ), outputAmount
                )
            )
            const isWaeToken0 = waePairToken0 === getA( waePartner )
            waePair.expectEvents( ret,
                emits( 'Sync' ).withArgs(
                    isWaeToken0
                        ? waePartnerAmount + expectedSwapAmount
                        : aeAmount - outputAmount,
                    isWaeToken0
                        ? aeAmount - outputAmount
                        : waePartnerAmount + expectedSwapAmount
                ).emits( 'SwapTokens' ).withArgs(
                    getAK( router ),
                    getAK( router ),
                    swapPayload(
                        isWaeToken0 ? expectedSwapAmount : 0,
                        isWaeToken0 ? 0 : expectedSwapAmount,
                        isWaeToken0 ? 0 : outputAmount,
                        isWaeToken0 ? outputAmount : 0,
                    )
                )
            )
            const amounts = ret.decodedResult
            expect( amounts[0] ).to.eq( expectedSwapAmount )
            expect( amounts[1] ).to.eq( outputAmount )
        } )

    } )
    describe( 'swap_exact_tokens_for_ae', () => {
        const waePartnerAmount = expandTo18Dec( 5 )
        const aeAmount = expandTo18Dec( 10 )
        const swapAmount = expandTo18Dec( 1 )
        const expectedOutputAmount = 1662497915624478906n

        beforeEach( async () => {
            await waePartner.transfer(
                getAK( waePair ), waePartnerAmount )
            await wae.deposit( { amount: aeAmount.toString() } )
            await wae.transfer( getAK( waePair ), aeAmount )
            await waePair.mint( wallet.address, extraGas )
        } )

        it( 'happy path', async () => {
            await waePartner.create_allowance( getAK( router ), MaxUint256 )
            const waePairToken0 = await waePair.token0()
            const isWaeToken0 = waePairToken0 === getA( waePartner )
            const ret = await router.contract.methods.swap_exact_tokens_for_ae(
                swapAmount,
                0,
                [ getA( waePartner ), getA( wae ) ],
                wallet.address,
                MaxUint256,
                undefined,
                extraGas,
            )

            waePartner.expectEvents( ret,
                emits( 'Transfer' ).withArgs(
                    wallet.address, getAK( waePair ), swapAmount
                )
            )
            wae.expectEvents( ret,
                emits( 'Transfer' ).withArgs(
                    getAK( waePair ), getAK( router ), expectedOutputAmount
                )
            )
            waePair.expectEvents( ret,
                emits( 'Sync' ).withArgs(
                    isWaeToken0
                        ? waePartnerAmount + swapAmount
                        : aeAmount - expectedOutputAmount,
                    isWaeToken0
                        ? aeAmount - expectedOutputAmount
                        : waePartnerAmount + swapAmount
                ).emits( 'SwapTokens' ).withArgs(
                    getAK( router ),
                    getAK( router ),
                    swapPayload(
                        isWaeToken0 ? swapAmount : 0,
                        isWaeToken0 ? 0 : swapAmount,
                        isWaeToken0 ? 0 : expectedOutputAmount,
                        isWaeToken0 ? expectedOutputAmount : 0,
                    )
                )
            )
            const amounts = ret.decodedResult

            expect( amounts[0] ).to.eq( swapAmount )
            expect( amounts[1] ).to.eq( expectedOutputAmount )
        } )
    } )

    describe( 'swap_ae_for_exact_tokens', () => {
        const waePartnerAmount = expandTo18Dec( 10 )
        const aeAmount = expandTo18Dec( 5 )
        const expectedSwapAmount = 557227237267357629n
        const outputAmount = expandTo18Dec( 1 )

        beforeEach( async () => {
            await waePartner.exe( x => x.transfer(
                getAK( waePair ),
                waePartnerAmount
            ) )
            await wae.deposit( { amount: aeAmount.toString() } )
            await wae.transfer( getAK( waePair ), aeAmount )
            await waePair.mint( wallet.address, extraGas )
        } )

        it( 'happy path', async () => {
            const waePairToken0 = await waePair.token0()
            const isWaeToken0 = waePairToken0 === getA( waePartner )
            const ret = await router.contract.methods.swap_ae_for_exact_tokens(
                outputAmount,
                [ getA( wae ), getA( waePartner ) ],
                wallet.address,
                MaxUint256,
                undefined,
                {
                    ...extraGas,
                    amount: expectedSwapAmount.toString()
                }
            )
            wae.expectEvents( ret,
                emits( 'Deposit' ).withArgs(
                    getAK( router ), expectedSwapAmount
                ).emits( 'Transfer' ).withArgs(
                    getAK( router ), getAK( waePair ), expectedSwapAmount
                )
            )
            waePartner.expectEvents( ret,
                emits( 'Transfer' ).withArgs(
                    getAK( waePair ), wallet.address, outputAmount
                )
            )
            waePair.expectEvents( ret,
                emits( 'Sync' ).withArgs(
                    isWaeToken0
                        ? waePartnerAmount - outputAmount
                        : aeAmount + expectedSwapAmount,
                    isWaeToken0
                        ? aeAmount + expectedSwapAmount
                        : waePartnerAmount - outputAmount
                ).emits( 'SwapTokens' ).withArgs(
                    getAK( router ),
                    wallet.address,
                    swapPayload(
                        isWaeToken0 ? 0 : expectedSwapAmount,
                        isWaeToken0 ? expectedSwapAmount : 0,
                        isWaeToken0 ? outputAmount : 0,
                        isWaeToken0 ? 0 : outputAmount,
                    )
                )
            )
            const amounts = ret.decodedResult
            expect( amounts[0] ).to.eq( expectedSwapAmount )
            expect( amounts[1] ).to.eq( outputAmount )
        } )
    } )
} )
