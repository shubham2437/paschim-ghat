import { z } from 'zod';

export const productQuerySchema = z.object({
  category: z.string().trim().max(60).regex(/^[a-z0-9-]*$/i).optional(),
  q: z.string().trim().max(80).optional(),
  maxPrice: z.coerce.number().int().min(0).max(1_000_000).optional(),
  sort: z.enum(['featured', 'lo', 'hi', 'off']).optional(),
  /** fresh=1: re-read the Sheet before answering (throttled server-side). */
  fresh: z.enum(['1']).optional(),
});

export const whatsappOrderSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,16}$/, 'Enter a valid phone number'),
  message: z.string().trim().max(500).optional().default(''),
});

const checkoutLineSchema = z.object({
  name: z.string().trim().min(1).max(120),
  desc: z.string().trim().max(60).optional().default(''),
  qty: z.coerce.number().int().min(1).max(99),
  price: z.coerce.number().min(0).max(1_000_000),
});

export const whatsappCheckoutSchema = z.object({
  items: z.array(checkoutLineSchema).min(1).max(50),
  total: z.coerce.number().min(0).max(10_000_000),
  couponCode: z.string().trim().max(30).optional(),
  customerName: z.string().trim().min(2, 'Enter your name').max(80),
  addressLine1: z.string().trim().min(4, 'Enter flat/house no. & building').max(200),
  addressLine2: z.string().trim().max(200).optional().default(''),
  city: z.string().trim().min(2, 'Enter your city').max(100),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,16}$/, 'Enter a valid phone number'),
});

export const reverseGeocodeQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
export type WhatsappOrderInput = z.infer<typeof whatsappOrderSchema>;
export type WhatsappCheckoutInput = z.infer<typeof whatsappCheckoutSchema>;
export type ReverseGeocodeQuery = z.infer<typeof reverseGeocodeQuerySchema>;
