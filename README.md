# Paschim Ghat storefront

Spices, coffee, tea, dry fruits and oils storefront — Next.js App Router with
a small BFF (Backend-for-Frontend) layer. The whole catalogue comes live from
one Google Sheet.

## Architecture

```
src/
  app/                 Next.js App Router — pages + API routes (the BFF)
    api/
      products/         GET  — the live catalogue (?fresh=1 re-reads the Sheet first)
      refresh/          GET  — pull Sheet changes now and report what the site has
      site-config/      GET  — brand settings / coupons / offers (optional tabs)
      whatsapp-order/   POST — validated + rate-limited, builds the wa.me link server-side
      whatsapp-checkout/ POST — validated + rate-limited WhatsApp order handoff
      price-list/       GET  — CSV price list generated from the Sheet
      geocode/reverse/  GET  — "detect my location" for the checkout form
  data/                Server-only data layer (never bundled to the client)
    xlsx-reader.server.ts    Dependency-free .xlsx (OOXML) parser
    workbook.server.ts       Fetches + caches the Sheet, live refresh
    catalog.server.ts        Products tab -> products, pack sizes, categories
    site-content.server.ts   Optional Settings / Coupons / Offers tabs
  features/            catalog, cart, home, support
  components/          layout (header, footer, nav) and ui (toasts, scrim)
  lib/                 server utilities, zod validation, formatting helpers
  types/               shared TypeScript types
```

## Order-form security

- **Turnstile:** both order forms include Cloudflare Turnstile (invisible
  unless a challenge is needed). The server verifies the token with
  Cloudflare before handling an order and fails closed if it cannot. Set
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (build variable) and `TURNSTILE_SECRET_KEY`
  (secret). With no secret set the check is skipped.
- **Rate limit:** 5 order requests per minute per IP, using the Workers
  Rate Limiting binding `ORDER_RATE_LIMITER` (`wrangler.jsonc`), with an
  in-memory fallback for local dev.
- **Validation:** all input is validated server-side with zod. Checkout only
  accepts product IDs and quantities; names, prices, coupon discount,
  delivery and total are recomputed from the catalogue on the server.

## The catalogue Google Sheet

Set `CATALOGUE_SHEET_ID` (see `.env.example`) to the Sheet's ID. Nothing about
the products is hardcoded in the frontend — categories, navigation, filters,
search, the price list and the hero text are all derived from the Sheet.

### `Products` tab (required)

One row per pack size. The header row is found automatically (title or
instruction rows above it are fine) and columns are matched by name, so they
can be reordered.

| Column | Used for |
| --- | --- |
| Product ID | Shown as the product ID, used in the price list |
| Product Name (website) | Product title. **Rows with the same name become one product with several pack sizes** |
| English / Other Name | Subtitle, also searchable |
| Category | Category chips, navigation, filters |
| Size + Unit | Pack label (`250g`, `1L`, `6 pcs`) and the per-100g / per-100ml price |
| MRP (₹), Selling Price (₹) | Prices; the discount % is recomputed from these |
| Stock Qty / Availability | In stock / Low stock / Out of stock. If Availability is blank it is derived from Stock Qty (0 = out, 1–10 = low) |
| Show on Website | `No` hides the row |
| Short Description | Shown in the product view. A trailing "(Edit this description)" is stripped |
| Product Image | Not used yet — products show a generated illustration chosen from the name |
| Notes | Internal, never sent to the browser |

A row needs a Product Name and a Selling Price above 0 to appear.

### `Lists` tab (optional)

The `Categories` column sets the order categories are shown in.

### Optional extra tabs

Add any of these to the same Sheet to override the built-in defaults:

- `Settings` — columns `key`, `value`. Keys: `brand_name`, `brand_sub`,
  `hero_line1`, `hero_line2`, `hero_lead`, `hero_badge`, `phone`, `whatsapp`,
  `email`, `fssai`, `gstin`, `address`, `free_shipping_above`, `delivery_fee`.
- `Offers` — column `text`; each row is a line in the top ticker.
- `Coupons` — columns `code`, `type` (`pct` | `flat` | `ship`), `value`, `label`.

Without a `Settings` tab no delivery fee is added to the basket (it shows
"Confirmed on WhatsApp"), and the WhatsApp number comes from the
`WHATSAPP_BUSINESS_NUMBER` env var.

## Live updates

No redeploy and no manual step is needed after editing the Sheet.

- The server keeps the Sheet in memory and treats it as stale after 15
  seconds; the next request triggers a re-fetch in the background.
- Every open browser tab re-checks `/api/products` every 15 seconds, and
  immediately when the tab regains focus (which also makes the server re-read
  the Sheet). So: edit the Sheet, switch back to the site, and the change is
  there; a tab left open picks it up in roughly 15–30 seconds.
- To force it and see what the site has, open `/api/refresh` — it returns
  the product count, categories and last sync time.
- If a re-fetch fails (Sheet unshared, Google outage), the last good copy
  keeps serving and the error is logged on the server.

**In production** the same thing happens, provided the hosting platform has
the same environment variables as `.env.local` (`CATALOGUE_SHEET_ID`,
`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`,
`WHATSAPP_BUSINESS_NUMBER`, `NEXT_PUBLIC_SITE_URL`) — `.env.local` is
git-ignored and never reaches a deployment — and the Sheet stays shared with
the service account as Viewer.

On serverless hosts (Vercel etc.) the cache is per warm instance, so each
instance refreshes on its own timer; behaviour for shoppers is the same.

## Security: locking down the Sheet

The simplest way to make the Sheet fetchable — File → Share → "Anyone with
the link" as Viewer — means **anyone who obtains that URL can read your
entire catalog, pricing, coupon codes, and business WhatsApp number**, not
just people you've invited. The Sheet ID isn't secret; it appears in your
browser URL bar, could end up in a screenshot, a shared doc, or a leaked
env var.

The recommended setup instead keeps the Sheet **Restricted** (shared with
no one publicly) and grants read access to a single Google service account
— a machine identity that only your server can act as. This app already
has the code for it (`src/lib/server/google-service-account.ts`, using
Node's built-in `crypto` for the OAuth2 JWT flow — no `googleapis` SDK
dependency); you just need to create the service account once:

1. **Create a Google Cloud project** (or reuse one) at
   [console.cloud.google.com](https://console.cloud.google.com).
2. **Enable the Google Drive API**: APIs & Services → Library → search
   "Google Drive API" → Enable. (The Sheet is exported via Drive's file-export
   endpoint, which is how you get a real `.xlsx` with all tabs — the
   Sheets API itself doesn't do this.)
3. **Create a service account**: IAM & Admin → Service Accounts → Create
   Service Account → give it any name (e.g. `catalogue-reader`) → skip the
   optional role/access steps → Done.
4. **Create a key**: open the new service account → Keys tab → Add Key →
   Create new key → JSON → this downloads a `.json` file. Keep it private —
   it's a credential, treat it like a password.
5. **Share the Sheet with the service account**: open the Sheet → Share →
   paste the service account's email (looks like
   `catalogue-reader@your-project.iam.gserviceaccount.com`, found in the
   downloaded JSON as `client_email`) → give it **Viewer** access → make
   sure general link-sharing is set to **Restricted**.
6. **Set the env vars** (locally in `.env.local`, and in your hosting
   platform's environment variables for production) from that JSON file:
   - `CATALOGUE_SHEET_ID` — the ID from the Sheet's URL (already set)
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — the JSON's `client_email`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — the JSON's `private_key`, pasted
     as one line with its `\n` sequences kept literal (don't convert them to
     real line breaks)
7. **Remove `CATALOGUE_SHEET_URL`** once you've confirmed the service
   account path works (restart the server, check the site still loads) —
   with the Sheet Restricted, that public URL won't work anymore anyway,
   but deleting it keeps the config unambiguous.

The app checks for the service account vars first and only falls back to
`CATALOGUE_SHEET_URL` if they're not set — so this is a drop-in upgrade,
no other code changes needed.

## Security

- **CSP + security headers** set globally in `next.config.js` (no third-party
  script/font origins — fonts are self-hosted via `next/font`).
- **Zod validation** on every API route input (query params and JSON bodies).
- **Rate limiting** (`lib/server/rate-limit.ts`) on every API route.
- **Origin check** (`lib/server/origin-guard.ts`) on state-changing POST routes.
- **Server-only secrets**: the WhatsApp business number comes from the
  workbook's `Settings` tab (falling back to `WHATSAPP_BUSINESS_NUMBER`) and
  is never sent to the client — the BFF route builds the `wa.me` link
  server-side and only returns the final URL.
- `server-only` package marks catalog data and server utilities so an
  accidental client import fails at build time.
- **No Google API SDK dependency either.** The service-account OAuth2 JWT
  Bearer flow (`src/lib/server/google-service-account.ts`) is implemented
  directly on Node's built-in `crypto` module (RS256 signing) rather than
  pulling in `googleapis`/`google-auth-library` — same reasoning as below:
  fewer dependencies touching credentials, easier to audit.
- **No `xlsx` (SheetJS) npm dependency.** The version published to npm
  (0.18.5) carries two unpatched high-severity advisories (prototype
  pollution, ReDoS) with no fix available on the registry. Since this app
  only ever parses one first-party file we control (never an untrusted
  upload), `src/data/xlsx-reader.server.ts` is a small, auditable
  dependency-free reader built directly on Node's `zlib` instead — zero
  third-party CVE surface for this data path.

## Getting started

Requires Node.js >= 18.18.

```bash
cp .env.example .env.local   # then fill in the values
npm install
npm run dev                  # http://localhost:3000
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |

### Environment variables

See `.env.example`. Key ones: `CATALOGUE_SHEET_ID`,
`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`,
`WHATSAPP_BUSINESS_NUMBER`, `NEXT_PUBLIC_SITE_URL`.

## Notes

Checkout hands the basket to WhatsApp; there is no online payment. Product
pictures are procedurally generated (`src/features/catalog/product-art.ts`),
so the app ships with no product image files.
