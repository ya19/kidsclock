/**
 * Colour Clock sync — a single shared document for one family.
 *
 * There is no user table and no login. Two people share one secret; anyone
 * holding it can read and write the one document, and anyone without it gets
 * a 401. That is the whole security model, and it is the right size for a
 * family's daily routine — it is not the right size for anything private.
 *
 *   GET  /   ->  { plans, week, updatedAt }   the current document
 *   PUT  /   <-  { plans, week, updatedAt }   replaces it, newest wins
 *
 * Both require the header  x-clock-key: <SHARED_KEY>.
 */

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, PUT, OPTIONS',
  'access-control-allow-headers': 'content-type, x-clock-key',
  'access-control-max-age': '86400',
}
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors } })

/** Constant-time-ish compare, so the secret cannot be guessed a character at a time. */
function sameSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const KEY = 'family-clock'

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors })
    if (!env.SHARED_KEY) return json({ error: 'worker has no SHARED_KEY set' }, 500)
    if (!sameSecret(request.headers.get('x-clock-key') || '', env.SHARED_KEY)) {
      return json({ error: 'wrong or missing key' }, 401)
    }

    if (request.method === 'GET') {
      const doc = await env.CLOCK.get(KEY, 'json')
      return json(doc ?? { plans: null, week: null, updatedAt: 0 })
    }

    if (request.method === 'PUT') {
      let doc
      try {
        doc = await request.json()
      } catch {
        return json({ error: 'body must be JSON' }, 400)
      }
      if (!Array.isArray(doc?.plans)) return json({ error: 'plans must be an array' }, 400)
      // Newest write wins. A stale device that was offline cannot clobber
      // a change made after it went away.
      const current = await env.CLOCK.get(KEY, 'json')
      if (current && Number(current.updatedAt) > Number(doc.updatedAt)) {
        return json({ stale: true, ...current }, 409)
      }
      const saved = { plans: doc.plans, week: doc.week ?? {}, updatedAt: Number(doc.updatedAt) || Date.now() }
      await env.CLOCK.put(KEY, JSON.stringify(saved))
      return json(saved)
    }

    return json({ error: 'use GET or PUT' }, 405)
  },
}
