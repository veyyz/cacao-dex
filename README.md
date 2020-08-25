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

## Compile, Test, Run

- `git clone https://github.com/veyyz/cacao-dex.git` <br />

```js
- update port && network_id in `/truffle-config.js`
- update <INFURA_PROJECT_ID> in `client/src/index.js`
```

- `cd cacao-dex && npm i`
- `truffle compile`
- `truffle migrate`
- `truffle test`

- `cd client && npm i`
- `npm start`

## App Setup and Usage

- Start MetaMask with the wallet seed mnemonic provided by ganache
- Browse to local react development server (ex. localhost:3000)

```js
On first run, contract will need to be initialized with approved trading pairs
- In MetaMask, select "Account 1" or the account that you deployed the contract with.
- If you selected the right account you will see a button that says "Initialize Contract"
- Otherwise you will see a message reading "Only admin can initialize the Dex Contract"
```

- Now you can select any account in MetaMask to start placing buy and sell orders on the Dex
- 1. Click "Fund" to fund your local wallet (MetaMask) with tokens from the faucet method of the mock ERC20 contract.
- 2. Click "Approve" to approve the Dex to transfer your tokens to the smart contract.
- 3. Click "Deposit" to initiate the transfer of your tokens to the smart contract.
- 4. Repeat the above steps to fund several accounts with different tokens.
- 5. Place any number of coorresponding LIMIT and MARKET orders until your heart is content.
- 6. When you're satisfied with your gains, you can click "Withdraw" to move your tokens from the smart contract back to your local wallet (MetaMask)

```js
To see your token balances in MetaMask click on "Add Tokens" then click "Custom Token" in and enter the contract address of the deployed Mock ERC20 token. Click "Next" and then "Add Tokens".
```

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
- Match and Execute orders

## Tests

<img src="https://cacao-io-test.s3.amazonaws.com/cacao-dex-tests.png"></img>

## Screenshot

<img src="https://cacao-io-test.s3.amazonaws.com/cacao-dex-scrshot.png"></img>
