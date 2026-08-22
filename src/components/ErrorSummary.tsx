'use client';

import { useEffect, useRef } from 'react';

/**
 * The error summary that appears above a form when submission fails.
 *
 * Per-field messages alone are not enough on a phone. The form is taller than
 * the screen, so a student who taps submit and gets nothing has no idea
 * whether the request failed, whether something is invalid, or where. This
 * block appears at a fixed place, says how many fields need attention, and
 * links to each one.
 *
 * It takes focus on appearing so a screen reader announces it immediately, and
 * uses `tabIndex={-1}` so it is focusable programmatically without joining the
 * tab order afterwards.
 */

export interface ErrorSummaryProps {
  /** Field id -> message. The `form` key is a whole-form failure, not a field. */
  errors: Record<string, string>;
  /** Human labels per field id, so the links read as words rather than ids. */
  labels?: Record<string, string>;
  title?: string;
}

export default function ErrorSummary({ errors, labels = {}, title }: ErrorSummaryProps) {
  const ref = useRef<HTMLDivElement>(null);
  const entries = Object.entries(errors).filter(([, message]) => Boolean(message));
  const count = entries.length;

  useEffect(() => {
    if (count > 0) {
      ref.current?.focus();
      ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [count]);

  if (count === 0) return null;

  const only = entries.length === 1 && entries[0][0] === 'form';

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-labelledby="error-summary-title"
      className="panel"
      style={{
        background: 'var(--miss-tint)',
        borderColor: 'var(--miss)',
        borderLeft: '3px solid var(--miss)',
      }}
    >
      <p id="error-summary-title" style={{ fontWeight: 600, fontSize: 15, color: 'var(--miss)' }}>
        {title ?? (only
          ? 'That did not go through'
          : `Check ${count} ${count === 1 ? 'field' : 'fields'} before continuing`)}
      </p>

      <ul style={{ margin: '10px 0 0', paddingLeft: only ? 0 : 20, listStyle: only ? 'none' : undefined, display: 'grid', gap: 6 }}>
        {entries.map(([field, message]) => (
          <li key={field} style={{ fontSize: 14.5, color: 'var(--ink-2)' }}>
            {field === 'form' ? (
              message
            ) : (
              <a
                href={`#${field}`}
                onClick={(e) => {
                  // Jump to the field itself rather than letting the hash
                  // scroll the label off the top of a phone screen.
                  e.preventDefault();
                  const el = document.getElementById(field);
                  el?.focus();
                  el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }}
                style={{ color: 'var(--miss)' }}
              >
                {labels[field] ? `${labels[field]}: ${message}` : message}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
