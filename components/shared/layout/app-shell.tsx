import { Sidebar, type SidebarSection } from './sidebar';
import { Topbar } from './topbar';
import { TrialBanner } from '@/components/shared/trial-banner';
import type { AccountType } from '@/lib/auth/account-types';

export function AppShell({
  accountType,
  orgName,
  organizationId,
  userEmail,
  userName,
  sections,
  currentPath,
  children,
}: {
  accountType: AccountType;
  orgName: string;
  /** Active org id — when present, the free-trial banner is rendered above children. */
  organizationId?: string;
  userEmail: string;
  userName?: string;
  sections: SidebarSection[];
  currentPath: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        accountType={accountType}
        orgName={orgName}
        sections={sections}
        currentPath={currentPath}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar accountType={accountType} userEmail={userEmail} userName={userName} />
        <main className="flex-1 bg-muted/20 px-5 py-6 md:px-8">
          {organizationId ? (
            <div className="mb-4">
              {/* Server-rendered banner that fetches the org's trial usage row. */}
              <TrialBanner organizationId={organizationId} />
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
