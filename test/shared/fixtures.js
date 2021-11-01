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
const { assert } = require( 'chai' )
var crypto = require( 'crypto' )

const {
    makeExe,
    expandTo18Decimals,
} = require( './utilities.js' )

const { Universal, MemoryAccount, Node } = require( '@aeternity/aepp-sdk' )

const NETWORKS = require( '../../config/network.json' )
const NETWORK_NAME = "local"

const { defaultWallets: WALLETS } = require( '../../config/wallets.json' )
const wallet0 = { 
    ...WALLETS[0],
    address: WALLETS[0].publicKey 
}

const contractUtils = require( '../../utils/contract-utils' )

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

const getContract = async ( source, params, contractAddress, wallet = WALLETS[0] ) => {
    const node = await Node( { url: NETWORKS[NETWORK_NAME].nodeUrl, ignoreVersion: true } )
    const client = await Universal( {
        nodes: [
            { name: NETWORK_NAME, instance: node },
        ],
        compilerUrl : NETWORKS[NETWORK_NAME].compilerUrl,
        accounts    : [ MemoryAccount( { keypair: wallet } ), MemoryAccount( { keypair: WALLETS[1] } )  ],
        address     : wallet.publicKey
    } )
    try {
        console.log( '----------------------------------------------------------------------------------------------------' )
        console.log( `%cdeploying '${source}...'`, `color:green` )

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
        console.log( `%cDEPLOYING SOURCE: '${source}...'`, `color:green` )
        const exe = makeExe( contract )
        //console.log( deployment_result )
        console.log( `-------------------------------------  END:   ---------------------------------------------------------` )
        return {
            contract, exe,  deploy: async () => {
                const deployment_result = await contract.deploy( params )
                console.log( `%c Contract deployed: '${source}...'`, `color:green` )
                    
                return deployment_result
            }  
        }
    } catch ( ex ) {
        console.log( ex )
        if ( ex.response.text ) {
            console.log( JSON.parse( ex.response.text ) )
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
        ],
    )
    await pairModel.deploy()
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

const pairFixture = async ( wallet = wallet0 ) => {
    const factory = await factoryFixture( wallet )

    const liq = expandTo18Decimals( 10000 ).toString()
    const tokenA = await tokenFixture( liq )
    const tokenB = await tokenFixture( liq )

    const pairAddress = await factory.exe( x => x.create_pair( 
        getA( tokenA ),
        getA( tokenB ),
        getA( factory )
    ) )

    const pair = await getContract( "./contracts/AedexV2Pair.aes", [], pairAddress  )

    const token0Address = ( await pair.exe( x => x.token0() ) )

    const token0 = tokenA.address === token0Address ? tokenA : tokenB
    const token1 = tokenA.address === token0Address ? tokenB : tokenA

    console.log( [ factory, token0, token1, pair ].map( getA ) )
    return { factory, token0, token1, pair }
}
module.exports = {
    pairFixture,
    pairModelFixture,
    getContract,
    getA,
    cttoak,
}

