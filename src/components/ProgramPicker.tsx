'use client';

import { useMemo, useState } from 'react';
import Sheet from './Sheet';

export interface ProgramOption { id: number; name: string; degree: string | null }

/**
 * Multi-select programme picker.
 *
 * Opens as a bottom sheet on phones, keeping the list under the thumb without
 * moving the form behind it. Options come from the imported dataset, so the
 * list always matches the data actually loaded.
 */
export default function ProgramPicker({
  options, selected, onChange,
}: {
  options: ProgramOption[];
  selected: number[] | 'ALL';
  onChange: (v: number[] | 'ALL') => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<number[] | 'ALL'>(selected);

  // The same branch appears at many institutes. Group by name so a student
  // picks a subject once instead of scrolling twenty near-identical rows.
  const grouped = useMemo(() => {
    const byName = new Map<string, number[]>();
    for (const o of options) {
      const list = byName.get(o.name);
      if (list) list.push(o.id); else byName.set(o.name, [o.id]);
    }
    return [...byName.entries()].map(([name, ids]) => ({ name, ids })).sort((a, b) => a.name.localeCompare(b.name));
  }, [options]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? grouped.filter((g) => g.name.toLowerCase().includes(q)) : grouped;
  }, [grouped, query]);

  const draftIds = draft === 'ALL' ? null : new Set(draft);
  const isOn = (ids: number[]) => (draftIds ? ids.some((i) => draftIds.has(i)) : true);

  const toggle = (ids: number[]) => {
    const current = draft === 'ALL' ? new Set(options.map((o) => o.id)) : new Set(draft);
    const on = ids.some((i) => current.has(i));
    for (const i of ids) { if (on) current.delete(i); else current.add(i); }
    setDraft(current.size === options.length ? 'ALL' : [...current]);
  };

  const selectedCount = draft === 'ALL' ? grouped.length : grouped.filter((g) => isOn(g.ids)).length;

  const label =
    selected === 'ALL'
      ? 'All programmes'
      : (() => {
          const set = new Set(selected);
          const names = grouped.filter((g) => g.ids.some((i) => set.has(i))).map((g) => g.name);
          if (names.length === 0) return 'All programmes';
          if (names.length === 1) return names[0];
          return `${names[0]} +${names.length - 1} more`;
        })();

  return (
    <>
      <button
        type="button"
        className="input"
        onClick={() => { setDraft(selected); setQuery(''); setOpen(true); }}
        style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: 'pointer' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span aria-hidden style={{ color: 'var(--muted)', flexShrink: 0, fontSize: 14 }}>Change</span>
      </button>

      {open && (
        <Sheet
          title="Choose programmes"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDraft(selectedCount === grouped.length ? [] : 'ALL')}>
                {selectedCount === grouped.length ? 'Clear all' : 'Select all'}
              </button>
              <button type="button" className="btn btn-primary" style={{ flex: 2 }} onClick={() => { onChange(draft === 'ALL' || (draft as number[]).length ? draft : 'ALL'); setOpen(false); }}>
                Done
              </button>
            </>
          }
        >
          <input
            className="input"
            type="search"
            placeholder="Search programmes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search programmes"
            style={{ marginBottom: 14 }}
          />
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }} aria-live="polite">
            {selectedCount} of {grouped.length} selected
          </p>

          {visible.length === 0 ? (
            <p style={{ color: 'var(--muted)', padding: '20px 0' }}>No programme matches that search.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {visible.map((g) => (
                <li key={g.name}>
                  <label style={{ display: 'flex', gap: 12, alignItems: 'center', minHeight: 46, cursor: 'pointer', borderBottom: '1px solid var(--rule)' }}>
                    <input type="checkbox" checked={isOn(g.ids)} onChange={() => toggle(g.ids)} style={{ width: 19, height: 19, accentColor: 'var(--brand)' }} />
                    <span style={{ fontSize: 15 }}>{g.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Sheet>
      )}
    </>
  );
}
