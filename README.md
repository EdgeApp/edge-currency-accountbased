# Airbitz Shitcoin Currency Plugin

Implement shitcoin transactions against the [airbitz-shitcoin-server](https://github.com/Airbitz/airbitz-shitcoin-server).
The API can be found [here](https://developer.airbitz.co/javascript/#abctxengine)

To install (since this is not on NPM):

1. Clone this project into a directory next to yours
2. Install dependencies & build the shitcoin library:

    ```
    cd airbitz-currency-shitcoin
    yarn
    yarn build
    ```

3. Add to your projects `package.json` like:

    ```
    cd ../your-project
    yarn add 'file:../airbitz-currency-shitcoin'
    ```

Import as:

```
import { TxLibBTC } from 'airbitz-txlib-shitcoin'
```

## Development

This package uses rollup.js to bundle its sources. If you would like to avoid having to re-build every time you test something (particularly when running the CLI tool), simply rename `lib/` to `src/` in the `main` and `module` properties of `package.json`.
