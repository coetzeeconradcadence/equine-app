# Hoofnote — horse management app (dev baseline)

A cheaper, South-Africa-first alternative to The Equine Ledger. Horse profiles, health
records with smart reminders, an **AHS travel-ready check** (unique to this app), feeding
plans, training log, shows & results, expenses, documents, contacts, a printable horse
passport, a printable yard feed board, a blog for videos/posts, and an AI assistant that
reads the horse's own records.

Working name only — rename via `public/js/config.js` (`APP.name`) whenever you're ready.

## Why no build step

This copy of the app was built in an environment with no access to npm, so it's plain
JavaScript (ES modules), no React/Vite, no `node_modules`. It runs by opening `public/`
in any static web server — nothing to install, nothing to build. It's a genuine PWA
(installable on a phone, works offline after first load).

This is a deliberate architecture choice for now, not a limitation forced by missing a
build step forever: if you later want React/TypeScript/a component library, the data
layer (`db.js`), the AHS/business logic (`ahs.js`, `due.js`, `schemas.js`) and the
Cloudflare Function (`functions/api/ai.js`) all port over directly — only the view layer
would be rewritten.

## Project layout

```
public/               ← deploy this folder to Cloudflare Pages
  index.html
  css/app.css
  js/
    config.js          app name, currency, AI settings — rename the app here
    util.js            html`` templating, dates, money, image resize, markdown, etc.
    db.js              IndexedDB storage (swap for a cloud DB later without touching views)
    schemas.js          field definitions for every record type — add a field here first
    forms.js           generic schema-driven "add/edit" bottom sheet
    ahs.js             African Horse Sickness travel-ready & season logic (SA-specific)
    due.js             "what's due" engine + .ics calendar export
    demo.js            realistic demo data (2 horses, ~6 months of history)
    app.js             router + event delegation ("the app")
    views/             one file per screen (home, horses, lists, print, blog, ai, settings)
  content/blog/posts.json   published blog posts (public, in git)
  icons/, manifest.webmanifest, sw.js   PWA install + offline support
functions/api/ai.js    Cloudflare Pages Function — calls Claude with your API key server-side
```

## Run it locally

No install needed:

```bash
cd public
python3 -m http.server 8080
# open http://localhost:8080
```

Or with Node if you prefer: `npx serve public`.

Click **"Load demo data"** on first launch to explore with two realistic horses.

## Deploy to Cloudflare Pages (same as Rhino)

1. Push this repo to GitHub.
2. Cloudflare dashboard → Pages → Create project → connect the repo.
3. Build settings: **no build command**, output directory `public`.
   (If this ever lives inside another repo as a subfolder, set that folder as the
   Pages project's *root directory* instead.)
4. Deploy. You'll get a `*.pages.dev` URL — same pattern as `rhino-beta.pages.dev`.

### Turning on the AI assistant

The "Ask AI" tab calls `/api/ai`, a Cloudflare Pages Function (already in `functions/api/ai.js`).
It works automatically once deployed to Pages — you just need to give it a key:

1. Pages project → Settings → Environment variables → add `ANTHROPIC_API_KEY` (encrypted).
2. Redeploy (env var changes need a new deploy to take effect).
3. Optional: bind a KV namespace as `AI_LIMITS` and set `AI_DAILY_LIMIT` to cap questions
   per IP per day — recommended before sharing the link with friends, so a curious visitor
   can't run up your API bill.

Locally (`python3 -m http.server`), `/api/ai` doesn't exist, so the app shows a friendly
"AI isn't switched on yet" message instead of crashing — that's expected off Cloudflare.

## Data & privacy (current state)

Everything is stored **on the device**, in IndexedDB — nothing is sent anywhere except the
AI feature (which sends only the selected horse's record summary + your question to the
Function above). There is no login yet, no sync between devices. Use **Settings → Download
backup** regularly, and before switching phones or clearing browser data. A backup is one
JSON file you can restore from any device — email it to yourself.

The natural next step (once you want multi-device sync, real accounts, and to stop relying
on manual backups) is a small backend — e.g. Cloudflare D1 or Supabase — behind the same
`db.js` interface, so nothing above it needs to change.

## The daughter-run blog

- **Published posts** live in `public/content/blog/posts.json`, plain JSON, committed to git.
  Anyone with GitHub write access can add a post there (copy an existing entry, change the
  fields, add a comma) and it goes live on the next deploy — no app rebuild needed.
- **Videos**: upload to YouTube (Unlisted is fine — anyone with the link can watch, it won't
  show in search or on the channel) and paste the link in the `video` field. It embeds
  automatically. This avoids storing/serving large video files ourselves.
- She can also **draft posts right in the app** (Blog → "Write a post") to preview how they'll
  look, then use "Copy for publishing" to get the JSON to paste into `posts.json`. Drafts stay
  local to whichever device wrote them until published.

## What's deliberately not built yet (see the research writeup for why)

Communities/social feed, complex multi-user stable permissions, GPS ride tracking (that's
Between Rides' territory), full dressage scoring sheets, live-scoring integrations, entry-form
generation. These are documented rabbit holes to avoid until the daily loop (health, feeding,
reminders, costs) is genuinely loved by real users.

## AHS (African Horse Sickness) disclaimer

The travel-ready logic in `ahs.js` encodes the general rule (40 days–24 months since last
vaccination to move into the Western Cape controlled area, annual vaccination window
1 June–31 October) as a **guide only**. Rules vary by zone and change during outbreaks —
this is clearly labelled in the UI and should never be presented as a substitute for
checking with a vet or the State Vet before an actual move.
