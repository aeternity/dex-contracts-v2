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
const http = require( 'http' )

import {
    expandTo18Dec,
    exec,
    MINIMUM_LIQUIDITY,
    emits,
} from './utilities'

import { AeSdk, Node, MemoryAccount } from '@aeternity/aepp-sdk'

import NETWORKS from '../../config/network.json'

import { defaultWallets as WALLETS } from '../../config/wallets.json'
import contractUtils from '../../utils/contract-utils'
import FungibleTokenFull from 'aeternity-fungible-token/FungibleTokenFull.aes'
const FungibleTokenFullWithString = 'include "String.aes"\n' + FungibleTokenFull

const NETWORK_NAME = "local"
const wallet0 = {
    ...WALLETS[0],
    address: WALLETS[0].publicKey
}

async function get( url ) {
    return new Promise( ( resolve, reject ) => {
    // eslint-disable-next-line consistent-return
        const req = http.request( url, { method: 'GET' }, ( res ) => {
            if ( res.statusCode < 200 || res.statusCode > 299 ) {
                return reject( new Error( `HTTP status code ${res.statusCode}` ) )
            }

            const body = []
            res.on( 'data', ( chunk ) => body.push( chunk ) )
            res.on( 'end', () => resolve( Buffer.concat( body ).toString() ) )
        } )

        req.on( 'error', ( err ) => reject( err ) )

        req.on( 'timeout', () => {
            req.destroy()
            reject( new Error( 'Request time out' ) )
        } )

        req.end()
    } )
}
const hash = ( content ) =>
    crypto.createHash( 'md5' ).update( content ).digest( 'hex' )

const contents = {}

const getContent = ( { source, file } ) => {
    if ( file ) {
        if ( contents[file] ) {
            return contents[file]
        } else {
            const filesystem       = contractUtils.getFilesystem( file )
            const contract_content = contractUtils.getContractContent( file )
            const contentHash = hash( contract_content )

            const ret = {
                filesystem,
                contract_content,
                contentHash,
            }
            contents[file] = ret
            return ret
        }
    } else {
        return {
            filesystem       : undefined,
            contract_content : source,
        }
    }
}

const createClient = async ( wallet = WALLETS[0] ) => {
    const instance = new Node( NETWORKS[NETWORK_NAME].nodeUrl, { ignoreVersion: true } )

    const aeSdk = new AeSdk( {
        nodes       : [ { name: NETWORK_NAME, instance } ],
        compilerUrl : NETWORKS[NETWORK_NAME].compilerUrl,
        interval    : 50,
        address     : wallet.publicKey
    } ) 
    const accounts = [ new MemoryAccount( { keypair: wallet } ), new MemoryAccount( { keypair: WALLETS[1] } )  ]
    await Promise.all(
        accounts.map( ( account, index ) => aeSdk.addAccount(
            account,
            { select: index === 0 },
        ) ),
    )

    return aeSdk
}

const getContract = ( file, params, contractAddress, wallet = WALLETS[0] ) =>
    getContractEx( { file }, params, contractAddress, wallet )

const getContractFromSource = ( source, title, params, contractAddress, wallet = WALLETS[0] ) =>
    getContractEx( { source, title }, params, contractAddress, wallet )

const getContractEx = async ( { source, file, title }, params, contractAddress, wallet = WALLETS[0] ) => {

    const client = await createClient( wallet )
    try {
        const {
            filesystem,
            contract_content,
        } = getContent( { source, file } )

        const contract           = await client.getContractInstance(
            {
                source          : contract_content,
                fileSystem      : filesystem,
                contractAddress : contractAddress || undefined,
                opt             : {
                    gas: 4500000,
                }
            }
        )

        return {
            contract, deploy: async ( extra ) => {
                const deployment_result = await contract.deploy( params, extra )
                console.debug( `%c----> Contract deployed: '${file || title}...'`, `color:green` )

                return deployment_result
            },
            ...createWrappedMethods( contract ),
            expectEvents: ( { result }, tests ) => {
                const events = contract.decodeEvents( result.log, { omitUnknown: true } )
                const filtered = ( events || [] ).filter(
                    x =>  x.contract.address == contract.deployInfo.address
                ).reverse()
                if ( tests ) {
                    tests.events( {
                        tail : filtered,
                        head : null,
                    } )
                }
            },

        }
    } catch ( ex ) {
        console.debug( ex )
        if ( ex.response && ex.response.text ) {
            console.debug( JSON.parse( ex.response.text ) )
        }
        assert.fail( 'Could not initialize contract instance' )
    }
}

const formatMethodName = ( str ) => {
    const reservedWords = [ 'expectEvents', 'contract', 'deploy' ]
    return reservedWords.some( x => str === x )
        ? str + '2'
        : str
}
//move
const createWrappedMethods =  ( contract, extractor ) => {
    const methods = contract.methods
    const keys = Object.keys( methods )
    const wrappedMethods = keys.reduce( ( acc, key ) => {
        const method = methods[key]
        const wrappedMethod = async ( ...args ) => {
            const ret = await method.apply( contract, args )
            return extractor ? extractor( ret ) : ret.decodedResult
        }
        const cloned = { ...acc }
        cloned[formatMethodName( key )] = wrappedMethod
        return cloned
    }, {} )
    return wrappedMethods
}

const getA = x => x.contract.deployInfo.address

const getAK = contract => cttoak( getA( contract ) )
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
            1000,
            undefined,
        ],
    )
    await pairModel.deploy()
}

const calleeFixture = async ( ) => {
    const callee = await getContract(
        './test/contracts/AedexV2CallbackTest.aes',
        [],
    )
    await callee.deploy()
    return callee
}
const factoryFixture = async ( wallet, debugMode ) => {
    if ( !pairModel ) {
        await pairModelFixture()
    }

    const factory = await getContract(
        './contracts/AedexV2Factory.aes',
        [
            wallet.address,
            getA( pairModel ),
            debugMode,
        ],
    )
    await factory.deploy()
    return factory
}

const tokenFixture = async ( ix, liquidity ) => {

    const token = await getContractFromSource(
        FungibleTokenFullWithString,
        'FungibleTokenFull',
        [ 'TestAEX9-' + ix, 18n, 'TAEX9-' + ix, liquidity ],
    )
    await token.deploy()
    return token
}
getContractFromSource
const waeFixture = async ( ) => {
    const token = await getContract(
        './contracts/WAE.aes',
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
    const liq = expandTo18Dec( 10000 )
    const tokenA = await tokenFixture( 'A', liq )
    const tokenB = await tokenFixture( 'B', liq )
    const tokenC = await tokenFixture( 'C', liq )

    const wae = await waeFixture()
    const waePartner = await tokenFixture( 'WaeP', liq )

    const factory = await factoryFixture( wallet )

    // deploy routers
    const router = await router01Fixture( factory, wae )

    const pair01Address = await factory.create_pair(
        getA( tokenA ),
        getA( tokenB ),
        MINIMUM_LIQUIDITY,
    )

    const pair01 = await getContract( "./contracts/AedexV2Pair.aes", [], pair01Address  )

    const token0Address = ( await pair01.token0() )

    const [ token0, token1 ] = getA( tokenA ) === token0Address 
        ? [ tokenA, tokenB ] : [ tokenB, tokenA ]

    const pair1CAddress = await factory.create_pair(
        getA( token1 ),
        getA( tokenC ),
        MINIMUM_LIQUIDITY,
        undefined, {
            gas: 150000
        }
    )

    //this should be used on longer path tests
    const pair1C = await getContract( "./contracts/AedexV2Pair.aes", [], pair1CAddress  )

    const waePairAddress = await factory.create_pair(
        getA( wae ),
        getA( waePartner ),
        MINIMUM_LIQUIDITY,
        undefined, {
            gas: 150000
        }
    )

    const waePair = await getContract( "./contracts/AedexV2Pair.aes", [], waePairAddress  )

    const ret = {
        token0,
        token1,
        tokenC,
        wae,
        waePartner,
        factory,
        router,
        pair: pair01,
        pair01,
        pair1C,
        waePair
    }
    const addresses = Object.keys( ret ).reduce( ( acc, key ) => {
        const value = ret[key]
        const cloned = { ...acc }
        cloned[key] = getA( value )
        return cloned
    }, {} )
    console.debug( addresses )
    return ret
}
const pairFixture = async ( wallet = wallet0 ) => {
    const factory = await factoryFixture( wallet, true )

    const liq = expandTo18Dec( 10000 )
    const tokenA = await tokenFixture( 'A', liq )
    const tokenB = await tokenFixture( 'B', liq )

    const createPairRet = await factory.contract.methods.create_pair(
        getA( tokenB ),
        getA( tokenA ),
        MINIMUM_LIQUIDITY,
        //getA( factory ),
        1636041331999, //debug time
    )
    const pairAddress = createPairRet.decodedResult

    const pair = await getContract( "./contracts/AedexV2Pair.aes", [], pairAddress  )

    const token0Address = ( await pair.token0() )

    const [ token0, token1 ] = getA( tokenA ) === token0Address 
        ? [ tokenA, tokenB ] : [ tokenB, tokenA ]

    console.log( [ getAK( token0 ), getAK( token1 ), cttoak( pairAddress ) ] )
    factory.expectEvents( createPairRet,
        emits( 'PairCreated' ).withArgs(
            getAK( token0 ),
            getAK( token1 ),
            cttoak( pairAddress ),
            1, //total pairs
        )
    )

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
    await get( 'http://localhost:3001/emit_kb?n=1' )
    await client.awaitHeight( height + 1 )
}
const beforeEachWithSnapshot = ( str, work ) => {
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
        if ( currentBlockHeight > snapshotHeight ) {
            //const cmd = `docker exec aedex_node_1 bin/aeternity db_rollback --height ${snapshotHeight}`
            //await exec( cmd )
            await get( `http://localhost:3001/rollback?height=${snapshotHeight}` )
            await awaitOneKeyBlock( client )
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
    getAK,
    cttoak,
    waeFixture,
    swapPayload: ( amount0In, amount1In, amount0Out, amount1Out, ) =>
        `${amount0In}|${amount1In}|${amount0Out}|${amount1Out}`
}

