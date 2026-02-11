import { Address } from '@zondax/izari-filecoin'
import { add, sub } from 'biggystring'
import {
  EdgeToken,
  EdgeTokenId,
  EdgeTransaction,
  EdgeTxAmount
} from 'edge-core-js/types'

import { exponentialBackoff } from '../../common/utils'
import {
  Filfox,
  FilfoxMessageDetails,
  FilfoxTokenTransfer
} from '../../filecoin/Filfox'
import { EthereumNetworkUpdate } from '../EthereumNetwork'
import { GetTxsParams, NetworkAdapter } from './networkAdapterTypes'

export interface FilfoxAdapterConfig {
  type: 'filfox'
  servers: string[]
}

export class FilfoxAdapter extends NetworkAdapter<FilfoxAdapterConfig> {
  batchMulticastRpc = null
  broadcast = null
  connect = null
  disconnect = null
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
      this.logError(
        'FilfoxAdapter fetchTxs failed',
        error instanceof Error ? error : new Error(String(error))
      )
      throw error
    } finally {
      this.currentScan = undefined
    }
  }

  private async checkTransactions(
    params: GetTxsParams
  ): Promise<EthereumNetworkUpdate> {
    const { startBlock, tokenId } = params
    const { publicAddress: addressString } =
      await this.ethEngine.getFreshAddress()

    // Track the highest block height of transactions processed
    let highestProcessedBlockHeight = startBlock

    const handleScan = ({
      tx,
      progress,
      tokenId
    }: {
      tx: EdgeTransaction | undefined
      progress: number
      tokenId: EdgeTokenId
    }): void => {
      if (tx != null) {
        this.ethEngine.addTransaction(tokenId, tx)
        this.onUpdateTransactions()

        // Track the highest block height processed
        if (tx.blockHeight > highestProcessedBlockHeight) {
          highestProcessedBlockHeight = tx.blockHeight
        }

        // Progress the block-height if the message's height is greater than
        // last poll for block-height.
        if (this.ethEngine.walletLocalData.blockHeight < tx.blockHeight) {
          this.ethEngine.updateBlockHeight(tx.blockHeight)
        }
      }

      this.ethEngine.syncTracker.updateHistoryRatio(tokenId, progress, 0.1)
    }

    const scanners = [
      // Scan native FIL transactions
      this.scanTransactionsFromFilfox(addressString, event =>
        handleScan({
          ...event,
          tokenId: null
        })
      ),
      // Scan token transactions
      this.scanTokenTransactionsFromFilfox(
        addressString,
        startBlock,
        handleScan
      )
    ]

    // Run scanners:
    await Promise.all(scanners)

    // Save the network height to be leveraged in the next scan
    this.ethEngine.walletLocalData.lastAddressQueryHeight =
      this.ethEngine.walletLocalData.blockHeight
    this.ethEngine.walletLocalDataDirty = true

    // Make sure the sync progress is 100% for main currency
    this.ethEngine.syncTracker.updateHistoryRatio(null, 1)

    return {
      tokenTxs: new Map([
        [
          tokenId,
          {
            blockHeight: highestProcessedBlockHeight,
            // This adapter manages transaction processing, so return an empty set
            // each time the query finishes.
            edgeTransactions: []
          }
        ]
      ]),
      server: this.config.servers.join(',')
    }
  }

  private makeFilfoxApi(baseUrl: string): Filfox {
    return new Filfox(baseUrl, this.ethEngine.engineFetch)
  }

  private onUpdateTransactions(): void {
    this.ethEngine.sendTransactionEvents()
  }

  private async scanTokenTransactionsFromFilfox(
    addressString: string,
    startBlock: number,
    onScan: (event: {
      tx: EdgeTransaction | undefined
      progress: number
      tokenId: EdgeTokenId
    }) => void
  ): Promise<void> {
    // If no tokens are enabled, complete sync for all tokens immediately
    if (this.ethEngine.enabledTokenIds.length === 0) return

    // Define the core scanning logic that will be retried
    const performTokenScan = async (): Promise<void> => {
      // Initial request to get the totalCount for token transfers
      const initialResponse = await this.serialServers(
        async baseUrl =>
          await this.makeFilfoxApi(baseUrl).getAccountTokenTransfers(
            addressString,
            0,
            1
          )
      )
      const tokenTransferCount = initialResponse.totalCount
      if (tokenTransferCount === 0) {
        // No token transfers found, mark all tokens as complete
        for (const tokenId of this.ethEngine.enabledTokenIds) {
          onScan({ tx: undefined, progress: 1, tokenId })
        }
        return
      }

      // Calculate total pages and set a reasonable transfersPerPage
      const transfersPerPage = 20
      const totalPages = Math.ceil(tokenTransferCount / transfersPerPage)
      let transfersChecked = 0
      for (
        let currentPageIndex = totalPages - 1;
        currentPageIndex >= 0;
        currentPageIndex--
      ) {
        const tokenTransfersResponse = await this.serialServers(
          async baseUrl =>
            await this.makeFilfoxApi(baseUrl).getAccountTokenTransfers(
              addressString,
              currentPageIndex,
              transfersPerPage
            )
        )

        // Process token transfers
        const tokenTransfers = tokenTransfersResponse.transfers
        for (let i = tokenTransfers.length - 1; i >= 0; i--) {
          // Exit early if the engine has been stopped
          if (!this.ethEngine.engineOn) return

          const tokenTransfer = tokenTransfers[i]

          // Use consolidated condition consistent with native FIL scanning
          if (
            tokenTransfer.height <
            this.ethEngine.walletLocalData.lastAddressQueryHeight
          ) {
            transfersChecked++
            continue
          }

          // Check if this token is enabled
          let tokenInfo = this.ethEngine.getTokenInfo(tokenTransfer.token)

          if (tokenInfo == null) {
            // Try converting f4 address to Ethereum hex format
            const ethAddress = this.convertF4ToEthAddress(tokenTransfer.token)
            if (ethAddress != null) {
              // Find token by contract address (case-insensitive)
              const foundTokenInfo = this.findTokenByContractAddress(ethAddress)
              if (foundTokenInfo != null) {
                tokenInfo = foundTokenInfo
              }
            }

            if (tokenInfo == null) {
              transfersChecked++
              continue
            }
          }

          // Progress the last query height
          if (
            tokenTransfer.height >
            this.ethEngine.walletLocalData.lastAddressQueryHeight
          ) {
            this.ethEngine.walletLocalData.lastAddressQueryHeight =
              tokenTransfer.height
            this.ethEngine.walletLocalDataDirty = true
          }

          // Create EdgeTransaction for token transfer
          const tx = await this.filfoxTokenTransferToEdgeTransaction(
            addressString,
            tokenTransfer,
            tokenInfo
          )

          transfersChecked++

          // Calculate the progress
          const progress = transfersChecked / tokenTransferCount

          // Trigger scan progress event
          onScan({ tx, progress, tokenId: tokenTransfer.token })
        }
      }
      // Mark all enabled tokens as complete
      for (const tokenId of this.ethEngine.enabledTokenIds) {
        onScan({ tx: undefined, progress: 1, tokenId })
      }
    }

    await exponentialBackoff(performTokenScan)
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

        transfersChecked++

        // Calculate the progress
        const progress =
          transferCount === 0 ? 1 : transfersChecked / transferCount

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

  /**
   * Calculates the gas fee from a Filecoin message details
   * Uses the same pattern as regular FIL transactions
   */
  private calculateGasFeeFromMessage(
    messageDetails: FilfoxMessageDetails
  ): string {
    // Use the same pattern as filfoxMessageToEdgeTransaction for regular FIL transactions
    const networkFee = messageDetails.transfers
      .filter(
        transfer =>
          transfer.type === 'miner-fee' || transfer.type === 'burner-fee'
      )
      .reduce((sum, transfer) => add(sum, transfer.value), '0')
    return networkFee
  }

  private readonly filfoxTokenTransferToEdgeTransaction = async (
    addressString: string,
    tokenTransfer: FilfoxTokenTransfer,
    tokenInfo: EdgeToken
  ): Promise<EdgeTransaction> => {
    const ourReceiveAddresses = []

    // For token transfers, the gas fee is paid in FIL (native currency)
    const networkFee = '0' // Token transfers don't show fees for the token itself
    let parentNetworkFee: string | undefined
    const networkFees: EdgeTxAmount[] = []

    // Infer the network prefix from the tokenTransfer:
    const fromAddress = Address.fromString(tokenTransfer.from)
    const networkPrefix = fromAddress.getNetworkPrefix()

    // Use the network prefix and the addressString to create a formatted address:
    const ownFilecoinFormattedAddress = Address.fromEthAddress(
      networkPrefix,
      addressString
    ).toString()

    // Fetch the message details to get gas fee and consistent txid
    let messageDetails: FilfoxMessageDetails | undefined
    let ethTransactionHash = tokenTransfer.message // Fallback to message CID if fetch fails

    // Handle native amount:
    let nativeAmount: string
    if (tokenTransfer.from === ownFilecoinFormattedAddress) {
      // For token spends, amount is negative and we need to get the gas fee
      nativeAmount = `-${tokenTransfer.value}`

      // Fetch the message details to get the actual gas fee and ethTransactionHash
      try {
        messageDetails = await this.serialServers(
          async baseUrl =>
            await this.makeFilfoxApi(baseUrl).getMessageDetails(
              tokenTransfer.message
            )
        )
        const gasFee = this.calculateGasFeeFromMessage(messageDetails)

        // Set deprecated field for backwards compatibility
        parentNetworkFee = gasFee

        // Set modern networkFees array - this is what the GUI should use
        networkFees.push({
          tokenId: null, // null = parent currency (FIL)
          nativeAmount: gasFee
        })

        // Use ethTransactionHash for consistency with native FIL transactions
        ethTransactionHash = messageDetails.ethTransactionHash
      } catch (error) {
        // If we can't get the message details, don't block the transaction
        // Just log the error and continue without the fee information
        this.logError(
          'Failed to fetch message details for token transfer gas fee',
          error instanceof Error ? error : new Error(String(error))
        )
      }
    } else {
      // For token receives, amount is positive and no fee is paid by the receiver
      nativeAmount = tokenTransfer.value
      ourReceiveAddresses.push(addressString)

      // Still fetch message details for consistent txid, but don't require gas fee info
      try {
        messageDetails = await this.serialServers(
          async baseUrl =>
            await this.makeFilfoxApi(baseUrl).getMessageDetails(
              tokenTransfer.message
            )
        )
        // Use ethTransactionHash for consistency with native FIL transactions
        ethTransactionHash = messageDetails.ethTransactionHash
      } catch (error) {
        // If we can't get the message details, just log the error
        // The fallback txid (message CID) will be used
        this.logError(
          'Failed to fetch message details for token transfer txid',
          error instanceof Error ? error : new Error(String(error))
        )
      }
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: tokenTransfer.height,
      currencyCode: tokenInfo.currencyCode,
      date: tokenTransfer.timestamp,
      isSend: nativeAmount.startsWith('-'),
      memos: [],
      nativeAmount,
      networkFee,
      networkFees,
      otherParams: {},
      ourReceiveAddresses,
      signedTx: '',
      tokenId:
        tokenInfo.networkLocation?.contractAddress
          ?.toLowerCase()
          .replace(/^0x/, '') ?? null,
      txid: ethTransactionHash, // Use ethTransactionHash for consistency with native FIL transactions
      walletId: this.ethEngine.walletId
    }

    // Use conditional assignment pattern like EthereumEngine for deprecated field
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (parentNetworkFee) {
      edgeTransaction.parentNetworkFee = parentNetworkFee
    }

    return edgeTransaction
  }

  /**
   * Finds a token by contract address (case-insensitive)
   * @param contractAddress - The contract address to search for
   * @returns EdgeMetaToken if found, null otherwise
   */
  private findTokenByContractAddress(
    contractAddress: string
  ): EdgeToken | null {
    // Search through all enabled tokens to find one with matching contract address
    for (const tokenId of this.ethEngine.enabledTokenIds) {
      const tokenInfo = this.ethEngine.allTokensMap[tokenId]
      if (
        tokenInfo != null &&
        typeof tokenInfo.networkLocation?.contractAddress === 'string'
      ) {
        if (
          tokenInfo.networkLocation.contractAddress.toLowerCase() ===
          contractAddress.toLowerCase()
        ) {
          return tokenInfo
        }
      }
    }
    return null
  }

  /**
   * Converts a Filecoin f4 address to Ethereum hex format
   * @param f4Address - The Filecoin f4 address (e.g., f410...)
   * @returns Ethereum hex address (e.g., 0x...) or null if conversion fails
   */
  private convertF4ToEthAddress(f4Address: string): string | null {
    try {
      // f410 addresses are Ethereum addresses on Filecoin FEVM
      if (!f4Address.startsWith('f410')) {
        return null
      }

      // Use the izari-filecoin library to properly convert f4 address to Ethereum format
      const filecoinAddress = Address.fromString(f4Address)
      // For f410 addresses (Ethereum addresses), the payload contains the Ethereum address bytes
      const payload = filecoinAddress.getPayload()

      // Extract only the last 20 bytes for the Ethereum address (payload may have prefix bytes)
      const ethAddressBytes = payload.slice(-20)
      const ethAddress = `0x${Buffer.from(ethAddressBytes).toString('hex')}`
      return ethAddress
    } catch (error) {
      this.logError(
        `FilfoxAdapter: Failed to convert f4 address ${f4Address} to Ethereum format`,
        error instanceof Error ? error : new Error(String(error))
      )
      return null
    }
  }
}
