# edge-currency-accountbased

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