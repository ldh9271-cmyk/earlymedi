import { eq, sql } from 'drizzle-orm';
import type { PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { InquiryForm } from './_components/inquiry-form';

export const dynamic = 'force-dynamic';

/**
 * Public inquiry form. On submit, creates a conversation row in the
 * inbox of a configured "intake" agency (env: INTAKE_AGENCY_ORG_ID),
 * falling back to the first available agency. From there it appears in
 * the normal /agency/inbox flow alongside KakaoTalk/WeChat messages,
 * with AI translation and reply suggestions all working as usual.
 *
 * Hospital list is loaded server-side and handed to the form as a
 * dropdown — patients can pick a specific clinic or leave it blank
 * ("아직 결정 안 함"), which is friendlier than the raw UUID we used
 * to embed in the message body.
 */
export default async function InquiryPage({
  params,
  searchParams,
}: {
  params: { locale: PublicLocale };
  searchParams: { hospital?: string; program?: string; interest?: string };
}): Promise<JSX.Element> {
  const dict = await getDictionary(params.locale);

  // Load KR hospitals so the form can show them in a select. id + name
  // only, capped at 200; we'll switch to a typeahead once we exceed that.
  let hospitalOptions: Array<{ id: string; name: string }> = [];
  try {
    hospitalOptions = await db
      .select({ id: hospitals.id, name: hospitals.name })
      .from(hospitals)
      .where(eq(hospitals.countryCode, 'KR'))
      .orderBy(sql`${hospitals.name} asc`)
      .limit(200);
  } catch {
    // Fail open — if hospitals can't load, the form still works; the
    // user just won't see a clinic dropdown.
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {dict.inquiryCta.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          {dict.inquiryCta.subtitle}
        </p>
      </header>

      <InquiryForm
        locale={params.locale}
        hospitalId={searchParams.hospital ?? null}
        prefillProgram={searchParams.program ?? null}
        prefillInterest={searchParams.interest ?? null}
        hospitalOptions={hospitalOptions}
        labels={{
          name: dict.inquiryCta.nameLabel,
          country: dict.inquiryCta.countryLabel,
          contact: dict.inquiryCta.contactLabel,
          interest: dict.inquiryCta.interestLabel,
          memo: dict.inquiryCta.memoLabel,
          submit: dict.inquiryCta.submit,
          privacy: dict.inquiryCta.privacy,
          categories: dict.categories.items,
        }}
      />
    </div>
  );
}
