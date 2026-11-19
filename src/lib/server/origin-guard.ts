import 'server-only';

/**
 * Lightweight same-origin check for state-changing BFF routes.
 * No auth/session cookies are in play on this storefront, so classic CSRF
 * impact is low, but this still blocks naive cross-site form/fetch abuse
 * of the newsletter / order endpoints.
 */
export function isTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // same-origin navigations/tools may omit Origin
  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    return requestUrl.host === originUrl.host;
  } catch {
    return false;
  }
}
