import { requireAccess } from '@/lib/auth/route-guards';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Separator } from '@/components/shared/ui/separator';
import {
  SettingsCard,
  SettingsHero,
  SettingsPromoCard,
  SettingsRow,
  SettingsSectionAnchor,
  SettingsShell,
  SettingsTile,
} from '@/components/shared/settings/settings-shell';
export const metadata = { title: '에이전시 설정' };

const SECTIONS = [
  { id: 'org', label: '조직 정보' },
  { id: 'notifications', label: '알림' },
  { id: 'billing', label: '구독 · 청구' },
  { id: 'team', label: '팀 · 좌석' },
  { id: 'integrations', label: '채널 · 통합' },
  { id: 'tax', label: '세금 · 정산 계좌' },
  { id: 'api', label: 'API 키' },
  { id: 'security', label: '보안 · 감사' },
];

export default async function AgencySettingsPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-2 py-2 md:px-4">
      <SettingsHero
        eyebrow="유치업체 운영"
        title="설정"
        lead="조직 프로필, 채널 통합, 정산 계좌, API 키 등 에이전시 운영에 필요한 모든 항목을 한 곳에서 관리합니다."
        actions={
          <>
            <Button variant="outline" className="rounded-full">
              변경 사항 내보내기
            </Button>
            <Button variant="brand" className="rounded-full">
              저장
            </Button>
          </>
        }
      />

      <SettingsPromoCard
        title="14일 무료 체험이 시작되었습니다"
        body="체험 종료 시 자동으로 Growth 플랜으로 전환됩니다. 만료 7·3·1일 전 알림이 발송됩니다."
        variant="brand"
        cta={
          <Button className="rounded-full bg-white text-brand-700 hover:bg-white/90">플랜 비교</Button>
        }
      />

      <SettingsShell sections={SECTIONS} accentClass="text-brand-700">
        <SettingsSectionAnchor id="org">
          <SettingsCard
            title="조직 정보"
            description="외국인환자 유치업 등록증·사업자등록증과 동일하게 유지하세요. 모든 발행 문서·계약서·세금계산서에 반영됩니다."
            action={
              <div className="flex items-center gap-2">
                <Badge variant="care">verified</Badge>
                <Badge variant="brand">유치업체</Badge>
              </div>
            }
          >
            <SettingsRow label="회사명" hint="환자에게 노출되는 브랜드명">
              <Input defaultValue="얼리메디 데모 에이전시" className="rounded-md" />
            </SettingsRow>
            <SettingsRow label="법인명" hint="사업자등록증상 상호">
              <Input defaultValue="주식회사 얼리메디 데모" className="rounded-md" />
            </SettingsRow>
            <SettingsRow label="사업자등록번호">
              <Input defaultValue="123-45-67890" className="rounded-md font-mono" />
            </SettingsRow>
            <SettingsRow label="외국인환자 유치업 등록증 번호">
              <Input defaultValue="FP-2024-DEMO-0001" className="rounded-md font-mono" />
            </SettingsRow>
            <SettingsRow label="대표자">
              <Input defaultValue="김유치" className="rounded-md" />
            </SettingsRow>
            <SettingsRow label="국가 · 타임존" hint="환자 발송 시각·세금 처리 기준">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full">
                  KR · Asia/Seoul
                </Badge>
                <span className="text-xs text-muted-foreground">변경하려면 매니저에게 문의</span>
              </div>
            </SettingsRow>
            <SettingsRow label="기본 통화">
              <Badge variant="secondary" className="rounded-full">
                KRW (₩)
              </Badge>
            </SettingsRow>
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="notifications">
          <SettingsCard
            title="알림"
            description="신규 리드 · 견적 회신 · 결제 · 사후관리 에스컬레이션 등 채널별 알림을 분리해 설정합니다."
          >
            <NotifRow label="신규 리드 도착" channels={['email', 'kakao']} />
            <NotifRow label="병원 견적 회신" channels={['email', 'web']} />
            <NotifRow label="환자 결제 입금" channels={['email', 'sms']} />
            <NotifRow label="EarlyCare critical 알림" channels={['email', 'sms', 'kakao']} forced />
            <NotifRow label="요금제 / 충전 잔액" channels={['email']} />
            <Separator className="my-2" />
            <SettingsRow label="조용한 시간" hint="이 시간에는 critical을 제외한 모든 알림이 묶입니다.">
              <div className="flex items-center gap-2 text-sm">
                <Input className="w-24 rounded-md" defaultValue="22:00" />
                <span className="text-muted-foreground">→</span>
                <Input className="w-24 rounded-md" defaultValue="08:00" />
              </div>
            </SettingsRow>
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="billing">
          <SettingsCard
            title="구독 · 청구"
            description="현재 플랜과 정산 수수료, 다음 청구일을 확인하세요."
            action={
              <Button variant="outline" className="rounded-full">
                플랜 변경
              </Button>
            }
          >
            <SettingsRow label="현재 플랜">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold">Agency Growth</span>
                <Badge variant="care">trialing</Badge>
                <span className="text-xs text-muted-foreground">14일 무료 체험 · D-9</span>
              </div>
            </SettingsRow>
            <SettingsRow label="월 구독료">
              <span className="font-semibold">₩299,000 / 월</span>
            </SettingsRow>
            <SettingsRow label="정산 수수료" hint="모든 settle된 케이스의 GMV에서 자동 차감">
              <span className="font-semibold">1.00%</span>
            </SettingsRow>
            <SettingsRow label="좌석" hint="10개 중 4개 사용">
              <div className="space-y-1.5">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[40%] rounded-full bg-brand-600" />
                </div>
                <div className="text-[11px] text-muted-foreground">4 / 10</div>
              </div>
            </SettingsRow>
            <SettingsRow label="다음 청구">
              <div className="space-y-0.5">
                <div className="text-sm">2026-06-06 (D+14)</div>
                <div className="text-[11px] text-muted-foreground">
                  결제 수단: Visa ···· 4242 · 만료 02/28
                </div>
              </div>
            </SettingsRow>
            <SettingsRow label="청구 이메일">
              <Input defaultValue="billing@earlymedi-demo.kr" className="rounded-md" />
            </SettingsRow>
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="team">
          <SettingsCard
            title="팀 · 좌석"
            description="역할: owner · admin · manager · member · viewer. 좌석을 초과하면 멤버 추가가 잠금됩니다."
            action={
              <Button variant="brand" className="rounded-full">
                + 멤버 초대
              </Button>
            }
          >
            <MemberRow name="김유치" email="demo-agency@earlymedi.test" role="owner" />
            <MemberRow name="마스터 운영자" email="astoriakr@naver.com" role="owner" tag="master" />
            <MemberRow name="박매니저" email="manager@earlymedi-demo.kr" role="manager" />
            <MemberRow name="이코디" email="coord@earlymedi-demo.kr" role="member" />
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="integrations">
          <SettingsCard
            title="채널 · 통합"
            description="10채널 다국어 인박스 + 결제 · 환율 · 메시지 게이트웨이."
          >
            <IntegrationRow icon="💬" name="KakaoTalk Channel" status="connected" detail="채널 ID @earlymedi" />
            <IntegrationRow icon="🟢" name="WhatsApp Business" status="connected" detail="+82 10-XXXX-XXXX" />
            <IntegrationRow icon="💚" name="LINE Official" status="connected" detail="bot id @earlymedi" />
            <IntegrationRow icon="📷" name="Instagram DM" status="action" detail="페이지 액세스 토큰 만료 임박" />
            <IntegrationRow icon="🐉" name="WeChat OA" status="disconnected" detail="—" />
            <IntegrationRow icon="📧" name="Resend Email" status="connected" detail="no-reply@earlymedi.com" />
            <IntegrationRow icon="✉️" name="Twilio SMS · WhatsApp" status="connected" detail="account SID AC···7821" />
            <IntegrationRow icon="🗺️" name="Mapbox" status="connected" detail="public token pk.···" />
            <IntegrationRow icon="💱" name="exchangerate-api" status="connected" detail="snapshot 매일 09:00 KST" />
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="tax">
          <SettingsCard
            title="세금 · 정산 계좌"
            description="VAT 처리, 원천세, 정산 계좌. 모든 변경은 audit log에 기록됩니다."
          >
            <SettingsRow label="VAT 처리" hint="medical 면세 + cosmetic 과세 자동 분할 (line-level)">
              <Badge variant="secondary" className="rounded-full">자동 (mixed)</Badge>
            </SettingsRow>
            <SettingsRow label="홈택스 사업자 등록" hint="세금계산서 e세로 연동">
              <div className="flex items-center gap-2">
                <Badge variant="care">linked</Badge>
                <span className="text-xs text-muted-foreground">대표 인증서 ···CN=earlymedi</span>
              </div>
            </SettingsRow>
            <SettingsRow label="정산 계좌 (KRW)">
              <div className="space-y-1">
                <div className="font-mono text-sm">하나은행 123-456789-01234</div>
                <div className="text-[11px] text-muted-foreground">예금주: 주식회사 얼리메디 데모</div>
              </div>
            </SettingsRow>
            <SettingsRow label="해외 송금 (Wise)" hint="외화 정산 시 사용">
              <Badge variant="secondary" className="rounded-full">연결됨 · USD/JPY/CNY</Badge>
            </SettingsRow>
            <SettingsRow label="원천세 default" hint="프리랜서 정산 시 기본값 (개별 변경 가능)">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="rounded-full">KR 거주자 3.30%</Badge>
                <Badge variant="secondary" className="rounded-full">KR 사업자 0% (세금계산서)</Badge>
                <Badge variant="secondary" className="rounded-full">조세조약 적용</Badge>
              </div>
            </SettingsRow>
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="api">
          <SettingsCard
            title="API 키"
            description="외부 시스템(병원 EMR · 통계 DB · CRM)에서 EarlyMedi에 접근할 때 사용합니다. 30일 무사용 시 자동 회수."
            action={
              <Button variant="brand" className="rounded-full">
                + 새 키 발급
              </Button>
            }
          >
            <ApiKeyRow name="병원 EMR 동기화" prefix="em_live_4f9···a82c" lastUsed="2분 전" />
            <ApiKeyRow name="외부 BI 대시보드" prefix="em_live_2b7···c011" lastUsed="3시간 전" />
            <ApiKeyRow name="QStash webhook" prefix="em_live_8e1···f433" lastUsed="어제" muted />
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="security">
          <SettingsCard
            title="보안 · 감사"
            description="모든 PII / PHI 접근은 audit_logs에 기록되며 10년 보존됩니다 (의료법 27조의2)."
          >
            <SettingsRow label="2단계 인증" hint="조직 owner는 강제 적용">
              <div className="flex items-center gap-2">
                <Badge variant="care">enforced for owners</Badge>
                <span className="text-xs text-muted-foreground">매니저 이하는 개별 선택</span>
              </div>
            </SettingsRow>
            <SettingsRow label="세션 만료">
              <div className="flex items-center gap-2 text-sm">
                <Input className="w-20 rounded-md" defaultValue="24" />
                <span className="text-muted-foreground">시간</span>
              </div>
            </SettingsRow>
            <SettingsRow label="IP 화이트리스트" hint="비워두면 모든 IP 허용">
              <Input defaultValue="" placeholder="203.0.113.0/24, 198.51.100.7" className="rounded-md font-mono" />
            </SettingsRow>
            <SettingsRow label="감사 로그 내보내기" hint="CSV · JSON 두 포맷 지원">
              <div className="flex items-center gap-2">
                <Button variant="outline" className="rounded-full">최근 30일 CSV</Button>
                <Button variant="outline" className="rounded-full">전체 JSON</Button>
              </div>
            </SettingsRow>
          </SettingsCard>
        </SettingsSectionAnchor>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            관련 가이드
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SettingsTile
              href="/agency/billing"
              title="청구서 · 인보이스"
              body="발행된 청구서와 결제 이력을 확인합니다."
            />
            <SettingsTile
              href="/agency/compliance"
              title="KOIHA · 광고 규제"
              body="분기 통계 제출과 의료법 27조의2 광고 가이드라인 체크."
            />
            <SettingsTile
              href="/agency/insights"
              title="EarlyInsight 분석"
              body="CAC · LTV · MRR/ARR · 전환 퍼널."
            />
            <SettingsTile
              href="/agency/recovery"
              title="EarlyCare 사후관리"
              body="D+N 루틴 · 무응답 에스컬레이션 정책."
            />
          </div>
        </div>

        <div className="pt-4 text-[11px] text-muted-foreground">
          <span className="font-mono">{ctx.orgId.slice(0, 8)}</span> · {ctx.email} · 변경 시 모든 audit_logs에 기록
        </div>
      </SettingsShell>
    </div>
  );
}

function NotifRow({
  label,
  channels,
  forced,
}: {
  label: string;
  channels: Array<'email' | 'sms' | 'kakao' | 'whatsapp' | 'web'>;
  forced?: boolean;
}): JSX.Element {
  const ALL: Array<'email' | 'sms' | 'kakao' | 'whatsapp' | 'web'> = ['email', 'sms', 'kakao', 'whatsapp', 'web'];
  return (
    <SettingsRow label={label} hint={forced ? '필수 — 끌 수 없음' : undefined}>
      <div className="flex flex-wrap gap-1.5">
        {ALL.map((c) => (
          <span
            key={c}
            className={
              channels.includes(c)
                ? 'inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-brand-700'
                : 'inline-flex items-center rounded-full border border-dashed px-2.5 py-0.5 text-[11px] text-muted-foreground'
            }
          >
            {c}
          </span>
        ))}
      </div>
    </SettingsRow>
  );
}

function MemberRow({
  name,
  email,
  role,
  tag,
}: {
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
  tag?: string;
}): JSX.Element {
  const roleVariant: Record<string, 'brand' | 'hospitality' | 'care' | 'secondary'> = {
    owner: 'brand',
    admin: 'brand',
    manager: 'care',
    member: 'secondary',
    viewer: 'secondary',
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-border/60 py-3 first:border-t-0 first:pt-0">
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{name}</span>
          {tag ? (
            <span className="inline-flex items-center rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background">
              {tag}
            </span>
          ) : null}
        </div>
        <div className="text-xs text-muted-foreground">{email}</div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={roleVariant[role]}>{role}</Badge>
        <Button variant="outline" size="sm" className="rounded-full">관리</Button>
      </div>
    </div>
  );
}

function IntegrationRow({
  icon,
  name,
  status,
  detail,
}: {
  icon: string;
  name: string;
  status: 'connected' | 'disconnected' | 'action';
  detail: string;
}): JSX.Element {
  const statusBadge =
    status === 'connected' ? (
      <Badge variant="care">connected</Badge>
    ) : status === 'action' ? (
      <Badge variant="hospitality">action required</Badge>
    ) : (
      <Badge variant="secondary">disconnected</Badge>
    );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-border/60 py-3 first:border-t-0 first:pt-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-base">{icon}</div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">{detail}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {statusBadge}
        <Button variant="outline" size="sm" className="rounded-full">
          {status === 'disconnected' ? '연결' : '관리'}
        </Button>
      </div>
    </div>
  );
}

function ApiKeyRow({
  name,
  prefix,
  lastUsed,
  muted,
}: {
  name: string;
  prefix: string;
  lastUsed: string;
  muted?: boolean;
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-border/60 py-3 first:border-t-0 first:pt-0">
      <div className="min-w-0 space-y-0.5">
        <div className="text-sm font-medium">{name}</div>
        <div className="font-mono text-[11px] text-muted-foreground">{prefix}</div>
      </div>
      <div className="flex items-center gap-2">
        {muted ? (
          <Badge variant="secondary">stale</Badge>
        ) : (
          <span className="text-[11px] text-muted-foreground">마지막 사용 {lastUsed}</span>
        )}
        <Button variant="outline" size="sm" className="rounded-full">회수</Button>
      </div>
    </div>
  );
}
