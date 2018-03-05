# Edge Ethereum Currency Plugin
[![Build Status](https://travis-ci.org/Airbitz/edge-currency-ethereum.svg?branch=master)](https://travis-ci.org/Airbitz/edge-currency-ethereum)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

Implements Bitcoin send/receive functionality per the spec for crypto currency plugins for [airbitz-core-js](https://github.com/Airbitz/airbitz-core-js)

## Installing

    npm i edge-currency-ethereum -s

```
import { ethereumCurrencyPluginFactory } from `edge-currency-ethereum`
```

Now you can pass `ethereumCurrencyPluginFactory` to `edge-core-js`.

```
const context = makeEdgeContext({
  apiKey: YOUR_API_KEY,
  plugins: [ ethereumCurrencyPluginFactory ]
})
```

## Contributing

You'll need to install Yarn 1.3.2 globally on your machine

To run a local version of this repo inside the full Edge Wallet app, clone this repo at the same level as `edge-react-gui`

    git clone git@github.com:Airbitz/edge-currency-ethereum.git`
    cd edge-currency-ethereum
    yarn

Run `npm run test` to run the unit tests.

To use the local cloned version of this repo, `cd edge-react-gui` and run 

    npm run updot edge-currency-ethereum
    npm run postinstall
    
This will copy the necessary files from `edge-currency-ethereum` into the `edge-react-gui/node_modules/edge-currency-ethereum` replacing the npm installed version. This needs to be done after any modifications to `edge-currency-ethereum`

## License
BSD 3
