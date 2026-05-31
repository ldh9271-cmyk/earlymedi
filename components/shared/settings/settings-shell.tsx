'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * 3-column documentation-style shell for settings pages.
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │  [hero band — page title + lead]                     │
 *   ├──────────┬───────────────────────────────────┬───────┤
 *   │  sticky  │  prose body — cards stacked       │ TOC   │
 *   │  sub-nav │  with anchor ids per section      │ (xl+) │
 *   │ (md+)    │                                   │       │
 *   └──────────┴───────────────────────────────────┴───────┘
 *
 * MiniMax-inspired: pill sub-nav items, generous vertical rhythm,
 * card radius hierarchy (32px hero promo vs 16px doc cards).
 * KoreaGlowUp tokens: brand-50/brand-600 for active states.
 */

export type SettingsSection = {
  id: string;
  label: string;
  description?: string;
};

export function SettingsShell({
  sections,
  accentClass,
  children,
}: {
  sections: SettingsSection[];
  /** Tailwind text-color class for active sub-nav (e.g. text-brand-700). */
  accentClass?: string;
  children: React.ReactNode;
}): JSX.Element {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');

  useEffect(() => {
    if (sections.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0.01 },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [sections]);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[220px_minmax(0,1fr)_180px] lg:gap-12">
      <SubNav sections={sections} activeId={activeId} accentClass={accentClass} />
      <div className="min-w-0 space-y-12">{children}</div>
      <Toc sections={sections} activeId={activeId} accentClass={accentClass} />
    </div>
  );
}

function SubNav({
  sections,
  activeId,
  accentClass,
}: {
  sections: SettingsSection[];
  activeId: string;
  accentClass?: string;
}): JSX.Element {
  return (
    <nav className="hidden lg:block">
      <div className="sticky top-24 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          섹션
        </div>
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={cn(
              'block rounded-full px-3 py-1.5 text-sm transition',
              activeId === s.id
                ? cn('bg-muted font-medium', accentClass ?? 'text-brand-700')
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function Toc({
  sections,
  activeId,
  accentClass,
}: {
  sections: SettingsSection[];
  activeId: string;
  accentClass?: string;
}): JSX.Element {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-24 space-y-2 border-l pl-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          이 페이지에서
        </div>
        <ul className="space-y-1.5 text-xs">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={cn(
                  'block transition',
                  activeId === s.id
                    ? cn('font-medium', accentClass ?? 'text-brand-700')
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

/** Anchor target wrapper — gives each section a scroll-margin top. */
export function SettingsSectionAnchor({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section id={id} className="scroll-mt-24">
      {children}
    </section>
  );
}

/**
 * Settings page hero — page-level header with lead copy + optional CTA.
 * Maps to MiniMax `hero-band` but compressed for an interior page (heading-lg, not hero-display).
 */
export function SettingsHero({
  eyebrow,
  title,
  lead,
  actions,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  actions?: React.ReactNode;
}): JSX.Element {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-2">
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-[40px] md:leading-[1.1]">
          {title}
        </h1>
        {lead ? <p className="max-w-2xl text-sm text-muted-foreground md:text-base">{lead}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/**
 * "Promo" gradient card — 32px hero radius, accent-tinted gradient.
 * Use sparingly: one per page, for the highlighted upgrade / banner.
 */
export function SettingsPromoCard({
  title,
  body,
  cta,
  variant = 'brand',
}: {
  title: string;
  body: string;
  cta?: React.ReactNode;
  variant?: 'brand' | 'hospitality' | 'care' | 'destructive';
}): JSX.Element {
  const bgMap: Record<string, string> = {
    brand: 'from-brand-600 via-brand-700 to-brand-900',
    hospitality: 'from-hospitality-500 via-hospitality-600 to-hospitality-700',
    care: 'from-care-500 via-care-600 to-care-700',
    destructive: 'from-rose-500 via-rose-600 to-rose-700',
  };
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 rounded-[32px] bg-gradient-to-br p-8 text-white shadow-[0_0_22px_rgba(0,0,0,0.08)]',
        bgMap[variant],
      )}
    >
      <div className="min-w-0 max-w-xl space-y-1.5">
        <div className="text-lg font-semibold leading-tight md:text-2xl">{title}</div>
        <p className="text-sm text-white/80">{body}</p>
      </div>
      {cta ? <div className="shrink-0">{cta}</div> : null}
    </div>
  );
}

/**
 * Doc-style section card. 16px corner softening (vs 32px hero).
 * Internal title + description + content slot.
 */
export function SettingsCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="rounded-2xl border bg-card p-6 md:p-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description ? <p className="text-xs text-muted-foreground md:text-sm">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/** A two-column key-value row inside a SettingsCard. Mobile collapses to stack. */
export function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-3 border-t border-dashed border-border/60 py-3 first:border-t-0 first:pt-0 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-start sm:gap-6">
      <div className="space-y-0.5">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {hint ? <div className="text-[11px] text-muted-foreground">{hint}</div> : null}
      </div>
      <div className="min-w-0 text-sm">{children}</div>
    </div>
  );
}

/** Inline "Recommended Reading" tile (Recommended Reading pattern). */
export function SettingsTile({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}): JSX.Element {
  return (
    <Link
      href={href}
      className="block rounded-xl border bg-card p-4 transition hover:border-foreground/30"
    >
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{body}</div>
    </Link>
  );
}
