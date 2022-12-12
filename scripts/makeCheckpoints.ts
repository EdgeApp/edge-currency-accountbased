import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import * as fs from 'fs'
import path from 'node:path'
import { promisify } from 'node:util'

const NUM_BLOCKS_BETWEEN_CHECKPOINTS = 10000

const toDays = (blocks: number, blockTime: number): number => {
  return (blocks * blockTime) / 60 / 60 / 24 // 75 second blocks
}

const dotNotationToPath = (definition: Object, packagePath: string): any =>
  // @ts-expect-error
  packagePath.split('.').reduce((o, i) => o[i], definition)

interface Options {
  serviceProtoPath: string
  checkpointsPath: string
  serverUrl: string
  packagePath: string
  lastSdkCheckpointHeight: number
  blockTimeSeconds: number
  ssl: boolean
}

const networks: { [pluginId: string]: Options } = {
  piratechain: {
    serviceProtoPath: path.join(__dirname, '/protos/piratechain/service.proto'),
    checkpointsPath: path.join(
      __dirname,
      '../android/src/main/assets/piratesaplingtree/mainnet/'
    ),
    serverUrl: 'lightd1.pirate.black:9067',
    packagePath: 'pirate.wallet.sdk.rpc',
    lastSdkCheckpointHeight: 2040000,
    blockTimeSeconds: 60,
    ssl: false
  },
  zcash: {
    serviceProtoPath: path.join(__dirname, '/protos/zcash/service.proto'),
    checkpointsPath: path.join(
      __dirname,
      '../android/src/main/assets/saplingtree/mainnet/'
    ),
    serverUrl: 'mainnet.lightwalletd.com:9067',
    packagePath: 'cash.z.wallet.sdk.rpc',
    lastSdkCheckpointHeight: 1300000,
    blockTimeSeconds: 75,
    ssl: true
  }
}

const createClient = (opts: Options): any => {
  const packageDefinition = protoLoader.loadSync(opts.serviceProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  })

  const protoDescriptor = dotNotationToPath(
    grpc.loadPackageDefinition(packageDefinition),
    opts.packagePath
  )

  const client = new protoDescriptor.CompactTxStreamer(
    opts.serverUrl,
    opts.ssl ? grpc.credentials.createSsl() : grpc.credentials.createInsecure() // pirate insecure, zcash ssl
  )
  return client
}

const writeCheckpoint = (path: string, json: any): void => {
  const newCheckpoint = { ...json, tree: json.saplingTree }
  delete newCheckpoint.saplingTree
  delete newCheckpoint.orchardTree

  fs.writeFileSync(
    `${path}/${json.height}.json`,
    JSON.stringify(newCheckpoint, null, 2) + '\n'
  )
}

const getMostRecentCheckpoint = (
  path: string,
  lastSdkCheckpointHeight: number
): number => {
  const filenames = fs.readdirSync(path)
  const checkPointHeights = filenames.map(filename =>
    Number(filename.split('.')[0])
  )
  return checkPointHeights.reduce((a, b) => {
    return Math.max(a, b)
  }, lastSdkCheckpointHeight)
}

const createCheckpointDir = (path: string): void => {
  try {
    fs.accessSync(path)
  } catch (e) {
    console.log('Creating checkpoint directory...')
    fs.mkdirSync(path, { recursive: true })
  }
}

const run = async (opts: Options): Promise<void> => {
  createCheckpointDir(opts.checkpointsPath)

  // get most recent checkpoint
  let checkpoint = getMostRecentCheckpoint(
    opts.checkpointsPath,
    opts.lastSdkCheckpointHeight
  )
  console.log(`Most recent checkpoint is ${checkpoint}`)

  // create client
  const client = createClient(opts)
  const getLightdInfo = promisify(client.GetLightdInfo).bind(client)
  const getTreeState = promisify(client.GetTreeState).bind(client)

  // get height
  const lightdInfo = await getLightdInfo({})
  const currentNetworkHeight = parseInt(lightdInfo.blockHeight)
  console.log(`Current network height is ${currentNetworkHeight}`)

  // create checkpoints
  while (currentNetworkHeight - checkpoint > NUM_BLOCKS_BETWEEN_CHECKPOINTS) {
    checkpoint += NUM_BLOCKS_BETWEEN_CHECKPOINTS
    const treeStateJson = await getTreeState({ height: checkpoint })
    writeCheckpoint(opts.checkpointsPath, treeStateJson)
    console.log(`Saved ${treeStateJson.height}.json`)
  }

  const blocksToCheckpoint =
    checkpoint + NUM_BLOCKS_BETWEEN_CHECKPOINTS - currentNetworkHeight

  console.log(
    `Latest checkpoint at block ${checkpoint} approximately ${blocksToCheckpoint} blocks (${toDays(
      blocksToCheckpoint,
      opts.blockTimeSeconds
    )} days) to next checkpoint\n`
  )
}

const main = async (): Promise<void> => {
  for (const network of Object.keys(networks)) {
    console.log(network)
    await run(networks[network])
  }
}
main().catch(e => console.log(e))
