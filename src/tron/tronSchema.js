export const TronApiNodeInfo = {
  type: 'object',
  properties: {
    blockID: { type: 'string' },
    block_header: {
      type: 'object',
      properties: {
        raw_data: {
          type: 'object',
          number: { type: 'number' },
          txTrieRoot: { type: 'string' },
          witness_address: { type: 'string' },
          parentHash: { type: 'string' },
          version: { type: 'number' },
          timestamp: { type: 'number' }
        },
        required: ['number'],
        witness_signature: { type: 'string' }
      },
      required: ['raw_data']
    }
  },
  required: ['blockID', 'block_header']
}

export const TronApiAccountBalance = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          balance: { type: 'number' },
          free_net_usage: { type: 'number' },
          trc20: { type: 'array' }
        },
        required: ['balance']
      }
    }
  }
}

export const TronApiGetTransactions = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          raw_data: {
            type: 'object',
            properties: {
              contract: {
                type: 'array',
                items: {
                  type: 'object',
                  parameter: {
                    type: 'object',
                    properties: {
                      value: {
                        type: 'object',
                        properties: {
                          amount: { type: 'number' },
                          owner_address: { type: 'string' },
                          to_address: { type: 'string' }
                        },
                        required: ['amount', 'owner_address', 'to_address']
                      }
                    },
                    required: ['value']
                  }
                  // type: { type: 'string' }
                }
                // required: ['parameter']
              }
            },
            required: ['contract']
          }
        }
      }
    },
    required: ['raw_data']
  },
  required: ['data']
}

export const TxInfoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    fee: { type: 'number' },
    blockNumber: { type: 'number' },
    blocktimeStamp: { type: 'number' },
    contractResult: { type: 'array' },
    receipt: { type: 'object' }
  },
  required: ['blockNumber']
}

export const NetworkFeesSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      getMaintenanceTimeInterval: { type: 'number' },
      getAccountUpgradeCost: { type: 'number' },
      getCreateAccountFee: { type: 'number' },
      getTransactionFee: { type: 'number' },
      getAssetIssueFee: { type: 'number' },
      getWitnessPayPerBlock: { type: 'number' },
      getWitnessStandbyAllowance: { type: 'number' },
      getCreateNewAccountFeeInSystemContract: { type: 'number' },
      getCreateNewAccountBandwidthRate: { type: 'number' },
      getAllowCreationOfContracts: { type: 'number' },
      getRemoveThePowerOfTheGr: { type: 'number' },
      getEnergyFee: { type: 'number' },
      getExchangeCreateFee: { type: 'number' },
      getMaxCpuTimeOfOneTx: { type: 'number' },
      getAllowUpdateAccountName: { type: 'number' },
      getAllowSameTokenName: { type: 'number' },
      getAllowDelegateResource: { type: 'number' },
      getTotalEnergyLimit: { type: 'number' },
      getAllowTvmTransferTrc10: { type: 'number' },
      getTotalEnergyCurrentLimit: { type: 'number' },
      getAllowMultiSign: { type: 'number' },
      getAllowAdaptiveEnergy: { type: 'number' },
      getTotalEnergyTargetLimit: { type: 'number' },
      getTotalEnergyAverageUsage: { type: 'number' },
      getUpdateAccountPermissionFee: { type: 'number' },
      getMultiSignFee: { type: 'number' }
    },
    required: ['getCreateAccountFee', 'getTransactionFee']
  }
}
