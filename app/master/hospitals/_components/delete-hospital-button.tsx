'use client';

import { useTransition } from 'react';
import { deleteHospitalMasterAction } from '../_actions/delete';

/**
 * 마스터 /master/hospitals 행별 삭제 버튼.
 *   - 클릭 → window.confirm 으로 한 번 더 확인 (이중 안전망).
 *   - 확인 시 server action 호출 → 3 테이블 cascade.
 *   - 진행 중에는 버튼 비활성 + "삭제중…" 라벨.
 */
export function DeleteHospitalButton({
  id,
  name,
}: {
  id: string;
  name: string;
}): JSX.Element {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => deleteHospitalMasterAction(fd))}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `정말 "${name}" 병원을 삭제하시겠습니까?\n\n` +
              `category_listings · partner_listings · hospitals 3 테이블에서 모두 제거되며 ` +
              `환자 포털(/kr/clinics)에서도 즉시 사라집니다. 되돌릴 수 없습니다.`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="inline"
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-medium text-rose-600 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? '삭제중…' : '삭제'}
      </button>
    </form>
  );
}
