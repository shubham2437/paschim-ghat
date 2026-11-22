'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useUiStore } from '@/components/ui/ui-store';
import { useToast } from '@/components/ui/toast-provider';
import { useSiteConfig } from '@/features/catalog/hooks/useSiteConfig';
import { Turnstile, type TurnstileHandle } from '@/components/ui/Turnstile';

export function WhatsAppOrderModal() {
  const open = useUiStore((s) => s.waModalOpen);
  const closeAll = useUiStore((s) => s.closeAll);
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<TurnstileHandle>(null);
  const { data: siteConfig } = useSiteConfig();
  const turnstileSiteKey = siteConfig?.turnstileSiteKey ?? '';

  if (!open) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (turnstileSiteKey && !turnstileToken) {
      toast('Please wait a moment for the security check to finish');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/whatsapp-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, message, turnstileToken: turnstileToken || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || 'Could not start WhatsApp order');
        return;
      }
      window.open(data.url, '_blank', 'noopener,noreferrer');
      closeAll();
      setName('');
      setPhone('');
      setMessage('');
    } catch {
      toast('Network error — please try again');
    } finally {
      // Turnstile tokens are single-use: get a fresh one for any retry.
      setTurnstileToken('');
      turnstileRef.current?.reset();
      setBusy(false);
    }
  }

  return (
    <div className="modal on" role="dialog" aria-modal="true" aria-label="Order on WhatsApp">
      <div className="modal-in" style={{ maxWidth: 420 }}>
        <button className="closeX" onClick={closeAll} aria-label="Close">
          ✕
        </button>
        <form onSubmit={submit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="kicker">Order on WhatsApp</span>
          <h2 style={{ fontSize: 22 }}>Tell us what you need</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: 0 }}>
            We&apos;ll open WhatsApp with your details pre-filled. No spam, no account needed.
          </p>
          <label className="sr" htmlFor="wa-name">Name</label>
          <input
            id="wa-name"
            required
            minLength={2}
            maxLength={80}
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: 11, borderRadius: 12, border: '1px solid var(--line-2)', background: 'var(--paper)' }}
          />
          <label className="sr" htmlFor="wa-phone">Phone</label>
          <input
            id="wa-phone"
            required
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ padding: 11, borderRadius: 12, border: '1px solid var(--line-2)', background: 'var(--paper)' }}
          />
          <label className="sr" htmlFor="wa-msg">Message</label>
          <textarea
            id="wa-msg"
            placeholder="What would you like to order? (optional)"
            maxLength={500}
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ padding: 11, borderRadius: 12, border: '1px solid var(--line-2)', background: 'var(--paper)', resize: 'vertical' }}
          />
          {turnstileSiteKey && (
            <Turnstile ref={turnstileRef} siteKey={turnstileSiteKey} action="wa-order" onToken={setTurnstileToken} />
          )}
          <button type="submit" className="btn btn-gold btn-block" disabled={busy}>
            {busy ? 'Opening…' : '✆ Continue on WhatsApp'}
          </button>
        </form>
      </div>
    </div>
  );
}
