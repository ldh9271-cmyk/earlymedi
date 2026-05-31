'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Globe } from 'lucide-react';
import { PUBLIC_LOCALES, LOCALE_LABELS, type PublicLocale } from '@/lib/i18n/locales';
import { cn } from '@/lib/utils/cn';

/**
 * Locale switcher dropdown for the public portal header.
 *
 * Implementation notes:
 *   - swaps only the leading `/kr|/en|/zh|/ja` segment; preserves the
 *     rest of the path so visitors don't get bounced back to the home
 *     page when they switch languages mid-browse.
 *   - keeps the dropdown closed by default (so screen-readers and
 *     keyboard users aren't bombarded with 4 hidden choices); click
 *     toggles it.
 */
export function LocaleSwitcher({ current }: { current: PublicLocale }): JSX.Element {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    function onDocClick(e: MouseEvent): void {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Build the equivalent path under each locale. Example:
  //   currently /kr/clinics/abc, switching to en → /en/clinics/abc.
  function pathForLocale(target: PublicLocale): string {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return `/${target}`;
    segments[0] = target;
    return `/${segments.join('/')}`;
  }

  const currentLabel = LOCALE_LABELS[current];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{currentLabel.flag}</span>
        <span className="hidden sm:inline">{currentLabel.native}</span>
        <ChevronDown className={cn('h-3 w-3 transition', open && 'rotate-180')} />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-md border bg-popover shadow-lg"
        >
          {PUBLIC_LOCALES.map((loc) => {
            const label = LOCALE_LABELS[loc];
            const active = loc === current;
            return (
              <li key={loc}>
                <Link
                  href={pathForLocale(loc)}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm transition',
                    active
                      ? 'bg-brand-50 font-semibold text-brand-900'
                      : 'hover:bg-muted',
                  )}
                  aria-current={active ? 'true' : undefined}
                >
                  <span className="text-base">{label.flag}</span>
                  <span>{label.native}</span>
                  {active ? (
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-brand-700">
                      현재
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
