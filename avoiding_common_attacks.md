# Strategies to Avoid Common Attacks

Cacao Dex was designed to protect against basic Reenterancy and Integer Overflow/Underflow attacks.

External calls are only used in the `deposit()` and `withdraw()` methods of the contract. Special attention has been taken not to make external function calls in a way they could result in the hijacking of the execution thread and open the contract up to a reentrancy attack. In the `deposit()` function the external call is made before the internal ledger is updated, so if the execution thread is hijacked the attacker's balance will still be 0. In the `withdraw()` function the external call is made after the user's balance has been deducted from the internal ledger, so an attacker cannot hijack the execution and make repeated withdrawls on the same balance.

Cacao Dex relies on the `@openzeppelin/openzeppelin-contracts` implementation of `SafeMath.sol` to defend against an Integer Overflow or Underflow attack. This library has >8000 stars on github and >12000 weekly installs over npm.

Cacao Dex does not rely on any timestamps for calculations.

Cacao Dex references only trusted contracts written by the same owner.

While front-running is prevalent on decentralized exchanges, because the current version of Cacao Dex is a proof-of-concept only, considerations were not made to protect against such activies.

The following is a summary of the security research that was taken into consideration while developing the Cacao Dex smart contract:

## Reentrancy

Reentrancy occurs when an attacker calls a public function of a contract, repeatedly within the same block, in order to take advantage of delays in state changes. For example:

1. A target contract has a public withdraw function that sends a user their balance before updating it in the contract's ledger.
2. The withdraw function is called by an attacking contract that triggers the fallback function, accepts the sent ether and immediately calls the withdraw again within the same function, effectively hijacking the execution thread.
3. Since the user's balance in the target contract hasn't been updated yet, the attacking contract can call the withdraw function over and over again until the contract balance is depleted.

The simplest way to mitigate this form of attack is to put any external calls, or calls to functions that make external calls, after a function's logic and state changes have been completed.

As the complexity of a contract's logic increases, or when it shares state/storage with other contracts, another solution called a Mutex becomes useful. Implementing the Mutex Pattern allows the contract to "lock" its state and only allow state changes once per lock, and only by the lock owner. Additional considerations must be made when using Mutexes as to gaurantee that a lock will be released once it has been created.

## Front-Running

Prior to being executed, all transactions are visible in the mempool before being commited to a block. This gives observers a chance to react to an action before it is formally executed and included in a block. The three types of front-running attacks are:

1. Displacement attacks - an observer broadcasts an identical transaction with a higher gas price in order to get picked up by a miner first. For example, on a decentralized exchange when a buy order is placed, an observer broadcasts the same order with a higher gas price and becomes first to make the order. The original order is then run without effect.
2. Insertion attacks - an observer acts as a middleman by broadcasting transactions that insert themselves between a would-be seller and a buyer.
3. Suppression attacks - aka `Block Stuffing` occurs when an attacker broadcasts their transactions, then prevents anyone from broadcasting after them by flooding the network with multiple high-gasPrice transactions and fill up a blocks gasLimit.

Approaches to securing smart contracts against front-running attacks vary by use-case and are rarely trivial. The simplest defense is to remove any economic incentive from front-running. For example, if your smart contract is an auction, it would be better to implement a batch auction. Another approach, called a pre-commit (or commit and reveal) scheme, requires the user to send a keccak256 hash of their data to the smart contract, then in another transaction, send the unencrypted data that matches the data sent in the first tx when hashed. This way the smart contract can keep track of what order the transactions came in, and observers are unaware of the contents of the transaction.

## Timestamp Dependence

Miners have the ability to manipulate the timestamp of the current block, and can exploit this ability to precompute an option that is more favorable for themselves. This could be an issue, for example, for gaming/gambling dapps if they depend on random numbers that are generated by the smart contract.

Seeding a random number generator with a timestamp as a source of entropy is a common practice in software engineering. However due to the influence that miners have on timestamp generation, a maliciious miner could potentially pre-compute the random number, and enter a winning "guess" on a lottery contract.

The best way to safegaurd against this type of attack is to use an external oracle or some external source of entropy for generating the random number.

## Integer Overflow and Underflow

Any functions that update a `uint` value that are publicly accessible can be exploited to cause a buffer overflow or underflow. This is due to the way unsigned integers are stored in memory. The maximum value for a `uint8`, for example, is 255. If your contract uses a uint8 variable that attempts to store anything over 255, you will likely see unexpected results, although you might not receive any errors.

The most common mitigation for this is to use a `SafeMath.sol` library as found in @openzeppelin-contracts. The SafeMath library provides methods that perform integer calculations safely with regard to the buffer overflow and underflow issues.

Solidity 0.6.8 recently introduced the `min` and `max` keywords that natively return these values for an expected type. From the release page:
`Implemented type(T).min and type(T).max for every integer type T that returns the smallest and largest value representable by the type.`

## DOS with Unexpected Revert

When sending ether to an address from a contract, it's possible for the recipient to be a contract with a fallback function that reverts the transaction. This causes the smart contract to fail, potentially fatally. The best way to avoid this type of attack is by implementing a `pull payment system` which stores a mapping of balances that users can withdraw and lets them initiate the withdraw themselves.

## DOS with Block Gas Limit

Each block has a maximum amount of gas that can be spent and therefore a maximum amount of computation that can be performed. If a transaction exceeds that gasLimit then it will fail.

This can be a problem when looping over an array of unknown size. If it's absolutely necessary to do so then plan for it to happen over multiple transactions and track the current index reached, and make sure that there will be no unintended side effects to the user experience.

An attacker could also intentionally stuff a block with computationally intensive transactions that consume the entire gas limit and prevent other transactions from being included for serveral blocks.

This kind of attack is extremely prevalent, and if an attacker stands to profit off of your smart contract using such a strategy, you can almost gaurantee it will happen. The best way to mitigate these types of attacks is to remove the economic incentive of doing so. If that is not possible, for example with a time based gaming/gambling contract, then expect that this will be used as a strategy to win.

## Forcibly Sending Ether to a Contract

It is possible to send Ether to a contract without triggering the fallback function, meaning the contract has no ability to revert the transaction and must accept the ether.

A smart contract might keep an internal ledger by recording the value of each transaction and assume that its balance always matches the internal ledger balance.

However, several things could render that assumption false:

1. If the contract address has been pre-computed and ether sent to the pre-computed address, the inital balance of the contract will not be equal to 0.
2. Any contract could specified a target contract's address as the recipient of a `selfdestruct()` operation, this will transfer the ether without triggering the contracts `fallback()` function.
3. A miner could specify the contract address as the recipient of a mining reward, which again will transfer the ether without triggering the contract `fallback()` function, leaving the internal ledger balance out of sync with the contract's actual balance.

This behavior is by design and can not be stopped. The best safeguarded is to never assume a contracts balance and to always check the balance explicitly.

## References

### Solidity Documentation

https://solidity.readthedocs.io/en/develop/security-considerations.html

### Consensys Ethereum Smart Contract Best Practices

https://consensys.github.io/smart-contract-best-practices/known_attacks/

### Smart Contract Weakness Classification Registry

https://swcregistry.io/
