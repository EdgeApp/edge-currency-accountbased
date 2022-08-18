const fetch = require('node-fetch')
const cleaners = require('cleaners')
const fs = require('fs')

const { asObject, asString, asNumber } = cleaners

// const RPC_URL = 'https://zec.nownodes.io'
const RPC_URL = 'https://zec.getblock.io/mainnet/'
const NUM_BLOCKS_BETWEEN_CHECKPOINTS = 10000

const CHECKPOINT_DIR_PATH = `./src/zcash/zecCheckpoints/`

const API_KEY = process.argv[2]

// file system

const getMostRecentCheckpoint = () => {
  const filenames = fs.readdirSync(CHECKPOINT_DIR_PATH)
  const checkPointHeights = filenames.map(filename =>
    Number(filename.split('.')[0])
  )
  return checkPointHeights.reduce((a, b) => {
    return Math.max(a, b)
  }, 1300000) // 1300000 is the most recent checkpoint provided by the sdk
}

const writeCheckpoint = json =>
  fs.writeFileSync(
    `${CHECKPOINT_DIR_PATH}${json.height}.json`,
    JSON.stringify(json, null, 2) + '\n',
    () => {}
  )

const createCheckpointDir = () => {
  try {
    fs.accessSync(CHECKPOINT_DIR_PATH)
  } catch (e) {
    console.log('Creating Zcash checkpoint directory...')
    fs.mkdirSync(CHECKPOINT_DIR_PATH, { recursive: true })
  }
}

// utils

const toDays = blocks => {
  return (blocks * 75) / 60 / 60 / 24 // 75 second blocks
}

const rpcFetch = async (req, cleaner) => {
  const response = await fetch(RPC_URL, req)
  return cleaner(await response.json())
}

const postRequest = body => ({
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    // 'api-key': API_KEY // nownodes
    'x-api-key': API_KEY // getblock
  },
  body: JSON.stringify(body)
})

// getblock

const getBlockBody = {
  jsonrpc: '1.0',
  id: '1',
  method: 'getblock',
  params: ['-1']
}

const asGetBlockResponse = json =>
  asObject({ result: asObject({ height: asNumber }) })(json).result.height

// z_gettreestate

const getTreeStateBody = height => ({
  jsonrpc: '1.0',
  id: '1',
  method: 'z_gettreestate',
  params: [`${height}`]
})

const asTreeStateResponse = json => {
  const {
    result: {
      height,
      hash,
      time,
      sapling: {
        commitments: { finalState: tree }
      }
    }
  } = asObject({
    result: asObject({
      // network: asString,
      height: asNumber,
      hash: asString,
      time: asNumber,
      sapling: asObject({ commitments: asObject({ finalState: asString }) })
    })
  })(json)

  return { network: 'main', height, hash, time, tree }
}

const run = async () => {
  if (API_KEY == null) {
    console.log('No apikey')
    return
  }

  createCheckpointDir()

  // get most recent checkpoint
  let checkpoint = getMostRecentCheckpoint()
  console.log(`Most recent checkpoint is ${checkpoint}`)

  // get height
  const currentNetworkHeight = await rpcFetch(
    postRequest(getBlockBody),
    asGetBlockResponse
  )
  while (currentNetworkHeight - checkpoint > NUM_BLOCKS_BETWEEN_CHECKPOINTS) {
    checkpoint += NUM_BLOCKS_BETWEEN_CHECKPOINTS
    const treeStateJson = await rpcFetch(
      postRequest(getTreeStateBody(checkpoint)),
      asTreeStateResponse
    )
    writeCheckpoint(treeStateJson)
    console.log(`Saved ${treeStateJson.height}.json`)
  }
  const blocksToCheckpoint =
    checkpoint + NUM_BLOCKS_BETWEEN_CHECKPOINTS - currentNetworkHeight

  console.log(
    `Latest checkout at block ${checkpoint} approximately ${blocksToCheckpoint} blocks (${toDays(
      blocksToCheckpoint
    )} days) to next checkpoint`
  )
}

run().catch(e => console.log(e))
