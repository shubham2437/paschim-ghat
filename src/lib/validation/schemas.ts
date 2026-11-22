import { z } from 'zod';

export const productQuerySchema = z.object({
  category: z.string().trim().max(60).regex(/^[a-z0-9-]*$/i).optional(),
  q: z.string().trim().max(80).optional(),
  maxPrice: z.coerce.number().int().min(0).max(1_000_000).optional(),
  sort: z.enum(['featured', 'lo', 'hi', 'off']).optional(),
  /** fresh=1: re-read the Sheet before answering (throttled server-side). */
  fresh: z.enum(['1']).optional(),
});

// --- shared field rules (server-side source of truth; never trust the browser) ---

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x08\x0b-\x1f\x7f]/;

/** Single-line text: trimmed, bounded, no control characters. */
const line = (min: number, max: number, msg?: string) =>
  z
    .string()
    .trim()
    .min(min, msg)
    .max(max)
    .refine((v) => !CONTROL_CHARS.test(v) && !/[\r\n]/.test(v), 'Contains invalid characters');

const personName = (msg: string) =>
  line(2, 80, msg).refine((v) => /\p{L}/u.test(v), msg);

/** 10–13 digits, optional leading +; spaces and dashes are stripped. */
const phoneField = z
  .string()
  .trim()
  .max(20)
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine((v) => /^\+?\d{10,13}$/.test(v), 'Enter a valid phone number');

const turnstileToken = z.string().max(2048).optional();

export const whatsappOrderSchema = z.object({
  name: personName('Enter your name'),
  phone: phoneField,
  message: z
    .string()
    .trim()
    .max(500)
    .refine((v) => !CONTROL_CHARS.test(v), 'Contains invalid characters')
    .optional()
    .default(''),
  turnstileToken,
});

/**
 * The browser only says WHICH product/pack and HOW MANY. Names, prices,
 * discounts and totals are all looked up / recomputed on the server.
 */
const checkoutLineSchema = z.object({
  productId: z.string().trim().min(1).max(60),
  sku: z.string().trim().max(60).optional().default(''),
  /** Pack label, e.g. "250g" — only used when the row has no SKU. */
  desc: z.string().trim().max(60).optional().default(''),
  qty: z.coerce.number().int('Quantity must be a whole number').min(1).max(99),
});

export const whatsappCheckoutSchema = z.object({
  items: z.array(checkoutLineSchema).min(1, 'Your basket is empty').max(50),
  couponCode: z.string().trim().max(30).optional(),
  customerName: personName('Enter your name'),
  addressLine1: line(4, 200, 'Enter flat/house no. & building'),
  addressLine2: line(0, 200).optional().default(''),
  city: line(2, 100, 'Enter your city'),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code'),
  phone: phoneField,
  turnstileToken,
});

export const reverseGeocodeQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
export type WhatsappOrderInput = z.infer<typeof whatsappOrderSchema>;
export type WhatsappCheckoutInput = z.infer<typeof whatsappCheckoutSchema>;
export type ReverseGeocodeQuery = z.infer<typeof reverseGeocodeQuerySchema>;
