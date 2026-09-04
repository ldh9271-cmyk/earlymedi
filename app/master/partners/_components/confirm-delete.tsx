'use client';

// 총판 삭제 확인 버튼 (클라이언트).
//
// 삭제는 되돌릴 수 없어 오조작이 치명적이다 — 실제로 실수 삭제가 한 번
// 발생했다. 네이티브 confirm() 은 쓰지 않는 것이 이 프로젝트 관례라
// 2단계 인라인 확인으로 막는다: [삭제] → [정말 삭제 · 취소].
// 확정을 눌러야만 서버 액션 폼이 submit 된다.
import { useRef, useState } from 'react';

export default function ConfirmDeleteButton({
  action,
  partnerId,
  label,
}: {
  action: (fd: FormData) => void | Promise<void>;
  partnerId: string;
  /** 확인 문구에 넣을 총판 이름·코드. */
  label: string;
}): JSX.Element {
  const [armed, setArmed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <input type="hidden" name="partnerId" value={partnerId} />
      {!armed ? (
        <button
          type="button"
          onClick={() => setArmed(true)}
          title="총판·하위 추천인·귀속·수당 원장을 모두 삭제합니다 (되돌릴 수 없음)"
          style={{
            border: '1px solid #dc2626', color: '#dc2626', background: '#fff',
            borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          삭제
        </button>
      ) : (
        <>
          <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {label} 삭제?
          </span>
          <button
            type="submit"
            style={{
              border: 'none', background: '#dc2626', color: '#fff',
              borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            예, 삭제
          </button>
          <button
            type="button"
            onClick={() => setArmed(false)}
            style={{
              border: '1px solid #dddddd', background: '#fff', color: '#222',
              borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            취소
          </button>
        </>
      )}
    </form>
  );
}
