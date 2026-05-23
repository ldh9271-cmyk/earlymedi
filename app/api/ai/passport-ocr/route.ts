export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { runExtraction } from '@/lib/ai/extraction/engine';
import { PASSPORT_KEY_FIELDS, PassportSchema } from '@/lib/ai/extraction/schemas/passport';
import { PASSPORT_PROMPT_SYSTEM } from '@/lib/ai/prompts/passport-ocr';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['agency', 'medical'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  const ct = request.headers.get('content-type') ?? '';
  if (!ct.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'expected_multipart_form_data' }, { status: 415 });
  }
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'file_required' }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'file_too_large' }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || 'image/jpeg';

  return await withRls(access.ctx, async () => {
    const result = await runExtraction(
      {
        organizationId: access.ctx.orgId,
        actorUserId: access.ctx.userId,
        schemaKey: 'passport',
        boundEntityType: 'patient',
      },
      PassportSchema,
      PASSPORT_KEY_FIELDS,
      { kind: 'image', buffer, mimeType },
      ({ ocrText }) => ({
        system: PASSPORT_PROMPT_SYSTEM,
        userText: `다음은 여권 이미지의 OCR 결과 텍스트입니다:\n${ocrText}\n\n이미지와 OCR 텍스트를 모두 참고하여 필드를 추출하세요.`,
        includeImage: true,
      }),
    );

    return NextResponse.json({ data: result });
  });
}
