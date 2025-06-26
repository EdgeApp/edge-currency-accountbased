import { asMaybe, asValue } from 'cleaners'

export interface ParsedZanoSendUri {
  action: 'send'
  address: string
  amount?: string
  asset_id?: string
  comment?: string
  mixins?: string
  hide_sender: boolean
  hide_receiver: boolean
}
export interface ParsedZanoMarketplaceOfferCreateUri {
  action: 'marketplace_offer_create'
  mixins?: string
  hide_sender?: string
  hide_receiver?: string
  title?: string
  description?: string
  category?: string
  price?: string
  'img-url'?: string
  contact?: string
  comments?: string
  address?: string
}
export interface ParsedZanoEscrowUri {
  action: 'escrow'
  description?: string
  seller_address?: string
  amount?: string
  my_deposit?: string
  seller_deposit?: string
  comment?: string
  address?: string
}
export type ParsedZanoUri =
  | ParsedZanoSendUri
  | ParsedZanoMarketplaceOfferCreateUri
  | ParsedZanoEscrowUri

export type ZanoAction = 'send' | 'escrow' | 'marketplace_offer_create'
export const asZanoAction = asValue(
  'send',
  'escrow',
  'marketplace_offer_create'
)

/**
 * Parses a Zano URI according to the official Zano Deeplinks specification.
 * @param uri The Zano URI string
 * @returns ParsedZanoUri object
 * @throws Error if the URI is invalid or does not start with 'zano:'
 */
export function parseZanoDeeplink(uri: string): ParsedZanoUri {
  if (!uri.startsWith('zano:')) {
    throw new Error('Invalid Zano URI: must start with "zano:")')
  }
  const rest = uri.slice('zano:'.length)
  let action: ZanoAction | undefined
  const params: Record<string, string | undefined> = {}

  const searchParams = new URLSearchParams(rest)
  for (const [key, value] of searchParams.entries()) {
    params[key] = value
    if (key === 'action') action = asMaybe(asZanoAction)(value)
  }

  if (action == null) {
    throw new Error('Invalid Zano URI: missing action parameter')
  }

  switch (action) {
    case 'send': {
      const result: ParsedZanoSendUri = {
        action: 'send',
        address: params.address ?? '',
        amount: params.amount,
        asset_id: params.asset_id,
        comment: params.comment,
        mixins: params.mixins,
        hide_sender: params.hide_sender === 'true',
        hide_receiver: params.hide_receiver === 'true'
      }
      return result
    }
    case 'marketplace_offer_create': {
      const result: ParsedZanoMarketplaceOfferCreateUri = {
        action: 'marketplace_offer_create',
        mixins: params.mixins,
        hide_sender: params.hide_sender,
        hide_receiver: params.hide_receiver,
        title: params.title,
        description: params.description,
        category: params.category,
        price: params.price,
        'img-url': params['img-url'],
        contact: params.contact,
        comments: params.comments,
        address: params.address
      }
      return result
    }
    case 'escrow': {
      const result: ParsedZanoEscrowUri = {
        action: 'escrow',
        description: params.description,
        seller_address: params.seller_address,
        amount: params.amount,
        my_deposit: params.my_deposit,
        seller_deposit: params.seller_deposit,
        comment: params.comment,
        address: params.address
      }
      return result
    }
  }
}
