import { expect } from 'chai'

const headAndTail = ( xs ) => [ xs[0], xs.slice( 1 ) ]

function withArgsProcess( argsT, parentCall ) {
    return ( tests ) => {
        const { head: headT, tail: tailT } = parentCall ? parentCall( tests ) : tests
        function loop( args, head, tail ) {
            const [ arg, tailArgs ] = headAndTail( args )
            if ( arg == null ) {
                return { head, tail }
            } else {
                const [ decodedHead, decodedTail ] = headAndTail( head.decoded || [] )
                expect(
                    decodedHead,
                    `there is no arguments left but ${args.length} more ${args.length > 1 ? 'are' : 'is'} expected`
                )
                if ( typeof arg == 'function' ) {
                    //evaluate custom transformation/evaluation
                    const transformed = arg( decodedHead )
                    if ( transformed ) {
                        if ( Array.isArray( transformed ) ) {
                            const [ expected, toEqual ] = transformed
                            expect( expected ).to.eq( toEqual )
                        } else {
                            expect( decodedHead ).to.eq( transformed )
                        }
                    }
                } else {
                    expect( decodedHead ).to.eq( typeof arg !== 'string' && arg != null ? arg.toString() : arg  )
                }
                return loop( tailArgs, {
                    ...head,
                    decoded: decodedTail,
                }, tail )

            }
        }
        return loop( argsT, headT, tailT )
    }
}

function emitProcess( eventName, parentCall ) {
    return ( events ) => {
        const { tail } = parentCall ? parentCall( events ) : events
        expect( !!tail && !!tail.length, `there is no event left but '${eventName}' event name is expected` )
            .to.eq( true )
        const [ head, newTail ] = headAndTail( tail )
        expect( head.name ).to.eq( eventName )
        return {
            head,
            tail: newTail,
        }
    }
}
function withArgs( args, parentCall ) {
    return chain( withArgsProcess( args, parentCall ) )
}
function emits( eventName, parentCall ) {
    return chain( emitProcess( eventName, parentCall ) )
}

function chain( getNewState ) {
    return {
        emits    : ( evName ) => emits( evName, getNewState ),
        withArgs : ( ...args ) => withArgs( args, getNewState ),
        events   : ( tests ) => getNewState( tests )
    }
}

module.exports = {
    emits,
}
