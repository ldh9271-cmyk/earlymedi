import type { PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { InquiryForm } from './_components/inquiry-form';

export const dynamic = 'force-dynamic';

/**
 * Public inquiry form. On submit, creates a conversation row in the
 * inbox of a configured "intake" agency (env: INTAKE_AGENCY_ORG_ID),
 * falling back to the first available agency. From there it appears in
 * the normal /agency/inbox flow alongside KakaoTalk/WeChat messages,
 * with AI translation and reply suggestions all working as usual.
 */
export default async function InquiryPage({
  params,
  searchParams,
}: {
  params: { locale: PublicLocale };
  searchParams: { hospital?: string };
}): Promise<JSX.Element> {
  const dict = await getDictionary(params.locale);

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
