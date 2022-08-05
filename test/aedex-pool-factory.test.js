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
    createClient,
} from './shared/fixtures'

import {
    expectToRevert,
    MINIMUM_LIQUIDITY,
} from './shared/utilities'

const wallet = {
    ...WALLETS[0],
    address: WALLETS[0].publicKey
}

const other = {
    ...WALLETS[1],
    address: WALLETS[1].publicKey
}
var factory, token0, token1, pair0

var client
const onAccount = ( address ) => ( {
    onAccount: client.accounts[address]
} )
describe( 'Pair Factory', () => {
    before( "createClient", async () => {
        client = await createClient()
    } )
    beforeEachWithSnapshot( 'first compile pool factory', async () => {
        ( { factory, token0, token1, pair: pair0 } = await pairFixture() )
    } )
    it( 'feeTo, feeToSetter, allPairsLength', async () => {
        expect( await factory.fee_to() ).to.eq( undefined )
        expect( await factory.fee_to_setter() ).to.eq( wallet.address )
        expect( await factory.all_pairs_length() ).to.eq( 1n )
        expect( await factory.get_nth_pair( 0 ) ).to.eq( getA( pair0 ) )
        expect( await factory.get_all_pairs() ).to.eql( [ getA( pair0 ) ] )

        const fakeToken2 = 'ct_A8WVnCuJ7t1DjAJf4y8hJrAEVpt1T9ypG3nNBdbpKmpthGvUm'
        const fakeToken3 = 'ct_2kE1RxHzsRE4LxDFu6WKi35BwPvrEawBjNtV788Gje3yqADvwR'
        const pair1  = await factory.create_pair( getA( token0 ), fakeToken2 )
        const pair2  = await factory.create_pair( getA( token0 ), fakeToken3 )
        const pair3  = await factory.create_pair( getA( token1 ), fakeToken2 )
        const pair4  = await factory.create_pair( getA( token1 ), fakeToken3 )

        expect( await factory.all_pairs_length() ).to.eq( 5n )

        const allPairs = [ getA( pair0 ), pair1, pair2, pair3, pair4 ].reverse()

        for ( var i = 0 ; i < allPairs.length ; i ++ ) {
            expect ( await factory.get_nth_pair( i ) ).to.eq(  allPairs[i] )
        }

        expect( await factory.get_all_pairs() ).to.eql( allPairs )

        // out of index
        await expectToRevert(
            () => factory.get_nth_pair( 5 ),
            'Out of index get'
        )
    } )
    it( 'fails to create same pairs', async () => {
        await expectToRevert(
            () => factory.create_pair(
                getA( token0 ),
                getA( token1 ),
                MINIMUM_LIQUIDITY,
                undefined
            ),
            'AedexV2Factory: PAIR_EXISTS'
        )
    } )
    it( 'fails to create same pairs in reverse', async () => {
        await expectToRevert(
            () => factory.create_pair(
                getA( token1 ),
                getA( token0 ),
                MINIMUM_LIQUIDITY,
                undefined

            ),
            'AedexV2Factory: PAIR_EXISTS'
        )
    } )
    it( 'set_fee_to', async () => {
        await expectToRevert(
            () =>  factory.set_fee_to(
                other.address, {
                    ...onAccount( other.address ),
                } )
            ,
            "AedexV2Factory: FORBIDDEN"
        )
        expect( await factory.fee_to( ) ).to.eq( undefined )
        await factory.set_fee_to( wallet.address )
        expect( await factory.fee_to( ) ).to.eq( wallet.address )
    } )
    it( 'set_fee_to_setter', async () => {
        await expectToRevert(
            () =>  factory.set_fee_to_setter(
                other.address, {
                    ...onAccount( other.address ),
                } )
            ,
            "AedexV2Factory: FORBIDDEN"
        )

        await factory.set_fee_to_setter( other.address )
        expect( await factory.fee_to_setter() ).to.eq( other.address )
        await expectToRevert(
            () => factory.set_fee_to_setter( wallet.address ),
            "AedexV2Factory: FORBIDDEN"
        )
    } )
} )
