# Superhero Dex Contracts

This repo contains the contracts to the Superhero decentralized exchange (DEX).

The Superhero DEX consists of multiple parts:
- [UI](https://github.com/aeternity/dex-ui)
- [Backend](https://github.com/aeternity/dex-backend)
- [Contracts (this repo)](https://github.com/aeternity/dex-contracts-v2)

## Access

Find a hosted version of the interface over at [aepp.dex.superhero.com](https://aepp.dex.superhero.com) or
feel free to run it on your own machine following these instructions:

## Audit

In April 2022 QuviQ provided an audit for the contracts. Please find the [report](./Dex2_Audit_20220419.pdf) in this repo.
The audit contains no further recommendations or actions that need to be performed to ensure a secure dex contract.

## Disclaimer
Under no circumstances, whether in tort (including negligence), contract, or otherwise, unless required by applicable law, shall Aeternity Anstalt be liable for damages, including any direct, indirect, special, incidental, or consequential damages of any nature arising out of the deployment or use of this smart contract, notwithstanding that Aeternity Anstalt may have been advised of the possibility of such damages.


## Development

```text
make install
```

## Deploy node

```text
make run-node
```
## Stop node

```text
make stop-node
```
## Run tests

```text
make test
```

## Deploy contracts
You have to set 3 Environment variables

- `SECRET_KEY` the secret key of the wallet
- `NETWORK_NAME` the destination network ( `local` | `testnet` | `mainnet` )
- `FEE_TO_SETTER` the initial address for the `fee_to_setter` from the `AedexV2Factory`. Note: initially the `state.fee_to` is disabled, this is used just to set who is entitled to change the `fee_to` mode

and run

```text
make deploy
```
## Aeternity deployed contracts

The official deployed contract addresses

### On mainnet

- Factory: `ct_2mfj3FoZxnhkSw5RZMcP8BfPoB1QR4QiYGNCdkAvLZ1zfF6paW`
- Router  `ct_azbNZ1XrPjXfqBqbAh1ffLNTQ1sbnuUDFvJrXjYz7JQA1saQ3`
- Wrapped AE: `ct_J3zBY8xxjsRr3QojETNw48Eb38fjvEuJKkQ6KzECvubvEcvCa`

### On testnet

- Factory: `ct_NhbxN8wg8NLkGuzwRNDQhMDKSKBwDAQgxQawK7tkigi2aC7i9`
- Router  `ct_MLXQEP12MBn99HL6WDaiTqDbG4bJQ3Q9Bzr57oLfvEkghvpFb`
- Wrapped AE: `ct_JDp175ruWd7mQggeHewSLS1PFXt9AzThCDaFedxon8mF8xTRF`
