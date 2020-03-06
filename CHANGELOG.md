# edge-currency-accountbased

# 0.6.7 (2020-03-06)

- Add response error checking to fetch() calls
- Fixed crash when Etherscan API returned text rather than a number by adding decimal and hex regex to response validation

# 0.6.6 (2020-02-13)

- EOS - Revert fetch update to fix syncing

# 0.6.5 (2020-02-06)

- EOS - Add Greymass Fuel

# 0.6.4 (2020-01-22)

- Add ETH internal transaction support

# 0.6.3 (2020-01-06)

- Add ETHBNT

# 0.6.2 (2020-01-01)

- Upgrade to edge-core-js v0.16.17
- Upgrade devDependencies

# 0.6.1 (2019-12-31)

- Fix missing parent currency code from enabledTokens

# 0.6.0 (2019-12-18)

- Add Amberdata support
- RBTC fixes
- Add 'xrp-ledger:' prefix support

# 0.5.9 (2019-12-06)

- Fix nonce query to save nonce as string.
- Add try/catch to checkAndUpdate
- Ensure ETH is checked for balance and txs

# 0.5.8 (2019-12-05)

- Update Tezos explorer and RPC nodes
- Optimize multiple API support for ETH

# 0.5.7 (2019-12-03)

- Add CDAI
- Add Alethio API

# 0.5.6 (2019-11-25)

- Add Blockchair API
- Add support for eth_estimateGas

# 0.5.5 (2019-11-20)

- Refactor ETH for API flexibility (no functional change)

# 0.5.4 (2019-11-07)

- Accept multiple etherscan API keys.

# 0.5.3 (2019-11-04)

- Update usage of EOS API endpoints

# 0.5.2 (2019-10-30)

- Fix Tezos Babylon compatibility.

# 0.5.1 (2019-10-28)

- Update HERC contract address.

# 0.5.0 (2019-10-22)

- Include compound tokens info

# 0.4.9 (2019-10-14)

- Connect to multiple EOS Hyperion nodes (with fallback).

# 0.4.8 (2019-10-11)

- Replace ripplecharts with bithomp.
- Directly connect to EOS producers (with fallback).

# 0.4.7 (2019-10-01)

- Remove BlockScout due to delayed / cached results

# 0.4.5 (2019-09-20)

- Fix XTZ seed issue (`mnemonicToSeedSync` to `mnemonicToSeedSync`)

# 0.4.4 (2019-09-19)

- Allow XTZ mnemonic import
- Adjustments to dependencies

# 0.4.3 (2019-09-13)

- Display mnemonic seeds for RSK when available.

# 0.4.2 (2019-09-13)

- Upgrade Ripple network libraries
- Add Chainlink token
- Fix RSK key management

# 0.4.1 (2019-09-05)

- Fix BNB balance stuck loading on new accounts
- Remove BNB as possible ERC20 token
- Removed `signedTx` data from BNB transactions

# 0.4.0 (2019-09-04)

- Implementation of Binance Chain (BNB)

# 0.3.8 (2019-09-04)

- Remove cached RPC node from being used for XTZ getBalance

# 0.3.7

- Remove unnecessary code for ETH errors

# 0.3.6 (2019-08-29)

- Skip one XTZ node for `getHead` loop to fix engine block height

# 0.3.5

- Add AGLD to list of known tokens

# 0.3.4 (2019-08-22)

- Validate Ethereum addresses prior to sending.

# 0.3.3 (2019-08-22)

- Add support for RSK & Tezos mnemonic keys.
- Fix Tezos URI generation.
- Add basic FIO key generation shims.

# 0.3.2 (2019-08-11)

- Change Tezos signedTx property from string to hex
- Change Tezos currency symbol to 't' due to font issue with official symbol

# 0.3.1 (2019-08-08)

- Set default `signedTx` property on EdgeTransactions to empty string

# 0.3.0 (2019-08-06)

- Integration of RSK / RBTC
- Integration of Tezos

# 0.2.0 (2019-08-01)

- Allow importing of XLM and XRP private keys

# 0.1.19 (2019-07-31)

- Implement ignoring of zero-amount transactions (ie proxy allowance)

# 0.1.18 (2019-07-12)

- Fix `edgeTransaction.otherParams.data` issue throwing error when `otherParams` does not exist

# 0.1.17 (2019-07-12) _Deprecated_

# 0.1.16 (2019-07-10)

- Implement Totle transactions (extra proxy allowance transaction)

# 0.1.15 (2019-07-03)

- Fix EOS infinite loop issue

# 0.1.14 (2019-07-02)

- Fix Outgoing EOS transaction issue

# 0.1.13 (2019-06-27)

- Fix EOS syncing issue
- Fix node 12 compatibility

# 0.1.12 (2019-06-10)

- Fix BRZ token multiplier / denomination / decimals

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

- Get Ethereum to catch insufficient _token_ balance transactions

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

- Fix the node entry point not to crash

## 0.0.24 (2019-02-18)

- Fix a crash on boot on React Native

## 0.0.23 (2019-02-15)

- Upgrade to the edge-core-js v0.14.0 types
- Modernize the build system

## 0.0.22

- Fix ETH blockHeight from fluttering in/out of confirmation
- Fix XLM makeSpend if called multiple times and older edgeTransaction is used for signTx

## 0.0.21

- Properly call onTransactionsChanged on new txs

## 0.0.20

- Fix EOS accounts from being detected after activation
- Fix display of ETH private seeds

## 0.0.19

- Fix XRP incorrect spend amounts
- Fix syncing of ETH wallets after network disconnect/reconnect
- Improve syncing of XRP wallets by connecting to multiple servers
- Improve syncing of XRP wallets by detecting connection failure and retrying

## 0.0.18

- Change ETH fee estimates for better confirmation times
- Change broadcastTx to broadcast to all APIs at the same time
- Add Infura to broadcast APIs

## 0.0.17 (2019-02-01)

- Add EOS support
- Add Ethereum support
- Retry failed XRP broadcasts

## 0.0.16

- Publish with a cleaned lib/ directory. Identical code to 0.0.15

## 0.0.15

- Use new colored icons

## 0.0.13

- Fix saving read back of lastAddressQueryHeight to prevent always querying from block 0

## 0.0.12

- Do not load transactions until core asks for getTransactions or we have to save a new tx to disk

## 0.0.11

- Fix incorrect error thrown from makeSpend due to insufficient funds

## 0.0.10

- Fix parseUri for unique identifiers of XLM and XRP

## 0.0.9-beta.2

- Full spend/receive functionality for Ripple/XRP refactored from edge-currency-ripple
- Full spend/receive functionality for Stellar with memo.id support
- EOS support for send/receive
- EOS support for showing outgoing transactions only
- EOS missing ability to activate account
