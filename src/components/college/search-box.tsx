'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button, Input } from '@/components/ui';

export function CollegeSearchBox({ initial = '' }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/colleges?q=${encodeURIComponent(q.trim())}`);
      }}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search colleges\u2026"
        aria-label="Search colleges by name, city, district or institute code"
        className="sm:max-w-lg"
      />
      <Button type="submit" size="lg">
        <Search size={18} /> Search
      </Button>
    </form>
  );
}
