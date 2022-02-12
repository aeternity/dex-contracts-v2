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
    waeFixture,
    beforeEachWithSnapshot,
} from './shared/fixtures.js'

import {
    expectToRevert,
    expandTo18Dec,
    MaxUint256,
    emits,
} from './shared/utilities'

const TOTAL_SUPPLY = expandTo18Dec( 10000 )
const TEST_AMOUNT = expandTo18Dec( 10 )

const wallet = {
    ...WALLETS[0],
    address: WALLETS[0].publicKey
}

const other = {
    ...WALLETS[1],
    address: WALLETS[1].publicKey
}

describe( 'WAE', () => {
    let wae
    beforeEachWithSnapshot( 'first compile pool factory', async () => {
        wae = await waeFixture()
        
        await wae.deposit( { amount: TOTAL_SUPPLY.toString() } )
    } )

    const waeCreateAllowance = async ( address, amount ) => {
        const amountBI = BigInt( amount )
        return wae.create_allowance( address, amountBI )
    }
    const waeChangeAllowance = async ( address, amount ) => {
        const amountBI = BigInt( amount )
        return wae.change_allowance( address, amountBI )
    }
    const waeResetAllowance = async ( address ) => {
        return wae.reset_allowance( address )
    }
    const waeAllowance = async ( fromAcc, toAcc ) => {
        return wae.allowance( {
            from_account: fromAcc, for_account: toAcc
        } )
    }
    it( "name, symbol, decimals, totalSupply, balanceOf", async () => {
        const { name, symbol, decimals } = await wae.meta_info() 
        expect( name ).to.eq(  "Wrapped Aeternity" )

        expect( symbol ).to.eq( "WAE" )
        expect( decimals ).to.eq( 18n )

        expect( await wae.total_supply() ).to.eq( TOTAL_SUPPLY )
        expect( await wae.balance( wallet.address ) ).to.eq( TOTAL_SUPPLY )
    } )
    it( 'approve', async () => {
        const ret = await wae.contract.methods.create_allowance( other.address, TEST_AMOUNT )
        wae.expectEvents( ret,
            emits( "Allowance" ).withArgs(
                wallet.address,
                other.address,
                TEST_AMOUNT,
            )
        )

        expect( await wae.allowance( {
            from_account : wallet.address,
            for_account  : other.address
        } ),
        ).to.eq( TEST_AMOUNT )
    } )
    it( 'transfer', async () => {
        const ret = await wae.contract.methods.transfer( other.address, TEST_AMOUNT )

        wae.expectEvents( ret,
            emits( "Transfer" ).withArgs(
                wallet.address,
                other.address,
                TEST_AMOUNT,
            )
        )

        expect( await wae.balance( wallet.address ) ).to.eq(
            TOTAL_SUPPLY - TEST_AMOUNT
        )
        expect( await wae.balance( other.address ) ).to.eq(
            TEST_AMOUNT
        )

    } )
    it( 'transferFrom', async () => {
        await wae.create_allowance( other.address, TEST_AMOUNT )
        await wae.transfer_allowance(
            wallet.address,
            other.address,
            TEST_AMOUNT, {
                onAccount: other.address,
            } )
        expect( await wae.allowance( {
            from_account : wallet.address,
            for_account  : other.address
        }
        ) ).to.eq( 0n )
        expect( await wae.balance( wallet.address ) ).to.eq(
            TOTAL_SUPPLY - TEST_AMOUNT
        )
        expect( await wae.balance( other.address ) ).to.eq(
            TEST_AMOUNT
        )
    } )

    it( 'transferFrom:max', async () => {
        await wae.create_allowance( other.address, MaxUint256 )

        await wae.transfer_allowance(
            wallet.address,
            other.address,
            TEST_AMOUNT.toString(), {
                onAccount: other.address,
            } )

        expect( await wae.allowance( {
            from_account : wallet.address,
            for_account  : other.address
        } ) ).to.eq( MaxUint256 - TEST_AMOUNT )
        expect( await wae.balance( wallet.address ) ).to.eq(
            TOTAL_SUPPLY - TEST_AMOUNT
        )
        expect( await wae.balance( other.address ) ).to.eq(
            TEST_AMOUNT
        )
    } )
    const getOtherAllowance = () => waeAllowance(
        wallet.address,
        other.address,
    )

    it( 'changes allowance into a smaller allowance', async () => {
        const expectedAllowance = 100n

        await waeCreateAllowance( other.address, expectedAllowance  )

        expect( await getOtherAllowance() ).to.eq( expectedAllowance )

        const changeAllowanceAmount = - 50n

        await waeChangeAllowance( other.address, changeAllowanceAmount )

        expect( await getOtherAllowance() ).to.eq(
            expectedAllowance + changeAllowanceAmount
        )

    } )
    it( 'fails to change allowance before creating it', async () => {
        expect( await getOtherAllowance() ).to.eq( undefined )

        await expectToRevert(
            () => waeChangeAllowance(
                other.address,  20n
            ),
            'ALLOWANCE_NOT_EXISTENT'
        )

    } )
    it( 'fails to change allowance with negative value', async () => {
        const expectedAllowance = 100n

        await waeCreateAllowance( other.address, expectedAllowance  )

        expect( await getOtherAllowance() ).to.eq( expectedAllowance )

        await expectToRevert(
            () => waeChangeAllowance(
                other.address,  - ( expectedAllowance + 1n )
            ),
            'LOW_ALLOWANCE'
        )

    } )
    it( 'changes allowance to a bigger allowance', async () => {
        const expectedAllowance = 100n

        await waeCreateAllowance( other.address, expectedAllowance )

        expect( await getOtherAllowance() ).to.eq( expectedAllowance )

        const changeAllowanceAmount = 80n

        await waeChangeAllowance( other.address, changeAllowanceAmount   )

        expect( await getOtherAllowance() ).to.eq(
            expectedAllowance + changeAllowanceAmount
        )
    } )
    it( 'changes allowance to zero', async () => {
        const expectedAllowance = 100n

        await waeCreateAllowance( other.address, expectedAllowance )

        expect( await getOtherAllowance() ).to.eq( expectedAllowance )

        await waeChangeAllowance( other.address, - expectedAllowance   )

        expect( await getOtherAllowance() ).to.eq( 0n )
    } )
    it( 'resets allowance', async () => {
        const expectedAllowance = 100n

        await waeCreateAllowance( other.address, expectedAllowance )

        expect( await getOtherAllowance() ).to.eq( expectedAllowance )

        await waeResetAllowance( other.address )

        expect( await getOtherAllowance() ).to.eq( 0n )
    } )

} )
