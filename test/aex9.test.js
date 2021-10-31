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
} from './shared/fixtures.js'

import {
    expandTo18Decimals,
    MaxUint256,
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

describe( 'AEDEX pool factory', () => {
    let contract
    beforeEach( 'first compile pool factory', async () => {
        contract = await getContract(
            './contracts/test/TestAEX9.aes',
            [ TOTAL_SUPPLY.toString() ],
            undefined,
            wallet,
        )
        await contract.deploy()
    } )
    it( "name, symbol, decimals, totalSupply, balanceOf", async () => {
        const exe = contract.exe
        const { name, symbol, decimals } = await exe( x => x.meta_info() )
        expect( name ).to.eq( 'TestAEX9' )

        expect( symbol ).to.eq( 'TAEX9' )
        expect( decimals ).to.eq( 18 )

        expect( await exe( x => x.total_supply() ) ).to.eq( TOTAL_SUPPLY.toString() * 1 )
        expect( await exe( x => x.balance_str( wallet.address ) ) ).to.eq( TOTAL_SUPPLY.toString() )
    } )
    it( 'approve', async () => {
        await contract.exe( x => x.create_allowance( other.address, TEST_AMOUNT.toString() ) )

        expect( await contract.exe( x => x.allowance_unfolded( 
            wallet.address,
            other.address
        ) ) ).to.eq( TEST_AMOUNT.toString() * 1 )
    } )
    it( 'transfer', async () => {
        await contract.exe( x => x.transfer( other.address, TEST_AMOUNT.toString() ) )

        expect( await contract.exe( x => x.balance_str( wallet.address ) ) ).to.eq(
            TOTAL_SUPPLY.sub( TEST_AMOUNT ).toString()
        )
        expect( await contract.exe( x => x.balance_str( other.address ) ) ).to.eq(
            TEST_AMOUNT .toString()
        )

    } )
    it( 'transferFrom', async () => {
        await contract.exe( x => x.create_allowance( other.address, TEST_AMOUNT.toString() ) )
        await contract.exe( x => x.transfer_allowance(
            wallet.address,
            other.address,
            TEST_AMOUNT.toString(), {
                onAccount: other.address,
            } ) )
        expect( await contract.exe( x => x.allowance_unfolded( 
            wallet.address,
            other.address
        ) ) ).to.eq( 0 )
        expect( await contract.exe( x => x.balance_str( wallet.address ) ) ).to.eq(
            TOTAL_SUPPLY.sub( TEST_AMOUNT ).toString()
        )
        expect( await contract.exe( x => x.balance_str( other.address ) ) ).to.eq(
            TEST_AMOUNT .toString()
        )
    } )

    it( 'transferFrom:max', async () => {
        await contract.exe( x => x.create_allowance( other.address, MaxUint256.toString() ) )

        await contract.exe( x => x.transfer_allowance(
            wallet.address,
            other.address,
            TEST_AMOUNT.toString(), {
                onAccount: other.address,
            } ) )

        expect( await contract.exe( x => x.allowance_unfolded( 
            wallet.address,
            other.address
        ) ) ).to.eq( MaxUint256.toString() * 1 )
        expect( await contract.exe( x => x.balance_str( wallet.address ) ) ).to.eq(
            TOTAL_SUPPLY.sub( TEST_AMOUNT ).toString()
        )
        expect( await contract.exe( x => x.balance_str( other.address ) ) ).to.eq(
            TEST_AMOUNT .toString()
        )
    } )
    it( 'permit', async () => {
        const deadline = MaxUint256.toString()

        await contract.exe( x => x.permit(
            wallet.address,
            other.address,
            TEST_AMOUNT.toString(),
            deadline,
        ) )

        expect( await contract.exe( x => x.allowance_unfolded( 
            wallet.address,
            other.address
        ) ) ).to.eq( TEST_AMOUNT.toString() * 1 )

    } )

} )
