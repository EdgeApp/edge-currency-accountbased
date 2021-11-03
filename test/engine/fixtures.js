export default [
  {
    pluginId: 'ripple',
    WALLET_TYPE: 'wallet:ripple',
    'Test Currency code': 'XRP',
    key: [
      39, 190, 34, 129, 208, 32, 145, 88, 191, 217, 226, 98, 183, 16, 52, 150,
      52, 53, 31, 137, 164, 40, 236, 146, 128, 107, 129, 59, 192, 240, 40, 238
    ]
  },
  {
    pluginId: 'stellar',
    WALLET_TYPE: 'wallet:stellar',
    'Test Currency code': 'XLM',
    key: [
      39, 190, 34, 129, 208, 32, 145, 88, 191, 217, 226, 98, 183, 16, 52, 150,
      52, 53, 31, 137, 164, 40, 236, 146, 128, 107, 129, 59, 192, 240, 40, 238
    ]
  },
  {
    pluginId: 'ethereum',
    WALLET_TYPE: 'wallet:ethereum',
    'Test Currency code': 'ETH',
    key: [
      39, 190, 34, 129, 208, 32, 145, 88, 191, 217, 226, 98, 183, 16, 52, 150,
      52, 53, 31, 137, 164, 40, 236, 146, 128, 107, 129, 59, 192, 240, 40, 238
    ],
    messages: {
      eth_sign: {
        param: '0xdeadbeaf',
        signature:
          '0x3d25bfa139018716413b74a12d61a5b7a964dea9e7dc1f1af333a76fe8b2ddfa36cca0721b47345dbee966bfafce3a5dc688fe7bf4196d414121534188ea001700'
      },
      eth_signTypedData: {
        param: {
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' }
            ],
            Person: [
              { name: 'name', type: 'string' },
              { name: 'wallet', type: 'address' }
            ],
            Mail: [
              { name: 'from', type: 'Person' },
              { name: 'to', type: 'Person' },
              { name: 'contents', type: 'string' }
            ]
          },
          primaryType: 'Mail',
          domain: {
            name: 'Ether Mail',
            version: '1',
            chainId: 1,
            verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
          },
          message: {
            from: {
              name: 'Cow',
              wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826'
            },
            to: {
              name: 'Bob',
              wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'
            },
            contents: 'Hello, Bob!'
          }
        },
        signature:
          '0xd5f5c40089e006ae5983ced71acf5a60b161bc0bcc8f857ee1153b7701ec72646f1679d6125a2f39b4d6e89624c0e6f40b214d1a6102855f15add026adff7da91c'
      }
    }
  },
  {
    pluginId: 'rsk',
    WALLET_TYPE: 'wallet:rsk',
    'Test Currency code': 'RBTC',
    key: [
      50, 192, 187, 195, 192, 185, 27, 214, 12, 103, 95, 39, 42, 98, 19, 120,
      189, 200, 169, 242, 151, 116, 39, 138, 171, 229, 103, 252, 87, 185, 25,
      135
    ]
  },
  {
    pluginId: 'fio',
    WALLET_TYPE: 'wallet:fio',
    'Test Currency code': 'FIO',
    key: [
      39, 190, 34, 129, 208, 32, 145, 88, 191, 217, 226, 98, 183, 16, 52, 150,
      52, 53, 31, 137, 164, 40, 236, 146, 128, 107, 129, 59, 192, 240, 40, 238
    ]
  }
]
