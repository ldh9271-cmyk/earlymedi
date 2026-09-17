import { eq, sql } from 'drizzle-orm';
import type { PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { InquiryForm } from './_components/inquiry-form';

export const dynamic = 'force-dynamic';

/**
 * Public inquiry form — Airbnb design language wrapper.
 *
 * On submit, creates a conversation row in the inbox of a configured
 * "intake" agency (env: INTAKE_AGENCY_ORG_ID), falling back to the
 * first available agency. From there it appears in the normal
 * /agency/inbox flow alongside KakaoTalk/WeChat messages, with AI
 * translation and reply suggestions all working as usual.
 *
 * Hospital list is loaded server-side and handed to the form as a
 * dropdown — patients can pick a specific clinic or leave it blank
 * ("아직 결정 안 함"). Shell wrapper is centered to ~640px max-width
 * inside the 1280 page rhythm so the form reads like an Airbnb
 * checkout / contact-host card rather than a wide enterprise form.
 */
export default async function InquiryPage({
  params,
  searchParams,
}: {
  params: { locale: PublicLocale };
  searchParams: { hospital?: string; program?: string; interest?: string };
}): Promise<JSX.Element> {
  const dict = await getDictionary(params.locale);

  let hospitalOptions: Array<{ id: string; name: string }> = [];
  try {
    hospitalOptions = await db
      .select({ id: hospitals.id, name: hospitals.name })
      .from(hospitals)
      .where(eq(hospitals.countryCode, 'KR'))
      .orderBy(sql`${hospitals.name} asc`)
      .limit(200);
  } catch {
    /* fail open — form still works without the dropdown */
  }

  return (
    <section style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px 80px' }}>
      <h1
        style={{
          fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px',
          margin: 0, textAlign: 'center',
        }}
      >
        {dict.inquiryCta.title}
      </h1>
      <p
        style={{
          fontSize: 14, color: '#6a6a6a',
          margin: '6px 0 28px', textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        {/* 병원을 지정해 들어온 예약 문의만 '의료 컨시어지', 일반 문의는 '뷰티 컨시어지' */}
        {searchParams.hospital ? dict.inquiryCta.subtitle : dict.inquiryCta.subtitleGeneral}
      </p>

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
          dob: dict.inquiryCta.dobLabel,
          dobRequired: dict.inquiryCta.dobRequiredLabel,
          submitReserve: dict.inquiryCta.submitReserve,
          gender: dict.inquiryCta.genderLabel,
          genderF: dict.inquiryCta.genderF,
          genderM: dict.inquiryCta.genderM,
          genderX: dict.inquiryCta.genderX,
          phone: dict.inquiryCta.phoneLabel,
          messenger: dict.inquiryCta.messengerLabel,
          messengerId: dict.inquiryCta.messengerIdLabel,
          email: dict.inquiryCta.emailLabel,
          visitDate: dict.inquiryCta.visitDateLabel,
          visitTime: dict.inquiryCta.visitTimeLabel,
          reserveNote: dict.inquiryCta.reserveNote,
          doneReserve: dict.inquiryCta.doneReserve,
          requiredMissing: dict.inquiryCta.requiredMissing,
          myPage: dict.myPage.title,
          interest: dict.inquiryCta.interestLabel,
          memo: dict.inquiryCta.memoLabel,
          submit: dict.inquiryCta.submit,
          privacy: dict.inquiryCta.privacy,
          categories: dict.categories.items,
        }}
      />
    </section>
  );
}
