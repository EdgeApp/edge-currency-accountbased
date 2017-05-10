# Airbitz Core Shitcoin TxLib 

Implement shitcoin transactions against the [airbitz-shitcoin-server](https://github.com/Airbitz/airbitz-shitcoin-server).
The API can be found [here](https://developer.airbitz.co/javascript/#abctxengine)

Add to your package.json like:
```
"airbitz-txlib-shitcoin": "https://github.com/Airbitz/airbitz-txlib-shitcoin.git",
```

Import as:

```
import { TxLibBTC } from 'airbitz-txlib-shitcoin'
```

## Development

This package uses rollup.js to bundle its sources. If you would like to avoid having to re-build every time you test something (particularly when running the CLI tool), simply rename `lib/` to `src/` in the `main` and `module` properties of `package.json`.
