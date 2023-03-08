// ---------------------------------------------------------------------------
// All code below provided by smartpay.com.vc
// ---------------------------------------------------------------------------

export const formatPixKey = (pixkey: string): [boolean, string] => {
  // email
  if (pixkey.includes('@')) {
    if (!isMail(pixkey)) {
      return [false, 'Invalid Email']
    }
    return [true, pixkey.toLowerCase()]
  }

  // phone
  if (pixkey.includes('+')) {
    pixkey = '+' + pixkey.replace(/[^\d]+/g, '')
    if (pixkey.length !== 14) {
      return [false, 'Invalid Phone number']
    }
    if (pixkey.substring(0, 3) !== '+55') {
      return [false, 'Not brasilian number']
    }
    return [true, pixkey]
  }

  // key
  if (pixkey.length === 36) {
    return [true, pixkey]
  }

  // formated cnpj
  if (pixkey.length === 18) {
    if (!/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(pixkey)) {
      return [false, 'invalid pixkey']
    }
    if (!isCnpj(pixkey)) {
      return [false, 'invalid cnpj']
    }
    pixkey = pixkey.replace(/[^\d]+/g, '')
    return [true, pixkey]
  }

  // fone with missing +
  if (pixkey.length === 13) {
    if (/^\d+$/.test(pixkey)) {
      if (pixkey.substr(0, 2) !== '55') {
        return [false, 'invalid pixkey']
      }
      return [true, '+' + pixkey]
    }
  }

  // every other option has at least 11 chars.
  if (pixkey.length < 11) {
    return [false, 'invalid pixkey']
  }

  // cnpj or formated cpf
  if (pixkey.length === 14) {
    // unformated cnpj
    if (/^\d+$/.test(pixkey)) {
      if (!isCnpj(pixkey)) {
        return [false, 'invalid pixkey']
      }
      return [true, pixkey]
    }
    // formated cpf
    if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(pixkey)) {
      if (!isCpf(pixkey)) {
        return [false, 'invalid cpf']
      }
      return [true, pixkey.replace(/[^\d]+/g, '')]
    }
  }

  // informated cpf or phone without country
  if (pixkey.length === 11) {
    if (!/^\d+$/.test(pixkey)) {
      return [false, 'invalid pixkey']
    }
    if (isCpf(pixkey)) {
      return [true, pixkey.replace(/[^\d]+/g, '')]
    }
    if (pixkey.charAt(0) === '0') {
      return [false, 'invalid pixkey']
    }
    return [true, '+55' + pixkey]
  }

  // eigher wrong formated cpf or formated phone number
  pixkey = pixkey.replace(/[^\d]+/g, '')
  if (pixkey.length === 12) {
    if (pixkey.charAt(0) !== '0') {
      return [false, 'invalid pixkey']
    }
    return [true, '+55' + pixkey.substr(1)]
  }

  if (pixkey.length === 11) {
    if (isCpf(pixkey)) {
      return [true, pixkey]
    }
    return [true, '+55' + pixkey]
  }
  return [false, 'invalid pixkey']
}

function isMail(email: string): boolean {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(String(email).toLowerCase())
}

function isCpf(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]+/g, '')
  if (cpf === '') {
    return false
  }
  if (
    cpf.length !== 11 ||
    cpf === '00000000000' ||
    cpf === '11111111111' ||
    cpf === '22222222222' ||
    cpf === '33333333333' ||
    cpf === '44444444444' ||
    cpf === '55555555555' ||
    cpf === '66666666666' ||
    cpf === '77777777777' ||
    cpf === '88888888888' ||
    cpf === '99999999999'
  ) {
    return false
  }
  let Soma
  let Resto
  Soma = 0

  for (let i = 1; i <= 9; i++)
    Soma = Soma + parseInt(cpf.substring(i - 1, i)) * (11 - i)
  Resto = (Soma * 10) % 11

  if (Resto === 10 || Resto === 11) Resto = 0
  if (Resto !== parseInt(cpf.substring(9, 10))) return false

  Soma = 0
  for (let i = 1; i <= 10; i++)
    Soma = Soma + parseInt(cpf.substring(i - 1, i)) * (12 - i)
  Resto = (Soma * 10) % 11

  if (Resto === 10 || Resto === 11) Resto = 0
  if (Resto !== parseInt(cpf.substring(10, 11))) return false
  return true
}

function isCnpj(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]+/g, '')
  if (cnpj === '') {
    return false
  }
  if (cnpj.length !== 14) {
    return false
  }
  if (
    cnpj === '00000000000000' ||
    cnpj === '11111111111111' ||
    cnpj === '22222222222222' ||
    cnpj === '33333333333333' ||
    cnpj === '44444444444444' ||
    cnpj === '55555555555555' ||
    cnpj === '66666666666666' ||
    cnpj === '77777777777777' ||
    cnpj === '88888888888888' ||
    cnpj === '99999999999999'
  ) {
    return false
  }

  let tamanho = cnpj.length - 2
  let numeros = cnpj.substring(0, tamanho)
  const digitos = cnpj.substring(tamanho)
  let soma = 0
  let pos = tamanho - 7
  for (let i = tamanho; i >= 1; i--) {
    soma += Number(numeros.charAt(tamanho - i)) * pos--
    if (pos < 2) pos = 9
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado !== Number(digitos.charAt(0))) {
    return false
  }
  tamanho = tamanho + 1
  numeros = cnpj.substring(0, tamanho)
  soma = 0
  pos = tamanho - 7
  for (let i = tamanho; i >= 1; i--) {
    soma += Number(numeros.charAt(tamanho - i)) * pos--
    if (pos < 2) {
      pos = 9
    }
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado !== Number(digitos.charAt(1))) {
    return false
  }
  return true
}

export function computeCRC(str: string, invert: boolean = false): string {
  const bytes = textEncode(str)
  const crcTable = [
    0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7, 0x8108,
    0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef, 0x1231, 0x0210,
    0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6, 0x9339, 0x8318, 0xb37b,
    0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de, 0x2462, 0x3443, 0x0420, 0x1401,
    0x64e6, 0x74c7, 0x44a4, 0x5485, 0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee,
    0xf5cf, 0xc5ac, 0xd58d, 0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6,
    0x5695, 0x46b4, 0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d,
    0xc7bc, 0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
    0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b, 0x5af5,
    0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12, 0xdbfd, 0xcbdc,
    0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a, 0x6ca6, 0x7c87, 0x4ce4,
    0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41, 0xedae, 0xfd8f, 0xcdec, 0xddcd,
    0xad2a, 0xbd0b, 0x8d68, 0x9d49, 0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13,
    0x2e32, 0x1e51, 0x0e70, 0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a,
    0x9f59, 0x8f78, 0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e,
    0xe16f, 0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
    0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e, 0x02b1,
    0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256, 0xb5ea, 0xa5cb,
    0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d, 0x34e2, 0x24c3, 0x14a0,
    0x0481, 0x7466, 0x6447, 0x5424, 0x4405, 0xa7db, 0xb7fa, 0x8799, 0x97b8,
    0xe75f, 0xf77e, 0xc71d, 0xd73c, 0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657,
    0x7676, 0x4615, 0x5634, 0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9,
    0xb98a, 0xa9ab, 0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882,
    0x28a3, 0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
    0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92, 0xfd2e,
    0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9, 0x7c26, 0x6c07,
    0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1, 0xef1f, 0xff3e, 0xcf5d,
    0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8, 0x6e17, 0x7e36, 0x4e55, 0x5e74,
    0x2e93, 0x3eb2, 0x0ed1, 0x1ef0
  ]

  let crc = 0xffff
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i]
    const j = (c ^ (crc >> 8)) & 0xff
    crc = crcTable[j] ^ (crc << 8)
  }

  const answer = (crc ^ 0) & 0xffff
  const hex = numToHex(answer, 4)

  if (invert) {
    return hex.slice(2) + hex.slice(0, 2)
  }
  return hex
}

function numToHex(n: number, digits: number): string {
  const hex = n.toString(16).toUpperCase()
  if (digits > 0) {
    return ('0'.repeat(digits) + hex).slice(-digits)
  }
  return hex.length % 2 === 0 ? hex : '0' + hex
}

function textEncode(string: string): Uint8Array {
  let pos = 0
  const len = string.length

  let at = 0 // output position
  let tlen = Math.max(32, len + (len >>> 1) + 7) // 1.5x size
  let target = new Uint8Array((tlen >>> 3) << 3) // ... but at 8 byte offset

  while (pos < len) {
    let value = string.charCodeAt(pos++)
    if (value >= 0xd800 && value <= 0xdbff) {
      // high surrogate
      if (pos < len) {
        const extra = string.charCodeAt(pos)
        if ((extra & 0xfc00) === 0xdc00) {
          ++pos
          value = ((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000
        }
      }
      if (value >= 0xd800 && value <= 0xdbff) {
        continue // drop lone surrogate
      }
    }

    // expand the buffer if we couldn't write 4 bytes
    if (at + 4 > target.length) {
      tlen += 8 // minimum extra
      tlen *= 1.0 + (pos / string.length) * 2 // take 2x the remaining
      tlen = (tlen >>> 3) << 3 // 8 byte offset

      const update = new Uint8Array(tlen)
      update.set(target)
      target = update
    }

    if ((value & 0xffffff80) === 0) {
      // 1-byte
      target[at++] = value // ASCII
      continue
    } else if ((value & 0xfffff800) === 0) {
      // 2-byte
      target[at++] = ((value >>> 6) & 0x1f) | 0xc0
    } else if ((value & 0xffff0000) === 0) {
      // 3-byte
      target[at++] = ((value >>> 12) & 0x0f) | 0xe0
      target[at++] = ((value >>> 6) & 0x3f) | 0x80
    } else if ((value & 0xffe00000) === 0) {
      // 4-byte
      target[at++] = ((value >>> 18) & 0x07) | 0xf0
      target[at++] = ((value >>> 12) & 0x3f) | 0x80
      target[at++] = ((value >>> 6) & 0x3f) | 0x80
    } else {
      continue // out of range
    }

    target[at++] = (value & 0x3f) | 0x80
  }

  // Use subarray if slice isn't supported (IE11). This will use more memory
  // because the original array still exists.
  return target.slice != null ? target.slice(0, at) : target.subarray(0, at)
}
