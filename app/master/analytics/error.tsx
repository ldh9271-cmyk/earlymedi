'use client';

/**
 * 통계 리포트 오류 경계 — 서버 렌더가 실패하면 "Application error" 대신
 * 원인 문구와 digest 를 보여준다. 마스터 전용 화면이라 오류 내용을 숨길
 * 이유가 없고, 로그를 뒤지지 않고도 화면에서 바로 알 수 있는 편이 낫다.
 */
import Link from 'next/link';

export default function AnalyticsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }): JSX.Element {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-lg font-bold">통계 리포트를 불러오지 못했습니다</h1>
      <p className="mt-2 text-sm text-muted-foreground">아래 내용을 그대로 전달해 주시면 바로 잡을 수 있습니다.</p>
      <pre className="mt-4 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
        {error.message || '(메시지 없음)'}
        {error.digest ? `\ndigest: ${error.digest}` : ''}
      </pre>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={reset} className="rounded-md border px-3 py-1.5 text-sm">다시 시도</button>
        <Link href="/master" className="rounded-md border px-3 py-1.5 text-sm">마스터 홈</Link>
      </div>
    </div>
  );
}
