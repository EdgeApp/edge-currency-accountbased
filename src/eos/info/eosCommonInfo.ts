import { EdgeMemoOption } from 'edge-core-js/types'

// https://developers.eos.io/manuals/eos/v2.1/cleos/command-reference/transfer
export const eosMemoOptions: EdgeMemoOption[] = [
  {
    type: 'text',
    memoName: 'memo',
    maxLength: 256
  }
]
