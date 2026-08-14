import { assert } from 'chai'
import { asMaybe } from 'cleaners'
import { describe, it } from 'mocha'
import { base16 } from 'rfc4648'
import TronWeb from 'tronweb'

import {
  asTronContractCallExtras,
  asTronContractCallIntent,
  asTronContractCallOtherParams,
  asTronFreezeV2Action,
  asTronUnfreezeAction
} from '../../src/tron/tronTypes'

const {
  utils: {
    transaction: { txJsonToPb, txPbToTxID }
  }
} = TronWeb

// A real `TriggerSmartContract` payload from a Rango TRON swap quote, along
// with the reference block it was built against and the transaction Rango
// derived from it.
const rangoContractJson = {
  type: 'TriggerSmartContract',
  parameter: {
    type_url: 'type.googleapis.com/protocol.TriggerSmartContract',
    value: {
      type: 'TriggerSmartContract',
      data: '095ea7b30000000000000000000000004ab38f7ae7eadad03981b2a7d7883760aa63e56400000000000000000000000000000000000000000000000000000000000f4240',
      owner_address: '416c4d3cb629599f55e634bcbe08c9ffc560373d77',
      contract_address: '41a614f803b6fd780986a42c78ec9c7f77e6ded13c',
      call_value: 0
    }
  }
}
const rangoRefBlockBytes = '021a'
const rangoRefBlockHash = '84e1119ef45564af'
const rangoExpiration = 1784099490000
const rangoTimestamp = 1784099430000
const rangoFeeLimit = 250000000
const rangoRawDataHex =
  '0a02021a220884e1119ef45564af40d091f7a4f6335aae01081f12a9010a31747970652e676f6f676c65617069732e636f6d2f70726f746f636f6c2e54726967676572536d617274436f6e747261637412740a15416c4d3cb629599f55e634bcbe08c9ffc560373d77121541a614f803b6fd780986a42c78ec9c7f77e6ded13c2244095ea7b30000000000000000000000004ab38f7ae7eadad03981b2a7d7883760aa63e56400000000000000000000000000000000000000000000000000000000000f424070f0bcf3a4f633900180e59a77'
const rangoTxId =
  '9e29f8242349de7507fc3fb3eae8a56bdf40823dcbf1dadfe17f46876c4c738d'

describe('tron contract call spends', function () {
  it('accepts a provider contract call payload', function () {
    const clean = asMaybe(asTronContractCallOtherParams)({
      contractJson: rangoContractJson,
      feeLimit: rangoFeeLimit
    })

    if (clean == null) throw new Error('Expected a contract call')
    assert.equal(clean.feeLimit, rangoFeeLimit)
    assert.equal(
      clean.contractJson.parameter.value.contract_address,
      '41a614f803b6fd780986a42c78ec9c7f77e6ded13c'
    )
  })

  it('preserves properties the cleaner does not name', function () {
    const clean = asMaybe(asTronContractCallOtherParams)({
      contractJson: rangoContractJson,
      feeLimit: rangoFeeLimit
    })

    if (clean == null) throw new Error('Expected a contract call')
    assert.deepEqual(clean.contractJson, rangoContractJson)
  })

  it('defaults a missing call value to zero', function () {
    const { call_value: unused, ...value } = rangoContractJson.parameter.value
    const clean = asMaybe(asTronContractCallOtherParams)({
      contractJson: {
        ...rangoContractJson,
        parameter: { ...rangoContractJson.parameter, value }
      }
    })

    if (clean == null) throw new Error('Expected a contract call')
    assert.equal(clean.contractJson.parameter.value.call_value, 0)
  })

  it('leaves a missing fee limit for the engine to default', function () {
    const clean = asMaybe(asTronContractCallOtherParams)({
      contractJson: rangoContractJson
    })

    if (clean == null) throw new Error('Expected a contract call')
    assert.equal(clean.feeLimit, undefined)
  })

  it('reports the properties that change what gets signed', function () {
    const clean = asTronContractCallExtras(rangoContractJson.parameter.value)
    assert.equal(clean.call_token_value, 0)
    assert.equal(clean.function_selector, undefined)

    const tampered = asTronContractCallExtras({
      ...rangoContractJson.parameter.value,
      call_token_value: 5000,
      token_id: 1002000,
      function_selector: 'transfer(address,uint256)'
    })
    assert.equal(tampered.call_token_value, 5000)
    assert.equal(tampered.function_selector, 'transfer(address,uint256)')
  })

  it('recognizes an attempted contract call even when it is malformed', function () {
    // A string fee limit fails the contract call cleaner, but the caller
    // clearly asked for a contract call and must not get a transfer.
    const otherParams = {
      contractJson: rangoContractJson,
      feeLimit: '250000000'
    }
    assert.equal(asMaybe(asTronContractCallOtherParams)(otherParams), null)
    assert.notEqual(asMaybe(asTronContractCallIntent)(otherParams), null)

    // Shapes that are not even an object still count as asking for a call
    for (const contractJson of ['{"type":"TriggerSmartContract"}', null, 7]) {
      assert.notEqual(asMaybe(asTronContractCallIntent)({ contractJson }), null)
    }
  })

  it('does not treat a staking action as an attempted contract call', function () {
    assert.equal(
      asMaybe(asTronContractCallIntent)({
        type: 'remove',
        params: { resource: 'ENERGY' }
      }),
      null
    )
    assert.equal(asMaybe(asTronContractCallIntent)({}), null)
  })

  it('rejects payloads that are not contract calls', function () {
    const notContractCalls = [
      { type: 'remove', params: { resource: 'ENERGY' } },
      { type: 'addV2', params: { nativeAmount: '1', resource: 'ENERGY_V2' } },
      { unsignedTx: 'deadbeef' },
      {
        contractJson: {
          type: 'TransferContract',
          parameter: {
            value: {
              to_address: '416c4d3cb629599f55e634bcbe08c9ffc560373d77',
              owner_address: '416c4d3cb629599f55e634bcbe08c9ffc560373d77',
              amount: 1
            }
          }
        }
      }
    ]

    for (const otherParams of notContractCalls) {
      assert.equal(asMaybe(asTronContractCallOtherParams)(otherParams), null)
    }
  })

  it('does not shadow the staking actions', function () {
    assert.notEqual(
      asMaybe(asTronUnfreezeAction)({
        type: 'remove',
        params: { resource: 'ENERGY' }
      }),
      null
    )
    assert.notEqual(
      asMaybe(asTronFreezeV2Action)({
        type: 'addV2',
        params: { nativeAmount: '1', resource: 'ENERGY_V2' }
      }),
      null
    )
  })

  it('builds the transaction the provider described', function () {
    const clean = asMaybe(asTronContractCallOtherParams)({
      contractJson: rangoContractJson,
      feeLimit: rangoFeeLimit
    })
    if (clean == null) throw new Error('Expected a contract call')

    // Mirrors TronEngine.txBuilder, minus the engine's reference block.
    const transaction = txJsonToPb({
      raw_data: {
        contract: [clean.contractJson],
        ref_block_bytes: rangoRefBlockBytes,
        ref_block_hash: rangoRefBlockHash,
        expiration: rangoExpiration,
        timestamp: rangoTimestamp,
        data: undefined,
        fee_limit: clean.feeLimit
      }
    })

    assert.equal(
      base16
        .stringify(transaction.getRawData().serializeBinary())
        .toLowerCase(),
      rangoRawDataHex
    )
    assert.equal(txPbToTxID(transaction).replace('0x', ''), rangoTxId)
  })
})
