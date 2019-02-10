# edge-currency-accountbased

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
