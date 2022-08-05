const fs = require( 'fs' )
const path = require( 'path' )

const getContractContent = ( contractPath ) => fs.readFileSync( contractPath, 'utf8' )

const getFilesystem = ( contractPath ) => {
    const defaultIncludes = [
        'List.aes', 'Option.aes', 'String.aes',
        'Func.aes', 'Pair.aes', 'Triple.aes',
        'BLS12_381.aes', 'Frac.aes',
    ]
    const rgx = /^include\s+"([\d\w/.-_]+)"/gmi
    const rgxIncludePath = /"([\d\w/.-_]+)"/i
    const rgxMainPath = /.*\//g

    const contractContent = getContractContent( contractPath )
    const filesystem = {}

    const rootIncludes = contractContent.match( rgx )
    if ( !rootIncludes ) return filesystem
    const contractPathMatch = rgxMainPath.exec( contractPath )

  // eslint-disable-next-line no-restricted-syntax
    for ( const rootInclude of rootIncludes ) {
        const includeRelativePath = rgxIncludePath.exec( rootInclude )

    // eslint-disable-next-line no-continue
        if ( defaultIncludes.includes( includeRelativePath[1] ) ) continue

    // eslint-disable-next-line no-console
        console.log( `==> Adding include to filesystem: ${includeRelativePath[1]}` )
        const includePath = path.resolve( `${contractPathMatch[0]}/${includeRelativePath[1]}` )

        try {
            filesystem[includeRelativePath[1]] = fs.readFileSync( includePath, 'utf-8' )
        } catch ( error ) {
            throw Error( `File to include '${includeRelativePath[1]}' not found.` )
        }

        Object.assign( filesystem, getFilesystem( includePath ) )
    }

    return filesystem
}

module.exports = {
    getContractContent,
    getFilesystem
}
