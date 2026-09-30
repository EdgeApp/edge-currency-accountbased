import { assert } from 'chai'
import { asObject, asString } from 'cleaners'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyPlugin,
  EdgeTransaction,
  JsonObject,
  makeFakeIo
} from 'edge-core-js'
import { recoverTypedSignature_v4 } from 'eth-sig-util'
import { before, describe, it } from 'mocha'

import { CurrencyEngine } from '../../src/common/CurrencyEngine'
import { EthereumTools } from '../../src/ethereum/EthereumTools'
import { ethereum } from '../../src/ethereum/info/ethereumInfo'
import { hyperevm } from '../../src/ethereum/info/hyperEvmInfo'
import {
  decimalToNative,
  HyperCoreEngine,
  nativeToDecimal
} from '../../src/hypercore/HyperCoreEngine'
import { hypercore } from '../../src/hypercore/hypercoreInfo'
import { HyperCoreTools } from '../../src/hypercore/HyperCoreTools'
import { HyperCoreLedgerUpdate } from '../../src/hypercore/hypercoreTypes'
import { expectRejection } from '../expectRejection'
import { fakeLog } from '../fake/fakeLog'

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const MNEMONIC_KEY =
  '1ab42cc412b618bdea3a599e3c9bae199ebf030895b039e9db1e30dafb12b727'
const MNEMONIC_ADDRESS = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'

const OTHER_ADDRESS = '0xe96d37d2dd7b70834d6a0e9c419f3028f0f5a7f3'

const HYPE = '0d01dc56dcaaca66ad901c959b4011ec'
const USDC = '6d1e7cde53ba9467b783cb7c530ce054'

const fakeIo = makeFakeIo()
const opts: EdgeCorePluginOptions = {
  infoPayload: {},
  initOptions: {},
  io: fakeIo,
  log: fakeLog,
  nativeIo: {},
  pluginDisklet: fakeIo.disklet
}
const plugin: EdgeCurrencyPlugin = hypercore(opts)

const asPublicKeys = asObject({ publicKey: asString })

/**
 * Mirrors the key renaming in edge-core-js `makeSplitWalletInfo`, which is
 * not exported: `<network>Key` becomes the new network's key and every other
 * key is copied as-is.
 */
function splitKeys(
  keys: JsonObject,
  fromType: string,
  toType: string
): JsonObject {
  const fromName = fromType.replace(/wallet:/, '').replace('-', '')
  const toName = toType.replace(/wallet:/, '').replace('-', '')
  const out: JsonObject = {}
  for (const key of Object.keys(keys)) {
    out[key === fromName + 'Key' ? toName + 'Key' : key] = keys[key]
  }
  return out
}

describe('HyperCore tools', function () {
  let tools: HyperCoreTools
  before(async function () {
    tools = (await plugin.makeCurrencyTools()) as HyperCoreTools
  })

  it('derives mnemonic keys on the Ethereum path', async function () {
    const keys = await tools.importPrivateKey(MNEMONIC)
    assert.deepEqual(keys, {
      hypercoreMnemonic: MNEMONIC,
      hypercoreKey: MNEMONIC_KEY
    })
    const { publicKey } = await tools.derivePublicKey({
      id: 'id',
      type: 'wallet:hypercore',
      keys
    })
    assert.equal(publicKey, MNEMONIC_ADDRESS)
  })

  it('imports a raw key with or without 0x', async function () {
    assert.deepEqual(await tools.importPrivateKey(`0x${MNEMONIC_KEY}`), {
      hypercoreKey: MNEMONIC_KEY
    })
    assert.deepEqual(await tools.importPrivateKey(MNEMONIC_KEY), {
      hypercoreKey: MNEMONIC_KEY
    })
    await expectRejection(tools.importPrivateKey('not a key'))
  })

  it('normalizes token ids', async function () {
    const tokenId = await tools.getTokenId({
      currencyCode: 'USDC',
      displayName: 'USDC',
      denominations: [{ name: 'USDC', multiplier: '100000000' }],
      networkLocation: { contractAddress: `0x${USDC.toUpperCase()}` }
    })
    assert.equal(tokenId, USDC)
    await expectRejection(
      tools.getTokenId({
        currencyCode: 'BAD',
        displayName: 'BAD',
        denominations: [{ name: 'BAD', multiplier: '1' }],
        networkLocation: { contractAddress: '0x1234' }
      })
    )
  })

  it('parses and encodes addresses', async function () {
    const parsed = await tools.parseUri(OTHER_ADDRESS)
    assert.equal(
      parsed.publicAddress,
      '0xE96D37D2DD7b70834d6A0E9C419f3028F0f5A7F3'
    )
    await expectRejection(tools.parseUri('0x1234'))
    assert.equal(
      await tools.encodeUri({ publicAddress: OTHER_ADDRESS }),
      OTHER_ADDRESS
    )
  })
})

describe('HyperCore wallet splitting', function () {
  it('offers HyperEVM and HyperCore as splits of each other only', async function () {
    const coreTools = (await plugin.makeCurrencyTools()) as HyperCoreTools
    const evmTools = (await hyperevm(opts).makeCurrencyTools()) as EthereumTools
    const ethTools = (await ethereum(opts).makeCurrencyTools()) as EthereumTools
    const walletInfo = { id: 'id', type: 'wallet:hypercore', keys: {} }

    assert.deepEqual(await coreTools.getSplittableTypes(walletInfo), [
      'wallet:hyperevm'
    ])
    const evmTypes = await evmTools.getSplittableTypes(walletInfo)
    assert.include(evmTypes, 'wallet:hypercore')
    assert.include(evmTypes, 'wallet:ethereum')
    const ethTypes = await ethTools.getSplittableTypes(walletInfo)
    assert.notInclude(ethTypes, 'wallet:hypercore')
  })

  it('keeps the address when splitting either way', async function () {
    const coreTools = (await plugin.makeCurrencyTools()) as HyperCoreTools
    const evmTools = (await hyperevm(opts).makeCurrencyTools()) as EthereumTools

    // HyperEVM to HyperCore, from a mnemonic wallet:
    const evmKeys = await evmTools.importPrivateKey(MNEMONIC)
    const toCore = await coreTools.derivePublicKey({
      id: 'id',
      type: 'wallet:hypercore',
      keys: splitKeys(evmKeys, 'wallet:hyperevm', 'wallet:hypercore')
    })
    assert.equal(toCore.publicKey, MNEMONIC_ADDRESS)

    // HyperCore to HyperEVM, from a mnemonic wallet and a raw key:
    for (const input of [MNEMONIC, MNEMONIC_KEY]) {
      const coreKeys = await coreTools.importPrivateKey(input)
      const toEvm = asPublicKeys(
        await evmTools.derivePublicKey({
          id: 'id',
          type: 'wallet:hyperevm',
          keys: splitKeys(coreKeys, 'wallet:hypercore', 'wallet:hyperevm')
        })
      )
      // EVM tools only checksum addresses derived from a mnemonic:
      assert.equal(
        toEvm.publicKey.toLowerCase(),
        MNEMONIC_ADDRESS.toLowerCase()
      )
    }
  })
})

describe('HyperCore amounts', function () {
  it('converts between API decimals and native units', function () {
    assert.equal(
      decimalToNative('16793.47860483', '100000000'),
      '1679347860483'
    )
    assert.equal(decimalToNative('1.0', '100000000'), '100000000')
    assert.equal(decimalToNative('0.0001', '100000000'), '10000')
    assert.equal(decimalToNative('0', '100000'), '0')
    assert.equal(nativeToDecimal('10000', '100000000'), '0.0001')
    assert.equal(nativeToDecimal('100000000', '100000000'), '1')
    assert.equal(nativeToDecimal('150000000', '100000000'), '1.5')
  })
})

/** Only the members the tested engine methods reach through `this`. */
const makeEngine = async (
  added: EdgeTransaction[],
  unresolvedNonces: { [nonce: string]: string } = {}
): Promise<HyperCoreEngine> => {
  const tools = (await plugin.makeCurrencyTools()) as HyperCoreTools
  const engine = {
    address: MNEMONIC_ADDRESS.toLowerCase(),
    allTokensMap: tools.builtinTokens,
    currencyInfo: plugin.currencyInfo,
    networkInfo: tools.networkInfo,
    otherData: { ledgerCursor: 0, unresolvedNonces },
    walletId: 'wallet',
    walletInfo: { keys: { publicKey: MNEMONIC_ADDRESS } },
    addTransaction: (_tokenId: unknown, tx: EdgeTransaction) => added.push(tx),
    checkNonceMapping: (HyperCoreEngine.prototype as any).checkNonceMapping,
    getCurrencyCode: (tokenId: string | null) =>
      tokenId == null
        ? plugin.currencyInfo.currencyCode
        : tools.builtinTokens[tokenId]?.currencyCode,
    getMultiplier: (HyperCoreEngine.prototype as any).getMultiplier,
    parseDelta: HyperCoreEngine.prototype.parseDelta,
    sendTransactionEvents: () => {},
    transactionEvents: [],
    warn: () => {}
  }
  return engine as unknown as HyperCoreEngine
}

const tokenIdsByName = new Map<string, string | null>([
  ['HYPE', null],
  ['USDC', USDC]
])

const update = (delta: object): HyperCoreLedgerUpdate => ({
  time: 1790637521000,
  hash: '0xabc123',
  delta
})

describe('HyperCore ledger history', function () {
  it('splits an activation fee paid in another token', async function () {
    const added: EdgeTransaction[] = []
    const engine = await makeEngine(added)
    HyperCoreEngine.prototype.processLedgerUpdate.call(
      engine,
      update({
        type: 'send',
        user: MNEMONIC_ADDRESS.toLowerCase(),
        destination: OTHER_ADDRESS,
        sourceDex: 'spot',
        destinationDex: 'spot',
        token: 'HYPE',
        amount: '0.0001',
        fee: '1.0',
        nativeTokenFee: '0.0',
        nonce: 1790637520677,
        feeToken: 'USDC'
      }),
      tokenIdsByName
    )

    assert.equal(added.length, 2)
    const [hype, usdc] = added
    assert.equal(hype.tokenId, null)
    assert.equal(hype.nativeAmount, '-10000')
    assert.equal(hype.networkFee, '0')
    assert.deepEqual(hype.networkFees, [
      { tokenId: USDC, nativeAmount: '100000000' }
    ])
    assert.equal(usdc.tokenId, USDC)
    assert.equal(usdc.nativeAmount, '-100000000')
    assert.equal(usdc.networkFee, '100000000')
    assert.equal(hype.txid, '0xabc123')
    assert.equal(usdc.txid, '0xabc123')
  })

  it('folds a fee in the sent token into the amount', async function () {
    const added: EdgeTransaction[] = []
    HyperCoreEngine.prototype.processLedgerUpdate.call(
      await makeEngine(added),
      update({
        type: 'spotTransfer',
        user: MNEMONIC_ADDRESS.toLowerCase(),
        destination: OTHER_ADDRESS,
        token: 'USDC',
        amount: '5.0',
        fee: '1.0',
        nativeTokenFee: '0.0',
        feeToken: 'USDC',
        nonce: 1
      }),
      tokenIdsByName
    )
    assert.equal(added.length, 1)
    assert.equal(added[0].nativeAmount, '-600000000')
    assert.equal(added[0].networkFee, '100000000')
  })

  it('records receives without fees', async function () {
    const added: EdgeTransaction[] = []
    HyperCoreEngine.prototype.processLedgerUpdate.call(
      await makeEngine(added),
      update({
        type: 'spotTransfer',
        user: OTHER_ADDRESS,
        destination: MNEMONIC_ADDRESS.toLowerCase(),
        token: 'HYPE',
        amount: '2.5',
        fee: '1.0',
        nativeTokenFee: '0.0',
        feeToken: 'USDC'
      }),
      tokenIdsByName
    )
    assert.equal(added.length, 1)
    assert.equal(added[0].nativeAmount, '250000000')
    assert.equal(added[0].isSend, false)
    assert.deepEqual(added[0].networkFees, [])
  })

  it('skips transfers that never touch the spot balance', async function () {
    const added: EdgeTransaction[] = []
    const engine = await makeEngine(added)
    // Incoming to our perp balance:
    HyperCoreEngine.prototype.processLedgerUpdate.call(
      engine,
      update({
        type: 'send',
        user: OTHER_ADDRESS,
        destination: MNEMONIC_ADDRESS.toLowerCase(),
        sourceDex: 'spot',
        destinationDex: '',
        token: 'USDC',
        amount: '8.8',
        fee: '0.0',
        nativeTokenFee: '0.0',
        nonce: 3633293,
        feeToken: ''
      }),
      tokenIdsByName
    )
    // Perp activity this wallet does not model:
    HyperCoreEngine.prototype.processLedgerUpdate.call(
      engine,
      update({ type: 'deposit', usdc: '10.0' }),
      tokenIdsByName
    )
    assert.equal(added.length, 0)
  })

  it('treats staking and perp moves as spot sends and receives', async function () {
    const added: EdgeTransaction[] = []
    const engine = await makeEngine(added)
    HyperCoreEngine.prototype.processLedgerUpdate.call(
      engine,
      update({
        type: 'cStakingTransfer',
        token: 'HYPE',
        amount: '50.0',
        isDeposit: true
      }),
      tokenIdsByName
    )
    HyperCoreEngine.prototype.processLedgerUpdate.call(
      engine,
      update({ type: 'accountClassTransfer', usdc: '3.0', toPerp: false }),
      tokenIdsByName
    )
    assert.equal(added[0].nativeAmount, '-5000000000')
    assert.equal(added[1].tokenId, USDC)
    assert.equal(added[1].nativeAmount, '300000000')
  })

  it('gives staking transfers with a zero hash their own txids', async function () {
    const added: EdgeTransaction[] = []
    const engine = await makeEngine(added)
    for (const time of [1757954062072, 1757954118077]) {
      HyperCoreEngine.prototype.processLedgerUpdate.call(
        engine,
        {
          time,
          hash: `0x${'0'.repeat(64)}`,
          delta: {
            type: 'cStakingTransfer',
            token: 'HYPE',
            amount: '1.0',
            isDeposit: false
          }
        },
        tokenIdsByName
      )
    }
    assert.deepEqual(
      added.map(tx => tx.txid),
      ['hypercore-ledger-1757954062072', 'hypercore-ledger-1757954118077']
    )
  })

  it('reads the ledger again when a new token is added', async function () {
    const tools = (await plugin.makeCurrencyTools()) as HyperCoreTools
    const engine: any = await makeEngine([])
    engine.builtinTokens = tools.builtinTokens
    engine.changeCustomTokensSync = (
      CurrencyEngine.prototype as any
    ).changeCustomTokensSync
    engine.queryTxMutex = async (callback: () => Promise<void>) =>
      await callback()
    engine.otherData.ledgerCursor = 1790637521000

    await HyperCoreEngine.prototype.changeCustomTokens.call(engine, {})
    assert.equal(engine.otherData.ledgerCursor, 1790637521000)

    await HyperCoreEngine.prototype.changeCustomTokens.call(engine, {
      '11111111111111111111111111111111': {
        currencyCode: 'CUSTOM',
        denominations: [{ multiplier: '100000', name: 'CUSTOM' }],
        displayName: 'Custom',
        networkLocation: {
          contractAddress: '0x11111111111111111111111111111111'
        }
      }
    })
    assert.equal(engine.otherData.ledgerCursor, 0)
  })

  it('keeps the stand-in txid of an unresolved broadcast', async function () {
    const added: EdgeTransaction[] = []
    HyperCoreEngine.prototype.processLedgerUpdate.call(
      await makeEngine(added, { '42': 'hypercore-nonce-42' }),
      update({
        type: 'spotTransfer',
        user: MNEMONIC_ADDRESS.toLowerCase(),
        destination: OTHER_ADDRESS,
        token: 'HYPE',
        amount: '1.0',
        nonce: 42
      }),
      tokenIdsByName
    )
    assert.equal(added[0].txid, 'hypercore-nonce-42')
  })

  it('reuses the stand-in txid of a relayed swap', async function () {
    const added: EdgeTransaction[] = []
    const engine = await makeEngine(added)
    await HyperCoreEngine.prototype.saveTx.call(engine, {
      ...added[0],
      txid: 'hypercore-nonce-77'
    } as unknown as EdgeTransaction)
    HyperCoreEngine.prototype.processLedgerUpdate.call(
      engine,
      update({
        type: 'send',
        user: MNEMONIC_ADDRESS.toLowerCase(),
        destination: OTHER_ADDRESS,
        sourceDex: 'spot',
        destinationDex: '',
        token: 'USDC',
        amount: '15.0',
        usdcValue: '15.0',
        fee: '0.0',
        nativeTokenFee: '0.0',
        nonce: 77,
        feeToken: 'USDC'
      }),
      tokenIdsByName
    )
    assert.equal(added[1].txid, 'hypercore-nonce-77')
  })
})

describe('HyperCore signing', function () {
  it('signs a spotSend that recovers to the wallet address', async function () {
    const engine = await makeEngine([])
    const edgeTx: EdgeTransaction = {
      blockHeight: 0,
      currencyCode: 'HYPE',
      date: 0,
      isSend: true,
      memos: [],
      nativeAmount: '-10000',
      networkFee: '0',
      networkFees: [],
      otherParams: {
        destination: OTHER_ADDRESS,
        token: `HYPE:0x${HYPE}`,
        amount: '0.0001'
      },
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId: null,
      txid: '',
      walletId: 'wallet'
    }

    await HyperCoreEngine.prototype.signTx.call(engine, edgeTx, {
      hypercoreKey: MNEMONIC_KEY
    })
    const { action, nonce, signature } = JSON.parse(edgeTx.signedTx)
    assert.equal(action.type, 'spotSend')
    assert.equal(action.signatureChainId, '0xa4b1')
    assert.equal(nonce, action.time)

    const recovered = recoverTypedSignature_v4({
      data: {
        domain: {
          name: 'HyperliquidSignTransaction',
          version: '1',
          chainId: 42161,
          verifyingContract: '0x0000000000000000000000000000000000000000'
        },
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' }
          ],
          'HyperliquidTransaction:SpotSend': [
            { name: 'hyperliquidChain', type: 'string' },
            { name: 'destination', type: 'string' },
            { name: 'token', type: 'string' },
            { name: 'amount', type: 'string' },
            { name: 'time', type: 'uint64' }
          ]
        },
        primaryType: 'HyperliquidTransaction:SpotSend',
        message: {
          hyperliquidChain: 'Mainnet',
          destination: OTHER_ADDRESS,
          token: `HYPE:0x${HYPE}`,
          amount: '0.0001',
          time: action.time
        }
      },
      sig: `${signature.r}${signature.s.slice(2)}${signature.v.toString(16)}`
    })
    assert.equal(recovered, MNEMONIC_ADDRESS.toLowerCase())
  })

  it('signs a sendAsset when the spend names a destination dex', async function () {
    const engine = await makeEngine([])
    const edgeTx: EdgeTransaction = {
      blockHeight: 0,
      currencyCode: 'USDC',
      date: 0,
      isSend: true,
      memos: [],
      nativeAmount: '-500000000',
      networkFee: '0',
      networkFees: [],
      otherParams: {
        destination: OTHER_ADDRESS,
        token: `USDC:0x${USDC}`,
        amount: '5',
        destinationDex: ''
      },
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId: USDC,
      txid: '',
      walletId: 'wallet'
    }

    await HyperCoreEngine.prototype.signTx.call(engine, edgeTx, {
      hypercoreKey: MNEMONIC_KEY
    })
    const { action, nonce, signature } = JSON.parse(edgeTx.signedTx)
    assert.deepEqual(action, {
      type: 'sendAsset',
      hyperliquidChain: 'Mainnet',
      signatureChainId: '0xa4b1',
      destination: OTHER_ADDRESS,
      sourceDex: 'spot',
      destinationDex: '',
      token: `USDC:0x${USDC}`,
      amount: '5',
      fromSubAccount: '',
      nonce
    })

    const recovered = recoverTypedSignature_v4({
      data: {
        domain: {
          name: 'HyperliquidSignTransaction',
          version: '1',
          chainId: 42161,
          verifyingContract: '0x0000000000000000000000000000000000000000'
        },
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' }
          ],
          'HyperliquidTransaction:SendAsset': [
            { name: 'hyperliquidChain', type: 'string' },
            { name: 'destination', type: 'string' },
            { name: 'sourceDex', type: 'string' },
            { name: 'destinationDex', type: 'string' },
            { name: 'token', type: 'string' },
            { name: 'amount', type: 'string' },
            { name: 'fromSubAccount', type: 'string' },
            { name: 'nonce', type: 'uint64' }
          ]
        },
        primaryType: 'HyperliquidTransaction:SendAsset',
        message: {
          hyperliquidChain: 'Mainnet',
          destination: OTHER_ADDRESS,
          sourceDex: 'spot',
          destinationDex: '',
          token: `USDC:0x${USDC}`,
          amount: '5',
          fromSubAccount: '',
          nonce
        }
      },
      sig: `${signature.r}${signature.s.slice(2)}${signature.v.toString(16)}`
    })
    assert.equal(recovered, MNEMONIC_ADDRESS.toLowerCase())
  })

  it('signs typed data that recovers to the wallet address', async function () {
    const engine = await makeEngine([])
    const typedData = {
      domain: {
        name: 'RelayNonceMapping',
        version: '2',
        chainId: 1,
        verifyingContract: '0x0000000000000000000000000000000000000000'
      },
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' }
        ],
        NonceMapping: [
          { name: 'chainId', type: 'string' },
          { name: 'wallet', type: 'address' },
          { name: 'depositor', type: 'address' },
          { name: 'id', type: 'bytes32' },
          { name: 'nonce', type: 'uint256' }
        ]
      },
      primaryType: 'NonceMapping' as const,
      message: {
        chainId: 'hyperliquid',
        wallet: MNEMONIC_ADDRESS,
        depositor: MNEMONIC_ADDRESS,
        id: `0x${'11'.repeat(32)}`,
        nonce: 1790745002682
      }
    }

    const sig = await HyperCoreEngine.prototype.signMessage.call(
      engine,
      JSON.stringify(typedData),
      { hypercoreKey: MNEMONIC_KEY },
      { otherParams: { typedData: true } }
    )
    assert.equal(
      recoverTypedSignature_v4({ data: typedData, sig }),
      MNEMONIC_ADDRESS.toLowerCase()
    )

    const signMapping = async (
      domain: object,
      message: object,
      types: object = typedData.types
    ): Promise<string> =>
      await HyperCoreEngine.prototype.signMessage.call(
        engine,
        JSON.stringify({
          ...typedData,
          types,
          domain: { ...typedData.domain, ...domain },
          message: { ...typedData.message, ...message }
        }),
        { hypercoreKey: MNEMONIC_KEY },
        { otherParams: { typedData: true } }
      )
    await signMapping({}, { wallet: MNEMONIC_ADDRESS.toLowerCase() })
    await expectRejection(
      signMapping({}, { wallet: OTHER_ADDRESS }),
      'Error: HyperCoreEngine: nonce mapping is for another wallet'
    )
    await expectRejection(
      signMapping({}, { depositor: OTHER_ADDRESS }),
      'Error: HyperCoreEngine: nonce mapping is for another wallet'
    )
    await expectRejection(
      signMapping({ name: 'OtherNonceMapping' }, {}),
      'Error: HyperCoreEngine: nonce mapping is for another network'
    )
    await expectRejection(
      signMapping({ chainId: 42161 }, {}),
      'Error: HyperCoreEngine: nonce mapping is for another network'
    )
    await expectRejection(
      signMapping({}, { chainId: 'ethereum' }),
      'Error: HyperCoreEngine: nonce mapping is for another network'
    )
    // A signed struct without the wallet field binds the nonce to no one:
    await expectRejection(
      signMapping(
        {},
        {},
        {
          ...typedData.types,
          NonceMapping: typedData.types.NonceMapping.filter(
            field => field.name !== 'wallet'
          )
        }
      ),
      'Error: HyperCoreEngine: unexpected NonceMapping types'
    )
    await expectRejection(
      signMapping({}, {}, { ...typedData.types, Extra: [] }),
      'Error: HyperCoreEngine: unexpected NonceMapping types'
    )

    await expectRejection(
      HyperCoreEngine.prototype.signMessage.call(
        engine,
        JSON.stringify({
          ...typedData,
          primaryType: 'HyperliquidTransaction:ApproveAgent'
        }),
        { hypercoreKey: MNEMONIC_KEY },
        { otherParams: { typedData: true } }
      ),
      'Error: HyperCoreEngine: signMessage() does not sign HyperliquidTransaction:ApproveAgent'
    )
    await expectRejection(
      HyperCoreEngine.prototype.signMessage.call(
        engine,
        JSON.stringify({ ...typedData, primaryType: 'constructor', types: {} }),
        { hypercoreKey: MNEMONIC_KEY },
        { otherParams: { typedData: true } }
      ),
      'Error: HyperCoreEngine: signMessage() does not sign constructor'
    )
    await expectRejection(
      HyperCoreEngine.prototype.signMessage.call(
        engine,
        '0x1234',
        { hypercoreKey: MNEMONIC_KEY },
        {}
      ),
      'Error: HyperCoreEngine: signMessage() only signs typed data'
    )
  })

  it('signs a swap provider sendAsset only within our limits', async function () {
    const engine: any = await makeEngine([])
    const tools = (await plugin.makeCurrencyTools()) as HyperCoreTools
    engine.checkSendAsset = (HyperCoreEngine.prototype as any).checkSendAsset
    engine.getLocations = async () =>
      new Map([
        [null, tools.networkInfo.nativeToken],
        [USDC, { name: 'USDC', contractAddress: `0x${USDC}`, index: 0 }]
      ])
    engine.getSpendable = (tokenId: string | null) =>
      tokenId === USDC ? '500000000' : '0'

    // Shaped like the relay deposit in a live LI.FI HyperCore quote:
    const typedData = {
      domain: {
        name: 'HyperliquidSignTransaction',
        version: '1',
        chainId: 42161,
        verifyingContract: '0x0000000000000000000000000000000000000000'
      },
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' }
        ],
        'HyperliquidTransaction:SendAsset': [
          { name: 'hyperliquidChain', type: 'string' },
          { name: 'destination', type: 'string' },
          { name: 'sourceDex', type: 'string' },
          { name: 'destinationDex', type: 'string' },
          { name: 'token', type: 'string' },
          { name: 'amount', type: 'string' },
          { name: 'fromSubAccount', type: 'string' },
          { name: 'nonce', type: 'uint64' }
        ]
      },
      primaryType: 'HyperliquidTransaction:SendAsset' as const,
      message: {
        type: 'sendAsset',
        hyperliquidChain: 'Mainnet',
        signatureChainId: '0xa4b1',
        destination: OTHER_ADDRESS,
        sourceDex: 'spot',
        destinationDex: '',
        token: `USDC:0x${USDC}`,
        amount: '3',
        fromSubAccount: '',
        nonce: 1790768607173
      }
    }
    const sign = async (domain: object, message: object): Promise<string> =>
      await HyperCoreEngine.prototype.signMessage.call(
        engine,
        JSON.stringify({
          ...typedData,
          domain: { ...typedData.domain, ...domain },
          message: { ...typedData.message, ...message }
        }),
        { hypercoreKey: MNEMONIC_KEY },
        { otherParams: { typedData: true } }
      )

    const sig = await sign({}, {})
    assert.equal(
      recoverTypedSignature_v4({ data: typedData, sig }),
      MNEMONIC_ADDRESS.toLowerCase()
    )
    await sign({}, { amount: '5' })

    await expectRejection(
      sign({ chainId: 1 }, {}),
      'Error: HyperCoreEngine: sendAsset is for another network'
    )
    await expectRejection(
      sign({}, { hyperliquidChain: 'Testnet' }),
      'Error: HyperCoreEngine: sendAsset is for another network'
    )
    await expectRejection(
      HyperCoreEngine.prototype.signMessage.call(
        engine,
        JSON.stringify({
          ...typedData,
          types: {
            ...typedData.types,
            'HyperliquidTransaction:SendAsset': typedData.types[
              'HyperliquidTransaction:SendAsset'
            ].filter(field => field.name !== 'destination')
          }
        }),
        { hypercoreKey: MNEMONIC_KEY },
        { otherParams: { typedData: true } }
      ),
      'Error: HyperCoreEngine: unexpected HyperliquidTransaction:SendAsset types'
    )
    await expectRejection(
      sign({}, { fromSubAccount: OTHER_ADDRESS }),
      'Error: HyperCoreEngine: sendAsset must spend our spot balance'
    )
    await expectRejection(
      sign({}, { sourceDex: '' }),
      'Error: HyperCoreEngine: sendAsset must spend our spot balance'
    )
    await expectRejection(
      sign({}, { sourceDex: 'xyz' }),
      'Error: HyperCoreEngine: sendAsset must spend our spot balance'
    )
    await expectRejection(
      sign({}, { destination: 'nope' }),
      'Error: InvalidPublicAddressError'
    )
    const errorName = async (promise: Promise<unknown>): Promise<string> =>
      await promise.then(
        () => 'resolved',
        (error: Error) => error.name
      )
    assert.equal(
      await errorName(sign({}, { destination: MNEMONIC_ADDRESS })),
      'SpendToSelfError'
    )
    assert.equal(
      await errorName(sign({}, { amount: '5.00000001' })),
      'InsufficientFundsError'
    )
    await sign({}, { amount: '4.500000000' })
    await expectRejection(
      sign({}, { amount: '-5' }),
      'Error: HyperCoreEngine: invalid sendAsset amount -5'
    )
    await expectRejection(
      sign({}, { amount: '4.000000001' }),
      'Error: HyperCoreEngine: invalid sendAsset amount 4.000000001'
    )
    await expectRejection(
      sign({}, { token: 'PURR:0xc1fb593aeffbeb02f85e0308e9956a90' }),
      'Error: HyperCoreEngine: unknown sendAsset token PURR:0xc1fb593aeffbeb02f85e0308e9956a90'
    )
  })
})

describe('HyperCore spendable balance', function () {
  it('spends nothing until a live read reports holds', async function () {
    const engine: any = await makeEngine([])
    engine.spotBalances = new Map()
    engine.getBalance = () => '500000000'
    const getSpendable = (tokenId: string | null): string =>
      (HyperCoreEngine.prototype as any).getSpendable.call(engine, tokenId)

    assert.equal(getSpendable(USDC), '0')

    engine.spotBalances.set(USDC, { total: '500000000', hold: '200000000' })
    assert.equal(getSpendable(USDC), '300000000')

    engine.spotBalances.set(USDC, { total: '100000000', hold: '200000000' })
    assert.equal(getSpendable(USDC), '0')
  })
})

describe('HyperCore balances', function () {
  it('reports the balance of a detected token before announcing it', async function () {
    const engine: any = await makeEngine([])
    const events: string[] = []
    engine.enabledTokenIds = []
    engine.spotBalances = new Map()
    engine.getLocations = async () =>
      new Map([
        [null, { contractAddress: HYPE, name: 'HYPE', index: 150 }],
        [USDC, { contractAddress: USDC, name: 'USDC', index: 0 }]
      ])
    engine.fetchApiBalances = async () =>
      new Map([
        [null, { total: '1000', hold: '0' }],
        [USDC, { total: '2500000', hold: '0' }]
      ])
    engine.updateBalance = (tokenId: string | null, balance: string) =>
      events.push(`balance ${String(tokenId)} ${balance}`)
    engine.currencyEngineCallbacks = {
      onNewTokens: (tokenIds: string[]) => events.push(`new ${tokenIds.join()}`)
    }
    engine.syncTracker = { setBalanceRatios: () => {} }
    engine.log = fakeLog

    await HyperCoreEngine.prototype.queryBalance.call(engine)
    assert.deepEqual(events, [
      'balance null 1000',
      `balance ${USDC} 2500000`,
      `new ${USDC}`
    ])
  })
})
