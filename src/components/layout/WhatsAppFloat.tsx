'use client';

import { useUiStore } from '@/components/ui/ui-store';

export function WhatsAppFloat() {
  const openWaModal = useUiStore((s) => s.openWaModal);
  return (
    <button className="wafloat" onClick={openWaModal} aria-label="Order on WhatsApp">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 0 0-8.7 15L2 22l5.2-1.3A10 10 0 1 0 12 2Zm5.6 14.1c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 .1-3.2-.8-2.7-1.1-4.4-3.9-4.5-4-.1-.2-1.1-1.4-1.1-2.7 0-1.3.7-1.9.9-2.2.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .6l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.2.1.4.1.6-.1l.8-1c.2-.2.3-.2.6-.1l2 .9c.2.1.4.2.4.3.1.2.1.7-.1 1.3Z" />
      </svg>
      <span>Order on WhatsApp</span>
    </button>
  );
}
