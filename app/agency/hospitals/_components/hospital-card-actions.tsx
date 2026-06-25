'use client';

import Link from 'next/link';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { deleteHospitalAction } from '../_actions/hospital-admin';

/**
 * 병원 카드 우하단의 3-아이콘 액션 줄. 카드 자체는 클릭 영역에서
 * 빠져있고, 각 아이콘이 독립적으로 동작:
 *
 *   상세 → /agency/hospitals/[id]
 *   편집 → /master/hospitals/[id]/edit (마스터 모드 진입)
 *   삭제 → window.confirm 후 deleteHospitalAction 호출
 *
 * lucide 아이콘 + tooltip 텍스트, 시각적 무게 가벼움.
 */
export function HospitalCardActions({
  id,
  name,
}: {
  id: string;
  name: string;
}): JSX.Element {
  return (
    <div className="flex items-center gap-1 border-t pt-2">
      <Link
        href={`/agency/hospitals/${id}`}
        title="상세 보기"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Eye className="h-3.5 w-3.5" />
        <span className="sr-only">상세</span>
      </Link>
      <Link
        href={`/master/hospitals/${id}/edit`}
        title="편집 (마스터 모드)"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
        <span className="sr-only">편집</span>
      </Link>
      <form
        action={deleteHospitalAction}
        onSubmit={(e) => {
          const ok = window.confirm(
            `"${name}" 병원을 정말 삭제하시겠습니까?\n\n` +
              `이 작업은 되돌릴 수 없으며, 연결된 의사·요율·예약금 정책·카테고리 매핑도 함께 삭제됩니다.`,
          );
          if (!ok) e.preventDefault();
        }}
        className="ml-auto inline-block"
      >
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          title="삭제"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="sr-only">삭제</span>
        </button>
      </form>
    </div>
  );
}
