# Airbitz Ethereum Currency Plugin

Implements Ethereum send/receive functionality per the spec for currency plugins for airbitz-core-js

## Installing

Since this package is not on NPM, you will have to do things manually:

1. Clone this project into a directory next to your project.
2. Install dependencies & build the library:

    ```
    cd airbitz-currency-ethereum
    yarn
    yarn build
    ```

3. Add to your project's `package.json` like:

    ```
    cd ../your-project
    yarn add 'file:../airbitz-currency-ethereum'
    ```

Please note that the final step, `yarn link`, breaks the React Native packager. If that's your platform, just skip it. You'll have to manually update `node_modules` if the shitcoin library changes.

This package uses rollup.js to bundle its sources. If you would like to avoid having to re-build every time you test something (particularly when running the CLI tool), simply rename `lib/` to `src/` in the `main` and `module` properties of `package.json`.

## Usage

Initialize the plugin:

```
import { makeEthereumPlugin } from `airbitz-currency-ethereum`

const ethereumPlugin = makeEthereumPlugin({
  io: yourPlatformSpecifcIo
})
```

Now you can pass `ethereumPlugin` to `airbitz-core-js`.
