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
const fs = require( 'fs' )

const NETWORKS = require( '../config/network.json' )
const DEFAULT_NETWORK_NAME = 'local'
const FungibleTokenFull = require( 'aeternity-fungible-token/FungibleTokenFull.aes.js' )
const FungibleToken = require( 'aeternity-fungible-token/FungibleToken.aes.js' )
require( 'dotenv' ).config()
const SECRET_KEY = process.env.SECRET_KEY
console.log( `SECRET_KEY ${SECRET_KEY}` )
const NETWORK_NAME = process.env.NETWORK_NAME || DEFAULT_NETWORK_NAME
console.log( `NETWORK_NAME ${NETWORK_NAME}` )
const COMPILER_URL = process.env.COMPILER_URL || NETWORKS[NETWORK_NAME].compilerUrl
console.log( `COMPILER_URL ${COMPILER_URL}` )

const deploy = async ( ) => {
    if ( !SECRET_KEY ) {
        throw new Error( `Required option missing: secretKey` )
    }
    const instance = new Node( NETWORKS[NETWORK_NAME].nodeUrl, { ignoreVersion: true } )

    const cmp = new CompilerHttp( COMPILER_URL ? COMPILER_URL : NETWORKS[NETWORK_NAME].compilerUrl )
    const client = new AeSdk( {
        nodes      : [ { name: NETWORK_NAME, instance } ],
        onCompiler : cmp,
        interval   : 50,
    } )

    client.addAccount( new MemoryAccount(  SECRET_KEY ), { select: true } )

    const deployContract_ = async ( { source, file }, params, interfaceName ) => {
        try {
            console.log( '----------------------------------------------------------------------------------------------------' )
            console.log( `%cdeploying '${source}...'`, `color:green` )

            var fileSystem, contract_content
            if ( file ) {
                // a filesystem object must be passed to the compiler if the contract uses custom includes
                fileSystem       = contractUtils.getFilesystem( file )
                contract_content = contractUtils.getContractContent( file )
            } else {
                contract_content = source
            }

            console.log( contract_content )
            const contract          = await client.initializeContract( { sourceCode: contract_content, fileSystem } )
            const deployment_result = await contract.$deploy( params )
            // just to use the address and aci
            console.log( deployment_result )
            console.log( '-------------------------------------  END  ---------------------------------------------------------' )

            if ( interfaceName ) {
                const parent = "deployment/aci"
                if ( !fs.existsSync( parent ) ) {
                    fs.mkdirSync( parent )
                }
                const fileName = parent + '/' + interfaceName + '.aci.json'
                const aci =  JSON.stringify( contract._aci, null, 4 )
                fs.writeFileSync( fileName, aci, 'utf-8' )
                console.log( 'Interface generated at: ' + fileName )
            }
            return { deployment_result, contract }
        } catch ( ex ) {
            console.log( ex )
            if ( ex.response && ex.response.text ) {
                console.log( JSON.parse( ex.response.text ) )
            }
            throw ex
        }
    }
    const deployContract = async ( file, params, interfaceName ) =>
        deployContract_( { file }, params, interfaceName )
    const deploySource = async ( source, params, interfaceName ) =>
        deployContract_( { source }, params, interfaceName )

    const fakeAddress = 'ct_A8WVnCuJ7t1DjAJf4y8hJrAEVpt1T9ypG3nNBdbpKmpthGvUm'
    const fakeAddressAk = 'ak_A8WVnCuJ7t1DjAJf4y8hJrAEVpt1T9ypG3nNBdbpKmpthGvUm'
    const withString = ( source ) => 'include "String.aes"\n' + source
    const FungibleTokenFullWithString = withString( FungibleTokenFull )
    const FungibleTokenWithString = withString( FungibleToken )
    const deployments =
        [
            /* 00 */ () => deployContract( './test/contracts/BuildAll.aes', []  ),
            /* 01 */ () => deployContract( './contracts/AedexV2Pair.aes',
                [ fakeAddress, fakeAddress, fakeAddress, 0, undefined ],
                'AedexV2Pair',
            ),
            /* 02 */ () => deployContract(
                './contracts/router/AedexV2Router.aes',
                [ fakeAddress, fakeAddress, fakeAddress ],
                'AedexV2Router',
            ),
            /* 03 */ () => deployContract( './contracts/WAE.aes', [], 'WAE' ),
            /* 04 */ () => deployContract( './contracts/AedexV2Factory.aes',
                [ fakeAddressAk, fakeAddress ],
                'AedexV2Factory'
            ),
            /* 05 */ () => deploySource( FungibleTokenFullWithString,
                [ "-", 0, "-", 0 ], "FungibleTokenFull"
            ),
            /* 06 */ () => deploySource( FungibleTokenWithString,
                [ "-", 0, "-", 0 ], "FungibleToken"
            ),
        ]
    try {
        for ( const dep of deployments ) { await dep() }
        //await deployments[1]()
    } catch ( ex ) {
        //empty
    }
}

deploy()

