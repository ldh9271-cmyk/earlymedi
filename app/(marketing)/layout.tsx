import { SiteNav } from '@/components/shared/layout/site-nav';

/**
 * Marketing route group shell — provides the sticky `SiteNav` to every
 * marketing/showroom/legal/pricing page.
 *
 * Note: the root home page (`app/page.tsx`) lives outside this group
 * and renders SiteNav explicitly. Auth pages have their own minimal
 * layout (no nav).
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <>
      <SiteNav />
      {children}
    </>
  );
}
