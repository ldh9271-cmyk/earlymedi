'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { LayoutGrid, List as ListIcon, Search, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { Input } from '@/components/shared/ui/input';
import { Badge } from '@/components/shared/ui/badge';
import { cn } from '@/lib/utils/cn';

type Stage =
  | 'scoping'
  | 'rfq_sent'
  | 'quoted'
  | 'accepted'
  | 'deposit_paid'
  | 'scheduled'
  | 'arrived'
  | 'in_treatment'
  | 'post_treatment'
  | 'aftercare'
  | 'closed_won'
  | 'closed_lost'
  | 'closed_cancelled';

type CaseRow = {
  id: string;
  caseNumber: string;
  title: string;
  stage: Stage;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  patientId: string;
  estimatedArrivalDate: string | null;
  estimatedTotalKrw: number | null;
  targetHospitalIds: string[];
  targetProcedureCategories: string[];
  tags: string[];
  lastActivityAt: Date | string;
  eventsCount: number;
  closedAt: Date | string | null;
};

const STAGE_ORDER: Stage[] = [
  'scoping',
  'rfq_sent',
  'quoted',
  'accepted',
  'deposit_paid',
  'scheduled',
  'arrived',
  'in_treatment',
  'post_treatment',
  'aftercare',
];

const CLOSED_STAGES: Stage[] = ['closed_won', 'closed_lost', 'closed_cancelled'];

const STAGE_LABEL: Record<Stage, string> = {
  scoping: '초기 상담',
  rfq_sent: 'RFQ 발송',
  quoted: '견적 수신',
  accepted: '견적 수락',
  deposit_paid: '예약금 수령',
  scheduled: '일정 확정',
  arrived: '입국',
  in_treatment: '시술 중',
  post_treatment: '시술 완료',
  aftercare: '사후관리',
  closed_won: '정산 완료',
  closed_lost: '미전환',
  closed_cancelled: '취소',
};

const PRIORITY_VARIANT: Record<CaseRow['priority'], 'brand' | 'hospitality' | 'care' | 'destructive' | 'outline'> = {
  low: 'outline',
  normal: 'brand',
  high: 'hospitality',
  urgent: 'destructive',
};

export function CaseBoard({
  initialCases,
  initialView,
  initialQuery,
  initialIncludeClosed,
}: {
  initialCases: CaseRow[];
  initialView: 'board' | 'list';
  initialQuery: string;
  initialIncludeClosed: boolean;
}): JSX.Element {
  const router = useRouter();
  const [cases, setCases] = useState<CaseRow[]>(initialCases);
  const [view, setView] = useState<'board' | 'list' | 'calendar' | 'map'>(initialView);
  const [query, setQuery] = useState(initialQuery);
  const [includeClosed, setIncludeClosed] = useState(initialIncludeClosed);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function applyFilter(nextQuery: string, nextClosed: boolean): void {
    const params = new URLSearchParams();
    if (nextQuery) params.set('q', nextQuery);
    if (nextClosed) params.set('closed', '1');
    params.set('view', view === 'list' ? 'list' : 'board');
    startTransition(() => router.replace(`/agency/cases?${params.toString()}`));
  }

  const filtered = useMemo(() => {
    if (!query) return cases;
    const q = query.toLowerCase();
    return cases.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.caseNumber.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [cases, query]);

  const stagesToRender = includeClosed ? [...STAGE_ORDER, ...CLOSED_STAGES] : STAGE_ORDER;

  async function onDragEnd(e: DragEndEvent): Promise<void> {
    if (!e.over) return;
    const caseId = String(e.active.id);
    const toStage = String(e.over.id) as Stage;
    const target = cases.find((c) => c.id === caseId);
    if (!target || target.stage === toStage) return;
    const previous = target.stage;
    // optimistic update
    setCases((arr) => arr.map((c) => (c.id === caseId ? { ...c, stage: toStage } : c)));
    try {
      const res = await fetch(`/api/agency/cases/${caseId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: toStage }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      toast.success(`${STAGE_LABEL[previous]} → ${STAGE_LABEL[toStage]}`);
      startTransition(() => router.refresh());
    } catch (err) {
      setCases((arr) => arr.map((c) => (c.id === caseId ? { ...c, stage: previous } : c)));
      toast.error(err instanceof Error ? err.message : '단계 변경 실패');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => applyFilter(query, includeClosed)}
            placeholder="제목·번호·태그 검색"
            className="h-9 pl-8 text-xs"
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={includeClosed}
            onChange={(e) => {
              setIncludeClosed(e.target.checked);
              applyFilter(query, e.target.checked);
            }}
          />
          종료 포함
        </label>
        <div className="ml-auto flex items-center gap-1 rounded-md border p-0.5">
          <ViewTab icon={LayoutGrid} label="Kanban" active={view === 'board'} onClick={() => setView('board')} />
          <ViewTab icon={ListIcon} label="리스트" active={view === 'list'} onClick={() => setView('list')} />
          <ViewTab icon={CalendarIcon} label="캘린더" active={view === 'calendar'} onClick={() => setView('calendar')} />
          <ViewTab icon={MapPin} label="지도" active={view === 'map'} onClick={() => setView('map')} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-xs text-muted-foreground">
          {query ? '검색 결과가 없습니다.' : '아직 케이스가 없습니다. 인박스에서 Lead를 승격시켜 첫 케이스를 만드세요.'}
        </div>
      ) : view === 'board' ? (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="-mx-2 overflow-x-auto pb-2">
            <div className="flex gap-3 px-2">
              {stagesToRender.map((s) => (
                <StageColumn
                  key={s}
                  stage={s}
                  cases={filtered.filter((c) => c.stage === s)}
                  isPending={isPending}
                />
              ))}
            </div>
          </div>
        </DndContext>
      ) : view === 'list' ? (
        <ListView cases={filtered} />
      ) : view === 'calendar' ? (
        <Placeholder
          title="캘린더 뷰 (Phase 5.6 — 마스터 캘린더와 통합)"
          description="시술일·도착일 기준 월간 캘린더 + 통역사·드라이버 매칭 자동화 — 다음 sub-step에서 활성화"
        />
      ) : (
        <Placeholder
          title="지도 뷰 (Phase 5 후반 — 체류 환자 위치 트래킹)"
          description="환자 호텔·병원 위치 + 이동 동선. Mapbox 통합 — 다음 sub-step에서 활성화"
        />
      )}
    </div>
  );
}

function ViewTab({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition',
        active ? 'bg-brand-50 text-brand-700' : 'text-muted-foreground hover:bg-muted',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function StageColumn({
  stage,
  cases,
  isPending,
}: {
  stage: Stage;
  cases: CaseRow[];
  isPending: boolean;
}): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = cases.reduce((sum, c) => sum + (c.estimatedTotalKrw ?? 0), 0);
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border bg-muted/20 transition',
        isOver && 'ring-2 ring-brand-300',
        isPending && 'opacity-70',
      )}
    >
      <div className="flex items-center justify-between border-b bg-background px-3 py-2 text-xs">
        <div className="font-semibold">{STAGE_LABEL[stage]}</div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>{cases.length}</span>
          {total > 0 ? <span>· ₩{(total / 10_000).toFixed(0)}만</span> : null}
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2 max-h-[calc(100vh-16rem)]">
        {cases.length === 0 ? (
          <div className="rounded border border-dashed py-6 text-center text-[11px] text-muted-foreground">
            드래그해서 옮기기
          </div>
        ) : (
          cases.map((c) => <CaseCard key={c.id} row={c} />)
        )}
      </div>
    </div>
  );
}

function CaseCard({ row }: { row: CaseRow }): JSX.Element {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: row.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'rounded-md border bg-white p-2.5 text-xs shadow-sm transition',
        isDragging ? 'opacity-40' : 'hover:ring-1 hover:ring-brand-200',
      )}
    >
      <Link
        href={`/agency/cases/${row.id}`}
        onClick={(e) => isDragging && e.preventDefault()}
        className="block space-y-1"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground">{row.caseNumber}</span>
          {row.priority !== 'normal' ? (
            <Badge variant={PRIORITY_VARIANT[row.priority]}>{row.priority}</Badge>
          ) : null}
        </div>
        <div className="line-clamp-2 font-medium">{row.title}</div>
        {row.estimatedArrivalDate ? (
          <div className="text-[10px] text-muted-foreground">도착 {row.estimatedArrivalDate}</div>
        ) : null}
        {row.estimatedTotalKrw ? (
          <div className="text-[11px] font-semibold">₩{row.estimatedTotalKrw.toLocaleString('ko-KR')}</div>
        ) : null}
        {row.targetProcedureCategories.length > 0 ? (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {row.targetProcedureCategories.slice(0, 3).map((c) => (
              <span key={c} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {c}
              </span>
            ))}
          </div>
        ) : null}
      </Link>
    </div>
  );
}

function ListView({ cases }: { cases: CaseRow[] }): JSX.Element {
  return (
    <div className="rounded-lg border bg-white">
      <table className="w-full text-xs">
        <thead className="border-b text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2">번호</th>
            <th className="px-3 py-2">제목</th>
            <th className="px-3 py-2">단계</th>
            <th className="px-3 py-2">도착 예정</th>
            <th className="px-3 py-2 text-right">예상 총액</th>
            <th className="px-3 py-2">우선순위</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{c.caseNumber}</td>
              <td className="px-3 py-2">
                <Link href={`/agency/cases/${c.id}`} className="font-medium hover:underline">
                  {c.title}
                </Link>
              </td>
              <td className="px-3 py-2">
                <Badge variant="brand">{STAGE_LABEL[c.stage]}</Badge>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{c.estimatedArrivalDate ?? '—'}</td>
              <td className="px-3 py-2 text-right font-medium">
                {c.estimatedTotalKrw ? `₩${c.estimatedTotalKrw.toLocaleString('ko-KR')}` : '—'}
              </td>
              <td className="px-3 py-2">
                {c.priority !== 'normal' ? <Badge variant={PRIORITY_VARIANT[c.priority]}>{c.priority}</Badge> : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Placeholder({ title, description }: { title: string; description: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 py-16 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
