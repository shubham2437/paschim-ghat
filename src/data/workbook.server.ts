import 'server-only';
import path from 'node:path';
import fs from 'node:fs';
import { parseXlsx } from '@/data/xlsx-reader.server';
import { getGoogleAccessToken, isServiceAccountConfigured } from '@/lib/server/google-service-account';

/**
 * Reads and parses the catalogue workbook (a Google Sheet, exported as
 * .xlsx) and caches the parsed tabs in memory.
 *
 * Two ways to reach the Sheet, in priority order:
 *
 *  1. Service account (recommended, see README). The Sheet stays
 *     Restricted and is shared only with the service account's email as
 *     Viewer. Uses GOOGLE_SERVICE_ACCOUNT_EMAIL /
 *     GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY and CATALOGUE_SHEET_ID.
 *  2. Public export link (CATALOGUE_SHEET_URL), used only if no service
 *     account is configured. Requires "Anyone with the link" sharing.
 *
 * Live updates: the cached copy is considered stale after
 * REFRESH_INTERVAL_MS. The first request after that kicks off a background
 * re-fetch (the request itself is answered from the cache, so it never
 * waits on Google), and the storefront polls /api/products every 15s, so
 * an edit in the Sheet reaches open browser tabs in well under a minute —
 * no redeploy and no page reload. /api/products?fresh=1 and /api/refresh
 * wait for a re-fetch instead, for an immediate update (see
 * refreshWorkbookNow).
 *
 * If a refresh fails (Sheet unshared, Google outage, transient network
 * blip), the last good copy keeps serving and the error is logged. If the
 * very first load fails, the site renders with an empty catalogue and
 * retries on a short timer.
 *
 * data/catalogue.xlsx, if present, is only an instant bootstrap value for
 * the first request after a cold start; the Sheet replaces it moments later.
 *
 * Serverless caveat: the cache is per warm instance, not shared.
 */

const WORKBOOK_PATH = path.join(process.cwd(), 'data', 'catalogue.xlsx');
const PUBLIC_URL = process.env.CATALOGUE_SHEET_URL;
const SHEET_ID = process.env.CATALOGUE_SHEET_ID ?? extractSheetId(PUBLIC_URL);
const REFRESH_INTERVAL_MS = 15 * 1000; // cached copy is stale after 15s once a real load has succeeded
const FORCE_MIN_AGE_MS = 5 * 1000; // a forced refresh is skipped if the copy is younger than this
const ERROR_RETRY_INTERVAL_MS = 20 * 1000; // 20s while we've never had a successful load
const FETCH_RETRIES = 3;
const FETCH_TIMEOUT_MS = 12_000;
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function extractSheetId(url: string | undefined): string | undefined {
  return url?.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
}

function hasRemoteSource(): boolean {
  return (isServiceAccountConfigured() && !!SHEET_ID) || !!PUBLIC_URL;
}

export type SheetRow = Record<string, string>;

interface CachedWorkbook {
  sheets: Record<string, SheetRow[]>;
  grids: Record<string, string[][]>;
  loadedAt: number;
  version: number;
  source: 'local' | 'remote' | 'empty';
}

const globalForWorkbook = globalThis as unknown as {
  __catalogueWorkbook?: CachedWorkbook;
  __catalogueLoading?: Promise<CachedWorkbook>;
  __catalogueRefresh?: Promise<void>;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanSheets(rawSheets: Record<string, SheetRow[]>): Record<string, SheetRow[]> {
  const sheets: Record<string, SheetRow[]> = {};
  for (const [name, rows] of Object.entries(rawSheets)) {
    sheets[name] = rows.map((row) => {
      const cleaned: SheetRow = {};
      for (const [key, value] of Object.entries(row)) {
        cleaned[key.trim()] = value.trim();
      }
      return cleaned;
    });
  }
  return sheets;
}

function readLocalBuffer(): Buffer | null {
  if (!fs.existsSync(WORKBOOK_PATH)) return null;
  return fs.readFileSync(WORKBOOK_PATH);
}

async function fetchWithTimeout(url: string, headers: Record<string, string>): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal, headers });
    if (!res.ok) throw new Error(`Failed to fetch catalogue sheet (HTTP ${res.status}): ${await res.text()}`);
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength === 0) throw new Error('Catalogue sheet fetch returned an empty file');
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOnce(): Promise<Buffer> {
  if (isServiceAccountConfigured() && SHEET_ID) {
    const token = await getGoogleAccessToken();
    if (!token) throw new Error('Failed to obtain a Google access token for the service account');
    const url = `https://www.googleapis.com/drive/v3/files/${SHEET_ID}/export?mimeType=${encodeURIComponent(XLSX_MIME)}`;
    return fetchWithTimeout(url, { Authorization: `Bearer ${token}` });
  }
  if (PUBLIC_URL) {
    // PUBLIC_URL is a fixed server-side env var, never client input — no SSRF risk.
    return fetchWithTimeout(PUBLIC_URL, {});
  }
  throw new Error('No catalogue Sheet source configured (service account + CATALOGUE_SHEET_ID, or CATALOGUE_SHEET_URL)');
}

/** A transient network blip (DNS hiccup, connect timeout) shouldn't take
 * the whole site down — retry a couple of times with backoff before
 * giving up. */
async function fetchRemoteBuffer(): Promise<Buffer> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt++) {
    try {
      return await fetchOnce();
    } catch (err) {
      lastErr = err;
      if (attempt < FETCH_RETRIES) await sleep(attempt * 750);
    }
  }
  throw lastErr;
}

function cleanGrids(raw: Record<string, string[][]>): Record<string, string[][]> {
  const grids: Record<string, string[][]> = {};
  for (const [name, rows] of Object.entries(raw)) {
    grids[name.trim()] = rows.map((row) => row.map((cell) => cell.trim()));
  }
  return grids;
}

function toWorkbook(buf: Buffer, source: CachedWorkbook['source'], prev: CachedWorkbook | undefined): CachedWorkbook {
  const parsed = parseXlsx(buf);
  const sheets = cleanSheets(parsed.sheets);
  const grids = cleanGrids(parsed.grids);
  // Only bump the version when the content actually changed, so derived
  // caches and polling clients can cheaply tell "nothing new".
  const unchanged = !!prev && JSON.stringify(prev.grids) === JSON.stringify(grids);
  return {
    sheets,
    grids,
    loadedAt: Date.now(),
    version: unchanged ? prev.version : (prev?.version ?? 0) + 1,
    source,
  };
}

async function loadRemote(): Promise<CachedWorkbook> {
  const buf = await fetchRemoteBuffer();
  return toWorkbook(buf, 'remote', globalForWorkbook.__catalogueWorkbook);
}

/** Starts a re-fetch of the Sheet unless one is already running, and
 * returns the promise for it. Never rejects: on failure the last good copy
 * stays in place and the error is logged. */
function refreshFromSheet(): Promise<void> {
  if (!hasRemoteSource()) return Promise.resolve();
  if (globalForWorkbook.__catalogueRefresh) return globalForWorkbook.__catalogueRefresh;
  globalForWorkbook.__catalogueRefresh = loadRemote()
    .then((fresh) => {
      globalForWorkbook.__catalogueWorkbook = fresh;
    })
    .catch((err) => {
      // Push loadedAt forward so a failing source is retried on the normal
      // interval rather than on every single request.
      const cache = globalForWorkbook.__catalogueWorkbook;
      if (cache && cache.source !== 'empty') cache.loadedAt = Date.now();
      // eslint-disable-next-line no-console
      console.error('[catalogue] refresh from the Sheet failed, keeping last good data:', err);
    })
    .finally(() => {
      globalForWorkbook.__catalogueRefresh = undefined;
    });
  return globalForWorkbook.__catalogueRefresh;
}

function triggerBackgroundRefresh() {
  void refreshFromSheet();
}

/** First-ever load for this process: instant from the local file if it
 * exists (then a remote refresh kicks off in the background). Otherwise
 * awaits the remote fetch directly (with retries). If that still fails —
 * e.g. a transient outage right at cold-start — falls back to an empty
 * workbook instead of throwing, so the site renders (with default
 * settings and an empty catalogue) rather than 500ing; the short
 * ERROR_RETRY_INTERVAL_MS then keeps trying until a real load lands. */
async function initialLoad(): Promise<CachedWorkbook> {
  const local = readLocalBuffer();
  if (local) {
    const workbook = toWorkbook(local, 'local', undefined);
    if (hasRemoteSource()) triggerBackgroundRefresh();
    return workbook;
  }
  if (!hasRemoteSource()) {
    throw new Error(
      'No catalogue data source configured: data/catalogue.xlsx is missing and no Sheet source (service account + CATALOGUE_SHEET_ID, or CATALOGUE_SHEET_URL) is set.'
    );
  }
  try {
    return await loadRemote();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      '[catalogue] initial load from the Sheet failed — serving an empty catalogue until it recovers:',
      err
    );
    return { sheets: {}, grids: {}, loadedAt: Date.now(), version: 1, source: 'empty' };
  }
}

async function ensureWorkbook(): Promise<CachedWorkbook> {
  if (globalForWorkbook.__catalogueWorkbook) {
    const cache = globalForWorkbook.__catalogueWorkbook;
    const interval = cache.source === 'empty' ? ERROR_RETRY_INTERVAL_MS : REFRESH_INTERVAL_MS;
    if (hasRemoteSource() && Date.now() - cache.loadedAt > interval) {
      triggerBackgroundRefresh();
    }
    return cache;
  }
  if (!globalForWorkbook.__catalogueLoading) {
    globalForWorkbook.__catalogueLoading = initialLoad()
      .then((wb) => {
        globalForWorkbook.__catalogueWorkbook = wb;
        return wb;
      })
      .finally(() => {
        globalForWorkbook.__catalogueLoading = undefined;
      });
  }
  return globalForWorkbook.__catalogueLoading;
}

export async function getSheet(name: string): Promise<SheetRow[]> {
  const wb = await ensureWorkbook();
  return wb.sheets[name] ?? [];
}

/** Raw cell grid of a tab, for tables whose header is not on row 1. */
export async function getGrid(name: string): Promise<string[][]> {
  const wb = await ensureWorkbook();
  return wb.grids[name] ?? [];
}

/** Bumps whenever the underlying workbook data changes — derived caches
 * (catalog.server.ts, site-content.server.ts) key off this to know when to
 * rebuild instead of serving stale data forever. */
export async function getWorkbookVersion(): Promise<number> {
  const wb = await ensureWorkbook();
  return wb.version;
}

/**
 * Re-reads the Sheet right now and waits for it, instead of waiting for
 * the next stale-check. Used when a shopper returns to the tab and by the
 * /api/refresh route. Throttled: if the cached copy is only a few seconds
 * old it is reused, so this cannot be used to hammer Google.
 */
export async function refreshWorkbookNow(): Promise<{ version: number; loadedAt: number; source: string }> {
  const cache = await ensureWorkbook();
  if (Date.now() - cache.loadedAt > FORCE_MIN_AGE_MS) await refreshFromSheet();
  const wb = globalForWorkbook.__catalogueWorkbook ?? cache;
  return { version: wb.version, loadedAt: wb.loadedAt, source: wb.source };
}
