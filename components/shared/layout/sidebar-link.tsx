'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * Tiny client child of <Sidebar>. Reads usePathname() to keep the
 * highlight in sync with client-side navigation. Receiving the icon as
 * a React component prop is allowed because this whole module is
 * client-side — no server→client serialisation happens for it.
 *
 * `fallbackActive` is the server's best-effort active flag (used for
 * the first SSR paint). Once the client hydrates, usePathname() takes
 * over and the highlight tracks real-time navigation without a server
 * round-trip.
 */
export function SidebarLink({
  href,
  label,
  Icon,
  badge,
  fallbackActive,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
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
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
      {badge !== undefined ? (
        <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
