import { Address } from '@zondax/izari-filecoin'
import { add, sub } from 'biggystring'
import { EdgeTransaction } from 'edge-core-js/types'

import { Filfox, FilfoxMessageDetails } from '../../filecoin/Filfox'
import { EthereumNetworkUpdate } from '../EthereumNetwork'
import {} from '../ethereumSchema'
import { GetTxsParams, NetworkAdapter } from './types'

export interface FilfoxAdapterConfig {
  type: 'filfox'
  servers: string[]
}

export class FilfoxAdapter extends NetworkAdapter<FilfoxAdapterConfig> {
  connect = null
  disconnect = null
  broadcast = null
  getBaseFeePerGas = null
  multicastRpc = null
  fetchBlockheight = null
  fetchNonce = null
  fetchTokenBalance = null
  fetchTokenBalances = null
  subscribeAddressSync = null

  currentScan: Promise<EthereumNetworkUpdate> | undefined

  fetchTxs = async (params: GetTxsParams): Promise<EthereumNetworkUpdate> => {
    try {
      // We shouldn't start scanning if scanning is already happening:
      if (this.currentScan != null) {
        return await this.currentScan
      }

      this.currentScan = this.checkTransactions(params)
      const update = await this.currentScan
      return update
    } catch (error) {
      console.error(error)
      throw error
    } finally {
      this.currentScan = undefined
    }
  }

  private async checkTransactions(
    params: GetTxsParams
  ): Promise<EthereumNetworkUpdate> {
    const { startBlock, currencyCode } = params
    const { publicAddress: addressString } =
      await this.ethEngine.getFreshAddress()

    const handleScanProgress = (progress: number): void => {
      const currentProgress =
        this.ethEngine.tokenCheckTransactionsStatus[
          this.ethEngine.currencyInfo.currencyCode
        ]
      const newProgress = progress

      if (
        // Only send event if we haven't completed sync
        currentProgress < 1 &&
        // Avoid thrashing
        (newProgress >= 1 || newProgress > currentProgress * 1.1)
      ) {
        this.ethEngine.tokenCheckTransactionsStatus[
          this.ethEngine.currencyInfo.currencyCode
        ] = newProgress
        this.ethEngine.updateOnAddressesChecked()
      }
    }

    const handleScan = ({
      tx,
      progress
    }: {
      tx: EdgeTransaction | undefined
      progress: number
    }): void => {
      if (tx != null) {
        this.ethEngine.addTransaction(currencyCode, tx)
        this.onUpdateTransactions()

        // Progress the block-height if the message's height is greater than
        // last poll for block-height.
        if (this.ethEngine.walletLocalData.blockHeight < tx.blockHeight) {
          this.onUpdateBlockHeight(tx.blockHeight)
        }
      }

      handleScanProgress(progress)
    }

    const scanners = [
      // this.scanTransactionsFromFilscan(addressString, handleScan),
      this.scanTransactionsFromFilfox(addressString, handleScan)
    ]

    // Run scanners:
    await Promise.all(scanners)

    // Save the network height to be leveraged in the next scan
    this.ethEngine.walletLocalData.lastAddressQueryHeight =
      this.ethEngine.walletLocalData.blockHeight
    this.ethEngine.walletLocalDataDirty = true

    // Make sure the sync progress is 100%
    handleScanProgress(1)

    return {
      tokenTxs: {
        [currencyCode]: {
          blockHeight: startBlock,
          // This adapter manages transaction processing, so return an empty set
          // each time the query finishes.
          edgeTransactions: []
        }
      },
      server: this.config.servers.join(',')
    }
  }

  private makeFilfoxApi(baseUrl: string): Filfox {
    return new Filfox(baseUrl, this.ethEngine.fetchCors)
  }

  private onUpdateBlockHeight(networkBlockHeight: number): void {
    if (this.ethEngine.walletLocalData.blockHeight !== networkBlockHeight) {
      this.ethEngine.walletLocalData.blockHeight = networkBlockHeight
      this.ethEngine.walletLocalDataDirty = true
      this.ethEngine.currencyEngineCallbacks.onBlockHeightChanged(
        this.ethEngine.walletLocalData.blockHeight
      )
    }
  }

  private onUpdateTransactions(): void {
    this.ethEngine.sendTransactionEvents()
  }

  private async scanTransactionsFromFilfox(
    addressString: string,
    onScan: (event: {
      tx: EdgeTransaction | undefined
      progress: number
    }) => void
  ): Promise<void> {
    const processedMessageCids = new Set<string>()

    // Initial request to get the totalCount
    const initialResponse = await this.serialServers(
      async baseUrl =>
        await this.makeFilfoxApi(baseUrl).getAccountTransfers(
          addressString,
          0,
          1
        )
    )
    let transferCount = initialResponse.totalCount

    // Calculate total pages and set a reasonable transfersPerPage
    const transfersPerPage = 20
    let totalPages = Math.ceil(transferCount / transfersPerPage)

    let transfersChecked = 0
    for (
      let currentPageIndex = totalPages - 1;
      currentPageIndex >= 0;
      currentPageIndex--
    ) {
      const transfersResponse = await this.serialServers(
        async baseUrl =>
          await this.makeFilfoxApi(baseUrl).getAccountTransfers(
            addressString,
            currentPageIndex,
            transfersPerPage
          )
      )

      let transfers = transfersResponse.transfers

      // If totalCount has changed, make an additional call to get the missed transfers
      if (transfersResponse.totalCount !== transferCount) {
        // How many transfers were missed
        const missedTransfersCount =
          transfersResponse.totalCount - transferCount

        // Calculate the transfer page index to query for the missing transfers
        const previousPageIndex = currentPageIndex + 1 // Add because we're querying in reverse
        const missedTransfersPageIndex =
          previousPageIndex * (transfersPerPage / missedTransfersCount)

        const missedTransfersResponse = await this.serialServers(
          async baseUrl =>
            await this.makeFilfoxApi(baseUrl).getAccountTransfers(
              addressString,
              missedTransfersPageIndex,
              missedTransfersCount
            )
        )
        transfers = [...transfers, ...missedTransfersResponse.transfers]

        // Update the totalCount
        transferCount = transfersResponse.totalCount
        // Recalculate total pages
        totalPages = Math.ceil(transferCount / transfersPerPage)
      }

      // Loop through transfers in reverse
      for (let i = transfers.length - 1; i >= 0; i--) {
        // Exit early if the engine has been stopped
        if (!this.ethEngine.engineOn) return

        const transfer = transfers[i]

        // Avoid over-processing:
        let tx: EdgeTransaction | undefined
        if (
          // Skip transfers prior to the last sync height
          transfer.height >=
            this.ethEngine.walletLocalData.lastAddressQueryHeight &&
          // Skip processed message (there can be many transfers per message)
          !processedMessageCids.has(transfer.message)
        ) {
          // Progress the last query height to optimize the next scan
          if (
            transfer.height >
            this.ethEngine.walletLocalData.lastAddressQueryHeight
          ) {
            this.ethEngine.walletLocalData.lastAddressQueryHeight =
              transfer.height
            this.ethEngine.walletLocalDataDirty = true
          }
          // Process message into a transaction
          const messageDetails = await this.serialServers(
            async baseUrl =>
              await this.makeFilfoxApi(baseUrl).getMessageDetails(
                transfer.message
              )
          )
          tx = this.filfoxMessageToEdgeTransaction(
            addressString,
            messageDetails
          )
        }

        // Calculate the progress
        const progress =
          transferCount === 0 ? 1 : ++transfersChecked / transferCount

        // Trigger scan progress event
        onScan({ tx, progress })

        // Keep track of messages to avoid over-processing:
        processedMessageCids.add(transfer.message)
      }
    }
  }

  private readonly filfoxMessageToEdgeTransaction = (
    addressString: string,
    messageDetails: FilfoxMessageDetails
  ): EdgeTransaction => {
    const ourReceiveAddresses = []

    // Handle network fees:
    const networkFee = messageDetails.transfers
      .filter(
        transfer =>
          transfer.type === 'miner-fee' || transfer.type === 'burner-fee'
      )
      .reduce((sum, transfer) => add(sum, transfer.value), '0')

    // Infer the network prefix from the messageDetails:
    const fromAddress = Address.fromString(messageDetails.from)
    const networkPrefix = fromAddress.getNetworkPrefix()

    // Use the network prefix and the addressString to create a formatted address:
    const ownFilecoinFormattedAddress = Address.fromEthAddress(
      networkPrefix,
      addressString
    ).toString()

    // Handle native amount:
    let nativeAmount: string
    if (messageDetails.from === ownFilecoinFormattedAddress) {
      // For spends, always include network fee
      nativeAmount = `-${networkFee}`
      if (messageDetails.to !== ownFilecoinFormattedAddress) {
        // For spends not to self, subtract tx value
        nativeAmount = sub(nativeAmount, messageDetails.value)
      }
    } else {
      // For receives nativeAMount is always positively the value
      nativeAmount = messageDetails.value
      ourReceiveAddresses.push(addressString)
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: messageDetails.height,
      currencyCode: this.ethEngine.currencyInfo.currencyCode,
      date: messageDetails.timestamp,
      isSend: nativeAmount.startsWith('-'),
      memos: [],
      nativeAmount,
      networkFee,
      networkFees: [],
      otherParams: {},
      ourReceiveAddresses, // blank if you sent money otherwise array of addresses that are yours in this transaction
      signedTx: '',
      tokenId: null,
      txid: messageDetails.ethTransactionHash,
      walletId: this.ethEngine.walletId
    }

    return edgeTransaction
  }
}
