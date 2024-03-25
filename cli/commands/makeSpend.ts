import { Command, Option } from 'clipanion'
import { EdgeSpendInfo } from 'edge-core-js'

import { CurrencyContext, getCliEngine, indentJson } from '../cliContext'

export class MakeSpend extends Command<CurrencyContext> {
  static paths = [['make-spend']]
  static usage = { description: 'Creates a spend transaction' }

  address = Option.String('--address', { required: true })
  amount = Option.String('--amount', { required: true })
  tokenId = Option.String('--tokenId', { required: false })

  async execute(): Promise<number> {
    const { address, amount, tokenId = null } = this
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
    const tx = await engine.makeSpend(spend)
    state.tx = tx
    stdout.write(indentJson(tx))

    return 0
  }
}
