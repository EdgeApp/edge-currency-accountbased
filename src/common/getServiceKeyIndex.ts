export function getServiceKeyIndex(url: string): string | undefined {
  try {
    return new URL(url).host
  } catch {}
}
