import { assert } from 'chai'
import { describe, it } from 'mocha'
import TronWeb from 'tronweb'

const tests = {
  '48656C6C6F': 'Hello',
  E282AC: '€',
  F09F9881: '😁',
  C3A9: 'é',
  D09C: 'М',

  // Values that should break decoding but are handled safely
  C2: '�',
  E282: '�',
  F09F: '�',
  C080: '��',
  E08080: '���',
  F0808080: '����',
  EDA080: '���',
  '80F4908080': '�����'
}

describe(`tronweb utf8 decoding`, function () {
  for (const [hex, utf8] of Object.entries(tests)) {
    it(`tronweb utf8 test case ${hex} equals ${utf8}`, function () {
      assert.equal(TronWeb.toUtf8(hex), utf8)
    })
  }
})
