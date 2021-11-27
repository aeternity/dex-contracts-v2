const fs = require( 'fs' )
var dir = __dirname + '/../build/'

if ( !fs.existsSync( dir ) ) {
    fs.mkdirSync( dir )
}

function exportContract ( fileName ) {
    const parent = __dirname + '/../contracts/interfaces/for-export/'

    const contract_content = fs.readFileSync( parent + fileName + ".aes", 'utf-8' )
    const exportFileDest = dir + `/${fileName}.aes.js`
    fs.writeFileSync( exportFileDest, `module.exports = \`\n${contract_content}\`;\n`, 'utf-8' )
    console.log( `'${exportFileDest}' written` )
}

exportContract( 'IAedexV2Router' )
exportContract( 'IWAE' )
