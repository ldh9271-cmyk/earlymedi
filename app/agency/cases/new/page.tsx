import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { listPatients } from '@/lib/db/repositories/patients';
import { NewCaseForm } from './_components/new-case-form';

export const metadata = { title: '새 케이스' };
export const dynamic = 'force-dynamic';

/**
 * 새 케이스 생성. 환자 상세의 [새 케이스] 버튼(?patientId= 프리셀렉트)과
 * 케이스 보드의 [+ 새 케이스]에서 진입한다. 생성 후 케이스 상세로 이동.
 */
export default async function NewCasePage({
  searchParams,
}: {
  searchParams: { patientId?: string };
}): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });

  const { patients, hospitalOptions } = await withRls(ctx, async () => {
    const [patientRows, hospitalRows] = await Promise.all([
      listPatients(ctx.orgId, {}, 200),
      db
        .select({ id: hospitals.id, name: hospitals.name })
        .from(hospitals)
        .where(eq(hospitals.organizationId, ctx.orgId))
        .orderBy(hospitals.name),
    ]);
    return {
      patients: patientRows.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        nationality: p.nationality,
      })),
      hospitalOptions: hospitalRows,
    };
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link href="/agency/cases" className="text-xs text-muted-foreground hover:underline">
          ← 케이스
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">새 케이스</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          환자 1명의 여정(상담 → RFQ → 견적 → 예약 → 시술 → 정산)을 추적할 케이스를 만듭니다.
          생성 후 <Link href="/agency/quotes" className="font-medium underline">RFQ · 견적</Link>
          에서 병원 견적을 진행하세요.
        </p>
      </div>

      <NewCaseForm
        patients={patients}
        hospitals={hospitalOptions}
        defaultPatientId={searchParams.patientId ?? null}
      />
    </div>
  );
}
