import { isValidAddress } from 'xrpl'

export const makeTokenId = ({
  issuer,
  currency
}: {
  issuer: string
  currency: string
}): string => {
  if (!isValidAddress(issuer)) {
    throw new Error('InvalidTokenIssuerError')
  }

  return `${currency}-${issuer}`
}
