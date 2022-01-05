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
const { defaultWallets: WALLETS } = require( '../config/wallets.json' )

import {
    getA,
    routerFixture,
    getAK,
} from './shared/fixtures'

import {
    expandTo18Dec,
    MaxUint256 as MaxUint256BN,
    MINIMUM_LIQUIDITY,
} from './shared/utilities'
const MaxUint256 = BigInt( MaxUint256BN )

const wallet = {
    ...WALLETS[0],
    address: WALLETS[0].publicKey
}

const extraGas = { gas: 150000 }

const userWallets = [
    'ak_2kE1RxHzsRE4LxDFu6WKi35BwPvrEawBjNtV788Gje3yqADvwR', // bm
    'ak_rRVV9aDnmmLriPePDSvfTUvepZtR2rbYk2Mx4GCqGLcc1DMAq', // keno
]

describe( 'Pair Router', () => {
    let token0
    let token1
    let waePartner
    let router

    const multuplier = 1000000
    before( 'first compile pool factory', async () => {
        ( {
            token0,
            token1,
            waePartner,
            router,
        } = await routerFixture( undefined, 1000 * multuplier ) )
    } )
    const routerAddr = () =>  getAK( router )

    it( 'add_liquidity', async () => {
        const token0Amount = expandTo18Dec( 1 * multuplier )
        const token1Amount = expandTo18Dec( 4 * multuplier )

        await token0.create_allowance( routerAddr(), MaxUint256 )
        await token1.create_allowance( routerAddr(), MaxUint256 )

        await router.add_liquidity(
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
    } )

    it( 'add_liquidity_ae', async () => {
        const waePartnerAmount = expandTo18Dec( 100  )
        const aeAmount = expandTo18Dec( 400  )

        await waePartner.create_allowance( routerAddr(), MaxUint256 )

        await router.add_liquidity_ae(
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

    } )

    const userAmount = expandTo18Dec( 100000 )
    userWallets.map( x => {
        it( `add found to token0 for ${x}`, async () => {
            await token0.transfer( x, userAmount )
        } )
        it( `add found to token1 for ${x}`, async () => {
            await token1.transfer( x, userAmount )
        } )
        it( `add found to waePartner for ${x}`, async () => {
            await waePartner.transfer( x, userAmount )
        } )
    } )

} )
