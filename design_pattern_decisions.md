# Design Pattern Decisions

## Inter-Contract Execution

The contract uses interfaces of the Aave protocol to interact with its functions. The contract requires addresses Aave's contracts in its constructor, and those addresses are defined in [deploy config file](./deploy.config.js). All state changes are done before external calls to Aave.

## Inheritance and Interfaces

The contract inherits OpenZeppelin's Ownable and Pausable contracts, and uses interfaces of Aave protocol to interact with its functions.

## Access Control Design Patterns

The contract has Pausable functions so that deposits and withdrawals can be paused if any issue related to the saving pool is identified. These functions adopted the Ownable pattern to ensure only the owner can call those functions.

## Optimizing Gas

For everyone who maintains their streak and is eligible for the interest, the most accurate way to work out their interest is to loop through all of them and the time they deposited. However, this would cost a lot of gas. So this contract only uses the players' principal amount to approximate. To prevent malicious players take advantage of this logic, the contract requires a minimum streak to earn interest. In this case, if any person has a large amount of capital and would like to capture the most part of the interest pool, he/she still has to stay for at least 4 weeks. During their stay, they contribute to the interest pool as well.