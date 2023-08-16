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
const { AeSdk, Node, MemoryAccount, CompilerHttp  } = require( '@aeternity/aepp-sdk' )
const contractUtils = require( '../utils/contract-utils' )

require( 'dotenv' ).config()
const NETWORKS = require( '../config/network.json' )
const NETWORK_NAME = process.env.NETWORK_NAME
const SECRET_KEY = process.env.SECRET_KEY
const FEE_TO_SETTER = process.env.FEE_TO_SETTER
const COMPILER_URL = process.env.COMPILER_URL

const validateParams = (  ) => {
    console.log( 'NETWORK_NAME', NETWORK_NAME )
    console.log( 'SECRET_KEY', SECRET_KEY )
    console.log( 'FEE_TO_SETTER', FEE_TO_SETTER )
    if ( !NETWORK_NAME ) throw new Error( 'NETWORK_NAME is not defined' )
    if ( !SECRET_KEY ) throw new Error( 'SECRET_KEY is not defined' )
    if ( !NETWORKS[NETWORK_NAME] ) throw new Error( 'NETWORK_NAME is not defined in network.json' )
    if ( !FEE_TO_SETTER ) throw new Error( 'FEE_TO_SETTER is not defined' )
}
const deploy = async ( ) => {
    validateParams()

    const instance = new Node( NETWORKS[NETWORK_NAME].nodeUrl, { ignoreVersion: true } )

    const compilerUrl = process.env.COMPILER_URL || NETWORKS[NETWORK_NAME].compilerUrl
    if ( !COMPILER_URL ) {
        console.log( `COMPILER_URL is not defined, using default compiler: ${compilerUrl}` )
    } else {
        console.log( 'COMPILER_URL', COMPILER_URL )
    }
    const cmp = new CompilerHttp( compilerUrl )
    const client = new AeSdk( {
        nodes      : [ { name: NETWORK_NAME, instance } ],
        onCompiler : cmp,
        interval   : 50,
    } )

    client.addAccount( new MemoryAccount(  SECRET_KEY ), { select: true } )

    const deployContract = async ( file, params ) => {
        try {
            const fileSystem       = contractUtils.getFilesystem( file )
            const contract_content = contractUtils.getContractContent( file )

            const contract          = await client.initializeContract( { sourceCode: contract_content, fileSystem } )
            const deployment_result = await contract.$deploy( params )
            // just to use the address and aci

            return deployment_result.address
        } catch ( ex ) {
            console.log( ex )
            if ( ex.response && ex.response.text ) {
                console.log( JSON.parse( ex.response.text ) )
            }
            throw ex
        }
    }
    const fakeAddress = 'ct_A8WVnCuJ7t1DjAJf4y8hJrAEVpt1T9ypG3nNBdbpKmpthGvUm'

    const modelForPair = await deployContract( './contracts/AedexV2Pair.aes',
        [ fakeAddress, fakeAddress, fakeAddress, 0, undefined ],
    )
    const factory = await deployContract( './contracts/AedexV2Factory.aes',
        [ FEE_TO_SETTER, modelForPair ],
    )
    const wae = await deployContract( './contracts/WAE.aes', [], )

    const router = await deployContract( './contracts/router/AedexV2Router.aes',
        [ factory, wae, wae ],
    )
    console.log( { router, wae, factory } )
}

deploy()

