# Airbitz Ethereum Currency Plugin

Implements Bitcoin send/receive functionality per the spec for currency plugins for [airbitz-core-js](https://github.com/Airbitz/airbitz-core-js)

## Installing

Since this package is not on NPM, you will have to use the current git version

npm i git+ssh://git@github.com/Airbitz/airbitz-currency-ethereum.git -s

```
import { EthereumCurrencyPluginFactory } from `airbitz-currency-ethereum`
```

Now you can pass `EthereumCurrencyPluginFactory` to `airbitz-core-js`.

```
const context = makeReactNativeContext({
  apiKey: YOUR_API_KEY,
  plugins: [ EthereumCurrencyPluginFactory ]
})
```

This plugin exposes the following `otherSettings` which can be set using abcAccount.updateSettings()

```
{
  etherscanApiServers: Array<string>
  superethServers: Array<string>
}
```
`etherscanApiServers` is an array of servers to use that follow the etherscan.io API for querying address balance and transactions. ie. `https://api.etherscan.io`

`superethServers` is an array of servers to use that follow the [Supereth](https://github.com/Airbitz/edge-supereth) API
