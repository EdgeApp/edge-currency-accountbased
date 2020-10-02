#!/bin/bash

# The `usb` and 'node-hid' modules doesn't properly install on some boxes:
mkdir -p node_modules/usb
touch node_modules/usb/index.js
mkdir -p node_modules/node-hid
touch node_modules/node-hid/index.js
