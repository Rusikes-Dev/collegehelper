import * as React from 'react';
import Link from 'next/link';

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-card font-medium ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-55';

const VARIANTS = {
  primary: 'bg-brand text-white hover:bg-brand-hover',
  secondary: 'border border-rule bg-white text-ink hover:bg-surface',
  ghost: 'text-brand hover:bg-brand-tint',
  danger: 'border border-reach/30 bg-white text-reach hover:bg-reach-tint',
} as const;

const SIZES = {
  // Minimum 44px tall: these are thumb targets on a phone, not mouse targets.
  md: 'h-11 px-4 text-[0.95rem]',
  lg: 'h-13 px-6 text-base min-h-[3.25rem]',
  sm: 'h-9 px-3 text-sm',
} as const;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
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
  <div className="space-y-1.5">
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

export const inputClass =
  'w-full rounded-card border border-rule bg-white px-3.5 py-3 text-ink ' +
  'placeholder:text-ink-faint focus:border-brand focus:outline-none ' +
  'focus:ring-2 focus:ring-brand-ring';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(inputClass, className)} {...props} />;
  },
);

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn('card p-5', className)}>{children}</div>;
}

export function Disclaimer({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-card border border-rule bg-surface px-4 py-3 text-sm leading-relaxed text-ink-muted">
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
    <div className="card flex flex-col items-start gap-3 p-6">
      <h3 className="font-display text-lg text-ink">{title}</h3>
      <p className="text-sm leading-relaxed text-ink-muted">{body}</p>
      {action}
    </div>
  );
}
