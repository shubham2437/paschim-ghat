'use client';

import { useEffect } from 'react';
import { useUiStore, isAnyOverlayOpen } from '@/components/ui/ui-store';

export function Scrim() {
  const open = useUiStore(isAnyOverlayOpen);
  const closeAll = useUiStore((s) => s.closeAll);

  // While a drawer or dialog is open: stop the page behind it from
  // scrolling (matters most on phones) and let Escape close it.
  useEffect(() => {
    if (!open) return;
    document.body.classList.add('locked');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('locked');
      window.removeEventListener('keydown', onKey);
    };
  }, [open, closeAll]);

  return <div className={`scrim ${open ? 'on' : ''}`} onClick={closeAll} aria-hidden="true" />;
}
