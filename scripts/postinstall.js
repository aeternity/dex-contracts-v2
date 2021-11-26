const fs = require( 'fs' )
var dir = './build'
const contractUtils = require( '../utils/contract-utils.js' )

if ( !fs.existsSync( dir ) ) {
    fs.mkdirSync( dir )
}

const path = __dirname + '/../contracts/interfaces/for-export/IAedexV2Router.aes'
const contract_content = contractUtils.getContractContent( path )
fs.writeFileSync( __dirname + '/../build/IAedexV2Router.aes.js', `module.exports = \`\n${contract_content}\`;\n`, 'utf-8' )
