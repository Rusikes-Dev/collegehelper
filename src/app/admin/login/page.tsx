'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button, Field, Input } from '@/components/ui';

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword(form);
    setBusy(false);
    if (error) {
      setError('Those credentials were not accepted.');
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm py-10">
      <h2 className="font-display text-display-sm font-semibold text-ink">Sign in</h2>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>
        {error && (
          <p role="alert" className="rounded-card bg-reach-tint px-4 py-3 text-sm text-reach">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Signing in\u2026' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
