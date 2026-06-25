'use client';

import { deleteListingAction } from '../_actions/listing-admin';

/**
 * 마스터 상품 관리 표의 "삭제" 셀. server action 자체는 이미
 * `deleteListingAction` 으로 존재 — 이 컴포넌트는 그 form 을 wrapping
 * 하면서 confirm() 다이얼로그로 더블체크만 한다. 별도 클라이언트
 * 모듈로 분리해 행 자체는 server component 로 유지.
 */
export function DeleteListingButton({
  id,
  title,
}: {
  id: string;
  title: string;
}): JSX.Element {
  return (
    <form
      action={deleteListingAction}
      onSubmit={(e) => {
        const ok = window.confirm(
          `"${title}" 상품을 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
        );
        if (!ok) e.preventDefault();
      }}
      style={{ display: 'inline' }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-xs font-medium text-rose-600 underline-offset-4 hover:underline"
      >
        삭제
      </button>
    </form>
  );
}
