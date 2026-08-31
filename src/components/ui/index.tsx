import * as React from 'react';
import Link from 'next/link';

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-card font-semibold ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS = {
  primary: 'bg-brand text-white hover:bg-brand-hover',
  secondary: 'border border-line bg-white text-ink hover:bg-wash',
  ghost: 'text-brand hover:bg-brand-tint',
  danger: 'border border-reach/30 bg-white text-reach hover:bg-reach-tint',
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
        'min-h-[2.75rem] rounded-full border px-4 text-sm transition-colors',
        active
          ? 'border-brand bg-brand-tint font-semibold text-brand'
          : 'border-line bg-white text-ink-muted hover:bg-wash',
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
    <div className="pb-5 pt-6">
      <h1 className="text-display-lg font-bold text-ink">{title}</h1>
      {intro && <p className="mt-2 max-w-[46ch] leading-relaxed text-ink-muted">{intro}</p>}
      {meta && <div className="mt-3">{meta}</div>}
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
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
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
    <p className="text-sm text-ink-faint">
      {what} has not been added yet. We would rather leave it blank than guess.
    </p>
  );
}
