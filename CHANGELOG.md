# edge-currency-accountbased

# 0.7.49 (2021-03-15)

- EOS: Add dfuse graphql API to search for transactions
- ETH: Add new Golem token GLM
- Add promiseNy util to verify API responses from multiple sources
- Add contract address checking to Blockbook

# 0.7.48 (2021-02-26)

- EOS: Add dfuse API to getKeyAccounts method
- ETH: Double gas limit estimates when sending ETH to a contract address

# 0.7.47 (2021-02-23)

- ETH: Fix RBF bug: Use correct currencyCode for tx lookup in ethEngine saveTx
- FIO: Added transfer address action

# 0.7.46 (2021-02-12)

- Fix variable typo

# 0.7.45 (2021-02-11)

- Add DeFi ERC20 tokens
- Update FIO server list
- Add additional logging

# 0.7.44 (2021-02-02)

- ETH: Bump max gas limit to 300000
- ETH: Add additional estimateGas params that cloudflare requires
- ETH: Put RPC error handling in multicastServers
- ETH: Throw error when custom fee isn't valid or doesn't reach network minimums

# 0.7.43 (2021-01-25)

- EOS: Fix get_key_accounts endpoint and enforce 12 character rule on new account names
- Adjust log levels
- Update to eslint-config-standard-kit to v0.15.1

# 0.7.42 (2021-01-02)

- Add WBTC
- Fix Aave token parameters

# 0.7.41 (2021-01-01)

- Capitalize Aave token codes

# 0.7.40 (2020-12-31)

- Add Aave ERC20 tokens
- FIO: Add additional domain transfer transaction

# 0.7.39 (2020-12-21)

- Double gas estimate when sending ETH to a contract to reduce chance of failure
- FIO logging cleanup

# 0.7.38 (2020-12-13)

- Update ANT contract address and rename original token ANTV1

# 0.7.37 (2020-12-09)

- EOS: Ignore bogus accounts getting returned by nodes

# 0.7.36 (2020-12-07)

- Remove eosrio from hyperion server list

# 0.7.35 (2020-12-04)

- FIO: Refactored multicast servers, add preparedTrx support, Removed non-SSL FIO servers
- Used fetchCors for Trezor blookbook server

# 0.7.34 (2020-11-23)

- Add Blockbook API support for Ethereum
- Disable Alethio API support
- Remove Supereth API support

# 0.7.33 (2020-11-18)

- Fix EOSIO metaToken send issues (contractAddress and denom)

# 0.7.32 (2020-11-16)

- WAX changes
  - Remove unnecessary logs and pass in token data to multiple routines
  - Enable adding token and fetching token balance for EOSIO chains
  - Merge in EOSIO token implementation
  - Fix erroneous WAX activation call and publicKey typo

# 0.7.31 (2020-11-11)

- WAX Integration
  - Update endpoint for finding EOSIO account by key
  - Initial WAX integration
  - Remove unnecessary comments and disable Greymass Fuel for Telos
  - Enable WAX activation process
  - Move WAX activation to eosEngine and attempt activation on engine start
  - Adjustment to EosFuel routine
  - Make singleApiActivation private for Wax
- FIO changes:
  - Check if domain is public
  - Check for transferred addresses/domains.
  - Transfer fio domain changes.
  - Removed FIO str from logs.
- RBF support for ETH, RSK, and ETH tokens

# 0.7.30 (2020-10-08)

- Add onAddressChanged callback to EOS to inform GUI of new account activation

# 0.7.29 (2020-10-04)

- Add postinstall script to npm package

# 0.7.28 (2020-10-04)

- Replace schema with cleaners for transaction history api calls
- Add cloudflare rpcServer
- Only calculate 'data' parameter if using default fees
- Fix TRANSACTION_STORE_FILE data initialization
- Fix hex number parsing
- Pass fetchCors function to amberdata api calls
- Remove unnecessary log
- Add postinstall script for node14 dependency compatibility (usb and node-hid)
- Update cleaners

# 0.7.27 (2020-10-01)

- Add FIO import private key support
- Fix TLOS block explorer link

# 0.7.25 (2020-09-18)

- Upgrade FIO SDK to v1.1.0
- Retry failed FIO tx broadcasts
- Update FIO explorer

# 0.7.24 (2020-09-16)

- Add Telos (TLOS)
- EOS fixes

# 0.7.23 (2020-09-16)

- FIO register domain
- FIO check pub address error handling

# 0.7.22 (2020-09-03)

- Added free FIO address link
- Updated FIO api urls to remove port

# 0.7.21 (2020-09-02)

- Update ETH gas price sanity check values

# 0.7.20 (2020-08-25)

- Add Synthetix ERC20 tokens (SNX, SBTC, and SUSD)
- Save FIO tx fee between makeSpend() requests to the same address to reduce network calls
- Pass parent currency code in error when there's insufficient parent currency to pay transaction fee
- Increase timeout on network-dependent block height test

# 0.7.19 (2020-08-20)

- Use eth_estimategas and eth_getcode to improve ETH and ERC20 token transaction fee estimation

# 0.7.18 (2020-08-12)

- Disable asyncWaterfall for some FIO operations
- Save numTransactions in localWalletData
- Add cleaners to Etherscan get tx api responses

# 0.7.17 (2020-08-04)

- FIO checkTransactions algorithm update to page transactions
- Fix REPv2 token address

# 0.7.16 (2020-07-29)

- Add REPV2 ERC20 token

# 0.7.15 (2020-07-23)

- Add new Tezos API
- FIO - fix multicastServers

# 0.7.14 (2020-07-12)

- FIO fix domain reg url

# 0.7.13 (2020-07-10)

- Add get domains method to FIO plugin
- FIO fallback ref mode
- Add fee strings to ethEngine makeSpend() return value

# 0.7.12 (2020-07-05)

- Add Compound ERC20 token (COMP)

# 0.7.11 (2020-06-25)

- Update FIO apiUrls

# 0.7.10 (2020-06-23)

- Categorize servers by rpc and etherscan

# 0.7.9 (2020-06-05)

- Fix case where a FIO address could appear associated with two FIO wallets

# 0.7.8 (2020-06-04)

- Add etherclusterApiServers[] to rskInfo.js
- Add custom FIO domain support
- Add FIO address renewal support

# 0.7.6 (2020-05-21)

- Tezos - Add makeMutex to wrap makeSpend() to avoid entering it more than once

# 0.7.5 (2020-05-14)

- Refactor EOS plugin to remove owner key to support importing wallets
- Add Ethereum Classic support
- Remove own receive address from Tezos makeSpend

# 0.7.4 (2020-04-28)

- Refactor ETH and RSK to use common code
- FIO performance improvements

# 0.7.3 (2020-04-22)

- isAccountAvailable() renamed to doesAccountExist()

# 0.7.2 (2020-04-17)

- Add cleaners v0.2.0 type checking
- Fix duplicate FIO address after registration
- Reprioritize EOS Hyperion nodes to resolve transaction history view issue

# 0.7.1 (2020-04-07)

- Add TPID to FIO requests
- Fix Max Sends
- Updated fioInfo.js to mainnet

# 0.7.0 (2020-04-06)

- Add FIO

# 0.6.10 (2020-04-06)

- Import EOS private key
- Fix XLM transaction history not showing

# 0.6.9 (2020-03-23)

- Remove FIO codebase, accidentally included in v0.6.8.

# 0.6.8 (2020-03-20)

- Add MET token

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
