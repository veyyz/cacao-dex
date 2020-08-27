#Overview

Ethereum, and blockchain in general, is a relatively new and extremely experimental technology. New bugs and security risks are discovered on a daily basis, and responding to these risks is expensive and time consuming.

Securing a smart contract against known vulnerabilities is not enough. A smart contract developer must expect unknown vulnerabilities and plan for when, not if, their smart contract is effected.

The consequence of failure of an application such as a decentralized exchange is that money will be lost. In order to minimize any potential losses, I have implemented the follwing design patterns:

1. Circuit Breaker - At any time the contract admin can freeze the contract's execution to prevent any/all loss, in the event that a vulnerability is discovered prior to the Dex being exploited.
2. Upgradability - The Dex smart contract is deployed using a Proxy Delegate Pattern, meaning that it is possible to make limited bug fixes and improvements. Should a vulnerability be detected, the contract can be paused via the Circuit Breaker, until a fix has been tested, and deployed via the Proxy smart contract.
