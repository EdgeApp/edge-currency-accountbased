import * as Cardano from '@emurgo/cardano-serialization-lib-nodejs'

export const parseOutputAddress = (address: string): Cardano.Address => {
  try {
    if (Cardano.ByronAddress.is_valid(address)) {
      return Cardano.ByronAddress.from_base58(address).to_address()
    } else {
      return Cardano.Address.from_bech32(address)
    }
  } catch (_) {
    throw new Error('InvalidPublicAddressError')
  }
}
