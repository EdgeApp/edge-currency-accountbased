# edge-currency-accountbased CLI

This tool makes it possible to work with currency plugins on the command-line. You can either run the CLI interactively, or you can run the commands one-at-a-time, such as from a shell script. This tool saves its state to disk, so the selected plugin and private keys will not be lost between runs.

CAUTION: This CLI stores it's keys in plain text. This is not meant to be a secure wallet, but only a testing tool.

## Overview

To use the tool, first do `yarn cli`. This will start an interactive session. You can use `--help` to get information about commands - many accept useful parameters.

To select a particular plugin, use `list-plugins` and `select-plugin`. This choice will be saved for the next time you run the tool.

To work with keys, you can use `import-key` or `create-key` to create new keys. These keys will be saved between runs. Use `status` to print the last-saved keys, as well as other information about the current session.

Once you have a private key, you can use `start-engine` and `kill-engine` to create or destroy a currency engine. Once the engine is running, log output will be buffered in the background. The CLI will print buffered output after running any command, or after pressing "enter". If you exit the CLI with a running engine, the engine will be re-started on the next run. Use `get-balance` to print the balance for either the parent currency (no parameters) or a tokenId (one parameter).

To work with the enabled token list, use `list-tokens`, `enable-token`, or `disable-token`. Use `add-token` & `delete-token` to work with custom tokens. These settings will be saved between runs.

Finally, to work with transactions, use `make-spend` to craft a transaction. This transaction will be not be saved to disk, but it will be available for use with subsequent commands. Use `sign-tx`, `broadcast-tx`, and `save-tx` to push the transaction forward through the sending process.
