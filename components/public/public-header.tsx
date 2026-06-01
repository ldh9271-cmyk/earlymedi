import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import { LocaleSwitcher } from './locale-switcher';

/**
 * Sticky top navigation for the patient-facing portal. Keep light and
 * fast — this is the first paint for every visitor, no client JS unless
 * absolutely necessary (only the LocaleSwitcher is client-side because
 * it needs the current pathname).
 *
 * `isMaster` is passed by the layout — when true (signed-in master
 * operator), an extra "Admin" pill replaces the login button so the
 * operator can jump straight to /[locale]/admin (patient signups,
 * 1:1 inquiries). Non-masters never see this — the value defaults to
 * false and the layout's master check fails silently.
 */
export function PublicHeader({
  locale,
  dict,
  isMaster = false,
}: {
  locale: PublicLocale;
  dict: Dictionary;
  isMaster?: boolean;
}): JSX.Element {
  const navItems: Array<{ href: string; label: string }> = [
    { href: `/${locale}/clinics`, label: dict.nav.clinics },
    { href: `/${locale}/procedures`, label: dict.nav.procedures },
    { href: `/${locale}/ai-consult`, label: dict.nav.aiConsult },
    { href: `/${locale}/inquiry`, label: dict.nav.inquiry },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Brand */}
        <Link
          href={`/${locale}`}
          className="text-base font-bold tracking-tight text-foreground"
        >
          <span className="font-extrabold text-brand-600">Korea</span>
          <span className="font-semibold">GlowUp</span>
        </Link>

        {/* Desktop nav — hidden on small screens; mobile gets the hamburger
            (Phase 1+) or just direct CTA below the hero. */}
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right cluster — locale switch + sign-in. The /[locale]/login
            page is patient-only (magic link, no signup), separate from
            the B2B /login flow under the (auth) group. Routing patients
            there avoids exposing operator-targeted copy ("Free for first
            10 patients", account-type picker, etc.) which used to
            confuse foreign visitors clicking this link. */}
        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher current={locale} />
          {isMaster ? (
            <Link
              href={`/${locale}/admin`}
              className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
              title="Master admin console"
            >
              <ShieldAlert className="h-3 w-3" />
              Admin
            </Link>
          ) : null}
          <Link
            href={`/${locale}/login`}
            className="hidden rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground sm:inline-block"
          >
            {dict.nav.login}
          </Link>
        </div>
      </div>

      {/* Mobile nav row — shown only on small screens, horizontal scroll
          if items overflow. Mirrors the desktop nav so nothing is lost
          on mobile. */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t bg-muted/20 px-2 py-1.5 md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition hover:bg-card hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
