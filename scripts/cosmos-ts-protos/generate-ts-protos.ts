import { execSync } from 'child_process'
import { makeNodeDisklet } from 'disklet'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const disklet = makeNodeDisklet(join(__dirname, '../../'))
const tmp = join(__dirname, './tmp')
const binExecutable = join(
  __dirname,
  '../../node_modules/.bin/protoc-gen-ts_proto'
)
const commonPath = 'scripts/cosmos-ts-protos/tmp/proto/'

const chains: {
  [key: string]: { files: string[]; protoDirs: string[]; zip: string }
} = {
  thorchainrune: {
    files: [
      'thornode-mainnet/proto/thorchain/v1/x/thorchain/types/msg_deposit.proto',
      'thornode-mainnet/proto/thorchain/v1/common/common.proto',
      'thornode-mainnet/proto/thorchain/v1/x/thorchain/types/msg_send.proto',
      'thornode-mainnet/third_party/proto/cosmos/base/v1beta1/coin.proto'
    ],
    protoDirs: ['thornode-mainnet/proto', 'thornode-mainnet/third_party/proto'],
    zip: 'https://gitlab.com/thorchain/thornode/-/archive/mainnet/thornode-mainnet.zip'
  }
}

async function main(): Promise<void> {
  if (!existsSync(tmp)) mkdirSync(tmp)
  for (const [name, { files, protoDirs, zip }] of Object.entries(chains)) {
    await getZip(name, zip)

    const tmpProtoFiles = `${tmp}/proto/${name}`
    if (!existsSync(tmpProtoFiles)) {
      mkdirSync(tmpProtoFiles, { recursive: true })
    }

    files.forEach(file => generateTsFromProto(tmpProtoFiles, protoDirs, file))
    const generatedFilePaths = await listFiles(`./${commonPath}${name}`)
    await copyFiles('./', './src/cosmos/info/proto/', generatedFilePaths)
  }
}

/**
 * Recursively gather all files from a folder
 */
async function listFiles(path: string): Promise<string[]> {
  const out: string[] = []

  async function listGeneratedFiles(path: string): Promise<void> {
    const contents = await disklet.list(path)
    for (const [path, type] of Object.entries(contents)) {
      if (type === 'file') {
        out.push(path)
      } else {
        await listGeneratedFiles(path)
      }
    }
  }
  await listGeneratedFiles(path)

  return out
}

/**
 * Generate typescript from .proto file
 */
function generateTsFromProto(
  outDir: string,
  protoDirs: string[],
  file: string
): void {
  const protoDirArgs = protoDirs.map(directoryPath => {
    const protoDirArg = `'--proto_path=${tmp}/${directoryPath}'`
    if (!existsSync(protoDirArg)) mkdirSync(protoDirArg, { recursive: true })
    return protoDirArg
  })
  const filePath = `${tmp}/${file}`

  loudExec([
    `protoc`,
    `'--plugin=${binExecutable}'`,
    `'--ts_proto_out=${outDir}'`,
    ...protoDirArgs,
    `'--ts_proto_opt=esModuleInterop=true,forceLong=long,useOptionals=true'`,
    filePath
  ])
}

/**
 * Downloads & unpacks a zip file.
 */
function getZip(name: string, uri: string): void {
  const path = join(tmp, name)

  if (!existsSync(path)) {
    console.log(`Getting ${name}...`)
    loudExec(['curl', '-L', '-o', path, uri])
  }

  // Unzip:
  loudExec(['unzip', '-u', path])
}

/**
 * Copies just the files we need from the tmp directory to the src directory
 */
async function copyFiles(
  from: string,
  to: string,
  files: string[]
): Promise<void> {
  for (const file of files) {
    await disklet.setText(
      to + file.replace(`${commonPath}`, ''),
      await disklet.getText(from + file)
    )
  }
}

/**
 * Runs a command and displays its results.
 */
function loudExec(argv: string[]): void {
  execSync(argv.join(' '), {
    cwd: tmp,
    stdio: 'inherit',
    encoding: 'utf8'
  })
}

main().catch(error => console.log(error))
