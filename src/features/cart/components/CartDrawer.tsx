'use client';

import { useRef, useState, type CSSProperties } from 'react';
import { useUiStore } from '@/components/ui/ui-store';
import { useCartStore, cartTotals } from '@/features/cart/store/cart-store';
import { ProductArt } from '@/features/catalog/components/ProductArt';
import { useToast } from '@/components/ui/toast-provider';
import { useSiteConfig } from '@/features/catalog/hooks/useSiteConfig';
import { money } from '@/lib/utils/format';
import { applyCoupon } from '@/lib/pricing';
import { Turnstile, type TurnstileHandle } from '@/components/ui/Turnstile';

const fieldStyle: CSSProperties = {
  padding: 10,
  borderRadius: 12,
  border: '1px solid var(--line-2)',
  background: 'var(--paper)',
  fontSize: 13.5,
  width: '100%',
};

export function CartDrawer() {
  const open = useUiStore((s) => s.cartOpen);
  const closeAll = useUiStore((s) => s.closeAll);
  const lines = useCartStore((s) => s.lines);
  const incLine = useCartStore((s) => s.incLine);
  const decLine = useCartStore((s) => s.decLine);
  const { toast } = useToast();
  const { data: siteConfig } = useSiteConfig();
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<TurnstileHandle>(null);
  const turnstileSiteKey = siteConfig?.turnstileSiteKey ?? '';

  const T = cartTotals(
    lines,
    siteConfig?.settings.free_shipping_above,
    siteConfig?.settings.delivery_fee
  );
  const c = applied ? siteConfig?.coupons.find((x) => x.code === applied) : null;
  const { discount, ship, total } = applyCoupon(T.sub, T.ship, c);

  const list = Object.values(lines);
  const hasFreeShip = T.freeShipAt > 0;
  const pct = hasFreeShip ? Math.min(100, (T.sub / T.freeShipAt) * 100) : 0;
  const hasCoupons = (siteConfig?.coupons.length ?? 0) > 0;
  // No fee and no threshold configured: delivery is agreed on WhatsApp, so
  // don't claim it is free.
  const deliveryUnknown = !hasFreeShip && !(siteConfig?.settings.delivery_fee ?? 0);
  const savedTotal = T.saved + discount;

  function getPosition(highAccuracy: boolean): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: highAccuracy,
        timeout: highAccuracy ? 8_000 : 12_000,
        maximumAge: highAccuracy ? 0 : 60_000,
      });
    });
  }

  async function detectLocation() {
    if (detecting) return;
    if (!('geolocation' in navigator)) {
      toast('Your browser does not support location detection');
      return;
    }
    // Browsers only allow geolocation on https:// pages (and localhost).
    if (!window.isSecureContext) {
      toast('Location detection needs a secure (https) connection — enter your address manually');
      return;
    }
    setDetecting(true);
    try {
      let pos: GeolocationPosition;
      try {
        pos = await getPosition(true);
      } catch (err) {
        // GPS can time out indoors or be unavailable on desktops: fall back
        // to the quicker network-based position. A refusal is final.
        if ((err as GeolocationPositionError).code === 1) throw err;
        pos = await getPosition(false);
      }

      const { latitude, longitude, accuracy } = pos.coords;
      const res = await fetch(`/api/geocode/reverse?lat=${latitude.toFixed(6)}&lon=${longitude.toFixed(6)}`);
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || 'Could not detect your address');
        return;
      }
      // Replace all four fields together so a second attempt never leaves a
      // mix of the old and new address.
      setAddressLine1(data.addressLine1 || '');
      setAddressLine2([data.addressLine2, data.state].filter(Boolean).join(', '));
      setCity(data.city || '');
      setPincode(data.pincode || '');
      toast(
        accuracy > 1000
          ? `Approximate location only (within ~${Math.round(accuracy / 1000)} km) — please correct the address`
          : 'Location detected — add your house/flat number and check the address'
      );
    } catch (err) {
      const code = (err as GeolocationPositionError | undefined)?.code;
      toast(
        code === 1
          ? 'Location permission denied — allow it in your browser, or enter your address manually'
          : code === 2 || code === 3
            ? 'Could not get your location — enter your address manually'
            : 'Network error while detecting location'
      );
    } finally {
      setDetecting(false);
    }
  }

  return (
    <aside className={`cart ${open ? 'on' : ''}`} aria-label="Basket" aria-hidden={!open}>
      <div className="cart-hd">
        <h3>Your basket</h3>
        <button className="iconbtn" aria-label="Close" onClick={closeAll}>✕</button>
      </div>
      {hasFreeShip && (
        <div className="ship-bar">
          {T.sub >= T.freeShipAt ? (
            <>
              <b>✓ Free delivery unlocked.</b>
              <div className="track"><i style={{ width: '100%' }} /></div>
            </>
          ) : (
            <>
              Add <b>{money(T.freeShipAt - T.sub)}</b> more for free delivery.
              <div className="track"><i style={{ width: `${pct}%` }} /></div>
            </>
          )}
        </div>
      )}
      <div className="cart-body">
        {list.length ? (
          list.map((line) => (
            <div className="citem" key={line.key}>
              <div className="th">
                <ProductArt kind={line.art} seed={line.seed} w={140} h={110} />
              </div>
              <div>
                <b>{line.name}</b>
                <small>{line.desc}</small>
                <div className="qty" style={{ marginTop: 6, width: 'max-content' }}>
                  <button aria-label="Remove one" onClick={() => decLine(line.key)}>−</button>
                  <span>{line.qty}</span>
                  <button aria-label="Add one" onClick={() => incLine(line.key)}>+</button>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <b>{money(line.price * line.qty)}</b>
                {line.mrp > line.price && (
                  <>
                    <br />
                    <s style={{ color: 'var(--muted)', fontSize: 11.5 }}>{money(line.mrp * line.qty)}</s>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty">
            <div style={{ fontSize: 38 }} aria-hidden="true">🧺</div>
            <p>Your basket is empty.</p>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                closeAll();
                document.getElementById('shop')?.scrollIntoView();
              }}
            >
              Start shopping
            </button>
          </div>
        )}
      </div>
      <div className="cart-ft">
        {list.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <b style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', flex: 1 }}>
                Delivery details
              </b>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={detectLocation}
                disabled={detecting}
                style={{ fontSize: 11.5, padding: '6px 10px' }}
              >
                {detecting ? 'Detecting…' : '📍 Detect my location'}
              </button>
            </div>
            <label className="sr" htmlFor="ck-name">Your name</label>
            <input
              id="ck-name"
              placeholder="Your name"
              value={customerName}
              maxLength={80}
              onChange={(e) => setCustomerName(e.target.value)}
              style={fieldStyle}
            />
            <label className="sr" htmlFor="ck-phone">Phone number</label>
            <input
              id="ck-phone"
              placeholder="Phone number"
              value={phone}
              maxLength={16}
              onChange={(e) => setPhone(e.target.value)}
              style={fieldStyle}
            />
            <label className="sr" htmlFor="ck-address1">Address line 1</label>
            <input
              id="ck-address1"
              placeholder="Address line 1 — flat/house no., building"
              value={addressLine1}
              maxLength={200}
              onChange={(e) => setAddressLine1(e.target.value)}
              style={fieldStyle}
            />
            <label className="sr" htmlFor="ck-address2">Address line 2</label>
            <input
              id="ck-address2"
              placeholder="Address line 2 — street, area, landmark (optional)"
              value={addressLine2}
              maxLength={200}
              onChange={(e) => setAddressLine2(e.target.value)}
              style={fieldStyle}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                aria-label="City"
                placeholder="City"
                value={city}
                maxLength={100}
                onChange={(e) => setCity(e.target.value)}
                style={{ ...fieldStyle, flex: 2 }}
              />
              <input
                aria-label="PIN code"
                placeholder="PIN code"
                value={pincode}
                maxLength={6}
                inputMode="numeric"
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                style={{ ...fieldStyle, flex: 1 }}
              />
            </div>
          </div>
        )}
        {hasCoupons && (
          <div className="coupon">
            <input
              placeholder="Coupon code"
              aria-label="Coupon code"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
            />
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const code = coupon.trim().toUpperCase();
                const found = siteConfig?.coupons.find((x) => x.code === code);
                if (found) {
                  setApplied(code);
                  toast(found.label + ' applied');
                } else {
                  setApplied(null);
                  toast('That code is not valid.');
                }
              }}
            >
              Apply
            </button>
          </div>
        )}
        <div className="srow"><span>Subtotal</span><span>{money(T.sub)}</span></div>
        {savedTotal > 0 && (
          <div className="srow"><span>You saved</span><span style={{ color: 'var(--ok)' }}>− {money(savedTotal)}</span></div>
        )}
        <div className="srow">
          <span>Delivery</span>
          <span>{ship ? money(ship) : deliveryUnknown ? 'Confirmed on WhatsApp' : 'FREE'}</span>
        </div>
        <div className="srow tot"><span>{deliveryUnknown ? 'Total (before delivery)' : 'Total'}</span><span>{money(total)}</span></div>
        {turnstileSiteKey && T.items > 0 && (
          <div style={{ marginTop: 12 }}>
            <Turnstile
              ref={turnstileRef}
              siteKey={turnstileSiteKey}
              action="checkout"
              onToken={setTurnstileToken}
            />
          </div>
        )}
        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 12 }}
          disabled={!T.items || checkingOut}
          onClick={async () => {
            if (customerName.trim().length < 2) {
              toast('Enter your name');
              return;
            }
            const phoneDigits = phone.replace(/\D/g, '').length;
            if (!/^[0-9+\-\s]{10,18}$/.test(phone.trim()) || phoneDigits < 10 || phoneDigits > 13) {
              toast('Enter a valid phone number');
              return;
            }
            if (addressLine1.trim().length < 4) {
              toast('Enter address line 1');
              return;
            }
            if (city.trim().length < 2) {
              toast('Enter your city');
              return;
            }
            if (!/^\d{6}$/.test(pincode.trim())) {
              toast('Enter a valid 6-digit PIN code');
              return;
            }
            if (turnstileSiteKey && !turnstileToken) {
              toast('Please wait a moment for the security check to finish');
              return;
            }
            setCheckingOut(true);
            try {
              const res = await fetch('/api/whatsapp-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  // Only product IDs + quantities are sent: the server looks up
                  // the real prices in the catalogue and recomputes the total.
                  items: list.map((line) => ({
                    productId: line.productId,
                    sku: line.sku,
                    desc: line.desc,
                    qty: line.qty,
                  })),
                  turnstileToken: turnstileToken || undefined,
                  couponCode: c ? applied : undefined,
                  customerName,
                  phone,
                  addressLine1,
                  addressLine2,
                  city,
                  pincode,
                }),
              });
              const data = await res.json();
              if (!res.ok) {
                toast(data.error || 'Could not start checkout');
                return;
              }
              window.open(data.url, '_blank', 'noopener,noreferrer');
              closeAll();
            } catch {
              toast('Network error — please try again');
            } finally {
              // Turnstile tokens are single-use: get a fresh one for any retry.
              setTurnstileToken('');
              turnstileRef.current?.reset();
              setCheckingOut(false);
            }
          }}
        >
          {checkingOut ? 'Opening WhatsApp…' : '✆ Checkout on WhatsApp'}
        </button>
      </div>
    </aside>
  );
}
