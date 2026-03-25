import { getDB } from './db'

export interface CachedResource {
  key: string
  blob: Blob
  version: string
  cachedAt: number
}

export async function getCachedResource(key: string): Promise<CachedResource | undefined> {
  const db = await getDB()
  return db.get('resources', key)
}

export async function setCachedResource(key: string, blob: Blob, version: string): Promise<void> {
  const db = await getDB()
  await db.put('resources', {
    key,
    blob,
    version,
    cachedAt: Date.now(),
  })
}
