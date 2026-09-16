import { asJSON, asObject, asUnknown } from 'cleaners'
import { Command, Option } from 'clipanion'
import { EdgeSpendInfo } from 'edge-core-js'

import { CurrencyContext, getCliEngine, indentJson } from '../cliContext'

const asOtherParams = asJSON(asObject(asUnknown))

export class MakeSpend extends Command<CurrencyContext> {
  static paths = [['make-spend']]
  static usage = {
    description: 'Creates a spend transaction',
    details: `Use --otherParams to hand the engine a prebuilt payload, such as
      the TRON contract call a DEX swap produces.`
  }

  address = Option.String('--address', { required: true })
  amount = Option.String('--amount', { required: true })
  tokenId = Option.String('--tokenId', { required: false })
  otherParams = Option.String('--otherParams', { required: false })

  async execute(): Promise<number> {
    const { address, amount, otherParams, tokenId = null } = this
    const { stdout, state } = this.context
    const { engine } = await getCliEngine(this.context)

    const spend: EdgeSpendInfo = {
      tokenId,
      spendTargets: [
        {
          nativeAmount: amount,
          publicAddress: address
        }
      ]
    }
    if (otherParams != null) {
      spend.otherParams = asOtherParams(otherParams)
    }
    const tx = await engine.makeSpend(spend)
    state.tx = tx
    stdout.write(indentJson(tx))

    return 0
  }
}
