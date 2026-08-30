'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, cn } from '@/components/ui';

export function GrantAccessForm() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', phone: '', name: '', reason: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/admin/grant-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: 'Access granted.' });
      setForm({ email: '', phone: '', name: '', reason: '' });
      router.refresh();
    } else {
      setMsg({ ok: false, text: j.error ?? 'Could not grant access.' });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="Email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          placeholder="Phone"
          inputMode="numeric"
          required
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="tnum"
        />
        <Input
          placeholder="Name (optional)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          placeholder="Reason (optional)"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />
      </div>
      {msg && (
        <p
          role="status"
          className={cn(
            'rounded-card px-3 py-2 text-sm',
            msg.ok ? 'bg-good-tint text-good' : 'bg-reach-tint text-reach',
          )}
        >
          {msg.text}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? 'Granting\u2026' : 'Grant access'}
      </Button>
    </form>
  );
}
