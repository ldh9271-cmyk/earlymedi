import Link from 'next/link';
import { ArrowRight, Stethoscope } from 'lucide-react';
import type { PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

/**
 * Public procedure catalog — flat list grouped by medical specialty.
 * Each procedure links to a clinic-filter view ("which clinics offer
 * this?") rather than its own detail page. Detail pages with pricing
 * ranges + before/after gallery arrive once we collect the structured
 * data (Phase 3).
 *
 * The list itself is curated rather than DB-driven for now — the
 * `procedures` table in our schema is treatment-chart-scoped (per-case)
 * and isn't suitable as a public marketing catalog. A separate
 * `public_procedures` table will be added when richness justifies it.
 */
const CATALOG: Array<{
  section: keyof Awaited<ReturnType<typeof getDictionary>>['categories']['items'];
  items: Array<{ slug: string; name: { kr: string; en: string; zh: string; ja: string } }>;
}> = [
  {
    section: 'plastic_surgery',
    items: [
      { slug: 'rhinoplasty', name: { kr: '코 성형', en: 'Rhinoplasty', zh: '鼻整形', ja: '鼻整形' } },
      { slug: 'double-eyelid', name: { kr: '쌍꺼풀', en: 'Double Eyelid', zh: '双眼皮', ja: '二重まぶた' } },
      { slug: 'facial-contouring', name: { kr: '안면 윤곽', en: 'Facial Contouring', zh: '面部轮廓', ja: '輪郭整形' } },
      { slug: 'breast-aug', name: { kr: '가슴 성형', en: 'Breast Augmentation', zh: '隆胸', ja: '豊胸' } },
      { slug: 'liposuction', name: { kr: '지방 흡입', en: 'Liposuction', zh: '吸脂', ja: '脂肪吸引' } },
    ],
  },
  {
    section: 'dermatology',
    items: [
      { slug: 'botox', name: { kr: '보톡스', en: 'Botox', zh: '肉毒素', ja: 'ボトックス' } },
      { slug: 'filler', name: { kr: '필러', en: 'Filler', zh: '玻尿酸', ja: 'フィラー' } },
      { slug: 'laser', name: { kr: '레이저', en: 'Laser', zh: '激光', ja: 'レーザー' } },
      { slug: 'lifting', name: { kr: '리프팅', en: 'Lifting', zh: '提拉', ja: 'リフティング' } },
    ],
  },
  {
    section: 'dental',
    items: [
      { slug: 'implant', name: { kr: '임플란트', en: 'Implant', zh: '种植牙', ja: 'インプラント' } },
      { slug: 'whitening', name: { kr: '치아 미백', en: 'Teeth Whitening', zh: '牙齿美白', ja: 'ホワイトニング' } },
      { slug: 'braces', name: { kr: '교정', en: 'Braces', zh: '正畸', ja: '矯正' } },
    ],
  },
  {
    section: 'hair',
    items: [
      { slug: 'hair-transplant', name: { kr: '모발 이식', en: 'Hair Transplant', zh: '植发', ja: '植毛' } },
      { slug: 'hair-loss', name: { kr: '탈모 치료', en: 'Hair Loss Treatment', zh: '脱发治疗', ja: '脱毛治療' } },
    ],
  },
  {
    section: 'health_checkup',
    items: [
      { slug: 'comprehensive', name: { kr: '종합 검진', en: 'Comprehensive Check-up', zh: '综合体检', ja: '総合検診' } },
      { slug: 'cancer-screening', name: { kr: '암 검진', en: 'Cancer Screening', zh: '癌症筛查', ja: 'がん検診' } },
    ],
  },
];

export default async function ProceduresPage({
  params,
}: {
  params: { locale: PublicLocale };
}): Promise<JSX.Element> {
  const dict = await getDictionary(params.locale);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {dict.nav.procedures}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {dict.categories.subtitle}
        </p>
      </header>

      <div className="space-y-10">
        {CATALOG.map((sec) => {
          const meta = dict.categories.items[sec.section];
          return (
            <section key={sec.section}>
              <div className="mb-4 flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-lg font-bold">{meta.label}</h2>
                </div>
                <Link
                  href={`/${params.locale}/clinics?category=${sec.section}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900"
                >
                  {dict.categories.viewAll}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {sec.items.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/${params.locale}/clinics?category=${sec.section}&procedure=${item.slug}`}
                    className="group flex items-center justify-between rounded-md border bg-card px-3 py-2.5 text-sm transition hover:border-brand-300 hover:bg-brand-50"
                  >
                    <span className="font-medium">
                      {item.name[params.locale === 'kr' ? 'kr' : params.locale]}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-brand-700" />
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
