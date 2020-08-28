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

### Contract Initialization

<!-- On first run, contract will need to be initialized with approved trading pairs

- In MetaMask, select "Account 1" or the account that you deployed the contract with.
- You should see "(admin)" next to the account address and a button that says "Initialize Contract"
- Otherwise you will see a message reading "Only admin can initialize the Dex Contract"
- Click on "Initialize Contract" -->

Note: Trading pairs are hardcoded in the truffle deployment script (`2_deploy_contracts.js`). In the future they could be added via a form that takes the contract details.

### Fund Wallets and Trade

Now you can select any account in MetaMask to start placing buy and sell orders on the Dex.

1. Click "Fund" to fund your local wallet (MetaMask) with tokens from the faucet method of the mock ERC20 contract.
2. Click "Approve" to approve the Dex to transfer your tokens to the smart contract.
3. Click "Deposit" to initiate the transfer of your tokens to the smart contract.
4. Repeat the above steps to fund several accounts with different tokens.
5. Place any number of coorresponding LIMIT and MARKET orders until your heart is content.
6. When you are satisfied with your gains, click "Withdraw" to move your tokens from the smart contract back to your local wallet (MetaMask)

### See Token Balances in MetaMask

To see your token balances in MetaMask:

1. Click "Add Tokens" and "Custom Token"
2. Enter the contract address of the deployed Mock ERC20 token
3. Click "Next" and "Add Tokens".

Tip: App.js console logs the {"\_tickers"} object for your convenience.

## Features

### Security

- Contract Upgradability
- Circuit Breaking
- Admin UI Trimming

### Wallet

- Seed Wallets from Faucet
- Approve Dex to transferFrom
- Deposit Tokens to Contract
- Withdraw tokens to Local Wallet

### Order Book

- Create a SELL limit order
- Create a BUY limit order
- Create a SELL market order
- Create a BUY market order
- Match and Execute orders

## Tests

<img src="https://cacao-io-test.s3.amazonaws.com/cacao-dex-tests.png"></img>

## Screenshots 📸

<img src="https://cacao-io-test.s3.amazonaws.com/cacao-dex-on.png"></img>
<img src="https://cacao-io-test.s3.amazonaws.com/cacao-dex-off.png"></img>
