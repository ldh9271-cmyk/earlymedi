export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { tryAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { runExtraction } from '@/lib/ai/extraction/engine';
import {
  TREATMENT_CHART_KEY_FIELDS,
  TreatmentChartExtractionSchema,
} from '@/lib/ai/extraction/schemas/treatment-chart';
import {
  TREATMENT_CHART_PROMPT_SYSTEM,
  buildTreatmentChartPrompt,
} from '@/lib/ai/prompts/treatment-chart-autofill';

export const runtime = 'nodejs';

/**
 * AI-based treatment-chart autofill. Accepts:
 *   - image (jpeg/png/heic)
 *   - PDF (with or without text layer)
 *   - plain text (paste from messenger / EMR copy)
 *
 * Form fields:
 *   - file: optional (Blob)
 *   - text: optional (string)
 *   - chartId: optional (uuid) — when present, the extraction job is bound to
 *     the chart for audit. Applying the result to actual chart items is a
 *     *separate* API call so the hospital can review first.
 *
 * Allowed actors: medical (the originating hospital) or agency (when uploading
 * an external quote on behalf of a partner hospital).
 */
export async function POST(request: Request): Promise<Response> {
  const access = await tryAccess({ allowedAccountTypes: ['medical', 'agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  const ct = request.headers.get('content-type') ?? '';
  if (!ct.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'expected_multipart_form_data' }, { status: 415 });
  }

  const form = await request.formData();
  const file = form.get('file');
  const text = form.get('text');
  const chartId = form.get('chartId');

  if (file && !(file instanceof Blob)) {
    return NextResponse.json({ error: 'invalid_file' }, { status: 400 });
  }
  if (file instanceof Blob && file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
  }
  if (!file && (typeof text !== 'string' || text.trim().length === 0)) {
    return NextResponse.json({ error: 'file_or_text_required' }, { status: 400 });
  }

  return await withRls(access.ctx, async () => {
    type EngineInput =
      | { kind: 'image'; buffer: Buffer; mimeType: string }
      | { kind: 'pdf'; buffer: Buffer }
      | { kind: 'text'; text: string };
    let input: EngineInput;
    if (file instanceof Blob) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type || 'application/octet-stream';
      if (mimeType.startsWith('image/')) {
        input = { kind: 'image', buffer, mimeType };
      } else if (mimeType === 'application/pdf') {
        input = { kind: 'pdf', buffer };
      } else {
        return NextResponse.json({ error: 'unsupported_mime', mimeType }, { status: 415 });
      }
    } else {
      input = { kind: 'text', text: String(text) };
    }

    const result = await runExtraction(
      {
        organizationId: access.ctx.orgId,
        actorUserId: access.ctx.userId,
        schemaKey: 'treatment_chart',
        boundEntityType: 'treatment_chart',
        boundEntityId: typeof chartId === 'string' ? chartId : undefined,
      },
      TreatmentChartExtractionSchema,
      TREATMENT_CHART_KEY_FIELDS,
      input,
      ({ ocrText, isImage }) =>
        ocrText
          ? buildTreatmentChartPrompt({ ocrText, isImage })
          : { system: TREATMENT_CHART_PROMPT_SYSTEM, userText: '입력에서 시술 차트를 추출하세요.', includeImage: isImage },
    );

    return NextResponse.json({ data: result });
  });
}
