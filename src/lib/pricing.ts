import type { CouponDef } from '@/types/site-content';

/**
 * Order maths shared by the cart UI and the checkout API, so the total the
 * customer sees is computed exactly the same way the server recomputes it
 * from the catalogue's real prices.
 */

export interface PricedLine {
  price: number;
  mrp: number;
  qty: number;
}

/**
 * @param freeShipAt  order value that unlocks free delivery (0 = no such offer)
 * @param shipCost    flat delivery fee (0 = none added; confirmed on WhatsApp)
 */
export function cartTotals(lines: Record<string, PricedLine> | PricedLine[], freeShipAt = 0, shipCost = 0) {
  let sub = 0;
  let mrp = 0;
  let items = 0;
  for (const line of Object.values(lines)) {
    sub += line.price * line.qty;
    mrp += line.mrp * line.qty;
    items += line.qty;
  }
  const qualifiesFree = freeShipAt > 0 && sub >= freeShipAt;
  const ship = sub > 0 && shipCost > 0 && !qualifiesFree ? shipCost : 0;
  return { sub, mrp, items, ship, total: sub + ship, saved: mrp - sub, freeShipAt };
}

/** Applies an (already looked-up) coupon to a subtotal + delivery fee. */
export function applyCoupon(sub: number, ship: number, coupon: CouponDef | null | undefined) {
  let discount = 0;
  if (coupon?.type === 'pct') discount = Math.round((sub * coupon.value) / 100);
  if (coupon?.type === 'flat') discount = Math.min(coupon.value, sub);
  const finalShip = coupon?.type === 'ship' ? 0 : ship;
  const total = Math.max(0, sub - discount) + finalShip;
  return { discount, ship: finalShip, total };
}
