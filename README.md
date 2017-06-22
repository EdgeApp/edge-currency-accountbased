# Airbitz Shitcoin Currency Plugin

Implement shitcoin transactions against the [airbitz-shitcoin-server](https://github.com/Airbitz/airbitz-shitcoin-server).
The API can be found [here](https://developer.airbitz.co/javascript/#currency-plugin-api)

## Installing

Since this package is not on NPM, you will have to do things manually:

1. Clone this project into a directory next to your project.
2. Install dependencies & build the shitcoin library:

    ```
    cd airbitz-currency-shitcoin
    yarn
    yarn build
    yarn link # optional
    ```

3. Add to your project's `package.json` like:

    ```
    cd ../your-project
    yarn add 'file:../airbitz-currency-shitcoin'
    yarn link airbitz-currency-shitcoin # optional
    ```

Please note that the final step, `yarn link`, breaks the React Native packager. If that's your platform, just skip it. You'll have to manually update `node_modules` if the shitcoin library changes.

This package uses rollup.js to bundle its sources. If you would like to avoid having to re-build every time you test something (particularly when running the CLI tool), simply rename `lib/` to `src/` in the `main` and `module` properties of `package.json`.

## Usage

Initialize the plugin:

```
import { makeShitcoinPlugin } from `airbitz-currency-shitcoin`

const shitcoinPlugin = makeShitcoinPlugin({
  io: yourPlatformSpecifcIo
})
```

Now you can pass `shitcoinPlugin` to `airbitz-core-js`.