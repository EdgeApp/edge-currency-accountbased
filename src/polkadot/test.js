// @flow

// const dotApi = require('@polkadot/api')
// const fetch = require('node-fetch')

// const { ApiPromise, WsProvider } = dotApi

// const wsProvider = new WsProvider('wss://rpc.polkadot.io')
// const api = new ApiPromise({ provider: wsProvider })

// async function main() {
//   await api.isReadyOrError
//   const response = await api.rpc.chain.getHeader()
//   const { parentHash, number: blockheight } = response
//   console.log(JSON.parse(JSON.stringify(response)))
//   const response2 = await api.query.system.account.at(
//     parentHash,
//     '13MLdtCJdSbyojwjiBMxti4tQ7qVZN2XgNfGcfSDck84tFnd'
//   )
//   // console.log('parenthash', parentHash)
//   // console.log('\n')
//   // console.log('height', blockheight)
//   console.log('json,', JSON.stringify(response2))
//   const response3 = await api.query.system.account(
//     '13MLdtCJdSbyojwjiBMxti4tQ7qVZN2XgNfGcfSDck84tFnd'
//   )
//   console.log('json, 2', JSON.stringify(response3))
//   // const response4 = await api.query.timestamp.now()
//   // console.log('28. response4\n', JSON.stringify(response4))
//   // const response5 = await api.query.session.validators()
//   // console.log('30. response5\n', JSON.stringify(response5))
//   const method = 'POST'
//   const headers = {
//     'Content-Type': 'application/json'
//   }
//   const body = JSON.stringify({
//     id: 1,
//     jsonrpc: '2.0',
//     method: 'chain_getBlock',
//     params: []
//   })
//   const response5 = await fetch('https://rpc.polkadot.io', {
//     method,
//     headers,
//     body
//   })
//   const json = await response5.json()
//   console.log('38. json\n', JSON.stringify(json))
//   process.exit()
// }

// main().catch(e => console.log(e))
