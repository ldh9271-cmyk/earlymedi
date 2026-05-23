import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { channels } from '../schema/channels';
import { conversations } from '../schema/conversations';
import { messages } from '../schema/messages';
import { quickReplies } from '../schema/messages';
import { glossaryTerms } from '../schema/messages';
import { DEMO_ORG_AGENCY } from './demo-organizations';
import { ALL_CHANNEL_KINDS, CHANNEL_DISPLAY } from '@/lib/channels/router';
import type { ChannelKind } from '@/lib/channels/types';

type Persona = {
  externalThreadId: string;
  channelKind: ChannelKind;
  displayName: string;
  countryCode: string;
  locale: string;
  intent: string;
  exchanges: Array<{
    role: 'patient' | 'agent';
    body: string;
    locale: string;
    translation_ko?: string;
    minutesAgo: number;
  }>;
};

const PERSONAS: Persona[] = [
  {
    externalThreadId: 'kakao-thread-001',
    channelKind: 'kakao',
    displayName: '王 雪',
    countryCode: 'CN',
    locale: 'zh-CN',
    intent: 'rhinoplasty_quote_request',
    exchanges: [
      {
        role: 'patient',
        body: '你好,我想咨询一下鼻整形手术的价格',
        locale: 'zh-CN',
        translation_ko: '안녕하세요, 코 성형수술 가격을 문의드립니다.',
        minutesAgo: 35,
      },
      {
        role: 'agent',
        body: '안녕하세요 雪 님, EarlyMedi입니다. 어떤 시술을 고려 중이신지 말씀해 주실 수 있을까요?',
        locale: 'ko',
        minutesAgo: 32,
      },
      {
        role: 'patient',
        body: '想做隆鼻和鼻翼缩小,预算大约¥40000人民币',
        locale: 'zh-CN',
        translation_ko: '코 높임과 콧볼 축소를 원해요. 예산은 위안화 4만 정도입니다.',
        minutesAgo: 22,
      },
    ],
  },
  {
    externalThreadId: 'instagram-thread-002',
    channelKind: 'instagram',
    displayName: 'Olivia Tan',
    countryCode: 'SG',
    locale: 'en',
    intent: 'breast_augmentation_consult',
    exchanges: [
      {
        role: 'patient',
        body: "Hi, I'm flying in from Singapore in late June. Looking for breast augmentation + recovery hotel.",
        locale: 'en',
        translation_ko: '안녕하세요, 6월 말 싱가포르에서 방문 예정입니다. 가슴 확대술 + 회복호텔 패키지를 알아보고 있어요.',
        minutesAgo: 120,
      },
      {
        role: 'agent',
        body: 'Hi Olivia! Could you share your preferred dates and whether you have a hospital in mind?',
        locale: 'en',
        minutesAgo: 118,
      },
    ],
  },
  {
    externalThreadId: 'line-thread-003',
    channelKind: 'line',
    displayName: '佐藤 美咲',
    countryCode: 'JP',
    locale: 'ja',
    intent: 'medical_checkup_package',
    exchanges: [
      {
        role: 'patient',
        body: 'こんにちは。健康診断のパッケージと通訳を予約したいです。',
        locale: 'ja',
        translation_ko: '안녕하세요. 종합검진 패키지와 통역사를 예약하고 싶습니다.',
        minutesAgo: 240,
      },
    ],
  },
  {
    externalThreadId: 'whatsapp-thread-004',
    channelKind: 'whatsapp',
    displayName: 'Khalid Al-Saadi',
    countryCode: 'AE',
    locale: 'ar',
    intent: 'spine_surgery_inquiry',
    exchanges: [
      {
        role: 'patient',
        body: 'السلام عليكم. أحتاج جراحة عمود فقري وأرغب بمستشفى متخصص.',
        locale: 'ar',
        translation_ko: '안녕하세요. 척추 수술이 필요하며, 전문 병원을 추천받고 싶습니다.',
        minutesAgo: 18,
      },
    ],
  },
  {
    externalThreadId: 'wechat-thread-005',
    channelKind: 'wechat',
    displayName: '林 美琳',
    countryCode: 'CN',
    locale: 'zh-CN',
    intent: 'lipo_post_op_concern',
    exchanges: [
      {
        role: 'patient',
        body: '医生说我现在不能做高温桑拿,但酒店包了汗蒸,可以吗?',
        locale: 'zh-CN',
        translation_ko: '의사 선생님이 사우나는 안 된다고 하셨는데, 호텔 사우나는 괜찮을까요?',
        minutesAgo: 6,
      },
    ],
  },
  {
    externalThreadId: 'telegram-thread-006',
    channelKind: 'telegram',
    displayName: 'Anastasia Volkova',
    countryCode: 'RU',
    locale: 'ru',
    intent: 'ivf_clinic_recommendation',
    exchanges: [
      {
        role: 'patient',
        body: 'Здравствуйте! Меня интересует ЭКО в Сеуле, у вас есть проверенные клиники?',
        locale: 'ru',
        translation_ko: '안녕하세요! 서울에서 시험관 시술 가능한 검증된 병원을 알고 싶어요.',
        minutesAgo: 65,
      },
    ],
  },
  {
    externalThreadId: 'messenger-thread-007',
    channelKind: 'messenger',
    displayName: 'Trang Nguyen',
    countryCode: 'VN',
    locale: 'vi',
    intent: 'skin_treatment_package',
    exchanges: [
      {
        role: 'patient',
        body: 'Chào anh/chị, em muốn hỏi gói điều trị da liễu cho 5 ngày.',
        locale: 'vi',
        translation_ko: '5일 일정 피부 관리 패키지에 대해 문의드립니다.',
        minutesAgo: 412,
      },
    ],
  },
  {
    externalThreadId: 'sms-thread-008',
    channelKind: 'sms',
    displayName: 'Mr. Chai (Thailand)',
    countryCode: 'TH',
    locale: 'th',
    intent: 'dental_implants_quote',
    exchanges: [
      {
        role: 'patient',
        body: 'สวัสดีครับ ขอราคารากฟันเทียมแบบเต็มปากครับ',
        locale: 'th',
        translation_ko: '안녕하세요. 풀 마우스 임플란트 견적 부탁드립니다.',
        minutesAgo: 80,
      },
    ],
  },
  {
    externalThreadId: 'email-thread-009',
    channelKind: 'email',
    displayName: 'Daniel Park',
    countryCode: 'US',
    locale: 'en',
    intent: 'health_checkup_couples',
    exchanges: [
      {
        role: 'patient',
        body: 'Hello — we are a couple based in LA and would like a 3-day premium health checkup with translator.',
        locale: 'en',
        translation_ko: '안녕하세요, LA 거주 부부이며 통역사 포함 3일 프리미엄 종합검진을 원합니다.',
        minutesAgo: 9,
      },
    ],
  },
  {
    externalThreadId: 'web-thread-010',
    channelKind: 'web',
    displayName: 'Anonymous Visitor',
    countryCode: 'KR',
    locale: 'ko',
    intent: 'website_form_inquiry',
    exchanges: [
      {
        role: 'patient',
        body: '안녕하세요. 의료관광 패키지에 대해 알아보고 있습니다. 카탈로그 받아볼 수 있을까요?',
        locale: 'ko',
        minutesAgo: 2,
      },
    ],
  },
];

export async function seedInboxDemo(): Promise<void> {
  console.info('[seed] channels (10) for demo agency ...');

  // 1. 10 channels per demo agency
  const channelByKind = new Map<ChannelKind, string>();
  for (const kind of ALL_CHANNEL_KINDS) {
    const display = CHANNEL_DISPLAY[kind];
    const externalAccountId = `demo-${kind}-account`;
    const existing = await db
      .select({ id: channels.id })
      .from(channels)
      .where(eq(channels.organizationId, DEMO_ORG_AGENCY))
      .limit(50);
    const found = existing.find((c) => c.id);
    void found;

    const [inserted] = await db
      .insert(channels)
      .values({
        organizationId: DEMO_ORG_AGENCY,
        kind,
        displayName: `${display.label} (데모)`,
        externalAccountId,
        status: 'connected',
        isDefault: kind === 'kakao',
        config: { defaultLocale: 'ko', autoReplyEnabled: false },
      })
      .onConflictDoNothing()
      .returning({ id: channels.id });

    if (inserted) {
      channelByKind.set(kind, inserted.id);
    } else {
      // already existed — fetch
      const [row] = await db
        .select({ id: channels.id })
        .from(channels)
        .where(eq(channels.organizationId, DEMO_ORG_AGENCY))
        .limit(20);
      // Best-effort match by kind requires another query; reuse via second SELECT
      const matches = await db.select().from(channels).where(eq(channels.organizationId, DEMO_ORG_AGENCY));
      const m = matches.find((c) => c.kind === kind);
      if (m) channelByKind.set(kind, m.id);
      void row;
    }
  }

  console.info('[seed] conversations & messages (10 personas) ...');

  // 2. One conversation per persona + messages
  for (const persona of PERSONAS) {
    const channelId = channelByKind.get(persona.channelKind);
    if (!channelId) continue;

    const [conv] = await db
      .insert(conversations)
      .values({
        organizationId: DEMO_ORG_AGENCY,
        channelId,
        externalThreadId: persona.externalThreadId,
        contactDisplayName: persona.displayName,
        contactExternalId: `ext_${persona.externalThreadId}`,
        contactCountryCode: persona.countryCode,
        contactLocale: persona.locale,
        stage: 'lead',
        priority: persona.intent.includes('post_op') ? 'urgent' : 'normal',
        aiIntentClass: persona.intent,
        subject: persona.exchanges[0]?.body.slice(0, 60),
        unreadCount: persona.exchanges.filter((e) => e.role === 'patient').length,
        lastInboundAt: new Date(Date.now() - (persona.exchanges[0]?.minutesAgo ?? 0) * 60_000),
        tagsJson: [persona.countryCode.toLowerCase(), persona.intent.split('_')[0] ?? ''],
      })
      .onConflictDoNothing()
      .returning();

    if (!conv) continue;

    for (const e of persona.exchanges) {
      await db
        .insert(messages)
        .values({
          organizationId: DEMO_ORG_AGENCY,
          conversationId: conv.id,
          direction: e.role === 'patient' ? 'inbound' : 'outbound',
          senderRole: e.role === 'patient' ? 'patient' : 'agent',
          contentType: 'text',
          body: e.body,
          bodyLocale: e.locale,
          translationKo: e.translation_ko ?? null,
          status: 'sent',
          isSeenByAgency: e.role === 'agent',
          sentAt: new Date(Date.now() - e.minutesAgo * 60_000),
        })
        .onConflictDoNothing();
    }
  }

  console.info('[seed] quick_replies ...');
  const QUICK = [
    {
      shortcut: '/가격',
      title: '시술 가격 안내',
      bodyByLocale: {
        ko: '시술 가격은 병원과 시술 범위에 따라 다릅니다. 정확한 견적은 사진과 함께 보내주시면 24시간 이내 전달드립니다.',
        en: 'Pricing depends on the hospital and the scope of the procedure. Please share photos for a detailed quote within 24 hours.',
        'zh-CN': '价格因医院和手术范围而异。请提供照片,我们会在24小时内给您详细报价。',
        ja: '価格は病院と施術範囲によって異なります。写真をお送りいただければ24時間以内に詳細なお見積もりをお送りします。',
        ar: 'السعر يعتمد على المستشفى ونطاق العملية. يرجى إرسال الصور للحصول على عرض أسعار تفصيلي خلال 24 ساعة.',
      },
      categoryKey: 'pricing',
      sortOrder: 1,
    },
    {
      shortcut: '/예약',
      title: '예약 절차 안내',
      bodyByLocale: {
        ko: '예약은 (1) 견적 확정 → (2) 예약금 결제 → (3) 진료 예약 확정 순으로 진행됩니다.',
        en: 'Booking flow: (1) confirm quote → (2) pay deposit → (3) appointment confirmed.',
        'zh-CN': '预约流程:(1) 确认报价 → (2) 支付定金 → (3) 确认预约。',
        ja: '予約フロー:(1) 見積確認 → (2) デポジット決済 → (3) 予約確定',
      },
      categoryKey: 'booking',
      sortOrder: 2,
    },
    {
      shortcut: '/회복',
      title: '회복 일정 안내',
      bodyByLocale: {
        ko: '시술 후 회복 일정 및 비행 가능일은 시술별로 다릅니다. 회복호텔에서 D+N 케어 루틴을 자동 제공합니다.',
        en: 'Recovery and fit-to-fly timelines vary by procedure. Our partner recovery hotel will manage your daily care protocol.',
        'zh-CN': '术后恢复及可飞行时间因手术而异。我们的合作恢复酒店将自动管理您的每日护理计划。',
      },
      categoryKey: 'recovery',
      sortOrder: 3,
    },
  ];
  for (const q of QUICK) {
    await db.insert(quickReplies).values({ organizationId: DEMO_ORG_AGENCY, ...q }).onConflictDoNothing();
  }

  console.info('[seed] glossary_terms (의료 전문용어) ...');
  const GLOSSARY: Array<{ src: string; srcLoc: string; tgt: string; tgtLoc: string }> = [
    { src: 'rhinoplasty', srcLoc: 'en', tgt: '코 성형', tgtLoc: 'ko' },
    { src: 'double eyelid surgery', srcLoc: 'en', tgt: '쌍꺼풀 수술', tgtLoc: 'ko' },
    { src: 'breast augmentation', srcLoc: 'en', tgt: '가슴 확대술', tgtLoc: 'ko' },
    { src: 'liposuction', srcLoc: 'en', tgt: '지방흡입', tgtLoc: 'ko' },
    { src: 'fit-to-fly', srcLoc: 'en', tgt: '비행 가능일', tgtLoc: 'ko' },
    { src: '隆鼻', srcLoc: 'zh-CN', tgt: '코 높임', tgtLoc: 'ko' },
    { src: '鼻翼缩小', srcLoc: 'zh-CN', tgt: '콧볼 축소', tgtLoc: 'ko' },
    { src: '埋線', srcLoc: 'zh-CN', tgt: '실 리프팅', tgtLoc: 'ko' },
    { src: '健康診断', srcLoc: 'ja', tgt: '종합검진', tgtLoc: 'ko' },
  ];
  for (const g of GLOSSARY) {
    await db
      .insert(glossaryTerms)
      .values({
        organizationId: DEMO_ORG_AGENCY,
        sourceLocale: g.srcLoc,
        sourceText: g.src,
        targetLocale: g.tgtLoc,
        targetText: g.tgt,
      })
      .onConflictDoNothing();
  }
}
