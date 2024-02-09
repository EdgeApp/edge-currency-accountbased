import {
  ChainRegistryFetcher,
  ChainRegistryFetcherOptions
} from '@chain-registry/client'
import * as fs from 'fs'
import * as path from 'path'

const chains: { [pluginId: string]: { chainName: string; url: string } } = {
  coreum: {
    chainName: 'coreum',
    url: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/coreum/chain.json'
  },
  cosmoshub: {
    chainName: 'cosmoshub',
    url: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/chain.json'
  },
  osmosis: {
    chainName: 'osmosis',
    url: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/chain.json'
  },
  thorchainrune: {
    chainName: 'thorchain',
    url: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/thorchain/chain.json'
  }
}

const options: ChainRegistryFetcherOptions = {
  urls: Object.values(chains).map(chain => chain.url)
}
const registryFetcher = new ChainRegistryFetcher(options)

registryFetcher
  .fetchUrls()
  .then(() => {
    const targetDirectory = path.join(
      __dirname,
      '../../src/cosmos/info/chain-json'
    )

    if (!fs.existsSync(targetDirectory)) {
      fs.mkdirSync(targetDirectory, { recursive: true })
    }

    for (const pluginId of Object.keys(chains)) {
      const jsonData = registryFetcher.getChain(chains[pluginId].chainName)
      const jsonString = JSON.stringify(jsonData, null, 2)
      const filePath = path.join(targetDirectory, `${pluginId}.json`)

      fs.writeFileSync(filePath, jsonString, 'utf-8')
    }
  })
  .catch(e => {
    console.log(e)
  })
