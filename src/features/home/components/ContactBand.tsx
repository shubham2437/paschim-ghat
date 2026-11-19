'use client';

import { useUiStore } from '@/components/ui/ui-store';
import { useSiteConfig } from '@/features/catalog/hooks/useSiteConfig';

export function ContactBand() {
  const openWaModal = useUiStore((s) => s.openWaModal);
  const { data } = useSiteConfig();
  const phone = data?.settings.phone ?? '';
  const email = data?.settings.email ?? '';

  return (
    <div className="band" id="contact">
      <div className="jaali" />
      <div className="wrap band-in">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2>Need a different pack size or a bulk order?</h2>
          <p>Message us on WhatsApp with what you need and we&apos;ll get back with price and availability.</p>
        </div>
        <div className="band-act">
          <button className="btn btn-gold" onClick={openWaModal}>✆ WhatsApp us</button>
          {phone && (
            <a
              className="btn btn-ghost"
              style={{ color: '#F3E7CE', borderColor: 'rgba(235,208,138,.4)' }}
              href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
            >
              ☎ {phone}
            </a>
          )}
          {email && (
            <a
              className="btn btn-ghost"
              style={{ color: '#F3E7CE', borderColor: 'rgba(235,208,138,.4)' }}
              href={`mailto:${email}`}
            >
              ✉ {email}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
