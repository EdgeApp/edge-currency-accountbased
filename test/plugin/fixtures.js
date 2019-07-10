export default [
  {
    pluginName: 'stellar',
    WALLET_TYPE: 'wallet:stellar',
    'Test Currency code': 'XLM',
    key: [
      39,
      190,
      34,
      129,
      208,
      32,
      145,
      88,
      191,
      217,
      226,
      98,
      183,
      16,
      52,
      150,
      52,
      53,
      31,
      137,
      164,
      40,
      236,
      146,
      128,
      107,
      129,
      59,
      192,
      240,
      40,
      238
    ],
    xpub: 'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD',
    key_length: 56,
    'invalid key name': {
      type: 'wallet:stellar',
      keys: { stellarKeyz: '12345678abcd' }
    },
    'invalid wallet type': {
      type: 'wallet:stellarz',
      keys: { stellarKeyz: '12345678abcd' }
    },
    parseUri: {
      'address only': [
        'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD',
        'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD'
      ],
      'invalid address': [
        'dDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD',
        'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FA',
        'GDUHWCN6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD'
      ],
      'uri address': [
        'web+stellar:pay?destination=GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD',
        'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD'
      ],
      'uri address with amount': [
        'web+stellar:pay?destination=GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD&amount=12345.6789',
        'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD',
        '123456789000',
        'XLM'
      ],
      'uri address with unique identifier': [
        'web+stellar:pay?destination=GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD&memo=123456789&memo_type=MEMO_ID',
        'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD',
        'XLM',
        '123456789'
      ],
      'uri address with amount & label': [
        'web+stellar:pay?destination=GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD&amount=1234.56789&label=Johnny%20Ripple',
        'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD',
        '12345678900',
        'XLM',
        'Johnny Ripple'
      ],
      'uri address with amount, label & message': [
        'web+stellar:pay?destination=GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD&amount=1234.56789&label=Johnny%20Ripple&msg=Hello%20World,%20I%20miss%20you%20!',
        'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD',
        '12345678900',
        'XLM',
        'Johnny Ripple',
        'Hello World, I miss you !'
      ],
      'uri address with unsupported param': [
        'web+stellar:pay?destination=GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD&unsupported=helloworld&amount=12345.6789',
        'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD',
        '123456789000',
        'XLM'
      ]
    },
    encodeUri: {
      'address only': [
        {
          publicAddress:
            'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD'
        },
        'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD'
      ],
      'weird address': [
        {
          publicAddress:
            'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD'
        },
        'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD'
      ],
      'invalid address': [
        { publicAddress: 'rf1GeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn' },
        { publicAddress: 'sf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn' },
        { publicAddress: 'rf1BiGeXwwQol8Z2ueFYTEXSwuJYfV2Jpn' }
      ],
      'address & amount': [
        {
          publicAddress:
            'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD',
          nativeAmount: '1234567800000'
        },
        'web+stellar:pay?destination=GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD&amount=123456.78'
      ],
      'address, amount, and label': [
        {
          publicAddress:
            'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD',
          nativeAmount: '1230',
          currencyCode: 'XLM',
          label: 'Johnny Ripple'
        },
        'web+stellar:pay?destination=GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD&amount=0.000123&label=Johnny%20Ripple'
      ],
      'address, amount, label, & message': [
        {
          publicAddress:
            'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD',
          nativeAmount: '1230',
          currencyCode: 'XLM',
          label: 'Johnny Ripple',
          message: 'Hello World, I miss you !'
        },
        'web+stellar:pay?destination=GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD&amount=0.000123&label=Johnny%20Ripple&msg=Hello%20World,%20I%20miss%20you%20!'
      ]
    }
  },
  {
    pluginName: 'ripple',
    WALLET_TYPE: 'wallet:ripple',
    'Test Currency code': 'XRP',
    key: [
      39,
      190,
      34,
      129,
      208,
      32,
      145,
      88,
      191,
      217,
      226,
      98,
      183,
      16,
      52,
      150,
      52,
      53,
      31,
      137,
      164,
      40,
      236,
      146,
      128,
      107,
      129,
      59,
      192,
      240,
      40,
      238
    ],
    xpub: 'rHjiXf39KxewZrUy2NK5UuW96dMiEjQVcT',
    key_length: 31,
    'invalid key name': {
      type: 'wallet:ripple',
      keys: { rippleKeyz: '12345678abcd' }
    },
    'invalid wallet type': {
      type: 'shitcoin',
      keys: { rippleKey: '12345678abcd' }
    },
    parseUri: {
      'address only': [
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn'
      ],
      'invalid address': [
        'sf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2JpnJ',
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2lpn'
      ],
      'uri address': [
        'ripple:rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn'
      ],
      'uri address with amount': [
        'ripple:rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn?amount=12345.6789',
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
        '12345678900',
        'XRP'
      ],
      'uri address with unique identifier': [
        'ripple:rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn?dt=123456789',
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
        'XRP',
        '123456789'
      ],
      'uri address with amount & label': [
        'ripple:rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn?amount=1234.56789&label=Johnny%20Ripple',
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
        '1234567890',
        'XRP',
        'Johnny Ripple'
      ],
      'uri address with amount, label & message': [
        'ripple:rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn?amount=1234.56789&label=Johnny%20Ripple&message=Hello%20World,%20I%20miss%20you%20!',
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
        '1234567890',
        'XRP',
        'Johnny Ripple',
        'Hello World, I miss you !'
      ],
      'uri address with unsupported param': [
        'ripple:rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn?unsupported=helloworld&amount=12345.6789',
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
        '12345678900',
        'XRP'
      ]
    },
    encodeUri: {
      'address only': [
        { publicAddress: 'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn' },
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn'
      ],
      'weird address': [
        { publicAddress: 'rmUSRn9LEnaHztzm13ZGAeAvy48A4r7u9' },
        'rmUSRn9LEnaHztzm13ZGAeAvy48A4r7u9'
      ],
      'invalid address': [
        { publicAddress: 'rf1GeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn' },
        { publicAddress: 'sf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn' },
        { publicAddress: 'rf1BiGeXwwQol8Z2ueFYTEXSwuJYfV2Jpn' }
      ],
      'address & amount': [
        {
          publicAddress: 'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
          nativeAmount: '123456780000'
        },
        'ripple:rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn?amount=123456.78'
      ],
      'address, amount, and label': [
        {
          publicAddress: 'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
          nativeAmount: '123',
          currencyCode: 'XRP',
          label: 'Johnny Ripple'
        },
        'ripple:rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn?amount=0.000123&label=Johnny%20Ripple'
      ],
      'address, amount, label, & message': [
        {
          publicAddress: 'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
          nativeAmount: '123',
          currencyCode: 'XRP',
          label: 'Johnny Ripple',
          message: 'Hello World, I miss you !'
        },
        'ripple:rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn?amount=0.000123&label=Johnny%20Ripple&message=Hello%20World,%20I%20miss%20you%20!'
      ]
    }
  },
  {
    pluginName: 'ethereum',
    WALLET_TYPE: 'wallet:ethereum',
    'Test Currency code': 'ETH',
    key: [
      39,
      190,
      34,
      129,
      208,
      32,
      145,
      88,
      191,
      217,
      226,
      98,
      183,
      16,
      52,
      150,
      52,
      53,
      31,
      137,
      164,
      40,
      236,
      146,
      128,
      107,
      129,
      59,
      192,
      240,
      40,
      238
    ],
    xpub: '0x466d506cd7fbcd29a06015da03f0de814df050ee',
    key_length: 64,
    'invalid key name': {
      type: 'wallet:ethereum',
      keys: { ethereumKeyz: '12345678abcd' }
    },
    'invalid wallet type': {
      type: 'shitcoin',
      keys: { ethereumKey: '12345678abcd' }
    },
    parseUri: {
      'address only': [
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8'
      ],
      'invalid address': [
        '0x466d506cd7fbcd29a06015da03f0de814df050ez',
        '0466d506cd7fbcd29a06015da03f0de814df050ee',
        '0x466d506cd7fbcd29a06015da03f0de814df050ee1'
      ],
      'uri address': [
        'ethereum:0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8'
      ],
      'uri address with amount': [
        'ethereum:0x04b6b3bcbc16a5fb6a20301d650f8def513122a8?amount=12345.6789',
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
        '12345678900000000000000',
        'ETH'
      ],
      'uri address with unique identifier': [
        'ethereum:0x04b6b3bcbc16a5fb6a20301d650f8def513122a8?dt=123456789',
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
        'ETH'
      ],
      'uri address with amount & label': [
        'ethereum:0x04b6b3bcbc16a5fb6a20301d650f8def513122a8?amount=1234.56789&label=Johnny%20Ripple',
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
        '1234567890000000000000',
        'ETH',
        'Johnny Ripple'
      ],
      'uri address with amount, label & message': [
        'ethereum:0x04b6b3bcbc16a5fb6a20301d650f8def513122a8?amount=1234.56789&label=Johnny%20Ripple&message=Hello%20World,%20I%20miss%20you%20!',
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
        '1234567890000000000000',
        'ETH',
        'Johnny Ripple',
        'Hello World, I miss you !'
      ],
      'uri address with unsupported param': [
        'ethereum:0x04b6b3bcbc16a5fb6a20301d650f8def513122a8?unsupported=helloworld&amount=12345.6789',
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
        '12345678900000000000000',
        'ETH'
      ]
    },
    encodeUri: {
      'address only': [
        { publicAddress: '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8' },
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8'
      ],
      'weird address': [
        { publicAddress: '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8' },
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8'
      ],
      'invalid address': [
        { publicAddress: '0x04b6b3bcbc16a5fb6a20301d650f8def513122az' },
        { publicAddress: '04b6b3bcbc16a5fb6a20301d650f8def513122a8' },
        { publicAddress: '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8a' }
      ],
      'address & amount': [
        {
          publicAddress: '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
          nativeAmount: '123456780000'
        },
        'ethereum:0x04b6b3bcbc16a5fb6a20301d650f8def513122a8?amount=0.00000012345678'
      ],
      'address, amount, and label': [
        {
          publicAddress: '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
          nativeAmount: '123000000000000',
          currencyCode: 'ETH',
          label: 'Johnny Ether'
        },
        'ethereum:0x04b6b3bcbc16a5fb6a20301d650f8def513122a8?amount=0.000123&label=Johnny%20Ether'
      ],
      'address, amount, label, & message': [
        {
          publicAddress: '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
          nativeAmount: '123000000000000',
          currencyCode: 'ETH',
          label: 'Johnny Ether',
          message: 'Hello World, I miss you !'
        },
        'ethereum:0x04b6b3bcbc16a5fb6a20301d650f8def513122a8?amount=0.000123&label=Johnny%20Ether&message=Hello%20World,%20I%20miss%20you%20!'
      ]
    }
  },
  {
    pluginName: 'rsk',
    WALLET_TYPE: 'wallet:rsk',
    'Test Currency code': 'RBTC',
    key: [
      39,
      190,
      34,
      129,
      208,
      32,
      145,
      88,
      191,
      217,
      226,
      98,
      183,
      16,
      52,
      150,
      52,
      53,
      31,
      137,
      164,
      40,
      236,
      146,
      128,
      107,
      129,
      59,
      192,
      240,
      40,
      238
    ],
    xpub: '0x466d506cd7fbcd29a06015da03f0de814df050ee',
    key_length: 64,
    'invalid key name': {
      type: 'wallet:rsk',
      keys: { rskKeyz: '12345678abcd' }
    },
    'invalid wallet type': {
      type: 'shitcoin',
      keys: { rskKey: '12345678abcd' }
    },
    parseUri: {
      'address only': [
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8'
      ],
      'invalid address': [
        '0x466d506cd7fbcd29a06015da03f0de814df050ez',
        '0466d506cd7fbcd29a06015da03f0de814df050ee',
        '0x466d506cd7fbcd29a06015da03f0de814df050ee1'
      ],
      'uri address': [
        'rsk:0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8'
      ],
      'uri address with amount': [
        'rsk:0x04b6b3bcbc16a5fb6a20301d650f8def513122a8?amount=12345.6789',
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
        '12345678900000000000000',
        'RBTC'
      ],
      'uri address with unique identifier': [
        'rsk:0x04b6b3bcbc16a5fb6a20301d650f8def513122a8?dt=123456789',
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
        'RBTC'
      ],
      'uri address with amount & label': [
        'rsk:0x04b6b3bcbc16a5fb6a20301d650f8def513122a8?amount=1234.56789&label=Johnny%20Ripple',
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
        '1234567890000000000000',
        'RBTC',
        'Johnny Ripple'
      ],
      'uri address with amount, label & message': [
        'rsk:0x04b6b3bcbc16a5fb6a20301d650f8def513122a8?amount=1234.56789&label=Johnny%20Ripple&message=Hello%20World,%20I%20miss%20you%20!',
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
        '1234567890000000000000',
        'RBTC',
        'Johnny Ripple',
        'Hello World, I miss you !'
      ],
      'uri address with unsupported param': [
        'rsk:0x04b6b3bcbc16a5fb6a20301d650f8def513122a8?unsupported=helloworld&amount=12345.6789',
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
        '12345678900000000000000',
        'RBTC'
      ]
    },
    encodeUri: {
      'address only': [
        { publicAddress: '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8' },
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8'
      ],
      'weird address': [
        { publicAddress: '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8' },
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8'
      ],
      'invalid address': [
        { publicAddress: '0x04b6b3bcbc16a5fb6a20301d650f8def513122az' },
        { publicAddress: '04b6b3bcbc16a5fb6a20301d650f8def513122a8' },
        { publicAddress: '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8a' }
      ],
      'address & amount': [
        {
          publicAddress: '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
          nativeAmount: '123456780000'
        },
        'rsk:0x04b6b3bcbc16a5fb6a20301d650f8def513122a8?amount=0.00000012345678'
      ],
      'address, amount, and label': [
        {
          publicAddress: '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
          nativeAmount: '123000000000000',
          currencyCode: 'RBTC',
          label: 'Johnny Rootstock'
        },
        'rsk:0x04b6b3bcbc16a5fb6a20301d650f8def513122a8?amount=0.000123&label=Johnny%20Rootstock'
      ],
      'address, amount, label, & message': [
        {
          publicAddress: '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8',
          nativeAmount: '123000000000000',
          currencyCode: 'RBTC',
          label: 'Johnny Rootstock',
          message: 'Hello World, I miss you !'
        },
        'rsk:0x04b6b3bcbc16a5fb6a20301d650f8def513122a8?amount=0.000123&label=Johnny%20Rootstock&message=Hello%20World,%20I%20miss%20you%20!'
      ]
    }
  }
]
