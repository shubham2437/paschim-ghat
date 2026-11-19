import 'server-only';
import { createSign } from 'node:crypto';

/**
 * Mints short-lived Google OAuth2 access tokens for a service account using
 * the JWT Bearer flow (RFC 7523), signed directly with Node's built-in
 * `crypto` (RS256) — no `googleapis`/`google-auth-library` dependency.
 *
 * This is what lets the server read a Google Sheet that is NOT publicly
 * link-shared: the Sheet is shared only with the service account's own
 * email as a Viewer, so only that specific, explicitly-granted identity
 * (plus whichever humans you separately invite) can read it — a leaked
 * URL alone grants nothing.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

interface ServiceAccountCreds {
  client_email: string;
  private_key: string;
}

function loadCreds(): ServiceAccountCreds | null {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) return null;
  // Most hosting UIs can't store a literal multi-line PEM cleanly, so the
  // key is kept as one line with "\n" escape sequences and unescaped here.
  const private_key = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
  return { client_email: email, private_key };
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

const globalForToken = globalThis as unknown as { __googleAccessToken?: CachedToken };

/** Returns a valid access token, or null if no service account is
 * configured (callers should then fall back to another auth mode, or
 * treat this as a config error, depending on context). */
export async function getGoogleAccessToken(): Promise<string | null> {
  const creds = loadCreds();
  if (!creds) return null;

  const cached = globalForToken.__googleAccessToken;
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: creds.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const signingInput = `${header}.${claims}`;
  const signature = createSign('RSA-SHA256').update(signingInput).sign(creds.private_key);
  const jwt = `${signingInput}.${base64url(signature)}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google OAuth token request failed (HTTP ${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  globalForToken.__googleAccessToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export function isServiceAccountConfigured(): boolean {
  return loadCreds() !== null;
}
