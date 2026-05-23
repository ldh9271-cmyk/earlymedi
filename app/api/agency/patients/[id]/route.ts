export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { getPatientById, logPatientView } from '@/lib/db/repositories/patients';

export async function GET(_req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });
  const data = await withRls(access.ctx, async () => {
    const out = await getPatientById(access.ctx.orgId, params.id);
    if (out) {
      await logPatientView(access.ctx.orgId, access.ctx.userId, params.id);
    }
    return out;
  });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  // Return only safe (non-encrypted) columns + hashes; PII decryption is opt-in via /reveal endpoint.
  const { patient, history } = data;
  return NextResponse.json({
    data: {
      patient: {
        id: patient.id,
        fullName: patient.fullName,
        aliasName: patient.aliasName,
        surname: patient.surname,
        givenNames: patient.givenNames,
        nationality: patient.nationality,
        countryCode: patient.countryCode,
        locale: patient.locale,
        sex: patient.sex,
        dateOfBirth: patient.dateOfBirth,
        status: patient.status,
        tags: patient.tagsJson,
        sourceChannel: patient.sourceChannel,
        sourceConversationId: patient.sourceConversationId,
        hasPassport: !!patient.passportNumberEncrypted,
        hasPhone: !!patient.phoneEncrypted,
        hasEmail: !!patient.emailEncrypted,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
      },
      history,
    },
  });
}
