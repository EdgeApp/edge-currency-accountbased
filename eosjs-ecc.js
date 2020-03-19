const ecc = require('eosjs-ecc')

const PRIVATE_KEY = '5KYuUHyzNqNd9gszoEQZZPmzSM478uBcTPn9Epdx9ZtuUpwLkfA'
const publicKey = ecc.privateToPublic(PRIVATE_KEY)

console.log('Derived public key is: ', publicKey)
