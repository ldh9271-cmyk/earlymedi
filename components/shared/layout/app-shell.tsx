import { Sidebar, type SidebarSection } from './sidebar';
import { Topbar } from './topbar';
import { MasterBanner } from './master-banner';
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
  isMaster,
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
  /** True when the authenticated user is on the MASTER_EMAILS allowlist
   *  and is impersonating this org. Renders a red banner above all other
   *  content so the operator never forgets they're acting cross-tenant. */
  isMaster?: boolean;
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
        {/* Master banner sits ABOVE the trial banner so the cross-tenant
            warning is the first thing the operator sees. */}
        {isMaster ? <MasterBanner orgName={orgName} accountType={accountType} /> : null}
        {/* Trial banner lives as its own slim bar between Topbar and main so
            full-height pages (e.g. /agency/inbox with `-m-6` negative margin)
            don't have to subtract its height from their viewport calc. */}
        {organizationId ? (
          <div className="border-b bg-background px-5 py-2 md:px-8">
            <TrialBanner organizationId={organizationId} />
          </div>
        ) : null}
        <main className="flex flex-1 flex-col bg-muted/20 px-5 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
