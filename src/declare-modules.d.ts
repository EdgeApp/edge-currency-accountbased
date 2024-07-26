declare module 'eosjs-ecc'
declare module 'ethereumjs-abi'
declare module 'ethereumjs-wallet'
declare module 'ethereumjs-wallet/hdkey'
declare module 'eztz.js'

declare module 'ethereumjs-util' {
  export const isValidAddress: (address: string) => boolean
  export const isValidChecksumAddress: (address: string) => boolean
  export const isValidPrivate: (privateKeyBuffer: Buffer) => boolean
  export const toChecksumAddress: (address: string) => string
  export const pubToAddress: (
    pubKey: Buffer | Uint8Array,
    sanitize?: boolean
  ) => Buffer | Uint8Array
  export const privateToAddress: (
    privateKey: Buffer | Uint8Array
  ) => Buffer | Uint8Array

  export const hashPersonalMessage: (
    message: Buffer | Uint8Array | any[]
  ) => Buffer | Uint8Array
  export const ecsign: (
    msgHash: Buffer | Uint8Array,
    privateKey: Buffer | Uint8Array
  ) => { [k: string]: any }
  export const toRpcSig: (
    v: number,
    r: Buffer | Uint8Array,
    s: Buffer | Uint8Array
  ) => string
  export const keccak256: (
    a: Buffer | Uint8Array | any[] | string | number
  ) => Buffer | Uint8Array
  export const bufferToHex: (buf: Buffer | Uint8Array) => string
  export const setLengthLeft: (
    msg: Buffer | Uint8Array,
    length: number,
    right?: boolean
  ) => Buffer | Uint8Array
  export const toBuffer: (v: any) => Buffer | Uint8Array
}

declare module 'react-native' {
  export const NativeModules: {
    EdgeCurrencyAccountbasedModule: {
      getConstants: () => {
        sourceUri: string
      }
    }
  }
}

declare module 'tronweb' {
  export const utils: {
    abi: {
      decodeParams: (
        names: string[],
        types: string[],
        output: string
      ) => [[{ _hex: string }]]
      encodeParams: (types: string[], values: any[]) => string
    }
    crypto: {
      decode58Check: (addr: string) => number[]
      getBase58CheckAddress: (addrBytes: number[]) => string
      isAddressValid: (base58Address: string) => boolean
      pkToAddress: (privateKey: string) => string
      signTransaction: (privateKey: string, transaction: any) => any
    }
    transaction: {
      txJsonToPb: (contractJson: any) => any
      txPbToTxID: (transaction: any) => string
    }
  }
}

declare module 'bs58' {
  export const encode: (buffer: Buffer | number[] | Uint8Array) => string
  export const decode: (string: string) => Buffer
}
