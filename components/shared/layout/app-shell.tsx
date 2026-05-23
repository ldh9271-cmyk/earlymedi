import { Sidebar, type SidebarSection } from './sidebar';
import { Topbar } from './topbar';
import type { AccountType } from '@/lib/auth/account-types';

export function AppShell({
  accountType,
  orgName,
  userEmail,
  userName,
  sections,
  currentPath,
  children,
}: {
  accountType: AccountType;
  orgName: string;
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
        <main className="flex-1 bg-muted/20 px-5 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
