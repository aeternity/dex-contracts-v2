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
import { assert } from 'chai'
import crypto from 'crypto'
import axios from 'axios'

import {
    makeExe,
    expandTo18Decimals,
    exec,
} from './utilities'

import { Universal, MemoryAccount, Node } from '@aeternity/aepp-sdk'

import NETWORKS from '../../config/network.json'

import { defaultWallets as WALLETS } from '../../config/wallets.json'
import contractUtils from '../../utils/contract-utils'

const NETWORK_NAME = "local"
const wallet0 = {
    ...WALLETS[0],
    address: WALLETS[0].publicKey
}

const hash = ( content ) =>
    crypto.createHash( 'md5' ).update( content ).digest( 'hex' )

const contents = {}

const getContent = ( path ) => {
    if ( contents[path] ) {
        return contents[path]
    } else {
        const filesystem       = contractUtils.getFilesystem( path )
        const contract_content = contractUtils.getContractContent( path )
        const contentHash = hash( contract_content )

        const ret = {
            filesystem,
            contract_content,
            contentHash,
        }
        contents[path] = ret
        return ret
    }
}

const createClient = async ( wallet = WALLETS[0] ) => {
    const node = await Node( { url: NETWORKS[NETWORK_NAME].nodeUrl, ignoreVersion: true } )

    return await Universal.compose( {
        deepProps: { Ae: { defaults: { interval: 10 } } }
    } )( {
        nodes: [
            { name: NETWORK_NAME, instance: node },
        ],
        compilerUrl : NETWORKS[NETWORK_NAME].compilerUrl,
        accounts    : [ MemoryAccount( { keypair: wallet } ), MemoryAccount( { keypair: WALLETS[1] } )  ],
        address     : wallet.publicKey
    } )
}

const getContract = async ( source, params, contractAddress, wallet = WALLETS[0] ) => {

    const client = await createClient( wallet )
    try {
        const {
            filesystem,
            contract_content,
        } = getContent( source )

        const contract           = await client.getContractInstance(
            contract_content,
            {
                filesystem,
                contractAddress : contractAddress || undefined,
                opt             : {
                    gas: 4500000
                }
            }
        )
        const exe = makeExe( contract, client )
        return {
            contract, exe,  deploy: async () => {
                const deployment_result = await contract.deploy( params )
                console.debug( `%c----> Contract deployed: '${source}...'`, `color:green` )

                return deployment_result
            }
        }
    } catch ( ex ) {
        console.debug( ex )
        if ( ex.response && ex.response.text ) {
            console.debug( JSON.parse( ex.response.text ) )
        }
        assert.fail( 'Could not initialize contract instance' )
    }
}

const getA = x => x.contract.deployInfo.address

const cttoak = ( value ) => value.replace( "ct_", "ak_" )

var pairModel
const pairModelFixture = async () => {

    const fakeAddress = 'ct_A8WVnCuJ7t1DjAJf4y8hJrAEVpt1T9ypG3nNBdbpKmpthGvUm'
    pairModel = await getContract(
        './contracts/AedexV2Pair.aes',
        [
            fakeAddress,
            fakeAddress,
            fakeAddress,
            undefined,
        ],
    )
    await pairModel.deploy()
}

const calleeFixture = async ( ) => {
    const callee = await getContract(
        './contracts/test/AedexV2CallbackTest.aes',
        [],
    )
    await callee.deploy()
    return callee
}
const factoryFixture = async ( wallet ) => {
    if ( !pairModel ) {
        await pairModelFixture()
    }

    const factory = await getContract(
        './contracts/AedexV2Factory.aes',
        [
            wallet.address,
            getA( pairModel ),
        ],
    )
    await factory.deploy()
    await factory.exe( x => x.set_this_factory( getA( factory ) ) )
    return factory
}

const tokenFixture = async ( liquidity ) => {
    const token = await getContract(
        './contracts/test/TestAEX9.aes',
        [ liquidity ],
    )
    await token.deploy()
    return token
}
const waeFixture = async ( ) => {
    const token = await getContract(
        './contracts/test/WAE.aes',
        [ ],
    )
    await token.deploy()
    return token
}

const router01Fixture = async ( factory, wae ) => {
    const waeAddr = getA( wae )
    const token = await getContract(
        './contracts/router/AedexV2Router.aes',
        [ getA( factory ), waeAddr, waeAddr ],
    )
    await token.deploy()
    return token
}

const routerFixture = async ( wallet = wallet0 ) => {
    const liq = BigInt( expandTo18Decimals( 10000 ) )
    const tokenA = await tokenFixture( liq )
    const tokenB = await tokenFixture( liq )

    const wae = await waeFixture()
    const waePartner = await tokenFixture( liq )

    const factory = await factoryFixture( wallet )

    // deploy routers
    const router = await router01Fixture( factory, wae )
    //
    // initialize V2
    //

    const pairAddress = await factory.exe( x => x.create_pair(
        getA( tokenA ),
        getA( tokenB ),
    ) )

    const pair = await getContract( "./contracts/AedexV2Pair.aes", [], pairAddress  )

    const token0Address = ( await pair.exe( x => x.token0() ) )

    const token0 = getA( tokenA ) === token0Address ? tokenA : tokenB
    const token1 = getA( tokenA ) === token0Address ? tokenB : tokenA

    const waePairAddress = await factory.exe( x => x.create_pair(
        getA( wae ),
        getA( waePartner ),
    ) )

    const waePair = await getContract( "./contracts/AedexV2Pair.aes", [], waePairAddress  )

    return {
        token0,
        token1,
        wae,
        waePartner,
        factory,
        router,
        pair,
        waePair
    }
}
const pairFixture = async ( wallet = wallet0 ) => {
    const factory = await factoryFixture( wallet )

    const liq = BigInt( expandTo18Decimals( 10000 ) )
    const tokenA = await tokenFixture( liq )
    const tokenB = await tokenFixture( liq )

    const pairAddress = await factory.exe( x => x.create_pair(
        getA( tokenA ),
        getA( tokenB ),
        //getA( factory ),
        1636041331999, //debug time
    ) )

    const pair = await getContract( "./contracts/AedexV2Pair.aes", [], pairAddress  )

    const token0Address = ( await pair.exe( x => x.token0() ) )

    const token0 = getA( tokenA ) === token0Address ? tokenA : tokenB
    const token1 = getA( tokenA ) === token0Address ? tokenB : tokenA

    const callee = await calleeFixture()

    const ret = { factory, token0, token1, pair, callee }
    const addresses = Object.keys( ret ).reduce( ( acc, key ) => {
        const value = ret[key]
        const cloned = { ...acc }
        cloned[key] = getA( value )
        return cloned
    }, {} )
    console.debug( addresses )
    return ret
}
const awaitOneKeyBlock = async ( client ) => {
    const height = await client.height()
    await axios.get( 'http://localhost:3001/emit_kb?n=1' )
    await client.awaitHeight( height + 1 )
}
const beforeEachWithSnapshot = ( str, work ) => {
    //const getBlockHeight = async () => {
        //return ( await exec( "curl -s localhost:3001/v2/status | jq '.top_block_height'" ) ).trim() * 1
    //}
    let snapshotHeight = -1
    let client
    before( "initial snapshot: " + str, async () => {
        client = await createClient()
        console.debug( "running initial work for snapshot... " )
        await work()
        console.debug( "initial work ... DONE " )
        // get the snapshot height
        //snapshotHeight = await getBlockHeight()
        snapshotHeight = await client.height()
        console.debug( `snapshot block height: ${snapshotHeight}` )
        await awaitOneKeyBlock( client )
    } )

    afterEach( "reset to snapshot", async () => {
        //const currentBlockHeight = await getBlockHeight()
        const currentBlockHeight = await client.height()
        console.debug( "current blockHeight: " + currentBlockHeight )
        if ( currentBlockHeight > snapshotHeight ) {
            console.debug( "rollingback to " + snapshotHeight + "..." )
            const cmd = `docker exec aedex_node_1 bin/aeternity db_rollback --height ${snapshotHeight}`
            await exec( cmd )
            console.debug( "rollback completed" )
            await awaitOneKeyBlock( client )
        } else {
            console.debug( "nothing to rollback" )
        }
    } )
}

module.exports = {
    beforeEachWithSnapshot,
    createClient,
    pairFixture,
    routerFixture,
    pairModelFixture,
    getContract,
    getA,
    getAK: ( contract ) => cttoak( getA( contract ) ),
    cttoak,
}

