'use client';

import { deleteDocAction } from '../_actions';

/** 삭제 전 confirm() 만 하는 얇은 클라이언트 래퍼 — 행 자체는 서버 컴포넌트로 유지 */
export function DeleteDocButton({ id, title }: { id: string; title: string }): JSX.Element {
  return (
    <form
      action={deleteDocAction}
      onSubmit={(e) => {
        if (!window.confirm(`"${title}" 문서와 청크를 삭제할까요?\n되돌릴 수 없습니다. 잠시 빼려면 '비활성화'를 쓰세요.`)) e.preventDefault();
      }}
      style={{ display: 'inline' }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" style={{ background: 'none', border: 0, padding: 0, fontSize: 12, color: '#dc2626', textDecoration: 'underline', cursor: 'pointer' }}>
        삭제
      </button>
    </form>
  );
}
