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
  { id: 'business', label: '업체 정보' },
  { id: 'hours', label: '영업시간 · 가용성' },
  { id: 'menu', label: '메뉴 · 가격 (다국어)' },
  { id: 'constraints', label: '시술 후 제약' },
  { id: 'settlements', label: '정산 · 은행' },
  { id: 'contracts', label: '에이전시 계약' },
  { id: 'security', label: '보안' },
];

export function PartnerSettingsBody(): JSX.Element {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-2 py-2 md:px-4">
      <SettingsHero
        eyebrow="파트너업체 운영"
        title="설정"
        lead="업체 정보·가용성·다국어 메뉴·시술 후 제약 조건. Agency 패키지 빌더가 자동 충돌 감지에 이 정보를 사용합니다."
        actions={
          <>
            <Button variant="outline" className="rounded-full">데이터 내보내기</Button>
            <Button className="rounded-full bg-slate-900 text-white hover:bg-slate-800">저장</Button>
          </>
        }
      />

      <SettingsPromoCard
        title="이번 주 부킹 18건 · 평균 평점 4.7"
        body="환자 시술 후 회복 일정과 자동 매칭되어 부킹이 들어옵니다. 메뉴/가용성을 최신 상태로 유지하면 매칭률이 올라갑니다."
        variant="brand"
        cta={<Button className="rounded-full bg-white text-foreground hover:bg-white/90">부킹 인박스</Button>}
      />

      <SettingsShell sections={SECTIONS} accentClass="text-foreground">
        <SettingsSectionAnchor id="business">
          <SettingsCard
            title="업체 정보"
            description="업체 종류에 따라 노출되는 필드와 환자 동선 매칭 로직이 달라집니다."
            action={
              <div className="flex items-center gap-2">
                <Badge variant="secondary">non_medical</Badge>
                <Badge variant="secondary">verified</Badge>
              </div>
            }
          >
            <SettingsRow label="업체 종류">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['hotel', 'spa', 'salon', 'studio', 'restaurant', 'transport', 'tour', 'shopping', 'wellness'] as const).map(
                  (k) => (
                    <Badge
                      key={k}
                      variant={k === 'hotel' ? 'brand' : 'secondary'}
                      className={k === 'hotel' ? '' : 'rounded-full'}
                    >
                      {k}
                    </Badge>
                  ),
                )}
              </div>
            </SettingsRow>
            <SettingsRow label="업체명">
              <Input defaultValue="얼리메디 회복호텔" className="rounded-md" />
            </SettingsRow>
            <SettingsRow label="법인명">
              <Input defaultValue="얼리메디 호스피탈리티" className="rounded-md" />
            </SettingsRow>
            <SettingsRow label="대표자">
              <Input defaultValue="최호텔" className="rounded-md" />
            </SettingsRow>
            <SettingsRow label="사업자등록번호">
              <Input defaultValue="555-12-34567" className="rounded-md font-mono" />
            </SettingsRow>
            <SettingsRow label="주소" hint="환자 PWA 지도에 표시">
              <Input defaultValue="서울시 강남구 도산대로 100, 의료관광 회복존" className="rounded-md" />
            </SettingsRow>
            <SettingsRow label="다국어 소개">
              <div className="space-y-2">
                <Input defaultValue="ko: 시술 직후 회복에 특화된 의료관광 호텔" className="rounded-md" />
                <Input defaultValue="en: Medical-tourism recovery hotel, 24/7 nurse-call" className="rounded-md" />
                <Input defaultValue="zh-CN: 专为术后恢复设计的医疗旅游酒店" className="rounded-md" />
              </div>
            </SettingsRow>
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="hours">
          <SettingsCard
            title="영업시간 · 가용성"
            description="객실/좌석/차량 단위로 실시간 가용성을 관리합니다. 부킹 인박스에 자동 반영."
            action={<Button variant="outline" className="rounded-full">캘린더 동기화</Button>}
          >
            <SettingsRow label="기본 영업">
              <Badge variant="brand">24시간 운영</Badge>
            </SettingsRow>
            <SettingsRow label="체크인 / 체크아웃">
              <div className="flex items-center gap-2 text-sm">
                <Input className="w-24 rounded-md" defaultValue="15:00" />
                <span className="text-muted-foreground">/</span>
                <Input className="w-24 rounded-md" defaultValue="11:00" />
              </div>
            </SettingsRow>
            <SettingsRow label="가용 객실 (오늘)">
              <div className="space-y-2">
                <RoomAvailRow type="Recovery Suite" total={8} avail={3} priceKrw={350_000} />
                <RoomAvailRow type="Premier Recovery" total={4} avail={2} priceKrw={520_000} />
                <RoomAvailRow type="VIP Recovery Villa" total={2} avail={0} priceKrw={1_200_000} />
              </div>
            </SettingsRow>
            <SettingsRow label="블랙아웃 날짜" hint="공휴일/리모델링 등">
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <Badge variant="secondary" className="rounded-full">2026-06-06 현충일</Badge>
                <Badge variant="secondary" className="rounded-full">2026-08-15 광복절</Badge>
                <Button variant="outline" size="sm" className="rounded-full">+ 추가</Button>
              </div>
            </SettingsRow>
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="menu">
          <SettingsCard
            title="메뉴 · 가격 (다국어)"
            description="AI 자동 추출(PDF/이미지)로 한 번에 등록하거나 수동 입력. 변경은 즉시 환자 PWA에 반영됩니다."
            action={<Button variant="outline" className="rounded-full">PDF에서 AI 추출</Button>}
          >
            <SettingsRow label="메뉴 항목 수">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="brand">12 활성</Badge>
                <Badge variant="secondary" className="rounded-full">3 비활성</Badge>
              </div>
            </SettingsRow>
            <SettingsRow label="번역 상태" hint="필수 언어 5개 (ko/en/zh-CN/ja/ru)">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="care">ko 100%</Badge>
                <Badge variant="care">en 100%</Badge>
                <Badge variant="hospitality">zh-CN 83%</Badge>
                <Badge variant="hospitality">ja 67%</Badge>
                <Badge variant="destructive">ru 25%</Badge>
              </div>
            </SettingsRow>
            <SettingsRow label="식이 옵션 (식당만)">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="rounded-full">할랄</Badge>
                <Badge variant="secondary" className="rounded-full">코셔</Badge>
                <Badge variant="secondary" className="rounded-full">비건</Badge>
                <Badge variant="secondary" className="rounded-full">글루텐프리</Badge>
              </div>
            </SettingsRow>
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="constraints">
          <SettingsCard
            title="시술 후 제약"
            description="Agency 패키지 빌더가 자동 충돌 감지에 이 규칙을 사용합니다. 시술 D+N 이전에는 부킹이 자동 차단됩니다."
          >
            <ConstraintRow label="사우나 / 찜질" forbidden="시술 D+7 이전" gentle="시술 D+14 이전 권장" />
            <ConstraintRow label="페이셜 마사지" forbidden="보톡스 D+7 이전 · 필러 D+14 이전" gentle="—" />
            <ConstraintRow label="격렬한 운동" forbidden="모든 시술 D+7 이전" gentle="—" />
            <ConstraintRow label="자외선 노출 / 야외 투어" forbidden="레이저 D+14 이전 · 박피 D+30 이전" gentle="—" />
            <ConstraintRow label="음주 · 흡연" forbidden="전 시술 D+3 이전" gentle="회복 단계에서는 권장 X" />
            <ConstraintRow label="비행기 탑승" forbidden="복부 수술 D+10 · 안과 D+7" gentle="—" />
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="settlements">
          <SettingsCard
            title="정산 · 은행"
            description="Agency 부킹에서 커미션이 차감된 후 다음 정산 주기에 입금됩니다."
          >
            <SettingsRow label="이번 달 미정산 잔액">
              <span className="text-xl font-bold">₩4,820,000</span>
            </SettingsRow>
            <SettingsRow label="정산 주기">
              <Badge variant="brand">월간 (매월 15일)</Badge>
            </SettingsRow>
            <SettingsRow label="입금 계좌 (KRW)">
              <div className="space-y-1">
                <div className="font-mono text-sm">우리은행 1002-345-678901</div>
                <div className="text-[11px] text-muted-foreground">예금주: 얼리메디 호스피탈리티</div>
              </div>
            </SettingsRow>
            <SettingsRow label="세금계산서 자동 발행">
              <Badge variant="care">on · 정산 다음날 09:00</Badge>
            </SettingsRow>
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="contracts">
          <SettingsCard
            title="에이전시 계약"
            description="여러 에이전시와 동시에 협력 가능. 각 계약에 다른 커미션·우선 노출 정책 적용."
            action={<Button variant="outline" className="rounded-full">+ 계약 추가</Button>}
          >
            <PartnerContractRow agency="얼리메디 데모 에이전시" commission="GMV의 15%" priority="우선 노출" status="active" />
            <PartnerContractRow agency="Asia Health Group" commission="GMV의 12%" priority="기본" status="active" />
            <PartnerContractRow agency="K-Beauty Tour Co." commission="GMV의 10%" priority="기본" status="paused" />
          </SettingsCard>
        </SettingsSectionAnchor>

        <SettingsSectionAnchor id="security">
          <SettingsCard
            title="보안"
            description="환자 PII는 에이전시가 명시 공개한 최소 식별 정보(별칭·국적·체크인 날짜)만 보입니다."
          >
            <SettingsRow label="2단계 인증">
              <Badge variant="secondary" className="rounded-full">권장</Badge>
            </SettingsRow>
            <SettingsRow label="세션 만료">
              <div className="flex items-center gap-2 text-sm">
                <Input className="w-20 rounded-md" defaultValue="24" />
                <span className="text-muted-foreground">시간</span>
              </div>
            </SettingsRow>
            <SettingsRow label="환자 정보 접근" hint="alias_only — 환자 본명·여권 안 보임">
              <Badge variant="brand">최소 식별 정보만</Badge>
            </SettingsRow>
            <SettingsRow label="감사 로그">
              <Button variant="outline" size="sm" className="rounded-full">최근 30일</Button>
            </SettingsRow>
          </SettingsCard>
        </SettingsSectionAnchor>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">관련 가이드</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SettingsTile href="/partner/bookings" title="부킹 인박스" body="에이전시 부킹 요청 수락/거절." />
            <SettingsTile href="/partner/availability" title="가용성 캘린더" body="객실·좌석·차량 실시간 동기화." />
            <SettingsTile href="/partner/menu" title="메뉴 · 가격" body="다국어 자동 번역 + AI PDF 추출." />
            <SettingsTile href="/partner/constraints" title="시술 후 제약" body="Agency 패키지 충돌 감지 규칙 편집." />
          </div>
        </div>
      </SettingsShell>
    </div>
  );
}

function RoomAvailRow({
  type,
  total,
  avail,
  priceKrw,
}: {
  type: string;
  total: number;
  avail: number;
  priceKrw: number;
}): JSX.Element {
  const pct = (avail / total) * 100;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{type}</div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={
              pct > 50
                ? 'h-full rounded-full bg-care-500'
                : pct > 0
                  ? 'h-full rounded-full bg-hospitality-500'
                  : 'h-full rounded-full bg-destructive'
            }
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="text-right text-xs">
        <div className="font-semibold">
          {avail} / {total}
        </div>
        <div className="text-muted-foreground">가용</div>
      </div>
      <div className="text-right text-sm font-semibold">₩{priceKrw.toLocaleString('ko-KR')} / 박</div>
    </div>
  );
}

function ConstraintRow({
  label,
  forbidden,
  gentle,
}: {
  label: string;
  forbidden: string;
  gentle: string;
}): JSX.Element {
  return (
    <SettingsRow label={label}>
      <div className="space-y-1.5">
        <div className="flex items-baseline gap-2">
          <Badge variant="destructive">금지</Badge>
          <span className="text-sm">{forbidden}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <Badge variant="hospitality">주의</Badge>
          <span className="text-sm text-muted-foreground">{gentle}</span>
        </div>
      </div>
    </SettingsRow>
  );
}

function PartnerContractRow({
  agency,
  commission,
  priority,
  status,
}: {
  agency: string;
  commission: string;
  priority: string;
  status: 'active' | 'paused' | 'expired';
}): JSX.Element {
  const badge =
    status === 'active' ? (
      <Badge variant="care">active</Badge>
    ) : status === 'paused' ? (
      <Badge variant="secondary">paused</Badge>
    ) : (
      <Badge variant="destructive">expired</Badge>
    );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-border/60 py-3 first:border-t-0 first:pt-0">
      <div className="min-w-0 space-y-0.5">
        <div className="text-sm font-medium">{agency}</div>
        <div className="text-[11px] text-muted-foreground">
          커미션 {commission} · {priority}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge}
        <Button variant="outline" size="sm" className="rounded-full">관리</Button>
      </div>
    </div>
  );
}
