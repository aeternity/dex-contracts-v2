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

## Using the DEX contracts in your application

### Trading pair swap price calculation
To calculate the price of your token (`token_a`) in terms of another token, such as Wrapped Aethernity (`token_b`), 
you can use the DEX contracts to fetch the necessary information. 
The price calculation for a trading pair `token_a`/`token_b` involves the following steps:

#### 1. Get trading pair
Firstly, obtain the trading pair contract address from the DEX factory using the `get_pair` entrypoint. 
You need the addresses of `token_a` and `token_b`. 
The function returns the address of the trading pair’s liquidity pool contract:
```
AedexV2Factory.get_pair(token_a: IAEX9Minimal, token_b: IAEX9Minimal): option(IAedexV2Pair)
```

#### 2. Get reserves for pair
Use the `get_reserves` function of the pair’s contract to obtain the current reserves for `token_a` and `token_b`:
```
AedexV2Pair.get_reserves(): { reserve_token_a: int, reserve_token_b:, block_timestamp_last: int }
```

#### 3. Calculate price for trading pair
Ensure you know the decimals for `token_a` and `token_b`. The decimals can be retrieved from the token contract's `meta_info`.
If the tokens' decimals vary, normalize the reserves by adjusting for the token decimals:
- `reserve_token_a_normalized = reserve_token_a * 10^(-decimals_token_a)`
- `reserve_token_b_normalized = reserve_token_b * 10^(-decimals_token_b)`

After normalization, calculate the trading prices as follows:
- Price of `token_a` in `token_b`: 
  - `p = reserve_token_b_normalized / reserve_token_a_normalized`
  - &rarr; for `x token_a` you get `a token_b`, where `a = p * x`  
- Price of `token_b` in `token_a`:
  - `p = reserve_token_a_normalized / reserve_token_b_normalized`
  - &rarr; for `x token_b` you get `a token_a`, where `a = p * x`
- Remember to also account for the 0.3% trading fee, which affects the final received amount:
  - `a_final = a - (a * 0.03)`

#### Swap routes
If no direct trading pair for your token exists yet, you should consider creating it. Another option is using a swap route and making multiple swaps.
If the swap route for a pair is not known, you can use the [dex-backend](https://github.com/aeternity/dex-backend) to calculate and fetch a swap route from `token_a` to `token_b`.
```
GET {baseURl}/pairs/swap-routes/{from}/{to}
```
- `baseUrl` for Mainnet: https://dex-backend-mainnet.prd.aepps.com/
- `baseUrl` for Testnet: https://dex-backend-testnet.prd.aepps.com/
- `from`: address of the token to trade from
- `to`: address of the token to trade to

### Trading pair pool shares
In the DEX, a trading pair pool is a collection of funds locked in a smart contract used to
facilitate trading between two assets. Liquidity providers (LPs) supply these funds to the pool and, in return, 
receive liquidity tokens (LP tokens). These tokens represent their share of the pool and a claim on a portion
of the transaction fees.

#### Liquidity Provision
When providing liquidity, an LP contributes assets to a trading pair like `token_a`/`token_b`.
The amount of LP tokens received depends on the existing liquidity in the pool.
Initially, LP tokens are minted based on the ratio of the assets provided.
As more liquidity is added or removed, the amount of LP tokens minted or burned varies accordingly.

#### `total_supply`
The `total_supply` of a trading pair indicates the total number of LP tokens in circulation for that pool.
It increases when liquidity is added (LP tokens are minted) and decreases when liquidity is withdrawn (LP tokens are burned).
The ownership share of the pool is proportional to an LP's tokens relative to the `total_supply`.
For instance, if you hold 10 LP tokens and the `total_supply` is 100, you own 10% of the pool,
entitling you to 10% of the transaction fees generated.
