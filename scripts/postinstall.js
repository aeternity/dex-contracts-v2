const fs = require( 'fs' )
const path = require( 'path' )

var exportDir = __dirname + '/../build/'

if ( !fs.existsSync( exportDir ) ) {
    fs.mkdirSync( exportDir )
}

// export contract interfaces for legacy sdks
function exportContract ( fileName ) {

    const parent = __dirname + '/../contracts/interfaces/for-export/'

    const contract_content = fs.readFileSync( path.join( parent, fileName + ".aes" ), 'utf-8' )
    const exportFileDest = exportDir + `/${fileName}.aes.js`
    fs.writeFileSync( exportFileDest, `module.exports = \`\n${contract_content}\`;\n`, 'utf-8' )
    console.log( `'${exportFileDest}' written` )
}

function exportAcis(  ) {

    const acisFolder = path.join( __dirname, '../deployment/aci' )

    fs.readdir( acisFolder, ( err, files ) => {
        if ( err ) throw err

        files.forEach( file => {
            const sourcePath = path.join( acisFolder, file )
            const destinationPath = path.join( exportDir, file )

            fs.copyFile( sourcePath, destinationPath, ( err ) => {
                if ( err ) throw err
                console.log( `${file} was copied to ${exportDir}` )
            } )
        } )
    } )
}

exportContract( 'IAedexV2Router' )
exportContract( 'IWAE' )
exportContract( 'IAedexV2Factory' )
exportContract( 'IAedexV2Pair' )

exportAcis()

//copy error
const errorsFileDest = exportDir + `/errors.js`
fs.copyFileSync( __dirname + "/../test/shared/utilities/errors.js", errorsFileDest )
console.log( `'${errorsFileDest}' written` )
