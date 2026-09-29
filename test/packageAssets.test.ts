import { assert } from 'chai'
import { readFile } from 'fs/promises'
import { join } from 'path'

const abiNames = ['ETH_BAL_CHECKER_ABI.json', 'NODE_INTERFACE_ABI.json']

describe('Node package assets', function () {
  for (const abiName of abiNames) {
    it(`copies ${abiName} into lib`, async function () {
      const source = await readFile(
        join('src', 'ethereum', 'abi', abiName),
        'utf8'
      )
      const built = await readFile(
        join('lib', 'ethereum', 'abi', abiName),
        'utf8'
      )

      assert.equal(built, source)
    })
  }
})
