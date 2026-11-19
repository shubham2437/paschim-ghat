import 'server-only';
import { getSiteConfig } from '@/data/site-content.server';

/** Strip control characters (keeping newlines, which wa.me renders as line
 * breaks) and URL-encode text for a wa.me query component. */
export function encodeForWa(text: string): string {
  // eslint-disable-next-line no-control-regex
  const stripped = text.replace(/\r\n/g, '\n').replace(/[\x00-\x09\x0b-\x1f\x7f]/g, ' ').trim().slice(0, 1500);
  return encodeURIComponent(stripped);
}

/**
 * The business WhatsApp number lives server-side only — it comes from the
 * catalogue workbook's Settings tab (falling back to the env var), never
 * from anything the client sends, and is only ever returned baked into a
 * final wa.me URL.
 */
export async function getWhatsappBusinessNumber(): Promise<string> {
  const { settings } = await getSiteConfig();
  const raw = settings.whatsapp || process.env.WHATSAPP_BUSINESS_NUMBER || '';
  return raw.replace(/[^0-9]/g, '');
}

export async function buildWaUrl(message: string): Promise<string | null> {
  const number = await getWhatsappBusinessNumber();
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeForWa(message)}`;
}
