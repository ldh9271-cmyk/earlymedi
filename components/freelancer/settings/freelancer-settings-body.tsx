import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import {
  SettingsCard,
  SettingsHero,
  SettingsPromoCard,
  SettingsRow,
  SettingsSectionAnchor,
  SettingsShell,
  SettingsTile,
} from '@/components/shared/settings/settings-shell';

const SECTIONS = [
  { id: 'profile', label: '프로필 · 활동명' },
  { id: 'affiliations', label: '소속 에이전시' },
  { id: 'referral-codes', label: '추천 코드 · QR' },
  { id: 'tax-bank', label: '세금 · 은행' },
  { id: 'language', label: '언어 · 통역 능력' },
  { id: 'notifications', label: '알림' },
  { id: 'security', label: '보안' },
];

export function FreelancerSettingsBody(): JSX.Element {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-2 py-2 md:px-4">
      <SettingsHero
        eyebrow="프리랜서 운영"
        title="설정"
        lead="활동 프로필·소속 에이전시·세금/은행 정보·추천 코드. 본인 코드로 귀속된 케이스만 정산 명세에 포함됩니다."
        actions={
          <>
            <Button variant="outline" className="rounded-full">데이터 내보내기</Button>
            <Button variant="hospitality" className="rounded-full">저장</Button>
          </>
        }
      />

      <SettingsPromoCard
        title="이번 달 확정 커미션 ₩2,340,000"
        body="원천세 3.3% 차감 후 ₩2,262,780 — 매월 10일 정산 입금. 다음 입금까지 D-7."
        variant="hospitality"
        cta={<Button className="rounded-full bg-white text-hospitality-700 hover:bg-white/90">정산 내역</Button>}
      />

      <SettingsShell sections={SECTIONS} accentClass="text-hospitality-700">
        <SettingsSectionAnchor id="profile">
          <SettingsCard
            title="프로필 · 활동명"
            description="추천 코드 QR과 다국어 랜딩 페이지에 노출됩니다."
            action={<Badge variant="hospitality">프리랜서</Badge>}
          >
            <SettingsRow label="활동명 (브랜드명)" hint="환자에게 보이는 공개 이름">
              <Input defaultValue="박송객 컨시어지" className="rounded-md" />
            </SettingsRow>
            <SettingsRow label="본명" hint="세금 처리용 (비공개)">
              <Input defaultValue="박송객" className="rounded-md" />
            </SettingsRow>
            <SettingsRow label="이메일">
              <Input defaultValue="demo-freelancer@earlymedi.test" className="rounded-md" />
            </SettingsRow>
            <SettingsRow label="휴대전화" hint="WhatsApp/LINE/카카오 알림 매칭에 사용">
              <Input defaultValue="+82 10-XXXX-XXXX" className="rounded-md font-mono" />
            </SettingsRow>
            <SettingsRow label="공개 자기소개 (다국어)">
              <div className="space-y-2">
                <Input defaultValue="ko: 의료관광 9년차, 성형·피부 전문 코디네이터" className="rounded-md" />
                <Input defaultValue="en: 9 yrs MICE/medical concierge, plastic & dermatology" className="rounded-md" />
                <Input defaultValue="zh-CN: 9年医疗旅游经验，整形·皮肤专科陪同" className="rounded-md" />
              </div>
            </SettingsRow>
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="affiliations">
          <SettingsCard
            title="소속 에이전시"
            description="여러 에이전시 겸업 가능. 각 소속마다 커미션 정책·PII 공개 범위가 다를 수 있습니다."
            action={<Button variant="hospitality" className="rounded-full">+ 에이전시 추가</Button>}
          >
            <AffiliationRow name="얼리메디 데모 에이전시" code="DEMO-PARK" rate="송객 수수료의 30%" piiLevel="minimal" status="active" />
            <AffiliationRow name="K-Beauty Tour Co." code="PARK-KBT" rate="송객 수수료의 25%" piiLevel="alias_only" status="active" />
            <AffiliationRow name="Asia Health Group" code="—" rate="—" piiLevel="—" status="pending" />
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="referral-codes">
          <SettingsCard
            title="추천 코드 · QR"
            description="QR을 스캔하면 다국어 랜딩으로 이동, 환자가 가입하면 자동 귀속됩니다."
            action={<Button variant="outline" className="rounded-full">QR 일괄 다운로드</Button>}
          >
            <ReferralRow code="DEMO-PARK" agency="얼리메디 데모 에이전시" landing="/r/DEMO-PARK" leads={47} cases={12} />
            <ReferralRow code="PARK-KBT" agency="K-Beauty Tour Co." landing="/r/PARK-KBT" leads={18} cases={4} />
            <ReferralRow code="PARK-IG" agency="얼리메디 데모 에이전시" landing="/r/PARK-IG (Instagram bio)" leads={132} cases={31} />
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="tax-bank">
          <SettingsCard
            title="세금 · 은행"
            description="원천세 분류와 입금 계좌. 변경 시 다음 정산 사이클부터 반영됩니다."
          >
            <SettingsRow label="거주 구분">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="hospitality">KR 거주자 (개인)</Badge>
                <span className="text-[11px] text-muted-foreground">원천세 3.30%</span>
              </div>
            </SettingsRow>
            <SettingsRow label="사업자 등록 여부" hint="등록되면 원천세 0% + 세금계산서 발행">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full">미등록</Badge>
                <Button variant="outline" size="sm" className="rounded-full">등록증 업로드</Button>
              </div>
            </SettingsRow>
            <SettingsRow label="입금 계좌 (KRW)">
              <div className="space-y-1">
                <div className="font-mono text-sm">국민은행 654-321-987654</div>
                <div className="text-[11px] text-muted-foreground">예금주: 박송객</div>
              </div>
            </SettingsRow>
            <SettingsRow label="원천징수영수증" hint="홈택스 자동 발급 → 이메일로 발송">
              <Badge variant="care">자동</Badge>
            </SettingsRow>
            <SettingsRow label="지급명세서 (연말정산용)">
              <Button variant="outline" size="sm" className="rounded-full">2025 귀속분 다운로드</Button>
            </SettingsRow>
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="language">
          <SettingsCard
            title="언어 · 통역 능력"
            description="통역 자동 매칭에 사용. 인증된 통역 자격증을 업로드하면 우선 매칭됩니다."
          >
            <SettingsRow label="구사 언어 (자가 진단)">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="hospitality">한국어 native</Badge>
                <Badge variant="hospitality">English C1</Badge>
                <Badge variant="hospitality">中文 B2</Badge>
                <Badge variant="secondary" className="rounded-full">+ 언어 추가</Badge>
              </div>
            </SettingsRow>
            <SettingsRow label="통역 자격증" hint="의료통역사·관광통역사 등">
              <div className="flex items-center gap-2">
                <Badge variant="care">의료통역사 (영어)</Badge>
                <Button variant="outline" size="sm" className="rounded-full">자격증 업로드</Button>
              </div>
            </SettingsRow>
            <SettingsRow label="통역 매칭 수락">
              <Badge variant="hospitality">on — 영어 · 중국어 케이스 우선</Badge>
            </SettingsRow>
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="notifications">
          <SettingsCard
            title="알림"
            description="신규 케이스 귀속 · 정산 입금 · 이의 제기 답변. 무응답 24시간 시 매니저에게 자동 에스컬레이션."
          >
            <NotifChannelRow label="신규 케이스 귀속" channels={['email', 'kakao']} />
            <NotifChannelRow label="커미션 확정 / 입금" channels={['email', 'sms']} />
            <NotifChannelRow label="이의 제기 응답" channels={['email']} />
            <NotifChannelRow label="추천 코드 클릭 알림" channels={[]} hint="off — 너무 많은 알림 방지" />
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="security">
          <SettingsCard
            title="보안"
            description="환자 PII는 본인 코드로 귀속된 케이스 + 에이전시 공개 허용 범위에서만 보입니다."
          >
            <SettingsRow label="2단계 인증">
              <Badge variant="secondary" className="rounded-full">권장 — 미설정</Badge>
            </SettingsRow>
            <SettingsRow label="세션 만료">
              <div className="flex items-center gap-2 text-sm">
                <Input className="w-20 rounded-md" defaultValue="48" />
                <span className="text-muted-foreground">시간</span>
              </div>
            </SettingsRow>
            <SettingsRow label="감사 로그 보기" hint="본인 활동만 조회 가능">
              <Button variant="outline" size="sm" className="rounded-full">최근 30일</Button>
            </SettingsRow>
          </SettingsCard>
        </SettingsSectionAnchor>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">관련 가이드</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SettingsTile href="/freelancer/cases" title="내 케이스" body="본인 코드 귀속 케이스만 표시." />
            <SettingsTile href="/freelancer/commissions" title="커미션 명세서" body="월별·케이스별 PDF + 원천징수영수증." />
            <SettingsTile href="/freelancer/disputes" title="이의 제기" body="누락·금액 차이·취소 페널티 분쟁." />
            <SettingsTile href="/freelancer/tax-docs" title="세금 서류" body="원천징수영수증 · 지급명세서 · 세금계산서 요청." />
          </div>
        </div>
      </SettingsShell>
    </div>
  );
}

function AffiliationRow({
  name,
  code,
  rate,
  piiLevel,
  status,
}: {
  name: string;
  code: string;
  rate: string;
  piiLevel: string;
  status: 'active' | 'pending';
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-border/60 py-3 first:border-t-0 first:pt-0">
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{name}</span>
          <Badge variant={status === 'active' ? 'hospitality' : 'secondary'}>{status}</Badge>
        </div>
        <div className="text-[11px] text-muted-foreground">
          코드 <span className="font-mono">{code}</span> · 커미션 {rate} · PII {piiLevel}
        </div>
      </div>
      <Button variant="outline" size="sm" className="rounded-full">관리</Button>
    </div>
  );
}

function ReferralRow({
  code,
  agency,
  landing,
  leads,
  cases,
}: {
  code: string;
  agency: string;
  landing: string;
  leads: number;
  cases: number;
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-border/60 py-3 first:border-t-0 first:pt-0">
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-hospitality-50 px-2 py-0.5 font-mono text-xs font-semibold text-hospitality-700">
            {code}
          </span>
          <span className="text-[11px] text-muted-foreground">{agency}</span>
        </div>
        <div className="text-[11px] text-muted-foreground">{landing}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-xs font-semibold">{leads} 리드</div>
          <div className="text-[10px] text-muted-foreground">{cases} 케이스 전환</div>
        </div>
        <Button variant="outline" size="sm" className="rounded-full">QR</Button>
      </div>
    </div>
  );
}

function NotifChannelRow({
  label,
  channels,
  hint,
}: {
  label: string;
  channels: Array<'email' | 'sms' | 'kakao' | 'whatsapp' | 'web'>;
  hint?: string;
}): JSX.Element {
  const ALL: Array<'email' | 'sms' | 'kakao' | 'whatsapp' | 'web'> = ['email', 'sms', 'kakao', 'whatsapp', 'web'];
  return (
    <SettingsRow label={label} hint={hint}>
      <div className="flex flex-wrap gap-1.5">
        {ALL.map((c) => (
          <span
            key={c}
            className={
              channels.includes(c)
                ? 'inline-flex items-center rounded-full bg-hospitality-50 px-2.5 py-0.5 text-[11px] font-medium text-hospitality-700'
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
