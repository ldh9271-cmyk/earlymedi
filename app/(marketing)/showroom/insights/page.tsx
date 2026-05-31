import { InsightsBody } from '@/components/agency/insights/insights-body';

export const metadata = { title: 'GlowInsight 분석 디자인 쇼룸' };

export default function ShowroomInsightsPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <div className="mb-6 inline-flex items-center rounded-full bg-foreground px-5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-background">
        Design Showroom · GlowInsight · 데모 데이터
      </div>
      <InsightsBody />
    </div>
  );
}
