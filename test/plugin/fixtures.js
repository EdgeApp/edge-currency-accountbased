export default [
  {
    pluginId: 'binance',
    WALLET_TYPE: 'wallet:binance',
    'Test Currency code': 'BNB',
    key: [
      39, 190, 34, 129, 208, 32, 145, 88, 191, 217, 226, 98, 183, 16, 52, 150,
      52, 53, 31, 137, 164, 40, 236, 146, 128, 107, 129, 59, 192, 240, 40, 238
    ],
    xpub: 'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv',
    key_length: 64,
    'invalid key name': {
      type: 'wallet:binance',
      keys: { stellarKeyz: '12345678abcd' }
    },
    'invalid wallet type': {
      type: 'wallet:stellarz',
      keys: { stellarKeyz: '12345678abcd' }
    },
    parseUri: {
      'address only': [
        'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv',
        'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv'
      ],
      'invalid address': [
        'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv1',
        'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695lu',
        'tnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv'
      ],
      'uri address': [
        'binance:bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv',
        'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv'
      ],
      'uri address with amount': [
        'binance:bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv?amount=12.34567',
        'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv',
        '1234567000',
        'BNB'
      ],
      'uri address with unique identifier': [
        'binance:bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv?memo=123456700',
        'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv',
        'BNB',
        '123456700'
      ],
      'uri address with unique identifier and without network prefix': [
        'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv?memo=123456700',
        'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv',
        'BNB',
        '123456700'
      ],
      'uri address with amount & label': [
        'binance:bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv?amount=12.34567&label=Johnny%20Binance',
        'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv',
        '1234567000',
        'BNB',
        'Johnny Binance'
      ],
      'uri address with amount, label & message': [
        'binance:bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv?amount=12.34567&label=Johnny%20Binance&message=Hellow%20Binance%20World',
        'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv',
        '1234567000',
        'BNB',
        'Johnny Binance',
        'Hello Binance World'
      ],
      'uri address with unsupported param': [
        'binance:bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv?amount=12.34567&unsupported=I%20am%20unsupported',
        'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv',
        '1234567000',
        'BNB'
      ]
    },
    encodeUri: {
      'address only': [
        {
          publicAddress: 'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv'
        },
        'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv'
      ],
      'weird address': [
        {
          publicAddress: 'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv'
        },
        'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv'
      ],
      'invalid address': [
        { publicAddress: 'bnt1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv' },
        { publicAddress: 'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695lu' },
        { publicAddress: 'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luvw' }
      ],
      'address & amount': [
        {
          publicAddress: 'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv',
          nativeAmount: '12345678000000'
        },
        'binance:bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv?amount=123456.78'
      ],
      'address, amount, and label': [
        {
          publicAddress: 'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv',
          nativeAmount: '12300',
          currencyCode: 'BNB',
          label: 'Johnny Ripple'
        },
        'binance:bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv?amount=0.000123&label=Johnny%20Ripple'
      ],
      'address, amount, label, & message': [
        {
          publicAddress: 'bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv',
          nativeAmount: '12300',
          currencyCode: 'BNB',
          label: 'Johnny Ripple',
          message: 'Hello World, I miss you !'
        },
        'binance:bnb1ytwkmhg4k3zqzqwfuyeqr7cxs2xzlrgx695luv?amount=0.000123&label=Johnny%20Ripple&message=Hello%20World,%20I%20miss%20you%20!'
      ]
    }
  },
  {
    pluginId: 'stellar',
    WALLET_TYPE: 'wallet:stellar',
    'Test Currency code': 'XLM',
    key: [
      39, 190, 34, 129, 208, 32, 145, 88, 191, 217, 226, 98, 183, 16, 52, 150,
      52, 53, 31, 137, 164, 40, 236, 146, 128, 107, 129, 59, 192, 240, 40, 238
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
      'uri address with unique identifier and without network prefix': [
        'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD?memo=123456789&memo_type=MEMO_ID',
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
    pluginId: 'ripple',
    WALLET_TYPE: 'wallet:ripple',
    'Test Currency code': 'XRP',
    key: [
      39, 190, 34, 129, 208, 32, 145, 88, 191, 217, 226, 98, 183, 16, 52, 150,
      52, 53, 31, 137, 164, 40, 236, 146, 128, 107, 129, 59, 192, 240, 40, 238
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
      'uri address with unique identifier and without network prefix': [
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn?dt=123456789',
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
    pluginId: 'ethereum',
    WALLET_TYPE: 'wallet:ethereum',
    'Test Currency code': 'ETH',
    key: [
      39, 190, 34, 129, 208, 32, 145, 88, 191, 217, 226, 98, 183, 16, 52, 150,
      52, 53, 31, 137, 164, 40, 236, 146, 128, 107, 129, 59, 192, 240, 40, 238
    ],
    mnemonic:
      'room soda device label bicycle hill fork nest lion knee purpose hen',
    xpub: '0x21d45fd06e291c49abfa135460de827b6579cef5',
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
      'address with provided currency code': {
        args: ['0x04b6b3bcbc16a5fb6a20301d650f8def513122a8', 'USDC'],
        output: {
          publicAddress: '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8'
        }
      },
      'checksum address only': [
        '0x3C40cbb7F82A7E1bc83C4E3E98590b19e0e1bf07',
        '0x3c40cbb7f82a7e1bc83c4e3e98590b19e0e1bf07'
      ],
      'invalid checksum address only': [
        '0x3C40cbb7F82A7E1bc83C4E3E98590b19e0e1Bf07'
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
      'uri address with unique identifier and without network prefix': [
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8?dt=123456789',
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
      ],
      'uri eip681 payment address': {
        args: ['ethereum:0xf5d81254c269a1e984044e4d542adc07bf18c541?value=123'],
        output: {
          publicAddress: '0xf5d81254c269a1e984044e4d542adc07bf18c541',
          nativeAmount: '123'
        }
      },
      'uri eip681 payment address with pay prefix': {
        args: [
          'ethereum:pay-0xf5d81254c269a1e984044e4d542adc07bf18c541?value=123'
        ],
        output: {
          publicAddress: '0xf5d81254c269a1e984044e4d542adc07bf18c541',
          nativeAmount: '123'
        }
      },
      'uri eip681 payment address using scientific notation': {
        args: [
          'ethereum:0xf5d81254c269a1e984044e4d542adc07bf18c541?value=2.014e18'
        ],
        output: {
          publicAddress: '0xf5d81254c269a1e984044e4d542adc07bf18c541',
          nativeAmount: '2014000000000000000'
        }
      },
      'uri eip681 transfer contract invocation': {
        args: [
          'ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48/transfer?address=0xf5d81254c269a1e984044e4d542adc07bf18c541&uint256=2.014e6',
          'USDC'
        ],
        output: {
          publicAddress: '0xf5d81254c269a1e984044e4d542adc07bf18c541',
          nativeAmount: '2014000',
          currencyCode: 'USDC'
        }
      }
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
    pluginId: 'rsk',
    WALLET_TYPE: 'wallet:rsk',
    'Test Currency code': 'RBTC',
    key: [
      50, 192, 187, 195, 192, 185, 27, 214, 12, 103, 95, 39, 42, 98, 19, 120,
      189, 200, 169, 242, 151, 116, 39, 138, 171, 229, 103, 252, 87, 185, 25,
      135
    ],
    mnemonic:
      'latin seat grit casual fold cluster soon buyer turn school human exhibit',
    xpub: '0xe38884ff92c9834dc3255d33b8662b80154a06dd',
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
      'uri address with unique identifier and without network prefix': [
        '0x04b6b3bcbc16a5fb6a20301d650f8def513122a8?dt=123456789',
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
  },
  {
    pluginId: 'fio',
    WALLET_TYPE: 'wallet:fio',
    'Test Currency code': 'FIO',
    key: [
      39, 190, 34, 129, 208, 32, 145, 88, 191, 217, 226, 98, 183, 16, 52, 150,
      52, 53, 31, 137, 164, 40, 236, 146, 128, 107, 129, 59, 192, 240, 40, 238
    ],
    xpub: 'FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z',
    key_length: 51,
    'invalid key name': {
      type: 'wallet:fio',
      keys: {
        fioKeyz: '5KG4yxR4j1S1UFk4mGraAfGrWh7TS5uiJmhtkG4vPunFWg84wuP',
        mnemonic:
          'chicken valve parrot park animal proof youth detail glance review artwork cluster drive more charge lunar uncle neglect brain act rose job photo spot'
      }
    },
    'invalid wallet type': {
      type: 'wallet:fiox',
      keys: { fiokey: '5KG4yxR4j1S1UFk4mGraAfGrWh7TS5uiJmhtkG4vPunFWg84wuP' }
    },
    parseUri: {
      'address only': [
        'FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z',
        'FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z'
      ],
      'invalid address': [
        'FIOHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL',
        'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD',
        'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5'
      ],
      'uri address': [
        'fio:FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z',
        'FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z'
      ],
      'uri address with amount': [
        'fio:FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z?amount=12345.6789',
        'FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z',
        '12345678900000',
        'FIO'
      ],
      'uri address with unique identifier': [
        'fio:FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z?memo=123456789&memo_type=MEMO_ID',
        'FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z',
        'FIO'
      ],
      'uri address with unique identifier and without network prefix': [
        'FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z?memo=123456789&memo_type=MEMO_ID',
        'FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z',
        'FIO'
      ],
      'uri address with amount & label': [
        'fio:FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z?amount=1234.56789&label=Johnny%20Ripple',
        'FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z',
        '1234567890000',
        'FIO',
        'Johnny Ripple'
      ],
      'uri address with amount, label & message': [
        'fio:FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z?amount=1234.56789&label=Johnny%20Ripple&msg=Hello%20World,%20I%20miss%20you%20!',
        'FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z',
        '1234567890000',
        'FIO',
        'Johnny Ripple',
        'Hello World, I miss you !'
      ],
      'uri address with unsupported param': [
        'fio:FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z?unsupported=helloworld&amount=12345.6789',
        'FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z',
        '12345678900000',
        'FIO'
      ]
    },
    encodeUri: {
      'address only': [
        {
          publicAddress: 'FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z'
        },
        'FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z'
      ],
      'weird address': [
        {
          publicAddress: 'FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z'
        },
        'FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z'
      ],
      'invalid address': [
        { publicAddress: 'rf1GeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn' },
        { publicAddress: 'sf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn' },
        { publicAddress: 'rf1BiGeXwwQol8Z2ueFYTEXSwuJYfV2Jpn' }
      ],
      'address & amount': [
        {
          publicAddress:
            'FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z',
          nativeAmount: '1234567800000'
        },
        'fio:FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z?amount=1234.5678'
      ],
      'address, amount, and label': [
        {
          publicAddress:
            'FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z',
          nativeAmount: '1230',
          currencyCode: 'FIO',
          label: 'Johnny Ripple'
        },
        'fio:FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z?amount=0.00000123&label=Johnny%20Ripple'
      ],
      'address, amount, label, & message': [
        {
          publicAddress:
            'FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z',
          nativeAmount: '1230',
          currencyCode: 'FIO',
          label: 'Johnny Ripple',
          message: 'Hello World, I miss you !'
        },
        'fio:FIO522SwA96CmFo2sZLuSUbhJmgHhb9reUheYCJd3JtrAnSsvGD5Z?amount=0.00000123&label=Johnny%20Ripple&message=Hello%20World,%20I%20miss%20you%20!'
      ]
    }
  },
  {
    pluginId: 'hedera',
    WALLET_TYPE: 'wallet:hedera',
    'Test Currency code': 'HBAR',
    key: [
      39, 190, 34, 129, 208, 32, 145, 88, 191, 217, 226, 98, 183, 16, 52, 150,
      52, 53, 31, 137, 164, 40, 236, 146, 128, 107, 129, 59, 192, 240, 40, 238
    ],
    xpub: '302a300506032b6570032100720c6934e5c1c79a0ec8c8de809071dd8142cad11bb299d1b711de1292259b69',
    mnemonic:
      'chicken valve parrot park animal proof youth detail glance review artwork cluster drive more charge lunar uncle neglect brain act rose job photo spot',
    key_length: 96,
    'invalid key name': {
      type: 'wallet:hedera',
      keys: {
        hederaKeyz: '5KG4yxR4j1S1UFk4mGraAfGrWh7TS5uiJmhtkG4vPunFWg84wuP',
        mnemonic:
          'chicken valve parrot park animal proof youth detail glance review artwork spot'
      }
    },
    'invalid wallet type': {
      type: 'wallet:hederax',
      keys: {
        hederakey:
          'ffd3dadf65d2fb2889f3a22de0aab48691ee8a3d3e0ea8a70c2b48482a08bb68'
      }
    },
    parseUri: {
      'address only': ['0.0.443395', '0.0.443395'],
      'invalid address': [
        'HBARHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL',
        'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5FAD',
        'GDUHWCM6NMEVYZKLPJBS45H5OFRVUO4KOIVBIGWZEPMZUOTHBGOL5'
      ],
      'uri address': ['hedera:0.0.443395', '0.0.443395'],
      'uri address with amount': [
        'hedera:0.0.443395?amount=12345.6789',
        '0.0.443395',
        '1234567890000',
        'HBAR'
      ],
      'uri address with unique identifier': [
        'hedera:0.0.443395?memo=123456789&memo_type=MEMO_ID',
        '0.0.443395',
        'HBAR'
      ],
      'uri address with unique identifier and without network prefix': [
        '0.0.443395?memo=123456789&memo_type=MEMO_ID',
        '0.0.443395',
        'HBAR'
      ],
      'uri address with amount & label': [
        'hedera:0.0.443395?amount=1234.56789&label=Johnny%20Ripple',
        '0.0.443395',
        '123456789000',
        'HBAR',
        'Johnny Ripple'
      ],
      'uri address with amount, label & message': [
        'hedera:0.0.443395?amount=1234.56789&label=Johnny%20Ripple&msg=Hello%20World,%20I%20miss%20you%20!',
        '0.0.443395',
        '123456789000',
        'HBAR',
        'Johnny Ripple',
        'Hello World, I miss you !'
      ],
      'uri address with unsupported param': [
        'hedera:0.0.443395?unsupported=helloworld&amount=12345.6789',
        '0.0.443395',
        '1234567890000',
        'HBAR'
      ]
    },
    encodeUri: {
      'address only': [
        {
          publicAddress: '0.0.443395'
        },
        '0.0.443395'
      ],
      'weird address': [
        {
          publicAddress: '0.0.443395'
        },
        '0.0.443395'
      ],
      'invalid address': [
        { publicAddress: 'rf1GeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn' },
        { publicAddress: 'sf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn' },
        { publicAddress: 'rf1BiGeXwwQol8Z2ueFYTEXSwuJYfV2Jpn' }
      ],
      'address & amount': [
        {
          publicAddress: '0.0.443395',
          nativeAmount: '123456780000'
        },
        'hedera:0.0.443395?amount=1234.5678'
      ],
      'address, amount, and label': [
        {
          publicAddress: '0.0.443395',
          nativeAmount: '1230',
          currencyCode: 'HBAR',
          label: 'Johnny Ripple'
        },
        'hedera:0.0.443395?amount=0.0000123&label=Johnny%20Ripple'
      ],
      'address, amount, label, & message': [
        {
          publicAddress: '0.0.443395',
          nativeAmount: '1230',
          currencyCode: 'HBAR',
          label: 'Johnny Ripple',
          message: 'Hello World, I miss you !'
        },
        'hedera:0.0.443395?amount=0.0000123&label=Johnny%20Ripple&message=Hello%20World,%20I%20miss%20you%20!'
      ]
    }
  }
]
// 302e020100300506032b657004220420ffd3dadf65d2fb2889f3a22de0aab48691ee8a3d3e0ea8a70c2b48482a08bb68
// 302e020100300506032b657004220420906327db5cbe7ece6bf2478b907d668b99f7241c750413e4712237ee6fc68523
