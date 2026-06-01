'use server';

import 'server-only';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { auditLogs } from '@/drizzle/schema/audit';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';

/**
 * Master-only quick edit for the two B2C-visible fields:
 *   - cover_image_url: hero image shown on /[locale]/clinics/[slug]
 *   - notes: short bio text used as the "오늘의 추천 병원" body
 *
 * Both columns already exist on the hospitals schema (no migration
 * needed). RLS is bypassed because the master goes through Drizzle on
 * the postgres role connection.
 */
export async function updateHospitalBasics(formData: FormData): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?next=/master/hospitals');
  if (!isMasterEmail(auth.user.email ?? null)) redirect('/select-org');

  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/master/hospitals?error=missing_id');

  const rawCover = String(formData.get('coverImageUrl') ?? '').trim();
  const rawNotes = String(formData.get('notes') ?? '').trim();

  // Light validation — accept any http(s) URL or empty string. If the
  // master pastes garbage we let the <img> tag fail silently rather
  // than reject the save.
  const coverImageUrl = rawCover === '' ? null : rawCover;
  const notes = rawNotes === '' ? null : rawNotes;

  const [updated] = await db
    .update(hospitals)
    .set({
      coverImageUrl,
      notes,
      updatedAt: new Date(),
    })
    .where(eq(hospitals.id, id))
    .returning({ id: hospitals.id, organizationId: hospitals.organizationId });

  if (!updated) redirect('/master/hospitals?error=hospital_not_found');

  await db
    .insert(auditLogs)
    .values({
      organizationId: updated.organizationId,
      actorUserId: auth.user.id,
      action: 'update',
      entityType: 'hospital',
      entityId: updated.id,
      diff: {
        coverImageUrl: coverImageUrl ?? null,
        notesLength: notes?.length ?? 0,
      },
      metadata: { isMaster: true, source: 'master_console', kind: 'hospital_basics' },
    })
    .catch(() => {
      // audit non-fatal
    });

  revalidatePath('/master/hospitals');
  revalidatePath(`/master/hospitals/${id}/edit`);
  // Detail page slug isn't known here without an extra read; revalidate
  // the locale clinic root + slug list. Cheap enough.
  revalidatePath('/kr/clinics', 'layout');
  revalidatePath('/en/clinics', 'layout');
  revalidatePath('/zh/clinics', 'layout');
  revalidatePath('/ja/clinics', 'layout');

  redirect(`/master/hospitals/${id}/edit?saved=1`);
}
