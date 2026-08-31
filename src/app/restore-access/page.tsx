'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button, Field, Input } from '@/components/ui';

export default function RestoreAccessPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/access/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'We could not restore your access.');
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/'), 1200);
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen py-10">
      <h1 className="text-display-sm font-bold text-ink">Restore my access</h1>
      <p className="mt-2 leading-relaxed text-ink-muted">
        Enter the email and phone number you used when you paid, and we will let you
        back into your results.
      </p>

      {done ? (
        <div className="mt-6 rounded-card bg-good-tint px-4 py-4 text-sm font-medium text-good">
          Access restored. Taking you to the predictor\u2026
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Phone number" hint="The 10-digit number you paid with." htmlFor="phone">
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="tnum"
            />
          </Field>

          {error && (
            <p role="alert" className="rounded-card bg-reach-tint px-4 py-3 text-sm text-reach">
              {error}
            </p>
          )}

          <Button size="lg" type="submit" className="w-full" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Checking
              </>
            ) : (
              'Restore access'
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
