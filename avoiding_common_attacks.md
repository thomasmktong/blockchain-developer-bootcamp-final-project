# Avoid Common Attacks

## Using Specific Compiler Pragma

The contract uses Solidity version 0.8.10, it is the latest  version and it has integrated SafeMath.

- [SWC-101: Integer Overflow and Underflow](https://swcregistry.io/docs/SWC-101)
- [SWC-102: Outdated Compiler Version](https://swcregistry.io/docs/SWC-102)
- [SWC-103: Floating Pragma](https://swcregistry.io/docs/SWC-103)

## Checks-Effects-Interactions

All state changes are done before external calls to Aave.

- [SWC-107: Reentrancy](https://swcregistry.io/docs/SWC-107)

## Use of Block Timestamp

It is aware that `block.timestamp` is not precise. The contract still use it because it should not matter much under the current long time frame game design.

- [SWC-116: Block values as a proxy for time](https://swcregistry.io/docs/SWC-116)

## Function Visibility

All functions' and state variables' visibility are explicitly marked.

- [SWC-100: Function Default Visibility](https://swcregistry.io/docs/SWC-100)