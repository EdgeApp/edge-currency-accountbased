# Edge Ethereum Currency Plugin

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

Implements Bitcoin send/receive functionality per the spec for crypto currency plugins for [airbitz-core-js](https://github.com/Airbitz/airbitz-core-js)

## Installing

npm i edge-currency-ethereum -s

```
import { EthereumCurrencyPluginFactory } from `edge-currency-ethereum`
```

Now you can pass `EthereumCurrencyPluginFactory` to `airbitz-core-js`.

```
const context = makeReactNativeContext({
  apiKey: YOUR_API_KEY,
  plugins: [ EthereumCurrencyPluginFactory ]
})
```
