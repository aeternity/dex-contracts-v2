const fs = require( 'fs' )
var exportDir = __dirname + '/../build/'

if ( !fs.existsSync( exportDir ) ) {
    fs.mkdirSync( exportDir )
}

function exportContract ( fileName ) {

    const parent = __dirname + '/../contracts/interfaces/for-export/'

    const contract_content = fs.readFileSync( parent + fileName + ".aes", 'utf-8' )
    const exportFileDest = exportDir + `/${fileName}.aes.js`
    fs.writeFileSync( exportFileDest, `module.exports = \`\n${contract_content}\`;\n`, 'utf-8' )
    console.log( `'${exportFileDest}' written` )
}

exportContract( 'IAedexV2Router' )
exportContract( 'IWAE' )

//copy error
const errorsFileDest = exportDir + `/errors.js`
fs.copyFileSync( __dirname + "/../test/shared/utilities/errors.js", errorsFileDest )
console.log( `'${errorsFileDest}' written` )
