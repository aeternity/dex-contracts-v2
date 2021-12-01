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
const MINIMUM_LIQUIDITY = 1000n //BigInt( BigNumber.from( 10 ).pow( 3 ) )

const { defaultWallets: WALLETS } = require( '../config/wallets.json' )

import {
    getA,
    routerFixture,
    beforeEachWithSnapshot,
    getAK,
} from './shared/fixtures'

import {
    expandTo18Decimals,
    MaxUint256 as MaxUint256BN,
    emits,
} from './shared/utilities'
const expand18 = ( n ) => BigInt( expandTo18Decimals( n ) )
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
        const token0Amount = expandTo18Decimals( 1 )
        const token1Amount = expandTo18Decimals( 4 )

        const expectedLiquidity = expand18( 2 )
        await token0.create_allowance( routerAddr(), MaxUint256 )
        await token1.create_allowance( routerAddr(), MaxUint256 )

        const ret = await router.contract.methods.add_liquidity(
            getA( token0 ),
            getA( token1 ),
            BigInt( token0Amount ),
            BigInt( token1Amount ),
            0n,
            0n,
            wallet.address,
            MaxUint256,
            extraGas,
        )
        //TODO: this should be replaced in accordance
        //with decision from _mint comment from the AedexV2Pair.aes
        const addressZero = getAK( pair )
        token0.expectEvents( ret,
            emits( "Transfer" ).withArgs(
                wallet.address, getAK( pair ), token0Amount
            ) )
        token1.expectEvents( ret,
            emits( "Transfer" ).withArgs(
                wallet.address, getAK( pair ), token1Amount
            ) )
        pair.expectEvents( ret,
            emits( "LockLiquidity" ).withArgs(
                MINIMUM_LIQUIDITY
            ).emits( "Transfer" ).withArgs(
                addressZero,
                wallet.address,
                expectedLiquidity - MINIMUM_LIQUIDITY,
            ).emits( "Sync" ).withArgs(
                token0Amount, token1Amount
            ).emits( "Mint" ).withArgs(
                getAK( router ), token0Amount, token1Amount
            )
        )

        expect(
            await pair.balance( wallet.address )
        ).to.eq( BigInt( expectedLiquidity - MINIMUM_LIQUIDITY ) )
    } )

    it( 'add_liquidity_ae', async () => {
        const waePartnerAmount = expand18( 1 )
        const aeAmount = expand18( 4 )

        const expectedLiquidity = expand18( 2 )
        await waePartner.create_allowance( routerAddr(), MaxUint256 )

        const waePairToken0 = await waePair.token0()
        const ret = await router.contract.methods.add_liquidity_ae(
            getA( waePartner ),
            waePartnerAmount,
            waePartnerAmount,
            aeAmount,
            wallet.address,
            MaxUint256,
            {
                ...extraGas,
                amount: aeAmount.toString(),
            }
        )

        //TODO: this should be replaced in accordance
        //with decision from _mint comment from the AedexV2Pair.aes
        const addressZero = getAK( waePair )
        waePair.expectEvents( ret,
            emits( "LockLiquidity" ).withArgs(
                MINIMUM_LIQUIDITY
            ).emits( 'Transfer' ).withArgs(
                addressZero, wallet.address, expectedLiquidity - MINIMUM_LIQUIDITY
            ).emits( 'Sync' ).withArgs(
                waePairToken0 === getA( waePartner ) ? waePartnerAmount : aeAmount,
                waePairToken0 === getA( waePartner ) ? aeAmount : waePartnerAmount,
            ).emits( 'Mint' ).withArgs(
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
            await tokenC.transfer( getAK( pair1C ), BigInt( token1Amount ) )
            await pair1C.mint( wallet.address, extraGas )
        }
    }
    it( 'remove_liquidity', async () => {
        const token0Amount = expand18( 1 )
        const token1Amount = expand18( 4 )
        await addLiquidity( token0Amount, token1Amount )

        const expectedLiquidity = expand18( 2 )
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

        //TODO: this should be replaced in accordance
        //with decision from _mint comment from the AedexV2Pair.aes
        const addressZero = getAK( pair )

        pair.expectEvents( ret,
            emits( 'Transfer' ).withArgs(
                wallet.address, getAK( pair ), expectedLiquidity - MINIMUM_LIQUIDITY
            ).emits( 'Transfer' ).withArgs(
                getAK( pair ), addressZero, expectedLiquidity - MINIMUM_LIQUIDITY
            ).emits( 'Sync' ).withArgs(
                500, 2000
            ).emits( 'Burn' ).withArgs(
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
        const waePartnerAmount = expand18( 1 )
        const aeAmount = expand18( 4 )

        await waePartner.transfer(
            getAK( waePair ),
            waePartnerAmount
        )
        const waePairToken0 = await waePair.token0()
        await wae.deposit( { amount: aeAmount.toString() } )
        await wae.transfer( getAK( waePair ), aeAmount )
        await waePair.mint( wallet.address, extraGas )

        const expectedLiquidity = expand18( 2 )
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

        //TODO: this should be replaced in accordance
        //with decision from _mint comment from the AedexV2Pair.aes
        const addressZero = getAK( waePair )
        waePair.expectEvents( ret,
            emits( 'Transfer' ).withArgs(
                wallet.address,
                getAK( waePair ),
                expectedLiquidity - MINIMUM_LIQUIDITY
            ).emits( 'Transfer' ).withArgs(
                getAK( waePair ),
                addressZero,
                expectedLiquidity - MINIMUM_LIQUIDITY
            ).emits( 'Sync' ).withArgs(
                waePairToken0 === getA( waePartner ) ? 500 : 2000,
                waePairToken0 === getA( waePartner ) ? 2000 : 500
            ).emits( 'Burn' ).withArgs(
                getAK( router ),
                getAK( router ),
                ( waePairToken0 === getA( waePartner ) ? waePartnerAmount - 500n : aeAmount - 2000n )
                + "|" +
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
        const token0Amount = expand18( 5 )
        const token1Amount = expand18( 10 )
        const swapAmount = expand18( 1 )
        const expectedOutputAmount = 1662497915624478906n
        beforeEach( async () => {
            await addLiquidity( token0Amount, token1Amount )
            await token0.exe( x => x.create_allowance( routerAddr(), MaxUint256 ) )
        } )
        it( 'happy path', async () => {
            const [ swapAmountRet, expectedOutputAmountRet ] = await router.exe(
                x => x.swap_exact_tokens_for_tokens(
                    swapAmount,
                    0,
                    [ getA( token0 ), getA( token1 ) ],
                    wallet.address,
                    MaxUint256,
                    undefined,
                    {
                        ...extraGas,
                    }
            //), events( emits( 'Transfer' ) )
                ),
            )

            expect( swapAmountRet ).to.eq( swapAmount )
            expect( expectedOutputAmountRet ).to.eq( expectedOutputAmount )
        } )

    } )

    describe( 'longer_path: swap_exact_tokens_for_tokens', () => {
        const token0Amount = expand18( 5 )
        const token1Amount = expand18( 10 )
        const tokenCAmount = expand18( 20 )
        const swapAmount = expand18( 1 )
        const expected1OutputAmount = 1662497915624478906n
        const expectedCOutputAmount = 1421839107917040301n

        beforeEach( async () => {
            await addLiquidity( token0Amount, token1Amount, tokenCAmount )
            await token0.exe( x => x.create_allowance( routerAddr(), MaxUint256 ) )
        } )
        it( 'happy path', async () => {
            const amounts = await router.exe(
                x => x.swap_exact_tokens_for_tokens(
                    swapAmount,
                    0,
                    [ getA( token0 ), getA( token1 ), getA( tokenC ) ],
                    wallet.address,
                    MaxUint256,
                    undefined,
                    {
                        ...extraGas,
                    }
                ),
            )

            expect( amounts[0] ).to.eq( swapAmount )
            expect( amounts[1] ).to.eq( expected1OutputAmount )
            expect( amounts[2] ).to.eq( expectedCOutputAmount )
        } )

    } )

    describe( 'swap_tokens_for_exact_tokens', () => {
        const token0Amount = expand18( 5 )
        const token1Amount = expand18( 10 )
        const expectedSwapAmount = 557227237267357629n
        const outputAmount = expand18( 1 )

        beforeEach( async () => {
            await addLiquidity( token0Amount, token1Amount )
        } )

        it( 'happy path', async () => {
            await token0.exe( x => x.create_allowance( getAK( router ), MaxUint256 ) )
            const amounts = await router.exe( x => x.swap_tokens_for_exact_tokens(
                outputAmount,
                MaxUint256,
                [ getA( token0 ), getA( token1 ) ],
                wallet.address,
                MaxUint256,
                undefined,
                extraGas,
            ) )

            expect( amounts[0] ).to.eq( expectedSwapAmount )
            expect( amounts[1] ).to.eq( outputAmount )
        } )

    } )
    describe( 'longer_path: swap_tokens_for_exact_tokens', () => {
        const token0Amount = expand18( 5 )
        const token1Amount = expand18( 10 )
        const tokenCAmount = expand18( 20 )
        const expectedSwapAmount = 629003528835597474n
        const expected1InAmount = 1114454474534715257n
        const outputAmount = expand18( 1 )

        beforeEach( async () => {
            await addLiquidity( token0Amount, token1Amount, tokenCAmount )
        } )

        it( 'happy path', async () => {
            await token0.exe( x => x.create_allowance( getAK( router ), MaxUint256 ) )

            const amounts = await router.exe( x => x.swap_tokens_for_exact_tokens(
                outputAmount,
                MaxUint256,
                [ getA( token0 ), getA( token1 ), getA( tokenC ) ],
                wallet.address,
                MaxUint256,
                undefined,
                extraGas,
            ) )

            expect( amounts[0] ).to.eq( expectedSwapAmount )
            expect( amounts[1] ).to.eq( expected1InAmount )
            expect( amounts[2] ).to.eq( outputAmount )
        } )

    } )
    describe( 'swap_exact_ae_for_tokens', () => {
        const waePartnerAmount = expand18( 10 )
        const aeAmount = expand18( 5 )
        const swapAmount = expand18( 1 )
        const expectedOutputAmount = 1662497915624478906n

        beforeEach( async () => {
            await waePartner.exe( x => x.transfer( getAK( waePair ), waePartnerAmount ) )
            await wae.exe( x => x.deposit( { amount: aeAmount.toString() } ) )
            await wae.exe( x => x.transfer( getAK( waePair ), aeAmount ) )
            await waePair.exe( x => x.mint( wallet.address, extraGas ) )

            //TODO: why that?
            await token0.exe( x => x.create_allowance( getAK( router ), MaxUint256 ) )
        } )

        it( 'happy path', async () => {
            const amounts = await router.exe( x => x.swap_exact_ae_for_tokens(
                0,
                [ getA( wae ), getA( waePartner ) ]
                , wallet.address
                , MaxUint256
                , undefined
                , {
                    ...extraGas,
                    amount: swapAmount.toString()
                } )
            )
            expect( amounts[0] ).to.eq( swapAmount )
            expect( amounts[1] ).to.eq( expectedOutputAmount )
        } )

    } )
    describe( 'swap_tokens_for_exact_ae', () => {
        const waePartnerAmount = expand18( 5 )
        const aeAmount = expand18( 10 )
        const expectedSwapAmount = 557227237267357629n
        const outputAmount = expand18( 1 )

        beforeEach( async () => {
            await waePartner.exe( x => x.transfer( getAK( waePair ), waePartnerAmount ) )
            await wae.exe( x => x.deposit( { amount: aeAmount.toString() } ) )
            await wae.exe( x => x.transfer( getAK( waePair ), aeAmount ) )
            await waePair.exe( x => x.mint( wallet.address, extraGas ) )
        } )

        it( 'happy path', async () => {
            await waePartner.exe( x => x.create_allowance( getAK( router ), MaxUint256 ) )
            const amounts = await router.exe( x => x.swap_tokens_for_exact_ae(
                outputAmount,
                MaxUint256,
                [ getA( waePartner ), getA( wae ) ],
                wallet.address,
                MaxUint256,
                undefined,
                extraGas
            ) )
            expect( amounts[0] ).to.eq( expectedSwapAmount )
            expect( amounts[1] ).to.eq( outputAmount )
        } )

    } )
    describe( 'swap_exact_tokens_for_ae', () => {
        const waePartnerAmount = expand18( 5 )
        const aeAmount = expand18( 10 )
        const swapAmount = expand18( 1 )
        const expectedOutputAmount = 1662497915624478906n

        beforeEach( async () => {
            await waePartner.exe( x => x.transfer(
                getAK( waePair ), waePartnerAmount ) )
            await wae.exe( x => x.deposit( { amount: aeAmount.toString() } ) )
            await wae.exe( x => x.transfer( getAK( waePair ), aeAmount ) )
            await waePair.exe( x => x.mint( wallet.address, extraGas ) )
        } )

        it( 'happy path', async () => {
            await waePartner.exe( x =>
                x.create_allowance( getAK( router ), MaxUint256 )
            )
            const amounts = await router.exe( x => x.swap_exact_tokens_for_ae(
                swapAmount,
                0,
                [ getA( waePartner ), getA( wae ) ],
                wallet.address,
                MaxUint256,
                undefined,
                extraGas,
            ) )
            expect( amounts[0] ).to.eq( swapAmount )
            expect( amounts[1] ).to.eq( expectedOutputAmount )
        } )
    } )

    describe( 'swap_ae_for_exact_tokens', () => {
        const waePartnerAmount = expand18( 10 )
        const aeAmount = expand18( 5 )
        const expectedSwapAmount = 557227237267357629n
        const outputAmount = expand18( 1 )

        beforeEach( async () => {
            await waePartner.exe( x => x.transfer(
                getAK( waePair ),
                waePartnerAmount
            ) )
            await wae.exe( x => x.deposit( { amount: aeAmount.toString() } ) )
            await wae.exe( x => x.transfer( getAK( waePair ), aeAmount ) )
            await waePair.exe( x => x.mint( wallet.address, extraGas ) )
        } )

        it( 'happy path', async () => {
            const amounts = await router.exe( x => x.swap_ae_for_exact_tokens(
                outputAmount,
                [ getA( wae ), getA( waePartner ) ],
                wallet.address,
                MaxUint256,
                undefined,
                {
                    ...extraGas,
                    amount: expectedSwapAmount.toString()
                }
            ) )
            expect( amounts[0] ).to.eq( expectedSwapAmount )
            expect( amounts[1] ).to.eq( outputAmount )
        } )
    } )
} )
