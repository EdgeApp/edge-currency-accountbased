/**
 * Created by paul on 8/27/17.
 */

export const EtherscanGetBlockHeight = {
  type: 'object',
  properties: {
    result: { type: 'string' }
  },
  required: ['result']
}

export const EtherscanGetAccountBalance = {
  type: 'object',
  properties: {
    result: { type: 'string' }
  },
  required: ['result']
}

export const EtherscanGetAccountNonce = EtherscanGetAccountBalance

export const SuperEthGetUnconfirmedTransactions = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      block_height: { type: 'number' },
      fees: { type: 'number' },
      received: { type: 'string' },
      addresses: {
        type: 'array',
        items: { type: 'string' }
      },
      inputs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            addresses: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['addresses']
        }
      },
      outputs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            addresses: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['addresses']
        }
      }
    },
    required: ['fees', 'received', 'addresses', 'inputs', 'outputs']
  }
}

export const NetworkFeesSchema = {
  type: 'object',
  additionalProperties: {
    type: 'object',
    properties: {
      gasLimit: {
        type: 'object',
        properties: {
          regularTransaction: { type: 'string' },
          tokenTransaction: { type: 'string' }
        },
        required: ['regularTransaction', 'tokenTransaction']
      },
      gasPrice: {
        type: 'object',
        properties: {
          lowFee: { type: 'string' },
          standardFeeLow: { type: 'string' },
          standardFeeHigh: { type: 'string' },
          standardFeeLowAmount: { type: 'string' },
          standardFeeHighAmount: { type: 'string' },
          highFee: { type: 'string' }
        },
        required: [
          'lowFee',
          'standardFeeLow',
          'standardFeeHigh',
          'standardFeeLowAmount',
          'standardFeeHighAmount',
          'highFee'
        ]
      }
    },
    required: ['gasLimit']
  }
}

export const EthGasStationSchema = {
  type: 'object',
  properties: {
    safeLow: { type: 'number' },
    average: { type: 'number' },
    fastest: { type: 'number' }
  },
  required: ['safeLow', 'average', 'fastest']
}

export const CustomTokenSchema = {
  type: 'object',
  properties: {
    currencyCode: { type: 'string' },
    currencyName: { type: 'string' },
    multiplier: { type: 'string' },
    contractAddress: { type: 'string' }
  },
  required: ['currencyCode', 'currencyName', 'multiplier', 'contractAddress']
}

export const BlockChairStatsSchema = {
  type: 'object',
  properties: {
    data: {
      type: 'object',
      properties: {
        blocks: { type: 'number' }
      }
    }
  },
  required: ['data']
}

export const AmberdataRpcSchema = {
  type: 'object',
  properties: {
    result: { type: 'string' }
  },
  required: ['result']
}

export const BlockChairAddressSchema = {
  type: 'object',
  properties: {
    data: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          address: {
            type: 'object',
            properties: {
              balance: { type: 'string' }
            },
            required: ['balance']
          },
          layer_2: {
            type: 'object',
            properties: {
              erc_20: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    balance: { type: 'string' },
                    token_address: { type: 'string' },
                    token_symbol: { type: 'string' }
                  },
                  required: ['balance', 'token_address', 'token_symbol']
                }
              }
            },
            required: ['erc_20']
          }
        },
        required: ['address', 'layer_2']
      }
    }
  },
  required: ['data']
}

export const AlethioAccountsTokenTransferSchema = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          attributes: {
            type: 'object',
            properties: {
              blockCreationTime: { type: 'number' },
              symbol: { type: 'string' },
              globalRank: {
                type: 'array',
                items: { type: 'number' }
              }
            },
            required: ['blockCreationTime', 'globalRank']
          },
          relationships: {
            type: 'object',
            properties: {
              from: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' }
                    }
                  },
                  links: {
                    type: 'object',
                    properties: {
                      related: { type: 'string' }
                    }
                  }
                }
              },
              to: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' }
                    }
                  },
                  links: {
                    type: 'object',
                    properties: {
                      related: { type: 'string' }
                    }
                  }
                }
              },
              transaction: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' }
                    }
                  },
                  links: {
                    type: 'object',
                    properties: {
                      related: { type: 'string' }
                    }
                  }
                }
              }
            },
            required: ['from', 'to', 'transaction']
          }
        },
        required: ['attributes', 'relationships']
      }
    },
    links: {
      type: 'object',
      properties: {
        next: { type: 'string' }
      }
    },
    meta: {
      type: 'object',
      properties: {
        page: {
          type: 'object',
          properties: {
            hasNext: { type: 'boolean' }
          },
          required: ['hasNext']
        }
      },
      required: ['page']
    }
  },
  required: ['data', 'links', 'meta']
}

export const AmberdataAccountsTxSchema = {
  type: 'object',
  properties: {
    payload: {
      type: 'object',
      properties: {
        records: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              hash: { type: 'string' },
              timestamp: { type: 'string' },
              blockNumber: { type: 'string' },
              value: { type: 'string' },
              fee: { type: 'string' },
              gasLimit: { type: 'string' },
              gasPrice: { type: 'string' },
              gasUsed: { type: 'string' },
              cumulativeGasUsed: { type: 'string' },
              from: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    address: { type: 'string' }
                  },
                  required: ['address']
                }
              },
              to: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    address: { type: 'string' }
                  },
                  required: ['address']
                }
              }
            },
            required: [
              'hash',
              'timestamp',
              'blockNumber',
              'value',
              'fee',
              'gasLimit',
              'gasPrice',
              'gasUsed',
              'cumulativeGasUsed',
              'from',
              'to'
            ]
          }
        }
      },
      required: ['records']
    }
  },
  required: ['payload']
}

export const AmberdataAccountsFuncsSchema = {
  type: 'object',
  properties: {
    payload: {
      type: 'object',
      properties: {
        records: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              transactionHash: { type: 'string' },
              timestamp: { type: 'number' },
              blockNumber: { type: 'string' },
              value: { type: 'string' },
              initialGas: { type: 'string' },
              leftOverGas: { type: 'string' },
              from: {
                type: 'object',
                properties: {
                  address: { type: 'string' }
                },
                required: ['address']
              },
              to: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    address: { type: 'string' }
                  },
                  required: ['address']
                }
              }
            },
            required: [
              'transactionHash',
              'timestamp',
              'blockNumber',
              'value',
              'initialGas',
              'leftOverGas',
              'from',
              'to'
            ]
          }
        }
      },
      required: ['records']
    }
  },
  required: ['payload']
}
