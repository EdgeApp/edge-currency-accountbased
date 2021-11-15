const fetch = require('node-fetch')
const cleaners = require('cleaners')
const fs = require('fs')
const path = require('path')

const { asObject, asString, asNumber } = cleaners

const RPC_URL = 'https://zec.nownodes.io'
const NUM_BLOCKS_BETWEEN_CHECKPOINTS = 10000
const GUI_PATH = path.basename(path.resolve())
const CHECKPOINT_DIR_READ_PATH = `../${GUI_PATH}/android/app/build/intermediates/merged_assets/debug/out/saplingtree/mainnet/`

const CHECKPOINT_DIR_WRITE_PATH = `../${GUI_PATH}/android/app/src/main/assets/saplingtree/mainnet/`

const API_KEY = process.argv[2]

// file system

const getMostRecentCheckpoint = () => {
  const filenames = fs.readdirSync(CHECKPOINT_DIR_READ_PATH)
  const checkPointHeights = filenames.map(filename =>
    Number(filename.split('.')[0])
  )
  return checkPointHeights.reduce((a, b) => {
    return Math.max(a, b)
  }, 0)
}

const writeCheckpoint = json =>
  fs.writeFileSync(
    `${CHECKPOINT_DIR_WRITE_PATH}${json.height}.json`,
    JSON.stringify(json, null, 2) + '\n',
    () => {}
  )

const createCheckpointDir = () => {
  try {
    fs.accessSync(CHECKPOINT_DIR_WRITE_PATH)
  } catch (e) {
    console.log('Creating Zcash checkpoint directory...')
    fs.mkdirSync(CHECKPOINT_DIR_WRITE_PATH, { recursive: true })
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
    'api-key': API_KEY
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

  // get most recent checkpoint
  let checkpoint = getMostRecentCheckpoint()
  console.log(`Most recent checkpoint is ${checkpoint}`)
  createCheckpointDir()

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
