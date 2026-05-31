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
  { id: 'hospital', label: '의료기관 정보' },
  { id: 'doctors', label: '진료과 · 의사' },
  { id: 'rooms', label: '룸 · 시설' },
  { id: 'chart-policy', label: '시술 차트 정책' },
  { id: 'emr', label: 'EMR 통합' },
  { id: 'settlements', label: '정산 · 세금계산서' },
  { id: 'contracts', label: '에이전시 계약' },
  { id: 'security', label: '보안 · 감사' },
];

const ROLE_VARIANT: Record<string, 'brand' | 'hospitality' | 'care' | 'secondary'> = {
  director: 'care',
  staff: 'secondary',
  consultant: 'secondary',
};

export function MedicalSettingsBody(): JSX.Element {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-2 py-2 md:px-4">
      <SettingsHero
        eyebrow="의료기관 운영"
        title="설정"
        lead="의료기관 등록 정보, 진료과·의사 리소스, 시술 차트 정책, EMR 연동, 정산 계좌를 한 곳에서 관리합니다."
        actions={
          <>
            <Button variant="outline" className="rounded-full">변경 사항 내보내기</Button>
            <Button variant="care" className="rounded-full">저장</Button>
          </>
        }
      />

      <SettingsPromoCard
        title="이번 분기 송객 수수료 ₩42,300,000"
        body="6월 정산 명세서가 6월 30일에 자동 발행됩니다. 세금계산서는 e세로로 함께 전송됩니다."
        variant="care"
        cta={<Button className="rounded-full bg-white text-care-700 hover:bg-white/90">명세서 보기</Button>}
      />

      <SettingsShell sections={SECTIONS} accentClass="text-care-700">
        <SettingsSectionAnchor id="hospital">
          <SettingsCard
            title="의료기관 정보"
            description="의료기관 개설신고증·외국인환자 유치 의료기관 등록증에 등재된 정보와 동일하게 유지하세요."
            action={
              <div className="flex items-center gap-2">
                <Badge variant="care">verified</Badge>
                <Badge variant="care">의료기관</Badge>
              </div>
            }
          >
            <SettingsRow label="병원명" hint="환자에게 노출되는 명칭">
              <Input defaultValue="KoreaGlowUp 데모 성형외과" className="rounded-md" />
            </SettingsRow>
            <SettingsRow label="의료법인명">
              <Input defaultValue="의료법인 KoreaGlowUp 데모" className="rounded-md" />
            </SettingsRow>
            <SettingsRow label="사업자등록번호">
              <Input defaultValue="987-65-43210" className="rounded-md font-mono" />
            </SettingsRow>
            <SettingsRow label="의료기관 개설신고증 번호">
              <Input defaultValue="MED-2024-DEMO-0001" className="rounded-md font-mono" />
            </SettingsRow>
            <SettingsRow label="외국인환자 유치 의료기관 등록증 번호">
              <Input defaultValue="FP-MED-2024-DEMO" className="rounded-md font-mono" />
            </SettingsRow>
            <SettingsRow label="대표 원장">
              <Input defaultValue="이병원" className="rounded-md" />
            </SettingsRow>
            <SettingsRow label="진료과 (대표)">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="care">성형외과</Badge>
                <Badge variant="care">피부과</Badge>
                <Badge variant="secondary" className="rounded-full">+ 추가</Badge>
              </div>
            </SettingsRow>
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="doctors">
          <SettingsCard
            title="진료과 · 의사"
            description="외국인환자 매칭 시 노출되는 의사 프로필. 다국어 자기소개를 입력하면 환자 PWA에서 자동 노출됩니다."
            action={<Button variant="care" className="rounded-full">+ 의사 추가</Button>}
          >
            <DoctorRow name="이병원" role="director" specialties={['성형외과']} langs={['ko', 'en']} caseLoad="이번주 12건" />
            <DoctorRow name="박미경" role="staff" specialties={['성형외과', '피부과']} langs={['ko', 'en', 'zh']} caseLoad="이번주 8건" />
            <DoctorRow name="James Chen" role="consultant" specialties={['피부과']} langs={['en', 'zh']} caseLoad="이번주 3건" />
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="rooms">
          <SettingsCard
            title="룸 · 시설"
            description="예약 캘린더에서 의사·룸·통역사 리소스 충돌 없이 드래그앤드롭으로 배정합니다."
          >
            <RoomRow name="수술실 A" kind="OR" capacity={1} equip={['전신마취기', '레이저', '내시경']} />
            <RoomRow name="수술실 B" kind="OR" capacity={1} equip={['전신마취기', '레이저']} />
            <RoomRow name="시술실 1" kind="procedure" capacity={1} equip={['레이저', '울세라']} />
            <RoomRow name="시술실 2" kind="procedure" capacity={1} equip={['레이저', 'IPL']} />
            <RoomRow name="상담실" kind="consult" capacity={1} equip={['카메라 부스']} />
            <RoomRow name="회복실 1~4" kind="recovery" capacity={4} equip={['모니터링', '간호 호출']} />
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="chart-policy">
          <SettingsCard
            title="시술 차트 정책"
            description="finalize 후 수정 불가 — 새 버전(supersedes)만 생성됩니다. 자동 채움 신뢰도 기준과 공유 범위를 설정하세요."
          >
            <SettingsRow label="기본 공유 범위" hint="환자 PWA에서 보이는 범위">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="rounded-full">name_only</Badge>
                <Badge variant="care">name_and_amount (default)</Badge>
                <Badge variant="secondary" className="rounded-full">full</Badge>
              </div>
            </SettingsRow>
            <SettingsRow label="견적 대비 variance 정책" hint="±5% 자동 / ±15% 매니저 / 초과 환자 재동의">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="care">±5% auto</Badge>
                <Badge variant="hospitality">±15% manager</Badge>
                <Badge variant="destructive">{'>'} 15% patient re-consent</Badge>
              </div>
            </SettingsRow>
            <SettingsRow label="AI 자동 채움 신뢰도" hint="라인별 confidence (basis points)">
              <div className="flex items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-care-500" />
                  ≥ 90% 자동 적용
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-hospitality-500" />
                  70–89% 노란색 표시
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  {'<'} 70% 빨간색·보류
                </span>
              </div>
            </SettingsRow>
            <SettingsRow label="finalize 권한" hint="기본은 병원 + 에이전시 + 환자 3자 서명">
              <Badge variant="care">3-way e-signature 필수</Badge>
            </SettingsRow>
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="emr">
          <SettingsCard
            title="EMR 통합"
            description="CSV 야간 업로드 · REST API 풀 · 수기 입력 중 하나를 선택합니다. 라인 매핑은 병원별 alias 사전으로 학습됩니다."
            action={<Button variant="outline" className="rounded-full">매핑 검증</Button>}
          >
            <SettingsRow label="통합 모드">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="care">CSV 야간 업로드</Badge>
                <Badge variant="secondary" className="rounded-full">REST API</Badge>
                <Badge variant="secondary" className="rounded-full">수기</Badge>
              </div>
            </SettingsRow>
            <SettingsRow label="CSV 업로드 일정" hint="Supabase Storage emr-csv/ 버킷">
              <Input defaultValue="매일 02:00 KST" className="rounded-md" />
            </SettingsRow>
            <SettingsRow label="마지막 동기화">
              <div className="space-y-0.5 text-sm">
                <div>2026-05-23 02:14 KST · 12건 ingested · 0건 실패</div>
                <div className="text-[11px] text-muted-foreground">평균 매핑 신뢰도 94.2%</div>
              </div>
            </SettingsRow>
            <SettingsRow label="시술 alias 사전" hint="병원별 격리 — 다른 병원에 노출되지 않음">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full">342개 학습됨</Badge>
                <Button variant="outline" size="sm" className="rounded-full">사전 보기</Button>
              </div>
            </SettingsRow>
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="settlements">
          <SettingsCard
            title="정산 · 세금계산서"
            description="시술 차트 finalize 시 송객 수수료가 자동 계산됩니다. 이번 달 미정산 잔액과 결제 수단을 확인하세요."
          >
            <SettingsRow label="이번 달 미정산 잔액">
              <span className="text-xl font-bold">₩12,450,000</span>
            </SettingsRow>
            <SettingsRow label="누적 미발행 세금계산서">
              <Badge variant="hospitality">3건 대기</Badge>
            </SettingsRow>
            <SettingsRow label="정산 계좌">
              <div className="space-y-1">
                <div className="font-mono text-sm">신한은행 100-987-654321</div>
                <div className="text-[11px] text-muted-foreground">예금주: 의료법인 KoreaGlowUp 데모</div>
              </div>
            </SettingsRow>
            <SettingsRow label="세금계산서 발행" hint="홈택스 e세로 연동">
              <Badge variant="care">linked</Badge>
            </SettingsRow>
            <SettingsRow label="자동 발행 조건" hint="기본: 정산 확정 후 익월 5일">
              <Input defaultValue="익월 5일 09:00 KST" className="rounded-md" />
            </SettingsRow>
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="contracts">
          <SettingsCard
            title="에이전시 계약"
            description="여러 에이전시와 동시에 협력 가능. 각 계약은 송객 수수료율·예약금 정책·정산 주기가 다를 수 있습니다."
            action={<Button variant="care" className="rounded-full">+ 계약 추가</Button>}
          >
            <ContractRow name="KoreaGlowUp 데모 에이전시" rate="성형 30% · 피부 20%" deposit="20% percentage" status="active" expiresIn="11개월" />
            <ContractRow name="K-Beauty Tour Co." rate="성형 28% · 피부 18%" deposit="₩500,000 fixed" status="active" expiresIn="3개월" />
            <ContractRow name="Asia Health Group" rate="성형 32%" deposit="off" status="pending_sign" expiresIn="대기" />
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="security">
          <SettingsCard
            title="보안 · 감사"
            description="모든 PHI 접근은 audit_logs에 기록되며 10년 보존됩니다 (의료법 27조의2)."
          >
            <SettingsRow label="2단계 인증" hint="대표 원장·직원은 강제">
              <Badge variant="care">enforced for all</Badge>
            </SettingsRow>
            <SettingsRow label="환자 PII 접근 알림" hint="reveal_pii 호출 시 매니저에게 알림">
              <Badge variant="care">on</Badge>
            </SettingsRow>
            <SettingsRow label="세션 만료">
              <div className="flex items-center gap-2 text-sm">
                <Input className="w-20 rounded-md" defaultValue="8" />
                <span className="text-muted-foreground">시간</span>
                <span className="text-[11px] text-muted-foreground">(PHI 접근 워크플로우 권장 8h)</span>
              </div>
            </SettingsRow>
            <SettingsRow label="감사 로그 내보내기">
              <div className="flex items-center gap-2">
                <Button variant="outline" className="rounded-full">최근 30일 CSV</Button>
                <Button variant="outline" className="rounded-full">전체 JSON</Button>
              </div>
            </SettingsRow>
          </SettingsCard>
        </SettingsSectionAnchor>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">관련 가이드</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SettingsTile href="/medical/charts" title="시술 차트 작성" body="병원 → 에이전시 검증 → 환자 공유 3단 워크플로우." />
            <SettingsTile href="/medical/rfqs" title="RFQ 인박스" body="에이전시 견적 요청 회신." />
            <SettingsTile href="/medical/deposits" title="예약금 정책" body="비율·고정 + 환불 티어·캔슬 분할." />
            <SettingsTile href="/medical/billing" title="잔액 · 사용량" body="Committed/PayGo · 충전 잔액 알림 임계값." />
          </div>
        </div>
      </SettingsShell>
    </div>
  );
}

function DoctorRow({
  name,
  role,
  specialties,
  langs,
  caseLoad,
}: {
  name: string;
  role: 'director' | 'staff' | 'consultant';
  specialties: string[];
  langs: string[];
  caseLoad: string;
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-border/60 py-3 first:border-t-0 first:pt-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-care-50 text-xs font-semibold text-care-700">
          {name.slice(0, 1)}
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{name}</span>
            <Badge variant={ROLE_VARIANT[role]}>{role}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>진료: {specialties.join(' · ')}</span>
            <span>·</span>
            <span>언어: {langs.join(' / ').toUpperCase()}</span>
            <span>·</span>
            <span>{caseLoad}</span>
          </div>
        </div>
      </div>
      <Button variant="outline" size="sm" className="rounded-full">관리</Button>
    </div>
  );
}

function RoomRow({
  name,
  kind,
  capacity,
  equip,
}: {
  name: string;
  kind: 'OR' | 'procedure' | 'consult' | 'recovery';
  capacity: number;
  equip: string[];
}): JSX.Element {
  const KIND_LABEL = { OR: '수술실', procedure: '시술실', consult: '상담실', recovery: '회복실' };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-border/60 py-3 first:border-t-0 first:pt-0">
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{name}</span>
          <Badge variant="secondary" className="rounded-full">{KIND_LABEL[kind]}</Badge>
          <span className="text-[11px] text-muted-foreground">capacity {capacity}</span>
        </div>
        <div className="text-[11px] text-muted-foreground">장비: {equip.join(' · ')}</div>
      </div>
      <Button variant="outline" size="sm" className="rounded-full">편집</Button>
    </div>
  );
}

function ContractRow({
  name,
  rate,
  deposit,
  status,
  expiresIn,
}: {
  name: string;
  rate: string;
  deposit: string;
  status: 'active' | 'pending_sign' | 'expired';
  expiresIn: string;
}): JSX.Element {
  const STATUS_BADGE =
    status === 'active' ? (
      <Badge variant="care">active</Badge>
    ) : status === 'pending_sign' ? (
      <Badge variant="hospitality">pending sign</Badge>
    ) : (
      <Badge variant="destructive">expired</Badge>
    );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-border/60 py-3 first:border-t-0 first:pt-0">
      <div className="min-w-0 space-y-0.5">
        <div className="text-sm font-medium">{name}</div>
        <div className="text-[11px] text-muted-foreground">송객 수수료: {rate} · 예약금: {deposit}</div>
      </div>
      <div className="flex items-center gap-2">
        {STATUS_BADGE}
        <span className="text-[11px] text-muted-foreground">만료 {expiresIn}</span>
        <Button variant="outline" size="sm" className="rounded-full">계약서</Button>
      </div>
    </div>
  );
}
