import { Builtins, Cli } from 'clipanion'
import { makeNodeIo } from 'edge-core-js'
import { red } from 'nanocolors'
import readline from 'node:readline'
import { parse } from 'shell-quote'

import packageJson from '../package.json'
import plugins from '../src/index'
import { CurrencyContext, restoreContext } from './cliContext'
import { makeCliLog } from './cliLog'
import { readCliSettings } from './cliSettings'
import { AddToken } from './commands/addToken'
import { BroadcastTx } from './commands/broadcastTx'
import { CreateKey } from './commands/createKey'
import { DisableToken } from './commands/disableToken'
import { EnableToken } from './commands/enableToken'
import { GetBalance } from './commands/getBalance'
import { ImportKey } from './commands/importKey'
import { KillEngine } from './commands/killEngine'
import { ListPlugins } from './commands/listPlugins'
import { ListTokens } from './commands/listTokens'
import { MakeSpend } from './commands/makeSpend'
import { SaveTx } from './commands/saveTx'
import { SelectPlugin } from './commands/selectPlugin'
import { SignTx } from './commands/signTx'
import { StartEngine } from './commands/startEngine'
import { Status } from './commands/status'

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const isInteractive = args.length === 0

  const cliLog = makeCliLog()
  const io = makeNodeIo('cli/.storage')
  const context: CurrencyContext = {
    ...Cli.defaultContext,
    ...io,
    log: cliLog.log,
    plugins,
    settings: await readCliSettings(io.disklet),
    state: {}
  }
  await restoreContext(context).catch(error => {
    console.log('Could not restore previous session: ', error)
  })

  const cli = new Cli({
    binaryLabel: 'accountbased',
    binaryName: isInteractive ? '' : 'yarn cli',
    binaryVersion: packageJson.version
  })
  cli.register(AddToken)
  cli.register(BroadcastTx)
  cli.register(Builtins.HelpCommand)
  cli.register(Builtins.VersionCommand)
  cli.register(CreateKey)
  cli.register(DisableToken)
  cli.register(EnableToken)
  cli.register(GetBalance)
  cli.register(ImportKey)
  cli.register(KillEngine)
  cli.register(ListPlugins)
  cli.register(ListTokens)
  cli.register(MakeSpend)
  cli.register(SaveTx)
  cli.register(SelectPlugin)
  cli.register(SignTx)
  cli.register(StartEngine)
  cli.register(Status)

  // Non-interactive mode:
  if (!isInteractive) {
    await cli.runExit(args, context)
    await context.state.engine?.killEngine()
    return
  }

  console.log('Use the `--help` command for usage information')

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer(line: string) {
      const commands = cli
        .definitions()
        .map(definition => definition.path.replace(/^ /, ''))
      const match = commands.filter(command => command.startsWith(line))
      return [match.length > 0 ? match : commands, line]
    }
  })

  // Run the prompt loop:
  await new Promise<void>(resolve => {
    function done(): void {
      if (context.state.engine != null) {
        context.state.engine.killEngine().catch(error => console.log(error))
      }
      resolve()
      rl.close()
    }

    function logError(error: unknown): void {
      console.error(red(String(error)))
    }

    async function runLine(text: string): Promise<void> {
      const parsed = parse(text).filter(
        (item): item is string => typeof item === 'string'
      )
      cliLog.print()
      if (parsed.length > 0) await cli.run(parsed, context).catch(logError)
    }

    function prompt(): void {
      rl.question('> ', text => {
        if (text.includes('exit')) return done()
        runLine(text).catch(logError).finally(prompt)
      })
    }

    rl.on('close', done)
    prompt()
  })
}

main().catch(error => console.error(error))
