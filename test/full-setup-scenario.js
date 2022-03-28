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
    mainnetFixture,
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
    'ak_2AVeRypSdS4ZosdKWW1C4avWU4eeC2Yq7oP7guBGy8jkxdYVUy', // nikita
]

describe( 'Pair Router', () => {
    let token0
    let token1
    let waePartner
    let router

    const multiplier = 1000000
    it( 'first compile pool factory', async () => {
        ( {
            token0,
            token1,
            waePartner,
            router,
        } = await mainnetFixture( undefined, 1000 * multiplier, 'ak_2kE1RxHzsRE4LxDFu6WKi35BwPvrEawBjNtV788Gje3yqADvwR' ) )
    })
    const userAmount = expandTo18Dec( 200 * multiplier )
    userWallets.map( x => {
        it( `add funds to token0 for ${x}`, async () => {
            await token0.transfer( x, userAmount )
        } )
        it( `add funds to token1 for ${x}`, async () => {
            await token1.transfer( x, userAmount )
        } )
        it( `add funds to waePartner for ${x}`, async () => {
            await waePartner.transfer( x, userAmount )
        } )
    } )
} )
