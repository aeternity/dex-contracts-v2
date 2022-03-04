- The interfaces from ./for-export are auto-generated and are full contracts definition interface to be
used by sdk-clients outside this project in order to interact with the dex.
In a JavaScript project these can be accessed in the form of `var source = require('dex-contracts-v2/build/INTERFACE_NAME.aes')`


- The purpose of the rest of the interfaces is to use them inside this project for the tests (JS) or inside the contracts.
We are defining here only the entrypoints that are used and sometime we split a contract entrypoints into different interface files 
to avoid circular references (eg. IAedexV2Factory and IAedexV2FactoryForPair)
You can find further details at the top of each of these interfaces
