import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Logo } from '@/components/shared/brand/logo';
import type { AccountType } from '@/lib/auth/account-types';
import { ACCOUNT_TYPE_LABEL_KO } from '@/lib/auth/account-types';

export type SidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
};

export type SidebarSection = {
  title?: string;
  items: SidebarItem[];
};

export function Sidebar({
  accountType,
  orgName,
  sections,
  currentPath,
}: {
  accountType: AccountType;
  orgName: string;
  sections: SidebarSection[];
  currentPath: string;
}): JSX.Element {
  const accentClass = {
    agency: 'border-l-brand-600',
    freelancer: 'border-l-hospitality-500',
    medical: 'border-l-care-500',
    non_medical: 'border-l-slate-500',
  }[accountType];

  return (
    <aside
      className={cn(
        'hidden md:flex md:w-64 md:flex-col md:border-r md:bg-background',
        'border-l-4',
        accentClass,
      )}
    >
      <div className="flex h-16 items-center gap-3 px-5">
        <Logo size="sm" />
      </div>
      <div className="border-y px-5 py-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {ACCOUNT_TYPE_LABEL_KO[accountType]}
        </div>
        <div className="truncate text-sm font-semibold">{orgName}</div>
      </div>
      <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {sections.map((section, sectionIdx) => (
          <div key={section.title ?? sectionIdx}>
            {section.title ? (
              <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </div>
            ) : null}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  currentPath === item.href || currentPath.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        active
                          ? 'bg-secondary font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {item.badge !== undefined ? (
                        <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
