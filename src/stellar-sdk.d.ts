/* eslint-disable @typescript-eslint/no-extraneous-class */

declare module 'stellar-sdk' {
  export class Account {
    constructor(publicKey: string, accountSequence: number)
  }

  export class Asset {
    static native: () => Asset
  }

  export class Keypair {
    static fromRawEd25519Seed: (key: number[]) => Keypair
    static fromSecret: (key: string) => Keypair
    static fromPublicKey: (key: string) => Keypair
    publicKey: () => string
    secret: () => string
  }

  export class Memo {
    static hash: (hex: string) => Memo
    static id: (number: string) => Memo
    static return: (address: string) => Memo
    static text: (text: string) => Memo
  }

  export class Operation {
    static createAccount: (params: any) => Operation
    static payment: (params: any) => Operation
  }

  export class Transaction {
    sign: (keypair: Keypair) => void
    fee: number
  }

  export class TransactionBuilder {
    constructor(account: Account, options: any)
    addMemo: (memo: Memo) => TransactionBuilder
    addOperation: (operation: Operation) => TransactionBuilder
    setTimeout: (time: number) => TransactionBuilder
    build: () => Transaction
  }

  export class Server {
    constructor(server: string)
    serverName: string
  }

  interface StellarApi {
    Account: typeof Account
    Asset: typeof Asset
    Keypair: typeof Keypair
    Memo: typeof Memo
    Network: {
      usePublicNetwork: () => void
    }
    Operation: typeof Operation
    Server: typeof Server
    TransactionBuilder: typeof TransactionBuilder
  }

  const stellarApi: StellarApi
  export default stellarApi
}
