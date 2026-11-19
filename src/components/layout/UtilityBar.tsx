'use client';

import { useUiStore } from '@/components/ui/ui-store';
import type { SiteSettings } from '@/types/site-content';

export function UtilityBar({ settings }: { settings: SiteSettings }) {
  const openWaModal = useUiStore((s) => s.openWaModal);
  return (
    <div className="util">
      <div className="wrap util-in">
        <span className="rt">
          <a href="/api/price-list" className="hide-m">⬇ Price list</a>
          {settings.phone && (
            <a href={`tel:${settings.phone.replace(/[^0-9+]/g, '')}`}>☎ {settings.phone}</a>
          )}
          <button type="button" className="wa" onClick={openWaModal}>✆ WhatsApp order</button>
        </span>
      </div>
    </div>
  );
}
