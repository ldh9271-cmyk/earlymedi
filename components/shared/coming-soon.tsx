import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { ROUTE_PREVIEWS, type RoutePreview } from '@/lib/route-previews';

/**
 * Generic "this screen is on the roadmap" placeholder used by every
 * sidebar destination whose UI is not yet built. The underlying engines
 * (Phase 5-9 of the roadmap — payments, commissions, visa, calendar,
 * leads, etc.) all exist in `lib/` and `drizzle/`; only the screens are
 * pending. Until the real UI lands, this card explains what the screen
 * will do, lists 3-5 concrete capabilities, and points the user at the
 * working screens so they don't get stranded.
 *
 * Lookup is by route path, so a page.tsx can be 3 lines:
 *   import { ComingSoon } from '@/components/shared/coming-soon';
 *   export default function Page() { return <ComingSoon route="/agency/leads" />; }
 */
export function ComingSoon({ route }: { route: string }): JSX.Element {
  const preview: RoutePreview = ROUTE_PREVIEWS[route] ?? {
    title: '준비 중인 화면',
    description: '이 메뉴의 UI는 곧 활성화될 예정입니다.',
    bullets: [],
    workingLinks: [],
    accent: 'brand',
  };

  const accentBadgeVariant: Record<NonNullable<RoutePreview['accent']>, 'brand' | 'care' | 'hospitality' | 'slate'> = {
    brand: 'brand',
    care: 'care',
    hospitality: 'hospitality',
    slate: 'slate',
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant={accentBadgeVariant[preview.accent ?? 'brand']}>
            <Sparkles className="mr-1 h-3 w-3" />
            곧 활성화 예정
          </Badge>
          <span className="text-xs text-muted-foreground">KoreaGlowUp 로드맵</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{preview.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{preview.description}</p>
      </div>

      {preview.bullets.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">이 화면에서 가능할 일</CardTitle>
            <CardDescription className="text-xs">
              백엔드 엔진은 이미 구축되어 있으며, UI 활성화만 남았습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {preview.bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-care-100 text-[10px] font-bold text-care-700">
                    {i + 1}
                  </span>
                  <span className="text-foreground">{bullet}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {preview.workingLinks && preview.workingLinks.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">지금 바로 사용 가능한 기능</CardTitle>
            <CardDescription className="text-xs">대기 중인 동안 다른 화면을 둘러보세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {preview.workingLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center justify-between rounded-lg border bg-card px-3 py-2.5 text-sm transition hover:bg-muted"
                >
                  <span className="font-medium">{link.label}</span>
                  <span className="text-muted-foreground transition group-hover:translate-x-0.5">→</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <span>이 기능에 대한 피드백이나 우선순위 요청이 있으신가요?</span>
        <Link
          href="mailto:product@koreaglowup.com?subject=KoreaGlowUp%20%EA%B8%B0%EB%8A%A5%20%EC%9A%94%EC%B2%AD"
          className="font-medium text-foreground underline"
        >
          알려주세요 →
        </Link>
      </div>

      <Link href="javascript:history.back()" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 이전 화면으로
      </Link>
    </div>
  );
}
