'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

/**
 * Tiny client child of <Sidebar>. Reads usePathname() to keep the
 * highlight in sync with client-side navigation.
 *
 * The icon arrives as a pre-rendered React node (`iconNode`) rather
 * than as a component function — React elements are serializable
 * across the server→client boundary; raw component functions are not.
 * The parent Sidebar (server) does
 *   `const iconNode = <Icon className="..." />`
 * and hands the resulting element to us.
 *
 * `fallbackActive` is the server's best-effort active flag (used for
 * the first SSR paint). Once the client hydrates, usePathname() takes
 * over.
 */
export function SidebarLink({
  href,
  label,
  iconNode,
  badge,
  fallbackActive,
}: {
  href: string;
  label: string;
  iconNode: React.ReactNode;
  badge?: string | number;
  fallbackActive?: boolean;
}): JSX.Element {
  const pathname = usePathname();
  const livePath = pathname ?? '';
  const active = livePath ? livePath === href || livePath.startsWith(`${href}/`) : !!fallbackActive;

  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-secondary font-medium text-foreground'
          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
      )}
    >
      {iconNode}
      <span className="truncate">{label}</span>
      {badge !== undefined ? (
        <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
