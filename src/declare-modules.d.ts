declare module 'eosjs-ecc'
declare module 'ethereumjs-abi'
declare module 'ethereumjs-util'
declare module 'ethereumjs-wallet'
declare module 'ethereumjs-wallet/hdkey'
declare module 'eztz.js'

declare module 'react-native' {
  interface EdgeCurrencyAccountbasedModule {
    getConstants: () => {
      sourceUri: string
    }
  }

  declare const NativeModules: {
    EdgeCurrencyAccountbasedModule: EdgeCurrencyAccountbasedModule
  }
}

declare module 'tronweb' {
  export const utils: {
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
