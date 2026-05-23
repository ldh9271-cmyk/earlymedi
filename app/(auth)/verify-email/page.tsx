import Link from 'next/link';
import { Card, CardContent } from '@/components/shared/ui/card';

export const metadata = { title: '이메일 확인' };

export default function VerifyEmailPage(): JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-4 p-8 text-center">
        <h1 className="text-xl font-semibold">이메일을 확인해 주세요</h1>
        <p className="text-sm text-muted-foreground">
          받은 매직링크를 클릭하면 자동으로 로그인됩니다.
        </p>
        <p className="text-xs text-muted-foreground">
          링크를 받지 못하셨나요?{' '}
          <Link href="/login" className="underline">
            다시 보내기
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
