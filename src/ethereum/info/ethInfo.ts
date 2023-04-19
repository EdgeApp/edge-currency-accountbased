import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { EthereumTools } from '../ethPlugin'
import type { EthereumFees, EthereumNetworkInfo } from '../ethTypes'

const builtinTokens: EdgeTokenMap = {
  '111111111117dc0aa78b770fa6a738034120c302': {
    currencyCode: '1INCH',
    displayName: '1inch',
    denominations: [{ name: '1INCH', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x111111111117dc0aa78b770fa6a738034120c302'
    }
  },
  '7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': {
    currencyCode: 'AAVE',
    displayName: 'Aave',
    denominations: [{ name: 'AAVE', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'
    }
  },
  '05ec93c0365baaeabf7aeffb0972ea7ecdd39cf1': {
    currencyCode: 'ABAT',
    displayName: 'Aave Interest Bearing BAT',
    denominations: [{ name: 'ABAT', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x05ec93c0365baaeabf7aeffb0972ea7ecdd39cf1'
    }
  },
  '028171bca77440897b824ca71d1c56cac55b68a3': {
    currencyCode: 'ADAI',
    displayName: 'Aave Interest Bearing Dai',
    denominations: [{ name: 'ADAI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x028171bCA77440897B824Ca71D1c56caC55b68A3'
    }
  },
  '39c6b3e42d6a679d7d776778fe880bc9487c2eda': {
    currencyCode: 'AKNC',
    displayName: 'Aave Interest Bearing KNC',
    denominations: [{ name: 'AKNC', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x39c6b3e42d6a679d7d776778fe880bc9487c2eda'
    }
  },
  a06bc25b5805d5f8d82847d191cb4af5a3e873e0: {
    currencyCode: 'ALINK',
    displayName: 'Aave Interest Bearing LINK',
    denominations: [{ name: 'ALINK', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xa06bc25b5805d5f8d82847d191cb4af5a3e873e0'
    }
  },
  a685a61171bb30d4072b338c80cb7b2c865c873e: {
    currencyCode: 'AMANA',
    displayName: 'Aave Interest Bearing MANA',
    denominations: [{ name: 'AMANA', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xa685a61171bb30d4072b338c80cb7b2c865c873e'
    }
  },
  c713e5e149d5d0715dcd1c156a020976e7e56b88: {
    currencyCode: 'AMKR',
    displayName: 'Aave Interest Bearing MKR',
    denominations: [{ name: 'AMKR', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xc713e5e149d5d0715dcd1c156a020976e7e56b88'
    }
  },
  d46ba6d942050d489dbd938a2c909a5d5039a161: {
    currencyCode: 'AMPL',
    displayName: 'Ampleforth',
    denominations: [{ name: 'AMPL', multiplier: '1000000000' }],
    networkLocation: {
      contractAddress: '0xd46ba6d942050d489dbd938a2c909a5d5039a161'
    }
  },
  a117000000f279d81a1d3cc75430faa017fa5a2e: {
    currencyCode: 'ANT',
    displayName: 'Aragon',
    denominations: [{ name: 'ANT', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xa117000000f279D81A1D3cc75430fAA017FA5A2e'
    }
  },
  '960b236a07cf122663c4303350609a66a7b288c0': {
    currencyCode: 'ANTV1',
    displayName: 'Aragon',
    denominations: [{ name: 'ANTV1', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x960b236A07cf122663c4303350609A66A7B288C0'
    }
  },
  cc12abe4ff81c9378d670de1b57f8e0dd228d77a: {
    currencyCode: 'AREN',
    displayName: 'Aave Interest Bearing REN',
    denominations: [{ name: 'AREN', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xcc12abe4ff81c9378d670de1b57f8e0dd228d77a'
    }
  },
  '35f6b052c598d933d69a4eec4d04c73a191fe6c2': {
    currencyCode: 'ASNX',
    displayName: 'Aave Interest Bearing SNX',
    denominations: [{ name: 'ASNX', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x35f6b052c598d933d69a4eec4d04c73a191fe6c2'
    }
  },
  '6c5024cd4f8a59110119c56f8933403a539555eb': {
    currencyCode: 'ASUSD',
    displayName: 'Aave Interest Bearing SUSD',
    denominations: [{ name: 'ASUSD', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x6c5024cd4f8a59110119c56f8933403a539555eb'
    }
  },
  b9d7cb55f463405cdfbe4e90a6d2df01c2b92bf1: {
    currencyCode: 'AUNI',
    displayName: 'Aave Interest Bearing UNI',
    denominations: [{ name: 'AUNI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xb9d7cb55f463405cdfbe4e90a6d2df01c2b92bf1'
    }
  },
  bcca60bb61934080951369a648fb03df4f96263c: {
    currencyCode: 'AUSDC',
    displayName: 'Aave Interest Bearing USDC',
    denominations: [{ name: 'AUSDC', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0xbcca60bb61934080951369a648fb03df4f96263c'
    }
  },
  '3ed3b47dd13ec9a98b44e6204a523e766b225811': {
    currencyCode: 'AUSDT',
    displayName: 'Aave Interest Bearing USDT',
    denominations: [{ name: 'AUSDT', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x3ed3b47dd13ec9a98b44e6204a523e766b225811'
    }
  },
  '9ff58f4ffb29fa2266ab25e75e2a8b3503311656': {
    currencyCode: 'AWBTC',
    displayName: 'Aave Interest Bearing Wrapped BTC',
    denominations: [{ name: 'AWBTC', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x9ff58f4ffb29fa2266ab25e75e2a8b3503311656'
    }
  },
  '030ba81f1c18d280636f32af80b9aad02cf0854e': {
    currencyCode: 'AWETH',
    displayName: 'Aave Interest Bearing Wrapped ETH',
    denominations: [{ name: 'AWETH', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x030ba81f1c18d280636f32af80b9aad02cf0854e'
    }
  },
  '5165d24277cd063f5ac44efd447b27025e888f37': {
    currencyCode: 'AYFI',
    displayName: 'Aave Interest Bearing YFI',
    denominations: [{ name: 'AYFI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x5165d24277cd063f5ac44efd447b27025e888f37'
    }
  },
  df7ff54aacacbff42dfe29dd6144a69b629f8c9e: {
    currencyCode: 'AZRX',
    displayName: 'Aave Interest Bearing ZRX',
    denominations: [{ name: 'AZRX', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xdf7ff54aacacbff42dfe29dd6144a69b629f8c9e'
    }
  },
  '3472a5a71965499acd81997a54bba8d852c6e53d': {
    currencyCode: 'BADGER',
    displayName: 'Badger',
    denominations: [{ name: 'BADGER', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x3472A5A71965499acd81997a54BBA8D852C6E53d'
    }
  },
  ba100000625a3754423978a60c9317c58a424e3d: {
    currencyCode: 'BAL',
    displayName: 'Balancer',
    denominations: [{ name: 'BAL', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xba100000625a3754423978a60c9317c58a424e3d'
    }
  },
  ba11d00c5f74255f56a5e366f4f77f5a186d7f55: {
    currencyCode: 'BAND',
    displayName: 'BAND',
    denominations: [{ name: 'BAND', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xba11d00c5f74255f56a5e366f4f77f5a186d7f55'
    }
  },
  '0d8775f648430679a709e98d2b0cb6250d2887ef': {
    currencyCode: 'BAT',
    displayName: 'Basic Attention Token',
    denominations: [{ name: 'BAT', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x0D8775F648430679A709E98d2b0Cb6250d2887EF'
    }
  },
  b8c77482e45f1f44de1745f52c74426c631bdd52: {
    currencyCode: 'BNB',
    displayName: 'Binance',
    denominations: [{ name: 'BNB', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52'
    }
  },
  '1f573d6fb3f13d689ff844b4ce37794d79a7ff1c': {
    currencyCode: 'BNT',
    displayName: 'Bancor',
    denominations: [{ name: 'BNT', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C'
    }
  },
  '420412e765bfa6d85aaac94b4f7b708c89be2e2b': {
    currencyCode: 'BRZ',
    displayName: 'BRZ Token',
    denominations: [{ name: 'BRZ', multiplier: '10000' }],
    networkLocation: {
      contractAddress: '0x420412E765BFa6d85aaaC94b4f7b708C89be2e2B'
    }
  },
  '6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e': {
    currencyCode: 'CBAT',
    displayName: 'Compound BAT',
    denominations: [{ name: 'CBAT', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e'
    }
  },
  '5d3a536e4d6dbd6114cc1ead35777bab948e3643': {
    currencyCode: 'CDAI',
    displayName: 'Compound DAI',
    denominations: [{ name: 'CDAI', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643'
    }
  },
  '4ddc2d193948926d02f9b1fe9e1daa0718270ed5': {
    currencyCode: 'CETH',
    displayName: 'Compound ETH',
    denominations: [{ name: 'CETH', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5'
    }
  },
  ffffffff2ba8f66d4e51811c5190992176930278: {
    currencyCode: 'COMBO',
    displayName: 'COMBO',
    denominations: [{ name: 'COMBO', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xffffffff2ba8f66d4e51811c5190992176930278'
    }
  },
  c00e94cb662c3520282e6f5717214004a7f26888: {
    currencyCode: 'COMP',
    displayName: 'Compound',
    denominations: [{ name: 'COMP', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xc00e94cb662c3520282e6f5717214004a7f26888'
    }
  },
  '2ba592f78db6436527729929aaf6c908497cb200': {
    currencyCode: 'CREAM',
    displayName: 'Cream',
    denominations: [{ name: 'CREAM', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x2ba592F78dB6436527729929AAf6c908497cB200'
    }
  },
  '158079ee67fce2f58472a96584a73c7ab9ac95c1': {
    currencyCode: 'CREP',
    displayName: 'Compound Augur',
    denominations: [{ name: 'CREP', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x158079ee67fce2f58472a96584a73c7ab9ac95c1'
    }
  },
  d533a949740bb3306d119cc777fa900ba034cd52: {
    currencyCode: 'CRV',
    displayName: 'Curve DAO Token',
    denominations: [{ name: 'CRV', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xD533a949740bb3306d119CC777fa900bA034cd52'
    }
  },
  f5dce57282a584d2746faf1593d3121fcac444dc: {
    currencyCode: 'CSAI',
    displayName: 'Compound SAI',
    denominations: [{ name: 'CSAI', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0xf5dce57282a584d2746faf1593d3121fcac444dc'
    }
  },
  '39aa39c021dfbae8fac545936693ac917d5e7563': {
    currencyCode: 'CUSDC',
    displayName: 'Compound USDC',
    denominations: [{ name: 'CUSDC', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x39aa39c021dfbae8fac545936693ac917d5e7563'
    }
  },
  '38e4adb44ef08f22f5b5b76a8f0c2d0dcbe7dca1': {
    currencyCode: 'CVP',
    displayName: 'Concentrated Voting Power',
    denominations: [{ name: 'CVP', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x38e4adb44ef08f22f5b5b76a8f0c2d0dcbe7dca1'
    }
  },
  c11b1268c1a384e55c48c2391d8d480264a3a7f4: {
    currencyCode: 'CWBTC',
    displayName: 'Compound WBTC',
    denominations: [{ name: 'CWBTC', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0xc11b1268c1a384e55c48c2391d8d480264a3a7f4'
    }
  },
  b3319f5d18bc0d84dd1b4825dcde5d5f7266d407: {
    currencyCode: 'CZRX',
    displayName: 'Compound ZRX',
    denominations: [{ name: 'CZRX', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407'
    }
  },
  '6b175474e89094c44da98b954eedeac495271d0f': {
    currencyCode: 'DAI',
    displayName: 'Dai Stablecoin',
    denominations: [{ name: 'DAI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    }
  },
  ad32a8e6220741182940c5abf610bde99e737b2d: {
    currencyCode: 'DOUGH',
    displayName: 'PieDAO',
    denominations: [{ name: 'DOUGH', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xad32a8e6220741182940c5abf610bde99e737b2d'
    }
  },
  '1494ca1f11d487c2bbe4543e90080aeba4ba3c2b': {
    currencyCode: 'DPI',
    displayName: 'DefiPulse Index',
    denominations: [{ name: 'DPI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x1494ca1f11d487c2bbe4543e90080aeba4ba3c2b'
    }
  },
  b1cd6e4153b2a390cf00a6556b0fc1458c4a5533: {
    currencyCode: 'ETHBNT',
    displayName: 'BNT Smart Token Relay',
    denominations: [{ name: 'ETHBNT', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xb1CD6e4153B2a390Cf00A6556b0fC1458C4A5533'
    }
  },
  '4e15361fd6b4bb609fa63c81a2be19d873717870': {
    currencyCode: 'FTM',
    displayName: 'Fantom',
    denominations: [{ name: 'FTM', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x4e15361fd6b4bb609fa63c81a2be19d873717870'
    }
  },
  '419d0d8bdd9af5e606ae2232ed285aff190e711b': {
    currencyCode: 'FUN',
    displayName: 'FunFair',
    denominations: [{ name: 'FUN', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x419D0d8BdD9aF5e606Ae2232ed285Aff190E711b'
    }
  },
  '7dd9c5cba05e151c895fde1cf355c9a1d5da6429': {
    currencyCode: 'GLM',
    displayName: 'Golem',
    denominations: [{ name: 'GLM', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x7DD9c5Cba05E151C895FDe1CF355C9A1D5DA6429'
    }
  },
  '6810e776880c02933d47db1b9fc05908e5386b96': {
    currencyCode: 'GNO',
    displayName: 'Gnosis',
    denominations: [{ name: 'GNO', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x6810e776880C02933D47DB1b9fc05908e5386b96'
    }
  },
  a74476443119a942de498590fe1f2454d7d4ac0d: {
    currencyCode: 'GNT',
    displayName: 'Golem (old)',
    denominations: [{ name: 'GNT', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xa74476443119A942dE498590Fe1f2454d7D4aC0d'
    }
  },
  '056fd409e1d7a124bd7017459dfea2f387b6d5cd': {
    currencyCode: 'GUSD',
    displayName: 'Gemini Dollar',
    denominations: [{ name: 'GUSD', multiplier: '100' }],
    networkLocation: {
      contractAddress: '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd'
    }
  },
  '2e91e3e54c5788e9fdd6a181497fdcea1de1bcc1': {
    currencyCode: 'HERC',
    displayName: 'Hercules',
    denominations: [{ name: 'HERC', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x2e91E3e54C5788e9FdD6A181497FDcEa1De1bcc1'
    }
  },
  cdb7ecfd3403eef3882c65b761ef9b5054890a47: {
    currencyCode: 'HUR',
    displayName: 'Hurify',
    denominations: [{ name: 'HUR', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xCDB7eCFd3403Eef3882c65B761ef9B5054890a47'
    }
  },
  '875773784af8135ea0ef43b5a374aad105c5d39e': {
    currencyCode: 'IDLE',
    displayName: 'Idle Finance',
    denominations: [{ name: 'IDLE', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x875773784Af8135eA0ef43b5a374AaD105c5D39e'
    }
  },
  f8e386eda857484f5a12e4b5daa9984e06e73705: {
    currencyCode: 'IND',
    displayName: 'Indorse',
    denominations: [{ name: 'IND', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xf8e386EDa857484f5a12e4B5DAa9984E06E73705'
    }
  },
  '0954906da0bf32d5479e25f46056d22f08464cab': {
    currencyCode: 'INDEX',
    displayName: 'INDEX COOP',
    denominations: [{ name: 'INDEX', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x0954906da0Bf32d5479e25f46056d22f08464cab'
    }
  },
  '818fc6c2ec5986bc6e2cbf00939d90556ab12ce5': {
    currencyCode: 'KIN',
    displayName: 'Kin',
    denominations: [{ name: 'KIN', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x818Fc6C2Ec5986bc6E2CBf00939d90556aB12ce5'
    }
  },
  dd974d5c2e2928dea5f71b9825b8b646686bd200: {
    currencyCode: 'KNCV1',
    displayName: 'Kyber Network',
    denominations: [{ name: 'KNCV1', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xdd974D5C2e2928deA5F71b9825b8b646686BD200'
    }
  },
  defa4e8a7bcba345f687a2f1456f5edd9ce97202: {
    currencyCode: 'KNC',
    displayName: 'Kyber Network',
    denominations: [{ name: 'KNC', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xdeFA4e8a7bcBA345F687a2f1456F5Edd9CE97202'
    }
  },
  '514910771af9ca656af840dff83e8264ecf986ca': {
    currencyCode: 'LINK',
    displayName: 'Chainlink',
    denominations: [{ name: 'LINK', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x514910771af9ca656af840dff83e8264ecf986ca'
    }
  },
  '0f5d2fb29fb7d3cfee444a200298f468908cc942': {
    currencyCode: 'MANA',
    displayName: 'Decentraland',
    denominations: [{ name: 'MANA', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942'
    }
  },
  '7d1afa7b718fb893db30a3abc0cfc608aacfebb0': {
    currencyCode: 'MATIC',
    displayName: 'Polygon',
    denominations: [{ name: 'MATIC', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0'
    }
  },
  a3d58c4e56fedcae3a7c43a725aee9a71f0ece4e: {
    currencyCode: 'MET',
    displayName: 'Metronome',
    denominations: [{ name: 'MET', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xa3d58c4e56fedcae3a7c43a725aee9a71f0ece4e'
    }
  },
  '9f8f72aa9304c8b593d555f12ef6589cc3a579a2': {
    currencyCode: 'MKR',
    displayName: 'Maker',
    denominations: [{ name: 'MKR', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2'
    }
  },
  b62132e35a6c13ee1ee0f84dc5d40bad8d815206: {
    currencyCode: 'NEXO',
    displayName: 'Nexo',
    denominations: [{ name: 'NEXO', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xb62132e35a6c13ee1ee0f84dc5d40bad8d815206'
    }
  },
  '1776e1f26f98b1a5df9cd347953a26dd3cb46671': {
    currencyCode: 'NMR',
    displayName: 'Numeraire',
    denominations: [{ name: 'NMR', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x1776e1F26f98b1A5dF9cD347953a26dd3Cb46671'
    }
  },
  e9a95d175a5f4c9369f3b74222402eb1b837693b: {
    currencyCode: 'NOW',
    displayName: 'NOW Token',
    denominations: [{ name: 'NOW', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0xe9a95d175a5f4c9369f3b74222402eb1b837693b'
    }
  },
  d7c49cee7e9188cca6ad8ff264c1da2e69d4cf3b: {
    currencyCode: 'NXM',
    displayName: 'Nexus Mutual',
    denominations: [{ name: 'NXM', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xd7c49cee7e9188cca6ad8ff264c1da2e69d4cf3b'
    }
  },
  '967da4048cd07ab37855c090aaf366e4ce1b9f48': {
    currencyCode: 'OCEAN',
    displayName: 'OCEAN',
    denominations: [{ name: 'OCEAN', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48'
    }
  },
  '8207c1ffc5b6804f6024322ccf34f29c3541ae26': {
    currencyCode: 'OGN',
    displayName: 'Origin',
    denominations: [{ name: 'OGN', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x8207c1ffc5b6804f6024322ccf34f29c3541ae26'
    }
  },
  d26114cd6ee289accf82350c8d8487fedb8a0c07: {
    currencyCode: 'OMG',
    displayName: 'OmiseGO',
    denominations: [{ name: 'OMG', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xd26114cd6EE289AccF82350c8d8487fedB8A0C07'
    }
  },
  '4575f41308ec1483f3d399aa9a2826d74da13deb': {
    currencyCode: 'OXT',
    displayName: 'Orchid',
    denominations: [{ name: 'OXT', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x4575f41308EC1483f3d399aa9a2826d74Da13Deb'
    }
  },
  '429881672b9ae42b8eba0e26cd9c73711b891ca5': {
    currencyCode: 'PICKLE',
    displayName: 'PickleToken',
    denominations: [{ name: 'PICKLE', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x429881672B9AE42b8EbA0E26cD9C73711b891Ca5'
    }
  },
  '9992ec3cf6a55b00978cddf2b27bc6882d88d1ec': {
    currencyCode: 'POLY',
    displayName: 'Polymath Network',
    denominations: [{ name: 'POLY', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x9992eC3cF6A55b00978cdDF2b27BC6882d88D1eC'
    }
  },
  '408e41876cccdc0f92210600ef50372656052a38': {
    currencyCode: 'REN',
    displayName: 'Ren',
    denominations: [{ name: 'REN', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x408e41876cccdc0f92210600ef50372656052a38'
    }
  },
  '459086f2376525bdceba5bdda135e4e9d3fef5bf': {
    currencyCode: 'RENBCH',
    displayName: 'Ren BCH',
    denominations: [{ name: 'RENBCH', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x459086f2376525bdceba5bdda135e4e9d3fef5bf'
    }
  },
  eb4c2781e4eba804ce9a9803c67d0893436bb27d: {
    currencyCode: 'RENBTC',
    displayName: 'Ren BTC',
    denominations: [{ name: 'RENBTC', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d'
    }
  },
  '1c5db575e2ff833e46a2e9864c22f4b22e0b37c2': {
    currencyCode: 'RENZEC',
    displayName: 'Ren ZEC',
    denominations: [{ name: 'RENZEC', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x1c5db575e2ff833e46a2e9864c22f4b22e0b37c2'
    }
  },
  '1985365e9f78359a9b6ad760e32412f4a445e862': {
    currencyCode: 'REP',
    displayName: 'Augur',
    denominations: [{ name: 'REP', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x1985365e9f78359a9B6AD760e32412f4a445E862'
    }
  },
  '221657776846890989a759ba2973e427dff5c9bb': {
    currencyCode: 'REPV2',
    displayName: 'Augur v2',
    denominations: [{ name: 'REPV2', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x221657776846890989a759BA2973e427DfF5C9bB'
    }
  },
  fa5047c9c78b8877af97bdcb85db743fd7313d4a: {
    currencyCode: 'ROOK',
    displayName: 'Keeper DAO',
    denominations: [{ name: 'ROOK', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xfA5047c9c78B8877af97BDcb85Db743fD7313d4a'
    }
  },
  '89d24a6b4ccb1b6faa2625fe562bdd9a23260359': {
    currencyCode: 'SAI',
    displayName: 'Sai Stablecoin',
    denominations: [{ name: 'SAI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359'
    }
  },
  '4156d3342d5c385a87d264f90653733592000581': {
    currencyCode: 'SALT',
    displayName: 'SALT',
    denominations: [{ name: 'SALT', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x4156D3342D5c385a87D264F90653733592000581'
    }
  },
  fe18be6b3bd88a2d2a7f928d00292e7a9963cfc6: {
    currencyCode: 'SBTC',
    displayName: 'Synthetix BTC',
    denominations: [{ name: 'SBTC', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xfE18be6b3Bd88A2D2A7f928d00292E7a9963CfC6'
    }
  },
  c011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f: {
    currencyCode: 'SNX',
    displayName: 'Synthetix Network',
    denominations: [{ name: 'SNX', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f'
    }
  },
  b64ef51c888972c908cfacf59b47c1afbc0ab8ac: {
    currencyCode: 'STORJ',
    displayName: 'Storj',
    denominations: [{ name: 'STORJ', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0xB64ef51C888972c908CFacf59B47C1AfBC0Ab8aC'
    }
  },
  '57ab1ec28d129707052df4df418d58a2d46d5f51': {
    currencyCode: 'SUSD',
    displayName: 'Synthetix USD',
    denominations: [{ name: 'SUSD', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51'
    }
  },
  '6b3595068778dd592e39a122f4f5a5cf09c90fe2': {
    currencyCode: 'SUSHI',
    displayName: 'Sushi Token',
    denominations: [{ name: 'SUSHI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2'
    }
  },
  '8daebade922df735c38c80c7ebd708af50815faa': {
    currencyCode: 'TBTC',
    displayName: 'tBTC',
    denominations: [{ name: 'TBTC', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x8dAEBADE922dF735c38C80C7eBD708Af50815fAa'
    }
  },
  '0000000000085d4780b73119b644ae5ecd22b376': {
    currencyCode: 'TUSD',
    displayName: 'TrueUSD',
    denominations: [{ name: 'TUSD', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x0000000000085d4780B73119b644AE5ecd22b376'
    }
  },
  '04fa0d235c4abf4bcf4787af4cf447de572ef828': {
    currencyCode: 'UMA',
    displayName: 'UMA',
    denominations: [{ name: 'UMA', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828'
    }
  },
  '1f9840a85d5af5bf1d1762f925bdaddc4201f984': {
    currencyCode: 'UNI',
    displayName: 'Uniswap',
    denominations: [{ name: 'UNI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984'
    }
  },
  a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48: {
    currencyCode: 'USDC',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    }
  },
  '8e870d67f660d95d5be530380d0ec0bd388289e1': {
    currencyCode: 'USDP',
    displayName: 'Pax Dollar',
    denominations: [{ name: 'USDP', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x8e870d67f660d95d5be530380d0ec0bd388289e1'
    }
  },
  a4bdb11dc0a2bec88d24a3aa1e6bb17201112ebe: {
    currencyCode: 'USDS',
    displayName: 'StableUSD',
    denominations: [{ name: 'USDS', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0xA4Bdb11dc0a2bEC88d24A3aa1E6Bb17201112eBe'
    }
  },
  dac17f958d2ee523a2206206994597c13d831ec7: {
    currencyCode: 'USDT',
    displayName: 'Tether',
    denominations: [{ name: 'USDT', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7'
    }
  },
  '2260fac5e5542a773aa44fbcfedf7c193bc2c599': {
    currencyCode: 'WBTC',
    displayName: 'Wrapped Bitcoin',
    denominations: [{ name: 'WBTC', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
    }
  },
  c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2: {
    currencyCode: 'WETH',
    displayName: 'Wrapped ETH',
    denominations: [{ name: 'WETH', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    }
  },
  bea269038eb75bdab47a9c04d0f5c572d94b93d5: {
    currencyCode: 'WFIO',
    displayName: 'Wrapped FIO',
    denominations: [{ name: 'WFIO', multiplier: '1000000000' }],
    networkLocation: {
      contractAddress: '0xbEA269038Eb75BdAB47a9C04D0F5c572d94b93D5'
    }
  },
  '667088b212ce3d06a1b553a7221e1fd19000d9af': {
    currencyCode: 'WINGS',
    displayName: 'Wings',
    denominations: [{ name: 'WINGS', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x667088b212ce3d06a1b553a7221E1fD19000d9aF'
    }
  },
  b4bebd34f6daafd808f73de0d10235a92fbb6c3d: {
    currencyCode: 'YETI',
    displayName: 'Yearn Ecosystem Token Index',
    denominations: [{ name: 'YETI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xb4bebd34f6daafd808f73de0d10235a92fbb6c3d'
    }
  },
  '0bc529c00c6401aef6d220be8c6ea1667f6ad93e': {
    currencyCode: 'YFI',
    displayName: 'Yearn Finance',
    denominations: [{ name: 'YFI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e'
    }
  },
  e41d2489571d322189246dafa5ebde1f4699f498: {
    currencyCode: 'ZRX',
    displayName: '0x',
    denominations: [{ name: 'ZRX', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xE41d2489571d322189246DaFA5ebDe1F4699F498'
    }
  },
  ff20817765cb7f73d4bde2e66e067e58d11095c2: {
    currencyCode: 'AMP',
    displayName: 'Amp',
    denominations: [{ name: 'AMP', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xff20817765cb7f73d4bde2e66e067e58d11095c2'
    }
  },
  '4d224452801aced8b2f0aebe155379bb5d594381': {
    currencyCode: 'APE',
    displayName: 'ApeCoin',
    denominations: [{ name: 'APE', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x4d224452801aced8b2f0aebe155379bb5d594381'
    }
  },
  a0b73e1ff0b80914ab6fe0444e65848c4c34450b: {
    currencyCode: 'CRO',
    displayName: 'Cronos Coin',
    denominations: [{ name: 'CRO', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b'
    }
  },
  f629cbd94d3791c9250152bd8dfbdf380e2a3b9c: {
    currencyCode: 'ENJ',
    displayName: 'EnjinCoin',
    denominations: [{ name: 'ENJ', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xf629cbd94d3791c9250152bd8dfbdf380e2a3b9c'
    }
  },
  '15d4c048f83bd7e37d49ea4c83a07267ec4203da': {
    currencyCode: 'GALA',
    displayName: 'Gala',
    denominations: [{ name: 'GALA', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x15D4c048F83bd7e37d49eA4C83a07267Ec4203dA'
    }
  },
  d567b5f02b9073ad3a982a099a23bf019ff11d1c: {
    currencyCode: 'GAME',
    displayName: 'Game Coin',
    denominations: [{ name: 'GAME', multiplier: '100000' }],
    networkLocation: {
      contractAddress: '0xd567b5f02b9073ad3a982a099a23bf019ff11d1c'
    }
  },
  bbbbca6a901c926f240b89eacb641d8aec7aeafd: {
    currencyCode: 'LRC',
    displayName: 'LoopringCoin V2',
    denominations: [{ name: 'LRC', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xbbbbca6a901c926f240b89eacb641d8aec7aeafd'
    }
  },
  '3a4f40631a4f906c2bad353ed06de7a5d3fcb430': {
    currencyCode: 'PLA',
    displayName: 'PlayDapp Token',
    denominations: [{ name: 'PLA', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x3a4f40631a4f906c2BaD353Ed06De7A5D3fCb430'
    }
  },
  '4a220e6096b25eadb88358cb44068a3248254675': {
    currencyCode: 'QNT',
    displayName: 'Quant',
    denominations: [{ name: 'QNT', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x4a220e6096b25eadb88358cb44068a3248254675'
    }
  },
  '0763fdccf1ae541a5961815c0872a8c5bc6de4d7': {
    currencyCode: 'SUKU',
    displayName: 'SUKU',
    denominations: [{ name: 'SUKU', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x0763fdCCF1aE541A5961815C0872A8c5Bc6DE4d7'
    }
  },
  '95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce': {
    currencyCode: 'SHIB',
    displayName: 'SHIBA INU',
    denominations: [{ name: 'SHIB', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce'
    }
  },
  '446c9033e7516d820cc9a2ce2d0b7328b579406f': {
    currencyCode: 'SOLVE',
    displayName: 'Healthcare Administration Token',
    denominations: [{ name: 'SOLVE', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x446c9033e7516d820cc9a2ce2d0b7328b579406f'
    }
  },
  '74232704659ef37c08995e386a2e26cc27a8d7b1': {
    currencyCode: 'STRK',
    displayName: 'Strike Token',
    denominations: [{ name: 'STRK', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x74232704659ef37c08995e386a2e26cc27a8d7b1'
    }
  },
  c944e90c64b2c07662a292be6244bdf05cda44a7: {
    currencyCode: 'GRT',
    displayName: 'Graph Token',
    denominations: [{ name: 'GRT', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xc944e90c64b2c07662a292be6244bdf05cda44a7'
    }
  },
  '3845badade8e6dff049820680d1f14bd3903a5d0': {
    currencyCode: 'SAND',
    displayName: 'SAND',
    denominations: [{ name: 'SAND', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x3845badAde8e6dFF049820680d1F14bD3903a5d0'
    }
  }
}

const defaultNetworkFees: EthereumFees = {
  default: {
    baseFeeMultiplier: {
      lowFee: '1',
      standardFeeLow: '1.25',
      standardFeeHigh: '1.5',
      highFee: '1.75'
    },
    gasLimit: {
      regularTransaction: '21000',
      tokenTransaction: '300000',
      minGasLimit: '21000'
    },
    gasPrice: {
      lowFee: '1000000001',
      standardFeeLow: '40000000001',
      standardFeeHigh: '300000000001',
      standardFeeLowAmount: '100000000000000000',
      standardFeeHighAmount: '10000000000000000000',
      highFee: '40000000001',
      minGasPrice: '1000000000'
    },
    minPriorityFee: '2000000000'
  },
  '1983987abc9837fbabc0982347ad828': {
    baseFeeMultiplier: undefined,
    // @ts-expect-error
    gasLimit: {
      regularTransaction: '21002',
      tokenTransaction: '37124'
    },
    // @ts-expect-error
    gasPrice: {
      lowFee: '1000000002',
      standardFeeLow: '40000000002',
      standardFeeHigh: '300000000002',
      standardFeeLowAmount: '200000000000000000',
      standardFeeHighAmount: '20000000000000000000',
      highFee: '40000000002'
    },
    minPriorityFee: undefined
  },
  '2983987abc9837fbabc0982347ad828': {
    baseFeeMultiplier: undefined,
    // @ts-expect-error
    gasLimit: {
      regularTransaction: '21002',
      tokenTransaction: '37124'
    },
    gasPrice: undefined,
    minPriorityFee: undefined
  }
}

// Exported for fee provider test
export const networkInfo: EthereumNetworkInfo = {
  rpcServers: [
    'https://eth-mainnet.alchemyapi.io',
    'https://mainnet.infura.io/v3',
    'https://rpc.ankr.com/eth',
    'https://cloudflare-eth.com'
  ],

  evmScanApiServers: [
    'https://api.etherscan.io'
    // 'https://blockscout.com/eth/mainnet' // not reliable enough...
  ],
  blockcypherApiServers: ['https://api.blockcypher.com'],
  blockbookServers: [
    'https://ethbook.guarda.co',
    'https://eth1.trezor.io',
    'https://eth2.trezor.io'
  ],
  uriNetworks: ['ethereum', 'ether'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 1,
    name: 'Ethereum Mainnet'
  },
  supportsEIP1559: true,
  hdPathCoinType: 60,
  checkUnconfirmedTransactions: true,
  iosAllowedTokens: {
    REP: true,
    WINGS: true,
    HUR: true,
    IND: true,
    USDT: true
  },
  blockchairApiServers: ['https://api.blockchair.com'],
  alethioApiServers: ['https://api.aleth.io/v1'],
  alethioCurrencies: {
    // object or null
    native: 'ether',
    token: 'token'
  },
  amberdataRpcServers: ['https://rpc.web3api.io'],
  amberdataApiServers: ['https://web3api.io/api/v2'],
  amberDataBlockchainId: '1c9c969065fcd1cf', // ETH mainnet
  pluginMnemonicKeyName: 'ethereumMnemonic',
  pluginRegularKeyName: 'ethereumKey',
  ethGasStationUrl: 'https://www.ethgasstation.info/json/ethgasAPI.json',
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings: { ...networkInfo }
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'ETH',
  displayName: 'Ethereum',
  pluginId: 'ethereum',
  walletType: 'wallet:ethereum',
  memoType: 'hex',

  canReplaceByFee: true,
  defaultSettings,

  addressExplorer: 'https://etherscan.io/address/%s',
  transactionExplorer: 'https://etherscan.io/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'ETH',
      multiplier: '1000000000000000000',
      symbol: 'Ξ'
    },
    {
      name: 'mETH',
      multiplier: '1000000000000000',
      symbol: 'mΞ'
    }
  ],
  metaTokens: makeMetaTokens(builtinTokens) // Deprecated
}

export const ethereum = makeOuterPlugin<EthereumNetworkInfo, EthereumTools>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "ethereum" */
      '../ethPlugin'
    )
  }
})
