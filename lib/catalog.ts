/**
 * Shared catalog metadata for B2C surfaces — the 8 category cards
 * and the procedure slugs under each.
 *
 * Source-of-truth for both:
 *   - /[locale]/procedures (patient portal procedure catalog)
 *   - /master/landings     (master-side listing manager)
 *
 * Adding a new procedure: append to the items[] array under the right
 * category. Tag with the matching 4-language label. No DB migration
 * needed — the procedure slug becomes valid for category_listings rows
 * immediately.
 */

export const PUBLIC_CATEGORIES = [
  'plastic_surgery',
  'dermatology',
  'dental',
  'hair',
  'health_checkup',
  'beauty_tour',
  'makeup',
  'photo_studio',
] as const;

export type PublicCategoryKey = (typeof PUBLIC_CATEGORIES)[number];

export type ProcedureItem = {
  slug: string;
  name: { kr: string; en: string; zh: string; ja: string };
};

export const PROCEDURE_CATALOG: Record<PublicCategoryKey, ProcedureItem[]> = {
  plastic_surgery: [
    { slug: 'rhinoplasty', name: { kr: '코 성형', en: 'Rhinoplasty', zh: '鼻整形', ja: '鼻整形' } },
    { slug: 'double-eyelid', name: { kr: '쌍꺼풀', en: 'Double Eyelid', zh: '双眼皮', ja: '二重まぶた' } },
    { slug: 'facial-contouring', name: { kr: '안면 윤곽', en: 'Facial Contouring', zh: '面部轮廓', ja: '輪郭整形' } },
    { slug: 'breast-aug', name: { kr: '가슴 성형', en: 'Breast Augmentation', zh: '隆胸', ja: '豊胸' } },
    { slug: 'liposuction', name: { kr: '지방 흡입', en: 'Liposuction', zh: '吸脂', ja: '脂肪吸引' } },
  ],
  dermatology: [
    { slug: 'botox', name: { kr: '보톡스', en: 'Botox', zh: '肉毒素', ja: 'ボトックス' } },
    { slug: 'filler', name: { kr: '필러', en: 'Filler', zh: '玻尿酸', ja: 'フィラー' } },
    { slug: 'laser', name: { kr: '레이저', en: 'Laser', zh: '激光', ja: 'レーザー' } },
    { slug: 'lifting', name: { kr: '리프팅', en: 'Lifting', zh: '提拉', ja: 'リフティング' } },
  ],
  dental: [
    { slug: 'implant', name: { kr: '임플란트', en: 'Implant', zh: '种植牙', ja: 'インプラント' } },
    { slug: 'whitening', name: { kr: '치아 미백', en: 'Teeth Whitening', zh: '牙齿美白', ja: 'ホワイトニング' } },
    { slug: 'braces', name: { kr: '교정', en: 'Braces', zh: '正畸', ja: '矯正' } },
  ],
  hair: [
    { slug: 'hair-transplant', name: { kr: '모발 이식', en: 'Hair Transplant', zh: '植发', ja: '植毛' } },
    { slug: 'hair-loss', name: { kr: '탈모 치료', en: 'Hair Loss Treatment', zh: '脱发治疗', ja: '脱毛治療' } },
  ],
  health_checkup: [
    { slug: 'comprehensive', name: { kr: '종합 검진', en: 'Comprehensive Check-up', zh: '综合体检', ja: '総合検診' } },
    { slug: 'cancer-screening', name: { kr: '암 검진', en: 'Cancer Screening', zh: '癌症筛查', ja: 'がん検診' } },
  ],
  beauty_tour: [
    { slug: 'k-beauty-package', name: { kr: 'K-뷰티 패키지', en: 'K-Beauty Package', zh: 'K-美容套餐', ja: 'Kビューティパッケージ' } },
    { slug: 'recovery-stay', name: { kr: '회복호텔 스테이', en: 'Recovery Hotel Stay', zh: '康复酒店住宿', ja: '回復ホテル滞在' } },
  ],
  makeup: [
    { slug: 'pre-treatment-styling', name: { kr: '시술 전 스타일링', en: 'Pre-treatment Styling', zh: '术前造型', ja: '施術前スタイリング' } },
    { slug: 'post-treatment-styling', name: { kr: '시술 후 스타일링', en: 'Post-treatment Styling', zh: '术后造型', ja: '施術後スタイリング' } },
  ],
  photo_studio: [
    { slug: 'after-treatment-shoot', name: { kr: '시술 후 인생샷', en: 'After-treatment Photoshoot', zh: '术后写真', ja: '施術後撮影' } },
  ],
};

export function getProcedureName(
  categoryKey: PublicCategoryKey,
  slug: string,
  locale: 'kr' | 'en' | 'zh' | 'ja' = 'kr',
): string | null {
  const cat = PROCEDURE_CATALOG[categoryKey];
  if (!cat) return null;
  const item = cat.find((p) => p.slug === slug);
  return item?.name[locale] ?? null;
}
