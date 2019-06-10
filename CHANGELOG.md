# edge-currency-accountbased

# 0.1.11 (2019-06-09)

- Add BRZ as a native ERC20 token

# 0.1.10 (2019-05-16)

- Fix importing Ethereum private keys starting with 0x.
- Allow multiple unconfirmed Ethereum spends at once.

# 0.1.9

- Fix toke denomination issue for encodeUri and parseUri
- Increase unit test timeout

# 0.1.8 (2019-03-27)

- Update Ripple block explorer link.
- Add ability to import Ethereum private keys.
- Add ability to detect dropped Ethereum transactions.

# 0.1.7 (2019-03-07)

- Get Ethereum to catch insufficient *token* balance transactions

# 0.1.5 (2019-03-06)

- Convert Infura eth_getBalance to decimal string.

# 0.1.4 (2019-03-04)

- Fix GUSD denominations.
- Improve Ethereum token syncing using multiple servers.

# 0.1.3 (2019-02-26)

- Fix GUSD and TUSD contract addresses

# 0.1.2 (2019-02-25)

- Fix incorrect Ethereum private key parsing.
- Add popular ERC-20 tokens

# 0.1.1 (2019-02-22)

- Fix CORS issues during EOS activation on react-native.

# 0.1.0 (2019-02-19)

- Upgrade to the edge-core-js v0.15.0 and adapt to breaking changes.

## 0.0.25 (2019-02-19)

* Fix the node entry point not to crash

## 0.0.24 (2019-02-18)

* Fix a crash on boot on React Native

## 0.0.23 (2019-02-15)

* Upgrade to the edge-core-js v0.14.0 types
* Modernize the build system

## 0.0.22

* Fix ETH blockHeight from fluttering in/out of confirmation
* Fix XLM makeSpend if called multiple times and older edgeTransaction is used for signTx

## 0.0.21

* Properly call onTransactionsChanged on new txs

## 0.0.20

* Fix EOS accounts from being detected after activation
* Fix display of ETH private seeds

## 0.0.19

* Fix XRP incorrect spend amounts
* Fix syncing of ETH wallets after network disconnect/reconnect
* Improve syncing of XRP wallets by connecting to multiple servers
* Improve syncing of XRP wallets by detecting connection failure and retrying

## 0.0.18

* Change ETH fee estimates for better confirmation times
* Change broadcastTx to broadcast to all APIs at the same time
* Add Infura to broadcast APIs

## 0.0.17 (2019-02-01)

* Add EOS support
* Add Ethereum support
* Retry failed XRP broadcasts

## 0.0.16

* Publish with a cleaned lib/ directory. Identical code to 0.0.15

## 0.0.15

* Use new colored icons

## 0.0.13

* Fix saving read back of lastAddressQueryHeight to prevent always querying from block 0

## 0.0.12

* Do not load transactions until core asks for getTransactions or we have to save a new tx to disk

## 0.0.11

* Fix incorrect error thrown from makeSpend due to insufficient funds

## 0.0.10

* Fix parseUri for unique identifiers of XLM and XRP

## 0.0.9-beta.2

* Full spend/receive functionality for Ripple/XRP refactored from edge-currency-ripple
* Full spend/receive functionality for Stellar with memo.id support
* EOS support for send/receive
* EOS support for showing outgoing transactions only
* EOS missing ability to activate account
