declare module 'eosjs-ecc'
declare module 'ethereumjs-abi'
declare module 'ethereumjs-util'
declare module 'ethereumjs-wallet'
declare module 'ethereumjs-wallet/hdkey'
declare module 'eztz.js'

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
