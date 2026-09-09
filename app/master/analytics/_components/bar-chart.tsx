'use client';

/**
 * 단일 계열 막대 차트 — 통계 리포트의 월별·일별·시간대별·가입 추이용.
 *
 * 규칙(데이터 시각화 가이드):
 *   막대 최대 24px, 위 모서리만 4px 라운드(밑변은 기준선에 각지게),
 *   격자는 실선 1px 한 톤 어두운 회색, 값 라벨은 최고점 하나만,
 *   계열이 하나라 범례 없음(제목이 곧 범례), 호버 툴팁 + 표 보기 토글.
 * 색은 참조 팔레트의 1번 슬롯(파랑) 하나. 글자는 항상 텍스트 토큰 색.
 */
import { useId, useMemo, useState } from 'react';

export type Point = { label: string; value: number; sub?: number };

export default function BarChart({ title, unit, subUnit, points, height = 180 }: {
  title: string;
  /** 값 단위 이름 (툴팁·표 머리글). 예: 페이지뷰 */
  unit: string;
  /** 보조 값 단위 (있으면 툴팁·표에 같이). 예: 방문 */
  subUnit?: string;
  points: Point[];
  height?: number;
}): JSX.Element {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const id = useId();

  const W = 720;
  const padL = 40; const padR = 8; const padT = 18; const padB = 26;
  const plotW = W - padL - padR;
  const plotH = height - padT - padB;
  const n = Math.max(points.length, 1);
  const slot = plotW / n;
  const bar = Math.min(24, Math.max(4, slot * 0.62));
  const max = Math.max(...points.map((p) => p.value), 0);
  const top = niceCeil(max);
  const ticks = useMemo(() => [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f)), [top]);
  const maxIdx = points.findIndex((p) => p.value === max && max > 0);
  // 라벨이 겹치지 않게 x 축 글자는 간격을 둔다
  const labelEvery = n > 16 ? Math.ceil(n / 12) : 1;

  const y = (v: number): number => padT + plotH - (top > 0 ? (v / top) * plotH : 0);

  return (
    <figure className="viz-root m-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <figcaption className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>{title}</figcaption>
        <button
          type="button"
          onClick={() => setTable((v) => !v)}
          className="rounded-md border px-2 py-0.5 text-[11px]"
          style={{ color: 'var(--ink-2)', borderColor: 'var(--hairline)' }}
          aria-pressed={table}
        >
          {table ? '차트 보기' : '표 보기'}
        </button>
      </div>

      {table ? (
        <div className="max-h-64 overflow-auto rounded-md border" style={{ borderColor: 'var(--hairline)' }}>
          <table className="w-full text-xs" style={{ color: 'var(--ink-1)' }}>
            <thead>
              <tr style={{ color: 'var(--ink-2)' }}>
                <th className="px-2 py-1 text-left font-medium">구간</th>
                <th className="px-2 py-1 text-right font-medium">{unit}</th>
                {subUnit ? <th className="px-2 py-1 text-right font-medium">{subUnit}</th> : null}
              </tr>
            </thead>
            <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
              {points.map((p) => (
                <tr key={p.label} style={{ borderTop: '1px solid var(--hairline)' }}>
                  <td className="px-2 py-1">{p.label}</td>
                  <td className="px-2 py-1 text-right">{p.value.toLocaleString('ko-KR')}</td>
                  {subUnit ? <td className="px-2 py-1 text-right">{(p.sub ?? 0).toLocaleString('ko-KR')}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${height}`} className="block w-full" role="img" aria-labelledby={`${id}-t`}>
            <title id={`${id}-t`}>{title}</title>
            {/* 격자 — 실선 1px, 한 톤 어두운 회색 */}
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
                <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="var(--ink-3)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {compact(t)}
                </text>
              </g>
            ))}
            {/* 기준선 */}
            <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="var(--axis)" strokeWidth={1} />

            {points.map((p, i) => {
              const cx = padL + slot * i + slot / 2;
              const x0 = cx - bar / 2;
              const h = y(0) - y(p.value);
              const r = Math.min(4, h);
              const isHot = hover === i;
              // 위쪽 모서리만 둥글게, 밑변은 기준선에 각지게
              const d = h <= 0
                ? ''
                : `M${x0},${y(0)} v${-(h - r)} a${r},${r} 0 0 1 ${r},${-r} h${bar - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} z`;
              return (
                <g key={p.label}>
                  {d ? <path d={d} fill="var(--series-1)" opacity={hover === null || isHot ? 1 : 0.55} /> : null}
                  {/* 최고점 하나만 직접 라벨 */}
                  {i === maxIdx ? (
                    <text x={cx} y={y(p.value) - 5} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--ink-1)">
                      {p.value.toLocaleString('ko-KR')}
                    </text>
                  ) : null}
                  {i % labelEvery === 0 ? (
                    <text x={cx} y={height - 8} textAnchor="middle" fontSize={10} fill="var(--ink-3)">{p.label}</text>
                  ) : null}
                  {/* 히트 영역은 막대보다 넓게 — 슬롯 전체 */}
                  <rect
                    x={padL + slot * i} y={padT} width={slot} height={plotH}
                    fill="transparent"
                    onPointerEnter={() => setHover(i)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    tabIndex={0}
                    aria-label={`${p.label} ${unit} ${p.value}${subUnit ? ` ${subUnit} ${p.sub ?? 0}` : ''}`}
                  />
                </g>
              );
            })}
          </svg>

          {hover !== null && points[hover] ? (
            <div
              className="pointer-events-none absolute rounded-md border px-2 py-1 text-[11px] shadow-sm"
              style={{
                left: `${((padL + slot * hover + slot / 2) / W) * 100}%`,
                top: 0,
                transform: hover > n / 2 ? 'translateX(-100%)' : 'translateX(0)',
                background: 'var(--surface-1)',
                borderColor: 'var(--hairline)',
                color: 'var(--ink-1)',
              }}
            >
              <div style={{ color: 'var(--ink-2)' }}>{points[hover].label}</div>
              <div className="flex items-center gap-1.5">
                <span style={{ display: 'inline-block', width: 10, height: 2, background: 'var(--series-1)' }} />
                <strong>{points[hover].value.toLocaleString('ko-KR')}</strong>
                <span style={{ color: 'var(--ink-2)' }}>{unit}</span>
              </div>
              {subUnit ? (
                <div style={{ color: 'var(--ink-2)' }}>{(points[hover].sub ?? 0).toLocaleString('ko-KR')} {subUnit}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </figure>
  );
}

/** 축 눈금이 0 / 500 / 1,000 처럼 떨어지게 */
function niceCeil(v: number): number {
  if (v <= 0) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const f = v / p;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 4 ? 4 : f <= 5 ? 5 : f <= 8 ? 8 : 10;
  return nice * p;
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}K`;
  return String(n);
}
