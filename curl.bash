curl https://public-node.rsk.co \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_getTransactionCount","params": ["0x461750b4824B14c3d9B7702bc6FbB82469082b23", "latest"],"id":1}'



    curl https://public-node.rsk.co \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_getBalance","params": ["0xcf838c7c168ab274c555c99db1537992956bf15b"],"id":2}'
