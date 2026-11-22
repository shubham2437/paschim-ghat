import { z } from 'zod';

export const productQuerySchema = z.object({
  category: z.string().trim().max(60).regex(/^[a-z0-9-]*$/i).optional(),
  q: z.string().trim().max(80).optional(),
  maxPrice: z.coerce.number().int().min(0).max(1_000_000).optional(),
  sort: z.enum(['featured', 'lo', 'hi', 'off']).optional(),
  /** fresh=1: re-read the Sheet before answering (throttled server-side). */
  fresh: z.enum(['1']).optional(),
});

/**
 * Phone: digits, spaces, '+' and '-' only, and 10–13 actual digits once the
 * separators are removed (a 10-digit Indian mobile, optionally with 0, 91 or
 * +91 in front).
 */
const phoneSchema = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s]{10,18}$/, 'Enter a valid phone number')
  .refine((v) => {
    const digits = v.replace(/\D/g, '').length;
    return digits >= 10 && digits <= 13;
  }, 'Enter a valid phone number');

/**
 * Free text that ends up inside the WhatsApp message. Control characters are
 * stripped later in encodeForWa(); here we also refuse links, which have no
 * place in a name/address and are a common spam payload.
 */
const noLinks = (v: string) => !/(https?:\/\/|www\.)/i.test(v);
const safeText = (min: number, max: number, msg?: string) =>
  z
    .string()
    .trim()
    .min(min, msg)
    .max(max)
    .refine(noLinks, 'Links are not allowed here');

/** Token produced by the Turnstile widget (checked in lib/server/turnstile.ts). */
const turnstileTokenSchema = z.string().max(2048).optional();

export const whatsappOrderSchema = z.object({
  name: safeText(2, 80),
  phone: phoneSchema,
  message: z.string().trim().max(500).refine(noLinks, 'Links are not allowed here').optional().default(''),
  turnstileToken: turnstileTokenSchema,
});

/**
 * A basket line only says WHICH pack and HOW MANY. Name and price are never
 * taken from the browser: the checkout route looks them up in the catalogue.
 */
const checkoutLineSchema = z.object({
  productId: z.string().trim().min(1).max(60),
  sku: z.string().trim().max(60).optional().default(''),
  /** Pack label (e.g. "250g") — used to find the pack when it has no SKU. */
  desc: z.string().trim().max(60).optional().default(''),
  qty: z.coerce.number().int().min(1).max(99),
});

export const whatsappCheckoutSchema = z.object({
  items: z.array(checkoutLineSchema).min(1).max(50),
  couponCode: z.string().trim().max(30).regex(/^[A-Za-z0-9_-]*$/).optional(),
  turnstileToken: turnstileTokenSchema,
  customerName: safeText(2, 80, 'Enter your name'),
  addressLine1: safeText(4, 200, 'Enter flat/house no. & building'),
  addressLine2: safeText(0, 200).optional().default(''),
  city: safeText(2, 100, 'Enter your city'),
  // Indian PIN codes are 6 digits and never start with 0.
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code'),
  phone: phoneSchema,
});

export const reverseGeocodeQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
export type WhatsappOrderInput = z.infer<typeof whatsappOrderSchema>;
export type WhatsappCheckoutInput = z.infer<typeof whatsappCheckoutSchema>;
export type ReverseGeocodeQuery = z.infer<typeof reverseGeocodeQuerySchema>;
