import { NextResponse } from 'next/server';
import { reverseGeocodeQuerySchema } from '@/lib/validation/schemas';
import { clientKeyFromHeaders, rateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FETCH_TIMEOUT_MS = 8_000;

/**
 * Reverse-geocodes browser-supplied coordinates ("detect my location") into
 * a structured address, so the checkout form can be pre-filled instead of
 * typed from scratch. Proxied through our own server rather than called
 * directly from the browser because:
 *  - OpenStreetMap Nominatim's usage policy requires a descriptive
 *    User-Agent identifying the application, which only a server request
 *    can reliably set.
 *  - Keeps rate limiting and abuse control under our own control instead
 *    of exposing an unauthenticated public API straight to the client.
 * No API key is needed — Nominatim is a free public service.
 */
export async function GET(request: Request) {
  const key = clientKeyFromHeaders(request.headers);
  const limited = rateLimit(`geocode:${key}`, { limit: 15, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: 'Too many requests, try again shortly' }, { status: 429 });
  }

  const url = new URL(request.url);
  const parsed = reverseGeocodeQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }
  const { lat, lon } = parsed.data;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1&zoom=18`;
    const res = await fetch(nominatimUrl, {
      signal: controller.signal,
      headers: {
        // Required by Nominatim's usage policy: identify the calling app.
        'User-Agent': 'PachimghatStorefront/1.0 (contact: support@pachimghat.com)',
        'Accept-Language': 'en',
      },
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Could not detect an address for that location' }, { status: 502 });
    }
    const data = await res.json();
    const addr = data.address ?? {};

    // Nominatim names the same thing differently depending on the place
    // (city / town / village, suburb / neighbourhood / hamlet…), so each
    // form field takes the first of several candidates.
    const pick = (...keys: string[]): string => {
      for (const k of keys) {
        const v = addr[k];
        if (typeof v === 'string' && v.trim()) return v.trim();
      }
      return '';
    };
    const uniq = (parts: string[]) => [...new Set(parts.filter(Boolean))];

    const premise = pick('house_number', 'house_name');
    const building = pick('building', 'amenity', 'shop', 'office', 'residential');
    const road = pick('road', 'pedestrian', 'footway', 'path');
    const city = pick('city', 'town', 'municipality', 'village', 'city_district', 'state_district', 'county');
    const line1 = uniq([premise, building, road]).join(', ');
    const line2 = uniq([pick('neighbourhood', 'quarter', 'hamlet'), pick('suburb', 'city_district')])
      .filter((part) => part !== city)
      .join(', ');
    // Indian PIN codes are 6 digits; drop anything else rather than
    // pre-filling a value the checkout form would reject.
    const digits = pick('postcode').replace(/\D/g, '');
    const pincode = digits.length === 6 ? digits : '';

    if (!line1 && !line2 && !city && !pincode) {
      return NextResponse.json({ error: 'No address found for your location — please type it in' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      addressLine1: line1,
      addressLine2: line2,
      city,
      state: pick('state'),
      pincode,
      displayName: typeof data.display_name === 'string' ? data.display_name.slice(0, 300) : '',
    });
  } catch {
    return NextResponse.json({ error: 'Location lookup timed out' }, { status: 504 });
  } finally {
    clearTimeout(timer);
  }
}
