import { FreelancerSettingsBody } from '@/components/freelancer/settings/freelancer-settings-body';

export const metadata = { title: '프리랜서 설정 디자인 쇼룸' };

export default function ShowroomFreelancerSettingsPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <div className="mb-6 inline-flex items-center rounded-full bg-foreground px-5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-background">
        Design Showroom · 프리랜서 · 인증 없이 보기
      </div>
      <FreelancerSettingsBody />
    </div>
  );
}
