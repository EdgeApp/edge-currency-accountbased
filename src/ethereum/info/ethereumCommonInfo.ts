import { EdgeMemoOption } from 'edge-core-js/types'

// We are using the memo to pass Ethereum contract calls:
export const evmMemoOptions: EdgeMemoOption[] = [
  {
    type: 'hex',
    hidden: true,
    memoName: 'data'
  }
]
