# Sync worker — one shared clock for one family

A Cloudflare Worker holding a single document: your plans and your week map.
No accounts, no user table. Two people share one secret.

## Deploy (about five minutes, from a computer)

```bash
cd worker
npx wrangler login                      # opens a browser once
npx wrangler kv namespace create CLOCK  # prints an id
# paste that id into wrangler.toml
npx wrangler secret put SHARED_KEY      # paste a long random passphrase
npx wrangler deploy                     # prints your worker URL
```

Then in the app: **Editor → Sync → paste the worker URL and the same passphrase →
Connect**. Do the same on the other phone, with the same two values.

Free tier covers this many times over: 100,000 reads/day, 1,000 writes/day.

## What it is and is not

- **Is:** one document, two people, newest write wins, protected by one shared secret.
- **Is not:** private. Anyone holding the URL and the secret has full access, and
  there is no per-person identity, no history, and no merge. Do not put anything in
  a plan label that you would mind a stranger reading if the secret leaked.
- Losing the secret means losing access; there is no recovery. Keep a copy.
