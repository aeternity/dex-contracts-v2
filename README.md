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
