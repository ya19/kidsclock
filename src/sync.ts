import type { Plan, WeekMap } from './types'

/**
 * Sync for exactly two people.
 *
 * One document on an endpoint you own, one shared secret, newest write wins.
 * No accounts, no identity, no merge — which is honest about what it is: a way
 * for two parents to keep one clock, not a multi-user product.
 *
 * Only plans and the week map travel. Face, size, theme and the toggles stay
 * on each device, because "which face is on the shelf tablet" is not something
 * the other phone should decide.
 */

export type SyncDoc = { plans: Plan[]; week: WeekMap; updatedAt: number }
export type SyncConfig = { url: string; key: string }

const CFG = 'kidsclock.sync'

export function loadSync(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CFG)
    if (!raw) return null
    const c = JSON.parse(raw) as SyncConfig
    return c.url && c.key ? c : null
  } catch {
    return null
  }
}

export function saveSync(c: SyncConfig | null) {
  try {
    if (c) localStorage.setItem(CFG, JSON.stringify(c))
    else localStorage.removeItem(CFG)
  } catch {
    /* private mode — sync simply stays off */
  }
}

const headers = (c: SyncConfig) => ({ 'content-type': 'application/json', 'x-clock-key': c.key })

/** Read the shared document. Throws with a readable message so the UI can show it. */
export async function pull(c: SyncConfig): Promise<SyncDoc | null> {
  const res = await fetch(c.url, { headers: headers(c), cache: 'no-store' })
  if (res.status === 401) throw new Error('Wrong passphrase')
  if (!res.ok) throw new Error(`Sync server said ${res.status}`)
  const doc = (await res.json()) as SyncDoc
  return Array.isArray(doc?.plans) && doc.plans.length ? doc : null
}

/** Replace the shared document. A 409 means someone else saved something newer. */
export async function push(c: SyncConfig, doc: SyncDoc): Promise<SyncDoc> {
  const res = await fetch(c.url, { method: 'PUT', headers: headers(c), body: JSON.stringify(doc) })
  if (res.status === 401) throw new Error('Wrong passphrase')
  if (res.status === 409) {
    const theirs = (await res.json()) as SyncDoc
    throw Object.assign(new Error('The other device saved something newer'), { theirs })
  }
  if (!res.ok) throw new Error(`Sync server said ${res.status}`)
  return (await res.json()) as SyncDoc
}
