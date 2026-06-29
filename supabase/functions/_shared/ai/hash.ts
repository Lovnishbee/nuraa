export async function sha256Hex(value: string): Promise<string> {
  const cryptoApi = globalThis.crypto
  const data = new TextEncoder().encode(value)
  const hash = await cryptoApi.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function stableJsonHash(value: unknown): Promise<string> {
  return sha256Hex(JSON.stringify(sortValue(value)))
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sortValue(item)]))
  }
  return value
}
