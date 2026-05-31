import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

export function PublicFooter({
  locale,
  dict,
}: {
  locale: PublicLocale;
  dict: Dictionary;
}): JSX.Element {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Brand + tagline */}
          <div className="lg:col-span-1">
            <div className="text-base font-bold">
              <span className="font-extrabold text-brand-600">Korea</span>
              <span className="font-semibold">GlowUp</span>
            </div>
            <p className="mt-2 max-w-xs text-xs text-muted-foreground">{dict.footer.tagline}</p>
          </div>

          {/* Three navigation columns */}
          <FooterColumn
            title={dict.footer.company}
            items={[
              { href: '/about', label: dict.footer.about },
              { href: `/${locale}/inquiry`, label: dict.footer.contact },
            ]}
          />
          <FooterColumn
            title={dict.footer.legal}
            items={[
              { href: '/legal/terms', label: dict.footer.terms },
              { href: '/legal/privacy', label: dict.footer.privacy },
              { href: '/legal/medical-ad', label: dict.footer.medicalAd },
            ]}
          />
          <FooterColumn
            title={dict.footer.business}
            items={[
              { href: '/signup?type=medical', label: dict.footer.forHospitals },
              { href: '/signup?type=non_medical', label: dict.footer.forPartners },
              { href: '/signup?type=freelancer', label: dict.footer.forFreelancers },
            ]}
          />
        </div>

        <div className="mt-8 border-t pt-6 text-[11px] text-muted-foreground">
          {dict.footer.copy}
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: Array<{ href: string; label: string }>;
}): JSX.Element {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
        {title}
      </div>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
