# cacao-dex 🧮🍫
Decentralized Exchange for ERC20 using Truffle, React, and @web3-react

### Frontend

- React (w/ Hooks)
- @web3-react

### Smart Contracts

- Solidity 0.6.6
- Truffle 5.1.2
- @openzeppelin/contracts
- @openzeppelin/test-helpers

## Setup and Run

- `git clone https://github.com/veyyz/cacao-dex.git` <br />

```js
- update port && network_id in `/truffle-config.js`
- update <INFURA_PROJECT_ID> in `client/src/index.js`
```

- `cd cacao-dex && npm i`
- `truffle test`
- `truffle migrate`
- `cd client && npm i`
- `npm start`

## Features

### Admin

- Approve Trading Pairs
- Seed Wallets from Faucet

### Wallet

- Approve Dex to transferFrom
- Deposit Tokens
- withdraw tokens

### Order Book

- Create a SELL limit order
- Create a BUY limit order
- Create a SELL market order
- Create a BUY market order
- Match and Execure orders

## Tests

<img src="https://cacao-io-test.s3.amazonaws.com/cacao-dex-tests.png"></img>

## Screenshot

<img src="https://cacao-io-test.s3.amazonaws.com/cacao-dex-scrshot.png"></img>
