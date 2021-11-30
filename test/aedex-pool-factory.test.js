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
} from './shared/fixtures'

import {
    expectToRevert,
} from './shared/utilities'

const wallet = {
    ...WALLETS[0],
    address: WALLETS[0].publicKey
}

const other = {
    ...WALLETS[1],
    address: WALLETS[1].publicKey
}
var factory, token0, token1

describe( 'Pair Factory', () => {
    beforeEachWithSnapshot( 'first compile pool factory', async () => {
        ( { factory, token0, token1 } = await pairFixture() )
    } )
    it( 'feeTo, feeToSetter, allPairsLength', async () => {
        const exe = factory.exe
        expect( await exe( x => x.fee_to() ) ).to.eq( undefined )
        expect( await exe( x => x.fee_to_setter() ) ).to.eq( wallet.address )
        expect( await exe( x => x.all_pairs_length() ) ).to.eq( 1n )
    } )
    it( 'fails to create same pairs', async () => {
        await expectToRevert(
            () => factory.exe( x => x.create_pair(
                getA( token0 ),
                getA( token1 ),
                //getA( factory ),
                undefined
            ) ),
            'AedexV2: PAIR_EXISTS'
        )
    } )
    it( 'fails to create same pairs in reverse', async () => {
        await expectToRevert(
            () => factory.exe( x => x.create_pair(
                getA( token1 ),
                getA( token0 ),
                //getA( factory ),
                undefined

            ) ),
            'AedexV2: PAIR_EXISTS'
        )
    } )
    it( 'set_fee_to', async () => {
        await expectToRevert(
            () =>  factory.exe( x => x.set_fee_to(
                other.address, {
                    onAccount: other.address,
                } )
            ),
            "AedexV2: FORBIDDEN"
        )
        expect( await factory.exe( x => x.fee_to( ) ) ).to.eq( undefined )
        await factory.exe( x => x.set_fee_to( wallet.address ) )
        expect( await factory.exe( x => x.fee_to( ) ) ).to.eq( wallet.address )
    } )
    it( 'set_fee_to_setter', async () => {
        await expectToRevert(
            () =>  factory.exe( x => x.set_fee_to_setter(
                other.address, {
                    onAccount: other.address,
                } )
            ),
            "AedexV2: FORBIDDEN"
        )

        await factory.exe( x => x.set_fee_to_setter( other.address ) )
        expect( await factory.exe( x => x.fee_to_setter() ) ).to.eq( other.address )
        await expectToRevert(
            () => factory.exe( x => x.set_fee_to_setter( wallet.address ) ),
            "AedexV2: FORBIDDEN"
        )
    } )
} )
