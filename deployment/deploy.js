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
const { Universal, MemoryAccount, Node, Crypto } = require( '@aeternity/aepp-sdk' )
const contractUtils = require( '../utils/contract-utils' )

const NETWORKS = require( '../config/network.json' )
const DEFAULT_NETWORK_NAME = 'local'

//const EXAMPLE_CONTRACT_SOURCE = '../contracts/AedexPool.aes';
//const EXAMPLE_CONTRACT_SOURCE = './contracts/AedexPool.aes';
//const EXAMPLE_CONTRACT_SOURCE = './contracts/test/DexOracleTest.aes'

const deploy = async ( secretKey, network, compiler ) => {
    if ( !secretKey ) {
        throw new Error( `Required option missing: secretKey` )
    }
    const KEYPAIR = {
        secretKey : secretKey,
        publicKey : Crypto.getAddressFromPriv( secretKey )
    }
    const NETWORK_NAME = network ? network : DEFAULT_NETWORK_NAME

    const client = await Universal( {
        nodes: [
            {
                name     : NETWORK_NAME, instance : await Node( { 
                    url           : NETWORKS[NETWORK_NAME].nodeUrl,
                    ignoreVersion : true
                } ) 
            },
        ],
        compilerUrl : compiler ? compiler : NETWORKS[NETWORK_NAME].compilerUrl,
        accounts    : [ MemoryAccount( { keypair: KEYPAIR } ) ],
        address     : KEYPAIR.publicKey
    } )
    // a filesystem object must be passed to the compiler if the contract uses custom includes

    const deployContract = async ( source, params ) => {
        try {
            console.log( '----------------------------------------------------------------------------------------------------' )
            console.log( `%cdeploying '${source}...'`, `color:green` )

            const filesystem       = contractUtils.getFilesystem( source )
            const contract_content = contractUtils.getContractContent( source )

            const contract          = await client.getContractInstance( contract_content, { filesystem } )
            const deployment_result = await contract.deploy( params )
            console.log( deployment_result )
            console.log( '-------------------------------------  END  ---------------------------------------------------------' )
            return { deployment_result, contract }
        } catch ( ex ) {
            console.log( ex )
            if ( ex.response.text ) {
                console.log( JSON.parse( ex.response.text ) )
            }
            throw ex
        }
    }
    const getCId = async f => {
        const {
            deployment_result : { result : { contractId } },
        } = await f()
        return contractId
    }

    const fakeAddress = 'ct_A8WVnCuJ7t1DjAJf4y8hJrAEVpt1T9ypG3nNBdbpKmpthGvUm'
    const deployments = 
        [ 
            /* 00 */ () => deployContract( './contracts/test/BuildAll.aes', [] ),
            /* 01 */ () => deployContract( './contracts/AedexV2Pair.aes', 
                [ fakeAddress, fakeAddress, fakeAddress ] ),

        ]
    await deployments[1]()

    //console.log(await contract.methods.getOwner())
}

module.exports = {
    deploy
}
