import {
  asArray,
  asEither,
  asNumber,
  asObject,
  asOptional,
  asString,
  asValue,
  Cleaner
} from 'cleaners'

import { asAny } from '../common/types'

type BaseTxBody = ReturnType<typeof asBaseTxBody>
const asBaseTxBody = asObject({
  inputs: asArray(
    asObject({
      transaction_id: asString,
      index: asNumber
    })
  ),
  outputs: asArray(
    asObject({
      address: asString,
      amount: asObject({
        coin: asString
      })
    })
  ),
  fee: asString,
  ttl: asString,
  // See CertificateEnumJSON type in @emurgo/cardano-serialization-lib-nodejs
  certs: asOptional(
    asArray(
      asEither(
        asObject({
          StakeRegistrationJSON: asAny
        }),
        asObject({
          StakeDelegationJSON: asAny
        }),
        asObject({
          StakeDeregistrationJSON: asAny
        })
      )
    )
  ),
  withdrawals: asOptional(asAny)
})

/**
 * A cleaner to validate the transaction is a staking transaction and not any
 * other type of spending transaction. This is used to ensure that the plugin
 * implementation is not signing any transaction it shouldn't be.
 */
export const asStakingTxBody =
  (address: string): Cleaner<BaseTxBody> =>
  (raw: unknown) => {
    const validTx = asBaseTxBody(raw)
    // Only allow outputs to the given address
    validTx.outputs.forEach(output => asValue(address)(output.address))
    // Only allow these certificate types
    validTx.certs?.forEach(cert =>
      asEither(
        asObject({
          StakeRegistrationJSON: asAny
        }),
        asObject({
          StakeDelegationJSON: asAny
        })
      )(cert)
    )

    return validTx
  }
