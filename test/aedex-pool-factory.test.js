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
const { BigNumber, BigNumberish, constants, Contract, ContractTransaction, utils, Wallet } =  require( 'ethers' )
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
var factory, token0, token1, pair 

describe( 'Pair Factory', () => {
    beforeEach( 'first compile pool factory', async () => {
        ( { factory, token0, token1, pair } = await pairFixture() )
    } )
    it( 'feeTo, feeToSetter, allPairsLength', async () => {
        const exe = factory.exe
        expect( await exe( x => x.fee_to() ) ).to.eq( undefined )
        expect( await exe( x => x.fee_to_setter() ) ).to.eq( wallet.address )
        expect( await exe( x => x.all_pairs_length() ) ).to.eq( 1 )
    } )
    it( 'fails to create same pairs', async () => {
        await expectToRevert(
            () => factory.exe( x => x.create_pair( 
                getA( token0 ),
                getA( token1 ),
                getA( factory )
            ) ),
            'AedexV2: PAIR_EXISTS'
        )
    } )
    it( 'fails to create same pairs in reverse', async () => {
        await expectToRevert(
            () => factory.exe( x => x.create_pair( 
                getA( token1 ),
                getA( token0 ),
                getA( factory )
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
