import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Logo } from '@/components/shared/brand/logo';
import type { AccountType } from '@/lib/auth/account-types';
import { ACCOUNT_TYPE_LABEL_KO } from '@/lib/auth/account-types';
import { SidebarLink } from './sidebar-link';

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

/**
 * Server component sidebar shell. Each menu item is rendered as a
 * client-side <SidebarLink> so that `usePathname()` can highlight the
 * currently active route without forcing the whole sidebar — which
 * receives function-typed LucideIcon refs as props — to cross the
 * server/client boundary.
 */
export function Sidebar({
  accountType,
  orgName,
  sections,
  currentPath,
}: {
  accountType: AccountType;
  orgName: string;
  sections: SidebarSection[];
  /** Fallback for the initial SSR paint. The client SidebarLink overrides
   *  this from usePathname() as soon as it hydrates. */
  currentPath?: string;
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
                // Pre-render the icon to a JSX node on the SERVER. React
                // elements ARE serializable across the server→client
                // boundary; passing the raw LucideIcon component function
                // is not, and crashes the page with "Application error".
                const Icon = item.icon;
                const iconNode = <Icon className="h-4 w-4 shrink-0" />;
                return (
                  <li key={item.href}>
                    <SidebarLink
                      href={item.href}
                      label={item.label}
                      iconNode={iconNode}
                      badge={item.badge}
                      fallbackActive={
                        !!currentPath &&
                        (currentPath === item.href ||
                          currentPath.startsWith(`${item.href}/`))
                      }
                    />
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
