export default [
  {
    pluginName: 'ripple',
    WALLET_TYPE: 'wallet:ripple',
    'Test Currency code': 'XRP',
    parseUri: {
      'ripple.com invalid uri handler': [
        'ripples://ripple.co//send?to=rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn'
      ],
      'ripple.com invalid uri domain': [
        'https://ripple.co//send?to=rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn'
      ],
      'ripple.com invalid uri path': [
        'https://ripple.co//sends?to=rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn'
      ],
      'ripple.com invalid uri param': [
        'https://ripple.co//sends?tos=rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn'
      ],
      'ripple.com uri address': [
        'https://ripple.com//send?to=rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn'
      ],
      'ripple.com uri address with amount': [
        'https://ripple.com//send?to=rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn&amount=12345.6789',
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
        '12345678900',
        'XRP'
      ],
      'ripple.com uri address with unique identifier': [
        'https://ripple.com//send?to=rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn&dt=123456789',
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
        '123456789',
        'XRP'
      ],
      'ripple.com uri address with amount & label': [
        'https://ripple.com//send?to=rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn&amount=1234.56789&label=Johnny%20Ripple',
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
        '1234567890',
        'XRP',
        'Johnny Ripple'
      ],
      'ripple.com uri address with amount, label & message': [
        'https://ripple.com//send?to=rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn&amount=1234.56789&label=Johnny%20Ripple&message=Hello%20World,%20I%20miss%20you%20!',
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
        '1234567890',
        'XRP',
        'Johnny Ripple',
        'Hello World, I miss you !'
      ],
      'ripple.com uri address with unsupported param': [
        'https://ripple.com//send?to=rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn&unsupported=helloworld&amount=12345.6789',
        'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn',
        '12345678900',
        'XRP'
      ]
    }
  }
]
