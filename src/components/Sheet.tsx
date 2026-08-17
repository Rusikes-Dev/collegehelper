'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Bottom sheet on phones, centred dialog on wider screens.
 * Traps focus, closes on Escape, and restores focus to the trigger on close.
 *
 * On touch devices the grip can be dragged down to dismiss, which is the
 * gesture people already expect from every native sheet. Dragging only starts
 * on the grip, never on the body, so scrolling a long filter list cannot close
 * the sheet by accident.
 */
export default function Sheet({
  title, children, footer, onClose,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const startY = useRef<number | null>(null);
  const [drag, setDrag] = useState(0);

  useEffect(() => {
    returnTo.current = document.activeElement as HTMLElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab' || !ref.current) return;
      const focusable = ref.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input, button')?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      returnTo.current?.focus();
    };
  }, [onClose]);

  const onTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    // Downward only; an upward pull should do nothing rather than stretch the sheet.
    setDrag(Math.max(0, e.touches[0].clientY - startY.current));
  };

  const onTouchEnd = () => {
    // A quarter of the way down is far enough to mean it, close enough to undo.
    if (drag > 110) onClose();
    setDrag(0);
    startY.current = null;
  };

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} style={drag ? { opacity: Math.max(0.2, 1 - drag / 320) } : undefined} />
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
      >
        <div
          className="sheet-grab"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          aria-hidden
        >
          <div className="sheet-grip" />
        </div>
        <div className="sheet-head">
          <h2 style={{ fontSize: 17 }}>{title}</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close">Close</button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </>
  );
}
