import { getDB } from './db'

export interface GameHistoryEntry {
  id?: number
  type: 'dungeonComplete' | 'breakthrough' | 'recruit' | 'itemForge' | 'potionCraft'
  timestamp: number
  summary: string
  data: Record<string, unknown>
}

export interface HistoryQuery {
  type?: GameHistoryEntry['type']
  since?: number
  limit?: number
}

export async function addHistoryEntry(entry: GameHistoryEntry): Promise<void> {
  const db = await getDB()
  await db.add('history', entry)
}

export async function queryHistoryEntries(query?: HistoryQuery): Promise<GameHistoryEntry[]> {
  const db = await getDB()
  const tx = db.transaction('history', 'readonly')
  let index = tx.store.index('timestamp')
  let range: IDBKeyRange | undefined

  if (query?.since) {
    range = IDBKeyRange.lowerBound(query.since)
  }

  let cursor = await index.openCursor(range, 'prev') // newest first
  const results: GameHistoryEntry[] = []

  while (cursor) {
    const entry = cursor.value as GameHistoryEntry
    if (query?.type && entry.type !== query.type) {
      cursor = await cursor.continue()
      continue
    }
    results.push(entry)
    if (query?.limit && results.length >= query.limit) break
    cursor = await cursor.continue()
  }

  return results
}
