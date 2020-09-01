# Overview

Ethereum, and blockchain in general, is a relatively new and extremely experimental technology. New bugs and security risks are discovered on a daily basis, and responding to these risks is expensive and time consuming.

Securing a smart contract against known vulnerabilities is not enough. A smart contract developer must expect unknown vulnerabilities and plan for when, not if, their smart contract is effected.

The consequence of failure of an application such as a decentralized exchange is that money will be lost. In order to minimize any potential losses, I have implemented the follwing design patterns:

1. Circuit Breaker - At any time the contract admin can freeze the contract's execution to prevent any/all loss, in the event that a vulnerability is discovered prior to the Dex being exploited.
2. Upgradability - The Dex smart contract is deployed using a Proxy Delegate Pattern, meaning that it is possible to make limited bug fixes and improvements. Should a vulnerability be detected, the contract can be paused via the Circuit Breaker, until a fix has been tested, and deployed via the Proxy smart contract.

# General Secure Development Practices

- Only use delegatecall with trusted contracts.
- Identify untrusted contracts in the variable names.
- Avoid state changes after external calls.
- Isolate each external call into its own transacetion that can be initiated by the recipient of the (pull) call.
- Avoid combining multiple ether transfers in a single transaction.
- Provide a way of circumventing non-participating participants through time limit or economic incentive.
- When working with negative numbers check for == MIN_INT
- Use modifiers only for checks, as external calls can lead to reentrancy attacks.
- Be aware that the result of an integer division is rounded down to the nearest integer.
- `when using extcodesize to check if an address is a contract, keep in mind that a contract's source code is not available untill after the constructor has run, meaning a contract could make a call to a method in your contract from its constructor and appear to be coming from an eternally owned account (EOA). Contract addresses can also be pre-computed, so a check for code size of a pre-computed contract address would return 0.`
- `be aware when inheriting from other contracts that "built-ins" such as msg and revert() can be shadowed, which can result in bypassing a revert where it's needed.`
- `never use tx.origin for authorization, as a user can call your contract from another contract, authorizing the contract and not the messages original sender.`
- `Never assume the balance of a smart contract is equal to that recorded on an internal ledger, contracts can be forcibly sent ether, through selfdestruct(addr) or as the result of a block mining reward. Even if the contract has a fallback that reverts.` -`Use interface type instead of the address for type safety. When a function takes a contract address as an argument, it is better to pass an interface or contract type rather than raw address. If the function is called elsewhere within the source code, the compiler it will provide additional type safety guarantees.`
