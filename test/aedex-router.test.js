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
    let wae
    let waePartner
    let factory
    let router
    let pair
    let waePair
    afterEach( async function() {
        expect( await router.exe( x => x.balance() ) ).to.eq( 0n )
    } )
    beforeEachWithSnapshot( 'first compile pool factory', async () => {
        ( {
            token0,
            token1,
            wae,
            waePartner,
            factory,
            router,
            pair,
            waePair,
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

        const expectedLiquidity = expandTo18Decimals( 2 )
        await token0.exe( x => x.create_allowance( routerAddr(), MaxUint256 ) )
        await token1.exe( x => x.create_allowance( routerAddr(), MaxUint256 ) )

        await router.exe( x => x.add_liquidity(
            getA( token0 ),
            getA( token1 ),
            BigInt( token0Amount ),
            BigInt( token1Amount ),
            0n,
            0n,
            wallet.address,
            MaxUint256, 
            extraGas,
        ) )
        expect( 
            await pair.exe( x => x.balance( wallet.address ) )
        ).to.eq( BigInt( expectedLiquidity.sub( MINIMUM_LIQUIDITY ) ) )
    } )

    it( 'add_liquidity_ae', async () => {
        const waePartnerAmount = BigInt( expandTo18Decimals( 1 ) )
        const aeAmount = BigInt( expandTo18Decimals( 4 ) )

        const expectedLiquidity = expandTo18Decimals( 2 )
        await waePartner.exe( x => x.create_allowance( routerAddr(), MaxUint256 ) )

        await router.exe( x => x.add_liquidity_ae(
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
        ) )

        expect(
            await waePair.exe( x => x.balance( wallet.address ) )
        ).to.eq( BigInt(  expectedLiquidity.sub( MINIMUM_LIQUIDITY ) ) )
    } )
    async function addLiquidity( token0Amount, token1Amount ) {
        await token0.exe( x => x.transfer( getAK( pair ), BigInt( token0Amount ) ) )
        await token1.exe( x => x.transfer( getAK( pair ), BigInt( token1Amount ) ) )
        await pair.exe( x => x.mint( wallet.address, extraGas ) )
    }
    it( 'remove_liquidity', async () => {
        const token0Amount = expandTo18Decimals( 1 )
        const token1Amount = expandTo18Decimals( 4 )
        await addLiquidity( token0Amount, token1Amount )

        const expectedLiquidity = expandTo18Decimals( 2 )
        await pair.exe( x => x.create_allowance( routerAddr(), MaxUint256 ) )
        await router.exe( x => x.remove_liquidity(
            getA( token0 ),
            getA( token1 ),
            BigInt( expectedLiquidity.sub( MINIMUM_LIQUIDITY ) ),
            0,
            0,
            wallet.address,
            MaxUint256,
            extraGas,
        ) )

        expect( await pair.exe( x => x.balance( wallet.address ) ) ).to.eq( 0n )

        const totalSupplyToken0 = BigInt( await token0.exe( x => x.total_supply() ) )
        const totalSupplyToken1 = BigInt( await token1.exe( x => x.total_supply() ) )

        expect( await token0.exe( x => x.balance( wallet.address ) ) )
            .to.eq(  totalSupplyToken0 - 500n )  
        expect( await token1.exe( x => x.balance( wallet.address ) ) )
            .to.eq(  totalSupplyToken1 - 2000n )  
    } )

    it( 'remove_liquidity_ae', async () => {
        const waePartnerAmount = BigInt( expandTo18Decimals( 1 ) )
        const aeAmount = BigInt( expandTo18Decimals( 4 ) ) 

        await waePartner.exe( x => x.transfer( 
            getAK( waePair ),
            waePartnerAmount 
        ) )
        await wae.exe( x => x.deposit( { amount: aeAmount.toString() } ) )
        await wae.exe( x => x.transfer( getAK( waePair ), aeAmount ) )
        await waePair.exe( x => x.mint( wallet.address, extraGas ) )

        const expectedLiquidity = BigInt( expandTo18Decimals( 2 ) )
        await waePair.exe( x => x.create_allowance( routerAddr(), MaxUint256 ) )
        await router.exe( x => x.remove_liquidity_ae(
            getA( waePartner ),
            expectedLiquidity - MINIMUM_LIQUIDITY,
            0,
            0,
            wallet.address,
            MaxUint256,
            {
                ...extraGas,
            }
        ) )

        expect(
            await waePair.exe( x => x.balance( wallet.address ) )
        ).to.eq( 0n )
        const totalSupplywaePartner = BigInt( await waePartner.exe( x => x.total_supply() ) )
        const totalSupplywae = BigInt( await wae.exe( x => x.total_supply() ) )
        expect(
            await waePartner.exe( x => x.balance( wallet.address ) )
        ).to.eq( totalSupplywaePartner - 500n  )
        expect(
            await wae.exe( x => x.balance( wallet.address ) )
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
            expect( expectedOutputAmountRet ).to.eq( expectedOutputAmountRet )
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
            const waePairToken0 = await waePair.exe( x => x.token0() )
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
            const waePairToken0 = await waePair.exe( x => x.token0() )
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
            const waePairToken0 = await waePair.exe( x => x.token0() )
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
            const waePairToken0 = await waePair.exe( x => x.token0() )
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
