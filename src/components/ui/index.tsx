import * as React from 'react';
import Link from 'next/link';

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-card font-semibold ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS = {
  primary: 'bg-brand text-white hover:bg-brand-hover active:bg-brand-deep',
  secondary: 'border border-line bg-white text-ink hover:border-brand-edge hover:bg-brand-tint',
  ghost: 'text-brand hover:bg-brand-tint',
  danger: 'border border-reach-edge bg-white text-reach hover:bg-reach-tint',
} as const;

const SIZES = {
  // 44px and up: these are thumb targets on a phone, not mouse targets.
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-[0.9375rem]',
  lg: 'h-13 px-6 text-base',
} as const;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button className={cn(BUTTON_BASE, VARIANTS[variant], SIZES[size], className)} {...props} />
  );
}

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: {
  href: string;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(BUTTON_BASE, VARIANTS[variant], SIZES[size], className)}>
      {children}
    </Link>
  );
}

export const inputClass =
  'w-full rounded-card border border-line bg-white px-3.5 py-3 text-ink ' +
  'placeholder:text-ink-faint focus:border-brand focus:outline-none ' +
  'focus:ring-2 focus:ring-brand-ring';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(inputClass, className)} {...props} />;
  },
);

export const Field = ({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  htmlFor?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <label htmlFor={htmlFor} className="label">
      {label}
    </label>
    {hint && <p className="hint">{hint}</p>}
    {children}
    {error && (
      <p role="alert" className="text-sm font-medium text-reach">
        {error}
      </p>
    )}
  </div>
);

/** A tappable multi-select pill. Big enough to hit without zooming. */
export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'min-h-[2.75rem] shrink-0 rounded-full border px-4 text-sm transition-colors',
        active
          ? 'border-brand bg-brand text-white font-semibold'
          : 'border-line bg-white text-ink-muted hover:border-brand-edge hover:bg-brand-tint hover:text-brand',
      )}
    >
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('panel p-5', className)}>{children}</div>;
}

/** Page title block. Used at the top of every tab so they feel like one app. */
export function PageHeader({
  title,
  intro,
  meta,
}: {
  title: string;
  intro?: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className="pb-5 pt-7">
      <h1 className="text-display-lg font-bold text-ink">{title}</h1>
      {intro && <p className="mt-2.5 max-w-[46ch] leading-relaxed text-ink-muted">{intro}</p>}
      {meta && <div className="mt-3.5">{meta}</div>}
    </div>
  );
}

/**
 * A heading with a rule under it rather than a box around it, so a long page
 * separates into sections without turning into a stack of identical cards.
 */
export function SectionHead({
  title,
  aside,
  id,
}: {
  title: string;
  aside?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="section-head" id={id}>
      <h2 className="text-display-sm font-bold text-ink">{title}</h2>
      {aside && <span className="shrink-0 text-[0.8125rem] text-ink-faint">{aside}</span>}
    </div>
  );
}

/** A single figure with its caption. The figure leads; the caption explains. */
export function Stat({
  value,
  caption,
  tone = 'default',
}: {
  value: React.ReactNode;
  caption: string;
  tone?: 'default' | 'brand';
}) {
  return (
    <div>
      <div
        className={cn(
          'tnum text-display-md font-semibold',
          tone === 'brand' ? 'text-brand' : 'text-ink',
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[0.8125rem] leading-snug text-ink-muted">{caption}</div>
    </div>
  );
}

/** A small non-interactive label, e.g. the institute type on a list row. */
export function Tag({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'brand';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-chip border px-1.5 py-0.5 text-[0.6875rem] font-medium leading-tight',
        tone === 'brand'
          ? 'border-brand-edge bg-brand-tint text-brand'
          : 'border-line bg-wash text-ink-muted',
      )}
    >
      {children}
    </span>
  );
}

/**
 * Where a closing percentile sits on the full 0–100 scale.
 *
 * This is the one piece of decoration on the site that earns its place.
 * "98.9878776" is four decimal places of noise to a nervous seventeen-year-old;
 * a bar turns it into a distance they can read at a glance and compare down a
 * column without doing arithmetic. The scale is linear and always 0–100, so
 * two bars on different pages mean the same thing.
 */
export function PercentileBar({
  value,
  tone = 'brand',
  className,
}: {
  value: number;
  tone?: 'brand' | 'good' | 'possible' | 'reach';
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const fill = {
    brand: 'bg-brand',
    good: 'bg-good',
    possible: 'bg-possible',
    reach: 'bg-reach',
  }[tone];

  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-line', className)}
      role="img"
      aria-label={`Closes at ${pct.toFixed(2)} percentile`}
    >
      <div
        className={cn('h-full origin-left rounded-full', fill)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * The spread of a college's open-category cutoffs, on the same 0–100 scale.
 *
 * A single figure cannot describe a college: its easiest branch and its hardest
 * can sit thirty percentile points apart, and quoting either one alone tells a
 * student the wrong thing about their chances. The segment shows both ends and
 * the distance between them at once.
 */
export function RangeBar({
  low,
  high,
  className,
}: {
  low: number;
  high: number;
  className?: string;
}) {
  const lo = Math.max(0, Math.min(100, Math.min(low, high)));
  const hi = Math.max(0, Math.min(100, Math.max(low, high)));
  // A college with one branch has no spread; keep a visible stub so the row
  // does not look like missing data.
  const width = Math.max(hi - lo, 1.5);

  return (
    <div
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-line', className)}
      role="img"
      aria-label={`Open-category seats close between ${lo.toFixed(2)} and ${hi.toFixed(2)} percentile`}
    >
      <div
        className="absolute inset-y-0 rounded-full bg-brand"
        style={{ left: `${lo}%`, width: `${width}%` }}
      />
    </div>
  );
}

export function Disclaimer({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-card border border-line bg-wash px-4 py-3 text-[0.8125rem] leading-relaxed text-ink-muted">
      {children}
    </p>
  );
}

/** Empty and error states get direction, not an apology. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-start gap-3 p-6">
      <h3 className="text-display-sm font-semibold text-ink">{title}</h3>
      <p className="text-sm leading-relaxed text-ink-muted">{body}</p>
      {action}
    </div>
  );
}

/**
 * A field the site does not have yet. Shown rather than hidden, so a visitor
 * can always tell a fact from a gap.
 */
export function NotAdded({ what }: { what: string }) {
  return (
    <p className="rounded-card border border-dashed border-line px-4 py-3 text-sm text-ink-faint">
      {what} has not been added yet. We would rather leave it blank than guess.
    </p>
  );
}

/**
 * Long-form text: policies, methodology, FAQ answers.
 *
 * Measure is capped near 68 characters. These pages are read, not scanned, and
 * a full-width line of body copy on a laptop loses the reader's place at every
 * carriage return.
 */
export function Prose({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'max-w-[68ch] space-y-4 text-[0.9375rem] leading-relaxed text-ink-muted',
        '[&_a]:font-medium [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2',
        '[&_h3]:mt-8 [&_h3]:text-[1.0625rem] [&_h3]:font-bold [&_h3]:text-ink',
        '[&_li]:mb-1.5 [&_strong]:font-semibold [&_strong]:text-ink',
        '[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The trail above a page title.
 *
 * The last item is the current page and is not a link — it is there so the
 * visitor can see where they are, and so the matching BreadcrumbList markup
 * describes a trail that is genuinely on the page.
 */
export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="pt-5">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.8125rem] text-ink-faint">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>/</span>}
              {last ? (
                <span aria-current="page" className="text-ink-muted">
                  {item.name}
                </span>
              ) : (
                <Link href={item.path} className="hover:text-brand hover:underline">
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
