import { Command } from 'clipanion'

import { CurrencyContext } from '../cliContext'

export class ListPlugins extends Command<CurrencyContext> {
  static paths = [['list-plugins']]
  static usage = { description: 'Lists available plugins' }

  async execute(): Promise<number> {
    const { plugins, stdout } = this.context

    const pluginIds = Object.keys(plugins).sort((a, b) => a.localeCompare(b))
    stdout.write(pluginIds.join('\n'))

    return 0
  }
}
