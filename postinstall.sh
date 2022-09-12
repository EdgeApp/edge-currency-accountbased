#!/bin/bash

# The `usb` and 'node-hid' modules doesn't properly install on some boxes:
echo "*** Running postinstall.sh ***"
rm -rf node_modules/usb
mkdir -p node_modules/usb
touch node_modules/usb/index.js
rm -rf node_modules/node-hid
mkdir -p node_modules/node-hid
touch node_modules/node-hid/index.js
mkdir -p lib/polkadot
cp ./src/polkadot/polkadot-sdk-bundle.js ./lib/polkadot/
